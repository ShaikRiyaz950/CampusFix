import os
import sqlite3
from datetime import datetime, timezone
from dotenv import load_dotenv
from werkzeug.security import generate_password_hash

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, ".env"))

_raw_db_path = os.getenv("DATABASE_PATH", "complaints.db").strip() or "complaints.db"
DB_NAME = _raw_db_path if os.path.isabs(_raw_db_path) else os.path.join(BASE_DIR, _raw_db_path)
UPLOADS_DIR = os.path.join(BASE_DIR, "uploads")


def generate_tracking_id(complaint_id, created_at=None):
    year = datetime.now(timezone.utc).year
    if isinstance(created_at, str) and len(created_at) >= 4 and created_at[:4].isdigit():
        year = int(created_at[:4])
    return f"CMP-{year}-{complaint_id:04d}"


def get_connection():
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db():
    os.makedirs(UPLOADS_DIR, exist_ok=True)
    conn = get_connection()

    conn.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            full_name TEXT NOT NULL,
            college_id TEXT NOT NULL UNIQUE,
            email TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'student',
            department TEXT DEFAULT '',
            year_of_study TEXT DEFAULT '',
            phone TEXT DEFAULT '',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    conn.execute("""
        CREATE TABLE IF NOT EXISTS complaints (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tracking_id TEXT,
            user_id INTEGER,
            title TEXT NOT NULL,
            description TEXT NOT NULL,
            category TEXT NOT NULL,
            location TEXT NOT NULL,
            priority TEXT DEFAULT 'Medium',
            status TEXT DEFAULT 'Pending',
            assigned_to TEXT,
            ai_summary TEXT,
            image_url TEXT,
            rating INTEGER,
            feedback_comment TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
        )
    """)

    conn.execute("""
        CREATE TABLE IF NOT EXISTS complaint_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            complaint_id INTEGER NOT NULL,
            status TEXT NOT NULL,
            note TEXT NOT NULL,
            changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (complaint_id) REFERENCES complaints(id) ON DELETE CASCADE
        )
    """)

    conn.execute("""
        CREATE TABLE IF NOT EXISTS notifications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            complaint_id INTEGER,
            title TEXT NOT NULL,
            message TEXT NOT NULL,
            is_read INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (complaint_id) REFERENCES complaints(id) ON DELETE CASCADE
        )
    """)

    # Backward-compatible migrations for existing databases
    columns = {
        row["name"]
        for row in conn.execute("PRAGMA table_info(complaints)").fetchall()
    }
    migrations = {
        "tracking_id": "ALTER TABLE complaints ADD COLUMN tracking_id TEXT",
        "user_id": "ALTER TABLE complaints ADD COLUMN user_id INTEGER",
        "assigned_to": "ALTER TABLE complaints ADD COLUMN assigned_to TEXT",
        "ai_summary": "ALTER TABLE complaints ADD COLUMN ai_summary TEXT",
        "image_url": "ALTER TABLE complaints ADD COLUMN image_url TEXT",
        "rating": "ALTER TABLE complaints ADD COLUMN rating INTEGER",
        "feedback_comment": "ALTER TABLE complaints ADD COLUMN feedback_comment TEXT",
    }
    for col, sql in migrations.items():
        if col not in columns:
            conn.execute(sql)

    # Seed default demo accounts if users table is empty
    user_count = conn.execute("SELECT COUNT(*) FROM users").fetchone()[0]
    if user_count == 0:
        seed_users = [
            (
                "Dr. Elena Vance",
                "ADM-001",
                "admin@campusfix.edu",
                generate_password_hash("Admin@123"),
                "admin",
                "Campus Operations",
                "Administration",
                "+1 555-0100",
            ),
            (
                "Marcus Reid",
                "STF-101",
                "staff@campusfix.edu",
                generate_password_hash("Staff@123"),
                "staff",
                "Facilities & Maintenance",
                "Staff",
                "+1 555-0142",
            ),
            (
                "Aarav Patel",
                "STU-2026-001",
                "student@campusfix.edu",
                generate_password_hash("Student@123"),
                "student",
                "Computer Science",
                "3rd Year",
                "+1 555-0198",
            ),
        ]
        conn.executemany(
            """
            INSERT INTO users
            (full_name, college_id, email, password_hash, role, department, year_of_study, phone)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            seed_users,
        )

    # Backfill or upgrade tracking IDs to CMP-YYYY-NNNN format
    existing_rows = conn.execute(
        "SELECT id, tracking_id, status, created_at FROM complaints"
    ).fetchall()
    for row in existing_rows:
        tid = row["tracking_id"] or ""
        if not tid.startswith("CMP-"):
            new_tid = generate_tracking_id(row["id"], row["created_at"])
            conn.execute(
                "UPDATE complaints SET tracking_id = ? WHERE id = ?",
                (new_tid, row["id"])
            )

        has_history = conn.execute(
            "SELECT 1 FROM complaint_history WHERE complaint_id = ? LIMIT 1",
            (row["id"],)
        ).fetchone()
        if not has_history:
            conn.execute(
                """
                INSERT INTO complaint_history (complaint_id, status, note, changed_at)
                VALUES (?, ?, ?, ?)
                """,
                (row["id"], "Pending", "Complaint submitted", row["created_at"])
            )
            if row["status"] and row["status"] != "Pending":
                conn.execute(
                    """
                    INSERT INTO complaint_history (complaint_id, status, note)
                    VALUES (?, ?, ?)
                    """,
                    (row["id"], row["status"], row["status"])
                )

    conn.execute("CREATE INDEX IF NOT EXISTS idx_complaints_status ON complaints(status)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_complaints_category ON complaints(category)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_complaints_tracking_id ON complaints(tracking_id)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_complaints_user_id ON complaints(user_id)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_history_complaint_id ON complaint_history(complaint_id)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id)")

    conn.commit()
    conn.close()
