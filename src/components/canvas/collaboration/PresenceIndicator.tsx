/**
 * 🎨 CCCWAYS Canvas - Presence Indicator
 * مؤشر التواجد - عرض المستخدمين المتصلين وحالتهم
 * 
 * الوظائف:
 * - قائمة المستخدمين المتصلين
 * - حالة كل مستخدم (نشط/خامل/بعيد)
 * - معلومات المستخدم
 * - نشاط المستخدم الحالي
 * - إحصائيات الغرفة
 */

import React, { useMemo, useState, useCallback } from 'react';
import { useCollaborationStore } from '../../../stores/collaborationStore';

// حالات التواجد
type PresenceStatus = 'online' | 'idle' | 'away' | 'offline';

// ألوان الحالات
const STATUS_COLORS: Record<PresenceStatus, string> = {
  online: '#22c55e',
  idle: '#f59e0b',
  away: '#6b7280',
  offline: '#ef4444'
};

// أسماء الحالات
const STATUS_NAMES: Record<PresenceStatus, string> = {
  online: 'متصل',
  idle: 'خامل',
  away: 'بعيد',
  offline: 'غير متصل'
};

// واجهة المستخدم
interface UserPresence {
  id: string;
  name: string;
  avatar?: string;
  color: string;
  status: PresenceStatus;
  lastActivity?: number;
  currentAction?: string;
  viewportPosition?: { x: number; y: number; zoom: number };
}

interface PresenceIndicatorProps {
  className?: string;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  maxVisibleUsers?: number;
  showDetails?: boolean;
  compact?: boolean;
  onUserClick?: (userId: string) => void;
}

export const PresenceIndicator: React.FC<PresenceIndicatorProps> = ({
  className = '',
  position = 'top-right',
  maxVisibleUsers = 5,
  showDetails = true,
  compact = false,
  onUserClick
}) => {
  const { 
    remoteUsers, 
    currentUser, 
    isConnected,
    roomId 
  } = useCollaborationStore();
  
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  
  // حساب حالة المستخدم
  const getUserStatus = useCallback((lastActivity?: number): PresenceStatus => {
    if (!lastActivity) return 'online';
    
    const now = Date.now();
    const diff = now - lastActivity;
    
    if (diff < 30000) return 'online';     // أقل من 30 ثانية
    if (diff < 300000) return 'idle';      // أقل من 5 دقائق
    if (diff < 1800000) return 'away';     // أقل من 30 دقيقة
    return 'offline';
  }, []);
  
  // تحويل المستخدمين لقائمة مع الحالة
  const usersWithStatus: UserPresence[] = useMemo(() => {
    return remoteUsers
      .filter((user: any) => user.id !== currentUser?.id)
      .map((user: any) => ({
        ...user,
        status: getUserStatus(user.lastActiveAt)
      }))
      .sort((a: UserPresence, b: UserPresence) => {
        // ترتيب حسب الحالة (النشط أولاً)
        const statusOrder: Record<PresenceStatus, number> = {
          online: 0,
          idle: 1,
          away: 2,
          offline: 3
        };
        return statusOrder[a.status as PresenceStatus] - statusOrder[b.status as PresenceStatus];
      });
  }, [remoteUsers, currentUser, getUserStatus]);
  
  // المستخدمون المرئيون
  const visibleUsers = usersWithStatus.slice(0, maxVisibleUsers);
  const hiddenCount = usersWithStatus.length - maxVisibleUsers;
  
  // إحصائيات
  const stats = useMemo(() => ({
    total: usersWithStatus.length,
    online: usersWithStatus.filter(u => u.status === 'online').length,
    idle: usersWithStatus.filter(u => u.status === 'idle').length,
    away: usersWithStatus.filter(u => u.status === 'away').length
  }), [usersWithStatus]);
  
  // تنسيق الموقع
  const positionClasses: Record<string, string> = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4'
  };
  
  // تنسيق الوقت
  const formatTime = (timestamp?: number): string => {
    if (!timestamp) return 'الآن';
    
    const diff = Date.now() - timestamp;
    if (diff < 60000) return 'الآن';
    if (diff < 3600000) return `قبل ${Math.floor(diff / 60000)} د`;
    return `قبل ${Math.floor(diff / 3600000)} س`;
  };
  
  // النقر على مستخدم
  const handleUserClick = useCallback((userId: string) => {
    if (selectedUserId === userId) {
      setSelectedUserId(null);
    } else {
      setSelectedUserId(userId);
    }
    onUserClick?.(userId);
  }, [selectedUserId, onUserClick]);
  
  // الوضع المدمج
  if (compact) {
    return (
      <div className={`fixed ${positionClasses[position]} z-50 ${className}`}>
        <div className="flex items-center gap-1 bg-white dark:bg-gray-800 rounded-full px-3 py-1.5 shadow-lg">
          {/* مؤشر الاتصال */}
          <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          
          {/* الصور المتداخلة */}
          <div className="flex -space-x-2">
            {visibleUsers.map(user => (
              <div
                key={user.id}
                className="relative"
                title={user.name}
              >
                {user.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="w-6 h-6 rounded-full border-2 border-white dark:border-gray-800"
                    style={{ borderColor: user.color }}
                  />
                ) : (
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold border-2 border-white dark:border-gray-800"
                    style={{ backgroundColor: user.color }}
                  >
                    {user.name[0]}
                  </div>
                )}
                
                {/* نقطة الحالة */}
                <span
                  className="absolute bottom-0 right-0 w-2 h-2 rounded-full border border-white"
                  style={{ backgroundColor: STATUS_COLORS[user.status] }}
                />
              </div>
            ))}
          </div>
          
          {/* العدد الإضافي */}
          {hiddenCount > 0 && (
            <span className="text-xs text-gray-500 mr-1">+{hiddenCount}</span>
          )}
        </div>
      </div>
    );
  }
  
  return (
    <div className={`fixed ${positionClasses[position]} z-50 ${className}`}>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl overflow-hidden min-w-[200px]">
        {/* العنوان */}
        <div 
          className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-750 cursor-pointer"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-2">
            {/* مؤشر الاتصال */}
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
            
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {stats.total + 1} متصل
            </span>
          </div>
          
          <button className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded">
            {isExpanded ? '▲' : '▼'}
          </button>
        </div>
        
        {/* قائمة المستخدمين */}
        {isExpanded && (
          <div className="max-h-64 overflow-y-auto">
            {/* المستخدم الحالي */}
            {currentUser && (
              <div className="flex items-center gap-2 p-2 border-b border-gray-100 dark:border-gray-700 bg-blue-50 dark:bg-blue-900/20">
                {currentUser.avatar ? (
                  <img
                    src={currentUser.avatar}
                    alt={currentUser.name}
                    className="w-8 h-8 rounded-full border-2"
                    style={{ borderColor: currentUser.color }}
                  />
                ) : (
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
                    style={{ backgroundColor: currentUser.color }}
                  >
                    {currentUser.name[0]}
                  </div>
                )}
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {currentUser.name} (أنت)
                  </p>
                  <p className="text-xs text-green-600">متصل</p>
                </div>
              </div>
            )}
            
            {/* المستخدمون الآخرون */}
            {usersWithStatus.map(user => (
              <div
                key={user.id}
                className={`flex items-center gap-2 p-2 hover:bg-gray-50 dark:hover:bg-gray-750 cursor-pointer transition-colors ${
                  selectedUserId === user.id ? 'bg-blue-50 dark:bg-blue-900/30' : ''
                }`}
                onClick={() => handleUserClick(user.id)}
              >
                {/* الصورة */}
                <div className="relative">
                  {user.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className="w-8 h-8 rounded-full border-2"
                      style={{ borderColor: user.color }}
                    />
                  ) : (
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
                      style={{ backgroundColor: user.color }}
                    >
                      {user.name[0]}
                    </div>
                  )}
                  
                  {/* نقطة الحالة */}
                  <span
                    className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-gray-800"
                    style={{ backgroundColor: STATUS_COLORS[user.status] }}
                    title={STATUS_NAMES[user.status]}
                  />
                </div>
                
                {/* المعلومات */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {user.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {user.currentAction || STATUS_NAMES[user.status]}
                  </p>
                </div>
                
                {/* آخر نشاط */}
                {showDetails && (
                  <span className="text-xs text-gray-400">
                    {formatTime(user.lastActivity)}
                  </span>
                )}
              </div>
            ))}
            
            {usersWithStatus.length === 0 && (
              <div className="p-4 text-center text-gray-500 text-sm">
                لا يوجد مستخدمون آخرون
              </div>
            )}
          </div>
        )}
        
        {/* إحصائيات سريعة */}
        {isExpanded && showDetails && (
          <div className="flex items-center justify-around p-2 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-750 text-xs">
            <div className="text-center">
              <span className="font-bold text-green-600">{stats.online}</span>
              <span className="text-gray-500 mr-1">نشط</span>
            </div>
            <div className="text-center">
              <span className="font-bold text-yellow-600">{stats.idle}</span>
              <span className="text-gray-500 mr-1">خامل</span>
            </div>
            <div className="text-center">
              <span className="font-bold text-gray-600">{stats.away}</span>
              <span className="text-gray-500 mr-1">بعيد</span>
            </div>
          </div>
        )}
        
        {/* معلومات الغرفة */}
        {roomId && isExpanded && (
          <div className="p-2 border-t border-gray-100 dark:border-gray-700 text-xs text-gray-400 text-center">
            غرفة: {roomId.slice(0, 8)}...
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * شارة التواجد المصغرة
 */
export interface PresenceBadgeProps {
  count: number;
  maxVisible?: number;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
}

export const PresenceBadge: React.FC<PresenceBadgeProps> = ({
  count,
  maxVisible = 99,
  size = 'md',
  onClick
}) => {
  const sizeClasses = {
    sm: 'h-5 min-w-[20px] text-xs',
    md: 'h-6 min-w-[24px] text-sm',
    lg: 'h-8 min-w-[32px] text-base'
  };
  
  const displayCount = count > maxVisible ? `${maxVisible}+` : count;
  
  return (
    <button
      onClick={onClick}
      className={`
        ${sizeClasses[size]}
        inline-flex items-center justify-center
        bg-blue-500 text-white font-medium rounded-full
        hover:bg-blue-600 transition-colors
        px-2
      `}
    >
      <span className="w-2 h-2 bg-green-400 rounded-full ml-1 animate-pulse" />
      {displayCount}
    </button>
  );
};

export default PresenceIndicator;
