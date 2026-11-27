import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent, RefObject } from 'react';
import {
  AudioLines,
  Check,
  ChevronLeft,
  ChevronRight,
  Hand,
  Image as ImageIcon,
  Music,
  Palette,
  Plus,
  RotateCcw,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  Upload,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { APPEARANCE_LIST } from '../config/appearances';
import type {
  AppearanceConfig,
  AppearanceId,
  GalleryPhoto,
  GestureType,
  SceneConfig,
  TreeMode,
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

type ActivePanel = 'none' | 'appearance' | 'album' | 'settings';

interface HudOverlayProps {
  mode: TreeMode;
  onModeChange: (mode: TreeMode) => void;
  appearance: AppearanceConfig;
  onSelectAppearance: (id: AppearanceId) => void;
  config: SceneConfig;
  onConfigPatch: (patch: Partial<SceneConfig>) => void;
  isBloomActive: boolean;
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
  mode,
  onModeChange,
  appearance,
  onSelectAppearance,
  config,
  onConfigPatch,
  isBloomActive,
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

  const isBloomedVisual = isBloomActive || (handTrackingEnabled && gesture === 'OPEN');

  const gestureStatusText =
    gesture === 'OPEN'
      ? '张掌 · 星光绽放'
      : gesture === 'PINCH'
        ? '捏合 · 切换回忆'
        : isHandPresent
          ? '握拳 · 静谧聚拢'
          : '等待手部进入画面';

  const topIconBaseStyle = (active: boolean) => ({
    background: active ? `${accent}1e` : ui.dockBg,
    borderColor: active ? `${accent}78` : ui.glassBorder,
    color: active ? ui.ivory : ui.textSecondary,
    boxShadow: active ? `0 0 18px ${accent}22` : '0 8px 24px rgba(0,0,0,0.28)',
  });

  return (
    <div className="absolute inset-0 pointer-events-none z-20 flex flex-col justify-between px-4 pt-4 pb-3 sm:px-7 sm:pt-6 sm:pb-5 md:px-9 md:pt-7 md:pb-6">
      {/* Top Row: Two-line Magazine Editorial Title & Borderless Countdown | Unified 3-Icon Triad */}
      <header className="flex justify-between items-start gap-4">
        <div className="flex flex-col items-start pointer-events-none select-none">
          <h1 className="font-editorial italic font-normal tracking-[0.01em] leading-[0.92] drop-shadow-[0_4px_22px_rgba(5,9,19,0.75)]">
            <span
              className="block text-[26px] sm:text-[34px] md:text-[42px]"
              style={{ color: ui.ivory }}
            >
              Merry
            </span>
            <span
              className="block text-[30px] sm:text-[40px] md:text-[50px] pl-1 sm:pl-2"
              style={{ color: ui.accent }}
            >
              Christmas
            </span>
          </h1>

          {/* Borderless, capsule-free wide-tracked countdown */}
          <div
            className="font-cinzel mt-2.5 sm:mt-3 flex items-center gap-2 sm:gap-2.5 text-[9.5px] sm:text-[10.5px] tracking-[0.26em] tabular-nums"
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
        </div>

        {/* Top-Right: Appearance, Music, Settings — 3 unified frosted circular buttons */}
        <div className="flex items-center gap-2 sm:gap-2.5 pointer-events-auto shrink-0">
          <button
            type="button"
            onClick={() => togglePanel('appearance')}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full border backdrop-blur-xl flex items-center justify-center transition-all duration-300 hover:scale-105 cursor-pointer"
            style={topIconBaseStyle(activePanel === 'appearance')}
            title="外观主题"
            aria-label="外观主题"
          >
            <Palette size={15} strokeWidth={1.7} />
          </button>

          <button
            type="button"
            onClick={() => {
              if (autoplayBlocked && isPlaying) {
                onUnlockAudio();
              } else {
                onTogglePlay();
              }
            }}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full border backdrop-blur-xl flex items-center justify-center transition-all duration-300 hover:scale-105 cursor-pointer"
            style={topIconBaseStyle(isPlaying && !autoplayBlocked)}
            title={isPlaying ? '暂停圣诞音乐' : '播放圣诞音乐'}
            aria-label={isPlaying ? '暂停圣诞音乐' : '播放圣诞音乐'}
          >
            {isPlaying && !autoplayBlocked ? (
              <AudioLines size={15} strokeWidth={1.7} className="animate-pulse" />
            ) : (
              <VolumeX size={15} strokeWidth={1.7} />
            )}
          </button>

          <button
            type="button"
            onClick={() => togglePanel('settings')}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full border backdrop-blur-xl flex items-center justify-center transition-all duration-300 hover:scale-105 cursor-pointer"
            style={topIconBaseStyle(activePanel === 'settings')}
            title="场景与布置设置"
            aria-label="场景与布置设置"
          >
            <SlidersHorizontal size={15} strokeWidth={1.7} />
          </button>
        </div>
      </header>

      {/* Independent Appearance Selector Panel (themed glass + preview thumbnail cards) */}
      {activePanel === 'appearance' && (
        <aside
          className="fixed top-18 sm:top-21 right-4 sm:right-8 w-80 max-w-[calc(100vw-2rem)] rounded-2xl p-5 pointer-events-auto backdrop-blur-2xl z-40 shadow-[0_24px_60px_rgba(0,0,0,0.55)]"
          style={{
            background: ui.glassBg,
            border: `1px solid ${ui.glassBorder}`,
          }}
        >
          <div className="flex justify-between items-start mb-4 pb-2.5 border-b border-white/10">
            <div>
              <div
                className="font-cinzel text-[10px] tracking-[0.28em] uppercase"
                style={{ color: ui.accent }}
              >
                Appearance
              </div>
              <h3 className="text-sm font-medium mt-0.5" style={{ color: ui.textPrimary }}>
                空间外观
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setActivePanel('none')}
              className="text-white/45 hover:text-white transition-colors cursor-pointer p-0.5"
              aria-label="关闭外观面板"
            >
              <X size={15} />
            </button>
          </div>

          <div className="space-y-3">
            {APPEARANCE_LIST.map((item) => {
              const selected = appearance.id === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  disabled={!item.available}
                  onClick={() => item.available && onSelectAppearance(item.id)}
                  className={`w-full text-left rounded-xl overflow-hidden border transition-all duration-300 ${
                    item.available ? 'cursor-pointer hover:brightness-110' : 'opacity-55 cursor-not-allowed'
                  }`}
                  style={{
                    borderColor: selected ? `${item.ui.accent}88` : 'rgba(255,255,255,0.1)',
                    background: selected ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.02)',
                  }}
                >
                  {/* Visual Preview Thumbnail */}
                  <div
                    className="relative h-16 w-full overflow-hidden flex items-end justify-between px-3 py-2"
                    style={{ background: item.previewGradient }}
                  >
                    {/* Subtle geometric starlight tree preview silhouette */}
                    <div
                      className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-12 opacity-60 pointer-events-none"
                      style={{
                        background: `conic-gradient(from 160deg at 50% 8%, transparent 0deg, ${item.ui.accent}80 18deg, ${item.ui.ivory}aa 22deg, transparent 42deg)`,
                        filter: 'blur(0.4px)',
                      }}
                    />
                    <div>
                      <div
                        className="font-cinzel text-[10px] tracking-[0.2em]"
                        style={{ color: item.ui.accent }}
                      >
                        {item.englishName}
                      </div>
                      <div className="text-xs font-medium" style={{ color: item.ui.ivory }}>
                        {item.name}
                      </div>
                    </div>

                    {selected ? (
                      <span
                        className="w-5 h-5 rounded-full flex items-center justify-center"
                        style={{
                          background: `${item.ui.accent}2e`,
                          border: `1px solid ${item.ui.accent}88`,
                          color: item.ui.ivory,
                        }}
                      >
                        <Check size={11} />
                      </span>
                    ) : !item.available ? (
                      <span className="text-[9px] tracking-widest px-2 py-0.5 rounded-full bg-black/45 border border-white/15 text-white/70">
                        即将上线
                      </span>
                    ) : null}
                  </div>

                  <div className="px-3 py-2 flex items-center justify-between gap-2">
                    <span className="text-[10px] text-white/55 truncate">{item.tagline}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      {item.swatches.map((hex, i) => (
                        <span
                          key={i}
                          className="w-2.5 h-2.5 rounded-full border border-white/20"
                          style={{ background: hex }}
                        />
                      ))}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>
      )}

      {/* Right Settings Panel (unified themed frosted glass) */}
      {activePanel === 'settings' && (
        <aside
          className="fixed top-18 sm:top-21 right-4 sm:right-8 w-80 max-w-[calc(100vw-2rem)] rounded-2xl p-5 pointer-events-auto backdrop-blur-2xl z-40 overflow-y-auto max-h-[68vh] custom-scrollbar shadow-[0_24px_60px_rgba(0,0,0,0.55)]"
          style={{
            background: ui.glassBg,
            border: `1px solid ${ui.glassBorder}`,
          }}
        >
          <div className="flex justify-between items-start mb-4 pb-2.5 border-b border-white/10">
            <div>
              <div
                className="font-cinzel text-[10px] tracking-[0.28em] uppercase"
                style={{ color: ui.accent }}
              >
                Atelier
              </div>
              <h3 className="text-sm font-medium mt-0.5" style={{ color: ui.textPrimary }}>
                圣诞布置
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setActivePanel('none')}
              className="text-white/45 hover:text-white transition-colors cursor-pointer p-0.5"
              aria-label="关闭设置面板"
            >
              <X size={15} />
            </button>
          </div>

          <div className="space-y-5">
            {/* Christmas Music */}
            <section className="space-y-2.5">
              <div className="text-[11px] tracking-[0.18em] font-medium pb-1 border-b border-white/10 text-white/55">
                圣诞音乐
              </div>
              <button
                type="button"
                onClick={onTogglePlay}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs border transition-all cursor-pointer"
                style={
                  isPlaying
                    ? {
                        background: `${ui.velvetAccent}40`,
                        borderColor: `${ui.accent}55`,
                        color: ui.ivory,
                      }
                    : {
                        borderColor: 'rgba(255, 255, 255, 0.14)',
                        color: ui.textSecondary,
                      }
                }
              >
                <Music size={13} className={isPlaying ? 'animate-pulse' : ''} />
                <span>{isPlaying ? '暂停音乐' : '播放音乐'}</span>
              </button>

              <div className="rounded-xl p-2.5 border border-white/10 bg-white/[0.03]">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Volume2 size={12} style={{ color: ui.accent }} className="shrink-0" />
                    <span className="text-[10px] truncate" style={{ color: ui.ivory }}>
                      {audioName}
                    </span>
                  </div>
                  {hasCustomAudio && (
                    <button
                      type="button"
                      onClick={onResetAudio}
                      className="text-[10px] text-white/50 hover:text-white shrink-0 cursor-pointer"
                    >
                      恢复默认
                    </button>
                  )}
                </div>
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
                  className="w-full text-[10px] py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.11] text-white/75 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Upload size={11} />
                  上传本地音乐（MP3 / WAV）
                </button>
              </div>
            </section>

            {/* Display Mode */}
            <section className="space-y-2.5">
              <div className="text-[11px] tracking-[0.18em] font-medium pb-1 border-b border-white/10 text-white/55">
                空间形态
              </div>
              <div className="flex gap-2">
                {(
                  [
                    { id: 'TREE', label: '静谧树形' },
                    { id: 'FLOAT', label: '星河漂浮' },
                  ] as const
                ).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onModeChange(item.id)}
                    className="flex-1 py-2 rounded-xl text-xs border transition-all cursor-pointer"
                    style={
                      mode === item.id
                        ? {
                            background: `${accent}1f`,
                            borderColor: `${accent}78`,
                            color: ui.ivory,
                          }
                        : {
                            borderColor: 'rgba(255, 255, 255, 0.1)',
                            color: 'rgba(255, 255, 255, 0.5)',
                          }
                    }
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </section>

            {/* Starlight Particles */}
            <section className="space-y-2.5">
              <div className="text-[11px] tracking-[0.18em] font-medium pb-1 border-b border-white/10 text-white/55">
                星光微尘
              </div>
              <div className="space-y-1.5">
                <label className="flex justify-between text-xs text-white/70">
                  <span>粒子密度</span>
                  <span className="tabular-nums opacity-75">{config.particleCount}</span>
                </label>
                <input
                  type="range"
                  min={1000}
                  max={8000}
                  step={400}
                  value={config.particleCount}
                  onChange={(e) => onConfigPatch({ particleCount: Number(e.target.value) })}
                  className="w-full h-1 rounded-lg cursor-pointer"
                  style={{ accentColor: accent }}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] mb-1 text-white/45">主光色</label>
                  <input
                    type="color"
                    value={config.particleColor1}
                    onChange={(e) => onConfigPatch({ particleColor1: e.target.value })}
                    className="w-full h-7 rounded-lg border border-white/15 cursor-pointer bg-transparent"
                  />
                </div>
                <div>
                  <label className="block text-[10px] mb-1 text-white/45">高光点缀</label>
                  <input
                    type="color"
                    value={config.particleColor2}
                    onChange={(e) => onConfigPatch({ particleColor2: e.target.value })}
                    className="w-full h-7 rounded-lg border border-white/15 cursor-pointer bg-transparent"
                  />
                </div>
              </div>
            </section>

            {/* Ornaments */}
            <section className="space-y-2.5">
              <div className="text-[11px] tracking-[0.18em] font-medium pb-1 border-b border-white/10 text-white/55">
                丝带礼盒与星饰
              </div>
              <div className="space-y-1.5">
                <label className="flex justify-between text-xs text-white/70">
                  <span>礼盒数量</span>
                  <span className="tabular-nums opacity-75">{config.boxCount}</span>
                </label>
                <input
                  type="range"
                  min={0}
                  max={240}
                  step={8}
                  value={config.boxCount}
                  onChange={(e) => onConfigPatch({ boxCount: Number(e.target.value) })}
                  className="w-full h-1 rounded-lg cursor-pointer"
                  style={{ accentColor: ui.velvetAccent }}
                />
              </div>
              <div className="space-y-1.5">
                <label className="flex justify-between text-xs text-white/70">
                  <span>星饰彩球</span>
                  <span className="tabular-nums opacity-75">{config.bellCount}</span>
                </label>
                <input
                  type="range"
                  min={0}
                  max={280}
                  step={8}
                  value={config.bellCount}
                  onChange={(e) => onConfigPatch({ bellCount: Number(e.target.value) })}
                  className="w-full h-1 rounded-lg cursor-pointer"
                  style={{ accentColor: accent }}
                />
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { label: '礼盒 A', key: 'boxColor1' as const, val: config.boxColor1 },
                  { label: '礼盒 B', key: 'boxColor2' as const, val: config.boxColor2 },
                  { label: '丝带', key: 'ribbonColor' as const, val: config.ribbonColor },
                  { label: '星饰', key: 'bellColor' as const, val: config.bellColor },
                ].map((c) => (
                  <div key={c.key}>
                    <label className="block text-[10px] mb-1 text-white/45 text-center">
                      {c.label}
                    </label>
                    <input
                      type="color"
                      value={c.val}
                      onChange={(e) => onConfigPatch({ [c.key]: e.target.value })}
                      className="w-full h-7 rounded-lg border border-white/15 cursor-pointer bg-transparent"
                    />
                  </div>
                ))}
              </div>
            </section>

            {/* Concise interaction note inside Settings only (never clutters main viewport) */}
            <section className="rounded-xl p-3 border border-white/8 bg-white/[0.025] text-[10.5px] leading-relaxed text-white/50 space-y-1">
              <div className="font-medium text-white/70 mb-1">交互指南</div>
              <div>· 拖拽旋转视角，滚轮 / 双指缩放</div>
              <div>· 点击 3D 拍立得即可居中放大浏览</div>
              <div>· 手势：张掌绽放 / 握拳聚拢 / 捏合切图</div>
            </section>
          </div>
        </aside>
      )}

      {/* Centered Album Panel (unified themed frosted glass) */}
      {activePanel === 'album' && (
        <div
          className="fixed bottom-24 sm:bottom-28 left-1/2 -translate-x-1/2 w-[calc(100vw-2rem)] max-w-sm rounded-2xl p-4 sm:p-5 pointer-events-auto backdrop-blur-2xl z-40 shadow-[0_24px_60px_rgba(0,0,0,0.55)]"
          style={{
            background: ui.glassBg,
            border: `1px solid ${ui.glassBorder}`,
          }}
        >
          <div className="flex justify-between items-start mb-3 pb-2 border-b border-white/10">
            <div>
              <div
                className="font-cinzel text-[10px] tracking-[0.26em] uppercase"
                style={{ color: ui.accent }}
              >
                Memories · {photos.length}
              </div>
              <h3 className="text-xs sm:text-sm font-medium mt-0.5" style={{ color: ui.textPrimary }}>
                拍立得回忆相册
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setActivePanel('none')}
              className="text-white/45 hover:text-white cursor-pointer p-0.5"
              aria-label="关闭相册面板"
            >
              <X size={15} />
            </button>
          </div>

          <div className="grid grid-cols-4 gap-2 max-h-56 overflow-y-auto custom-scrollbar mb-3 pr-0.5">
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
              className="aspect-square flex flex-col items-center justify-center gap-1 border border-dashed rounded-lg transition-colors hover:border-white/45 hover:text-white/85 cursor-pointer"
              style={{
                borderColor: 'rgba(245, 232, 207, 0.24)',
                color: 'rgba(245, 232, 207, 0.58)',
              }}
              title="上传本地照片"
            >
              <Plus size={15} />
              <span className="text-[9px]">添加</span>
            </button>

            {photos.map((photo) => {
              const active = focusedPhotoId === photo.id;
              return (
                <div
                  key={photo.id}
                  className="relative group aspect-square rounded-lg overflow-hidden border transition-all cursor-pointer"
                  style={{
                    borderColor: active ? accent : 'rgba(255, 255, 255, 0.14)',
                    boxShadow: active ? `0 0 12px ${accent}45` : undefined,
                  }}
                  onClick={() => onSelectPhoto(active ? null : photo.id)}
                  title={`点击预览：${photo.caption}`}
                >
                  <img
                    src={photo.url}
                    alt={photo.caption}
                    className="w-full h-full object-cover opacity-85 group-hover:opacity-100 transition-opacity"
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemovePhoto(photo);
                    }}
                    className="absolute top-1 right-1 p-1 rounded-md opacity-85 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity cursor-pointer"
                    style={{ background: 'rgba(5, 9, 19, 0.78)', color: '#f09ba8' }}
                    title="删除此照片"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              );
            })}
          </div>

          {hasRemovedDefaults && (
            <button
              type="button"
              onClick={onRestoreDefaultPhotos}
              className="w-full mb-2 py-1.5 rounded-lg text-[11px] flex items-center justify-center gap-1.5 border border-white/10 text-white/65 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
            >
              <RotateCcw size={11} />
              恢复内置明信片
            </button>
          )}

          <p className="text-[10px] leading-relaxed text-center text-white/40">
            照片仅保存在当前设备浏览器本地 · 点击缩略图或 3D 相框放大查看
          </p>
        </div>
      )}

      {/* Hand Tracking Reticle (positioned directly via ref, zero React re-renders) */}
      <div
        ref={cursorRef}
        className="fixed pointer-events-none z-30 -translate-x-1/2 -translate-y-1/2 transition-opacity duration-150"
        style={{ left: '50%', top: '50%', opacity: 0 }}
      >
        <div
          className={`relative flex items-center justify-center transition-all duration-200 ${
            gesture === 'PINCH' ? 'w-11 h-11' : gesture === 'OPEN' ? 'w-14 h-14' : 'w-8 h-8'
          }`}
        >
          <div
            className={`absolute inset-0 border rounded-full opacity-75 ${
              gesture === 'OPEN' ? 'border-dashed animate-spin-slow' : ''
            }`}
            style={{
              borderColor: gesture === 'PINCH' ? '#e58a99' : accent,
            }}
          />
          <div className="w-1 h-1 bg-[#F5E8CF] rounded-full" />
        </div>
      </div>

      {/* Bottom Area: On-demand Micro-Status, Unified Floating Frosted-Glass Dock & Poetic Tagline */}
      <footer className="flex flex-col items-center gap-2.5 w-full pb-[env(safe-area-inset-bottom,0px)]">
        {/* On-demand audio unlock notice */}
        {autoplayBlocked && isPlaying && (
          <button
            type="button"
            onClick={onUnlockAudio}
            className="pointer-events-auto px-3.5 py-1 rounded-full border backdrop-blur-xl text-[11px] flex items-center gap-1.5 transition-all hover:brightness-110 cursor-pointer"
            style={{
              background: ui.dockBg,
              borderColor: ui.glassBorder,
              color: ui.ivory,
            }}
          >
            <Volume2 size={12} style={{ color: ui.accent }} />
            <span>轻触开启圣诞音乐</span>
          </button>
        )}

        {/* On-demand Gesture Status Pill (shown ONLY while hand tracking is active) */}
        {handTrackingEnabled && !focusedPhoto && (
          <div
            className="px-3 py-1 rounded-full border backdrop-blur-xl flex items-center gap-2 text-[10.5px] tracking-wider"
            style={{
              background: ui.dockBg,
              borderColor: ui.glassBorder,
              color: ui.textSecondary,
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full animate-pulse"
              style={{
                background:
                  gesture === 'PINCH'
                    ? '#e58a99'
                    : gesture === 'OPEN'
                      ? ui.accent
                      : isHandPresent
                        ? '#89d4b2'
                        : 'rgba(245,232,207,0.4)',
              }}
            />
            <span>{gestureStatusText}</span>
          </div>
        )}

        {/* On-demand Focused Polaroid Navigation Bar */}
        {focusedPhoto && (
          <div
            className="pointer-events-auto flex items-center gap-2.5 px-3.5 py-1.5 rounded-full border backdrop-blur-xl shadow-2xl"
            style={{
              background: ui.glassBg,
              borderColor: ui.glassBorder,
            }}
          >
            <button
              type="button"
              onClick={() => stepPhoto(-1)}
              className="p-1 rounded-full hover:bg-white/10 text-white/75 hover:text-white transition-colors cursor-pointer"
              title="上一张"
            >
              <ChevronLeft size={14} />
            </button>
            <span
              className="font-handwriting text-base px-1 max-w-[160px] truncate"
              style={{ color: ui.ivory }}
            >
              {focusedPhoto.caption}
            </span>
            <span className="text-[10px] text-white/45 tabular-nums">
              {focusedIndex + 1} / {photos.length}
            </span>
            <button
              type="button"
              onClick={() => stepPhoto(1)}
              className="p-1 rounded-full hover:bg-white/10 text-white/75 hover:text-white transition-colors cursor-pointer"
              title="下一张"
            >
              <ChevronRight size={14} />
            </button>
            <div className="w-px h-3.5 bg-white/15" />
            <button
              type="button"
              onClick={() => onSelectPhoto(null)}
              className="text-xs text-white/65 hover:text-white px-1 cursor-pointer"
            >
              收回
            </button>
          </div>
        )}

        {/* Unified Floating Frosted-Glass Dock */}
        <nav
          aria-label="主控制坞"
          className="pointer-events-auto inline-flex items-center p-1 sm:p-1.5 rounded-full border backdrop-blur-2xl shadow-[0_14px_40px_rgba(0,0,0,0.45)]"
          style={{
            background: ui.dockBg,
            borderColor: ui.dockBorder,
            boxShadow: `0 14px 40px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(245, 232, 207, 0.08)`,
          }}
        >
          {/* Album Action */}
          <button
            type="button"
            onClick={() => togglePanel('album')}
            className="flex items-center gap-1.5 px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-[13px] tracking-wide transition-all duration-300 cursor-pointer"
            style={{
              background: activePanel === 'album' ? `${accent}1e` : 'transparent',
              color: activePanel === 'album' ? ui.ivory : ui.textSecondary,
            }}
          >
            <ImageIcon size={14} strokeWidth={1.7} />
            <span>相册</span>
            <span className="text-[10px] opacity-55 tabular-nums">{photos.length}</span>
          </button>

          <div className="w-px h-4 mx-0.5 sm:mx-1 bg-white/12" />

          {/* Restrained Champagne-Glass Bloom Toggle */}
          <button
            type="button"
            onClick={onToggleBloom}
            className="flex items-center gap-1.5 sm:gap-2 px-4 sm:px-5 py-1.5 sm:py-2 rounded-full border text-xs sm:text-[13px] font-medium tracking-wider transition-all duration-300 cursor-pointer"
            style={
              isBloomedVisual
                ? {
                    background: ui.bloomActiveBg,
                    borderColor: ui.bloomActiveBorder,
                    color: ui.ivory,
                    boxShadow: `0 0 18px ${accent}2a`,
                  }
                : {
                    background: ui.bloomIdleBg,
                    borderColor: ui.bloomIdleBorder,
                    color: ui.ivory,
                    boxShadow: `0 0 12px ${accent}16`,
                  }
            }
          >
            <Sparkles
              size={14}
              strokeWidth={1.7}
              style={{ color: ui.accent }}
              className={isBloomedVisual ? 'animate-spin-slow' : ''}
            />
            <span>{isBloomedVisual ? '聚拢星光' : '星光绽放'}</span>
          </button>

          <div className="w-px h-4 mx-0.5 sm:mx-1 bg-white/12" />

          {/* AI Gesture Action */}
          <button
            type="button"
            onClick={onToggleHandTracking}
            className="flex items-center gap-1.5 px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-[13px] tracking-wide transition-all duration-300 cursor-pointer"
            style={{
              background: handTrackingEnabled ? `${accent}1e` : 'transparent',
              color: handTrackingEnabled ? ui.ivory : ui.textSecondary,
            }}
          >
            <Hand size={14} strokeWidth={1.7} />
            <span>{handTrackingEnabled ? '手势中' : '手势'}</span>
          </button>
        </nav>

        {/* Understated Poetic Italic Caption */}
        <p
          className="font-editorial italic text-[11px] sm:text-xs tracking-[0.14em] select-none"
          style={{ color: 'rgba(245, 232, 207, 0.44)' }}
        >
          A little magic, just for you.
        </p>
      </footer>
    </div>
  );
}
