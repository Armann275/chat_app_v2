// Synthesized call ringtones via the Web Audio API — no audio asset needed.
//  - 'incoming': a melodic two-note ring (for the callee)
//  - 'outgoing': a classic dual-tone ringback (for the caller)
// Loops until stopRingtone() is called (on accept / reject / end).

let ctx = null;
let intervalId = null;

function getCtx() {
  if (typeof window === 'undefined') return null;
  const Ctor = window.AudioContext || window.webkitAudioContext;
  if (!Ctor) return null;
  if (!ctx) ctx = new Ctor();
  return ctx;
}

// One short tone (one or more frequencies played together) with a soft
// attack/release envelope so it doesn't click.
function beep(audio, freqs, startTime, duration, volume) {
  const gain = audio.createGain();
  gain.connect(audio.destination);
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(volume, startTime + 0.03);
  gain.gain.setValueAtTime(volume, startTime + duration - 0.06);
  gain.gain.linearRampToValueAtTime(0, startTime + duration);

  for (const f of freqs) {
    const osc = audio.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = f;
    osc.connect(gain);
    osc.start(startTime);
    osc.stop(startTime + duration);
  }
}

function playPattern(kind) {
  const audio = getCtx();
  if (!audio) return;
  // Browsers start the context suspended until a user gesture; resume best-effort.
  if (audio.state === 'suspended') audio.resume().catch(() => {});
  const now = audio.currentTime;

  if (kind === 'incoming') {
    beep(audio, [660], now, 0.4, 0.14);
    beep(audio, [550], now + 0.5, 0.4, 0.14);
  } else {
    // North-American ringback: 440 Hz + 480 Hz, ~1s.
    beep(audio, [440, 480], now, 1.0, 0.1);
  }
}

export function startRingtone(kind) {
  stopRingtone();
  playPattern(kind);
  const periodMs = kind === 'incoming' ? 2400 : 3000;
  intervalId = setInterval(() => playPattern(kind), periodMs);
}

export function stopRingtone() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}
