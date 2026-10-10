import React, { useEffect } from 'react';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AppNavigator from './src/navigation/AppNavigator';
import { ImageService } from './src/services/imageService';
import { PerformanceService } from './src/services/performanceService';
import { MemoryService } from './src/services/memoryService';
import { OptimizedGlassmorphismStyles } from './src/styles/optimizedEffects';
import { Logger } from './src/services/logger';
import { ErrorBoundary } from './src/components/common';
import { AppStartupTracker, RealPerformanceTracker } from './src/utils/realPerformanceTracker';
import { MemoryMonitor } from './src/utils/memoryMonitor';
import { registerScreenPreloads, PreloadingStrategy } from './src/utils/preloadingStrategy';
import { useAppFonts, useTheme, ThemeProvider } from './src/theme';
import { OfflineSyncService } from './src/services/offlineSyncService';
import { CurrencyProvider } from './src/contexts/CurrencyContext';
import { AchievementsProvider } from './src/contexts/AchievementsContext';
import { initCrashReporting, wrap } from './src/services/crashReporting';

// Initialize crash reporting as early as possible, before the first render.
// No-op unless EXPO_PUBLIC_SENTRY_DSN is configured.
initCrashReporting();

function App() {
  const fontsLoaded = useAppFonts();

  useEffect(() => {
    // Mark app start
    AppStartupTracker.markMilestone('App component mounted');

    // Register screen preloads
    registerScreenPreloads();
    AppStartupTracker.markMilestone('Preload tasks registered');

    // Initialize performance monitoring
    const initializeServices = async () => {
      try {
        Logger.info('Initializing application services...');
        RealPerformanceTracker.mark('services-init-start');

        // Start real memory monitoring
        MemoryMonitor.startMonitoring();
        AppStartupTracker.markMilestone('Memory monitoring started');

        // Initialize performance service first
        await PerformanceService.getInstance().initialize();
        AppStartupTracker.markMilestone('Performance service initialized');

        // Initialize memory service
        MemoryService.getInstance().initialize();
        AppStartupTracker.markMilestone('Memory service initialized');

        // Initialize optimized styles with performance awareness
        OptimizedGlassmorphismStyles.initialize();
        AppStartupTracker.markMilestone('Optimized styles initialized');

        // Initialize image caching service
        await ImageService.initialize({
          maxCacheSize: 150, // 150MB cache
          maxAge: 14 * 24 * 60 * 60 * 1000, // 14 days
          compressionQuality: 0.8,
          thumbnailSize: { width: 200, height: 200 },
        });
        AppStartupTracker.markMilestone('Image service initialized');

        RealPerformanceTracker.mark('services-init-end');
        const initDuration = RealPerformanceTracker.measure(
          'ServicesInitialization',
          'services-init-start',
          'services-init-end'
        );

        Logger.info('All services initialized successfully', {
          duration: `${initDuration}ms`,
          totalStartupTime: `${AppStartupTracker.getTotalStartupTime()}ms`,
          milestones: AppStartupTracker.getMilestones(),
        });

        // Start strategic preloading after startup
        PreloadingStrategy.preloadAfterStartup();
        AppStartupTracker.markMilestone('Preloading started');

        // Start offline sync watcher (NetInfo + auto-flush on reconnect)
        await OfflineSyncService.start();
        AppStartupTracker.markMilestone('Offline sync service started');
      } catch (error) {
        Logger.error('Failed to initialize services', error);
      }
    };

    initializeServices();

    // Cleanup on unmount
    return () => {
      MemoryMonitor.stopMonitoring();
      OfflineSyncService.stop();
    };
  }, []);

  return (
    <ThemeProvider>
      <ThemedRoot fontsLoaded={fontsLoaded} />
    </ThemeProvider>
  );
}

/** Everything below the theme, so it can read the active palette. */
function ThemedRoot({ fontsLoaded }: { fontsLoaded: boolean }) {
  const { palette, scheme, ready } = useTheme();

  // The native window shows through during transitions and behind the
  // keyboard; keep it the theme's background instead of the build-time one.
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(palette.bg).catch(() => {});
  }, [palette.bg]);

  // Wait for the saved theme too, so someone who chose Light never sees a
  // dark first frame.
  if (!fontsLoaded || !ready) {
    return <GestureHandlerRootView style={{ flex: 1, backgroundColor: palette.bg }} />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: palette.bg }}>
      <ErrorBoundary
        fallbackTitle="App Error"
        fallbackMessage="The app encountered an unexpected error. Please restart the app."
      >
        <CurrencyProvider>
          <AchievementsProvider>
            <AppNavigator />
          </AchievementsProvider>
        </CurrencyProvider>
        <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}

export default wrap(App);
