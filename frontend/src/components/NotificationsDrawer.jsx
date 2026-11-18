import React from "react";
import { motion } from "framer-motion";
import { Bell, CheckCheck, Clock, X } from "lucide-react";
import { formatDateTime } from "../constants";

export default function NotificationsDrawer({
  open,
  notifications,
  onClose,
  onMarkAllRead,
  onSelectComplaint,
}) {
  if (!open) return null;

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
        style={{ maxWidth: 420 }}
        onClick={(e) => e.stopPropagation()}
        initial={{ x: 40, opacity: 0.6 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 40, opacity: 0 }}
      >
        <div className="drawer-header">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Bell size={16} color="var(--cyan)" />
            <span style={{ fontWeight: 700 }}>Notifications</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <button type="button" className="btn btn-ghost btn-sm" onClick={onMarkAllRead}>
              <CheckCheck size={14} /> Mark all read
            </button>
            <button type="button" className="btn btn-ghost" onClick={onClose} aria-label="Close notifications">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="drawer-body" style={{ gap: 10 }}>
          {notifications.length === 0 ? (
            <div style={{ textAlign: "center", padding: "36px 12px", color: "var(--ink-muted)" }}>
              No notifications yet. You'll be notified whenever complaint statuses change.
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                className={`notif-item ${n.is_read ? "" : "unread"}`}
                onClick={() => {
                  if (n.complaint_id) {
                    onSelectComplaint?.(n.complaint_id);
                    onClose();
                  }
                }}
              >
                <div style={{ fontWeight: 700, fontSize: 13.5 }}>{n.title}</div>
                <div style={{ fontSize: 12.5, color: "var(--ink-secondary)", margin: "3px 0 6px" }}>
                  {n.message}
                </div>
                <div className="meta-item" style={{ fontSize: 11.5, color: "var(--ink-muted)" }}>
                  <Clock size={11} /> {formatDateTime(n.created_at)}
                </div>
              </div>
            ))
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
