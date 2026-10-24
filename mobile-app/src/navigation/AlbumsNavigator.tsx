// src/navigation/AlbumsNavigator.tsx
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { AlbumsStackParamList } from '../types/navigation';
import AlbumsListScreen from '../screens/albums/AlbumsListScreen';
import AlbumDetailScreen from '../screens/albums/AlbumDetailScreen';
import WantListScreen from '../screens/albums/WantListScreen';

const Stack = createStackNavigator<AlbumsStackParamList>();

export default function AlbumsNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        gestureEnabled: true,
        cardStyle: { backgroundColor: 'transparent' },
      }}
      initialRouteName="AlbumsList"
    >
      <Stack.Screen name="AlbumsList" component={AlbumsListScreen} />
      <Stack.Screen name="AlbumDetail" component={AlbumDetailScreen} />
      <Stack.Screen name="WantList" component={WantListScreen} />
    </Stack.Navigator>
  );
}
