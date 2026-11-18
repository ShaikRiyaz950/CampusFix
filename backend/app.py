import os
from dotenv import load_dotenv
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIST_DIR = os.path.abspath(os.path.join(BASE_DIR, "..", "frontend", "dist"))
load_dotenv(os.path.join(BASE_DIR, ".env"))

from auth import auth_bp
from database import init_db
from docs import docs_bp
from routes import complaint_bp

app = Flask(__name__, static_folder=None)

# Limit request payload size to 1 MB to reject excessively large requests
app.config["MAX_CONTENT_LENGTH"] = 1 * 1024 * 1024

CORS(app)

init_db()
app.register_blueprint(auth_bp)
app.register_blueprint(complaint_bp)
app.register_blueprint(docs_bp)


def _wants_html():
    accept = request.headers.get("Accept", "")
    return "text/html" in accept


@app.route("/")
def home():
    index_path = os.path.join(FRONTEND_DIST_DIR, "index.html")
    if _wants_html() and os.path.isfile(index_path):
        return send_from_directory(FRONTEND_DIST_DIR, "index.html")
    return {"message": "CampusFix Backend Running"}


@app.route("/api/health")
def api_health():
    return {"message": "CampusFix Backend Running", "status": "ok"}


@app.route("/assets/<path:filename>")
def frontend_assets(filename):
    assets_dir = os.path.join(FRONTEND_DIST_DIR, "assets")
    return send_from_directory(assets_dir, filename)


@app.route("/<string:filename>")
def frontend_public_files(filename):
    file_path = os.path.join(FRONTEND_DIST_DIR, filename)
    if os.path.isfile(file_path):
        return send_from_directory(FRONTEND_DIST_DIR, filename)
    return jsonify({"error": "Resource not found"}), 404


@app.errorhandler(400)
def bad_request(_error):
    return jsonify({"error": "Bad request"}), 400


@app.errorhandler(404)
def not_found(_error):
    return jsonify({"error": "Resource not found"}), 404


@app.errorhandler(405)
def method_not_allowed(_error):
    return jsonify({"error": "Method not allowed"}), 405


@app.errorhandler(413)
def payload_too_large(_error):
    return jsonify({"error": "Request payload is too large (max 1 MB)"}), 413


@app.errorhandler(500)
def internal_server_error(_error):
    return jsonify({"error": "Internal server error"}), 500


if __name__ == "__main__":
    debug_mode = os.getenv("FLASK_ENV", "development").lower() == "development"
    port = int(os.getenv("PORT", "5000"))
    app.run(debug=debug_mode, port=port)
