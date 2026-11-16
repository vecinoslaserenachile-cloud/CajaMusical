export type AtmosphereMode = 'magic' | 'rain' | 'snow' | 'none';

interface ActiveSoundGraph {
  stop: () => void;
  setSpeed?: (speed: number) => void;
}

function createNoiseBuffer(ctx: AudioContext, seconds = 3, type: 'pink' | 'brown' = 'pink'): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const length = Math.floor(sampleRate * seconds);
  const buffer = ctx.createBuffer(2, length, sampleRate);

  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch);
    if (type === 'brown') {
      let lastOut = 0;
      for (let i = 0; i < length; i++) {
        const white = Math.random() * 2 - 1;
        lastOut = (lastOut + 0.02 * white) / 1.02;
        data[i] = Math.max(-1, Math.min(1, lastOut * 3.5));
      }
    } else {
      // Paul Kellet's pink noise approximation
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < length; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        const pink = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
        b6 = white * 0.115926;
        data[i] = Math.max(-1, Math.min(1, pink));
      }
    }
  }
  return buffer;
}

export class AmbientSoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private activeGraph: ActiveSoundGraph | null = null;
  private currentMode: AtmosphereMode = 'none';
  private volume = 0.5;
  private muted = false;
  private enabled = true;
  private speed = 1;

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0;
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public unlock() {
    this.ensureContext();
  }

  public setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1, volume));
    this.updateMasterGain();
  }

  public setMuted(muted: boolean) {
    this.muted = muted;
    this.updateMasterGain();
  }

  public setEnabled(enabled: boolean) {
    this.enabled = enabled;
    this.updateMasterGain();
  }

  public setSpeed(speed: number) {
    this.speed = speed;
    this.activeGraph?.setSpeed?.(speed);
  }

  private updateMasterGain() {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const target = !this.muted && this.enabled && this.currentMode !== 'none' ? this.volume * 0.55 : 0;
    this.masterGain.gain.cancelScheduledValues(now);
    this.masterGain.gain.setTargetAtTime(target, now, 0.18);
  }

  public setMode(mode: AtmosphereMode, userInitiated = false) {
    if (mode === this.currentMode && (this.activeGraph || mode === 'none')) {
      if (userInitiated) this.ensureContext();
      this.updateMasterGain();
      return;
    }

    if (this.activeGraph) {
      this.activeGraph.stop();
      this.activeGraph = null;
    }

    this.currentMode = mode;

    if (mode === 'none') {
      this.updateMasterGain();
      return;
    }

    if (!userInitiated && !this.ctx) {
      return;
    }

    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;

    if (mode === 'rain') {
      this.activeGraph = this.buildRainGraph(ctx, this.masterGain);
    } else if (mode === 'snow') {
      this.activeGraph = this.buildSnowWindGraph(ctx, this.masterGain);
    } else if (mode === 'magic') {
      this.activeGraph = this.buildMagicChimesGraph(ctx, this.masterGain);
    }

    this.activeGraph?.setSpeed?.(this.speed);
    this.updateMasterGain();
  }

  public syncIfUnlocked(mode: AtmosphereMode) {
    if (this.ctx && this.currentMode !== mode) {
      this.setMode(mode, true);
    } else if (this.ctx) {
      this.updateMasterGain();
    }
  }

  private buildRainGraph(ctx: AudioContext, dest: AudioNode): ActiveSoundGraph {
    const groupGain = ctx.createGain();
    groupGain.gain.value = 0.001;
    groupGain.gain.setTargetAtTime(1, ctx.currentTime, 0.35);
    groupGain.connect(dest);

    const pinkBuf = createNoiseBuffer(ctx, 4, 'pink');
    const brownBuf = createNoiseBuffer(ctx, 4, 'brown');

    // Capa 1: Lluvia constante media
    const rainSrc = ctx.createBufferSource();
    rainSrc.buffer = pinkBuf;
    rainSrc.loop = true;

    const rainBand = ctx.createBiquadFilter();
    rainBand.type = 'bandpass';
    rainBand.frequency.value = 1150;
    rainBand.Q.value = 0.55;

    const rainLow = ctx.createBiquadFilter();
    rainLow.type = 'lowpass';
    rainLow.frequency.value = 3400;

    const rainGain = ctx.createGain();
    rainGain.gain.value = 0.6;

    rainSrc.connect(rainBand);
    rainBand.connect(rainLow);
    rainLow.connect(rainGain);
    rainGain.connect(groupGain);
    rainSrc.start();

    // Capa 2: Rumor profundo de lluvia / ambiente exterior
    const rumbleSrc = ctx.createBufferSource();
    rumbleSrc.buffer = brownBuf;
    rumbleSrc.loop = true;

    const rumbleFilter = ctx.createBiquadFilter();
    rumbleFilter.type = 'lowpass';
    rumbleFilter.frequency.value = 260;

    const rumbleGain = ctx.createGain();
    rumbleGain.gain.value = 0.55;

    rumbleSrc.connect(rumbleFilter);
    rumbleFilter.connect(rumbleGain);
    rumbleGain.connect(groupGain);
    rumbleSrc.start();

    // Capa 3: Gotas individuales aleatorias con paneo estéreo
    let speedFactor = this.speed;
    let dropletTimer: number | null = null;
    let stopped = false;

    const scheduleDroplet = () => {
      if (stopped) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const dropGain = ctx.createGain();
      const baseFreq = 520 + Math.random() * 950;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(baseFreq, now);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.7, now + 0.055);

      const amp = 0.025 + Math.random() * 0.04;
      dropGain.gain.setValueAtTime(0.0001, now);
      dropGain.gain.linearRampToValueAtTime(amp, now + 0.006);
      dropGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.085);

      if (typeof ctx.createStereoPanner === 'function') {
        const panner = ctx.createStereoPanner();
        panner.pan.value = Math.random() * 1.6 - 0.8;
        osc.connect(dropGain);
        dropGain.connect(panner);
        panner.connect(groupGain);
      } else {
        osc.connect(dropGain);
        dropGain.connect(groupGain);
      }

      osc.start(now);
      osc.stop(now + 0.09);

      const delay = Math.max(90, (140 + Math.random() * 280) / (0.6 + speedFactor * 0.4));
      dropletTimer = window.setTimeout(scheduleDroplet, delay);
    };

    dropletTimer = window.setTimeout(scheduleDroplet, 120);

    const seagulls = this.buildSeagullLayer(ctx, groupGain, 'rain');

    return {
      setSpeed: (s: number) => {
        speedFactor = s;
        rainBand.frequency.setTargetAtTime(950 + s * 250, ctx.currentTime, 0.2);
        seagulls.setSpeed(s);
      },
      stop: () => {
        stopped = true;
        if (dropletTimer !== null) clearTimeout(dropletTimer);
        seagulls.stop();
        try {
          rainSrc.stop();
          rumbleSrc.stop();
        } catch {}
        rainSrc.disconnect();
        rumbleSrc.disconnect();
        groupGain.disconnect();
      },
    };
  }

  private buildSnowWindGraph(ctx: AudioContext, dest: AudioNode): ActiveSoundGraph {
    const groupGain = ctx.createGain();
    groupGain.gain.value = 0.001;
    groupGain.gain.setTargetAtTime(1, ctx.currentTime, 0.45);
    groupGain.connect(dest);

    const pinkBuf = createNoiseBuffer(ctx, 4, 'pink');

    // Capa 1: Viento suave con filtro resonante modulado por LFO
    const windSrc = ctx.createBufferSource();
    windSrc.buffer = pinkBuf;
    windSrc.loop = true;

    const windFilter = ctx.createBiquadFilter();
    windFilter.type = 'bandpass';
    windFilter.frequency.value = 420;
    windFilter.Q.value = 3.2;

    const windGain = ctx.createGain();
    windGain.gain.value = 0.45;

    const lfoFreq = ctx.createOscillator();
    lfoFreq.type = 'sine';
    lfoFreq.frequency.value = 0.13;
    const lfoFreqDepth = ctx.createGain();
    lfoFreqDepth.gain.value = 170;
    lfoFreq.connect(lfoFreqDepth);
    lfoFreqDepth.connect(windFilter.frequency);

    const lfoAmp = ctx.createOscillator();
    lfoAmp.type = 'sine';
    lfoAmp.frequency.value = 0.09;
    const lfoAmpDepth = ctx.createGain();
    lfoAmpDepth.gain.value = 0.18;
    lfoAmp.connect(lfoAmpDepth);
    lfoAmpDepth.connect(windGain.gain);

    windSrc.connect(windFilter);
    windFilter.connect(windGain);
    windGain.connect(groupGain);

    // Capa 2: Brisa alta cristalina
    const airSrc = ctx.createBufferSource();
    airSrc.buffer = pinkBuf;
    airSrc.loop = true;

    const airFilter = ctx.createBiquadFilter();
    airFilter.type = 'bandpass';
    airFilter.frequency.value = 1450;
    airFilter.Q.value = 1.6;

    const airGain = ctx.createGain();
    airGain.gain.value = 0.12;

    airSrc.connect(airFilter);
    airFilter.connect(airGain);
    airGain.connect(groupGain);

    windSrc.start();
    airSrc.start();
    lfoFreq.start();
    lfoAmp.start();

    // Capa 3: Destellos cristalinos de escarcha ocasionales
    const frostNotes = [1174.66, 1318.51, 1567.98, 1760.0, 2093.0];
    let speedFactor = this.speed;
    let frostTimer: number | null = null;
    let stopped = false;

    const scheduleFrost = () => {
      if (stopped) return;
      const now = ctx.currentTime;
      const freq = frostNotes[Math.floor(Math.random() * frostNotes.length)];
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.032, now + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.9);

      if (typeof ctx.createStereoPanner === 'function') {
        const panner = ctx.createStereoPanner();
        panner.pan.value = Math.random() * 1.4 - 0.7;
        osc.connect(gain);
        gain.connect(panner);
        panner.connect(groupGain);
      } else {
        osc.connect(gain);
        gain.connect(groupGain);
      }

      osc.start(now);
      osc.stop(now + 2.0);

      const delay = Math.max(900, (1600 + Math.random() * 2200) / (0.7 + speedFactor * 0.3));
      frostTimer = window.setTimeout(scheduleFrost, delay);
    };

    frostTimer = window.setTimeout(scheduleFrost, 600);

    const seagulls = this.buildSeagullLayer(ctx, groupGain, 'snow');

    return {
      setSpeed: (s: number) => {
        speedFactor = s;
        lfoFreq.frequency.setTargetAtTime(0.1 + s * 0.06, ctx.currentTime, 0.3);
        seagulls.setSpeed(s);
      },
      stop: () => {
        stopped = true;
        if (frostTimer !== null) clearTimeout(frostTimer);
        seagulls.stop();
        try {
          windSrc.stop();
          airSrc.stop();
          lfoFreq.stop();
          lfoAmp.stop();
        } catch {}
        windSrc.disconnect();
        airSrc.disconnect();
        groupGain.disconnect();
      },
    };
  }

  private buildMagicChimesGraph(ctx: AudioContext, dest: AudioNode): ActiveSoundGraph {
    const groupGain = ctx.createGain();
    groupGain.gain.value = 0.001;
    groupGain.gain.setTargetAtTime(1, ctx.currentTime, 0.35);
    groupGain.connect(dest);

    // Capa 1: Colchón etéreo suave (quinta cálida)
    const padFilter = ctx.createBiquadFilter();
    padFilter.type = 'lowpass';
    padFilter.frequency.value = 550;

    const padGain = ctx.createGain();
    padGain.gain.value = 0.06;

    const osc1 = ctx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.value = 261.63; // C4

    const osc2 = ctx.createOscillator();
    osc2.type = 'triangle';
    osc2.frequency.value = 392.0; // G4

    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.18;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.025;
    lfo.connect(lfoGain);
    lfoGain.connect(padGain.gain);

    osc1.connect(padFilter);
    osc2.connect(padFilter);
    padFilter.connect(padGain);
    padGain.connect(groupGain);

    osc1.start();
    osc2.start();
    lfo.start();

    // Capa 2: Campanas mágicas / celesta con armónicos metálicos
    const chimeNotes = [523.25, 659.25, 783.99, 987.77, 1174.66, 1318.51, 1567.98];
    let speedFactor = this.speed;
    let chimeTimer: number | null = null;
    let stopped = false;

    const triggerChime = () => {
      if (stopped) return;
      const now = ctx.currentTime;
      const fundamental = chimeNotes[Math.floor(Math.random() * chimeNotes.length)];

      const outGain = ctx.createGain();
      outGain.gain.setValueAtTime(0.0001, now);
      outGain.gain.linearRampToValueAtTime(0.085, now + 0.012);
      outGain.gain.exponentialRampToValueAtTime(0.0001, now + 2.2);

      const partials = [
        { ratio: 1, type: 'sine' as OscillatorType, amp: 1.0, dur: 2.2 },
        { ratio: 2.0, type: 'sine' as OscillatorType, amp: 0.35, dur: 1.4 },
        { ratio: 3.01, type: 'triangle' as OscillatorType, amp: 0.14, dur: 0.7 },
      ];

      if (typeof ctx.createStereoPanner === 'function') {
        const panner = ctx.createStereoPanner();
        panner.pan.value = Math.random() * 1.5 - 0.75;
        outGain.connect(panner);
        panner.connect(groupGain);
      } else {
        outGain.connect(groupGain);
      }

      for (const p of partials) {
        const osc = ctx.createOscillator();
        const pGain = ctx.createGain();
        osc.type = p.type;
        osc.frequency.setValueAtTime(fundamental * p.ratio, now);
        pGain.gain.setValueAtTime(p.amp, now);
        pGain.gain.exponentialRampToValueAtTime(0.001, now + p.dur);
        osc.connect(pGain);
        pGain.connect(outGain);
        osc.start(now);
        osc.stop(now + p.dur + 0.05);
      }

      const delay = Math.max(450, (850 + Math.random() * 1450) / (0.65 + speedFactor * 0.35));
      chimeTimer = window.setTimeout(triggerChime, delay);
    };

    chimeTimer = window.setTimeout(triggerChime, 180);

    const seagulls = this.buildSeagullLayer(ctx, groupGain, 'magic');

    return {
      setSpeed: (s: number) => {
        speedFactor = s;
        seagulls.setSpeed(s);
      },
      stop: () => {
        stopped = true;
        if (chimeTimer !== null) clearTimeout(chimeTimer);
        seagulls.stop();
        try {
          osc1.stop();
          osc2.stop();
          lfo.stop();
        } catch {}
        osc1.disconnect();
        osc2.disconnect();
        groupGain.disconnect();
      },
    };
  }

  private buildSeagullLayer(
    ctx: AudioContext,
    dest: AudioNode,
    mode: Exclude<AtmosphereMode, 'none'>
  ): { setSpeed: (speed: number) => void; stop: () => void } {
    const profile =
      mode === 'rain'
        ? { minMs: 10500, maxMs: 19500, gainScale: 0.62, airCutoff: 1450, initialMs: 4200 }
        : mode === 'snow'
          ? { minMs: 8000, maxMs: 15500, gainScale: 0.78, airCutoff: 1750, initialMs: 3200 }
          : { minMs: 5500, maxMs: 12000, gainScale: 0.95, airCutoff: 2250, initialMs: 2200 };

    const busGain = ctx.createGain();
    busGain.gain.value = 1;
    busGain.connect(dest);

    // Eco costero suave sobre el mar para simular distancia
    const echoDelay = ctx.createDelay(1.0);
    echoDelay.delayTime.value = 0.27;
    const echoFeedback = ctx.createGain();
    echoFeedback.gain.value = 0.28;
    const echoFilter = ctx.createBiquadFilter();
    echoFilter.type = 'lowpass';
    echoFilter.frequency.value = 1150;
    const echoWet = ctx.createGain();
    echoWet.gain.value = 0.34;

    echoDelay.connect(echoFilter);
    echoFilter.connect(echoFeedback);
    echoFeedback.connect(echoDelay);
    echoFilter.connect(echoWet);
    echoWet.connect(busGain);

    let speedFactor = this.speed;
    let timerId: number | null = null;
    let stopped = false;

    const triggerSingleCry = (
      startTime: number,
      baseFreq: number,
      duration: number,
      peakAmp: number,
      panValue: number
    ) => {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';

      // Vibrato orgánico sutil en el canto
      const vibrato = ctx.createOscillator();
      vibrato.type = 'sine';
      vibrato.frequency.value = 22 + Math.random() * 9;
      const vibratoDepth = ctx.createGain();
      vibratoDepth.gain.value = 16;
      vibrato.connect(vibratoDepth);
      vibratoDepth.connect(osc.frequency);

      // Envolvente de tono característica de gaviota ("ki-aaau")
      const riseTime = Math.min(0.11, duration * 0.22);
      osc.frequency.setValueAtTime(baseFreq * 0.92, startTime);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.12, startTime + riseTime);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.68, startTime + duration);

      // Formante vocal + absorción atmosférica por lejanía
      const vocalFilter = ctx.createBiquadFilter();
      vocalFilter.type = 'bandpass';
      vocalFilter.frequency.setValueAtTime(baseFreq * 1.35, startTime);
      vocalFilter.frequency.exponentialRampToValueAtTime(baseFreq * 0.95, startTime + duration);
      vocalFilter.Q.value = 4.6;

      const distanceLowpass = ctx.createBiquadFilter();
      distanceLowpass.type = 'lowpass';
      distanceLowpass.frequency.value = profile.airCutoff;

      const envGain = ctx.createGain();
      envGain.gain.setValueAtTime(0.0001, startTime);
      envGain.gain.linearRampToValueAtTime(peakAmp, startTime + riseTime * 0.85);
      envGain.gain.setValueAtTime(peakAmp * 0.82, startTime + duration * 0.45);
      envGain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

      osc.connect(vocalFilter);
      vocalFilter.connect(distanceLowpass);
      distanceLowpass.connect(envGain);

      if (typeof ctx.createStereoPanner === 'function') {
        const panner = ctx.createStereoPanner();
        panner.pan.value = panValue;
        envGain.connect(panner);
        panner.connect(busGain);
        panner.connect(echoDelay);
      } else {
        envGain.connect(busGain);
        envGain.connect(echoDelay);
      }

      osc.start(startTime);
      vibrato.start(startTime);
      osc.stop(startTime + duration + 0.04);
      vibrato.stop(startTime + duration + 0.04);

      osc.onended = () => {
        try {
          osc.disconnect();
          vibrato.disconnect();
          vibratoDepth.disconnect();
          vocalFilter.disconnect();
          distanceLowpass.disconnect();
          envGain.disconnect();
        } catch {}
      };
    };

    const scheduleGull = () => {
      if (stopped) return;

      if (this.enabled && !this.muted && ctx.state === 'running') {
        const now = ctx.currentTime;
        const pan = (Math.random() > 0.5 ? 1 : -1) * (0.3 + Math.random() * 0.6);
        const baseFreq = 980 + Math.random() * 440;
        const baseAmp = (0.045 + Math.random() * 0.032) * profile.gainScale;

        // Alterna entre llamado largo lejano o frase doble/triple de gaviota
        const isPhrase = Math.random() < 0.55;
        if (isPhrase) {
          const count = Math.random() < 0.4 ? 3 : 2;
          let offset = 0;
          for (let i = 0; i < count; i++) {
            const dur = i === count - 1 ? 0.34 + Math.random() * 0.16 : 0.16 + Math.random() * 0.06;
            const pitchScale = 1 - i * 0.07;
            const ampScale = 1 - i * 0.16;
            triggerSingleCry(now + offset, baseFreq * pitchScale, dur, baseAmp * ampScale, pan);
            offset += dur + 0.11 + Math.random() * 0.07;
          }
        } else {
          const dur = 0.48 + Math.random() * 0.28;
          triggerSingleCry(now, baseFreq, dur, baseAmp, pan);
        }
      }

      const rawDelay = profile.minMs + Math.random() * (profile.maxMs - profile.minMs);
      const nextDelay = Math.max(2500, rawDelay / (0.75 + speedFactor * 0.25));
      timerId = window.setTimeout(scheduleGull, nextDelay);
    };

    timerId = window.setTimeout(scheduleGull, profile.initialMs);

    return {
      setSpeed: (s: number) => {
        speedFactor = s;
      },
      stop: () => {
        stopped = true;
        if (timerId !== null) clearTimeout(timerId);
        try {
          echoDelay.disconnect();
          echoFeedback.disconnect();
          echoFilter.disconnect();
          echoWet.disconnect();
          busGain.disconnect();
        } catch {}
      },
    };
  }

  public dispose() {
    if (this.activeGraph) {
      this.activeGraph.stop();
      this.activeGraph = null;
    }
    if (this.ctx) {
      this.ctx.close().catch(() => {});
      this.ctx = null;
      this.masterGain = null;
    }
  }
}
