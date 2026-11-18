import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  Copy,
  ImagePlus,
  Send,
  Sparkles,
  Wand2,
  X,
} from "lucide-react";
import { classifyComplaintAI, createComplaint, uploadComplaintImage } from "../api";
import { CATEGORIES, PRIORITIES } from "../constants";

export default function ReportForm({ onCreated, onTrackClick, notify }) {
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Electrical");
  const [priority, setPriority] = useState("Medium");
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [classifying, setClassifying] = useState(false);
  const [error, setError] = useState("");
  const [aiPreview, setAiPreview] = useState(null);
  const [receipt, setReceipt] = useState(null);

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 950 * 1024) {
      setError("Please select an image smaller than 950 KB.");
      return;
    }
    setError("");
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const clearPhoto = () => {
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoFile(null);
    setPhotoPreview("");
  };

  const handleAiClassify = async () => {
    if (!title.trim() && !description.trim()) {
      setError("Enter a title or description first so AI can classify it.");
      return;
    }
    setError("");
    setClassifying(true);
    try {
      const { data } = await classifyComplaintAI({
        title: title.trim(),
        description: description.trim(),
        location: location.trim(),
      });
      if (data.category) setCategory(data.category);
      if (data.priority) setPriority(data.priority);
      setAiPreview(data);
      notify(`AI suggested ${data.category} • ${data.priority} priority`);
    } catch (err) {
      setError(err.response?.data?.error || "Could not reach AI classification endpoint.");
    } finally {
      setClassifying(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    if (!title.trim() || !description.trim() || !location.trim() || !category.trim()) {
      setError("Please fill in title, location, category, and description.");
      return;
    }

    setError("");
    setSubmitting(true);
    try {
      const { data } = await createComplaint({
        title: title.trim(),
        description: description.trim(),
        category,
        location: location.trim(),
        priority,
        auto_classify: Boolean(aiPreview),
      });

      if (photoFile) {
        try {
          await uploadComplaintImage(data.id, photoFile);
        } catch {
          notify("Complaint saved, but photo upload failed (check file size/type).", true);
        }
      }

      setReceipt({
        id: data.id,
        tracking_id: data.tracking_id,
        title: title.trim(),
      });
      setTitle("");
      setLocation("");
      setDescription("");
      setPriority("Medium");
      setAiPreview(null);
      clearPhoto();
      notify(`Complaint ${data.tracking_id} submitted!`);
      onCreated?.();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to submit complaint.");
    } finally {
      setSubmitting(false);
    }
  };

  const copyTrackingId = async (tid) => {
    try {
      await navigator.clipboard.writeText(tid);
      notify(`Copied ${tid} to clipboard`);
    } catch {
      notify(`Tracking ID: ${tid}`);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <div className="page-header">
        <div>
          <h1 className="page-title">Report a Campus Issue</h1>
          <p className="page-desc">
            Submit facility, IT, or safety issues with optional photo evidence and AI triage.
          </p>
        </div>
      </div>

      {receipt && (
        <motion.div
          className="receipt-banner"
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <CheckCircle2 size={22} color="#16a34a" />
            <div>
              <div style={{ fontWeight: 700 }}>
                Complaint submitted — <span className="mono-id">{receipt.tracking_id}</span>
              </div>
              <div style={{ fontSize: 13, color: "var(--ink-secondary)" }}>
                “{receipt.title}” has been logged and queued for campus operations.
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => copyTrackingId(receipt.tracking_id)}
            >
              <Copy size={14} /> Copy ID
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => onTrackClick?.(receipt.tracking_id)}
            >
              Track Status
            </button>
          </div>
        </motion.div>
      )}

      <div className="form-layout">
        <form className="card" onSubmit={handleSubmit} noValidate>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
              flexWrap: "wrap",
              marginBottom: 16,
            }}
          >
            <div>
              <h2 className="card-title">Issue Details</h2>
              <p className="card-sub" style={{ marginBottom: 0 }}>
                Fields marked * are required.
              </p>
            </div>
            <motion.button
              whileTap={{ scale: 0.96 }}
              type="button"
              className="btn btn-ai btn-sm"
              onClick={handleAiClassify}
              disabled={classifying}
            >
              <Wand2 size={14} />
              {classifying ? "Analyzing..." : "Auto-Classify with AI"}
            </motion.button>
          </div>

          {error && (
            <div className="offline-banner" style={{ marginBottom: 16, padding: "10px 14px" }}>
              <span>{error}</span>
            </div>
          )}

          <div className="form-grid">
            <div className="field">
              <label className="label" htmlFor="cf-title">Title *</label>
              <input
                id="cf-title"
                className="input"
                type="text"
                maxLength={200}
                placeholder="e.g., Water leaking from classroom ceiling"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="field">
              <label className="label" htmlFor="cf-location">Campus Location *</label>
              <input
                id="cf-location"
                className="input"
                type="text"
                maxLength={200}
                placeholder="e.g., Block B - Room 204"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                required
              />
            </div>

            <div className="field field-full">
              <label className="label" htmlFor="cf-desc">Description *</label>
              <textarea
                id="cf-desc"
                className="textarea"
                maxLength={2000}
                placeholder="Describe what happened, how urgent it is, and any safety concerns..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </div>

            <div className="field">
              <label className="label" htmlFor="cf-category">Category *</label>
              <select
                id="cf-category"
                className="select"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div className="field">
              <label className="label" htmlFor="cf-priority">Priority</label>
              <select
                id="cf-priority"
                className="select"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            <div className="field field-full">
              <label className="label" htmlFor="cf-photo">Attach Photo Evidence (Optional, PNG/JPG/WEBP ≤ 950 KB)</label>
              {!photoPreview ? (
                <label className="upload-dropzone" htmlFor="cf-photo">
                  <ImagePlus size={20} color="var(--cyan)" />
                  <span>Click to upload a photo of the campus issue</span>
                  <input
                    id="cf-photo"
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    onChange={handlePhotoChange}
                    style={{ display: "none" }}
                  />
                </label>
              ) : (
                <div className="upload-preview-wrap">
                  <img src={photoPreview} alt="Issue preview" className="upload-preview-img" />
                  <button
                    type="button"
                    className="btn btn-danger btn-sm upload-remove-btn"
                    onClick={clearPhoto}
                  >
                    <X size={14} /> Remove Photo
                  </button>
                </div>
              )}
            </div>
          </div>

          {aiPreview && (
            <div className="ai-preview-box">
              <div className="ai-preview-header">
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <Sparkles size={14} /> AI Analysis Preview
                </span>
                <span className="mono-id" style={{ fontSize: 11 }}>
                  {aiPreview.source === "gemini" ? "Gemini AI" : "Smart Fallback"}
                </span>
              </div>
              <div style={{ fontSize: 13, color: "var(--ink-secondary)" }}>
                <strong>Summary:</strong> {aiPreview.summary}
              </div>
            </div>
          )}

          <div style={{ marginTop: 20, display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setTitle("");
                setLocation("");
                setDescription("");
                setCategory("Electrical");
                setPriority("Medium");
                setAiPreview(null);
                clearPhoto();
                setError("");
              }}
            >
              Clear
            </button>
            <motion.button
              whileTap={{ scale: 0.97 }}
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
            >
              <Send size={15} />
              {submitting ? "Submitting..." : "Submit Complaint"}
            </motion.button>
          </div>
        </form>

        <aside className="card">
          <h3 className="card-title">How CampusFix Works</h3>
          <p className="card-sub">Transparent end-to-end issue resolution for campus life.</p>
          <div className="timeline">
            <div className="timeline-item">
              <span className="timeline-dot" />
              <div className="timeline-note">1. Instant Tracking ID</div>
              <div className="timeline-meta">Receive a unique CMP-YYYY-NNNN code immediately.</div>
            </div>
            <div className="timeline-item">
              <span className="timeline-dot" />
              <div className="timeline-note">2. AI Categorization & Priority</div>
              <div className="timeline-meta">Let Gemini AI classify urgency & write a crisp brief.</div>
            </div>
            <div className="timeline-item">
              <span className="timeline-dot" />
              <div className="timeline-note">3. Live Team Dispatch</div>
              <div className="timeline-meta">Maintenance staff update progress with notifications.</div>
            </div>
            <div className="timeline-item">
              <span className="timeline-dot" />
              <div className="timeline-note">4. Rate Resolution</div>
              <div className="timeline-meta">Once resolved, leave a 1–5 star quality rating.</div>
            </div>
          </div>
        </aside>
      </div>
    </motion.div>
  );
}
