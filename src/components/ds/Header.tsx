import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { space, touchTarget, type ColorName } from '@/theme/tokens';

import { IconButton } from './IconButton';
import { Text } from './Text';

export type HeaderProps = {
  /** DM Mono eyebrow above the title, e.g. "STEP 2 OF 4". */
  eyebrow?: string;
  title?: string;
  onBack?: () => void;
  backLabel?: string;
  right?: ReactNode;
  /** `onNavy` for navy screens. */
  tone?: 'paper' | 'navy';
};

/** Screen header: optional back button, eyebrow + title, optional right action. */
export function Header({ eyebrow, title, onBack, backLabel, right, tone = 'paper' }: HeaderProps) {
  const ink: ColorName = tone === 'navy' ? 'onNavy' : 'navy';
  return (
    <View style={styles.wrap}>
      {(onBack || right) && (
        <View style={styles.bar}>
          {onBack ? (
            <IconButton
              icon="back"
              onPress={onBack}
              accessibilityLabel={backLabel ?? ''}
              color={ink}
            />
          ) : (
            <View style={styles.spacer} />
          )}
          {right}
        </View>
      )}
      {eyebrow ? (
        <Text variant="label" color={tone === 'navy' ? 'sunshine' : 'rust'}>
          {eyebrow}
        </Text>
      ) : null}
      {title ? (
        <Text variant="title" color={ink} accessibilityRole="header">
          {title}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space[2] },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginLeft: -10,
    marginRight: -10,
  },
  spacer: { width: touchTarget, height: touchTarget },
});
