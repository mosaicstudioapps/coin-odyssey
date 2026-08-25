import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { getCountryByCode, resolveCountryCode } from '@coin-collecting/shared';

import { palette, fontFamily, radius } from '../../theme';
import { Card, Eyebrow, WorldMap, COUNTRY_PINS } from '../../components/design';
import { CoinService } from '../../services/coinService';
import type { Coin } from '../../types/coin';

interface CountryRow {
  code: string;
  name: string;
  coins: number;
  earliest: number | null;
  latest: number | null;
}

const FRONTIERS = ['Iceland', 'Mongolia', 'Peru', 'Vietnam', 'Morocco', 'Iran'];

export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const [coins, setCoins] = useState<Coin[]>([]);
  const [picked, setPicked] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await CoinService.getUserCoins();
      setCoins(data);
    } catch {
      setCoins([]);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const { rows, codes } = useMemo(() => {
    const byCode = new Map<string, CountryRow>();
    for (const c of coins) {
      // Resolve through the shared country table — the same one the World
      // Coins album uses — so this screen's count agrees with the album's
      // rather than being capped by whatever this map happens to have pins for.
      const code = resolveCountryCode(c.country);
      if (!code) continue;
      const existing = byCode.get(code);
      if (existing) {
        existing.coins += 1;
        if (c.year && (existing.earliest == null || c.year < existing.earliest)) existing.earliest = c.year;
        if (c.year && (existing.latest == null || c.year > existing.latest)) existing.latest = c.year;
      } else {
        byCode.set(code, {
          code,
          name: getCountryByCode(code)?.name ?? c.country ?? code,
          coins: 1,
          earliest: c.year || null,
          latest: c.year || null,
        });
      }
    }
    const list = Array.from(byCode.values()).sort((a, b) => b.coins - a.coins);
    // Only codes the map can actually draw; the count above is the honest one.
    return { rows: list, codes: list.map((r) => r.code).filter((code) => COUNTRY_PINS[code]) };
  }, [coins]);

  useEffect(() => {
    // Off `rows`, not `codes` — a collection made entirely of countries this
    // map has no pin for should still open with one of them focused.
    if (!picked && rows.length > 0) setPicked(rows[0].code);
  }, [rows, picked]);

  const focus = rows.find((r) => r.code === picked);
  const totalCountries = rows.length;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 110 }}>
        <View style={styles.header}>
          <Eyebrow>COVERAGE</Eyebrow>
          <Text style={styles.headerTitle}>World map</Text>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsNumber}>{totalCountries}</Text>
            <Text style={styles.totalsLabel}>
              OF 195 COUNTRIES · {((totalCountries / 195) * 100).toFixed(1)}%
            </Text>
          </View>
        </View>

        <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
          <LinearGradient
            colors={[palette.mapBg, palette.bg]}
            style={styles.mapShell}
          >
            <WorldMap
              width={336}
              size="full"
              collected={codes}
              highlight={picked}
              interactive
              onPin={(c) => setPicked(c)}
            />
          </LinearGradient>
        </View>

        {focus && (
          <View style={styles.section}>
            <Card style={{ padding: 16 }}>
              <View style={styles.focusHeader}>
                <Eyebrow>FOCUSED</Eyebrow>
                <Text style={styles.focusCode}>{focus.code}</Text>
              </View>
              <Text style={styles.focusName}>{focus.name}</Text>
              <View style={styles.focusStatsRow}>
                {/* Was a "VALUE" column summing purchase prices. It read $0 for
                    every country nobody had entered a price for, and the app
                    does not do valuations — the span of years is the thing this
                    collection is actually measured in. */}
                <FocusStat label="COINS" value={String(focus.coins)} />
                <View style={styles.focusDivider} />
                <FocusStat label="EARLIEST" value={focus.earliest ? String(focus.earliest) : '—'} />
                <View style={styles.focusDivider} />
                <FocusStat label="LATEST" value={focus.latest ? String(focus.latest) : '—'} />
              </View>
            </Card>
          </View>
        )}

        <View style={[styles.section, styles.sectionHeaderRow]}>
          <Eyebrow>BY COUNTRY</Eyebrow>
          <Text style={styles.sortByLabel}>SORTED BY COINS</Text>
        </View>
        <View style={styles.section}>
          <Card style={{ overflow: 'hidden' }}>
            {rows.slice(0, 12).map((r, i) => (
              <Pressable
                key={r.code}
                onPress={() => setPicked(r.code)}
                style={[
                  styles.row,
                  i > 0 && { borderTopWidth: 1, borderTopColor: palette.line2 },
                  picked === r.code && { backgroundColor: palette.rowSelectedBg },
                ]}
              >
                <View
                  style={[
                    styles.pinDot,
                    picked === r.code && styles.pinDotActive,
                  ]}
                />
                <Text style={styles.rowName} numberOfLines={1}>{r.name}</Text>
                <Text style={styles.rowCoins}>{r.coins}</Text>
                <Text style={styles.rowYear}>{r.earliest ?? '—'}</Text>
              </Pressable>
            ))}
            {rows.length === 0 && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>
                  No countries yet. Add coins with country metadata to populate this map.
                </Text>
              </View>
            )}
          </Card>
        </View>

        <View style={styles.section}>
          <Eyebrow style={{ marginBottom: 10 }}>NEXT FRONTIERS</Eyebrow>
          <View style={styles.frontiersRow}>
            {FRONTIERS.map((n) => (
              <View key={n} style={styles.frontierChip}>
                <Text style={styles.frontierText}>{n}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function FocusStat({ label, value }: { label: string; value: string }) {
  return (
    <View>
      <Eyebrow style={{ marginBottom: 4 }}>{label}</Eyebrow>
      <Text style={styles.focusStatValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.bg },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 14 },
  headerTitle: {
    fontFamily: fontFamily.display,
    fontSize: 30,
    color: palette.fg,
    letterSpacing: -0.6,
    marginTop: 6,
  },
  totalsRow: { flexDirection: 'row', alignItems: 'baseline', gap: 10, marginTop: 8 },
  totalsNumber: { fontFamily: fontFamily.mono, fontSize: 13, color: palette.fg },
  totalsLabel: { fontFamily: fontFamily.mono, fontSize: 11, color: palette.fg3, letterSpacing: 0.88 },

  mapShell: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.line,
    paddingVertical: 14,
    paddingHorizontal: 8,
    overflow: 'hidden',
    alignItems: 'center',
  },

  section: { paddingHorizontal: 20, paddingBottom: 16 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 10 },
  sortByLabel: { fontFamily: fontFamily.mono, fontSize: 10, color: palette.fg3 },

  focusHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  focusCode: { fontFamily: fontFamily.mono, fontSize: 10, color: palette.gold, letterSpacing: 1 },
  focusName: { fontFamily: fontFamily.display, fontSize: 22, color: palette.fg, letterSpacing: -0.4 },
  focusStatsRow: { flexDirection: 'row', alignItems: 'center', gap: 18, marginTop: 14 },
  focusDivider: { width: 1, backgroundColor: palette.line, alignSelf: 'stretch' },
  focusStatValue: { fontFamily: fontFamily.mono, fontSize: 16, color: palette.fg },

  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, paddingHorizontal: 16 },
  pinDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: palette.gold },
  pinDotActive: {
    shadowColor: palette.gold,
    shadowOpacity: 0.5,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
  rowName: { flex: 1, fontFamily: fontFamily.ui, fontSize: 13.5, color: palette.fg },
  rowCoins: { fontFamily: fontFamily.mono, fontSize: 11, color: palette.fg3, width: 28, textAlign: 'right' },
  rowYear: { fontFamily: fontFamily.mono, fontSize: 11, color: palette.fg2, width: 64, textAlign: 'right' },

  frontiersRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  frontierChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: palette.line,
  },
  frontierText: { fontFamily: fontFamily.ui, fontSize: 11.5, color: palette.fg2 },

  emptyState: { padding: 24, alignItems: 'center' },
  emptyText: { fontFamily: fontFamily.ui, fontSize: 13, color: palette.fg3, textAlign: 'center' },
});
