import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import {
  BoardingPass,
  Button,
  Card,
  Notice,
  Postmark,
  Stamp,
  Text,
  type IconName,
} from '@/components/ds';
import { colors, fonts, space } from '@/theme/tokens';

const FEATURES = ['crews', 'ask', 'backpack'] as const;
const STAMPS: {
  key: 'crews' | 'chat' | 'backpack';
  icon: IconName;
  fill: 'tangerine' | 'sunshine' | 'sky';
}[] = [
  { key: 'crews', icon: 'communities', fill: 'tangerine' },
  { key: 'chat', icon: 'chat', fill: 'sunshine' },
  { key: 'backpack', icon: 'lock', fill: 'sky' },
];

/** The signed-out home page on wide screens (arrivsocial.com on a laptop). */
export function Landing() {
  const { t } = useTranslation();
  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.pageContent}>
      <View style={styles.inner}>
        <View style={styles.nav}>
          <View style={styles.brand}>
            <Image
              source={require('@/assets/images/icon.png') as number}
              style={styles.logo}
              accessibilityIgnoresInvertColors
            />
            <Text style={styles.brandName}>{t('common.appName')}</Text>
          </View>
          <View style={styles.navLinks}>
            <NavLink
              label={t('legal.links.guidelines')}
              onPress={() => router.push('/guidelines')}
            />
            <Button
              label={t('auth.welcome.signIn')}
              variant="secondary"
              onPress={() => router.push('/sign-in')}
            />
            <Button label={t('auth.welcome.cta')} onPress={() => router.push('/sign-up')} />
          </View>
        </View>

        <View style={styles.hero}>
          <View style={styles.heroText}>
            <Text variant="label" color="rust">
              {t('landing.eyebrow')}
            </Text>
            <Text style={styles.headline} accessibilityRole="header">
              {t('landing.title')}
            </Text>
            <Text variant="body" color="muted" style={styles.lead}>
              {t('landing.body')}
            </Text>
            <View style={styles.ctas}>
              <Button
                label={t('auth.welcome.cta')}
                size="lg"
                onPress={() => router.push('/sign-up')}
              />
              <Button
                label={t('auth.welcome.signIn')}
                size="lg"
                variant="secondary"
                onPress={() => router.push('/sign-in')}
              />
            </View>
            <Text variant="meta" color="muted">
              {t('landing.stores')}
            </Text>
            <View style={styles.notice}>
              <Notice
                eyebrow={t('notice.customsEyebrow')}
                body={t('auth.signUp.terms')}
                tone="sky"
              />
            </View>
          </View>

          <View
            style={styles.visual}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          >
            <BoardingPass
              eyebrowStart={t('boardingPass.eyebrow')}
              eyebrowEnd={t('boardingPass.carrier')}
              name={t('auth.welcome.passName')}
              from={{ code: '???' }}
              to={{ code: 'AUS', city: t('auth.welcome.australia') }}
              fields={[
                { label: t('boardingPass.visa'), value: '—' },
                { label: t('boardingPass.day'), value: '1' },
                { label: t('boardingPass.stamps'), value: '0' },
              ]}
              showPlane
            />
            <View style={styles.postmark}>
              <Postmark
                lines={[
                  { text: t('landing.postmarkTop'), style: 'mono' },
                  { text: 'AUS', style: 'big' },
                  { text: t('landing.postmarkBottom'), style: 'mono' },
                ]}
                ink="rust"
                size={130}
              />
            </View>
            <View style={styles.stamps}>
              {STAMPS.map((s, i) => (
                <Stamp
                  key={s.key}
                  size="lg"
                  label={t(`landing.stamps.${s.key}`)}
                  icon={s.icon}
                  fill={s.fill}
                  tilt="md"
                  direction={i % 2 === 0 ? -1 : 1}
                />
              ))}
            </View>
          </View>
        </View>

        <View style={styles.features}>
          {FEATURES.map((f) => (
            <Card key={f} style={styles.feature}>
              <Text variant="heading">{t(`landing.features.${f}.title`)}</Text>
              <Text variant="body" color="muted">
                {t(`landing.features.${f}.body`)}
              </Text>
            </Card>
          ))}
        </View>
      </View>

      <View style={styles.footer}>
        <View style={[styles.inner, styles.footerInner]}>
          <Text variant="meta" color="onNavyMuted" style={styles.flex}>
            {t('landing.copyright')}
          </Text>
          <FooterLink label={t('legal.links.privacy')} onPress={() => router.push('/privacy')} />
          <FooterLink label={t('legal.links.terms')} onPress={() => router.push('/terms')} />
          <FooterLink
            label={t('legal.links.guidelines')}
            onPress={() => router.push('/guidelines')}
          />
          <Text variant="meta" color="onNavyMuted">
            {t('landing.contact')}
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

function NavLink({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="link"
      style={({ hovered }) => [styles.link, hovered && styles.linkHover]}
    >
      <Text style={styles.linkText}>{label}</Text>
    </Pressable>
  );
}

function FooterLink({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="link"
      style={({ hovered }) => [styles.link, hovered && styles.linkHover]}
    >
      <Text variant="meta" color="onNavyMuted">
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.paper },
  pageContent: { minHeight: '100%' },
  inner: { width: '100%', maxWidth: 1200, alignSelf: 'center', paddingHorizontal: 48 },
  flex: { flex: 1 },
  nav: { flexDirection: 'row', alignItems: 'center', paddingVertical: space[6] },
  brand: { flexDirection: 'row', alignItems: 'center', gap: space[3], flex: 1 },
  logo: { width: 40, height: 40, borderRadius: 10 },
  brandName: { fontFamily: fonts.sans900, fontSize: 26, lineHeight: 30, color: colors.navy },
  navLinks: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  link: { minHeight: 44, justifyContent: 'center', paddingHorizontal: space[2], borderRadius: 8 },
  linkHover: { opacity: 0.7 },
  linkText: { fontFamily: fonts.sans800, fontSize: 15, color: colors.navy },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 56, paddingVertical: space[6] },
  heroText: { flex: 1, gap: space[5] },
  headline: {
    fontFamily: fonts.sans900,
    fontSize: 60,
    lineHeight: 64,
    letterSpacing: -1.5,
    color: colors.navy,
  },
  lead: { fontSize: 19, lineHeight: 28, maxWidth: 560 },
  ctas: { flexDirection: 'row', gap: space[3], flexWrap: 'wrap' },
  notice: { maxWidth: 560 },
  visual: { width: 480, gap: space[6] },
  postmark: { position: 'absolute', right: -56, top: -112 },
  stamps: { flexDirection: 'row', gap: space[4], justifyContent: 'center' },
  features: { flexDirection: 'row', gap: space[5], paddingVertical: space[6] },
  feature: { flex: 1, gap: space[2] },
  footer: { backgroundColor: colors.navy, paddingVertical: space[5], marginTop: 'auto' },
  footerInner: { flexDirection: 'row', alignItems: 'center', gap: space[5] },
});
