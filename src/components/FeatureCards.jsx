export default function FeatureCards() {
  const cards = [
    {
      title: "LIVE ASMR",
      desc: "Real-time relaxing backgrounds",
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2">
          <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
        </svg>
      )
    },
    {
      title: "STUDY TIMER",
      desc: "Pomodoro technique to boost focus",
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2">
          <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
        </svg>
      )
    },
    {
      title: "AMBIENT SOUND",
      desc: "Rain, waves, piano and more",
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
          <path d="M15.54 8.46a5 5 0 010 7.07M19.07 4.93a10 10 0 010 14.14"/>
        </svg>
      )
    },
    {
      title: "MINDFUL DESIGN",
      desc: "Beautiful, minimal and calming",
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2">
          <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
        </svg>
      )
    }
  ];

  return (
    <div className="grid grid-cols-4 gap-4 mt-5">
      {cards.map((card) => (
        <div
          key={card.title}
          className="rounded-[24px] p-5 border border-white/[0.07] bg-white/[0.03] backdrop-blur-xl hover:bg-white/[0.05] hover:border-[#4ade80]/20 transition-all group"
        >
          <div className="w-10 h-10 rounded-xl bg-[#4ade80]/10 flex items-center justify-center mb-3 group-hover:bg-[#4ade80]/20 transition-all">
            {card.icon}
          </div>
          <h3 className="text-white text-sm font-bold tracking-wider">{card.title}</h3>
          <p className="text-white/40 text-xs mt-1.5 leading-relaxed">{card.desc}</p>
        </div>
      ))}
    </div>
  );
}
