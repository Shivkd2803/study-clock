import { useEffect, useRef, useState } from "react";
import { useStore } from "../store/useStore";
import { motion, AnimatePresence } from "framer-motion";
import { Howl } from "howler";
import { resolveMediaUrl } from "../hooks/useOfflineMedia";

export default function BackgroundVideo() {
  const backgrounds = useStore((s) => s.backgrounds);
  const current     = useStore((s) => s.currentBackground);
  const soundRef    = useRef(null);
  const blobUrls    = useRef([]);

  const bg = backgrounds[current];

  // Start with original URLs immediately — swap to blob if cached
  const [videoSrc, setVideoSrc] = useState(bg?.video || null);
  const [audioSrc, setAudioSrc] = useState(bg?.audio || null);

  useEffect(() => {
    const bg = backgrounds[current];
    if (!bg) return;

    let cancelled = false;

    // Immediately use original URL so video starts right away
    setVideoSrc(bg.video);
    setAudioSrc(bg.audio);

    // Then check if cached version exists — swap to blob URL if so
    const tryCache = async () => {
      try {
        const [vid, aud] = await Promise.all([
          resolveMediaUrl(bg.video),
          resolveMediaUrl(bg.audio),
        ]);
        if (cancelled) return;
        if (vid !== bg.video) {
          blobUrls.current.push(vid);
          setVideoSrc(vid);
        }
        if (aud !== bg.audio) {
          blobUrls.current.push(aud);
          setAudioSrc(aud);
        }
      } catch {}
    };
    tryCache();

    return () => {
      cancelled = true;
      blobUrls.current.forEach(u => { try { URL.revokeObjectURL(u); } catch {} });
      blobUrls.current = [];
    };
  }, [current]);

  // Audio
  useEffect(() => {
    if (!audioSrc) return;
    if (soundRef.current) { soundRef.current.stop(); soundRef.current.unload(); }
    soundRef.current = new Howl({ src: [audioSrc], loop: true, volume: 0.5, html5: true });
    soundRef.current.play();

    const pause  = () => { if (soundRef.current) soundRef.current.pause(); };
    const resume = () => { if (soundRef.current && !soundRef.current.playing()) soundRef.current.play(); };
    window.addEventListener("pause-main-audio",  pause);
    window.addEventListener("resume-main-audio", resume);
    return () => {
      if (soundRef.current) { soundRef.current.stop(); soundRef.current.unload(); }
      window.removeEventListener("pause-main-audio",  pause);
      window.removeEventListener("resume-main-audio", resume);
    };
  }, [audioSrc]);

  if (!videoSrc) return null;

  return (
    <div className="absolute inset-0">
      <AnimatePresence mode="wait">
        <motion.video
          key={current}
          autoPlay muted loop playsInline controls={false} disablePictureInPicture
          preload="auto"
          controlsList="nodownload nofullscreen noremoteplayback"
          onDoubleClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
          className="absolute inset-0 w-full h-full object-cover brightness-[0.8] contrast-[1.05] saturate-[1.1]"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 1.5 }}
        >
          <source src={videoSrc} type="video/mp4"/>
        </motion.video>
      </AnimatePresence>
    </div>
  );
}