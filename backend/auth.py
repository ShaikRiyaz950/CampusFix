import os
import re
from functools import wraps

from flask import Blueprint, jsonify, request
from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer
from werkzeug.security import check_password_hash, generate_password_hash

from database import get_connection

auth_bp = Blueprint("auth", __name__, url_prefix="/api")

ALLOWED_ROLES = ("student", "staff", "admin")
EMAIL_REGEX = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def _get_serializer():
    secret = os.getenv("SECRET_KEY", "campusfix-university-secret-key-2026")
    return URLSafeTimedSerializer(secret, salt="campusfix-auth-token")


def create_auth_token(user_id, role, remember_me=False):
    serializer = _get_serializer()
    return serializer.dumps({
        "uid": user_id,
        "role": role,
        "remember": bool(remember_me),
    })


def verify_auth_token(token):
    serializer = _get_serializer()
    # Allow up to 14 days for remember_me tokens, 24h for standard tokens
    try:
        payload = serializer.loads(token, max_age=14 * 24 * 3600)
        if not payload.get("remember"):
            payload = serializer.loads(token, max_age=24 * 3600)
        return payload, None
    except SignatureExpired:
        return None, "Session expired. Please log in again."
    except BadSignature:
        return None, "Invalid authentication token."


def serialize_user(row):
    if row is None:
        return None
    return {
        "id": row["id"],
        "full_name": row["full_name"],
        "college_id": row["college_id"],
        "email": row["email"],
        "role": row["role"],
        "department": row["department"] or "",
        "year_of_study": row["year_of_study"] or "",
        "phone": row["phone"] or "",
        "created_at": row["created_at"],
    }


def get_optional_user():
    """Returns (user_dict, error_message). If no Authorization header, returns (None, None)."""
    auth_header = request.headers.get("Authorization", "").strip()
    if not auth_header:
        return None, None
    if not auth_header.lower().startswith("bearer "):
        return None, "Authorization header must use Bearer token."
    token = auth_header[7:].strip()
    if not token:
        return None, "Missing authentication token."

    payload, err = verify_auth_token(token)
    if err:
        return None, err

    conn = get_connection()
    row = conn.execute("SELECT * FROM users WHERE id = ?", (payload["uid"],)).fetchone()
    conn.close()
    if row is None:
        return None, "User account no longer exists."
    return serialize_user(row), None


def require_auth(roles=None):
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            user, err = get_optional_user()
            if err:
                return jsonify({"error": err}), 401
            if user is None:
                return jsonify({"error": "Authentication required."}), 401
            if roles and user["role"] not in roles:
                return jsonify({"error": "Insufficient permissions for this action."}), 403
            return fn(user, *args, **kwargs)
        return wrapper
    return decorator


def create_notification(conn, user_id, complaint_id, title, message):
    if not user_id:
        return
    conn.execute(
        """
        INSERT INTO notifications (user_id, complaint_id, title, message)
        VALUES (?, ?, ?, ?)
        """,
        (user_id, complaint_id, title, message),
    )


@auth_bp.route("/auth/register", methods=["POST"])
def register():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify({"error": "Invalid JSON payload"}), 400

    full_name = (data.get("full_name") or "").strip()
    college_id = (data.get("college_id") or "").strip().upper()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    department = (data.get("department") or "").strip()[:100]
    year_of_study = (data.get("year_of_study") or data.get("year") or "").strip()[:50]
    phone = (data.get("phone") or "").strip()[:30]
    role = (data.get("role") or "student").strip().lower()

    if not full_name or len(full_name) < 2:
        return jsonify({"error": "Full name is required (min 2 characters)."}), 400
    if not college_id or len(college_id) < 3:
        return jsonify({"error": "College / Student ID is required."}), 400
    if not EMAIL_REGEX.match(email):
        return jsonify({"error": "Please enter a valid college email address."}), 400
    if not isinstance(password, str) or len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters."}), 400
    if role not in ALLOWED_ROLES:
        role = "student"

    conn = get_connection()
    existing = conn.execute(
        "SELECT id FROM users WHERE LOWER(email) = ? OR UPPER(college_id) = ?",
        (email, college_id),
    ).fetchone()
    if existing:
        conn.close()
        return jsonify({"error": "An account with that email or college ID already exists."}), 409

    cursor = conn.execute(
        """
        INSERT INTO users
        (full_name, college_id, email, password_hash, role, department, year_of_study, phone)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            full_name[:120],
            college_id[:40],
            email[:120],
            generate_password_hash(password),
            role,
            department,
            year_of_study,
            phone,
        ),
    )
    user_id = cursor.lastrowid
    create_notification(
        conn,
        user_id,
        None,
        "Welcome to CampusFix!",
        f"Your {role} account ({college_id}) is active. Report issues or track campus updates anytime.",
    )
    conn.commit()
    row = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    conn.close()

    user = serialize_user(row)
    token = create_auth_token(user["id"], user["role"], remember_me=True)
    return jsonify({
        "message": "Registration successful",
        "token": token,
        "user": user,
    }), 201


@auth_bp.route("/auth/login", methods=["POST"])
def login():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify({"error": "Invalid JSON payload"}), 400

    identifier = (data.get("identifier") or data.get("email") or data.get("college_id") or "").strip()
    password = data.get("password") or ""
    remember_me = bool(data.get("remember_me", False))

    if not identifier or not password:
        return jsonify({"error": "Email/College ID and password are required."}), 400

    conn = get_connection()
    row = conn.execute(
        "SELECT * FROM users WHERE LOWER(email) = ? OR UPPER(college_id) = ?",
        (identifier.lower(), identifier.upper()),
    ).fetchone()
    conn.close()

    if row is None or not check_password_hash(row["password_hash"], password):
        return jsonify({"error": "Invalid email/college ID or password."}), 401

    user = serialize_user(row)
    token = create_auth_token(user["id"], user["role"], remember_me=remember_me)
    return jsonify({
        "message": "Login successful",
        "token": token,
        "user": user,
    })


@auth_bp.route("/auth/profile", methods=["GET"])
@require_auth()
def get_profile(current_user):
    return jsonify(current_user)


@auth_bp.route("/auth/profile", methods=["PUT"])
@require_auth()
def update_profile(current_user):
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify({"error": "Invalid JSON payload"}), 400

    full_name = (data.get("full_name") or current_user["full_name"]).strip()
    department = (data.get("department") if data.get("department") is not None else current_user["department"]).strip()[:100]
    year_of_study = (data.get("year_of_study") if data.get("year_of_study") is not None else current_user["year_of_study"]).strip()[:50]
    phone = (data.get("phone") if data.get("phone") is not None else current_user["phone"]).strip()[:30]

    if len(full_name) < 2:
        return jsonify({"error": "Full name must be at least 2 characters."}), 400

    conn = get_connection()
    conn.execute(
        """
        UPDATE users
        SET full_name = ?, department = ?, year_of_study = ?, phone = ?
        WHERE id = ?
        """,
        (full_name[:120], department, year_of_study, phone, current_user["id"]),
    )
    conn.commit()
    row = conn.execute("SELECT * FROM users WHERE id = ?", (current_user["id"],)).fetchone()
    conn.close()

    return jsonify({
        "message": "Profile updated successfully",
        "user": serialize_user(row),
    })


@auth_bp.route("/auth/forgot-password", methods=["POST"])
def forgot_password():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify({"error": "Invalid JSON payload"}), 400
    identifier = (data.get("identifier") or data.get("email") or "").strip()
    if not identifier:
        return jsonify({"error": "Please enter your college email or ID."}), 400
    return jsonify({
        "message": "If an account matches that email or college ID, password reset instructions have been sent."
    })


@auth_bp.route("/users", methods=["GET"])
@require_auth(roles=("admin",))
def list_users(_current_user):
    conn = get_connection()
    rows = conn.execute(
        """
        SELECT u.*, COUNT(c.id) AS complaint_count
        FROM users u
        LEFT JOIN complaints c ON c.user_id = u.id
        GROUP BY u.id
        ORDER BY u.id ASC
        """
    ).fetchall()
    conn.close()

    users = []
    for row in rows:
        item = serialize_user(row)
        item["complaint_count"] = row["complaint_count"]
        users.append(item)
    return jsonify(users)


@auth_bp.route("/users/<int:user_id>/role", methods=["PATCH"])
@require_auth(roles=("admin",))
def update_user_role(current_user, user_id):
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify({"error": "Invalid JSON payload"}), 400

    new_role = (data.get("role") or "").strip().lower()
    if new_role not in ALLOWED_ROLES:
        return jsonify({"error": f"Invalid role. Allowed: {', '.join(ALLOWED_ROLES)}"}), 400

    if user_id == current_user["id"] and new_role != "admin":
        return jsonify({"error": "You cannot remove your own administrator role."}), 400

    conn = get_connection()
    cursor = conn.execute("UPDATE users SET role = ? WHERE id = ?", (new_role, user_id))
    conn.commit()
    updated = cursor.rowcount
    row = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    conn.close()

    if updated == 0:
        return jsonify({"error": "User not found."}), 404

    return jsonify({
        "message": "User role updated",
        "user": serialize_user(row),
    })


@auth_bp.route("/users/staff", methods=["GET"])
def list_staff():
    conn = get_connection()
    rows = conn.execute(
        "SELECT id, full_name, college_id, department FROM users WHERE role IN ('staff', 'admin') ORDER BY full_name ASC"
    ).fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])


@auth_bp.route("/notifications", methods=["GET"])
@require_auth()
def list_notifications(current_user):
    conn = get_connection()
    rows = conn.execute(
        """
        SELECT * FROM notifications
        WHERE user_id = ?
        ORDER BY id DESC
        LIMIT 30
        """,
        (current_user["id"],),
    ).fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])


@auth_bp.route("/notifications/read-all", methods=["PATCH"])
@require_auth()
def mark_notifications_read(current_user):
    conn = get_connection()
    conn.execute("UPDATE notifications SET is_read = 1 WHERE user_id = ?", (current_user["id"],))
    conn.commit()
    conn.close()
    return jsonify({"message": "All notifications marked as read"})
