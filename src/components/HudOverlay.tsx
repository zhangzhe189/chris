import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent, RefObject } from 'react';
import {
  Camera,
  ChevronLeft,
  ChevronRight,
  Hand,
  Image as ImageIcon,
  Music,
  Plus,
  RotateCcw,
  Settings,
  Sparkles,
  Timer,
  Trash2,
  Upload,
  Volume2,
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

  return (
    <div className="absolute inset-0 pointer-events-none z-20 flex flex-col justify-between p-4 sm:p-6 md:p-8">
      {/* Top Row */}
      <div className="flex justify-between items-start gap-4">
        {/* Top-Left: Title, Countdown, Photo Album */}
        <div className="flex flex-col items-start gap-3.5 pointer-events-auto max-w-[62vw] sm:max-w-none">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <Sparkles size={16} style={{ color: accent }} className="animate-shimmer shrink-0" />
              <span
                className="text-[10px] sm:text-[11px] tracking-[0.36em] font-semibold"
                style={{ color: `${accent}cc` }}
              >
                CHRISTMAS EVE IS COMING
              </span>
            </div>
            <h1 className="font-display italic text-3xl sm:text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-200 to-rose-200 tracking-tight drop-shadow-lg leading-tight">
              Merry Christmas
            </h1>
            <p className="text-xs sm:text-sm mt-1.5 tracking-[0.28em] text-white/60">
              璀璨圣诞树 · 点亮冬日心愿
            </p>

            {/* Countdown */}
            <div className="flex items-center gap-2 mt-3.5 flex-wrap">
              <Timer size={13} style={{ color: accent }} className="shrink-0" />
              <div className="flex items-center gap-1.5 text-[11px] sm:text-xs font-semibold">
                {[
                  { val: String(countdown.days), unit: '天' },
                  { val: String(countdown.hours).padStart(2, '0'), unit: '时' },
                  { val: String(countdown.minutes).padStart(2, '0'), unit: '分' },
                  { val: String(countdown.seconds).padStart(2, '0'), unit: '秒' },
                ].map((item) => (
                  <span
                    key={item.unit}
                    className="px-2 py-1 rounded-md border backdrop-blur-md"
                    style={{
                      borderColor: `${accent}48`,
                      background: `${accent}14`,
                      color: accent,
                    }}
                  >
                    {item.val} {item.unit}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Photo Album Button & Popover */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setAlbumOpen((v) => !v)}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs tracking-wider transition-all duration-300 backdrop-blur-md cursor-pointer"
              style={
                albumOpen
                  ? {
                      background: `${accent}24`,
                      borderColor: `${accent}99`,
                      color: accent,
                      boxShadow: `0 0 18px ${accent}38`,
                    }
                  : {
                      background: 'rgba(10, 14, 30, 0.55)',
                      borderColor: 'rgba(255, 255, 255, 0.16)',
                      color: 'rgba(255, 255, 255, 0.78)',
                    }
              }
            >
              <ImageIcon size={14} />
              <span>回忆相册</span>
              <span className="text-[10px] opacity-65">({photos.length})</span>
            </button>

            {albumOpen && (
              <div
                className="absolute top-11 left-0 w-72 sm:w-80 rounded-2xl p-4 backdrop-blur-xl z-50 shadow-2xl"
                style={{
                  background: 'rgba(10, 14, 30, 0.92)',
                  border: `1px solid ${accent}40`,
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

                <div className="grid grid-cols-4 gap-2 max-h-64 overflow-y-auto custom-scrollbar mb-3 pr-0.5">
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
                      color: 'rgba(255, 255, 255, 0.5)',
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
                          className="absolute top-1 right-1 p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
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
                  支持 JPG / PNG / WebP，照片仅存在本机浏览器；点击缩略图可 3D 放大预览
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Top-Right: Mode Status, Controls, Gesture Tips */}
        <div className="flex flex-col items-end gap-2 pointer-events-auto shrink-0">
          <div
            className="backdrop-blur-md border px-3 py-1.5 rounded-xl flex items-center gap-3 text-xs"
            style={{
              background: 'rgba(10, 14, 30, 0.65)',
              borderColor: `${accent}40`,
              color: accent,
            }}
          >
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
              <span>{mode === 'TREE' ? '圣诞树模式' : '星光漂浮模式'}</span>
            </div>
            {handTrackingEnabled && (
              <>
                <div className="w-px h-3" style={{ background: `${accent}48` }} />
                <div className="flex items-center gap-1.5">
                  <Hand
                    size={13}
                    style={{
                      color:
                        gesture === 'OPEN' || gesture === 'PINCH' ? '#ff6b78' : accent,
                    }}
                  />
                  <span
                    style={{
                      color:
                        gesture === 'OPEN' || gesture === 'PINCH' ? '#ff6b78' : accent,
                    }}
                  >
                    {gesture === 'OPEN'
                      ? '绽放'
                      : gesture === 'PINCH'
                        ? '捏合看图'
                        : isHandPresent
                          ? '聚拢'
                          : '待识别'}
                  </span>
                </div>
              </>
            )}
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onToggleHandTracking}
              className="p-2.5 rounded-xl border backdrop-blur-md transition-all cursor-pointer"
              style={
                handTrackingEnabled
                  ? {
                      background: `${accent}26`,
                      borderColor: `${accent}99`,
                      color: accent,
                    }
                  : {
                      background: 'rgba(10, 14, 30, 0.65)',
                      borderColor: 'rgba(255, 255, 255, 0.16)',
                      color: 'rgba(255, 255, 255, 0.65)',
                    }
              }
              title="开启/关闭摄像头手势控制"
            >
              <Camera size={16} />
            </button>
            <button
              type="button"
              onClick={() => setSettingsOpen((v) => !v)}
              className="p-2.5 rounded-xl border backdrop-blur-md transition-all cursor-pointer"
              style={
                settingsOpen
                  ? {
                      background: `${accent}26`,
                      borderColor: `${accent}99`,
                      color: accent,
                    }
                  : {
                      background: 'rgba(10, 14, 30, 0.65)',
                      borderColor: 'rgba(255, 255, 255, 0.16)',
                      color: 'rgba(255, 255, 255, 0.65)',
                    }
              }
              title="圣诞布置与主题设置"
            >
              <Settings size={16} />
            </button>
          </div>

          <div
            className="hidden sm:block rounded-xl px-3 py-2 text-[10px] leading-relaxed text-right backdrop-blur-md"
            style={{
              background: 'rgba(10, 14, 30, 0.72)',
              border: `1px solid ${accent}28`,
              color: 'rgba(255, 236, 200, 0.82)',
            }}
          >
            <div>点相机按钮开启 AI 手势</div>
            <div>张开手掌：星光圣诞树绽放</div>
            <div>捏合手指 / 点击相框：查看拍立得</div>
          </div>
        </div>
      </div>

      {/* Right Settings Drawer */}
      {settingsOpen && (
        <aside
          className="fixed top-24 right-4 sm:right-6 w-80 max-w-[calc(100vw-2rem)] rounded-2xl p-5 pointer-events-auto backdrop-blur-xl z-40 overflow-y-auto max-h-[72vh] custom-scrollbar shadow-2xl"
          style={{
            background: 'rgba(10, 14, 30, 0.92)',
            border: `1px solid ${accent}48`,
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
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs border transition-all cursor-pointer"
                style={
                  isPlaying
                    ? {
                        background: 'rgba(255, 89, 100, 0.16)',
                        borderColor: 'rgba(255, 89, 100, 0.6)',
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
                      title="切回内置圣诞八音盒"
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
          </div>
        </aside>
      )}

      {/* Hand Tracking Reticle (positioned directly via ref for 60fps zero-rerender motion) */}
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

      {/* Bottom Area: Audio Unlock Banner, Focused Polaroid Controls, Bottom Guide */}
      <div className="flex flex-col items-center gap-2.5 w-full">
        {autoplayBlocked && isPlaying && (
          <button
            type="button"
            onClick={onUnlockAudio}
            className="pointer-events-auto px-4 py-1.5 rounded-full border backdrop-blur-md text-xs flex items-center gap-2 transition-all hover:scale-105 cursor-pointer shadow-lg"
            style={{
              background: 'rgba(14, 20, 42, 0.85)',
              borderColor: `${accent}70`,
              color: accent,
            }}
          >
            <Volume2 size={13} />
            <span>浏览器拦截了自动播放 · 点击此处开启圣诞音乐</span>
          </button>
        )}

        {focusedPhoto && (
          <div
            className="pointer-events-auto flex items-center gap-2.5 px-3.5 py-2 rounded-full border backdrop-blur-xl shadow-2xl"
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
              <ChevronLeft size={16} />
            </button>
            <span
              className="font-handwriting text-base px-1 max-w-[180px] truncate"
              style={{ color: accent }}
            >
              {focusedPhoto.caption}
            </span>
            <span className="text-[10px] text-white/45">
              {focusedIndex + 1} / {photos.length}
            </span>
            <button
              type="button"
              onClick={() => stepPhoto(1)}
              className="p-1 rounded-full hover:bg-white/10 text-white/80 hover:text-white transition-colors cursor-pointer"
              title="下一张"
            >
              <ChevronRight size={16} />
            </button>
            <div className="w-px h-3.5 bg-white/15" />
            <button
              type="button"
              onClick={() => onSelectPhoto(null)}
              className="text-xs text-white/65 hover:text-white px-1.5 cursor-pointer"
            >
              收回
            </button>
          </div>
        )}

        <div
          className="px-4 py-1.5 rounded-full backdrop-blur-md text-[10px] sm:text-[11px] tracking-[0.2em] border text-center"
          style={{
            background: 'rgba(10, 14, 30, 0.52)',
            borderColor: 'rgba(255, 255, 255, 0.1)',
            color: 'rgba(255, 255, 255, 0.5)',
          }}
        >
          拖动旋转 · 滚轮缩放 · 点击拍立得放大查看 · 长按空白处让星光绽放
        </div>
      </div>
    </div>
  );
}
