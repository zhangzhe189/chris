/** Independent scene state: Quiet (complete tree) vs Bloom (ordered 3D orbital galaxy) */
export type SceneState = 'QUIET' | 'BLOOM';

export type GestureType = 'IDLE' | 'FIST' | 'OPEN' | 'PINCH' | 'POINT';

export type AppearanceId = 'midnight-glow' | 'vintage-noel' | 'memory-galaxy';

/** @deprecated Alias kept for backward compatibility during incremental upgrades */
export type ThemeId = AppearanceId;

export type OrnamentStyle = 'velvet' | 'vintage' | 'crystal';

export interface HandData {
  /** Normalized 0..1 mirrored screen X */
  x: number;
  /** Normalized 0..1 screen Y */
  y: number;
  /** Smoothed frame delta X for inertial galaxy exploration */
  vx: number;
  /** Smoothed frame delta Y for subtle pitch exploration */
  vy: number;
  gesture: GestureType;
  isPresent: boolean;
  source: 'camera' | 'mouse';
}

export interface SnowBurstRequest {
  id: number;
  /** Normalized screen X in [0..1] */
  nx: number;
  /** Normalized screen Y in [0..1] */
  ny: number;
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
  skyZenith: string;
  skyHorizon: string;
  farDustColor1: string;
  farDustColor2: string;
  farDustSpeed: number;
  farDustOpacity: number;
  nebulaPrimary: string;
  nebulaSecondary: string;
  nebulaWarmCore: string;
  nebulaOpacity: number;
  nebulaDriftSpeed: number;
  nebulaBreathSpeed: number;
  snowColor: string;
  bokehWarmColor: string;
  snowFallMultiplier: number;
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
  fillColor: string;
  fillIntensity: number;
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
  candleFlicker: boolean;
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
  polaroidFloatAmp: number;
}

export interface AppearanceFeaturesConfig {
  ornamentStyle: OrnamentStyle;
  orbitalRings: boolean;
  orbitalRingPrimary: string;
  orbitalRingSecondary: string;
  polaroidPaperTop: string;
  polaroidPaperBottom: string;
  polaroidBorderTint: string;
  polaroidCaptionColor: string;
}

export interface AppearanceConfig {
  id: AppearanceId;
  name: string;
  englishName: string;
  tagline: string;
  available: boolean;
  previewGradient: string;
  swatches: [string, string, string, string, string];
  space: AppearanceSpaceConfig;
  lighting: AppearanceLightingConfig;
  ui: AppearanceUIConfig;
  motion: AppearanceMotionConfig;
  features: AppearanceFeaturesConfig;
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
