"use client";

import * as React from "react";
import { Moon, Sun, Monitor } from "lucide-react";
import { useTheme } from "next-themes";
import { motion, AnimatePresence } from "framer-motion";

type ThemeType = "light" | "normal" | "dark";

const themeOrder: ThemeType[] = ["light", "normal", "dark"];

const themeIcons = {
  light: Sun,
  normal: Monitor,
  dark: Moon,
};

const themeLabels = {
  light: "فاتح",
  normal: "متوازن",
  dark: "داكن",
};

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="w-10 h-10 rounded-full bg-white/10 dark:bg-black/10 animate-pulse" />
    );
  }

  // استخدام theme مباشرة - next-themes يحفظه في localStorage
  const currentTheme = (theme as ThemeType) || "normal";
  const currentIndex = themeOrder.indexOf(currentTheme);
  // إذا لم يُعثر على الثيم في القائمة، نبدأ من البداية
  const safeIndex = currentIndex === -1 ? 0 : currentIndex;
  const nextTheme = themeOrder[(safeIndex + 1) % themeOrder.length];
  const Icon = themeIcons[currentTheme] || Monitor;

  

  return (
    <div className="flex flex-col items-center gap-1">
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setTheme(nextTheme)}
        className="relative w-10 h-10 rounded-full border border-border
                   bg-muted/50 backdrop-blur-sm
                   flex items-center justify-center
                   hover:bg-muted
                   transition-colors duration-300"
        aria-label={`تبديل إلى ${themeLabels[nextTheme]}`}
        title={`الوضع الحالي: ${themeLabels[currentTheme]} - انقر للتبديل`}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={currentTheme}
            initial={{ y: -20, opacity: 0, rotate: -90 }}
            animate={{ y: 0, opacity: 1, rotate: 0 }}
            exit={{ y: 20, opacity: 0, rotate: 90 }}
            transition={{ duration: 0.2 }}
          >
            <Icon className="h-5 w-5 text-primary" />
          </motion.div>
        </AnimatePresence>
      </motion.button>
      <span className="text-[10px] text-muted-foreground">{themeLabels[currentTheme]}</span>
    </div>
  );
}

/* مكون إضافي لعرض قائمة منسدلة للاختيار */
export function ThemeSelector() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  const [isOpen, setIsOpen] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const currentTheme = (theme as ThemeType) || "normal";

  return (
    <div className="relative">
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border
                   bg-muted/50 hover:bg-muted transition-colors"
      >
        {React.createElement(themeIcons[currentTheme], { className: "w-4 h-4 text-primary" })}
        <span className="text-sm font-medium">{themeLabels[currentTheme]}</span>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className="absolute top-full mt-2 right-0 z-50 min-w-[140px]
                         theme-card border border-border rounded-xl shadow-lg
                         overflow-hidden"
            >
              {themeOrder.map((t) => {
                const ThemeIcon = themeIcons[t];
                return (
                  <button
                    key={t}
                    onClick={() => {
                      setTheme(t);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-sm
                               transition-colors ${
                                 currentTheme === t
                                   ? "bg-primary/10 text-primary"
                                   : "text-foreground hover:bg-muted"
                               }`}
                  >
                    <ThemeIcon className="w-4 h-4" />
                    <span>{themeLabels[t]}</span>
                    {currentTheme === t && (
                      <motion.div
                        layoutId="theme-check"
                        className="mr-auto w-2 h-2 rounded-full bg-primary"
                      />
                    )}
                  </button>
                );
              })}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
