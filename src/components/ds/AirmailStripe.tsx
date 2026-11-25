import { useId, useState } from 'react';
import { View } from 'react-native';
import Svg, { Defs, Pattern, Rect } from 'react-native-svg';

import { colors } from '@/theme/tokens';

/** The 6px diagonal red / card / blue / card stripe along a postcard's top edge. Decorative only. */
export function AirmailStripe({ height = 6 }: { height?: number }) {
  const [width, setWidth] = useState(0);
  const id = `airmail-${useId().replace(/:/g, '')}`;

  return (
    <View
      style={{ height }}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
    >
      {width > 0 && (
        <Svg width={width} height={height}>
          <Defs>
            <Pattern
              id={id}
              patternUnits="userSpaceOnUse"
              width={28}
              height={28}
              patternTransform="rotate(45)"
            >
              <Rect x={0} y={0} width={28} height={28} fill={colors.card} />
              <Rect x={0} y={0} width={7} height={28} fill={colors.airmailRed} />
              <Rect x={14} y={0} width={7} height={28} fill={colors.airmailBlue} />
            </Pattern>
          </Defs>
          <Rect x={0} y={0} width={width} height={height} fill={`url(#${id})`} />
        </Svg>
      )}
    </View>
  );
}
