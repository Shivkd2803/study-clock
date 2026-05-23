import { useEffect, useRef, useState } from "react";
import { useStore } from "../store/useStore";
import { motion, AnimatePresence } from "framer-motion";
import { Howl } from "howler";
import { resolveMediaUrl } from "../hooks/useOfflineMedia";

export default function BackgroundVideo() {
  const backgrounds = useStore((s) => s.backgrounds);
  const current = useStore((s) => s.currentBackground);
  const soundRef = useRef(null);
  const [videoSrc, setVideoSrc] = useState(null);
  const [audioSrc, setAudioSrc] = useState(null);
  const blobUrls = useRef([]);

  // Resolve cached URLs when background changes
  useEffect(() => {
    let cancelled = false;
    const bg = backgrounds[current];
    if (!bg) return;

    const resolve = async () => {
      const [vid, aud] = await Promise.all([
        resolveMediaUrl(bg.video),
        resolveMediaUrl(bg.audio),
      ]);
      if (!cancelled) {
        // Track blob URLs for cleanup
        if (vid !== bg.video) blobUrls.current.push(vid);
        if (aud !== bg.audio) blobUrls.current.push(aud);
        setVideoSrc(vid);
        setAudioSrc(aud);
      }
    };
    resolve();

    return () => {
      cancelled = true;
      // Revoke old blob URLs
      blobUrls.current.forEach(u => { try { URL.revokeObjectURL(u); } catch {} });
      blobUrls.current = [];
    };
  }, [current]);

  // Play audio when src is resolved
  useEffect(() => {
    if (!audioSrc) return;
    if (soundRef.current) { soundRef.current.stop(); soundRef.current.unload(); }
    soundRef.current = new Howl({ src: [audioSrc], loop: true, volume: 0.5, html5: true });
    soundRef.current.play();

    const pauseAudio  = () => { if (soundRef.current) soundRef.current.pause(); };
    const resumeAudio = () => { if (soundRef.current && !soundRef.current.playing()) soundRef.current.play(); };
    window.addEventListener("pause-main-audio", pauseAudio);
    window.addEventListener("resume-main-audio", resumeAudio);

    return () => {
      if (soundRef.current) { soundRef.current.stop(); soundRef.current.unload(); }
      window.removeEventListener("pause-main-audio", pauseAudio);
      window.removeEventListener("resume-main-audio", resumeAudio);
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
          <source src={videoSrc} type="video/mp4" />
        </motion.video>
      </AnimatePresence>
    </div>
  );
}