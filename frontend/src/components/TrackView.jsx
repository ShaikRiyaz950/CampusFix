import React, { useEffect, useState } from "react";
import {
  Check,
  Clock,
  MapPin,
  Search,
  Sparkles,
  Tag,
  UserCheck,
} from "lucide-react";
import { trackComplaintById } from "../api";
import {
  STATUSES,
  formatDateTime,
  getPrioritySlug,
  getStatusSlug,
} from "../constants";

export default function TrackView({ initialTrackingId = "" }) {
  const [query, setQuery] = useState(initialTrackingId);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [complaint, setComplaint] = useState(null);

  const performLookup = async (tid) => {
    const cleaned = (tid || "").trim();
    if (!cleaned) {
      setError("Enter a tracking ID like CMP-2026-0001.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const { data } = await trackComplaintById(cleaned);
      setComplaint(data);
    } catch (err) {
      setComplaint(null);
      if (err.response?.status === 404) {
        setError(`No complaint found with tracking ID "${cleaned.toUpperCase()}".`);
      } else {
        setError("Could not reach the backend server.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialTrackingId) {
      setQuery(initialTrackingId);
      performLookup(initialTrackingId);
    }
  }, [initialTrackingId]);

  const handleSubmit = (e) => {
    e.preventDefault();
    performLookup(query);
  };

  const currentIdx = complaint ? STATUSES.indexOf(complaint.status) : -1;

  return (
    <div>
      <div className="track-hero">
        <h1 className="page-title">Track Your Complaint</h1>
        <p className="page-desc">
          Enter your unique tracking number (for example <code>CMP-2026-0001</code>) to inspect live status and history.
        </p>

        <form className="track-search-form" onSubmit={handleSubmit}>
          <input
            className="input"
            type="text"
            placeholder="CMP-2026-0001"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button type="submit" className="btn btn-primary" disabled={loading}>
            <Search size={15} />
            {loading ? "Searching..." : "Track Issue"}
          </button>
        </form>

        {error && (
          <div className="offline-banner" style={{ marginTop: 16, marginBottom: 0 }}>
            <span>{error}</span>
          </div>
        )}
      </div>

      {complaint && (
        <div className="card">
          <div className="complaint-meta-top">
            <span className="mono-id">{complaint.tracking_id}</span>
            <span className={`badge status-${getStatusSlug(complaint.status)}`}>
              <span className="badge-dot" />
              {complaint.status}
            </span>
            <span className={`badge prio-${getPrioritySlug(complaint.priority)}`}>
              {complaint.priority} Priority
            </span>
            <span className="cat-pill">{complaint.category}</span>
          </div>

          <h2 className="card-title" style={{ fontSize: 20, marginTop: 8 }}>
            {complaint.title}
          </h2>
          <p style={{ color: "var(--ink-secondary)", margin: "6px 0 14px" }}>
            {complaint.description}
          </p>

          <div className="complaint-meta-bottom" style={{ marginBottom: 12 }}>
            <span className="meta-item"><MapPin size={14} /> {complaint.location}</span>
            <span className="meta-item"><Tag size={14} /> {complaint.category}</span>
            <span className="meta-item"><Clock size={14} /> Submitted {formatDateTime(complaint.created_at)}</span>
            {complaint.assigned_to && (
              <span className="meta-item" style={{ color: "var(--accent)", fontWeight: 600 }}>
                <UserCheck size={14} /> Assigned to {complaint.assigned_to}
              </span>
            )}
          </div>

          {complaint.ai_summary && (
            <div className="ai-preview-box" style={{ marginTop: 12 }}>
              <div className="ai-preview-header">
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <Sparkles size={14} /> AI Summary
                </span>
              </div>
              <div style={{ fontSize: 13, color: "var(--ink-secondary)" }}>{complaint.ai_summary}</div>
            </div>
          )}

          <div className="stepper">
            {STATUSES.map((stepStatus, idx) => {
              const isDone = idx < currentIdx || complaint.status === "Resolved";
              const isCurrent = idx === currentIdx && complaint.status !== "Resolved";
              return (
                <div
                  key={stepStatus}
                  className={`step ${isDone ? "done" : ""} ${isCurrent ? "current" : ""}`}
                >
                  <span className="step-num">
                    {isDone ? <Check size={13} /> : idx + 1}
                  </span>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{stepStatus}</span>
                </div>
              );
            })}
          </div>

          <div className="drawer-section">
            <h3 className="section-label">Activity Timeline</h3>
            <div className="timeline">
              {(complaint.history || []).map((item) => (
                <div className="timeline-item" key={item.id}>
                  <span className="timeline-dot" />
                  <div className="timeline-note">{item.note}</div>
                  <div className="timeline-meta">
                    <span className={`badge status-${getStatusSlug(item.status)}`} style={{ padding: "1px 7px", fontSize: 11 }}>
                      {item.status}
                    </span>
                    <span>{formatDateTime(item.changed_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
