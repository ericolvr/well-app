import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as SecureStore from 'expo-secure-store';

const THEME_STORAGE_KEY = 'well_theme';

export type ThemeColors = {
  page: string;
  surface: string;
  surfaceMuted: string;
  input: string;
  border: string;
  borderStrong: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  accent: string;
  accentSoft: string;
  accentText: string;
  shadow: string;
  disabled: string;
};

export const LIGHT_THEME: ThemeColors = {
  page: '#F2F3F7',
  surface: '#FFFFFF',
  surfaceMuted: '#F1F1EC',
  input: '#FFFFFF',
  border: '#ECECE6',
  borderStrong: '#E7E7E2',
  text: '#141412',
  textSecondary: '#7A7A74',
  textMuted: '#9B9B95',
  accent: '#5756E8',
  accentSoft: '#E4E3FB',
  accentText: '#FFFFFF',
  shadow: '#141412',
  disabled: '#EDEDE7',
};

export const DARK_THEME: ThemeColors = {
  page: '#0A0A0A',
  surface: '#171715',
  surfaceMuted: '#201F1C',
  input: '#171715',
  border: 'rgba(255,255,255,0.045)',
  borderStrong: 'rgba(255,255,255,0.07)',
  text: '#F4F4F1',
  textSecondary: '#ABABA4',
  textMuted: '#8A8A85',
  accent: '#5756E8',
  accentSoft: 'rgba(87,86,232,0.18)',
  accentText: '#FFFFFF',
  shadow: '#000000',
  disabled: '#2A2A2E',
};

type ThemeContextValue = {
  isDark: boolean;
  colors: ThemeColors;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    SecureStore.getItemAsync(THEME_STORAGE_KEY)
      .then((value) => setIsDark(value === 'dark'))
      .catch(() => undefined);
  }, []);

  const toggleTheme = useCallback(() => {
    setIsDark((current) => {
      const next = !current;
      SecureStore.setItemAsync(THEME_STORAGE_KEY, next ? 'dark' : 'light').catch(() => undefined);
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({
      isDark,
      colors: isDark ? DARK_THEME : LIGHT_THEME,
      toggleTheme,
    }),
    [isDark, toggleTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
}
