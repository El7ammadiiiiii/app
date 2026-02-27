/**
 * 🔔 Levels Alert System - نظام تنبيهات المستويات
 * 
 * نظام تنبيهات صوتية ومرئية عند كسر مستويات الدعم والمقاومة
 * Sound and visual alerts when support/resistance levels are broken
 * 
 * @author CCWAYS Team
 * @version 1.0.0
 * @created 2025-12-31
 */

import { LevelResult, LevelStatus } from './levels-detector';

// ============================================================================
// 📊 TYPES
// ============================================================================

export interface LevelAlert {
  id: string;
  symbol: string;
  exchange: string;
  timeframe: string;
  type: 'broke_resistance' | 'broke_support';
  price: number;
  levelPrice: number;
  timestamp: number;
  notified: boolean;
}

type AlertCallback = (alert: LevelAlert) => void;

// ============================================================================
// 🔊 SOUND UTILITIES
// ============================================================================

// ملفات الصوت المشفرة بـ Base64 (أصوات قصيرة)
const ALERT_SOUNDS = {
  broke_resistance: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleTPr+I/DQC3z//fn9vfq7v3y8Pzy8vL09fT29vXz8/Pz',
  broke_support: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleTPr+I/DQC3z//fn9vfq7v3y8Pzy8vL09fT29vXz8/Pz',
};

/**
 * 🔊 تشغيل صوت التنبيه
 */
export function playAlertSound(type: 'broke_resistance' | 'broke_support'): void {
  if (typeof window === 'undefined') return;
  
  try {
    // إنشاء صوت باستخدام Web Audio API
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    
    const audioContext = new AudioContext();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // تردد مختلف حسب النوع
    if (type === 'broke_resistance') {
      // صوت صاعد للمقاومة المكسورة
      oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime); // C5
      oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.1); // E5
      oscillator.frequency.setValueAtTime(783.99, audioContext.currentTime + 0.2); // G5
    } else {
      // صوت هابط للدعم المكسور
      oscillator.frequency.setValueAtTime(783.99, audioContext.currentTime); // G5
      oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.1); // E5
      oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime + 0.2); // C5
    }

    oscillator.type = 'sine';
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
  } catch (error) {
    console.error('Failed to play alert sound:', error);
  }
}

// ============================================================================
// 📲 NOTIFICATION UTILITIES
// ============================================================================

/**
 * 📲 طلب إذن الإشعارات
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  
  if (!('Notification' in window)) {
    console.warn('This browser does not support notifications');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
}

/**
 * 📲 إرسال إشعار متصفح
 */
export function sendBrowserNotification(alert: LevelAlert): void {
  if (typeof window === 'undefined') return;
  
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return;
  }

  const title = alert.type === 'broke_resistance' 
    ? `🔴 كسر مقاومة - ${alert.symbol}`
    : `🟢 كسر دعم - ${alert.symbol}`;

  const body = alert.type === 'broke_resistance'
    ? `${alert.symbol} أغلق فوق مستوى المقاومة ${alert.levelPrice.toFixed(2)} على ${alert.exchange}`
    : `${alert.symbol} أغلق تحت مستوى الدعم ${alert.levelPrice.toFixed(2)} على ${alert.exchange}`;

  const notification = new Notification(title, {
    body,
    icon: '/favicon.ico',
    tag: alert.id,
    requireInteraction: false,
  });

  // إغلاق الإشعار تلقائياً بعد 5 ثوانٍ
  setTimeout(() => notification.close(), 5000);
}

// ============================================================================
// 🔔 LEVELS ALERT MANAGER
// ============================================================================

export class LevelsAlertManager {
  private alerts: Map<string, LevelAlert> = new Map();
  private previousResults: Map<string, LevelResult> = new Map();
  private callbacks: Set<AlertCallback> = new Set();
  private soundEnabled: boolean = true;
  private notificationsEnabled: boolean = true;

  constructor() {
    // طلب إذن الإشعارات سيتم لاحقاً عند الاستخدام
    // لتجنب مشاكل SSR
  }

  /**
   * 🔄 تهيئة (تُستدعى فقط على client-side)
   */
  initialize(): void {
    if (typeof window !== 'undefined') {
      requestNotificationPermission();
    }
  }

  /**
   * 🔄 تحديث النتائج والكشف عن الكسور الجديدة
   */
  updateResults(results: LevelResult[]): LevelAlert[] {
    const newAlerts: LevelAlert[] = [];

    for (const result of results) {
      const key = `${result.exchange}-${result.symbol}-${result.timeframe}`;
      const previous = this.previousResults.get(key);

      // التحقق من كسر جديد
      if (result.status === 'broke_resistance' || result.status === 'broke_support') {
        // التأكد من أنه كسر جديد وليس كسر قديم
        if (!previous || (previous.status !== result.status)) {
          const alert = this.createAlert(result);
          newAlerts.push(alert);
          this.alerts.set(alert.id, alert);

          // إرسال الإشعارات
          this.notifyAlert(alert);
        }
      }

      // تحديث النتائج السابقة
      this.previousResults.set(key, result);
    }

    return newAlerts;
  }

  /**
   * 📝 إنشاء تنبيه جديد
   */
  private createAlert(result: LevelResult): LevelAlert {
    const levelPrice = result.status === 'broke_resistance'
      ? result.nearestResistance?.price ?? result.currentPrice
      : result.nearestSupport?.price ?? result.currentPrice;

    return {
      id: `${result.exchange}-${result.symbol}-${result.timeframe}-${Date.now()}`,
      symbol: result.symbol,
      exchange: result.exchange,
      timeframe: result.timeframe,
      type: result.status as 'broke_resistance' | 'broke_support',
      price: result.currentPrice,
      levelPrice,
      timestamp: Date.now(),
      notified: false,
    };
  }

  /**
   * 🔔 إرسال التنبيه
   */
  private notifyAlert(alert: LevelAlert): void {
    // تشغيل الصوت
    if (this.soundEnabled) {
      playAlertSound(alert.type);
    }

    // إرسال إشعار المتصفح
    if (this.notificationsEnabled) {
      sendBrowserNotification(alert);
    }

    // استدعاء callbacks
    this.callbacks.forEach(cb => cb(alert));

    // تحديد أنه تم الإشعار
    alert.notified = true;
  }

  /**
   * 📋 الاشتراك في التنبيهات
   */
  subscribe(callback: AlertCallback): () => void {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }

  /**
   * 🔊 تفعيل/إلغاء الصوت
   */
  setSoundEnabled(enabled: boolean): void {
    this.soundEnabled = enabled;
  }

  /**
   * 📲 تفعيل/إلغاء الإشعارات
   */
  setNotificationsEnabled(enabled: boolean): void {
    this.notificationsEnabled = enabled;
  }

  /**
   * 📊 الحصول على جميع التنبيهات
   */
  getAlerts(): LevelAlert[] {
    return Array.from(this.alerts.values());
  }

  /**
   * 🧹 مسح التنبيهات القديمة
   */
  clearOldAlerts(maxAge: number = 3600000): void { // 1 hour default
    const now = Date.now();
    for (const [id, alert] of this.alerts) {
      if (now - alert.timestamp > maxAge) {
        this.alerts.delete(id);
      }
    }
  }

  /**
   * 🧹 مسح كل التنبيهات
   */
  clearAllAlerts(): void {
    this.alerts.clear();
  }

  /**
   * 🔄 إعادة تعيين
   */
  reset(): void {
    this.alerts.clear();
    this.previousResults.clear();
  }
}

// ============================================================================
// 🏭 SINGLETON INSTANCE
// ============================================================================

let alertManagerInstance: LevelsAlertManager | null = null;

export function getLevelsAlertManager(): LevelsAlertManager {
  // Only create on client-side
  if (typeof window === 'undefined') {
    // Return a dummy instance for SSR that won't do anything
    return new LevelsAlertManager();
  }
  
  if (!alertManagerInstance) {
    alertManagerInstance = new LevelsAlertManager();
    alertManagerInstance.initialize();
  }
  return alertManagerInstance;
}

export default LevelsAlertManager;
