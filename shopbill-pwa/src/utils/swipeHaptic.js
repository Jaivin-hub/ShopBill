/**
 * Short “tick” when a horizontal swipe changes tabs.
 * Android: Vibration API. iPhone: Web Audio + HTML5 (no system vibrate in Safari/PWA).
 */

import { unlockAudio } from './notificationSound';

let audioCtx = null;
let tickDataUri = null;

export function isStandalonePwa() {
  if (typeof window === 'undefined') return false;
  try {
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      window.matchMedia('(display-mode: fullscreen)').matches ||
      window.matchMedia('(display-mode: minimal-ui)').matches ||
      /** @type {Window & { navigator: Navigator & { standalone?: boolean } }} */
      (window.navigator).standalone === true
    );
  } catch {
    return false;
  }
}

export function isIOSDevice() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  return /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function buildTickDataUri() {
  if (tickDataUri) return tickDataUri;
  const freq = 340;
  const duration = 0.022;
  const decayExp = 18;
  const sampleRate = 11025;
  const numSamples = Math.floor(sampleRate * duration);
  const buffer = new ArrayBuffer(44 + numSamples);
  const view = new DataView(buffer);
  const write = (offset, val, size = 4) => {
    if (size === 4) view.setUint32(offset, val, true);
    else if (size === 2) view.setUint16(offset, val, true);
  };
  const writeStr = (offset, s) => {
    for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
  };
  writeStr(0, 'RIFF');
  write(4, 36 + numSamples);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  write(16, 16);
  write(20, 1, 2);
  write(22, 1, 2);
  write(24, sampleRate);
  write(28, sampleRate);
  write(32, 1, 2);
  write(34, 8, 2);
  writeStr(36, 'data');
  write(40, numSamples);
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const sample = Math.floor(127 + 90 * Math.sin(2 * Math.PI * freq * t) * Math.exp(-decayExp * t));
    view.setUint8(44 + i, Math.max(0, Math.min(255, sample)));
  }
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  tickDataUri = `data:audio/wav;base64,${btoa(binary)}`;
  return tickDataUri;
}

const getAudioContext = () => {
  if (typeof window === 'undefined') return null;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  if (!audioCtx) audioCtx = new Ctx();
  return audioCtx;
};

/** iOS: new element per play — reused Audio often ignores play() on touchend. */
function playFreshHtmlTick() {
  if (typeof Audio === 'undefined') return false;
  try {
    const a = new Audio(buildTickDataUri());
    a.setAttribute('playsinline', 'true');
    a.playsInline = true;
    a.preload = 'auto';
    a.volume = isIOSDevice() ? 0.55 : 0.35;
    a.muted = false;
    const p = a.play();
    if (p && typeof p.catch === 'function') {
      p.catch(() => false);
    }
    return true;
  } catch {
    return false;
  }
}

/** Same user-gesture frame as touchend — best chance on iOS Safari / PWA. */
function playWebAudioTickInGesture() {
  const ctx = getAudioContext();
  if (!ctx) return false;
  try {
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(380, now);
    osc.frequency.exponentialRampToValueAtTime(200, now + 0.008);
    gain.gain.setValueAtTime(0.00001, now);
    gain.gain.linearRampToValueAtTime(0.12, now + 0.001);
    gain.gain.exponentialRampToValueAtTime(0.00001, now + 0.018);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.02);
    return true;
  } catch {
    return false;
  }
}

function playIosTick() {
  unlockAudio();
  if (playWebAudioTickInGesture()) return;
  playFreshHtmlTick();
}

/**
 * Prime on touchstart (same gesture chain as touchend tick).
 */
export function primeSwipeHaptic() {
  if (typeof window === 'undefined') return;
  unlockAudio();
  try {
    const ctx = getAudioContext();
    if (ctx?.state === 'suspended') {
      void ctx.resume();
    }
  } catch {
    /* ignore */
  }
}

export function registerPwaSwipeHapticWarmup() {
  if (typeof document === 'undefined') return () => {};
  if (!isIOSDevice() && !isStandalonePwa()) return () => {};

  const onGesture = () => {
    primeSwipeHaptic();
    document.removeEventListener('touchstart', onGesture, true);
    document.removeEventListener('touchend', onGesture, true);
  };

  document.addEventListener('touchstart', onGesture, { capture: true, passive: true });
  document.addEventListener('touchend', onGesture, { capture: true, passive: true });

  return () => {
    document.removeEventListener('touchstart', onGesture, true);
    document.removeEventListener('touchend', onGesture, true);
  };
}

export function registerPwaSwipeHapticLifecycle() {
  if (typeof document === 'undefined') return () => {};
  const onVisibility = () => {
    if (document.visibilityState === 'visible' && audioCtx?.state === 'suspended') {
      void audioCtx.resume();
    }
  };
  document.addEventListener('visibilitychange', onVisibility);
  return () => document.removeEventListener('visibilitychange', onVisibility);
}

/**
 * Call synchronously from touchend before React state updates (required on iOS).
 */
export function pulseSwipePageHaptic() {
  if (typeof window === 'undefined') return;
  try {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches) return;
  } catch {
    /* ignore */
  }

  const ios = isIOSDevice();

  if (ios) {
    playIosTick();
    return;
  }

  let vibrated = false;
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(0);
      navigator.vibrate(15);
      vibrated = true;
    }
  } catch {
    vibrated = false;
  }

  if (!vibrated) {
    playFreshHtmlTick();
  }
}
