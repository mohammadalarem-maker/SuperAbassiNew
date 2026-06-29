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
  if (!context) throw new Error('useTheme must be used within a ThemeProvider');
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
    }, (err) => console.warn("Theme error:", err.message));
    return () => unsub();
  }, []);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      document.documentElement.style.setProperty('--primary', '#FF6B35');
      document.documentElement.style.setProperty('--secondary', '#FF8C42');
      document.documentElement.style.setProperty('--background', '#1A1A2E');
      document.documentElement.style.setProperty('--surface', '#16213E');
      document.documentElement.style.setProperty('--text', '#F1F5F9');
      document.documentElement.style.setProperty('--bg-gradient', 'linear-gradient(160deg, #1A1A2E 0%, #16213E 50%, #0F3460 100%)');
      try { localStorage.setItem('theme-mode', 'dark'); } catch {}
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.style.setProperty('--primary', '#FF6B35');
      document.documentElement.style.setProperty('--secondary', '#FF8C42');
      document.documentElement.style.setProperty('--background', '#FFF5F0');
      document.documentElement.style.setProperty('--surface', '#FFFFFF');
      document.documentElement.style.setProperty('--text', '#1A1A2E');
      document.documentElement.style.setProperty('--bg-gradient', 'linear-gradient(160deg, #FF6B35 0%, #FF8C42 40%, #FFB347 100%)');
      try { localStorage.setItem('theme-mode', 'light'); } catch {}
    }
  }, [isDarkMode]);

  const toggleTheme = () => setIsDarkMode(prev => !prev);

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleTheme }}>
      <div
        id="app-watermark-overlay"
        className="fixed inset-0 pointer-events-none z-0 flex items-center justify-center opacity-[0.03] transition-opacity duration-300"
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
