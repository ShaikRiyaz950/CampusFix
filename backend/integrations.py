import hashlib
import os
import threading
import time

import requests
from dotenv import load_dotenv
from flask import current_app

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ENV_PATH = os.path.join(BASE_DIR, ".env")


def _reload_env():
    load_dotenv(ENV_PATH, override=False)


def _external_calls_allowed():
    """Disable live third-party network calls during automated pytest runs."""
    try:
        if current_app and current_app.config.get("TESTING"):
            return False
    except RuntimeError:
        pass
    return True


# ---------------------------------------------------------------------------
# Cloudinary Image Upload (Signed REST API with automatic local fallback)
# ---------------------------------------------------------------------------
def is_cloudinary_configured():
    _reload_env()
    return bool(
        os.getenv("CLOUDINARY_CLOUD_NAME", "").strip()
        and os.getenv("CLOUDINARY_API_KEY", "").strip()
        and os.getenv("CLOUDINARY_API_SECRET", "").strip()
    )


def upload_image_to_cloudinary(file_bytes, filename, public_id):
    """Upload image bytes to Cloudinary via signed REST API.

    Returns (secure_url, error_message). Returns (None, reason) if skipped/failed.
    """
    if not _external_calls_allowed():
        return None, "Skipped during TESTING"
    if not is_cloudinary_configured():
        return None, "Cloudinary not configured"

    cloud_name = os.getenv("CLOUDINARY_CLOUD_NAME", "").strip()
    api_key = os.getenv("CLOUDINARY_API_KEY", "").strip()
    api_secret = os.getenv("CLOUDINARY_API_SECRET", "").strip()

    timestamp = str(int(time.time()))
    folder = "campusfix"
    # Cloudinary signature: alphabetically sorted params joined by & + api_secret
    params_to_sign = f"folder={folder}&public_id={public_id}&timestamp={timestamp}{api_secret}"
    signature = hashlib.sha1(params_to_sign.encode("utf-8")).hexdigest()

    url = f"https://api.cloudinary.com/v1_1/{cloud_name}/image/upload"
    try:
        resp = requests.post(
            url,
            data={
                "api_key": api_key,
                "folder": folder,
                "public_id": public_id,
                "timestamp": timestamp,
                "signature": signature,
            },
            files={"file": (filename, file_bytes)},
            timeout=15,
        )
        if resp.status_code == 200:
            secure_url = resp.json().get("secure_url")
            if secure_url:
                return secure_url, None
        return None, f"Cloudinary returned {resp.status_code}: {resp.text[:200]}"
    except Exception as exc:
        return None, str(exc)


# ---------------------------------------------------------------------------
# Resend Email Notifications (REST API, async non-blocking by default)
# ---------------------------------------------------------------------------
def is_resend_configured():
    _reload_env()
    return bool(os.getenv("RESEND_API_KEY", "").strip())


def send_email_sync(to_email, subject, html_body):
    """Send an email synchronously via Resend REST API. Returns (ok, detail)."""
    if not _external_calls_allowed():
        return False, "Skipped during TESTING"
    if not is_resend_configured():
        return False, "Resend not configured"
    if not to_email or "@" not in to_email:
        return False, "Invalid recipient email"

    api_key = os.getenv("RESEND_API_KEY", "").strip()
    sender = os.getenv("SENDER_EMAIL", "onboarding@resend.dev").strip() or "onboarding@resend.dev"

    try:
        resp = requests.post(
            "https://api.resend.com/emails",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json={
                "from": f"CampusFix <{sender}>",
                "to": [to_email],
                "subject": subject,
                "html": html_body,
            },
            timeout=10,
        )
        if resp.status_code in (200, 201):
            return True, resp.json().get("id", "sent")
        return False, f"Resend {resp.status_code}: {resp.text[:200]}"
    except Exception as exc:
        return False, str(exc)


def send_email_async(to_email, subject, html_body):
    """Fire-and-forget email delivery so Flask responses stay fast."""
    if not _external_calls_allowed() or not is_resend_configured() or not to_email:
        return
    threading.Thread(
        target=send_email_sync,
        args=(to_email, subject, html_body),
        daemon=True,
    ).start()


def build_complaint_email_html(heading, tracking_id, title, status, detail_line=""):
    return f"""
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:20px;border:1px solid #e2e8f0;border-radius:12px;">
      <div style="background:#172554;color:#ffffff;padding:16px 20px;border-radius:10px;">
        <h2 style="margin:0;font-size:18px;">CampusFix Campus Operations</h2>
        <p style="margin:4px 0 0;font-size:12px;color:#93c5fd;">Report • Track • Resolve</p>
      </div>
      <div style="padding:18px 4px;">
        <h3 style="margin:0 0 10px;color:#0f172a;">{heading}</h3>
        <p style="margin:6px 0;color:#334155;"><strong>Tracking ID:</strong> {tracking_id}</p>
        <p style="margin:6px 0;color:#334155;"><strong>Issue:</strong> {title}</p>
        <p style="margin:6px 0;color:#334155;"><strong>Current Status:</strong> {status}</p>
        {f'<p style="margin:10px 0 0;color:#475569;">{detail_line}</p>' if detail_line else ''}
      </div>
    </div>
    """


# ---------------------------------------------------------------------------
# Supabase Cloud Mirror Sync (REST API via SUPABASE_URL + SUPABASE_KEY)
# ---------------------------------------------------------------------------
def is_supabase_configured():
    _reload_env()
    url = os.getenv("SUPABASE_URL", "").strip()
    key = os.getenv("SUPABASE_KEY", "").strip()
    return bool(url and key)


def _supabase_headers():
    key = os.getenv("SUPABASE_KEY", "").strip()
    return {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates,return=minimal",
    }


def sync_complaint_to_supabase_sync(complaint_dict):
    """Upsert a single complaint record into Supabase public.complaints table."""
    if not _external_calls_allowed():
        return False, "Skipped during TESTING"
    if not is_supabase_configured():
        return False, "Supabase not configured"

    base_url = os.getenv("SUPABASE_URL", "").strip().rstrip("/")
    payload = {
        "id": complaint_dict["id"],
        "tracking_id": complaint_dict.get("tracking_id"),
        "user_id": complaint_dict.get("user_id"),
        "title": complaint_dict.get("title"),
        "description": complaint_dict.get("description"),
        "category": complaint_dict.get("category"),
        "location": complaint_dict.get("location"),
        "priority": complaint_dict.get("priority"),
        "status": complaint_dict.get("status"),
        "assigned_to": complaint_dict.get("assigned_to"),
        "ai_summary": complaint_dict.get("ai_summary"),
        "image_url": complaint_dict.get("image_url"),
        "rating": complaint_dict.get("rating"),
        "feedback_comment": complaint_dict.get("feedback_comment"),
        "created_at": complaint_dict.get("created_at"),
    }
    try:
        resp = requests.post(
            f"{base_url}/rest/v1/complaints",
            headers=_supabase_headers(),
            json=payload,
            timeout=10,
        )
        if resp.status_code in (200, 201, 204):
            return True, "synced"
        return False, f"Supabase {resp.status_code}: {resp.text[:220]}"
    except Exception as exc:
        return False, str(exc)


def sync_complaint_to_supabase_async(complaint_dict):
    if not _external_calls_allowed() or not is_supabase_configured():
        return
    threading.Thread(
        target=sync_complaint_to_supabase_sync,
        args=(dict(complaint_dict),),
        daemon=True,
    ).start()


def delete_complaint_from_supabase_async(complaint_id):
    if not _external_calls_allowed() or not is_supabase_configured():
        return

    def _delete():
        base_url = os.getenv("SUPABASE_URL", "").strip().rstrip("/")
        try:
            requests.delete(
                f"{base_url}/rest/v1/complaints?id=eq.{complaint_id}",
                headers=_supabase_headers(),
                timeout=10,
            )
        except Exception:
            pass

    threading.Thread(target=_delete, daemon=True).start()


def get_integrations_status():
    _reload_env()
    from ai_service import get_gemini_config, is_gemini_configured

    _, gemini_model = get_gemini_config()
    db_url = os.getenv("DATABASE_URL", "").strip()
    return {
        "database": {
            "primary": "sqlite",
            "path": os.getenv("DATABASE_PATH", "complaints.db"),
            "supabase_configured": is_supabase_configured(),
            "database_url_has_placeholder": "[YOUR-PASSWORD]" in db_url,
        },
        "gemini_ai": {
            "configured": is_gemini_configured(),
            "model": gemini_model,
        },
        "resend_email": {
            "configured": is_resend_configured(),
            "sender_email": os.getenv("SENDER_EMAIL", "onboarding@resend.dev").strip(),
        },
        "cloudinary": {
            "configured": is_cloudinary_configured(),
            "cloud_name": os.getenv("CLOUDINARY_CLOUD_NAME", "").strip(),
        },
        "google_maps": {
            "configured": bool(os.getenv("GOOGLE_MAPS_API_KEY", "").strip()),
        },
    }
