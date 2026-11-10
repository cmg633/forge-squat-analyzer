import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

interface ThemeContextType {
  theme: 'dark';
  isKonami: boolean;
  triggerPixelRain: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'dark',
  isKonami: false,
  triggerPixelRain: () => {},
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isKonami, setIsKonami] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('light');
    root.classList.add('dark');
  }, []);

  const triggerPixelRain = useCallback(async () => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    try {
      const { default: confetti } = await import('canvas-confetti');
      const defaults = {
        origin: { y: 0.1 },
        colors: ['#CCFF00', '#F040B8', '#A97BFF', '#F5FF00', '#F4F4EE'],
        ticks: 260,
        gravity: 1.2,
        shapes: ['square'] as ('square' | 'circle')[],
        scalar: 1.1,
      };
      confetti({ ...defaults, particleCount: 70, spread: 60 });
      confetti({ ...defaults, particleCount: 50, spread: 90, origin: { x: 0.25, y: 0.1 } });
      confetti({ ...defaults, particleCount: 50, spread: 90, origin: { x: 0.75, y: 0.1 } });
    } catch {
      // ignore if confetti fails to load
    }
  }, []);

  useEffect(() => {
    const konamiSequence = [
      'ArrowUp', 'ArrowUp',
      'ArrowDown', 'ArrowDown',
      'ArrowLeft', 'ArrowRight',
      'ArrowLeft', 'ArrowRight',
      'b', 'a',
    ];
    let keyIndex = 0;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === konamiSequence[keyIndex].toLowerCase()) {
        keyIndex++;
        if (keyIndex === konamiSequence.length) {
          keyIndex = 0;
          setIsKonami((prev) => {
            const next = !prev;
            document.documentElement.classList.toggle('konami-mode', next);
            if (next) triggerPixelRain();
            return next;
          });
        }
      } else {
        keyIndex = 0;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [triggerPixelRain]);

  return (
    <ThemeContext.Provider value={{ theme: 'dark', isKonami, triggerPixelRain }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
