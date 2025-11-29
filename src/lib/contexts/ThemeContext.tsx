/**
 * ThemeContext.tsx
 * 
 * This file defines a React context for managing and providing theme-related state across the application.
 * It allows the application to support light, dark, and auto (system preference) themes.
 * 
 * Exports:
 * - ThemeProvider: A context provider component that wraps the application and provides theme state.
 * - useTheme: A custom hook to access the theme context values.
 * 
 * Types:
 * - Theme: Represents the possible theme values ('light', 'dark', 'auto').
 * - ThemeContextType: Defines the structure of the theme context, including the current theme, effective theme, and a setter function.
 * 
 * Functionality:
 * - Persists the user-selected theme in localStorage.
 * - Dynamically applies the appropriate theme class to the document root.
 * - Supports system preference for themes when 'auto' is selected.
 */

'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Theme = 'light' | 'dark' | 'auto';

interface ThemeContextType {
  theme: Theme;
  effectiveTheme: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('dark');
  const [effectiveTheme, setEffectiveTheme] = useState<'light' | 'dark'>('dark');

  useEffect(() => {
    // Load theme from localStorage
    const stored = localStorage.getItem('theme') as Theme;
    if (stored) {
      setThemeState(stored);
    }
  }, []);

  useEffect(() => {
    // Determine effective theme
    let effective: 'light' | 'dark' = 'light';

    if (theme === 'auto') {
      // Use system preference
      effective = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } else {
      effective = theme;
    }

    setEffectiveTheme(effective);

    // Apply to document
    if (effective === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('theme', newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, effectiveTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
