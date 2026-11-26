// Web Audio Synthesizer for 3D Kart Monopoly
export class SoundFX {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }

  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) this.ctx = new AC();
  }

  _tone(freq, dur, type = 'triangle', vol = 0.14, delay = 0, endFreq = null) {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (endFreq) osc.frequency.exponentialRampToValueAtTime(endFreq, now + dur);
    g.gain.setValueAtTime(vol, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + dur);
    osc.connect(g);
    g.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + dur + 0.02);
  }

  playDice() {
    for (let i = 0; i < 6; i++) {
      this._tone(260 + Math.random() * 440, 0.055, 'square', 0.07, i * 0.065);
    }
  }

  playStep() {
    this._tone(520, 0.07, 'triangle', 0.11, 0, 720);
  }

  playCoin() {
    this._tone(987, 0.09, 'sine', 0.13, 0);
    this._tone(1318, 0.18, 'sine', 0.13, 0.08);
  }

  playBuy() {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => this._tone(f, 0.16, 'triangle', 0.14, i * 0.07));
  }

  playPay() {
    this._tone(360, 0.14, 'sawtooth', 0.1, 0, 180);
    this._tone(220, 0.22, 'sawtooth', 0.1, 0.12, 130);
  }

  playCard() {
    [440, 587.33, 880].forEach((f, i) => this._tone(f, 0.12, 'sine', 0.12, i * 0.06));
  }

  playBeep(high = false) {
    this._tone(high ? 880 : 440, high ? 0.28 : 0.14, 'square', 0.11);
  }

  playBoost() {
    this._tone(280, 0.32, 'sawtooth', 0.11, 0, 880);
  }

  playHit() {
    this._tone(180, 0.28, 'square', 0.15, 0, 55);
  }

  playWin() {
    const notes = [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5];
    const times = [0, 0.11, 0.22, 0.34, 0.5, 0.62];
    notes.forEach((f, i) => this._tone(f, 0.24, 'triangle', 0.15, times[i]));
  }
}
