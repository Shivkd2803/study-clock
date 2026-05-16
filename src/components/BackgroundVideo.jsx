import { useEffect, useRef } from "react";
import { useStore } from "../store/useStore";
import { motion, AnimatePresence } from "framer-motion";
import { Howl } from "howler";

// No fullscreen button here — handled per-layout in App.jsx
export default function BackgroundVideo() {
  const backgrounds = useStore((s) => s.backgrounds);
  const current = useStore((s) => s.currentBackground);
  const soundRef = useRef(null);

  useEffect(() => {
    if (soundRef.current) { soundRef.current.stop(); soundRef.current.unload(); }
    soundRef.current = new Howl({ src: [backgrounds[current].audio], loop: true, volume: 0.5, html5: true });
    soundRef.current.play();

    const pauseAudio = () => { if (soundRef.current) soundRef.current.pause(); };
    const resumeAudio = () => { if (soundRef.current && !soundRef.current.playing()) soundRef.current.play(); };
    window.addEventListener("pause-main-audio", pauseAudio);
    window.addEventListener("resume-main-audio", resumeAudio);

    return () => {
      if (soundRef.current) { soundRef.current.stop(); soundRef.current.unload(); }
      window.removeEventListener("pause-main-audio", pauseAudio);
      window.removeEventListener("resume-main-audio", resumeAudio);
    };
  }, [current]);

  return (
    <div className="absolute inset-0">
      <AnimatePresence mode="wait">
        <motion.video
          key={current}
          autoPlay muted loop playsInline controls={false} disablePictureInPicture
          controlsList="nodownload nofullscreen noremoteplayback"
          onDoubleClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
          className="absolute inset-0 w-full h-full object-cover brightness-[0.8] contrast-[1.05] saturate-[1.1]"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 1.5 }}
        >
          <source src={backgrounds[current].video} type="video/mp4" />
        </motion.video>
      </AnimatePresence>
    </div>
  );
}