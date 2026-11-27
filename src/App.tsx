import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import {
  createSceneConfigFromAppearance,
  getAppearance,
  loadSavedAppearanceId,
  saveAppearanceId,
} from './config/appearances';
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
  AppearanceId,
  GalleryPhoto,
  GestureType,
  HandData,
  SceneConfig,
  SceneState,
  SnowBurstRequest,
} from './types';

function detectLiteMode(): boolean {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).has('lite');
}

export function App() {
  const isLite = useMemo(() => detectLiteMode(), []);

  // Appearance and SceneState are strictly independent
  const [appearanceId, setAppearanceId] = useState<AppearanceId>(() => loadSavedAppearanceId());
  const appearance = useMemo(() => getAppearance(appearanceId), [appearanceId]);
  const [sceneState, setSceneState] = useState<SceneState>('QUIET');

  const [config, setConfig] = useState<SceneConfig>(() =>
    createSceneConfigFromAppearance(getAppearance(loadSavedAppearanceId()), isLite)
  );

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
    vx: 0,
    vy: 0,
    gesture: 'IDLE',
    isPresent: false,
    source: 'mouse',
  });
  const burstQueueRef = useRef<SnowBurstRequest[]>([]);
  const nextBurstIdRef = useRef(1);
  const lastTapBurstAtRef = useRef(0);
  const cursorElRef = useRef<HTMLDivElement | null>(null);
  const customAudioUrlRef = useRef<string | null>(null);

  const { audioMetricsRef, autoplayBlocked, unlockAudio } = useAudioEngine({
    isPlaying,
    customAudioUrl,
  });

  // Sync document title and body void background smoothly with active Appearance
  useEffect(() => {
    document.title = `Christmas Wonderland · ${appearance.name}`;
    document.body.style.backgroundColor = appearance.defaults.bgColor;
  }, [appearance]);

  // Load persisted photos from IndexedDB on mount (never wipes user data)
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
        // Ignore IndexedDB unavailability
      });

    return () => {
      active = false;
      createdUrls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, []);

  useEffect(() => {
    return () => {
      if (customAudioUrlRef.current) {
        URL.revokeObjectURL(customAudioUrlRef.current);
      }
    };
  }, []);

  // Escape closes focused Polaroid; Space toggles Quiet <-> Bloom
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setFocusedPhotoId(null);
      } else if (e.code === 'Space' && e.target === document.body) {
        e.preventDefault();
        setSceneState((prev) => (prev === 'QUIET' ? 'BLOOM' : 'QUIET'));
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const galleryPhotos = useMemo<GalleryPhoto[]>(() => {
    const activeDefaults = DEFAULT_POSTCARDS.filter((p) => !removedDefaultIds.includes(p.id));
    return [...userPhotos, ...activeDefaults];
  }, [userPhotos, removedDefaultIds]);

  useEffect(() => {
    if (focusedPhotoId && !galleryPhotos.some((p) => p.id === focusedPhotoId)) {
      setFocusedPhotoId(null);
    }
  }, [focusedPhotoId, galleryPhotos]);

  const handleSelectAppearance = useCallback(
    (nextId: AppearanceId) => {
      const next = getAppearance(nextId);
      setAppearanceId(next.id);
      saveAppearanceId(next.id);
      setConfig((prev) => ({
        ...createSceneConfigFromAppearance(next, isLite),
        particleCount: prev.particleCount,
        boxCount: prev.boxCount,
        bellCount: prev.bellCount,
      }));
    },
    [isLite]
  );

  const handleConfigPatch = useCallback((patch: Partial<SceneConfig>) => {
    setConfig((prev) => ({ ...prev, ...patch }));
  }, []);

  const handleToggleBloom = useCallback(() => {
    setSceneState((prev) => (prev === 'QUIET' ? 'BLOOM' : 'QUIET'));
  }, []);

  const queueSnowBurst = useCallback((nx: number, ny: number) => {
    const now = performance.now();
    if (now - lastTapBurstAtRef.current < 160) return;
    lastTapBurstAtRef.current = now;
    if (burstQueueRef.current.length < 6) {
      burstQueueRef.current.push({
        id: nextBurstIdRef.current++,
        nx,
        ny,
      });
    }
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
          vx: 0,
          vy: 0,
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

  return (
    <div
      className="w-full h-screen text-white overflow-hidden relative transition-colors duration-700"
      style={{ background: config.bgColor }}
    >
      <HudOverlay
        sceneState={sceneState}
        onSceneStateChange={setSceneState}
        appearance={appearance}
        onSelectAppearance={handleSelectAppearance}
        config={config}
        onConfigPatch={handleConfigPatch}
        onToggleBloom={handleToggleBloom}
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
        <HandTracker
          onHandUpdate={handleHandUpdate}
          onRequestSceneState={setSceneState}
          onPointBurst={queueSnowBurst}
          accentColor={config.accentColor}
        />
      )}

      <div className="w-full h-full">
        <Suspense
          fallback={
            <div
              className="absolute inset-0 flex items-center justify-center font-editorial italic text-xl tracking-[0.16em] animate-pulse"
              style={{ color: appearance.ui.ivory }}
            >
              Entering Christmas Wonderland...
            </div>
          }
        >
          <ChristmasScene
            sceneState={sceneState}
            appearance={appearance}
            config={config}
            photos={galleryPhotos}
            audioMetricsRef={audioMetricsRef}
            handDataRef={handDataRef}
            burstQueueRef={burstQueueRef}
            focusedPhotoId={focusedPhotoId}
            onSelectPhoto={setFocusedPhotoId}
            onTriggerSkyBurst={queueSnowBurst}
            isLite={isLite}
          />
        </Suspense>
      </div>
    </div>
  );
}

export default App;
