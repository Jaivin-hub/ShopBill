// Message notification sound - short pleasant beep
// Uses HTML5 Audio fallback for mobile (iOS PWA) where Web Audio API is unreliable
const STORAGE_KEY = 'chat_sound_enabled';

export const isChatSoundEnabled = () => {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === null || v === 'true';
  } catch {
    return true;
  }
};

export const setChatSoundEnabled = (enabled) => {
  try {
    localStorage.setItem(STORAGE_KEY, String(enabled));
  } catch {
    void 0;
  }
};

let audioContext = null;
let audioUnlocked = false;
let htmlAudioFallback = null;

const getAudioContext = () => {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioContext;
};

/** Minimal WAV for beep - works on iOS/mobile where Web Audio is restricted */
const getBeepDataUri = () => {
  const sampleRate = 8000;
  const duration = 0.2;
  const freq = 880;
  const numSamples = Math.floor(sampleRate * duration);
  const numChannels = 1;
  const bitsPerSample = 8;
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const dataSize = numSamples * numChannels * (bitsPerSample / 8);
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  const write = (offset, val, size = 4) => {
    if (size === 4) view.setUint32(offset, val, true);
    else if (size === 2) view.setUint16(offset, val, true);
  };
  const str = (s) => { for (let i = 0; i < s.length; i++) view.setUint8(0 + i, s.charCodeAt(i)); };
  str('RIFF');
  write(4, 36 + dataSize);
  str('WAVE');
  str('fmt ');
  write(16, 16);
  write(20, 1);
  write(22, numChannels);
  write(24, sampleRate);
  write(28, byteRate);
  write(32, numChannels * (bitsPerSample / 8));
  write(34, bitsPerSample);
  str('data');
  write(40, dataSize);
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const sample = Math.floor(127 + 80 * Math.sin(2 * Math.PI * freq * t) * Math.exp(-5 * t));
    view.setUint8(44 + i, Math.max(0, Math.min(255, sample)));
  }
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return 'data:audio/wav;base64,' + btoa(binary);
};

const playHtmlAudioFallback = () => {
  try {
    if (!htmlAudioFallback) {
      htmlAudioFallback = new Audio(getBeepDataUri());
      htmlAudioFallback.setAttribute?.('playsinline', 'true');
      htmlAudioFallback.playsInline = true;
      htmlAudioFallback.preload = 'auto';
    }
    htmlAudioFallback.volume = 0.7;
    htmlAudioFallback.muted = false;
    htmlAudioFallback.currentTime = 0;
    const p = htmlAudioFallback.play();
    if (p && typeof p.catch === 'function') p.catch(() => { void 0; });
  } catch {
    void 0;
  }
};

/** Pre-create and play on first tap to unlock audio (required for iOS/mobile) */
export const unlockAudio = () => {
  if (audioUnlocked) return;
  audioUnlocked = true;
  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') ctx.resume().catch(() => { void 0; });
    if (!htmlAudioFallback) {
      htmlAudioFallback = new Audio(getBeepDataUri());
      htmlAudioFallback.playsInline = true;
      htmlAudioFallback.preload = 'auto';
    }
    htmlAudioFallback.volume = 0.5;
    htmlAudioFallback.muted = false;
    htmlAudioFallback.currentTime = 0;
    htmlAudioFallback.play().then(() => { void 0; }).catch(() => { void 0; });
  } catch {
    void 0;
  }
};

/** Setup unlock on first tap/click - call once from App. Use capture so we run before nav. Also triggers push permission on each tap (iOS needs gesture). */
export const setupAudioUnlock = () => {
  const onInteraction = () => {
    unlockAudio();
    import('./pushOnGesture.js').then((m) => m.requestPushFromGesture()).catch(() => { void 0; });
  };
  const opts = { passive: true, capture: true };
  document.addEventListener('click', onInteraction, opts);
  document.addEventListener('touchstart', onInteraction, opts);
  document.addEventListener('touchend', onInteraction, opts);
  document.addEventListener('keydown', onInteraction, opts);
};

export const playMessageSound = () => {
  if (!isChatSoundEnabled()) return;
  // Use HTML5 Audio for all platforms - works after unlock on desktop and mobile
  playHtmlAudioFallback();
};

// Keep notification alert sound consistent with chat sound preferences.
export const playNotificationSound = () => {
  if (!isChatSoundEnabled()) return;
  playHtmlAudioFallback();
};
