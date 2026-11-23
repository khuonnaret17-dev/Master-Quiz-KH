/**
 * Khmer Language and Number Utilities
 */

const KHMER_DIGITS = ['០', '១', '២', '៣', '៤', '៥', '៦', '៧', '៨', '៩'];

export function toKhmerNum(num: number | string | undefined | null): string {
  if (num === undefined || num === null) return '';
  return String(num).replace(/[0-9]/g, (digit) => KHMER_DIGITS[parseInt(digit, 10)]);
}

export function isEnglishSubject(subjectName: string): boolean {
  if (!subjectName) return false;
  const lower = subjectName.toLowerCase();
  return lower.includes('english') || lower.includes('អង់គ្លេស');
}

export const KHMER_OPTIONS_LABELS = ['ក', 'ខ', 'គ', 'ឃ'];
export const ENGLISH_OPTIONS_LABELS = ['A', 'B', 'C', 'D'];

export function getOptionLabel(index: number, subjectName?: string): string {
  if (subjectName && isEnglishSubject(subjectName)) {
    return ENGLISH_OPTIONS_LABELS[index] || String.fromCharCode(65 + index);
  }
  return KHMER_OPTIONS_LABELS[index] || String(index + 1);
}

/**
 * Fisher-Yates array shuffle for truly fair randomization
 */
export function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Khmer Alphabet comparator for Dictionary & Explanations
 */
export function khmerAlphabetSort(a: string, b: string): number {
  return a.localeCompare(b, 'km', { sensitivity: 'base' });
}

/**
 * Sound Effects via Web Audio API (Zero external audio file dependencies)
 */
let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  try {
    if (typeof window === 'undefined') return null;
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  } catch {
    return null;
  }
}

let isAudioMuted = false;

export function setMuteState(muted: boolean) {
  isAudioMuted = muted;
  try {
    localStorage.setItem('master_quiz_sound_muted', muted ? 'true' : 'false');
  } catch {
    // Ignore storage errors
  }
}

export function getMuteState(): boolean {
  try {
    const val = localStorage.getItem('master_quiz_sound_muted');
    if (val !== null) {
      isAudioMuted = val === 'true';
    }
  } catch {
    // Ignore
  }
  return isAudioMuted;
}

/**
 * Play a pleasant golden harmonic chime for correct answer
 */
export function playCorrectSound() {
  if (isAudioMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const frequencies = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6 (Major triad)

  frequencies.forEach((freq, idx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now + idx * 0.06);

    gain.gain.setValueAtTime(0, now + idx * 0.06);
    gain.gain.linearRampToValueAtTime(0.2, now + idx * 0.06 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.4);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now + idx * 0.06);
    osc.stop(now + idx * 0.06 + 0.45);
  });
}

/**
 * Play a subtle low gentle buzzer for incorrect answer
 */
export function playWrongSound() {
  if (isAudioMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(220, now);
  osc.frequency.exponentialRampToValueAtTime(140, now + 0.3);

  gain.gain.setValueAtTime(0.18, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.36);
}

/**
 * Play a click/tap SFX
 */
export function playClickSound() {
  if (isAudioMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(800, now);
  osc.frequency.exponentialRampToValueAtTime(400, now + 0.05);

  gain.gain.setValueAtTime(0.08, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.07);
}

/**
 * Sanitize unsupported CSS color functions (like oklab and oklch from Tailwind v4)
 * into standard hex/rgb format for html2canvas and html2pdf compatibility.
 */
export function fixClonedDocColors(clonedDoc: Document) {
  let ctx: CanvasRenderingContext2D | null = null;
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    ctx = canvas.getContext('2d');
  } catch {
    // Ignore context failure
  }

  const fixColor = (colorStr: string): string => {
    if (!ctx) return '#0f172a';
    try {
      ctx.fillStyle = '#0f172a';
      ctx.fillStyle = colorStr;
      const res = ctx.fillStyle;
      return res && res !== '#0f172a' ? res : colorStr;
    } catch {
      return colorStr;
    }
  };

  const colorRegex = /(oklch|oklab)\([^)]+\)/gi;

  // 1. Sanitize all <style> blocks in the cloned document
  const styleElements = clonedDoc.querySelectorAll('style');
  styleElements.forEach((styleTag) => {
    if (styleTag.textContent && colorRegex.test(styleTag.textContent)) {
      console.log('Sanitizing oklab in style tag...');
      styleTag.textContent = styleTag.textContent.replace(colorRegex, (match) => fixColor(match));
    }
  });

  // 2. Sanitize element inline styles
  const allElements = clonedDoc.querySelectorAll('*');
  allElements.forEach((el) => {
    const htmlEl = el as HTMLElement;
    if (htmlEl.style && htmlEl.style.cssText && colorRegex.test(htmlEl.style.cssText)) {
      htmlEl.style.cssText = htmlEl.style.cssText.replace(colorRegex, (match) => fixColor(match));
    }
  });
}

