"use client";

import { motion, useReducedMotion } from "framer-motion";

/**
 * Gentle scroll reveal. Content is never hidden for users who prefer reduced
 * motion, and the effect is intentionally short to protect perceived speed.
 */
export default function Reveal({
  children,
  className = "",
  delay = 0,
  y = 18,
  once = true,
}) {
  const reduce = useReducedMotion();

  if (reduce) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, margin: "-70px" }}
      transition={{ duration: 0.65, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}
