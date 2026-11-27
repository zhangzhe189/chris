import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent, RefObject } from 'react';
import {
  AudioLines,
  ChevronLeft,
  ChevronRight,
  Hand,
  Image as ImageIcon,
  Music,
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
import { THEME_PRESETS } from '../config/themes';
import type {
  GalleryPhoto,
  GestureType,
  SceneConfig,
  ThemeId,
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

interface HudOverlayProps {
  mode: TreeMode;
  onModeChange: (mode: TreeMode) => void;
  config: SceneConfig;
  onConfigPatch: (patch: Partial<SceneConfig>) => void;
  onSelectTheme: (themeId: ThemeId) => void;
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
  config,
  onConfigPatch,
  onSelectTheme,
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
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [albumOpen, setAlbumOpen] = useState(false);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const audioInputRef = useRef<HTMLInputElement | null>(null);
  const countdown = useChristmasCountdown();

  const accent = config.accentColor;

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

  const gestureButtonText = !handTrackingEnabled
    ? 'AI 手势'
    : gesture === 'OPEN'
      ? '手势 · 绽放'
      : gesture === 'PINCH'
        ? '手势 · 切图'
        : isHandPresent
          ? '手势 · 聚拢'
          : '手势已开';

  const isBloomedVisual = isBloomActive || (handTrackingEnabled && gesture === 'OPEN');

  return (
    <div className="absolute inset-0 pointer-events-none z-20 flex flex-col justify-between p-4 sm:p-6 md:p-8">
      {/* Top Bar: Compact Brand + Slim Countdown (Left) | Two Minimal Circular Icons (Right) */}
      <header className="flex justify-between items-start gap-4">
        <div className="flex flex-col items-start pointer-events-auto">
          <h1
            className="font-display italic text-2xl sm:text-3xl md:text-[34px] font-semibold tracking-tight leading-none drop-shadow-[0_2px_16px_rgba(255,217,138,0.28)]"
            style={{ color: accent }}
          >
            Merry Christmas
          </h1>

          {/* Single slim frosted countdown pill */}
          <div
            className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full border backdrop-blur-md text-[11px] sm:text-xs font-medium tracking-wider tabular-nums"
            style={{
              background: 'rgba(10, 14, 30, 0.48)',
              borderColor: `${accent}38`,
              color: `${accent}e6`,
            }}
          >
            <span>{countdown.days}天</span>
            <span className="opacity-40">·</span>
            <span>{String(countdown.hours).padStart(2, '0')}时</span>
            <span className="opacity-40">·</span>
            <span>{String(countdown.minutes).padStart(2, '0')}分</span>
            <span className="opacity-40">·</span>
            <span>{String(countdown.seconds).padStart(2, '0')}秒</span>
          </div>
        </div>

        {/* Top-Right: Only two circular glass buttons (Music & Settings) */}
        <div className="flex items-center gap-2.5 pointer-events-auto shrink-0">
          <button
            type="button"
            onClick={() => {
              if (autoplayBlocked && isPlaying) {
                onUnlockAudio();
              } else {
                onTogglePlay();
              }
            }}
            className="relative w-10 h-10 sm:w-11 sm:h-11 rounded-full border backdrop-blur-md flex items-center justify-center transition-all duration-300 hover:scale-105 cursor-pointer"
            style={
              isPlaying && !autoplayBlocked
                ? {
                    background: `${accent}20`,
                    borderColor: `${accent}70`,
                    color: accent,
                    boxShadow: `0 0 18px ${accent}25`,
                  }
                : {
                    background: 'rgba(10, 14, 30, 0.55)',
                    borderColor: 'rgba(255, 255, 255, 0.18)',
                    color: 'rgba(255, 255, 255, 0.65)',
                  }
            }
            title={isPlaying ? '暂停圣诞音乐' : '播放圣诞音乐'}
            aria-label={isPlaying ? '暂停圣诞音乐' : '播放圣诞音乐'}
          >
            {isPlaying && !autoplayBlocked ? (
              <AudioLines size={17} className="animate-pulse" />
            ) : (
              <VolumeX size={17} />
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              setSettingsOpen((v) => !v);
              if (!settingsOpen) setAlbumOpen(false);
            }}
            className="w-10 h-10 sm:w-11 sm:h-11 rounded-full border backdrop-blur-md flex items-center justify-center transition-all duration-300 hover:scale-105 cursor-pointer"
            style={
              settingsOpen
                ? {
                    background: `${accent}24`,
                    borderColor: `${accent}88`,
                    color: accent,
                    boxShadow: `0 0 18px ${accent}2a`,
                  }
                : {
                    background: 'rgba(10, 14, 30, 0.55)',
                    borderColor: 'rgba(255, 255, 255, 0.18)',
                    color: 'rgba(255, 255, 255, 0.72)',
                  }
            }
            title="主题与圣诞布置"
            aria-label="主题与圣诞布置"
          >
            <SlidersHorizontal size={17} />
          </button>
        </div>
      </header>

      {/* Right Settings Slide-Over Panel */}
      {settingsOpen && (
        <aside
          className="fixed top-20 right-4 sm:right-8 w-80 max-w-[calc(100vw-2rem)] rounded-2xl p-5 pointer-events-auto backdrop-blur-2xl z-40 overflow-y-auto max-h-[70vh] custom-scrollbar shadow-2xl"
          style={{
            background: 'rgba(9, 13, 28, 0.88)',
            border: `1px solid ${accent}40`,
          }}
        >
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-display italic text-base font-semibold" style={{ color: accent }}>
              圣诞布置
            </h3>
            <button
              type="button"
              onClick={() => setSettingsOpen(false)}
              className="text-white/45 hover:text-white transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          <div className="space-y-5">
            {/* Theme Presets */}
            <section className="space-y-2.5">
              <div className="text-[11px] tracking-widest font-semibold pb-1 border-b border-white/10 text-white/55">
                主题预设
              </div>
              <div className="grid grid-cols-2 gap-2">
                {THEME_PRESETS.map((theme) => {
                  const selected = config.themeId === theme.id;
                  return (
                    <button
                      key={theme.id}
                      type="button"
                      onClick={() => onSelectTheme(theme.id)}
                      className="p-2.5 rounded-xl border text-left transition-all cursor-pointer"
                      style={
                        selected
                          ? {
                              background: `${theme.colors.accentColor}1f`,
                              borderColor: `${theme.colors.accentColor}99`,
                            }
                          : {
                              background: 'rgba(255, 255, 255, 0.03)',
                              borderColor: 'rgba(255, 255, 255, 0.1)',
                            }
                      }
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span
                          className="text-xs font-semibold"
                          style={{ color: selected ? theme.colors.accentColor : '#ffffffd9' }}
                        >
                          {theme.name}
                        </span>
                        <span className="flex items-center gap-1">
                          {theme.swatch.map((hex, i) => (
                            <span
                              key={i}
                              className="w-2.5 h-2.5 rounded-full border border-white/25"
                              style={{ background: hex }}
                            />
                          ))}
                        </span>
                      </div>
                      <div className="text-[10px] text-white/45 truncate">{theme.subtitle}</div>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Christmas Music */}
            <section className="space-y-2.5">
              <div className="text-[11px] tracking-widest font-semibold pb-1 border-b border-white/10 text-white/55">
                圣诞音乐
              </div>
              <button
                type="button"
                onClick={onTogglePlay}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs border transition-all cursor-pointer"
                style={
                  isPlaying
                    ? {
                        background: 'rgba(255, 89, 100, 0.16)',
                        borderColor: 'rgba(255, 89, 100, 0.55)',
                        color: '#ff9099',
                      }
                    : {
                        borderColor: 'rgba(255, 255, 255, 0.16)',
                        color: 'rgba(255, 255, 255, 0.78)',
                      }
                }
              >
                <Music size={14} className={isPlaying ? 'animate-bounce' : ''} />
                <span>{isPlaying ? '暂停音乐' : '播放音乐'}</span>
              </button>

              <div className="rounded-xl p-2.5 border border-white/10 bg-white/[0.04]">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Volume2 size={12} style={{ color: accent }} className="shrink-0" />
                    <span className="text-[10px] truncate" style={{ color: `${accent}dd` }}>
                      {audioName}
                    </span>
                  </div>
                  {hasCustomAudio && (
                    <button
                      type="button"
                      onClick={onResetAudio}
                      className="text-[10px] text-white/45 hover:text-white shrink-0 cursor-pointer"
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
                  className="w-full text-[10px] py-1.5 rounded-lg bg-white/[0.07] hover:bg-white/[0.12] text-white/70 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Upload size={11} />
                  上传本地音乐（MP3 / WAV）
                </button>
              </div>
            </section>

            {/* Display Mode */}
            <section className="space-y-2.5">
              <div className="text-[11px] tracking-widest font-semibold pb-1 border-b border-white/10 text-white/55">
                展示模式
              </div>
              <div className="flex gap-2">
                {(
                  [
                    { id: 'TREE', label: '圣诞树' },
                    { id: 'FLOAT', label: '星光漂浮' },
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
                            background: `${accent}24`,
                            borderColor: `${accent}99`,
                            color: accent,
                          }
                        : {
                            borderColor: 'rgba(255, 255, 255, 0.12)',
                            color: 'rgba(255, 255, 255, 0.55)',
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
              <div className="text-[11px] tracking-widest font-semibold pb-1 border-b border-white/10 text-white/55">
                星光粒子
              </div>
              <div className="space-y-1.5">
                <label className="flex justify-between text-xs text-white/75">
                  <span>数量：{config.particleCount}</span>
                </label>
                <input
                  type="range"
                  min={1000}
                  max={10000}
                  step={500}
                  value={config.particleCount}
                  onChange={(e) => onConfigPatch({ particleCount: Number(e.target.value) })}
                  className="w-full h-1 rounded-lg cursor-pointer"
                  style={{ accentColor: accent }}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] mb-1 text-white/45">主色</label>
                  <input
                    type="color"
                    value={config.particleColor1}
                    onChange={(e) => onConfigPatch({ particleColor1: e.target.value })}
                    className="w-full h-8 rounded-lg border border-white/15 cursor-pointer bg-transparent"
                  />
                </div>
                <div>
                  <label className="block text-[10px] mb-1 text-white/45">点缀色</label>
                  <input
                    type="color"
                    value={config.particleColor2}
                    onChange={(e) => onConfigPatch({ particleColor2: e.target.value })}
                    className="w-full h-8 rounded-lg border border-white/15 cursor-pointer bg-transparent"
                  />
                </div>
              </div>
            </section>

            {/* Gift Boxes & Baubles */}
            <section className="space-y-2.5">
              <div className="text-[11px] tracking-widest font-semibold pb-1 border-b border-white/10 text-white/55">
                丝带礼盒与彩球
              </div>
              <div className="space-y-1.5">
                <label className="flex justify-between text-xs text-white/75">
                  <span>礼盒数量：{config.boxCount}</span>
                </label>
                <input
                  type="range"
                  min={0}
                  max={500}
                  step={10}
                  value={config.boxCount}
                  onChange={(e) => onConfigPatch({ boxCount: Number(e.target.value) })}
                  className="w-full h-1 rounded-lg cursor-pointer"
                  style={{ accentColor: '#ff5964' }}
                />
              </div>
              <div className="space-y-1.5">
                <label className="flex justify-between text-xs text-white/75">
                  <span>彩球数量：{config.bellCount}</span>
                </label>
                <input
                  type="range"
                  min={0}
                  max={500}
                  step={10}
                  value={config.bellCount}
                  onChange={(e) => onConfigPatch({ bellCount: Number(e.target.value) })}
                  className="w-full h-1 rounded-lg cursor-pointer"
                  style={{ accentColor: '#f2c14e' }}
                />
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { label: '礼盒 A', key: 'boxColor1' as const, val: config.boxColor1 },
                  { label: '礼盒 B', key: 'boxColor2' as const, val: config.boxColor2 },
                  { label: '丝带', key: 'ribbonColor' as const, val: config.ribbonColor },
                  { label: '彩球', key: 'bellColor' as const, val: config.bellColor },
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

            {/* Concise interaction cheat sheet tucked cleanly inside settings */}
            <section className="rounded-xl p-3 border border-white/10 bg-white/[0.03] text-[11px] leading-relaxed text-white/55 space-y-1">
              <div className="font-semibold text-white/75 mb-1">交互提示</div>
              <div>· 拖动旋转视角，双指/滚轮缩放</div>
              <div>· 点击 3D 拍立得放大查看</div>
              <div>· 手势：张掌绽放 / 握拳聚拢 / 捏合切图</div>
            </section>
          </div>
        </aside>
      )}

      {/* Centered Album Popover anchored cleanly above bottom pills */}
      {albumOpen && (
        <div
          className="fixed bottom-20 sm:bottom-24 left-1/2 -translate-x-1/2 w-[calc(100vw-2rem)] max-w-sm rounded-2xl p-4 pointer-events-auto backdrop-blur-2xl z-40 shadow-2xl"
          style={{
            background: 'rgba(9, 13, 28, 0.92)',
            border: `1px solid ${accent}42`,
          }}
        >
          <div className="flex justify-between items-center mb-3 pb-2 border-b border-white/10">
            <div className="flex items-center gap-2">
              <h3 className="text-xs tracking-widest font-semibold" style={{ color: accent }}>
                拍立得回忆相册
              </h3>
              <span className="text-[10px] text-white/45">{photos.length} 张</span>
            </div>
            <button
              type="button"
              onClick={() => setAlbumOpen(false)}
              className="text-white/45 hover:text-white cursor-pointer"
            >
              <X size={14} />
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
              className="aspect-square flex flex-col items-center justify-center gap-1 border border-dashed rounded-lg transition-colors hover:border-white/50 hover:text-white/80 cursor-pointer"
              style={{
                borderColor: 'rgba(255, 255, 255, 0.24)',
                color: 'rgba(255, 255, 255, 0.55)',
              }}
              title="上传本地照片"
            >
              <Plus size={16} />
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
                    boxShadow: active ? `0 0 12px ${accent}55` : undefined,
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
                    style={{ background: 'rgba(0, 0, 0, 0.72)', color: '#ff858d' }}
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
              恢复内置圣诞明信片
            </button>
          )}

          <p className="text-[10px] leading-relaxed text-center text-white/40">
            支持 JPG / PNG / WebP，仅保存在本机浏览器；点击缩略图或 3D 相框放大查看
          </p>
        </div>
      )}

      {/* Hand Tracking Reticle (positioned directly via ref for zero-rerender 60fps glide) */}
      <div
        ref={cursorRef}
        className="fixed pointer-events-none z-30 -translate-x-1/2 -translate-y-1/2 transition-opacity duration-150"
        style={{ left: '50%', top: '50%', opacity: 0 }}
      >
        <div
          className={`relative flex items-center justify-center transition-all duration-200 ${
            gesture === 'PINCH' ? 'w-12 h-12' : gesture === 'OPEN' ? 'w-16 h-16' : 'w-9 h-9'
          }`}
        >
          <div
            className={`absolute inset-0 border-2 rounded-full opacity-75 ${
              gesture === 'OPEN' ? 'border-dashed animate-spin-slow' : ''
            }`}
            style={{
              borderColor: gesture === 'PINCH' ? '#ff5964' : accent,
            }}
          />
          <div className="w-1.5 h-1.5 bg-white rounded-full" />
          {(gesture === 'OPEN' || gesture === 'PINCH') && (
            <span
              className="absolute -top-6 whitespace-nowrap text-[10px] font-bold tracking-widest"
              style={{ color: gesture === 'PINCH' ? '#ff5964' : accent }}
            >
              {gesture === 'PINCH' ? '切换照片' : '星光绽放'}
            </span>
          )}
        </div>
      </div>

      {/* Bottom Area: Floating Trio of Minimalist Champagne-Gold Pills */}
      <footer className="flex flex-col items-center gap-3 w-full pb-1 sm:pb-2">
        {autoplayBlocked && isPlaying && (
          <button
            type="button"
            onClick={onUnlockAudio}
            className="pointer-events-auto px-3.5 py-1.5 rounded-full border backdrop-blur-md text-[11px] flex items-center gap-1.5 transition-all hover:scale-105 cursor-pointer shadow-lg"
            style={{
              background: 'rgba(10, 14, 30, 0.78)',
              borderColor: `${accent}60`,
              color: accent,
            }}
          >
            <Volume2 size={12} />
            <span>点击开启圣诞音乐</span>
          </button>
        )}

        {focusedPhoto && (
          <div
            className="pointer-events-auto flex items-center gap-2.5 px-3.5 py-1.5 rounded-full border backdrop-blur-xl shadow-2xl"
            style={{
              background: 'rgba(10, 14, 30, 0.82)',
              borderColor: `${accent}55`,
            }}
          >
            <button
              type="button"
              onClick={() => stepPhoto(-1)}
              className="p-1 rounded-full hover:bg-white/10 text-white/80 hover:text-white transition-colors cursor-pointer"
              title="上一张"
            >
              <ChevronLeft size={15} />
            </button>
            <span
              className="font-handwriting text-base px-1 max-w-[160px] truncate"
              style={{ color: accent }}
            >
              {focusedPhoto.caption}
            </span>
            <span className="text-[10px] text-white/45 tabular-nums">
              {focusedIndex + 1} / {photos.length}
            </span>
            <button
              type="button"
              onClick={() => stepPhoto(1)}
              className="p-1 rounded-full hover:bg-white/10 text-white/80 hover:text-white transition-colors cursor-pointer"
              title="下一张"
            >
              <ChevronRight size={15} />
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

        {/* Signature Proposal C Floating Pill Trio */}
        <nav
          aria-label="主控制栏"
          className="pointer-events-auto flex items-center justify-center gap-2.5 sm:gap-4"
        >
          {/* Left Pill: Album */}
          <button
            type="button"
            onClick={() => {
              setAlbumOpen((v) => !v);
              if (!albumOpen) setSettingsOpen(false);
            }}
            className="flex items-center gap-1.5 sm:gap-2 px-4 sm:px-5 py-2 sm:py-2.5 rounded-full border backdrop-blur-xl text-xs sm:text-[13px] font-medium tracking-wide transition-all duration-300 hover:scale-[1.03] cursor-pointer shadow-lg"
            style={
              albumOpen
                ? {
                    background: `${accent}26`,
                    borderColor: `${accent}aa`,
                    color: accent,
                    boxShadow: `0 0 22px ${accent}33`,
                  }
                : {
                    background: 'rgba(18, 22, 38, 0.56)',
                    borderColor: `${accent}48`,
                    color: 'rgba(255, 244, 224, 0.88)',
                  }
            }
          >
            <ImageIcon size={15} />
            <span>相册</span>
            <span className="text-[10px] opacity-65 tabular-nums">{photos.length}</span>
          </button>

          {/* Center Primary Hero Pill: Bloom Starlight Toggle */}
          <button
            type="button"
            onClick={onToggleBloom}
            className="flex items-center gap-1.5 sm:gap-2 px-5 sm:px-7 py-2.5 sm:py-3 rounded-full border text-xs sm:text-sm font-semibold tracking-wider transition-all duration-300 hover:scale-[1.04] active:scale-[0.98] cursor-pointer"
            style={
              isBloomedVisual
                ? {
                    background: `linear-gradient(135deg, ${accent}, #fff2cc)`,
                    borderColor: '#fff6de',
                    color: '#181209',
                    boxShadow: `0 0 32px ${accent}88, inset 0 1px 0 rgba(255,255,255,0.75)`,
                  }
                : {
                    background: `linear-gradient(135deg, ${accent}e6, ${accent}b8)`,
                    borderColor: `${accent}ff`,
                    color: '#1a140a',
                    boxShadow: `0 0 24px ${accent}52, inset 0 1px 0 rgba(255,255,255,0.55)`,
                  }
            }
          >
            <Sparkles size={15} className={isBloomedVisual ? 'animate-spin-slow' : ''} />
            <span>{isBloomedVisual ? '聚拢星光' : '星光绽放'}</span>
          </button>

          {/* Right Pill: AI Gesture */}
          <button
            type="button"
            onClick={onToggleHandTracking}
            className="flex items-center gap-1.5 sm:gap-2 px-4 sm:px-5 py-2 sm:py-2.5 rounded-full border backdrop-blur-xl text-xs sm:text-[13px] font-medium tracking-wide transition-all duration-300 hover:scale-[1.03] cursor-pointer shadow-lg"
            style={
              handTrackingEnabled
                ? {
                    background: `${accent}26`,
                    borderColor: `${accent}aa`,
                    color: accent,
                    boxShadow: `0 0 22px ${accent}33`,
                  }
                : {
                    background: 'rgba(18, 22, 38, 0.56)',
                    borderColor: `${accent}48`,
                    color: 'rgba(255, 244, 224, 0.88)',
                  }
            }
          >
            <Hand size={15} />
            <span>{gestureButtonText}</span>
          </button>
        </nav>
      </footer>
    </div>
  );
}
