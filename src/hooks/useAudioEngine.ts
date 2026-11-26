import { useEffect, useRef, useState } from 'react';
import type { MutableRefObject } from 'react';
import type { AudioMetrics } from '../types';

interface NoteEvent {
  freq: number;
  bass?: number;
  beats: number;
}

// Public-domain traditional melody medley: "We Wish You a Merry Christmas" + "Jingle Bells"
const MUSIC_BOX_MELODY: NoteEvent[] = [
  // We Wish You a Merry Christmas (in G major)
  { freq: 392.0, bass: 196.0, beats: 1 }, // G4
  { freq: 523.25, bass: 261.63, beats: 1 }, // C5
  { freq: 523.25, beats: 0.5 },
  { freq: 587.33, beats: 0.5 }, // D5
  { freq: 523.25, beats: 0.5 },
  { freq: 493.88, beats: 0.5 }, // B4
  { freq: 440.0, bass: 220.0, beats: 1 }, // A4
  { freq: 440.0, beats: 1 },
  { freq: 440.0, beats: 1 },
  { freq: 587.33, bass: 293.66, beats: 1 }, // D5
  { freq: 587.33, beats: 0.5 },
  { freq: 659.25, beats: 0.5 }, // E5
  { freq: 587.33, beats: 0.5 },
  { freq: 523.25, beats: 0.5 }, // C5
  { freq: 493.88, bass: 196.0, beats: 1 }, // B4
  { freq: 392.0, beats: 1 }, // G4
  { freq: 392.0, beats: 1 },
  { freq: 659.25, bass: 261.63, beats: 1 }, // E5
  { freq: 659.25, beats: 0.5 },
  { freq: 698.46, beats: 0.5 }, // F5
  { freq: 659.25, beats: 0.5 },
  { freq: 587.33, beats: 0.5 }, // D5
  { freq: 523.25, bass: 220.0, beats: 1 }, // C5
  { freq: 440.0, beats: 1 }, // A4
  { freq: 392.0, bass: 196.0, beats: 0.5 },
  { freq: 392.0, beats: 0.5 },
  { freq: 440.0, bass: 220.0, beats: 1 },
  { freq: 587.33, bass: 293.66, beats: 1 },
  { freq: 493.88, bass: 246.94, beats: 1 },
  { freq: 523.25, bass: 261.63, beats: 2.5 }, // C5 hold

  // Gentle chime interlude: Jingle Bells chorus (in C major)
  { freq: 659.25, bass: 261.63, beats: 1 }, // E5
  { freq: 659.25, beats: 1 },
  { freq: 659.25, bass: 261.63, beats: 2 },
  { freq: 659.25, bass: 261.63, beats: 1 },
  { freq: 659.25, beats: 1 },
  { freq: 659.25, bass: 261.63, beats: 2 },
  { freq: 659.25, bass: 261.63, beats: 1 },
  { freq: 783.99, beats: 1 }, // G5
  { freq: 523.25, bass: 261.63, beats: 1.5 }, // C5
  { freq: 587.33, beats: 0.5 }, // D5
  { freq: 659.25, bass: 261.63, beats: 3 }, // E5
  { freq: 0, beats: 1 },
  { freq: 698.46, bass: 174.61, beats: 1 }, // F5
  { freq: 698.46, beats: 1 },
  { freq: 698.46, beats: 1.5 },
  { freq: 698.46, beats: 0.5 },
  { freq: 698.46, bass: 261.63, beats: 1 },
  { freq: 659.25, beats: 1 }, // E5
  { freq: 659.25, beats: 1 },
  { freq: 659.25, beats: 0.5 },
  { freq: 659.25, beats: 0.5 },
  { freq: 783.99, bass: 196.0, beats: 1 }, // G5
  { freq: 783.99, beats: 1 },
  { freq: 698.46, beats: 1 }, // F5
  { freq: 587.33, bass: 196.0, beats: 1 }, // D5
  { freq: 523.25, bass: 261.63, beats: 3.5 }, // C5
  { freq: 0, beats: 1.5 },
];

const BEAT_SECONDS = 0.42;

export interface UseAudioEngineOptions {
  isPlaying: boolean;
  customAudioUrl: string | null;
}

export interface UseAudioEngineResult {
  audioMetricsRef: MutableRefObject<AudioMetrics>;
  autoplayBlocked: boolean;
  unlockAudio: () => void;
}

export function useAudioEngine({
  isPlaying,
  customAudioUrl,
}: UseAudioEngineOptions): UseAudioEngineResult {
  const audioMetricsRef = useRef<AudioMetrics>({
    averageFrequency: 0,
    bassEnergy: 0,
    level: 0,
  });

  const [autoplayBlocked, setAutoplayBlocked] = useState(false);

  const ctxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const mediaSourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const noteTimerRef = useRef<number | null>(null);
  const noteIndexRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const isPlayingRef = useRef(isPlaying);
  const customUrlRef = useRef(customAudioUrl);

  isPlayingRef.current = isPlaying;
  customUrlRef.current = customAudioUrl;

  const ensureContext = () => {
    if (!ctxRef.current) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.82;

      const master = ctx.createGain();
      master.gain.value = 0.72;
      master.connect(analyser);
      analyser.connect(ctx.destination);

      ctxRef.current = ctx;
      analyserRef.current = analyser;
      masterGainRef.current = master;
    }
    return ctxRef.current;
  };

  const playMusicBoxTone = (freq: number, durationSec: number, gainPeak: number) => {
    const ctx = ctxRef.current;
    const master = masterGainRef.current;
    if (!ctx || !master || freq <= 0) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const overtone = ctx.createOscillator();
    const env = ctx.createGain();
    const overtoneGain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);

    // Subtle bell/celesta harmonic overtone
    overtone.type = 'triangle';
    overtone.frequency.setValueAtTime(freq * 2, now);
    overtoneGain.gain.setValueAtTime(0.18, now);

    env.gain.setValueAtTime(0.0001, now);
    env.gain.exponentialRampToValueAtTime(gainPeak, now + 0.018);
    env.gain.exponentialRampToValueAtTime(gainPeak * 0.25, now + durationSec * 0.65);
    env.gain.exponentialRampToValueAtTime(0.0001, now + durationSec + 0.55);

    osc.connect(env);
    overtone.connect(overtoneGain);
    overtoneGain.connect(env);
    env.connect(master);

    osc.start(now);
    overtone.start(now);
    osc.stop(now + durationSec + 0.6);
    overtone.stop(now + durationSec + 0.6);
  };

  const stopMusicBoxLoop = () => {
    if (noteTimerRef.current !== null) {
      window.clearTimeout(noteTimerRef.current);
      noteTimerRef.current = null;
    }
  };

  const scheduleNextNote = () => {
    stopMusicBoxLoop();
    if (!isPlayingRef.current || customUrlRef.current) return;
    const ctx = ctxRef.current;
    if (!ctx || ctx.state !== 'running') return;

    const ev = MUSIC_BOX_MELODY[noteIndexRef.current % MUSIC_BOX_MELODY.length];
    noteIndexRef.current = (noteIndexRef.current + 1) % MUSIC_BOX_MELODY.length;

    const durationSec = ev.beats * BEAT_SECONDS;
    if (ev.freq > 0) {
      playMusicBoxTone(ev.freq, durationSec, 0.2);
    }
    if (ev.bass && ev.bass > 0) {
      playMusicBoxTone(ev.bass, durationSec * 1.4, 0.11);
    }

    noteTimerRef.current = window.setTimeout(scheduleNextNote, durationSec * 1000);
  };

  const unlockAudio = () => {
    const ctx = ensureContext();
    if (ctx.state === 'suspended') {
      ctx
        .resume()
        .then(() => {
          setAutoplayBlocked(false);
          if (isPlayingRef.current) {
            if (customUrlRef.current && audioElRef.current) {
              audioElRef.current.play().catch(() => {});
            } else {
              scheduleNextNote();
            }
          }
        })
        .catch(() => {});
    } else {
      setAutoplayBlocked(false);
      if (isPlayingRef.current) {
        if (customUrlRef.current && audioElRef.current && audioElRef.current.paused) {
          audioElRef.current.play().catch(() => {});
        } else if (!customUrlRef.current && noteTimerRef.current === null) {
          scheduleNextNote();
        }
      }
    }
  };

  // Unlock on first user interaction if browser prevented autoplay
  useEffect(() => {
    const handleGesture = () => {
      if (!isPlayingRef.current) return;
      unlockAudio();
    };
    window.addEventListener('pointerdown', handleGesture);
    window.addEventListener('keydown', handleGesture);
    return () => {
      window.removeEventListener('pointerdown', handleGesture);
      window.removeEventListener('keydown', handleGesture);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Manage playback state and source switching
  useEffect(() => {
    if (!audioElRef.current) {
      const el = new Audio();
      el.crossOrigin = 'anonymous';
      el.loop = true;
      audioElRef.current = el;
    }

    const audioEl = audioElRef.current;

    if (!isPlaying) {
      stopMusicBoxLoop();
      audioEl.pause();
      audioMetricsRef.current.averageFrequency = 0;
      audioMetricsRef.current.bassEnergy = 0;
      audioMetricsRef.current.level = 0;
      return;
    }

    const ctx = ensureContext();

    if (customAudioUrl) {
      stopMusicBoxLoop();
      if (!mediaSourceRef.current && masterGainRef.current) {
        mediaSourceRef.current = ctx.createMediaElementSource(audioEl);
        mediaSourceRef.current.connect(masterGainRef.current);
      }
      if (audioEl.src !== customAudioUrl) {
        audioEl.src = customAudioUrl;
      }
      ctx.resume().catch(() => {});
      audioEl
        .play()
        .then(() => setAutoplayBlocked(false))
        .catch(() => setAutoplayBlocked(true));
    } else {
      audioEl.pause();
      ctx
        .resume()
        .then(() => {
          if (ctx.state === 'running') {
            setAutoplayBlocked(false);
            scheduleNextNote();
          } else {
            setAutoplayBlocked(true);
          }
        })
        .catch(() => setAutoplayBlocked(true));
    }

    return () => {
      stopMusicBoxLoop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, customAudioUrl]);

  // Continuous spectrum analysis loop written directly to ref (zero React re-renders)
  useEffect(() => {
    const bins = new Uint8Array(128);

    const tick = () => {
      const analyser = analyserRef.current;
      if (analyser && isPlayingRef.current) {
        analyser.getByteFrequencyData(bins);
        let sum = 0;
        let bassSum = 0;
        const bassCount = 24;
        for (let i = 0; i < bins.length; i++) {
          sum += bins[i];
          if (i < bassCount) bassSum += bins[i];
        }
        const avg = sum / bins.length;
        // Amplify subtle music-box signal gracefully while keeping loud MP3 balanced
        const boost = customUrlRef.current ? 1.15 : 2.1;
        audioMetricsRef.current.averageFrequency = Math.min(255, avg * boost);
        audioMetricsRef.current.bassEnergy = Math.min(1, (bassSum / bassCount / 255) * boost);
        audioMetricsRef.current.level = Math.min(1, (avg / 255) * boost);
      } else {
        audioMetricsRef.current.averageFrequency *= 0.9;
        audioMetricsRef.current.bassEnergy *= 0.9;
        audioMetricsRef.current.level *= 0.9;
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopMusicBoxLoop();
      if (audioElRef.current) {
        audioElRef.current.pause();
        audioElRef.current.src = '';
      }
      if (ctxRef.current) {
        ctxRef.current.close().catch(() => {});
      }
    };
  }, []);

  return { audioMetricsRef, autoplayBlocked, unlockAudio };
}
