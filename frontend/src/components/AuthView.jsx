import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  AlertCircle,
  ArrowRight,
  Building2,
  CheckCircle2,
  Eye,
  EyeOff,
  GraduationCap,
  KeyRound,
  Lock,
  Mail,
  Moon,
  Phone,
  ShieldCheck,
  Sun,
  User,
  Wrench,
} from "lucide-react";
import { forgotPassword, loginUser, registerUser, saveSession } from "../api";

const DEMO_ACCOUNTS = [
  { label: "Student", id: "student@campusfix.edu", collegeId: "STU-2026-001", hint: "Student@123" },
  { label: "Admin", id: "admin@campusfix.edu", collegeId: "ADM-001", hint: "Admin@123" },
  { label: "Staff", id: "staff@campusfix.edu", collegeId: "STF-101", hint: "Staff@123" },
];

export default function AuthView({ onAuthSuccess, theme, onToggleTheme, onReplayIntro }) {
  const [mode, setMode] = useState("login"); // login | register | forgot
  const [tilt, setTilt] = useState({ rx: 0, ry: 0 });
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  // Registration fields
  const [fullName, setFullName] = useState("");
  const [collegeId, setCollegeId] = useState("");
  const [email, setEmail] = useState("");
  const [department, setDepartment] = useState("Computer Science");
  const [yearOfStudy, setYearOfStudy] = useState("3rd Year");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("student");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!identifier.trim() || !password) {
      setError("Enter your college email or ID and password.");
      return;
    }
    setError("");
    setSuccessMsg("");
    setLoading(true);
    try {
      const { data } = await loginUser({
        identifier: identifier.trim(),
        password,
        remember_me: rememberMe,
      });
      saveSession(data.token, data.user, rememberMe);
      onAuthSuccess(data.user);
    } catch (err) {
      setError(err.response?.data?.error || "Login failed. Check your credentials and Flask server.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!fullName.trim() || !collegeId.trim() || !email.trim() || !password) {
      setError("Please fill in all required registration fields.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setError("");
    setSuccessMsg("");
    setLoading(true);
    try {
      const { data } = await registerUser({
        full_name: fullName.trim(),
        college_id: collegeId.trim(),
        email: email.trim(),
        department: department.trim(),
        year_of_study: yearOfStudy.trim(),
        phone: phone.trim(),
        role,
        password,
      });
      saveSession(data.token, data.user, true);
      onAuthSuccess(data.user);
    } catch (err) {
      setError(err.response?.data?.error || "Registration failed. Please check your details.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async (e) => {
    e.preventDefault();
    if (!identifier.trim()) {
      setError("Enter your college email or ID.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const { data } = await forgotPassword(identifier.trim());
      setSuccessMsg(data.message);
    } catch (err) {
      setError(err.response?.data?.error || "Could not process request.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-bg-orb auth-orb-a" />
      <div className="auth-bg-orb auth-orb-b" />

      <div className="auth-top-controls">
        {onReplayIntro && (
          <button
            type="button"
            className="auth-theme-toggle"
            onClick={onReplayIntro}
            aria-label="Replay 3D startup animation"
          >
            <span>3D Intro</span>
          </button>
        )}
        <button
          type="button"
          className="auth-theme-toggle"
          onClick={onToggleTheme}
          aria-label="Toggle dark or light theme"
        >
          {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          <span>{theme === "dark" ? "Light" : "Dark"}</span>
        </button>
      </div>

      <div className="auth-container">
        {/* Left University Hero Showcase */}
        <motion.section
          className="auth-hero"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
        >
          <div className="auth-brand">
            <div className="brand-mark-3d">
              <div className="brand-mark brand-mark-lg">
                <GraduationCap size={24} />
              </div>
            </div>
            <div>
              <div className="auth-brand-title">CampusFix</div>
              <div className="auth-brand-sub">Modern University Operations Platform</div>
            </div>
          </div>

          <h1 className="auth-headline">
            Your Campus, <span className="auth-headline-accent">Better Together.</span>
          </h1>
          <p className="auth-copy">
            Report facility issues in seconds, let AI prioritize urgent repairs, and follow every
            ticket from submission to verified resolution.
          </p>

          <div className="auth-role-cards">
            <div className="auth-role-card">
              <GraduationCap size={18} color="#38bdf8" />
              <div>
                <strong>Students</strong>
                <span>Submit issues, attach photos, track live status & rate fixes.</span>
              </div>
            </div>
            <div className="auth-role-card">
              <Wrench size={18} color="#fbbf24" />
              <div>
                <strong>Maintenance Staff</strong>
                <span>View assigned work orders & post live field updates.</span>
              </div>
            </div>
            <div className="auth-role-card">
              <ShieldCheck size={18} color="#4ade80" />
              <div>
                <strong>Administrators</strong>
                <span>Assign teams, monitor SLA trends, manage users & export CSV.</span>
              </div>
            </div>
          </div>
        </motion.section>

        {/* Right Glassmorphic Auth Card with Subtle 3D Perspective Tilt */}
        <motion.section
          className="auth-card"
          initial={{ opacity: 0, y: 24, rotateX: 8 }}
          animate={{ opacity: 1, y: 0, rotateX: tilt.rx, rotateY: tilt.ry }}
          transition={{ type: "spring", stiffness: 210, damping: 24 }}
          style={{ transformPerspective: 1100 }}
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const px = (e.clientX - rect.left) / rect.width - 0.5;
            const py = (e.clientY - rect.top) / rect.height - 0.5;
            setTilt({ rx: -py * 4.5, ry: px * 4.5 });
          }}
          onMouseLeave={() => setTilt({ rx: 0, ry: 0 })}
        >
          <div className="auth-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={mode === "login"}
              className={`auth-tab ${mode === "login" ? "active" : ""}`}
              onClick={() => {
                setMode("login");
                setError("");
                setSuccessMsg("");
              }}
            >
              Sign In
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === "register"}
              className={`auth-tab ${mode === "register" ? "active" : ""}`}
              onClick={() => {
                setMode("register");
                setError("");
                setSuccessMsg("");
              }}
            >
              Create Account
            </button>
          </div>

          {error && (
            <div className="offline-banner" style={{ marginBottom: 14, padding: "10px 13px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            </div>
          )}

          {successMsg && (
            <div className="receipt-banner" style={{ marginBottom: 14, padding: "10px 13px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#15803d" }}>
                <CheckCircle2 size={16} />
                <span>{successMsg}</span>
              </div>
            </div>
          )}

          {mode === "login" && (
            <form onSubmit={handleLogin} className="auth-form" noValidate>
              <div className="field">
                <label className="label" htmlFor="login-id">College Email or ID</label>
                <div className="input-icon-wrap">
                  <Mail size={15} className="input-lead-icon" />
                  <input
                    id="login-id"
                    className="input input-with-icon"
                    type="text"
                    placeholder="student@campusfix.edu or STU-2026-001"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    autoComplete="username"
                    required
                  />
                </div>
              </div>

              <div className="field">
                <label className="label" htmlFor="login-pw">Password</label>
                <div className="input-icon-wrap">
                  <Lock size={15} className="input-lead-icon" />
                  <input
                    id="login-pw"
                    className="input input-with-icon input-with-trail"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    className="input-trail-btn"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <div className="auth-row-between">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  <span>Remember me</span>
                </label>
                <button
                  type="button"
                  className="text-link-btn"
                  onClick={() => {
                    setMode("forgot");
                    setError("");
                    setSuccessMsg("");
                  }}
                >
                  Forgot password?
                </button>
              </div>

              <button type="submit" className="btn btn-primary auth-submit-btn" disabled={loading}>
                <span>{loading ? "Signing in..." : "Sign In to CampusFix"}</span>
                <ArrowRight size={15} />
              </button>

              <div className="demo-box">
                <div className="demo-box-title">Workshop Demo Accounts (click to pre-fill email):</div>
                <div className="demo-chips">
                  {DEMO_ACCOUNTS.map((acc) => (
                    <button
                      key={acc.label}
                      type="button"
                      className="demo-chip"
                      onClick={() => {
                        setIdentifier(acc.id);
                        setError("");
                      }}
                      title={`ID: ${acc.collegeId} | Password: ${acc.hint}`}
                    >
                      <strong>{acc.label}</strong>
                      <span className="demo-chip-id">{acc.collegeId}</span>
                      <span className="demo-chip-pw">{acc.hint}</span>
                    </button>
                  ))}
                </div>
              </div>
            </form>
          )}

          {mode === "register" && (
            <form onSubmit={handleRegister} className="auth-form" noValidate>
              <div className="form-grid">
                <div className="field">
                  <label className="label" htmlFor="reg-name">Full Name *</label>
                  <div className="input-icon-wrap">
                    <User size={14} className="input-lead-icon" />
                    <input
                      id="reg-name"
                      className="input input-with-icon"
                      type="text"
                      placeholder="Priya Sharma"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="field">
                  <label className="label" htmlFor="reg-cid">College / Student ID *</label>
                  <input
                    id="reg-cid"
                    className="input"
                    type="text"
                    placeholder="STU-2026-104"
                    value={collegeId}
                    onChange={(e) => setCollegeId(e.target.value)}
                    required
                  />
                </div>

                <div className="field field-full">
                  <label className="label" htmlFor="reg-email">College Email *</label>
                  <div className="input-icon-wrap">
                    <Mail size={14} className="input-lead-icon" />
                    <input
                      id="reg-email"
                      className="input input-with-icon"
                      type="email"
                      placeholder="priya@campusfix.edu"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="field">
                  <label className="label" htmlFor="reg-dept">Department</label>
                  <div className="input-icon-wrap">
                    <Building2 size={14} className="input-lead-icon" />
                    <input
                      id="reg-dept"
                      className="input input-with-icon"
                      type="text"
                      placeholder="Computer Science"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                    />
                  </div>
                </div>

                <div className="field">
                  <label className="label" htmlFor="reg-year">Year of Study</label>
                  <select
                    id="reg-year"
                    className="select"
                    value={yearOfStudy}
                    onChange={(e) => setYearOfStudy(e.target.value)}
                  >
                    <option value="1st Year">1st Year</option>
                    <option value="2nd Year">2nd Year</option>
                    <option value="3rd Year">3rd Year</option>
                    <option value="4th Year">4th Year</option>
                    <option value="Postgraduate">Postgraduate</option>
                    <option value="Faculty / Staff">Faculty / Staff</option>
                  </select>
                </div>

                <div className="field">
                  <label className="label" htmlFor="reg-phone">Phone Number</label>
                  <div className="input-icon-wrap">
                    <Phone size={14} className="input-lead-icon" />
                    <input
                      id="reg-phone"
                      className="input input-with-icon"
                      type="tel"
                      placeholder="+1 555-0123"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>
                </div>

                <div className="field">
                  <label className="label" htmlFor="reg-role">Account Role</label>
                  <select
                    id="reg-role"
                    className="select"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                  >
                    <option value="student">Student</option>
                    <option value="staff">Maintenance Staff</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>

                <div className="field">
                  <label className="label" htmlFor="reg-pw">Password *</label>
                  <div className="input-icon-wrap">
                    <Lock size={14} className="input-lead-icon" />
                    <input
                      id="reg-pw"
                      className="input input-with-icon input-with-trail"
                      type={showPassword ? "text" : "password"}
                      placeholder="Min 6 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      className="input-trail-btn"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label="Toggle password visibility"
                    >
                      {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                <div className="field">
                  <label className="label" htmlFor="reg-pw2">Confirm Password *</label>
                  <input
                    id="reg-pw2"
                    className="input"
                    type={showPassword ? "text" : "password"}
                    placeholder="Re-enter password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <button type="submit" className="btn btn-primary auth-submit-btn" disabled={loading}>
                <span>{loading ? "Creating account..." : "Create CampusFix Account"}</span>
                <ArrowRight size={15} />
              </button>
            </form>
          )}

          {mode === "forgot" && (
            <form onSubmit={handleForgot} className="auth-form" noValidate>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <KeyRound size={18} color="var(--accent)" />
                <h3 style={{ margin: 0, fontSize: 16 }}>Reset Password</h3>
              </div>
              <p style={{ margin: "0 0 10px", fontSize: 13, color: "var(--ink-muted)" }}>
                Enter your registered college email or ID and we will send reset instructions.
              </p>
              <div className="field">
                <label className="label" htmlFor="forgot-id">College Email or ID</label>
                <input
                  id="forgot-id"
                  className="input"
                  type="text"
                  placeholder="student@campusfix.edu"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary auth-submit-btn" disabled={loading}>
                {loading ? "Sending..." : "Send Reset Link"}
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  setMode("login");
                  setError("");
                  setSuccessMsg("");
                }}
              >
                Back to Sign In
              </button>
            </form>
          )}
        </motion.section>
      </div>
    </div>
  );
}
