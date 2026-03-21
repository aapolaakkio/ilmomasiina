"use client";

import { useEffect, useState } from "react";

/** Counts down from `initialMs` to 0. Returns the remaining time in milliseconds. */
export function useCountdown(initialMs: number) {
  const [timeLeft, setTimeLeft] = useState(initialMs);

  useEffect(() => {
    if (initialMs <= 0) return undefined;
    const start = Date.now();
    const timer = setInterval(() => {
      setTimeLeft(Math.max(0, initialMs - (Date.now() - start)));
    }, 100);
    return () => clearInterval(timer);
  }, [initialMs]);

  return timeLeft;
}
