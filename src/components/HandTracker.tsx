import { useEffect, useRef, useState } from 'react';
import { Camera, ChevronDown, ChevronUp } from 'lucide-react';
import type { GestureType, HandData, SceneState } from '../types';

interface Landmark {
  x: number;
  y: number;
  z: number;
}

interface HandsResults {
  multiHandLandmarks?: Landmark[][];
}

interface MediaPipeHandsInstance {
  setOptions(options: {
    maxNumHands: number;
    modelComplexity: number;
    minDetectionConfidence: number;
    minTrackingConfidence: number;
  }): void;
  onResults(cb: (results: HandsResults) => void): void;
  send(input: { image: HTMLVideoElement }): Promise<void>;
  close(): Promise<void> | void;
}

type HandsCtor = new (config: { locateFile: (file: string) => string }) => MediaPipeHandsInstance;

declare global {
  interface Window {
    Hands?: HandsCtor;
  }
}

const HAND_CONNECTIONS: Array<[number, number]> = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [17, 18], [18, 19], [19, 20],
  [0, 17],
];

const FINGERTIP_INDICES = [4, 8, 12, 16, 20];

// [mcp, pip, tip] for Index, Middle, Ring, Pinky
const FOUR_FINGERS: Array<[number, number, number]> = [
  [5, 6, 8],
  [9, 10, 12],
  [13, 14, 16],
  [17, 18, 20],
];

function loadScriptOnce(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`) as HTMLScriptElement | null;
    if (existing) {
      if (window.Hands) {
        resolve();
        return;
      }
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error(`Failed to load ${src}`)), {
        once: true,
      });
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.body.appendChild(script);
  });
}

function distAspect(a: Landmark, b: Landmark, aspect: number): number {
  const dx = (a.x - b.x) * aspect;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy);
}

interface HandTrackerProps {
  onHandUpdate: (data: HandData) => void;
  onRequestSceneState: (state: SceneState) => void;
  onPointBurst: (nx: number, ny: number) => void;
  accentColor: string;
}

const GESTURE_LABEL: Record<GestureType, string> = {
  IDLE: '请将手放入画面',
  FIST: '握拳 · 聚拢成树',
  OPEN: '张掌 · 星光绽放',
  PINCH: '捏合 · 选中回忆',
  POINT: '单指 · 雪花光尾',
};

/**
 * 5-gesture AI hand tracker with aspect-corrected finger geometry, hold debounce,
 * state-lock cooldown, smoothed palm velocity for inertial galaxy exploration,
 * and single-finger snow-trail burst trigger.
 */
export function HandTracker({
  onHandUpdate,
  onRequestSceneState,
  onPointBurst,
  accentColor,
}: HandTrackerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const onHandUpdateRef = useRef(onHandUpdate);
  const onRequestSceneStateRef = useRef(onRequestSceneState);
  const onPointBurstRef = useRef(onPointBurst);
  const accentColorRef = useRef(accentColor);

  // Hysteresis, smoothing, debounce & state-lock refs
  const isPinchedRef = useRef(false);
  const isOpenRef = useRef(false);
  const missedFramesRef = useRef(0);
  const smoothPointerRef = useRef({ x: 0.5, y: 0.5 });
  const smoothPalmRef = useRef<{ x: number; y: number; initialized: boolean }>({
    x: 0.5,
    y: 0.5,
    initialized: false,
  });

  const pendingStateRef = useRef<{ target: SceneState | null; since: number }>({
    target: null,
    since: 0,
  });
  const stateLockUntilRef = useRef(0);
  const lastPointBurstAtRef = useRef(0);

  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errorText, setErrorText] = useState('摄像头不可用');
  const [previewExpanded, setPreviewExpanded] = useState(true);
  const [detectedGesture, setDetectedGesture] = useState<GestureType>('IDLE');

  onHandUpdateRef.current = onHandUpdate;
  onRequestSceneStateRef.current = onRequestSceneState;
  onPointBurstRef.current = onPointBurst;
  accentColorRef.current = accentColor;

  useEffect(() => {
    let cancelled = false;
    let stream: MediaStream | null = null;
    let hands: MediaPipeHandsInstance | null = null;
    let rafId: number | null = null;

    const handleResults = (results: HandsResults) => {
      if (cancelled) return;
      const canvas = canvasRef.current;
      const video = videoRef.current;
      const landmarks = results.multiHandLandmarks?.[0];

      const vw = video?.videoWidth || 640;
      const vh = video?.videoHeight || 480;
      const aspect = vw / Math.max(1, vh);
      const nowMs = performance.now();

      if (!landmarks) {
        missedFramesRef.current += 1;
        if (canvas) {
          const ctx = canvas.getContext('2d');
          ctx?.clearRect(0, 0, canvas.width, canvas.height);
        }
        // Hold briefly across rapid-motion single-frame drops
        if (missedFramesRef.current < 4) return;

        isPinchedRef.current = false;
        isOpenRef.current = false;
        smoothPalmRef.current.initialized = false;
        pendingStateRef.current.target = null;
        setDetectedGesture((prev) => (prev === 'IDLE' ? prev : 'IDLE'));
        onHandUpdateRef.current({
          x: smoothPointerRef.current.x,
          y: smoothPointerRef.current.y,
          vx: 0,
          vy: 0,
          gesture: 'IDLE',
          isPresent: false,
          source: 'camera',
        });
        return;
      }

      missedFramesRef.current = 0;

      const wrist = landmarks[0];
      const indexMcp = landmarks[5];
      const middleMcp = landmarks[9];
      const pinkyMcp = landmarks[17];
      const thumbTip = landmarks[4];
      const indexTip = landmarks[8];
      const indexPip = landmarks[6];

      const palmLen = distAspect(wrist, middleMcp, aspect);
      const palmWidth = distAspect(indexMcp, pinkyMcp, aspect);
      const palmScale = Math.max(0.04, palmLen, palmWidth * 1.15);

      let extendedFourCount = 0;
      let otherExtendedCount = 0; // middle, ring, pinky
      let indexExtended = false;

      for (let f = 0; f < FOUR_FINGERS.length; f++) {
        const [mcpIdx, pipIdx, tipIdx] = FOUR_FINGERS[f];
        const tipToWrist = distAspect(landmarks[tipIdx], wrist, aspect);
        const pipToWrist = distAspect(landmarks[pipIdx], wrist, aspect);
        const tipToMcp = distAspect(landmarks[tipIdx], landmarks[mcpIdx], aspect);

        const isExt = tipToWrist > pipToWrist * 1.09 && tipToMcp > palmScale * 0.44;
        if (isExt) {
          extendedFourCount += 1;
          if (f === 0) indexExtended = true;
          else otherExtendedCount += 1;
        }
      }

      const indexTipToWrist = distAspect(indexTip, wrist, aspect);
      const indexPipToWrist = distAspect(indexPip, wrist, aspect);
      const isFist =
        extendedFourCount === 0 &&
        otherExtendedCount === 0 &&
        indexTipToWrist < indexPipToWrist * 1.12;

      const pinchRatio = distAspect(thumbTip, indexTip, aspect) / palmScale;

      // 1. Pinch hysteresis (never triggers on closed fist)
      let pinched = isPinchedRef.current;
      if (isFist) {
        pinched = false;
      } else if (pinched) {
        if (pinchRatio > 0.72) pinched = false;
      } else if (pinchRatio < 0.54) {
        pinched = true;
      }
      isPinchedRef.current = pinched;

      // 2. Single-finger point (index extended, middle/ring/pinky curled, thumb away)
      const isPointing =
        !pinched && indexExtended && otherExtendedCount === 0 && pinchRatio > 0.64;

      // 3. Open palm hysteresis
      let openPalm = isOpenRef.current;
      if (pinched || isFist || isPointing) {
        openPalm = false;
      } else if (openPalm) {
        if (extendedFourCount <= 1) openPalm = false;
      } else if (extendedFourCount >= 3) {
        openPalm = true;
      }
      isOpenRef.current = openPalm;

      let gesture: GestureType = 'FIST';
      if (pinched) {
        gesture = 'PINCH';
        // Protect state transitions right after pinching so releasing pinch never flips Quiet/Bloom
        stateLockUntilRef.current = Math.max(stateLockUntilRef.current, nowMs + 680);
        pendingStateRef.current.target = null;
      } else if (isPointing) {
        gesture = 'POINT';
        pendingStateRef.current.target = null;
      } else if (openPalm) {
        gesture = 'OPEN';
      } else if (isFist || extendedFourCount <= 1) {
        gesture = 'FIST';
      } else {
        // Transitional neutral hand pose (2 fingers): do not trigger state flips
        gesture = 'OPEN';
      }

      // Hold-confirmation debounce (160ms) + cooldown state lock (750ms) for Quiet <-> Bloom
      const desiredState: SceneState | null =
        gesture === 'OPEN' && extendedFourCount >= 3
          ? 'BLOOM'
          : gesture === 'FIST' && isFist
            ? 'QUIET'
            : null;

      if (desiredState && nowMs > stateLockUntilRef.current) {
        if (pendingStateRef.current.target !== desiredState) {
          pendingStateRef.current = { target: desiredState, since: nowMs };
        } else if (nowMs - pendingStateRef.current.since >= 165) {
          onRequestSceneStateRef.current(desiredState);
          stateLockUntilRef.current = nowMs + 750;
          pendingStateRef.current.target = null;
        }
      } else if (!desiredState) {
        pendingStateRef.current.target = null;
      }

      // Smooth pointer coordinates (index tip for POINT, thumb-index midpoint otherwise)
      const rawPointerX = gesture === 'POINT' ? 1 - indexTip.x : 1 - (indexTip.x + thumbTip.x) * 0.5;
      const rawPointerY = gesture === 'POINT' ? indexTip.y : (indexTip.y + thumbTip.y) * 0.5;
      smoothPointerRef.current.x += (rawPointerX - smoothPointerRef.current.x) * 0.45;
      smoothPointerRef.current.y += (rawPointerY - smoothPointerRef.current.y) * 0.45;

      // Single-finger snow-trail burst with 450ms cooldown
      if (gesture === 'POINT' && nowMs - lastPointBurstAtRef.current > 450) {
        lastPointBurstAtRef.current = nowMs;
        onPointBurstRef.current(smoothPointerRef.current.x, smoothPointerRef.current.y);
      }

      // Compute damped palm velocity (vx, vy) with deadzone for inertial galaxy rotation
      const rawPalmX = 1 - (wrist.x + middleMcp.x) * 0.5;
      const rawPalmY = (wrist.y + middleMcp.y) * 0.5;
      let vx = 0;
      let vy = 0;

      if (!smoothPalmRef.current.initialized) {
        smoothPalmRef.current = { x: rawPalmX, y: rawPalmY, initialized: true };
      } else {
        const nextPalmX = smoothPalmRef.current.x + (rawPalmX - smoothPalmRef.current.x) * 0.38;
        const nextPalmY = smoothPalmRef.current.y + (rawPalmY - smoothPalmRef.current.y) * 0.38;
        const dx = nextPalmX - smoothPalmRef.current.x;
        const dy = nextPalmY - smoothPalmRef.current.y;
        smoothPalmRef.current.x = nextPalmX;
        smoothPalmRef.current.y = nextPalmY;

        // Deadzone avoids micro-drift while holding hand still
        vx = Math.abs(dx) > 0.0038 ? Math.max(-0.075, Math.min(0.075, dx)) : 0;
        vy = Math.abs(dy) > 0.0045 ? Math.max(-0.05, Math.min(0.05, dy)) : 0;
      }

      // Draw mirrored skeleton overlay with subtle per-gesture styling
      if (canvas && video && video.videoWidth > 0) {
        if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
        }
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.save();
          ctx.translate(canvas.width, 0);
          ctx.scale(-1, 1);

          ctx.strokeStyle =
            gesture === 'PINCH'
              ? 'rgba(229, 138, 153, 0.92)'
              : gesture === 'POINT'
                ? 'rgba(245, 232, 207, 0.95)'
                : gesture === 'OPEN'
                  ? 'rgba(216, 183, 123, 0.92)'
                  : 'rgba(137, 212, 178, 0.85)';
          ctx.lineWidth = 2.2;
          ctx.beginPath();
          for (const [a, b] of HAND_CONNECTIONS) {
            const p1 = landmarks[a];
            const p2 = landmarks[b];
            ctx.moveTo(p1.x * canvas.width, p1.y * canvas.height);
            ctx.lineTo(p2.x * canvas.width, p2.y * canvas.height);
          }
          ctx.stroke();

          if (gesture === 'PINCH') {
            ctx.strokeStyle = '#e58a99';
            ctx.lineWidth = 3.6;
            ctx.beginPath();
            ctx.moveTo(thumbTip.x * canvas.width, thumbTip.y * canvas.height);
            ctx.lineTo(indexTip.x * canvas.width, indexTip.y * canvas.height);
            ctx.stroke();
          }

          for (let i = 0; i < landmarks.length; i++) {
            const pt = landmarks[i];
            const isTip = FINGERTIP_INDICES.includes(i);
            const highlightTip =
              (gesture === 'POINT' && i === 8) ||
              (gesture === 'PINCH' && (i === 4 || i === 8));
            ctx.fillStyle = highlightTip ? '#f5e8cf' : isTip ? accentColorRef.current : '#ffffff';
            ctx.beginPath();
            ctx.arc(
              pt.x * canvas.width,
              pt.y * canvas.height,
              highlightTip ? 5.2 : isTip ? 3.8 : 2.4,
              0,
              Math.PI * 2
            );
            ctx.fill();
          }
          ctx.restore();
        }
      }

      setDetectedGesture((prev) => (prev === gesture ? prev : gesture));

      onHandUpdateRef.current({
        x: smoothPointerRef.current.x,
        y: smoothPointerRef.current.y,
        vx,
        vy,
        gesture,
        isPresent: true,
        source: 'camera',
      });
    };

    const start = async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error('浏览器不支持摄像头访问');
        }

        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            frameRate: { ideal: 30 },
            facingMode: 'user',
          },
          audio: false,
        });
        if (cancelled) return;

        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();
        if (cancelled) return;

        await loadScriptOnce('./mediapipe/hands/hands.js');
        if (cancelled) return;
        if (!window.Hands) {
          throw new Error('手势识别引擎加载失败');
        }

        hands = new window.Hands({
          locateFile: (file: string) => `./mediapipe/hands/${file}`,
        });
        hands.setOptions({
          maxNumHands: 1,
          modelComplexity: 0,
          minDetectionConfidence: 0.45,
          minTrackingConfidence: 0.45,
        });
        hands.onResults(handleResults);

        setStatus('ready');

        let sending = false;
        let lastVideoTime = -1;
        let lastSentAt = 0;

        const pump = (now: number) => {
          if (cancelled) return;
          rafId = window.requestAnimationFrame(pump);

          const v = videoRef.current;
          if (!v || !hands || sending || v.paused || v.readyState < 2) return;
          if (now - lastSentAt < 34 || v.currentTime === lastVideoTime) return;

          lastVideoTime = v.currentTime;
          lastSentAt = now;
          sending = true;
          hands
            .send({ image: v })
            .catch(() => {
              // Skip occasional transient frame errors
            })
            .finally(() => {
              sending = false;
            });
        };

        rafId = window.requestAnimationFrame(pump);
      } catch (err) {
        if (cancelled) return;
        const msg =
          err instanceof DOMException && err.name === 'NotAllowedError'
            ? '未授予摄像头权限'
            : err instanceof Error
              ? err.message
              : '摄像头初始化失败';
        setErrorText(msg);
        setStatus('error');
      }
    };

    start();

    return () => {
      cancelled = true;
      if (rafId !== null) window.cancelAnimationFrame(rafId);
      if (hands) {
        try {
          hands.close();
        } catch {
          // Ignore cleanup errors
        }
      }
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      onHandUpdateRef.current({
        x: 0.5,
        y: 0.5,
        vx: 0,
        vy: 0,
        gesture: 'IDLE',
        isPresent: false,
        source: 'camera',
      });
    };
  }, []);

  return (
    <div className="fixed bottom-24 sm:bottom-6 right-4 sm:right-6 z-40 flex flex-col items-end gap-2">
      <div
        className={`relative overflow-hidden rounded-xl border transition-all duration-300 origin-bottom-right shadow-2xl ${
          previewExpanded ? 'w-52 h-40 opacity-100' : 'w-0 h-0 opacity-0 pointer-events-none'
        }`}
        style={{
          background: 'rgba(8, 12, 26, 0.92)',
          borderColor: `${accentColor}48`,
        }}
      >
        {status !== 'ready' && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-1 px-3 text-center">
            <span className="text-xs font-medium" style={{ color: accentColor }}>
              {status === 'loading' ? '手势引擎加载中…' : errorText}
            </span>
            <span className="text-[9px] tracking-widest opacity-50 text-white">
              {status === 'loading' ? 'LOADING MEDIAPIPE' : 'CAMERA UNAVAILABLE'}
            </span>
          </div>
        )}
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className="absolute inset-0 w-full h-full object-cover opacity-70 -scale-x-100"
        />
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-cover" />
        {status === 'ready' && (
          <div
            className="absolute bottom-1.5 left-1.5 right-1.5 flex items-center justify-between px-2 py-0.5 rounded-md text-[10px] font-medium backdrop-blur-md"
            style={{
              background: 'rgba(8, 12, 26, 0.76)',
              color:
                detectedGesture === 'PINCH'
                  ? '#e58a99'
                  : detectedGesture === 'POINT'
                    ? '#F5E8CF'
                    : detectedGesture === 'OPEN'
                      ? accentColor
                      : detectedGesture === 'FIST'
                        ? '#89d4b2'
                        : 'rgba(255,255,255,0.6)',
            }}
          >
            <span>{GESTURE_LABEL[detectedGesture]}</span>
            <span className="text-[8px] opacity-60 font-mono">AI</span>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={() => setPreviewExpanded((prev) => !prev)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-full border backdrop-blur-md transition-all cursor-pointer text-[11px] font-medium"
        style={{
          background: previewExpanded ? 'rgba(14, 20, 38, 0.85)' : 'rgba(8, 13, 27, 0.72)',
          borderColor: previewExpanded ? `${accentColor}88` : `${accentColor}38`,
          color: accentColor,
        }}
      >
        <span
          className={`w-2 h-2 rounded-full ${
            status === 'error'
              ? 'bg-red-500'
              : status === 'loading'
                ? 'bg-amber-400 animate-pulse'
                : 'bg-emerald-400 animate-pulse'
          }`}
        />
        <Camera size={13} />
        <span>
          {status === 'loading'
            ? '引擎加载中…'
            : status === 'error'
              ? '手势不可用'
              : previewExpanded
                ? '收起画面'
                : '手势画面'}
        </span>
        {previewExpanded ? <ChevronDown size={13} /> : <ChevronUp size={13} />}
      </button>
    </div>
  );
}
