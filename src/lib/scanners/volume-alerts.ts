/**
 * 🔔 Volume Alerts System - نظام تنبيهات الفوليوم
 * 
 * نظام متكامل لإدارة تنبيهات ارتفاع الفوليوم
 * Comprehensive alert system for volume spikes
 * 
 * @author CCWAYS Team
 * @version 1.0.0
 * @created 2026-01-01
 */

import { VolumeResult, SignalStrength, SIGNAL_COLORS } from './volume-scanner';

// ============================================================================
// 📊 TYPES
// ============================================================================

export type AlertType = 'EXTREME' | 'VERY_HIGH' | 'HIGH' | 'SPIKE';

export interface VolumeAlert {
  id: string;
  symbol: string;
  exchange: string;
  timeframe: string;
  alertType: AlertType;
  zScore: number;
  volumeRatio: number;
  volumeUSD: number;
  currentPrice: number;
  message: string;
  timestamp: number;
  isRead: boolean;
  isMuted: boolean;
}

export interface AlertConfig {
  enableExtremeAlerts: boolean;      // Z-Score >= 3
  enableVeryHighAlerts: boolean;     // Z-Score >= 2.5
  enableHighAlerts: boolean;         // Z-Score >= 2
  enableSpikeAlerts: boolean;        // Volume Ratio >= 3x
  enableSound: boolean;
  enablePushNotifications: boolean;
  minVolumeUSD: number;
  mutedSymbols: string[];
}

export interface AlertStats {
  total: number;
  unread: number;
  extreme: number;
  veryHigh: number;
  high: number;
  spike: number;
}

// ============================================================================
// 🎨 CONSTANTS
// ============================================================================

export const DEFAULT_ALERT_CONFIG: AlertConfig = {
  enableExtremeAlerts: true,
  enableVeryHighAlerts: true,
  enableHighAlerts: false,
  enableSpikeAlerts: true,
  enableSound: true,
  enablePushNotifications: true,
  minVolumeUSD: 100000,
  mutedSymbols: [],
};

export const ALERT_SOUNDS = {
  EXTREME: '/sounds/alert-extreme.mp3',
  VERY_HIGH: '/sounds/alert-high.mp3',
  HIGH: '/sounds/alert-moderate.mp3',
  SPIKE: '/sounds/alert-spike.mp3',
};

export const ALERT_COLORS: Record<AlertType, string> = {
  EXTREME: '#FF0000',
  VERY_HIGH: '#FF6600',
  HIGH: '#FFCC00',
  SPIKE: '#00BFFF',
};

export const ALERT_LABELS: Record<AlertType, { ar: string; en: string; emoji: string }> = {
  EXTREME: { ar: 'تنبيه استثنائي', en: 'Extreme Alert', emoji: '🔴' },
  VERY_HIGH: { ar: 'تنبيه مرتفع جداً', en: 'Very High Alert', emoji: '🟠' },
  HIGH: { ar: 'تنبيه مرتفع', en: 'High Alert', emoji: '🟡' },
  SPIKE: { ar: 'ارتفاع حاد', en: 'Volume Spike', emoji: '📈' },
};

// ============================================================================
// 🔔 VOLUME ALERTS CLASS
// ============================================================================

export class VolumeAlerts {
  private alerts: VolumeAlert[] = [];
  private config: AlertConfig;
  private maxAlerts: number = 100;
  private audioCache: Map<string, HTMLAudioElement> = new Map();
  private listeners: Set<(alert: VolumeAlert) => void> = new Set();

  constructor(config: AlertConfig = DEFAULT_ALERT_CONFIG) {
    this.config = config;
    this.loadFromStorage();
  }

  /**
   * تحديث الإعدادات
   */
  updateConfig(config: Partial<AlertConfig>): void {
    this.config = { ...this.config, ...config };
    this.saveToStorage();
  }

  /**
   * الحصول على الإعدادات
   */
  getConfig(): AlertConfig {
    return { ...this.config };
  }

  /**
   * إضافة مستمع للتنبيهات
   */
  addListener(callback: (alert: VolumeAlert) => void): void {
    this.listeners.add(callback);
  }

  /**
   * إزالة مستمع
   */
  removeListener(callback: (alert: VolumeAlert) => void): void {
    this.listeners.delete(callback);
  }

  /**
   * معالجة نتيجة Volume Scanner وإنشاء تنبيه إذا لزم
   */
  processResult(result: VolumeResult): VolumeAlert | null {
    const { zScore, volumeRatio, volumeUSD } = result.metrics;
    
    // التحقق من الحد الأدنى للفوليوم
    if (volumeUSD < this.config.minVolumeUSD) return null;
    
    // التحقق من العملات المكتومة
    if (this.config.mutedSymbols.includes(result.symbol)) return null;
    
    // تحديد نوع التنبيه
    let alertType: AlertType | null = null;
    
    if (zScore >= 3 && this.config.enableExtremeAlerts) {
      alertType = 'EXTREME';
    } else if (zScore >= 2.5 && this.config.enableVeryHighAlerts) {
      alertType = 'VERY_HIGH';
    } else if (zScore >= 2 && this.config.enableHighAlerts) {
      alertType = 'HIGH';
    } else if (volumeRatio >= 3 && this.config.enableSpikeAlerts) {
      alertType = 'SPIKE';
    }
    
    if (!alertType) return null;
    
    // التحقق من التكرار
    const isDuplicate = this.alerts.some(
      a => a.symbol === result.symbol && 
           a.timeframe === result.timeframe &&
           Date.now() - a.timestamp < 5 * 60 * 1000 // 5 دقائق
    );
    
    if (isDuplicate) return null;
    
    // إنشاء التنبيه
    const alert = this.createAlert(result, alertType);
    
    // إضافة للقائمة
    this.alerts.unshift(alert);
    
    // تقليم القائمة
    if (this.alerts.length > this.maxAlerts) {
      this.alerts = this.alerts.slice(0, this.maxAlerts);
    }
    
    // تشغيل الصوت
    if (this.config.enableSound) {
      this.playSound(alertType);
    }
    
    // إرسال إشعار Push
    if (this.config.enablePushNotifications) {
      this.sendPushNotification(alert);
    }
    
    // إعلام المستمعين
    this.listeners.forEach(callback => callback(alert));
    
    // حفظ في التخزين
    this.saveToStorage();
    
    return alert;
  }

  /**
   * إنشاء تنبيه
   */
  private createAlert(result: VolumeResult, alertType: AlertType): VolumeAlert {
    const { zScore, volumeRatio, volumeUSD, currentPrice } = result.metrics;
    const label = ALERT_LABELS[alertType];
    
    return {
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      symbol: result.symbol,
      exchange: result.exchange,
      timeframe: result.timeframe,
      alertType,
      zScore,
      volumeRatio,
      volumeUSD,
      currentPrice,
      message: this.generateMessage(result, alertType),
      timestamp: Date.now(),
      isRead: false,
      isMuted: false,
    };
  }

  /**
   * إنشاء رسالة التنبيه
   */
  private generateMessage(result: VolumeResult, alertType: AlertType): string {
    const label = ALERT_LABELS[alertType];
    const { zScore, volumeRatio, volumeUSD } = result.metrics;
    
    const volumeFormatted = volumeUSD >= 1e6 
      ? `$${(volumeUSD / 1e6).toFixed(2)}M`
      : `$${(volumeUSD / 1e3).toFixed(0)}K`;
    
    return `${label.emoji} ${result.symbol} - ${label.ar}
📊 Z-Score: ${zScore.toFixed(2)}
📈 نسبة الفوليوم: ${volumeRatio.toFixed(2)}x
💰 الفوليوم: ${volumeFormatted}
⏱️ الإطار: ${result.timeframe}
🏢 المنصة: ${result.exchange}`;
  }

  /**
   * تشغيل صوت التنبيه
   */
  private playSound(alertType: AlertType): void {
    try {
      // استخدام Web Audio API للصوت البسيط
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // تردد مختلف حسب نوع التنبيه
      const frequencies: Record<AlertType, number> = {
        EXTREME: 880,    // A5
        VERY_HIGH: 784,  // G5
        HIGH: 659,       // E5
        SPIKE: 523,      // C5
      };
      
      oscillator.frequency.value = frequencies[alertType];
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (error) {
      console.warn('Could not play alert sound:', error);
    }
  }

  /**
   * إرسال إشعار Push
   */
  private async sendPushNotification(alert: VolumeAlert): Promise<void> {
    if (!('Notification' in window)) return;
    
    if (Notification.permission === 'granted') {
      const label = ALERT_LABELS[alert.alertType];
      
      new Notification(`${label.emoji} ${alert.symbol} - ${label.ar}`, {
        body: `Z-Score: ${alert.zScore.toFixed(2)} | نسبة: ${alert.volumeRatio.toFixed(2)}x`,
        icon: '/icons/volume-alert.png',
        tag: alert.id,
        requireInteraction: alert.alertType === 'EXTREME',
      });
    } else if (Notification.permission !== 'denied') {
      await Notification.requestPermission();
    }
  }

  /**
   * طلب إذن الإشعارات
   */
  async requestNotificationPermission(): Promise<boolean> {
    if (!('Notification' in window)) return false;
    
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  /**
   * الحصول على التنبيهات
   */
  getAlerts(limit?: number): VolumeAlert[] {
    return limit ? this.alerts.slice(0, limit) : [...this.alerts];
  }

  /**
   * الحصول على التنبيهات غير المقروءة
   */
  getUnreadAlerts(): VolumeAlert[] {
    return this.alerts.filter(a => !a.isRead);
  }

  /**
   * تحديد تنبيه كمقروء
   */
  markAsRead(alertId: string): void {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.isRead = true;
      this.saveToStorage();
    }
  }

  /**
   * تحديد جميع التنبيهات كمقروءة
   */
  markAllAsRead(): void {
    this.alerts.forEach(a => a.isRead = true);
    this.saveToStorage();
  }

  /**
   * حذف تنبيه
   */
  deleteAlert(alertId: string): void {
    this.alerts = this.alerts.filter(a => a.id !== alertId);
    this.saveToStorage();
  }

  /**
   * مسح جميع التنبيهات
   */
  clearAlerts(): void {
    this.alerts = [];
    this.saveToStorage();
  }

  /**
   * كتم عملة
   */
  muteSymbol(symbol: string): void {
    if (!this.config.mutedSymbols.includes(symbol)) {
      this.config.mutedSymbols.push(symbol);
      this.saveToStorage();
    }
  }

  /**
   * إلغاء كتم عملة
   */
  unmuteSymbol(symbol: string): void {
    this.config.mutedSymbols = this.config.mutedSymbols.filter(s => s !== symbol);
    this.saveToStorage();
  }

  /**
   * الحصول على إحصائيات التنبيهات
   */
  getStats(): AlertStats {
    return {
      total: this.alerts.length,
      unread: this.alerts.filter(a => !a.isRead).length,
      extreme: this.alerts.filter(a => a.alertType === 'EXTREME').length,
      veryHigh: this.alerts.filter(a => a.alertType === 'VERY_HIGH').length,
      high: this.alerts.filter(a => a.alertType === 'HIGH').length,
      spike: this.alerts.filter(a => a.alertType === 'SPIKE').length,
    };
  }

  /**
   * تحميل من التخزين المحلي
   */
  private loadFromStorage(): void {
    if (typeof window === 'undefined') return;
    
    try {
      const alertsData = localStorage.getItem('volumeAlerts');
      const configData = localStorage.getItem('volumeAlertsConfig');
      
      if (alertsData) {
        this.alerts = JSON.parse(alertsData);
      }
      
      if (configData) {
        this.config = { ...DEFAULT_ALERT_CONFIG, ...JSON.parse(configData) };
      }
    } catch (error) {
      console.warn('Failed to load alerts from storage:', error);
    }
  }

  /**
   * حفظ في التخزين المحلي
   */
  private saveToStorage(): void {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.setItem('volumeAlerts', JSON.stringify(this.alerts));
      localStorage.setItem('volumeAlertsConfig', JSON.stringify(this.config));
    } catch (error) {
      console.warn('Failed to save alerts to storage:', error);
    }
  }
}

// ============================================================================
// 🔧 SINGLETON INSTANCE
// ============================================================================

let alertsInstance: VolumeAlerts | null = null;

export function getVolumeAlerts(): VolumeAlerts {
  if (!alertsInstance) {
    alertsInstance = new VolumeAlerts();
  }
  return alertsInstance;
}
