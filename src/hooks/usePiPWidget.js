import { useRef, useCallback } from "react";
import { useStore } from "../store/useStore";

/**
 * usePiPWidget
 * ────────────
 * Launches a Picture-in-Picture "widget" that shows the current clock / timer
 * over any other app or window.
 *
 * Strategy (in order of browser support):
 *  1. Document Picture-in-Picture API  — Chrome 116+, Edge 116+
 *  2. Video Picture-in-Picture API     — all modern browsers (canvas trick)
 *  3. Graceful no-op fallback          — unsupported browsers
 */

// ─── helpers ─────────────────────────────────────────────────────────────────

function pad(n) {
  return String(n).padStart(2, "0");
}

function getTimeString(mode, time) {
  if (mode === "clock") {
    const now = new Date();
    const h = now.getHours();
    const m = now.getMinutes();
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 || 12;
    return `${pad(h12)}:${pad(m)} ${ampm}`;
  }
  const hh = Math.floor(time / 3600);
  const mm = Math.floor((time % 3600) / 60);
  const ss = time % 60;
  return hh > 0 ? `${pad(hh)}:${pad(mm)}` : `${pad(mm)}:${pad(ss)}`;
}

// ─── Document PiP (Chrome 116+) ──────────────────────────────────────────────

async function openDocumentPiP(getLabel) {
  if (!("documentPictureInPicture" in window)) return false;

  try {
    const pipWindow = await window.documentPictureInPicture.requestWindow({
      width: 280,
      height: 160,
      disallowReturnToOpener: false,
    });

    // Copy tailwind / app styles into the PiP window
    [...document.styleSheets].forEach((ss) => {
      try {
        const styleEl = document.createElement("style");
        styleEl.textContent = [...ss.cssRules].map((r) => r.cssText).join("\n");
        pipWindow.document.head.appendChild(styleEl);
      } catch (_) {}
    });

    // Inject Google Fonts
    const fontLink = pipWindow.document.createElement("link");
    fontLink.rel = "stylesheet";
    fontLink.href =
      "https://fonts.googleapis.com/css2?family=Outfit:wght@300;600;700&display=swap";
    pipWindow.document.head.appendChild(fontLink);

    pipWindow.document.body.style.cssText =
      "margin:0;padding:0;background:#080d08;display:flex;align-items:center;justify-content:center;height:100vh;overflow:hidden;";

    const root = pipWindow.document.createElement("div");
    root.style.cssText =
      "display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;width:100%;height:100%;";
    pipWindow.document.body.appendChild(root);

    const label = pipWindow.document.createElement("p");
    label.style.cssText =
      "font-family:'Outfit',sans-serif;font-size:11px;font-weight:600;color:rgba(255,255,255,0.4);letter-spacing:0.12em;text-transform:uppercase;margin:0;";
    label.textContent = "Live Study Clock";
    root.appendChild(label);

    const display = pipWindow.document.createElement("div");
    display.style.cssText =
      "font-family:'Outfit',sans-serif;font-size:52px;font-weight:700;color:#fff;line-height:1;letter-spacing:-0.02em;text-shadow:0 2px 12px rgba(0,0,0,0.6);";
    root.appendChild(display);

    let rafId;
    const tick = () => {
      display.textContent = getLabel();
      rafId = pipWindow.requestAnimationFrame(tick);
    };
    tick();

    pipWindow.addEventListener("pagehide", () => {
      cancelAnimationFrame(rafId);
    });

    return true;
  } catch (e) {
    console.warn("[usePiPWidget] Document PiP failed:", e);
    return false;
  }
}

// ─── Video PiP (canvas → video stream) ───────────────────────────────────────

function openVideoPiP(getLabel, videoRef) {
  return new Promise((resolve) => {
    try {
      // Create an off-screen canvas to paint the clock
      const canvas = document.createElement("canvas");
      canvas.width = 560;
      canvas.height = 320;
      const ctx = canvas.getContext("2d");

      let rafId;
      const drawFrame = () => {
        // Background
        ctx.fillStyle = "#080d08";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Subtle radial glow
        const grd = ctx.createRadialGradient(280, 160, 20, 280, 160, 220);
        grd.addColorStop(0, "rgba(240,237,232,0.07)");
        grd.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Label
        ctx.fillStyle = "rgba(255,255,255,0.38)";
        ctx.font = "600 22px 'Outfit', system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.letterSpacing = "0.12em";
        ctx.fillText("LIVE STUDY CLOCK", 280, 55);

        // Time
        ctx.fillStyle = "#ffffff";
        ctx.font = "700 108px 'Outfit', system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.shadowColor = "rgba(0,0,0,0.7)";
        ctx.shadowBlur = 20;
        ctx.fillText(getLabel(), 280, 190);
        ctx.shadowBlur = 0;

        // Bottom hint
        ctx.fillStyle = "rgba(255,255,255,0.2)";
        ctx.font = "400 18px 'Outfit', system-ui, sans-serif";
        ctx.fillText("Stay focused ✦", 280, 290);

        rafId = requestAnimationFrame(drawFrame);
      };
      drawFrame();

      // Stream canvas → video element
      const stream = canvas.captureStream(30);
      const video = document.createElement("video");
      video.srcObject = stream;
      video.muted = true;
      video.style.cssText =
        "position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;opacity:0;pointer-events:none;";
      document.body.appendChild(video);

      video.addEventListener("leavepictureinpicture", () => {
        cancelAnimationFrame(rafId);
        video.srcObject?.getTracks().forEach((t) => t.stop());
        video.remove();
        canvas.remove();
      });

      video
        .play()
        .then(() => video.requestPictureInPicture())
        .then(() => {
          // Store references so we can clean up
          if (videoRef) videoRef.current = video;
          resolve(true);
        })
        .catch((e) => {
          console.warn("[usePiPWidget] Video PiP failed:", e);
          cancelAnimationFrame(rafId);
          video.remove();
          canvas.remove();
          resolve(false);
        });
    } catch (e) {
      console.warn("[usePiPWidget] Video PiP setup failed:", e);
      resolve(false);
    }
  });
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function usePiPWidget() {
  const videoRef = useRef(null);

  const enterPiP = useCallback(async () => {
    const { mode, time } = useStore.getState();

    const getLabel = () => {
      const s = useStore.getState();
      return getTimeString(s.mode, s.time);
    };

    // 1. Try Document PiP (best experience — custom HTML)
    const docOk = await openDocumentPiP(getLabel);
    if (docOk) return;

    // 2. Fall back to Video PiP (canvas trick)
    // Exit any existing video PiP first
    if (document.pictureInPictureElement) {
      try {
        await document.exitPictureInPicture();
      } catch (_) {}
    }

    await openVideoPiP(getLabel, videoRef);
  }, []);

  return { enterPiP };
}
