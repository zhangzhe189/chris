import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { createInitialConfig, getThemePreset } from './config/themes';
import { DEFAULT_POSTCARDS } from './utils/defaultPostcards';
import {
  compressImageBlob,
  deleteStoredPhoto,
  formatCaptionFromFilename,
  getRemovedDefaultIds,
  isAcceptedImageFile,
  loadStoredPhotos,
  persistRemovedDefaultIds,
  saveStoredPhoto,
} from './utils/photoStorage';
import { useAudioEngine } from './hooks/useAudioEngine';
import { ChristmasScene } from './components/scene/ChristmasScene';
import { HudOverlay } from './components/HudOverlay';
import { HandTracker } from './components/HandTracker';
import type {
  GalleryPhoto,
  GestureType,
  HandData,
  SceneConfig,
  ThemeId,
  TreeMode,
} from './types';

function detectLiteMode(): boolean {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).has('lite');
}

export function App() {
  const isLite = useMemo(() => detectLiteMode(), []);

  const [mode, setMode] = useState<TreeMode>('TREE');
  const [config, setConfig] = useState<SceneConfig>(() => createInitialConfig(isLite));

  // Audio state (built-in music box by default, supports uploading local audio)
  const [isPlaying, setIsPlaying] = useState(true);
  const [customAudioUrl, setCustomAudioUrl] = useState<string | null>(null);
  const [audioName, setAudioName] = useState('内置 · 圣诞八音盒');

  // Gallery photos (user uploaded in IndexedDB + removable default festive Polaroids)
  const [userPhotos, setUserPhotos] = useState<GalleryPhoto[]>([]);
  const [removedDefaultIds, setRemovedDefaultIds] = useState<string[]>(() =>
    getRemovedDefaultIds()
  );
  const [focusedPhotoId, setFocusedPhotoId] = useState<string | null>(null);

  // Hand tracking state
  const [handTrackingEnabled, setHandTrackingEnabled] = useState(false);
  const [hudGesture, setHudGesture] = useState<GestureType>('IDLE');
  const [isHandPresent, setIsHandPresent] = useState(false);

  const handDataRef = useRef<HandData>({
    x: 0.5,
    y: 0.5,
    gesture: 'IDLE',
    isPresent: false,
    source: 'mouse',
  });
  const bloomActiveRef = useRef(false);
  const holdTimerRef = useRef<number | null>(null);
  const cursorElRef = useRef<HTMLDivElement | null>(null);
  const customAudioUrlRef = useRef<string | null>(null);

  const { audioMetricsRef, autoplayBlocked, unlockAudio } = useAudioEngine({
    isPlaying,
    customAudioUrl,
  });

  // Load persisted photos from IndexedDB on mount
  useEffect(() => {
    let active = true;
    const createdUrls: string[] = [];

    loadStoredPhotos()
      .then((records) => {
        if (!active) return;
        const loaded: GalleryPhoto[] = records.map((rec) => {
          const url = URL.createObjectURL(rec.blob);
          createdUrls.push(url);
          return {
            id: rec.id,
            url,
            caption: formatCaptionFromFilename(rec.name),
            isDefault: false,
          };
        });
        setUserPhotos(loaded);
      })
      .catch(() => {
        // Ignore IndexedDB unavailability (e.g., strict private browsing)
      });

    return () => {
      active = false;
      createdUrls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, []);

  // Revoke custom audio object URL on unmount
  useEffect(() => {
    return () => {
      if (customAudioUrlRef.current) {
        URL.revokeObjectURL(customAudioUrlRef.current);
      }
    };
  }, []);

  // Escape key closes zoomed Polaroid; Spacebar holds starlight bloom
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setFocusedPhotoId(null);
      } else if (e.code === 'Space' && e.target === document.body) {
        e.preventDefault();
        bloomActiveRef.current = true;
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        bloomActiveRef.current = false;
      }
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  const galleryPhotos = useMemo<GalleryPhoto[]>(() => {
    const activeDefaults = DEFAULT_POSTCARDS.filter((p) => !removedDefaultIds.includes(p.id));
    return [...userPhotos, ...activeDefaults];
  }, [userPhotos, removedDefaultIds]);

  // Clear focused photo if it gets deleted
  useEffect(() => {
    if (focusedPhotoId && !galleryPhotos.some((p) => p.id === focusedPhotoId)) {
      setFocusedPhotoId(null);
    }
  }, [focusedPhotoId, galleryPhotos]);

  const handleSelectTheme = useCallback((themeId: ThemeId) => {
    const preset = getThemePreset(themeId);
    setConfig((prev) => ({
      ...prev,
      themeId: preset.id,
      ...preset.colors,
    }));
  }, []);

  const handleConfigPatch = useCallback((patch: Partial<SceneConfig>) => {
    setConfig((prev) => ({ ...prev, ...patch }));
  }, []);

  const handlePhotoUpload = useCallback(async (e: ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    const validFiles = Array.from(fileList).filter((file) => {
      if (isAcceptedImageFile(file)) return true;
      window.alert(`「${file.name}」格式暂不支持，请选择 JPG、PNG 或 WebP 图片。`);
      return false;
    });

    const added: GalleryPhoto[] = [];
    for (const file of validFiles) {
      const compressed = await compressImageBlob(file);
      if (!compressed) continue;
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      await saveStoredPhoto({
        id,
        name: file.name,
        blob: compressed,
        createdAt: Date.now(),
      }).catch(() => {});
      added.push({
        id,
        url: URL.createObjectURL(compressed),
        caption: formatCaptionFromFilename(file.name),
        isDefault: false,
      });
    }

    if (added.length > 0) {
      setUserPhotos((prev) => [...added, ...prev]);
    }
    e.target.value = '';
  }, []);

  const handleRemovePhoto = useCallback((photo: GalleryPhoto) => {
    if (photo.isDefault) {
      setRemovedDefaultIds((prev) => {
        const next = prev.includes(photo.id) ? prev : [...prev, photo.id];
        persistRemovedDefaultIds(next);
        return next;
      });
    } else {
      deleteStoredPhoto(photo.id).catch(() => {});
      URL.revokeObjectURL(photo.url);
      setUserPhotos((prev) => prev.filter((p) => p.id !== photo.id));
    }
  }, []);

  const handleRestoreDefaultPhotos = useCallback(() => {
    setRemovedDefaultIds([]);
    persistRemovedDefaultIds([]);
  }, []);

  const handleAudioUpload = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (customAudioUrlRef.current) {
      URL.revokeObjectURL(customAudioUrlRef.current);
    }
    const url = URL.createObjectURL(file);
    customAudioUrlRef.current = url;
    setCustomAudioUrl(url);
    setAudioName(file.name.replace(/\.[^.]+$/, ''));
    setIsPlaying(true);
    e.target.value = '';
  }, []);

  const handleResetAudio = useCallback(() => {
    if (customAudioUrlRef.current) {
      URL.revokeObjectURL(customAudioUrlRef.current);
      customAudioUrlRef.current = null;
    }
    setCustomAudioUrl(null);
    setAudioName('内置 · 圣诞八音盒');
  }, []);

  const handleHandUpdate = useCallback((data: HandData) => {
    handDataRef.current = data;

    // Position screen reticle directly via DOM style to avoid React re-renders
    if (cursorElRef.current) {
      cursorElRef.current.style.left = `${data.x * 100}%`;
      cursorElRef.current.style.top = `${data.y * 100}%`;
      cursorElRef.current.style.opacity = data.isPresent ? '1' : '0';
    }

    setHudGesture((prev) => (prev === data.gesture ? prev : data.gesture));
    setIsHandPresent((prev) => (prev === data.isPresent ? prev : data.isPresent));
  }, []);

  const handleToggleHandTracking = useCallback(() => {
    setHandTrackingEnabled((prev) => {
      const next = !prev;
      if (!next) {
        handDataRef.current = {
          x: 0.5,
          y: 0.5,
          gesture: 'IDLE',
          isPresent: false,
          source: 'mouse',
        };
        if (cursorElRef.current) cursorElRef.current.style.opacity = '0';
        setHudGesture('IDLE');
        setIsHandPresent(false);
      }
      return next;
    });
  }, []);

  // Press-and-hold on the canvas (> 260ms) blooms starlight cleanly without interfering with photo clicks
  const handleCanvasPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 || handTrackingEnabled) return;
    if (holdTimerRef.current !== null) window.clearTimeout(holdTimerRef.current);
    holdTimerRef.current = window.setTimeout(() => {
      bloomActiveRef.current = true;
    }, 260);
  };

  const clearHoldBloom = () => {
    if (holdTimerRef.current !== null) {
      window.clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    bloomActiveRef.current = false;
  };

  return (
    <div
      className="w-full h-screen text-white overflow-hidden relative"
      style={{ background: config.bgColor }}
    >
      <HudOverlay
        mode={mode}
        onModeChange={setMode}
        config={config}
        onConfigPatch={handleConfigPatch}
        onSelectTheme={handleSelectTheme}
        isPlaying={isPlaying}
        onTogglePlay={() => setIsPlaying((p) => !p)}
        audioName={audioName}
        hasCustomAudio={customAudioUrl !== null}
        onAudioUpload={handleAudioUpload}
        onResetAudio={handleResetAudio}
        autoplayBlocked={autoplayBlocked}
        onUnlockAudio={unlockAudio}
        photos={galleryPhotos}
        focusedPhotoId={focusedPhotoId}
        onSelectPhoto={setFocusedPhotoId}
        onPhotoUpload={handlePhotoUpload}
        onRemovePhoto={handleRemovePhoto}
        onRestoreDefaultPhotos={handleRestoreDefaultPhotos}
        hasRemovedDefaults={removedDefaultIds.length > 0}
        handTrackingEnabled={handTrackingEnabled}
        onToggleHandTracking={handleToggleHandTracking}
        gesture={hudGesture}
        isHandPresent={isHandPresent}
        cursorRef={cursorElRef}
      />

      {handTrackingEnabled && (
        <HandTracker onHandUpdate={handleHandUpdate} accentColor={config.accentColor} />
      )}

      <div
        className="w-full h-full"
        onPointerDown={handleCanvasPointerDown}
        onPointerUp={clearHoldBloom}
        onPointerCancel={clearHoldBloom}
        onPointerLeave={clearHoldBloom}
      >
        <Suspense
          fallback={
            <div
              className="absolute inset-0 flex items-center justify-center font-display italic text-lg tracking-widest animate-pulse"
              style={{ color: config.accentColor }}
            >
              Lighting up the Christmas Tree...
            </div>
          }
        >
          <ChristmasScene
            mode={mode}
            config={config}
            photos={galleryPhotos}
            audioMetricsRef={audioMetricsRef}
            handDataRef={handDataRef}
            bloomActiveRef={bloomActiveRef}
            focusedPhotoId={focusedPhotoId}
            onSelectPhoto={setFocusedPhotoId}
            isLite={isLite}
          />
        </Suspense>
      </div>
    </div>
  );
}

export default App;
