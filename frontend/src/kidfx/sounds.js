const SOUND_PATHS = {
  correct: "/assets/math_bell/sfx/correct.mp3",
  wrong: "/assets/math_bell/sfx/wrong.mp3",
  applause: "/assets/math_bell/sfx/applause.mp3",
  pop: "/assets/math_bell/sfx/pop.mp3",
  bell_start: "/assets/math_bell/sfx/bell_start.mp3",
  bell_end: "/assets/math_bell/sfx/bell_end.mp3",
};

const cache = new Map();

function getAudio(name) {
  if (!SOUND_PATHS[name]) return null;
  if (!cache.has(name)) {
    cache.set(name, new Audio(SOUND_PATHS[name]));
  }
  return cache.get(name);
}

export function playSfx(name, volume = 0.7) {
  const audio = getAudio(name);
  if (!audio) return;
  try {
    audio.pause();
    audio.currentTime = 0;
    audio.volume = volume;
    audio.play().catch(() => {});
  } catch {
    // Ignore autoplay/media issues in MVP.
  }
}

export { SOUND_PATHS };
