/**
 * 🎨 CCCWAYS Canvas - Collaboration Components Index
 * ملف تصدير مكونات التعاون
 */

// مؤشرات المستخدمين
export { Cursors, SingleCursor } from './Cursors';
export { default as CursorsDefault } from './Cursors';

// مؤشر التواجد
export { PresenceIndicator, PresenceBadge } from './PresenceIndicator';
export { default as PresenceIndicatorDefault } from './PresenceIndicator';

// نظام التعليقات
export { Comments, CommentMarker } from './Comments';
export { default as CommentsDefault } from './Comments';

/**
 * جميع مكونات التعاون كـ object واحد
 */
export const CollaborationComponents = {
  Cursors: Cursors,
  Presence: PresenceIndicator,
  Comments: Comments
};

export default CollaborationComponents;
