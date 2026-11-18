import React, { useState } from "react";
import { motion } from "framer-motion";
import { Building2, Mail, Phone, Save, ShieldCheck, User } from "lucide-react";
import { updateProfile, updateStoredUser } from "../api";

export default function ProfileView({ user, onUserUpdated, notify }) {
  const [fullName, setFullName] = useState(user?.full_name || "");
  const [department, setDepartment] = useState(user?.department || "");
  const [yearOfStudy, setYearOfStudy] = useState(user?.year_of_study || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await updateProfile({
        full_name: fullName.trim(),
        department: department.trim(),
        year_of_study: yearOfStudy.trim(),
        phone: phone.trim(),
      });
      updateStoredUser(data.user);
      onUserUpdated?.(data.user);
      notify("Profile updated!");
    } catch (err) {
      notify(err.response?.data?.error || "Could not update profile", true);
    } finally {
      setSaving(false);
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
          <h1 className="page-title">My Campus Profile</h1>
          <p className="page-desc">Keep your contact and department details up to date.</p>
        </div>
      </div>

      <div className="form-layout">
        <form className="card" onSubmit={handleSave}>
          <h2 className="card-title">Personal Information</h2>
          <p className="card-sub">Signed in with <span className="mono-id">{user?.college_id}</span></p>

          <div className="form-grid">
            <div className="field">
              <label className="label" htmlFor="prof-name">Full Name</label>
              <input
                id="prof-name"
                className="input"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>

            <div className="field">
              <label className="label" htmlFor="prof-dept">Department</label>
              <input
                id="prof-dept"
                className="input"
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
              />
            </div>

            <div className="field">
              <label className="label" htmlFor="prof-year">Year / Title</label>
              <input
                id="prof-year"
                className="input"
                type="text"
                value={yearOfStudy}
                onChange={(e) => setYearOfStudy(e.target.value)}
              />
            </div>

            <div className="field">
              <label className="label" htmlFor="prof-phone">Phone Number</label>
              <input
                id="prof-phone"
                className="input"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </div>

          <div style={{ marginTop: 18, display: "flex", justifyContent: "flex-end" }}>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              <Save size={15} /> {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>

        <aside className="card">
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
            <div className="avatar-circle">
              {(user?.full_name || "U").slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16 }}>{user?.full_name}</div>
              <span className="badge status-assigned" style={{ textTransform: "capitalize" }}>
                <ShieldCheck size={12} /> {user?.role}
              </span>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 13, color: "var(--ink-secondary)" }}>
            <div className="meta-item"><User size={14} /> ID: <strong className="mono-id">{user?.college_id}</strong></div>
            <div className="meta-item"><Mail size={14} /> {user?.email}</div>
            <div className="meta-item"><Building2 size={14} /> {user?.department || "General Campus"}</div>
            <div className="meta-item"><Phone size={14} /> {user?.phone || "No phone added"}</div>
          </div>
        </aside>
      </div>
    </motion.div>
  );
}
