/**
 * CAMARA - Cinematic Free Video & Movie Creation Studio
 * Complete in-browser real-time renderer, audio engine, timeline, and export suite.
 */

(function () {
  'use strict';

  // State Management
  const state = {
    isPlaying: false, // PAUSED ON LOAD - Waits for your prompt!
    autoPilot: false, // Waits for your prompt
    autoStoryIndex: 0,
    currentTime: 0,
    duration: 8.0, // 8 seconds default
    fps: 60,
    aspectRatio: '16:9',
    aspectDims: { width: 1280, height: 720 },
    lut: 'teal-orange',
    contrast: 110,
    saturation: 125,
    vignette: 20,
    filmGrain: 15,
    anamorphicFlare: 35,
    cameraMotion: 'pan-zoom',
    currentSoundtrack: 'lofi-chill',
    masterVolume: 0.0,
    isMuted: true, // MUTED by default to prevent unwanted noise
    cinemaBars: true,
    titleText: 'WAITING FOR PROMPT',
    subtitleText: 'TYPE YOUR MOVIE IDEA ABOVE TO GENERATE',
    titleStyle: 'minimal',
    titleText: 'THE CITY WALKERS',
    subtitleText: 'LIVE-ACTION CINEMA • REAL PEOPLE WALKING',
    activeScenes: [
      { id: 1, type: 'people-walking', name: 'Scene 1: Real People Walking on City Street', start: 0, end: 4 },
      { id: 2, type: 'city-street', name: 'Scene 2: City Street & Crosswalk Pedestrians', start: 4, end: 8 }
    ],
    aiPrompt: 'Real movie footage of people walking down a busy city street in 4K cinematography'
  };

  // DOM Elements
  const canvas = document.getElementById('movie-canvas');
  const ctx = canvas.getContext('2d', { alpha: false });
  const playPauseBtn = document.getElementById('play-pause-btn');
  const playIcon = document.getElementById('play-icon');
  const pauseIcon = document.getElementById('pause-icon');
  const stopBtn = document.getElementById('stop-btn');
  const scrubberTrack = document.getElementById('scrubber-track');
  const scrubberProgress = document.getElementById('scrubber-progress');
  const scrubberThumb = document.getElementById('scrubber-thumb');
  const currentTimeReadout = document.getElementById('current-time-readout');
  const totalTimeReadout = document.getElementById('total-time-readout');
  const timelineDurationDisplay = document.getElementById('timeline-duration-display');
  const timelinePlayhead = document.getElementById('timeline-playhead');
  const canvasPlayOverlay = document.getElementById('canvas-play-overlay');
  const canvasScreenBox = document.getElementById('canvas-screen-box');
  const hudRes = document.getElementById('hud-res');
  const hudFilter = document.getElementById('hud-filter');

  // Sliders & Form Controls
  const grainSlider = document.getElementById('grain-slider');
  const grainVal = document.getElementById('grain-val');
  const flareSlider = document.getElementById('flare-slider');
  const flareVal = document.getElementById('flare-val');
  const contrastSlider = document.getElementById('contrast-slider');
  const contrastVal = document.getElementById('contrast-val');
  const satSlider = document.getElementById('sat-slider');
  const satVal = document.getElementById('sat-val');
  const vignetteSlider = document.getElementById('vignette-slider');
  const vignetteVal = document.getElementById('vignette-val');
  const volSlider = document.getElementById('master-vol-slider');
  const volVal = document.getElementById('vol-val');
  const cameraMotionSelect = document.getElementById('camera-motion-select');
  const titleTextInput = document.getElementById('title-text-input');
  const subtitleTextInput = document.getElementById('subtitle-text-input');
  const titleStyleSelect = document.getElementById('title-style-select');
  const cinemaBarsToggle = document.getElementById('cinema-bars-toggle');
  const projectTitleInput = document.getElementById('project-title');
  const aiScenePrompt = document.getElementById('ai-scene-prompt');
  const generateAiSceneBtn = document.getElementById('generate-ai-scene-btn');
  const visualizerContainer = document.getElementById('visualizer-bars');

  // Export Modal Elements
  const exportBtn = document.getElementById('export-video-btn');
  const exportModal = document.getElementById('export-modal');
  const closeExportModal = document.getElementById('close-export-modal');
  const cancelExportBtn = document.getElementById('cancel-export-btn');
  const startRenderBtn = document.getElementById('start-render-btn');
  const exportProgressWrap = document.getElementById('export-progress-wrap');
  const exportBarFill = document.getElementById('export-bar-fill');
  const exportStatusText = document.getElementById('export-status-text');
  const exportSuccessBox = document.getElementById('export-success-box');
  const modalFooterActions = document.getElementById('modal-footer-actions');
  const downloadAgainBtn = document.getElementById('download-again-btn');

  let animationFrameId = null;
  let lastTimestamp = 0;
  let isExporting = false;
  let recordedBlob = null;

  // =========================================================================
  // AUDIO SYNTHESIS ENGINE (Web Audio API)
  // =========================================================================
  class WebAudioEngine {
    constructor() {
      this.ctx = null;
      this.masterGain = null;
      this.analyser = null;
      this.streamDest = null;
      this.synthInterval = null;
      this.activeNodes = [];
      this.isInit = false;
    }

    init() {
      if (this.isInit) return;
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContext();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(state.masterVolume, this.ctx.currentTime);

      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 64;

      // Stream destination for video export recording
      if (this.ctx.createMediaStreamDestination) {
        this.streamDest = this.ctx.createMediaStreamDestination();
        this.masterGain.connect(this.streamDest);
      }

      this.masterGain.connect(this.analyser);
      this.analyser.connect(this.ctx.destination);
      this.isInit = true;
    }

    resume() {
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    }

    setMasterVolume(val) {
      if (this.masterGain && this.ctx) {
        const effectiveVol = state.isMuted ? 0 : val;
        this.masterGain.gain.setTargetAtTime(effectiveVol, this.ctx.currentTime, 0.05);
      }
    }

    playWhoosh() {
      if (state.isMuted) return;
      this.init();
      this.resume();
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(80, now);
      osc.frequency.exponentialRampToValueAtTime(800, now + 0.15);
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.4);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(300, now);
      filter.frequency.linearRampToValueAtTime(2400, now + 0.15);
      filter.frequency.linearRampToValueAtTime(100, now + 0.4);

      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.7, now + 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.5);
    }

    playSubImpact() {
      if (state.isMuted) return;
      this.init();
      this.resume();
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const sub = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(160, now);
      osc.frequency.exponentialRampToValueAtTime(35, now + 0.5);

      sub.type = 'sine';
      sub.frequency.setValueAtTime(80, now);
      sub.frequency.exponentialRampToValueAtTime(25, now + 0.8);

      gain.gain.setValueAtTime(1.0, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

      osc.connect(gain);
      sub.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      sub.start(now);
      osc.stop(now + 1.2);
      sub.stop(now + 1.2);
    }

    playLaser() {
      if (state.isMuted) return;
      this.init();
      this.resume();
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(1800, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.22);

      gain.gain.setValueAtTime(0.5, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.26);
    }

    playGlitch() {
      if (state.isMuted) return;
      this.init();
      this.resume();
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.setValueAtTime(880, now + 0.04);
      osc.frequency.setValueAtTime(220, now + 0.08);

      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.16);
    }

    startSoundtrackLoop() {
      this.stopSoundtrackLoop();
      if (state.isMuted || state.currentSoundtrack === 'silent') return;
      this.init();
      this.resume();

      let step = 0;
      const bpm = state.currentSoundtrack === 'cyber-synthwave' ? 120 : 75;
      const intervalMs = (60 / bpm) * 1000 / 2; // 8th notes

      this.synthInterval = setInterval(() => {
        if (!state.isPlaying && !isExporting) return;
        this.playScoreStep(step);
        step = (step + 1) % 32;
      }, intervalMs);
    }

    stopSoundtrackLoop() {
      if (this.synthInterval) {
        clearInterval(this.synthInterval);
        this.synthInterval = null;
      }
    }

    playScoreStep(step) {
      if (!this.ctx || state.isMuted) return;
      const now = this.ctx.currentTime;
      const soundtrack = state.currentSoundtrack;

      if (soundtrack === 'epic-orchestral') {
        // Deep cinematic chords and bass brass
        if (step % 8 === 0) {
          const rootFreq = [55, 65.4, 49, 43.6][Math.floor(step / 8) % 4];
          this.triggerPadNote(rootFreq, 2.5, 'sawtooth', 0.2);
          this.triggerPadNote(rootFreq * 1.5, 2.5, 'triangle', 0.15);
          this.triggerPadNote(rootFreq * 2, 2.5, 'sine', 0.15);
        }
        if (step % 4 === 0) {
          this.triggerKick();
        }
      } else if (soundtrack === 'cyber-synthwave') {
        // Driving 16th bassline arpeggio
        const bassNotes = [55, 55, 110, 82.4, 73.4, 55, 98, 110];
        const freq = bassNotes[step % bassNotes.length];
        this.triggerSynthPluck(freq, 0.22, 'sawtooth');

        if (step % 4 === 0) {
          this.triggerKick();
        }
        if (step % 8 === 4) {
          this.triggerSnare();
        }
      } else if (soundtrack === 'ambient-space') {
        // Shimmering celestial pads
        if (step % 16 === 0) {
          const droneNotes = [65.41, 77.78, 87.31, 98];
          const f = droneNotes[Math.floor(step / 16) % droneNotes.length];
          this.triggerPadNote(f, 4.0, 'sine', 0.2);
          this.triggerPadNote(f * 2.01, 3.8, 'triangle', 0.1);
          this.triggerPadNote(f * 3.02, 3.5, 'sine', 0.08);
        }
      }
    }

    triggerKick() {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(38, now + 0.18);
      gain.gain.setValueAtTime(0.7, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.26);
    }

    triggerSnare() {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.1);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.16);
    }

    triggerSynthPluck(freq, dur, type = 'sawtooth') {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1600, now);
      filter.frequency.exponentialRampToValueAtTime(200, now + dur);

      gain.gain.setValueAtTime(0.28, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + dur + 0.05);
    }

    triggerPadNote(freq, dur, type = 'sine', vol = 0.2) {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(vol, now + 0.6);
      gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + dur + 0.1);
    }
  }

  const audio = new WebAudioEngine();

  // Create Visualizer Bars in DOM
  function setupVisualizerUI() {
    if (!visualizerContainer) return;
    visualizerContainer.innerHTML = '';
    for (let i = 0; i < 24; i++) {
      const bar = document.createElement('div');
      bar.className = 'vis-bar';
      bar.style.height = `${Math.random() * 20 + 8}px`;
      visualizerContainer.appendChild(bar);
    }
  }

  function updateVisualizer() {
    if (!visualizerContainer) return;
    const bars = visualizerContainer.children;
    if (audio.analyser && state.isPlaying) {
      const data = new Uint8Array(audio.analyser.frequencyBinCount);
      audio.analyser.getByteFrequencyData(data);
      for (let i = 0; i < bars.length; i++) {
        const val = data[i % data.length] || 10;
        const h = Math.max(6, (val / 255) * 80);
        bars[i].style.height = `${h}px`;
      }
    } else {
      // Gentle idle wave
      const t = Date.now() * 0.003;
      for (let i = 0; i < bars.length; i++) {
        const h = Math.sin(t + i * 0.4) * 12 + 16;
        bars[i].style.height = `${h}px`;
      }
    }
  }

  // =========================================================================
  // PROCEDURAL CANVAS CINEMA RENDERER
  // =========================================================================

  // Generate starfield particles
  const stars = Array.from({ length: 120 }, () => ({
    x: Math.random(),
    y: Math.random(),
    size: Math.random() * 2.2 + 0.5,
    speed: Math.random() * 0.08 + 0.02,
    color: ['#ffffff', '#a5b4fc', '#38bdf8', '#f472b6'][Math.floor(Math.random() * 4)]
  }));

  // Skyscraper building data for cyberpunk scene
  const buildings = Array.from({ length: 32 }, (_, i) => ({
    x: (i / 32) * 1.3 - 0.15,
    w: 0.035 + Math.random() * 0.04,
    h: 0.35 + Math.random() * 0.55,
    windows: Math.random() > 0.3,
    color: Math.random() > 0.5 ? '#ec4899' : '#06b6d4'
  }));

  // Rain particles
  const rain = Array.from({ length: 90 }, () => ({
    x: Math.random(),
    y: Math.random(),
    len: Math.random() * 25 + 15,
    speed: Math.random() * 0.03 + 0.02
  }));

  // Matrix characters
  const matrixCols = 40;
  const matrixY = Array.from({ length: matrixCols }, () => Math.random() * 50);

  // Cherry blossom petals for Samurai scenes
  const cherryPetals = Array.from({ length: 50 }, () => ({
    x: Math.random(),
    y: Math.random(),
    size: Math.random() * 6 + 4,
    speedX: Math.random() * 0.08 + 0.03,
    speedY: Math.random() * 0.05 + 0.02,
    rot: Math.random() * Math.PI * 2
  }));

  // Ocean plankton & bubbles
  const plankton = Array.from({ length: 60 }, () => ({
    x: Math.random(),
    y: Math.random(),
    size: Math.random() * 3.5 + 1.2,
    alpha: Math.random() * 0.8 + 0.2,
    speedY: Math.random() * 0.03 + 0.01,
    color: ['#38bdf8', '#818cf8', '#2dd4bf', '#a78bfa'][Math.floor(Math.random() * 4)]
  }));

  // Mars / Desert dust storm particles
  const dustParticles = Array.from({ length: 80 }, () => ({
    x: Math.random(),
    y: Math.random(),
    size: Math.random() * 3 + 1,
    speedX: Math.random() * 0.16 + 0.08,
    speedY: (Math.random() - 0.5) * 0.02
  }));

  // Fantasy rising embers
  const embers = Array.from({ length: 60 }, () => ({
    x: Math.random(),
    y: Math.random(),
    size: Math.random() * 3.5 + 1,
    speedY: Math.random() * 0.08 + 0.03,
    speedX: (Math.random() - 0.5) * 0.04
  }));

  // Pre-load all guaranteed high-definition cinematic pictures
  // Real Live-Action Movie Video Assets
  const videoSources = {
    'people-walking': 'assets/videos/people-walking.mp4',
    'city-street': 'assets/videos/city-street.mp4',
    'actor-walking': 'assets/videos/actor-walking.mp4',
    'pedestrians': 'assets/videos/pedestrians.mp4'
  };

  const loadedVideos = {};

  function initMovieVideos() {
    if (typeof document === 'undefined') return;
    for (const [key, src] of Object.entries(videoSources)) {
      try {
        const v = document.createElement('video');
        v.src = src;
        v.crossOrigin = 'anonymous';
        v.loop = true;
        v.muted = true;
        v.playsInline = true;
        v.autoplay = true;
        v.preload = 'auto';
        v.playbackRate = 1.0;
        if (v.addEventListener) {
          v.addEventListener('canplay', () => {
            v.isReady = true;
          });
        }
        const playPromise = v.play();
        if (playPromise !== undefined) {
          playPromise.catch(() => {});
        }
        loadedVideos[key] = v;
      } catch (err) {
        console.warn('Video init notice for ' + key, err);
      }
    }
  }

  const loadedImages = {};
  if (typeof CINEMA_PICTURES !== 'undefined') {
    for (const [key, uri] of Object.entries(CINEMA_PICTURES)) {
      const img = new Image();
      img.onload = () => { img.isReady = true; };
      img.src = uri;
      loadedImages[key] = img;
    }
  }

  let userUploadedImg = null;

  function renderSceneFrame(t, width, height) {
    const sceneTime = t % state.duration;
    
    // Determine active scene
    let currentSceneType = 'cyberpunk';
    for (const sc of state.activeScenes) {
      if (sceneTime >= sc.start && sceneTime < sc.end) {
        currentSceneType = sc.type;
        break;
      }
    }

    ctx.save();

    // 1. Camera Motion Simulation
    applyCameraMotion(ctx, t, width, height);

    // 2. Determine picture key
    let picKey = 'movie-walk';
    if (currentSceneType.includes('movie-walk') || currentSceneType.includes('walk')) picKey = 'movie-walk';
    else if (currentSceneType.includes('cyberpunk')) picKey = 'cyberpunk';
    else if (currentSceneType.includes('samurai')) picKey = 'samurai';
    else if (currentSceneType.includes('space') || currentSceneType.includes('singularity')) picKey = 'space';
    else if (currentSceneType.includes('ocean')) picKey = 'ocean';
    else if (currentSceneType.includes('desert')) picKey = 'desert';
    else if (currentSceneType.includes('fantasy')) picKey = 'fantasy';
    else if (currentSceneType.includes('synthwave') || currentSceneType.includes('grid')) picKey = 'synthwave';

    // Check if active scene is a Real Live-Action Movie Video
    const realVideoKeys = ['people-walking', 'city-street', 'actor-walking', 'pedestrians'];
    let activeVideoKey = null;
    for (const vk of realVideoKeys) {
      if (currentSceneType.includes(vk)) {
        activeVideoKey = vk;
        break;
      }
    }
    if (!activeVideoKey && (currentSceneType.includes('walk') || currentSceneType === 'movie-walk')) {
      activeVideoKey = 'people-walking';
    }

    if (activeVideoKey) {
      const v = loadedVideos[activeVideoKey];
      if (v && v.readyState >= 2) {
        // Sync playback state
        if (state.isPlaying && v.paused) {
          v.play().catch(() => {});
        } else if (!state.isPlaying && !v.paused) {
          v.pause();
        }
        // Draw Real Live-Action Movie Footage directly to Canvas!
        ctx.drawImage(v, 0, 0, width, height);

        // Draw Authentic Cinema Movie Subtitles
        drawRealMovieSubtitles(ctx, t, width, height, activeVideoKey);
      } else {
        // While video buffers, draw the cinematic procedural scene
        drawMovieWalkScene(ctx, t, width, height);
      }
    } else if (currentSceneType === 'user-photo' && userUploadedImg && userUploadedImg.complete) {
      // Ken Burns 3D slow zoom on user uploaded photo
      const zoom = 1.0 + (t % state.duration) * 0.035;
      const offsetX = Math.sin(t * 0.4) * 20;
      ctx.save();
      ctx.translate(width / 2, height / 2);
      ctx.scale(zoom, zoom);
      ctx.drawImage(userUploadedImg, -width / 2 + offsetX, -height / 2, width, height);
      ctx.restore();
    } else {
      // Always draw the full high-definition vivid picture plate
      switch (currentSceneType) {
        case 'movie-walk':
        case 'walk':
          drawMovieWalkScene(ctx, t, width, height);
          break;
        case 'space':
        case 'singularity':
          drawSpaceScene(ctx, t, width, height, currentSceneType === 'singularity');
          break;
        case 'cyberpunk':
          drawCyberpunkScene(ctx, t, width, height);
          break;
        case 'synthwave':
        case 'grid':
          drawSynthwaveScene(ctx, t, width, height);
          break;
        case 'nature':
          drawNatureScene(ctx, t, width, height);
          break;
        case 'matrix':
          drawMatrixScene(ctx, t, width, height);
          break;
        case 'samurai':
        case 'samurai-climax':
          drawSamuraiScene(ctx, t, width, height, currentSceneType === 'samurai-climax');
          break;
        case 'ocean':
        case 'ocean-deep':
          drawOceanScene(ctx, t, width, height, currentSceneType === 'ocean-deep');
          break;
        case 'desert':
        case 'desert-storm':
          drawDesertScene(ctx, t, width, height, currentSceneType === 'desert-storm');
          break;
        case 'fantasy':
        case 'fantasy-dragon':
          drawFantasyScene(ctx, t, width, height, currentSceneType === 'fantasy-dragon');
          break;
        case 'horror':
          drawHorrorScene(ctx, t, width, height);
          break;
        default:
          drawCyberpunkScene(ctx, t, width, height);
      }

      // Optional SVG layer enhancement if loaded and ready
      if (loadedImages[picKey] && loadedImages[picKey].complete && loadedImages[picKey].naturalWidth > 0) {
        ctx.save();
        ctx.globalAlpha = 0.22;
        ctx.globalCompositeOperation = 'screen';
        ctx.drawImage(loadedImages[picKey], 0, 0, width, height);
        ctx.restore();
      }
    }

    ctx.restore();

    // 3. Post-Processing: Anamorphic Flares, Titles, Color LUT, Vignette, Film Grain, Letterboxing
    drawPostProcessing(ctx, t, width, height);
  }

  function applyCameraMotion(context, t, width, height) {
    const motion = state.cameraMotion;
    const cx = width / 2;
    const cy = height / 2;

    context.translate(cx, cy);

    if (motion === 'pan-zoom') {
      const zoom = 1.0 + (t % state.duration) * 0.025;
      const panX = Math.sin(t * 0.5) * 12;
      context.scale(zoom, zoom);
      context.translate(panX, 0);
    } else if (motion === 'dolly-zoom') {
      const prog = (t % 4) / 4;
      const zoom = 1.0 + Math.sin(prog * Math.PI) * 0.08;
      context.scale(zoom, zoom);
    } else if (motion === 'handheld') {
      const shakeX = Math.sin(t * 5.2) * 2.5 + Math.cos(t * 2.7) * 1.5;
      const shakeY = Math.cos(t * 4.4) * 1.8 + Math.sin(t * 1.9) * 1.5;
      const rot = Math.sin(t * 1.5) * 0.005;
      context.rotate(rot);
      context.translate(shakeX, shakeY);
    } else if (motion === 'orbital') {
      const rot = Math.sin(t * 0.4) * 0.03;
      const zoom = 1.03;
      context.rotate(rot);
      context.scale(zoom, zoom);
    }

    context.translate(-cx, -cy);
  }

  // =========================================================================
  // SCENE RENDERERS - ULTRA-VIVID HIGH-CONTRAST CINEMATIC PICTURES
  // =========================================================================

  // Real Movie Dialogue Subtitles for Live-Action Cinema Footage
  function drawRealMovieSubtitles(context, t, width, height, videoKey) {
    context.save();
    context.textAlign = 'center';
    context.font = 'bold 22px "Cinzel", "Space Grotesk", Georgia, serif';
    context.shadowColor = '#000000';
    context.shadowBlur = 12;

    const subTime = t % 8.0;
    let subtitleLine = '[city ambiance, footsteps echo on pavement]';

    if (videoKey === 'city-street') {
      if (subTime >= 2.5 && subTime < 5.5) {
        subtitleLine = 'NARRATOR: "Midday in the metropolis. Over 4,000 pedestrians cross every hour."';
      } else if (subTime >= 5.5) {
        subtitleLine = 'DIRECTOR: "Hold on the crosswalk — let the crowd move naturally."';
      }
    } else if (videoKey === 'actor-walking') {
      if (subTime >= 2.5 && subTime < 5.5) {
        subtitleLine = 'ELENA: "They said nobody would notice if I walked away."';
      } else if (subTime >= 5.5) {
        subtitleLine = 'MARCUS: "I noticed."';
      }
    } else if (videoKey === 'pedestrians') {
      if (subTime >= 2.5 && subTime < 5.5) {
        subtitleLine = 'PROTAGONIST: "In the middle of the crowd, everything is clear."';
      } else if (subTime >= 5.5) {
        subtitleLine = '[camera tracks wide as pedestrians continue down the avenue]';
      }
    } else {
      // people-walking default
      if (subTime >= 2.5 && subTime < 5.5) {
        subtitleLine = 'DIRECTOR: "Scene 12 — The Walkers of New York, Take 1"';
      } else if (subTime >= 5.5) {
        subtitleLine = 'ACTOR: "Every person in this crowd has an untold story."';
      }
    }

    // Semi-transparent cinema subtitle bar
    context.fillStyle = 'rgba(0, 0, 0, 0.72)';
    const textW = context.measureText(subtitleLine).width;
    context.fillRect(width / 2 - textW / 2 - 18, height * 0.88, textW + 36, 36);

    // Subtitle Text in 35mm cinema yellow
    context.fillStyle = '#fef08a';
    context.fillText(subtitleLine, width / 2, height * 0.88 + 25);
    context.restore();
  }

  // Helper for cross-browser rounded rectangles
  function drawRoundedBox(ctx, x, y, w, h, r) {
    if (ctx.roundRect) {
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, r);
      ctx.fill();
    } else {
      ctx.fillRect(x, y, w, h);
    }
  }

  // Realistic Procedural Human Walk Cycle Engine
  function drawWalkingHuman(context, x, y, scale, walkPhase, direction, opts = {}) {
    context.save();
    context.translate(x, y);
    if (direction < 0) {
      context.scale(-1, 1);
    }

    const s = scale;
    const phi = walkPhase * Math.PI * 2;
    
    // Bounce calculation (weight transfer on footsteps)
    const bounce = Math.abs(Math.sin(phi)) * 3.5 * s;
    const hipY = -62 * s - bounce;
    const shoulderY = hipY - 32 * s;
    const headY = shoulderY - 18 * s;

    const coatColor = opts.coatColor || '#1e293b';
    const pantsColor = opts.pantsColor || '#0f172a';
    const skinColor = opts.skinColor || '#fed7aa';
    const shoeColor = opts.shoeColor || '#020617';
    const umbrella = opts.umbrella || false;
    const hat = opts.hat !== false;

    // 1. Dynamic Contact Shadow on Ground (expands and contracts with stride)
    const shadowWidth = (28 + Math.abs(Math.sin(phi)) * 14) * s;
    context.save();
    context.fillStyle = 'rgba(0, 0, 0, 0.45)';
    context.beginPath();
    context.ellipse(0, 0, shadowWidth, 5 * s, 0, 0, Math.PI * 2);
    context.fill();
    context.restore();

    // Leg angles (stride)
    const stride = opts.stride || 0.46;
    const leg1Angle = Math.sin(phi) * stride;
    const leg2Angle = Math.sin(phi + Math.PI) * stride;

    // Helper: draw leg with thigh, calf & shoe
    const drawLeg = (angle, isBack) => {
      context.save();
      context.translate(0, hipY);
      context.rotate(angle);
      
      // Upper leg (thigh)
      context.fillStyle = isBack ? '#090d16' : pantsColor;
      drawRoundedBox(context, -4.5 * s, 0, 9 * s, 32 * s, 4 * s);

      // Lower leg (calf) with natural knee bend when swinging forward
      const kneeBend = Math.max(0, -angle * 0.85);
      context.translate(0, 30 * s);
      context.rotate(kneeBend);
      context.fillStyle = isBack ? '#05070c' : pantsColor;
      drawRoundedBox(context, -4 * s, 0, 8 * s, 32 * s, 4 * s);

      // Shoe
      context.fillStyle = shoeColor;
      context.beginPath();
      context.ellipse(3 * s, 32 * s, 7 * s, 3.5 * s, 0, 0, Math.PI * 2);
      context.fill();

      context.restore();
    };

    // 2. Far/Back Leg
    drawLeg(leg2Angle, true);

    // 3. Far/Back Arm (swinging opposite to leg2)
    const arm2Angle = -leg2Angle * 0.9;
    context.save();
    context.translate(-2 * s, shoulderY);
    context.rotate(arm2Angle);
    context.fillStyle = '#0f172a';
    drawRoundedBox(context, -3.5 * s, 0, 7 * s, 34 * s, 3.5 * s);
    context.restore();

    // 4. Torso & Trench Coat / Jacket
    context.save();
    context.translate(0, hipY);
    const torsoTilt = Math.sin(phi) * 0.03 + 0.04; // natural forward lean
    context.rotate(torsoTilt);

    // Torso Body
    context.fillStyle = coatColor;
    context.beginPath();
    context.moveTo(-11 * s, 0);
    context.lineTo(-9 * s, -32 * s);
    context.lineTo(9 * s, -32 * s);
    context.lineTo(11 * s, 0);
    context.closePath();
    context.fill();

    // Flowing Coat Tail (swaying realistically with walk momentum)
    const coatFlap = Math.sin(phi - 0.5) * 8 * s;
    context.beginPath();
    context.moveTo(-11 * s, 0);
    context.lineTo(11 * s, 0);
    context.lineTo(12 * s + coatFlap * 0.4, 26 * s);
    context.lineTo(-14 * s - coatFlap, 26 * s);
    context.closePath();
    context.fill();

    // Scarf
    if (opts.scarf) {
      context.fillStyle = opts.scarfColor || '#dc2626';
      context.fillRect(-9 * s, -34 * s, 18 * s, 6 * s);
      // Trailing scarf tail
      context.beginPath();
      context.moveTo(-8 * s, -32 * s);
      context.lineTo(-18 * s - Math.sin(phi) * 6 * s, -18 * s);
      context.lineTo(-14 * s - Math.sin(phi) * 6 * s, -16 * s);
      context.lineTo(-7 * s, -30 * s);
      context.fill();
    }
    context.restore();

    // 5. Head & Face
    context.save();
    context.translate(0, headY);
    context.fillStyle = skinColor;
    context.beginPath();
    context.ellipse(0, 0, 8.5 * s, 10 * s, 0, 0, Math.PI * 2);
    context.fill();

    // Hat (Fedora / Brimmed Cinema Hat)
    if (hat) {
      const hatColor = opts.hatColor || coatColor;
      context.fillStyle = hatColor;
      // Hat brim
      context.beginPath();
      context.ellipse(1 * s, -5 * s, 15 * s, 3.5 * s, -0.05, 0, Math.PI * 2);
      context.fill();
      // Hat crown
      context.fillRect(-7 * s, -17 * s, 14 * s, 12 * s);
    }
    context.restore();

    // 6. Near/Front Leg
    drawLeg(leg1Angle, false);

    // 7. Near/Front Arm (swinging opposite to leg1)
    const arm1Angle = -leg1Angle * 0.9;
    context.save();
    context.translate(3 * s, shoulderY);
    if (!umbrella) {
      context.rotate(arm1Angle);
      context.fillStyle = coatColor;
      drawRoundedBox(context, -3.5 * s, 0, 7 * s, 34 * s, 3.5 * s);

      // Hand
      context.fillStyle = skinColor;
      context.beginPath();
      context.arc(0, 35 * s, 3.5 * s, 0, Math.PI * 2);
      context.fill();

      // Briefcase
      if (opts.briefcase) {
        context.fillStyle = '#78350f';
        context.fillRect(-4 * s, 35 * s, 16 * s, 12 * s);
        context.strokeStyle = '#d97706';
        context.lineWidth = 1 * s;
        context.strokeRect(-4 * s, 35 * s, 16 * s, 12 * s);
      }
    } else {
      // Arm holding umbrella handle upwards
      context.rotate(-0.55);
      context.fillStyle = coatColor;
      drawRoundedBox(context, -3.5 * s, 0, 7 * s, 26 * s, 3.5 * s);

      // Hand holding umbrella
      context.fillStyle = skinColor;
      context.beginPath();
      context.arc(0, 26 * s, 3.5 * s, 0, Math.PI * 2);
      context.fill();

      // Umbrella shaft
      context.strokeStyle = '#94a3b8';
      context.lineWidth = 2.5 * s;
      context.beginPath();
      context.moveTo(0, 26 * s);
      context.lineTo(4 * s, -40 * s);
      context.stroke();

      // Umbrella canopy
      context.save();
      context.translate(4 * s, -40 * s);
      const uGrad = context.createLinearGradient(0, -26 * s, 0, 0);
      uGrad.addColorStop(0, opts.umbrellaColor || '#0284c7');
      uGrad.addColorStop(1, 'rgba(14, 165, 233, 0.7)');
      context.fillStyle = uGrad;
      context.beginPath();
      context.arc(0, 0, 36 * s, Math.PI, Math.PI * 2);
      context.fill();

      // Umbrella rim & ribs
      context.strokeStyle = '#38bdf8';
      context.lineWidth = 1.5 * s;
      context.beginPath();
      context.arc(0, 0, 36 * s, Math.PI, Math.PI * 2);
      context.stroke();
      context.restore();
    }
    context.restore();

    context.restore();
  }

  // Scene: Cinematic City Street Walkers (Hollywood Tracking Shot)
  function drawMovieWalkScene(context, t, width, height) {
    // 1. Golden Hour Twilight Sky Gradient
    const sky = context.createLinearGradient(0, 0, 0, height * 0.65);
    sky.addColorStop(0, '#090d1a');
    sky.addColorStop(0.35, '#1e1b4b');
    sky.addColorStop(0.65, '#581c87');
    sky.addColorStop(0.85, '#b91c1c');
    sky.addColorStop(1, '#f59e0b');
    context.fillStyle = sky;
    context.fillRect(0, 0, width, height * 0.65);

    // 2. Distant Metropolitan Skyline Silhouettes with Lit Windows
    const skyline = [
      { x: 0.05, w: 0.14, h: 0.55 },
      { x: 0.22, w: 0.16, h: 0.68 },
      { x: 0.40, w: 0.18, h: 0.50 },
      { x: 0.60, w: 0.15, h: 0.62 },
      { x: 0.78, w: 0.20, h: 0.58 }
    ];
    context.fillStyle = '#1e1b4b';
    for (const b of skyline) {
      const bx = b.x * width;
      const bw = b.w * width;
      const bh = b.h * height;
      context.fillRect(bx, height * 0.65 - bh, bw, bh);
      // Window dots
      context.fillStyle = '#fef08a';
      for (let wy = height * 0.65 - bh + 25; wy < height * 0.65 - 15; wy += 22) {
        context.fillRect(bx + 8, wy, 4, 6);
        context.fillRect(bx + bw - 12, wy, 4, 6);
      }
      context.fillStyle = '#1e1b4b';
    }

    // 3. Continuous Camera Pan Simulation for Tracking Shot
    const trackPan = (t * 80) % 640;

    // 4. Street-level Storefront Architecture (Café, Cinema, Bookstore)
    const streetBaseY = height * 0.65;

    // Building Facades
    context.fillStyle = '#18181b';
    context.fillRect(0, streetBaseY - 180, width, 180);

    // Brick texture bands
    context.strokeStyle = '#27272a';
    context.lineWidth = 1;
    for (let by = streetBaseY - 170; by < streetBaseY; by += 16) {
      context.beginPath();
      context.moveTo(0, by);
      context.lineTo(width, by);
      context.stroke();
    }

    // Classic Hollywood Cinema Marquee
    const marqueeX = ((width * 0.65 - trackPan) % (width + 400)) - 100;
    context.save();
    context.fillStyle = '#7f1d1d';
    context.fillRect(marqueeX, streetBaseY - 165, 300, 65);
    context.strokeStyle = '#fbbf24';
    context.lineWidth = 3;
    context.strokeRect(marqueeX, streetBaseY - 165, 300, 65);

    // Marquee Chaser Bulbs
    const bulbOn = Math.floor(t * 8) % 2 === 0;
    for (let bx = marqueeX + 8; bx < marqueeX + 295; bx += 18) {
      context.fillStyle = bulbOn ? '#fef08a' : '#f59e0b';
      context.beginPath();
      context.arc(bx, streetBaseY - 160, 3, 0, Math.PI * 2);
      context.arc(bx, streetBaseY - 105, 3, 0, Math.PI * 2);
      context.fill();
    }

    // Marquee Signboard Text
    context.font = '900 16px "Space Grotesk", sans-serif';
    context.fillStyle = '#fef08a';
    context.shadowColor = '#fbbf24';
    context.shadowBlur = 10;
    context.fillText('★ PARAMOUNT THEATRE ★', marqueeX + 32, streetBaseY - 138);
    context.font = 'bold 13px "Space Grotesk", sans-serif';
    context.fillStyle = '#ffffff';
    context.fillText('NOW PLAYING: "THE WALKERS"', marqueeX + 38, streetBaseY - 116);
    context.restore();

    // Warm Café Storefront Window with Interior Silhouettes
    const cafeX = ((width * 0.15 - trackPan) % (width + 500)) - 100;
    context.save();
    // Warm Interior Glow
    const cafeGlow = context.createRadialGradient(cafeX + 110, streetBaseY - 80, 10, cafeX + 110, streetBaseY - 80, 140);
    cafeGlow.addColorStop(0, '#fef08a');
    cafeGlow.addColorStop(0.5, '#f59e0b');
    cafeGlow.addColorStop(1, 'rgba(180, 83, 9, 0.4)');
    context.fillStyle = cafeGlow;
    context.fillRect(cafeX, streetBaseY - 140, 220, 140);

    // Café Window Mullions & Sign
    context.strokeStyle = '#292524';
    context.lineWidth = 4;
    context.strokeRect(cafeX, streetBaseY - 140, 220, 140);
    context.strokeRect(cafeX, streetBaseY - 140, 110, 140);

    // Striped Awning above Café
    for (let ax = cafeX; ax < cafeX + 220; ax += 22) {
      context.fillStyle = (ax / 22) % 2 === 0 ? '#991b1b' : '#fef3c7';
      context.fillRect(ax, streetBaseY - 165, 22, 25);
    }

    // Café Interior Silhouettes (people sitting at bistro table)
    context.fillStyle = '#292524';
    context.beginPath();
    context.arc(cafeX + 60, streetBaseY - 60, 14, 0, Math.PI * 2);
    context.arc(cafeX + 150, streetBaseY - 60, 14, 0, Math.PI * 2);
    context.fill();
    context.fillRect(cafeX + 45, streetBaseY - 45, 30, 45);
    context.fillRect(cafeX + 135, streetBaseY - 45, 30, 45);
    context.restore();

    // 5. Wet Reflective Sidewalk Pavement & Curb
    const sidewalkY = streetBaseY;
    const sidewalkH = height * 0.22;
    const sidewalkGrad = context.createLinearGradient(0, sidewalkY, 0, sidewalkY + sidewalkH);
    sidewalkGrad.addColorStop(0, '#27272a');
    sidewalkGrad.addColorStop(0.4, '#3f3f46');
    sidewalkGrad.addColorStop(1, '#18181b');
    context.fillStyle = sidewalkGrad;
    context.fillRect(0, sidewalkY, width, sidewalkH);

    // Pavement Tile Grid with Wet Sheen Reflections
    context.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    context.lineWidth = 1;
    for (let py = sidewalkY + 25; py < sidewalkY + sidewalkH; py += 30) {
      context.beginPath();
      context.moveTo(0, py);
      context.lineTo(width, py);
      context.stroke();
    }

    // Street Asphalt & Curbstone
    const roadY = sidewalkY + sidewalkH;
    context.fillStyle = '#09090b';
    context.fillRect(0, roadY, width, height - roadY);
    context.fillStyle = '#52525b';
    context.fillRect(0, roadY - 4, width, 4); // Granite curb highlight

    // 6. Ornate Cast-Iron Street Lamps casting Warm Golden Volumetric Cones
    for (let lx = ((180 - trackPan) % 360) - 100; lx < width + 100; lx += 360) {
      context.save();
      // Lamp Post
      context.fillStyle = '#09090b';
      context.fillRect(lx - 3.5, streetBaseY - 150, 7, 150);
      // Crossarm & Lantern
      context.fillRect(lx - 16, streetBaseY - 150, 32, 5);
      context.beginPath();
      context.moveTo(lx - 12, streetBaseY - 145);
      context.lineTo(lx + 12, streetBaseY - 145);
      context.lineTo(lx + 8, streetBaseY - 125);
      context.lineTo(lx - 8, streetBaseY - 125);
      context.closePath();
      context.fillStyle = '#fef08a';
      context.shadowColor = '#f59e0b';
      context.shadowBlur = 35;
      context.fill();

      // Volumetric Light Cone on Sidewalk
      context.globalCompositeOperation = 'screen';
      const lCone = context.createRadialGradient(lx, streetBaseY - 125, 10, lx, streetBaseY + 60, 160);
      lCone.addColorStop(0, 'rgba(254, 240, 138, 0.45)');
      lCone.addColorStop(0.5, 'rgba(245, 158, 11, 0.2)');
      lCone.addColorStop(1, 'rgba(0, 0, 0, 0)');
      context.fillStyle = lCone;
      context.beginPath();
      context.moveTo(lx - 10, streetBaseY - 125);
      context.lineTo(lx + 90, streetBaseY + 110);
      context.lineTo(lx - 90, streetBaseY + 110);
      context.closePath();
      context.fill();
      context.restore();
    }

    // 7. CINEMATIC WALKING PEOPLE (People Walking in the Movie!)
    
    // Background Walker (Crossing the street, scale 0.55)
    const bgWalkX = ((width * 0.85 - t * 45) % (width + 300)) - 100;
    drawWalkingHuman(context, bgWalkX, streetBaseY - 5, 0.55, t * 1.1, -1, {
      coatColor: '#334155',
      pantsColor: '#1e293b',
      hat: true
    });

    // Couple Walking Arm-in-Arm in Midground (scale 0.78)
    const coupleBaseX = ((width * 0.1 - trackPan * 0.6) % (width + 500)) + 80;
    drawWalkingHuman(context, coupleBaseX, streetBaseY + 45, 0.78, t * 1.25, 1, {
      coatColor: '#9f1239',
      pantsColor: '#0f172a',
      hat: false,
      scarf: true,
      scarfColor: '#fef08a'
    });
    drawWalkingHuman(context, coupleBaseX + 22, streetBaseY + 48, 0.78, t * 1.25 + 0.1, 1, {
      coatColor: '#1e293b',
      pantsColor: '#090d16',
      hat: true
    });

    // Commuter with Briefcase in Midground (scale 0.88)
    const commuterX = ((width * 0.68 + t * 55) % (width + 400)) - 150;
    drawWalkingHuman(context, commuterX, streetBaseY + 70, 0.88, t * 1.3, 1, {
      coatColor: '#374151',
      pantsColor: '#111827',
      hat: true,
      briefcase: true
    });

    // Pedestrian Walking with Glowing Umbrella in Opposite Direction (scale 1.05)
    const umbrellaX = ((width * 0.92 - t * 90) % (width + 350)) - 120;
    drawWalkingHuman(context, umbrellaX, streetBaseY + 95, 1.05, t * 1.35, -1, {
      coatColor: '#0f172a',
      pantsColor: '#020617',
      hat: false,
      umbrella: true,
      umbrellaColor: '#06b6d4',
      scarf: true,
      scarfColor: '#f43f5e'
    });

    // MAIN PROTAGONIST (Arthur) - Held in cinematic rule-of-thirds frame by Tracking Camera!
    const heroX = width * 0.42;
    const heroY = streetBaseY + 105;
    drawWalkingHuman(context, heroX, heroY, 1.25, t * 1.38, 1, {
      coatColor: '#1e293b',
      pantsColor: '#090d16',
      hat: true,
      hatColor: '#1e293b',
      scarf: true,
      scarfColor: '#b91c1c'
    });

    // 8. Authentic Hollywood Movie Dialogue Subtitles
    context.save();
    context.textAlign = 'center';
    context.font = 'bold 22px "Cinzel", "Space Grotesk", Georgia, serif';
    context.shadowColor = '#000000';
    context.shadowBlur = 12;

    const subTime = t % 8.0;
    let subtitleLine = '[footsteps echo softly along the boulevard]';
    if (subTime >= 2.5 && subTime < 5.4) {
      subtitleLine = 'ARTHUR: "In this city, every street tells a story."';
    } else if (subTime >= 5.4) {
      subtitleLine = "ELENA: \"Then let's keep walking until we find the ending.\"";
    }

    // Subtitle background pill for high contrast
    context.fillStyle = 'rgba(0, 0, 0, 0.65)';
    const textW = context.measureText(subtitleLine).width;
    context.fillRect(width / 2 - textW / 2 - 16, height * 0.88, textW + 32, 34);

    // Subtitle Text (Cinema Yellow)
    context.fillStyle = '#fef08a';
    context.fillText(subtitleLine, width / 2, height * 0.88 + 24);
    context.restore();
  }

  // Scene 1: Neon Cyberpunk Metropolis (Vibrant & Luminous)
  function drawCyberpunkScene(context, t, width, height) {
    // 1. Brilliant Neon Sky Gradient
    const sky = context.createLinearGradient(0, 0, 0, height);
    sky.addColorStop(0, '#16082f');
    sky.addColorStop(0.35, '#3b0764');
    sky.addColorStop(0.7, '#701a75');
    sky.addColorStop(1, '#0f172a');
    context.fillStyle = sky;
    context.fillRect(0, 0, width, height);

    // 2. Massive Glowing Cyberpunk Neon Sun / Moon
    const sunX = width * 0.35;
    const sunY = height * 0.32;
    const sunR = 85;
    context.save();
    const sunGrad = context.createLinearGradient(sunX, sunY - sunR, sunX, sunY + sunR);
    sunGrad.addColorStop(0, '#fde047');
    sunGrad.addColorStop(0.5, '#f43f5e');
    sunGrad.addColorStop(1, '#c026d3');
    context.fillStyle = sunGrad;
    context.shadowColor = '#ec4899';
    context.shadowBlur = 60;
    context.beginPath();
    context.arc(sunX, sunY, sunR, 0, Math.PI * 2);
    context.fill();

    // Horizontal cuts in sun
    context.fillStyle = '#16082f';
    for (let i = 0; i < 5; i++) {
      const cutY = sunY + 10 + i * 14;
      context.fillRect(sunX - sunR - 10, cutY, (sunR + 10) * 2, 3 + i * 1.5);
    }
    context.restore();

    // 3. Distant Skyline Layer 1 (Deep Violet Silhouettes with lit windows)
    const dBuildings = [
      { x: 0.05, w: 0.12, h: 0.55 },
      { x: 0.20, w: 0.15, h: 0.65 },
      { x: 0.38, w: 0.18, h: 0.48 },
      { x: 0.58, w: 0.14, h: 0.70 },
      { x: 0.75, w: 0.20, h: 0.58 }
    ];
    context.fillStyle = '#2e1065';
    for (const b of dBuildings) {
      context.fillRect(b.x * width, height - b.h * height, b.w * width, b.h * height);
    }

    // 4. Midground Skyline Layer 2 (Navy Slate with hundreds of bright lit windows)
    for (const b of buildings) {
      const bx = b.x * width;
      const bw = b.w * width;
      const bh = b.h * height;
      const by = height - bh;

      // Building Body
      context.fillStyle = '#181b34';
      context.fillRect(bx, by, bw, bh);

      // Neon Rim Outline
      context.strokeStyle = b.color;
      context.lineWidth = 1.5;
      context.strokeRect(bx, by, bw, bh);

      // Rooftop glowing beacon antenna
      context.fillStyle = b.color;
      context.fillRect(bx + bw * 0.5 - 1.5, by - 26, 3, 26);
      context.shadowColor = b.color;
      context.shadowBlur = 10;
      context.beginPath();
      context.arc(bx + bw * 0.5, by - 26, 4, 0, Math.PI * 2);
      context.fill();
      context.shadowBlur = 0;

      // Bright Lit Windows (Golden Yellow, Electric Cyan, Hot Pink)
      if (b.windows) {
        for (let wy = by + 22; wy < height - 70; wy += 20) {
          const isYellow = (wy + bx) % 3 === 0;
          context.fillStyle = isYellow ? '#fde047' : (b.color || '#38bdf8');
          context.fillRect(bx + 4, wy, 5, 8);
          context.fillRect(bx + bw - 9, wy, 5, 8);
          if (bw > 35) {
            context.fillRect(bx + bw * 0.5 - 2.5, wy, 5, 8);
          }
        }
      }
    }

    // 5. Giant Holographic Neon Billboards
    context.save();
    context.font = '900 32px "Space Grotesk", sans-serif';
    context.fillStyle = '#06b6d4';
    context.shadowColor = '#06b6d4';
    context.shadowBlur = 24;
    context.fillText('CAMARA // 2099', width * 0.55, height * 0.45);
    context.font = 'bold 18px "Space Grotesk", sans-serif';
    context.fillStyle = '#ec4899';
    context.shadowColor = '#ec4899';
    context.shadowBlur = 18;
    context.fillText('⚡ AI MIND DIRECTED CINEMA ⚡', width * 0.55, height * 0.49);
    context.restore();

    // 6. Flying Sci-Fi Aerocar (Hovercar) with Glowing Headlights & Thrusters
    const hx = ((width * 0.15 + t * 110) % (width + 300)) - 150;
    const hy = height * 0.38 + Math.sin(t * 2) * 14;

    context.save();
    // Headlight Beam
    context.globalCompositeOperation = 'screen';
    const hLight = context.createRadialGradient(hx + 50, hy, 5, hx + 220, hy, 160);
    hLight.addColorStop(0, 'rgba(255, 255, 255, 0.85)');
    hLight.addColorStop(0.3, 'rgba(56, 189, 248, 0.4)');
    hLight.addColorStop(1, 'rgba(0, 0, 0, 0)');
    context.fillStyle = hLight;
    context.beginPath();
    context.moveTo(hx + 40, hy);
    context.lineTo(hx + 240, hy - 40);
    context.lineTo(hx + 240, hy + 40);
    context.closePath();
    context.fill();
    context.globalCompositeOperation = 'source-over';

    // Aerocar Body
    context.fillStyle = '#0f172a';
    context.strokeStyle = '#06b6d4';
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(hx - 40, hy + 8);
    context.lineTo(hx + 40, hy + 8);
    context.lineTo(hx + 48, hy);
    context.lineTo(hx + 20, hy - 10);
    context.lineTo(hx - 25, hy - 10);
    context.closePath();
    context.fill();
    context.stroke();

    // Windshield
    context.fillStyle = '#38bdf8';
    context.beginPath();
    context.moveTo(hx - 5, hy - 8);
    context.lineTo(hx + 18, hy - 8);
    context.lineTo(hx + 26, hy);
    context.lineTo(hx - 5, hy);
    context.closePath();
    context.fill();

    // Cyan/Magenta Ion Thrusters Behind
    context.fillStyle = '#ec4899';
    context.shadowColor = '#ec4899';
    context.shadowBlur = 15;
    context.fillRect(hx - 50, hy - 3, 12, 6);
    context.restore();

    // 7. Luminous Wet Street Reflections at Bottom
    const road = context.createLinearGradient(0, height * 0.84, 0, height);
    road.addColorStop(0, 'rgba(15, 23, 42, 0.95)');
    road.addColorStop(0.5, 'rgba(6, 182, 212, 0.35)');
    road.addColorStop(1, 'rgba(236, 72, 153, 0.25)');
    context.fillStyle = road;
    context.fillRect(0, height * 0.84, width, height * 0.16);

    // 7B. Cyberpunk Walking Pedestrians on Sidewalk
    const cWalk1X = ((width * 0.25 + t * 65) % (width + 300)) - 100;
    drawWalkingHuman(context, cWalk1X, height * 0.86, 0.95, t * 1.3, 1, {
      coatColor: '#0f172a',
      pantsColor: '#020617',
      umbrella: true,
      umbrellaColor: '#ec4899',
      hat: false
    });

    const cWalk2X = ((width * 0.85 - t * 75) % (width + 300)) - 100;
    drawWalkingHuman(context, cWalk2X, height * 0.88, 1.05, t * 1.35, -1, {
      coatColor: '#1e1b4b',
      pantsColor: '#0f172a',
      umbrella: true,
      umbrellaColor: '#06b6d4',
      hat: true,
      hatColor: '#06b6d4'
    });

    // 8. Rain Streaks
    context.strokeStyle = 'rgba(165, 243, 252, 0.4)';
    context.lineWidth = 1.5;
    for (const r of rain) {
      const rx = (r.x * width - t * 90) % width;
      const ry = ((r.y + t * r.speed * 10) % 1) * height;
      context.beginPath();
      context.moveTo(rx, ry);
      context.lineTo(rx - 8, ry + r.len);
      context.stroke();
    }
  }

  // Scene 2: Deep Space & Singularity (Vivid Cosmos)
  function drawSpaceScene(context, t, width, height, isSingularity) {
    // 1. Cosmic Background Radial Gradient
    const bgGrad = context.createRadialGradient(
      width * 0.5, height * 0.5, 60,
      width * 0.5, height * 0.5, width * 0.75
    );
    bgGrad.addColorStop(0, isSingularity ? '#2e0854' : '#0f1742');
    bgGrad.addColorStop(0.5, '#0b0f2a');
    bgGrad.addColorStop(1, '#020617');
    context.fillStyle = bgGrad;
    context.fillRect(0, 0, width, height);

    // 2. Vibrant Glowing Nebula Clouds (Screen Composite)
    context.save();
    context.globalCompositeOperation = 'screen';

    // Magenta Nebula
    const mNeb = context.createRadialGradient(
      width * 0.35 + Math.sin(t * 0.3) * 45,
      height * 0.38 + Math.cos(t * 0.2) * 35,
      30,
      width * 0.35, height * 0.38, width * 0.4
    );
    mNeb.addColorStop(0, 'rgba(236, 72, 153, 0.45)');
    mNeb.addColorStop(0.6, 'rgba(168, 85, 247, 0.25)');
    mNeb.addColorStop(1, 'rgba(0, 0, 0, 0)');
    context.fillStyle = mNeb;
    context.fillRect(0, 0, width, height);

    // Cyan Nebula
    const cNeb = context.createRadialGradient(
      width * 0.7 + Math.cos(t * 0.25) * 40,
      height * 0.65 + Math.sin(t * 0.3) * 30,
      40,
      width * 0.7, height * 0.65, width * 0.45
    );
    cNeb.addColorStop(0, 'rgba(6, 182, 212, 0.4)');
    cNeb.addColorStop(0.6, 'rgba(59, 130, 246, 0.2)');
    cNeb.addColorStop(1, 'rgba(0, 0, 0, 0)');
    context.fillStyle = cNeb;
    context.fillRect(0, 0, width, height);
    context.restore();

    // 3. Bright Multi-Colored Twinkling Stars
    for (const star of stars) {
      const sx = (star.x * width + t * star.speed * width) % width;
      const sy = star.y * height;
      context.fillStyle = star.color || '#ffffff';
      context.beginPath();
      context.arc(sx, sy, star.size * 1.2, 0, Math.PI * 2);
      context.fill();

      // Cross flare twinkle
      if (star.size > 2.0 && Math.sin(t * 4 + star.x * 20) > 0.5) {
        context.fillStyle = 'rgba(255, 255, 255, 0.7)';
        context.fillRect(sx - star.size * 3, sy - 0.5, star.size * 6, 1);
        context.fillRect(sx - 0.5, sy - star.size * 3, 1, star.size * 6);
      }
    }

    if (isSingularity) {
      // 4A. Gargantua Singularity / Black Hole Accretion Disk
      const cx = width / 2;
      const cy = height / 2;
      context.save();
      context.translate(cx, cy);

      // Accretion Disk Swirl
      const diskGrad = context.createLinearGradient(-width * 0.35, 0, width * 0.35, 0);
      diskGrad.addColorStop(0, '#38bdf8');
      diskGrad.addColorStop(0.3, '#f43f5e');
      diskGrad.addColorStop(0.5, '#fbbf24');
      diskGrad.addColorStop(0.7, '#f97316');
      diskGrad.addColorStop(1, '#38bdf8');

      context.rotate(Math.PI * 0.08);
      context.scale(1, 0.35);

      context.strokeStyle = diskGrad;
      context.lineWidth = 55;
      context.shadowColor = '#fbbf24';
      context.shadowBlur = 50;
      context.beginPath();
      context.arc(0, 0, 200, 0, Math.PI * 2);
      context.stroke();

      // Black Hole Event Horizon Shadow Center
      context.shadowBlur = 0;
      context.fillStyle = '#000000';
      context.beginPath();
      context.arc(0, 0, 170, 0, Math.PI * 2);
      context.fill();

      // Glowing Event Horizon Rim Light
      context.strokeStyle = '#ffffff';
      context.lineWidth = 4;
      context.shadowColor = '#67e8f9';
      context.shadowBlur = 20;
      context.stroke();

      context.restore();
    } else {
      // 4B. Giant Turquoise Ringed Planet
      const px = width * 0.74;
      const py = height * 0.36;
      const pr = 95;

      // Planet Sphere
      const planetGrad = context.createRadialGradient(
        px - 35, py - 35, 15,
        px, py, pr
      );
      planetGrad.addColorStop(0, '#67e8f9');
      planetGrad.addColorStop(0.35, '#0284c7');
      planetGrad.addColorStop(0.7, '#1e1b4b');
      planetGrad.addColorStop(1, '#020617');

      context.save();
      context.fillStyle = planetGrad;
      context.shadowColor = '#38bdf8';
      context.shadowBlur = 30;
      context.beginPath();
      context.arc(px, py, pr, 0, Math.PI * 2);
      context.fill();
      context.shadowBlur = 0;

      // Orbital Rings
      context.save();
      context.translate(px, py);
      context.rotate(Math.PI * -0.15);
      context.scale(1, 0.28);

      const ringGrad = context.createLinearGradient(-pr * 2.2, 0, pr * 2.2, 0);
      ringGrad.addColorStop(0, 'rgba(251, 191, 36, 0.85)');
      ringGrad.addColorStop(0.5, 'rgba(244, 114, 182, 0.8)');
      ringGrad.addColorStop(1, 'rgba(56, 189, 248, 0.85)');

      context.strokeStyle = ringGrad;
      context.lineWidth = 22;
      context.beginPath();
      context.arc(0, 0, pr * 1.7, 0, Math.PI * 2);
      context.stroke();
      context.restore();
      context.restore();

      // 5. Sci-Fi Explorer Spacecraft Gliding in Foreground
      const sx = ((width * 0.2 + t * 70) % (width + 250)) - 100;
      const sy = height * 0.65;
      context.save();
      // Blue Ion Thruster Plume
      context.fillStyle = '#38bdf8';
      context.shadowColor = '#06b6d4';
      context.shadowBlur = 20;
      context.beginPath();
      context.moveTo(sx - 35, sy - 4);
      context.lineTo(sx - 75 - Math.random() * 15, sy);
      context.lineTo(sx - 35, sy + 4);
      context.fill();

      // Spaceship Hull
      context.fillStyle = '#e2e8f0';
      context.beginPath();
      context.moveTo(sx + 35, sy);
      context.lineTo(sx - 25, sy - 14);
      context.lineTo(sx - 35, sy);
      context.lineTo(sx - 25, sy + 14);
      context.closePath();
      context.fill();
      context.restore();
    }
  }

  // Scene 3: Samurai Thunderstorm & Cherry Blossom Duel
  function drawSamuraiScene(context, t, width, height, isClimax) {
    // Dynamic lightning trigger
    const isLightning = (t * 1.4) % 3.0 < 0.09 || (isClimax && (t * 2.2) % 2.0 < 0.12);

    // 1. Sky Gradient
    if (isLightning) {
      context.fillStyle = '#dbeafe';
      context.fillRect(0, 0, width, height);
    } else {
      const sky = context.createLinearGradient(0, 0, 0, height);
      sky.addColorStop(0, '#090d16');
      sky.addColorStop(0.4, '#1e1b4b');
      sky.addColorStop(0.8, '#312e81');
      sky.addColorStop(1, '#1e293b');
      context.fillStyle = sky;
      context.fillRect(0, 0, width, height);
    }

    // 2. Full Glowing Moon
    if (!isLightning) {
      context.save();
      const moonX = width * 0.72;
      const moonY = height * 0.28;
      const moonR = 75;
      context.fillStyle = isClimax ? '#fda4af' : '#ffffff';
      context.shadowColor = isClimax ? '#f43f5e' : '#93c5fd';
      context.shadowBlur = 50;
      context.beginPath();
      context.arc(moonX, moonY, moonR, 0, Math.PI * 2);
      context.fill();
      context.restore();
    }

    // 3. Majestic 5-Tier Japanese Pagoda Temple Silhouette with Glowing Golden Lanterns
    const px = width * 0.18;
    const py = height * 0.28;
    context.save();
    context.fillStyle = isLightning ? '#1e293b' : '#0a0d18';
    // Pagoda Tiers
    for (let tier = 0; tier < 5; tier++) {
      const tierY = py + tier * 55;
      const tierW = 120 - tier * 12;
      // Roof with curved eaves
      context.beginPath();
      context.moveTo(px - tierW, tierY + 22);
      context.quadraticCurveTo(px, tierY + 12, px + tierW, tierY + 22);
      context.lineTo(px + tierW - 15, tierY + 35);
      context.lineTo(px - tierW + 15, tierY + 35);
      context.closePath();
      context.fill();

      // Hanging Golden Lanterns
      context.fillStyle = '#fbbf24';
      context.shadowColor = '#f59e0b';
      context.shadowBlur = 12;
      context.beginPath();
      context.arc(px - tierW + 12, tierY + 30, 4.5, 0, Math.PI * 2);
      context.arc(px + tierW - 12, tierY + 30, 4.5, 0, Math.PI * 2);
      context.fill();
      context.shadowBlur = 0;
      context.fillStyle = isLightning ? '#1e293b' : '#0a0d18';
    }
    // Pagoda Finial Spire
    context.fillRect(px - 2, py - 20, 4, 45);
    context.restore();

    // 4. Swaying Bamboo Forest Stalks
    const numBamboo = 22;
    for (let i = 0; i < numBamboo; i++) {
      const bx = (i / numBamboo) * width + Math.sin(t * 0.8 + i) * 6;
      const bw = 10 + (i % 3) * 4;
      context.fillStyle = isLightning ? '#334155' : (i % 2 === 0 ? '#0b1120' : '#1e293b');
      context.fillRect(bx, 0, bw, height);

      // Bamboo nodes
      context.fillStyle = '#475569';
      for (let ny = 40; ny < height; ny += 85) {
        context.fillRect(bx - 2, ny, bw + 4, 3.5);
      }
    }

    // 5. Samurai Warrior with Flowing Haori & Glowing Katana
    context.save();
    const sx = isClimax ? width * 0.5 : width * 0.42;
    const sy = height * 0.72;
    context.fillStyle = '#020617';

    // Jingasa Hat
    context.beginPath();
    context.ellipse(sx, sy - 88, 48, 14, 0, 0, Math.PI * 2);
    context.fill();

    // Torso & Flowing Robe
    context.beginPath();
    context.moveTo(sx - 30, sy + 70);
    context.lineTo(sx - 16, sy - 76);
    context.lineTo(sx + 16, sy - 76);
    context.lineTo(sx + 36, sy + 70);
    context.closePath();
    context.fill();

    // Katana Blade with Brilliant Cyan/White Light Trail
    context.strokeStyle = isLightning ? '#ffffff' : '#38bdf8';
    context.lineWidth = 3.5;
    context.shadowColor = '#38bdf8';
    context.shadowBlur = 20;
    context.beginPath();
    context.moveTo(sx + 10, sy - 20);
    const kx = sx + 85 + Math.sin(t * 2.5) * 15;
    const ky = sy - 70 - Math.cos(t * 2.5) * 12;
    context.lineTo(kx, ky);
    context.stroke();
    context.restore();

    // 6. Swirling Pink Cherry Blossom (Sakura) Petals
    context.save();
    for (const p of cherryPetals) {
      const px = (p.x * width + t * p.speedX * width) % width;
      const py = (p.y * height + t * p.speedY * height) % height;
      const rot = p.rot + t * 2.5;

      context.translate(px, py);
      context.rotate(rot);
      context.fillStyle = 'rgba(244, 114, 182, 0.9)';
      context.beginPath();
      context.ellipse(0, 0, p.size * 1.3, p.size * 0.6, 0, 0, Math.PI * 2);
      context.fill();
      context.rotate(-rot);
      context.translate(-px, -py);
    }
    context.restore();

    // 6B. Wandering Ronin Traveler Walking past Temple
    const wanderX = ((width * 0.15 + t * 45) % (width + 300)) - 100;
    drawWalkingHuman(context, wanderX, height * 0.82, 0.92, t * 1.2, 1, {
      coatColor: '#1c1917',
      pantsColor: '#0c0a09',
      hat: true,
      hatColor: '#78350f'
    });

    // 7. Wind and Rain Streaks
    context.strokeStyle = isLightning ? 'rgba(30, 41, 59, 0.6)' : 'rgba(203, 213, 225, 0.4)';
    context.lineWidth = 1.3;
    for (const r of rain) {
      const rx = (r.x * width + t * 90) % width;
      const ry = ((r.y + t * r.speed * 12) % 1) * height;
      context.beginPath();
      context.moveTo(rx, ry);
      context.lineTo(rx + 12, ry + r.len);
      context.stroke();
    }
  }

  // Scene 4: Abyssal Ocean & Bioluminescence
  function drawOceanScene(context, t, width, height, isDeep) {
    // 1. Sunlit Azure to Deep Abyssal Gradient
    const ocean = context.createLinearGradient(0, 0, 0, height);
    ocean.addColorStop(0, isDeep ? '#0369a1' : '#0284c7');
    ocean.addColorStop(0.4, '#075985');
    ocean.addColorStop(0.8, '#0c4a6e');
    ocean.addColorStop(1, '#082f49');
    context.fillStyle = ocean;
    context.fillRect(0, 0, width, height);

    // 2. Sunlight Caustic God Rays Piercing the Surface
    context.save();
    context.globalCompositeOperation = 'screen';
    for (let i = 0; i < 6; i++) {
      const rayX = width * (0.15 + i * 0.15) + Math.sin(t * 0.6 + i) * 35;
      const rayGrad = context.createLinearGradient(rayX, 0, rayX + 70, height);
      rayGrad.addColorStop(0, 'rgba(125, 211, 252, 0.4)');
      rayGrad.addColorStop(0.5, 'rgba(45, 212, 191, 0.18)');
      rayGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      context.fillStyle = rayGrad;
      context.beginPath();
      context.moveTo(rayX, 0);
      context.lineTo(rayX + 45, 0);
      context.lineTo(rayX + 180, height);
      context.lineTo(rayX + 80, height);
      context.closePath();
      context.fill();
    }
    context.restore();

    // 3. Giant Glowing Bioluminescent Jellyfish
    const jx = width * 0.58 + Math.sin(t * 0.6) * 45;
    const jy = height * 0.46 + Math.cos(t * 0.8) * 30;
    const pulse = 1.0 + Math.sin(t * 3.5) * 0.15;

    context.save();
    // Glowing Bell
    const bellGrad = context.createRadialGradient(jx, jy, 8, jx, jy, 55 * pulse);
    bellGrad.addColorStop(0, 'rgba(244, 114, 182, 0.95)');
    bellGrad.addColorStop(0.5, 'rgba(6, 182, 212, 0.8)');
    bellGrad.addColorStop(1, 'rgba(147, 51, 234, 0)');
    context.fillStyle = bellGrad;
    context.shadowColor = '#06b6d4';
    context.shadowBlur = 35;
    context.beginPath();
    context.arc(jx, jy, 52 * pulse, Math.PI, Math.PI * 2);
    context.fill();

    // Undulating Tentacles
    context.strokeStyle = '#38bdf8';
    context.lineWidth = 2.5;
    for (let i = -4; i <= 4; i++) {
      context.beginPath();
      context.moveTo(jx + i * 9 * pulse, jy);
      const wave = Math.sin(t * 3 + i) * 14;
      context.quadraticCurveTo(jx + i * 14 + wave, jy + 65, jx + i * 8 - wave, jy + 130);
      context.stroke();
    }
    context.restore();

    // 4. Yellow Deep-Sea Submersible with High-Beam Searchlights
    context.save();
    const subX = width * 0.24;
    const subY = height * 0.68;

    // Twin High-Intensity Searchlight Beams
    context.globalCompositeOperation = 'screen';
    const light = context.createRadialGradient(subX + 90, subY, 15, subX + 340, subY, 260);
    light.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
    light.addColorStop(0.3, 'rgba(56, 189, 248, 0.45)');
    light.addColorStop(1, 'rgba(0, 0, 0, 0)');
    context.fillStyle = light;
    context.beginPath();
    context.moveTo(subX + 75, subY);
    context.lineTo(width * 0.85, subY - 90);
    context.lineTo(width * 0.88, subY + 100);
    context.closePath();
    context.fill();
    context.globalCompositeOperation = 'source-over';

    // Submersible Hull (Vivid Yellow)
    context.fillStyle = '#eab308';
    context.strokeStyle = '#ca8a04';
    context.lineWidth = 2.5;
    context.beginPath();
    context.ellipse(subX, subY, 90, 32, 0, 0, Math.PI * 2);
    context.fill();
    context.stroke();

    // Conning Tower
    context.fillRect(subX - 16, subY - 48, 32, 22);

    // Glowing Observation Dome
    context.fillStyle = '#67e8f9';
    context.shadowColor = '#38bdf8';
    context.shadowBlur = 15;
    context.beginPath();
    context.arc(subX + 70, subY, 14, 0, Math.PI * 2);
    context.fill();
    context.restore();

    // 5. Plankton & Floating Bubbles
    for (const p of plankton) {
      const px = (p.x * width + Math.sin(t * 0.8 + p.y * 10) * 20) % width;
      const py = ((p.y - t * p.speedY) % 1 + 1) % 1 * height;
      context.fillStyle = p.color || '#38bdf8';
      context.globalAlpha = p.alpha || 0.7;
      context.beginPath();
      context.arc(px, py, p.size * 1.3, 0, Math.PI * 2);
      context.fill();
    }
    context.globalAlpha = 1.0;
  }

  // Scene 5: Mars Red Dunes & Dust Storm
  function drawDesertScene(context, t, width, height, isStorm) {
    // 1. Martian Twilight Sunset Gradient
    const sky = context.createLinearGradient(0, 0, 0, height);
    sky.addColorStop(0, '#3b0764');
    sky.addColorStop(0.35, '#991b1b');
    sky.addColorStop(0.7, '#c2410c');
    sky.addColorStop(1, '#f97316');
    context.fillStyle = sky;
    context.fillRect(0, 0, width, height);

    // 2. Twin Moons (Phobos & Deimos)
    context.fillStyle = '#fde047';
    context.shadowColor = '#f59e0b';
    context.shadowBlur = 35;
    context.beginPath();
    context.arc(width * 0.65, height * 0.22, 42, 0, Math.PI * 2);
    context.fill();

    context.fillStyle = '#e2e8f0';
    context.shadowBlur = 15;
    context.beginPath();
    context.arc(width * 0.78, height * 0.15, 16, 0, Math.PI * 2);
    context.fill();
    context.shadowBlur = 0;

    // 3. Rolling Martian Sand Dunes in Layers
    const drawDune = (yBase, amp, color, speed) => {
      context.fillStyle = color;
      context.beginPath();
      context.moveTo(0, height);
      context.lineTo(0, yBase);
      for (let x = 0; x <= width; x += 25) {
        const h = Math.sin((x + t * speed) * 0.006) * amp + Math.cos((x + t * speed) * 0.015) * (amp * 0.35);
        context.lineTo(x, yBase + h);
      }
      context.lineTo(width, height);
      context.closePath();
      context.fill();
    };

    drawDune(height * 0.54, 75, '#b91c1c', 15);
    drawDune(height * 0.66, 60, '#9a3412', 30);
    drawDune(height * 0.78, 45, '#7c2d12', 50);

    // 4. Mars Planetary Exploration Rover with Headlights
    const rx = width * 0.44;
    const ry = height * 0.74;

    context.save();
    // Rover Headlight Beam
    context.globalCompositeOperation = 'screen';
    const rBeam = context.createRadialGradient(rx + 35, ry, 10, rx + 180, ry, 120);
    rBeam.addColorStop(0, 'rgba(255, 255, 255, 0.85)');
    rBeam.addColorStop(0.3, 'rgba(103, 232, 249, 0.4)');
    rBeam.addColorStop(1, 'rgba(0, 0, 0, 0)');
    context.fillStyle = rBeam;
    context.beginPath();
    context.moveTo(rx + 30, ry);
    context.lineTo(rx + 220, ry - 30);
    context.lineTo(rx + 220, ry + 30);
    context.closePath();
    context.fill();
    context.globalCompositeOperation = 'source-over';

    // Rover Chassis & Solar Array
    context.fillStyle = '#1e1b4b';
    context.fillRect(rx - 32, ry - 22, 64, 25);
    // Solar Panel
    context.fillStyle = '#0284c7';
    context.fillRect(rx - 28, ry - 28, 56, 6);
    // Mast Camera
    context.fillStyle = '#e2e8f0';
    context.fillRect(rx + 12, ry - 50, 6, 28);
    // 6 Rugged Wheels
    context.fillStyle = '#0f172a';
    context.beginPath();
    context.arc(rx - 25, ry + 10, 11, 0, Math.PI * 2);
    context.arc(rx, ry + 10, 11, 0, Math.PI * 2);
    context.arc(rx + 25, ry + 10, 11, 0, Math.PI * 2);
    context.fill();
    context.restore();

    // 4B. Astronauts Walking across the Martian Dunes Ridge
    const astro1X = ((width * 0.22 + t * 35) % (width + 300)) - 100;
    drawWalkingHuman(context, astro1X, height * 0.62, 0.65, t * 1.1, 1, {
      coatColor: '#e2e8f0',
      pantsColor: '#cbd5e1',
      hat: true,
      hatColor: '#38bdf8'
    });
    drawWalkingHuman(context, astro1X - 35, height * 0.63, 0.62, t * 1.1 + 0.15, 1, {
      coatColor: '#e2e8f0',
      pantsColor: '#94a3b8',
      hat: true,
      hatColor: '#38bdf8'
    });

    // 5. Swirling Warm Dust Particles
    context.fillStyle = 'rgba(254, 215, 170, 0.7)';
    for (const d of dustParticles) {
      const dx = (d.x * width + t * d.speedX * width) % width;
      const dy = (d.y * height + t * d.speedY * height) % height;
      context.fillRect(dx, dy, d.size * 2.5, d.size * 1.2);
    }
  }

  // Scene 6: Medieval Fantasy Fortress & Dragon
  function drawFantasyScene(context, t, width, height, isDragon) {
    // 1. Twilight Sky Gradient
    const sky = context.createLinearGradient(0, 0, 0, height);
    sky.addColorStop(0, '#1e1b4b');
    sky.addColorStop(0.4, '#4c0519');
    sky.addColorStop(0.7, '#831843');
    sky.addColorStop(1, '#ea580c');
    context.fillStyle = sky;
    context.fillRect(0, 0, width, height);

    // 2. Shimmering Aurora Borealis Waves (Green & Violet)
    context.save();
    context.globalCompositeOperation = 'screen';
    for (let i = 0; i < 3; i++) {
      const aY = height * 0.15 + i * 40 + Math.sin(t * 0.7 + i) * 20;
      const aGrad = context.createLinearGradient(0, aY, width, aY);
      aGrad.addColorStop(0, 'rgba(16, 185, 129, 0)');
      aGrad.addColorStop(0.3, 'rgba(52, 211, 153, 0.35)');
      aGrad.addColorStop(0.7, 'rgba(168, 85, 247, 0.3)');
      aGrad.addColorStop(1, 'rgba(16, 185, 129, 0)');
      context.fillStyle = aGrad;
      context.fillRect(0, aY - 20, width, 40);
    }
    context.restore();

    // 3. Glowing Blood Moon
    const moonX = width * 0.52;
    const moonY = height * 0.34;
    context.save();
    context.fillStyle = '#f43f5e';
    context.shadowColor = '#e11d48';
    context.shadowBlur = 55;
    context.beginPath();
    context.arc(moonX, moonY, 75, 0, Math.PI * 2);
    context.fill();
    context.restore();

    // 4. Flying Winged Dragon Breathing Golden Fire!
    const dx = ((t * 85) % (width + 300)) - 150;
    const dy = height * 0.32 + Math.sin(t * 2) * 20;
    const wingFlap = Math.sin(t * 6);

    context.save();
    // Fire Breath Stream
    context.globalCompositeOperation = 'screen';
    const fireGrad = context.createRadialGradient(dx + 65, dy, 5, dx + 180, dy - 15, 100);
    fireGrad.addColorStop(0, '#fef08a');
    fireGrad.addColorStop(0.4, '#f59e0b');
    fireGrad.addColorStop(0.8, '#ef4444');
    fireGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    context.fillStyle = fireGrad;
    context.beginPath();
    context.moveTo(dx + 55, dy - 5);
    context.lineTo(dx + 190, dy - 40);
    context.lineTo(dx + 170, dy + 15);
    context.closePath();
    context.fill();
    context.globalCompositeOperation = 'source-over';

    // Dragon Body & Wings Silhouette
    context.fillStyle = '#0f0205';
    // Body & tail
    context.beginPath();
    context.ellipse(dx, dy, 42, 13, 0, 0, Math.PI * 2);
    context.fill();
    // Head & neck
    context.beginPath();
    context.moveTo(dx + 30, dy);
    context.lineTo(dx + 65, dy - 15);
    context.lineTo(dx + 45, dy);
    context.fill();
    // Wings
    context.beginPath();
    context.moveTo(dx - 10, dy);
    context.lineTo(dx + 10, dy - 50 * wingFlap);
    context.lineTo(dx + 32, dy);
    context.fill();
    context.restore();

    // 5. Mountain Fortress Spires with Lit Golden Windows
    context.fillStyle = '#18080f';
    context.beginPath();
    context.moveTo(0, height);
    context.lineTo(0, height * 0.65);
    // Spire 1
    context.lineTo(width * 0.18, height * 0.65);
    context.lineTo(width * 0.22, height * 0.42);
    context.lineTo(width * 0.26, height * 0.65);
    // Wall crenellations
    for (let cx = width * 0.26; cx < width * 0.68; cx += 35) {
      context.lineTo(cx, height * 0.62);
      context.lineTo(cx + 18, height * 0.62);
      context.lineTo(cx + 18, height * 0.66);
      context.lineTo(cx + 35, height * 0.66);
    }
    // Main High Keep Tower
    context.lineTo(width * 0.72, height * 0.36);
    context.lineTo(width * 0.76, height * 0.65);
    context.lineTo(width, height * 0.65);
    context.lineTo(width, height);
    context.closePath();
    context.fill();

    // Golden Lit Windows in Towers
    context.fillStyle = '#fbbf24';
    context.shadowColor = '#f59e0b';
    context.shadowBlur = 10;
    context.fillRect(width * 0.21, height * 0.48, 6, 12);
    context.fillRect(width * 0.73, height * 0.44, 8, 14);
    context.shadowBlur = 0;

    // 6. Floating Magical Embers
    for (const em of embers) {
      const ex = (em.x * width + Math.sin(t * 2 + em.y * 10) * 20) % width;
      const ey = ((em.y - t * em.speedY) % 1 + 1) % 1 * height;
      context.fillStyle = '#fbbf24';
      context.shadowColor = '#f59e0b';
      context.shadowBlur = 8;
      context.beginPath();
      context.arc(ex, ey, em.size * 1.2, 0, Math.PI * 2);
      context.fill();
    }
    context.shadowBlur = 0;
  }

  // Scene 7: Retro 80s Synthwave Wireframe Grid
  function drawSynthwaveScene(context, t, width, height) {
    // 1. Brilliant Sunset Sky Gradient
    const sky = context.createLinearGradient(0, 0, 0, height * 0.65);
    sky.addColorStop(0, '#11052C');
    sky.addColorStop(0.4, '#3D087B');
    sky.addColorStop(0.7, '#F43B86');
    sky.addColorStop(1, '#FFE459');
    context.fillStyle = sky;
    context.fillRect(0, 0, width, height * 0.65);

    // 2. Glowing Segmented Neon Sun
    const sunR = 85;
    const sunX = width / 2;
    const sunY = height * 0.42;

    const sunGrad = context.createLinearGradient(0, sunY - sunR, 0, sunY + sunR);
    sunGrad.addColorStop(0, '#FFE459');
    sunGrad.addColorStop(1, '#F43B86');

    context.save();
    context.fillStyle = sunGrad;
    context.shadowColor = '#F43B86';
    context.shadowBlur = 45;
    context.beginPath();
    context.arc(sunX, sunY, sunR, 0, Math.PI * 2);
    context.fill();

    // Horizontal Sun Cut Slices
    context.fillStyle = '#11052C';
    for (let cut = 0; cut < 6; cut++) {
      const cutH = cut * 3 + 2;
      const cutY = sunY + cut * 14 - 10;
      context.fillRect(sunX - sunR - 10, cutY, (sunR + 10) * 2, cutH);
    }
    context.restore();

    // 3. Neon Mountain Ridges along Horizon
    const horizonY = height * 0.62;
    context.fillStyle = '#240642';
    context.beginPath();
    context.moveTo(0, horizonY);
    for (let x = 0; x <= width; x += 40) {
      const mPeak = Math.sin(x * 0.015) * 45 + Math.cos(x * 0.035) * 20;
      context.lineTo(x, horizonY - Math.abs(mPeak));
    }
    context.lineTo(width, horizonY);
    context.closePath();
    context.fill();

    // 4. 3D Perspective Outrun Wireframe Grid
    context.fillStyle = '#090514';
    context.fillRect(0, horizonY, width, height - horizonY);

    context.strokeStyle = '#ec4899';
    context.lineWidth = 1.8;
    context.shadowColor = '#ec4899';
    context.shadowBlur = 12;

    // Horizon line
    context.beginPath();
    context.moveTo(0, horizonY);
    context.lineTo(width, horizonY);
    context.stroke();

    // Vanishing perspective lines
    const vpX = width / 2;
    const numLines = 24;
    for (let i = -numLines; i <= numLines; i++) {
      context.beginPath();
      context.moveTo(vpX, horizonY);
      const bottomX = vpX + i * 85;
      context.lineTo(bottomX, height);
      context.stroke();
    }

    // Moving horizontal grid lines
    const gridSpeed = (t * 85) % 50;
    for (let y = horizonY; y < height; y += (y - horizonY) * 0.28 + 6) {
      const actualY = y + gridSpeed * ((y - horizonY) / (height - horizonY));
      if (actualY < height) {
        context.beginPath();
        context.moveTo(0, actualY);
        context.lineTo(width, actualY);
        context.stroke();
      }
    }
    context.shadowBlur = 0;

    // 5. Retro Outrun Sports Car in Center Lane
    const carX = width / 2 + Math.sin(t * 2) * 25;
    const carY = height * 0.86;
    context.save();
    // Neon Underglow
    context.fillStyle = '#ec4899';
    context.shadowColor = '#ec4899';
    context.shadowBlur = 25;
    context.fillRect(carX - 45, carY + 8, 90, 8);

    // Car Body
    context.fillStyle = '#0f172a';
    context.strokeStyle = '#ec4899';
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(carX - 45, carY + 10);
    context.lineTo(carX + 45, carY + 10);
    context.lineTo(carX + 40, carY - 14);
    context.lineTo(carX + 22, carY - 26);
    context.lineTo(carX - 22, carY - 26);
    context.lineTo(carX - 40, carY - 14);
    context.closePath();
    context.fill();
    context.stroke();

    // Glowing Red Tail Light Bar
    context.fillStyle = '#ef4444';
    context.shadowColor = '#ef4444';
    context.shadowBlur = 15;
    context.fillRect(carX - 38, carY - 8, 76, 5);
    context.restore();
  }

  // Scene 8: Nature Alpine Ridge Drone
  function drawNatureScene(context, t, width, height) {
    const sky = context.createLinearGradient(0, 0, 0, height);
    sky.addColorStop(0, '#1e3a8a');
    sky.addColorStop(0.4, '#ea580c');
    sky.addColorStop(0.7, '#fbbf24');
    sky.addColorStop(1, '#fef08a');
    context.fillStyle = sky;
    context.fillRect(0, 0, width, height);

    // Rising golden sun
    const sx = width * 0.48;
    const sy = height * 0.48;
    context.save();
    context.fillStyle = '#fffbeb';
    context.shadowColor = '#f59e0b';
    context.shadowBlur = 80;
    context.beginPath();
    context.arc(sx, sy, 55, 0, Math.PI * 2);
    context.fill();
    context.restore();

    // Mountain silhouettes in layers
    const drawRidge = (baseY, amp, color, offset) => {
      context.fillStyle = color;
      context.beginPath();
      context.moveTo(0, height);
      context.lineTo(0, baseY);
      for (let x = 0; x <= width; x += 30) {
        const peak = Math.sin((x + offset) * 0.005) * amp + Math.cos((x + offset) * 0.012) * (amp * 0.4);
        context.lineTo(x, baseY + peak);
      }
      context.lineTo(width, height);
      context.closePath();
      context.fill();
    };

    drawRidge(height * 0.52, 90, 'rgba(76, 29, 149, 0.45)', 100);
    drawRidge(height * 0.62, 70, 'rgba(30, 27, 75, 0.75)', 300);
    drawRidge(height * 0.74, 55, '#09090b', 500);
  }

  // Scene 9: Matrix Falling Code
  function drawMatrixScene(context, t, width, height) {
    context.fillStyle = 'rgba(2, 6, 12, 0.9)';
    context.fillRect(0, 0, width, height);

    context.font = '14px monospace';
    const chars = '0123456789ABCDEFｦｱｳｴｵｶｷｹｺｻｼｽｾｿﾀﾂﾃﾅﾆﾇﾈ';

    for (let i = 0; i < matrixCols; i++) {
      const char = chars[Math.floor(Math.random() * chars.length)];
      const x = i * (width / matrixCols);
      matrixY[i] = (matrixY[i] + 1) % (height / 18);
      const y = matrixY[i] * 18;

      context.fillStyle = '#22c55e';
      context.fillText(char, x, y);

      // Bright leader head
      context.fillStyle = '#86efac';
      context.fillText(char, x, y + 18);
    }
  }

  // Scene 10: Gothic Horror Moonlit Graveyard
  function drawHorrorScene(context, t, width, height) {
    const sky = context.createLinearGradient(0, 0, 0, height);
    sky.addColorStop(0, '#020617');
    sky.addColorStop(0.5, '#064e3b');
    sky.addColorStop(1, '#022c22');
    context.fillStyle = sky;
    context.fillRect(0, 0, width, height);

    // Pale green eerie moon
    context.save();
    context.fillStyle = '#ecfdf5';
    context.shadowColor = '#34d399';
    context.shadowBlur = 60;
    context.beginPath();
    context.arc(width * 0.5, height * 0.32, 70, 0, Math.PI * 2);
    context.fill();
    context.restore();

    // Gnarled bare trees silhouette
    const drawDeadTree = (tx, ty, scale) => {
      context.strokeStyle = '#020905';
      context.lineWidth = 14 * scale;
      context.beginPath();
      context.moveTo(tx, height);
      context.lineTo(tx, ty);
      context.lineTo(tx - 40 * scale, ty - 50 * scale);
      context.moveTo(tx, ty - 20 * scale);
      context.lineTo(tx + 50 * scale, ty - 65 * scale);
      context.stroke();
    };

    drawDeadTree(width * 0.15, height * 0.5, 1.2);
    drawDeadTree(width * 0.85, height * 0.48, 1.3);

    // Creeping ground fog mist
    const fog = context.createLinearGradient(0, height * 0.68, 0, height);
    fog.addColorStop(0, 'rgba(16, 185, 129, 0.25)');
    fog.addColorStop(0.5, 'rgba(5, 46, 22, 0.7)');
    fog.addColorStop(1, '#020d06');
    context.fillStyle = fog;
    context.fillRect(0, height * 0.68, width, height * 0.32);
  }


  // =========================================================================
  // POST-PROCESSING: LUTs, FLARES, GRAIN, TITLES, LETTERBOXING
  // =========================================================================
  function drawPostProcessing(context, t, width, height) {
    // 1. Anamorphic Lens Flare
    if (state.anamorphicFlare > 0) {
      const flareStrength = state.anamorphicFlare / 100;
      context.save();
      context.globalCompositeOperation = 'screen';
      const flareY = height * 0.45;
      const grad = context.createLinearGradient(0, flareY, width, flareY);
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(0.3, `rgba(6, 182, 212, ${0.4 * flareStrength})`);
      grad.addColorStop(0.5, `rgba(255, 255, 255, ${0.9 * flareStrength})`);
      grad.addColorStop(0.7, `rgba(99, 102, 241, ${0.4 * flareStrength})`);
      grad.addColorStop(1, 'rgba(0,0,0,0)');

      context.fillStyle = grad;
      context.fillRect(0, flareY - 3, width, 6);
      context.restore();
    }

    // 2. Cinematic Titles Overlay
    drawTitleOverlay(context, t, width, height);

    // 3. Cinematic Color Grading (LUT Tint)
    applyLutColorFilter(context, width, height);

    // 4. Contrast & Vignette
    drawVignette(context, width, height);

    // 5. Film Grain Simulation
    if (state.filmGrain > 0) {
      drawFilmGrain(context, width, height);
    }

    // 6. Letterbox Cinema Bars (2.39:1)
    if (state.cinemaBars) {
      const barHeight = height * 0.11;
      context.fillStyle = '#000000';
      context.fillRect(0, 0, width, barHeight);
      context.fillRect(0, height - barHeight, width, barHeight);
    }
  }

  function drawTitleOverlay(context, t, width, height) {
    if (state.titleStyle === 'none') return;
    const sceneTime = t % state.duration;

    // Show title during first half or second half based on style
    let opacity = 1;
    if (sceneTime < 0.6) {
      opacity = sceneTime / 0.6;
    } else if (sceneTime > 3.6 && sceneTime < 4.2) {
      opacity = (4.2 - sceneTime) / 0.6;
    } else if (sceneTime >= 4.2 && sceneTime < 4.8) {
      opacity = (sceneTime - 4.2) / 0.6;
    } else if (sceneTime > 7.4) {
      opacity = (8.0 - sceneTime) / 0.6;
    }
    opacity = Math.max(0, Math.min(1, opacity));

    const title = sceneTime < 4.0 ? state.titleText : (state.subtitleText || state.titleText);
    const sub = sceneTime < 4.0 ? state.subtitleText : 'DIRECTED WITH CAMARA STUDIO';

    context.save();
    context.globalAlpha = opacity;
    context.textAlign = 'center';

    const cx = width / 2;
    const cy = height * 0.52;

    if (state.titleStyle === 'epic-fade') {
      // Interstellar slow scale and wide letter-spacing
      const scale = 1.0 + (sceneTime % 4.0) * 0.025;
      context.translate(cx, cy);
      context.scale(scale, scale);

      context.font = '700 44px "Space Grotesk", sans-serif';
      context.fillStyle = '#f8fafc';
      context.shadowColor = 'rgba(0,0,0,0.8)';
      context.shadowBlur = 20;
      try { context.letterSpacing = '6px'; } catch (e) {}
      context.fillText(title, 0, 0);

      context.font = '600 15px "Plus Jakarta Sans", sans-serif';
      context.fillStyle = '#94a3b8';
      try { context.letterSpacing = '4px'; } catch (e) {}
      context.fillText(sub, 0, 36);

    } else if (state.titleStyle === 'glitch') {
      // Cyberpunk RGB split
      const isGlitch = Math.random() > 0.88;
      const offsetX = isGlitch ? (Math.random() - 0.5) * 14 : 0;
      const offsetY = isGlitch ? (Math.random() - 0.5) * 6 : 0;

      context.font = '800 48px "Space Grotesk", sans-serif';
      if (isGlitch) {
        context.fillStyle = '#ec4899';
        context.fillText(title, cx + offsetX - 3, cy + offsetY);
        context.fillStyle = '#06b6d4';
        context.fillText(title, cx + offsetX + 3, cy + offsetY);
      }
      context.fillStyle = '#ffffff';
      context.fillText(title, cx, cy);

      context.font = '700 16px monospace';
      context.fillStyle = '#38bdf8';
      context.fillText(sub, cx, cy + 34);

    } else if (state.titleStyle === 'cinema-gold') {
      // Gold gradient classical cinematic
      const goldGrad = context.createLinearGradient(0, cy - 30, 0, cy + 10);
      goldGrad.addColorStop(0, '#fef08a');
      goldGrad.addColorStop(0.5, '#f59e0b');
      goldGrad.addColorStop(1, '#b45309');

      context.font = 'bold 46px serif';
      context.fillStyle = goldGrad;
      context.shadowColor = 'rgba(0,0,0,0.9)';
      context.shadowBlur = 15;
      context.fillText(title, cx, cy);

      context.font = 'italic 16px serif';
      context.fillStyle = '#fde68a';
      context.fillText(sub, cx, cy + 34);

    } else {
      // Minimal
      context.font = '600 36px "Plus Jakarta Sans", sans-serif';
      context.fillStyle = '#ffffff';
      context.fillText(title, cx, cy);

      context.font = '500 14px "Plus Jakarta Sans", sans-serif';
      context.fillStyle = '#94a3b8';
      context.fillText(sub, cx, cy + 30);
    }

    context.restore();
  }

  function applyLutColorFilter(context, width, height) {
    const lut = state.lut;
    context.save();

    if (lut === 'teal-orange') {
      context.globalCompositeOperation = 'color-burn';
      context.fillStyle = 'rgba(2, 132, 199, 0.12)';
      context.fillRect(0, 0, width, height);

      context.globalCompositeOperation = 'screen';
      context.fillStyle = 'rgba(249, 115, 22, 0.08)';
      context.fillRect(0, 0, width, height);

    } else if (lut === 'cyberpunk') {
      context.globalCompositeOperation = 'screen';
      context.fillStyle = 'rgba(236, 72, 153, 0.14)';
      context.fillRect(0, 0, width, height);

      context.globalCompositeOperation = 'overlay';
      context.fillStyle = 'rgba(6, 182, 212, 0.15)';
      context.fillRect(0, 0, width, height);

    } else if (lut === 'golden-hour') {
      context.globalCompositeOperation = 'color';
      context.fillStyle = 'rgba(245, 158, 11, 0.18)';
      context.fillRect(0, 0, width, height);

    } else if (lut === 'film-noir') {
      context.globalCompositeOperation = 'color';
      context.fillStyle = 'rgba(120, 120, 120, 0.85)';
      context.fillRect(0, 0, width, height);

      context.globalCompositeOperation = 'hard-light';
      context.fillStyle = 'rgba(0, 0, 0, 0.25)';
      context.fillRect(0, 0, width, height);

    } else if (lut === 'sci-fi-matrix') {
      context.globalCompositeOperation = 'screen';
      context.fillStyle = 'rgba(34, 197, 94, 0.16)';
      context.fillRect(0, 0, width, height);

    } else if (lut === 'vintage-kodak') {
      context.globalCompositeOperation = 'soft-light';
      context.fillStyle = 'rgba(180, 83, 9, 0.25)';
      context.fillRect(0, 0, width, height);
    }

    context.restore();
  }

  function drawVignette(context, width, height) {
    const strength = state.vignette / 100;
    if (strength <= 0) return;

    const vig = context.createRadialGradient(
      width / 2, height / 2, width * 0.25,
      width / 2, height / 2, width * 0.72
    );
    vig.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vig.addColorStop(1, `rgba(0, 0, 0, ${Math.min(0.35, 0.45 * strength)})`);

    context.fillStyle = vig;
    context.fillRect(0, 0, width, height);
  }

  function drawFilmGrain(context, width, height) {
    const grainAlpha = (state.filmGrain / 100) * 0.12;
    context.save();
    context.fillStyle = 'rgba(255, 255, 255, 0.04)';
    const numDots = Math.floor((width * height) * 0.00035);
    for (let i = 0; i < numDots; i++) {
      const gx = Math.random() * width;
      const gy = Math.random() * height;
      context.fillRect(gx, gy, 1, 1);
    }
    context.restore();
  }

  // =========================================================================
  // AUTONOMOUS AI DIRECTOR ("MIND OF ITS OWN")
  // =========================================================================

  const AUTO_STORIES = [
  'Cinematic 35mm film tracking shot of pedestrians walking down 5th Avenue under warm streetlights at sunset',
    "Cyberpunk flying car chase through neon skyscrapers of Tokyo 2099 in rain",
    "Samurai master standing in bamboo forest under pouring rain, lightning storm, and falling pink cherry blossoms",
    "Deep sea exploration submarine diving into Mariana trench encountering giant bioluminescent jellyfish",
    "Astronaut exploring massive purple singularity black hole accretion disk in deep cosmos",
    "Mars rover navigating massive red dust dunes under twin alien moons at sunset",
    "Medieval fantasy fortress siege with flaming trebuchet fireballs and dragon in smoky skies",
    "Retro 1980s synthwave sports car driving towards glowing neon horizon sun on wireframe grid",
    "Gothic vampire hunter walking through foggy haunted graveyard under green full moon"
  ];

  function triggerNextAutonomousScene() {
    state.autoStoryIndex = (state.autoStoryIndex + 1) % AUTO_STORIES.length;
    const prompt = AUTO_STORIES[state.autoStoryIndex];
    const cfg = analyzePromptToMovie(prompt);

    state.activeScenes = cfg.scenes;
    state.titleText = cfg.title;
    state.subtitleText = cfg.subtitle;
    state.lut = cfg.lut;
    state.soundtrack = cfg.soundtrack;
    state.cameraMotion = cfg.cameraMotion;
    state.filmGrain = cfg.grain;
    state.anamorphicFlare = cfg.flare;
    state.contrast = cfg.contrast;
    state.saturation = cfg.saturation;
    state.vignette = cfg.vignette;
    state.cinemaBars = cfg.cinemaBars;

    // Update AI Mind thought stream banner
    const thoughtEl = document.getElementById('ai-mind-thought-text');
    if (thoughtEl) {
      thoughtEl.textContent = `Directing: ${prompt}`;
    }
    if (hudFilter) {
      hudFilter.textContent = `LUT: ${cfg.lut.toUpperCase().replace('-', ' ')}`;
    }
    if (projectTitleInput) {
      projectTitleInput.value = `${cfg.title} - Camara Autonomous Film`;
    }

    // Update Timeline Track Clips
    const clip1 = document.getElementById('clip-scene-1');
    const clip2 = document.getElementById('clip-scene-2');
    if (clip1) clip1.querySelector('.clip-name').textContent = cfg.scenes[0].name;
    if (clip2) clip2.querySelector('.clip-name').textContent = cfg.scenes[1].name;

    // Highlight matching picture pill in bar
    let activePicKey = 'movie-walk';
    const sType = cfg.scenes[0].type;
    if (sType.includes('movie-walk') || sType.includes('walk')) activePicKey = 'movie-walk';
    if (sType.includes('samurai')) activePicKey = 'samurai';
    else if (sType.includes('space') || sType.includes('singularity')) activePicKey = 'space';
    else if (sType.includes('ocean')) activePicKey = 'ocean';
    else if (sType.includes('desert')) activePicKey = 'desert';
    else if (sType.includes('fantasy')) activePicKey = 'fantasy';
    else if (sType.includes('synthwave') || sType.includes('grid')) activePicKey = 'synthwave';

    document.querySelectorAll('.pic-pill-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.pic === activePicKey);
    });

    const helperBanner = document.querySelector('.picture-helper-banner');
    if (helperBanner) {
      helperBanner.innerHTML = `<span class="sparkle-icon">✨</span><span><strong>AI Mind of its Own:</strong> Now directing <em>"${cfg.title}"</em> with live animation! Click any movie picture above to choose your own.</span>`;
    }
  }

  // =========================================================================
  // ANIMATION LOOP & TRANSPORT CONTROLS
  // =========================================================================

  function mainLoop(timestamp) {
    if (!lastTimestamp) lastTimestamp = timestamp;
    const delta = (timestamp - lastTimestamp) / 1000;
    lastTimestamp = timestamp;

    if (state.isPlaying) {
      state.currentTime += delta;
      if (state.currentTime >= state.duration) {
        state.currentTime = 0; // Seamless loop
        if (state.autoPilot && !isExporting) {
          triggerNextAutonomousScene();
        }
      }
      updateTimeReadout();
    }

    try {
      renderSceneFrame(state.currentTime, canvas.width, canvas.height);
      updateVisualizer();
    } catch (err) {
      console.warn('Frame render notice:', err);
    }

    animationFrameId = requestAnimationFrame(mainLoop);
  }

  function updateTimeReadout() {
    const sec = Math.floor(state.currentTime);
    const ms = Math.floor((state.currentTime % 1) * 100);
    const timeStr = `00:${sec < 10 ? '0' : ''}${sec}.${ms < 10 ? '0' : ''}${ms}`;
    currentTimeReadout.textContent = timeStr;

    // Sync real movie video elements when scrubbing
    for (const v of Object.values(loadedVideos)) {
      if (v.duration && !state.isPlaying) {
        v.currentTime = state.currentTime % v.duration;
      }
    }

    // Scrubber update
    const percent = (state.currentTime / state.duration) * 100;
    scrubberProgress.style.width = `${percent}%`;
    scrubberThumb.style.left = `${percent}%`;

    // Timeline playhead update
    if (timelinePlayhead) {
      const tracksArea = document.getElementById('timeline-tracks-area');
      const trackWidth = tracksArea ? (tracksArea.clientWidth - 90) : 500;
      const headX = (percent / 100) * trackWidth;
      timelinePlayhead.style.transform = `translateX(${headX}px)`;
    }
  }

  function togglePlayPause() {
    audio.init();
    for (const v of Object.values(loadedVideos)) {
      if (state.isPlaying) {
        v.pause();
      } else {
        v.play().catch(() => {});
      }
    }
    audio.resume();

    state.isPlaying = !state.isPlaying;
    if (state.isPlaying) {
      playIcon.classList.add('hidden');
      pauseIcon.classList.remove('hidden');
      canvasPlayOverlay.classList.remove('show-overlay');
      audio.startSoundtrackLoop();
    } else {
      playIcon.classList.remove('hidden');
      pauseIcon.classList.add('hidden');
      canvasPlayOverlay.classList.add('show-overlay');
      audio.stopSoundtrackLoop();
    }
  }

  function stopPlayback() {
    state.isPlaying = false;
    state.currentTime = 0;
    playIcon.classList.remove('hidden');
    pauseIcon.classList.add('hidden');
    canvasPlayOverlay.classList.add('show-overlay');
    audio.stopSoundtrackLoop();
    updateTimeReadout();
  }

  // =========================================================================
  // ASPECT RATIO SWITCHING
  // =========================================================================
  function setAspectRatio(ratio) {
    state.aspectRatio = ratio;
    const container = canvasScreenBox;

    if (ratio === '16:9') {
      canvas.width = 1280;
      canvas.height = 720;
      container.style.aspectRatio = '16 / 9';
      hudRes.textContent = '1280 × 720 • 60 FPS';
    } else if (ratio === '9:16') {
      canvas.width = 720;
      canvas.height = 1280;
      container.style.aspectRatio = '9 / 16';
      hudRes.textContent = '720 × 1280 (Vertical Reel)';
    } else if (ratio === '2.39:1') {
      canvas.width = 1280;
      canvas.height = 536;
      container.style.aspectRatio = '2.39 / 1';
      hudRes.textContent = '1280 × 536 (Anamorphic Cinema)';
    } else if (ratio === '1:1') {
      canvas.width = 1080;
      canvas.height = 1080;
      container.style.aspectRatio = '1 / 1';
      hudRes.textContent = '1080 × 1080 (Square)';
    }

    document.querySelectorAll('.aspect-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.ratio === ratio);
    });

    try {
      renderSceneFrame(state.currentTime, canvas.width, canvas.height);
    } catch (e) {}
  }

  // =========================================================================
  // PRESET & TEMPLATE LOADER
  // =========================================================================
  function applyTemplate(key) {
    if (typeof CAMARA_TEMPLATES === 'undefined' || !CAMARA_TEMPLATES[key]) return;
    const tpl = CAMARA_TEMPLATES[key];

    projectTitleInput.value = tpl.projectTitle;
    setAspectRatio(tpl.aspect);

    // LUT
    state.lut = tpl.lut;
    hudFilter.textContent = `LUT: ${tpl.lut.toUpperCase().replace('-', ' ')}`;
    document.querySelectorAll('.lut-card').forEach(c => {
      c.classList.toggle('active', c.dataset.lut === tpl.lut);
    });

    // Camera Motion
    state.cameraMotion = tpl.cameraMotion;
    cameraMotionSelect.value = tpl.cameraMotion;

    // Sliders
    grainSlider.value = tpl.grain;
    grainVal.textContent = `${tpl.grain}%`;
    state.filmGrain = tpl.grain;

    flareSlider.value = tpl.flare;
    flareVal.textContent = `${tpl.flare}%`;
    state.anamorphicFlare = tpl.flare;

    contrastSlider.value = tpl.contrast;
    contrastVal.textContent = `${tpl.contrast}%`;
    state.contrast = tpl.contrast;

    satSlider.value = tpl.saturation;
    satVal.textContent = `${tpl.saturation}%`;
    state.saturation = tpl.saturation;

    vignetteSlider.value = tpl.vignette;
    vignetteVal.textContent = `${tpl.vignette}%`;
    state.vignette = tpl.vignette;

    // Titles
    titleTextInput.value = tpl.mainTitle;
    state.titleText = tpl.mainTitle;
    subtitleTextInput.value = tpl.subtitle;
    state.subtitleText = tpl.subtitle;
    titleStyleSelect.value = tpl.titleStyle;
    state.titleStyle = tpl.titleStyle;
    cinemaBarsToggle.checked = tpl.cinemaBars;
    state.cinemaBars = tpl.cinemaBars;

    // Audio
    state.currentSoundtrack = tpl.soundtrack;
    document.querySelectorAll('.audio-card').forEach(c => {
      c.classList.toggle('active', c.dataset.soundtrack === tpl.soundtrack);
    });
    document.getElementById('timeline-audio-label').textContent = `Soundtrack: ${tpl.soundtrack.replace('-', ' ').toUpperCase()} (Royalty Free)`;

    // Scenes
    state.activeScenes = tpl.scenes;
    document.getElementById('clip-scene-1').querySelector('.clip-name').textContent = tpl.scenes[0].name;
    document.getElementById('clip-scene-2').querySelector('.clip-name').textContent = tpl.scenes[1].name;

    // Prompt
    aiScenePrompt.value = tpl.prompt;

    // Scroll to studio if clicked from elsewhere
    document.getElementById('studio').scrollIntoView({ behavior: 'smooth' });
  }

  // =========================================================================
  // FREE VIDEO EXPORT ENGINE (HTML5 Canvas + MediaRecorder)
  // =========================================================================
  function initiateVideoExport() {
    exportModal.classList.remove('hidden');
    exportProgressWrap.classList.add('hidden');
    exportSuccessBox.classList.add('hidden');
    modalFooterActions.classList.remove('hidden');
    startRenderBtn.disabled = false;
  }

  function startRenderingEngine() {
    isExporting = true;
    startRenderBtn.disabled = true;
    exportProgressWrap.classList.remove('hidden');
    exportBarFill.style.width = '0%';
    exportStatusText.textContent = 'Initializing canvas stream & audio encoder...';

    audio.init();
    audio.resume();

    // Canvas stream (30 FPS)
    const stream = canvas.captureStream(30);

    // Merge Audio Stream destination if available
    if (audio.streamDest && audio.streamDest.stream.getAudioTracks().length > 0) {
      const audioTrack = audio.streamDest.stream.getAudioTracks()[0];
      stream.addTrack(audioTrack);
    }

    // Supported mime types
    const mimeTypes = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm',
      'video/mp4'
    ];
    let selectedMime = 'video/webm';
    for (const m of mimeTypes) {
      if (MediaRecorder.isTypeSupported(m)) {
        selectedMime = m;
        break;
      }
    }

    let recorder;
    const recordedChunks = [];

    try {
      recorder = new MediaRecorder(stream, {
        mimeType: selectedMime,
        videoBitsPerSecond: 8000000 // 8 Mbps high quality
      });
    } catch (err) {
      console.warn('MediaRecorder error, falling back to default:', err);
      recorder = new MediaRecorder(stream);
    }

    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        recordedChunks.push(e.data);
      }
    };

    recorder.onstop = () => {
      recordedBlob = new Blob(recordedChunks, { type: selectedMime });
      downloadVideoFile(recordedBlob);

      exportProgressWrap.classList.add('hidden');
      exportSuccessBox.classList.remove('hidden');
      modalFooterActions.classList.add('hidden');
      isExporting = false;
    };

    // Reset playback position
    state.currentTime = 0;
    state.isPlaying = true;
    audio.startSoundtrackLoop();
    recorder.start(100);

    // Progress counter for duration
    const renderStartTime = Date.now();
    const renderDurationMs = state.duration * 1000;

    const exportTimer = setInterval(() => {
      const elapsed = Date.now() - renderStartTime;
      const progress = Math.min(100, (elapsed / renderDurationMs) * 100);
      exportBarFill.style.width = `${progress}%`;
      exportStatusText.textContent = `Directing & rendering frames: ${Math.round(progress)}% (${(elapsed / 1000).toFixed(1)}s / ${state.duration}s)`;

      if (elapsed >= renderDurationMs) {
        clearInterval(exportTimer);
        recorder.stop();
        state.isPlaying = false;
        audio.stopSoundtrackLoop();
      }
    }, 100);
  }

  function downloadVideoFile(blob) {
    const rawTitle = projectTitleInput.value.trim() || 'My-Camara-Movie';
    const filename = `${rawTitle.toLowerCase().replace(/[^a-z0-9_-]/gi, '_')}.webm`;

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  }

  // =========================================================================
  // AI MOVIE DIRECTOR & PROMPT ENGINE
  // =========================================================================

  const SURPRISE_PROMPTS = [
    "Samurai master standing in bamboo forest under pouring rain, lightning storm, and falling pink cherry blossoms",
    "Deep sea exploration submarine diving into Mariana trench encountering giant bioluminescent jellyfish",
    "Cyberpunk flying car chase through neon skyscrapers of Tokyo 2099 in rain",
    "Astronaut exploring massive purple singularity black hole accretion disk in deep cosmos",
    "Mars rover navigating massive red dust dunes under twin alien moons at sunset",
    "Medieval fantasy fortress siege with flaming trebuchet fireballs and dragon in smoky skies",
    "Retro 1980s synthwave sports car driving towards glowing neon horizon sun on wireframe grid",
    "Gothic vampire hunter walking through foggy haunted graveyard under green full moon",
    "Golden eagle gliding over misty snow-capped mountain peaks at golden dawn",
    "Undercover hacker infiltrating subterranean glowing mainframe data matrix vault",
    "Futuristic mech warrior standing sentinel on neon rain-soaked cyberpunk rooftop",
    "Deep space starship entering hyperdrive warp tunnel through colorful asteroid nebula"
  ];

  function analyzePromptToMovie(prompt) {
    const raw = (prompt || '').trim();
    const p = raw.toLowerCase();

    // Default configuration (Space Odyssey)
    let theme = 'space';
    let scene1 = { type: 'space', name: 'Scene 1: Nebula Drift', start: 0, end: 4 };
    let scene2 = { type: 'singularity', name: 'Scene 2: Event Horizon', start: 4, end: 8 };
    let title = 'BEYOND THE HORIZON';
    let subtitle = `AI MOVIE • DIRECTED FROM: "${raw}"`;
    let lut = 'teal-orange';
    let soundtrack = 'ambient-space';
    let cameraMotion = 'pan-zoom';
    let flare = 50;
    let grain = 20;
    let contrast = 115;
    let saturation = 120;
    let vignette = 25;
    let cinemaBars = true;

    // 1. Samurai / Ninja / Martial Arts / Ancient Japan
    if (p.includes('samurai') || p.includes('ninja') || p.includes('katana') || p.includes('blade') || p.includes('japan') || p.includes('bamboo') || p.includes('duel') || p.includes('cherry blossom') || p.includes('sword fight')) {
      theme = 'samurai';
      scene1 = { type: 'samurai', name: 'Scene 1: Bamboo Rain Standoff', start: 0, end: 4 };
      scene2 = { type: 'samurai-climax', name: 'Scene 2: Thunder Strike Climax', start: 4, end: 8 };
      title = 'THE RAIN BLADE';
      subtitle = 'AN HONOR WRITTEN IN STEEL';
      lut = 'film-noir';
      soundtrack = 'epic-orchestral';
      cameraMotion = 'handheld';
      flare = 30;
      grain = 25;
      contrast = 125;
      saturation = 90;
      vignette = 30;

    // 2. Fantasy / Dragon / Medieval / Castle / Magic
    } else if (p.includes('dragon') || p.includes('castle') || p.includes('knight') || p.includes('fantasy') || p.includes('magic') || p.includes('fortress') || p.includes('medieval') || p.includes('siege') || p.includes('throne')) {
      theme = 'fantasy';
      scene1 = { type: 'fantasy', name: 'Scene 1: Fortress Ramparts at Aurora', start: 0, end: 4 };
      scene2 = { type: 'fantasy-dragon', name: 'Scene 2: Dragon Fire Flight', start: 4, end: 8 };
      title = 'ASHES OF THE CITADEL';
      subtitle = 'THE DRAGON SAGA • CHAPTER ONE';
      lut = 'golden-hour';
      soundtrack = 'epic-orchestral';
      cameraMotion = 'orbital';
      flare = 55;
      grain = 20;
      contrast = 120;
      saturation = 135;
      vignette = 25;

    // 3. Cyberpunk / Future Sci-Fi / Flying Cars / Neo Tokyo
    } else if (p.includes('cyberpunk') || p.includes('cyber') || p.includes('flying car') || p.includes('spinner') || p.includes('tokyo') || p.includes('neo') || p.includes('blade runner') || p.includes('neon') || p.includes('robot') || p.includes('android')) {
      theme = 'cyberpunk';
      scene1 = { type: 'cyberpunk', name: 'Scene 1: Neon Megacity Skyline', start: 0, end: 4 };
      scene2 = { type: 'grid', name: 'Scene 2: High Speed Aerocar Pursuit', start: 4, end: 8 };
      title = 'NEO TOKYO 2099';
      subtitle = 'HIGH-ALTITUDE PURSUIT IN RAIN';
      lut = 'cyberpunk';
      soundtrack = 'cyber-synthwave';
      cameraMotion = 'handheld';
      flare = 65;
      grain = 25;
      contrast = 125;
      saturation = 140;
      vignette = 25;

    // 4. Deep Ocean / Underwater / Submarine / Jellyfish
    } else if (p.includes('ocean') || p.includes('underwater') || p.includes('sea') || p.includes('sub') || p.includes('submarine') || p.includes('jellyfish') || p.includes('abyss') || p.includes('mariana') || p.includes('deep sea') || p.includes('coral') || p.includes('scuba')) {
      theme = 'ocean';
      scene1 = { type: 'ocean', name: 'Scene 1: Mariana Abyss Descent', start: 0, end: 4 };
      scene2 = { type: 'ocean-deep', name: 'Scene 2: Bioluminescent Encounter', start: 4, end: 8 };
      title = 'ABYSSAL REALM';
      subtitle = 'EXPLORATION BEYOND SUNLIGHT';
      lut = 'teal-orange';
      soundtrack = 'ambient-space';
      cameraMotion = 'pan-zoom';
      flare = 50;
      grain = 15;
      contrast = 115;
      saturation = 130;
      vignette = 25;

    // 5. Mars / Desert / Dunes / Rover / Alien Wasteland
    } else if (p.includes('mars') || p.includes('desert') || p.includes('dune') || p.includes('sand') || p.includes('rover') || p.includes('sahara') || p.includes('wasteland') || p.includes('red planet')) {
      theme = 'desert';
      scene1 = { type: 'desert', name: 'Scene 1: Red Dunes Expedition', start: 0, end: 4 };
      scene2 = { type: 'desert-storm', name: 'Scene 2: Martian Dust Storm', start: 4, end: 8 };
      title = 'RED DUNE PROTOCOL';
      subtitle = 'OUTPOST ON THE RED PLANET';
      lut = 'golden-hour';
      soundtrack = 'epic-orchestral';
      cameraMotion = 'dolly-zoom';
      flare = 40;
      grain = 25;
      contrast = 115;
      saturation = 130;
      vignette = 25;

    // 6. Retro 80s Synthwave / Outrun / Grid / Neon Car
    } else if (p.includes('synthwave') || p.includes('retro') || p.includes('outrun') || p.includes('80s') || p.includes('vaporwave') || p.includes('arcade') || p.includes('grid')) {
      theme = 'synthwave';
      scene1 = { type: 'synthwave', name: 'Scene 1: Neon Wireframe Grid', start: 0, end: 4 };
      scene2 = { type: 'space', name: 'Scene 2: Glowing Horizon Sun', start: 4, end: 8 };
      title = 'MIDNIGHT OVERDRIVE';
      subtitle = 'TURBO HIGHWAY • 1984';
      lut = 'cyberpunk';
      soundtrack = 'cyber-synthwave';
      cameraMotion = 'dolly-zoom';
      flare = 55;
      grain = 25;
      contrast = 120;
      saturation = 140;
      vignette = 25;

    // 7. Space / Black Hole / Singularity / Galaxy / Stars / Astronauts
    } else if (p.includes('space') || p.includes('singularity') || p.includes('black hole') || p.includes('galaxy') || p.includes('star') || p.includes('planet') || p.includes('cosmos') || p.includes('orbit') || p.includes('spaceship') || p.includes('astronomy')) {
      theme = 'space';
      scene1 = { type: 'space', name: 'Scene 1: Cosmic Nebula Drift', start: 0, end: 4 };
      scene2 = { type: 'singularity', name: 'Scene 2: Event Horizon Singularity', start: 4, end: 8 };
      title = 'INTERSTELLAR HORIZON';
      subtitle = 'VOYAGE TO THE EVENT HORIZON';
      lut = 'teal-orange';
      soundtrack = 'ambient-space';
      cameraMotion = 'pan-zoom';
      flare = 50;
      grain = 20;
      contrast = 120;
      saturation = 120;
      vignette = 25;

    // 8. Horror / Haunted / Graveyard / Spooky / Ghost
    } else if (p.includes('horror') || p.includes('spooky') || p.includes('creepy') || p.includes('graveyard') || p.includes('haunted') || p.includes('ghost') || p.includes('zombie') || p.includes('cemetery')) {
      theme = 'horror';
      scene1 = { type: 'horror', name: 'Scene 1: Foggy Graveyard Mist', start: 0, end: 4 };
      scene2 = { type: 'horror', name: 'Scene 2: Moonlit Tombstones', start: 4, end: 8 };
      title = 'WHISPERS IN THE MIST';
      subtitle = 'DO NOT LOOK BACK';
      lut = 'film-noir';
      soundtrack = 'ambient-space';
      cameraMotion = 'handheld';
      flare = 15;
      grain = 40;
      contrast = 135;
      saturation = 70;
      vignette = 35;

    // 9. Nature / Mountains / Forest / Alpine / Sunrise
    } else if (p.includes('nature') || p.includes('mountain') || p.includes('forest') || p.includes('alpine') || p.includes('trees') || p.includes('sunrise') || p.includes('landscape') || p.includes('river')) {
      theme = 'nature';
      scene1 = { type: 'nature', name: 'Scene 1: Alpine Sunrise Flight', start: 0, end: 4 };
      scene2 = { type: 'space', name: 'Scene 2: High Mountain Ridge', start: 4, end: 8 };
      title = 'THE HIGH PASS';
      subtitle = 'UNTOUCHED WILDERNESS IN 4K';
      lut = 'golden-hour';
      soundtrack = 'epic-orchestral';
      cameraMotion = 'pan-zoom';
      flare = 40;
      grain = 15;
      contrast = 110;
      saturation = 120;
      vignette = 20;

    // 10. Matrix / Hack / Code / Computer
    } else if (p.includes('matrix') || p.includes('code') || p.includes('hack') || p.includes('terminal') || p.includes('data') || p.includes('mainframe')) {
      theme = 'matrix';
      scene1 = { type: 'matrix', name: 'Scene 1: Cascading Data Stream', start: 0, end: 4 };
      scene2 = { type: 'grid', name: 'Scene 2: Core Mainframe Breach', start: 4, end: 8 };
      title = 'CORE BREACH';
      subtitle = 'DATA ENCRYPTION COMPROMISED';
      lut = 'cyberpunk';
      soundtrack = 'cyber-synthwave';
      cameraMotion = 'dolly-zoom';
      flare = 35;
      grain = 25;
      contrast = 130;
      saturation = 110;
      vignette = 30;

    // 11. Car Racing / Pursuit / Chase / Highway
    } else if (p.includes('car') || p.includes('race') || p.includes('racing') || p.includes('chase') || p.includes('highway') || p.includes('speed') || p.includes('drift')) {
      theme = 'synthwave';
      scene1 = { type: 'synthwave', name: 'Scene 1: High Speed Highway Pursuit', start: 0, end: 4 };
      scene2 = { type: 'grid', name: 'Scene 2: Turbo Boost Acceleration', start: 4, end: 8 };
      title = 'MIDNIGHT PURSUIT';
      subtitle = 'RADAR LOCKED • MAXIMUM OVERDRIVE';
      lut = 'cyberpunk';
      soundtrack = 'cyber-synthwave';
      cameraMotion = 'handheld';
      flare = 60;
      grain = 25;
      contrast = 125;
      saturation = 135;
      vignette = 25;

    // 12. ONLY if specifically asking for walking / pedestrians / crowd:
    } else if (p.includes('walk') || p.includes('walking') || p.includes('pedestrian') || p.includes('crowd') || p.includes('sidewalk') || p.includes('crosswalk') || p.includes('stroll')) {
      theme = 'people-walking';
      scene1 = { type: 'people-walking', name: 'Scene 1: Real People Walking on City Street', start: 0, end: 4 };
      scene2 = { type: 'city-street', name: 'Scene 2: City Street & Crosswalk Pedestrians', start: 4, end: 8 };
      title = 'THE CITY WALKERS';
      subtitle = 'LIVE-ACTION CINEMA • REAL PEOPLE WALKING';
      lut = 'teal-orange';
      soundtrack = 'lofi-chill';
      cameraMotion = 'pan-zoom';
      flare = 25;
      grain = 15;
      contrast = 105;
      saturation = 115;
      vignette = 15;

    // 13. Fallback for custom / unique prompts (Cyberpunk city or Space)
    } else {
      // Create a dynamic title from the user prompt
      const words = raw.split(/\s+/).filter(w => w.length > 2);
      const titleWords = words.slice(0, 3).map(w => w.toUpperCase()).join(' ');
      title = titleWords || 'CINEMATIC VISION';
      subtitle = `AI DIRECTED: "${raw.slice(0, 45)}"`;
      theme = 'cyberpunk';
      scene1 = { type: 'cyberpunk', name: `Scene 1: ${title}`, start: 0, end: 4 };
      scene2 = { type: 'space', name: 'Scene 2: Cinematic Climax', start: 4, end: 8 };
      lut = 'teal-orange';
      soundtrack = 'epic-orchestral';
      cameraMotion = 'pan-zoom';
      flare = 45;
      grain = 20;
      contrast = 115;
      saturation = 125;
      vignette = 20;
    }

    return {
      theme,
      scenes: [scene1, scene2],
      title,
      subtitle,
      lut,
      soundtrack,
      cameraMotion,
      flare,
      grain,
      contrast,
      saturation,
      vignette,
      cinemaBars,
      prompt: raw
    };
  }

    function executeAiMovieDirector(rawPrompt) {
    const prompt = (rawPrompt || '').trim() || SURPRISE_PROMPTS[0];
    const movieConfig = analyzePromptToMovie(prompt);

    const aiModal = document.getElementById('ai-generate-modal');
    const promptQuote = document.getElementById('ai-gen-prompt-quote');
    const barFill = document.getElementById('ai-gen-bar-fill');
    const statusText = document.getElementById('ai-gen-status');

    if (promptQuote) promptQuote.textContent = `"${prompt}"`;
    if (aiModal) aiModal.classList.remove('hidden');

    audio.init();
    audio.resume();

    const steps = [
      document.getElementById('ai-step-1'),
      document.getElementById('ai-step-2'),
      document.getElementById('ai-step-3'),
      document.getElementById('ai-step-4'),
      document.getElementById('ai-step-5')
    ];

    steps.forEach((s, idx) => {
      if (s) {
        s.className = idx === 0 ? 'ai-step-item active' : 'ai-step-item';
        const chk = s.querySelector('.step-check');
        if (chk) chk.textContent = idx === 0 ? '⏳' : '○';
      }
    });

    const stepTexts = [
      'Analyzing Screenplay & Cinematographic Mood...',
      'Choreographing Camera Motion & VFX Particles...',
      'Synthesizing Cinematic Score & Spatial SFX...',
      'Color Grading 3D Hollywood LUT & Anamorphic Flare...',
      'Assembling Multi-Track Timeline & Titles...'
    ];

    let currentStep = 0;
    const stepInterval = setInterval(() => {
      currentStep++;
      if (currentStep < 5) {
        if (steps[currentStep - 1]) {
          steps[currentStep - 1].className = 'ai-step-item completed';
          const chk = steps[currentStep - 1].querySelector('.step-check');
          if (chk) chk.textContent = '✓';
        }
        if (steps[currentStep]) {
          steps[currentStep].className = 'ai-step-item active';
          const chk = steps[currentStep].querySelector('.step-check');
          if (chk) chk.textContent = '⏳';
        }
        if (barFill) barFill.style.width = `${(currentStep / 5) * 100}%`;
        if (statusText) statusText.textContent = stepTexts[currentStep];
      } else {
        clearInterval(stepInterval);
        if (steps[4]) {
          steps[4].className = 'ai-step-item completed';
          const chk = steps[4].querySelector('.step-check');
          if (chk) chk.textContent = '✓';
        }
        if (barFill) barFill.style.width = '100%';
        if (statusText) statusText.textContent = '✨ Movie Generated! Directing to preview screen...';

        setTimeout(() => {
          if (aiModal) aiModal.classList.add('hidden');
          applyGeneratedMovieToStudio(movieConfig);
        }, 400);
      }
    }, 280);
  }

  function applyGeneratedMovieToStudio(cfg) {
    projectTitleInput.value = `${cfg.title} - Camara AI Film`;
    state.activeScenes = cfg.scenes;
    state.titleText = cfg.title;
    state.subtitleText = cfg.subtitle;
    state.lut = cfg.lut;
    state.soundtrack = cfg.soundtrack;
    state.cameraMotion = cfg.cameraMotion;
    state.filmGrain = cfg.grain;
    state.anamorphicFlare = cfg.flare;
    state.contrast = cfg.contrast;
    state.saturation = cfg.saturation;
    state.vignette = cfg.vignette;
    state.cinemaBars = cfg.cinemaBars;

    // Update DOM Form Controls
    titleTextInput.value = cfg.title;
    subtitleTextInput.value = cfg.subtitle;
    cameraMotionSelect.value = cfg.cameraMotion;
    cinemaBarsToggle.checked = cfg.cinemaBars;

    grainSlider.value = cfg.grain;
    grainVal.textContent = `${cfg.grain}%`;
    flareSlider.value = cfg.flare;
    flareVal.textContent = `${cfg.flare}%`;
    contrastSlider.value = cfg.contrast;
    contrastVal.textContent = `${cfg.contrast}%`;
    satSlider.value = cfg.saturation;
    satVal.textContent = `${cfg.saturation}%`;
    vignetteSlider.value = cfg.vignette;
    vignetteVal.textContent = `${cfg.vignette}%`;

    hudFilter.textContent = `LUT: ${cfg.lut.toUpperCase().replace('-', ' ')}`;
    document.querySelectorAll('.lut-card').forEach(c => {
      c.classList.toggle('active', c.dataset.lut === cfg.lut);
    });

    document.querySelectorAll('.audio-card').forEach(c => {
      c.classList.toggle('active', c.dataset.soundtrack === cfg.soundtrack);
    });
    const audioLbl = document.getElementById('timeline-audio-label');
    if (audioLbl) audioLbl.textContent = `Soundtrack: ${cfg.soundtrack.replace('-', ' ').toUpperCase()} (Royalty Free)`;

    // Update Timeline Track Clips
    const clip1 = document.getElementById('clip-scene-1');
    const clip2 = document.getElementById('clip-scene-2');
    if (clip1) clip1.querySelector('.clip-name').textContent = cfg.scenes[0].name;
    if (clip2) clip2.querySelector('.clip-name').textContent = cfg.scenes[1].name;

    aiScenePrompt.value = cfg.prompt;
    const heroInput = document.getElementById('hero-prompt-input');
    if (heroInput) heroInput.value = cfg.prompt;

    // Smooth scroll down to Studio
    const studioSection = document.getElementById('studio');
    if (studioSection) {
      studioSection.scrollIntoView({ behavior: 'smooth' });
    }

    // Update active picture pill in the top bar
    document.querySelectorAll('.pic-pill-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.pic === cfg.theme);
    });

    const helperBanner = document.querySelector('.picture-helper-banner');
    if (helperBanner) {
      helperBanner.innerHTML = `<span class="sparkle-icon">🎬</span><span><strong>Generated Movie Active:</strong> Now directing <em>"${cfg.title}"</em> in full motion! Type any other prompt to change scenes anytime.</span>`;
    }

    // Auto-play the newly generated movie!
    state.currentTime = 0;
    state.isPlaying = true;
    playIcon.classList.add('hidden');
    pauseIcon.classList.remove('hidden');
    canvasPlayOverlay.classList.remove('show-overlay');
    if (!state.isMuted) {
      audio.startSoundtrackLoop();
    }
  }

  // =========================================================================
  // EVENT LISTENERS & SETUP
  // =========================================================================
  function initEvents() {
    // Canvas Click Play / Pause
    canvasScreenBox.addEventListener('click', togglePlayPause);
    canvasPlayOverlay.addEventListener('click', togglePlayPause);
    playPauseBtn.addEventListener('click', togglePlayPause);
    stopBtn.addEventListener('click', stopPlayback);

    // Keyboard Spacebar to Play/Pause
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        e.preventDefault();
        togglePlayPause();
      }
    });

    // Scrubber click & drag
    let isScrubbing = false;
    const handleScrub = (e) => {
      const rect = scrubberTrack.getBoundingClientRect();
      const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      state.currentTime = pos * state.duration;
      updateTimeReadout();
    };

    scrubberTrack.addEventListener('mousedown', (e) => {
      isScrubbing = true;
      handleScrub(e);
    });
    window.addEventListener('mousemove', (e) => {
      if (isScrubbing) handleScrub(e);
    });
    window.addEventListener('mouseup', () => {
      isScrubbing = false;
    });

    // Aspect buttons
    document.querySelectorAll('.aspect-btn').forEach(btn => {
      btn.addEventListener('click', () => setAspectRatio(btn.dataset.ratio));
    });

    // Sidebar tab buttons
    document.querySelectorAll('.tab-btn').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
        tab.classList.add('active');
        const targetPanel = document.getElementById(`tab-${tab.dataset.tab}`);
        if (targetPanel) targetPanel.classList.add('active');
      });
    });

    // LUT selection
    document.querySelectorAll('.lut-card').forEach(card => {
      card.addEventListener('click', () => {
        document.querySelectorAll('.lut-card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        state.lut = card.dataset.lut;
        hudFilter.textContent = `LUT: ${card.dataset.lut.toUpperCase().replace('-', ' ')}`;
      });
    });

    // Audio card selection
    document.querySelectorAll('.audio-card').forEach(card => {
      card.addEventListener('click', () => {
        document.querySelectorAll('.audio-card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        state.currentSoundtrack = card.dataset.soundtrack;
        document.getElementById('timeline-audio-label').textContent = `Soundtrack: ${card.dataset.soundtrack.replace('-', ' ').toUpperCase()} (Royalty Free)`;
        if (state.isPlaying) {
          audio.startSoundtrackLoop();
        } else {
          audio.init();
          audio.resume();
          audio.playScoreStep(0);
        }
      });
    });

    // Instant SFX triggers
    document.querySelectorAll('.sfx-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const sfx = btn.dataset.sfx;
        if (sfx === 'whoosh') audio.playWhoosh();
        else if (sfx === 'impact') audio.playSubImpact();
        else if (sfx === 'laser') audio.playLaser();
        else if (sfx === 'glitch') audio.playGlitch();
      });
    });

    // Sliders
    grainSlider.addEventListener('input', (e) => {
      state.filmGrain = parseInt(e.target.value);
      grainVal.textContent = `${state.filmGrain}%`;
    });
    flareSlider.addEventListener('input', (e) => {
      state.anamorphicFlare = parseInt(e.target.value);
      flareVal.textContent = `${state.anamorphicFlare}%`;
    });
    contrastSlider.addEventListener('input', (e) => {
      state.contrast = parseInt(e.target.value);
      contrastVal.textContent = `${state.contrast}%`;
    });
    satSlider.addEventListener('input', (e) => {
      state.saturation = parseInt(e.target.value);
      satVal.textContent = `${state.saturation}%`;
    });
    vignetteSlider.addEventListener('input', (e) => {
      state.vignette = parseInt(e.target.value);
      vignetteVal.textContent = `${state.vignette}%`;
    });
    volSlider.addEventListener('input', (e) => {
      state.masterVolume = parseInt(e.target.value) / 100;
      volVal.textContent = `${e.target.value}%`;
      audio.setMasterVolume(state.masterVolume);
    });

    cameraMotionSelect.addEventListener('change', (e) => {
      state.cameraMotion = e.target.value;
    });

    // Title overlays
    titleTextInput.addEventListener('input', (e) => {
      state.titleText = e.target.value;
    });
    subtitleTextInput.addEventListener('input', (e) => {
      state.subtitleText = e.target.value;
    });
    titleStyleSelect.addEventListener('change', (e) => {
      state.titleStyle = e.target.value;
    });
    cinemaBarsToggle.addEventListener('change', (e) => {
      state.cinemaBars = e.target.checked;
    });

    // Quick AI prompt chips in studio
    document.querySelectorAll('.quick-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        aiScenePrompt.value = chip.dataset.prompt;
        executeAiMovieDirector(chip.dataset.prompt);
      });
    });

    // AI Scene Generator button in studio
    generateAiSceneBtn.addEventListener('click', () => {
      const p = aiScenePrompt.value || 'Cyberpunk Tokyo flying car chase in neon rain';
      executeAiMovieDirector(p);
    });

    // Hero AI Prompt Input & Buttons
    const heroPromptInput = document.getElementById('hero-prompt-input');
    const heroGenerateBtn = document.getElementById('hero-generate-btn');
    const heroSurpriseBtn = document.getElementById('hero-surprise-btn');

    if (heroGenerateBtn) {
      heroGenerateBtn.addEventListener('click', () => {
        const val = heroPromptInput ? heroPromptInput.value : '';
        executeAiMovieDirector(val);
      });
    }

    if (heroPromptInput) {
      heroPromptInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          executeAiMovieDirector(heroPromptInput.value);
        }
      });
    }

    if (heroSurpriseBtn) {
      heroSurpriseBtn.addEventListener('click', () => {
        const randomPrompt = SURPRISE_PROMPTS[Math.floor(Math.random() * SURPRISE_PROMPTS.length)];
        if (heroPromptInput) heroPromptInput.value = randomPrompt;
      });
    }

    // Hero Popular Prompt Chips
    document.querySelectorAll('.prompt-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const p = chip.dataset.prompt;
        if (heroPromptInput) heroPromptInput.value = p;
        executeAiMovieDirector(p);
      });
    });

    // Preset cards in right sidebar
    document.querySelectorAll('.asset-card').forEach(card => {
      card.addEventListener('click', () => {
        applyTemplate(card.dataset.preset);
      });
    });

    // Template section triggers
    document.querySelectorAll('.load-template-trigger, .template-play-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        applyTemplate(btn.dataset.presetAction);
      });
    });

    // Hero buttons
    const heroStartBtn = document.getElementById('start-creating-hero');
    if (heroStartBtn) {
      heroStartBtn.addEventListener('click', () => {
        setTimeout(() => {
          aiScenePrompt.focus();
        }, 600);
      });
    }

    const loadSampleDemoBtn = document.getElementById('load-sample-demo-btn');
    if (loadSampleDemoBtn) {
      loadSampleDemoBtn.addEventListener('click', () => {
        applyTemplate('cyberpunk-chase');
      });
    }

    const openAudioTabCta = document.getElementById('open-audio-tab-cta');
    if (openAudioTabCta) {
      openAudioTabCta.addEventListener('click', () => {
        const audioTab = document.querySelector('.tab-btn[data-tab="audio-tracks"]');
        if (audioTab) audioTab.click();
      });
    }

    // Template filter pills
    document.querySelectorAll('.template-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        document.querySelectorAll('.template-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        const genre = pill.dataset.genre;
        document.querySelectorAll('.template-item').forEach(item => {
          if (genre === 'all' || item.dataset.category === genre) {
            item.style.display = 'flex';
          } else {
            item.style.display = 'none';
          }
        });
      });
    });

    // Fullscreen Preview
    const fullscreenBtn = document.getElementById('fullscreen-btn');
    if (fullscreenBtn) {
      fullscreenBtn.addEventListener('click', () => {
        if (!document.fullscreenElement) {
          if (canvasScreenBox && canvasScreenBox.requestFullscreen) {
            canvasScreenBox.requestFullscreen().catch(err => console.log(err));
          }
        } else if (document.exitFullscreen) {
          document.exitFullscreen();
        }
      });
    }

    // Reset button
    const resetStudioBtn = document.getElementById('reset-studio-btn');
    if (resetStudioBtn) {
      resetStudioBtn.addEventListener('click', () => {
        applyTemplate('space-odyssey');
      });
    }

    // Mute / Unmute Button
    const muteBtn = document.getElementById('mute-toggle-btn');
    const muteIcon = document.getElementById('volume-muted-icon');
    const highIcon = document.getElementById('volume-high-icon');

    if (muteBtn) {
      muteBtn.addEventListener('click', () => {
        state.isMuted = !state.isMuted;
        if (state.isMuted) {
          if (muteIcon) muteIcon.classList.remove('hidden');
          if (highIcon) highIcon.classList.add('hidden');
          muteBtn.title = 'Sound is Muted (Click to Unmute)';
          audio.stopSoundtrackLoop();
          audio.setMasterVolume(0);
        } else {
          if (muteIcon) muteIcon.classList.add('hidden');
          if (highIcon) highIcon.classList.remove('hidden');
          muteBtn.title = 'Sound is Active (Click to Mute)';
          state.masterVolume = 0.7;
          audio.init();
          audio.resume();
          audio.setMasterVolume(0.7);
          if (state.isPlaying) {
            audio.startSoundtrackLoop();
          }
        }
      });
    }

    // Timeline Tools: Add Scene, Split, Transitions, Zoom
    const addSceneBtn = document.getElementById('add-scene-btn');
    if (addSceneBtn) {
      addSceneBtn.addEventListener('click', () => {
        const videoLane = document.getElementById('video-track-lane');
        const count = videoLane.querySelectorAll('.track-clip').length + 1;
        const newClip = document.createElement('div');
        newClip.className = 'track-clip clip-video clip-secondary';
        newClip.style.width = '33.3%';
        newClip.innerHTML = `
          <div class="clip-thumb thumb-space"></div>
          <span class="clip-name">Scene ${count}: Orbital Flyby</span>
          <span class="clip-dur">New Clip</span>
        `;
        videoLane.appendChild(newClip);
        
        // Adjust existing clip widths
        const clips = videoLane.querySelectorAll('.track-clip');
        clips.forEach((c, idx) => {
          c.style.width = `${100 / clips.length}%`;
          c.style.left = `${(idx * 100) / clips.length}%`;
        });
      });
    }

    const splitBtn = document.getElementById('split-clip-btn');
    if (splitBtn) {
      splitBtn.addEventListener('click', () => {
        hudFilter.textContent = `CUT AT ${currentTimeReadout.textContent}`;
        setTimeout(() => {
          hudFilter.textContent = `LUT: ${state.lut.toUpperCase().replace('-', ' ')}`;
        }, 1200);
      });
    }

    const transitionBtn = document.getElementById('transition-btn');
    const transitionTypes = ['Crossfade FX', 'Film Glitch FX', 'Flash White FX', 'Fade Black FX'];
    let transIndex = 0;
    if (transitionBtn) {
      transitionBtn.addEventListener('click', () => {
        transIndex = (transIndex + 1) % transitionTypes.length;
        transitionBtn.textContent = transitionTypes[transIndex];
        hudFilter.textContent = `TRANSITION: ${transitionTypes[transIndex]}`;
        setTimeout(() => {
          hudFilter.textContent = `LUT: ${state.lut.toUpperCase().replace('-', ' ')}`;
        }, 1200);
      });
    }

    const zoomSlider = document.getElementById('timeline-zoom-slider');
    if (zoomSlider) {
      zoomSlider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        const lanes = document.querySelectorAll('.track-lane');
        lanes.forEach(lane => {
          lane.style.transform = `scaleX(${val})`;
          lane.style.transformOrigin = 'left center';
        });
      });
    }

    // Timeline Clip Click to jump to scene time
    document.querySelectorAll('.clip-video').forEach((clip, idx) => {
      clip.addEventListener('click', () => {
        state.currentTime = idx * 4.0;
        updateTimeReadout();
      });
    });

    // Auto-Pilot Autonomous Controls
    const autoPilotToggleBtn = document.getElementById('auto-pilot-toggle-btn');
    const autoPilotStatusText = document.getElementById('auto-pilot-status-text');
    if (autoPilotToggleBtn) {
      autoPilotToggleBtn.addEventListener('click', () => {
        state.autoPilot = !state.autoPilot;
        if (autoPilotStatusText) {
          autoPilotStatusText.textContent = state.autoPilot ? '⚡ Auto-Director: ON' : '⏸ Auto-Director: PAUSED';
        }
      });
    }

    const autoPilotNextBtn = document.getElementById('auto-pilot-next-btn');
    if (autoPilotNextBtn) {
      autoPilotNextBtn.addEventListener('click', () => {
        state.currentTime = 0;
        triggerNextAutonomousScene();
      });
    }

    // Movie Picture Quick Switcher Bar
    const picPillButtons = document.querySelectorAll('.pic-pill-btn');
    picPillButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const pic = btn.dataset.pic;
        if (!pic) return;

        picPillButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        selectMoviePicture(pic);
      });
    });

    // User Photo Upload (Optional)
    const userImgInput = document.getElementById('user-image-input');
    const uploadPicBtn = document.getElementById('upload-pic-btn');
    const inlineUploadBtn = document.getElementById('inline-upload-pic-btn');

    if (uploadPicBtn && userImgInput) {
      uploadPicBtn.addEventListener('click', () => userImgInput.click());
    }
    if (inlineUploadBtn && userImgInput) {
      inlineUploadBtn.addEventListener('click', (e) => {
        e.preventDefault();
        userImgInput.click();
      });
    }
    if (userImgInput) {
      userImgInput.addEventListener('change', (e) => {
        const file = e.target.files && e.target.files[0];
        if (file) handleImageUpload(file);
      });
    }

    // Drag and Drop Image onto Video Screen
    if (canvasScreenBox) {
      canvasScreenBox.addEventListener('dragover', (e) => {
        e.preventDefault();
        canvasScreenBox.style.boxShadow = '0 0 35px rgba(56, 189, 248, 0.7)';
      });
      canvasScreenBox.addEventListener('dragleave', () => {
        canvasScreenBox.style.boxShadow = '';
      });
      canvasScreenBox.addEventListener('drop', (e) => {
        e.preventDefault();
        canvasScreenBox.style.boxShadow = '';
        const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
          handleImageUpload(file);
        }
      });
    }

    // Export Modal Events
    exportBtn.addEventListener('click', initiateVideoExport);
    closeExportModal.addEventListener('click', () => exportModal.classList.add('hidden'));
    cancelExportBtn.addEventListener('click', () => exportModal.classList.add('hidden'));
    startRenderBtn.addEventListener('click', startRenderingEngine);
    downloadAgainBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (recordedBlob) downloadVideoFile(recordedBlob);
    });
  }

  function selectMoviePicture(picKey) {
    state.autoPilot = false; // User manually chose picture

    const picConfigs = {
      'people-walking': {
        title: 'THE CITY WALKERS',
        sub: 'LIVE-ACTION CINEMA • REAL PEOPLE WALKING',
        lut: 'teal-orange',
        motion: 'pan-zoom',
        name1: 'Scene 1: Real People Walking on City Street',
        name2: 'Scene 2: Boulevard Tracking Shot'
      },
      'city-street': {
        title: '5TH AVENUE CROSSWALK',
        sub: 'LIVE-ACTION STREET CINEMATOGRAPHY',
        lut: 'teal-orange',
        motion: 'dolly-zoom',
        name1: 'Scene 1: City Street & Crosswalk Pedestrians',
        name2: 'Scene 2: Avenue Traffic & Walkers'
      },
      'actor-walking': {
        title: 'THE PROTAGONIST',
        sub: 'CINEMATIC CHARACTER TRACKING SHOT',
        lut: 'film-noir',
        motion: 'handheld',
        name1: 'Scene 1: Close-Up Actor Walking Toward Camera',
        name2: 'Scene 2: Character Pause & Reflection'
      },
      'pedestrians': {
        title: 'METROPOLIS CROWD',
        sub: 'REAL PEDESTRIANS IN MOTION',
        lut: 'cyberpunk',
        motion: 'orbital',
        name1: 'Scene 1: Pedestrians Crossing Avenue',
        name2: 'Scene 2: Rush Hour Stroll'
      },
      'movie-walk': {
        title: 'MIDNIGHT WALK',
        sub: 'A CINEMATIC WALKING PICTURE IN 4K',
        lut: 'teal-orange',
        motion: 'pan-zoom',
        name1: 'Scene 1: 5th Avenue Tracking Shot',
        name2: 'Scene 2: Boulevard Stroll at Twilight'
      },
      'cyberpunk': {
        title: 'NEO TOKYO 2099',
        sub: 'CYBERPUNK PURSUIT IN RAIN',
        lut: 'cyberpunk',
        motion: 'handheld',
        name1: 'Scene 1: Neon Megacity Skyline',
        name2: 'Scene 2: Aerocar Chase'
      },
      'samurai': {
        title: 'BLADE OF HONOR',
        sub: 'THUNDERSTORM DUEL UNDER THE MOON',
        lut: 'film-noir',
        motion: 'handheld',
        name1: 'Scene 1: Bamboo Grove Standoff',
        name2: 'Scene 2: Thunder Strike Climax'
      },
      'space': {
        title: 'INTERSTELLAR HORIZON',
        sub: 'VOYAGE TO THE EVENT HORIZON',
        lut: 'teal-orange',
        motion: 'pan-zoom',
        name1: 'Scene 1: Cosmic Nebula & Gas Giant',
        name2: 'Scene 2: Event Horizon Singularity'
      },
      'ocean': {
        title: 'ABYSSAL EXPEDITION',
        sub: 'BIOLUMINESCENT DEEP OCEAN',
        lut: 'teal-orange',
        motion: 'dolly-zoom',
        name1: 'Scene 1: Sunlit Surface & Jellyfish',
        name2: 'Scene 2: Submersible Searchlights'
      },
      'desert': {
        title: 'RED PLANET 2049',
        sub: 'CROSSING THE MARS DUNES',
        lut: 'golden-hour',
        motion: 'orbital',
        name1: 'Scene 1: Martian Sunset Dunes',
        name2: 'Scene 2: Planetary Rover Scan'
      },
      'fantasy': {
        title: 'REALM OF DRAGONS',
        sub: 'THE HIGH CITADEL OF THE NORTH',
        lut: 'golden-hour',
        motion: 'pan-zoom',
        name1: 'Scene 1: Aurora Twilight Citadel',
        name2: 'Scene 2: Dragon Fire Soar'
      },
      'synthwave': {
        title: 'OUTRUN 1984',
        sub: 'TURBO HIGHWAY INTO SUNSET',
        lut: 'cyberpunk',
        motion: 'dolly-zoom',
        name1: 'Scene 1: Neon Striped Sun',
        name2: 'Scene 2: Wireframe Grid Rush'
      }
    };

    const cfg = picConfigs[picKey] || picConfigs['cyberpunk'];
    state.activeScenes = [
      { id: 1, type: picKey, name: cfg.name1, start: 0, end: 4 },
      { id: 2, type: picKey === 'space' ? 'singularity' : (picKey === 'samurai' ? 'samurai-climax' : picKey), name: cfg.name2, start: 4, end: 8 }
    ];
    state.titleText = cfg.title;
    state.subtitleText = cfg.sub;
    state.lut = cfg.lut;
    state.cameraMotion = cfg.motion;
    state.currentTime = 0;
    state.isPlaying = true;

    // Update UI clips & HUD
    const clip1 = document.getElementById('clip-scene-1');
    const clip2 = document.getElementById('clip-scene-2');
    if (clip1) clip1.querySelector('.clip-name').textContent = cfg.name1;
    if (clip2) clip2.querySelector('.clip-name').textContent = cfg.name2;

    const thoughtEl = document.getElementById('ai-mind-thought-text');
    if (thoughtEl) thoughtEl.textContent = `Active Picture: ${cfg.title} (${cfg.sub})`;

    const helperBanner = document.querySelector('.picture-helper-banner');
    if (helperBanner) {
      helperBanner.innerHTML = `<span class="sparkle-icon">🎬</span><span><strong>Picture Active:</strong> Now displaying <em>"${cfg.title}"</em> in full motion! Click any other picture anytime.</span>`;
    }

    if (hudFilter) {
      hudFilter.textContent = `LUT: ${cfg.lut.toUpperCase().replace('-', ' ')}`;
    }
  }

  function handleImageUpload(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        userUploadedImg = img;
        state.activeScenes = [
          { id: 1, type: 'user-photo', name: 'Scene 1: My Photo Animation', start: 0, end: 8 }
        ];
        state.titleText = 'MY CINEMATIC MOMENT';
        state.subtitleText = 'ANIMATED WITH CAMARA';
        state.autoPilot = false;

        document.querySelectorAll('.pic-pill-btn').forEach(b => b.classList.remove('active'));
        const inlineUploadBtn = document.getElementById('inline-upload-pic-btn');
        if (inlineUploadBtn) inlineUploadBtn.classList.add('active');

        const thoughtEl = document.getElementById('ai-mind-thought-text');
        if (thoughtEl) thoughtEl.textContent = 'Animating your uploaded picture with 3D camera pan & zoom!';

        const helperBanner = document.querySelector('.picture-helper-banner');
        if (helperBanner) {
          helperBanner.innerHTML = `<span class="sparkle-icon">📷</span><span><strong>Your Picture Loaded:</strong> Animating your photo with Ken Burns 3D motion! Click any movie picture above to switch back anytime.</span>`;
        }

        state.currentTime = 0;
        state.isPlaying = true;
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  }

  // Initialization
  function init() {
    try {
      initMovieVideos();
    } catch (e) {
      console.warn('initMovieVideos notice:', e);
    }

    try {
      setupVisualizerUI();
    } catch (e) {
      console.warn('Visualizer setup notice:', e);
    }

    try {
      initEvents();
    } catch (e) {
      console.error('initEvents notice:', e);
    }

    try {
      setAspectRatio('16:9');
    } catch (e) {
      console.warn('setAspectRatio notice:', e);
    }

    // Start paused - Wait for user prompt!
    state.isPlaying = false;
    if (playIcon) playIcon.classList.remove('hidden');
    if (pauseIcon) pauseIcon.classList.add('hidden');
    if (canvasPlayOverlay) canvasPlayOverlay.classList.add('show-overlay');

    // Immediately render frame 0 right on load!
    try {
      renderSceneFrame(0, canvas.width, canvas.height);
    } catch (e) {
      console.error('Initial frame draw notice:', e);
    }

    // Start main render loop
    requestAnimationFrame(mainLoop);
  }

  window.addEventListener('DOMContentLoaded', init);

})();
