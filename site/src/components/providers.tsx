"use client";

import { MotionConfig } from "motion/react";

/** "user": segue o "reduzir movimento" do sistema; deslocamentos somem e ficam só os fundidos. */
export function Providers({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
