/**
 * 🎨 CCCWAYS Canvas - Canvas Page
 * صفحة الكانفاس الرئيسية
 * 
 * تجمع جميع مكونات الكانفاس في صفحة واحدة متكاملة
 */

import React, { useState, useEffect, useCallback } from 'react';
import { CCCWAYSCanvas } from '../components/canvas';
import { KeyboardShortcuts } from '../components/canvas/tools/KeyboardShortcuts';
import { ExportPanel } from '../components/canvas/panels/ExportPanel';
import { HistoryPanel } from '../components/canvas/panels/HistoryPanel';
import { SmartSuggestions } from '../components/canvas/ai/SmartSuggestions';
import { VoiceCommands } from '../components/canvas/ai/VoiceCommands';
import { Comments } from '../components/canvas/collaboration/Comments';

// الألوان المتاحة للمستخدمين
const USER_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e',
  '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1'
];

// اختيار لون عشوائي
const getRandomColor = () => USER_COLORS[Math.floor(Math.random() * USER_COLORS.length)];

interface CanvasPageProps {
  roomId?: string;
}

export const CanvasPage: React.FC<CanvasPageProps> = ({ roomId: initialRoomId }) => {
  // حالة المستخدم
  const [userName, setUserName] = useState(() => {
    return localStorage.getItem('canvas_user_name') || 'مستخدم جديد';
  });
  const [userColor] = useState(() => {
    return localStorage.getItem('canvas_user_color') || getRandomColor();
  });
  
  // حالة الغرفة
  const [roomId, setRoomId] = useState<string | undefined>(initialRoomId);
  const [showJoinDialog, setShowJoinDialog] = useState(!initialRoomId);
  const [roomInput, setRoomInput] = useState('');
  
  // حالة اللوحات
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showVoice, setShowVoice] = useState(false);
  const [showComments, setShowComments] = useState(false);
  
  // حالة العرض
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  
  // حفظ اسم المستخدم
  useEffect(() => {
    localStorage.setItem('canvas_user_name', userName);
  }, [userName]);
  
  // معالجة ملء الشاشة
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);
  
  // إنشاء غرفة جديدة
  const createRoom = useCallback(() => {
    const newRoomId = `room-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setRoomId(newRoomId);
    setShowJoinDialog(false);
    
    // تحديث URL
    window.history.pushState({}, '', `?room=${newRoomId}`);
  }, []);
  
  // الانضمام لغرفة
  const joinRoom = useCallback(() => {
    if (roomInput.trim()) {
      setRoomId(roomInput.trim());
      setShowJoinDialog(false);
      
      // تحديث URL
      window.history.pushState({}, '', `?room=${roomInput.trim()}`);
    }
  }, [roomInput]);
  
  // الخروج من الغرفة
  const leaveRoom = useCallback(() => {
    setRoomId(undefined);
    setShowJoinDialog(true);
    
    // تحديث URL
    window.history.pushState({}, '', window.location.pathname);
  }, []);
  
  // اختصارات لوحة المفاتيح الإضافية
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // تجاهل إذا كان المستخدم يكتب في حقل إدخال
      if ((e.target as HTMLElement).tagName === 'INPUT' || 
          (e.target as HTMLElement).tagName === 'TEXTAREA') {
        return;
      }
      
      // F1 - المساعدة
      if (e.key === 'F1') {
        e.preventDefault();
        setShowShortcuts(true);
      }
      
      // Ctrl+E - تصدير
      if (e.ctrlKey && e.key === 'e') {
        e.preventDefault();
        setShowExport(!showExport);
      }
      
      // F11 - ملء الشاشة
      if (e.key === 'F11') {
        e.preventDefault();
        toggleFullscreen();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showExport, toggleFullscreen]);
  
  // قراءة معرف الغرفة من URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlRoomId = params.get('room');
    if (urlRoomId) {
      setRoomId(urlRoomId);
      setShowJoinDialog(false);
    }
  }, []);
  
  return (
    <div className={`w-screen h-screen overflow-hidden ${theme === 'dark' ? 'dark' : ''}`}>
      {/* نافذة الانضمام/الإنشاء */}
      {showJoinDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 w-96 max-w-[90vw]">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 text-center">
              🎨 CCCWAYS Canvas
            </h2>
            
            {/* إدخال الاسم */}
            <div className="mb-4">
              <label className="text-sm text-gray-600 dark:text-gray-400 block mb-1">
                اسمك
              </label>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                placeholder="أدخل اسمك..."
              />
            </div>
            
            {/* إنشاء غرفة جديدة */}
            <button
              onClick={createRoom}
              className="w-full py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors mb-4"
            >
              🚀 إنشاء لوحة جديدة
            </button>
            
            <div className="relative flex items-center justify-center mb-4">
              <div className="border-t border-gray-200 dark:border-gray-700 flex-1" />
              <span className="px-4 text-gray-500 text-sm">أو</span>
              <div className="border-t border-gray-200 dark:border-gray-700 flex-1" />
            </div>
            
            {/* الانضمام لغرفة */}
            <div className="flex gap-2">
              <input
                type="text"
                value={roomInput}
                onChange={(e) => setRoomInput(e.target.value)}
                className="flex-1 px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                placeholder="أدخل معرف الغرفة..."
                onKeyDown={(e) => e.key === 'Enter' && joinRoom()}
              />
              <button
                onClick={joinRoom}
                disabled={!roomInput.trim()}
                className="px-6 py-2 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors disabled:bg-gray-300"
              >
                انضم
              </button>
            </div>
            
            {/* العمل بدون غرفة */}
            <button
              onClick={() => {
                setRoomId(undefined);
                setShowJoinDialog(false);
              }}
              className="w-full mt-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 transition-colors text-sm"
            >
              العمل محلياً (بدون تعاون)
            </button>
          </div>
        </div>
      )}
      
      {/* الكانفاس الرئيسي */}
      {!showJoinDialog && (
        <>
          <CCCWAYSCanvas
            roomId={roomId}
            userName={userName}
            userColor={userColor}
            showToolbar={true}
            showProperties={true}
            showLayers={false}
            showAI={false}
            showPresence={!!roomId}
            gridStyle="dots"
            className="w-full h-full"
          />
          
          {/* شريط القائمة العلوي */}
          <div className="fixed top-4 left-4 flex items-center gap-2 z-40">
            {/* زر الخروج */}
            {roomId && (
              <button
                onClick={leaveRoom}
                className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg hover:bg-gray-100 transition-colors"
                title="الخروج من الغرفة"
              >
                🚪
              </button>
            )}
            
            {/* معرف الغرفة */}
            {roomId && (
              <div
                className="px-3 py-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg text-sm cursor-pointer hover:bg-gray-100"
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  alert('تم نسخ الرابط!');
                }}
                title="انقر للنسخ"
              >
                📋 {roomId.slice(0, 12)}...
              </div>
            )}
          </div>
          
          {/* أزرار الأدوات الإضافية */}
          <div className="fixed bottom-4 left-4 flex flex-col gap-2 z-40">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className={`p-3 rounded-lg shadow-lg transition-colors ${
                showHistory ? 'bg-blue-500 text-white' : 'bg-white dark:bg-gray-800 hover:bg-gray-100'
              }`}
              title="التاريخ"
            >
              📜
            </button>
            
            <button
              onClick={() => setShowComments(!showComments)}
              className={`p-3 rounded-lg shadow-lg transition-colors ${
                showComments ? 'bg-blue-500 text-white' : 'bg-white dark:bg-gray-800 hover:bg-gray-100'
              }`}
              title="التعليقات"
            >
              💬
            </button>
            
            <button
              onClick={() => setShowSuggestions(!showSuggestions)}
              className={`p-3 rounded-lg shadow-lg transition-colors ${
                showSuggestions ? 'bg-blue-500 text-white' : 'bg-white dark:bg-gray-800 hover:bg-gray-100'
              }`}
              title="اقتراحات ذكية"
            >
              💡
            </button>
            
            <button
              onClick={() => setShowVoice(!showVoice)}
              className={`p-3 rounded-lg shadow-lg transition-colors ${
                showVoice ? 'bg-red-500 text-white' : 'bg-white dark:bg-gray-800 hover:bg-gray-100'
              }`}
              title="أوامر صوتية"
            >
              🎤
            </button>
          </div>
          
          {/* أزرار الإعدادات */}
          <div className="fixed bottom-4 right-4 flex gap-2 z-40">
            <button
              onClick={() => setShowExport(!showExport)}
              className={`p-3 rounded-lg shadow-lg transition-colors ${
                showExport ? 'bg-blue-500 text-white' : 'bg-white dark:bg-gray-800 hover:bg-gray-100'
              }`}
              title="تصدير"
            >
              📤
            </button>
            
            <button
              onClick={() => setShowShortcuts(true)}
              className="p-3 bg-white dark:bg-gray-800 rounded-lg shadow-lg hover:bg-gray-100 transition-colors"
              title="اختصارات لوحة المفاتيح (F1)"
            >
              ⌨️
            </button>
            
            <button
              onClick={toggleFullscreen}
              className="p-3 bg-white dark:bg-gray-800 rounded-lg shadow-lg hover:bg-gray-100 transition-colors"
              title="ملء الشاشة (F11)"
            >
              {isFullscreen ? '⬇️' : '⬆️'}
            </button>
            
            <button
              onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')}
              className="p-3 bg-white dark:bg-gray-800 rounded-lg shadow-lg hover:bg-gray-100 transition-colors"
              title="تبديل السمة"
            >
              {theme === 'light' ? '🌙' : '☀️'}
            </button>
          </div>
          
          {/* اللوحات الجانبية */}
          {showHistory && (
            <HistoryPanel
              className="fixed top-20 left-4"
              onClose={() => setShowHistory(false)}
            />
          )}
          
          {showComments && roomId && (
            <Comments
              className="fixed top-20 left-80"
              onClose={() => setShowComments(false)}
            />
          )}
          
          {showSuggestions && (
            <SmartSuggestions
              className="fixed bottom-20 left-16"
              onClose={() => setShowSuggestions(false)}
            />
          )}
          
          {showVoice && (
            <VoiceCommands
              className="fixed bottom-20 left-16"
              onClose={() => setShowVoice(false)}
            />
          )}
          
          {showExport && (
            <ExportPanel
              className="fixed bottom-20 right-4"
              onClose={() => setShowExport(false)}
            />
          )}
          
          {/* نافذة الاختصارات */}
          {showShortcuts && (
            <KeyboardShortcuts
              isOpen={showShortcuts}
              onClose={() => setShowShortcuts(false)}
            />
          )}
        </>
      )}
    </div>
  );
};

export default CanvasPage;
