"use client";

import { useEffect, useCallback } from "react";
import confetti from "canvas-confetti";

interface ConfettiEffectProps {
  trigger?: boolean;
  onComplete?: () => void;
}

export function ConfettiEffect({ trigger = false, onComplete }: ConfettiEffectProps) {
  useEffect(() => {
    if (trigger) {
      fireConfetti();
      onComplete?.();
    }
  }, [trigger, onComplete]);

  return null;
}

// ═══════════════════════════════════════════════════════════════
// Confetti Functions
// ═══════════════════════════════════════════════════════════════

/**
 * تأثير الاحتفال الأساسي
 */
export function fireConfetti() {
  const count = 200;
  const defaults = {
    origin: { y: 0.7 },
    zIndex: 9999,
  };

  function fire(particleRatio: number, opts: confetti.Options) {
    confetti({
      ...defaults,
      ...opts,
      particleCount: Math.floor(count * particleRatio),
    });
  }

  fire(0.25, {
    spread: 26,
    startVelocity: 55,
  });

  fire(0.2, {
    spread: 60,
  });

  fire(0.35, {
    spread: 100,
    decay: 0.91,
    scalar: 0.8,
  });

  fire(0.1, {
    spread: 120,
    startVelocity: 25,
    decay: 0.92,
    scalar: 1.2,
  });

  fire(0.1, {
    spread: 120,
    startVelocity: 45,
  });
}

/**
 * تأثير النجوم
 */
export function fireStars() {
  const defaults = {
    spread: 360,
    ticks: 50,
    gravity: 0,
    decay: 0.94,
    startVelocity: 30,
    shapes: ["star"] as confetti.Shape[],
    colors: ["FFE400", "FFBD00", "E89400", "FFCA6C", "FDFFB8"],
    zIndex: 9999,
  };

  function shoot() {
    confetti({
      ...defaults,
      particleCount: 40,
      scalar: 1.2,
      shapes: ["star"] as confetti.Shape[],
    });

    confetti({
      ...defaults,
      particleCount: 10,
      scalar: 0.75,
      shapes: ["circle"] as confetti.Shape[],
    });
  }

  setTimeout(shoot, 0);
  setTimeout(shoot, 100);
  setTimeout(shoot, 200);
}

/**
 * تأثير من الجانبين
 */
export function fireSideCannons() {
  const end = Date.now() + 1 * 1000; // 1 second

  const colors = ["#22c55e", "#3b82f6", "#8b5cf6", "#f59e0b", "#ef4444"];

  (function frame() {
    confetti({
      particleCount: 2,
      angle: 60,
      spread: 55,
      origin: { x: 0 },
      colors: colors,
      zIndex: 9999,
    });
    
    confetti({
      particleCount: 2,
      angle: 120,
      spread: 55,
      origin: { x: 1 },
      colors: colors,
      zIndex: 9999,
    });

    if (Date.now() < end) {
      requestAnimationFrame(frame);
    }
  })();
}

/**
 * تأثير واقعي (مثل الألعاب النارية)
 */
export function fireRealistic() {
  const duration = 1500;
  const animationEnd = Date.now() + duration;
  const defaults = { 
    startVelocity: 30, 
    spread: 360, 
    ticks: 60, 
    zIndex: 9999 
  };

  function randomInRange(min: number, max: number) {
    return Math.random() * (max - min) + min;
  }

  const interval = setInterval(function () {
    const timeLeft = animationEnd - Date.now();

    if (timeLeft <= 0) {
      return clearInterval(interval);
    }

    const particleCount = 50 * (timeLeft / duration);

    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
    });
    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
    });
  }, 250);
}

/**
 * تأثير ناعم (للإنجازات الصغيرة)
 */
export function fireSoft() {
  confetti({
    particleCount: 50,
    spread: 60,
    origin: { y: 0.6 },
    colors: ["#22c55e", "#16a34a", "#15803d"],
    zIndex: 9999,
  });
}

/**
 * تأثير إنشاء مشروع جديد
 */
export function fireProjectCreated() {
  // أول انفجار
  confetti({
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 },
    zIndex: 9999,
  });

  // انفجار ثاني بعد تأخير قليل
  setTimeout(() => {
    confetti({
      particleCount: 50,
      angle: 60,
      spread: 55,
      origin: { x: 0 },
      zIndex: 9999,
    });
    confetti({
      particleCount: 50,
      angle: 120,
      spread: 55,
      origin: { x: 1 },
      zIndex: 9999,
    });
  }, 200);
}

// ═══════════════════════════════════════════════════════════════
// Hook للاستخدام في المكونات
// ═══════════════════════════════════════════════════════════════

export function useConfetti() {
  const celebrate = useCallback((type: "default" | "stars" | "side" | "realistic" | "soft" | "project" = "default") => {
    switch (type) {
      case "stars":
        fireStars();
        break;
      case "side":
        fireSideCannons();
        break;
      case "realistic":
        fireRealistic();
        break;
      case "soft":
        fireSoft();
        break;
      case "project":
        fireProjectCreated();
        break;
      default:
        fireConfetti();
    }
  }, []);

  return { celebrate };
}
