import React, { useEffect } from "react";
import { motion } from "framer-motion";
import { Building2, GraduationCap, ShieldCheck, Sparkles, Wrench } from "lucide-react";

export default function IntroSplash3D({ onComplete }) {
  useEffect(() => {
    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    const duration = prefersReduced ? 450 : 2500;
    const timer = window.setTimeout(() => {
      onComplete?.();
    }, duration);
    return () => window.clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div
      className="splash3d-backdrop"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.08, filter: "blur(6px)" }}
      transition={{ duration: 0.55, ease: "easeInOut" }}
      aria-label="CampusFix 3D Intro Animation"
    >
      {/* Perspective 3D glowing floor grid */}
      <div className="splash3d-grid-plane" aria-hidden="true" />
      <div className="splash3d-glow splash3d-glow-cyan" aria-hidden="true" />
      <div className="splash3d-glow splash3d-glow-purple" aria-hidden="true" />

      <button type="button" className="splash3d-skip" onClick={onComplete}>
        Skip Intro →
      </button>

      <div className="splash3d-stage">
        {/* Orbiting 3D rings */}
        <div className="splash3d-ring ring-outer" aria-hidden="true" />
        <div className="splash3d-ring ring-inner" aria-hidden="true" />

        {/* True CSS 3D Rotating Glass Cube */}
        <motion.div
          className="cube3d-scene"
          initial={{ scale: 0.35, opacity: 0, y: 30 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="cube3d">
            <div className="cube3d-face face-front">
              <GraduationCap size={42} color="#fbbf24" />
            </div>
            <div className="cube3d-face face-back">
              <Building2 size={38} color="#22d3ee" />
            </div>
            <div className="cube3d-face face-right">
              <Wrench size={36} color="#38bdf8" />
            </div>
            <div className="cube3d-face face-left">
              <ShieldCheck size={38} color="#4ade80" />
            </div>
            <div className="cube3d-face face-top">
              <Sparkles size={34} color="#c084fc" />
            </div>
            <div className="cube3d-face face-bottom" />
          </div>
        </motion.div>

        {/* Brand Reveal */}
        <motion.div
          className="splash3d-brand"
          initial={{ opacity: 0, y: 18, scale: 0.94 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.45, duration: 0.55 }}
        >
          <h1 className="splash3d-title">
            Campus<span>Fix</span>
          </h1>
          <p className="splash3d-sub">REPORT • TRACK • RESOLVE</p>
          <div className="splash3d-progress">
            <motion.div
              className="splash3d-progress-fill"
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{ duration: 2.1, ease: "easeInOut" }}
            />
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
