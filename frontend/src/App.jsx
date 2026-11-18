import React, { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, MotionConfig } from "framer-motion";
import {
  AlertCircle,
  BarChart3,
  Bell,
  CheckCircle2,
  ClipboardList,
  Compass,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  PenSquare,
  RefreshCw,
  Search,
  Settings,
  Sun,
  User,
  Users,
  X,
} from "lucide-react";
import {
  clearSession,
  deleteComplaint,
  getComplaints,
  getNotifications,
  getProfile,
  getStats,
  getStoredToken,
  getStoredUser,
  markAllNotificationsRead,
  patchComplaintStatus,
  setUnauthorizedHandler,
} from "./api";
import AnalyticsView from "./components/AnalyticsView";
import AuthView from "./components/AuthView";
import ComplaintModal from "./components/ComplaintModal";
import ComplaintsView from "./components/ComplaintsView";
import DashboardBento from "./components/DashboardBento";
import IntroSplash3D from "./components/IntroSplash3D";
import NotificationsDrawer from "./components/NotificationsDrawer";
import ProfileView from "./components/ProfileView";
import ReportForm from "./components/ReportForm";
import TrackView from "./components/TrackView";
import UsersView from "./components/UsersView";

const DEFAULT_FILTERS = {
  search: "",
  category: "",
  status: "",
  priority: "",
  date: "",
  sort: "newest",
  mine: false,
  assignedToMe: false,
  overdue: false,
  page: 1,
};

export default function App() {
  const [user, setUser] = useState(() => getStoredUser());
  const [showIntro, setShowIntro] = useState(true);
  const [theme, setTheme] = useState(() => localStorage.getItem("campusfix_theme") || "light");
  const [tab, setTab] = useState("dashboard");
  const [trackTarget, setTrackTarget] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [complaints, setComplaints] = useState([]);
  const [recentComplaints, setRecentComplaints] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 8, total: 0, total_pages: 1 });
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    assigned: 0,
    in_progress: 0,
    resolved: 0,
    by_category: {},
    by_priority: {},
  });
  const [notifications, setNotifications] = useState([]);
  const [notifOpen, setNotifOpen] = useState(false);

  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [loading, setLoading] = useState(false);
  const [offline, setOffline] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [toast, setToast] = useState(null);

  const globalSearchRef = useRef(null);

  const notify = useCallback((message, isError = false) => {
    setToast({ message, isError });
    window.clearTimeout(window.__cfToastTimer);
    window.__cfToastTimer = window.setTimeout(() => setToast(null), 3400);
  }, []);

  // Theme sync
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("campusfix_theme", theme);
  }, [theme]);

  // Handle 401 expired sessions globally
  useEffect(() => {
    setUnauthorizedHandler((msg) => {
      setUser(null);
      notify(msg || "Session expired. Please sign in again.", true);
    });
  }, [notify]);

  // Revalidate stored token on load
  useEffect(() => {
    if (getStoredToken()) {
      getProfile()
        .then((res) => setUser(res.data))
        .catch(() => {
          clearSession();
          setUser(null);
        });
    }
  }, []);

  // Ctrl + K global search shortcut
  useEffect(() => {
    const onKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        globalSearchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const fetchDashboardData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const params = {
        page: filters.page,
        limit: 8,
        sort: filters.sort,
      };
      if (filters.search.trim()) params.search = filters.search.trim();
      if (filters.category) params.category = filters.category;
      if (filters.status) params.status = filters.status;
      if (filters.priority) params.priority = filters.priority;
      if (filters.date) params.date = filters.date;
      if (filters.mine) params.mine = "true";
      if (filters.assignedToMe && user.full_name) params.assigned_to = user.full_name;
      if (filters.overdue) params.overdue = "true";

      const [pagedRes, recentRes, statsRes, notifRes] = await Promise.all([
        getComplaints(params),
        getComplaints({ limit: 4, page: 1, sort: "newest" }),
        getStats(),
        getNotifications().catch(() => ({ data: [] })),
      ]);

      const paged = pagedRes.data;
      setComplaints(paged.items || []);
      setPagination({
        page: paged.page || 1,
        limit: paged.limit || 8,
        total: paged.total || 0,
        total_pages: paged.total_pages || 1,
      });
      setRecentComplaints(recentRes.data.items || []);
      setStats(statsRes.data);
      setNotifications(notifRes.data || []);
      setOffline(false);
    } catch {
      setOffline(true);
    } finally {
      setLoading(false);
    }
  }, [user, filters]);

  useEffect(() => {
    if (!user) return;
    const timer = setTimeout(() => {
      fetchDashboardData();
    }, 150);
    return () => clearTimeout(timer);
  }, [user, fetchDashboardData]);

  const handleLogout = () => {
    clearSession();
    setUser(null);
    setTab("dashboard");
    setFilters(DEFAULT_FILTERS);
    notify("Signed out safely.");
  };

  const handleQuickStatus = async (id, nextStatus) => {
    try {
      await patchComplaintStatus(id, nextStatus);
      notify(`Updated status to ${nextStatus}`);
      fetchDashboardData();
    } catch (err) {
      notify(err.response?.data?.error || "Status update failed", true);
    }
  };

  const handleQuickDelete = async (id, tid) => {
    try {
      await deleteComplaint(id);
      notify(`Deleted ${tid || `#${id}`}`);
      fetchDashboardData();
    } catch (err) {
      notify(err.response?.data?.error || "Failed to delete complaint", true);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: 1 })));
      notify("All notifications marked as read");
    } catch {
      notify("Could not update notifications", true);
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;
  const isAdmin = user?.role === "admin";
  const isStaff = user?.role === "staff";

  // Role-based route guard
  const safeNavigate = (nextTab) => {
    if (nextTab === "users" && !isAdmin) {
      notify("Administrator access required.", true);
      return;
    }
    setTab(nextTab);
    setSidebarOpen(false);
  };

  const hasActiveFilters = Boolean(
    filters.search ||
      filters.category ||
      filters.status ||
      filters.priority ||
      filters.date ||
      filters.mine ||
      filters.assignedToMe ||
      filters.overdue ||
      filters.sort !== "newest"
  );

  const navItems = [
    { id: "dashboard", label: "Dashboard", Icon: LayoutDashboard },
    { id: "report", label: "Submit Complaint", Icon: PenSquare },
    {
      id: "complaints",
      label: isAdmin ? "All Complaints" : isStaff ? "Work Queue" : "My Complaints",
      Icon: ClipboardList,
    },
    { id: "track", label: "Track Status", Icon: Compass },
    { id: "analytics", label: "Analytics", Icon: BarChart3 },
    ...(isAdmin ? [{ id: "users", label: "Manage Users", Icon: Users }] : []),
    { id: "notifications", label: "Notifications", Icon: Bell, badge: unreadCount },
    { id: "profile", label: "Profile", Icon: User },
  ];

  if (!user) {
    return (
      <MotionConfig reducedMotion="user">
        <AnimatePresence>
          {showIntro && <IntroSplash3D onComplete={() => setShowIntro(false)} />}
        </AnimatePresence>
        <AuthView
          onAuthSuccess={(u) => {
            setUser(u);
            setTab("dashboard");
            notify(`Welcome back, ${u.full_name}!`);
          }}
          theme={theme}
          onToggleTheme={() => setTheme((t) => (t === "light" ? "dark" : "light"))}
          onReplayIntro={() => setShowIntro(true)}
        />
        {toast && (
          <div className={`toast ${toast.isError ? "error" : ""}`} role="status">
            {toast.isError ? <AlertCircle size={15} /> : <CheckCircle2 size={15} />}
            <span>{toast.message}</span>
          </div>
        )}
      </MotionConfig>
    );
  }

  return (
    <MotionConfig reducedMotion="user">
      <AnimatePresence>
        {showIntro && <IntroSplash3D onComplete={() => setShowIntro(false)} />}
      </AnimatePresence>
      <div className="app-shell">
        {/* Mobile Sidebar Backdrop */}
        {sidebarOpen && (
          <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />
        )}

        {/* Fixed Midnight-Blue University Sidebar */}
        <aside className={`sidebar ${sidebarOpen ? "open" : ""}`} aria-label="Sidebar navigation">
          <div className="sidebar-top">
            <div className="sidebar-brand" onClick={() => safeNavigate("dashboard")}>
              <div className="crest-mark">
                <GraduationCap size={24} color="#fbbf24" />
              </div>
              <div className="sidebar-brand-name">CampusFix</div>
              <div className="sidebar-brand-tagline">Report • Track • Resolve</div>
            </div>

            <button
              type="button"
              className="sidebar-close-btn"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close sidebar"
            >
              <X size={18} />
            </button>

            <nav className="sidebar-nav">
              {navItems.map(({ id, label, Icon, badge }) => {
                const isActive = id === "notifications" ? notifOpen : tab === id;
                return (
                  <button
                    key={id}
                    type="button"
                    className={`sidebar-link ${isActive ? "active" : ""}`}
                    onClick={() => {
                      if (id === "notifications") {
                        setNotifOpen(true);
                        setSidebarOpen(false);
                      } else {
                        safeNavigate(id);
                      }
                    }}
                  >
                    <Icon size={17} />
                    <span>{label}</span>
                    {badge > 0 && <span className="sidebar-badge">{badge}</span>}
                  </button>
                );
              })}

              <button
                type="button"
                className="sidebar-link"
                onClick={() => safeNavigate("profile")}
              >
                <Settings size={17} />
                <span>Settings</span>
              </button>

              <button type="button" className="sidebar-link sidebar-logout" onClick={handleLogout}>
                <LogOut size={17} />
                <span>Logout</span>
              </button>
            </nav>
          </div>

          {/* Glowing Campus Illustration & Dark/Light Switch */}
          <div className="sidebar-footer">
            <svg
              className="campus-wireframe"
              viewBox="0 0 180 78"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M14 72 H166 M26 72 V42 H58 V72 M122 72 V42 H154 V72 M58 72 V30 L90 14 L122 30 V72"
                stroke="#38bdf8"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M90 14 V6 M84 10 H96 M78 72 V54 C78 48 102 48 102 54 V72 M68 38 H74 M87 38 H93 M106 38 H112 M36 52 H44 M136 52 H144"
                stroke="#38bdf8"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              <circle cx="90" cy="27" r="3.5" stroke="#fbbf24" strokeWidth="1.5" />
            </svg>
            <div className="sidebar-motto">A Better Campus Together</div>

            <button
              type="button"
              className="theme-switch-pill"
              onClick={() => setTheme((t) => (t === "light" ? "dark" : "light"))}
              aria-label="Toggle light or dark mode"
            >
              <Sun size={14} color={theme === "light" ? "#fbbf24" : "#94a3b8"} />
              <span className={`switch-track ${theme === "dark" ? "dark" : ""}`}>
                <span className="switch-thumb" />
              </span>
              <Moon size={14} color={theme === "dark" ? "#38bdf8" : "#94a3b8"} />
            </button>
          </div>
        </aside>

        {/* Right Main Content Column */}
        <div className="main-area">
          <header className="top-header">
            <div className="top-header-left">
              <button
                type="button"
                className="mobile-menu-btn"
                onClick={() => setSidebarOpen(true)}
                aria-label="Open menu"
              >
                <Menu size={20} />
              </button>

              <form
                className="global-search"
                onSubmit={(e) => {
                  e.preventDefault();
                  safeNavigate("complaints");
                }}
              >
                <Search size={15} className="search-icon" />
                <input
                  ref={globalSearchRef}
                  type="text"
                  className="global-search-input"
                  placeholder="Search complaints, locations..."
                  value={filters.search}
                  onChange={(e) => {
                    setFilters((f) => ({ ...f, search: e.target.value, page: 1 }));
                    if (tab !== "complaints" && e.target.value.trim().length >= 2) {
                      setTab("complaints");
                    }
                  }}
                />
                <kbd className="kbd-badge">Ctrl + K</kbd>
              </form>
            </div>

            <div className="top-header-right">
              <button
                type="button"
                className="notif-icon-btn"
                onClick={() => setNotifOpen(true)}
                aria-label="Open notifications"
              >
                <Bell size={18} />
                {unreadCount > 0 && <span className="notif-count">{unreadCount}</span>}
              </button>

              <button
                type="button"
                className="user-chip"
                onClick={() => safeNavigate("profile")}
              >
                <div className="avatar-sm">
                  {(user.full_name || "U").slice(0, 2).toUpperCase()}
                  <span className="online-dot" />
                </div>
                <div className="user-chip-text">
                  <span className="user-chip-name">{user.full_name}</span>
                  <span className="user-chip-role">{user.role}</span>
                </div>
              </button>
            </div>
          </header>

          <main className="main-content">
            {offline && (
              <div className="offline-banner">
                <div className="offline-banner-left">
                  <AlertCircle size={18} />
                  <span>
                    Cannot reach the Flask backend at <code>http://127.0.0.1:5000</code>. Make sure{" "}
                    <code>python app.py</code> is running.
                  </span>
                </div>
                <button className="btn btn-secondary btn-sm" onClick={fetchDashboardData}>
                  <RefreshCw size={14} /> Retry
                </button>
              </div>
            )}

            {tab === "dashboard" && (
              <DashboardBento
                user={user}
                stats={stats}
                recentComplaints={recentComplaints}
                onNavigate={safeNavigate}
                onSelectComplaint={(id) => setSelectedId(id)}
                onFilterStatus={(st) => setFilters((f) => ({ ...f, status: st, page: 1 }))}
                onSupportClick={() => {
                  notify("Campus Helpdesk: support@campusfix.edu • Ext. 4400");
                  safeNavigate("track");
                }}
              />
            )}

            {tab === "complaints" && (
              <ComplaintsView
                currentUser={user}
                complaints={complaints}
                loading={loading}
                filters={filters}
                setFilters={setFilters}
                resetFilters={() => setFilters(DEFAULT_FILTERS)}
                hasActiveFilters={hasActiveFilters}
                pagination={pagination}
                onPageChange={(p) => setFilters((f) => ({ ...f, page: p }))}
                onQuickStatus={handleQuickStatus}
                onQuickDelete={handleQuickDelete}
                onSelectComplaint={(id) => setSelectedId(id)}
                onNewReport={() => safeNavigate("report")}
              />
            )}

            {tab === "report" && (
              <ReportForm
                onCreated={fetchDashboardData}
                onTrackClick={(tid) => {
                  setTrackTarget(tid);
                  safeNavigate("track");
                }}
                notify={notify}
              />
            )}

            {tab === "track" && <TrackView initialTrackingId={trackTarget} />}

            {tab === "analytics" && <AnalyticsView />}

            {tab === "users" && isAdmin && <UsersView currentUser={user} notify={notify} />}

            {tab === "profile" && (
              <ProfileView user={user} onUserUpdated={(u) => setUser(u)} notify={notify} />
            )}
          </main>
        </div>

        {/* Mobile Bottom Navigation */}
        <nav className="mobile-bottom-nav" aria-label="Mobile quick navigation">
          {[
            { id: "dashboard", label: "Home", Icon: LayoutDashboard },
            { id: "report", label: "Report", Icon: PenSquare },
            { id: "complaints", label: "Issues", Icon: ClipboardList },
            { id: "track", label: "Track", Icon: Compass },
            { id: "analytics", label: "Stats", Icon: BarChart3 },
          ].map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              className={`bottom-nav-btn ${tab === id ? "active" : ""}`}
              onClick={() => safeNavigate(id)}
            >
              <Icon size={18} />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <AnimatePresence>
          {selectedId && (
            <ComplaintModal
              complaintId={selectedId}
              currentUser={user}
              onClose={() => setSelectedId(null)}
              onUpdated={fetchDashboardData}
              notify={notify}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {notifOpen && (
            <NotificationsDrawer
              open={notifOpen}
              notifications={notifications}
              onClose={() => setNotifOpen(false)}
              onMarkAllRead={handleMarkAllRead}
              onSelectComplaint={(id) => setSelectedId(id)}
            />
          )}
        </AnimatePresence>

        {toast && (
          <div className={`toast ${toast.isError ? "error" : ""}`} role="status">
            {toast.isError ? <AlertCircle size={15} /> : <CheckCircle2 size={15} />}
            <span>{toast.message}</span>
          </div>
        )}
      </div>
    </MotionConfig>
  );
}
