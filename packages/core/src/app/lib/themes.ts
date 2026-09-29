import { loadThemeDemo as load, themes as raw } from 'virtual:deckspring/themes';
import type { DesignSystem } from './design';
import type { Page } from './sdk';

export type Theme = {
  id: string;
  name: string;
  description: string;
  mode: 'light' | 'dark' | null;
  body: string;
  hasDemo: boolean;
  studioReady: boolean;
  studioSpec: ThemeSpecV1 | null;
};

export type ThemeSpecV1 = {
  version: 1;
  name: string;
  description: string;
  mode: 'light' | 'dark';
  palette: {
    background: string;
    text: string;
    accent: string;
    muted: string;
    surface: string;
    border: string;
  };
  typography: {
    display: string;
    body: string;
    mono: string;
    headingWeight: number;
    bodyWeight: number;
  };
  layout: {
    composition: 'editorial' | 'modular' | 'split' | 'poster';
    alignment: 'left' | 'center';
    padding: number;
    radius: number;
  };
  motif: 'line' | 'block' | 'dot' | 'frame' | 'glow' | 'pixel';
  motion: 'static' | 'subtle' | 'rich';
  aesthetic: string;
};

export type ThemeDemoModule = {
  default: Page[];
  design?: DesignSystem;
};

export const themes: Theme[] = raw;

export async function loadThemeDemo(id: string): Promise<ThemeDemoModule> {
  return load(id);
}
