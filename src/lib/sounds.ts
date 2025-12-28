/**
 * ═══════════════════════════════════════════════════════════════
 * نظام الأصوات - CCCWAYS Projects System
 * ═══════════════════════════════════════════════════════════════
 * 
 * مدير المؤثرات الصوتية للتطبيق
 * يستخدم data URIs للأصوات الافتراضية ويدعم أصوات مخصصة
 */

import type { SoundEffect } from "@/types/project";

// ═══════════════════════════════════════════════════════════════
// روابط الأصوات الافتراضية (Web Audio API generated)
// ═══════════════════════════════════════════════════════════════

// سنستخدم Web Audio API لتوليد الأصوات
const audioContext = typeof window !== "undefined" 
  ? new (window.AudioContext || (window as any).webkitAudioContext)() 
  : null;

/**
 * توليد صوت بسيط باستخدام Web Audio API
 */
function createTone(
  frequency: number,
  duration: number,
  type: OscillatorType = "sine",
  volume: number = 0.3
): void {
  if (!audioContext) return;
  
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  oscillator.frequency.value = frequency;
  oscillator.type = type;
  
  gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
  
  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + duration);
}

/**
 * تشغيل نغمة متعددة النوتات
 */
function playChime(frequencies: number[], duration: number = 0.15, gap: number = 0.05): void {
  frequencies.forEach((freq, index) => {
    setTimeout(() => {
      createTone(freq, duration, "sine", 0.2);
    }, index * (duration * 1000 + gap * 1000));
  });
}

// ═══════════════════════════════════════════════════════════════
// مؤثرات صوتية محددة مسبقاً
// ═══════════════════════════════════════════════════════════════

export const soundEffects: Record<SoundEffect, () => void> = {
  // صوت إنشاء مشروع جديد - نغمة صاعدة سعيدة
  projectCreate: () => {
    playChime([523.25, 659.25, 783.99], 0.12, 0.05); // C5, E5, G5
  },

  // صوت حذف - نغمة هابطة
  projectDelete: () => {
    playChime([392, 329.63, 261.63], 0.1, 0.03); // G4, E4, C4
  },

  // صوت نقل محادثة - صوت سحب
  chatMove: () => {
    createTone(440, 0.1, "triangle", 0.15);
    setTimeout(() => createTone(494, 0.15, "triangle", 0.2), 100);
  },

  // صوت إفلات - صوت وضع
  chatDrop: () => {
    createTone(523.25, 0.08, "sine", 0.25);
    setTimeout(() => createTone(659.25, 0.12, "sine", 0.2), 50);
  },

  // صوت نجاح - نغمة إيجابية
  success: () => {
    playChime([523.25, 659.25, 783.99, 1046.5], 0.1, 0.04); // C5, E5, G5, C6
  },

  // صوت خطأ - نغمة تحذيرية
  error: () => {
    createTone(200, 0.15, "sawtooth", 0.2);
    setTimeout(() => createTone(180, 0.2, "sawtooth", 0.15), 150);
  },

  // صوت نقر - صوت زر بسيط
  click: () => {
    createTone(800, 0.05, "sine", 0.1);
  },

  // صوت تنبيه - رنين خفيف
  notification: () => {
    playChime([880, 1108.73, 1318.51], 0.12, 0.08); // A5, C#6, E6
  },
};

// ═══════════════════════════════════════════════════════════════
// مدير الأصوات
// ═══════════════════════════════════════════════════════════════

class SoundManager {
  private enabled: boolean = true;
  private volume: number = 0.5;

  constructor() {
    // استعادة الإعدادات من localStorage
    if (typeof window !== "undefined") {
      const savedEnabled = localStorage.getItem("cccways-sound-enabled");
      const savedVolume = localStorage.getItem("cccways-sound-volume");
      
      if (savedEnabled !== null) {
        this.enabled = savedEnabled === "true";
      }
      if (savedVolume !== null) {
        this.volume = parseFloat(savedVolume);
      }
    }
  }

  /**
   * تشغيل مؤثر صوتي
   */
  play(effect: SoundEffect): void {
    if (!this.enabled) return;
    
    try {
      // تفعيل AudioContext إذا كان معلقاً
      if (audioContext?.state === "suspended") {
        audioContext.resume();
      }
      
      soundEffects[effect]?.();
    } catch (error) {
      
    }
  }

  /**
   * تفعيل/تعطيل الأصوات
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (typeof window !== "undefined") {
      localStorage.setItem("cccways-sound-enabled", String(enabled));
    }
  }

  /**
   * التحقق من حالة التفعيل
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * تعيين مستوى الصوت
   */
  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    if (typeof window !== "undefined") {
      localStorage.setItem("cccways-sound-volume", String(this.volume));
    }
  }

  /**
   * الحصول على مستوى الصوت
   */
  getVolume(): number {
    return this.volume;
  }

  /**
   * تبديل حالة الأصوات
   */
  toggle(): boolean {
    this.setEnabled(!this.enabled);
    return this.enabled;
  }
}

// ═══════════════════════════════════════════════════════════════
// تصدير المدير كـ Singleton
// ═══════════════════════════════════════════════════════════════

export const soundManager = new SoundManager();

// ═══════════════════════════════════════════════════════════════
// Hook للاستخدام في React
// ═══════════════════════════════════════════════════════════════

import { useCallback } from "react";
import { useProjectStore } from "@/store/projectStore";

export function useSound() {
  const soundEnabled = useProjectStore((state) => state.soundEnabled);
  
  const playSound = useCallback((effect: SoundEffect) => {
    if (soundEnabled) {
      soundManager.play(effect);
    }
  }, [soundEnabled]);

  return {
    playSound,
    isEnabled: soundEnabled,
    toggle: soundManager.toggle.bind(soundManager),
  };
}

// ═══════════════════════════════════════════════════════════════
// أنواع الأصوات المتاحة
// ═══════════════════════════════════════════════════════════════

export const AVAILABLE_SOUNDS: { id: SoundEffect; name: string; description: string }[] = [
  { id: "projectCreate", name: "إنشاء مشروع", description: "عند إنشاء مشروع جديد" },
  { id: "projectDelete", name: "حذف مشروع", description: "عند حذف مشروع" },
  { id: "chatMove", name: "نقل محادثة", description: "عند بدء سحب محادثة" },
  { id: "chatDrop", name: "إفلات محادثة", description: "عند إفلات محادثة في مشروع" },
  { id: "success", name: "نجاح", description: "عند نجاح عملية" },
  { id: "error", name: "خطأ", description: "عند حدوث خطأ" },
  { id: "click", name: "نقر", description: "عند النقر على زر" },
  { id: "notification", name: "تنبيه", description: "عند وصول إشعار" },
];
