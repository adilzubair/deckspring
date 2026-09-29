import { describe, expect, it } from 'vitest';
import { parseStudioThemeSpec } from './themes-plugin.ts';

const markdown = `---
name: "Signal Frame"
description: "A precise editorial system."
mode: light
studio-spec: 1
background: "#F6F7FB"
text: "#172033"
accent: "#3157D5"
muted: "#61708A"
surface: "#FFFFFF"
border: "#CAD2E1"
display-font: "Aptos, system-ui, sans-serif"
body-font: "Aptos, system-ui, sans-serif"
mono-font: "Consolas, monospace"
heading-weight: 700
body-weight: 400
composition: editorial
alignment: left
padding: 112
radius: 8
motif: line
motion: subtle
aesthetic: "Direct and spacious, with one cobalt rule per page."
---

## Aesthetic

Direct and spacious, with one cobalt rule per page.
`;

describe('Studio theme metadata', () => {
  it('parses a validated machine-readable specification', () => {
    const spec = parseStudioThemeSpec(markdown, 'signal-frame');
    expect(spec?.name).toBe('Signal Frame');
    expect(spec?.palette.accent).toBe('#3157D5');
    expect(spec?.layout.padding).toBe(112);
    expect(spec?.aesthetic).toMatch(/cobalt rule/);
  });

  it('leaves free-form and invalid Studio themes browseable but not Studio-ready', () => {
    expect(parseStudioThemeSpec('# Legacy theme\n\nA free-form recipe.', 'legacy')).toBeNull();
    expect(parseStudioThemeSpec(markdown.replace('#3157D5', 'blue'))).toBeNull();
    expect(parseStudioThemeSpec(markdown.replace('padding: 112', 'padding: 900'))).toBeNull();
  });

  it('keeps validated pixel themes available to the Studio deck generator', () => {
    expect(parseStudioThemeSpec(markdown.replace('motif: line', 'motif: pixel'))?.motif).toBe(
      'pixel',
    );
  });
});
