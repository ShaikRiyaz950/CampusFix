from flask import Blueprint, Response, jsonify

docs_bp = Blueprint("docs", __name__, url_prefix="/api")

OPENAPI_SPEC = {
    "openapi": "3.0.3",
    "info": {
        "title": "CampusFix Backend API",
        "version": "2.0.0",
        "description": (
            "REST API for the CampusFix Campus Complaint Management System. "
            "Includes complaint CRUD, tracking IDs, status/priority/assignment workflows, "
            "history timelines, dashboard analytics, CSV export, and Gemini AI classification."
        ),
    },
    "servers": [{"url": "http://127.0.0.1:5000", "description": "Local development server"}],
    "tags": [
        {"name": "Health", "description": "Backend health check"},
        {"name": "Complaints", "description": "Complaint CRUD, workflow, tracking, history, and CSV export"},
        {"name": "Dashboard", "description": "Analytics and statistics endpoints"},
        {"name": "AI", "description": "Gemini AI categorization, priority suggestion, and summarization"},
    ],
    "paths": {
        "/": {
            "get": {
                "tags": ["Health"],
                "summary": "Backend health check",
                "responses": {"200": {"description": "Server is running"}},
            }
        },
        "/api/complaints": {
            "get": {
                "tags": ["Complaints"],
                "summary": "List complaints with optional search, filters, sorting, and pagination",
                "parameters": [
                    {"name": "search", "in": "query", "schema": {"type": "string"}, "description": "Search by ID, tracking ID, title, location, or description"},
                    {"name": "category", "in": "query", "schema": {"type": "string"}},
                    {"name": "status", "in": "query", "schema": {"type": "string", "enum": ["Pending", "Assigned", "In Progress", "Resolved"]}},
                    {"name": "priority", "in": "query", "schema": {"type": "string", "enum": ["Low", "Medium", "High", "Critical"]}},
                    {"name": "assigned_to", "in": "query", "schema": {"type": "string"}},
                    {"name": "date", "in": "query", "schema": {"type": "string", "enum": ["today", "week", "month"]}},
                    {"name": "date_from", "in": "query", "schema": {"type": "string", "example": "2026-11-01"}},
                    {"name": "date_to", "in": "query", "schema": {"type": "string", "example": "2026-11-30"}},
                    {"name": "sort", "in": "query", "schema": {"type": "string", "enum": ["newest", "oldest", "priority"]}},
                    {"name": "page", "in": "query", "schema": {"type": "integer", "minimum": 1}},
                    {"name": "limit", "in": "query", "schema": {"type": "integer", "minimum": 1, "maximum": 100}},
                ],
                "responses": {
                    "200": {"description": "List of complaints (or paginated object when page is supplied)"},
                    "400": {"description": "Invalid pagination parameters"},
                },
            },
            "post": {
                "tags": ["Complaints"],
                "summary": "Create a new complaint",
                "requestBody": {
                    "required": True,
                    "content": {
                        "application/json": {
                            "schema": {
                                "type": "object",
                                "required": ["title", "description", "category", "location"],
                                "properties": {
                                    "title": {"type": "string", "example": "Broken Fan"},
                                    "description": {"type": "string", "example": "Fan is not working in classroom"},
                                    "category": {"type": "string", "example": "Electrical"},
                                    "location": {"type": "string", "example": "Block A - Room 101"},
                                    "priority": {"type": "string", "enum": ["Low", "Medium", "High", "Critical"], "default": "Medium"},
                                    "auto_classify": {"type": "boolean", "default": False, "description": "Use AI to classify category/priority and generate summary"},
                                },
                            }
                        }
                    },
                },
                "responses": {
                    "201": {"description": "Complaint created with unique CMP-YYYY-NNNN tracking ID"},
                    "400": {"description": "Validation error"},
                },
            },
        },
        "/api/complaints/{id}": {
            "get": {
                "tags": ["Complaints"],
                "summary": "Get complaint details including status history",
                "parameters": [{"name": "id", "in": "path", "required": True, "schema": {"type": "integer"}}],
                "responses": {"200": {"description": "Complaint object with history"}, "404": {"description": "Not found"}},
            },
            "put": {
                "tags": ["Complaints"],
                "summary": "Update one or more fields of a complaint",
                "parameters": [{"name": "id", "in": "path", "required": True, "schema": {"type": "integer"}}],
                "requestBody": {
                    "required": True,
                    "content": {
                        "application/json": {
                            "schema": {
                                "type": "object",
                                "properties": {
                                    "title": {"type": "string"},
                                    "description": {"type": "string"},
                                    "category": {"type": "string"},
                                    "location": {"type": "string"},
                                    "priority": {"type": "string", "enum": ["Low", "Medium", "High", "Critical"]},
                                    "status": {"type": "string", "enum": ["Pending", "Assigned", "In Progress", "Resolved"]},
                                    "assigned_to": {"type": "string"},
                                    "note": {"type": "string"},
                                },
                            }
                        }
                    },
                },
                "responses": {"200": {"description": "Updated complaint"}, "400": {"description": "Validation error"}, "404": {"description": "Not found"}},
            },
            "delete": {
                "tags": ["Complaints"],
                "summary": "Delete a complaint and its history",
                "parameters": [{"name": "id", "in": "path", "required": True, "schema": {"type": "integer"}}],
                "responses": {"200": {"description": "Deleted"}, "404": {"description": "Not found"}},
            },
        },
        "/api/complaints/{id}/status": {
            "patch": {
                "tags": ["Complaints"],
                "summary": "Update complaint status and log history",
                "parameters": [{"name": "id", "in": "path", "required": True, "schema": {"type": "integer"}}],
                "requestBody": {
                    "required": True,
                    "content": {
                        "application/json": {
                            "schema": {
                                "type": "object",
                                "required": ["status"],
                                "properties": {
                                    "status": {"type": "string", "enum": ["Pending", "Assigned", "In Progress", "Resolved"]},
                                    "note": {"type": "string", "example": "Technician dispatched"},
                                },
                            }
                        }
                    },
                },
                "responses": {"200": {"description": "Status updated"}, "400": {"description": "Invalid status"}, "404": {"description": "Not found"}},
            }
        },
        "/api/complaints/{id}/priority": {
            "patch": {
                "tags": ["Complaints"],
                "summary": "Update complaint priority",
                "parameters": [{"name": "id", "in": "path", "required": True, "schema": {"type": "integer"}}],
                "requestBody": {
                    "required": True,
                    "content": {
                        "application/json": {
                            "schema": {
                                "type": "object",
                                "required": ["priority"],
                                "properties": {
                                    "priority": {"type": "string", "enum": ["Low", "Medium", "High", "Critical"]},
                                },
                            }
                        }
                    },
                },
                "responses": {"200": {"description": "Priority updated"}, "400": {"description": "Invalid priority"}, "404": {"description": "Not found"}},
            }
        },
        "/api/complaints/{id}/assign": {
            "patch": {
                "tags": ["Complaints"],
                "summary": "Assign complaint to maintenance staff",
                "parameters": [{"name": "id", "in": "path", "required": True, "schema": {"type": "integer"}}],
                "requestBody": {
                    "required": True,
                    "content": {
                        "application/json": {
                            "schema": {
                                "type": "object",
                                "required": ["assigned_to"],
                                "properties": {
                                    "assigned_to": {"type": "string", "example": "Electrical Maintenance Team"},
                                    "note": {"type": "string"},
                                },
                            }
                        }
                    },
                },
                "responses": {"200": {"description": "Complaint assigned"}, "400": {"description": "Invalid assignee"}, "404": {"description": "Not found"}},
            }
        },
        "/api/complaints/{id}/history": {
            "get": {
                "tags": ["Complaints"],
                "summary": "Fetch chronological status history of a complaint",
                "parameters": [{"name": "id", "in": "path", "required": True, "schema": {"type": "integer"}}],
                "responses": {"200": {"description": "List of history events"}, "404": {"description": "Not found"}},
            }
        },
        "/api/complaints/track/{tracking_id}": {
            "get": {
                "tags": ["Complaints"],
                "summary": "Track complaint by unique tracking ID (e.g. CMP-2026-0001)",
                "parameters": [{"name": "tracking_id", "in": "path", "required": True, "schema": {"type": "string"}}],
                "responses": {"200": {"description": "Complaint with history"}, "404": {"description": "Not found"}},
            }
        },
        "/api/complaints/export": {
            "get": {
                "tags": ["Complaints"],
                "summary": "Download filtered complaints as a CSV report",
                "responses": {"200": {"description": "CSV attachment (text/csv)"}},
            }
        },
        "/api/stats": {
            "get": {
                "tags": ["Dashboard"],
                "summary": "Dashboard summary statistics (compatible alias for /api/dashboard/stats)",
                "responses": {"200": {"description": "Totals, status/category/priority breakdowns, and monthly counts"}},
            }
        },
        "/api/dashboard/stats": {
            "get": {
                "tags": ["Dashboard"],
                "summary": "Full dashboard analytics summary",
                "responses": {"200": {"description": "Totals, status/category/priority breakdowns, and monthly counts"}},
            }
        },
        "/api/dashboard/categories": {
            "get": {
                "tags": ["Dashboard"],
                "summary": "Category distribution statistics",
                "responses": {"200": {"description": "Category counts sorted descending"}},
            }
        },
        "/api/dashboard/trends": {
            "get": {
                "tags": ["Dashboard"],
                "summary": "Daily and monthly complaint trends",
                "responses": {"200": {"description": "Monthly and daily complaint counts"}},
            }
        },
        "/api/ai/status": {
            "get": {
                "tags": ["AI"],
                "summary": "Check whether Gemini AI is configured or running in fallback mode",
                "responses": {"200": {"description": "AI configuration status"}},
            }
        },
        "/api/ai/classify": {
            "post": {
                "tags": ["AI"],
                "summary": "Classify complaint category, predict priority, and summarize",
                "requestBody": {
                    "required": True,
                    "content": {
                        "application/json": {
                            "schema": {
                                "type": "object",
                                "properties": {
                                    "title": {"type": "string", "example": "Ceiling Leak"},
                                    "description": {"type": "string", "example": "Water is leaking from the ceiling."},
                                    "location": {"type": "string", "example": "Block B - Room 204"},
                                },
                            }
                        }
                    },
                },
                "responses": {"200": {"description": "Suggested category, priority, summary, and source"}},
            }
        },
        "/api/ai/analyze": {
            "post": {
                "tags": ["AI"],
                "summary": "Alias for /api/ai/classify",
                "responses": {"200": {"description": "Suggested category, priority, summary, and source"}},
            }
        },
        "/api/complaints/{id}/summarize": {
            "post": {
                "tags": ["AI"],
                "summary": "Generate and store an AI summary for an existing complaint",
                "parameters": [{"name": "id", "in": "path", "required": True, "schema": {"type": "integer"}}],
                "responses": {"200": {"description": "Generated AI summary"}, "404": {"description": "Not found"}},
            }
        },
    },
}

SWAGGER_HTML = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>CampusFix API Docs</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
  <style>
    body { margin: 0; font-family: system-ui, -apple-system, sans-serif; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    window.onload = function () {
      if (window.SwaggerUIBundle) {
        SwaggerUIBundle({
          url: "/api/openapi.json",
          dom_id: "#swagger-ui",
          deepLinking: true
        });
      } else {
        document.getElementById("swagger-ui").innerHTML =
          "<div style='padding:24px'><h2>CampusFix OpenAPI Spec</h2><p>Open <a href='/api/openapi.json'>/api/openapi.json</a> to inspect the API schema.</p></div>";
      }
    };
  </script>
</body>
</html>
"""


@docs_bp.route("/openapi.json", methods=["GET"])
def openapi_spec():
    return jsonify(OPENAPI_SPEC)


@docs_bp.route("/docs", methods=["GET"])
def swagger_ui():
    return Response(SWAGGER_HTML, mimetype="text/html")
