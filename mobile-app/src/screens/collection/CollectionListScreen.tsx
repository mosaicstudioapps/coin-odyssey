import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  FlatList,
  RefreshControl,
  ListRenderItemInfo,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';

import { palette, fontFamily, radius } from '../../theme';
import { CoinDisc, Icon, Eyebrow, Card, DiscTone, Button } from '../../components/design';
import { CoinService } from '../../services/coinService';
import { supabase } from '../../services/supabase';
import { Logger } from '../../services/logger';
import { OfflineStorage } from '../../services/storage';
import { OfflineSyncService } from '../../services/offlineSyncService';
import type { Coin } from '../../types/coin';
import { FilterSheet, defaultFilters, CoinFilters } from '../../components/collection/FilterSheet';
import { SortSheet, SortOption, defaultSort } from '../../components/collection/SortSheet';
import { useCurrency } from '../../contexts/CurrencyContext';

type LoadState = 'idle' | 'loading' | 'error' | 'ready';

const CHIPS = ['All', 'Silver', 'Gold', 'Pre-1950', 'MS-60+', 'Americas'];
const COLUMN_GAP = 12;
const HORIZONTAL_PAD = 20;

function toneFor(coin: Coin): DiscTone {
  const v = coin.purchasePrice || 0;
  if (v > 200) return 'gold';
  if (v > 30) return 'silver';
  return 'copper';
}

function chipMatches(coin: Coin, chip: string): boolean {
  switch (chip) {
    case 'All':
      return true;
    case 'Silver':
      return (coin.purchasePrice || 0) >= 30 && (coin.purchasePrice || 0) < 200;
    case 'Gold':
      return (coin.purchasePrice || 0) >= 200;
    case 'Pre-1950':
      return (coin.year || 0) < 1950;
    case 'MS-60+': {
      const g = (coin.grade || '').toUpperCase();
      if (!g.startsWith('MS-')) return false;
      const n = parseInt(g.slice(3), 10);
      return Number.isFinite(n) && n >= 60;
    }
    case 'Americas': {
      const c = (coin.country || '').toLowerCase();
      return /(united states|canada|mexico|brazil|argentina|chile|peru|colombia|venezuela)/.test(c);
    }
    default:
      return true;
  }
}

function gradeNumeric(grade?: string | null): number | null {
  if (!grade) return null;
  const m = grade.match(/(\d+)/);
  return m ? parseInt(m[1], 10) : null;
}

function passesFilters(c: Coin, f: CoinFilters): boolean {
  if (f.countries.length && (!c.country || !f.countries.includes(c.country))) return false;
  if (f.minYear != null && (c.year ?? 0) < f.minYear) return false;
  if (f.maxYear != null && (c.year ?? Number.MAX_SAFE_INTEGER) > f.maxYear) return false;
  if (f.minValue != null && (c.purchasePrice ?? 0) < f.minValue) return false;
  if (f.maxValue != null && (c.purchasePrice ?? Number.MAX_SAFE_INTEGER) > f.maxValue) return false;
  if (f.minGrade != null) {
    const n = gradeNumeric(c.grade);
    if (n == null || n < f.minGrade) return false;
  }
  return true;
}

function applySort(list: Coin[], sort: SortOption): Coin[] {
  const dir = sort.direction === 'asc' ? 1 : -1;
  const sorted = [...list];
  sorted.sort((a, b) => {
    switch (sort.key) {
      case 'date':
        return (
          (new Date(a.createdAt ?? 0).getTime() - new Date(b.createdAt ?? 0).getTime()) * dir
        );
      case 'value':
        return ((a.purchasePrice ?? 0) - (b.purchasePrice ?? 0)) * dir;
      case 'year':
        return ((a.year ?? 0) - (b.year ?? 0)) * dir;
      case 'name':
        return (a.name ?? a.denomination ?? '').localeCompare(b.name ?? b.denomination ?? '') * dir;
      default:
        return 0;
    }
  });
  return sorted;
}

interface CellProps {
  coin: Coin;
  onPress: (c: Coin) => void;
  formatValue: (n: number) => string;
}

const CoinGridCell = React.memo(function CoinGridCell({ coin, onPress, formatValue }: CellProps) {
  const pending = !!coin.offlinePending;
  return (
    <Pressable
      onPress={() => !pending && onPress(coin)}
      style={[styles.gridCellWrap, pending && { opacity: 0.95 }]}
    >
      <Card style={styles.gridCard}>
        <View style={styles.cardImage}>
          <CoinDisc
            size={84}
            label={String(coin.year).slice(-2)}
            tone={toneFor(coin)}
            imageSource={coin.obverseImage ? { uri: coin.obverseImage } : undefined}
          />
          {pending && (
            <View style={styles.pendingBadge}>
              <Text style={styles.pendingBadgeText}>PENDING</Text>
            </View>
          )}
        </View>
        <View>
          <Text style={styles.cardName} numberOfLines={1}>
            {coin.specificCoinName || coin.denomination || 'Coin'}
          </Text>
          <Text style={styles.cardSub} numberOfLines={1}>
            {(coin.country || '—').toUpperCase()} · {coin.year}
          </Text>
        </View>
        <View style={styles.cardFooter}>
          <Text style={styles.cardValue}>{formatValue(coin.purchasePrice || 0)}</Text>
          <Text style={styles.cardGrade}>{coin.grade || '—'}</Text>
        </View>
      </Card>
    </Pressable>
  );
});

function SkeletonCell() {
  return (
    <View style={styles.gridCellWrap}>
      <Card style={[styles.gridCard, { opacity: 0.6 }]}>
        <View style={[styles.cardImage, { backgroundColor: palette.bg3 }]} />
        <View>
          <View style={styles.skelLineWide} />
          <View style={styles.skelLineThin} />
        </View>
        <View style={styles.cardFooter}>
          <View style={styles.skelLineShort} />
          <View style={styles.skelLineMini} />
        </View>
      </Card>
    </View>
  );
}

const SKELETONS = [0, 1, 2, 3];

export default function CollectionListScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { format } = useCurrency();
  const [coins, setCoins] = useState<Coin[]>([]);
  const [pendingCoins, setPendingCoins] = useState<Coin[]>([]);
  const [query, setQuery] = useState('');
  const [activeChip, setActiveChip] = useState('All');
  const [refreshing, setRefreshing] = useState(false);
  const [load, setLoad] = useState<LoadState>('idle');
  const [filters, setFilters] = useState<CoinFilters>(defaultFilters);
  const [sort, setSort] = useState<SortOption>(defaultSort);
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const unsubRef = useRef<(() => void) | null>(null);

  const reloadPending = useCallback(async () => {
    const entries = await OfflineStorage.getPendingCoins();
    setPendingCoins(entries.map((e) => CoinService.pendingToCoin(e)));
  }, []);

  const reload = useCallback(async () => {
    try {
      const data = await CoinService.getUserCoins();
      setCoins(data);
      await reloadPending();
      setLoad('ready');
    } catch (err) {
      Logger.error('Failed to load coins', err);
      setLoad('error');
    }
  }, [reloadPending]);

  // Initial load
  useEffect(() => {
    setLoad('loading');
    reload();
  }, [reload]);

  // Reload whenever this screen becomes focused (covers post-edit/add)
  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  // Subscribe to offline sync status — refresh pending list whenever it changes
  useEffect(() => {
    let lastCount = -1;
    const unsub = OfflineSyncService.subscribe((status) => {
      setSyncing(status.syncing);
      if (status.pendingCount !== lastCount) {
        lastCount = status.pendingCount;
        reloadPending();
        // If pending count dropped, also refresh remote (the flushed coin is now there)
        if (status.lastSyncedAt) reload();
      }
    });
    return unsub;
  }, [reload, reloadPending]);

  // Realtime subscription
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      unsubRef.current = CoinService.subscribeToCoins(user.id, ({ event, coin, oldCoin }) => {
        setCoins((prev) => {
          if (event === 'INSERT' && coin) {
            if (prev.some((c) => c.id === coin.id)) return prev;
            return [coin, ...prev];
          }
          if (event === 'UPDATE' && coin) {
            return prev.map((c) => (c.id === coin.id ? coin : c));
          }
          if (event === 'DELETE' && oldCoin) {
            return prev.filter((c) => c.id !== oldCoin.id);
          }
          return prev;
        });
      });
    })();
    return () => {
      cancelled = true;
      unsubRef.current?.();
      unsubRef.current = null;
    };
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  }, [reload]);

  // Pending coins appear first (newest queued at the top), then remote coins.
  const allCoins = useMemo(() => {
    return [...pendingCoins, ...coins];
  }, [pendingCoins, coins]);

  const availableCountries = useMemo(() => {
    const set = new Set<string>();
    allCoins.forEach((c) => c.country && set.add(c.country));
    return Array.from(set).sort();
  }, [allCoins]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = allCoins.filter((c) => {
      if (!chipMatches(c, activeChip)) return false;
      if (!passesFilters(c, filters)) return false;
      if (!q) return true;
      return (
        (c.specificCoinName || '').toLowerCase().includes(q) ||
        (c.country || '').toLowerCase().includes(q) ||
        String(c.year || '').includes(q) ||
        (c.denomination || '').toLowerCase().includes(q)
      );
    });
    return applySort(filtered, sort);
  }, [allCoins, query, activeChip, filters, sort]);

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (filters.countries.length) n++;
    if (filters.minYear != null || filters.maxYear != null) n++;
    if (filters.minValue != null || filters.maxValue != null) n++;
    if (filters.minGrade != null) n++;
    return n;
  }, [filters]);

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<Coin>) => (
      <CoinGridCell
        coin={item}
        onPress={(c) => navigation.navigate('CoinDetail', { coin: c })}
        formatValue={format}
      />
    ),
    [navigation, format]
  );

  const keyExtractor = useCallback((c: Coin) => c.id, []);

  const renderHeader = () => (
    <View>
      <View style={styles.header}>
        <Eyebrow>
          COLLECTION · {allCoins.length}
          {pendingCoins.length > 0 ? `  ·  ${pendingCoins.length} PENDING` : ''}
          {syncing ? '  ·  SYNCING…' : ''}
        </Eyebrow>
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>Catalog</Text>
          <Pressable
            hitSlop={10}
            onPress={() => navigation.navigate('AddCoin', { initialImages: undefined })}
            style={styles.addBtn}
            accessibilityLabel="Add a coin manually"
            accessibilityRole="button"
          >
            <Icon name="plus" size={18} color={palette.gold} stroke={2.2} />
          </Pressable>
        </View>
      </View>

      <View style={styles.searchWrap}>
        <View style={styles.searchBar}>
          <Icon name="search" size={15} color={palette.fg3} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search name, country, year…"
            placeholderTextColor={palette.fg3}
            style={styles.searchInput}
            returnKeyType="search"
          />
          <Pressable hitSlop={8} onPress={() => setSortOpen(true)} style={styles.iconBtn}>
            <Text style={styles.sortLabel}>SORT</Text>
          </Pressable>
          <Pressable hitSlop={8} onPress={() => setFilterOpen(true)} style={styles.iconBtn}>
            <Icon
              name="filter"
              size={15}
              color={activeFilterCount > 0 ? palette.gold : palette.fg3}
            />
            {activeFilterCount > 0 && (
              <View style={styles.filterDot}>
                <Text style={styles.filterDotText}>{activeFilterCount}</Text>
              </View>
            )}
          </Pressable>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsRow}
      >
        {CHIPS.map((chip) => {
          const active = activeChip === chip;
          return (
            <Pressable
              key={chip}
              onPress={() => setActiveChip(chip)}
              style={[styles.chip, active && styles.chipActive]}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{chip}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );

  const renderEmpty = () => {
    if (load === 'loading') {
      return (
        <View style={styles.gridContainer}>
          {SKELETONS.map((i) => (
            <SkeletonCell key={i} />
          ))}
        </View>
      );
    }
    if (load === 'error') {
      return (
        <View style={styles.fullState}>
          <Icon name="warning" size={22} color={palette.cLow} />
          <Text style={styles.stateTitle}>Could not load your collection</Text>
          <Text style={styles.stateBody}>Check your connection and try again.</Text>
          <View style={{ height: 12 }} />
          <Button label="Retry" variant="gold" onPress={reload} />
        </View>
      );
    }
    if (allCoins.length === 0) {
      return (
        <View style={styles.fullState}>
          <View style={styles.emptyMark}>
            <CoinDisc size={64} label="??" tone="copper" />
          </View>
          <Text style={styles.stateTitle}>Your collection is empty</Text>
          <Text style={styles.stateBody}>
            Scan a coin to identify and catalog it automatically, or add one yourself if you
            already know the details.
          </Text>
          <View style={{ height: 14 }} />
          <View style={styles.emptyActions}>
            <Button
              label="Scan a coin"
              variant="gold"
              onPress={() => navigation.getParent()?.navigate('Scan')}
              leading={<Icon name="scan" size={15} color={palette.goldFg} stroke={2.4} />}
            />
            <Button
              label="Add manually"
              variant="ghost"
              onPress={() => navigation.navigate('AddCoin', { initialImages: undefined })}
              leading={<Icon name="plus" size={15} color={palette.fg} stroke={2.4} />}
            />
          </View>
        </View>
      );
    }
    return (
      <View style={styles.fullState}>
        <Text style={styles.stateTitle}>No matches</Text>
        <Text style={styles.stateBody}>Adjust your search, filters, or quick chips.</Text>
      </View>
    );
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <FlatList
        data={load === 'ready' || load === 'idle' ? visible : []}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        numColumns={2}
        columnWrapperStyle={styles.columnWrap}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + 110 },
        ]}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={palette.gold}
          />
        }
        removeClippedSubviews
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={9}
        showsVerticalScrollIndicator={false}
      />

      <FilterSheet
        visible={filterOpen}
        filters={filters}
        countries={availableCountries}
        onApply={(f) => {
          setFilters(f);
          setFilterOpen(false);
        }}
        onClose={() => setFilterOpen(false)}
      />

      <SortSheet
        visible={sortOpen}
        sort={sort}
        onApply={(s) => {
          setSort(s);
          setSortOpen(false);
        }}
        onClose={() => setSortOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.bg },

  listContent: { paddingHorizontal: HORIZONTAL_PAD },
  columnWrap: { gap: COLUMN_GAP, marginBottom: COLUMN_GAP },

  header: { paddingTop: 8, paddingBottom: 14 },
  headerRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: palette.goldDim,
    backgroundColor: palette.chipActiveBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  emptyActions: { flexDirection: 'row', gap: 10, flexWrap: 'wrap', justifyContent: 'center' },
  headerTitle: {
    fontFamily: fontFamily.display,
    fontSize: 30,
    color: palette.fg,
    letterSpacing: -0.6,
    marginTop: 6,
  },

  searchWrap: { paddingBottom: 12 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: palette.bg2,
    borderWidth: 1,
    borderColor: palette.line,
  },
  searchInput: {
    flex: 1,
    color: palette.fg,
    fontFamily: fontFamily.ui,
    fontSize: 13,
    paddingVertical: 0,
  },
  iconBtn: {
    position: 'relative',
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  sortLabel: {
    fontFamily: fontFamily.mono,
    fontSize: 10,
    color: palette.fg3,
    letterSpacing: 1.2,
  },
  filterDot: {
    position: 'absolute',
    top: -4,
    right: -6,
    minWidth: 14,
    height: 14,
    paddingHorizontal: 3,
    borderRadius: 7,
    backgroundColor: palette.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterDotText: {
    fontFamily: fontFamily.mono,
    fontSize: 9,
    color: palette.goldFg,
    fontWeight: '700',
  },

  chipsRow: { paddingBottom: 16, gap: 8 },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: palette.line,
  },
  chipActive: {
    borderColor: palette.gold,
    backgroundColor: palette.chipActiveBg,
  },
  chipText: {
    fontFamily: fontFamily.mono,
    fontSize: 11,
    color: palette.fg2,
    letterSpacing: 0.66,
  },
  chipTextActive: { color: palette.gold },

  gridCellWrap: { flex: 1 },
  gridCard: { padding: 12, gap: 10 },
  cardImage: {
    aspectRatio: 1,
    borderRadius: radius.sm,
    backgroundColor: palette.bg3,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  pendingBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderWidth: 1,
    borderColor: palette.cMed,
  },
  pendingBadgeText: {
    fontFamily: fontFamily.mono,
    fontSize: 8.5,
    color: palette.cMed,
    letterSpacing: 1.2,
  },
  cardName: { fontFamily: fontFamily.ui, fontSize: 13, color: palette.fg, lineHeight: 16 },
  cardSub: {
    fontFamily: fontFamily.mono,
    fontSize: 10,
    color: palette.fg3,
    marginTop: 2,
    letterSpacing: 0.6,
  },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardValue: { fontFamily: fontFamily.mono, fontSize: 12, color: palette.fg2 },
  cardGrade: {
    fontFamily: fontFamily.mono,
    fontSize: 9.5,
    color: palette.fg4,
    letterSpacing: 0.95,
  },

  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: COLUMN_GAP },

  skelLineWide: {
    height: 12,
    width: '70%',
    backgroundColor: palette.bg3,
    borderRadius: 4,
    marginTop: 2,
  },
  skelLineThin: {
    height: 9,
    width: '50%',
    backgroundColor: palette.bg3,
    borderRadius: 4,
    marginTop: 6,
  },
  skelLineShort: { height: 10, width: 40, backgroundColor: palette.bg3, borderRadius: 4 },
  skelLineMini: { height: 8, width: 28, backgroundColor: palette.bg3, borderRadius: 4 },

  fullState: { paddingVertical: 56, paddingHorizontal: 16, alignItems: 'center', gap: 6 },
  emptyMark: { paddingBottom: 4 },
  stateTitle: {
    fontFamily: fontFamily.display,
    fontSize: 18,
    color: palette.fg,
    letterSpacing: -0.3,
    textAlign: 'center',
    marginTop: 12,
  },
  stateBody: {
    fontFamily: fontFamily.ui,
    fontSize: 13,
    color: palette.fg3,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 12,
  },
});
