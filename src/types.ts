export type TreeMode = 'TREE' | 'FLOAT';

/** Independent scene state reserved for Phase 3 Quiet <-> Ordered Orbital Bloom */
export type SceneState = 'QUIET' | 'BLOOM';

export type GestureType = 'IDLE' | 'HOVER' | 'OPEN' | 'PINCH';

export type AppearanceId = 'midnight-glow' | 'vintage-noel' | 'memory-galaxy';

/** @deprecated Alias kept for backward compatibility during incremental upgrades */
export type ThemeId = AppearanceId;

export interface HandData {
  x: number;
  y: number;
  gesture: GestureType;
  isPresent: boolean;
  source: 'camera' | 'mouse';
}

export interface AudioMetrics {
  /** 0..255 average frequency bin energy */
  averageFrequency: number;
  /** 0..1 normalized low-mid energy for beat pulse */
  bassEnergy: number;
  /** 0..1 normalized overall amplitude */
  level: number;
}

export interface AppearanceSpaceConfig {
  /** Far layer: deep sky zenith & horizon colors + slow stardust */
  skyZenith: string;
  skyHorizon: string;
  farDustColor1: string;
  farDustColor2: string;
  farDustSpeed: number;
  farDustOpacity: number;
  /** Midground layer: soft breathing atmospheric mist / nebula */
  nebulaPrimary: string;
  nebulaSecondary: string;
  nebulaWarmCore: string;
  nebulaOpacity: number;
  nebulaDriftSpeed: number;
  nebulaBreathSpeed: number;
  /** Foreground layer: fine snow + defocused near bokeh */
  snowColor: string;
  bokehWarmColor: string;
  snowFallMultiplier: number;
  /** Ground layer: elliptical feathered halo & scattered ground shimmer */
  groundCoreColor: string;
  groundMidColor: string;
  groundEmberColor: string;
  groundGlowOpacity: number;
}

export interface AppearanceLightingConfig {
  ambientIntensity: number;
  keyColor: string;
  keyIntensity: number;
  rimColor: string;
  rimIntensity: number;
  envWarmColor: string;
  envCoolColor: string;
  exposure: number;
  fogColor: string;
  fogNear: number;
  fogFar: number;
  bloomThreshold: number;
  bloomIntensity: number;
  bloomRadius: number;
  vignetteDarkness: number;
}

export interface AppearanceUIConfig {
  glassBg: string;
  glassBorder: string;
  dockBg: string;
  dockBorder: string;
  textPrimary: string;
  textSecondary: string;
  accent: string;
  ivory: string;
  velvetAccent: string;
  bloomIdleBg: string;
  bloomIdleBorder: string;
  bloomActiveBg: string;
  bloomActiveBorder: string;
}

export interface AppearanceMotionConfig {
  treeRotationSpeed: number;
  garlandFlowSpeed: number;
  twinkleIntensity: number;
}

export interface AppearanceConfig {
  id: AppearanceId;
  name: string;
  englishName: string;
  tagline: string;
  /** False for appearances scheduled in Phase 2 so the UI shows upcoming cards gracefully */
  available: boolean;
  previewGradient: string;
  swatches: [string, string, string, string, string];
  space: AppearanceSpaceConfig;
  lighting: AppearanceLightingConfig;
  ui: AppearanceUIConfig;
  motion: AppearanceMotionConfig;
  defaults: {
    bgColor: string;
    accentColor: string;
    particleColor1: string;
    particleColor2: string;
    starColor: string;
    garlandColors: [string, string, string];
    boxColor1: string;
    boxColor2: string;
    ribbonColor: string;
    bellColor: string;
    boxCountDesktop: number;
    boxCountLite: number;
    bellCountDesktop: number;
    bellCountLite: number;
    particleCountDesktop: number;
    particleCountLite: number;
    boxMetalness: number;
    boxRoughness: number;
    bellMetalness: number;
    bellRoughness: number;
  };
}

export interface SceneConfig {
  appearanceId: AppearanceId;
  bgColor: string;
  accentColor: string;
  particleCount: number;
  particleColor1: string;
  particleColor2: string;
  boxCount: number;
  bellCount: number;
  boxColor1: string;
  boxColor2: string;
  ribbonColor: string;
  bellColor: string;
  garlandColors: [string, string, string];
  snowGroundColor: string;
  ringColor: string;
  starColor: string;
}

export interface GalleryPhoto {
  id: string;
  url: string;
  caption: string;
  isDefault: boolean;
}
