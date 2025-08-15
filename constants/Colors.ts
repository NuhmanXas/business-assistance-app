/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

const tintColorLight = '#0a7ea4';
const tintColorDark = '#fff';

export const Colors = {
  light: {
    text: '#11181C',
    textSecondary: '#65737a',
    textTertiary: '#9aa6ab',
    background: '#fff',
    tint: tintColorLight,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
    border: '#e6eef2',
    borderLight: '#f3f6f8',
    surface: '#ffffff',
    error: '#ef4444',
    success: '#10b981',
    warning: '#f59e0b',
    purple: '#764ba2',
    gradient: {
      primary: ['#667eea', '#764ba2'],
      success: ['#10b981', '#059669'],
    },
  },
  dark: {
    text: '#ECEDEE',
    textSecondary: '#b9c0c4',
    textTertiary: '#9ba1a6',
    background: '#151718',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
    border: '#222527',
    borderLight: '#1b1d1e',
    surface: '#161718',
    error: '#f87171',
    success: '#34d399',
    warning: '#fbbf24',
    purple: '#8b5cf6',
    gradient: {
      primary: ['#3a3a3a', '#111111'],
      success: ['#16a34a', '#059669'],
    },
  },
};

// Small theme object used across screens for spacing, typography and shadows.
export const AppTheme = {
  spacing: {
    xs: 6,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
  },
  typography: {
    h2: { fontSize: 22, fontWeight: '700' },
    h3: { fontSize: 20, fontWeight: '700' },
    h4: { fontSize: 16, fontWeight: '600' },
    body: { fontSize: 14, fontWeight: '400' },
    bodySmall: { fontSize: 12, fontWeight: '400' },
  },
  borderRadius: {
    full: 9999,
    lg: 12,
    md: 8,
  },
  shadows: {
    medium: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 6,
      elevation: 3,
    },
  },
};
