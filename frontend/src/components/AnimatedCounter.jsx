import React, { useEffect, useState } from "react";

export default function AnimatedCounter({ value = 0, suffix = "", duration = 650 }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const target = Number(value) || 0;
    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    if (prefersReduced || duration <= 0) {
      setDisplay(target);
      return;
    }

    let rafId;
    const start = performance.now();
    const initial = display;

    const tick = (now) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(initial + (target - initial) * eased));
      if (progress < 1) {
        rafId = requestAnimationFrame(tick);
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [value]);

  return (
    <span>
      {display}
      {suffix}
    </span>
  );
}
