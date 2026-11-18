import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  BellRing,
  Calendar,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  Megaphone,
  ShieldAlert,
  Sparkles,
} from "lucide-react";

const SLIDES = [
  {
    id: "announcement",
    tag: "Campus Announcement",
    title: "Smart Energy Upgrade Across Academic Blocks A & B",
    description:
      "LED lighting and smart HVAC sensors are being installed this week. Expect brief 15-minute circuit checks between 4:00 PM and 5:00 PM.",
    meta: "Facilities Office • Nov 18–22",
    gradient: "linear-gradient(135deg, #172554 0%, #1e3a8a 52%, #0891b2 100%)",
    accent: "#06b6d4",
    Icon: Megaphone,
  },
  {
    id: "event",
    tag: "Upcoming Event",
    title: "Annual Campus Innovation & Sustainability Hackathon",
    description:
      "Join 240+ students at the Central Auditorium to build civic and green-campus prototypes. Free lab access, mentors, and prizes.",
    meta: "Student Council • Saturday 9:00 AM",
    gradient: "linear-gradient(135deg, #312e81 0%, #6d28d9 55%, #06b6d4 100%)",
    accent: "#f59e0b",
    Icon: Calendar,
  },
  {
    id: "news",
    tag: "Campus News",
    title: "High-Speed Wi-Fi 6E Rollout Complete in Central Library",
    description:
      "All three library floors now run upgraded gigabit access points. Report any remaining dead zones via IT / Network complaints.",
    meta: "Campus IT Services • Updated Today",
    gradient: "linear-gradient(135deg, #0f172a 0%, #1d4ed8 55%, #0ea5e9 100%)",
    accent: "#38bdf8",
    Icon: Sparkles,
  },
  {
    id: "notice",
    tag: "Important Notice",
    title: "Extended Maintenance Helpdesk Hours During Exam Week",
    description:
      "Priority electrical, water, and classroom projector tickets are monitored from 7:00 AM to 10:00 PM with rapid on-site dispatch.",
    meta: "Operations Desk • Active Now",
    gradient: "linear-gradient(135deg, #14532d 0%, #15803d 55%, #0891b2 100%)",
    accent: "#4ade80",
    Icon: GraduationCap,
  },
  {
    id: "safety",
    tag: "Safety Alert",
    title: "Monsoon Walkway Advisory Near North Hostel Courtyard",
    description:
      "Wet-floor barriers are in place while drainage grates are cleared. Flag urgent water leaks as High or Critical for immediate response.",
    meta: "Campus Safety • Priority Notice",
    gradient: "linear-gradient(135deg, #7c2d12 0%, #b45309 55%, #172554 100%)",
    accent: "#fbbf24",
    Icon: ShieldAlert,
  },
];

export default function CampusCarousel({ onReportClick }) {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [paused, setPaused] = useState(false);

  const paginate = (step) => {
    setDirection(step);
    setIndex((prev) => (prev + step + SLIDES.length) % SLIDES.length);
  };

  useEffect(() => {
    if (paused) return;
    const timer = setInterval(() => {
      setDirection(1);
      setIndex((prev) => (prev + 1) % SLIDES.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [paused]);

  const slide = SLIDES[index];
  const SlideIcon = slide.Icon;

  return (
    <section
      className="carousel-shell"
      aria-label="Campus Highlights and Announcements"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="carousel-header-bar">
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <BellRing size={16} color="var(--cyan)" />
          <span className="carousel-eyebrow">Campus Highlights & Notices</span>
        </div>
        <div className="carousel-controls">
          <button
            type="button"
            className="carousel-nav-btn"
            onClick={() => paginate(-1)}
            aria-label="Previous announcement"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            className="carousel-nav-btn"
            onClick={() => paginate(1)}
            aria-label="Next announcement"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="carousel-stage">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={slide.id}
            custom={direction}
            initial={{ opacity: 0, x: direction > 0 ? 48 : -48 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction > 0 ? -48 : 48 }}
            transition={{ duration: 0.32, ease: "easeOut" }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.18}
            onDragEnd={(_e, info) => {
              if (info.offset.x < -50) paginate(1);
              if (info.offset.x > 50) paginate(-1);
            }}
            className="carousel-slide"
            style={{ background: slide.gradient }}
          >
            <div className="carousel-orb carousel-orb-1" />
            <div className="carousel-orb carousel-orb-2" />

            <div className="carousel-slide-body">
              <div className="carousel-tag" style={{ borderColor: `${slide.accent}66`, color: "#ffffff" }}>
                <SlideIcon size={13} color={slide.accent} />
                {slide.tag}
              </div>
              <h3 className="carousel-title">{slide.title}</h3>
              <p className="carousel-desc">{slide.description}</p>
              <div className="carousel-footer">
                <span className="carousel-meta">{slide.meta}</span>
                {onReportClick && (
                  <button
                    type="button"
                    className="carousel-cta"
                    onClick={onReportClick}
                  >
                    Report Related Issue
                  </button>
                )}
              </div>
            </div>

            <div className="carousel-graphic" aria-hidden="true">
              <div className="carousel-icon-ring">
                <SlideIcon size={36} color="#ffffff" />
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="carousel-dots" role="tablist" aria-label="Slide selector">
        {SLIDES.map((s, i) => (
          <button
            key={s.id}
            type="button"
            role="tab"
            aria-selected={i === index}
            aria-label={`Show slide ${i + 1}: ${s.tag}`}
            className={`carousel-dot ${i === index ? "active" : ""}`}
            onClick={() => {
              setDirection(i > index ? 1 : -1);
              setIndex(i);
            }}
          />
        ))}
      </div>
    </section>
  );
}
