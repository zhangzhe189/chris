export type TreeMode = 'TREE' | 'FLOAT';

export type GestureType = 'IDLE' | 'HOVER' | 'OPEN' | 'PINCH';

export type ThemeId =
  | 'midnight-gold'
  | 'obsidian-gold'
  | 'aurora-ice'
  | 'classic-pine';

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

export interface SceneConfig {
  themeId: ThemeId;
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

export interface ThemePreset {
  id: ThemeId;
  name: string;
  subtitle: string;
  swatch: [string, string, string];
  colors: Omit<SceneConfig, 'themeId' | 'particleCount' | 'boxCount' | 'bellCount'>;
}

export interface GalleryPhoto {
  id: string;
  url: string;
  caption: string;
  isDefault: boolean;
}
