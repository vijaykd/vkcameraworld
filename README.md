# 🎬 Camara Studio — Free In-Browser AI Movie & Video Maker

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Status: Live](https://img.shields.io/badge/Status-Live%20Preview-success.svg)](#)
[![Zero Watermarks](https://img.shields.io/badge/Watermarks-Zero%20%28100%25%20Free%29-brightgreen.svg)](#)

> Create high-definition cinematic movies and video scenes for free right in your web browser. Driven by an autonomous AI Movie Director with zero watermarks.

---

## ✨ Features

- 🎥 **Real Live-Action Movie Footage**: Real high-definition cinematography clips of people walking in cities, street crosswalks, crowds, and actor tracking shots.
- 🤖 **Autonomous AI Director ("Mind of its Own")**: Type any prompt or let the AI automatically direct and cycle through cinematic stories every few seconds.
- 🎨 **Cinematic Color Grading (LUTs)**:
  - 35mm Teal & Orange
  - Cyberpunk Neon Pink & Cyan
  - Film Noir High-Contrast Monochrome
  - Golden Hour Warm Sunlight
  - Vintage 70s Technicolor
- 🎞️ **Hollywood Post-Processing**:
  - Anamorphic lens flare simulation
  - 35mm film grain texture
  - 2.39:1 widescreen cinema letterbox bars
  - Dynamic 35mm yellow movie dialogue subtitles
- ⏱️ **Multi-Track Timeline Editor**:
  - Scrub frames in real-time
  - Add, split, and crossfade scenes
  - Audio track visualization
- 📦 **In-Browser Video Exporter**:
  - Export ready-to-share MP4/WebM videos in 1080p / 4K without uploading to external servers
  - 100% client-side privacy & performance

---

## 🚀 Quick Start

1. **Clone the repository:**
   ```bash
   git clone git@github.com:vijaykd/camarawebsite.git
   cd camarawebsite
   ```

2. **Run a local server:**
   ```bash
   # Using Python 3:
   python3 -m http.server 3000

   # Or using Node:
   npx serve .
   ```

3. **Open in browser:**
   Navigate to [http://localhost:3000](http://localhost:3000).

---

## 📁 Project Structure

```text
camarawebsite/
├── index.html           # Main studio application UI
├── styles/
│   └── main.css         # Dark cinema UI styling
├── scripts/
│   ├── app.js           # Real-time canvas renderer, AI director & video engine
│   ├── scenes.js        # High-definition vector scene plates
│   └── templates.js     # Preset movie genres and configs
├── assets/
│   └── videos/          # Real live-action movie footage clips
└── README.md            # Documentation
```

---

## 📜 License

MIT License. Free to use, modify, and distribute for personal and commercial filmmaking projects. Zero watermarks forever.
