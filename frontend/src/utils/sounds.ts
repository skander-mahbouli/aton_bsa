/**
 * Play a short ascending chime using the Web Audio API.
 * No audio files needed — generated programmatically.
 */
export function playFollowSound() {
  try {
    const ctx = new AudioContext();

    // Two-note ascending chime: E5 → G#5
    const notes = [659.25, 830.61];
    const now = ctx.currentTime;

    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.12);

      gain.gain.setValueAtTime(0, now + i * 0.12);
      gain.gain.linearRampToValueAtTime(0.25, now + i * 0.12 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + i * 0.12);
      osc.stop(now + i * 0.12 + 0.35);
    });

    // Close context after sounds finish
    setTimeout(() => ctx.close(), 800);
  } catch {
    // Web Audio not available — silently skip
  }
}
