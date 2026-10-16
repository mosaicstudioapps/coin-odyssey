import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';

import {
  buildMonthlySeries,
  collectedCountryCodes,
  computeDelta,
  computeMonthTicks,
  computeYearSpan,
  nextBadge,
  recentBadges,
  recentCoins,
  metalDiscTone,
} from '@coin-collecting/shared';

import { fontFamily, spacing, radius, makeStyles, useTheme } from '../../theme';
import {
  CoinDisc,
  DiscTone,
  Icon,
  MiniChart,
  Stat,
  Eyebrow,
  Card,
  WorldMap,
  ProgressBar,
} from '../../components/design';

import { CoinService } from '../../services/coinService';
import type { AchievementStatus } from '../../services/achievementService';
import { useAchievements } from '../../contexts/AchievementsContext';
import { AchievementBadge } from '../../components/achievements/AchievementBadge';
import type { Coin } from '../../types/coin';
import { coinLabel } from '@coin-collecting/shared';
import { useAuth } from '../../hooks/useAuth';
import { useCurrency } from '../../contexts/CurrencyContext';

interface Stats {
  totalCoins: number;
  yearSpan: { min: number; max: number; years: number } | null;
  uniqueCountries: number;
  countryCodes: string[];
  recentCoins: Coin[];
  monthlySeries: number[];
}

function toneFor(coin: Coin): DiscTone {
  // The coin's metal, not its price (see coinMetal.ts in packages/shared).
  return metalDiscTone(coin);
}

function formatRelative(iso?: string): string {
  if (!iso) return '';
  const date = new Date(iso);
  const diff = Date.now() - date.getTime();
  const day = 86400000;
  const days = Math.floor(diff / day);
  if (days < 1) return 'today';
  if (days === 1) return '1d ago';
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

export default function DashboardScreen() {
  const styles = useStyles();
  const { palette } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const { format } = useCurrency();
  const { snapshot: achievements } = useAchievements();

  const [stats, setStats] = useState<Stats | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const monthTicks = useMemo(() => computeMonthTicks(), []);

  const load = useCallback(async () => {
    const coins = await CoinService.getUserCoins();
    const codes = collectedCountryCodes(coins);
    setStats({
      totalCoins: coins.length,
      yearSpan: computeYearSpan(coins),
      uniqueCountries: codes.length,
      countryCodes: codes,
      recentCoins: recentCoins(coins, 4),
      monthlySeries: buildMonthlySeries(coins),
    });
  }, []);

  useEffect(() => {
    load().catch(() => setStats(null));
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load().catch(() => undefined);
    setRefreshing(false);
  }, [load]);

  // Deliberately no fallback to the email local part. Nothing in the app ever
  // writes firstName, so that fallback was what every user actually saw — which
  // put "jane.doe" on the first screen, in every screenshot, and in front of
  // anyone glancing at the phone, in exchange for nothing. This greeting is
  // decorative; the account it belongs to is named on the Profile screen, which
  // is where someone goes to ask "which account am I signed into?".
  const username = (user?.user_metadata?.firstName as string | undefined) || 'Collector';
  const initial = username[0]?.toUpperCase() || 'C';

  const span = stats?.yearSpan ?? null;
  const heroYears = span ? String(span.years) : '—';
  const heroRange = span ? (span.min === span.max ? `${span.min}` : `${span.min} — ${span.max}`) : null;
  const series = stats?.monthlySeries ?? new Array(12).fill(0);
  const hasRealSeries = series.some((v) => v > 0);
  const delta = hasRealSeries ? computeDelta(series) : null;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 110 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={palette.goldText}
          />
        }
      >
        {/* Top bar */}
        <View style={styles.topBar}>
          <View style={styles.topBarLeft}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initial}</Text>
            </View>
            <View style={{ marginLeft: 10 }}>
              <Text style={styles.welcomeBack}>WELCOME BACK</Text>
              <Text style={styles.username}>{username}</Text>
            </View>
          </View>
        </View>

        {/* Collection hero — the stretch of history the collection covers */}
        <View style={styles.heroBlock}>
          <Eyebrow>YEARS OF HISTORY</Eyebrow>
          <View style={styles.heroValueRow}>
            <Text style={styles.heroValueBig}>{heroYears}</Text>
          </View>
          {heroRange && <Text style={styles.heroRange}>{heroRange}</Text>}
          {delta && delta.abs !== 0 && (
            <View style={styles.deltaRow}>
              <Text style={[styles.deltaText, delta.abs < 0 && { color: palette.cLow }]}>
                {delta.abs >= 0 ? '▲' : '▼'} {Math.abs(delta.abs)}{' '}
                {Math.abs(delta.abs) === 1 ? 'COIN' : 'COINS'}
              </Text>
              <View style={styles.dotSep} />
              <Text style={styles.deltaPeriod}>12 MONTHS</Text>
            </View>
          )}
        </View>

        {/* Achievements */}
        {achievements && (
          <View style={styles.section}>
            <Pressable
              onPress={() => navigation.navigate('Achievements')}
              accessibilityRole="button"
              accessibilityLabel={`Achievements, ${achievements.earnedCount} of ${achievements.achievements.length} earned`}
            >
              <Card style={{ padding: 16 }}>
                <View style={styles.coverageHeader}>
                  <Eyebrow>ACHIEVEMENTS</Eyebrow>
                  <Text style={styles.coverageCount}>
                    {achievements.earnedCount} / {achievements.achievements.length}
                  </Text>
                </View>
                {achievements.earnedCount > 0 ? (
                  <View style={styles.badgeRow}>
                    {recentBadges(achievements.achievements, 5).map(a => (
                      <AchievementBadge key={a.id} achievement={a} earned size={40} />
                    ))}
                  </View>
                ) : (
                  <Text style={styles.badgeEmpty}>Add a coin to earn your first badge.</Text>
                )}
                {(() => {
                  const next = nextBadge(achievements.achievements);
                  if (!next) return null;
                  return (
                    <View style={styles.nextBadge}>
                      <View style={styles.nextBadgeLine}>
                        <Text style={styles.nextBadgeLabel} numberOfLines={1}>
                          NEXT · {next.title.toUpperCase()}
                        </Text>
                        <Text style={styles.nextBadgeCount}>
                          {next.current} / {next.required}
                        </Text>
                      </View>
                      <ProgressBar value={next.current / next.required} height={3} />
                    </View>
                  );
                })()}
                <View style={styles.coverageFooter}>
                  <View />
                  <Text style={styles.exploreArrow}>VIEW ALL →</Text>
                </View>
              </Card>
            </Pressable>
          </View>
        )}

        {/* Chart card */}
        <View style={styles.section}>
          <Card style={{ padding: 16, paddingBottom: 10 }}>
            <View style={styles.chartHeader}>
              <Eyebrow>COLLECTION GROWTH · LAST 12 MONTHS</Eyebrow>
              <Text style={styles.usdLabel}>COINS</Text>
            </View>
            {hasRealSeries ? (
              <>
                <MiniChart data={series} width={320} height={108} />
                <View style={styles.monthTicks}>
                  {monthTicks.map((m, i) => (
                    <Text key={`${m}-${i}`} style={styles.tickText}>
                      {m}
                    </Text>
                  ))}
                </View>
              </>
            ) : (
              <View style={styles.chartEmpty}>
                <Text style={styles.chartEmptyText}>
                  Your collection's growth will chart here as you add coins.
                </Text>
              </View>
            )}
          </Card>
        </View>

        {/* Stat tiles */}
        <View style={[styles.section, styles.statsRow]}>
          <View style={{ flex: 1 }}>
            <Stat eyebrow="COINS" value={String(stats?.totalCoins ?? 0)} />
          </View>
          <View style={{ flex: 1 }}>
            <Stat eyebrow="COUNTRIES" value={String(stats?.uniqueCountries ?? 0)} />
          </View>
        </View>

        {/* Coverage map preview */}
        <View style={styles.section}>
          <Pressable onPress={() => navigation.navigate('Map')}>
            <Card style={{ padding: 16, overflow: 'hidden' }}>
              <View style={styles.coverageHeader}>
                <Eyebrow>COVERAGE</Eyebrow>
                <Text style={styles.coverageCount}>
                  {stats?.uniqueCountries ?? 0} / 195
                </Text>
              </View>
              <View style={styles.coverageMap}>
                <WorldMap
                  width={300}
                  size="compact"
                  collected={stats?.countryCodes || []}
                />
              </View>
              <View style={styles.coverageFooter}>
                <Text style={styles.legend}>
                  <Text style={{ color: palette.gold }}>● </Text>
                  COLLECTED ·{' '}
                  <Text style={{ color: palette.fg4 }}>● </Text>
                  UNCOLLECTED
                </Text>
                <Text style={styles.exploreArrow}>EXPLORE →</Text>
              </View>
            </Card>
          </Pressable>
        </View>

        {/* Scan CTA */}
        <View style={styles.section}>
          <Pressable onPress={() => navigation.navigate('Scan')}>
            <LinearGradient
              colors={[palette.ctaTopWarm, palette.ctaBotWarm]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.ctaCard}
            >
              <View style={styles.ctaIcon}>
                <Icon name="scan" size={26} stroke={1.8} color={palette.goldFg} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.ctaTitle}>Scan a coin</Text>
                <Text style={styles.ctaSub}>Identify, grade &amp; catalog in seconds</Text>
              </View>
              <Icon name="arrow-right" size={18} color={palette.goldText} />
            </LinearGradient>
          </Pressable>
        </View>

        {/* Recently added */}
        <View style={[styles.section, styles.recentHeader]}>
          <Eyebrow>RECENTLY ADDED</Eyebrow>
          <Pressable onPress={() => navigation.navigate('Collection')}>
            <Text style={styles.viewAll}>VIEW ALL →</Text>
          </Pressable>
        </View>
        <View style={styles.section}>
          <Card style={{ overflow: 'hidden' }}>
            {(stats?.recentCoins || []).slice(0, 4).map((c, i) => (
              <Pressable
                key={c.id}
                onPress={() =>
                  navigation.navigate('Collection', {
                    screen: 'CoinDetail',
                    params: { coin: c },
                    // Keep CollectionList beneath so back returns to the list
                    // rather than falling through to another tab.
                    initial: false,
                  })
                }
                accessibilityRole="button"
                accessibilityLabel={`View ${coinLabel(c)}`}
                style={[
                  styles.row,
                  i > 0 && { borderTopWidth: 1, borderTopColor: palette.line2 },
                ]}
              >
                <CoinDisc
                  size={42}
                  label={String(c.year).slice(-2)}
                  tone={toneFor(c)}
                  imageSource={c.obverseImage ? { uri: c.obverseImage } : undefined}
                />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <View style={styles.rowTitleLine}>
                    <Text style={styles.rowName} numberOfLines={1}>
                      {coinLabel(c)}
                    </Text>
                    <Text style={styles.rowYear}>{c.year}</Text>
                  </View>
                  <Text style={styles.rowSub} numberOfLines={1}>
                    {c.country} · {c.grade || '—'}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  {c.purchasePrice != null && (
                    <Text style={styles.rowValue}>{format(c.purchasePrice)}</Text>
                  )}
                  <Text style={styles.rowAdded}>{formatRelative(c.createdAt)}</Text>
                </View>
              </Pressable>
            ))}
            {(!stats || stats.recentCoins.length === 0) && (
              <View style={styles.emptyRow}>
                <Text style={styles.emptyText}>No coins yet. Tap Scan to add your first.</Text>
              </View>
            )}
          </Card>
        </View>
      </ScrollView>
    </View>
  );
}

const useStyles = makeStyles((palette) => ({
  root: { flex: 1, backgroundColor: palette.bg },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 22,
  },
  topBarLeft: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: palette.gold,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontFamily: fontFamily.displayMedium, fontSize: 15, color: palette.goldFg },
  welcomeBack: {
    fontFamily: fontFamily.mono,
    fontSize: 11,
    color: palette.fg3,
    letterSpacing: 0.5,
  },
  username: { fontFamily: fontFamily.ui, fontSize: 13, color: palette.fg, marginTop: 1 },

  heroBlock: { paddingHorizontal: 20, paddingBottom: 18 },
  heroValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 10 },
  heroRange: {
    fontFamily: fontFamily.mono, fontSize: 12, color: palette.fg3, letterSpacing: 1.2, marginTop: 4,
  },
  heroValueBig: {
    fontFamily: fontFamily.display, fontSize: 44, color: palette.fg, letterSpacing: -0.88,
  },
  deltaRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 },
  deltaText: { fontFamily: fontFamily.mono, color: palette.cHigh, fontSize: 12 },
  dotSep: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: palette.fg4 },
  deltaPeriod: { fontFamily: fontFamily.mono, color: palette.fg3, fontSize: 12 },

  section: { paddingHorizontal: 20, paddingBottom: 16 },

  chartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  usdLabel: { fontFamily: fontFamily.mono, fontSize: 10, color: palette.fg3 },
  monthTicks: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  tickText: { fontFamily: fontFamily.mono, fontSize: 9.5, color: palette.fg4, letterSpacing: 0.95 },

  chartEmpty: {
    height: 108,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  chartEmptyText: {
    fontFamily: fontFamily.mono,
    fontSize: 10.5,
    color: palette.fg4,
    textAlign: 'center',
    letterSpacing: 0.5,
    lineHeight: 16,
  },

  statsRow: { flexDirection: 'row', gap: 10 },

  badgeRow: { flexDirection: 'row', gap: 10, marginTop: 4, marginBottom: 4 },
  badgeEmpty: { fontFamily: fontFamily.ui, fontSize: 13, color: palette.fg3, marginVertical: 6 },
  nextBadge: { marginTop: 12 },
  nextBadgeLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, gap: 8 },
  nextBadgeLabel: { fontFamily: fontFamily.mono, fontSize: 10, color: palette.fg2, letterSpacing: 1, flexShrink: 1 },
  nextBadgeCount: { fontFamily: fontFamily.mono, fontSize: 10, color: palette.fg3 },

  coverageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  coverageCount: { fontFamily: fontFamily.mono, fontSize: 10, color: palette.fg3 },
  coverageMap: { alignItems: 'center', marginVertical: 4, marginBottom: 8 },
  coverageFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
  legend: { fontFamily: fontFamily.mono, fontSize: 10.5, color: palette.fg3, letterSpacing: 0.63 },
  exploreArrow: { fontFamily: fontFamily.mono, fontSize: 10, color: palette.goldText, letterSpacing: 1 },

  ctaCard: {
    padding: 18, borderRadius: radius.base,
    borderWidth: 1, borderColor: palette.ctaBorder,
    flexDirection: 'row', alignItems: 'center', gap: 16,
  },
  ctaIcon: {
    width: 52, height: 52, borderRadius: 14,
    backgroundColor: palette.gold,
    alignItems: 'center', justifyContent: 'center',
  },
  ctaTitle: { fontFamily: fontFamily.display, fontSize: 18, color: palette.fg, lineHeight: 22 },
  ctaSub: { fontFamily: fontFamily.ui, fontSize: 12, color: palette.fg2, marginTop: 3 },

  recentHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 14 },
  viewAll: { fontFamily: fontFamily.mono, fontSize: 10, color: palette.goldText, letterSpacing: 1 },

  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16 },
  rowTitleLine: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  rowName: { fontFamily: fontFamily.ui, fontSize: 14, color: palette.fg, flexShrink: 1 },
  rowYear: { fontFamily: fontFamily.mono, fontSize: 10.5, color: palette.fg4 },
  rowSub: { fontFamily: fontFamily.ui, fontSize: 11.5, color: palette.fg3, marginTop: 2 },
  rowValue: { fontFamily: fontFamily.mono, fontSize: 13, color: palette.fg },
  rowAdded: { fontFamily: fontFamily.mono, fontSize: 10, color: palette.fg4 },

  emptyRow: { padding: 24, alignItems: 'center' },
  emptyText: { fontFamily: fontFamily.ui, fontSize: 13, color: palette.fg3 },
}));
