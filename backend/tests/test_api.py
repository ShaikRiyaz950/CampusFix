import csv
import io
import os
import sys
import time

import pytest

BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

import database  # noqa: E402
from app import app  # noqa: E402


VALID_COMPLAINT = {
    "title": "Broken Fan",
    "description": "Fan is not working in classroom",
    "category": "Electrical",
    "location": "Block A - Room 101",
    "priority": "High",
}


@pytest.fixture
def client(tmp_path, monkeypatch):
    db_file = tmp_path / "test_complaints.db"
    monkeypatch.setattr(database, "DB_NAME", str(db_file))
    database.init_db()
    app.config["TESTING"] = True
    with app.test_client() as test_client:
        yield test_client


# --- Health & OpenAPI Docs ---

def test_health_and_cors(client):
    res = client.get("/")
    assert res.status_code == 200
    assert res.get_json() == {"message": "CampusFix Backend Running"}
    assert res.headers.get("Access-Control-Allow-Origin") == "*"


def test_openapi_and_swagger_docs(client):
    spec = client.get("/api/openapi.json")
    assert spec.status_code == 200
    data = spec.get_json()
    assert data["openapi"] == "3.0.3"
    assert "/api/complaints" in data["paths"]
    assert "/api/complaints/{id}/assign" in data["paths"]
    assert "/api/dashboard/trends" in data["paths"]
    assert "/api/ai/classify" in data["paths"]

    docs = client.get("/api/docs")
    assert docs.status_code == 200
    assert "text/html" in docs.content_type
    assert "swagger-ui" in docs.get_data(as_text=True)


# --- A. Complaint Submission & Validation (TC01-TC15) ---

def test_create_valid_complaint_and_tracking_id(client):
    res = client.post("/api/complaints", json=VALID_COMPLAINT)
    assert res.status_code == 201
    body = res.get_json()
    assert body["id"] == 1
    assert body["tracking_id"].startswith("CMP-")
    assert body["tracking_id"].endswith("-0001")


@pytest.mark.parametrize(
    "payload",
    [
        {},
        {**VALID_COMPLAINT, "title": ""},
        {**VALID_COMPLAINT, "description": ""},
        {**VALID_COMPLAINT, "category": ""},
        {**VALID_COMPLAINT, "location": ""},
        {**VALID_COMPLAINT, "title": "   "},
        {**VALID_COMPLAINT, "title": "A" * 201},
        {**VALID_COMPLAINT, "priority": "SuperUrgent"},
    ],
)
def test_create_invalid_complaints_rejected(client, payload):
    res = client.post("/api/complaints", json=payload)
    assert res.status_code == 400
    assert "error" in res.get_json()


def test_create_missing_priority_defaults_to_medium(client):
    payload = {k: v for k, v in VALID_COMPLAINT.items() if k != "priority"}
    res = client.post("/api/complaints", json=payload)
    assert res.status_code == 201
    cid = res.get_json()["id"]
    fetched = client.get(f"/api/complaints/{cid}").get_json()
    assert fetched["priority"] == "Medium"
    assert fetched["status"] == "Pending"


def test_create_invalid_json_special_chars_xss_sqli(client):
    bad = client.post("/api/complaints", data="{broken", content_type="application/json")
    assert bad.status_code == 400

    special = client.post("/api/complaints", json={**VALID_COMPLAINT, "title": "Fan #1 @ Lab & Hall (50%)"})
    assert special.status_code == 201

    xss = client.post("/api/complaints", json={**VALID_COMPLAINT, "title": "<script>alert('xss')</script>"})
    assert xss.status_code == 201

    sqli = client.post("/api/complaints", json={**VALID_COMPLAINT, "title": "'; DROP TABLE complaints; --"})
    assert sqli.status_code == 201
    assert len(client.get("/api/complaints").get_json()) == 3


# --- B. Retrieval, Search, Filters, Sorting & Pagination (TC16-TC27) ---

def test_retrieval_search_filters_sorting_pagination(client):
    assert client.get("/api/complaints").get_json() == []

    c1 = client.post("/api/complaints", json={**VALID_COMPLAINT, "priority": "Low"}).get_json()
    c2 = client.post(
        "/api/complaints",
        json={
            "title": "Water Leakage",
            "description": "Pipe leaking near library",
            "category": "Plumbing",
            "location": "Block B - Ground Floor",
            "priority": "Critical",
        },
    ).get_json()

    all_rows = client.get("/api/complaints").get_json()
    assert len(all_rows) == 2
    assert all_rows[0]["id"] == c2["id"]  # newest first

    assert len(client.get("/api/complaints?search=Water").get_json()) == 1
    assert len(client.get("/api/complaints?search=library").get_json()) == 1
    assert len(client.get("/api/complaints?search=Block B").get_json()) == 1
    assert len(client.get("/api/complaints?search=broken fan").get_json()) == 1
    assert len(client.get(f"/api/complaints?search={c1['tracking_id']}").get_json()) == 1
    assert len(client.get("/api/complaints?search=2").get_json()) == 1
    assert len(client.get("/api/complaints?search=%25").get_json()) == 0  # literal % escaped
    assert len(client.get("/api/complaints?category=Plumbing").get_json()) == 1
    assert len(client.get("/api/complaints?status=Pending").get_json()) == 2
    assert len(client.get("/api/complaints?search=fan&category=Electrical&status=Pending").get_json()) == 1
    assert len(client.get("/api/complaints?category=NonExistent").get_json()) == 0
    assert len(client.get("/api/complaints?date=today").get_json()) == 2

    by_prio = client.get("/api/complaints?sort=priority").get_json()
    assert by_prio[0]["priority"] == "Critical"
    assert by_prio[1]["priority"] == "Low"

    paged = client.get("/api/complaints?page=1&limit=1").get_json()
    assert len(paged["items"]) == 1
    assert paged["total"] == 2
    assert paged["total_pages"] == 2


# --- C. Updates, PATCH Workflows, Assignment & History (TC28-TC37) ---

def test_put_update_fields_and_errors(client):
    client.post("/api/complaints", json=VALID_COMPLAINT)

    assert client.put("/api/complaints/1", json={}).status_code == 400
    assert client.put("/api/complaints/1", json={"status": "Invalid"}).status_code == 400
    assert client.put("/api/complaints/9999", json={"status": "Resolved"}).status_code == 404

    for field, value in [
        ("priority", "Critical"),
        ("location", "Block C"),
        ("description", "Updated description"),
        ("title", "Updated title"),
        ("status", "In Progress"),
    ]:
        res = client.put("/api/complaints/1", json={field: value})
        assert res.status_code == 200
        assert client.get("/api/complaints/1").get_json()[field] == value


def test_patch_status_priority_assign_and_history_timeline(client):
    created = client.post("/api/complaints", json=VALID_COMPLAINT).get_json()
    cid = created["id"]
    tid = created["tracking_id"]

    # Assign staff (moves Pending -> Assigned and records history)
    r_assign = client.patch(f"/api/complaints/{cid}/assign", json={"assigned_to": "Electrical Team"})
    assert r_assign.status_code == 200
    assert r_assign.get_json()["assigned_to"] == "Electrical Team"
    assert r_assign.get_json()["status"] == "Assigned"

    # Update priority
    r_prio = client.patch(f"/api/complaints/{cid}/priority", json={"priority": "Critical"})
    assert r_prio.status_code == 200
    assert r_prio.get_json()["priority"] == "Critical"

    # Progress status workflow
    assert client.patch(f"/api/complaints/{cid}/status", json={"status": "In Progress"}).status_code == 200
    assert client.patch(f"/api/complaints/{cid}/status", json={"status": "Resolved"}).status_code == 200

    # Verify filter by assigned_to
    assigned_list = client.get("/api/complaints?assigned_to=Electrical Team").get_json()
    assert len(assigned_list) == 1

    # Verify history & public tracking lookup
    hist = client.get(f"/api/complaints/{cid}/history").get_json()
    notes = [h["note"] for h in hist]
    assert notes == [
        "Complaint submitted",
        "Assigned to Electrical Team",
        "Priority changed to Critical",
        "In Progress",
        "Resolved",
    ]

    tracked = client.get(f"/api/complaints/track/{tid.lower()}").get_json()
    assert tracked["tracking_id"] == tid
    assert len(tracked["history"]) == 5


# --- D. Delete Tests (TC38-TC42) ---

def test_delete_complaint_and_edge_cases(client):
    client.post("/api/complaints", json=VALID_COMPLAINT)

    assert client.delete("/api/complaints/1").status_code == 200
    assert client.delete("/api/complaints/1").status_code == 404
    assert client.delete("/api/complaints/9999").status_code == 404
    assert client.delete("/api/complaints/0").status_code == 400
    bad_text = client.delete("/api/complaints/abc")
    assert bad_text.status_code == 404
    assert bad_text.is_json


# --- E. Dashboard Analytics & CSV Export (TC43-TC50) ---

def test_dashboard_stats_categories_trends_and_csv(client):
    empty_stats = client.get("/api/dashboard/stats").get_json()
    assert empty_stats["total"] == 0
    assert empty_stats["by_category"] == {}

    client.post("/api/complaints", json=VALID_COMPLAINT)
    client.post("/api/complaints", json={**VALID_COMPLAINT, "category": "Plumbing", "priority": "Low"})
    client.post("/api/complaints", json={**VALID_COMPLAINT, "category": "Plumbing", "priority": "Critical"})
    client.patch("/api/complaints/2/status", json={"status": "In Progress"})
    client.patch("/api/complaints/3/status", json={"status": "Resolved"})

    stats = client.get("/api/stats").get_json()
    dash_stats = client.get("/api/dashboard/stats").get_json()
    assert stats == dash_stats
    assert stats["total"] == 3
    assert stats["pending"] == 1
    assert stats["in_progress"] == 1
    assert stats["resolved"] == 1
    assert stats["by_category"] == {"Plumbing": 2, "Electrical": 1}
    assert len(stats["by_month"]) == 1

    cats = client.get("/api/dashboard/categories").get_json()
    assert cats["total"] == 3
    assert cats["categories"][0] == {"category": "Plumbing", "count": 2}

    trends = client.get("/api/dashboard/trends").get_json()
    assert len(trends["monthly"]) == 1
    assert len(trends["daily"]) == 1

    csv_res = client.get("/api/complaints/export")
    assert csv_res.status_code == 200
    assert "text/csv" in csv_res.content_type
    rows = list(csv.DictReader(io.StringIO(csv_res.get_data(as_text=True))))
    assert len(rows) == 3
    assert "assigned_to" in rows[0]


# --- AI Endpoints ---

def test_ai_classify_status_and_summarize(client):
    st = client.get("/api/ai/status")
    assert st.status_code == 200
    assert "mode" in st.get_json()

    res = client.post(
        "/api/ai/classify",
        json={"title": "Ceiling Leak", "description": "Water is leaking from the ceiling."},
    )
    assert res.status_code == 200
    body = res.get_json()
    assert body["category"] == "Plumbing"
    assert body["priority"] == "High"
    assert body["summary"]

    auto = client.post(
        "/api/complaints",
        json={
            "title": "WiFi down",
            "description": "Students cannot connect to WiFi in library",
            "location": "Central Library",
            "auto_classify": True,
        },
    )
    assert auto.status_code == 201
    assert auto.get_json()["category"] == "IT / Network"

    summ = client.post(f"/api/complaints/{auto.get_json()['id']}/summarize")
    assert summ.status_code == 200
    assert summ.get_json()["ai_summary"]


# --- Security & Performance (TC64, TC67, TC68, TC73-TC77) ---

def test_security_sqli_method_and_payload_limit(client):
    assert client.get("/api/complaints?search=' OR '1'='1").get_json() == []

    bad_method = client.patch("/api/complaints")
    assert bad_method.status_code == 405
    assert bad_method.is_json

    huge = client.post("/api/complaints", json={**VALID_COMPLAINT, "description": "X" * (2 * 1024 * 1024)})
    assert huge.status_code == 413
    assert huge.is_json


def test_performance_500_records(client):
    conn = database.get_connection()
    conn.executemany(
        """
        INSERT INTO complaints (tracking_id, title, description, category, location, priority, status)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        [
            (f"CMP-2026-{i+1:04d}", f"Issue {i}", f"Details {i}", "Electrical" if i % 2 == 0 else "Plumbing", f"Block {i%5}", "Medium", "Pending")
            for i in range(500)
        ],
    )
    conn.commit()
    conn.close()

    t0 = time.perf_counter()
    res = client.get("/api/complaints")
    elapsed_ms = (time.perf_counter() - t0) * 1000
    assert res.status_code == 200
    assert len(res.get_json()) == 500
    assert elapsed_ms < 1000

    t0 = time.perf_counter()
    assert client.get("/api/complaints?search=Issue 250").status_code == 200
    assert (time.perf_counter() - t0) * 1000 < 500

    t0 = time.perf_counter()
    assert client.get("/api/dashboard/stats").status_code == 200
    assert (time.perf_counter() - t0) * 1000 < 500


# --- Authentication, RBAC, Notifications, Image Upload & Feedback ---

def test_auth_register_login_profile_and_rbac(client):
    # Register a new student
    reg = client.post(
        "/api/auth/register",
        json={
            "full_name": "Riyaz Shaik",
            "college_id": "STU-2026-099",
            "email": "riyaz@campusfix.edu",
            "department": "Computer Science",
            "year_of_study": "3rd Year",
            "phone": "+1 555-0199",
            "password": "Password@123",
        },
    )
    assert reg.status_code == 201
    student_token = reg.get_json()["token"]
    student_headers = {"Authorization": f"Bearer {student_token}"}

    # Login by college_id works
    login_res = client.post(
        "/api/auth/login",
        json={"identifier": "STU-2026-099", "password": "Password@123"},
    )
    assert login_res.status_code == 200

    # Wrong password rejected
    assert client.post(
        "/api/auth/login",
        json={"identifier": "riyaz@campusfix.edu", "password": "WrongPassword"},
    ).status_code == 401

    # Profile fetch & update
    prof = client.get("/api/auth/profile", headers=student_headers)
    assert prof.status_code == 200
    assert prof.get_json()["full_name"] == "Riyaz Shaik"

    upd_prof = client.put(
        "/api/auth/profile",
        headers=student_headers,
        json={"department": "AI & Data Science"},
    )
    assert upd_prof.status_code == 200
    assert upd_prof.get_json()["user"]["department"] == "AI & Data Science"

    # Student creates complaint -> linked to user_id + receives notification
    created = client.post("/api/complaints", headers=student_headers, json=VALID_COMPLAINT)
    assert created.status_code == 201
    cid = created.get_json()["id"]

    notifs = client.get("/api/notifications", headers=student_headers).get_json()
    assert len(notifs) >= 1

    # RBAC: student blocked from admin endpoints (403)
    assert client.get("/api/users", headers=student_headers).status_code == 403
    assert client.patch(f"/api/complaints/{cid}/status", headers=student_headers, json={"status": "Resolved"}).status_code == 403
    assert client.delete(f"/api/complaints/{cid}", headers=student_headers).status_code == 403

    # Seeded admin logs in and succeeds
    admin_login = client.post(
        "/api/auth/login",
        json={"identifier": "admin@campusfix.edu", "password": "Admin@123"},
    )
    assert admin_login.status_code == 200
    admin_headers = {"Authorization": f"Bearer {admin_login.get_json()['token']}"}

    assert client.get("/api/users", headers=admin_headers).status_code == 200
    assert client.patch(f"/api/complaints/{cid}/assign", headers=admin_headers, json={"assigned_to": "Marcus Reid"}).status_code == 200
    assert client.patch(f"/api/complaints/{cid}/status", headers=admin_headers, json={"status": "Resolved"}).status_code == 200

    # Student rates resolved complaint (1-5 stars)
    fb = client.post(
        f"/api/complaints/{cid}/feedback",
        headers=student_headers,
        json={"rating": 5, "comment": "Fixed quickly!"},
    )
    assert fb.status_code == 200
    assert fb.get_json()["rating"] == 5

    # Upload complaint image
    img = client.post(
        f"/api/complaints/{cid}/image",
        data={"image": (io.BytesIO(b"\x89PNG\r\n\x1a\nfake"), "leak.png")},
        content_type="multipart/form-data",
    )
    assert img.status_code == 201
    assert img.get_json()["image_url"].startswith("/api/uploads/")
