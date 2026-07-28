import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { palette, fontFamily } from '../../theme';
import { Icon, IconName } from './Icon';

export type TabId = 'dashboard' | 'scan' | 'collection' | 'albums' | 'settings';

interface Tab {
  id: TabId;
  icon: IconName;
  label: string;
}

const TABS: Tab[] = [
  { id: 'dashboard',  icon: 'home',     label: 'Home' },
  { id: 'scan',       icon: 'scan',     label: 'Scan' },
  { id: 'collection', icon: 'grid',     label: 'Collection' },
  { id: 'albums',     icon: 'album',    label: 'Albums' },
  { id: 'settings',   icon: 'settings', label: 'Settings' },
];

interface Props {
  active: TabId;
  onChange: (tab: TabId) => void;
}

export const BottomNav: React.FC<Props> = ({ active, onChange }) => {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        styles.bar,
        { paddingBottom: Math.max(insets.bottom, 12) + 6, paddingTop: 12 },
      ]}
    >
      <View style={styles.pill}>
        {TABS.map((t) => {
          const isActive = active === t.id;
          const isScan = t.id === 'scan';
          return (
            <Pressable
              key={t.id}
              onPress={() => onChange(t.id)}
              style={[
                styles.tab,
                isActive && (isScan ? styles.tabScanActive : styles.tabActive),
              ]}
            >
              <Icon
                name={t.icon}
                size={isScan ? 19 : 17}
                color={
                  isActive
                    ? isScan
                      ? palette.goldFg
                      : palette.fg
                    : palette.fg3
                }
              />
              <Text
                style={[
                  styles.label,
                  isActive && (isScan ? styles.labelScanActive : styles.labelActive),
                ]}
              >
                {t.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 14,
    backgroundColor: 'transparent',
    zIndex: 10,
  },
  pill: {
    flexDirection: 'row',
    backgroundColor: palette.bg2,
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: 999,
    padding: 6,
  },
  tab: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 999,
  },
  tabActive: {
    backgroundColor: palette.bg4,
  },
  tabScanActive: {
    backgroundColor: palette.gold,
  },
  label: {
    fontFamily: fontFamily.mono,
    fontSize: 9.5,
    letterSpacing: 0.57,
    textTransform: 'uppercase',
    color: palette.fg3,
  },
  labelActive: {
    color: palette.fg,
  },
  labelScanActive: {
    color: palette.goldFg,
  },
});
