import source from '../../docs/design/tokens.json';

import { colors, radius, space, tilt, typography } from './tokens';

const camel = (name: string) => name.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
const px = (v: string) => Number(v.replace(/px|deg/, ''));

describe('tokens.ts mirrors docs/design/tokens.json', () => {
  it.each(source.color.tokens.map((t) => [t.name, t.value]))('colour %s = %s', (name, value) => {
    expect(colors[camel(name) as keyof typeof colors]).toBe(value);
  });

  it.each(source.spacing.tokens.map((t) => [t.name, t.value]))('%s = %s', (name, value) => {
    const step = Number(name.replace('space-', '')) as keyof typeof space;
    expect(space[step]).toBe(px(value));
  });

  it.each(source.radius.tokens.map((t) => [t.name, t.value]))('%s = %s', (name, value) => {
    const key = name.replace('radius-', '') as keyof typeof radius;
    expect(radius[key]).toBe(px(value));
  });

  it.each(source.tilt.tokens.map((t) => [t.name, t.value]))('%s = %s', (name, value) => {
    const key = name.replace('tilt-', '') as keyof typeof tilt;
    expect(tilt[key]).toBe(px(value));
  });

  it.each(source.type.groups.flatMap((g) => g.styles).map((s) => [s.name, s.fontSize]))(
    'type %s is %s',
    (name, size) => {
      const key = camel(name) as keyof typeof typography;
      expect(typography[key].fontSize).toBe(px(size));
    },
  );
});

// WCAG 2.x relative luminance contrast.
const luminance = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

describe('text colour pairs from the design system meet 4.5:1', () => {
  const pairs: [keyof typeof colors, keyof typeof colors][] = [
    ['navy', 'paper'],
    ['navy', 'card'],
    ['navy', 'tangerine'],
    ['navy', 'sunshine'],
    ['navy', 'sky'],
    ['rust', 'paper'],
    ['rust', 'card'],
    ['teal', 'card'],
    ['teal', 'paper'],
    ['muted', 'paper'],
    ['muted', 'card'],
    ['onNavy', 'navy'],
    ['onNavyMuted', 'navy'],
    ['sunshine', 'navy'],
    ['boardGreen', 'navy'],
  ];

  it.each(pairs)('%s on %s', (fg, bg) => {
    expect(contrast(colors[fg], colors[bg])).toBeGreaterThanOrEqual(4.5);
  });
});
