/**
 * 💰 Quota Service
 * نظام إدارة الحصص للمستخدمين
 */

import type { UserQuota, QuotaUsage, QUOTA_LIMITS } from '@/types/deepResearch';

// تخزين مؤقت في LocalStorage (يمكن استبداله بـ Firestore)
const QUOTA_STORAGE_KEY = 'deep_research_quota';

/**
 * التحقق من أننا في المتصفح
 */
function isBrowser(): boolean {
  try {
    return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
  } catch {
    return false;
  }
}

/**
 * الحصول على حصة المستخدم
 */
export function getUserQuota(userId: string): UserQuota {
  try {
    if (!isBrowser()) {
      return createNewQuota(userId, false);
    }
    const stored = localStorage.getItem(`${QUOTA_STORAGE_KEY}_${userId}`);
    
    if (stored) {
      const quota = JSON.parse(stored);
      quota.resetDate = new Date(quota.resetDate);
      
      // التحقق من انتهاء الفترة
      if (shouldResetQuota(quota)) {
        return resetQuota(userId, quota.isPremium);
      }
      
      return quota;
    }
    
    // إنشاء حصة جديدة
    return createNewQuota(userId, false);
  } catch {
    return createNewQuota(userId, false);
  }
}

/**
 * إنشاء حصة جديدة
 */
function createNewQuota(userId: string, isPremium: boolean): UserQuota {
  const quota: UserQuota = {
    userId,
    used: 0,
    limit: isPremium ? 3 : 3, // 3/يوم للمشترك، 3/شهر للمجاني
    resetDate: getNextResetDate(isPremium),
    isPremium,
    usageHistory: [],
  };
  
  saveQuota(quota);
  return quota;
}

/**
 * حفظ الحصة
 */
function saveQuota(quota: UserQuota): void {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(
      `${QUOTA_STORAGE_KEY}_${quota.userId}`,
      JSON.stringify(quota)
    );
  } catch {
    // ignore storage failures in non-browser contexts
  }
}

/**
 * التحقق من إمكانية البحث
 */
export function canSearch(userId: string): boolean {
  const quota = getUserQuota(userId);
  return quota.used < quota.limit;
}

/**
 * استهلاك حصة واحدة
 */
export function consumeQuota(
  userId: string,
  queryId: string,
  queryPreview: string
): { success: boolean; remaining: number; quota: UserQuota } {
  const quota = getUserQuota(userId);
  
  if (quota.used >= quota.limit) {
    return {
      success: false,
      remaining: 0,
      quota,
    };
  }
  
  quota.used += 1;
  quota.usageHistory.push({
    id: `usage-${Date.now()}`,
    queryId,
    timestamp: new Date(),
    queryPreview: queryPreview.slice(0, 100),
  });
  
  saveQuota(quota);
  
  return {
    success: true,
    remaining: quota.limit - quota.used,
    quota,
  };
}

/**
 * الحصول على العمليات المتبقية
 */
export function getRemainingSearches(userId: string): number {
  const quota = getUserQuota(userId);
  return Math.max(0, quota.limit - quota.used);
}

/**
 * التحقق من الحاجة لإعادة تعيين الحصة
 */
function shouldResetQuota(quota: UserQuota): boolean {
  return new Date() > new Date(quota.resetDate);
}

/**
 * إعادة تعيين الحصة
 */
function resetQuota(userId: string, isPremium: boolean): UserQuota {
  const quota: UserQuota = {
    userId,
    used: 0,
    limit: isPremium ? 3 : 3,
    resetDate: getNextResetDate(isPremium),
    isPremium,
    usageHistory: [],
  };
  
  saveQuota(quota);
  return quota;
}

/**
 * حساب تاريخ إعادة التعيين التالي
 */
function getNextResetDate(isPremium: boolean): Date {
  const now = new Date();
  
  if (isPremium) {
    // إعادة تعيين يومي (منتصف الليل)
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow;
  } else {
    // إعادة تعيين شهري
    const nextMonth = new Date(now);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    nextMonth.setDate(1);
    nextMonth.setHours(0, 0, 0, 0);
    return nextMonth;
  }
}

/**
 * ترقية المستخدم للاشتراك المميز
 */
export function upgradeToPremium(userId: string): UserQuota {
  const quota = getUserQuota(userId);
  quota.isPremium = true;
  quota.limit = 3;
  quota.used = 0;
  quota.resetDate = getNextResetDate(true);
  
  saveQuota(quota);
  return quota;
}

/**
 * تنسيق الوقت المتبقي للتجديد
 */
export function getTimeUntilReset(userId: string): string {
  const quota = getUserQuota(userId);
  const now = new Date();
  const reset = new Date(quota.resetDate);
  
  const diff = reset.getTime() - now.getTime();
  
  if (diff <= 0) return 'الآن';
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (days > 0) return `${days} يوم`;
  if (hours > 0) return `${hours} ساعة`;
  return `${minutes} دقيقة`;
}

export default {
  getQuota: getUserQuota,
  canSearch,
  consume: consumeQuota,
  getRemaining: getRemainingSearches,
  upgrade: upgradeToPremium,
  getTimeUntilReset,
};
