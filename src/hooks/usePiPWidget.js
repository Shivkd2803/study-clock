// ─── Picture-in-Picture Widget ────────────────────────────────────────────────
// The hook owns everything:
//   - A hidden <canvas> that composites background video + clock overlay
//   - A hidden <video> (pip-stream) whose srcObject = canvas.captureStream()
//     → this is what gets shown in the PiP window
//   - A second hidden <video> (bg-video) that loads the Cloudinary background
//     URL and plays silently — its frames are drawn onto the canvas each RAF tick
//
// This means FSPreview can unmount freely — the PiP widget keeps playing.

import { useEffect, useRef, useCallback } from "react";
import { useStore } from "../store/useStore";

const PIP_W = 480;
const PIP_H = 270;
const TARGET_FPS = 30;
const FRAME_MS   = 1000 / TARGET_FPS;

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
  if (h > 0) return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function drawCover(ctx, source, w, h) {
  // source can be HTMLImageElement or HTMLVideoElement
  const sw = source.videoWidth  || source.naturalWidth  || source.width;
  const sh = source.videoHeight || source.naturalHeight || source.height;
  if (!sw || !sh) return;
  const scale = Math.max(w / sw, h / sh);
  const dw = sw * scale;
  const dh = sh * scale;
  ctx.drawImage(source, (w - dw) / 2, (h - dh) / 2, dw, dh);
}

function drawNormal(ctx, text, sub, w, h) {
  ctx.fillStyle = "#ffffff";
  ctx.font = `bold ${h * 0.48}px 'DM Sans', Arial, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = "rgba(0,0,0,0.9)";
  ctx.shadowBlur = 16;
  ctx.fillText(text, w * 0.5, h * 0.45);
  ctx.shadowBlur = 0;
  if (sub) {
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.font = `300 ${h * 0.12}px 'DM Sans', Arial, sans-serif`;
    ctx.shadowColor = "rgba(0,0,0,0.8)";
    ctx.shadowBlur = 10;
    ctx.fillText(sub, w * 0.5, h * 0.78);
    ctx.shadowBlur = 0;
  }
}

function drawFlip(ctx, text, sub, w, h) {
  const parts = text.split(":");
  const left  = parts[0] || "00";
  const right = parts[1] || "00";
  const cw = w * 0.38, ch = h * 0.72;
  const cx1 = w * 0.5 - cw - w * 0.03;
  const cx2 = w * 0.5 + w * 0.03;
  const cy  = (h - ch) / 2;
  const r   = 14;

  [{ x: cx1, val: left }, { x: cx2, val: right }].forEach(({ x, val }) => {
    ctx.fillStyle = "rgba(20,20,20,0.85)";
    roundRect(ctx, x, cy, cw, ch, r); ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.1)"; ctx.lineWidth = 1;
    roundRect(ctx, x, cy, cw, ch, r); ctx.stroke();
    ctx.fillStyle = "rgba(0,0,0,0.8)";
    ctx.fillRect(x, cy + ch / 2 - 1.5, cw, 3);
    ctx.fillStyle = "#ffffff";
    ctx.font = `bold ${ch * 0.55}px 'DM Sans', Arial, sans-serif`;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(val, x + cw / 2, cy + ch / 2);
    ctx.fillStyle = "rgba(255,255,255,0.18)";
    ctx.beginPath(); ctx.arc(x + 12,      cy + ch / 2, 3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + cw - 12, cy + ch / 2, 3, 0, Math.PI * 2); ctx.fill();
  });

  if (sub) {
    ctx.fillStyle = "rgba(255,255,255,0.65)";
    ctx.font = `300 ${h * 0.1}px 'DM Sans', Arial, sans-serif`;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.shadowColor = "rgba(0,0,0,0.8)"; ctx.shadowBlur = 8;
    ctx.fillText(sub, w * 0.5, cy + ch + (h - cy - ch) * 0.55);
    ctx.shadowBlur = 0;
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
// Props:
//   clockStyle  0 = normal | 1 = flip cards
//   onEnter     () => void — PiP opened  → caller can hide main screen
//   onLeave     () => void — PiP closed  → caller can restore main screen
// ─────────────────────────────────────────────────────────────────────────────
export function usePiPWidget({ clockStyle = 0, onEnter, onLeave } = {}) {
  const canvasRef    = useRef(null); // offscreen canvas drawn every frame
  const pipVideoRef  = useRef(null); // hidden video whose srcObject = canvas stream → shown in PiP
  const bgVideoRef   = useRef(null); // hidden video playing the Cloudinary background URL
  const streamRef    = useRef(null); // canvas.captureStream() kept alive
  const rafRef       = useRef(null);
  const lastFrameRef = useRef(0);   // timestamp of last drawn frame (for fps cap)
  const styleRef     = useRef(clockStyle);
  const activeRef    = useRef(false);
  const readyRef     = useRef(false);
  const primingRef   = useRef(false);
  const touchStartX  = useRef(null);
  const bgUrlRef     = useRef(null); // currently loaded bg video URL

  const onEnterRef = useRef(onEnter);
  const onLeaveRef = useRef(onLeave);
  useEffect(() => { onEnterRef.current = onEnter; }, [onEnter]);
  useEffect(() => { onLeaveRef.current = onLeave; }, [onLeave]);
  useEffect(() => { styleRef.current = clockStyle; }, [clockStyle]);

  // ── Sync background video URL from store ─────────────────────────────────
  // Creates/updates a hidden <video> playing the current scene's video URL.
  // Only called when background actually changes (not every frame).
  const syncBgVideo = useCallback((url) => {
    if (url === bgUrlRef.current) return; // already loaded
    bgUrlRef.current = url;

    // Remove existing bg video element
    if (bgVideoRef.current) {
      bgVideoRef.current.pause();
      bgVideoRef.current.remove();
      bgVideoRef.current = null;
    }

    if (!url) return; // no background selected

    const v = document.createElement("video");
    v.muted       = true;
    v.loop        = true;
    v.autoplay    = true;
    v.preload     = "auto";
    v.playbackRate = 1;
    v.crossOrigin = "anonymous"; // required so canvas doesn't get tainted
    v.setAttribute("playsinline", "");
    v.disableRemotePlayback = true; // prevent casting overhead
    v.style.cssText =
      "position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;opacity:0.01;z-index:-1;pointer-events:none;";
    v.src = url;
    document.body.appendChild(v);
    bgVideoRef.current = v;

    v.play().catch(() => {
      // Autoplay blocked — will retry on next user gesture
    });
  }, []);

  // ── Subscribe to background changes (runs once on mount) ─────────────────
  // This replaces the old pattern of calling syncBgVideo() inside drawFrame
  // every RAF tick. Now we only re-create the bg video element when the
  // store's currentBackground actually changes.
  useEffect(() => {
    const getUrl = () => {
      const { currentBackground, backgrounds } = useStore.getState();
      return backgrounds[currentBackground]?.video ?? null;
    };
    // Fire once immediately to pick up the initial value
    syncBgVideo(getUrl());
    // Then subscribe to store changes
    const unsub = useStore.subscribe(() => {
      syncBgVideo(getUrl());
    });
    return unsub;
  }, [syncBgVideo]);
  const drawFrame = useCallback((now = 0) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // FPS cap — skip if we haven't waited long enough since last frame
    if (now && now - lastFrameRef.current < FRAME_MS) return;
    lastFrameRef.current = now;

    const ctx = canvas.getContext("2d");
    const w = PIP_W, h = PIP_H;

    ctx.clearRect(0, 0, w, h);

    // Layer 1 — background: live video frames if ready, else solid dark
    const bg = bgVideoRef.current;
    const hasVideo = bg &&
      !bg.paused        &&
      bg.readyState >= 2 &&
      bg.videoWidth  > 0;

    if (hasVideo) {
      drawCover(ctx, bg, w, h);
      ctx.fillStyle = "rgba(0,0,0,0.32)";
      ctx.fillRect(0, 0, w, h);
    } else {
      ctx.fillStyle = "rgba(8,13,8,0.97)";
      ctx.fillRect(0, 0, w, h);
    }

    // Layer 2 — clock / timer
    const { mode, time } = useStore.getState();
    let text, sub;
    if (mode === "clock") {
      const t = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true });
      const parts = t.split(" ");
      text = parts[0] || "12:00";
      sub  = parts[1] || "AM";
    } else {
      text = fmtTime(time);
      sub  = mode === "short" ? "SHORT TIMER" : "TIMER";
    }

    if (styleRef.current === 1) drawFlip(ctx, text, sub, w, h);
    else drawNormal(ctx, text, sub, w, h);

    // Notify the captureStream (0-fps pull model) that a new frame is ready
    if (streamRef.current) {
      const track = streamRef.current.getVideoTracks()[0];
      if (track?.requestFrame) track.requestFrame();
    }
  }, []);

  const startLoop = useCallback(() => {
    const loop = (now) => {
      if (!activeRef.current) return;
      drawFrame(now);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
  }, [drawFrame]);

  const stopLoop = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
  }, []);

  // ── Prime — call early (on FSPreview mount) to get video.play() done
  //           before the click gesture that calls requestPictureInPicture ────
  const prime = useCallback(async () => {
    if (!("pictureInPictureEnabled" in document)) return;
    if (readyRef.current)  return;
    if (primingRef.current) return;
    primingRef.current = true;

    // Canvas
    if (!canvasRef.current) {
      const canvas = document.createElement("canvas");
      canvas.width  = PIP_W;
      canvas.height = PIP_H;
      canvasRef.current = canvas;
    }

    // PiP stream video (hidden, streams canvas)
    if (!pipVideoRef.current) {
      const v = document.createElement("video");
      v.muted    = true;
      v.loop     = true;
      v.autoplay = true;
      v.setAttribute("playsinline", "");
      v.disableRemotePlayback = true;
      v.style.cssText =
        "position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;opacity:0.01;z-index:-1;";
      document.body.appendChild(v);
      pipVideoRef.current = v;
    }

    // Start loading background video immediately
    const { currentBackground, backgrounds } = useStore.getState();
    const bg  = backgrounds[currentBackground];
    syncBgVideo(bg?.video ?? null);

    drawFrame();

    try {
      const pv = pipVideoRef.current;

      // Use 0-fps capture stream (pull model) — we call track.requestFrame()
      // manually after each draw, which is far cheaper than 30fps push.
      if (!streamRef.current) {
        streamRef.current = canvasRef.current.captureStream(0);
      }

      if (pv.srcObject !== streamRef.current) pv.srcObject = streamRef.current;

      if (!pv.paused) {
        readyRef.current = true;
      } else {
        await pv.play();
        readyRef.current = true;
      }
    } catch (e) {
      if (e?.name !== "AbortError") console.warn("[PiP] prime failed:", e);
      // Retry after paint — AbortError usually self-resolves
      setTimeout(async () => {
        try {
          if (!readyRef.current && pipVideoRef.current) {
            await pipVideoRef.current.play();
            readyRef.current = true;
          }
        } catch {}
      }, 120);
    } finally {
      primingRef.current = false;
    }
  }, [drawFrame, syncBgVideo]);

  // ── enterPiP — call synchronously inside a click/tap handler ─────────────
  const enterPiP = useCallback(() => {
    if (!("pictureInPictureEnabled" in document)) return Promise.resolve(false);
    const pv = pipVideoRef.current;
    if (!pv || !readyRef.current) {
      console.warn("[PiP] not primed yet — call prime() earlier");
      return Promise.resolve(false);
    }

    // Swipe inside PiP to toggle clock style
    pv.ontouchstart = (e) => { touchStartX.current = e.touches[0].clientX; };
    pv.ontouchend   = (e) => {
      if (touchStartX.current === null) return;
      const dx = touchStartX.current - e.changedTouches[0].clientX;
      if (Math.abs(dx) > 40) {
        styleRef.current = styleRef.current === 0 ? 1 : 0;
        try { localStorage.setItem("lsc_last_clock_style", String(styleRef.current)); } catch {}
      }
      touchStartX.current = null;
    };

    return pv.requestPictureInPicture()
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
      .catch((e) => {
        console.warn("[PiP] requestPictureInPicture failed:", e);
        return false;
      });
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
      readyRef.current   = false;
      primingRef.current = false;
      bgUrlRef.current   = null;
      streamRef.current  = null;
      if (bgVideoRef.current)  { bgVideoRef.current.pause();  bgVideoRef.current.remove();  bgVideoRef.current  = null; }
      if (pipVideoRef.current) { pipVideoRef.current.remove(); pipVideoRef.current = null; }
    };
  }, []);

  return { prime, enterPiP, exitPiP };
}