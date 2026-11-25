import Svg, { Circle, Path } from 'react-native-svg';

import { colors, type ColorName } from '@/theme/tokens';

/**
 * 24px line icons: 2.2 stroke, round caps and joins.
 * The paper plane (`send`) is the only filled icon.
 * Icons are decorative; the control that holds one provides the accessible label.
 */
const lineIcons = {
  home: ['M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z'],
  communities: ['M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5', 'M17 14.5c2.4 0 4 1.5 4.6 4'],
  chat: ['M4 5h16v11H9l-5 4z'],
  backpack: [
    'M6 9a6 6 0 0 1 12 0v10a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2z',
    'M9 5V4a3 3 0 0 1 6 0v1',
    'M9 14h6v4H9z',
  ],
  document: ['M7 3h7l5 5v13H7z', 'M14 3v5h5'],
  plane: [
    'M12 2c-.8 0-1.5.7-1.5 1.5V9L3 13.5v2l7.5-2.5v5.5L8 20.5V22l4-1 4 1v-1.5l-2.5-2V13l7.5 2.5v-2L13.5 9V3.5C13.5 2.7 12.8 2 12 2z',
  ],
  heart: ['M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z'],
  check: ['M5 12.5l4.5 4.5L19 7.5'],
  external: ['M14 4h6v6', 'M20 4l-9 9', 'M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5'],
} as const;

export type IconName = keyof typeof lineIcons | 'plus' | 'send';

export type IconProps = {
  name: IconName;
  size?: number;
  color?: ColorName;
  /** Fill the heart (liked state). */
  filled?: boolean;
};

export function Icon({ name, size = 24, color = 'navy', filled = false }: IconProps) {
  const ink = colors[color];
  const common = { width: size, height: size, viewBox: '0 0 24 24' } as const;

  if (name === 'send') {
    return (
      <Svg {...common} aria-hidden>
        <Path d="M3 11.5L21 3l-7.5 18-2.5-8z" fill={ink} />
      </Svg>
    );
  }

  if (name === 'plus') {
    return (
      <Svg {...common} aria-hidden>
        <Path
          d="M12 5v14M5 12h14"
          stroke={ink}
          strokeWidth={2.8}
          strokeLinecap="round"
          fill="none"
        />
      </Svg>
    );
  }

  return (
    <Svg {...common} aria-hidden>
      {name === 'communities' && (
        <>
          <Circle cx={9} cy={8} r={3.5} stroke={ink} strokeWidth={2.2} fill="none" />
          <Circle cx={17} cy={9} r={2.5} stroke={ink} strokeWidth={2.2} fill="none" />
        </>
      )}
      {lineIcons[name].map((d) => (
        <Path
          key={d}
          d={d}
          stroke={ink}
          strokeWidth={2.2}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill={filled && name === 'heart' ? ink : 'none'}
        />
      ))}
    </Svg>
  );
}
