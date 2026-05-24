// ─── Picture-in-Picture Widget ────────────────────────────────────────────────
// Auto-shows a floating clock/timer widget when user exits fullscreen preview.
// Only activates on phone & tablet (not desktop).

import { useEffect, useRef, useCallback } from "react";
import { useStore } from "../store/useStore";

const PIP_W = 480;
const PIP_H = 270;

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function fmtTime(secs) {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`;
  return `${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
}

function drawNormal(ctx, text, sub, w, h) {
  ctx.fillStyle = "rgba(8,13,8,0.95)";
  roundRect(ctx, 0, 0, w, h, 0);
  ctx.fill();

  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, "rgba(255,255,255,0.04)");
  grad.addColorStop(1, "rgba(0,0,0,0.1)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = "#ffffff";
  ctx.font = `bold ${h * 0.48}px 'DM Sans', Arial, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, w * 0.5, h * 0.45);

  if (sub) {
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.font = `300 ${h * 0.12}px 'DM Sans', Arial, sans-serif`;
    ctx.fillText(sub, w * 0.5, h * 0.78);
  }
}

function drawFlip(ctx, text, sub, w, h) {
  ctx.fillStyle = "rgba(8,13,8,0.95)";
  ctx.fillRect(0, 0, w, h);

  const parts = text.split(":");
  const left  = parts[0] || "00";
  const right = parts[1] || "00";
  const cw = w * 0.38, ch = h * 0.72;
  const cx1 = w * 0.5 - cw - w * 0.03;
  const cx2 = w * 0.5 + w * 0.03;
  const cy  = (h - ch) / 2;
  const r = 14;

  [{ x: cx1, val: left }, { x: cx2, val: right }].forEach(({ x, val }) => {
    ctx.fillStyle = "rgba(30,30,30,0.9)";
    roundRect(ctx, x, cy, cw, ch, r); ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.08)"; ctx.lineWidth = 1;
    roundRect(ctx, x, cy, cw, ch, r); ctx.stroke();
    ctx.fillStyle = "rgba(0,0,0,0.8)";
    ctx.fillRect(x, cy + ch/2 - 1.5, cw, 3);
    ctx.fillStyle = "#ffffff";
    ctx.font = `bold ${ch * 0.55}px 'DM Sans', Arial, sans-serif`;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(val, x + cw/2, cy + ch/2);
    ctx.fillStyle = "rgba(255,255,255,0.15)";
    ctx.beginPath(); ctx.arc(x + 12, cy + ch/2, 3, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + cw - 12, cy + ch/2, 3, 0, Math.PI*2); ctx.fill();
  });

  if (sub) {
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.font = `300 ${h * 0.1}px 'DM Sans', Arial, sans-serif`;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(sub, w * 0.5, cy + ch + (h - cy - ch) * 0.55);
  }
}

export function usePiPWidget({ clockStyle = 0 } = {}) {
  const canvasRef   = useRef(null);
  const videoRef    = useRef(null);
  const rafRef      = useRef(null);
  const styleRef    = useRef(clockStyle);
  const activeRef   = useRef(false);
  const touchStartX = useRef(null);

  // Keep styleRef in sync with prop
  useEffect(() => { styleRef.current = clockStyle; }, [clockStyle]);

  const drawFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const w = PIP_W, h = PIP_H;
    ctx.clearRect(0, 0, w, h);

    const { mode, time } = useStore.getState();
    let text, sub;

    if (mode === "clock") {
      const t = new Date().toLocaleTimeString([], { hour:"2-digit", minute:"2-digit", hour12:true });
      const parts = t.split(" ");
      text = parts[0] || "12:00";
      sub  = parts[1] || "AM";
    } else {
      text = fmtTime(time);
      sub  = mode === "short" ? "SHORT TIMER" : "TIMER";
    }

    if (styleRef.current === 1) drawFlip(ctx, text, sub, w, h);
    else drawNormal(ctx, text, sub, w, h);
  }, []);

  const startLoop = useCallback(() => {
    const loop = () => {
      if (!activeRef.current) return;
      drawFrame();
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
  }, [drawFrame]);

  const stopLoop = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
  }, []);

  const enterPiP = useCallback(async () => {
    if (!("pictureInPictureEnabled" in document)) return; // not supported

    // Create canvas
    if (!canvasRef.current) {
      const canvas = document.createElement("canvas");
      canvas.width = PIP_W; canvas.height = PIP_H;
      canvasRef.current = canvas;
    }

    // Create hidden video element
    if (!videoRef.current) {
      const video = document.createElement("video");
      video.muted = true; video.loop = true; video.autoplay = true;
      video.setAttribute("playsinline", "");
      video.style.cssText = "position:fixed;top:-2px;left:-2px;width:1px;height:1px;opacity:0;pointer-events:none;z-index:-1;";
      document.body.appendChild(video);
      videoRef.current = video;
    }

    const video = videoRef.current;

    // Stream canvas → video
    try {
      video.srcObject = canvasRef.current.captureStream(30);
      await video.play();
    } catch { return; }

    // Swipe to change style inside PiP
    video.ontouchstart = (e) => { touchStartX.current = e.touches[0].clientX; };
    video.ontouchend   = (e) => {
      if (touchStartX.current === null) return;
      const dx = touchStartX.current - e.changedTouches[0].clientX;
      if (Math.abs(dx) > 40) styleRef.current = styleRef.current === 0 ? 1 : 0;
      touchStartX.current = null;
    };

    try {
      await video.requestPictureInPicture();
      activeRef.current = true;
      startLoop();
      video.addEventListener("leavepictureinpicture", () => {
        activeRef.current = false;
        stopLoop();
      }, { once: true });
    } catch {}
  }, [startLoop, stopLoop]);

  const exitPiP = useCallback(async () => {
    activeRef.current = false;
    stopLoop();
    if (document.pictureInPictureElement) {
      try { await document.exitPictureInPicture(); } catch {}
    }
  }, [stopLoop]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      exitPiP();
      if (videoRef.current) { videoRef.current.remove(); videoRef.current = null; }
    };
  }, []);

  return { enterPiP, exitPiP };
}