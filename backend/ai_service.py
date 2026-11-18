import json
import os
import re

from dotenv import load_dotenv

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, ".env"))

ALLOWED_CATEGORIES = (
    "Electrical",
    "Plumbing",
    "Maintenance",
    "IT / Network",
    "Sanitation",
    "Furniture",
    "Security",
    "Other",
)

ALLOWED_PRIORITIES = ("Low", "Medium", "High", "Critical")

_CATEGORY_KEYWORDS = {
    "Electrical": (
        "fan", "light", "bulb", "power", "electricity", "socket", "switch",
        "wire", "wiring", "ac", "air conditioner", "projector", "spark", "short circuit",
    ),
    "Plumbing": (
        "water", "leak", "leaking", "pipe", "tap", "faucet", "drain", "sink",
        "toilet", "flush", "washroom", "bathroom", "flood", "clog",
    ),
    "IT / Network": (
        "wifi", "wi-fi", "internet", "network", "router", "lan", "computer",
        "pc", "printer", "server", "projector screen", "software", "login",
    ),
    "Sanitation": (
        "dirty", "trash", "garbage", "clean", "cleaning", "dustbin", "smell",
        "odor", "hygiene", "pest", "mosquito", "cockroach", "sweep",
    ),
    "Furniture": (
        "chair", "desk", "table", "bench", "board", "door", "window", "lock",
        "locker", "cupboard", "shelf", "broken seat",
    ),
    "Security": (
        "cctv", "camera", "gate", "guard", "theft", "stolen", "unsafe",
        "stranger", "id card", "alarm", "fire", "emergency",
    ),
    "Maintenance": (
        "wall", "ceiling", "floor", "paint", "crack", "tile", "elevator",
        "lift", "stair", "roof", "railing", "glass", "repair",
    ),
}

_PRIORITY_KEYWORDS = {
    "Critical": (
        "fire", "spark", "short circuit", "shock", "flood", "gas", "emergency",
        "collapsed", "injured", "unsafe", "outage", "danger", "urgent",
    ),
    "High": (
        "not working", "broken", "leaking", "leak", "burst", "no power",
        "no water", "no internet", "stuck", "damaged", "severe",
    ),
    "Low": (
        "minor", "paint", "scratch", "squeak", "cosmetic", "suggestion", "slow",
    ),
}


def get_gemini_config():
    # Reload .env so adding a key takes effect cleanly
    load_dotenv(os.path.join(BASE_DIR, ".env"), override=False)
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    model = os.getenv("GEMINI_MODEL", "gemini-2.5-flash").strip() or "gemini-2.5-flash"
    return api_key, model


def is_gemini_configured():
    api_key, _ = get_gemini_config()
    return bool(api_key) and not api_key.startswith("your_")


def _fallback_analyze(title, description, location=""):
    combined = f"{title} {description}".lower()

    best_category = "Other"
    best_score = 0
    for category, keywords in _CATEGORY_KEYWORDS.items():
        score = sum(1 for kw in keywords if kw in combined)
        if score > best_score:
            best_score = score
            best_category = category

    predicted_priority = "Medium"
    for level in ("Critical", "High", "Low"):
        if any(kw in combined for kw in _PRIORITY_KEYWORDS[level]):
            predicted_priority = level
            break

    clean_title = (title or "").strip()
    clean_desc = re.sub(r"\s+", " ", (description or "").strip())
    clean_loc = (location or "").strip()

    if clean_desc:
        first_sentence = re.split(r"(?<=[.!?])\s+", clean_desc)[0]
        summary_core = first_sentence[:140].rstrip(".")
        if clean_title and clean_title.lower() not in summary_core.lower():
            summary = f"{clean_title}: {summary_core}."
        else:
            summary = f"{summary_core}."
    else:
        summary = f"{clean_title}."

    if clean_loc and clean_loc.lower() not in summary.lower():
        summary = f"{summary.rstrip('.')} (Location: {clean_loc})."

    return {
        "category": best_category,
        "priority": predicted_priority,
        "summary": summary,
        "source": "fallback",
    }


def analyze_complaint(title, description, location=""):
    """Classify category, predict priority, and summarize a campus complaint.

    Uses the Gemini API when GEMINI_API_KEY is configured on the backend,
    and falls back safely to a local rule-based analyzer otherwise.
    """
    api_key, model_name = get_gemini_config()
    if not is_gemini_configured():
        return _fallback_analyze(title, description, location)

    try:
        from google import genai
        from google.genai import types

        client = genai.Client(api_key=api_key)

        prompt = (
            "You are an assistant for CampusFix, a college campus issue tracker.\n"
            "Analyze the following student complaint and return ONLY valid JSON with keys:\n"
            f'- "category": one of {list(ALLOWED_CATEGORIES)}\n'
            f'- "priority": one of {list(ALLOWED_PRIORITIES)}\n'
            '- "summary": a concise 1-sentence summary (max 160 characters)\n\n'
            f"Title: {title}\n"
            f"Description: {description}\n"
            f"Location: {location or 'Not specified'}\n"
        )

        response = client.models.generate_content(
            model=model_name,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=0.2,
            ),
        )

        parsed = json.loads(response.text)
        fallback = _fallback_analyze(title, description, location)

        category = parsed.get("category")
        if category not in ALLOWED_CATEGORIES:
            category = fallback["category"]

        priority = parsed.get("priority")
        if priority not in ALLOWED_PRIORITIES:
            priority = fallback["priority"]

        summary = parsed.get("summary")
        if not isinstance(summary, str) or not summary.strip():
            summary = fallback["summary"]
        else:
            summary = summary.strip()[:250]

        return {
            "category": category,
            "priority": priority,
            "summary": summary,
            "source": "gemini",
        }
    except Exception:
        return _fallback_analyze(title, description, location)
