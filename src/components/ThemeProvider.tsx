import React, { createContext, useContext, useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import defaultAppIcon from '../assets/images/app_icon_1781726496895.jpg';

interface ThemeContextType {
  isDarkMode: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    let saved: string | null = null;
    try { saved = localStorage.getItem('theme-mode'); } catch {}
    if (saved === 'dark') return true;
    if (saved === 'light') return false;
    return false;
  });

  const [logoUrl, setLogoUrl] = useState<string>(defaultAppIcon);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'global'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.logoUrl) setLogoUrl(data.logoUrl);
        let saved: string | null = null;
        try { saved = localStorage.getItem('theme-mode'); } catch {}
        if (!saved && data.isDarkMode !== undefined) setIsDarkMode(data.isDarkMode);
      }
    }, (err) => {
      console.warn("Theme snapshot error:", err.message);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      // Dark Mode - Deep Space Purple
      document.documentElement.style.setProperty('--primary', '#818CF8');   // Indigo glow
      document.documentElement.style.setProperty('--secondary', '#A78BFA'); // Purple accent
      document.documentElement.style.setProperty('--background', '#0F0F1A'); // Deep space
      document.documentElement.style.setProperty('--surface', '#1A1A2E');   // Dark navy surface
      document.documentElement.style.setProperty('--text', '#E2E8F0');      // Cool white
      try { localStorage.setItem('theme-mode', 'dark'); } catch {}
    } else {
      document.documentElement.classList.remove('dark');
      // Light Mode - Modern Blue/Indigo
      document.documentElement.style.setProperty('--primary', '#4F46E5');   // Vivid indigo
      document.documentElement.style.setProperty('--secondary', '#7C3AED'); // Purple
      document.documentElement.style.setProperty('--background', '#F5F7FF'); // Cool light blue
      document.documentElement.style.setProperty('--surface', '#FFFFFF');   // Pure white
      document.documentElement.style.setProperty('--text', '#1E1B4B');      // Deep indigo text
      try { localStorage.setItem('theme-mode', 'light'); } catch {}
    }
  }, [isDarkMode]);

  const toggleTheme = () => setIsDarkMode(prev => !prev);

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleTheme }}>
      <div
        id="app-watermark-overlay"
        className="fixed inset-0 pointer-events-none z-0 flex items-center justify-center opacity-[0.04] dark:opacity-[0.02] transition-opacity duration-300 print:opacity-[0.03]"
        style={{
          backgroundImage: `url(${logoUrl})`,
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          backgroundSize: '400px',
        }}
      />
      <div className="relative z-10 w-full min-h-screen">
        {children}
      </div>
    </ThemeContext.Provider>
  );
}
