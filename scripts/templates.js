/**
 * Camara Cinematic Studio - Template & Preset Definitions
 * Defines presets, themes, visual parameters, and default values.
 */

const CAMARA_TEMPLATES = {
  'space-odyssey': {
    title: 'Interstellar Odyssey',
    projectTitle: 'Cosmic Singularity - Episode 1',
    aspect: '16:9',
    lut: 'teal-orange',
    cameraMotion: 'pan-zoom',
    grain: 30,
    flare: 60,
    contrast: 120,
    saturation: 110,
    vignette: 55,
    mainTitle: 'BEYOND THE HORIZON',
    subtitle: 'A DEEP SPACE VOYAGE • IN 4K',
    titleStyle: 'epic-fade',
    cinemaBars: true,
    soundtrack: 'ambient-space',
    scenes: [
      { type: 'space', name: 'Act 1: Nebula Drift', start: 0, end: 60 },
      { type: 'singularity', name: 'Act 2: Event Horizon', start: 60, end: 120 }
    ],
    prompt: 'Deep space nebula with cosmic dust filaments, star clusters, and massive violet accretion disk'
  },

  'cyberpunk-chase': {
    title: 'Neon Tokyo 2099',
    projectTitle: 'Cyberpunk 2099 - High Speed Pursuit',
    aspect: '16:9',
    lut: 'cyberpunk',
    cameraMotion: 'handheld',
    grain: 45,
    flare: 75,
    contrast: 130,
    saturation: 140,
    vignette: 60,
    mainTitle: 'NEO SHINJUKU',
    subtitle: 'DISTRICT 09 • NO ESCAPE',
    titleStyle: 'glitch',
    cinemaBars: true,
    soundtrack: 'cyber-synthwave',
    scenes: [
      { type: 'cyberpunk', name: 'Act 1: Neon Megacity', start: 0, end: 60 },
      { type: 'grid', name: 'Act 2: High Speed Tunnel', start: 60, end: 120 }
    ],
    prompt: 'Rainy cyberpunk metropolis with glowing pink and cyan neon signs, soaring skyscrapers, reflections'
  },

  'vintage-retro': {
    title: 'Retro Synthwave Night',
    projectTitle: 'Midnight Drive - Synthwave Visualizer',
    aspect: '16:9',
    lut: 'vintage-kodak',
    cameraMotion: 'orbital',
    grain: 50,
    flare: 50,
    contrast: 115,
    saturation: 130,
    vignette: 45,
    mainTitle: 'MIDNIGHT DRIVE',
    subtitle: 'ANALOG DREAMS • 1984',
    titleStyle: 'cinema-gold',
    cinemaBars: false,
    soundtrack: 'cyber-synthwave',
    scenes: [
      { type: 'synthwave', name: 'Act 1: Wireframe Grid', start: 0, end: 60 },
      { type: 'space', name: 'Act 2: Horizon Sun', start: 60, end: 120 }
    ],
    prompt: '3D retro synthwave neon wireframe perspective grid with glowing wireframe mountains and setting sun'
  },

  'nature-drone': {
    title: 'Alpine Highlands Drone',
    projectTitle: 'Alpine Solitude - 4K Nature Documentary',
    aspect: '2.39:1',
    lut: 'golden-hour',
    cameraMotion: 'pan-zoom',
    grain: 15,
    flare: 40,
    contrast: 110,
    saturation: 115,
    vignette: 40,
    mainTitle: 'THE HIGH PASS',
    subtitle: 'UNTOUCHED WILDERNESS • EXPEDITION',
    titleStyle: 'minimal',
    cinemaBars: true,
    soundtrack: 'epic-orchestral',
    scenes: [
      { type: 'nature', name: 'Act 1: Ridge Sunrise', start: 0, end: 60 },
      { type: 'space', name: 'Act 2: Golden Mist', start: 60, end: 120 }
    ],
    prompt: 'Golden hour drone shot flying over majestic misty pine covered alpine peaks with god rays'
  },

  'thriller-matrix': {
    title: 'Digital Matrix Flow',
    projectTitle: 'Cyber Security Breach - Thriller Intro',
    aspect: '16:9',
    lut: 'sci-fi-matrix',
    cameraMotion: 'dolly-zoom',
    grain: 35,
    flare: 30,
    contrast: 135,
    saturation: 90,
    vignette: 70,
    mainTitle: 'ACCESS GRANTED',
    subtitle: 'SYSTEM CORE DECRYPTED',
    titleStyle: 'glitch',
    cinemaBars: true,
    soundtrack: 'cyber-synthwave',
    scenes: [
      { type: 'matrix', name: 'Act 1: Digital Stream', start: 0, end: 60 },
      { type: 'grid', name: 'Act 2: Mainframe Breach', start: 60, end: 120 }
    ],
    prompt: 'Cascading digital data rain streams in dark void with green phosphorescent characters'
  }
};
