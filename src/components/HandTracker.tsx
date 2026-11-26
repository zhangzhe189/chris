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

interface HandTrackerProps {
  onHandUpdate: (data: HandData) => void;
  accentColor: string;
}

export function HandTracker({ onHandUpdate, accentColor }: HandTrackerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const onHandUpdateRef = useRef(onHandUpdate);
  const isPinchedRef = useRef(false);

  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errorText, setErrorText] = useState('摄像头不可用');
  const [previewExpanded, setPreviewExpanded] = useState(true);

  onHandUpdateRef.current = onHandUpdate;

  useEffect(() => {
    let cancelled = false;
    let stream: MediaStream | null = null;
    let hands: MediaPipeHandsInstance | null = null;
    let timerId: number | null = null;

    const handleResults = (results: HandsResults) => {
      if (cancelled) return;
      const canvas = canvasRef.current;
      const video = videoRef.current;
      const landmarks = results.multiHandLandmarks?.[0];

      if (canvas && video && video.videoWidth > 0) {
        if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
        }
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          if (landmarks) {
            // Draw mirrored skeleton to match mirrored camera video
            ctx.save();
            ctx.translate(canvas.width, 0);
            ctx.scale(-1, 1);

            ctx.strokeStyle = 'rgba(255, 217, 138, 0.85)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            for (const [a, b] of HAND_CONNECTIONS) {
              const p1 = landmarks[a];
              const p2 = landmarks[b];
              ctx.moveTo(p1.x * canvas.width, p1.y * canvas.height);
              ctx.lineTo(p2.x * canvas.width, p2.y * canvas.height);
            }
            ctx.stroke();

            for (let i = 0; i < landmarks.length; i++) {
              const pt = landmarks[i];
              ctx.fillStyle = FINGERTIP_INDICES.includes(i) ? '#ff5964' : '#ffffff';
              ctx.beginPath();
              ctx.arc(pt.x * canvas.width, pt.y * canvas.height, 3, 0, Math.PI * 2);
              ctx.fill();
            }
            ctx.restore();
          }
        }
      }

      if (!landmarks) {
        isPinchedRef.current = false;
        onHandUpdateRef.current({
          x: 0.5,
          y: 0.5,
          gesture: 'IDLE',
          isPresent: false,
          source: 'camera',
        });
        return;
      }

      const wrist = landmarks[0];
      const middleMcp = landmarks[9];
      const thumbTip = landmarks[4];
      const indexTip = landmarks[8];

      // Distance-invariant normalization using palm length
      const palmSize = Math.max(
        0.05,
        Math.hypot(middleMcp.x - wrist.x, middleMcp.y - wrist.y)
      );

      let tipDistSum = 0;
      for (const idx of FINGERTIP_INDICES) {
        tipDistSum += Math.hypot(landmarks[idx].x - wrist.x, landmarks[idx].y - wrist.y);
      }
      const spreadRatio = tipDistSum / 5 / palmSize;
      const pinchRatio = Math.hypot(thumbTip.x - indexTip.x, thumbTip.y - indexTip.y) / palmSize;

      // Hysteresis thresholds to prevent jitter
      let pinched = isPinchedRef.current;
      if (pinched) {
        if (pinchRatio > 0.62) pinched = false;
      } else if (pinchRatio < 0.42) {
        pinched = true;
      }
      isPinchedRef.current = pinched;

      let gesture: GestureType = 'HOVER';
      if (pinched) {
        gesture = 'PINCH';
      } else if (spreadRatio > 1.52) {
        gesture = 'OPEN';
      } else {
        gesture = 'HOVER';
      }

      onHandUpdateRef.current({
        x: 1 - indexTip.x,
        y: indexTip.y,
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
          video: { width: { ideal: 320 }, height: { ideal: 240 }, facingMode: 'user' },
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
          modelComplexity: 1,
          minDetectionConfidence: 0.55,
          minTrackingConfidence: 0.55,
        });
        hands.onResults(handleResults);

        setStatus('ready');

        let sending = false;
        let lastVideoTime = -1;
        timerId = window.setInterval(async () => {
          if (cancelled || sending || !hands || !videoRef.current) return;
          const v = videoRef.current;
          if (v.paused || v.readyState < 2 || v.currentTime === lastVideoTime) return;
          lastVideoTime = v.currentTime;
          sending = true;
          try {
            await hands.send({ image: v });
          } catch {
            // Skip occasional transient frame errors
          } finally {
            sending = false;
          }
        }, 100);
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
      if (timerId !== null) window.clearInterval(timerId);
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
    <div className="fixed bottom-4 right-4 z-40 flex flex-col items-end gap-2">
      <div
        className={`relative overflow-hidden rounded-xl border transition-all duration-300 origin-bottom-right shadow-2xl ${
          previewExpanded ? 'w-48 h-36 opacity-100' : 'w-0 h-0 opacity-0 pointer-events-none'
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
          className="absolute inset-0 w-full h-full object-cover opacity-65 -scale-x-100"
        />
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-cover" />
        {status === 'ready' && (
          <div
            className="absolute bottom-1 right-2 text-[9px] font-mono tracking-wider"
            style={{ color: accentColor }}
          >
            手势识别中
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
