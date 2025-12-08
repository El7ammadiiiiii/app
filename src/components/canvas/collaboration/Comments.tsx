/**
 * 🎨 CCCWAYS Canvas - Comments
 * نظام التعليقات - التعليق على العناصر والمناطق
 * 
 * الوظائف:
 * - إضافة تعليقات على العناصر
 * - التعليق على مناطق محددة
 * - الردود والنقاشات
 * - الإشارة للمستخدمين
 * - تتبع حالة التعليقات
 */

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useCollaborationStore } from '../../../stores/collaborationStore';
import { useCanvasStore } from '../../../stores/canvasStore';

// حالات التعليق
type CommentStatus = 'open' | 'resolved' | 'closed';

// واجهة التعليق
interface Comment {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  authorColor: string;
  content: string;
  timestamp: Date;
  position: { x: number; y: number };
  elementId?: string; // إذا كان التعليق على عنصر
  status: CommentStatus;
  replies: CommentReply[];
  mentions: string[];
  isEditing?: boolean;
}

// واجهة الرد
interface CommentReply {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  content: string;
  timestamp: Date;
  mentions: string[];
}

export interface CommentsProps {
  className?: string;
  comments?: Comment[];
  onAddComment?: (comment: Omit<Comment, 'id' | 'timestamp' | 'replies'>) => void;
  onResolve?: (commentId: string) => void;
  onDelete?: (commentId: string) => void;
  onReply?: (commentId: string, reply: Omit<CommentReply, 'id' | 'timestamp'>) => void;
  onClose?: () => void;
}

export const Comments: React.FC<CommentsProps> = ({
  className = '',
  comments: externalComments,
  onAddComment,
  onResolve,
  onDelete,
  onReply,
  onClose
}) => {
  const { currentUser, remoteUsers } = useCollaborationStore();
  const { elements, selectedElementIds, viewportOffset, zoom } = useCanvasStore();
  
  // حالة التعليقات المحلية
  const [localComments, setLocalComments] = useState<Comment[]>([]);
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null);
  const [isAddingComment, setIsAddingComment] = useState(false);
  const [newCommentPosition, setNewCommentPosition] = useState<{ x: number; y: number } | null>(null);
  const [newCommentContent, setNewCommentContent] = useState('');
  const [replyContent, setReplyContent] = useState('');
  const [filter, setFilter] = useState<CommentStatus | 'all'>('all');
  
  const inputRef = useRef<HTMLTextAreaElement>(null);
  
  // التعليقات الفعلية
  const comments = externalComments || localComments;
  
  // التعليقات المفلترة
  const filteredComments = useMemo(() => {
    if (filter === 'all') return comments;
    return comments.filter(c => c.status === filter);
  }, [comments, filter]);
  
  // إحصائيات
  const stats = useMemo(() => ({
    total: comments.length,
    open: comments.filter(c => c.status === 'open').length,
    resolved: comments.filter(c => c.status === 'resolved').length
  }), [comments]);
  
  // جميع المستخدمين للإشارة
  const allUsers = useMemo(() => {
    const users = [...remoteUsers];
    if (currentUser) users.unshift(currentUser);
    return users;
  }, [remoteUsers, currentUser]);
  
  // استخراج الإشارات من النص
  const extractMentions = (text: string): string[] => {
    const mentionRegex = /@(\w+)/g;
    const mentions: string[] = [];
    let match;
    
    while ((match = mentionRegex.exec(text)) !== null) {
      mentions.push(match[1]);
    }
    
    return mentions;
  };
  
  // إضافة تعليق جديد
  const handleAddComment = useCallback(() => {
    if (!newCommentContent.trim() || !newCommentPosition || !currentUser) return;
    
    const comment: Comment = {
      id: `comment-${Date.now()}`,
      authorId: currentUser.id,
      authorName: currentUser.name,
      authorAvatar: currentUser.avatar,
      authorColor: currentUser.color || '#3b82f6',
      content: newCommentContent,
      timestamp: new Date(),
      position: newCommentPosition,
      elementId: selectedElementIds?.[0],
      status: 'open',
      replies: [],
      mentions: extractMentions(newCommentContent)
    };
    
    if (onAddComment) {
      onAddComment(comment);
    } else {
      setLocalComments(prev => [...prev, comment]);
    }
    
    setNewCommentContent('');
    setNewCommentPosition(null);
    setIsAddingComment(false);
  }, [newCommentContent, newCommentPosition, currentUser, selectedElementIds, onAddComment]);
  
  // حل تعليق
  const handleResolve = useCallback((commentId: string) => {
    if (onResolve) {
      onResolve(commentId);
    } else {
      setLocalComments(prev => prev.map(c =>
        c.id === commentId ? { ...c, status: 'resolved' as CommentStatus } : c
      ));
    }
  }, [onResolve]);
  
  // حذف تعليق
  const handleDelete = useCallback((commentId: string) => {
    if (onDelete) {
      onDelete(commentId);
    } else {
      setLocalComments(prev => prev.filter(c => c.id !== commentId));
    }
  }, [onDelete]);
  
  // إضافة رد
  const handleReply = useCallback((commentId: string) => {
    if (!replyContent.trim() || !currentUser) return;
    
    const reply: CommentReply = {
      id: `reply-${Date.now()}`,
      authorId: currentUser.id,
      authorName: currentUser.name,
      authorAvatar: currentUser.avatar,
      content: replyContent,
      timestamp: new Date(),
      mentions: extractMentions(replyContent)
    };
    
    if (onReply) {
      onReply(commentId, reply);
    } else {
      setLocalComments(prev => prev.map(c =>
        c.id === commentId ? { ...c, replies: [...c.replies, reply] } : c
      ));
    }
    
    setReplyContent('');
  }, [replyContent, currentUser, onReply]);
  
  // تنسيق الوقت
  const formatTime = (date: Date): string => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) return 'الآن';
    if (diff < 3600000) return `قبل ${Math.floor(diff / 60000)} دقيقة`;
    if (diff < 86400000) return `قبل ${Math.floor(diff / 3600000)} ساعة`;
    return date.toLocaleDateString('ar-SA');
  };
  
  // تنسيق المحتوى مع الإشارات
  const formatContent = (content: string): React.ReactNode => {
    const parts = content.split(/(@\w+)/g);
    
    return parts.map((part, i) => {
      if (part.startsWith('@')) {
        const username = part.slice(1);
        const user = allUsers.find(u => u.name.includes(username) || u.id.includes(username));
        
        return (
          <span
            key={i}
            className="text-blue-500 font-medium cursor-pointer hover:underline"
            style={{ color: user?.color }}
          >
            {part}
          </span>
        );
      }
      return part;
    });
  };
  
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-xl w-80 flex flex-col max-h-[500px] ${className}`}>
      {/* العنوان */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <span className="text-xl">💬</span>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            التعليقات
          </h3>
          {stats.open > 0 && (
            <span className="bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 text-xs px-2 py-0.5 rounded-full">
              {stats.open}
            </span>
          )}
        </div>
        
        <button
          onClick={() => setIsAddingComment(true)}
          className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          + إضافة
        </button>
      </div>
      
      {/* الفلتر */}
      <div className="flex gap-1 p-2 border-b border-gray-200 dark:border-gray-700">
        {(['all', 'open', 'resolved'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`flex-1 px-2 py-1 text-xs rounded ${
              filter === f
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200'
            }`}
          >
            {f === 'all' ? `الكل (${stats.total})` :
             f === 'open' ? `مفتوح (${stats.open})` :
             `محلول (${stats.resolved})`}
          </button>
        ))}
      </div>
      
      {/* قائمة التعليقات */}
      <div className="flex-1 overflow-y-auto">
        {filteredComments.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <span className="text-3xl">💬</span>
            <p className="mt-2 text-sm">لا توجد تعليقات</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {filteredComments.map(comment => (
              <div
                key={comment.id}
                className={`p-3 transition-colors ${
                  activeCommentId === comment.id 
                    ? 'bg-blue-50 dark:bg-blue-900/20' 
                    : 'hover:bg-gray-50 dark:hover:bg-gray-750'
                }`}
                onClick={() => setActiveCommentId(
                  activeCommentId === comment.id ? null : comment.id
                )}
              >
                {/* رأس التعليق */}
                <div className="flex items-start gap-2">
                  {/* الصورة */}
                  {comment.authorAvatar ? (
                    <img
                      src={comment.authorAvatar}
                      alt={comment.authorName}
                      className="w-8 h-8 rounded-full"
                    />
                  ) : (
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
                      style={{ backgroundColor: comment.authorColor }}
                    >
                      {comment.authorName[0]}
                    </div>
                  )}
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {comment.authorName}
                      </span>
                      <span className="text-xs text-gray-500">
                        {formatTime(comment.timestamp)}
                      </span>
                      
                      {/* شارة الحالة */}
                      {comment.status === 'resolved' && (
                        <span className="text-xs px-1.5 py-0.5 bg-green-100 text-green-700 rounded">
                          ✓ محلول
                        </span>
                      )}
                    </div>
                    
                    {/* المحتوى */}
                    <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                      {formatContent(comment.content)}
                    </p>
                    
                    {/* العنصر المرتبط */}
                    {comment.elementId && (
                      <p className="text-xs text-gray-400 mt-1">
                        📍 على عنصر {comment.elementId.slice(0, 8)}...
                      </p>
                    )}
                  </div>
                </div>
                
                {/* التفاصيل والردود */}
                {activeCommentId === comment.id && (
                  <div className="mt-3 mr-10">
                    {/* الردود */}
                    {comment.replies.length > 0 && (
                      <div className="space-y-2 mb-3">
                        {comment.replies.map(reply => (
                          <div key={reply.id} className="flex gap-2 p-2 bg-gray-50 dark:bg-gray-700 rounded">
                            {reply.authorAvatar ? (
                              <img
                                src={reply.authorAvatar}
                                alt={reply.authorName}
                                className="w-6 h-6 rounded-full"
                              />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-gray-400 flex items-center justify-center text-white text-xs">
                                {reply.authorName[0]}
                              </div>
                            )}
                            <div className="flex-1">
                              <div className="flex items-center gap-1 text-xs">
                                <span className="font-medium">{reply.authorName}</span>
                                <span className="text-gray-500">{formatTime(reply.timestamp)}</span>
                              </div>
                              <p className="text-sm text-gray-700 dark:text-gray-300">
                                {formatContent(reply.content)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* إضافة رد */}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={replyContent}
                        onChange={(e) => setReplyContent(e.target.value)}
                        placeholder="أضف رداً..."
                        className="flex-1 px-2 py-1 text-sm border rounded dark:bg-gray-700"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleReply(comment.id);
                          }
                        }}
                      />
                      <button
                        onClick={() => handleReply(comment.id)}
                        disabled={!replyContent.trim()}
                        className="px-2 py-1 text-sm bg-blue-500 text-white rounded disabled:bg-gray-300"
                      >
                        رد
                      </button>
                    </div>
                    
                    {/* أزرار الإجراءات */}
                    <div className="flex gap-2 mt-2">
                      {comment.status === 'open' && (
                        <button
                          onClick={() => handleResolve(comment.id)}
                          className="text-xs text-green-600 hover:underline"
                        >
                          ✓ حل
                        </button>
                      )}
                      {comment.authorId === currentUser?.id && (
                        <button
                          onClick={() => handleDelete(comment.id)}
                          className="text-xs text-red-600 hover:underline"
                        >
                          🗑️ حذف
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* نافذة إضافة تعليق */}
      {isAddingComment && (
        <div className="p-3 border-t border-gray-200 dark:border-gray-700 bg-blue-50 dark:bg-blue-900/20">
          <textarea
            ref={inputRef}
            value={newCommentContent}
            onChange={(e) => setNewCommentContent(e.target.value)}
            placeholder="اكتب تعليقك... استخدم @ للإشارة"
            className="w-full px-3 py-2 border rounded text-sm resize-none dark:bg-gray-700"
            rows={3}
            autoFocus
          />
          
          <div className="flex gap-2 mt-2">
            <button
              onClick={handleAddComment}
              disabled={!newCommentContent.trim()}
              className="flex-1 px-3 py-1.5 bg-blue-500 text-white text-sm rounded disabled:bg-gray-300"
            >
              نشر التعليق
            </button>
            <button
              onClick={() => {
                setIsAddingComment(false);
                setNewCommentContent('');
              }}
              className="px-3 py-1.5 bg-gray-200 dark:bg-gray-700 text-sm rounded"
            >
              إلغاء
            </button>
          </div>
          
          <p className="text-xs text-gray-500 mt-2">
            💡 انقر على اللوحة لتحديد موقع التعليق
          </p>
        </div>
      )}
    </div>
  );
};

/**
 * علامة تعليق على اللوحة
 */
export interface CommentMarkerProps {
  x: number;
  y: number;
  count?: number;
  authorColor?: string;
  isResolved?: boolean;
  onClick?: () => void;
}

export const CommentMarker: React.FC<CommentMarkerProps> = ({
  x,
  y,
  count = 1,
  authorColor = '#3b82f6',
  isResolved = false,
  onClick
}) => {
  return (
    <div
      className={`
        absolute cursor-pointer transform -translate-x-1/2 -translate-y-full
        transition-transform hover:scale-110
        ${isResolved ? 'opacity-50' : ''}
      `}
      style={{ left: x, top: y }}
      onClick={onClick}
    >
      <div className="relative">
        {/* الفقاعة */}
        <svg width="32" height="32" viewBox="0 0 32 32">
          <path
            d="M16 4 C8 4 4 8 4 14 C4 20 8 24 14 24 L14 28 L20 24 L18 24 C24 24 28 20 28 14 C28 8 24 4 16 4 Z"
            fill={isResolved ? '#6b7280' : authorColor}
            stroke="white"
            strokeWidth="2"
          />
        </svg>
        
        {/* العدد */}
        {count > 1 && (
          <span className="absolute top-1 left-1/2 -translate-x-1/2 text-white text-xs font-bold">
            {count}
          </span>
        )}
        
        {/* علامة الحل */}
        {isResolved && (
          <span className="absolute top-1 left-1/2 -translate-x-1/2 text-white text-xs">
            ✓
          </span>
        )}
      </div>
    </div>
  );
};

export default Comments;
