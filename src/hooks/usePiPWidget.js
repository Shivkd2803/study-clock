// ─── Picture-in-Picture Widget ────────────────────────────────────────────────
//
// Platform strategy:
//   iOS Safari (14+) → Dedicated hidden <video> fed by MediaStream with silent
//                       AudioContext track (required for iOS PiP eligibility) +
//                       canvas clock frames via requestVideoFrameCallback shim.
//                       Uses webkitSetPresentationMode('picture-in-picture').
//
//   Android / Desktop Chrome → canvas.captureStream(0) → hidden <video> →
//                               requestPictureInPicture()
//
//   No support → pipSupported = false, button hidden

import { useEffect, useRef, useCallback } from "react";
import { useStore } from "../store/useStore";

const PIP_W = 480;
const PIP_H = 270;
const FRAME_MS = 1000 / 30;

// ─── Runtime capability detection (always safe — never top-level) ─────────────
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

// ─── Canvas helpers ───────────────────────────────────────────────────────────
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

function drawClock(ctx, w, h) {
  const { mode, time } = useStore.getState();
  let text, sub;
  if (mode === "clock") {
    const t = new Date().toLocaleTimeString([], { hour:"2-digit", minute:"2-digit", hour12:true });
    const parts = t.split(" ");
    text = parts[0] || "12:00";
    sub  = parts[1] || "AM";
  } else {
    text = fmtTime(time);
    sub  = mode === "short" ? "SHORT BREAK" : "TIMER";
  }
  ctx.fillStyle = "#fff";
  ctx.font = `bold ${h * 0.46}px 'DM Sans',Arial,sans-serif`;
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.shadowColor = "rgba(0,0,0,0.9)"; ctx.shadowBlur = 18;
  ctx.fillText(text, w / 2, h * 0.44);
  ctx.shadowBlur = 0;
  if (sub) {
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.font = `300 ${h * 0.11}px 'DM Sans',Arial,sans-serif`;
    ctx.shadowColor = "rgba(0,0,0,0.8)"; ctx.shadowBlur = 8;
    ctx.fillText(sub, w / 2, h * 0.76);
    ctx.shadowBlur = 0;
  }
}

// ─── Create a MediaStream video element eligible for iOS PiP ─────────────────
// iOS requires a video with an audio track to be PiP-eligible.
// We create a silent AudioContext oscillator at 0 gain as the audio track.
function createIOSPiPVideo(canvas) {
  return new Promise((resolve, reject) => {
    try {
      // 1. Silent audio track via AudioContext
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const audioCtx = new AudioCtx();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      gainNode.gain.value = 0; // completely silent
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      oscillator.start();
      const audioStream = audioCtx.createMediaStreamDestination();
      gainNode.connect(audioStream);

      // 2. Canvas video track
      // iOS Safari does NOT support captureStream — so we use a MediaStream
      // built from a canvas ImageBitmap approach via requestAnimationFrame + srcObject trick.
      // Instead, we use a plain canvas.captureStream if available, else fall back.
      let videoStream;
      if (typeof canvas.captureStream === "function") {
        videoStream = canvas.captureStream(30);
      } else {
        // iOS doesn't have captureStream — use empty video track workaround
        videoStream = new MediaStream();
      }

      // 3. Combine audio + video into one stream
      const combined = new MediaStream([
        ...videoStream.getVideoTracks(),
        ...audioStream.stream.getAudioTracks(),
      ]);

      // 4. Hidden video element
      const v = document.createElement("video");
      v.srcObject = combined;
      // Do NOT set muted at element level — iOS checks this for PiP eligibility
      // We silence via gainNode instead
      v.volume = 0;
      v.setAttribute("playsinline", "");
      v.setAttribute("webkit-playsinline", "");
      v.style.cssText =
        "position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;opacity:0.01;z-index:-1;pointer-events:none;";
      document.body.appendChild(v);

      v.play()
        .then(() => resolve({ video: v, audioCtx, oscillator }))
        .catch(reject);
    } catch (e) {
      reject(e);
    }
  });
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function usePiPWidget({ clockStyle = 0, onEnter, onLeave } = {}) {
  const canvasRef       = useRef(null);
  const pipVideoRef     = useRef(null);   // hidden video for standard PiP
  const iosPiPRef       = useRef(null);   // { video, audioCtx, oscillator } for iOS
  const hiddenBgRef     = useRef(null);   // hidden bg video for canvas drawing
  const streamRef       = useRef(null);
  const rafRef          = useRef(null);
  const lastFrameRef    = useRef(0);
  const styleRef        = useRef(clockStyle);
  const activeRef       = useRef(false);
  const readyRef        = useRef(false);
  const primingRef      = useRef(false);
  const bgUrlRef        = useRef(null);
  const iosReadyRef     = useRef(false);
  const iosPrimingRef   = useRef(false);

  const onEnterRef = useRef(onEnter);
  const onLeaveRef = useRef(onLeave);
  useEffect(() => { onEnterRef.current = onEnter; }, [onEnter]);
  useEffect(() => { onLeaveRef.current = onLeave; }, [onLeave]);
  useEffect(() => { styleRef.current = clockStyle; }, [clockStyle]);

  // ── Shared canvas ─────────────────────────────────────────────────────────
  const getCanvas = useCallback(() => {
    if (!canvasRef.current) {
      const c = document.createElement("canvas");
      c.width = PIP_W; c.height = PIP_H;
      canvasRef.current = c;
    }
    return canvasRef.current;
  }, []);

  // ── Hidden bg video for canvas compositing ────────────────────────────────
  // NOTE: Cross-origin Cloudinary videos taint the canvas and break captureStream.
  // We draw a solid dark background instead — clock is what matters in PiP.
  // bg video sync is kept only for iOS path where we don't use captureStream.
  const syncBgVideo = useCallback((url) => {
    if (url === bgUrlRef.current) return;
    bgUrlRef.current = url;
    if (hiddenBgRef.current) {
      hiddenBgRef.current.pause();
      hiddenBgRef.current.remove();
      hiddenBgRef.current = null;
    }
    if (!url) return;
    const v = document.createElement("video");
    v.muted = true; v.loop = true; v.autoplay = true; v.preload = "auto";
    v.crossOrigin = "anonymous"; // required — without this canvas is always tainted
    v.setAttribute("playsinline", "");
    v.disableRemotePlayback = true;
    v.style.cssText =
      "position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;opacity:0.01;z-index:-1;pointer-events:none;";
    v.src = url;
    document.body.appendChild(v);
    hiddenBgRef.current = v;
    v.play().catch(() => {});
  }, []);

  useEffect(() => {
    const getUrl = () => {
      const { currentBackground, backgrounds } = useStore.getState();
      return backgrounds[currentBackground]?.video ?? null;
    };
    syncBgVideo(getUrl());
    const unsub = useStore.subscribe(() => syncBgVideo(getUrl()));
    return unsub;
  }, [syncBgVideo]);

  // ── Draw frame onto canvas ────────────────────────────────────────────────
  const drawFrame = useCallback((now = 0) => {
    const canvas = getCanvas();
    if (now && now - lastFrameRef.current < FRAME_MS) return;
    lastFrameRef.current = now;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, PIP_W, PIP_H);
    drawBg(ctx, PIP_W, PIP_H);
    drawClock(ctx, PIP_W, PIP_H);
    // Notify 0-fps captureStream of new frame
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

  // ── prime() — call on FSPreview mount (inside user gesture context) ───────
  const prime = useCallback(async () => {
    const { webkitPiP, standardPiP } = getCaps();

    // ── iOS: create the PiP-eligible video ──────────────────────────────────
    if (webkitPiP && !iosReadyRef.current && !iosPrimingRef.current) {
      iosPrimingRef.current = true;
      try {
        drawFrame(); // draw first frame onto canvas
        const canvas = getCanvas();
        const result = await createIOSPiPVideo(canvas);
        iosPiPRef.current = result;
        iosReadyRef.current = true;
      } catch (e) {
        console.warn("[PiP iOS] prime failed:", e);
      } finally {
        iosPrimingRef.current = false;
      }
      return;
    }

    // ── Standard PiP (Android / Desktop) ────────────────────────────────────
    if (!standardPiP || readyRef.current || primingRef.current) return;
    primingRef.current = true;
    const canvas = getCanvas();

    const pv = (() => {
      if (pipVideoRef.current) return pipVideoRef.current;
      const v = document.createElement("video");
      v.muted = true; v.loop = true; v.autoplay = true;
      v.setAttribute("playsinline", "");
      v.disableRemotePlayback = true;
      v.style.cssText =
        "position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;opacity:0.01;z-index:-1;";
      document.body.appendChild(v);
      pipVideoRef.current = v;
      return v;
    })();

    drawFrame();
    try {
      if (!streamRef.current) streamRef.current = canvas.captureStream(0);
      if (pv.srcObject !== streamRef.current) pv.srcObject = streamRef.current;
      if (pv.paused) await pv.play();
      readyRef.current = true;
    } catch (e) {
      if (e?.name !== "AbortError") console.warn("[PiP] prime failed:", e);
      setTimeout(async () => {
        try { if (!readyRef.current && pipVideoRef.current) { await pipVideoRef.current.play(); readyRef.current = true; } } catch {}
      }, 150);
    } finally {
      primingRef.current = false;
    }
  }, [drawFrame, getCanvas]);

  // ── enterPiP — MUST be called synchronously in a click handler ────────────
  const enterPiP = useCallback(() => {
    const { webkitPiP, standardPiP } = getCaps();

    // ── iOS webkit PiP ────────────────────────────────────────────────────────
    if (webkitPiP) {
      const pip = iosPiPRef.current;
      if (!pip || !iosReadyRef.current) {
        console.warn("[PiP iOS] Not primed. Call prime() on FSPreview mount.");
        return Promise.resolve(false);
      }
      const vid = pip.video;
      try {
        if (typeof vid.webkitSetPresentationMode !== "function") {
          console.warn("[PiP iOS] webkitSetPresentationMode not available");
          return Promise.resolve(false);
        }
        // Start canvas loop so clock animates in PiP
        activeRef.current = true;
        startLoop();
        vid.webkitSetPresentationMode("picture-in-picture");
        onEnterRef.current?.();
        const onModeChange = () => {
          if (vid.webkitPresentationMode !== "picture-in-picture") {
            activeRef.current = false;
            stopLoop();
            onLeaveRef.current?.();
            vid.removeEventListener("webkitpresentationmodechanged", onModeChange);
          }
        };
        vid.addEventListener("webkitpresentationmodechanged", onModeChange);
        return Promise.resolve(true);
      } catch (e) {
        activeRef.current = false;
        stopLoop();
        console.warn("[PiP iOS] webkitSetPresentationMode failed:", e);
        return Promise.resolve(false);
      }
    }

    // ── Standard PiP (Android Chrome / Desktop) ───────────────────────────────
    if (!standardPiP) return Promise.resolve(false);

    const canvas = getCanvas();

    // Ensure pipVideo exists
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

    // Ensure stream exists
    if (!streamRef.current) {
      streamRef.current = canvas.captureStream(0);
    }

    const pv = pipVideoRef.current;
    if (pv.srcObject !== streamRef.current) pv.srcObject = streamRef.current;

    drawFrame(); // draw a frame immediately so video isn't blank

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
        .catch((e) => { console.warn("[PiP] requestPictureInPicture failed:", e); return false; });

    if (!pv.paused) {
      return doEnter();
    }
    // Not playing yet — play first then enter (still within gesture on most browsers)
    return pv.play()
      .then(() => { readyRef.current = true; return doEnter(); })
      .catch((e) => { console.warn("[PiP] play failed:", e); return false; });
  }, [startLoop, stopLoop, getCanvas, drawFrame]);

  // ── exitPiP ───────────────────────────────────────────────────────────────
  const exitPiP = useCallback(async () => {
    const { webkitPiP } = getCaps();
    activeRef.current = false;
    stopLoop();
    if (webkitPiP && iosPiPRef.current?.video) {
      try { iosPiPRef.current.video.webkitSetPresentationMode("inline"); } catch {}
      return;
    }
    if (document.pictureInPictureElement) {
      try { await document.exitPictureInPicture(); } catch {}
    }
  }, [stopLoop]);

  // ── Cleanup on unmount ────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      exitPiP();
      readyRef.current = false; iosReadyRef.current = false;
      primingRef.current = false; iosPrimingRef.current = false;
      bgUrlRef.current = null; streamRef.current = null;
      if (hiddenBgRef.current)  { hiddenBgRef.current.pause();  hiddenBgRef.current.remove();  hiddenBgRef.current  = null; }
      if (pipVideoRef.current)  { pipVideoRef.current.remove(); pipVideoRef.current = null; }
      if (iosPiPRef.current) {
        try { iosPiPRef.current.oscillator.stop(); } catch {}
        try { iosPiPRef.current.audioCtx.close(); } catch {}
        try { iosPiPRef.current.video.remove(); } catch {}
        iosPiPRef.current = null;
      }
    };
  }, []);

  return { prime, enterPiP, exitPiP };
}