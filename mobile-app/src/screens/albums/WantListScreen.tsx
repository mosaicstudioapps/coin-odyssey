import React, { useMemo } from 'react';
import { View, Text, ScrollView, Pressable, Share, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { resolveWantList, wantCount, wantListText } from '@coin-collecting/shared';

import { fontFamily, makeStyles, useTheme } from '../../theme';
import { Button, Card, Eyebrow, Icon } from '../../components/design';
import { useWantList } from '../../services/wantListService';
import { useCoins } from '../../hooks/useCoins';
import { Logger } from '../../services/logger';

// The want list: empty album slots marked "I want this one", grouped by
// album, to take to a coin show or shop. Shared as text through the share
// sheet. A slot that gets filled drops off by itself.

export default function WantListScreen() {
  const styles = useStyles();
  const { palette } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { coins, loaded: coinsLoaded } = useCoins();
  const { entries, loaded, error, toggle } = useWantList();
  const groups = useMemo(() => resolveWantList(entries, coins), [entries, coins]);
  const count = wantCount(groups);
  const ready = loaded && coinsLoaded;

  const share = async () => {
    try {
      await Share.share({ message: wantListText(groups) });
    } catch (err) {
      Logger.warn('Want list share failed', err);
    }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 120 }]}>
        <View style={styles.header}>
          <Pressable hitSlop={10} onPress={() => navigation.goBack()} style={styles.backBtn} accessibilityRole="button" accessibilityLabel="Back to albums">
            <View style={{ transform: [{ scaleX: -1 }] }}>
              <Icon name="chevron-right" size={18} color={palette.fg2} />
            </View>
            <Text style={styles.backLabel}>ALBUMS</Text>
          </Pressable>
          <Eyebrow>{ready ? `${count} WANTED` : 'WANT LIST'}</Eyebrow>
          <Text style={styles.title}>Want list</Text>
          <Text style={styles.lede}>The coins you're hunting for. Share it before a coin show. Filled slots drop off by themselves.</Text>
        </View>

        {error && <Text style={styles.error}>{error}</Text>}

        {!ready ? (
          <ActivityIndicator color={palette.goldText} style={{ marginTop: 32 }} />
        ) : count === 0 ? (
          <Card style={styles.empty}>
            <Icon name="bookmark" size={20} color={palette.goldText} />
            <Text style={styles.emptyTitle}>Nothing on your want list yet.</Text>
            <Text style={styles.emptyBody}>Open an album, tap an empty slot, and choose "I want this one".</Text>
          </Card>
        ) : (
          <>
            <Button
              label="Share list"
              onPress={share}
              leading={<Icon name="share" size={15} color={palette.goldFg} stroke={2} />}
            />
            {groups.map(group => (
              <View key={group.album.id} style={{ gap: 8 }}>
                <Pressable
                  style={styles.groupHeader}
                  onPress={() => navigation.navigate('AlbumDetail', { albumId: group.album.id })}
                  accessibilityRole="button"
                  accessibilityLabel={`Open ${group.album.title}`}
                >
                  <Text style={styles.groupTitle}>{group.album.title.toUpperCase()}</Text>
                  <Text style={styles.groupOpen}>OPEN →</Text>
                </Pressable>
                <Card style={{ overflow: 'hidden' }}>
                  {group.items.map((item, i) => (
                    <View key={item.slot.id} style={[styles.row, i > 0 && styles.rowDivider]}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.rowTitle}>{item.title}</Text>
                        {item.note && <Text style={styles.rowNote}>{item.note}</Text>}
                      </View>
                      <Pressable
                        hitSlop={10}
                        onPress={() => toggle(item.albumId, item.slot.id)}
                        accessibilityRole="button"
                        accessibilityLabel={`Remove ${item.title} from your want list`}
                      >
                        <Icon name="x" size={16} color={palette.fg4} />
                      </Pressable>
                    </View>
                  ))}
                </Card>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const useStyles = makeStyles((palette) => ({
  root: { flex: 1, backgroundColor: palette.bg },
  content: { paddingHorizontal: 20, gap: 16 },
  header: { paddingTop: 8 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 14, alignSelf: 'flex-start' },
  backLabel: { fontFamily: fontFamily.mono, fontSize: 10, color: palette.fg2, letterSpacing: 1.2 },
  title: { fontFamily: fontFamily.display, fontSize: 26, color: palette.fg, letterSpacing: -0.5, marginTop: 6 },
  lede: { fontFamily: fontFamily.ui, fontSize: 14, color: palette.fg2, lineHeight: 20, marginTop: 8 },
  error: { fontFamily: fontFamily.ui, fontSize: 13, color: palette.cLow },
  empty: { padding: 20, gap: 8, alignItems: 'flex-start' },
  emptyTitle: { fontFamily: fontFamily.ui, fontSize: 15, color: palette.fg },
  emptyBody: { fontFamily: fontFamily.ui, fontSize: 13, color: palette.fg3, lineHeight: 18 },
  groupHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 4 },
  groupTitle: { fontFamily: fontFamily.mono, fontSize: 10, color: palette.fg2, letterSpacing: 1.2 },
  groupOpen: { fontFamily: fontFamily.mono, fontSize: 10, color: palette.goldText, letterSpacing: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 16 },
  rowDivider: { borderTopWidth: 1, borderTopColor: palette.line2 },
  rowTitle: { fontFamily: fontFamily.ui, fontSize: 14, color: palette.fg },
  rowNote: { fontFamily: fontFamily.mono, fontSize: 10, color: palette.fg3, marginTop: 2, letterSpacing: 0.4 },
}));
