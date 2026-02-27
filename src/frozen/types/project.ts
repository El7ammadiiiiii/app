// ═══════════════════════════════════════════════════════════════
// CCWAYS Projects System - Types & Interfaces
// نظام المشاريع المتكامل
// ═══════════════════════════════════════════════════════════════

// ألوان المشاريع المتاحة
export type ProjectColor =
  | 'emerald'    // 🟢 نجاح/صعود
  | 'ocean'      // 🔵 أزرق محيطي
  | 'purple'     // 🟣 بنفسجي ملكي
  | 'orange'     // 🟠 برتقالي غروب
  | 'ruby'       // 🔴 أحمر ياقوتي
  | 'turquoise'  // 🩵 تركواز (الأساسي)
  | 'rose'       // 🩷 وردي
  | 'golden'     // 🟡 ذهبي
  | 'graphite'   // ⚫ رمادي غامق
  | 'brown'      // 🤎 بني دافئ
  | 'silver'     // 🩶 فضي
  | 'gradient';  // 🌈 متدرج

// خريطة ألوان المشاريع (Tailwind classes)
export const PROJECT_COLORS: Record<ProjectColor, { 
  bg: string; 
  text: string; 
  border: string; 
  glow: string;
  solid: string;
  nameAr: string;
}> = {
  emerald: {
    bg: 'bg-emerald-500/20',
    text: 'text-emerald-400',
    border: 'border-emerald-500/30',
    glow: 'shadow-[0_0_15px_rgba(16,185,129,0.3)]',
    solid: 'bg-emerald-500',
    nameAr: 'أخضر زمردي',
  },
  ocean: {
    bg: 'bg-blue-500/20',
    text: 'text-blue-400',
    border: 'border-blue-500/30',
    glow: 'shadow-[0_0_15px_rgba(59,130,246,0.3)]',
    solid: 'bg-blue-500',
    nameAr: 'أزرق محيطي',
  },
  purple: {
    bg: 'bg-purple-500/20',
    text: 'text-purple-400',
    border: 'border-purple-500/30',
    glow: 'shadow-[0_0_15px_rgba(168,85,247,0.3)]',
    solid: 'bg-purple-500',
    nameAr: 'بنفسجي ملكي',
  },
  orange: {
    bg: 'bg-orange-500/20',
    text: 'text-orange-400',
    border: 'border-orange-500/30',
    glow: 'shadow-[0_0_15px_rgba(249,115,22,0.3)]',
    solid: 'bg-orange-500',
    nameAr: 'برتقالي غروب',
  },
  ruby: {
    bg: 'bg-red-500/20',
    text: 'text-red-400',
    border: 'border-red-500/30',
    glow: 'shadow-[0_0_15px_rgba(239,68,68,0.3)]',
    solid: 'bg-red-500',
    nameAr: 'أحمر ياقوتي',
  },
  turquoise: {
    bg: 'bg-primary/20',
    text: 'text-primary',
    border: 'border-primary/30',
    glow: 'shadow-[0_0_15px_rgba(0,210,180,0.3)]',
    solid: 'bg-primary',
    nameAr: 'تركواز',
  },
  rose: {
    bg: 'bg-pink-500/20',
    text: 'text-pink-400',
    border: 'border-pink-500/30',
    glow: 'shadow-[0_0_15px_rgba(236,72,153,0.3)]',
    solid: 'bg-pink-500',
    nameAr: 'وردي',
  },
  golden: {
    bg: 'bg-yellow-500/20',
    text: 'text-yellow-400',
    border: 'border-yellow-500/30',
    glow: 'shadow-[0_0_15px_rgba(234,179,8,0.3)]',
    solid: 'bg-yellow-500',
    nameAr: 'ذهبي',
  },
  graphite: {
    bg: 'bg-gray-600/20',
    text: 'text-gray-400',
    border: 'border-gray-500/30',
    glow: 'shadow-[0_0_15px_rgba(107,114,128,0.3)]',
    solid: 'bg-gray-600',
    nameAr: 'رمادي غامق',
  },
  brown: {
    bg: 'bg-amber-700/20',
    text: 'text-amber-600',
    border: 'border-amber-600/30',
    glow: 'shadow-[0_0_15px_rgba(180,83,9,0.3)]',
    solid: 'bg-amber-700',
    nameAr: 'بني دافئ',
  },
  silver: {
    bg: 'bg-slate-400/20',
    text: 'text-slate-300',
    border: 'border-slate-400/30',
    glow: 'shadow-[0_0_15px_rgba(148,163,184,0.3)]',
    solid: 'bg-slate-400',
    nameAr: 'فضي',
  },
  gradient: {
    bg: 'bg-gradient-to-br from-primary/20 via-purple-500/20 to-pink-500/20',
    text: 'text-transparent bg-clip-text bg-gradient-to-r from-primary via-purple-400 to-pink-400',
    border: 'border-primary/30',
    glow: 'shadow-[0_0_15px_rgba(0,210,180,0.3)]',
    solid: 'bg-gradient-to-r from-primary via-purple-500 to-pink-500',
    nameAr: 'متدرج قوس قزح',
  },
};

// إيموجي شائعة للمشاريع
export const PROJECT_EMOJIS = [
  '📊', '📈', '💰', '🚀', '💎', '🔥', '⚡', '🎯',
  '📁', '💼', '🧠', '📚', '🔬', '🛠️', '🎨', '🌟',
  '💡', '🔒', '🌐', '📱', '💻', '🤖', '🎮', '🏆',
  '📝', '✅', '🔔', '💬', '🎁', '🌈', '☀️', '🌙',
];

// قوالب المشاريع الجاهزة
export type ProjectTemplate = 
  | 'crypto-analysis'   // تحليل عملة رقمية
  | 'research'          // بحث مشروع
  | 'strategy'          // تخطيط استراتيجية
  | 'learning'          // تعلم موضوع
  | 'trading'           // خطة تداول
  | 'blank';            // فارغ

export interface ProjectTemplateConfig {
  id: ProjectTemplate;
  name: string;
  nameAr: string;
  emoji: string;
  color: ProjectColor;
  instructions: string;
  description: string;
}

export const PROJECT_TEMPLATES: ProjectTemplateConfig[] = [
  {
    id: 'crypto-analysis',
    name: 'Crypto Analysis',
    nameAr: 'تحليل عملة رقمية',
    emoji: '📊',
    color: 'turquoise',
    instructions: `أنت محلل عملات رقمية متخصص. عند تحليل أي عملة:
1. قدم تحليل فني شامل (RSI, MACD, Moving Averages)
2. حدد مستويات الدعم والمقاومة الرئيسية
3. اذكر أهم الأخبار والتطورات الأخيرة
4. قدم نظرة على المؤشرات On-Chain
5. اختم بتوصية واضحة مع نسبة المخاطرة`,
    description: 'تحليل فني وأساسي شامل للعملات الرقمية',
  },
  {
    id: 'research',
    name: 'Project Research',
    nameAr: 'بحث مشروع',
    emoji: '🔬',
    color: 'purple',
    instructions: `أنت باحث متخصص في مشاريع البلوكتشين. عند البحث:
1. قدم نظرة عامة على المشروع والفريق
2. حلل Tokenomics والتوزيع
3. راجع الشراكات والتطويرات
4. قيّم المنافسين والميزات التنافسية
5. حدد المخاطر والفرص`,
    description: 'بحث معمق في مشاريع الكريبتو والبلوكتشين',
  },
  {
    id: 'strategy',
    name: 'Strategy Planning',
    nameAr: 'تخطيط استراتيجية',
    emoji: '🎯',
    color: 'ocean',
    instructions: `أنت مستشار استراتيجي. عند التخطيط:
1. حدد الأهداف بوضوح (SMART Goals)
2. حلل الوضع الحالي والموارد المتاحة
3. ضع خطة عمل مرحلية
4. حدد مؤشرات النجاح (KPIs)
5. اقترح خطط بديلة للطوارئ`,
    description: 'تخطيط استراتيجي منظم للأهداف والمشاريع',
  },
  {
    id: 'trading',
    name: 'Trading Plan',
    nameAr: 'خطة تداول',
    emoji: '📈',
    color: 'emerald',
    instructions: `أنت مدير محافظ محترف. عند وضع خطة تداول:
1. حدد نقاط الدخول والخروج بدقة
2. ضع Stop Loss و Take Profit
3. احسب نسبة المخاطرة للعائد (R:R)
4. حدد حجم الصفقة المناسب
5. راقب الأخبار والأحداث المؤثرة`,
    description: 'خطط تداول مدروسة مع إدارة مخاطر',
  },
  {
    id: 'learning',
    name: 'Learning Path',
    nameAr: 'مسار تعلم',
    emoji: '📚',
    color: 'golden',
    instructions: `أنت معلم خبير. عند الشرح:
1. ابدأ من الأساسيات وتدرج للمتقدم
2. استخدم أمثلة عملية وتشبيهات
3. قسم المعلومات لنقاط واضحة
4. اطرح أسئلة للتأكد من الفهم
5. قدم تمارين وتطبيقات عملية`,
    description: 'تعلم أي موضوع بطريقة منظمة ومتدرجة',
  },
  {
    id: 'blank',
    name: 'Blank Project',
    nameAr: 'مشروع فارغ',
    emoji: '📁',
    color: 'graphite',
    instructions: '',
    description: 'مشروع فارغ بدون تعليمات مسبقة',
  },
];

// ═══════════════════════════════════════════════════════════════
// Canvas Data for inline canvas in chat
// ═══════════════════════════════════════════════════════════════
export interface CanvasData {
  id: string;
  title: string;
  content: string;
  type: 'code' | 'text' | 'html';
  language?: string;
  previousContent?: string;
  isStreaming?: boolean;
}

// ═══════════════════════════════════════════════════════════════
// رسالة في المحادثة
// ═══════════════════════════════════════════════════════════════
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  isCanvas?: boolean;
  canvasData?: CanvasData;
  attachments?: MessageAttachment[];
  reactions?: MessageReaction[];
  // Deep Research Support
  isResearch?: boolean;
  researchData?: {
    researchId: string;
    query: string;
    executiveSummary: string;
    sectionsCount: number;
    citationsCount: number;
    result?: any; // Full ResearchResult from deepResearch types
  };
}

export interface MessageAttachment {
  id: string;
  type: 'image' | 'file' | 'audio' | 'chart';
  name: string;
  url: string;
  size?: number;
}

export interface MessageReaction {
  emoji: string;
  count: number;
}

// ═══════════════════════════════════════════════════════════════
// محادثة داخل المشروع
// ═══════════════════════════════════════════════════════════════
export interface ProjectChat {
  id: string;
  projectId: string;
  title: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
  isPinned: boolean;
  isBranch: boolean;
  branchFromId?: string;
  branchFromMessageId?: string;
  isArchived?: boolean;
}

// ═══════════════════════════════════════════════════════════════
// ملف مرفق بالمشروع
// ═══════════════════════════════════════════════════════════════
export type FileType = 'pdf' | 'image' | 'csv' | 'json' | 'txt' | 'doc' | 'other';

export interface ProjectFile {
  id: string;
  projectId: string;
  name: string;
  type: FileType;
  mimeType: string;
  size: number;
  url: string;
  uploadedAt: Date;
  description?: string;
}

export const FILE_ICONS: Record<FileType, string> = {
  pdf: '📄',
  image: '🖼️',
  csv: '📊',
  json: '📋',
  txt: '📝',
  doc: '📃',
  other: '📁',
};

// ═══════════════════════════════════════════════════════════════
// المشروع الرئيسي
// ═══════════════════════════════════════════════════════════════
export interface Project {
  id: string;
  name: string;
  emoji: string;
  color: ProjectColor;
  instructions: string;
  description?: string;
  
  // الذاكرة
  memoryType: 'default' | 'project-only';
  
  // الإحصائيات
  chatsCount: number;
  filesCount: number;
  
  // الحالة
  isPinned: boolean;
  isArchived: boolean;
  isFavorite: boolean;
  
  // التواريخ
  createdAt: Date;
  updatedAt: Date;
  lastAccessedAt: Date;
  
  // القالب المستخدم
  template?: ProjectTemplate;
  
  // Tags للتصنيف
  tags?: string[];
}

// ═══════════════════════════════════════════════════════════════
// إنشاء مشروع جديد
// ═══════════════════════════════════════════════════════════════
export interface CreateProjectInput {
  name: string;
  emoji?: string;
  color?: ProjectColor;
  template?: ProjectTemplate;
  instructions?: string;
  description?: string;
  memoryType?: 'default' | 'project-only';
}

// ═══════════════════════════════════════════════════════════════
// تحديث مشروع
// ═══════════════════════════════════════════════════════════════
export interface UpdateProjectInput {
  name?: string;
  emoji?: string;
  color?: ProjectColor;
  instructions?: string;
  description?: string;
  isPinned?: boolean;
  isArchived?: boolean;
  isFavorite?: boolean;
  tags?: string[];
}

// ═══════════════════════════════════════════════════════════════
// أصوات النظام
// ═══════════════════════════════════════════════════════════════
export type SoundEffect = 
  | 'projectCreate'
  | 'projectDelete'
  | 'chatMove'
  | 'chatDrop'
  | 'success'
  | 'error'
  | 'click'
  | 'notification';

// ═══════════════════════════════════════════════════════════════
// حالة عرض المشاريع
// ═══════════════════════════════════════════════════════════════
export type ProjectViewMode = 'list' | 'grid' | 'compact';
export type ProjectSortBy = 'name' | 'createdAt' | 'updatedAt' | 'lastAccessed';
export type ProjectFilterBy = 'all' | 'pinned' | 'archived' | 'favorites';

// ═══════════════════════════════════════════════════════════════
// حالة Store
// ═══════════════════════════════════════════════════════════════
export interface ProjectStoreState {
  // البيانات
  projects: Project[];
  chats: ProjectChat[];
  files: ProjectFile[];
  
  // الحالة النشطة
  activeProjectId: string | null;
  activeChatId: string | null;
  
  // البحث والفلترة
  searchQuery: string;
  viewMode: ProjectViewMode;
  sortBy: ProjectSortBy;
  filterBy: ProjectFilterBy;
  
  // النوافذ
  isCreateModalOpen: boolean;
  isSettingsOpen: boolean;
  isQuickSwitcherOpen: boolean;
  
  // الإعدادات
  soundEnabled: boolean;
}
