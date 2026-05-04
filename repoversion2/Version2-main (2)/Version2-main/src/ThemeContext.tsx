import React, { createContext, useContext, useEffect, useState } from 'react';
import { db } from './lib/firebase';
import { doc, onSnapshot, collection } from 'firebase/firestore';

type ThemeMode = 'light' | 'dark';

interface ThemeContextType {
  mode: ThemeMode;
  toggleTheme: () => void;
  config: any;
  visualOverrides: any[];
  getElementStyle: (pageId: string, name: string) => any;
  getComponentProps: (type: string, name?: string) => any;
  getContent: (name: string) => any;
  getConfig: (name: string) => any;
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
  const [persistedOverrides, setPersistedOverrides] = useState<any[]>([]);
  const [previewOverrides, setPreviewOverrides] = useState<any[]>([]);

  // Combine persisted and preview overrides, giving priority to preview
  const visualOverrides = React.useMemo(() => {
    const combined = [...persistedOverrides];
    previewOverrides.forEach(preview => {
      const index = combined.findIndex(ov => ov.name?.toLowerCase() === preview.name?.toLowerCase());
      if (index !== -1) {
        combined[index] = { ...combined[index], ...preview };
      } else {
        combined.push(preview);
      }
    });
    return combined;
  }, [persistedOverrides, previewOverrides]);

  useEffect(() => {
    // Listen to real-time preview messages from the parent dashboard
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'CMS_REALTIME_PREVIEW') {
        const { elementName, content, styles, config: elementConfig } = event.data;
        const standardizedName = elementName.toLowerCase();
        
        setPreviewOverrides(prev => {
          const index = prev.findIndex(ov => ov.name === standardizedName);
          if (index !== -1) {
            const updated = [...prev];
            updated[index] = {
              ...updated[index],
              content: content !== undefined ? { ...updated[index].content, ...content } : updated[index].content,
              styles: styles !== undefined ? { ...updated[index].styles, ...styles } : updated[index].styles,
              attributes: event.data.attributes !== undefined ? { ...updated[index].attributes, ...event.data.attributes } : updated[index].attributes,
              config: elementConfig !== undefined ? { ...updated[index].config, ...elementConfig } : updated[index].config
            };
            return updated;
          } else {
            return [...prev, { name: standardizedName, content, styles, config: elementConfig, attributes: event.data.attributes }];
          }
        });
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  useEffect(() => {
    // Listen to global system config for theme overrides
    const unsubscribeConfig = onSnapshot(doc(db, 'system_config', 'global'), (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setConfig(data.theme || {});
        
        // Apply custom background color if set in admin
        if (data.theme?.backgroundColor) {
          document.documentElement.style.setProperty('--app-bg', data.theme.backgroundColor);
        } else {
          document.documentElement.style.removeProperty('--app-bg');
        }
      }
    });

    // Listen to granular visual overrides for components
    const unsubscribeVisual = onSnapshot(collection(db, 'cms_visual_elements'), (snapshot) => {
      setPersistedOverrides(snapshot.docs.map(doc => {
        const data = doc.data();
        return { id: doc.id, ...data, name: (data.name || doc.id).toLowerCase() };
      }));
    });

    return () => {
      unsubscribeConfig();
      unsubscribeVisual();
    };
  }, []);

  useEffect(() => {
    try {
      // Inject dynamic stylesheet based on visual overrides
      let styleTag = document.getElementById('cms-dynamic-styles');
      if (!styleTag) {
        styleTag = document.createElement('style');
        styleTag.id = 'cms-dynamic-styles';
        document.head.appendChild(styleTag);
      }

      const cssRules = visualOverrides
        .map(ov => {
          const selector = ov.name; 
          if (!selector || !ov.styles) return '';
          
          const styles = Object.entries(ov.styles)
            .map(([key, value]) => {
              const k = key.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
              return `  ${k}: ${value} !important;`;
            })
            .join('\n');
          
          return `${selector} {\n${styles}\n}`;
        })
        .join('\n\n');

      styleTag.innerHTML = cssRules;
    } catch (e) {
      console.warn("CMS Dynamic Style Generation Failed:", e);
    }

    visualOverrides.forEach(ov => {
      if (!ov.attributes) return;
      const elements = document.querySelectorAll(ov.name);
      elements.forEach(el => {
        Object.entries(ov.attributes).forEach(([key, value]) => {
          el.setAttribute(key, value as string);
        });
      });
    });
  }, [visualOverrides]);

  const getElementStyle = (pageId: string, name: string) => {
    const override = visualOverrides.find(ov => ov.pageId === pageId && ov.name?.toLowerCase() === name.toLowerCase());
    return override?.styles || {};
  };

  const getComponentProps = (type: string, name?: string) => {
    const n = name?.toLowerCase();
    const override = visualOverrides.find(ov => 
      ov.type === type && (n ? ov.name?.toLowerCase() === n : true)
    );
    return {
      styles: override?.styles || {},
      content: override?.content || {},
      config: override?.config || {},
      icon: override?.icon || null
    };
  };

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(mode);
    localStorage.setItem('theme-mode', mode);
  }, [mode]);

  const toggleTheme = () => {
    setMode(prev => prev === 'light' ? 'dark' : 'light');
  };

  return (
    <ThemeContext.Provider value={{ 
      mode, 
      toggleTheme, 
      config, 
      visualOverrides, 
      getElementStyle,
      getComponentProps,
      getContent: (name: string) => {
        const override = visualOverrides.find(ov => ov.name?.toLowerCase() === name.toLowerCase());
        return override?.content || {};
      },
      getConfig: (name: string) => {
        const override = visualOverrides.find(ov => ov.name?.toLowerCase() === name.toLowerCase());
        return override?.config || {};
      }
    }}>
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
