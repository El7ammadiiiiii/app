// Settings Types for CCWAYS Platform

// ============================================
// Theme & Appearance Types
// ============================================
export type ThemeMode = 'light' | 'dark' | 'system';
export type FontSize = 'small' | 'medium' | 'large';
export type AccentColor = 'green' | 'blue' | 'purple' | 'pink' | 'orange' | 'red' | 'yellow' | 'gray';

// ============================================
// Language & Localization Types
// ============================================
export type Language = string;
export type TextDirection = 'rtl' | 'ltr' | 'auto';
export type TimeFormat = '12h' | '24h';
export type DateFormat = 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';
export type Calendar = 'gregorian' | 'hijri';

// ============================================
// Privacy & Data Types
// ============================================
export type HistoryRetention = '7d' | '30d' | '90d' | 'forever';

// ============================================
// Assistant Types
// ============================================
export type AssistantType = 'general' | 'analyst' | 'institute';
export type ResponseStyle = 'concise' | 'detailed' | 'creative';
export type ResponseTone = 'formal' | 'friendly' | 'technical';
export type ResponseLanguage = 'ar' | 'en' | 'auto';

// ============================================
// Notification Types
// ============================================
export type NotificationDigest = 'realtime' | 'daily' | 'weekly';

// ============================================
// Subscription Types
// ============================================
export type SubscriptionPlan = 'free' | 'pro' | 'enterprise';
export type BillingCycle = 'monthly' | 'yearly';

// ============================================
// Voice Types
// ============================================
export type VoiceOption = 'breeze' | 'ember' | 'sol' | 'cove' | 'aurora' | 'sage';

// ============================================
// Section IDs (7 tabs — ChatGPT-style)
// ============================================
export type SettingsSectionId = 
  | 'general'
  | 'notifications'
  | 'personalization'
  | 'apps'
  | 'data-controls'
  | 'security'
  | 'account';

// Legacy section IDs kept for migration compatibility
export type LegacySettingsSectionId =
  | 'subscription'
  | 'privacy'
  | 'appearance'
  | 'colors'
  | 'language'
  | 'voice'
  | 'assistants'
  | 'integrations'
  | 'advanced'
  | 'files'
  | 'plugins'
  | 'app-settings'
  | 'about';

// ============================================
// Settings Section Interface
// ============================================
export interface SettingsSection {
  id: SettingsSectionId;
  label: string;
  icon: string;
  description?: string;
}

// ============================================
// User Profile Interface
// ============================================
export interface UserProfile {
  id: string;
  fullName: string;
  username: string;
  email: string;
  phone?: string;
  photoUrl?: string;
  plan: SubscriptionPlan;
  twoFactorEnabled: boolean;
  emailVerified: boolean;
  createdAt: Date;
}

// ============================================
// Session Interface
// ============================================
export interface Session {
  id: string;
  device: string;
  browser: string;
  location: string;
  lastActive: Date;
  isCurrent: boolean;
}

// ============================================
// Payment Method Interface
// ============================================
export interface PaymentMethod {
  id: string;
  type: 'card' | 'paypal';
  last4?: string;
  brand?: string;
  expiryMonth?: number;
  expiryYear?: number;
  isDefault: boolean;
}

// ============================================
// Invoice Interface
// ============================================
export interface Invoice {
  id: string;
  date: Date;
  amount: number;
  currency: string;
  status: 'paid' | 'pending' | 'failed';
  downloadUrl?: string;
}

// ============================================
// API Key Interface
// ============================================
export interface ApiKey {
  id: string;
  name: string;
  key: string;
  lastUsed?: Date;
  createdAt: Date;
  permissions: string[];
}

// ============================================
// Integration Interface
// ============================================
export interface Integration {
  id: string;
  name: string;
  icon: string;
  connected: boolean;
  username?: string;
  connectedAt?: Date;
}

// ============================================
// Plugin Interface
// ============================================
export interface Plugin {
  id: string;
  name: string;
  description: string;
  icon: string;
  version: string;
  author: string;
  enabled: boolean;
  installed: boolean;
  category: 'analysis' | 'tools' | 'integrations' | 'other';
}

// ============================================
// File Interface
// ============================================
export interface UploadedFile {
  id: string;
  name: string;
  type: string;
  size: number;
  uploadedAt: Date;
  isFavorite: boolean;
}

// ============================================
// Memory Item Interface
// ============================================
export interface MemoryItem {
  id: string;
  content: string;
  category: string;
  createdAt: Date;
}

// ============================================
// Shared Link Interface
// ============================================
export interface SharedLink {
  id: string;
  name: string;
  type: 'chat' | 'post' | 'document';
  url: string;
  sharedAt: Date;
}

// ============================================
// Changelog Entry Interface
// ============================================
export interface ChangelogEntry {
  version: string;
  date: Date;
  changes: string[];
}

// ============================================
// Save Status Type
// ============================================
export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

// ============================================
// Modal Type
// ============================================
export type ModalType = 'danger' | 'warning' | 'info';

// ============================================
// Settings State Interface (for Zustand)
// ============================================
export interface SettingsState {
  // Appearance
  theme: ThemeMode;
  accentColor: AccentColor;
  fontSize: FontSize;
  compactMode: boolean;
  animations: boolean;
  reducedMotion: boolean;
  
  // Language
  language: Language;
  direction: TextDirection;
  dateFormat: DateFormat;
  timeFormat: TimeFormat;
  calendar: Calendar;
  timezone: string;
  
  // Writing
  autoCorrect: boolean;
  autoComplete: boolean;
  animatedTyping: boolean;
  
  // Privacy
  dataSharing: boolean;
  anonymousAnalytics: boolean;
  smartPersonalization: boolean;
  memoryEnabled: boolean;
  historyEnabled: boolean;
  historyRetention: HistoryRetention;
  temporaryChatMode: boolean;
  improveModelForAll: boolean;
  
  // Notifications
  inAppNotifications: boolean;
  pushNotifications: boolean;
  emailNotifications: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  doNotDisturb: boolean;
  doNotDisturbStart: string;
  doNotDisturbEnd: string;
  dailyDigest: boolean;
  digestTime: string;
  
  // Notification Types
  notifyNewMessage: boolean;
  notifyPriceAlerts: boolean;
  notifySystemUpdates: boolean;
  notifyTips: boolean;
  
  // Voice
  voiceEnabled: boolean;
  selectedVoice: VoiceOption;
  voiceSpeed: number;
  voicePitch: number;
  autoPlayResponse: boolean;
  pushToTalk: boolean;
  noiseCancellation: boolean;
  microphoneSensitivity: number;
  pauseBetweenSentences: number;
  
  // Assistant
  defaultAssistant: AssistantType;
  responseLength: ResponseStyle;
  responseTone: ResponseTone;
  responseLanguage: ResponseLanguage;
  customInstructions: string;
  showSources: boolean;
  askConfirmation: boolean;
  creativity: number;
  preferredAnalysis: {
    technical: boolean;
    fundamental: boolean;
    onchain: boolean;
  };
  favoriteCoins: string[];
  
  // Advanced
  developerMode: boolean;
  debugLogs: boolean;
  showElementIds: boolean;
  preloadData: boolean;
  compressImages: boolean;
  memoryLimit: '256MB' | '512MB' | '1GB';
  experimentalFeatures: boolean;
  updateChannel: 'stable' | 'beta';
  connectionTimeout: number;
  retryAttempts: number;
  useProxy: boolean;
  proxyUrl: string;
  
  // Files
  autoDeleteFiles: boolean;
  fileRetentionDays: number;
  excludeFavorites: boolean;
  compressUploads: boolean;
  
  // App Settings
  defaultPage: 'dashboard' | 'chat' | 'markets';
  openLastConversation: boolean;
  startMinimized: boolean;
  hardwareAcceleration: boolean;
  lowPowerMode: boolean;
  quality: 'high' | 'medium' | 'low';
  autoUpdate: boolean;
  notifyBeforeUpdate: boolean;
  highContrast: boolean;
  screenReader: boolean;
  swipeNavigation: boolean;
  landscapeMode: boolean;
  
  // Plugins
  autoUpdatePlugins: boolean;
  allowExternalPlugins: boolean;
  showPluginPermissions: boolean;
  
  // Notifications — ChatGPT-style dropdown preferences
  notifyResponses: 'all' | 'important' | 'off';
  notifyTasks: 'all' | 'important' | 'off';
  notifyRecommendations: 'all' | 'important' | 'off';
  notifyUsage: 'all' | 'important' | 'off';

  // Personalization
  stylePreference: 'formal' | 'informal' | 'technical' | 'simple';
  traitCreativity: 'low' | 'medium' | 'high';
  traitDetail: 'concise' | 'balanced' | 'detailed';
  traitTone: 'neutral' | 'warm' | 'professional';
  traitLength: 'short' | 'medium' | 'long';
  preferredName: string;
  occupation: string;
  additionalInfo: string;
  webSearchEnabled: boolean;
  canvasEnabled: boolean;

  // Meta
  _lastSaved: Date | null;
  _saveStatus: SaveStatus;
}

// ============================================
// Settings Actions Interface
// ============================================
export interface SettingsActions {
  // Update actions
  updateSetting: <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => void;
  updateMultiple: (updates: Partial<SettingsState>) => void;
  
  // Reset actions
  resetToDefaults: () => void;
  resetSection: (section: SettingsSectionId) => void;
  
  // Export/Import
  exportSettings: () => string;
  importSettings: (json: string) => boolean;
  
  // Save status
  setSaveStatus: (status: SaveStatus) => void;
}

// ============================================
// Combined Store Type
// ============================================
export type SettingsStore = SettingsState & SettingsActions;
