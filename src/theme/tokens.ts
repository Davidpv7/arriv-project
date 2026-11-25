/**
 * Arriv design tokens ("Travel & passport").
 *
 * Source of truth: the Arriv design system (mirrored in docs/design/tokens.json).
 * `src/theme/tokens.test.ts` fails if this file drifts from that JSON.
 * Screens and components must take every colour, space, radius, font and tilt from here.
 */

export const colors = {
  /** Passport Navy. Main text, tab bar, passport cover, departures board, stamp outlines. */
  navy: '#1F2A44',
  /** App background. Also the perforation notches cut into tickets and tags. */
  paper: '#F7F0E1',
  /** Cards, postcards, passport pages, input fields. */
  card: '#FFFDF7',
  /** Primary action, active tab, key stamps. Always navy text on it, never white. */
  tangerine: '#FF7A2F',
  /** Centre + button, customs notices, highlights, text on navy board rows. */
  sunshine: '#FFD15C',
  /** Info and visa-related fills, avatars. */
  sky: '#A9D4FF',
  /** Stamp ink for verified and positive states. */
  teal: '#1F6B66',
  /** Orange as text: eyebrows, links, alerts, postmark ink. */
  rust: '#B8480C',
  /** Secondary text and mono meta on paper or card. */
  muted: '#5A6278',
  /** Text and icons on navy. */
  onNavy: '#F7F0E1',
  /** Secondary text on navy. */
  onNavyMuted: '#C9D0E0',
  /** Positive status text on the departures board (JOINED). */
  boardGreen: '#7FD1C7',
  /** Hairlines and dashed dividers on card. */
  rule: '#E6D9BF',
  /** Perforation line across tickets; placeholder stamp outlines. */
  perforation: '#D8C9A8',
  /** Decorative airmail stripe only. */
  airmailRed: '#D64545',
  /** Decorative airmail stripe only. */
  airmailBlue: '#2E5AA8',
  /**
   * Row divider on the navy departures board. Taken from the DepartureRow preview
   * in the design system; not yet a named token in tokens.json.
   */
  boardDivider: '#3A4766',
  /** Dimmed backdrop behind dialogs: navy at 55%. Not yet a named token in tokens.json. */
  scrim: 'rgba(31, 42, 68, 0.55)',
} as const;

export type ColorName = keyof typeof colors;

/** Fills that may carry content. Content on them is always `navy`. */
export type FillColor = 'tangerine' | 'sunshine' | 'sky' | 'card';

export const space = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  /** Screen side padding. */
  5: 20,
  6: 24,
} as const;

export const radius = {
  postcard: 6,
  stamp: 8,
  ticket: 16,
  card: 20,
  sheet: 28,
  pill: 999,
} as const;

export const tilt = {
  /** Tags, tickets and shortcut stamps. Alternate + and -. */
  sm: 2,
  /** Stickers, community stamps, the centre + button. */
  md: 6,
  /** Round postmarks only. */
  lg: 12,
} as const;

export type Tilt = keyof typeof tilt;

/** Rotation transform for decorative pieces only (never text blocks or inputs). */
export const rotate = (size: Tilt, direction: 1 | -1 = 1) => [
  { rotate: `${tilt[size] * direction}deg` },
];

/** The only shadow: a flat 2px paper edge. */
export const shadow = {
  paper: { boxShadow: `0 2px 0 ${colors.rule}` },
} as const;

/**
 * Loaded font faces. React Native needs one family name per weight, so styles
 * pick a face rather than setting `fontWeight` (which breaks custom fonts on Android).
 */
export const fonts = {
  sans600: 'Nunito_600SemiBold',
  sans700: 'Nunito_700Bold',
  sans800: 'Nunito_800ExtraBold',
  sans900: 'Nunito_900Black',
  mono500: 'DMMono_500Medium',
} as const;

type TextStyleToken = {
  fontFamily: (typeof fonts)[keyof typeof fonts];
  fontSize: number;
  lineHeight: number;
  letterSpacing?: number;
  textTransform?: 'uppercase';
};

const lh = (fontSize: number, ratio: number) => Math.round(fontSize * ratio);

export const typography = {
  /** Welcome and hero moments. */
  display: {
    fontFamily: fonts.sans900,
    fontSize: 40,
    lineHeight: lh(40, 1.05),
    letterSpacing: -0.5,
  },
  /** Screen titles. */
  title: { fontFamily: fonts.sans900, fontSize: 30, lineHeight: lh(30, 1.1), letterSpacing: -0.5 },
  /** Card titles, names. */
  heading: { fontFamily: fonts.sans900, fontSize: 19, lineHeight: lh(19, 1.2) },
  /** Posts, messages, descriptions. */
  body: { fontFamily: fonts.sans600, fontSize: 15, lineHeight: lh(15, 1.45) },
  /** Secondary lines under names and titles. */
  meta: { fontFamily: fonts.sans700, fontSize: 13, lineHeight: lh(13, 1.3) },
  /** Uppercase travel labels: eyebrows, ticket fields, stamp dates, timestamps. */
  label: {
    fontFamily: fonts.mono500,
    fontSize: 11,
    lineHeight: lh(11, 1.3),
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  /** Departures board rows, file names on receipts. */
  labelLg: {
    fontFamily: fonts.mono500,
    fontSize: 13,
    lineHeight: lh(13, 1.3),
    textTransform: 'uppercase',
  },
} as const satisfies Record<string, TextStyleToken>;

export type TypographyVariant = keyof typeof typography;

/** Minimum touch target (px). */
export const touchTarget = 44;

export const tokens = {
  colors,
  space,
  radius,
  tilt,
  shadow,
  fonts,
  typography,
  touchTarget,
} as const;
