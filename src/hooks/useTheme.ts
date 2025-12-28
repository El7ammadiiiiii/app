"use client";

import { useState, useEffect, useCallback } from "react";

type Theme = "light" | "dark";

interface UseThemeReturn {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  isDark: boolean;
  isLight: boolean;
}

const THEME_KEY = "cccways-theme";

/**
 * useTheme - Hook لإدارة الثيم
 * =============================
 * يحفظ اختيار المستخدم في localStorage
 * يطبق data-theme على <html>
 * 
 * @example
 * const { theme, toggleTheme, isDark } = useTheme();
 * 
 * <button onClick={toggleTheme}>
 *   {isDark ? "🌙" : "☀️"}
 * </button>
 */
export function useTheme(): UseThemeReturn {
  const [theme, setThemeState] = useState<Theme>("dark");
  const [mounted, setMounted] = useState(false);

  // تحميل الثيم المحفوظ عند البداية
  useEffect(() => {
    setMounted(true);
    
    // أولاً: تحقق من localStorage
    const savedTheme = localStorage.getItem(THEME_KEY) as Theme | null;
    
    if (savedTheme && (savedTheme === "light" || savedTheme === "dark")) {
      setThemeState(savedTheme);
      document.documentElement.setAttribute("data-theme", savedTheme);
    } else {
      // ثانياً: تحقق من تفضيل النظام
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      const systemTheme: Theme = prefersDark ? "dark" : "light";
      setThemeState(systemTheme);
      document.documentElement.setAttribute("data-theme", systemTheme);
    }
  }, []);

  // تغيير الثيم
  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem(THEME_KEY, newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
  }, []);

  // تبديل الثيم
  const toggleTheme = useCallback(() => {
    const newTheme: Theme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
  }, [theme, setTheme]);

  return {
    theme: mounted ? theme : "dark", // قبل التحميل، افترض dark لتجنب hydration mismatch
    setTheme,
    toggleTheme,
    isDark: theme === "dark",
    isLight: theme === "light",
  };
}

/**
 * ThemeProvider - لف التطبيق لتوفير الثيم
 * (اختياري - يمكن استخدام useTheme مباشرة)
 */
export function getThemeScript(): string {
  return `
    (function() {
      try {
        var theme = localStorage.getItem('${THEME_KEY}');
        if (!theme) {
          theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }
        document.documentElement.setAttribute('data-theme', theme);
      } catch (e) {
        document.documentElement.setAttribute('data-theme', 'dark');
      }
    })();
  `;
}
