import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { buildAlbums, Album } from '@coin-collecting/shared';

import { palette, fontFamily } from '../../theme';
import { CoinDisc, Eyebrow, Card, Icon, Button, ProgressBar } from '../../components/design';
import { CoinService } from '../../services/coinService';
import { Logger } from '../../services/logger';
import { computeAlbumProgress } from '../../services/albumService';
import type { Coin } from '../../types/coin';

type LoadState = 'idle' | 'loading' | 'error' | 'ready';

interface AlbumCardProps {
  album: Album;
  filled: number;
  onPress: (album: Album) => void;
}

const AlbumCard = React.memo(function AlbumCard({ album, filled, onPress }: AlbumCardProps) {
  const complete = filled >= album.totalSlots;
  return (
    <Pressable onPress={() => onPress(album)}>
      <Card style={styles.albumCard}>
        <View style={styles.albumRow}>
          <CoinDisc size={44} tone={album.discTone} label={album.title.slice(0, 2)} />
          <View style={styles.albumText}>
            <Text style={styles.albumTitle} numberOfLines={1}>
              {album.title}
            </Text>
            <Text style={styles.albumSubtitle} numberOfLines={1}>
              {album.subtitle.toUpperCase()}
            </Text>
          </View>
          <Text style={[styles.albumCount, complete && styles.albumCountDone]}>
            {filled}/{album.totalSlots}
          </Text>
        </View>
        <ProgressBar value={album.totalSlots > 0 ? filled / album.totalSlots : 0} />
      </Card>
    </Pressable>
  );
});

export default function AlbumsListScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const [coins, setCoins] = useState<Coin[]>([]);
  const [load, setLoad] = useState<LoadState>('idle');
  const [refreshing, setRefreshing] = useState(false);

  const reload = useCallback(async () => {
    try {
      const data = await CoinService.getUserCoins();
      setCoins(data);
      setLoad('ready');
    } catch (err) {
      Logger.error('Failed to load coins for albums', err);
      setLoad('error');
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoad(prev => (prev === 'idle' ? 'loading' : prev));
      reload();
    }, [reload])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  }, [reload]);

  const albums = useMemo(() => buildAlbums(), []);
  const progress = useMemo(
    () => albums.map(album => computeAlbumProgress(album, coins)),
    [albums, coins]
  );

  const openAlbum = useCallback(
    (album: Album) => navigation.navigate('AlbumDetail', { albumId: album.id }),
    [navigation]
  );

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 110 }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.gold} />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Eyebrow>SERIES CHECKLISTS</Eyebrow>
          <Text style={styles.headerTitle}>Albums</Text>
        </View>

        {load === 'error' ? (
          <View style={styles.fullState}>
            <Icon name="warning" size={22} color={palette.cLow} />
            <Text style={styles.stateTitle}>Could not load your collection</Text>
            <Text style={styles.stateBody}>Check your connection and try again.</Text>
            <View style={{ height: 12 }} />
            <Button label="Retry" variant="gold" onPress={reload} />
          </View>
        ) : (
          <View style={styles.cards}>
            {albums.map((album, i) => (
              <AlbumCard
                key={album.id}
                album={album}
                filled={progress[i].filled}
                onPress={openAlbum}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.bg },
  content: { paddingHorizontal: 20 },

  header: { paddingTop: 8, paddingBottom: 18 },
  headerTitle: {
    fontFamily: fontFamily.display,
    fontSize: 30,
    color: palette.fg,
    letterSpacing: -0.6,
    marginTop: 6,
  },

  cards: { gap: 12 },
  albumCard: { padding: 14, gap: 12 },
  albumRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  albumText: { flex: 1 },
  albumTitle: {
    fontFamily: fontFamily.display,
    fontSize: 17,
    color: palette.fg,
    letterSpacing: -0.3,
  },
  albumSubtitle: {
    fontFamily: fontFamily.mono,
    fontSize: 9.5,
    color: palette.fg3,
    letterSpacing: 0.95,
    marginTop: 3,
  },
  albumCount: {
    fontFamily: fontFamily.mono,
    fontSize: 12,
    color: palette.fg2,
    letterSpacing: 0.6,
  },
  albumCountDone: { color: palette.cHigh },

  fullState: { paddingVertical: 56, paddingHorizontal: 16, alignItems: 'center', gap: 6 },
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
