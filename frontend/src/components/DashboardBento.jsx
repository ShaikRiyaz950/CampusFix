import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";
import {
  ArrowRight,
  BarChart3,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Clock,
  Compass,
  Droplets,
  Headphones,
  Lightbulb,
  MapPin,
  Megaphone,
  PenSquare,
  Shield,
  Sparkles,
  Star,
  TrendingUp,
  Wifi,
  Wrench,
  Zap,
} from "lucide-react";
import AnimatedCounter from "./AnimatedCounter";
import { formatDateTime, getStatusSlug } from "../constants";

const HERO_SLIDES = [
  {
    id: "welcome",
    kicker: "Your Campus,",
    highlight: "Better Together",
    subtitle: "Report campus issues. Track progress. Make a difference.",
    cta: "Submit a Complaint",
    image: "/campus-hero.png",
    tag: "Campus Operations",
  },
  {
    id: "ai-triage",
    kicker: "Smart AI",
    highlight: "Instant Triage",
    subtitle: "Describe any electrical, plumbing, or IT issue and let AI prioritize urgent fixes.",
    cta: "Try AI Report",
    image: "/campus-fest.png",
    tag: "Gemini Powered",
  },
  {
    id: "transparency",
    kicker: "Live Ticket",
    highlight: "Timeline Tracking",
    subtitle: "Follow every CMP-2026 ticket from submission and assignment to verified resolution.",
    cta: "Submit a Complaint",
    image: "/campus-hero.png",
    tag: "100% Transparent",
  },
];

const ANNOUNCEMENTS = [
  {
    id: "techfest",
    badge: "Important",
    badgeColor: "#7c3aed",
    title: "Annual Tech Fest 2026",
    meta: "Dec 15–17, 2026  |  Main Auditorium",
    image: "/campus-fest.png",
  },
  {
    id: "wifi",
    badge: "Campus Update",
    badgeColor: "#0891b2",
    title: "Library Wi-Fi 6E Upgrade Complete",
    meta: "All 3 Floors  |  Gigabit Speed Active",
    image: "/campus-hero.png",
  },
  {
    id: "safety",
    badge: "Safety Alert",
    badgeColor: "#d97706",
    title: "Extended Maintenance Helpdesk",
    meta: "7:00 AM – 10:00 PM  |  Exam Week Support",
    image: "/campus-fest.png",
  },
];

const UPCOMING_EVENTS = [
  {
    month: "NOV",
    day: "20",
    color: "#2563eb",
    title: "Guest Lecture on AI & Future",
    meta: "Auditorium • 10:00 AM",
  },
  {
    month: "NOV",
    day: "22",
    color: "#06b6d4",
    title: "Sports Day 2026",
    meta: "College Ground • 9:00 AM",
  },
  {
    month: "NOV",
    day: "25",
    color: "#16a34a",
    title: "Cultural Fest - Aarambh",
    meta: "Main Stage • 6:00 PM",
  },
];

const DONUT_COLORS = ["#2563eb", "#f59e0b", "#16a34a", "#7c3aed", "#06b6d4", "#ec4899"];

const PRIORITY_META = [
  { key: "Critical", color: "#ef4444" },
  { key: "High", color: "#f59e0b" },
  { key: "Medium", color: "#2563eb" },
  { key: "Low", color: "#94a3b8" },
];

function CategoryThumb({ category, imageUrl }) {
  if (imageUrl) {
    return <img src={imageUrl} alt="" className="recent-thumb-img" />;
  }
  const map = {
    Plumbing: { bg: "linear-gradient(135deg,#0284c7,#38bdf8)", Icon: Droplets },
    Electrical: { bg: "linear-gradient(135deg,#d97706,#fbbf24)", Icon: Lightbulb },
    "IT / Network": { bg: "linear-gradient(135deg,#6d28d9,#8b5cf6)", Icon: Wifi },
    Security: { bg: "linear-gradient(135deg,#dc2626,#f87171)", Icon: Shield },
    Sanitation: { bg: "linear-gradient(135deg,#15803d,#4ade80)", Icon: Sparkles },
  };
  const cfg = map[category] || { bg: "linear-gradient(135deg,#1e3a8a,#3b82f6)", Icon: Wrench };
  const Icon = cfg.Icon;
  return (
    <div className="recent-thumb-fallback" style={{ background: cfg.bg }}>
      <Icon size={18} color="#ffffff" />
    </div>
  );
}

export default function DashboardBento({
  user,
  stats,
  recentComplaints,
  onNavigate,
  onSelectComplaint,
  onFilterStatus,
  onSupportClick,
}) {
  const [heroIdx, setHeroIdx] = useState(0);
  const [heroPaused, setHeroPaused] = useState(false);
  const [annIdx, setAnnIdx] = useState(0);
  const [annPaused, setAnnPaused] = useState(false);

  useEffect(() => {
    if (heroPaused) return;
    const t = setInterval(() => setHeroIdx((i) => (i + 1) % HERO_SLIDES.length), 5000);
    return () => clearInterval(t);
  }, [heroPaused]);

  useEffect(() => {
    if (annPaused) return;
    const t = setInterval(() => setAnnIdx((i) => (i + 1) % ANNOUNCEMENTS.length), 4500);
    return () => clearInterval(t);
  }, [annPaused]);

  const firstName = (user?.full_name || "Student").split(" ")[0];
  const hero = HERO_SLIDES[heroIdx];
  const announcement = ANNOUNCEMENTS[annIdx];

  const total = stats?.total || 0;
  const pending = stats?.pending || 0;
  const inProgress = (stats?.in_progress || 0) + (stats?.assigned || 0);
  const resolved = stats?.resolved || 0;
  const resolutionPct = total > 0 ? Math.round((resolved / total) * 100) : 0;

  // Build category donut data from live backend stats
  const rawCategories = Object.entries(stats?.by_category || {}).sort((a, b) => b[1] - a[1]);
  const donutData =
    rawCategories.length > 0
      ? rawCategories.slice(0, 4).map(([name, value], i) => ({
          name,
          value,
          pct: total > 0 ? Math.round((value / total) * 100) : 0,
          color: DONUT_COLORS[i % DONUT_COLORS.length],
        }))
      : [{ name: "No Issues", value: 1, pct: 0, color: "#cbd5e1" }];

  const priorityChartData = PRIORITY_META.map((p) => ({
    name: p.key,
    count: stats?.by_priority?.[p.key] ?? 0,
    color: p.color,
  }));

  const kpiCards = [
    {
      label: "Total Complaints",
      value: total,
      badge: `${resolutionPct}% resolved`,
      badgeTone: "up",
      tone: "kpi-blue",
      iconBg: "linear-gradient(135deg, #2563eb, #3b82f6)",
      waveColor: "#3b82f6",
      Icon: ClipboardList,
      statusFilter: "",
    },
    {
      label: "Pending",
      value: pending,
      badge: pending > 0 ? "Needs review" : "All clear",
      badgeTone: "warn",
      tone: "kpi-amber",
      iconBg: "linear-gradient(135deg, #ea580c, #f59e0b)",
      waveColor: "#f59e0b",
      Icon: Clock,
      statusFilter: "Pending",
    },
    {
      label: "In Progress",
      value: inProgress,
      badge: `${stats?.assigned || 0} assigned`,
      badgeTone: "info",
      tone: "kpi-cyan",
      iconBg: "linear-gradient(135deg, #0284c7, #06b6d4)",
      waveColor: "#06b6d4",
      Icon: Wrench,
      statusFilter: "In Progress",
    },
    {
      label: "Resolved",
      value: resolved,
      badge: `${resolutionPct}% rate`,
      badgeTone: "up",
      tone: "kpi-green",
      iconBg: "linear-gradient(135deg, #16a34a, #22c55e)",
      waveColor: "#22c55e",
      Icon: CheckCircle2,
      statusFilter: "Resolved",
    },
  ];

  return (
    <motion.div
      className="bento-stack"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28 }}
    >
      {/* 1. Hero Campus Welcome Carousel */}
      <section
        className="hero-banner"
        onMouseEnter={() => setHeroPaused(true)}
        onMouseLeave={() => setHeroPaused(false)}
        aria-label="Campus welcome banner"
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={hero.id}
            className="hero-slide"
            initial={{ opacity: 0.35 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0.35 }}
            transition={{ duration: 0.35 }}
            style={{ backgroundImage: `url(${hero.image})` }}
          >
            <div className="hero-overlay" />
            <button
              type="button"
              className="hero-arrow hero-arrow-left"
              onClick={() => setHeroIdx((i) => (i - 1 + HERO_SLIDES.length) % HERO_SLIDES.length)}
              aria-label="Previous slide"
            >
              <ChevronLeft size={18} />
            </button>

            <div className="hero-content">
              <div className="hero-greeting">
                Welcome back, {firstName}!
              </div>
              <h1 className="hero-title">
                {hero.kicker} <span className="hero-cyan">{hero.highlight}</span>
              </h1>
              <p className="hero-subtitle">{hero.subtitle}</p>
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                type="button"
                className="hero-cta-btn"
                onClick={() => onNavigate("report")}
              >
                <span>{hero.cta}</span>
                <ArrowRight size={15} />
              </motion.button>
            </div>

            <div className="hero-script-badge" aria-hidden="true">
              Dream Big
              <br />
              Study Smart
            </div>

            <button
              type="button"
              className="hero-arrow hero-arrow-right"
              onClick={() => setHeroIdx((i) => (i + 1) % HERO_SLIDES.length)}
              aria-label="Next slide"
            >
              <ChevronRight size={18} />
            </button>

            <div className="hero-dots">
              {HERO_SLIDES.map((s, idx) => (
                <button
                  key={s.id}
                  type="button"
                  className={`hero-dot ${idx === heroIdx ? "active" : ""}`}
                  onClick={() => setHeroIdx(idx)}
                  aria-label={`Slide ${idx + 1}`}
                />
              ))}
            </div>
          </motion.div>
        </AnimatePresence>
      </section>

      {/* 2. Four Pastel Wave-Sparkline KPI Cards */}
      <section className="kpi-grid-4" aria-label="Complaint KPI summary">
        {kpiCards.map((card, i) => {
          const Icon = card.Icon;
          return (
            <motion.button
              key={card.label}
              type="button"
              className={`kpi-card ${card.tone}`}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28, delay: i * 0.06 }}
              whileHover={{ y: -3 }}
              onClick={() => {
                onFilterStatus(card.statusFilter);
                onNavigate("complaints");
              }}
            >
              <div className="kpi-icon-tile" style={{ background: card.iconBg }}>
                <Icon size={20} color="#ffffff" />
              </div>
              <div className="kpi-body">
                <div className="kpi-value">
                  <AnimatedCounter value={card.value} />
                </div>
                <div className="kpi-label">{card.label}</div>
              </div>
              <span className={`kpi-delta kpi-delta-${card.badgeTone}`}>
                <TrendingUp size={11} /> {card.badge}
              </span>
              <svg
                className="kpi-wave"
                viewBox="0 0 180 42"
                fill="none"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <path
                  d="M0 36 C 28 32, 36 18, 60 24 C 86 30, 96 10, 122 18 C 146 25, 160 8, 180 4 L 180 42 L 0 42 Z"
                  fill={card.waveColor}
                  fillOpacity="0.14"
                />
                <path
                  d="M0 36 C 28 32, 36 18, 60 24 C 86 30, 96 10, 122 18 C 146 25, 160 8, 180 4"
                  stroke={card.waveColor}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeOpacity="0.55"
                />
              </svg>
            </motion.button>
          );
        })}
      </section>

      {/* 3. Middle 3-Column Bento Row: Announcements | Complaint Analytics | Priority Distribution */}
      <section className="bento-row-3">
        {/* Campus Announcements Carousel Card */}
        <motion.div
          className="bento-card"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          onMouseEnter={() => setAnnPaused(true)}
          onMouseLeave={() => setAnnPaused(false)}
        >
          <div className="bento-card-head">
            <h2 className="bento-card-title">
              <Megaphone size={16} color="#dc2626" /> Campus Announcements
            </h2>
            <button type="button" className="bento-link" onClick={() => onNavigate("complaints")}>
              View All <ArrowRight size={13} />
            </button>
          </div>

          <div className="ann-stage">
            <AnimatePresence mode="wait">
              <motion.div
                key={announcement.id}
                className="ann-photo-card"
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ duration: 0.28 }}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                onDragEnd={(_e, info) => {
                  if (info.offset.x < -40) setAnnIdx((i) => (i + 1) % ANNOUNCEMENTS.length);
                  if (info.offset.x > 40)
                    setAnnIdx((i) => (i - 1 + ANNOUNCEMENTS.length) % ANNOUNCEMENTS.length);
                }}
                style={{ backgroundImage: `url(${announcement.image})` }}
              >
                <div className="ann-photo-overlay" />
                <span className="ann-pill" style={{ background: announcement.badgeColor }}>
                  {announcement.badge}
                </span>

                <button
                  type="button"
                  className="ann-arrow ann-arrow-left"
                  onClick={() =>
                    setAnnIdx((i) => (i - 1 + ANNOUNCEMENTS.length) % ANNOUNCEMENTS.length)
                  }
                  aria-label="Previous announcement"
                >
                  <ChevronLeft size={15} />
                </button>
                <button
                  type="button"
                  className="ann-arrow ann-arrow-right"
                  onClick={() => setAnnIdx((i) => (i + 1) % ANNOUNCEMENTS.length)}
                  aria-label="Next announcement"
                >
                  <ChevronRight size={15} />
                </button>

                <div className="ann-caption">
                  <div className="ann-title">{announcement.title}</div>
                  <div className="ann-meta">
                    <Calendar size={12} /> {announcement.meta}
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="ann-dots">
            {ANNOUNCEMENTS.map((a, idx) => (
              <button
                key={a.id}
                type="button"
                className={`ann-dot ${idx === annIdx ? "active" : ""}`}
                onClick={() => setAnnIdx(idx)}
                aria-label={`Announcement ${idx + 1}`}
              />
            ))}
          </div>
        </motion.div>

        {/* Complaint Analytics Donut Card */}
        <motion.div
          className="bento-card"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <div className="bento-card-head">
            <h2 className="bento-card-title">
              <BarChart3 size={16} color="#2563eb" /> Complaint Analytics
            </h2>
          </div>

          <div className="donut-wrap">
            <div className="donut-chart-box">
              <ResponsiveContainer width="100%" height={168}>
                <PieChart>
                  <Pie
                    data={donutData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={48}
                    outerRadius={72}
                    paddingAngle={3}
                    stroke="none"
                  >
                    {donutData.map((d) => (
                      <Cell key={d.name} fill={d.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="donut-center">
                <div className="donut-total">{total}</div>
                <div className="donut-sub">Total</div>
              </div>
            </div>

            <div className="donut-legend">
              {donutData.map((d) => (
                <div className="donut-legend-row" key={d.name}>
                  <span className="donut-legend-name">
                    <span className="donut-dot" style={{ background: d.color }} />
                    {d.name}
                  </span>
                  <strong className="donut-legend-pct">{d.pct}%</strong>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Priority Distribution Bar Chart Card */}
        <motion.div
          className="bento-card"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <div className="bento-card-head">
            <h2 className="bento-card-title">
              <Star size={16} color="#f59e0b" fill="#f59e0b" /> Priority Distribution
            </h2>
          </div>

          <div style={{ width: "100%", height: 186 }}>
            <ResponsiveContainer>
              <BarChart
                data={priorityChartData}
                margin={{ top: 22, right: 6, left: 6, bottom: 0 }}
              >
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "var(--ink-secondary)", fontSize: 12, fontWeight: 600 }}
                />
                <Tooltip
                  cursor={{ fill: "rgba(37, 99, 235, 0.06)" }}
                  contentStyle={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: 10,
                  }}
                />
                <Bar dataKey="count" radius={[8, 8, 2, 2]} barSize={34}>
                  {priorityChartData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                  <LabelList
                    dataKey="count"
                    position="top"
                    fill="var(--ink)"
                    fontSize={12}
                    fontWeight={700}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </section>

      {/* 4. Bottom 3-Column Bento Row: Recent Complaints | Upcoming Events | Quick Actions */}
      <section className="bento-row-3">
        {/* Recent Complaints */}
        <motion.div
          className="bento-card"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <div className="bento-card-head">
            <h2 className="bento-card-title">
              <ClipboardList size={16} color="#2563eb" /> Recent Complaints
            </h2>
            <button type="button" className="bento-link" onClick={() => onNavigate("complaints")}>
              View All <ArrowRight size={13} />
            </button>
          </div>

          {recentComplaints.length === 0 ? (
            <div style={{ padding: "22px 0", color: "var(--ink-muted)", fontSize: 13 }}>
              No complaints submitted yet. Click <strong>Submit Complaint</strong> to create your first ticket!
            </div>
          ) : (
            <div className="recent-list">
              {recentComplaints.slice(0, 3).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="recent-row"
                  onClick={() => onSelectComplaint(item.id)}
                >
                  <CategoryThumb category={item.category} imageUrl={item.image_url} />
                  <div className="recent-info">
                    <div className="recent-title">{item.title}</div>
                    <div className="recent-meta">
                      <span>#{item.tracking_id || item.id}</span>
                      <span>•</span>
                      <span>{formatDateTime(item.created_at)}</span>
                    </div>
                  </div>
                  <span className={`badge status-${getStatusSlug(item.status)}`}>
                    {item.status}
                  </span>
                  <ChevronRight size={15} color="var(--ink-muted)" />
                </button>
              ))}
            </div>
          )}
        </motion.div>

        {/* Upcoming Events */}
        <motion.div
          className="bento-card"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <div className="bento-card-head">
            <h2 className="bento-card-title">
              <Calendar size={16} color="#2563eb" /> Upcoming Events
            </h2>
            <button type="button" className="bento-link" onClick={() => onNavigate("analytics")}>
              View All <ArrowRight size={13} />
            </button>
          </div>

          <div className="events-list">
            {UPCOMING_EVENTS.map((ev) => (
              <div className="event-row" key={ev.title}>
                <div className="event-date-box">
                  <span className="event-month">{ev.month}</span>
                  <span className="event-day">{ev.day}</span>
                </div>
                <div className="event-divider">
                  <span className="event-dot" style={{ background: ev.color }} />
                </div>
                <div className="event-body">
                  <div className="event-title">{ev.title}</div>
                  <div className="event-meta">
                    <MapPin size={11} /> {ev.meta}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Quick Actions 2x2 Vibrant Tiles */}
        <motion.div
          className="bento-card"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <div className="bento-card-head">
            <h2 className="bento-card-title">
              <Zap size={16} color="#f59e0b" fill="#f59e0b" /> Quick Actions
            </h2>
          </div>

          <div className="quick-grid">
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              type="button"
              className="quick-tile quick-blue"
              onClick={() => onNavigate("report")}
            >
              <PenSquare size={20} />
              <span>Submit Complaint</span>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              type="button"
              className="quick-tile quick-purple"
              onClick={() => onNavigate("track")}
            >
              <Compass size={20} />
              <span>Track Status</span>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              type="button"
              className="quick-tile quick-green"
              onClick={() => onNavigate("analytics")}
            >
              <BarChart3 size={20} />
              <span>View Analytics</span>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              type="button"
              className="quick-tile quick-amber"
              onClick={onSupportClick}
            >
              <Headphones size={20} />
              <span>Contact Support</span>
            </motion.button>
          </div>
        </motion.div>
      </section>
    </motion.div>
  );
}
