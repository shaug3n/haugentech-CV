"use client";
import { motion, useReducedMotion } from "framer-motion";

export function FadeIn({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  // `initial` is intentionally the same object on every render path (server,
  // first client render, and every render after). Framer Motion only reads
  // `initial` to compute the styles baked into the server-rendered markup
  // and the very first client render (see `makeLatestValues` in
  // framer-motion/motion/utils/use-visual-state), so keeping it constant
  // guarantees the server HTML and the first client render agree, even
  // though `useReducedMotion()` itself resolves differently between the two
  // (it reads `window.matchMedia` synchronously and can return `true` on
  // the very first client render for reduced-motion users, while the server
  // always sees `null`). `animate` / `whileInView` / `viewport` /
  // `transition` are post-mount-only behavioral props that never affect the
  // rendered `style` attribute, so branching on `reduce` there is safe and
  // never produces a hydration mismatch.
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 24 }}
      animate={reduce ? { opacity: 1, y: 0 } : undefined}
      whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
      viewport={reduce ? undefined : { once: true, margin: "-40px" }}
      transition={
        reduce ? { duration: 0 } : { duration: 0.5, delay, ease: "easeOut" }
      }
    >
      {children}
    </motion.div>
  );
}
