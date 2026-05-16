export default function Header() {
  return (
    <div className="flex items-center justify-between px-2 pt-4 pb-5 z-20 relative">
      {/* Left: Logo + Title */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-[#4ade80]/15 border border-[#4ade80]/30 flex items-center justify-center">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/>
            <path d="M8 12s1.5 2 4 2 4-2 4-2"/>
            <path d="M9 9h.01M15 9h.01"/>
          </svg>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[#4ade80] text-lg font-bold tracking-widest">LIVE</span>
            <span className="text-white text-lg font-semibold tracking-widest">STUDY CLOCK</span>
          </div>
          <p className="text-white/40 text-xs tracking-wider">Focus • Relax • Study</p>
        </div>
      </div>

      {/* Right: Greeting + Controls */}
      <div className="flex items-center gap-6">
        <div className="text-right hidden md:block">
          <p className="text-white text-base font-semibold">Good Afternoon</p>
          <p className="text-white/50 text-xs">Stay focused and keep growing.</p>
        </div>


      </div>
    </div>
  );
}