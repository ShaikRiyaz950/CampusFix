import csv
import io
import math
import os
import uuid
from datetime import datetime, timedelta, timezone

from flask import Blueprint, Response, jsonify, request, send_from_directory
from ai_service import analyze_complaint, get_gemini_config, is_gemini_configured
from auth import create_notification, get_optional_user
from database import UPLOADS_DIR, generate_tracking_id, get_connection

complaint_bp = Blueprint(
    "complaints",
    __name__,
    url_prefix="/api"
)

ALLOWED_PRIORITIES = ("Low", "Medium", "High", "Critical")
ALLOWED_STATUSES = ("Pending", "Assigned", "In Progress", "Resolved")

STATUS_DEFAULT_NOTES = {
    "Pending": "Status changed to Pending",
    "Assigned": "Assigned to maintenance",
    "In Progress": "In Progress",
    "Resolved": "Resolved",
}

FIELD_MAX_LENGTHS = {
    "title": 200,
    "description": 2000,
    "category": 100,
    "location": 200,
    "assigned_to": 120,
}


def _fetch_history(conn, complaint_id):
    rows = conn.execute(
        """
        SELECT id, complaint_id, status, note, changed_at
        FROM complaint_history
        WHERE complaint_id = ?
        ORDER BY id ASC
        """,
        (complaint_id,)
    ).fetchall()
    return [dict(row) for row in rows]


def _validate_text_field(field, value):
    if not isinstance(value, str) or not value.strip():
        return None, f"{field} is required"
    cleaned = value.strip()
    max_len = FIELD_MAX_LENGTHS[field]
    if len(cleaned) > max_len:
        return None, f"{field} must be at most {max_len} characters"
    return cleaned, None


def _escape_like(term):
    return term.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


ALLOWED_IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp", ".gif"}


def _check_staff_or_admin(allowed_roles=("admin", "staff")):
    """If an Authorization header is sent, validate token and enforce role."""
    user, err = get_optional_user()
    if err:
        return None, (jsonify({"error": err}), 401)
    if user is not None and user["role"] not in allowed_roles:
        return None, (jsonify({"error": "Insufficient permissions for this action."}), 403)
    return user, None


def _build_filter_query(args, current_user=None):
    search = args.get("search", "").strip()
    category = args.get("category", "").strip()
    status = args.get("status", "").strip()
    priority = args.get("priority", "").strip()
    assigned_to = args.get("assigned_to", "").strip()
    mine = args.get("mine", "").strip().lower() in ("1", "true", "yes")
    overdue = args.get("overdue", "").strip().lower() in ("1", "true", "yes")
    date_filter = args.get("date", "").strip().lower()
    date_from = args.get("date_from", "").strip()
    date_to = args.get("date_to", "").strip()
    sort = args.get("sort", "newest").strip().lower()

    where_sql = " WHERE 1=1"
    params = []

    if mine and current_user:
        where_sql += " AND user_id = ?"
        params.append(current_user["id"])

    if overdue:
        cutoff_48h = (datetime.now(timezone.utc) - timedelta(hours=48)).strftime("%Y-%m-%d %H:%M:%S")
        where_sql += " AND status != 'Resolved' AND (created_at <= ? OR priority IN ('Critical', 'High'))"
        params.append(cutoff_48h)

    if search:
        escaped = f"%{_escape_like(search)}%"
        if search.isdigit():
            where_sql += """
                AND (
                    id = ?
                    OR title LIKE ? ESCAPE '\\'
                    OR location LIKE ? ESCAPE '\\'
                    OR description LIKE ? ESCAPE '\\'
                )
            """
            params.extend([int(search), escaped, escaped, escaped])
        else:
            where_sql += """
                AND (
                    tracking_id LIKE ? ESCAPE '\\'
                    OR title LIKE ? ESCAPE '\\'
                    OR location LIKE ? ESCAPE '\\'
                    OR description LIKE ? ESCAPE '\\'
                )
            """
            params.extend([escaped, escaped, escaped, escaped])

    if category:
        where_sql += " AND category = ?"
        params.append(category)

    if status:
        where_sql += " AND status = ?"
        params.append(status)

    if priority:
        where_sql += " AND priority = ?"
        params.append(priority)

    if assigned_to:
        where_sql += " AND assigned_to = ?"
        params.append(assigned_to)

    now_utc = datetime.now(timezone.utc)
    if date_filter == "today":
        cutoff = now_utc.strftime("%Y-%m-%d 00:00:00")
        where_sql += " AND created_at >= ?"
        params.append(cutoff)
    elif date_filter == "week":
        cutoff = (now_utc - timedelta(days=7)).strftime("%Y-%m-%d %H:%M:%S")
        where_sql += " AND created_at >= ?"
        params.append(cutoff)
    elif date_filter == "month":
        cutoff = (now_utc - timedelta(days=30)).strftime("%Y-%m-%d %H:%M:%S")
        where_sql += " AND created_at >= ?"
        params.append(cutoff)

    if date_from:
        where_sql += " AND date(created_at) >= date(?)"
        params.append(date_from)

    if date_to:
        where_sql += " AND date(created_at) <= date(?)"
        params.append(date_to)

    if sort == "oldest":
        order_sql = " ORDER BY id ASC"
    elif sort == "priority":
        order_sql = """
            ORDER BY CASE priority
                WHEN 'Critical' THEN 1
                WHEN 'High' THEN 2
                WHEN 'Medium' THEN 3
                WHEN 'Low' THEN 4
                ELSE 5
            END ASC, id DESC
        """
    else:
        order_sql = " ORDER BY id DESC"

    return where_sql, order_sql, params


@complaint_bp.route("/complaints", methods=["POST"])
def create_complaint():
    user, auth_err = get_optional_user()
    if auth_err:
        return jsonify({"error": auth_err}), 401

    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify({"error": "Invalid JSON payload"}), 400

    auto_classify = bool(data.get("auto_classify", False))
    required_fields = ("title", "description", "location") if auto_classify else ("title", "description", "category", "location")

    cleaned = {}
    for field in required_fields:
        value, err = _validate_text_field(field, data.get(field))
        if err:
            return jsonify({"error": err}), 400
        cleaned[field] = value

    ai_result = None
    if auto_classify:
        ai_result = analyze_complaint(
            cleaned["title"],
            cleaned["description"],
            cleaned["location"]
        )

    # Category: use explicit category if supplied, otherwise AI-classified when auto_classify=True
    if "category" not in cleaned:
        raw_cat = data.get("category")
        if isinstance(raw_cat, str) and raw_cat.strip() and raw_cat.strip().lower() != "auto":
            value, err = _validate_text_field("category", raw_cat)
            if err:
                return jsonify({"error": err}), 400
            cleaned["category"] = value
        else:
            cleaned["category"] = ai_result["category"]

    raw_priority = data.get("priority")
    if raw_priority is None or (isinstance(raw_priority, str) and not raw_priority.strip()):
        priority = ai_result["priority"] if ai_result else "Medium"
    elif isinstance(raw_priority, str) and raw_priority.strip() in ALLOWED_PRIORITIES:
        priority = raw_priority.strip()
    else:
        return jsonify({
            "error": f"Invalid priority. Allowed values: {', '.join(ALLOWED_PRIORITIES)}"
        }), 400

    ai_summary = ai_result["summary"] if ai_result else None

    conn = get_connection()
    cursor = conn.execute("""
        INSERT INTO complaints
        (user_id, title, description, category, location, priority, ai_summary)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (
        user["id"] if user else None,
        cleaned["title"],
        cleaned["description"],
        cleaned["category"],
        cleaned["location"],
        priority,
        ai_summary,
    ))
    complaint_id = cursor.lastrowid
    tracking_id = generate_tracking_id(complaint_id)
    conn.execute(
        "UPDATE complaints SET tracking_id = ? WHERE id = ?",
        (tracking_id, complaint_id)
    )
    conn.execute(
        """
        INSERT INTO complaint_history (complaint_id, status, note)
        VALUES (?, ?, ?)
        """,
        (complaint_id, "Pending", "Complaint submitted")
    )
    if user:
        create_notification(
            conn,
            user["id"],
            complaint_id,
            f"Complaint Logged ({tracking_id})",
            f"Your complaint '{cleaned['title']}' has been received.",
        )
    conn.commit()
    conn.close()

    response_payload = {
        "message": "Complaint submitted successfully",
        "id": complaint_id,
        "tracking_id": tracking_id,
    }
    if ai_result:
        response_payload["category"] = cleaned["category"]
        response_payload["priority"] = priority
        response_payload["ai_summary"] = ai_summary
        response_payload["ai_source"] = ai_result["source"]

    return jsonify(response_payload), 201


@complaint_bp.route("/complaints", methods=["GET"])
def get_complaints():
    user, auth_err = get_optional_user()
    if auth_err:
        return jsonify({"error": auth_err}), 401

    where_sql, order_sql, params = _build_filter_query(request.args, current_user=user)

    page_arg = request.args.get("page")
    limit_arg = request.args.get("limit")

    conn = get_connection()

    if page_arg is not None:
        try:
            page = int(page_arg)
            limit = int(limit_arg) if limit_arg is not None else 10
            if page < 1 or limit < 1 or limit > 100:
                raise ValueError
        except ValueError:
            conn.close()
            return jsonify({"error": "Invalid pagination parameters"}), 400

        total = conn.execute(
            f"SELECT COUNT(*) FROM complaints{where_sql}",
            params
        ).fetchone()[0]

        offset = (page - 1) * limit
        rows = conn.execute(
            f"SELECT * FROM complaints{where_sql}{order_sql} LIMIT ? OFFSET ?",
            [*params, limit, offset]
        ).fetchall()
        conn.close()

        return jsonify({
            "items": [dict(row) for row in rows],
            "page": page,
            "limit": limit,
            "total": total,
            "total_pages": math.ceil(total / limit) if total > 0 else 0,
        })

    rows = conn.execute(
        f"SELECT * FROM complaints{where_sql}{order_sql}",
        params
    ).fetchall()
    conn.close()

    return jsonify([dict(row) for row in rows])


@complaint_bp.route("/complaints/<int:complaint_id>", methods=["GET"])
def get_single_complaint(complaint_id):
    if complaint_id <= 0:
        return jsonify({"error": "Invalid complaint ID"}), 400

    conn = get_connection()
    row = conn.execute(
        "SELECT * FROM complaints WHERE id = ?",
        (complaint_id,)
    ).fetchone()

    if row is None:
        conn.close()
        return jsonify({"error": "Complaint not found"}), 404

    complaint = dict(row)
    complaint["history"] = _fetch_history(conn, complaint_id)
    conn.close()

    return jsonify(complaint)


@complaint_bp.route("/complaints/track/<string:tracking_id>", methods=["GET"])
def track_complaint(tracking_id):
    cleaned_tid = tracking_id.strip().upper()
    if not cleaned_tid:
        return jsonify({"error": "Tracking ID is required"}), 400

    conn = get_connection()
    row = conn.execute(
        "SELECT * FROM complaints WHERE UPPER(tracking_id) = ?",
        (cleaned_tid,)
    ).fetchone()

    if row is None:
        conn.close()
        return jsonify({"error": "Complaint not found"}), 404

    complaint = dict(row)
    complaint["history"] = _fetch_history(conn, complaint["id"])
    conn.close()

    return jsonify(complaint)


@complaint_bp.route("/complaints/<int:complaint_id>/history", methods=["GET"])
def get_complaint_history(complaint_id):
    if complaint_id <= 0:
        return jsonify({"error": "Invalid complaint ID"}), 400

    conn = get_connection()
    exists = conn.execute(
        "SELECT 1 FROM complaints WHERE id = ?",
        (complaint_id,)
    ).fetchone()

    if exists is None:
        conn.close()
        return jsonify({"error": "Complaint not found"}), 404

    history = _fetch_history(conn, complaint_id)
    conn.close()

    return jsonify(history)


@complaint_bp.route("/complaints/<int:complaint_id>", methods=["PUT"])
def update_complaint(complaint_id):
    if complaint_id <= 0:
        return jsonify({"error": "Invalid complaint ID"}), 400

    data = request.get_json(silent=True)
    if not isinstance(data, dict) or not data:
        return jsonify({"error": "Request body must be a non-empty JSON object"}), 400

    updates = {}

    if "status" in data:
        status = data.get("status")
        if not isinstance(status, str) or status.strip() not in ALLOWED_STATUSES:
            return jsonify({
                "error": f"Invalid status. Allowed values: {', '.join(ALLOWED_STATUSES)}"
            }), 400
        updates["status"] = status.strip()

    if "priority" in data:
        priority = data.get("priority")
        if not isinstance(priority, str) or priority.strip() not in ALLOWED_PRIORITIES:
            return jsonify({
                "error": f"Invalid priority. Allowed values: {', '.join(ALLOWED_PRIORITIES)}"
            }), 400
        updates["priority"] = priority.strip()

    for field in ("title", "description", "category", "location", "assigned_to"):
        if field in data:
            value, err = _validate_text_field(field, data.get(field))
            if err:
                return jsonify({"error": err}), 400
            updates[field] = value

    if not updates:
        return jsonify({"error": "No valid fields provided for update"}), 400

    set_clause = ", ".join(f"{col} = ?" for col in updates)
    values = [*updates.values(), complaint_id]

    conn = get_connection()
    existing = conn.execute(
        "SELECT status FROM complaints WHERE id = ?",
        (complaint_id,)
    ).fetchone()

    if existing is None:
        conn.close()
        return jsonify({"error": "Complaint not found"}), 404

    conn.execute(
        f"UPDATE complaints SET {set_clause} WHERE id = ?",
        values
    )

    if "status" in updates:
        custom_note = data.get("note")
        if isinstance(custom_note, str) and custom_note.strip():
            note = custom_note.strip()[:250]
        else:
            note = STATUS_DEFAULT_NOTES.get(updates["status"], updates["status"])

        if updates["status"] != existing["status"] or (isinstance(custom_note, str) and custom_note.strip()):
            conn.execute(
                """
                INSERT INTO complaint_history (complaint_id, status, note)
                VALUES (?, ?, ?)
                """,
                (complaint_id, updates["status"], note)
            )

    conn.commit()
    history = _fetch_history(conn, complaint_id)
    conn.close()

    response_body = {
        "message": "Complaint updated successfully",
        "id": complaint_id,
        **updates,
        "history": history,
    }
    return jsonify(response_body)


@complaint_bp.route("/complaints/<int:complaint_id>/status", methods=["PATCH"])
def patch_complaint_status(complaint_id):
    _, guard_err = _check_staff_or_admin(("admin", "staff"))
    if guard_err:
        return guard_err

    if complaint_id <= 0:
        return jsonify({"error": "Invalid complaint ID"}), 400

    data = request.get_json(silent=True)
    if not isinstance(data, dict) or "status" not in data:
        return jsonify({"error": "status is required"}), 400

    status = data.get("status")
    if not isinstance(status, str) or status.strip() not in ALLOWED_STATUSES:
        return jsonify({
            "error": f"Invalid status. Allowed values: {', '.join(ALLOWED_STATUSES)}"
        }), 400
    status = status.strip()

    conn = get_connection()
    existing = conn.execute(
        "SELECT status, user_id, tracking_id, title FROM complaints WHERE id = ?",
        (complaint_id,)
    ).fetchone()
    if existing is None:
        conn.close()
        return jsonify({"error": "Complaint not found"}), 404

    conn.execute(
        "UPDATE complaints SET status = ? WHERE id = ?",
        (status, complaint_id)
    )

    custom_note = data.get("note")
    if isinstance(custom_note, str) and custom_note.strip():
        note = custom_note.strip()[:250]
    else:
        note = STATUS_DEFAULT_NOTES.get(status, status)

    if status != existing["status"] or (isinstance(custom_note, str) and custom_note.strip()):
        conn.execute(
            "INSERT INTO complaint_history (complaint_id, status, note) VALUES (?, ?, ?)",
            (complaint_id, status, note)
        )
        if existing["user_id"]:
            create_notification(
                conn,
                existing["user_id"],
                complaint_id,
                f"Status Updated: {status}",
                f"{existing['tracking_id']} ({existing['title']}) is now {status}.",
            )

    conn.commit()
    history = _fetch_history(conn, complaint_id)
    conn.close()

    return jsonify({
        "message": "Complaint status updated successfully",
        "id": complaint_id,
        "status": status,
        "history": history,
    })


@complaint_bp.route("/complaints/<int:complaint_id>/priority", methods=["PATCH"])
def patch_complaint_priority(complaint_id):
    _, guard_err = _check_staff_or_admin(("admin", "staff"))
    if guard_err:
        return guard_err

    if complaint_id <= 0:
        return jsonify({"error": "Invalid complaint ID"}), 400

    data = request.get_json(silent=True)
    if not isinstance(data, dict) or "priority" not in data:
        return jsonify({"error": "priority is required"}), 400

    priority = data.get("priority")
    if not isinstance(priority, str) or priority.strip() not in ALLOWED_PRIORITIES:
        return jsonify({
            "error": f"Invalid priority. Allowed values: {', '.join(ALLOWED_PRIORITIES)}"
        }), 400
    priority = priority.strip()

    conn = get_connection()
    existing = conn.execute(
        "SELECT status, priority FROM complaints WHERE id = ?",
        (complaint_id,)
    ).fetchone()
    if existing is None:
        conn.close()
        return jsonify({"error": "Complaint not found"}), 404

    conn.execute(
        "UPDATE complaints SET priority = ? WHERE id = ?",
        (priority, complaint_id)
    )
    if priority != existing["priority"]:
        conn.execute(
            "INSERT INTO complaint_history (complaint_id, status, note) VALUES (?, ?, ?)",
            (complaint_id, existing["status"], f"Priority changed to {priority}")
        )
    conn.commit()
    conn.close()

    return jsonify({
        "message": "Complaint priority updated successfully",
        "id": complaint_id,
        "priority": priority,
    })


@complaint_bp.route("/complaints/<int:complaint_id>/assign", methods=["PATCH"])
def assign_complaint(complaint_id):
    _, guard_err = _check_staff_or_admin(("admin",))
    if guard_err:
        return guard_err

    if complaint_id <= 0:
        return jsonify({"error": "Invalid complaint ID"}), 400

    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify({"error": "Invalid JSON payload"}), 400

    assigned_to, err = _validate_text_field("assigned_to", data.get("assigned_to"))
    if err:
        return jsonify({"error": err}), 400

    conn = get_connection()
    existing = conn.execute(
        "SELECT status, user_id, tracking_id, title FROM complaints WHERE id = ?",
        (complaint_id,)
    ).fetchone()
    if existing is None:
        conn.close()
        return jsonify({"error": "Complaint not found"}), 404

    new_status = "Assigned" if existing["status"] == "Pending" else existing["status"]
    conn.execute(
        "UPDATE complaints SET assigned_to = ?, status = ? WHERE id = ?",
        (assigned_to, new_status, complaint_id)
    )

    custom_note = data.get("note")
    note = custom_note.strip()[:250] if isinstance(custom_note, str) and custom_note.strip() else f"Assigned to {assigned_to}"
    conn.execute(
        "INSERT INTO complaint_history (complaint_id, status, note) VALUES (?, ?, ?)",
        (complaint_id, new_status, note)
    )
    if existing["user_id"]:
        create_notification(
            conn,
            existing["user_id"],
            complaint_id,
            f"Assigned: {existing['tracking_id']}",
            f"{assigned_to} has been assigned to '{existing['title']}'.",
        )
    conn.commit()
    history = _fetch_history(conn, complaint_id)
    conn.close()

    return jsonify({
        "message": "Complaint assigned successfully",
        "id": complaint_id,
        "assigned_to": assigned_to,
        "status": new_status,
        "history": history,
    })


@complaint_bp.route("/complaints/<int:complaint_id>", methods=["DELETE"])
def delete_complaint(complaint_id):
    _, guard_err = _check_staff_or_admin(("admin",))
    if guard_err:
        return guard_err

    if complaint_id <= 0:
        return jsonify({"error": "Invalid complaint ID"}), 400

    conn = get_connection()
    cursor = conn.execute(
        "DELETE FROM complaints WHERE id = ?",
        (complaint_id,)
    )
    conn.commit()
    deleted_rows = cursor.rowcount
    conn.close()

    if deleted_rows == 0:
        return jsonify({"error": "Complaint not found"}), 404

    return jsonify({"message": "Complaint deleted successfully"})


@complaint_bp.route("/complaints/export", methods=["GET"])
def export_complaints_csv():
    where_sql, order_sql, params = _build_filter_query(request.args)

    conn = get_connection()
    rows = conn.execute(
        f"SELECT * FROM complaints{where_sql}{order_sql}",
        params
    ).fetchall()
    conn.close()

    output = io.StringIO()
    fieldnames = [
        "id",
        "tracking_id",
        "title",
        "description",
        "category",
        "location",
        "priority",
        "status",
        "assigned_to",
        "created_at",
    ]
    writer = csv.DictWriter(output, fieldnames=fieldnames)
    writer.writeheader()
    for row in rows:
        writer.writerow({key: row[key] for key in fieldnames})

    return Response(
        output.getvalue(),
        mimetype="text/csv",
        headers={
            "Content-Disposition": "attachment; filename=complaints_report.csv"
        }
    )


@complaint_bp.route("/stats", methods=["GET"])
@complaint_bp.route("/dashboard/stats", methods=["GET"])
def get_stats():
    conn = get_connection()

    total = conn.execute("SELECT COUNT(*) FROM complaints").fetchone()[0]
    pending = conn.execute(
        "SELECT COUNT(*) FROM complaints WHERE status = 'Pending'"
    ).fetchone()[0]
    assigned = conn.execute(
        "SELECT COUNT(*) FROM complaints WHERE status = 'Assigned'"
    ).fetchone()[0]
    in_progress = conn.execute(
        "SELECT COUNT(*) FROM complaints WHERE status = 'In Progress'"
    ).fetchone()[0]
    resolved = conn.execute(
        "SELECT COUNT(*) FROM complaints WHERE status = 'Resolved'"
    ).fetchone()[0]

    category_rows = conn.execute("""
        SELECT category, COUNT(*) AS count
        FROM complaints
        GROUP BY category
        ORDER BY count DESC, category ASC
    """).fetchall()

    priority_rows = conn.execute("""
        SELECT priority, COUNT(*) AS count
        FROM complaints
        GROUP BY priority
    """).fetchall()

    month_rows = conn.execute("""
        SELECT strftime('%Y-%m', created_at) AS month, COUNT(*) AS count
        FROM complaints
        WHERE created_at IS NOT NULL
        GROUP BY month
        ORDER BY month ASC
    """).fetchall()

    conn.close()

    by_category = {row["category"]: row["count"] for row in category_rows}
    by_priority = {p: 0 for p in ALLOWED_PRIORITIES}
    for row in priority_rows:
        by_priority[row["priority"]] = row["count"]

    by_status = {
        "Pending": pending,
        "Assigned": assigned,
        "In Progress": in_progress,
        "Resolved": resolved,
    }
    by_month = [
        {"month": row["month"], "count": row["count"]}
        for row in month_rows
    ]

    return jsonify({
        "total": total,
        "pending": pending,
        "assigned": assigned,
        "in_progress": in_progress,
        "resolved": resolved,
        "by_status": by_status,
        "by_category": by_category,
        "by_priority": by_priority,
        "by_month": by_month,
    })


@complaint_bp.route("/dashboard/categories", methods=["GET"])
def get_dashboard_categories():
    conn = get_connection()
    rows = conn.execute("""
        SELECT category, COUNT(*) AS count
        FROM complaints
        GROUP BY category
        ORDER BY count DESC, category ASC
    """).fetchall()
    conn.close()

    categories = [{"category": row["category"], "count": row["count"]} for row in rows]
    by_category = {row["category"]: row["count"] for row in rows}
    total = sum(row["count"] for row in rows)

    return jsonify({
        "total": total,
        "categories": categories,
        "by_category": by_category,
    })


@complaint_bp.route("/dashboard/trends", methods=["GET"])
def get_dashboard_trends():
    conn = get_connection()
    monthly_rows = conn.execute("""
        SELECT strftime('%Y-%m', created_at) AS month, COUNT(*) AS count
        FROM complaints
        WHERE created_at IS NOT NULL
        GROUP BY month
        ORDER BY month ASC
    """).fetchall()
    daily_rows = conn.execute("""
        SELECT date(created_at) AS date, COUNT(*) AS count
        FROM complaints
        WHERE created_at IS NOT NULL
          AND date(created_at) >= date('now', '-30 days')
        GROUP BY date
        ORDER BY date ASC
    """).fetchall()
    conn.close()

    return jsonify({
        "monthly": [{"month": row["month"], "count": row["count"]} for row in monthly_rows],
        "daily": [{"date": row["date"], "count": row["count"]} for row in daily_rows],
    })


@complaint_bp.route("/ai/status", methods=["GET"])
def ai_status():
    _, model_name = get_gemini_config()
    configured = is_gemini_configured()
    return jsonify({
        "gemini_configured": configured,
        "model": model_name,
        "mode": "gemini" if configured else "fallback",
    })


@complaint_bp.route("/ai/analyze", methods=["POST"])
@complaint_bp.route("/ai/classify", methods=["POST"])
def ai_analyze():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify({"error": "Invalid JSON payload"}), 400

    title = data.get("title", "")
    description = data.get("description", "")
    location = data.get("location", "")

    if not isinstance(title, str) or not isinstance(description, str) or not isinstance(location, str):
        return jsonify({"error": "title, description, and location must be strings"}), 400

    if not title.strip() and not description.strip():
        return jsonify({"error": "Provide at least a title or description to analyze"}), 400

    result = analyze_complaint(title.strip(), description.strip(), location.strip())
    return jsonify(result)


@complaint_bp.route("/complaints/<int:complaint_id>/summarize", methods=["POST"])
def summarize_existing_complaint(complaint_id):
    if complaint_id <= 0:
        return jsonify({"error": "Invalid complaint ID"}), 400

    conn = get_connection()
    row = conn.execute(
        "SELECT * FROM complaints WHERE id = ?",
        (complaint_id,)
    ).fetchone()

    if row is None:
        conn.close()
        return jsonify({"error": "Complaint not found"}), 404

    result = analyze_complaint(row["title"], row["description"], row["location"])
    conn.execute(
        "UPDATE complaints SET ai_summary = ? WHERE id = ?",
        (result["summary"], complaint_id)
    )
    conn.commit()
    conn.close()

    return jsonify({
        "id": complaint_id,
        "tracking_id": row["tracking_id"],
        "ai_summary": result["summary"],
        "suggested_category": result["category"],
        "suggested_priority": result["priority"],
        "source": result["source"],
    })


@complaint_bp.route("/complaints/<int:complaint_id>/image", methods=["POST"])
def upload_complaint_image(complaint_id):
    if complaint_id <= 0:
        return jsonify({"error": "Invalid complaint ID"}), 400

    if "image" not in request.files:
        return jsonify({"error": "No image file provided"}), 400

    file = request.files["image"]
    if not file or not file.filename:
        return jsonify({"error": "Empty filename"}), 400

    _, ext = os.path.splitext(file.filename.lower())
    if ext not in ALLOWED_IMAGE_EXTENSIONS:
        return jsonify({"error": "Unsupported image format. Use PNG, JPG, WEBP, or GIF."}), 400

    conn = get_connection()
    row = conn.execute("SELECT id FROM complaints WHERE id = ?", (complaint_id,)).fetchone()
    if row is None:
        conn.close()
        return jsonify({"error": "Complaint not found"}), 404

    os.makedirs(UPLOADS_DIR, exist_ok=True)
    safe_name = f"cmp_{complaint_id}_{uuid.uuid4().hex[:10]}{ext}"
    file.save(os.path.join(UPLOADS_DIR, safe_name))
    image_url = f"/api/uploads/{safe_name}"

    conn.execute("UPDATE complaints SET image_url = ? WHERE id = ?", (image_url, complaint_id))
    conn.commit()
    conn.close()

    return jsonify({"message": "Image uploaded successfully", "image_url": image_url}), 201


@complaint_bp.route("/uploads/<path:filename>", methods=["GET"])
def serve_uploaded_image(filename):
    return send_from_directory(UPLOADS_DIR, filename)


@complaint_bp.route("/complaints/<int:complaint_id>/feedback", methods=["POST"])
def submit_complaint_feedback(complaint_id):
    if complaint_id <= 0:
        return jsonify({"error": "Invalid complaint ID"}), 400

    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify({"error": "Invalid JSON payload"}), 400

    rating = data.get("rating")
    comment = (data.get("comment") or "").strip()[:500]
    if not isinstance(rating, int) or rating < 1 or rating > 5:
        return jsonify({"error": "Rating must be an integer between 1 and 5"}), 400

    conn = get_connection()
    row = conn.execute("SELECT id, status FROM complaints WHERE id = ?", (complaint_id,)).fetchone()
    if row is None:
        conn.close()
        return jsonify({"error": "Complaint not found"}), 404
    if row["status"] != "Resolved":
        conn.close()
        return jsonify({"error": "Feedback can only be submitted after a complaint is Resolved"}), 400

    conn.execute(
        "UPDATE complaints SET rating = ?, feedback_comment = ? WHERE id = ?",
        (rating, comment, complaint_id),
    )
    conn.execute(
        "INSERT INTO complaint_history (complaint_id, status, note) VALUES (?, ?, ?)",
        (complaint_id, "Resolved", f"Student rated resolution {rating}/5 stars"),
    )
    conn.commit()
    conn.close()

    return jsonify({
        "message": "Thank you for your feedback!",
        "id": complaint_id,
        "rating": rating,
        "feedback_comment": comment,
    })
