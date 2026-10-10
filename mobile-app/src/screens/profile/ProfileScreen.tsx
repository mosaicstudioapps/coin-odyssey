import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Application from 'expo-application';

import { palette, fontFamily } from '../../theme';
import { Card, Icon, Eyebrow } from '../../components/design';
import { useAuth } from '../../hooks/useAuth';
import { CoinService } from '../../services/coinService';
import { OfflineSyncService, SyncStatus } from '../../services/offlineSyncService';
import { supabase } from '../../services/supabase';
import { Logger } from '../../services/logger';
import { useCurrency, CURRENCY_OPTIONS } from '../../contexts/CurrencyContext';
import { CurrencyPicker } from '../../components/settings/CurrencyPicker';

interface UserStats {
  totalCoins: number;
  memberSince: string;
}

interface Row {
  label: string;
  value?: string;
  chev?: boolean;
  danger?: boolean;
  muted?: boolean;
  onPress?: () => void;
}

interface Section {
  title: string;
  rows: Row[];
}

const APP_VERSION = `${Application.nativeApplicationVersion ?? '1.0.0'} (${Application.nativeBuildVersion ?? 'dev'})`;
const PRIVACY_URL = 'https://mosaicstudioapps.com/privacy';
const TERMS_URL = 'https://mosaicstudioapps.com/terms';

function describeSyncStatus(s: SyncStatus): string {
  if (!s.online) return 'Offline';
  if (s.syncing) {
    return s.pendingCount > 0
      ? `Syncing ${s.pendingCount} item${s.pendingCount === 1 ? '' : 's'}…`
      : 'Syncing…';
  }
  if (s.pendingCount > 0) {
    return `${s.pendingCount} change${s.pendingCount === 1 ? '' : 's'} pending`;
  }
  if (!s.lastSyncedAt) return 'Up to date';
  const diff = Date.now() - s.lastSyncedAt;
  if (diff < 60_000) return 'Up to date · just now';
  const m = Math.floor(diff / 60_000);
  if (m < 60) return `Up to date · ${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `Up to date · ${h}h ago`;
  return 'Up to date';
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuth();
  const { currency, setCurrency } = useCurrency();
  const [stats, setStats] = useState<UserStats>({ totalCoins: 0, memberSince: '—' });
  const [sync, setSync] = useState<SyncStatus>(OfflineSyncService.getStatus());
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    try {
      const coins = await CoinService.getUserCoins();
      const created = user?.created_at ? new Date(user.created_at) : null;
      const memberSince = created
        ? created.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }).toUpperCase()
        : '—';
      setStats({ totalCoins: coins.length, memberSince });
    } catch {
      setStats({ totalCoins: 0, memberSince: '—' });
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => OfflineSyncService.subscribe(setSync), []);

  const currencyOption = CURRENCY_OPTIONS.find((o) => o.code === currency);
  const currencyLabel = currencyOption
    ? `${currencyOption.code} · ${currencyOption.symbol}`
    : currency;

  const fullName =
    (user?.user_metadata?.firstName as string | undefined) ||
    (user?.email?.split('@')[0] as string | undefined) ||
    'Collector';
  const email = user?.email || '—';
  const initial = (fullName[0] || 'C').toUpperCase();

  const handleSignOut = useCallback(() => {
    Alert.alert('Sign out', 'Sign out of your account?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: () => {
          signOut().catch(() => undefined);
        },
      },
    ]);
  }, [signOut]);

  const handleOpenUrl = useCallback((url: string) => {
    Linking.canOpenURL(url)
      .then((ok) => {
        if (ok) return Linking.openURL(url);
        Alert.alert('Cannot open link', url);
      })
      .catch((err) => {
        Logger.error('Failed to open URL', err);
        Alert.alert('Cannot open link', url);
      });
  }, []);

  const handleDeleteAccount = useCallback(() => {
    Alert.alert(
      'Delete account',
      'This permanently deletes your account, every coin, and every collection. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete forever',
          style: 'destructive',
          onPress: async () => {
            if (deleting) return;
            setDeleting(true);
            try {
              const { data, error } = await supabase.functions.invoke('delete-account', {
                body: {},
              });
              if (error) throw error;
              if (data && (data as any).success === false) {
                throw new Error((data as any).error ?? 'Delete failed');
              }
              Logger.info('Account deleted — signing out');
              await signOut().catch(() => undefined);
            } catch (err) {
              Logger.error('Delete account failed', err);
              Alert.alert(
                'Could not delete account',
                err instanceof Error ? err.message : 'Please try again, or contact support.'
              );
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  }, [signOut, deleting]);

  const sections: Section[] = [
    {
      title: 'ACCOUNT',
      rows: [
        { label: 'Email', value: email },
        { label: 'Sync status', value: describeSyncStatus(sync) },
      ],
    },
    {
      title: 'PREFERENCES',
      rows: [
        { label: 'Theme', value: 'Dark · v1.1 light theme', muted: true },
        {
          label: 'Currency',
          value: currencyLabel,
          chev: true,
          onPress: () => setCurrencyOpen(true),
        },
        { label: 'Default grade scale', value: 'Sheldon (US)', muted: true },
      ],
    },
    {
      title: 'LEGAL',
      rows: [
        { label: 'Privacy policy', chev: true, onPress: () => handleOpenUrl(PRIVACY_URL) },
        { label: 'Terms of service', chev: true, onPress: () => handleOpenUrl(TERMS_URL) },
      ],
    },
    {
      title: 'DATA',
      rows: [
        { label: 'Sign out', chev: true, onPress: handleSignOut },
        {
          label: deleting ? 'Deleting…' : 'Delete account',
          chev: true,
          danger: true,
          onPress: deleting ? undefined : handleDeleteAccount,
        },
      ],
    },
  ];

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 110 }}>
        <View style={styles.header}>
          <Eyebrow>YOU</Eyebrow>
          <Text style={styles.headerTitle}>Settings</Text>
        </View>

        {/* Profile card */}
        <View style={styles.section}>
          <Card style={styles.profileCard}>
            <View style={styles.profileAvatar}>
              <Text style={styles.profileAvatarText}>{initial}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.profileName} numberOfLines={1}>{fullName}</Text>
              <Text style={styles.profileMeta}>
                MEMBER SINCE {stats.memberSince} · {stats.totalCoins} COIN{stats.totalCoins === 1 ? '' : 'S'}
              </Text>
            </View>
          </Card>
        </View>

        {sections.map((sec) => (
          <View key={sec.title} style={styles.section}>
            <Eyebrow style={{ paddingHorizontal: 0, marginBottom: 8 }}>{sec.title}</Eyebrow>
            <Card style={{ overflow: 'hidden' }}>
              {sec.rows.map((r, i) => (
                <Pressable
                  key={r.label}
                  onPress={r.onPress}
                  disabled={!r.onPress}
                  style={[
                    styles.row,
                    i > 0 && { borderTopWidth: 1, borderTopColor: palette.line2 },
                  ]}
                >
                  <Text
                    style={[
                      styles.rowLabel,
                      r.danger && { color: palette.cLow },
                      r.muted && !r.onPress && { color: palette.fg2 },
                    ]}
                  >
                    {r.label}
                  </Text>
                  {r.value ? (
                    <Text style={[styles.rowValue, r.muted && { color: palette.fg4 }]}>
                      {r.value}
                    </Text>
                  ) : null}
                  {r.chev ? (
                    <Icon name="chevron-right" size={14} color={palette.fg3} />
                  ) : null}
                </Pressable>
              ))}
            </Card>
          </View>
        ))}

        <View style={styles.versionFooter}>
          <Text style={styles.versionText}>COIN ODYSSEY · v{APP_VERSION}</Text>
        </View>
      </ScrollView>

      <CurrencyPicker
        visible={currencyOpen}
        current={currency}
        onSelect={(c) => setCurrency(c)}
        onClose={() => setCurrencyOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.bg },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 22 },
  headerTitle: {
    fontFamily: fontFamily.display,
    fontSize: 30,
    color: palette.fg,
    letterSpacing: -0.6,
    marginTop: 6,
  },

  section: { paddingHorizontal: 20, paddingBottom: 16 },

  profileCard: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  profileAvatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: palette.gold,
    alignItems: 'center', justifyContent: 'center',
  },
  profileAvatarText: {
    fontFamily: fontFamily.display,
    fontSize: 22,
    color: palette.goldFg,
  },
  profileName: { fontFamily: fontFamily.ui, fontSize: 15, color: palette.fg },
  profileMeta: {
    fontFamily: fontFamily.mono,
    fontSize: 10.5,
    color: palette.fg3,
    marginTop: 2,
    letterSpacing: 0.63,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 16,
  },
  rowLabel: { flex: 1, fontFamily: fontFamily.ui, fontSize: 13.5, color: palette.fg },
  rowValue: {
    fontFamily: fontFamily.mono,
    fontSize: 11,
    color: palette.fg3,
    marginRight: 6,
  },

  versionFooter: { padding: 24, alignItems: 'center' },
  versionText: { fontFamily: fontFamily.mono, fontSize: 10, color: palette.fg4, letterSpacing: 1 },
});
