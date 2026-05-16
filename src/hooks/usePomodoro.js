import { useEffect } from "react";
import { useStore } from "../store/useStore";

export default function usePomodoro() {
  const running = useStore((s) => s.running);
  const tick = useStore((s) => s.tick);

  useEffect(() => {
    if (!running) return;

    const interval = setInterval(() => {
      tick();
    }, 1000);

    return () => clearInterval(interval);
  }, [running]);
}