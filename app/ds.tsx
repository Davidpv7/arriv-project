import type { ReactNode } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import {
  BoardingPass,
  Button,
  DepartureBoard,
  DepartureRow,
  FileChip,
  Input,
  LuggageTag,
  Notice,
  Postcard,
  Postmark,
  Screen,
  Stamp,
  TabBar,
  Text,
  type TabKey,
} from '@/components/ds';
import {
  colors,
  radius,
  space,
  typography,
  type ColorName,
  type TypographyVariant,
} from '@/theme/tokens';

/** Colours whose swatch label must be light (on-navy) to stay readable. */
const DARK_SWATCHES: ColorName[] = [
  'navy',
  'teal',
  'rust',
  'muted',
  'airmailRed',
  'airmailBlue',
  'boardDivider',
  'scrim',
];

function Section({
  title,
  children,
  testID,
}: {
  title: string;
  children: ReactNode;
  testID?: string;
}) {
  return (
    <View style={styles.section} testID={testID}>
      <Text variant="label" color="rust" accessibilityRole="header">
        {title}
      </Text>
      {children}
    </View>
  );
}

/** Storybook-like screen: every DS component with sample content. */
export default function DesignSystemScreen() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Exclude<TabKey, 'create'>>('home');
  const [liked, setLiked] = useState(false);
  const [handle, setHandle] = useState('ana costa');
  const likeCount = 48 + (liked ? 1 : 0);

  const tabLabels: Record<TabKey, string> = {
    home: t('tabs.home'),
    communities: t('tabs.communities'),
    create: t('tabs.create'),
    chat: t('tabs.chat'),
    backpack: t('tabs.backpack'),
  };

  return (
    <Screen scroll>
      <View style={styles.stack}>
        <View style={styles.intro}>
          <Text variant="title" accessibilityRole="header">
            {t('ds.title')}
          </Text>
          <Text variant="body" color="muted">
            {t('ds.intro')}
          </Text>
        </View>

        <Section title={t('ds.colours')}>
          <View style={styles.swatches}>
            {(Object.keys(colors) as ColorName[]).map((name) => (
              <View key={name} style={[styles.swatch, { backgroundColor: colors[name] }]}>
                <Text variant="label" color={DARK_SWATCHES.includes(name) ? 'onNavy' : 'navy'}>
                  {name}
                </Text>
                <Text variant="label" color={DARK_SWATCHES.includes(name) ? 'onNavy' : 'navy'}>
                  {colors[name]}
                </Text>
              </View>
            ))}
          </View>
        </Section>

        <Section title={t('ds.type')}>
          {(Object.keys(typography) as TypographyVariant[]).map((variant) => (
            <View key={variant} style={styles.typeRow}>
              <Text variant="label" color="muted">
                {`${variant} · ${typography[variant].fontSize}px`}
              </Text>
              <Text variant={variant}>{t(`ds.sample.${variant}`)}</Text>
            </View>
          ))}
        </Section>

        <Section title={t('ds.buttons')}>
          <View style={styles.row}>
            <Button label={t('ds.sample.join')} />
            <Button
              label={t('ds.sample.officialPage')}
              variant="secondary"
              icon="external"
              iconPosition="end"
            />
            <Button label={t('ds.sample.newCrew')} variant="dark" />
          </View>
          <View style={[styles.row, styles.navyPanel]}>
            <Button label={t('ds.sample.message')} />
            <Button label={t('ds.sample.officialPage')} variant="onNavy" />
          </View>
          <View style={styles.row}>
            <Button label={t('ds.sample.join')} size="lg" loading />
            <Button label={t('ds.sample.join')} disabled />
          </View>
        </Section>

        <Section title={t('ds.inputs')}>
          <Input
            label={t('ds.sample.emailLabel')}
            placeholder={t('ds.sample.emailPlaceholder')}
            hint={t('ds.sample.emailHint')}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Input
            label={t('ds.sample.handleLabel')}
            value={handle}
            onChangeText={setHandle}
            autoCapitalize="none"
            error={/^[a-z0-9_]{3,20}$/.test(handle) ? undefined : t('ds.sample.handleError')}
          />
          <Input label={t('ds.sample.bioLabel')} multiline />
        </Section>

        <Section title={t('ds.stamps')}>
          <View style={styles.row}>
            <Stamp label="SN" tilt="md" />
            <Stamp label="LS" fill="sky" direction={-1} />
            <Stamp
              label={t('ds.sample.visas')}
              size="lg"
              fill="card"
              icon="document"
              direction={-1}
              onPress={() => {}}
            />
            <Stamp label={t('ds.sample.lawyers')} size="lg" fill="sunshine" onPress={() => {}} />
          </View>
        </Section>

        <Section title={t('ds.postmarks')}>
          <View style={[styles.row, styles.cardPanel]}>
            <Postmark
              direction={-1}
              lines={[
                { text: t('ds.sample.prGranted') },
                { text: t('ds.sample.stampDate'), style: 'mono' },
              ]}
            />
            <Postmark
              ink="rust"
              lines={[
                { text: t('ds.sample.subclass'), style: 'mono' },
                { text: '500', style: 'big' },
                { text: t('ds.sample.granted') },
              ]}
            />
            <Postmark
              size={66}
              lines={[{ text: t('ds.sample.verified'), style: 'mono' }, { text: '✓' }]}
            />
          </View>
        </Section>

        <Section title={t('ds.boardingPass')}>
          <BoardingPass
            eyebrowStart={t('boardingPass.eyebrow')}
            eyebrowEnd={t('boardingPass.carrier')}
            name={t('ds.sample.name')}
            from={{ code: 'GRU', city: t('ds.sample.fromCity') }}
            to={{ code: 'SYD', city: t('ds.sample.toCity') }}
            fields={[
              { label: t('boardingPass.visa'), value: '500' },
              { label: t('boardingPass.day'), value: '412' },
              { label: t('boardingPass.stamps'), value: '5' },
            ]}
            showPlane
          />
          <View style={styles.navyPanel}>
            <BoardingPass
              background="navy"
              eyebrowStart={t('boardingPass.eyebrow')}
              from={{ code: t('ds.sample.unknown') }}
              to={{ code: 'AUS', city: t('ds.sample.australia') }}
              fields={[
                { label: t('boardingPass.visa'), value: '—' },
                { label: t('boardingPass.day'), value: '1' },
                { label: t('boardingPass.stamps'), value: '0' },
              ]}
            />
          </View>
        </Section>

        <Section title={t('ds.postcard')}>
          <Postcard
            author={{ name: t('ds.sample.author'), initials: 'M' }}
            meta={t('ds.sample.postMeta')}
            community={{ initials: 'SN', name: t('ds.sample.communityName') }}
            body={t('ds.sample.postBody')}
            postmark={{
              lines: [
                { text: t('ds.sample.prGranted') },
                { text: t('ds.sample.stampDate'), style: 'mono' },
              ],
            }}
            likes={{
              count: likeCount,
              label: t('postcard.likes', { count: likeCount }),
              accessibilityLabel: t('postcard.likeA11y', { count: likeCount }),
              liked,
              onPress: () => setLiked((v) => !v),
            }}
            comments={{ label: t('postcard.comments', { count: 12 }) }}
            action={{ label: t('postcard.sendPostcard') }}
          />
        </Section>

        <Section title={t('ds.departures')}>
          <DepartureBoard
            accessibilityLabel={t('board.label')}
            columns={{ crew: t('board.crew'), gate: t('board.gate'), status: t('board.status') }}
          >
            <DepartureRow
              name={t('ds.sample.crew1')}
              gate="SYD"
              joined
              statusLabel={t('board.joined')}
            />
            <DepartureRow
              name={t('ds.sample.crew2')}
              gate="SYD"
              joined={false}
              statusLabel={t('board.boardAction')}
            />
            <DepartureRow
              name={t('ds.sample.crew3')}
              gate="AU"
              joined={false}
              statusLabel={t('board.boardAction')}
              isLast
            />
          </DepartureBoard>
        </Section>

        <Section title={t('ds.luggage')}>
          <View style={styles.row}>
            <LuggageTag
              code="TAG 001"
              name={t('ds.sample.identity')}
              countLabel={t('backpack.files', { count: 3 })}
              direction={-1}
            />
            <LuggageTag
              code="TAG 002"
              name={t('ds.sample.visasFolder')}
              countLabel={t('backpack.files', { count: 5 })}
              fill="sky"
            />
            <LuggageTag
              code="TAG 003"
              name={t('ds.sample.police')}
              countLabel={t('backpack.files', { count: 1 })}
              fill="card"
              direction={-1}
            />
          </View>
          <FileChip fileName={t('ds.sample.fileName')} />
        </Section>

        <Section title={t('ds.notice')}>
          <Notice eyebrow={t('notice.customsEyebrow')} body={t('notice.customsBody')} />
        </Section>

        <Section title={t('ds.tabBar')} testID="ds-tabbar">
          <View style={styles.tabBarPreview}>
            <TabBar
              active={tab}
              labels={tabLabels}
              ignoreSafeArea
              onPress={(key) => {
                if (key !== 'create') setTab(key);
              }}
            />
          </View>
        </Section>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  stack: { gap: space[6] + space[2], paddingBottom: space[6] },
  intro: { gap: space[2] },
  section: { gap: space[3] },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: space[4], alignItems: 'center' },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
  swatch: {
    width: 104,
    height: 72,
    borderRadius: radius.stamp,
    padding: space[2],
    justifyContent: 'flex-end',
    borderWidth: 1,
    borderColor: colors.rule,
  },
  typeRow: { gap: space[1] },
  navyPanel: { backgroundColor: colors.navy, borderRadius: radius.card, padding: space[4] },
  cardPanel: { backgroundColor: colors.card, borderRadius: radius.card, padding: space[4] },
  tabBarPreview: { paddingTop: 36 },
});
