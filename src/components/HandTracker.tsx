import { useEffect, useRef, useState } from 'react';
import { Camera, ChevronDown, ChevronUp } from 'lucide-react';
import type { GestureType, HandData } from '../types';

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

// [mcp, pip, tip] indices for Index, Middle, Ring, Pinky
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
  accentColor: string;
}

const GESTURE_LABEL: Record<GestureType, string> = {
  IDLE: '请将手放入画面',
  HOVER: '握拳 · 聚拢',
  OPEN: '张掌 · 绽放',
  PINCH: '捏合 · 切图',
};

export function HandTracker({ onHandUpdate, accentColor }: HandTrackerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const onHandUpdateRef = useRef(onHandUpdate);

  // Hysteresis & smoothing refs
  const isPinchedRef = useRef(false);
  const isOpenRef = useRef(false);
  const missedFramesRef = useRef(0);
  const smoothPosRef = useRef({ x: 0.5, y: 0.5 });

  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errorText, setErrorText] = useState('摄像头不可用');
  const [previewExpanded, setPreviewExpanded] = useState(true);
  const [detectedGesture, setDetectedGesture] = useState<GestureType>('IDLE');

  onHandUpdateRef.current = onHandUpdate;

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

      if (!landmarks) {
        missedFramesRef.current += 1;
        // Clear skeleton immediately when hand leaves frame
        if (canvas) {
          const ctx = canvas.getContext('2d');
          ctx?.clearRect(0, 0, canvas.width, canvas.height);
        }
        // Hold previous gesture briefly (3 frames ~100ms) to avoid jitter on rapid movement
        if (missedFramesRef.current < 4) return;

        isPinchedRef.current = false;
        isOpenRef.current = false;
        setDetectedGesture((prev) => (prev === 'IDLE' ? prev : 'IDLE'));
        onHandUpdateRef.current({
          x: smoothPosRef.current.x,
          y: smoothPosRef.current.y,
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

      // Robust palm reference (combines length & width so tilted hands stay accurate)
      const palmLen = distAspect(wrist, middleMcp, aspect);
      const palmWidth = distAspect(indexMcp, pinkyMcp, aspect);
      const palmScale = Math.max(0.04, palmLen, palmWidth * 1.15);

      // Count extended non-thumb fingers by comparing tip vs PIP distance from wrist
      let extendedFourCount = 0;
      let otherExtendedCount = 0; // middle, ring, pinky
      for (let f = 0; f < FOUR_FINGERS.length; f++) {
        const [mcpIdx, pipIdx, tipIdx] = FOUR_FINGERS[f];
        const tipToWrist = distAspect(landmarks[tipIdx], wrist, aspect);
        const pipToWrist = distAspect(landmarks[pipIdx], wrist, aspect);
        const tipToMcp = distAspect(landmarks[tipIdx], landmarks[mcpIdx], aspect);

        const isExtended = tipToWrist > pipToWrist * 1.09 && tipToMcp > palmScale * 0.44;
        if (isExtended) {
          extendedFourCount += 1;
          if (f > 0) otherExtendedCount += 1;
        }
      }

      // Distinguish true fist from thumb+index pinch
      const indexTipToWrist = distAspect(indexTip, wrist, aspect);
      const indexPipToWrist = distAspect(indexPip, wrist, aspect);
      const isFist =
        extendedFourCount === 0 &&
        otherExtendedCount === 0 &&
        indexTipToWrist < indexPipToWrist * 1.12;

      const pinchRatio = distAspect(thumbTip, indexTip, aspect) / palmScale;

      // Forgiving hysteresis for pinch (never triggers on closed fist)
      let pinched = isPinchedRef.current;
      if (isFist) {
        pinched = false;
      } else if (pinched) {
        if (pinchRatio > 0.72) pinched = false;
      } else if (pinchRatio < 0.54) {
        pinched = true;
      }
      isPinchedRef.current = pinched;

      // Forgiving hysteresis for open palm
      let openPalm = isOpenRef.current;
      if (pinched) {
        openPalm = false;
      } else if (openPalm) {
        if (extendedFourCount <= 1) openPalm = false;
      } else if (extendedFourCount >= 3) {
        openPalm = true;
      }
      isOpenRef.current = openPalm;

      const gesture: GestureType = pinched ? 'PINCH' : openPalm ? 'OPEN' : 'HOVER';

      // Draw mirrored skeleton overlay with live gesture highlight
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
              ? 'rgba(255, 107, 120, 0.92)'
              : gesture === 'OPEN'
                ? 'rgba(255, 224, 140, 0.95)'
                : 'rgba(130, 230, 185, 0.85)';
          ctx.lineWidth = 2.4;
          ctx.beginPath();
          for (const [a, b] of HAND_CONNECTIONS) {
            const p1 = landmarks[a];
            const p2 = landmarks[b];
            ctx.moveTo(p1.x * canvas.width, p1.y * canvas.height);
            ctx.lineTo(p2.x * canvas.width, p2.y * canvas.height);
          }
          ctx.stroke();

          // Visual pinch bridge between thumb & index tips when pinching
          if (gesture === 'PINCH') {
            ctx.strokeStyle = '#ff4d6d';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(thumbTip.x * canvas.width, thumbTip.y * canvas.height);
            ctx.lineTo(indexTip.x * canvas.width, indexTip.y * canvas.height);
            ctx.stroke();
          }

          for (let i = 0; i < landmarks.length; i++) {
            const pt = landmarks[i];
            const isTip = FINGERTIP_INDICES.includes(i);
            ctx.fillStyle = isTip
              ? gesture === 'PINCH' && (i === 4 || i === 8)
                ? '#ff4d6d'
                : '#ffd98a'
              : '#ffffff';
            ctx.beginPath();
            ctx.arc(pt.x * canvas.width, pt.y * canvas.height, isTip ? 4.2 : 2.6, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
        }
      }

      // Smooth pointer coordinates (EMA) to eliminate reticle jitter
      const rawX = 1 - (indexTip.x + thumbTip.x) * 0.5;
      const rawY = (indexTip.y + thumbTip.y) * 0.5;
      const alpha = 0.45;
      smoothPosRef.current.x += (rawX - smoothPosRef.current.x) * alpha;
      smoothPosRef.current.y += (rawY - smoothPosRef.current.y) * alpha;

      setDetectedGesture((prev) => (prev === gesture ? prev : gesture));

      onHandUpdateRef.current({
        x: smoothPosRef.current.x,
        y: smoothPosRef.current.y,
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
        // modelComplexity: 0 uses the lightweight high-FPS model (~20-30 FPS in browser WASM)
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
          // Target ~25-30 FPS inference without starving WebGL frames
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
          borderColor: `${accentColor}55`,
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
              background: 'rgba(8, 12, 26, 0.72)',
              color:
                detectedGesture === 'PINCH'
                  ? '#ff7a8a'
                  : detectedGesture === 'OPEN'
                    ? accentColor
                    : detectedGesture === 'HOVER'
                      ? '#7ee8b4'
                      : 'rgba(255,255,255,0.65)',
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
          background: previewExpanded ? 'rgba(18, 24, 48, 0.85)' : 'rgba(10, 14, 30, 0.7)',
          borderColor: previewExpanded ? `${accentColor}99` : `${accentColor}40`,
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
