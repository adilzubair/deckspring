export type DesignPalette = {
  bg: string;
  text: string;
  accent: string;
};

export type DesignFonts = {
  display: string;
  body: string;
};

export type DesignTypeScale = {
  hero: number;
  body: number;
};

export type DesignSystem = {
  palette: DesignPalette;
  fonts: DesignFonts;
  typeScale: DesignTypeScale;
  radius: number;
};

export function designToCssVars(d: DesignSystem): Record<string, string> {
  return {
    '--dsp-bg': d.palette.bg,
    '--dsp-text': d.palette.text,
    '--dsp-accent': d.palette.accent,
    '--dsp-font-display': d.fonts.display,
    '--dsp-font-body': d.fonts.body,
    '--dsp-size-hero': `${d.typeScale.hero}px`,
    '--dsp-size-body': `${d.typeScale.body}px`,
    '--dsp-radius': `${d.radius}px`,
  };
}

export function cssVarsToString(vars: Record<string, string>): string {
  return Object.entries(vars)
    .map(([k, v]) => `  ${k}: ${v};`)
    .join('\n');
}

export const defaultDesign: DesignSystem = {
  palette: {
    bg: '#f7f5f0',
    text: '#1a1814',
    accent: '#6d4cff',
  },
  fonts: {
    display: 'Georgia, "Times New Roman", serif',
    body: '-apple-system, BlinkMacSystemFont, "Inter", system-ui, sans-serif',
  },
  typeScale: {
    hero: 168,
    body: 36,
  },
  radius: 12,
};
