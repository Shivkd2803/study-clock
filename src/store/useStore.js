import { create } from "zustand";

export const useStore = create((set, get) => ({
  currentBackground: -1,
  mode: "clock",
  time: 0,
  originalTime: 0, // stores the original set time so START can restart
  running: false,

  backgrounds: [
    { name: "Rainy Window",    video: "https://res.cloudinary.com/dpoy9zmcj/video/upload/v1778763333/rainy_sffag8.mp4",      audio: "/audio/rain.mp3",       thumbnail: "/thumbnails/rainy.png"    },
    { name: "Underwater Calm", video: "https://res.cloudinary.com/dpoy9zmcj/video/upload/v1778763351/underwater_cm7ts6.mp4", audio: "https://res.cloudinary.com/dpoy9zmcj/video/upload/v1778763421/underwater_m0fnhr.mp3", thumbnail: "/thumbnails/underwater.png"},
    { name: "Cozy Coffee Shop",video: "/videos/coffee.mp4",     audio: "/audio/coffee.mp3",     thumbnail: "/thumbnails/coffee.jpg"   },
    { name: "Forest Rain",     video: "https://res.cloudinary.com/dpoy9zmcj/video/upload/v1778763338/forest_gzqbs0.mp4",     audio: "/audio/forest.mp3",     thumbnail: "/thumbnails/rainy.png"    },
    { name: "Night Campfire",  video: "/videos/campfire.mp4",   audio: "/audio/campfire.mp3",   thumbnail: "/thumbnails/campfire.jpg" },
  ],

  setBackground: (index) => {
    if (index === -1) window.dispatchEvent(new Event("pause-main-audio"));
    set({ currentBackground: index });
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