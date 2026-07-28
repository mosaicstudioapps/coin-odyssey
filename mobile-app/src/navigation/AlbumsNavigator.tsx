// src/navigation/AlbumsNavigator.tsx
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { AlbumsStackParamList } from '../types/navigation';
import AlbumsListScreen from '../screens/albums/AlbumsListScreen';
import AlbumDetailScreen from '../screens/albums/AlbumDetailScreen';

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
    </Stack.Navigator>
  );
}
