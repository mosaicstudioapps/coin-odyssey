// src/navigation/DashboardNavigator.tsx
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import DashboardScreen from '../screens/dashboard/DashboardScreen';
import MapScreen from '../screens/map/MapScreen';
import AchievementsScreen from '../screens/achievements/AchievementsScreen';

export type DashboardStackParamList = {
  DashboardHome: undefined;
  Map: undefined;
  Achievements: undefined;
};

const Stack = createStackNavigator<DashboardStackParamList>();

export default function DashboardNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
      initialRouteName="DashboardHome"
    >
      <Stack.Screen 
        name="DashboardHome" 
        component={DashboardScreen}
      />
      <Stack.Screen 
        name="Map" 
        component={MapScreen}
      />
      <Stack.Screen
        name="Achievements"
        component={AchievementsScreen}
      />
    </Stack.Navigator>
  );
}