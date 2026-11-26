import type { SceneConfig, ThemeId, ThemePreset } from '../types';

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'midnight-gold',
    name: '午夜蓝金',
    subtitle: '经典温暖 · 原站同款',
    swatch: ['#070b18', '#ffd98a', '#b23a48'],
    colors: {
      bgColor: '#070b18',
      accentColor: '#ffd98a',
      particleColor1: '#ffd98a',
      particleColor2: '#ff9b7a',
      boxColor1: '#b23a48',
      boxColor2: '#2e6b4f',
      ribbonColor: '#f5d27a',
      bellColor: '#f2c14e',
      garlandColors: ['#ffd98a', '#ff5964', '#9fd8ff'],
      snowGroundColor: '#a9b8d4',
      ringColor: '#ffce7a',
      starColor: '#ffd98a',
    },
  },
  {
    id: 'obsidian-gold',
    name: '黑金奢华',
    subtitle: '高对比鎏金星云',
    swatch: ['#050508', '#f5c96b', '#fff4d2'],
    colors: {
      bgColor: '#050508',
      accentColor: '#f5d078',
      particleColor1: '#f5c96b',
      particleColor2: '#fff4d2',
      boxColor1: '#23232c',
      boxColor2: '#8a6829',
      ribbonColor: '#ffe39c',
      bellColor: '#ffd97d',
      garlandColors: ['#ffe49e', '#ffb347', '#ffffff'],
      snowGroundColor: '#4a4e5e',
      ringColor: '#f5c96b',
      starColor: '#ffe49e',
    },
  },
  {
    id: 'aurora-ice',
    name: '冰雪极光',
    subtitle: '冷艳冬日冰晶',
    swatch: ['#060d1f', '#8ce6ff', '#d6b4ff'],
    colors: {
      bgColor: '#060d1f',
      accentColor: '#8be9fd',
      particleColor1: '#8ce6ff',
      particleColor2: '#d6b4ff',
      boxColor1: '#2b5d94',
      boxColor2: '#6b4c9a',
      ribbonColor: '#e2f7ff',
      bellColor: '#bfeaff',
      garlandColors: ['#7ce8ff', '#b599ff', '#e8faff'],
      snowGroundColor: '#b7d4ec',
      ringColor: '#7ce8ff',
      starColor: '#d0f5ff',
    },
  },
  {
    id: 'classic-pine',
    name: '经典松绿',
    subtitle: '传统红绿童话树',
    swatch: ['#07120e', '#49b576', '#d63e45'],
    colors: {
      bgColor: '#07120e',
      accentColor: '#ffd27d',
      particleColor1: '#48b878',
      particleColor2: '#ffd97d',
      boxColor1: '#c2363d',
      boxColor2: '#d49a3a',
      ribbonColor: '#fff0c2',
      bellColor: '#e84855',
      garlandColors: ['#ffd27d', '#ff4d5a', '#6ef2a8'],
      snowGroundColor: '#a8bfb6',
      ringColor: '#ffd27d',
      starColor: '#ffe17d',
    },
  },
];

export function getThemePreset(id: ThemeId): ThemePreset {
  return THEME_PRESETS.find((t) => t.id === id) ?? THEME_PRESETS[0];
}

export function createInitialConfig(isLite: boolean): SceneConfig {
  const preset = THEME_PRESETS[0];
  return {
    themeId: preset.id,
    particleCount: isLite ? 1500 : 4200,
    boxCount: isLite ? 70 : 180,
    bellCount: isLite ? 80 : 200,
    ...preset.colors,
  };
}
