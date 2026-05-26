import { create } from "zustand";

// Load recent backgrounds from localStorage
const loadRecents = () => {
  try { return JSON.parse(localStorage.getItem("recentBgs") || "[]"); } catch { return []; }
};

export const useStore = create((set, get) => ({
  currentBackground: -1,
  mode: "clock",
  time: 0,
  originalTime: 0,
  running: false,
  recentBackgrounds: loadRecents(), // array of background names, most recent first

  backgrounds: [
    { name: "Rainy Window",    video: "https://res.cloudinary.com/dpoy9zmcj/video/upload/q_auto,f_auto/v1779047213/rainy_dgznys.mp4",      audio: "https://res.cloudinary.com/dpoy9zmcj/video/upload/q_auto,f_auto/v1779050206/rain_ptqox2.mp3",                thumbnail: "/thumbnails/rainy.png"              },
    { name: "Underwater Calm", video: "https://res.cloudinary.com/dpoy9zmcj/video/upload/q_auto,f_auto/v1778763351/underwater_cm7ts6.mp4", audio: "https://res.cloudinary.com/dpoy9zmcj/video/upload/q_auto,f_auto/v1778763421/underwater_m0fnhr.mp3", thumbnail: "/thumbnails/underwater.png"         },
    { name: "Forest Rain",     video: "https://res.cloudinary.com/dpoy9zmcj/video/upload/q_auto,f_auto/v1778763338/forest_gzqbs0.mp4",     audio: "https://res.cloudinary.com/dpoy9zmcj/video/upload/q_auto,f_auto/v1779050215/forest_yqpz55.mp3",              thumbnail: "/thumbnails/forest.png"             },
    { name: "Night Campfire",  video: "https://res.cloudinary.com/dpoy9zmcj/video/upload/q_auto,f_auto/v1779022519/campfire_v6irqm.mp4",   audio: "https://res.cloudinary.com/dpoy9zmcj/video/upload/q_auto,f_auto/v1779050537/campfire_oli65z.mp3",            thumbnail: "/thumbnails/campfire.png"           },
    { name: "Natures Voice",   video: "https://res.cloudinary.com/dpoy9zmcj/video/upload/q_auto,f_auto/v1779021834/natures-voice_d1frsn.mp4", audio: "https://res.cloudinary.com/dpoy9zmcj/video/upload/q_auto,f_auto/v1779046056/natures-voice_itv7fd.mp3",    thumbnail: "/thumbnails/natures-voice.png"      },
    { name: "Birds Chirping",  video: "https://res.cloudinary.com/dpoy9zmcj/video/upload/q_auto,f_auto/v1779020509/birds-chirping_qdzykp.mp4", audio: "https://res.cloudinary.com/dpoy9zmcj/video/upload/q_auto,f_auto/v1779046036/birds-chirping_wtf48y.mp3",  thumbnail: "/thumbnails/birds-chirping.png"     },
    { name: "Lofi Music",      video: "https://res.cloudinary.com/dpoy9zmcj/video/upload/q_auto,f_auto/v1779045770/lofi-music_qpm3gt.mp4", audio: "https://res.cloudinary.com/dpoy9zmcj/video/upload/q_auto,f_auto/v1779046928/lofi-music_jqvlsy.mp3",          thumbnail: "/thumbnails/lofi-music.png"         },
    { name: "Deep Focus",      video: "https://res.cloudinary.com/dpoy9zmcj/video/upload/q_auto,f_auto/v1779021312/deep-focus_g9fqlx.mp4", audio: "https://res.cloudinary.com/dpoy9zmcj/video/upload/q_auto,f_auto/v1779050235/deep-focus_mnibym.mp3",          thumbnail: "/thumbnails/deep-focus.png"         },
  ],

  setBackground: (index) => {
    if (index === -1) {
      window.dispatchEvent(new Event("pause-main-audio"));
      try { window.electron?.setWidgetState?.({ videoUrl: null }); } catch {}
      set({ currentBackground: index });
      return;
    }
    const name = get().backgrounds[index]?.name;
    const videoUrl = get().backgrounds[index]?.video || null;
    // Tell main process the current video URL — widget reads this via IPC
    try { window.electron?.setWidgetState?.({ videoUrl }); } catch {}
    if (name) {
      const recents = [name, ...get().recentBackgrounds.filter(n => n !== name)].slice(0, 8);
      localStorage.setItem("recentBgs", JSON.stringify(recents));
      set({ currentBackground: index, recentBackgrounds: recents });
    } else {
      set({ currentBackground: index });
    }
  },

  setMode: (mode) => {
    // short = 25 min preset, long = custom (starts at 0), clock = no timer
    const durations = { clock: 0, short: 25 * 60, long: 0 };
    const t = durations[mode] ?? 0;
    set({ mode, time: t, originalTime: t, running: false });
  },

  // START/PAUSE — if timer already finished (time===0) and originalTime>0, restart
  toggleRunning: () =>
    set((state) => {
      if (!state.running && state.time === 0 && state.originalTime > 0) {
        // Restart from original time
        return { running: true, time: state.originalTime };
      }
      return { running: !state.running };
    }),

  resetTimer: () =>
    set((state) => ({
      time: state.originalTime,
      running: false,
    })),

  // Called when user sets custom time
  setCustomTime: (seconds) =>
    set({ time: seconds, originalTime: seconds, running: false }),

  // Called when short timer mode is selected (saves 25min as originalTime)
  setShortTimer: () => {
    const t = 25 * 60;
    set({ mode: "short", time: t, originalTime: t, running: false });
  },

  // TIMER TICK — auto-stop when reaches 0
  tick: () =>
    set((state) => {
      if (state.time <= 1) {
        return { time: 0, running: false }; // auto stop at 0
      }
      return { time: state.time - 1 };
    }),
}));