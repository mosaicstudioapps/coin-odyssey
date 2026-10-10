// src/navigation/AppNavigator.tsx
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, ActivityIndicator, Alert, Linking } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useAuth } from '../hooks/useAuth';
import AuthNavigator from './AuthNavigator';
import MainTabNavigator from './MainTabNavigator';
import ResetPasswordScreen from '../screens/auth/ResetPasswordScreen';
import { AuthService } from '../services/auth';
import { RootStackParamList } from '../types/navigation';
import { fontFamily, makeStyles, useTheme } from '../theme';
import { Logger } from '../services/logger';

const Stack = createStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  const styles = useStyles();
  const { palette, scheme } = useTheme();
  const { user, loading } = useAuth();
  const [passwordRecovery, setPasswordRecovery] = useState(false);
  const handledUrl = useRef<string | null>(null);

  useEffect(() => {
    const handleUrl = async (url: string | null) => {
      if (!url || !AuthService.isPasswordRecoveryUrl(url)) return;
      if (handledUrl.current === url) return;
      handledUrl.current = url;

      const result = await AuthService.completePasswordRecovery(url);
      if (result.ok) {
        setPasswordRecovery(true);
      } else {
        Alert.alert(
          'Password reset',
          result.message ?? 'This reset link is invalid or has expired. Request a new one.'
        );
      }
    };

    const subscription = Linking.addEventListener('url', ({ url }) => {
      void handleUrl(url);
    });
    Linking.getInitialURL().then((url) => void handleUrl(url));
    return () => subscription.remove();
  }, []);

  Logger.debug('AppNavigator render', {
    hasUser: !!user,
    userEmail: user?.email,
    loading
  });

  if (loading) {
    Logger.debug('AppNavigator: Still loading auth state');
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingTitle}>Coin Odyssey</Text>
        <ActivityIndicator size="large" color={palette.goldText} style={styles.loadingSpinner} />
      </View>
    );
  }

  const navTheme = {
    ...DefaultTheme,
    dark: scheme === 'dark',
    colors: {
      ...DefaultTheme.colors,
      background: palette.bg,
      card: palette.bg2,
      text: palette.fg,
      border: palette.line as string,
      primary: palette.goldText,
    },
  };

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          gestureEnabled: true,
          cardStyle: { backgroundColor: palette.bg },
        }}
      >
        {user && passwordRecovery ? (
          <Stack.Screen name="ResetPassword">
            {() => <ResetPasswordScreen onDone={() => setPasswordRecovery(false)} />}
          </Stack.Screen>
        ) : user ? (
          <Stack.Screen name="Main" component={MainTabNavigator} />
        ) : (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const useStyles = makeStyles((palette) => ({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: palette.bg,
  },
  loadingTitle: {
    fontFamily: fontFamily.display,
    fontSize: 32,
    color: palette.goldText,
    letterSpacing: -0.6,
    marginBottom: 24,
  },
  loadingSpinner: {
    marginTop: 8,
  },
}));