// ─── Picture-in-Picture Widget ────────────────────────────────────────────────
//
// iOS Safari  → webkitSetPresentationMode on the ACTUAL bg <video> in FSPreview
//               → shows the real background video in PiP (with clock overlay impossible,
//                 but the video plays — best iOS can do without captureStream)
//
// Android / Desktop Chrome → canvas.captureStream() clock overlay → requestPictureInPicture()

import { useEffect, useRef, useCallback } from "react";
import { useStore } from "../store/useStore";

const PIP_W = 480;
const PIP_H = 270;
const FRAME_MS = 1000 / 30;

// ─── Runtime capability detection ────────────────────────────────────────────
function getCaps() {
  try {
    const isIOS =
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const webkitPiP = isIOS &&
      typeof HTMLVideoElement !== "undefined" &&
      typeof HTMLVideoElement.prototype.webkitSetPresentationMode === "function";
    const standardPiP = !isIOS && !!document.pictureInPictureEnabled;
    return { isIOS, webkitPiP, standardPiP, any: webkitPiP || standardPiP };
  } catch {
    return { isIOS: false, webkitPiP: false, standardPiP: false, any: false };
  }
}

// ─── Canvas helpers (standard PiP only) ──────────────────────────────────────
function fmtTime(secs) {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`;
  return `${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
}

function drawBg(ctx, w, h) {
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, "#0d1a0d");
  grad.addColorStop(1, "#080d08");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
  const vignette = ctx.createRadialGradient(w/2, h/2, h*0.1, w/2, h/2, h*0.85);
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(1, "rgba(0,0,0,0.55)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, w, h);
}

function drawFlipCard(ctx, x, y, size, text, ampm) {
  const w = size, h = size;
  const r = size * 0.08;
  const fs = size * 0.52;
  const glass = "rgba(30,30,30,0.55)";
  const border = "rgba(255,255,255,0.08)";

  // Helper: rounded rect path
  const rr = (cx, cy, cw, ch, tl, tr, bl, br) => {
    ctx.beginPath();
    ctx.moveTo(cx + tl, cy);
    ctx.lineTo(cx + cw - tr, cy);
    ctx.quadraticCurveTo(cx + cw, cy, cx + cw, cy + tr);
    ctx.lineTo(cx + cw, cy + ch - br);
    ctx.quadraticCurveTo(cx + cw, cy + ch, cx + cw - br, cy + ch);
    ctx.lineTo(cx + bl, cy + ch);
    ctx.quadraticCurveTo(cx, cy + ch, cx, cy + ch - bl);
    ctx.lineTo(cx, cy + tl);
    ctx.quadraticCurveTo(cx, cy, cx + tl, cy);
    ctx.closePath();
  };

  // Top half panel
  rr(x, y, w, h / 2, r, r, 0, 0);
  ctx.fillStyle = glass;
  ctx.fill();
  ctx.strokeStyle = border;
  ctx.lineWidth = 1;
  ctx.stroke();

  // Bottom half panel
  rr(x, y + h / 2, w, h / 2, 0, 0, r, r);
  ctx.fillStyle = glass;
  ctx.fill();
  ctx.strokeStyle = border;
  ctx.stroke();

  // Center seam
  ctx.fillStyle = "#000";
  ctx.fillRect(x, y + h / 2 - 1.5, w, 3);

  // Screws
  const screwR = size * 0.03;
  const screwY = y + h / 2;
  [x + w * 0.07, x + w * 0.93].forEach(sx => {
    ctx.beginPath();
    ctx.arc(sx, screwY, screwR, 0, Math.PI * 2);
    ctx.fillStyle = "#2e2e2e";
    ctx.fill();
    ctx.strokeStyle = "#444";
    ctx.lineWidth = 1.5;
    ctx.stroke();
  });

  // Number — clipped to full card
  ctx.save();
  rr(x, y, w, h, r, r, r, r);
  ctx.clip();
  ctx.fillStyle = "#fff";
  ctx.font = `800 ${fs}px 'Outfit','DM Sans',Arial,sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = "rgba(0,0,0,0.8)";
  ctx.shadowBlur = 12;
  ctx.fillText(text, x + w / 2, y + h / 2);
  ctx.shadowBlur = 0;
  ctx.restore();

  // AM/PM inside bottom-left of card (hour card only)
  if (ampm) {
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.font = `500 ${size * 0.12}px 'Outfit','DM Sans',Arial,sans-serif`;
    ctx.textAlign = "left";
    ctx.textBaseline = "bottom";
    ctx.fillText(ampm, x + size * 0.09, y + h - size * 0.07);
  }
}

function drawClock(ctx, w, h) {
  const { mode, time } = useStore.getState();
  let left, right, ampm;
  if (mode === "clock") {
    const t = new Date().toLocaleTimeString([], { hour:"2-digit", minute:"2-digit", hour12:true });
    const parts = t.split(" ");
    const [hh, mm] = (parts[0] || "12:00").split(":");
    left  = (hh || "12").padStart(2, "0");
    right = (mm || "00").padStart(2, "0");
    ampm  = parts[1] || "AM";
  } else {
    const fmt = fmtTime(time).split(":");
    left  = fmt[0];
    right = fmt[1];
    ampm  = null;
  }

  // Square cards: size = min of available height or half width with gap
  const gap     = w * 0.06;
  const maxByH  = h * 0.72;
  const maxByW  = (w - gap - w * 0.1) / 2;   // 5% padding each side
  const size    = Math.min(maxByH, maxByW);
  const totalW  = size * 2 + gap;
  const startX  = (w - totalW) / 2;
  const startY  = (h - size) / 2;

  drawFlipCard(ctx, startX,          startY, size, left,  ampm);
  drawFlipCard(ctx, startX + size + gap, startY, size, right, null);

  // Sub label for timer mode
  if (!ampm) {
    const sub = mode === "short" ? "SHORT BREAK" : "TIMER";
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.font = `300 ${h * 0.08}px 'DM Sans',Arial,sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(sub, w / 2, startY + size + h * 0.04);
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
// bgVideoRef: pass FSPreview's <video> ref to enterPiP for iOS
export function usePiPWidget({ clockStyle = 0, onEnter, onLeave } = {}) {
  const canvasRef    = useRef(null);
  const pipVideoRef  = useRef(null);
  const streamRef    = useRef(null);
  const rafRef       = useRef(null);
  const lastFrameRef = useRef(0);
  const styleRef     = useRef(clockStyle);
  const activeRef    = useRef(false);
  const readyRef     = useRef(false);
  const primingRef   = useRef(false);

  const onEnterRef = useRef(onEnter);
  const onLeaveRef = useRef(onLeave);
  useEffect(() => { onEnterRef.current = onEnter; }, [onEnter]);
  useEffect(() => { onLeaveRef.current = onLeave; }, [onLeave]);
  useEffect(() => { styleRef.current = clockStyle; }, [clockStyle]);

  const getCanvas = useCallback(() => {
    if (!canvasRef.current) {
      const c = document.createElement("canvas");
      c.width = PIP_W; c.height = PIP_H;
      canvasRef.current = c;
    }
    return canvasRef.current;
  }, []);

  const drawFrame = useCallback((now = 0) => {
    const canvas = getCanvas();
    if (now && now - lastFrameRef.current < FRAME_MS) return;
    lastFrameRef.current = now;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, PIP_W, PIP_H);
    drawBg(ctx, PIP_W, PIP_H);
    drawClock(ctx, PIP_W, PIP_H);
    if (streamRef.current) {
      const track = streamRef.current.getVideoTracks()[0];
      if (track?.requestFrame) track.requestFrame();
    }
  }, [getCanvas]);

  const startLoop = useCallback(() => {
    const loop = (now) => {
      if (!activeRef.current) return;
      drawFrame(now);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
  }, [drawFrame]);

  const stopLoop = useCallback(() => {
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
  }, []);

  // ── prime() — standard PiP only, call on FSPreview mount ─────────────────
  const prime = useCallback(async () => {
    const { webkitPiP, standardPiP } = getCaps();
    if (webkitPiP) return; // iOS uses direct video PiP — no priming needed
    if (!standardPiP || readyRef.current || primingRef.current) return;
    primingRef.current = true;

    const canvas = getCanvas();
    if (!pipVideoRef.current) {
      const v = document.createElement("video");
      v.muted = true; v.loop = true; v.autoplay = true;
      v.setAttribute("playsinline", "");
      v.disableRemotePlayback = true;
      v.style.cssText =
        "position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;opacity:0.01;z-index:-1;";
      document.body.appendChild(v);
      pipVideoRef.current = v;
    }

    drawFrame();
    try {
      if (!streamRef.current) streamRef.current = canvas.captureStream(0);
      const pv = pipVideoRef.current;
      if (pv.srcObject !== streamRef.current) pv.srcObject = streamRef.current;
      if (pv.paused) await pv.play();
      readyRef.current = true;
    } catch (e) {
      if (e?.name !== "AbortError") console.warn("[PiP] prime failed:", e);
      setTimeout(async () => {
        try {
          if (!readyRef.current && pipVideoRef.current) {
            await pipVideoRef.current.play();
            readyRef.current = true;
          }
        } catch {}
      }, 150);
    } finally {
      primingRef.current = false;
    }
  }, [drawFrame, getCanvas]);

  // ── enterPiP — MUST be called synchronously in click handler ─────────────
  // bgVideoRef: FSPreview's actual <video> element ref — used for iOS
  const enterPiP = useCallback((bgVideoRef) => {
    const { webkitPiP, standardPiP } = getCaps();

    // ── iOS: use the actual playing background video directly ─────────────────
    if (webkitPiP) {
      // Find a video that actually supports PiP — check the instance, not the prototype
      const candidates = bgVideoRef?.current
        ? [bgVideoRef.current, ...document.querySelectorAll("video")]
        : [...document.querySelectorAll("video")];

      const vid = candidates.find(v =>
        v &&
        typeof v.webkitSetPresentationMode === "function" &&
        v.webkitSupportsPresentationMode &&
        v.webkitSupportsPresentationMode("picture-in-picture") &&
        !v.paused &&
        v.readyState >= 2
      );

      if (!vid) {
        console.warn("[PiP iOS] No video element supports PiP right now");
        return Promise.resolve(false);
      }

      try {
        // iOS requires video NOT be muted at the element level for PiP
        // We set volume=0 instead so it's silent but still eligible
        vid.muted = false;
        vid.volume = 0;

        vid.webkitSetPresentationMode("picture-in-picture");
        onEnterRef.current?.();

        const onModeChange = () => {
          if (vid.webkitPresentationMode !== "picture-in-picture") {
            // Restore muted and playsinline after leaving PiP
            vid.muted = true;
            vid.setAttribute("playsinline", "");
            onLeaveRef.current?.();
            vid.removeEventListener("webkitpresentationmodechanged", onModeChange);
          }
        };
        vid.addEventListener("webkitpresentationmodechanged", onModeChange);
        return Promise.resolve(true);
      } catch (e) {
        console.warn("[PiP iOS] webkitSetPresentationMode failed:", e);
        return Promise.resolve(false);
      }
    }

    // ── Standard PiP: Android Chrome / Desktop ────────────────────────────────
    if (!standardPiP) return Promise.resolve(false);

    const canvas = getCanvas();
    if (!pipVideoRef.current) {
      const v = document.createElement("video");
      v.muted = true; v.loop = true; v.autoplay = true;
      v.setAttribute("playsinline", "");
      v.disableRemotePlayback = true;
      v.style.cssText =
        "position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;opacity:0.01;z-index:-1;";
      document.body.appendChild(v);
      pipVideoRef.current = v;
    }
    if (!streamRef.current) streamRef.current = canvas.captureStream(0);
    const pv = pipVideoRef.current;
    if (pv.srcObject !== streamRef.current) pv.srcObject = streamRef.current;
    drawFrame();

    const doEnter = () =>
      pv.requestPictureInPicture()
        .then(() => {
          activeRef.current = true;
          startLoop();
          onEnterRef.current?.();
          pv.addEventListener("leavepictureinpicture", () => {
            activeRef.current = false;
            stopLoop();
            onLeaveRef.current?.();
          }, { once: true });
          return true;
        })
        .catch(e => { console.warn("[PiP] requestPictureInPicture failed:", e); return false; });

    if (!pv.paused) return doEnter();
    return pv.play().then(() => { readyRef.current = true; return doEnter(); })
      .catch(e => { console.warn("[PiP] play failed:", e); return false; });

  }, [getCanvas, drawFrame, startLoop, stopLoop]);

  // ── exitPiP ───────────────────────────────────────────────────────────────
  const exitPiP = useCallback(async () => {
    const { webkitPiP } = getCaps();
    activeRef.current = false;
    stopLoop();
    if (webkitPiP) {
      document.querySelectorAll("video").forEach(v => {
        try {
          if (v.webkitPresentationMode === "picture-in-picture")
            v.webkitSetPresentationMode("inline");
        } catch {}
      });
      return;
    }
    if (document.pictureInPictureElement) {
      try { await document.exitPictureInPicture(); } catch {}
    }
  }, [stopLoop]);

  // ── Cleanup ───────────────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      exitPiP();
      readyRef.current = false;
      primingRef.current = false;
      streamRef.current = null;
      if (pipVideoRef.current) { pipVideoRef.current.remove(); pipVideoRef.current = null; }
    };
  }, []);

  return { prime, enterPiP, exitPiP };
}