"use client";

import { useEffect, useRef } from "react";
import { useMotionValue, useSpring } from "framer-motion";

type NumberTickerProps = {
  value: number;
  direction?: "up" | "down";
  delay?: number;
  decimalPlaces?: number;
  startValue?: number;
  className?: string;
};

export function NumberTicker({
  value,
  direction = "up",
  delay = 0,
  decimalPlaces = 0,
  startValue = 0,
  className,
}: NumberTickerProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const motionValue = useMotionValue(startValue);
  const springValue = useSpring(motionValue, { damping: 50, stiffness: 150 });

  useEffect(() => {
    const target = direction === "down" ? Math.min(value, startValue) : value;
    const timer = setTimeout(() => motionValue.set(target), delay * 1000);
    return () => clearTimeout(timer);
  }, [motionValue, value, direction, startValue, delay]);

  useEffect(() => {
    const format = (n: number) =>
      Intl.NumberFormat("es-PE", {
        minimumFractionDigits: decimalPlaces,
        maximumFractionDigits: decimalPlaces,
      }).format(n);
    if (ref.current) ref.current.textContent = format(startValue);
    const unsub = springValue.on("change", (latest) => {
      if (ref.current) ref.current.textContent = format(Number(latest.toFixed(decimalPlaces)));
    });
    return () => unsub();
  }, [springValue, decimalPlaces, startValue]);

  return <span ref={ref} className={className} />;
}
