import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors, fonts, radius, space, touchTarget, type FillColor } from '@/theme/tokens';

import { AirmailStripe } from './AirmailStripe';
import { Avatar } from './Avatar';
import { Button } from './Button';
import { Icon } from './Icon';
import { Postmark, type PostmarkProps } from './Postmark';
import { Stamp } from './Stamp';
import { Text } from './Text';

export type PostcardProps = {
  author: { name: string; initials: string; avatarUri?: string | null; avatarFill?: FillColor };
  /** DM Mono line under the name, e.g. "SYDNEY NEWCOMERS · 2H". */
  meta: string;
  community?: { initials: string; fill?: FillColor; name: string };
  body: string;
  /** Journey updates only: one postmark to the right of the text. */
  postmark?: Omit<PostmarkProps, 'size'>;
  /** Images, a question tag, etc. go between body and footer. */
  children?: ReactNode;
  likes: {
    count: number;
    label: string;
    liked?: boolean;
    onPress?: () => void;
    accessibilityLabel: string;
  };
  comments: { label: string; onPress?: () => void };
  action?: { label: string; onPress?: () => void };
  onPress?: () => void;
};

/** A feed post as a postcard. Plain posts and questions share it; journey updates add a postmark. */
export function Postcard({
  author,
  meta,
  community,
  body,
  postmark,
  children,
  likes,
  comments,
  action,
  onPress,
}: PostcardProps) {
  return (
    <View style={styles.card}>
      <AirmailStripe />
      <Pressable
        onPress={onPress}
        disabled={!onPress}
        style={styles.content}
        accessibilityRole={onPress ? 'link' : undefined}
      >
        <View style={styles.head}>
          <Avatar initials={author.initials} uri={author.avatarUri} fill={author.avatarFill} />
          <View style={styles.who}>
            <Text style={styles.name} numberOfLines={1}>
              {author.name}
            </Text>
            <Text variant="label" color="muted" style={styles.meta} numberOfLines={1}>
              {meta}
            </Text>
          </View>
          {community && (
            <Stamp
              label={community.initials}
              fill={community.fill}
              accessibilityLabel={community.name}
            />
          )}
        </View>

        <View style={styles.bodyRow}>
          <Text variant="body" style={styles.flex}>
            {body}
          </Text>
          {postmark && (
            <View style={styles.postmark}>
              <Postmark {...postmark} size={88} />
            </View>
          )}
        </View>
        {children}
      </Pressable>

      <View style={styles.foot}>
        <Pressable
          onPress={likes.onPress}
          accessibilityRole="button"
          accessibilityLabel={likes.accessibilityLabel}
          accessibilityState={{ selected: !!likes.liked }}
          style={styles.footAction}
          hitSlop={4}
        >
          <Icon name="heart" size={20} color={likes.liked ? 'rust' : 'navy'} filled={likes.liked} />
          <Text style={styles.footText}>{likes.label}</Text>
        </Pressable>
        <Pressable
          onPress={comments.onPress}
          accessibilityRole="button"
          style={styles.footAction}
          hitSlop={4}
        >
          <Icon name="chat" size={20} />
          <Text style={styles.footText}>{comments.label}</Text>
        </Pressable>
        {action && (
          <View style={styles.footEnd}>
            <Button label={action.label} variant="secondary" onPress={action.onPress} />
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.postcard,
    overflow: 'hidden',
  },
  content: { paddingTop: space[3], paddingHorizontal: space[4], gap: 10 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  who: { flex: 1 },
  name: { fontFamily: fonts.sans800, fontSize: 16, lineHeight: 20 },
  meta: { fontSize: 12 },
  bodyRow: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  postmark: { marginRight: -space[1] },
  foot: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    columnGap: space[4],
    rowGap: space[1],
    marginTop: space[3],
    marginHorizontal: space[4],
    paddingBottom: space[3],
    borderTopWidth: 1,
    borderTopColor: colors.rule,
    paddingTop: space[1],
  },
  footAction: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: touchTarget },
  footText: { fontFamily: fonts.sans800, fontSize: 14, lineHeight: 18 },
  footEnd: { marginLeft: 'auto' },
  flex: { flex: 1 },
});
