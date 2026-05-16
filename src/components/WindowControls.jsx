import { useState } from "react";
import { FiMinus, FiSquare, FiX } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";

export default function WindowControls() {
  const [visible, setVisible] = useState(false);

  return (
    <>
      {/* TOP HOVER AREA */}
      <div
        className="fixed top-0 left-0 w-full h-8 z-[9998]"
        onMouseEnter={() => setVisible(true)}
      />

      <AnimatePresence>
        {visible && (
          <motion.div
            initial={{ y: -40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -40, opacity: 0 }}
            transition={{
              duration: 0.2,
              ease: "easeOut"
            }}
            onMouseLeave={() => setVisible(false)}
            className="fixed top-0 left-0 w-full h-9 z-[9999] flex items-center justify-between px-3"
            style={{
              WebkitAppRegion: "drag"
            }}
          >
            {/* THIN GLASS BAR */}
            <div className="absolute inset-0 bg-black/15 backdrop-blur-md border-b border-white/5" />

            {/* TITLE */}
            <div className="relative z-10 text-white/70 text-[10px] tracking-[2px] font-medium">
              LIVE STUDY CLOCK
            </div>

            {/* CONTROLS */}
            <div
              className="relative z-10 flex items-center gap-1"
              style={{
                WebkitAppRegion: "no-drag"
              }}
            >
              {/* MINIMIZE */}
              <motion.button
                whileHover={{
                  scale: 1.08,
                  backgroundColor: "rgba(255,255,255,0.12)"
                }}
                whileTap={{ scale: 0.95 }}
                onClick={() => window.electron.minimize()}
                className="w-7 h-7 rounded-lg bg-white/5 text-white/80 flex items-center justify-center backdrop-blur-md border border-white/5"
              >
                <FiMinus size={14} />
              </motion.button>

              {/* MAXIMIZE */}
              <motion.button
                whileHover={{
                  scale: 1.08,
                  backgroundColor: "rgba(255,255,255,0.12)"
                }}
                whileTap={{ scale: 0.95 }}
                onClick={() => window.electron.maximize()}
                className="w-7 h-7 rounded-lg bg-white/5 text-white/80 flex items-center justify-center backdrop-blur-md border border-white/5"
              >
                <FiSquare size={11} />
              </motion.button>

              {/* CLOSE */}
              <motion.button
                whileHover={{
                  scale: 1.08,
                  backgroundColor: "#ef4444"
                }}
                whileTap={{ scale: 0.95 }}
                onClick={() => window.electron.close()}
                className="w-7 h-7 rounded-lg bg-white/5 text-white/80 flex items-center justify-center backdrop-blur-md border border-white/5"
              >
                <FiX size={14} />
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}