/**
 * 🎨 CCCWAYS Canvas - Remote Cursors
 * مؤشرات المستخدمين - عرض مؤشرات المستخدمين المتصلين
 * 
 * الوظائف:
 * - عرض مؤشرات المستخدمين في الوقت الفعلي
 * - أسماء المستخدمين وصورهم
 * - ألوان مميزة لكل مستخدم
 * - تتبع حركة المؤشر
 * - مؤشر النشاط
 */

import React, { useMemo } from 'react';
import { useCollaborationStore } from '../../../stores/collaborationStore';

// أشكال المؤشرات
const CURSOR_SHAPES = {
  default: (color: string) => (
    <path
      d="M0 0 L0 16 L4 12 L8 20 L10 19 L6 11 L12 10 Z"
      fill={color}
      stroke="white"
      strokeWidth="1"
      strokeLinejoin="round"
    />
  ),
  pointer: (color: string) => (
    <path
      d="M6 0 L6 18 L8.5 14 L14 22 L16 21 L10.5 13 L18 11 Z"
      fill={color}
      stroke="white"
      strokeWidth="1"
      strokeLinejoin="round"
    />
  ),
  crosshair: (color: string) => (
    <>
      <circle cx="10" cy="10" r="8" fill="none" stroke={color} strokeWidth="2" />
      <line x1="10" y1="0" x2="10" y2="6" stroke={color} strokeWidth="2" />
      <line x1="10" y1="14" x2="10" y2="20" stroke={color} strokeWidth="2" />
      <line x1="0" y1="10" x2="6" y2="10" stroke={color} strokeWidth="2" />
      <line x1="14" y1="10" x2="20" y2="10" stroke={color} strokeWidth="2" />
    </>
  ),
  grabbing: (color: string) => (
    <path
      d="M8 4 Q6 4 6 6 L6 8 Q4 8 4 10 L4 14 Q4 18 8 18 L12 18 Q16 18 16 14 L16 8 Q16 6 14 6 L14 4 Q14 2 12 2 L10 2 Q8 2 8 4 Z"
      fill={color}
      stroke="white"
      strokeWidth="1"
    />
  )
};

// ألوان المستخدمين
const USER_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e',
  '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1',
  '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e'
];

// واجهة المستخدم البعيد
interface RemoteUser {
  id: string;
  name: string;
  color: string;
  avatar?: string;
  cursor: { x: number; y: number };
  selection?: string[];
  tool?: string;
  isIdle?: boolean;
  lastActivity?: number;
}

interface CursorsProps {
  className?: string;
  showNames?: boolean;
  showAvatars?: boolean;
  showTools?: boolean;
  idleTimeout?: number; // بالميلي ثانية
}

export const Cursors: React.FC<CursorsProps> = ({
  className = '',
  showNames = true,
  showAvatars = true,
  showTools = true,
  idleTimeout = 30000
}) => {
  const { remoteUsers, currentUser } = useCollaborationStore();
  
  // تحديد المستخدمين النشطين
  const activeUsers = useMemo(() => {
    const now = Date.now();
    return remoteUsers
      .filter((user: any) => user.id !== currentUser?.id)
      .map((user: any) => ({
        ...user,
        isIdle: user.lastActiveAt ? (now - user.lastActiveAt) > idleTimeout : false,
        tool: user.currentTool
      }));
  }, [remoteUsers, currentUser, idleTimeout]);
  
  // الحصول على لون المستخدم
  const getUserColor = (userId: string, index: number): string => {
    // إذا كان لدى المستخدم لون محدد
    const user = remoteUsers.find((u: any) => u.id === userId);
    if (user?.color) return user.color;
    
    // لون عشوائي مبني على الـ ID
    const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return USER_COLORS[hash % USER_COLORS.length];
  };
  
  // الحصول على شكل المؤشر
  const getCursorShape = (tool?: string): keyof typeof CURSOR_SHAPES => {
    switch (tool) {
      case 'select': return 'default';
      case 'pan': return 'grabbing';
      case 'draw': return 'crosshair';
      default: return 'default';
    }
  };
  
  // الحصول على اسم الأداة
  const getToolName = (tool?: string): string => {
    const tools: Record<string, string> = {
      select: 'تحديد',
      pan: 'تحريك',
      draw: 'رسم',
      rectangle: 'مستطيل',
      ellipse: 'دائرة',
      text: 'نص',
      connector: 'توصيل'
    };
    return tools[tool || ''] || '';
  };
  
  if (activeUsers.length === 0) return null;
  
  return (
    <div className={`absolute inset-0 pointer-events-none overflow-hidden ${className}`}>
      {activeUsers.map((user: any, index: number) => {
        const color = getUserColor(user.id, index);
        const cursorShape = getCursorShape(user.tool);
        
        // Skip if no cursor position
        if (!user.cursor) return null;
        
        return (
          <div
            key={user.id}
            className={`absolute transition-transform duration-100 ease-out ${
              user.isIdle ? 'opacity-40' : 'opacity-100'
            }`}
            style={{
              left: user.cursor?.x ?? 0,
              top: user.cursor?.y ?? 0,
              zIndex: 9999
            }}
          >
            {/* المؤشر */}
            <svg
              width="24"
              height="24"
              viewBox="0 0 20 20"
              className="drop-shadow-sm"
            >
              {CURSOR_SHAPES[cursorShape](color)}
            </svg>
            
            {/* اسم المستخدم والمعلومات */}
            <div
              className="absolute top-4 right-0 flex items-center gap-1 whitespace-nowrap"
              style={{
                transform: 'translateX(-50%)'
              }}
            >
              {/* الصورة الرمزية */}
              {showAvatars && user.avatar && (
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="w-5 h-5 rounded-full border-2"
                  style={{ borderColor: color }}
                />
              )}
              
              {/* اسم المستخدم */}
              {showNames && (
                <div
                  className="px-2 py-0.5 rounded text-xs text-white font-medium shadow-sm max-w-[120px] truncate"
                  style={{ backgroundColor: color }}
                >
                  {user.name}
                  
                  {/* مؤشر الخمول */}
                  {user.isIdle && (
                    <span className="mr-1 opacity-70">(خامل)</span>
                  )}
                </div>
              )}
              
              {/* الأداة الحالية */}
              {showTools && user.currentTool && (
                <div
                  className="px-1.5 py-0.5 rounded text-[10px] bg-gray-800 text-white"
                >
                  {getToolName(user.currentTool)}
                </div>
              )}
            </div>
            
            {/* مؤشر التحديد */}
            {user.selectedIds && user.selectedIds.length > 0 && (
              <div
                className="absolute -top-2 -left-2 px-1.5 py-0.5 rounded-full text-[10px] text-white font-bold"
                style={{ backgroundColor: color }}
              >
                {user.selectedIds.length}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

/**
 * مكون مؤشر واحد - للاستخدام المباشر
 */
export interface SingleCursorProps {
  x: number;
  y: number;
  name: string;
  color: string;
  avatar?: string;
  tool?: string;
  isIdle?: boolean;
}

export const SingleCursor: React.FC<SingleCursorProps> = ({
  x,
  y,
  name,
  color,
  avatar,
  tool,
  isIdle = false
}) => {
  return (
    <div
      className={`absolute transition-transform duration-100 ease-out pointer-events-none ${
        isIdle ? 'opacity-40' : 'opacity-100'
      }`}
      style={{
        left: x,
        top: y,
        zIndex: 9999
      }}
    >
      {/* المؤشر */}
      <svg width="24" height="24" viewBox="0 0 20 20" className="drop-shadow-sm">
        {CURSOR_SHAPES.default(color)}
      </svg>
      
      {/* المعلومات */}
      <div className="absolute top-4 right-0 flex items-center gap-1 whitespace-nowrap">
        {avatar && (
          <img
            src={avatar}
            alt={name}
            className="w-5 h-5 rounded-full border-2"
            style={{ borderColor: color }}
          />
        )}
        <div
          className="px-2 py-0.5 rounded text-xs text-white font-medium shadow-sm"
          style={{ backgroundColor: color }}
        >
          {name}
        </div>
      </div>
    </div>
  );
};

export default Cursors;
