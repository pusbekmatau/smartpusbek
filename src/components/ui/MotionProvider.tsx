"use client";

import { MotionConfig } from "framer-motion";
import { ToastProvider } from "./Toast";

/** Global motion policy: honours the OS "reduce motion" setting everywhere. */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig reducedMotion="user" transition={{ type: "spring", stiffness: 260, damping: 30 }}>
      <ToastProvider>{children}</ToastProvider>
    </MotionConfig>
  );
}
