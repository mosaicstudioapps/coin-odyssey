import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';

import { BottomNav, TabId } from '../components/design';
import DashboardNavigator from './DashboardNavigator';
import ScanNavigator from './ScanNavigator';
import CollectionNavigator from './CollectionNavigator';
import AlbumsNavigator from './AlbumsNavigator';
import ProfileScreen from '../screens/profile/ProfileScreen';

const Tab = createBottomTabNavigator();

const ROUTE_TO_TAB: Record<string, TabId> = {
  Dashboard: 'dashboard',
  Scan: 'scan',
  Collection: 'collection',
  Albums: 'albums',
  Settings: 'settings',
};

const TAB_TO_ROUTE: Record<TabId, string> = {
  dashboard: 'Dashboard',
  scan: 'Scan',
  collection: 'Collection',
  albums: 'Albums',
  settings: 'Settings',
};

function TabBar({ state, navigation }: BottomTabBarProps) {
  const current = state.routes[state.index].name;
  const activeTab = ROUTE_TO_TAB[current] || 'dashboard';

  return (
    <BottomNav
      active={activeTab}
      onChange={(tab) => {
        const target = TAB_TO_ROUTE[tab];
        if (target !== current) {
          navigation.navigate(target);
        }
      }}
    />
  );
}

export default function MainTabNavigator() {
  return (
    <Tab.Navigator
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ headerShown: false }}
      initialRouteName="Dashboard"
    >
      <Tab.Screen name="Dashboard" component={DashboardNavigator} />
      <Tab.Screen name="Scan" component={ScanNavigator} />
      <Tab.Screen name="Collection" component={CollectionNavigator} />
      <Tab.Screen name="Albums" component={AlbumsNavigator} />
      <Tab.Screen name="Settings" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
