import React, { createContext, useContext, useEffect, useState } from 'react';
import { api } from './lib/api';

type ThemeMode = 'light' | 'dark';

interface ThemeContextType {
  mode: ThemeMode;
  toggleTheme: () => void;
  config: any;
  visualOverrides: any[];
  getElementStyle: (pageId: string, name: string) => any;
  getComponentProps: (type: string, name?: string) => any;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useCmsStyle = (pageId: string, name: string) => {
  const context = useContext(ThemeContext);
  if (!context) return {};
  return context.getElementStyle(pageId, name);
};

export const useCmsProps = (type: string, name?: string) => {
  const context = useContext(ThemeContext);
  if (!context) return { styles: {}, content: {} };
  return context.getComponentProps(type, name);
};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('theme-mode');
    return (saved as ThemeMode) || 'light';
  });
  const [config, setConfig] = useState<any>(null);
  const [visualOverrides, setVisualOverrides] = useState<any[]>([]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const data = await api.get<any>('/api/system/config');
        if (cancelled || !data) return;
        const theme = data.theme || {};
        setConfig(theme);
        if (theme.backgroundColor) {
          document.documentElement.style.setProperty('--app-bg', theme.backgroundColor);
        } else {
          document.documentElement.style.removeProperty('--app-bg');
        }
        setVisualOverrides([]);
      } catch {
        /* public endpoint may be empty before seed */
      }
    };

    load();
    const id = setInterval(load, 30000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const getElementStyle = (pageId: string, name: string) => {
    const override = visualOverrides.find((ov) => ov.pageId === pageId && ov.name === name);
    return override?.styles || {};
  };

  const getComponentProps = (type: string, name?: string) => {
    const override = visualOverrides.find((ov) => ov.type === type && (name ? ov.name === name : true));
    return {
      styles: override?.styles || {},
      content: override?.content || {},
      icon: override?.icon || null,
    };
  };

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(mode);
    localStorage.setItem('theme-mode', mode);
  }, [mode]);

  const toggleTheme = () => {
    setMode((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  return (
    <ThemeContext.Provider
      value={{
        mode,
        toggleTheme,
        config,
        visualOverrides,
        getElementStyle,
        getComponentProps,
      }}
    >
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
