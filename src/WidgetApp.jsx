import { useState, useEffect, useRef } from "react";
import { useStore } from "./store/useStore";
import { motion, AnimatePresence } from "framer-motion";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function useLiveClock() {
  const get = () => {
    const now = new Date();
    const t = now.toLocaleTimeString([], { hour:"2-digit", minute:"2-digit", hour12:true });
    const parts = t.split(" ");
    const [h, m] = (parts[0]||"12:00").split(":");
    return { h, m, ampm: parts[1]||"AM", full: parts[0]||"12:00" };
  };
  const [t, setT] = useState(get);
  useEffect(() => { const iv = setInterval(() => setT(get()), 1000); return () => clearInterval(iv); }, []);
  return t;
}

function fmtTime(secs) {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`;
  return `${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
}

// ─── Flip Card — square, matches fullscreen FlipCard exactly ─────────────────
function FlipCard({ value, size, ampm }) {
  const [cur, setCur] = useState(value);
  const [nxt, setNxt] = useState(value);
  const [flip, setFlip] = useState(false);
  useEffect(() => {
    if (value === cur) return;
    setNxt(value); setFlip(true);
    const t = setTimeout(() => { setCur(value); setFlip(false); }, 420);
    return () => clearTimeout(t);
  }, [value]);
  const w = size, h = size, r = size * 0.08, fs = size * 0.52;
  const ns = { fontSize:fs, fontWeight:800, color:"#fff", lineHeight:1,
    fontFamily:"'Outfit','DM Sans',sans-serif", userSelect:"none", letterSpacing:"-0.02em" };
  const glassBg = "rgba(30,30,30,0.55)";
  const glassStyle = { backdropFilter:"blur(24px) saturate(160%)", WebkitBackdropFilter:"blur(24px) saturate(160%)",
    border:"1px solid rgba(255,255,255,0.08)" };
  return (
    <div style={{ width:w, height:h, position:"relative", perspective:800 }}>
      <div style={{ position:"absolute", top:0, left:0, width:w, height:h/2, ...glassStyle, background:glassBg,
        borderRadius:`${r}px ${r}px 0 0`, overflow:"hidden", display:"flex", alignItems:"flex-end", justifyContent:"center" }}>
        <span style={{...ns, transform:"translateY(50%)"}}>{cur}</span>
      </div>
      <div style={{ position:"absolute", bottom:0, left:0, width:w, height:h/2, ...glassStyle, background:glassBg,
        borderRadius:`0 0 ${r}px ${r}px`, overflow:"hidden", display:"flex", alignItems:"flex-start", justifyContent:"center" }}>
        <span style={{...ns, transform:"translateY(-50%)"}}>{nxt}</span>
      </div>
      {flip && (
        <motion.div initial={{rotateX:0}} animate={{rotateX:-90}} transition={{duration:0.21, ease:"easeIn"}}
          style={{ position:"absolute", top:0, left:0, width:w, height:h/2, ...glassStyle, background:glassBg,
            borderRadius:`${r}px ${r}px 0 0`, overflow:"hidden", transformOrigin:"50% 100%",
            display:"flex", alignItems:"flex-end", justifyContent:"center", zIndex:3 }}>
          <span style={{...ns, transform:"translateY(50%)"}}>{cur}</span>
        </motion.div>
      )}
      {flip && (
        <motion.div initial={{rotateX:90}} animate={{rotateX:0}} transition={{duration:0.21, ease:"easeOut", delay:0.21}}
          style={{ position:"absolute", bottom:0, left:0, width:w, height:h/2, ...glassStyle, background:glassBg,
            borderRadius:`0 0 ${r}px ${r}px`, overflow:"hidden", transformOrigin:"50% 0%",
            display:"flex", alignItems:"flex-start", justifyContent:"center", zIndex:3 }}>
          <span style={{...ns, transform:"translateY(-50%)"}}>{nxt}</span>
        </motion.div>
      )}
      <div style={{ position:"absolute", top:"50%", left:0, right:0, height:3, background:"#000", zIndex:4, transform:"translateY(-50%)" }}/>
      <div style={{ position:"absolute", top:"50%", left:w*0.07, transform:"translateY(-50%)", zIndex:5,
        width:w*0.06, height:w*0.06, borderRadius:"50%", background:"#2e2e2e", border:"1.5px solid #444" }}/>
      <div style={{ position:"absolute", top:"50%", right:w*0.07, transform:"translateY(-50%)", zIndex:5,
        width:w*0.06, height:w*0.06, borderRadius:"50%", background:"#2e2e2e", border:"1.5px solid #444" }}/>
      {ampm && (
        <span style={{ position:"absolute", bottom:w*0.07, left:w*0.09, zIndex:6,
          fontSize:w*0.12, fontWeight:500, color:"rgba(255,255,255,0.45)",
          fontFamily:"'Outfit',sans-serif", letterSpacing:"0.08em" }}>{ampm}</span>
      )}
    </div>
  );
}

// ─── Widget App ───────────────────────────────────────────────────────────────
export default function WidgetApp() {
  const mode  = useStore(s => s.mode);
  const time  = useStore(s => s.time);
  const clock = useLiveClock();

  const isTimer  = mode !== "clock";
  const [videoUrl, setVideoUrl] = useState(() => {
    try {
      const state = window.electron?.getWidgetState?.();
      return state?.videoUrl || null;
    } catch { return null; }
  });

  useEffect(() => {
    // Live updates when background changes while widget is open
    if (window.electron?.onWidgetState) {
      window.electron.onWidgetState((state) => {
        if (state?.videoUrl !== undefined) setVideoUrl(state.videoUrl);
      });
    }
  }, []);

  // Drag support for Electron
  const dragRef = useRef(null);
  const lastPos = useRef(null);
  const onMouseDown = (e) => {
    if (e.target.closest("button")) return;
    lastPos.current = { x: e.screenX, y: e.screenY };
    const onMove = (e2) => {
      if (!lastPos.current) return;
      const dx = e2.screenX - lastPos.current.x;
      const dy = e2.screenY - lastPos.current.y;
      lastPos.current = { x: e2.screenX, y: e2.screenY };
      window.electron?.widgetDrag(dx, dy);
    };
    const onUp = () => { lastPos.current = null; window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const timerStr = fmtTime(time);
  const cardSize = 60;

  const renderClock = () => {
    const hStr = clock.h.padStart(2, "0");
    const mStr = clock.m.padStart(2, "0");
    const left  = isTimer ? timerStr.split(":")[0] : hStr;
    const right = isTimer ? timerStr.split(":")[1] : mStr;
    return (
      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:8 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <FlipCard value={left}  size={cardSize} ampm={!isTimer ? clock.ampm : null}/>
          <FlipCard value={right} size={cardSize}/>
        </div>
        {isTimer && (
          <span style={{ fontSize:11, color:"rgba(255,255,255,0.45)", fontFamily:"'Outfit','DM Sans',sans-serif", letterSpacing:"0.10em", textTransform:"uppercase" }}>
            {mode === "short" ? "Short Timer" : "Timer"}
          </span>
        )}
      </div>
    );
  };

  return (
    <div
      ref={dragRef}
      onMouseDown={onMouseDown}
      style={{
        width:"100vw", height:"100vh", borderRadius:18, overflow:"hidden",
        border:"1px solid rgba(255,255,255,0.12)",
        boxShadow:"0 8px 40px rgba(0,0,0,0.6)",
        display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
        position:"relative", cursor:"move", userSelect:"none",
        fontFamily:"'DM Sans',sans-serif", background:"#080d08",
      }}>

      {/* Background video — same one playing in fullscreen */}
      <AnimatePresence mode="wait">
        {videoUrl ? (
          <motion.video
            key={videoUrl}
            src={videoUrl}
            autoPlay muted loop playsInline
            initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
            transition={{ duration:0.6 }}
            style={{
              position:"absolute", inset:0, width:"100%", height:"100%",
              objectFit:"cover",
              filter:"brightness(0.75) contrast(1.05) saturate(1.1)",
              pointerEvents:"none",
            }}
          />
        ) : (
          <motion.div key="no-bg"
            initial={{ opacity:0 }} animate={{ opacity:1 }}
            style={{ position:"absolute", inset:0, background:"linear-gradient(135deg,#0d1a0d,#080d08)" }}
          />
        )}
      </AnimatePresence>

      {/* Dark overlay */}
      <div style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0.2)", pointerEvents:"none" }}/>

      {/* Expand — restores main window */}
      <button onClick={() => window.electron?.unwidget?.()} title="Restore main window"
        style={{ position:"absolute", top:8, left:8, width:24, height:24, zIndex:10,
          borderRadius:6, border:"1px solid rgba(255,255,255,0.15)", cursor:"pointer",
          background:"rgba(0,0,0,0.4)", color:"rgba(255,255,255,0.7)",
          display:"flex", alignItems:"center", justifyContent:"center" }}>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
          <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
        </svg>
      </button>

      {/* Close — quits entire app */}
      <button onClick={() => window.electron?.quit?.()} title="Quit app"
        style={{ position:"absolute", top:8, right:8, width:22, height:22, zIndex:10,
          borderRadius:"50%", border:"none", cursor:"pointer",
          background:"rgba(255,80,80,0.25)", color:"rgba(255,255,255,0.8)",
          display:"flex", alignItems:"center", justifyContent:"center", fontSize:12 }}>✕</button>

      {/* Clock */}
      <div style={{ position:"relative", zIndex:10 }}>
        {renderClock()}
      </div>
    </div>
  );
}