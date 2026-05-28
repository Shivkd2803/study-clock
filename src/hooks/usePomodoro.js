import { useEffect, useRef } from "react";
import { useStore } from "../store/useStore";

export default function usePomodoro() {
  const running = useStore((s) => s.running);
  const tick    = useStore((s) => s.tick);
  const rafRef  = useRef(null);
  const lastTickRef = useRef(null); // timestamp of last tick

  useEffect(() => {
    if (!running) {
      lastTickRef.current = null;
      if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
      return;
    }

    lastTickRef.current = performance.now();

    const loop = (now) => {
      const elapsed = now - lastTickRef.current;

      // How many full seconds have passed since last tick?
      const ticks = Math.floor(elapsed / 1000);

      if (ticks >= 1) {
        // Advance lastTick by exactly ticks * 1000ms to preserve remainder
        // This prevents drift accumulation — remainder carries over
        lastTickRef.current += ticks * 1000;

        for (let i = 0; i < ticks; i++) {
          // Check running state still true — tick() auto-stops at 0
          const { running: stillRunning } = useStore.getState();
          if (!stillRunning) return; // timer hit 0, stop the loop
          tick();
        }
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
      lastTickRef.current = null;
    };
  }, [running]);
}