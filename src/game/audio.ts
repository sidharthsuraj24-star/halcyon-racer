const mix = { volume: 0.7, muted: false };

export function setMix(volume: number, muted: boolean) {
  mix.volume = Math.max(0, Math.min(1, volume));
  mix.muted = muted;
}

class EngineAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private engineGain: GainNode | null = null;
  private windGain: GainNode | null = null;
  private skidGain: GainNode | null = null;
  private crowdGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private osc: OscillatorNode | null = null;
  private osc2: OscillatorNode | null = null;
  private sample: AudioBuffer | null = null;
  private sampleSrc: AudioBufferSourceNode | null = null;
  private noise: AudioBuffer | null = null;
  private smoothed = 80;
  private musicOsc: OscillatorNode[] = [];

  unlock() {
    if (typeof window === "undefined") return;
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    if (!this.ctx) {
      const ctx = new AC();
      this.ctx = ctx;
      const master = ctx.createGain();
      master.gain.value = 0;
      master.connect(ctx.destination);
      this.master = master;

      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 900;
      const engineGain = ctx.createGain();
      engineGain.gain.value = 0;
      const osc = ctx.createOscillator();
      osc.type = "sawtooth";
      osc.frequency.value = 70;
      const osc2 = ctx.createOscillator();
      osc2.type = "square";
      osc2.frequency.value = 140;
      const g2 = ctx.createGain();
      g2.gain.value = 0.15;
      osc2.connect(g2);
      g2.connect(filter);
      osc2.start();
      filter.connect(engineGain);
      engineGain.connect(master);
      osc.start();
      this.osc = osc;
      this.osc2 = osc2;
      this.engineGain = engineGain;

      const len = ctx.sampleRate;
      const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      this.noise = buffer;

      const windFilter = ctx.createBiquadFilter();
      windFilter.type = "bandpass";
      windFilter.frequency.value = 500;
      windFilter.Q.value = 0.6;
      const windGain = ctx.createGain();
      windGain.gain.value = 0;
      const wind = ctx.createBufferSource();
      wind.buffer = buffer;
      wind.loop = true;
      wind.connect(windFilter);
      windFilter.connect(windGain);
      windGain.connect(master);
      wind.start();
      this.windGain = windGain;

      const skidFilter = ctx.createBiquadFilter();
      skidFilter.type = "highpass";
      skidFilter.frequency.value = 900;
      const skidGain = ctx.createGain();
      skidGain.gain.value = 0;
      const skid = ctx.createBufferSource();
      skid.buffer = buffer;
      skid.loop = true;
      skid.connect(skidFilter);
      skidFilter.connect(skidGain);
      skidGain.connect(master);
      skid.start();
      this.skidGain = skidGain;

      const crowdGain = ctx.createGain();
      crowdGain.gain.value = 0;
      const crowd = ctx.createBufferSource();
      crowd.buffer = buffer;
      crowd.loop = true;
      const crowdFilter = ctx.createBiquadFilter();
      crowdFilter.type = "bandpass";
      crowdFilter.frequency.value = 320;
      crowdFilter.Q.value = 0.4;
      crowd.connect(crowdFilter);
      crowdFilter.connect(crowdGain);
      crowdGain.connect(master);
      crowd.start();
      this.crowdGain = crowdGain;

      const musicGain = ctx.createGain();
      musicGain.gain.value = 0;
      const freqs = [110, 164.8, 220];
      for (const f of freqs) {
        const o = ctx.createOscillator();
        o.type = "sine";
        o.frequency.value = f;
        o.connect(musicGain);
        o.start();
        this.musicOsc.push(o);
      }
      musicGain.connect(master);
      this.musicGain = musicGain;
      void this.loadSample(ctx);
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
  }

  private async loadSample(ctx: AudioContext) {
    try {
      const res = await fetch("https://cdn.jsdelivr.net/gh/KenneyNL/Starter-Kit-Racing@main/audio/engine.ogg");
      if (!res.ok) return;
      const buf = await res.arrayBuffer();
      this.sample = await ctx.decodeAudioData(buf);
    } catch { /* keep synth */ }
  }

  resume() {
    if (this.ctx && this.ctx.state === "suspended") void this.ctx.resume();
  }

  update(speed: number, throttle: number, drifting: boolean, boost: boolean, crowd = false) {
    if (!this.ctx || !this.master || !this.osc || !this.engineGain || !this.windGain || !this.skidGain) return;
    const now = this.ctx.currentTime;
    const loud = mix.muted ? 0 : mix.volume * mix.volume;
    this.master.gain.setTargetAtTime(loud, now, 0.05);
    const target = 48 + Math.abs(speed) * 2.1 + throttle * 48 + (boost ? 55 : 0);
    const harm = 72 + Math.abs(speed) * 1.4;
    const pulse = 1 + Math.sin(this.smoothed * 0.15) * 0.04 * throttle;
    this.smoothed += (target - this.smoothed) * 0.16;
    this.osc.frequency.setTargetAtTime(this.smoothed * pulse, now, 0.03);
    if (this.osc2) this.osc2.frequency.setTargetAtTime((harm + this.smoothed * 0.5) * pulse, now, 0.03);
    if (this.sample && !this.sampleSrc && this.master) {
      const src = this.ctx.createBufferSource();
      src.buffer = this.sample;
      src.loop = true;
      src.playbackRate.value = 0.8;
      const g = this.ctx.createGain();
      g.gain.value = 0.18;
      src.connect(g);
      g.connect(this.master);
      src.start();
      this.sampleSrc = src;
    }
    if (this.sampleSrc) this.sampleSrc.playbackRate.setTargetAtTime(0.7 + Math.min(1.4, Math.abs(speed) / 50) + throttle * 0.3, now, 0.05);
    const eg = (0.02 + throttle * 0.05 + Math.min(0.055, Math.abs(speed) * 0.0008)) * (drifting ? 1.2 : 1);
    this.engineGain.gain.setTargetAtTime(eg, now, 0.04);
    this.windGain.gain.setTargetAtTime(Math.min(0.055, Math.abs(speed) * 0.0006), now, 0.07);
    this.skidGain.gain.setTargetAtTime(drifting ? 0.055 : 0, now, 0.05);
    if (this.crowdGain) this.crowdGain.gain.setTargetAtTime(crowd ? 0.04 : 0.008, now, 0.12);
    if (this.musicGain) this.musicGain.gain.setTargetAtTime(loud * 0.12, now, 0.2);
  }

  click() {
    this.tone(880, 0.04, 0.08);
  }
  start() {
    this.tone(440, 0.08, 0.12);
    setTimeout(() => this.tone(660, 0.06, 0.1), 80);
  }
  finish() {
    this.tone(523, 0.1, 0.15);
    setTimeout(() => this.tone(659, 0.12, 0.14), 120);
  }
  private tone(freq: number, dur: number, gain: number) {
    try {
      if (!this.ctx || !this.master || mix.muted || mix.volume <= 0) return;
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = "sine";
      o.frequency.value = freq;
      const start = Math.max(0.001, gain * mix.volume);
      g.gain.setValueAtTime(start, this.ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
      o.connect(g);
      g.connect(this.master);
      o.start();
      o.stop(this.ctx.currentTime + dur + 0.02);
    } catch { /* ignore */ }
  }

  bump() {
    try {
      if (!this.ctx || !this.noise || !this.master || mix.muted || mix.volume <= 0) return;
      if (this.ctx.state === "closed") return;
      const ctx = this.ctx;
      const src = ctx.createBufferSource();
      src.buffer = this.noise;
      const g = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 240;
      const start = Math.max(0.001, 0.22 * mix.volume * mix.volume);
      g.gain.setValueAtTime(start, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.14);
      src.connect(filter);
      filter.connect(g);
      g.connect(this.master);
      src.start();
      src.stop(ctx.currentTime + 0.16);
    } catch {
      /* audio context unavailable */
    }
  }
}

export const audio = new EngineAudio();
