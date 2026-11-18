import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Clock,
  MapPin,
  Sparkles,
  Star,
  Trash2,
  UserCheck,
  X,
} from "lucide-react";
import {
  assignComplaint,
  deleteComplaint,
  getComplaint,
  getStaffList,
  patchComplaintPriority,
  patchComplaintStatus,
  submitComplaintFeedback,
  summarizeComplaintAI,
} from "../api";
import {
  PRIORITIES,
  STATUSES,
  formatDateTime,
  getPrioritySlug,
  getStatusSlug,
} from "../constants";

export default function ComplaintModal({
  complaintId,
  currentUser,
  onClose,
  onUpdated,
  notify,
}) {
  const [complaint, setComplaint] = useState(null);
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assignee, setAssignee] = useState("");
  const [statusNote, setStatusNote] = useState("");
  const [rating, setRating] = useState(5);
  const [feedbackComment, setFeedbackComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const isAdmin = currentUser?.role === "admin";
  const isStaff = currentUser?.role === "staff";
  const canManageStatus = isAdmin || isStaff;

  const loadDetail = async () => {
    setLoading(true);
    try {
      const { data } = await getComplaint(complaintId);
      setComplaint(data);
      setAssignee(data.assigned_to || "");
      if (data.rating) setRating(data.rating);
      if (data.feedback_comment) setFeedbackComment(data.feedback_comment);
    } catch {
      notify("Could not load complaint details.", true);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (complaintId) {
      loadDetail();
      if (isAdmin) {
        getStaffList()
          .then((res) => setStaffList(res.data || []))
          .catch(() => {});
      }
    }
  }, [complaintId, isAdmin]);

  if (!complaintId) return null;

  const handleStatusChange = async (newStatus) => {
    setBusy(true);
    try {
      await patchComplaintStatus(complaint.id, newStatus, statusNote.trim());
      setStatusNote("");
      await loadDetail();
      onUpdated?.();
      notify(`Status updated to ${newStatus}`);
    } catch (err) {
      notify(err.response?.data?.error || "Status update failed", true);
    } finally {
      setBusy(false);
    }
  };

  const handlePriorityChange = async (newPriority) => {
    setBusy(true);
    try {
      await patchComplaintPriority(complaint.id, newPriority);
      await loadDetail();
      onUpdated?.();
      notify(`Priority changed to ${newPriority}`);
    } catch (err) {
      notify(err.response?.data?.error || "Priority update failed", true);
    } finally {
      setBusy(false);
    }
  };

  const handleAssign = async (e) => {
    e.preventDefault();
    if (!assignee.trim()) return;
    setBusy(true);
    try {
      await assignComplaint(complaint.id, assignee.trim());
      await loadDetail();
      onUpdated?.();
      notify(`Assigned to ${assignee.trim()}`);
    } catch (err) {
      notify(err.response?.data?.error || "Assignment failed", true);
    } finally {
      setBusy(false);
    }
  };

  const handleSummarize = async () => {
    setBusy(true);
    try {
      await summarizeComplaintAI(complaint.id);
      await loadDetail();
      onUpdated?.();
      notify("AI summary generated");
    } catch {
      notify("Could not generate AI summary", true);
    } finally {
      setBusy(false);
    }
  };

  const handleFeedback = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await submitComplaintFeedback(complaint.id, rating, feedbackComment.trim());
      await loadDetail();
      onUpdated?.();
      notify("Resolution feedback submitted!");
    } catch (err) {
      notify(err.response?.data?.error || "Could not submit feedback", true);
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    setBusy(true);
    try {
      await deleteComplaint(complaint.id);
      notify(`Deleted ${complaint.tracking_id}`);
      onUpdated?.();
      onClose();
    } catch (err) {
      notify(err.response?.data?.error || "Failed to delete complaint", true);
      setBusy(false);
    }
  };

  return (
    <motion.div
      className="modal-backdrop"
      onClick={onClose}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="drawer"
        onClick={(e) => e.stopPropagation()}
        initial={{ x: 40, opacity: 0.6 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 40, opacity: 0 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
      >
        <div className="drawer-header">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {complaint && <span className="mono-id">{complaint.tracking_id}</span>}
            <span style={{ fontWeight: 700, fontSize: 15 }}>Complaint Details</span>
          </div>
          <button className="btn btn-ghost" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="drawer-body">
          {loading || !complaint ? (
            <div className="skeleton-card" style={{ border: "none", padding: 0 }}>
              <div className="skeleton-line" style={{ width: "60%" }} />
              <div className="skeleton-line" style={{ width: "100%" }} />
              <div className="skeleton-line" style={{ width: "80%" }} />
            </div>
          ) : (
            <>
              <div className="drawer-section">
                <div className="complaint-meta-top">
                  <span className={`badge status-${getStatusSlug(complaint.status)}`}>
                    <span className="badge-dot" />
                    {complaint.status}
                  </span>
                  <span className={`badge prio-${getPrioritySlug(complaint.priority)}`}>
                    {complaint.priority}
                  </span>
                  <span className="cat-pill">{complaint.category}</span>
                </div>

                <h2 style={{ margin: "8px 0 6px", fontSize: 19 }}>{complaint.title}</h2>
                <p style={{ margin: "0 0 12px", color: "var(--ink-secondary)" }}>
                  {complaint.description}
                </p>

                <div className="complaint-meta-bottom">
                  <span className="meta-item"><MapPin size={14} /> {complaint.location}</span>
                  <span className="meta-item"><Clock size={14} /> {formatDateTime(complaint.created_at)}</span>
                  {complaint.assigned_to && (
                    <span className="meta-item" style={{ color: "var(--cyan)", fontWeight: 600 }}>
                      <UserCheck size={14} /> {complaint.assigned_to}
                    </span>
                  )}
                </div>

                {complaint.image_url && (
                  <div style={{ marginTop: 14 }}>
                    <img
                      src={complaint.image_url}
                      alt="Uploaded campus issue"
                      className="detail-photo"
                    />
                  </div>
                )}

                <div className="ai-preview-box" style={{ marginTop: 14 }}>
                  <div className="ai-preview-header">
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                      <Sparkles size={14} /> AI Summary
                    </span>
                    <button
                      type="button"
                      className="btn btn-ai btn-sm"
                      disabled={busy}
                      onClick={handleSummarize}
                    >
                      {complaint.ai_summary ? "Regenerate" : "Generate Summary"}
                    </button>
                  </div>
                  <div style={{ fontSize: 13, color: "var(--ink-secondary)" }}>
                    {complaint.ai_summary || "Click Generate Summary to create a 1-sentence brief."}
                  </div>
                </div>
              </div>

              {canManageStatus && (
                <div className="drawer-section">
                  <h3 className="section-label">Update Status & Priority</h3>
                  <div className="inline-form" style={{ marginBottom: 10 }}>
                    <select
                      className="select"
                      value={complaint.status}
                      disabled={busy}
                      onChange={(e) => handleStatusChange(e.target.value)}
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                    <select
                      className="select"
                      value={complaint.priority}
                      disabled={busy}
                      onChange={(e) => handlePriorityChange(e.target.value)}
                    >
                      {PRIORITIES.map((p) => (
                        <option key={p} value={p}>{p} Priority</option>
                      ))}
                    </select>
                  </div>
                  <input
                    className="input"
                    type="text"
                    placeholder="Optional timeline note before switching status..."
                    value={statusNote}
                    onChange={(e) => setStatusNote(e.target.value)}
                  />
                </div>
              )}

              {isAdmin && (
                <div className="drawer-section">
                  <h3 className="section-label">Assign Maintenance Staff</h3>
                  <form className="inline-form" onSubmit={handleAssign}>
                    <input
                      className="input"
                      type="text"
                      list="campus-staff-options"
                      placeholder="Select or type staff name..."
                      value={assignee}
                      onChange={(e) => setAssignee(e.target.value)}
                    />
                    <datalist id="campus-staff-options">
                      {staffList.map((s) => (
                        <option key={s.id} value={s.full_name} />
                      ))}
                      <option value="Electrical Maintenance Team" />
                      <option value="Plumbing & Water Unit" />
                      <option value="Campus IT Helpdesk" />
                    </datalist>
                    <button type="submit" className="btn btn-primary" disabled={busy || !assignee.trim()}>
                      <UserCheck size={14} /> Assign
                    </button>
                  </form>
                </div>
              )}

              {complaint.status === "Resolved" && (
                <div className="drawer-section">
                  <h3 className="section-label">Resolution Quality Feedback</h3>
                  <form onSubmit={handleFeedback} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <div className="star-row">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          className={`star-btn ${star <= rating ? "active" : ""}`}
                          onClick={() => setRating(star)}
                          aria-label={`Rate ${star} out of 5 stars`}
                        >
                          <Star size={18} fill={star <= rating ? "#f59e0b" : "none"} color="#f59e0b" />
                        </button>
                      ))}
                      <span style={{ fontSize: 12.5, color: "var(--ink-muted)", marginLeft: 6 }}>
                        {rating} / 5 stars
                      </span>
                    </div>
                    <input
                      className="input"
                      type="text"
                      placeholder="Share how well the maintenance team resolved this issue..."
                      value={feedbackComment}
                      onChange={(e) => setFeedbackComment(e.target.value)}
                    />
                    <div>
                      <button type="submit" className="btn btn-primary btn-sm" disabled={busy}>
                        {complaint.rating ? "Update Feedback" : "Submit Rating"}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              <div className="drawer-section">
                <h3 className="section-label">Status History Timeline</h3>
                <div className="timeline">
                  {(complaint.history || []).map((h) => (
                    <div className="timeline-item" key={h.id}>
                      <span className="timeline-dot" />
                      <div className="timeline-note">{h.note}</div>
                      <div className="timeline-meta">
                        <span className={`badge status-${getStatusSlug(h.status)}`} style={{ padding: "1px 7px", fontSize: 11 }}>
                          {h.status}
                        </span>
                        <span>{formatDateTime(h.changed_at)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="drawer-section" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                {isAdmin ? (
                  !confirmDelete ? (
                    <button
                      type="button"
                      className="btn btn-danger-ghost"
                      onClick={() => setConfirmDelete(true)}
                    >
                      <Trash2 size={15} /> Delete Complaint
                    </button>
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 12.5, color: "var(--danger)", fontWeight: 600 }}>
                        Permanently delete?
                      </span>
                      <button type="button" className="btn btn-danger btn-sm" disabled={busy} onClick={handleDelete}>
                        Confirm Delete
                      </button>
                      <button type="button" className="btn btn-secondary btn-sm" onClick={() => setConfirmDelete(false)}>
                        Cancel
                      </button>
                    </div>
                  )
                ) : (
                  <span style={{ fontSize: 12, color: "var(--ink-muted)" }}>
                    Signed in as {currentUser?.role}
                  </span>
                )}
                <button type="button" className="btn btn-secondary" onClick={onClose}>
                  Done
                </button>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
