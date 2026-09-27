class AudioManager {
  private context?: AudioContext;
  volume = Number(localStorage.getItem('gamepeak.volume') ?? '0.25');
  get muted() { return this.volume === 0; }
  toggle() { this.setVolume(this.muted ? 0.25 : 0); }
  setVolume(volume: number) { this.volume = volume; localStorage.setItem('gamepeak.volume', String(volume)); }
  play(kind: 'coin' | 'click' | 'bell') {
    if (!this.volume) return;
    this.context ??= new AudioContext();
    void this.context.resume();
    const now = this.context.currentTime;
    const frequencies = kind === 'coin' ? [880, 1320] : kind === 'bell' ? [660, 990, 1320] : [440];
    frequencies.forEach((frequency, i) => {
      const oscillator = this.context!.createOscillator(), gain = this.context!.createGain();
      oscillator.type = 'sine'; oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0, now + i * 0.08);
      gain.gain.linearRampToValueAtTime(this.volume * 0.12, now + i * 0.08 + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.3);
      oscillator.connect(gain).connect(this.context!.destination); oscillator.start(now + i * 0.08); oscillator.stop(now + i * 0.08 + 0.32);
    });
  }
}
export const audio = new AudioManager();
