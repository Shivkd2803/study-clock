import { useState, useEffect, useRef } from "react";
import { useStore } from "../store/useStore";
import { motion, AnimatePresence } from "framer-motion";
import { Howl } from "howler";

const EXTRA_BACKGROUNDS = [
  { name: "Beach Waves", desc: "Ocean waves", category: "Underwater", thumbnail: "/thumbnails/underwater.png", video: "/videos/underwater.mp4", audio: "/audio/underwater.mp3" },
];

const CAT_ICONS = {
  All: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>,
  Rain: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 17.58A5 5 0 0018 8h-1.26A8 8 0 104 15.25"/><line x1="8" y1="16" x2="8" y2="21"/><line x1="12" y1="19" x2="12" y2="21"/><line x1="16" y1="16" x2="16" y2="21"/></svg>,
  Nature: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 8C8 10 5.9 16.17 3.82 21"/><path d="M9.1 10.1c1.9-3.1 5.9-6.1 11.9-8.1 0 6-2.9 10.9-8.9 13.9"/></svg>,
  Underwater: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 12s2-4 10-4 10 4 10 4-2 4-10 4-10-4-10-4z"/><circle cx="12" cy="12" r="2"/></svg>,
  "Coffee Shop": <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 8h1a4 4 0 010 8h-1"/><path d="M3 8h14v9a4 4 0 01-4 4H7a4 4 0 01-4-4V8z"/></svg>,
  Night: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>,
  Winter: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="2" x2="12" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M7 7l5 5 5-5M7 17l5-5 5 5"/></svg>,
};

function getDesc(name) {
  const map = { "Rainy Window": "Rain and thunder", "Underwater Calm": "Ocean and bubbles", "Cozy Coffee Shop": "Ambient cafe sounds", "Forest Rain": "Rain in the forest", "Night Campfire": "Crackling fire" };
  return map[name] || "Ambient sounds";
}

function getCat(name) {
  if (name.includes("Rain") || name.includes("Rainy") || name.includes("City Rain")) return "Rain";
  if (name.includes("Forest") || name.includes("Mountain")) return "Nature";
  if (name.includes("Under") || name.includes("Ocean") || name.includes("Beach")) return "Underwater";
  if (name.includes("Coffee")) return "Coffee Shop";
  if (name.includes("Night") || name.includes("Campfire") || name.includes("Fireplace") || name.includes("Cabin")) return "Night";
  if (name.includes("Snow") || name.includes("Winter")) return "Winter";
  return "Nature";
}

export default function Sidebar({ mobile = false }) {
  const backgrounds = useStore((s) => s.backgrounds);
  const current = useStore((s) => s.currentBackground);
  const setBackground = useStore((s) => s.setBackground);

  const [preview, setPreview] = useState(null);
  const [showExplore, setShowExplore] = useState(false);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const previewSound = useRef(null);

  const categories = ["All", "Rain", "Nature", "Underwater", "Coffee Shop", "Night", "Winter"];

  const allBgs = [
    ...backgrounds.map((b, i) => ({ ...b, storeIndex: i, desc: getDesc(b.name), category: getCat(b.name) })),
    ...EXTRA_BACKGROUNDS,
  ];

  const filtered = allBgs.filter((b) => {
    const matchSearch = b.name.toLowerCase().includes(search.toLowerCase()) || b.desc.toLowerCase().includes(search.toLowerCase());
    const matchCat = activeCategory === "All" || b.category === activeCategory;
    return matchSearch && matchCat;
  });

  useEffect(() => {
    if (preview) {
      window.dispatchEvent(new Event("pause-main-audio"));
      if (previewSound.current) { previewSound.current.stop(); previewSound.current.unload(); }
      previewSound.current = new Howl({ src: [preview.audio], loop: true, volume: 0.6, html5: true });
      previewSound.current.play();
    } else {
      if (previewSound.current) { previewSound.current.stop(); previewSound.current.unload(); }
      window.dispatchEvent(new Event("resume-main-audio"));
    }
    return () => { if (previewSound.current) { previewSound.current.stop(); previewSound.current.unload(); } };
  }, [preview]);

  const openPreview = (bg) => setPreview(bg);
  const closePreview = () => setPreview(null);

  const applyBg = (bg) => {
    if (bg.storeIndex !== null && bg.storeIndex !== undefined) setBackground(bg.storeIndex);
    closePreview();
    setShowExplore(false);
  };

  // ── MOBILE ───────────────────────────────────────────────────────────────
  if (mobile) {
    return (
      <>
        <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
          {backgrounds.map((bg, i) => (
            <motion.div whileTap={{ scale: 0.96 }} key={bg.name}
              onClick={() => openPreview({ ...bg, storeIndex: i, desc: getDesc(bg.name) })}
              className={`relative flex-shrink-0 rounded-2xl overflow-hidden cursor-pointer border ${current === i ? "border-[#4ade80] shadow-[0_0_20px_rgba(74,222,128,0.4)]" : "border-white/10"}`}
              style={{ width: 100, height: 70 }}>
              <img src={bg.thumbnail} alt={bg.name} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/30" />
              <div className="absolute top-1.5 right-1.5 flex items-center gap-1">
                <div className="w-1.5 h-1.5 bg-[#4ade80] rounded-full animate-pulse" />
                <span className="text-[9px] text-white font-semibold">LIVE</span>
              </div>
              <p className="absolute bottom-1.5 left-2 text-white text-[10px] font-semibold">{bg.name}</p>
            </motion.div>
          ))}
          <motion.div whileTap={{ scale: 0.96 }} onClick={() => setShowExplore(true)}
            className="flex-shrink-0 rounded-2xl border border-[#4ade80]/30 bg-[#4ade80]/5 flex flex-col items-center justify-center gap-1 cursor-pointer"
            style={{ width: 80, height: 70 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <span className="text-[#4ade80] text-[9px] font-semibold">View All</span>
          </motion.div>
        </div>

        <AnimatePresence>
          {preview && !showExplore && <PreviewModal bg={preview} onClose={closePreview} onApply={applyBg} />}
        </AnimatePresence>
        <AnimatePresence>
          {showExplore && (
            <ExploreModal mobile onClose={() => setShowExplore(false)} filtered={filtered}
              categories={categories} activeCategory={activeCategory} setActiveCategory={setActiveCategory}
              search={search} setSearch={setSearch}
              openPreview={(bg) => { setShowExplore(false); openPreview(bg); }} />
          )}
        </AnimatePresence>
      </>
    );
  }

  // ── DESKTOP ──────────────────────────────────────────────────────────────
  return (
    <>
      <div className="w-[280px] h-full rounded-[32px] bg-white/[0.03] backdrop-blur-xl border border-white/[0.07] p-4 overflow-y-auto flex flex-col" style={{ scrollbarWidth: "none" }}>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-2 h-2 bg-[#4ade80] rounded-full animate-pulse" />
          <h2 className="text-white/70 text-xs font-semibold tracking-widest uppercase">Live Backgrounds</h2>
        </div>

        <div className="space-y-3 flex-1">
          {backgrounds.map((bg, i) => (
            <motion.div whileHover={{ scale: 1.02 }} key={bg.name}
              className={`relative rounded-2xl overflow-hidden cursor-pointer border transition-all ${current === i ? "border-[#4ade80]/60 shadow-[0_0_25px_rgba(74,222,128,0.3)]" : "border-white/8 hover:border-white/20"}`}>
              <img src={bg.thumbnail} alt={bg.name} className="w-full h-[110px] object-cover" />
              <div className="absolute inset-0 bg-black/30" />
              <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 z-10 bg-black/40 backdrop-blur-sm px-2 py-0.5 rounded-full">
                <div className="w-1.5 h-1.5 bg-[#4ade80] rounded-full animate-pulse" />
                <span className="text-[10px] text-white font-semibold">LIVE</span>
              </div>
              <div className="absolute bottom-3 left-3 z-10">
                <h3 className="text-white font-semibold text-sm">{bg.name}</h3>
                <p className="text-white/50 text-xs">{getDesc(bg.name)}</p>
              </div>
              <button onClick={() => openPreview({ ...bg, storeIndex: i, desc: getDesc(bg.name) })}
                className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition duration-300 bg-black/40 z-20">
                <div className="w-12 h-12 rounded-full bg-[#4ade80]/20 flex items-center justify-center border border-[#4ade80]/40">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="#4ade80"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                </div>
              </button>
            </motion.div>
          ))}
        </div>

        <button onClick={() => setShowExplore(true)}
          className="mt-4 w-full flex items-center justify-between px-4 py-3 rounded-2xl bg-[#4ade80]/5 border border-[#4ade80]/20 hover:bg-[#4ade80]/10 transition-all">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-[#4ade80]/15 flex items-center justify-center">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            </div>
            <span className="text-[#4ade80]/80 text-xs font-semibold">Explore More</span>
          </div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2" opacity="0.5"><path d="M9 18l6-6-6-6"/></svg>
        </button>
      </div>

      <AnimatePresence>
        {preview && !showExplore && <PreviewModal bg={preview} onClose={closePreview} onApply={applyBg} desktop />}
      </AnimatePresence>
      <AnimatePresence>
        {showExplore && (
          <ExploreModal onClose={() => setShowExplore(false)} filtered={filtered}
            categories={categories} activeCategory={activeCategory} setActiveCategory={setActiveCategory}
            search={search} setSearch={setSearch}
            openPreview={(bg) => { setShowExplore(false); openPreview(bg); }} />
        )}
      </AnimatePresence>
    </>
  );
}

// ── PREVIEW MODAL ─────────────────────────────────────────────────────────────
function PreviewModal({ bg, onClose, onApply, desktop }) {
  return (
    <motion.div className="fixed inset-0 z-[999] bg-black/80 backdrop-blur-xl flex items-center justify-center"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.85, opacity: 0 }} transition={{ duration: 0.3 }}
        className={`relative overflow-hidden border border-[#4ade80]/30 shadow-[0_0_80px_rgba(74,222,128,0.2)] ${desktop ? "w-[85vw] h-[85vh] rounded-[40px]" : "w-[92vw] h-[70vh] rounded-[32px]"}`}>
        <video autoPlay loop muted playsInline controls={false} disablePictureInPicture
          onDoubleClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
          className="absolute inset-0 w-full h-full object-cover">
          <source src={bg.video} type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-black/25" />
        <div className={`absolute z-20 ${desktop ? "top-8 left-8" : "top-6 left-6"}`}>
          <h2 className={`text-white font-bold ${desktop ? "text-5xl" : "text-2xl"}`}>{bg.name}</h2>
          <p className={`text-white/60 mt-1 ${desktop ? "text-xl" : "text-sm"}`}>{bg.desc}</p>
        </div>
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-4 z-20">
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}
            onClick={() => onApply(bg)}
            className={`rounded-full bg-[#4ade80] text-black font-bold shadow-[0_0_40px_rgba(74,222,128,0.4)] ${desktop ? "px-10 py-4 text-xl" : "px-8 py-3 text-base"}`}>
            APPLY BACKGROUND
          </motion.button>
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}
            onClick={onClose}
            className={`rounded-full bg-white/10 text-white border border-white/20 ${desktop ? "px-10 py-4 text-xl" : "px-8 py-3 text-base"}`}>
            CLOSE
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── EXPLORE MODAL ─────────────────────────────────────────────────────────────
function ExploreModal({ onClose, filtered, categories, activeCategory, setActiveCategory, search, setSearch, openPreview, mobile }) {
  if (mobile) {
    return (
      <motion.div className="fixed inset-0 z-[1000] bg-[#0a0f0a] flex flex-col"
        initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ duration: 0.28, ease: "easeOut" }}>
        <div className="flex items-center gap-3 px-5 pt-12 pb-3">
          <button onClick={onClose} className="w-9 h-9 flex items-center justify-center text-white/70">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          </button>
          <h1 className="text-white text-xl font-bold">Explore Backgrounds</h1>
        </div>
        <div className="mx-5 mb-3 flex items-center gap-3 bg-white/5 rounded-2xl px-4 py-3 border border-white/10">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search backgrounds..."
            className="bg-transparent text-white text-sm flex-1 outline-none placeholder-white/30" />
        </div>
        <div className="flex gap-2 px-5 mb-3 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          {categories.map((cat) => (
            <button key={cat} onClick={() => setActiveCategory(cat)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${activeCategory === cat ? "bg-[#4ade80]/20 text-[#4ade80] border border-[#4ade80]/40" : "bg-white/5 text-white/50 border border-white/10"}`}>
              {CAT_ICONS[cat]}{cat}
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto px-5 space-y-3 pb-24" style={{ scrollbarWidth: "none" }}>
          {filtered.map((bg, i) => (
            <motion.div key={i} whileTap={{ scale: 0.98 }} onClick={() => openPreview(bg)}
              className="relative rounded-2xl overflow-hidden cursor-pointer border border-white/10" style={{ height: 110 }}>
              <img src={bg.thumbnail} alt={bg.name} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent" />
              <div className="absolute top-3 right-3 flex items-center gap-1 bg-[#4ade80]/80 px-2 py-0.5 rounded-full">
                <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                <span className="text-[9px] text-black font-bold">LIVE</span>
              </div>
              <div className="absolute bottom-3 left-4">
                <h3 className="text-white font-bold text-sm">{bg.name}</h3>
                <p className="text-white/60 text-xs">{bg.desc}</p>
              </div>
              <div className="absolute right-4 bottom-3 w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              </div>
            </motion.div>
          ))}
        </div>
        <div className="absolute bottom-0 left-0 right-0 border-t border-white/5 px-6 py-3 flex justify-around bg-[#0a0f0a]/95 backdrop-blur-xl">
          {[
            { label: "Clock", active: false, icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg> },
            { label: "Explore", active: true, icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg> },
            { label: "Settings", active: false, icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93l-1.41 1.41M4.93 4.93l1.41 1.41M12 2v2M12 20v2M2 12h2M20 12h2M19.07 19.07l-1.41-1.41M4.93 19.07l1.41-1.41"/></svg> },
          ].map((item) => (
            <button key={item.label} className={`flex flex-col items-center gap-1 ${item.active ? "text-[#4ade80]" : "text-white/40"}`}>
              {item.icon}
              <span className="text-[10px] font-medium">{item.label}</span>
              {item.active && <div className="w-4 h-0.5 bg-[#4ade80] rounded-full" />}
            </button>
          ))}
        </div>
      </motion.div>
    );
  }

  // Desktop
  return (
    <motion.div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/70 backdrop-blur-xl"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.92, opacity: 0 }} transition={{ duration: 0.28 }}
        className="w-[80vw] max-w-[1100px] max-h-[85vh] bg-[#0d140d]/95 backdrop-blur-2xl rounded-[36px] border border-white/10 shadow-[0_0_100px_rgba(74,222,128,0.1)] flex flex-col overflow-hidden">

        <div className="flex items-center justify-between px-10 pt-9 pb-5">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-[#4ade80]/15 flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5">
                <path d="M17 8C8 10 5.9 16.17 3.82 21"/><path d="M9.1 10.1c1.9-3.1 5.9-6.1 11.9-8.1 0 6-2.9 10.9-8.9 13.9"/>
              </svg>
            </div>
            <div>
              <h2 className="text-white text-3xl font-bold">Explore <span className="text-[#4ade80]">Live</span> Backgrounds</h2>
              <p className="text-white/40 text-sm mt-0.5">Discover the perfect atmosphere for your focus.</p>
            </div>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-white/60 hover:text-white transition-all">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div className="flex items-center gap-3 px-10 mb-4">
          <div className="flex-1 flex items-center gap-3 bg-white/5 rounded-2xl px-5 py-3 border border-white/10">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search live backgrounds..."
              className="bg-transparent text-white flex-1 outline-none placeholder-white/30 text-sm" />
          </div>
        </div>

        <div className="flex gap-2 px-10 mb-5 flex-wrap">
          {categories.map((cat) => (
            <button key={cat} onClick={() => setActiveCategory(cat)}
              className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-sm font-medium transition-all ${activeCategory === cat ? "bg-[#4ade80]/20 text-[#4ade80] border border-[#4ade80]/40" : "bg-white/5 text-white/50 border border-white/10 hover:text-white/70"}`}>
              {CAT_ICONS[cat]}{cat}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-10 pb-8" style={{ scrollbarWidth: "none" }}>
          <div className="grid grid-cols-4 gap-4">
            {filtered.map((bg, i) => (
              <motion.div key={i} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}
                onClick={() => openPreview(bg)}
                className="relative rounded-2xl overflow-hidden cursor-pointer border border-white/10 hover:border-[#4ade80]/40 transition-all group" style={{ height: 160 }}>
                <img src={bg.thumbnail} alt={bg.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                <div className="absolute top-3 right-3 flex items-center gap-1 bg-[#4ade80]/80 px-2 py-0.5 rounded-full">
                  <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                  <span className="text-[9px] text-black font-bold">LIVE</span>
                </div>
                <div className="absolute bottom-3 left-3 right-10 z-10">
                  <h3 className="text-white font-bold text-sm">{bg.name}</h3>
                  <p className="text-white/50 text-xs mt-0.5">{bg.desc}</p>
                </div>
                <div className="absolute bottom-3 right-3 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}