import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { RefreshCw, Shield, Users as UsersIcon } from "lucide-react";
import { getUsers, updateUserRole } from "../api";

export default function UsersView({ currentUser, notify }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadUsers = async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await getUsers();
      setUsers(data);
    } catch (err) {
      setError(err.response?.data?.error || "Unable to load users (Admin access required).");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleRoleChange = async (userId, newRole) => {
    try {
      await updateUserRole(userId, newRole);
      notify(`Updated role to ${newRole}`);
      loadUsers();
    } catch (err) {
      notify(err.response?.data?.error || "Could not update role", true);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <div className="page-header">
        <div>
          <h1 className="page-title">User & Role Management</h1>
          <p className="page-desc">
            Manage students, maintenance staff, and campus administrators.
          </p>
        </div>
        <button className="btn btn-secondary" onClick={loadUsers}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {error && (
        <div className="offline-banner">
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="skeleton-card">
          <div className="skeleton-line" style={{ width: "50%" }} />
          <div className="skeleton-line" style={{ width: "90%" }} />
          <div className="skeleton-line" style={{ width: "80%" }} />
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>College ID</th>
                  <th>Email</th>
                  <th>Department</th>
                  <th>Complaints</th>
                  <th>Role</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td style={{ fontWeight: 600 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <UsersIcon size={14} color="var(--cyan)" />
                        <span>{u.full_name}</span>
                        {u.id === currentUser?.id && (
                          <span className="cat-pill" style={{ fontSize: 10 }}>You</span>
                        )}
                      </div>
                    </td>
                    <td><span className="mono-id">{u.college_id}</span></td>
                    <td>{u.email}</td>
                    <td>{u.department || "—"}</td>
                    <td>{u.complaint_count ?? 0}</td>
                    <td>
                      <select
                        className="select status-select"
                        value={u.role}
                        disabled={u.id === currentUser?.id}
                        onChange={(e) => handleRoleChange(u.id, e.target.value)}
                      >
                        <option value="student">Student</option>
                        <option value="staff">Maintenance Staff</option>
                        <option value="admin">Administrator</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ padding: "12px 18px", borderTop: "1px solid var(--border)", fontSize: 12, color: "var(--ink-muted)", display: "flex", alignItems: "center", gap: 6 }}>
            <Shield size={13} /> Role changes take effect immediately and are enforced by the Flask backend.
          </div>
        </div>
      )}
    </motion.div>
  );
}
