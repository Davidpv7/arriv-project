import { useState } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Line } from 'react-native-svg';

import { colors, type ColorName } from '@/theme/tokens';

export type DashedLineProps = {
  color?: ColorName;
  thickness?: number;
  dash?: number;
  gap?: number;
  style?: StyleProp<ViewStyle>;
};

/**
 * Horizontal dashed line (perforations, boarding pass route).
 * Drawn in SVG because RN dashed borders differ between iOS, Android and web.
 */
export function DashedLine({
  color = 'perforation',
  thickness = 2,
  dash = 6,
  gap = 4,
  style,
}: DashedLineProps) {
  const [width, setWidth] = useState(0);
  return (
    <View
      style={[{ height: thickness }, style]}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
    >
      {width > 0 && (
        <Svg width={width} height={thickness}>
          <Line
            x1={0}
            y1={thickness / 2}
            x2={width}
            y2={thickness / 2}
            stroke={colors[color]}
            strokeWidth={thickness}
            strokeDasharray={`${dash} ${gap}`}
          />
        </Svg>
      )}
    </View>
  );
}
