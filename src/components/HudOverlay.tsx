import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent, CSSProperties, RefObject } from 'react';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Hand,
  Image as ImageIcon,
  Plus,
  RotateCcw,
  Trash2,
  Upload,
  Volume2,
  X,
} from 'lucide-react';
import { APPEARANCE_LIST } from '../config/appearances';
import type {
  AppearanceConfig,
  AppearanceId,
  GalleryPhoto,
  GestureType,
  SceneConfig,
  SceneState,
} from '../types';

interface CountdownState {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function useChristmasCountdown(): CountdownState {
  const compute = (): CountdownState => {
    const now = new Date();
    const year = now.getFullYear();
    let target = new Date(year, 11, 25, 0, 0, 0);
    if (now.getTime() >= target.getTime()) {
      target = new Date(year + 1, 11, 25, 0, 0, 0);
    }
    const diff = Math.max(0, target.getTime() - now.getTime());
    return {
      days: Math.floor(diff / 86_400_000),
      hours: Math.floor((diff % 86_400_000) / 3_600_000),
      minutes: Math.floor((diff % 3_600_000) / 60_000),
      seconds: Math.floor((diff % 60_000) / 1_000),
    };
  };

  const [countdown, setCountdown] = useState<CountdownState>(compute);
  useEffect(() => {
    const id = window.setInterval(() => setCountdown(compute()), 1000);
    return () => window.clearInterval(id);
  }, []);
  return countdown;
}

/**
 * Refined bespoke miniature SVG art for each Appearance horizontal card.
 * Each world carries distinct atmospheric geometry, lighting, and ornament cues.
 */
function AppearanceThumbnailArt({ item }: { item: AppearanceConfig }) {
  const [c0, c1, c2, c3, c4] = item.swatches;

  return (
    <svg
      viewBox="0 0 116 96"
      className="w-full h-full block transition-transform duration-300 ease-out group-hover:scale-[1.05]"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <defs>
        <radialGradient id={`ed-bg-${item.id}`} cx="50%" cy="56%" r="72%">
          <stop offset="0%" stopColor={c1} stopOpacity="0.98" />
          <stop offset="100%" stopColor={c0} stopOpacity="1" />
        </radialGradient>
        <radialGradient id={`ed-aura-${item.id}`} cx="50%" cy="56%" r="44%">
          <stop offset="0%" stopColor={c2} stopOpacity="0.46" />
          <stop offset="55%" stopColor={c2} stopOpacity="0.12" />
          <stop offset="100%" stopColor={c2} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`ed-tree-${item.id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={c3} stopOpacity="0.48" />
          <stop offset="55%" stopColor={c2} stopOpacity="0.22" />
          <stop offset="100%" stopColor={c2} stopOpacity="0.06" />
        </linearGradient>
      </defs>

      <rect width="116" height="96" fill={`url(#ed-bg-${item.id})`} />
      <rect width="116" height="96" fill={`url(#ed-aura-${item.id})`} />

      {/* Fine distant stardust */}
      <g fill={c3} opacity="0.58">
        <circle cx="16" cy="18" r="0.85" />
        <circle cx="32" cy="12" r="0.6" />
        <circle cx="94" cy="16" r="1" />
        <circle cx="102" cy="36" r="0.7" />
        <circle cx="18" cy="62" r="0.75" />
        <circle cx="98" cy="68" r="0.8" />
        <circle cx="24" cy="36" r="0.55" />
      </g>

      {/* Midnight Glow: celestial sky band, slender spiral & ground halo */}
      {item.id === 'midnight-glow' && (
        <g>
          <ellipse cx="58" cy="79" rx="34" ry="5.5" fill="none" stroke={c2} strokeOpacity="0.55" strokeWidth="0.85" />
          <ellipse cx="58" cy="79" rx="22" ry="3.2" fill={c2} fillOpacity="0.18" />
          <path d="M58 18 L79 75 L37 75 Z" fill={`url(#ed-tree-${item.id})`} />
          <path
            d="M49 36 Q59 41 67 35 M44 51 Q58 58 72 50 M39 66 Q58 73 77 64"
            fill="none"
            stroke={c3}
            strokeOpacity="0.82"
            strokeWidth="0.9"
          />
          {/* Restrained velvet crimson gifts */}
          <rect x="48" y="62" width="4.2" height="4" fill={c4} />
          <rect x="65" y="56" width="3.8" height="3.6" fill={c4} />
          <circle cx="58" cy="16" r="2.2" fill={c3} />
          <circle cx="58" cy="16" r="5" fill={c2} fillOpacity="0.22" />
        </g>
      )}

      {/* Vintage Noel: emerald velvet warmth, candle halo, burgundy ribbons & antique gold */}
      {item.id === 'vintage-noel' && (
        <g>
          {/* Warm candlelight radial wash */}
          <ellipse cx="58" cy="54" rx="28" ry="26" fill={c2} fillOpacity="0.16" />
          <ellipse cx="58" cy="79" rx="32" ry="5" fill={c2} fillOpacity="0.24" />
          <path d="M58 18 L80 75 L36 75 Z" fill={`url(#ed-tree-${item.id})`} />
          {/* Burgundy heritage garland ribbons */}
          <path
            d="M48 37 Q58 43 68 37 M43 52 Q58 59 73 52 M38 67 Q58 74 78 67"
            fill="none"
            stroke={c4}
            strokeOpacity="0.88"
            strokeWidth="1.5"
          />
          <path
            d="M49 35 Q58 40 67 35 M44 50 Q58 56 72 50 M40 64 Q58 70 76 64"
            fill="none"
            stroke={c2}
            strokeOpacity="0.72"
            strokeWidth="0.65"
          />
          {/* Antique gold baubles */}
          <circle cx="51" cy="46" r="1.8" fill={c2} />
          <circle cx="66" cy="60" r="1.9" fill={c2} />
          <circle cx="56" cy="66" r="1.6" fill={c3} />
          <circle cx="58" cy="16" r="2.3" fill={c3} />
        </g>
      )}

      {/* Memory Galaxy: tilted cosmic orbital rings, crystal starlets & floating Polaroids */}
      {item.id === 'memory-galaxy' && (
        <g>
          <g fill="none">
            <ellipse
              cx="58"
              cy="52"
              rx="42"
              ry="12"
              transform="rotate(-15 58 52)"
              stroke={c2}
              strokeOpacity="0.55"
              strokeWidth="0.85"
            />
            <ellipse
              cx="58"
              cy="54"
              rx="48"
              ry="15"
              transform="rotate(12 58 54)"
              stroke={c3}
              strokeOpacity="0.48"
              strokeWidth="0.7"
            />
          </g>
          <path d="M58 20 L76 74 L40 74 Z" fill={`url(#ed-tree-${item.id})`} />
          <path
            d="M50 38 Q58 42 66 37 M45 53 Q58 59 71 52 M41 67 Q58 72 75 66"
            fill="none"
            stroke={c3}
            strokeOpacity="0.76"
            strokeWidth="0.8"
          />
          {/* Floating miniature Polaroid memories */}
          <rect
            x="21"
            y="34"
            width="9.5"
            height="11.5"
            rx="0.8"
            transform="rotate(-11 25 39)"
            fill={c4}
            fillOpacity="0.84"
          />
          <rect
            x="85"
            y="29"
            width="9.5"
            height="11.5"
            rx="0.8"
            transform="rotate(9 89 34)"
            fill={c4}
            fillOpacity="0.8"
          />
          {/* Crystal diamond starlets */}
          <polygon points="58,13 60.2,16.5 58,20 55.8,16.5" fill={c4} />
          <polygon points="36,61 37.6,63 36,65 34.4,63" fill={c2} />
          <polygon points="81,58 82.6,60 81,62 79.4,60" fill={c3} />
        </g>
      )}
    </svg>
  );
}

interface EditorialRangeProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  accent: string;
  thumbBg: string;
  onChange: (value: number) => void;
}

function EditorialRange({
  label,
  value,
  min,
  max,
  step,
  accent,
  thumbBg,
  onChange,
}: EditorialRangeProps) {
  const pct = Math.max(0, Math.min(100, ((value - min) / Math.max(1, max - min)) * 100));
  const rangeStyle = {
    '--range-accent': accent,
    '--range-pct': `${pct}%`,
    '--range-thumb-bg': thumbBg,
  } as CSSProperties;

  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between text-[11px]">
        <span className="text-white/70 tracking-wide">{label}</span>
        <span className="font-mono text-[10.5px] tabular-nums opacity-75">{value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="editorial-range"
        style={rangeStyle}
      />
    </div>
  );
}

interface EditorialSwatchProps {
  label: string;
  value: string;
  borderColor: string;
  onChange: (value: string) => void;
}

function EditorialSwatch({ label, value, borderColor, onChange }: EditorialSwatchProps) {
  return (
    <label className="group flex flex-col gap-1.5 cursor-pointer">
      <div
        className="relative h-7 w-full rounded-[2px] border overflow-hidden transition-colors duration-200"
        style={{ backgroundColor: value, borderColor }}
      >
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
          aria-label={label}
        />
        <span className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors duration-200 pointer-events-none" />
      </div>
      <div className="flex items-baseline justify-between gap-1">
        <span className="text-[10px] text-white/65 truncate">{label}</span>
        <span className="font-mono text-[8.5px] uppercase text-white/35 hidden sm:inline">
          {value}
        </span>
      </div>
    </label>
  );
}

type ActivePanel = 'none' | 'appearance' | 'album' | 'settings';

interface HudOverlayProps {
  sceneState: SceneState;
  onSceneStateChange: (state: SceneState) => void;
  appearance: AppearanceConfig;
  onSelectAppearance: (id: AppearanceId) => void;
  config: SceneConfig;
  onConfigPatch: (patch: Partial<SceneConfig>) => void;
  onToggleBloom: () => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  audioName: string;
  hasCustomAudio: boolean;
  onAudioUpload: (e: ChangeEvent<HTMLInputElement>) => void;
  onResetAudio: () => void;
  autoplayBlocked: boolean;
  onUnlockAudio: () => void;
  photos: GalleryPhoto[];
  focusedPhotoId: string | null;
  onSelectPhoto: (id: string | null) => void;
  onPhotoUpload: (e: ChangeEvent<HTMLInputElement>) => void;
  onRemovePhoto: (photo: GalleryPhoto) => void;
  onRestoreDefaultPhotos: () => void;
  hasRemovedDefaults: boolean;
  handTrackingEnabled: boolean;
  onToggleHandTracking: () => void;
  gesture: GestureType;
  isHandPresent: boolean;
  cursorRef: RefObject<HTMLDivElement | null>;
}

export function HudOverlay({
  sceneState,
  onSceneStateChange,
  appearance,
  onSelectAppearance,
  config,
  onConfigPatch,
  onToggleBloom,
  isPlaying,
  onTogglePlay,
  audioName,
  hasCustomAudio,
  onAudioUpload,
  onResetAudio,
  autoplayBlocked,
  onUnlockAudio,
  photos,
  focusedPhotoId,
  onSelectPhoto,
  onPhotoUpload,
  onRemovePhoto,
  onRestoreDefaultPhotos,
  hasRemovedDefaults,
  handTrackingEnabled,
  onToggleHandTracking,
  gesture,
  isHandPresent,
  cursorRef,
}: HudOverlayProps) {
  const [activePanel, setActivePanel] = useState<ActivePanel>('none');
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const audioInputRef = useRef<HTMLInputElement | null>(null);
  const countdown = useChristmasCountdown();

  const ui = appearance.ui;
  const accent = config.accentColor;

  // Allow Escape key to quietly dismiss open UI drawer as well
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && activePanel !== 'none') {
        setActivePanel('none');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activePanel]);

  const togglePanel = (panel: Exclude<ActivePanel, 'none'>) => {
    setActivePanel((prev) => (prev === panel ? 'none' : panel));
  };

  const focusedIndex = focusedPhotoId
    ? photos.findIndex((p) => p.id === focusedPhotoId)
    : -1;
  const focusedPhoto = focusedIndex >= 0 ? photos[focusedIndex] : null;

  const stepPhoto = (dir: -1 | 1) => {
    if (photos.length === 0) return;
    const baseIdx = focusedIndex >= 0 ? focusedIndex : 0;
    const nextIdx = (baseIdx + dir + photos.length) % photos.length;
    onSelectPhoto(photos[nextIdx].id);
  };

  const isBloomed = sceneState === 'BLOOM';
  const soundActive = isPlaying && !autoplayBlocked;

  const gestureStatusText =
    gesture === 'OPEN'
      ? 'OPEN · 星光绽放'
      : gesture === 'PINCH'
        ? 'PINCH · 选中回忆'
        : gesture === 'POINT'
          ? 'POINT · 雪花光尾'
          : gesture === 'FIST'
            ? 'FIST · 聚拢成树'
            : isHandPresent
              ? 'EXPLORE · 移动旋转星河'
              : 'READY · 等待手部进入画面';

  const navAccentVar = { '--editorial-accent': ui.accent } as CSSProperties;

  return (
    <div
      className="fixed inset-0 pointer-events-none z-20 flex flex-col justify-between px-4 sm:px-8 md:px-11"
      style={{
        paddingTop: 'max(1.1rem, env(safe-area-inset-top))',
        paddingBottom: 'max(0.95rem, env(safe-area-inset-bottom))',
      }}
    >
      {/* =====================================================================
          TOP BAR: Magazine Cover Masthead (Left) + Editorial Numbered Nav (Right)
         ===================================================================== */}
      <header className="flex justify-between items-start gap-3 sm:gap-6">
        {/* Top-Left: Editorial Magazine Cover Title Area */}
        <div className="flex flex-col items-start pointer-events-none select-none min-w-0">
          {/* Small English Eyebrow + Thin Decorative Hairline */}
          <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-2.5">
            <span
              className="font-cinzel text-[8px] sm:text-[10px] tracking-[0.26em] sm:tracking-[0.3em] uppercase whitespace-nowrap transition-colors duration-500"
              style={{ color: ui.accent }}
            >
              Christmas Wonderland
            </span>
            <span
              className="inline-block w-6 sm:w-14 h-px shrink-0 transition-colors duration-500"
              style={{
                background: `linear-gradient(to right, ${ui.accent}88, transparent)`,
              }}
            />
          </div>

          {/* Two-line High-Contrast Serif Masthead */}
          <h1 className="font-editorial italic font-normal tracking-[0.005em] leading-[0.89] drop-shadow-[0_4px_24px_rgba(0,0,0,0.65)]">
            <span
              className="block text-[26px] sm:text-[36px] md:text-[44px] transition-colors duration-700"
              style={{ color: ui.ivory }}
            >
              Merry
            </span>
            <span
              className="block text-[30px] sm:text-[42px] md:text-[52px] pl-1 sm:pl-2 transition-colors duration-700"
              style={{ color: ui.accent }}
            >
              Christmas
            </span>
          </h1>

          {/* Wide-tracked Borderless Countdown (live logic preserved) */}
          <div
            className="font-cinzel mt-2.5 sm:mt-3.5 flex items-center gap-1.5 sm:gap-2 text-[9px] sm:text-[10.5px] tracking-[0.24em] tabular-nums transition-colors duration-500"
            style={{ color: ui.textSecondary }}
          >
            <span>{countdown.days}D</span>
            <span className="opacity-35">/</span>
            <span>{String(countdown.hours).padStart(2, '0')}H</span>
            <span className="opacity-35">/</span>
            <span>{String(countdown.minutes).padStart(2, '0')}M</span>
            <span className="opacity-35">/</span>
            <span>{String(countdown.seconds).padStart(2, '0')}S</span>
          </div>

          {/* Short Golden Hairline + Two-line Poetic Italic Dedicatory Caption */}
          <div
            className="w-7 sm:w-9 h-px mt-2.5 sm:mt-3.5 mb-2 transition-colors duration-500"
            style={{ backgroundColor: `${ui.accent}66` }}
          />
          <p
            className="font-editorial italic text-[12px] sm:text-[13.5px] leading-[1.38] tracking-[0.06em] transition-colors duration-500"
            style={{ color: `${ui.ivory}8c` }}
          >
            <span className="block">A little magic,</span>
            <span className="block">just for you.</span>
          </p>
        </div>

        {/* Top-Right: Luxury Editorial Numbered Navigation */}
        <nav
          aria-label="顶部导航"
          className="pointer-events-auto shrink-0 flex flex-col items-end gap-2 sm:flex-row sm:items-center sm:gap-0 pt-0.5 sm:pt-1"
          style={navAccentVar}
        >
          {/* 01 / APPEARANCE */}
          <button
            type="button"
            onClick={() => togglePanel('appearance')}
            data-active={activePanel === 'appearance'}
            className="editorial-link font-cinzel inline-flex items-center gap-1.5 text-[9.5px] sm:text-[10.5px] tracking-[0.22em] uppercase transition-colors duration-250 cursor-pointer active:opacity-75"
            style={{
              color: activePanel === 'appearance' ? ui.ivory : ui.textSecondary,
            }}
          >
            <span className="opacity-55" style={{ color: ui.accent }}>
              01
            </span>
            <span className="opacity-35">/</span>
            <span className="hover:text-white transition-colors duration-200">Appearance</span>
          </button>

          <span
            className="hidden sm:inline-block w-px h-3 mx-4 md:mx-5"
            style={{ backgroundColor: ui.glassBorder }}
            aria-hidden="true"
          />

          {/* 02 / SOUND */}
          <button
            type="button"
            onClick={() => {
              if (autoplayBlocked && isPlaying) {
                onUnlockAudio();
              } else {
                onTogglePlay();
              }
            }}
            data-active={soundActive}
            className="editorial-link font-cinzel inline-flex items-center gap-1.5 text-[9.5px] sm:text-[10.5px] tracking-[0.22em] uppercase transition-colors duration-250 cursor-pointer active:opacity-75"
            style={{
              color: soundActive ? ui.ivory : ui.textSecondary,
            }}
            title={isPlaying ? '暂停圣诞音乐' : '播放圣诞音乐'}
          >
            <span className="opacity-55" style={{ color: ui.accent }}>
              02
            </span>
            <span className="opacity-35">/</span>
            <span className="hover:text-white transition-colors duration-200">Sound</span>
            {/* Ultra-delicate 3-bar audio micro-indicator when actively playing */}
            <span
              className="inline-flex items-end gap-[2px] h-[9px] ml-0.5 transition-opacity duration-300"
              style={{ opacity: soundActive ? 0.9 : 0.28 }}
              aria-hidden="true"
            >
              <span
                className={`w-[1px] h-full ${soundActive ? 'eq-bar-1' : ''}`}
                style={{
                  backgroundColor: ui.accent,
                  transform: soundActive ? undefined : 'scaleY(0.3)',
                }}
              />
              <span
                className={`w-[1px] h-full ${soundActive ? 'eq-bar-2' : ''}`}
                style={{
                  backgroundColor: ui.accent,
                  transform: soundActive ? undefined : 'scaleY(0.55)',
                }}
              />
              <span
                className={`w-[1px] h-full ${soundActive ? 'eq-bar-3' : ''}`}
                style={{
                  backgroundColor: ui.accent,
                  transform: soundActive ? undefined : 'scaleY(0.25)',
                }}
              />
            </span>
          </button>

          <span
            className="hidden sm:inline-block w-px h-3 mx-4 md:mx-5"
            style={{ backgroundColor: ui.glassBorder }}
            aria-hidden="true"
          />

          {/* 03 / SETTINGS */}
          <button
            type="button"
            onClick={() => togglePanel('settings')}
            data-active={activePanel === 'settings'}
            className="editorial-link font-cinzel inline-flex items-center gap-1.5 text-[9.5px] sm:text-[10.5px] tracking-[0.22em] uppercase transition-colors duration-250 cursor-pointer active:opacity-75"
            style={{
              color: activePanel === 'settings' ? ui.ivory : ui.textSecondary,
            }}
          >
            <span className="opacity-55" style={{ color: ui.accent }}>
              03
            </span>
            <span className="opacity-35">/</span>
            <span className="hover:text-white transition-colors duration-200">Settings</span>
          </button>
        </nav>
      </header>

      {/* =====================================================================
          MOBILE BACKDROP SCRIM (quietly closes sheet when tapping outside on small screens)
         ===================================================================== */}
      {activePanel !== 'none' && (
        <div
          className="fixed inset-0 z-30 bg-black/35 sm:hidden pointer-events-auto transition-opacity duration-250"
          onClick={() => setActivePanel('none')}
          aria-hidden="true"
        />
      )}

      {/* =====================================================================
          01 / APPEARANCE PANEL — Horizontal Editorial Theme Cards
         ===================================================================== */}
      {activePanel === 'appearance' && (
        <aside
          className="fixed z-40 pointer-events-auto backdrop-blur-2xl shadow-[0_28px_70px_rgba(0,0,0,0.62)] overflow-y-auto custom-scrollbar
            bottom-0 inset-x-0 max-h-[76dvh] rounded-t-xl border-t px-5 pt-5 pb-[max(1.4rem,env(safe-area-inset-bottom))] animate-editorial-sheet
            sm:bottom-auto sm:left-auto sm:top-16 sm:right-8 md:right-11 sm:w-[376px] sm:max-h-[76dvh] sm:rounded-[3px] sm:border sm:p-6 sm:animate-editorial-panel"
          style={{
            background: ui.glassBg,
            borderColor: ui.glassBorder,
          }}
        >
          {/* Panel Header */}
          <div
            className="flex justify-between items-start pb-4 mb-4 border-b"
            style={{ borderColor: ui.glassBorder }}
          >
            <div>
              <h2
                className="font-editorial italic text-[24px] leading-none font-normal tracking-wide"
                style={{ color: ui.ivory }}
              >
                Appearance
              </h2>
              <p
                className="text-[11px] tracking-[0.16em] mt-1.5"
                style={{ color: ui.textSecondary }}
              >
                选择你的圣诞幻境
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActivePanel('none')}
              className="p-1 text-white/45 hover:text-white transition-colors duration-200 cursor-pointer"
              aria-label="关闭外观面板"
            >
              <X size={15} strokeWidth={1.5} />
            </button>
          </div>

          {/* 3 Horizontal Editorial Appearance Cards */}
          <div className="space-y-3">
            {APPEARANCE_LIST.map((item, idx) => {
              const selected = appearance.id === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  disabled={!item.available}
                  onClick={() => item.available && onSelectAppearance(item.id)}
                  className="group w-full text-left flex items-stretch rounded-[3px] overflow-hidden border transition-all duration-300 cursor-pointer active:opacity-90"
                  style={{
                    borderColor: selected ? item.ui.accent : 'rgba(255, 255, 255, 0.12)',
                    background: selected
                      ? 'rgba(255, 255, 255, 0.05)'
                      : 'rgba(255, 255, 255, 0.015)',
                  }}
                >
                  {/* Left: Bespoke Miniature SVG Scene Thumbnail */}
                  <div
                    className="relative w-[108px] sm:w-[116px] shrink-0 overflow-hidden border-r"
                    style={{ borderColor: 'rgba(255,255,255,0.08)' }}
                  >
                    <AppearanceThumbnailArt item={item} />
                    <span
                      className="font-cinzel absolute top-1.5 left-2 text-[8.5px] tracking-[0.2em]"
                      style={{ color: `${item.ui.ivory}bb` }}
                    >
                      0{idx + 1}
                    </span>
                  </div>

                  {/* Right: Editorial Typography + Swatches */}
                  <div className="flex-1 min-w-0 px-3.5 py-2.5 flex flex-col justify-between gap-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div
                          className="font-cinzel text-[11px] tracking-[0.16em] uppercase truncate"
                          style={{ color: item.ui.accent }}
                        >
                          {item.englishName}
                        </div>
                        <div
                          className="text-[12.5px] font-normal mt-0.5 truncate"
                          style={{ color: item.ui.ivory }}
                        >
                          {item.name}
                        </div>
                      </div>

                      {/* Minimalist Active Indicator */}
                      {selected && (
                        <span
                          className="shrink-0 inline-flex items-center justify-center w-4 h-4 rounded-full border mt-0.5"
                          style={{
                            borderColor: item.ui.accent,
                            color: item.ui.accent,
                          }}
                          aria-label="当前已选"
                        >
                          <Check size={9} strokeWidth={2.2} />
                        </span>
                      )}
                    </div>

                    <p className="text-[10px] leading-[1.45] text-white/50 line-clamp-2">
                      {item.tagline}
                    </p>

                    <div className="flex items-center justify-between pt-0.5">
                      <div className="flex items-center gap-1.5">
                        {item.swatches.map((hex, sIdx) => (
                          <span
                            key={sIdx}
                            className="w-2 h-2 rounded-full border border-white/20"
                            style={{ backgroundColor: hex }}
                          />
                        ))}
                      </div>
                      {selected && (
                        <span
                          className="font-cinzel text-[8px] tracking-[0.22em] uppercase"
                          style={{ color: item.ui.accent }}
                        >
                          Selected
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>
      )}

      {/* =====================================================================
          03 / SETTINGS PANEL — Design Atelier Numbered Sections
         ===================================================================== */}
      {activePanel === 'settings' && (
        <aside
          className="fixed z-40 pointer-events-auto backdrop-blur-2xl shadow-[0_28px_70px_rgba(0,0,0,0.62)] overflow-y-auto custom-scrollbar
            bottom-0 inset-x-0 max-h-[78dvh] rounded-t-xl border-t px-5 pt-5 pb-[max(1.4rem,env(safe-area-inset-bottom))] animate-editorial-sheet
            sm:bottom-auto sm:left-auto sm:top-16 sm:right-8 md:right-11 sm:w-[356px] sm:max-h-[76dvh] sm:rounded-[3px] sm:border sm:p-6 sm:animate-editorial-panel"
          style={{
            background: ui.glassBg,
            borderColor: ui.glassBorder,
          }}
        >
          {/* Atelier Header */}
          <div
            className="flex justify-between items-start pb-4 mb-5 border-b"
            style={{ borderColor: ui.glassBorder }}
          >
            <div>
              <h2
                className="font-editorial italic text-[24px] leading-none font-normal tracking-wide"
                style={{ color: ui.ivory }}
              >
                Settings
              </h2>
              <p
                className="text-[11px] tracking-[0.16em] mt-1.5"
                style={{ color: ui.textSecondary }}
              >
                圣诞空间设计工作室
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActivePanel('none')}
              className="p-1 text-white/45 hover:text-white transition-colors duration-200 cursor-pointer"
              aria-label="关闭设置面板"
            >
              <X size={15} strokeWidth={1.5} />
            </button>
          </div>

          <div className="space-y-6">
            {/* 01 / SCENE — 场景设置（含空间状态与音乐完整控制） */}
            <section className="space-y-3.5">
              <div className="flex items-baseline justify-between">
                <span
                  className="font-cinzel text-[9.5px] tracking-[0.26em] uppercase"
                  style={{ color: ui.accent }}
                >
                  01 / Scene
                </span>
                <span className="text-[10.5px] tracking-[0.14em] text-white/45">场景设置</span>
              </div>

              {/* Quiet <-> Bloom Segmented Control */}
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    { id: 'QUIET', en: 'Quiet', zh: '静谧树形' },
                    { id: 'BLOOM', en: 'Bloom', zh: '星河绽放' },
                  ] as const
                ).map((item) => {
                  const active = sceneState === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onSceneStateChange(item.id)}
                      className="py-2 px-3 rounded-[2px] border text-left transition-all duration-250 cursor-pointer active:opacity-80"
                      style={{
                        borderColor: active ? ui.accent : 'rgba(255, 255, 255, 0.12)',
                        background: active ? `${ui.accent}14` : 'transparent',
                      }}
                    >
                      <div
                        className="font-cinzel text-[9.5px] tracking-[0.2em] uppercase"
                        style={{ color: active ? ui.accent : 'rgba(255,255,255,0.45)' }}
                      >
                        {item.en}
                      </div>
                      <div
                        className="text-[11px] mt-0.5"
                        style={{ color: active ? ui.ivory : 'rgba(255,255,255,0.58)' }}
                      >
                        {item.zh}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Sound & Custom Audio Controls */}
              <div
                className="pt-2.5 border-t space-y-2.5"
                style={{ borderColor: 'rgba(255, 255, 255, 0.07)' }}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Volume2 size={12} style={{ color: ui.accent }} className="shrink-0" />
                    <span className="text-[11px] truncate" style={{ color: ui.ivory }}>
                      {audioName}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (autoplayBlocked && isPlaying) onUnlockAudio();
                      else onTogglePlay();
                    }}
                    className="font-cinzel text-[9.5px] tracking-[0.2em] uppercase px-2.5 py-1 rounded-[2px] border transition-colors duration-200 cursor-pointer shrink-0"
                    style={{
                      borderColor: soundActive ? `${ui.accent}80` : 'rgba(255,255,255,0.16)',
                      color: soundActive ? ui.accent : ui.textSecondary,
                    }}
                  >
                    {soundActive ? 'Pause' : 'Play'}
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    ref={audioInputRef}
                    type="file"
                    accept="audio/*"
                    onChange={onAudioUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => audioInputRef.current?.click()}
                    className="flex-1 py-1.5 px-2.5 rounded-[2px] border text-[10.5px] tracking-wider flex items-center justify-center gap-1.5 transition-colors duration-200 hover:bg-white/[0.05] cursor-pointer"
                    style={{
                      borderColor: 'rgba(255, 255, 255, 0.14)',
                      color: ui.textSecondary,
                    }}
                  >
                    <Upload size={11} strokeWidth={1.6} />
                    <span>上传本地音乐</span>
                  </button>

                  {hasCustomAudio && (
                    <button
                      type="button"
                      onClick={onResetAudio}
                      className="py-1.5 px-2.5 rounded-[2px] border text-[10.5px] text-white/55 hover:text-white transition-colors duration-200 cursor-pointer shrink-0"
                      style={{ borderColor: 'rgba(255, 255, 255, 0.12)' }}
                    >
                      恢复默认
                    </button>
                  )}
                </div>
              </div>
            </section>

            <div className="h-px" style={{ backgroundColor: ui.glassBorder }} />

            {/* 02 / STARLIGHT — 星光微尘 */}
            <section className="space-y-3">
              <div className="flex items-baseline justify-between">
                <span
                  className="font-cinzel text-[9.5px] tracking-[0.26em] uppercase"
                  style={{ color: ui.accent }}
                >
                  02 / Starlight
                </span>
                <span className="text-[10.5px] tracking-[0.14em] text-white/45">星光微尘</span>
              </div>

              <EditorialRange
                label="粒子密度"
                value={config.particleCount}
                min={1000}
                max={8000}
                step={400}
                accent={ui.accent}
                thumbBg={config.bgColor}
                onChange={(val) => onConfigPatch({ particleCount: val })}
              />
            </section>

            <div className="h-px" style={{ backgroundColor: ui.glassBorder }} />

            {/* 03 / DECORATION — 装饰布置 */}
            <section className="space-y-3.5">
              <div className="flex items-baseline justify-between">
                <span
                  className="font-cinzel text-[9.5px] tracking-[0.26em] uppercase"
                  style={{ color: ui.accent }}
                >
                  03 / Decoration
                </span>
                <span className="text-[10.5px] tracking-[0.14em] text-white/45">装饰布置</span>
              </div>

              <EditorialRange
                label="礼盒数量"
                value={config.boxCount}
                min={0}
                max={240}
                step={8}
                accent={ui.accent}
                thumbBg={config.bgColor}
                onChange={(val) => onConfigPatch({ boxCount: val })}
              />

              <EditorialRange
                label="铃铛与星饰数量"
                value={config.bellCount}
                min={0}
                max={280}
                step={8}
                accent={ui.accent}
                thumbBg={config.bgColor}
                onChange={(val) => onConfigPatch({ bellCount: val })}
              />
            </section>

            <div className="h-px" style={{ backgroundColor: ui.glassBorder }} />

            {/* 04 / CUSTOMIZATION — 自定义颜色 */}
            <section className="space-y-3">
              <div className="flex items-baseline justify-between">
                <span
                  className="font-cinzel text-[9.5px] tracking-[0.26em] uppercase"
                  style={{ color: ui.accent }}
                >
                  04 / Customization
                </span>
                <span className="text-[10.5px] tracking-[0.14em] text-white/45">自定义颜色</span>
              </div>

              <div className="grid grid-cols-3 gap-x-2.5 gap-y-3">
                <EditorialSwatch
                  label="主光色"
                  value={config.particleColor1}
                  borderColor={ui.glassBorder}
                  onChange={(v) => onConfigPatch({ particleColor1: v })}
                />
                <EditorialSwatch
                  label="高光点缀"
                  value={config.particleColor2}
                  borderColor={ui.glassBorder}
                  onChange={(v) => onConfigPatch({ particleColor2: v })}
                />
                <EditorialSwatch
                  label="星饰彩球"
                  value={config.bellColor}
                  borderColor={ui.glassBorder}
                  onChange={(v) => onConfigPatch({ bellColor: v })}
                />
                <EditorialSwatch
                  label="礼盒 A"
                  value={config.boxColor1}
                  borderColor={ui.glassBorder}
                  onChange={(v) => onConfigPatch({ boxColor1: v })}
                />
                <EditorialSwatch
                  label="礼盒 B"
                  value={config.boxColor2}
                  borderColor={ui.glassBorder}
                  onChange={(v) => onConfigPatch({ boxColor2: v })}
                />
                <EditorialSwatch
                  label="丝带"
                  value={config.ribbonColor}
                  borderColor={ui.glassBorder}
                  onChange={(v) => onConfigPatch({ ribbonColor: v })}
                />
              </div>
            </section>

            {/* Quiet Atelier Guide */}
            <div
              className="pt-4 border-t text-[10px] leading-[1.7] text-white/45 space-y-0.5"
              style={{ borderColor: 'rgba(255,255,255,0.08)' }}
            >
              <div
                className="font-cinzel text-[8.5px] tracking-[0.26em] uppercase mb-1"
                style={{ color: ui.accent }}
              >
                Notes
              </div>
              <div>拖拽旋转视角 · 滚轮 / 双指缩放 · 轻点夜空触发雪花光尾</div>
              <div>点击 3D 拍立得居中预览 · 手势支持单指 / 张掌 / 握拳 / 移动 / 捏合</div>
            </div>
          </div>
        </aside>
      )}

      {/* =====================================================================
          01 / COLLECTION — ALBUM PANEL (Editorial Sheet / Floating Card)
         ===================================================================== */}
      {activePanel === 'album' && (
        <aside
          className="fixed z-40 pointer-events-auto backdrop-blur-2xl shadow-[0_28px_70px_rgba(0,0,0,0.62)] overflow-y-auto custom-scrollbar
            bottom-0 inset-x-0 max-h-[72dvh] rounded-t-xl border-t px-5 pt-5 pb-[max(1.4rem,env(safe-area-inset-bottom))] animate-editorial-sheet
            sm:bottom-24 sm:left-1/2 sm:-translate-x-1/2 sm:w-[400px] sm:max-w-[calc(100vw-2rem)] sm:rounded-[3px] sm:border sm:p-5 sm:animate-editorial-panel"
          style={{
            background: ui.glassBg,
            borderColor: ui.glassBorder,
          }}
        >
          <div
            className="flex justify-between items-start pb-3.5 mb-3.5 border-b"
            style={{ borderColor: ui.glassBorder }}
          >
            <div>
              <div
                className="font-cinzel text-[9.5px] tracking-[0.26em] uppercase"
                style={{ color: ui.accent }}
              >
                01 / Collection · {String(photos.length).padStart(2, '0')}
              </div>
              <h2
                className="font-editorial italic text-[22px] leading-tight mt-0.5 font-normal"
                style={{ color: ui.ivory }}
              >
                Memories
                <span className="not-italic text-xs font-normal ml-2 opacity-60">拍立得相册</span>
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setActivePanel('none')}
              className="p-1 text-white/45 hover:text-white transition-colors duration-200 cursor-pointer"
              aria-label="关闭相册面板"
            >
              <X size={15} strokeWidth={1.5} />
            </button>
          </div>

          <div className="grid grid-cols-4 gap-2 max-h-56 overflow-y-auto custom-scrollbar mb-3.5 pr-0.5">
            <input
              ref={imageInputRef}
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp"
              onChange={onPhotoUpload}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              className="aspect-square flex flex-col items-center justify-center gap-1 border border-dashed rounded-[2px] transition-colors duration-200 hover:bg-white/[0.04] cursor-pointer"
              style={{
                borderColor: `${ui.accent}55`,
                color: ui.textSecondary,
              }}
              title="上传本地照片"
            >
              <Plus size={14} strokeWidth={1.5} />
              <span className="text-[9.5px] tracking-wider">添加</span>
            </button>

            {photos.map((photo) => {
              const active = focusedPhotoId === photo.id;
              return (
                <div
                  key={photo.id}
                  className="relative group aspect-square rounded-[2px] overflow-hidden border transition-all duration-200 cursor-pointer"
                  style={{
                    borderColor: active ? ui.accent : 'rgba(255, 255, 255, 0.14)',
                  }}
                  onClick={() => onSelectPhoto(active ? null : photo.id)}
                  title={`点击预览：${photo.caption}`}
                >
                  <img
                    src={photo.url}
                    alt={photo.caption}
                    className="w-full h-full object-cover opacity-85 group-hover:opacity-100 group-hover:scale-[1.04] transition-all duration-300"
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemovePhoto(photo);
                    }}
                    className="absolute top-1 right-1 p-1 rounded-[2px] opacity-85 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-200 cursor-pointer"
                    style={{ background: 'rgba(5, 9, 19, 0.8)', color: '#e996a4' }}
                    title="删除此照片"
                  >
                    <Trash2 size={10} />
                  </button>
                </div>
              );
            })}
          </div>

          {hasRemovedDefaults && (
            <button
              type="button"
              onClick={onRestoreDefaultPhotos}
              className="w-full mb-2.5 py-1.5 rounded-[2px] text-[10.5px] tracking-wider flex items-center justify-center gap-1.5 border transition-colors duration-200 hover:bg-white/[0.04] cursor-pointer"
              style={{
                borderColor: 'rgba(255, 255, 255, 0.14)',
                color: ui.textSecondary,
              }}
            >
              <RotateCcw size={11} strokeWidth={1.6} />
              恢复内置明信片
            </button>
          )}

          <p className="text-[10px] leading-relaxed text-center text-white/40 tracking-wide">
            照片仅保存在当前浏览器本地 · 点击缩略图或 3D 相框居中浏览
          </p>
        </aside>
      )}

      {/* =====================================================================
          HAND TRACKING RETICLE (ref-positioned directly for zero re-renders)
         ===================================================================== */}
      <div
        ref={cursorRef}
        className="fixed pointer-events-none z-30 -translate-x-1/2 -translate-y-1/2 transition-opacity duration-150"
        style={{ left: '50%', top: '50%', opacity: 0 }}
      >
        <div
          className={`relative flex items-center justify-center transition-all duration-200 ${
            gesture === 'PINCH' ? 'w-10 h-10' : gesture === 'OPEN' ? 'w-13 h-13' : 'w-7 h-7'
          }`}
        >
          <div
            className={`absolute inset-0 border rounded-full opacity-70 ${
              gesture === 'OPEN' ? 'border-dashed animate-spin-slow' : ''
            }`}
            style={{
              borderColor: gesture === 'PINCH' ? '#e58a99' : accent,
            }}
          />
          <div className="w-1 h-1 rounded-full" style={{ backgroundColor: ui.ivory }} />
        </div>
      </div>

      {/* =====================================================================
          BOTTOM EDITORIAL FOOTER: On-Demand Strips + Magazine Footer Dock
         ===================================================================== */}
      <footer className="flex flex-col items-center gap-3 w-full">
        {/* On-Demand: Autoplay Blocked Audio Unlock Prompt */}
        {autoplayBlocked && isPlaying && (
          <button
            type="button"
            onClick={onUnlockAudio}
            className="pointer-events-auto px-4 py-1.5 rounded-[2px] border backdrop-blur-xl flex items-center gap-2 text-[10.5px] tracking-[0.14em] transition-colors duration-200 hover:bg-white/[0.06] cursor-pointer animate-editorial-panel"
            style={{
              background: ui.glassBg,
              borderColor: ui.glassBorder,
              color: ui.ivory,
            }}
          >
            <Volume2 size={12} style={{ color: ui.accent }} />
            <span className="font-cinzel text-[9.5px] tracking-[0.2em] uppercase opacity-70">
              Sound
            </span>
            <span className="opacity-30">·</span>
            <span>轻触开启圣诞音乐</span>
          </button>
        )}

        {/* On-Demand: Gesture Live Status (ONLY visible when hand tracking is enabled) */}
        {handTrackingEnabled && !focusedPhoto && (
          <div
            className="px-3.5 py-1 rounded-[2px] border backdrop-blur-xl flex items-center gap-2 text-[10px] tracking-[0.16em] animate-editorial-panel"
            style={{
              background: ui.glassBg,
              borderColor: ui.glassBorder,
              color: ui.textSecondary,
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{
                backgroundColor:
                  gesture === 'PINCH'
                    ? '#e58a99'
                    : gesture === 'OPEN' || gesture === 'POINT'
                      ? ui.accent
                      : isHandPresent
                        ? '#89d4b2'
                        : 'rgba(255,255,255,0.35)',
              }}
            />
            <span className="font-cinzel text-[9px] tracking-[0.2em]">{gestureStatusText}</span>
          </div>
        )}

        {/* On-Demand: Focused Polaroid Editorial Navigation Bar */}
        {focusedPhoto && (
          <div
            className="pointer-events-auto flex items-center gap-2.5 sm:gap-3.5 px-3.5 sm:px-4 py-1.5 rounded-[2px] border backdrop-blur-2xl shadow-2xl animate-editorial-panel"
            style={{
              background: ui.glassBg,
              borderColor: ui.glassBorder,
            }}
          >
            <button
              type="button"
              onClick={() => stepPhoto(-1)}
              className="p-1 text-white/65 hover:text-white transition-colors duration-200 cursor-pointer"
              title="上一张"
              aria-label="上一张照片"
            >
              <ChevronLeft size={14} strokeWidth={1.6} />
            </button>
            <span
              className="font-editorial italic text-[15px] sm:text-base max-w-[140px] sm:max-w-[200px] truncate"
              style={{ color: ui.ivory }}
            >
              {focusedPhoto.caption}
            </span>
            <span className="font-cinzel text-[9.5px] tracking-[0.18em] text-white/45 tabular-nums">
              {String(focusedIndex + 1).padStart(2, '0')} / {String(photos.length).padStart(2, '0')}
            </span>
            <button
              type="button"
              onClick={() => stepPhoto(1)}
              className="p-1 text-white/65 hover:text-white transition-colors duration-200 cursor-pointer"
              title="下一张"
              aria-label="下一张照片"
            >
              <ChevronRight size={14} strokeWidth={1.6} />
            </button>
            <span className="w-px h-3.5 bg-white/15" aria-hidden="true" />
            <button
              type="button"
              onClick={() => onSelectPhoto(null)}
              className="font-cinzel text-[9px] tracking-[0.22em] uppercase text-white/60 hover:text-white transition-colors duration-200 px-1 cursor-pointer"
            >
              Close
            </button>
          </div>
        )}

        {/* Luxury Magazine Footer Dock: Extending Hairlines + 3 Editorial Action Zones */}
        <nav
          aria-label="底部主交互栏"
          className="w-full max-w-4xl flex items-center justify-center gap-3 sm:gap-6 md:gap-9"
          style={navAccentVar}
        >
          {/* Left Extending Decorative Hairline */}
          <div
            className="hidden sm:block flex-1 h-px"
            style={{
              background: `linear-gradient(to left, ${ui.accent}42, transparent)`,
            }}
            aria-hidden="true"
          />

          <div className="pointer-events-auto flex items-center justify-center max-w-full">
            {/* Zone 1: 01 / COLLECTION */}
            <button
              type="button"
              onClick={() => togglePanel('album')}
              data-active={activePanel === 'album'}
              className="editorial-link group flex flex-col items-center px-2.5 sm:px-6 py-1 transition-all duration-250 cursor-pointer active:opacity-75"
            >
              <span
                className="font-cinzel text-[7.5px] sm:text-[9px] tracking-[0.14em] sm:tracking-[0.24em] uppercase whitespace-nowrap transition-colors duration-250"
                style={{
                  color: activePanel === 'album' ? ui.accent : 'rgba(255,255,255,0.42)',
                }}
              >
                01 / Collection
              </span>
              <span
                className="mt-1 inline-flex items-center gap-1 sm:gap-1.5 text-[11.5px] sm:text-[13px] tracking-[0.1em] sm:tracking-[0.12em] whitespace-nowrap transition-colors duration-250 group-hover:text-white"
                style={{
                  color: activePanel === 'album' ? ui.ivory : ui.textSecondary,
                }}
              >
                <ImageIcon size={12.5} strokeWidth={1.4} style={{ color: ui.accent }} />
                <span>相册</span>
                <span className="font-cinzel text-[9.5px] sm:text-[10px] opacity-60 tabular-nums">
                  {String(photos.length).padStart(2, '0')}
                </span>
              </span>
            </button>

            <span
              className="w-px h-7 sm:h-8 shrink-0"
              style={{ backgroundColor: ui.glassBorder }}
              aria-hidden="true"
            />

            {/* Zone 2: FEATURED ACTION — ✧ Bloom / Gather */}
            <button
              type="button"
              onClick={onToggleBloom}
              data-active={isBloomed}
              className="editorial-link group flex flex-col items-center px-3 sm:px-8 py-1 transition-all duration-300 cursor-pointer active:opacity-75"
            >
              <span
                className="font-cinzel text-[7.5px] sm:text-[9px] tracking-[0.16em] sm:tracking-[0.26em] uppercase whitespace-nowrap transition-colors duration-300"
                style={{ color: ui.accent }}
              >
                Featured Action
              </span>
              <span className="mt-0.5 inline-flex items-baseline gap-1 sm:gap-2 whitespace-nowrap">
                <span
                  className="text-[11px] sm:text-[13px] transition-transform duration-300 group-hover:rotate-45"
                  style={{ color: ui.accent }}
                  aria-hidden="true"
                >
                  ✧
                </span>
                <span
                  className="font-editorial italic text-[19px] sm:text-[25px] leading-none font-normal tracking-[0.03em] transition-colors duration-300"
                  style={{ color: ui.ivory }}
                >
                  {isBloomed ? 'Gather' : 'Bloom'}
                </span>
                <span
                  className="hidden sm:inline text-[11px] tracking-[0.14em] transition-colors duration-300"
                  style={{ color: isBloomed ? ui.accent : ui.textSecondary }}
                >
                  {isBloomed ? '聚拢星光' : '星光绽放'}
                </span>
              </span>
            </button>

            <span
              className="w-px h-7 sm:h-8 shrink-0"
              style={{ backgroundColor: ui.glassBorder }}
              aria-hidden="true"
            />

            {/* Zone 3: 02 / INTERACTION */}
            <button
              type="button"
              onClick={onToggleHandTracking}
              data-active={handTrackingEnabled}
              className="editorial-link group flex flex-col items-center px-2.5 sm:px-6 py-1 transition-all duration-250 cursor-pointer active:opacity-75"
            >
              <span
                className="font-cinzel text-[7.5px] sm:text-[9px] tracking-[0.14em] sm:tracking-[0.24em] uppercase whitespace-nowrap transition-colors duration-250 inline-flex items-center gap-1"
                style={{
                  color: handTrackingEnabled ? ui.accent : 'rgba(255,255,255,0.42)',
                }}
              >
                {handTrackingEnabled && (
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: ui.accent }}
                  />
                )}
                <span>{handTrackingEnabled ? 'Gesture Active' : '02 / Interaction'}</span>
              </span>
              <span
                className="mt-1 inline-flex items-center gap-1 sm:gap-1.5 text-[11.5px] sm:text-[13px] tracking-[0.1em] sm:tracking-[0.12em] whitespace-nowrap transition-colors duration-250 group-hover:text-white"
                style={{
                  color: handTrackingEnabled ? ui.ivory : ui.textSecondary,
                }}
              >
                <Hand size={12.5} strokeWidth={1.4} style={{ color: ui.accent }} />
                <span>
                  {handTrackingEnabled ? (
                    <>
                      <span className="sm:hidden">已开启</span>
                      <span className="hidden sm:inline">手势已开启</span>
                    </>
                  ) : (
                    '手势'
                  )}
                </span>
              </span>
            </button>
          </div>

          {/* Right Extending Decorative Hairline */}
          <div
            className="hidden sm:block flex-1 h-px"
            style={{
              background: `linear-gradient(to right, ${ui.accent}42, transparent)`,
            }}
            aria-hidden="true"
          />
        </nav>
      </footer>
    </div>
  );
}
