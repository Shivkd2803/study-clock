# 🕐 Live Study Clock

<div align="center">

![Live Study Clock](public/logo.png)

**A beautiful, immersive study and focus app with live ambient backgrounds, timers, and relaxing sounds.**

[![Live Demo](https://img.shields.io/badge/Live%20Demo-study--clock--app--smoky.vercel.app-brightgreen?style=for-the-badge)](https://study-clock-app-smoky.vercel.app)
[![Made with React](https://img.shields.io/badge/React-18-blue?style=for-the-badge&logo=react)](https://react.dev)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-38bdf8?style=for-the-badge&logo=tailwindcss)](https://tailwindcss.com)
[![Electron](https://img.shields.io/badge/Electron-Desktop-47848f?style=for-the-badge&logo=electron)](https://electronjs.org)

</div>

---

## ✨ Features

- 🎥 **Immersive Ambient Backgrounds** — High-quality looping videos with matching audio (Rainy Window, Forest Rain, Underwater Calm, Night Campfire, Lofi Music, Deep Focus, and more)
- ⏱️ **Study Timer** — 25-minute Pomodoro short timer + custom Set Time with audio beep on completion
- 🕐 **Live Clock** — Real-time clock with elegant fullscreen mode
- 🔊 **Ambient Audio** — Synchronized audio that plays with each background
- 📱 **Fully Responsive** — Optimized layouts for phone, tablet, and desktop
- 🖥️ **Desktop App** — Electron-powered desktop application for Windows/Mac/Linux
- 📲 **PWA Support** — Install as a home screen app on any mobile device
- 🕓 **Recently Used** — Backgrounds reorder based on your recent selections
- 🌙 **Default Wallpaper** — Beautiful default wallpaper when no background is selected
- 🎨 **Minimal Design** — Clean, dark, distraction-free UI

---

## 🚀 Live Demo

👉 **[study-clock-app-smoky.vercel.app](https://study-clock-app-smoky.vercel.app)**

> Open in Chrome or Safari and tap **"Add to Home Screen"** to install as a PWA on your phone or tablet.

---

## 📸 Screenshots

| Phone | Tablet | Desktop |
|-------|--------|---------|
| Fullscreen clock with ambient background | Timer with immersive background | Full layout with ambience selector |

---

## 🛠️ Tech Stack

| Technology | Purpose |
|-----------|---------|
| [React 18](https://react.dev) | UI framework |
| [Vite](https://vitejs.dev) | Build tool |
| [Tailwind CSS](https://tailwindcss.com) | Styling |
| [Framer Motion](https://framer.motion.com) | Animations |
| [Zustand](https://zustand-demo.pmnd.rs) | State management |
| [Howler.js](https://howlerjs.com) | Audio playback |
| [Electron](https://electronjs.org) | Desktop app |
| [Cloudinary](https://cloudinary.com) | Video/audio CDN |
| [Vercel](https://vercel.com) | Hosting & deployment |

---

## 📁 Project Structure

```
study-clock/
├── public/                  # Static assets
│   ├── thumbnails/          # Background thumbnail images
│   ├── audio/               # Local audio files
│   ├── default-wallpaper-desktop.jpg
│   ├── default-wallpaper-phone.jpg
│   ├── logo.png
│   ├── manifest.json        # PWA manifest
│   └── sw.js                # Service worker
├── src/
│   ├── components/          # React components
│   │   ├── BackgroundVideo.jsx
│   │   ├── Header.jsx
│   │   ├── Sidebar.jsx
│   │   ├── WindowControls.jsx
│   │   └── ...
│   ├── store/
│   │   └── useStore.js      # Zustand global state
│   ├── styles/
│   │   └── globals.css
│   ├── App.jsx              # Main app component
│   └── main.jsx             # Entry point
├── electron/
│   ├── main.js              # Electron main process
│   └── preload.js           # Electron preload script
├── index.html
├── vite.config.js
├── tailwind.config.js
└── package.json
```

---

## 🏃 Getting Started

### Prerequisites
- Node.js 18+
- npm

### Installation

```bash
# Clone the repository
git clone https://github.com/Shivkd2803/study-clock.git
cd study-clock

# Install dependencies
npm install
```

### Development (Web)

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Development (Desktop)

```bash
npm run dev
```

This starts both the Vite dev server and Electron simultaneously.

### Build for Web

```bash
npx vite build
```

### Build Desktop App

```bash
npm run build
```

---

## 📲 PWA Installation

1. Open the live demo in **Chrome** (Android) or **Safari** (iOS/iPad)
2. Tap the browser menu
3. Select **"Add to Home Screen"**
4. The app installs as a fullscreen PWA

---

## 🎬 Adding New Backgrounds

1. Upload video and audio to [Cloudinary](https://cloudinary.com)
2. Add thumbnail image to `public/thumbnails/`
3. Update `src/store/useStore.js`:

```js
{ 
  name: "Your Background",
  video: "https://res.cloudinary.com/your-cloud/video/upload/your-video.mp4",
  audio: "/audio/your-audio.mp3",
  thumbnail: "/thumbnails/your-thumbnail.png"
}
```

4. Push to GitHub — Vercel auto-deploys in ~30 seconds

---

## 🚢 Deployment

This project auto-deploys to Vercel on every push to the `master` branch.

```bash
git add .
git commit -m "your update"
git push
```

---

## 📄 License

This project is for personal use. All ambient videos and audio are used with proper licensing.

---

<div align="center">

Made with ❤️ for focus, relaxation, and deep work.

</div>
