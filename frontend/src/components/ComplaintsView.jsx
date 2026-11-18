import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  Clock,
  Download,
  Image as ImageIcon,
  MapPin,
  Plus,
  Search,
  SlidersHorizontal,
  Sparkles,
  Star,
  Trash2,
  UserCheck,
} from "lucide-react";
import { getExportCsvUrl } from "../api";
import {
  CATEGORIES,
  PRIORITIES,
  STATUSES,
  formatDateTime,
  getPrioritySlug,
  getStatusSlug,
} from "../constants";

export default function ComplaintsView({
  currentUser,
  complaints,
  loading,
  filters,
  setFilters,
  resetFilters,
  hasActiveFilters,
  pagination,
  onPageChange,
  onQuickStatus,
  onQuickDelete,
  onSelectComplaint,
  onNewReport,
}) {
  const [pendingDeleteId, setPendingDeleteId] = useState(null);

  const isAdmin = currentUser?.role === "admin";
  const isStaff = currentUser?.role === "staff";
  const isStudent = currentUser?.role === "student";
  const canChangeStatus = isAdmin || isStaff;

  const heading = isAdmin
    ? "All Campus Complaints"
    : isStaff
      ? "Maintenance Work Queue"
      : filters.mine
        ? "My Submitted Complaints"
        : "Campus Complaints";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <div className="page-header">
        <div>
          <h1 className="page-title">{heading}</h1>
          <p className="page-desc">
            Search, filter, prioritize, and inspect full complaint timelines.
          </p>
        </div>
        <div className="header-controls">
          {isStudent && (
            <button
              type="button"
              className={`btn btn-sm ${filters.mine ? "btn-primary" : "btn-secondary"}`}
              onClick={() => setFilters((f) => ({ ...f, mine: !f.mine, page: 1 }))}
            >
              {filters.mine ? "Showing: My Tickets" : "My Tickets Only"}
            </button>
          )}
          {isStaff && (
            <button
              type="button"
              className={`btn btn-sm ${filters.assignedToMe ? "btn-primary" : "btn-secondary"}`}
              onClick={() => setFilters((f) => ({ ...f, assignedToMe: !f.assignedToMe, page: 1 }))}
            >
              <UserCheck size={14} /> {filters.assignedToMe ? "Assigned to Me" : "Filter Assigned to Me"}
            </button>
          )}
          {isAdmin && (
            <button
              type="button"
              className={`btn btn-sm ${filters.overdue ? "btn-danger" : "btn-secondary"}`}
              onClick={() => setFilters((f) => ({ ...f, overdue: !f.overdue, page: 1 }))}
            >
              <AlertTriangle size={14} /> {filters.overdue ? "Showing Overdue / Urgent" : "Overdue & Urgent"}
            </button>
          )}
          <a
            className="btn btn-secondary btn-sm"
            href={getExportCsvUrl({
              search: filters.search,
              category: filters.category,
              status: filters.status,
              priority: filters.priority,
              date: filters.date,
              sort: filters.sort,
            })}
            download
          >
            <Download size={14} /> Export CSV
          </a>
          <button type="button" className="btn btn-primary btn-sm" onClick={onNewReport}>
            <Plus size={14} /> Submit Complaint
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <section className="filter-card">
        <div className="filter-row">
          <div className="search-wrap">
            <Search size={15} className="search-icon" />
            <input
              className="input"
              type="text"
              placeholder="Search by tracking ID, title, location, or description..."
              value={filters.search}
              onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value, page: 1 }))}
            />
          </div>

          <select
            className="select filter-select"
            value={filters.category}
            onChange={(e) => setFilters((f) => ({ ...f, category: e.target.value, page: 1 }))}
          >
            <option value="">All Categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <select
            className="select filter-select"
            value={filters.status}
            onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value, page: 1 }))}
          >
            <option value="">All Statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          <select
            className="select filter-select"
            value={filters.priority}
            onChange={(e) => setFilters((f) => ({ ...f, priority: e.target.value, page: 1 }))}
          >
            <option value="">All Priorities</option>
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>

          <select
            className="select filter-select"
            value={filters.date}
            onChange={(e) => setFilters((f) => ({ ...f, date: e.target.value, page: 1 }))}
          >
            <option value="">Any Time</option>
            <option value="today">Today</option>
            <option value="week">Last 7 Days</option>
            <option value="month">Last 30 Days</option>
          </select>

          <select
            className="select filter-select"
            value={filters.sort}
            onChange={(e) => setFilters((f) => ({ ...f, sort: e.target.value, page: 1 }))}
          >
            <option value="newest">Newest First</option>
            <option value="priority">Highest Priority</option>
            <option value="oldest">Oldest First</option>
          </select>

          {hasActiveFilters && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={resetFilters}>
              Reset
            </button>
          )}
        </div>
      </section>

      {loading ? (
        <div className="complaints-list">
          {[1, 2, 3].map((n) => (
            <div className="skeleton-card" key={n}>
              <div className="skeleton-line" style={{ width: "30%" }} />
              <div className="skeleton-line" style={{ width: "68%" }} />
              <div className="skeleton-line" style={{ width: "45%" }} />
            </div>
          ))}
        </div>
      ) : complaints.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">
            <SlidersHorizontal size={22} />
          </div>
          <h3>{hasActiveFilters ? "No matching complaints" : "No complaints found"}</h3>
          <p>
            {hasActiveFilters
              ? "Try adjusting your filters or clearing search keywords."
              : "Submit a new campus issue and it will appear here right away."}
          </p>
          {hasActiveFilters ? (
            <button className="btn btn-secondary" onClick={resetFilters}>
              Reset Filters
            </button>
          ) : (
            <button className="btn btn-primary" onClick={onNewReport}>
              <Plus size={15} /> Submit First Complaint
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="complaints-list">
            {complaints.map((item, idx) => (
              <motion.article
                className="complaint-card"
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: Math.min(idx * 0.03, 0.2) }}
              >
                <div>
                  <div className="complaint-meta-top">
                    <span className="mono-id">{item.tracking_id || `#${item.id}`}</span>
                    <span className={`badge status-${getStatusSlug(item.status)}`}>
                      <span className="badge-dot" />
                      {item.status}
                    </span>
                    <span className={`badge prio-${getPrioritySlug(item.priority)}`}>
                      {item.priority}
                    </span>
                    <span className="cat-pill">{item.category}</span>
                    {item.ai_summary && (
                      <span className="badge" style={{ background: "rgba(37,99,235,0.12)", color: "var(--accent)" }}>
                        <Sparkles size={11} /> AI Brief
                      </span>
                    )}
                    {item.image_url && (
                      <span className="badge" style={{ background: "rgba(6,182,212,0.12)", color: "#0891b2" }}>
                        <ImageIcon size={11} /> Photo
                      </span>
                    )}
                    {item.rating && (
                      <span className="badge" style={{ background: "rgba(245,158,11,0.15)", color: "#b45309" }}>
                        <Star size={11} fill="#f59e0b" color="#f59e0b" /> {item.rating}/5
                      </span>
                    )}
                  </div>

                  <h3 className="complaint-title" onClick={() => onSelectComplaint(item.id)}>
                    {item.title}
                  </h3>
                  <p className="complaint-desc">{item.description}</p>

                  <div className="complaint-meta-bottom">
                    <span className="meta-item"><MapPin size={13} /> {item.location}</span>
                    <span className="meta-item"><Clock size={13} /> {formatDateTime(item.created_at)}</span>
                    {item.assigned_to && (
                      <span className="meta-item" style={{ color: "var(--cyan)", fontWeight: 600 }}>
                        <UserCheck size={13} /> {item.assigned_to}
                      </span>
                    )}
                  </div>
                </div>

                <div className="complaint-actions">
                  {canChangeStatus && (
                    <select
                      className="select status-select"
                      aria-label={`Change status for ${item.title}`}
                      value={item.status}
                      onChange={(e) => onQuickStatus(item.id, e.target.value)}
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  )}

                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => onSelectComplaint(item.id)}
                  >
                    {item.status === "Resolved" && isStudent && !item.rating ? "Rate Fix" : "Details"}
                  </button>

                  {isAdmin && (
                    pendingDeleteId === item.id ? (
                      <div style={{ display: "inline-flex", gap: 6 }}>
                        <button
                          type="button"
                          className="btn btn-danger btn-sm"
                          onClick={() => {
                            setPendingDeleteId(null);
                            onQuickDelete(item.id, item.tracking_id);
                          }}
                        >
                          Confirm
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => setPendingDeleteId(null)}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-danger-ghost"
                        aria-label={`Delete ${item.title}`}
                        onClick={() => setPendingDeleteId(item.id)}
                      >
                        <Trash2 size={15} />
                      </button>
                    )
                  )}
                </div>
              </motion.article>
            ))}
          </div>

          {pagination.total_pages > 1 && (
            <div className="pagination-bar">
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                disabled={pagination.page <= 1}
                onClick={() => onPageChange(pagination.page - 1)}
              >
                Previous
              </button>
              <span style={{ fontSize: 13, color: "var(--ink-muted)" }}>
                Page <strong>{pagination.page}</strong> of <strong>{pagination.total_pages}</strong> ({pagination.total} total)
              </span>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                disabled={pagination.page >= pagination.total_pages}
                onClick={() => onPageChange(pagination.page + 1)}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </motion.div>
  );
}
