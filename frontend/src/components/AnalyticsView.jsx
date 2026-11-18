import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Download, RefreshCw } from "lucide-react";
import {
  getDashboardCategories,
  getDashboardStats,
  getDashboardTrends,
  getExportCsvUrl,
} from "../api";

const STATUS_COLORS = {
  Pending: "#f59e0b",
  Assigned: "#7c3aed",
  "In Progress": "#06b6d4",
  Resolved: "#16a34a",
};

const PRIO_COLORS = {
  Critical: "#dc2626",
  High: "#f97316",
  Medium: "#eab308",
  Low: "#64748b",
};

export default function AnalyticsView() {
  const [stats, setStats] = useState(null);
  const [categories, setCategories] = useState([]);
  const [trends, setTrends] = useState({ monthly: [], daily: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadAnalytics = async () => {
    setLoading(true);
    setError("");
    try {
      const [sRes, cRes, tRes] = await Promise.all([
        getDashboardStats(),
        getDashboardCategories(),
        getDashboardTrends(),
      ]);
      setStats(sRes.data);
      setCategories(cRes.data.categories || []);
      setTrends(tRes.data || { monthly: [], daily: [] });
    } catch {
      setError("Unable to load analytics from the backend.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="analytics-grid">
        {[1, 2, 3, 4].map((n) => (
          <div className="skeleton-card" key={n}>
            <div className="skeleton-line" style={{ width: "40%" }} />
            <div className="skeleton-line" style={{ width: "90%", height: 140 }} />
          </div>
        ))}
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="offline-banner">
        <span>{error || "No analytics available."}</span>
        <button className="btn btn-secondary btn-sm" onClick={loadAnalytics}>
          <RefreshCw size={14} /> Retry
        </button>
      </div>
    );
  }

  const total = stats.total || 0;
  const statusPieData = Object.entries(STATUS_COLORS)
    .map(([name, color]) => ({
      name,
      value: stats.by_status?.[name] ?? 0,
      color,
    }))
    .filter((d) => d.value > 0);

  const priorityData = ["Critical", "High", "Medium", "Low"].map((name) => ({
    name,
    count: stats.by_priority?.[name] ?? 0,
    color: PRIO_COLORS[name],
  }));

  const resolutionRate = total > 0 ? Math.round(((stats.resolved || 0) / total) * 100) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <div className="page-header">
        <div>
          <h1 className="page-title">Campus Analytics & Insights</h1>
          <p className="page-desc">
            Interactive charts across categories, priority urgency, status distribution, and monthly trends.
          </p>
        </div>
        <div className="header-controls">
          <button className="btn btn-secondary" onClick={loadAnalytics}>
            <RefreshCw size={14} /> Refresh
          </button>
          <a className="btn btn-primary" href={getExportCsvUrl()} download>
            <Download size={14} /> Export CSV
          </a>
        </div>
      </div>

      <div className="analytics-grid">
        {/* Category Bar Chart */}
        <motion.div
          className="card"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="card-title">Complaints by Category</h2>
          <p className="card-sub">Live volume across campus departments</p>
          {categories.length === 0 ? (
            <p className="card-sub">No complaints recorded yet.</p>
          ) : (
            <div style={{ width: "100%", height: 240 }}>
              <ResponsiveContainer>
                <BarChart data={categories} margin={{ top: 8, right: 12, left: -16, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="category" tick={{ fill: "var(--ink-muted)", fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fill: "var(--ink-muted)", fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--surface)",
                      border: "1px solid var(--border)",
                      borderRadius: 10,
                    }}
                  />
                  <Bar dataKey="count" fill="#06b6d4" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </motion.div>

        {/* Status Donut Chart */}
        <motion.div
          className="card"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="card-title">Resolution & Status Mix</h2>
          <p className="card-sub">
            Overall resolution rate: <strong>{resolutionRate}%</strong> ({stats.resolved || 0} of {total})
          </p>
          {statusPieData.length === 0 ? (
            <p className="card-sub">No status records yet.</p>
          ) : (
            <div style={{ width: "100%", height: 200 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={statusPieData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={52}
                    outerRadius={80}
                    paddingAngle={4}
                  >
                    {statusPieData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
          <div className="legend-grid">
            {Object.entries(STATUS_COLORS).map(([label, color]) => (
              <div className="legend-item" key={label}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 7, fontWeight: 600 }}>
                  <span style={{ width: 9, height: 9, borderRadius: "50%", background: color }} />
                  {label}
                </span>
                <span className="mono-id">{stats.by_status?.[label] ?? 0}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Priority Bar Chart */}
        <motion.div
          className="card"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="card-title">Priority Distribution</h2>
          <p className="card-sub">Urgency tiers across all tickets</p>
          <div style={{ width: "100%", height: 230 }}>
            <ResponsiveContainer>
              <BarChart data={priorityData} margin={{ top: 8, right: 12, left: -16, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" tick={{ fill: "var(--ink-muted)", fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fill: "var(--ink-muted)", fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: 10,
                  }}
                />
                <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                  {priorityData.map((item) => (
                    <Cell key={item.name} fill={item.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Monthly Trend Area Chart */}
        <motion.div
          className="card"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="card-title">Monthly Complaint Trends</h2>
          <p className="card-sub">Submission timeline grouped by month</p>
          {(trends.monthly || []).length === 0 ? (
            <p className="card-sub">No monthly data yet.</p>
          ) : (
            <div style={{ width: "100%", height: 230 }}>
              <ResponsiveContainer>
                <AreaChart data={trends.monthly} margin={{ top: 8, right: 12, left: -16, bottom: 4 }}>
                  <defs>
                    <linearGradient id="cfTrendGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="month" tick={{ fill: "var(--ink-muted)", fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fill: "var(--ink-muted)", fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--surface)",
                      border: "1px solid var(--border)",
                      borderRadius: 10,
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="#7c3aed"
                    strokeWidth={2.5}
                    fill="url(#cfTrendGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}
