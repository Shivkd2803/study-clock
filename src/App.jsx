import { useState, useEffect, useRef } from "react";
import BackgroundVideo from "./components/BackgroundVideo";
import usePomodoro from "./hooks/usePomodoro";
import WindowControls from "./components/WindowControls";
import { useStore } from "./store/useStore";
import { AnimatePresence, motion } from "framer-motion";
import { cacheBackground, uncacheBackground, isBackgroundCached, getTotalCachedSize, formatBytes } from "./hooks/useOfflineMedia";
import { usePiPWidget } from "./hooks/usePiPWidget";

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return { text: "Good Morning",   icon: "☀️" };
  if (h < 17) return { text: "Good Afternoon", icon: "☀️" };
  return       { text: "Good Evening",          icon: "🌙" };
}

function useLiveClock() {
  const get = () => {
    const now = new Date();
    const t = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true });
    const parts = t.split(" ");
    const [h, m] = (parts[0] || "12:00").split(":");
    return { h: h||"12", m: m||"00", ampm: parts[1]||"AM", full: parts[0]||"12:00", rawH: h||"12", rawM: m||"00" };
  };
  const [t, setT] = useState(get);
  useEffect(() => { const iv = setInterval(() => setT(get()), 1000); return () => clearInterval(iv); }, []);
  return t;
}

function useWindowSize() {
  const [s, setS] = useState({ w: window.innerWidth, h: window.innerHeight });
  useEffect(() => {
    const up = () => setS({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("resize", up);
    window.addEventListener("orientationchange", () => setTimeout(up, 150));
    return () => { window.removeEventListener("resize", up); window.removeEventListener("orientationchange", up); };
  }, []);
  return s;
}

// ─── DATA ────────────────────────────────────────────────────────────────────
const EXTRA_BGS = [
  { name: "Beach Waves", desc: "Sunlit beach, gentle waves", category: "Underwater", thumbnail: "/thumbnails/underwater.png", video: "/videos/underwater.mp4", audio: "/audio/underwater.mp3" },
];
const BG_DESCS = { "Rainy Window":"Rain and thunder","Underwater Calm":"Ocean and bubbles","Cozy Coffee Shop":"Ambient cafe sounds","Forest Rain":"Rain in the forest","Night Campfire":"Crackling fire" };
const BG_CATS  = { "Rainy Window":"Rain","Underwater Calm":"Underwater","Cozy Coffee Shop":"Night","Forest Rain":"Rain","Night Campfire":"Night" };
const CATS = ["All","Rain","Nature","Underwater","Night","Winter"];
const CAT_ICONS = {
  All:        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>,
  Rain:       <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 17.58A5 5 0 0018 8h-1.26A8 8 0 104 15.25"/><line x1="8" y1="16" x2="8" y2="21"/><line x1="12" y1="19" x2="12" y2="21"/><line x1="16" y1="16" x2="16" y2="21"/></svg>,
  Nature:     <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 8C8 10 5.9 16.17 3.82 21"/><path d="M9.1 10.1c1.9-3.1 5.9-6.1 11.9-8.1 0 6-2.9 10.9-8.9 13.9"/></svg>,
  Underwater: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 12s2-4 10-4 10 4 10 4-2 4-10 4-10-4-10-4z"/><circle cx="12" cy="12" r="2"/></svg>,
  Night:      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>,
  Winter:     <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="2" x2="12" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M7 7l5 5 5-5M7 17l5-5 5 5"/></svg>,
};

// ─── ICONS ───────────────────────────────────────────────────────────────────
const IcoExpand   = (s=18) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3"/></svg>;
const IcoCompress = (s=18) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3v3a2 2 0 01-2 2H3m18 0h-3a2 2 0 01-2-2V3m0 18v-3a2 2 0 012-2h3M3 16h3a2 2 0 012 2v3"/></svg>;
const IcoClock    = (s=22) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>;
const IcoTimer    = (s=22) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6"/><path d="M16.24 7.76l-2.12 2.12"/></svg>;
const IcoCal      = (s=22) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M8 2v4M16 2v4M3 10h18"/><path d="M12 14h.01M16 14h.01M8 18h.01M12 18h.01"/></svg>;
const IcoExplore  = (s=22) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>;
const IcoReset    = (s=20) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 4v6h6"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/></svg>;

// ─── TRANSLUCENT NAVBAR ───────────────────────────────────────────────────────
function NavBar({ isLarge = false, isPhoneLandscape = false, isDesktop = false, onHamburger }) {
  const greeting = getGreeting();

  const slim = isDesktop || isPhoneLandscape;

  return (
    <div className="flex-shrink-0 flex items-center justify-between"
      style={{
        padding: slim ? "10px 20px 8px" : isLarge ? "20px 28px 16px" : "22px 16px 10px",
        background: "rgba(0,0,0,0.25)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
      }}>
      <div className="flex items-center gap-2.5">
        {/* App logo */}
        <div className={`rounded-2xl overflow-hidden flex-shrink-0 ${isLarge && !slim ? "w-11 h-11" : "w-8 h-8"}`}
          style={{ background: "rgba(0,0,0,0.35)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.12)" }}>
          <img src="/logo.png" alt="Live Study Clock"
            className="w-full h-full object-contain p-1"
            style={{ filter: "invert(1) brightness(0.9)" }} />
        </div>
        <div>
          <p className={`text-white font-semibold drop-shadow ${isLarge && !slim ? "text-base" : "text-sm"}`}>{greeting.text}</p>
          <p className={`text-white/55 drop-shadow ${isLarge && !slim ? "text-xs" : "text-[10px]"}`}>Stay focused and keep growing.</p>
        </div>
      </div>
      {isDesktop && (
        <button
          onClick={onHamburger}
          className="w-9 h-9 flex flex-col items-center justify-center gap-1.5 text-white/80 hover:text-white transition-all">
          <span className="w-4 bg-current rounded-full" style={{height:2}}/>
          <span className="w-4 bg-current rounded-full" style={{height:2}}/>
          <span className="w-4 bg-current rounded-full" style={{height:2}}/>
        </button>
      )}
    </div>
  );
}

function ModePill({ sz = "md", onSetTime }) {
  const mode        = useStore((s) => s.mode);
  const setMode     = useStore((s) => s.setMode);
  const setShortTimer = useStore((s) => s.setShortTimer);
  const iconSz  = sz === "lg" ? 26 : sz === "sm" ? 19 : 22;
  const txtCls  = sz === "lg" ? "text-sm" : sz === "sm" ? "text-[10px]" : "text-xs";
  const pyCls   = sz === "lg" ? "py-3"   : sz === "sm" ? "py-1.5"      : "py-2.5";
  const rCls    = sz === "lg" ? "rounded-[22px]" : "rounded-[18px]";
  const tabs = [
    { key:"clock", label:"Live Clock",  Ico:IcoClock },
    { key:"short", label:"Short Timer", Ico:IcoTimer },
    { key:"long",  label:"Set Time",    Ico:IcoCal   },
  ];
  return (
    <div className={`relative flex bg-black/45 backdrop-blur-2xl ${rCls} border border-white/10 p-1.5 gap-1`}>
      {tabs.map(({ key, label, Ico }) => (
        <button key={key}
          onClick={() => {
            if (key === "long") { onSetTime(); }
            else if (key === "short") { setShortTimer(); }
            else { setMode(key); }
          }}
          className={`relative flex-1 flex flex-col items-center gap-1.5 ${pyCls} ${rCls} transition-colors duration-200 z-10 ${
            mode === key ? "text-[#f0ede8]" : "text-white/65 hover:text-white"
          }`}>
          {/* Sliding background pill */}
          {mode === key && (
            <motion.div
              layoutId="modePillSlider"
              className={`absolute inset-0 ${rCls}`}
              style={{ background: "rgba(240,237,232,0.18)", border: "1px solid rgba(240,237,232,0.28)" }}
              transition={{ type: "spring", stiffness: 400, damping: 35 }}
            />
          )}
          {Ico(iconSz)}
          <span className={`${txtCls} font-medium`}>{label}</span>
          {mode === key && <div className="w-5 h-0.5 bg-[#f0ede8] rounded-full"/>}
        </button>
      ))}
    </div>
  );
}

// ─── SET TIME SHEET ───────────────────────────────────────────────────────────
function ScrollDrum({ value, max, onChange }) {
  const ITEM_H = 64;
  const count = max + 1;
  const REPS = 40;
  const MID_OFFSET = Math.floor(REPS / 2) * count;
  const containerRef = useRef(null);
  const programmatic = useRef(false);
  const [typing, setTyping] = useState(false);
  const [typed, setTyped] = useState("");
  const inputRef = useRef(null);

  const scrollToVal = (val, smooth = false) => {
    if (!containerRef.current) return;
    programmatic.current = true;
    containerRef.current.scrollTo({
      top: (MID_OFFSET + val) * ITEM_H,
      behavior: smooth ? "smooth" : "auto",
    });
    setTimeout(() => { programmatic.current = false; }, 100);
  };

  useEffect(() => { scrollToVal(value); }, []);

  const handleScroll = () => {
    if (programmatic.current || !containerRef.current) return;
    const idx = Math.round(containerRef.current.scrollTop / ITEM_H);
    const newVal = ((idx % count) + count) % count;
    if (newVal !== value) onChange(newVal);
    if (Math.abs(idx - (MID_OFFSET + newVal)) > count * 5) {
      programmatic.current = true;
      containerRef.current.scrollTop = (MID_OFFSET + newVal) * ITEM_H;
      setTimeout(() => { programmatic.current = false; }, 50);
    }
  };

  const commitTyped = (str) => {
    const n = parseInt(str);
    if (!isNaN(n) && str !== "") {
      const clamped = Math.min(max, Math.max(0, n));
      onChange(clamped);
      scrollToVal(clamped, true);
    }
    setTyping(false);
    setTyped("");
  };

  const startTyping = () => {
    setTyping(true);
    setTyped("");
    setTimeout(() => inputRef.current?.focus(), 30);
  };

  const items = Array.from({ length: count * REPS }, (_, i) => i % count);

  return (
    <div style={{ position:"relative", height: ITEM_H * 3, width:88, overflow:"hidden", borderRadius:14, flexShrink:0 }}>
      {/* Highlight band — MIDDLE row */}
      <div style={{
        position:"absolute", top: ITEM_H, left:0, right:0, height: ITEM_H,
        background:"rgba(240,237,232,0.1)", borderRadius:10,
        border:"1px solid rgba(240,237,232,0.18)", pointerEvents:"none", zIndex:2,
      }}/>
      {/* Top fade */}
      <div style={{
        position:"absolute", top:0, left:0, right:0, height: ITEM_H,
        background:"linear-gradient(to bottom, rgba(0,0,0,0.65), transparent)",
        pointerEvents:"none", zIndex:3,
      }}/>
      {/* Bottom fade */}
      <div style={{
        position:"absolute", bottom:0, left:0, right:0, height: ITEM_H,
        background:"linear-gradient(to top, rgba(0,0,0,0.65), transparent)",
        pointerEvents:"none", zIndex:3,
      }}/>

      {/* Tap-to-type overlay on centre row only */}
      <div
        onClick={startTyping}
        style={{
          position:"absolute", top: ITEM_H, left:0, right:0, height: ITEM_H,
          zIndex: typing ? 0 : 4, cursor:"text",
        }}
      />
      {typing && (
        <div style={{
          position:"absolute", top: ITEM_H, left:0, right:0, height: ITEM_H,
          zIndex:10, display:"flex", alignItems:"center", justifyContent:"center",
          background:"rgba(240,237,232,0.12)", borderRadius:10,
        }}>
          <input
            ref={inputRef}
            type="tel"
            inputMode="numeric"
            value={typed}
            onChange={e => {
              const val = e.target.value.replace(/\D/g,"").slice(0,2);
              setTyped(val);
              if (val.length === 2) commitTyped(val);
            }}
            onBlur={() => commitTyped(typed)}
            onKeyDown={e => {
              if (e.key === "Enter") commitTyped(typed);
              if (e.key === "Escape") { setTyping(false); setTyped(""); }
            }}
            placeholder={String(value).padStart(2,"0")}
            style={{
              width:"100%", height:"100%", textAlign:"center",
              background:"transparent", border:"none", outline:"none",
              color:"#fff", fontSize:42, fontWeight:700,
              fontFamily:"'DM Sans',sans-serif", caretColor:"#f0ede8",
            }}
          />
        </div>
      )}

      {/* Scroll list */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        onWheel={e => {
          e.preventDefault();
          if (!containerRef.current) return;
          containerRef.current.scrollBy({ top: e.deltaY > 0 ? ITEM_H : -ITEM_H, behavior:"smooth" });
        }}
        style={{
          height:"100%", overflowY:"scroll", scrollSnapType:"y mandatory",
          scrollbarWidth:"none", msOverflowStyle:"none",
          paddingTop: ITEM_H, paddingBottom: ITEM_H,
          boxSizing:"content-box",
        }}>
        {items.map((val, i) => (
          <div key={i} style={{
            height: ITEM_H, display:"flex", alignItems:"center", justifyContent:"center",
            scrollSnapAlign:"center", lineHeight:1,
            fontSize: val === value ? 42 : 30,
            fontWeight: 700, fontFamily:"'DM Sans',sans-serif",
            color: val === value ? "#fff" : "rgba(255,255,255,0.28)",
            transition:"font-size 0.12s, color 0.12s",
          }}>
            {String(val).padStart(2,"0")}
          </div>
        ))}
      </div>
    </div>
  );
}

function SetTimeSheet({ onClose }) {
  const [h, setH] = useState(0);
  const [m, setM] = useState(0);

  const go = () => {
    const t = h * 3600 + m * 60;
    if (!t) return;
    useStore.setState({ mode:"long", time:t, originalTime:t, running:false });
    onClose();
  };

  const displayH = String(h).padStart(2,"0");
  const displayM = String(m).padStart(2,"0");

  return (
    <motion.div className="fixed inset-0 z-[900] flex items-end justify-center bg-black/60 backdrop-blur-sm"
      initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
      onClick={(e) => e.target===e.currentTarget && onClose()}>
      <motion.div initial={{y:"100%"}} animate={{y:0}} exit={{y:"100%"}} transition={{type:"spring",damping:25}}
        className="w-full max-w-lg rounded-t-[32px] border-t border-white/15 p-8 flex flex-col items-center gap-6"
        style={{background:"rgba(240,237,232,0.12)", backdropFilter:"blur(30px)", WebkitBackdropFilter:"blur(30px)"}}>
        <div className="w-10 h-1 bg-white/20 rounded-full"/>
        <h2 className="text-white text-2xl font-bold">Set Timer</h2>

        {/* Scroll drums */}
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:8 }}>
            <label className="text-white/40 text-xs tracking-widest uppercase">Hours</label>
            <ScrollDrum value={h} max={23} onChange={setH}/>
          </div>
          <span className="text-white text-5xl font-bold select-none" style={{marginTop:24}}>:</span>
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:8 }}>
            <label className="text-white/40 text-xs tracking-widest uppercase">Minutes</label>
            <ScrollDrum value={m} max={59} onChange={setM}/>
          </div>
        </div>

        <p className="text-white/40 text-sm">
          Timer will be set to <span className="text-[#f0ede8] font-semibold">{displayH}:{displayM}</span>
        </p>

        <div className="flex gap-3 w-full">
          <button onClick={go} className="flex-1 py-4 rounded-full bg-[#f0ede8] text-black text-lg font-bold shadow-[0_0_30px_rgba(240,237,232,0.20)]">START</button>
          <button onClick={onClose} className="flex-1 py-4 rounded-full bg-white/10 text-white text-lg border border-white/10">CANCEL</button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── FULLSCREEN PREVIEW ───────────────────────────────────────────────────────
function FSPreview({ onClose }) {
  const backgrounds = useStore((s) => s.backgrounds);
  const current     = useStore((s) => s.currentBackground);
  const mode        = useStore((s) => s.mode);
  const time        = useStore((s) => s.time);
  const clock       = useLiveClock();
  const { w, h }   = useWindowSize();
  const landscape   = w > h;
  const containerRef = useRef(null);
  const fsListenerRef = useRef(false);

  useEffect(() => {
    const onFSChange = () => {
      if (!fsListenerRef.current) return;
      if (!document.fullscreenElement && !document.webkitFullscreenElement) {
        onClose();
      }
    };

    const t = setTimeout(() => {
      fsListenerRef.current = true;
      document.addEventListener("fullscreenchange", onFSChange);
      document.addEventListener("webkitfullscreenchange", onFSChange);
    }, 300);

    return () => {
      fsListenerRef.current = false;
      clearTimeout(t);
      document.removeEventListener("fullscreenchange", onFSChange);
      document.removeEventListener("webkitfullscreenchange", onFSChange);
      if (document.fullscreenElement || document.webkitFullscreenElement) {
        document.exitFullscreen?.().catch(() => {});
      }
    };
  }, []);

  // Auto-hide UI after 3s idle, reappear on touch/mousemove
  const [uiVisible, setUiVisible] = useState(true);
  const hideTimerRef = useRef(null);
  const resetHideTimer = () => {
    setUiVisible(true);
    clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => setUiVisible(false), 3000);
  };
  useEffect(() => {
    resetHideTimer();
    return () => clearTimeout(hideTimerRef.current);
  }, []);

  // Clock style: 0 = normal, 1 = flip
  const [clockStyle, setClockStyle] = useState(() => {
    try { return parseInt(localStorage.getItem("lsc_last_clock_style")) || 0; } catch { return 0; }
  });

  const updateClockStyle = (newStyle) => {
    setClockStyle(newStyle);
    try { localStorage.setItem("lsc_last_clock_style", String(newStyle)); } catch {}
  };
  const swipeStartX = useRef(null);
  const onSwipeStart = (e) => { swipeStartX.current = e.touches?.[0]?.clientX ?? e.clientX; };
  const onSwipeEnd   = (e) => {
    if (swipeStartX.current === null) return;
    const endX = e.changedTouches?.[0]?.clientX ?? e.clientX;
    const dx = swipeStartX.current - endX;
    if (Math.abs(dx) > 60) updateClockStyle(clockStyle === 0 ? 1 : 0);
    swipeStartX.current = null;
  };

  // Double-tap to close (touch) / double-click (mouse)
  const lastTouchFSRef = useRef(0);
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onTouchEnd = (e) => {
      if (e.target?.closest("button")) return;
      const now = Date.now();
      if (now - lastTouchFSRef.current < 350) {
        lastTouchFSRef.current = 0;
        onClose();
      } else {
        lastTouchFSRef.current = now;
      }
    };
    const onDblClick = (e) => {
      if (e.target?.closest("button")) return;
      onClose();
    };
    el.addEventListener("touchend", onTouchEnd, { passive: true });
    el.addEventListener("dblclick", onDblClick);
    return () => {
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("dblclick", onDblClick);
    };
  }, []);

  const handleClose = onClose;

  // HH:MM format for fullscreen preview
  const fsH = Math.floor(time/3600);
  const fsM = Math.floor((time%3600)/60);
  const fsS = time%60;
  const fsTimerDisplay = fsH > 0
    ? `${String(fsH).padStart(2,"0")}:${String(fsM).padStart(2,"0")}`
    : `${String(fsM).padStart(2,"0")}:${String(fsS).padStart(2,"0")}`;
  const minD = Math.min(w,h), maxD = Math.max(w,h);
  const isPhoneFS   = w < 640;
  const isTabletFS  = w >= 640 && w < 1100;
  const isDesktopFS = w >= 1100;
  // Phone — unchanged
  // Tablet (iPad) fullscreen — back to original
  // Desktop — slightly reduced
  const clockFs = isPhoneFS
    ? (landscape ? Math.min(maxD*0.22,280)  : Math.min(minD*0.30,220))
    : isTabletFS
    ? (landscape ? Math.min(maxD*0.22,280)  : Math.min(minD*0.30,220))
    : (landscape ? Math.min(maxD*0.26,360)  : Math.min(minD*0.38,320));
  const ampmFs = isPhoneFS
    ? (landscape ? Math.min(maxD*0.06,72)   : Math.min(minD*0.085,58))
    : isTabletFS
    ? (landscape ? Math.min(maxD*0.06,72)   : Math.min(minD*0.085,58))
    : (landscape ? Math.min(maxD*0.075,95)  : Math.min(minD*0.10,82));
  const timerFs = isPhoneFS
    ? (landscape ? Math.min(maxD*0.20,260)  : Math.min(minD*0.28,200))
    : isTabletFS
    ? (landscape ? Math.min(maxD*0.20,260)  : Math.min(minD*0.28,200))
    : (landscape ? Math.min(maxD*0.24,340)  : Math.min(minD*0.34,300));
  const bg = current !== -1 ? backgrounds[current] : null;

  return (
    <motion.div ref={containerRef} className="fixed inset-0 z-[2000] bg-black overflow-hidden"
      initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:0.3}}
      onMouseMove={resetHideTimer}
      onTouchStart={(e) => { resetHideTimer(); onSwipeStart(e); }}
      onTouchEnd={onSwipeEnd}
      onMouseDown={onSwipeStart}
      onMouseUp={onSwipeEnd}>
      <div className="absolute inset-0">
        {bg && (
          <video autoPlay loop muted playsInline controls={false} disablePictureInPicture className="w-full h-full object-cover">
            <source src={bg.video} type="video/mp4"/>
          </video>
        )}
        <div className="absolute inset-0 bg-black/20"/>
      </div>

      {/* CLOCK DISPLAY */}
      <AnimatePresence mode="wait">
        {clockStyle === 0 ? (
          <motion.div key="normal-clock"
            initial={{opacity:0, x: 60}} animate={{opacity:1, x:0}} exit={{opacity:0, x:-60}}
            transition={{duration:0.3}}
            className="absolute inset-0 flex items-center justify-center z-10" style={{paddingLeft: 50}}>
            {mode==="clock" ? (
              landscape ? (
                <div className="flex items-end gap-4">
                  <span className="text-white font-bold leading-none drop-shadow-lg" style={{fontSize:clockFs}}>{clock.full}</span>
                  <span className="text-white font-bold drop-shadow" style={{fontSize:ampmFs,marginBottom:clockFs*0.04}}>{clock.ampm}</span>
                </div>
              ) : (
                <div className="flex items-end gap-3">
                  <div className="flex flex-col items-center" style={{lineHeight:0.88}}>
                    <span className="text-white drop-shadow-lg" style={{fontSize:clockFs, fontFamily:"'Outfit', sans-serif", fontWeight:600}}>{clock.h}</span>
                    <span className="text-white drop-shadow-lg" style={{fontSize:clockFs, fontFamily:"'Outfit', sans-serif", fontWeight:600}}>{clock.m}</span>
                  </div>
                  <span className="text-white/70 drop-shadow pb-1" style={{fontSize:Math.min(clockFs*0.22,42), fontFamily:"'Outfit', sans-serif", fontWeight:300}}>{clock.ampm}</span>
                </div>
              )
            ) : (
              <span className="text-white font-bold drop-shadow-lg" style={{fontSize:timerFs,lineHeight:1}}>{fsTimerDisplay}</span>
            )}
          </motion.div>
        ) : (
          <motion.div key="flip-clock"
            initial={{opacity:0, x: 60}} animate={{opacity:1, x:0}} exit={{opacity:0, x:-60}}
            transition={{duration:0.3}}
            className="absolute inset-0 flex items-center justify-center z-10">
            <FlipClock
              cardSize={landscape ? Math.min(w*0.42, h*0.75) : (isPhoneFS ? Math.min(w*0.55, h*0.22) : Math.min(w*0.44, h*0.38))}
              isTimer={mode !== "clock"}
              timerDisplay={fsTimerDisplay}
              clock={clock}
              landscape={landscape}
              phonePortrait={isPhoneFS && !landscape}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Swipe hint dots */}
      <AnimatePresence>
        {uiVisible && (
          <motion.div key="dots" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
            className="absolute bottom-6 left-1/2 z-20 flex gap-2" style={{transform:"translateX(-50%)"}}>
            {[0,1].map(i => (
              <div key={i} style={{
                width: i === clockStyle ? 18 : 6, height: 6, borderRadius: 3,
                background: i === clockStyle ? "#f0ede8" : "rgba(255,255,255,0.35)",
                transition: "all 0.3s"
              }}/>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {uiVisible && (
          <motion.button
            key="fs-close-btn"
            initial={{opacity:0, scale:0.85}} animate={{opacity:1, scale:1}} exit={{opacity:0, scale:0.85}}
            transition={{duration:0.25}}
            onClick={handleClose}
            className="absolute bottom-5 left-5 z-20 flex items-center justify-center text-white transition-all active:scale-90"
            style={{ background: "none", border: "none", padding: 8, filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.6))" }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="4 14 10 14 10 20"/>
              <polyline points="20 10 14 10 14 4"/>
              <line x1="10" y1="14" x2="3" y2="21"/>
              <line x1="21" y1="3" x2="14" y2="10"/>
            </svg>
          </motion.button>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── FLIP CLOCK ──────────────────────────────────────────────────────────────
function FlipCard({ value, size, ampm }) {
  const [current, setCurrent] = useState(value);
  const [next,    setNext]    = useState(value);
  const [flipping, setFlipping] = useState(false);

  useEffect(() => {
    if (value === current) return;
    setNext(value);
    setFlipping(true);
    const t = setTimeout(() => {
      setCurrent(value);
      setFlipping(false);
    }, 420);
    return () => clearTimeout(t);
  }, [value]);

  const w = size, h = size, r = size * 0.08, fs = size * 0.52;
  const numStyle = { fontSize: fs, fontWeight: 800, color: "#fff", lineHeight: 1, fontFamily: "'Outfit','DM Sans',sans-serif", userSelect:"none", letterSpacing:"-0.02em" };
  const glassBg  = "rgba(30,30,30,0.55)";
  const glassStyle = { backdropFilter:"blur(24px) saturate(160%)", WebkitBackdropFilter:"blur(24px) saturate(160%)", border:"1px solid rgba(255,255,255,0.08)" };

  return (
    <div style={{ width: w, height: h, position: "relative", perspective: 800 }}>

      {/* TOP STATIC — upper half of current digit */}
      <div style={{
        position:"absolute", top:0, left:0, width:w, height: h/2,
        ...glassStyle, background:glassBg, borderRadius:`${r}px ${r}px 0 0`,
        overflow:"hidden", display:"flex", alignItems:"flex-end", justifyContent:"center",
      }}>
        <span style={{...numStyle, transform:`translateY(50%)`}}>{current}</span>
      </div>

      {/* BOTTOM STATIC — lower half of next digit (revealed after flip) */}
      <div style={{
        position:"absolute", bottom:0, left:0, width:w, height: h/2,
        ...glassStyle, background:glassBg, borderRadius:`0 0 ${r}px ${r}px`,
        overflow:"hidden", display:"flex", alignItems:"flex-start", justifyContent:"center",
      }}>
        <span style={{...numStyle, transform:`translateY(-50%)`}}>{next}</span>
      </div>

      {/* FLIP TOP — folds down (0° → -90°), shows old top half */}
      {flipping && (
        <motion.div
          initial={{ rotateX: 0 }} animate={{ rotateX: -90 }}
          transition={{ duration: 0.21, ease: "easeIn" }}
          style={{
            position:"absolute", top:0, left:0, width:w, height: h/2,
            ...glassStyle, background:glassBg, borderRadius:`${r}px ${r}px 0 0`,
            overflow:"hidden", transformOrigin:"50% 100%",
            display:"flex", alignItems:"flex-end", justifyContent:"center",
            zIndex:3,
          }}>
          <span style={{...numStyle, transform:`translateY(50%)`}}>{current}</span>
        </motion.div>
      )}

      {/* FLIP BOTTOM — unfolds down (90° → 0°), shows new bottom half */}
      {flipping && (
        <motion.div
          initial={{ rotateX: 90 }} animate={{ rotateX: 0 }}
          transition={{ duration: 0.21, ease: "easeOut", delay: 0.21 }}
          style={{
            position:"absolute", bottom:0, left:0, width:w, height: h/2,
            ...glassStyle, background:glassBg, borderRadius:`0 0 ${r}px ${r}px`,
            overflow:"hidden", transformOrigin:"50% 0%",
            display:"flex", alignItems:"flex-start", justifyContent:"center",
            zIndex:3,
          }}>
          <span style={{...numStyle, transform:`translateY(-50%)`}}>{next}</span>
        </motion.div>
      )}

      {/* Center seam */}
      <div style={{ position:"absolute", top:"50%", left:0, right:0, height:3, background:"#000", zIndex:4, transform:"translateY(-50%)" }}/>
      {/* Left screw */}
      <div style={{ position:"absolute", top:"50%", left:w*0.07, transform:"translateY(-50%)", zIndex:5,
        width:w*0.06, height:w*0.06, borderRadius:"50%", background:"#2e2e2e", border:"1.5px solid #444" }}/>
      {/* Right screw */}
      <div style={{ position:"absolute", top:"50%", right:w*0.07, transform:"translateY(-50%)", zIndex:5,
        width:w*0.06, height:w*0.06, borderRadius:"50%", background:"#2e2e2e", border:"1.5px solid #444" }}/>
      {ampm && (
        <span style={{
          position:"absolute", bottom: w*0.07, left: w*0.09, zIndex:6,
          fontSize: w*0.12, fontWeight:500, color:"rgba(255,255,255,0.45)",
          fontFamily:"'Outfit',sans-serif", letterSpacing:"0.08em"
        }}>{ampm}</span>
      )}
    </div>
  );
}

function FlipClock({ cardSize, isTimer, timerDisplay, clock, phonePortrait }) {
  const gap = phonePortrait ? cardSize * 0.06 : cardSize * 0.1;

  if (isTimer) {
    const [mm, ss] = timerDisplay.split(":");
    return (
      <div style={{ display:"flex", flexDirection: phonePortrait?"column":"row", alignItems:"center", gap }}>
        <FlipCard value={mm} size={phonePortrait ? cardSize*1.6 : cardSize}/>
        <FlipCard value={ss} size={phonePortrait ? cardSize*1.6 : cardSize}/>
      </div>
    );
  }

  const hStr = String(clock.rawH).padStart(2,"0");
  const mStr = String(clock.rawM).padStart(2,"0");
  return (
    <div style={{ display:"flex", flexDirection: phonePortrait?"column":"row", alignItems:"center", gap }}>
      <FlipCard value={hStr} size={phonePortrait ? cardSize*1.6 : cardSize} ampm={clock.ampm}/>
      <FlipCard value={mStr} size={phonePortrait ? cardSize*1.6 : cardSize}/>
    </div>
  );
}


// ─── THREE DOT MENU BUTTON ────────────────────────────────────────────────────
function BgMenuBtn({ bg, size = 16 }) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState(() => isBackgroundCached(bg.name) ? "cached" : "idle");
  const [progress, setProgress] = useState(0);
  const menuRef = useRef(null);
  const abortRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler);
    return () => { document.removeEventListener("mousedown", handler); document.removeEventListener("touchstart", handler); };
  }, [open]);

  const handleDownload = async (e) => {
    e.stopPropagation();
    setOpen(false);
    setStatus("downloading");
    setProgress(0);
    abortRef.current = new AbortController();
    try {
      await cacheBackground(bg, ({ percent }) => setProgress(Math.round(percent * 100)), abortRef.current.signal);
      setStatus("cached");
    } catch (err) {
      // Aborted or failed — clean up partial cache
      await uncacheBackground(bg);
      setStatus("idle");
    }
    abortRef.current = null;
  };

  const handleCancel = (e) => {
    e.stopPropagation();
    if (abortRef.current) abortRef.current.abort();
    setStatus("idle");
    setProgress(0);
    setOpen(false);
  };

  const handleRemove = async (e) => {
    e.stopPropagation();
    setOpen(false);
    await uncacheBackground(bg);
    setStatus("idle");
  };

  return (
    <div ref={menuRef} style={{ position:"absolute", top:6, right:6, zIndex:10 }} onClick={e => e.stopPropagation()}>
      {/* Button */}
      {status === "downloading" ? (
        <button onClick={e => { e.stopPropagation(); setOpen(o => !o); }}
          style={{ width:26, height:26, borderRadius:"50%", border:"none", cursor:"pointer",
            background:"rgba(0,0,0,0.65)", display:"flex", alignItems:"center", justifyContent:"center", position:"relative" }}>
          <svg width={22} height={22} viewBox="0 0 36 36" style={{position:"absolute"}}>
            <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="3"/>
            <circle cx="18" cy="18" r="15" fill="none" stroke="#f0ede8" strokeWidth="3"
              strokeDasharray={`${progress * 0.942} 94.2`} strokeLinecap="round"
              transform="rotate(-90 18 18)"/>
          </svg>
        </button>
      ) : (
        <button onClick={e => { e.stopPropagation(); setOpen(o => !o); }}
          style={{ width:26, height:26, borderRadius:"50%", border:"none", cursor:"pointer",
            background:"rgba(0,0,0,0.55)", display:"flex", alignItems:"center", justifyContent:"center" }}>
          <svg width={14} height={14} viewBox="0 0 24 24" fill="rgba(255,255,255,0.85)">
            <circle cx="12" cy="5"  r="1.5"/>
            <circle cx="12" cy="12" r="1.5"/>
            <circle cx="12" cy="19" r="1.5"/>
          </svg>
        </button>
      )}

      {/* Dropdown */}
      {open && (
        <motion.div
          initial={{ opacity:0, scale:0.9, y:-4 }}
          animate={{ opacity:1, scale:1, y:0 }}
          exit={{ opacity:0, scale:0.9 }}
          transition={{ duration:0.12 }}
          style={{
            position:"absolute", top:30, right:0, zIndex:20,
            background:"rgba(18,22,18,0.85)", backdropFilter:"blur(24px) saturate(180%)",
            WebkitBackdropFilter:"blur(24px) saturate(180%)",
            border:"1px solid rgba(255,255,255,0.12)", borderRadius:10,
            minWidth:130, overflow:"hidden",
            boxShadow:"0 8px 24px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06)",
          }}>
          {status === "downloading" ? (
            // Show cancel option while downloading
            <>
              <div style={{ padding:"8px 14px 4px", fontSize:10, color:"rgba(255,255,255,0.35)", fontFamily:"'DM Sans',sans-serif", letterSpacing:"0.05em" }}>
                {progress}% downloaded
              </div>
              <button onClick={handleCancel} style={{
                width:"100%", padding:"9px 14px", border:"none", cursor:"pointer",
                background:"transparent", color:"rgba(255,100,100,0.9)", fontSize:12,
                fontFamily:"'DM Sans',sans-serif", textAlign:"left", display:"flex",
                alignItems:"center", gap:7, fontWeight:600,
              }}>
                <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
                </svg>
                Cancel
              </button>
            </>
          ) : status === "cached" ? (
            <button onClick={handleRemove} style={{
              width:"100%", padding:"9px 14px", border:"none", cursor:"pointer",
              background:"transparent", color:"rgba(255,100,100,0.9)", fontSize:12,
              fontFamily:"'DM Sans',sans-serif", textAlign:"left", display:"flex",
              alignItems:"center", gap:7, fontWeight:600,
            }}>
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M9 6V4h6v2"/>
              </svg>
              Remove
            </button>
          ) : (
            <button onClick={handleDownload} style={{
              width:"100%", padding:"9px 14px", border:"none", cursor:"pointer",
              background:"rgba(240,237,232,0.12)",
              backdropFilter:"blur(16px)", WebkitBackdropFilter:"blur(16px)",
              borderTop:"1px solid rgba(240,237,232,0.15)",
              color:"#f0ede8", fontSize:12,
              fontFamily:"'DM Sans',sans-serif", textAlign:"left", display:"flex",
              alignItems:"center", gap:7, fontWeight:600, letterSpacing:"0.02em",
            }}>
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Download
            </button>
          )}
        </motion.div>
      )}
    </div>
  );
}

function AmbienceGrid({ cardH=100, count=6 }) {
  const backgrounds = useStore((s) => s.backgrounds);
  const current     = useStore((s) => s.currentBackground);
  const setBackground = useStore((s) => s.setBackground);
  const recentBackgrounds = useStore((s) => s.recentBackgrounds);
  const allBgs = [...backgrounds.map((b,i)=>({...b,storeIndex:i})),...EXTRA_BGS];
  // Sort by recently used first
  const all = [...allBgs].sort((a, b) => {
    const ai = recentBackgrounds.indexOf(a.name);
    const bi = recentBackgrounds.indexOf(b.name);
    if (ai === -1 && bi === -1) return 0;
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  }).slice(0, count);
  return (
    <div className="grid grid-cols-2 gap-2.5">
      {/* No Background tile */}
      <motion.div whileTap={{scale:0.95}} onClick={()=>setBackground(-1)}
        className={`relative rounded-[16px] overflow-hidden cursor-pointer border-2 transition-all flex flex-col items-center justify-center gap-1.5 ${current===-1?"border-[#f0ede8] shadow-[0_0_14px_rgba(240,237,232,0.35)]":"border-white/15"}`}
        style={{height:cardH, background:"rgba(0,0,0,0.7)"}}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={current===-1?"#f0ede8":"rgba(255,255,255,0.4)"} strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
        <p className="text-[11px] font-bold" style={{color:current===-1?"#f0ede8":"rgba(255,255,255,0.5)"}}>No Background</p>
      </motion.div>
      {all.map((bg,i)=>{
        const idx=bg.storeIndex??null;
        return (
          <motion.div key={i} whileTap={{scale:0.95}} onClick={()=>idx!=null&&setBackground(idx)}
            className={`relative rounded-[16px] overflow-hidden cursor-pointer border-2 transition-all ${current===idx&&idx!=null?"border-[#f0ede8] shadow-[0_0_14px_rgba(240,237,232,0.35)]":"border-transparent"}`}
            style={{height:cardH}}>
            <img src={bg.thumbnail} alt={bg.name} className="w-full h-full object-cover"/>
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent"/>
            <div className="absolute top-2 left-2 flex items-center gap-1 bg-[#f0ede8]/90 px-1.5 py-0.5 rounded-full">
              <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"/>
              <span className="text-[8px] text-black font-bold">LIVE</span>
            </div>
            <p className="absolute bottom-2 left-2.5 text-white text-[11px] font-bold drop-shadow">{bg.name}</p>
            <BgMenuBtn bg={bg}/>
          </motion.div>
        );
      })}
    </div>
  );
}

// ─── AMBIENCE ROW (horizontal scroll) ────────────────────────────────────────
function AmbienceRow({ cardW=150, cardH=105, count=8, onViewAll, labelSize="sm" }) {
  const backgrounds   = useStore((s) => s.backgrounds);
  const current       = useStore((s) => s.currentBackground);
  const setBackground = useStore((s) => s.setBackground);
  const recentBackgrounds = useStore((s) => s.recentBackgrounds);
  const allBgs = [...backgrounds.map((b,i)=>({...b,storeIndex:i})),...EXTRA_BGS];
  const all = [...allBgs].sort((a, b) => {
    const ai = recentBackgrounds.indexOf(a.name);
    const bi = recentBackgrounds.indexOf(b.name);
    if (ai === -1 && bi === -1) return 0;
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  }).slice(0, count);
  return (
    <div>
      <div className={`flex items-center justify-between mb-3 ${labelSize==="lg"?"px-0":""}`}>
        <span className={`text-white font-bold tracking-widest uppercase ${labelSize==="lg"?"text-sm":"text-xs"}`}>Immersive Ambiences</span>
        <button onClick={onViewAll} className={`text-[#f0ede8] font-semibold ${labelSize==="lg"?"text-sm":"text-xs"}`}>View All</button>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1" style={{scrollbarWidth:"none"}}>
        {/* No Background tile */}
        <motion.div whileTap={{scale:0.95}} whileHover={{scale:1.02}}
          onClick={()=>setBackground(-1)}
          className={`relative flex-shrink-0 rounded-[18px] overflow-hidden cursor-pointer border-2 transition-all flex flex-col items-center justify-center gap-2 ${current===-1?"border-[#f0ede8] shadow-[0_0_18px_rgba(240,237,232,0.35)]":"border-white/10 hover:border-white/20"}`}
          style={{width:cardW,height:cardH,background:"rgba(0,0,0,0.6)"}}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={current===-1?"#f0ede8":"rgba(255,255,255,0.35)"} strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
          <p className="text-xs font-bold text-center px-2" style={{color:current===-1?"#f0ede8":"rgba(255,255,255,0.4)"}}>No Background</p>
        </motion.div>
        {all.map((bg,i)=>{
          const idx=bg.storeIndex??null;
          return (
            <motion.div key={i} whileTap={{scale:0.95}} whileHover={{scale:1.02}}
              onClick={()=>idx!=null&&setBackground(idx)}
              className={`relative flex-shrink-0 rounded-[18px] overflow-hidden cursor-pointer border-2 transition-all ${current===idx&&idx!=null?"border-[#f0ede8] shadow-[0_0_18px_rgba(240,237,232,0.35)]":"border-transparent hover:border-white/20"}`}
              style={{width:cardW,height:cardH}}>
              <img src={bg.thumbnail} alt={bg.name} className="w-full h-full object-cover"/>
              <div className="absolute inset-0 bg-gradient-to-t from-black/65 to-transparent"/>
              <div className="absolute top-2 right-2 flex items-center gap-1 bg-[#f0ede8]/90 px-1.5 py-0.5 rounded-full">
                <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"/>
                <span className="text-[8px] text-black font-bold">LIVE</span>
              </div>
              <p className="absolute bottom-2.5 left-3 text-white text-xs font-bold drop-shadow">{bg.name}</p>
              <BgMenuBtn bg={bg}/>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// ─── EXPLORE MODAL ────────────────────────────────────────────────────────────
function ExploreModal({ onClose, desktop=false }) {
  const backgrounds   = useStore((s) => s.backgrounds);
  const setBackground = useStore((s) => s.setBackground);
  const [search, setSearch] = useState("");
  const [cat, setCat]       = useState("All");
  const [preview, setPreview] = useState(null);
  const allBgs = [
    ...backgrounds.map((b,i)=>({...b,storeIndex:i,desc:BG_DESCS[b.name]||"Ambient sounds",category:BG_CATS[b.name]||"Nature"})),
    ...EXTRA_BGS,
  ];
  const filtered = allBgs.filter(b=>(cat==="All"||b.category===cat)&&(b.name.toLowerCase().includes(search.toLowerCase())||b.desc.toLowerCase().includes(search.toLowerCase())));

  if (desktop) {
    return (
      <motion.div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 backdrop-blur-sm"
        initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}>
        <motion.div initial={{scale:0.92,opacity:0}} animate={{scale:1,opacity:1}} exit={{scale:0.92,opacity:0}} transition={{duration:0.25}}
          className="w-[85vw] max-w-[1100px] max-h-[88vh] rounded-[36px] border border-white/15 flex flex-col overflow-hidden"
          style={{background:"rgba(255,255,255,0.07)", backdropFilter:"blur(40px) saturate(160%)", WebkitBackdropFilter:"blur(40px) saturate(160%)", boxShadow:"0 32px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.12)"}}>
          <div className="flex items-start justify-between px-10 pt-9 pb-5 flex-shrink-0">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-[#f0ede8]/15 flex items-center justify-center">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f0ede8" strokeWidth="2.5"><path d="M17 8C8 10 5.9 16.17 3.82 21"/><path d="M9.1 10.1c1.9-3.1 5.9-6.1 11.9-8.1 0 6-2.9 10.9-8.9 13.9"/></svg>
              </div>
              <div>
                <h2 className="text-white text-3xl font-bold">Explore <span className="text-[#f0ede8]">Live</span> Backgrounds</h2>
                <p className="text-white/40 text-sm mt-0.5">Discover the perfect atmosphere for your focus.</p>
              </div>
            </div>
            <button onClick={onClose} className="w-11 h-11 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/60 hover:text-white transition-all">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div className="flex gap-3 px-10 mb-4 flex-shrink-0">
            <div className="flex-1 flex items-center gap-3 bg-[#f0ede8]/5 rounded-2xl px-5 py-3.5 border border-[#f0ede8]/20">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f0ede8" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Search live backgrounds..." className="bg-transparent text-white flex-1 outline-none placeholder-white/30 text-sm"/>
            </div>
            <button className="px-5 rounded-2xl bg-white/5 border border-white/10 text-white/50 text-sm flex items-center gap-2">
              All Categories <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
            </button>
            <button className="px-4 rounded-2xl bg-white/5 border border-white/10 text-white/50 flex items-center gap-2 text-sm">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="10" y1="18" x2="14" y2="18"/></svg>Filters
            </button>
          </div>
          <div className="flex gap-2 px-10 mb-5 flex-wrap flex-shrink-0">
            {CATS.map(c=>(
              <button key={c} onClick={()=>setCat(c)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border transition-all ${cat===c?"bg-[#f0ede8]/20 text-[#f0ede8] border-[#f0ede8]/40":"bg-white/5 text-white/50 border-white/10 hover:text-white/70"}`}>
                {CAT_ICONS[c]}{c}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto px-10 pb-8" style={{scrollbarWidth:"none"}}>
            <div className="grid grid-cols-4 gap-4">
              {filtered.map((bg,i)=>(
                <motion.div key={i} whileHover={{scale:1.03}} whileTap={{scale:0.97}} onClick={()=>setPreview(bg)}
                  className="relative rounded-2xl overflow-hidden cursor-pointer border border-white/10 hover:border-[#f0ede8]/40 transition-all group" style={{height:170}}>
                  <img src={bg.thumbnail} alt={bg.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"/>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent"/>
                  <div className="absolute top-3 left-3 flex items-center gap-1 bg-[#f0ede8]/90 px-2 py-0.5 rounded-full">
                    <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"/><span className="text-[9px] text-black font-bold">LIVE</span>
                  </div>
                  <div className="absolute top-3 right-3 w-7 h-7 rounded-full bg-black/40 flex items-center justify-center">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 010 7.07"/></svg>
                  </div>
                  <div className="absolute bottom-3 left-3 right-10">
                    <h3 className="text-white font-bold text-sm">{bg.name}</h3>
                    <p className="text-white/50 text-xs mt-0.5">{bg.desc}</p>
                  </div>
                  <div className="absolute bottom-3 right-3 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all border border-white/20">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                  </div>
                  <BgMenuBtn bg={bg} size={14}/>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
        <AnimatePresence>
          {preview&&(
            <motion.div className="fixed inset-0 z-[1100] bg-black/80 backdrop-blur-xl flex items-center justify-center"
              initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}>
              <motion.div initial={{scale:0.9}} animate={{scale:1}} exit={{scale:0.9}}
                className="relative w-[78vw] h-[78vh] rounded-[36px] overflow-hidden border border-[#f0ede8]/30">
                <video autoPlay loop muted playsInline controls={false} disablePictureInPicture className="absolute inset-0 w-full h-full object-cover">
                  <source src={preview.video} type="video/mp4"/>
                </video>
                <div className="absolute inset-0 bg-black/25"/>
                <div className="absolute top-8 left-8 z-20">
                  <h2 className="text-white text-5xl font-bold">{preview.name}</h2>
                  <p className="text-white/60 text-xl mt-2">{preview.desc}</p>
                </div>
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-4 z-20">
                  <button onClick={()=>{if(preview.storeIndex!=null)setBackground(preview.storeIndex);setPreview(null);onClose();}} className="px-10 py-4 rounded-full bg-[#f0ede8] text-black text-xl font-bold">APPLY</button>
                  <button onClick={()=>setPreview(null)} className="px-10 py-4 rounded-full bg-white/10 text-white text-xl border border-white/20">CLOSE</button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  }

  // Mobile/tablet slide-in
  return (
    <motion.div className="fixed inset-0 z-[1000] bg-[#080d08] flex flex-col"
      initial={{x:"100%"}} animate={{x:0}} exit={{x:"100%"}} transition={{duration:0.28,ease:"easeOut"}}>
      <div className="flex items-start justify-between px-5 pt-10 pb-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#f0ede8]/15 flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f0ede8" strokeWidth="2.5"><path d="M17 8C8 10 5.9 16.17 3.82 21"/><path d="M9.1 10.1c1.9-3.1 5.9-6.1 11.9-8.1 0 6-2.9 10.9-8.9 13.9"/></svg>
          </div>
          <div>
            <h1 className="text-white text-lg font-bold">Explore <span className="text-[#f0ede8]">Live</span> Backgrounds</h1>
            <p className="text-white/40 text-xs">Discover the perfect atmosphere.</p>
          </div>
        </div>
        <button onClick={onClose} className="w-10 h-10 rounded-2xl bg-white/8 border border-white/10 flex items-center justify-center text-white/60">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div className="flex gap-2 mx-5 mb-3 flex-shrink-0">
        <div className="flex-1 flex items-center gap-2 bg-[#f0ede8]/5 rounded-2xl px-4 py-3 border border-[#f0ede8]/20">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#f0ede8" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Search live backgrounds..." className="bg-transparent text-white text-sm flex-1 outline-none placeholder-white/30"/>
        </div>
        <button className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-white/5 border border-white/10 text-white/50 text-xs font-medium">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="10" y1="18" x2="14" y2="18"/></svg>Filters
        </button>
      </div>
      <div className="flex gap-2 px-5 mb-3 overflow-x-auto flex-shrink-0" style={{scrollbarWidth:"none"}}>
        {CATS.map(c=>(
          <button key={c} onClick={()=>setCat(c)}
            className={`flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${cat===c?"bg-[#f0ede8]/20 text-[#f0ede8] border-[#f0ede8]/40":"bg-white/5 text-white/50 border-white/10"}`}>
            {CAT_ICONS[c]}{c}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto px-5 pb-6" style={{scrollbarWidth:"none"}}>
        <div className="grid grid-cols-2 gap-3">
          {filtered.map((bg,i)=>(
            <motion.div key={i} whileTap={{scale:0.97}} onClick={()=>setPreview(bg)}
              className="relative rounded-2xl overflow-hidden cursor-pointer" style={{height:130}}>
              <img src={bg.thumbnail} alt={bg.name} className="w-full h-full object-cover"/>
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent"/>
              <BgMenuBtn bg={bg} size={13}/>
              <div className="absolute bottom-2.5 left-3 right-3">
                <p className="text-white font-bold text-xs leading-tight">{bg.name}</p>
                <p className="text-white/55 text-[10px] mt-0.5">{bg.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
      <AnimatePresence>
        {preview&&(
          <motion.div className="fixed inset-0 z-[1100] bg-black/80 backdrop-blur-xl flex items-center justify-center"
            initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}>
            <motion.div initial={{scale:0.9}} animate={{scale:1}} exit={{scale:0.9}}
              className="relative w-[92vw] rounded-[28px] overflow-hidden border border-[#f0ede8]/30" style={{height:"58vh"}}>
              <video autoPlay loop muted playsInline controls={false} className="absolute inset-0 w-full h-full object-cover">
                <source src={preview.video} type="video/mp4"/>
              </video>
              <div className="absolute inset-0 bg-black/30"/>
              <div className="absolute top-5 left-5 z-20">
                <h2 className="text-white text-xl font-bold">{preview.name}</h2>
                <p className="text-white/60 text-sm mt-1">{preview.desc}</p>
              </div>
              <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-3 z-20">
                <button onClick={()=>{if(preview.storeIndex!=null)setBackground(preview.storeIndex);setPreview(null);onClose();}} className="px-7 py-3 rounded-full bg-[#f0ede8] text-black font-bold">APPLY</button>
                <button onClick={()=>setPreview(null)} className="px-7 py-3 rounded-full bg-white/10 text-white border border-white/20">CLOSE</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── DESKTOP SIDEBAR ─────────────────────────────────────────────────────────
function DesktopSidebar({ open, onClose, onViewAll }) {
  const backgrounds   = useStore((s) => s.backgrounds);
  const current       = useStore((s) => s.currentBackground);
  const setBackground = useStore((s) => s.setBackground);
  const recentBackgrounds = useStore((s) => s.recentBackgrounds);

  const allBgs = [...backgrounds.map((b,i)=>({...b,storeIndex:i})),...EXTRA_BGS];
  const INITIAL = 6;
  const sorted = [...allBgs].sort((a, b) => {
    const ai = recentBackgrounds.indexOf(a.name);
    const bi = recentBackgrounds.indexOf(b.name);
    if (ai === -1 && bi === -1) return 0;
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });
  const visible = sorted.slice(0, INITIAL - 1);
  const hasMore = allBgs.length > INITIAL - 1;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-[800]"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            style={{ background: "rgba(0,0,0,0.35)", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)" }}
          />
          {/* Sidebar panel */}
          <motion.div
            className="fixed top-0 right-0 h-full z-[900] flex flex-col"
            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 260 }}
            style={{
              width: 360,
              background: "rgba(15,20,15,0.45)",
              backdropFilter: "blur(48px) saturate(180%)",
              WebkitBackdropFilter: "blur(48px) saturate(180%)",
              borderLeft: "1px solid rgba(255,255,255,0.18)",
              boxShadow: "-8px 0 40px rgba(0,0,0,0.35), inset 1px 0 0 rgba(255,255,255,0.08)",
            }}>

            {/* Header */}
            <div className="flex items-center justify-between flex-shrink-0"
              style={{ padding: "18px 20px 14px", borderBottom: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.04)" }}>
              <span className="text-white text-xs font-bold tracking-widest uppercase">Immersive Ambiences</span>
              <button onClick={onClose}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-white/50 hover:text-white transition-all"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            {/* Scrollable grid */}
            <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "none", padding: "16px 16px 24px" }}>
              <div className="grid grid-cols-2 gap-2.5">

                {/* No Background tile — exact match to AmbienceGrid */}
                <motion.div whileTap={{ scale: 0.95 }}
                  onClick={() => { setBackground(-1); onClose(); }}
                  className={`relative rounded-[16px] overflow-hidden cursor-pointer border-2 transition-all flex flex-col items-center justify-center gap-1.5 ${current === -1 ? "border-[#f0ede8] shadow-[0_0_14px_rgba(240,237,232,0.35)]" : "border-white/15"}`}
                  style={{ height: 100, background: "rgba(0,0,0,0.7)" }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                    stroke={current === -1 ? "#f0ede8" : "rgba(255,255,255,0.4)"} strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
                  </svg>
                  <p className="text-[11px] font-bold" style={{ color: current === -1 ? "#f0ede8" : "rgba(255,255,255,0.5)" }}>No Background</p>
                </motion.div>

                {/* Ambience tiles — exact match to AmbienceGrid */}
                {visible.map((bg, i) => {
                  const idx = bg.storeIndex ?? null;
                  const isActive = current === idx && idx != null;
                  return (
                    <motion.div key={i} whileTap={{ scale: 0.95 }}
                      onClick={() => { if (idx != null) { setBackground(idx); onClose(); } }}
                      className={`relative rounded-[16px] overflow-hidden cursor-pointer border-2 transition-all ${isActive ? "border-[#f0ede8] shadow-[0_0_14px_rgba(240,237,232,0.35)]" : "border-transparent"}`}
                      style={{ height: 100 }}>
                      <img src={bg.thumbnail} alt={bg.name} className="w-full h-full object-cover"/>
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent"/>
                      <BgMenuBtn bg={bg} size={13}/>
                      <p className="absolute bottom-2 left-2.5 text-white text-[11px] font-bold drop-shadow">{bg.name}</p>
                    </motion.div>
                  );
                })}
              </div>

              {/* View More — opens ExploreModal */}
              {hasMore && (
                <button
                  onClick={() => { onClose(); onViewAll(); }}
                  className="w-full mt-3 py-2.5 rounded-[14px] text-xs font-semibold transition-all flex items-center justify-center gap-1.5 hover:bg-white/10"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#f0ede8" }}>
                  View More
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 9l6 6 6-6"/></svg>
                </button>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── TIMER CONTROLS (START/PAUSE + RESET) ────────────────────────────────────
function TimerControls({ isPhone }) {
  const mode          = useStore((s) => s.mode);
  const running       = useStore((s) => s.running);
  const toggleRunning = useStore((s) => s.toggleRunning);
  const resetTimer    = useStore((s) => s.resetTimer);
  return (
    <>
      <motion.button whileTap={{scale:0.95}}
        onClick={toggleRunning}
        className="rounded-full bg-[#f0ede8] text-black font-bold shadow-[0_0_30px_rgba(240,237,232,0.25)]"
        style={{padding: isPhone?"10px 36px":"13px 52px", fontSize: isPhone?15:18}}>
        {running ? "PAUSE" : "START"}
      </motion.button>
      {mode !== "long" && (
        <motion.button whileTap={{scale:0.95}}
          onClick={resetTimer}
          className="rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center border border-white/20 text-white"
          style={{width: isPhone?44:52, height: isPhone?44:52}}>
          {IcoReset(isPhone?17:20)}
        </motion.button>
      )}
    </>
  );
}

// ─── BEEP on timer end ───────────────────────────────────────────────────────
// Global AudioContext — created on first user gesture to unlock audio on mobile
let globalAudioCtx = null;
function getAudioCtx() {
  if (!globalAudioCtx) {
    globalAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (globalAudioCtx.state === "suspended") globalAudioCtx.resume();
  return globalAudioCtx;
}
function unlockAudio() { try { getAudioCtx(); } catch(e) {} }

function useTimerEndBeep(time, mode) {
  const beeped = useRef(false);
  const prevMode = useRef(mode);
  useEffect(() => {
    // Reset beeped whenever mode changes so each timer gets its own beep
    if (prevMode.current !== mode) {
      beeped.current = false;
      prevMode.current = mode;
    }
    if ((mode === "short" || mode === "long") && time === 0 && !beeped.current) {
      beeped.current = true;
      try {
        const ctx = getAudioCtx();
        const beep = (freq, start, dur) => {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.connect(g); g.connect(ctx.destination);
          o.frequency.value = freq;
          o.type = "sine";
          g.gain.setValueAtTime(0.4, ctx.currentTime + start);
          g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur);
          o.start(ctx.currentTime + start);
          o.stop(ctx.currentTime + start + dur);
        };
        beep(880, 0, 0.18);
        beep(880, 0.22, 0.18);
        beep(1100, 0.44, 0.35);
      } catch(e) {}
    }
    if (time > 0) beeped.current = false;
  }, [time, mode]);
}

// ─── MAIN LAYOUT (used for ALL sizes) ────────────────────────────────────────
function MainLayout() {
  const mode    = useStore((s) => s.mode);
  const time    = useStore((s) => s.time);
  const running = useStore((s) => s.running);
  const currentBg = useStore((s) => s.currentBackground);

  const [showExplore,   setShowExplore]   = useState(false);
  const [showSetTime,   setShowSetTime]   = useState(false);
  const [showFSPreview, setShowFSPreview] = useState(false);
  const [showSidebar,   setShowSidebar]   = useState(false);
  const { enterPiP } = usePiPWidget();
  const openFullscreen = () => {
    setShowFSPreview(true);
    // Request native fullscreen immediately from user gesture
    const el = document.documentElement;
    try {
      if (el.requestFullscreen) el.requestFullscreen().catch(()=>{});
      else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
    } catch {}
  };

  useTimerEndBeep(time, mode);

  const clock    = useLiveClock();
  const { w, h } = useWindowSize();

  // Timer display: HH:MM when >=1hr, MM:SS when <1hr
  const timerHours = Math.floor(time / 3600);
  const timerMins  = Math.floor((time % 3600) / 60);
  const timerSecs  = time % 60;
  const timerFmt   = timerHours > 0
    ? `${String(timerHours).padStart(2,"0")}:${String(timerMins).padStart(2,"0")}`
    : `${String(timerMins).padStart(2,"0")}:${String(timerSecs).padStart(2,"0")}`;

  // Breakpoints
  const isPortrait = h > w;
  const isPhoneLandscape = !isPortrait && h < 500; // phone rotated sideways
  const isTabletLandscape = !isPortrait && h >= 500 && w < 1100; // tablet rotated sideways
  const isPhone   = w < 640 && isPortrait;         // portrait phone only
  const isTablet  = (w >= 640 && w < 1100) && isPortrait; // tablet portrait only
  const isDesktop = w >= 1100 || isPhoneLandscape || isTabletLandscape; // pc + any landscape tablet/phone

  // Desktop only: auto PiP when tab/window is hidden (minimized)
  useEffect(() => {
    if (!isDesktop) return;
    const onHide = () => { if (document.visibilityState === "hidden") enterPiP(); };
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, [isDesktop]);
  const clockFs = isPhone
    ? Math.min(w * 0.30, 160)
    : isTablet
    ? (isPortrait ? Math.min(w * 0.16, 180) : Math.min(w * 0.20, 240))
    : Math.min(w * 0.088, 152);

  const ampmFs = isPhone
    ? Math.min(w * 0.044, 22)
    : isTablet
    ? (isPortrait ? Math.min(w * 0.052, 60) : Math.min(w * 0.065, 80))
    : Math.min(w * 0.03, 54);

  const timerFs = isPhone
    ? Math.min(w * 0.22, 130)
    : isTablet
    ? (isPortrait ? Math.min(w * 0.18, 210) : Math.min(w * 0.22, 270))
    : Math.min(w * 0.095, 160);

  // Ambience row card sizes
  const cardW = isPhone ? 0 : isTablet ? Math.min(w*0.18,165) : Math.min(w*0.14,195);
  const cardH = isPhone ? 0 : isTablet ? Math.min(h*0.13,115) : Math.min(h*0.15,130);

  // Double-tap (touch) / double-click (mouse) to open fullscreen — works on all devices
  const overlayRef = useRef(null);
  const lastTouchRef = useRef(0);

  useEffect(() => {
    const el = overlayRef.current;
    if (!el) return;
    const onTouchEnd = (e) => {
      if (e.target?.closest("button, a, input, select, textarea, [role='button']")) return;
      const now = Date.now();
      if (now - lastTouchRef.current < 350) {
        lastTouchRef.current = 0;
        openFullscreen();
      } else {
        lastTouchRef.current = now;
      }
    };
    const onDblClick = (e) => {
      if (e.target?.closest("button, a, input, select, textarea, [role='button']")) return;
      openFullscreen();
    };
    el.addEventListener("touchend", onTouchEnd, { passive: true });
    el.addEventListener("dblclick", onDblClick);
    return () => {
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("dblclick", onDblClick);
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-[#080d08] overflow-hidden" style={{fontFamily:"'DM Sans', sans-serif"}}>
      
      {/* VIDEO — true full screen for ALL sizes */}
      <div className="absolute inset-0">
        {/* Default wallpaper — shown when no ambience is selected */}
        {currentBg === -1 && (
          <img
            src={isPhone ? "/default-wallpaper-phone.jpg" : "/default-wallpaper-desktop.jpg"}
            alt="Default Wallpaper"
            className="w-full h-full object-cover"
          />
        )}
        {currentBg !== -1 && <BackgroundVideo/>}
        {(
          <div className="absolute inset-0"
            style={{background:"linear-gradient(180deg,rgba(0,0,0,0.55) 0%,rgba(0,0,0,0.0) 30%,rgba(0,0,0,0.0) 55%,rgba(0,0,0,0.82) 100%)"}}/>
        )}
      </div>

      {/* SCROLLABLE OVERLAY */}
      <div ref={overlayRef} className="absolute inset-0 z-20 overflow-y-auto" style={{scrollbarWidth:"none"}}>
        <div className="min-h-full flex flex-col" style={{paddingBottom: isPhone ? 16 : 24}}>

          {/* TRANSLUCENT NAV BAR — all sizes */}
          <NavBar isLarge={!isPhone} isPhoneLandscape={isPhoneLandscape} isDesktop={isDesktop} onHamburger={() => setShowSidebar(true)}/>

          {/* FULLSCREEN ZOOM BUTTON — below navbar, left corner */}
          <div style={{padding: isPhone?"6px 16px":"8px 20px"}}>
            <motion.button
              whileTap={{scale:0.88}}
              onClick={openFullscreen}
              className="flex items-center justify-center text-white/70 hover:text-white transition-all"
              style={{background:"none", border:"none", padding:4, filter:"drop-shadow(0 2px 5px rgba(0,0,0,0.6))"}}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 3 21 3 21 9"/>
                <polyline points="9 21 3 21 3 15"/>
                <line x1="21" y1="3" x2="14" y2="10"/>
                <line x1="3" y1="21" x2="10" y2="14"/>
              </svg>
            </motion.button>
          </div>

          {/* CLOCK — flex-1 centers it in remaining space */}
          <div className="flex-1 flex items-center justify-center" style={{minHeight: isPhone?"46vh":isTablet?"40vh":"44vh"}}>
            {mode==="clock" ? (
              isPhone ? (
                <div className="flex items-center justify-center w-full">
                  <div className="flex items-end gap-3">
                    <div className="flex flex-col items-center" style={{lineHeight:0.88}}>
                      <span className="text-white drop-shadow-lg" style={{fontSize:clockFs, fontFamily:"'Outfit', sans-serif", fontWeight:600}}>{clock.h}</span>
                      <span className="text-white drop-shadow-lg" style={{fontSize:clockFs, fontFamily:"'Outfit', sans-serif", fontWeight:600}}>{clock.m}</span>
                    </div>
                    <span className="text-white/70 drop-shadow pb-1" style={{fontSize:Math.min(clockFs*0.22, 42), fontFamily:"'Outfit', sans-serif", fontWeight:300}}>{clock.ampm}</span>
                  </div>
                </div>
              ) : (
                // Tablet/Desktop: side by side
                <div className="flex items-end gap-3">
                  <span className="text-white font-bold leading-none drop-shadow-lg" style={{fontSize:clockFs}}>{clock.full}</span>
                  <span className="text-white font-bold drop-shadow" style={{fontSize:ampmFs,marginBottom:clockFs*0.04}}>{clock.ampm}</span>
                </div>
              )
            ) : (
              // Timer display + inline controls directly below
              <div className="flex flex-col items-center gap-5">
                <span className="text-white font-bold leading-none drop-shadow-lg" style={{fontSize:timerFs}}>{timerFmt}</span>
                <div className="flex items-center gap-3">
                  <motion.button whileTap={{scale:0.95}}
                    onClick={() => {
                      unlockAudio();
                      if (mode === "long" && time === 0) { setShowSetTime(true); return; }
                      useStore.getState().toggleRunning();
                    }}
                    className="flex items-center gap-2 rounded-full text-black font-bold shadow-[0_0_30px_rgba(240,237,232,0.25)] bg-[#f0ede8]"
                    style={{padding: isPhone?"10px 36px":"13px 52px", fontSize: isPhone?15:18}}>
                    {(mode === "long" && time === 0) ? "SET TIME" : running ? "PAUSE" : "START"}
                  </motion.button>
                  <motion.button whileTap={{scale:0.95}}
                    onClick={() => mode === "long"
                      ? useStore.setState({ time: 0, originalTime: 0, running: false })
                      : useStore.getState().resetTimer()
                    }
                    className="rounded-full flex items-center justify-center border border-white/20 text-white"
                    style={{width: isPhone?44:52, height: isPhone?44:52, background:"rgba(255,255,255,0.10)", backdropFilter:"blur(12px)"}}>
                    {IcoReset(isPhone?17:20)}
                  </motion.button>
                </div>
              </div>
            )}
          </div>

          {/* MODE PILL */}
          <div style={{padding: isPhone?"0 16px 12px" : isTablet?"0 28px 14px":"0 40px 14px", display:"flex", justifyContent:"center", marginBottom: isPhone?"12px": isTablet?"20px":"28px"}}>
            <div style={{width: isPhone?"100%": isTablet?"560px":"660px"}}>
              <ModePill sz={isPhone?"sm":isDesktop?"lg":"md"} onSetTime={()=>setShowSetTime(true)}/>
            </div>
          </div>

          {/* IMMERSIVE AMBIENCES — frosted glass card (phone & tablet only; desktop uses sidebar) */}
          {!isDesktop && (
          <div style={{margin: isPhone?"0 16px 16px":"0 20px 20px"}}>
            <div className="rounded-[24px] bg-black/38 backdrop-blur-md border border-white/10"
              style={{padding: isPhone?"16px":"20px"}}>
              {isPhone ? (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-white text-xs font-bold tracking-widest uppercase">Immersive Ambiences</span>
                    <button onClick={()=>setShowExplore(true)} className="text-[#f0ede8] text-xs font-semibold">View All</button>
                  </div>
                  <AmbienceGrid cardH={100} count={6}/>
                </>
              ) : (
                <AmbienceRow cardW={cardW} cardH={cardH} count={8} onViewAll={()=>setShowExplore(true)} labelSize={isDesktop?"lg":"sm"}/>
              )}
            </div>
          </div>
          )}

        </div>
      </div>

      <AnimatePresence>{showSetTime   && <SetTimeSheet onClose={()=>setShowSetTime(false)}/>}</AnimatePresence>
      <AnimatePresence>{showFSPreview && <FSPreview onClose={()=>{ setShowFSPreview(false); if(!isDesktop) enterPiP(); }}/>}</AnimatePresence>
      <AnimatePresence>{showExplore   && <ExploreModal onClose={()=>setShowExplore(false)} desktop={!isPhone}/>}</AnimatePresence>
      {isDesktop && <DesktopSidebar open={showSidebar} onClose={()=>setShowSidebar(false)} onViewAll={()=>setShowExplore(true)}/>}
    </div>
  );
}

// ─── APP ─────────────────────────────────────────────────────────────────────
export default function App() {
  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700&display=swap";
    document.head.appendChild(link);
  }, []);

  // WakeLock — dual strategy:
  // 1. Screen Wake Lock API (Chrome/Android/desktop, iOS 17+ PWA)
  // 2. Invisible looping video hack (iOS Safari fallback — keeps screen awake)
  const wakeLockRef  = useRef(null);
  const noSleepVideo = useRef(null);

  useEffect(() => {
    let destroyed = false;

    // ── Invisible video trick (iOS Safari / older browsers) ──────────────────
    // A tiny 1-frame looping video prevents iOS from sleeping
    const startNoSleepVideo = () => {
      if (!noSleepVideo.current) {
        const vid = document.createElement("video");
        vid.setAttribute("playsinline", "");
        vid.setAttribute("muted", "");
        vid.muted = true;
        vid.loop = true;
        vid.style.cssText = "position:fixed;top:-1px;left:-1px;width:1px;height:1px;opacity:0;pointer-events:none;z-index:-1;";
        vid.src = "data:video/mp4;base64,AAAAIGZ0eXBpc29tAAACAGlzb21pc28yYXZjMW1wNDEAAAAIZnJlZQAAA2BtZGF0AAACrgYF//+q3EXpvebZSLeWLNgg2SPu73gyNjQgLSBjb3JlIDE0MiByMjQ3OSBkZDc5YTYxIC0gSC4yNjQvTVBFRy00IEFWQyBjb2RlYyAtIENvcHlsZWZ0IDIwMDMtMjAxNCAtIGh0dHA6Ly93d3cudmlkZW9sYW4ub3JnL3gyNjQuaHRtbCAtIG9wdGlvbnM6IGNhYmFjPTEgcmVmPTMgZGVibG9jaz0xOjA6MCBhbmFseXNlPTB4MzoweDExMyBtZT1oZXggc3VibWU9NyBwc3k9MSBwc3lfcmQ9MS4wMDowLjAwIG1peGVkX3JlZj0xIG1lX3JhbmdlPTE2IGNocm9tYV9tZT0xIHRyZWxsaXM9MSA4eDhkY3Q9MSBjcW09MCBkZWFkem9uZT0yMSwxMSBmYXN0X3Bza2lwPTEgY2hyb21hX3FwX29mZnNldD0tMiB0aHJlYWRzPTYgbG9va2FoZWFkX3RocmVhZHM9MSBzbGljZWRfdGhyZWFkcz0wIG5yPTAgZGVjaW1hdGU9MSBpbnRlcmxhY2VkPTAgYmx1cmF5X2NvbXBhdD0wIGNvbnN0cmFpbmVkX2ludHJhPTAgYmZyYW1lcz0zIGJfcHlyYW1pZD0yIGJfYWRhcHQ9MSBiX2JpYXM9MCBkaXJlY3Q9MSB3ZWlnaHRiPTEgb3Blbl9nb3A9MCB3ZWlnaHRwPTIga2V5aW50PTI1MCBrZXlpbnRfbWluPTI1IHNjZW5lY3V0PTQwIGludHJhX3JlZnJlc2g9MCByY19sb29rYWhlYWQ9NDAgcmM9Y3JmIG1idHJlZT0xIGNyZj0yMy4wIHFjb21wPTAuNjAgcXBtaW49MCBxcG1heD02OSBxcHN0ZXA9NCBpcF9yYXRpbz0xLjQwIGFxPTE6MS4wMACAAAABZWWIhAAv//72rvzLK0cLlS4teMinaHc4i4TNvQAAAkABAAAAAwBhAAADAALhU0UAAAADAAADAAADAGQAAAMBAAAAAgMAAAADAMgAAAMAAAADAEAAAAMAAAACAQAAAAMAAAACAgAAAAMAAAABAwAAAAMAAAABBAAAAAMAAAABBQAAAAMAAAABBgAAAAMAAAABBwAAAAMAAAABCAAAAAMAAAABCQAAAAMAAAABCgAAAAMAAAABCwAAAAMAAAABDAAAAAMAAAABDQAAAAMAAAABDgAAAAMAAAABDwAAAAMAAAABEA==";
        document.body.appendChild(vid);
        noSleepVideo.current = vid;
      }
      // play() — on visibility restore this works without new gesture on most browsers
      noSleepVideo.current.play().catch(() => {});
    };

    const stopNoSleepVideo = () => {
      // Only pause — keep element alive so visibility restore can resume without gesture
      if (noSleepVideo.current) noSleepVideo.current.pause();
    };

    const destroyNoSleepVideo = () => {
      if (noSleepVideo.current) {
        noSleepVideo.current.pause();
        noSleepVideo.current.remove();
        noSleepVideo.current = null;
      }
    };

    // ── Screen Wake Lock API ─────────────────────────────────────────────────
    const releaseLock = async () => {
      if (wakeLockRef.current) {
        try { await wakeLockRef.current.release(); } catch(e) {}
        wakeLockRef.current = null;
      }
    };

    const requestWakeLock = async () => {
      if (destroyed || document.visibilityState !== "visible") return;
      if (wakeLockRef.current) return;
      if (!("wakeLock" in navigator)) return;
      try {
        const lock = await navigator.wakeLock.request("screen");
        if (destroyed || document.visibilityState !== "visible") { lock.release().catch(()=>{}); return; }
        wakeLockRef.current = lock;
        lock.addEventListener("release", () => {
          wakeLockRef.current = null;
          if (!destroyed && document.visibilityState === "visible") setTimeout(requestWakeLock, 500);
        }, { once: true });
      } catch(e) {}
    };

    // ── Activate both on first user interaction ──────────────────────────────
    const activate = () => {
      startNoSleepVideo(); // iOS fallback — must be triggered by user gesture
      requestWakeLock();   // API-based — for Android/desktop
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        startNoSleepVideo();
        requestWakeLock();
      } else {
        stopNoSleepVideo();
        releaseLock();
      }
    };

    const onFullscreen = () => {
      setTimeout(() => {
        if (!destroyed && document.visibilityState === "visible") requestWakeLock();
      }, 400);
    };

    const onUnload = () => { destroyNoSleepVideo(); releaseLock(); };

    // Try WakeLock immediately (works without gesture on desktop/Android)
    requestWakeLock();

    // Video + WakeLock retry on first touch/click (required for iOS)
    document.addEventListener("touchstart", activate, { once: true });
    document.addEventListener("click",      activate, { once: true });

    document.addEventListener("visibilitychange", onVisibility);
    document.addEventListener("fullscreenchange",        onFullscreen);
    document.addEventListener("webkitfullscreenchange",  onFullscreen);
    window.addEventListener("pagehide",     onUnload);
    window.addEventListener("beforeunload", onUnload);

    return () => {
      destroyed = true;
      destroyNoSleepVideo();
      document.removeEventListener("touchstart",            activate);
      document.removeEventListener("click",                 activate);
      document.removeEventListener("visibilitychange",      onVisibility);
      document.removeEventListener("fullscreenchange",      onFullscreen);
      document.removeEventListener("webkitfullscreenchange",onFullscreen);
      window.removeEventListener("pagehide",     onUnload);
      window.removeEventListener("beforeunload", onUnload);
      releaseLock();
    };
  }, []);

  usePomodoro();
  return <MainLayout/>;
}