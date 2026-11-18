// 100% Procedural Web Audio API Synthesis (14 Diglosa SFX + SpeechSynthesis TTS)

class SoundEngine {
  private ctx: AudioContext | null = null;
  private noiseBuf: AudioBuffer | null = null;
  private muted = false;

  private ensureContext(): AudioContext | null {
    if (this.muted) return null;
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
  }

  public isMuted(): boolean {
    return this.muted;
  }

  private beep(
    freq: number,
    duration: number,
    type: OscillatorType,
    volume: number,
    slideTo?: number,
    delay = 0,
  ): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (slideTo !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(40, slideTo), now + duration);
    }
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  private noise(duration: number, volume: number, delay = 0, highpassHz = 600): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    if (!this.noiseBuf) {
      const len = Math.floor(ctx.sampleRate * 0.5);
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      this.noiseBuf = buf;
    }
    const now = ctx.currentTime + delay;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;

    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(highpassHz, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    src.start(now);
    src.stop(now + duration + 0.02);
  }

  // 14 Diglosa SFX
  public playTick(): void {
    this.beep(980, 0.018, 'triangle', 0.04);
  }

  public playFanfare(): void {
    const notes = [523.25, 659.25, 783.99, 1046.5, 783.99, 1567.98];
    notes.forEach((f, i) => {
      this.beep(f, 0.16, 'triangle', 0.1, undefined, i * 0.065);
    });
    this.noise(0.32, 0.04, 0.2, 1800);
  }

  public playLose(): void {
    this.beep(392, 0.22, 'triangle', 0.1, 311);
    this.beep(311, 0.26, 'triangle', 0.09, 246, 0.19);
    this.beep(246, 0.38, 'sine', 0.09, 164, 0.41);
  }

  public playShoot(): void {
    this.beep(640, 0.08, 'triangle', 0.09, 220);
    this.beep(330, 0.09, 'sawtooth', 0.05, 140, 0.015);
  }

  public playHit(): void {
    this.noise(0.08, 0.08, 0, 900);
    this.beep(210, 0.09, 'square', 0.07, 110);
  }

  public playBoom(): void {
    this.beep(95, 0.28, 'sawtooth', 0.11, 45);
    this.beep(60, 0.34, 'triangle', 0.12, 35, 0.03);
    this.noise(0.36, 0.1, 0, 260);
  }

  public playHurt(): void {
    this.beep(160, 0.18, 'sawtooth', 0.09, 85);
    this.noise(0.14, 0.07, 0, 500);
  }

  public playPick(): void {
    this.beep(880, 0.09, 'triangle', 0.09);
    this.beep(1320, 0.14, 'sine', 0.1, undefined, 0.06);
  }

  public playDoor(): void {
    [330, 495, 660].forEach((f, i) => {
      this.beep(f, 0.16, 'triangle', 0.1, undefined, i * 0.06);
    });
  }

  public playBoss(): void {
    this.beep(110, 0.38, 'sawtooth', 0.11, 70);
    this.beep(82, 0.45, 'square', 0.08, 55, 0.08);
    this.noise(0.45, 0.09, 0.04, 200);
  }

  public playOk(): void {
    this.beep(660, 0.09, 'triangle', 0.1);
    this.beep(990, 0.14, 'sine', 0.1, undefined, 0.065);
  }

  public playNo(): void {
    this.beep(190, 0.16, 'sawtooth', 0.08, 130);
    this.beep(145, 0.18, 'sawtooth', 0.07, 100, 0.1);
  }

  public playWin(): void {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
      this.beep(f, 0.22, 'triangle', 0.11, undefined, i * 0.075);
    });
  }

  public playFlip(): void {
    this.beep(440, 0.05, 'sine', 0.06, 560);
  }

  // Backward-compatible aliases used across existing modules
  public playSparkPickup(combo = 1): void {
    const pentatonic = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5];
    const idx = Math.min(pentatonic.length - 1, Math.max(0, combo - 1));
    const freq = pentatonic[idx];
    this.beep(freq, 0.13, 'triangle', 0.1, freq * 1.15);
  }

  public playBuild(): void {
    this.playDoor();
  }

  public playUpgrade(): void {
    this.playWin();
  }

  public playDash(): void {
    this.beep(320, 0.14, 'sawtooth', 0.05, 140);
    this.beep(520, 0.14, 'sine', 0.07, 880, 0.02);
  }

  public playSurgeAlert(): void {
    this.playBoss();
  }

  public playQuestComplete(): void {
    this.playWin();
  }

  public playTierUp(): void {
    this.playFanfare();
  }

  public playGameOver(): void {
    this.playLose();
  }

  public playWrong(): void {
    this.playNo();
  }

  public playHeartPickup(): void {
    this.playPick();
  }

  public speakEnglish(text: string, rate = 0.88, pitch = 1.0): void {
    if (this.muted || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = 'en-US';
      utter.rate = rate;
      utter.pitch = pitch;
      window.speechSynthesis.speak(utter);
    } catch {
      // ignore speech synthesis restrictions
    }
  }
}

export const soundEngine = new SoundEngine();
