import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Slot } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import 'react-native-reanimated';

import ErrorBoundary from '@/components/ErrorBoundary';
import { useColorScheme } from '@/hooks/useColorScheme';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    // Minimal global handlers to prevent unhandled errors from surfacing raw stacks to users.
    const onUnhandled = (e: any) => {
      // eslint-disable-next-line no-console
      console.error('Unhandled error:', e?.reason ?? e);
    };

    // @ts-ignore - globalThis handlers may vary by environment
    if (typeof globalThis?.addEventListener === 'function') {
      // web-like environments
      try {
        // @ts-ignore
        globalThis.addEventListener('unhandledrejection', onUnhandled);
        // @ts-ignore
        globalThis.addEventListener('error', onUnhandled);
      } catch (e) {
        // ignore
      }
    }

    return () => {
      try {
        // @ts-ignore
        globalThis.removeEventListener?.('unhandledrejection', onUnhandled);
        // @ts-ignore
        globalThis.removeEventListener?.('error', onUnhandled);
      } catch (e) {
        // ignore
      }
    };
  }, []);

  if (!loaded) {
    // Async font loading only occurs in development.
    return null;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <ErrorBoundary>
        <Slot />
      </ErrorBoundary>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
