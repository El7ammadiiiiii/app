"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { 
  SettingsState, 
  SettingsActions, 
  SettingsStore,
  SettingsSectionId,
  SaveStatus 
} from "../types/settings";

// ============================================
// Default Settings Values
// ============================================
const defaultSettings: SettingsState = {
  // Appearance
  theme: 'system',
  accentColor: 'green',
  fontSize: 'medium',
  compactMode: false,
  animations: true,
  reducedMotion: false,
  
  // Language
  language: 'ar',
  direction: 'rtl',
  dateFormat: 'DD/MM/YYYY',
  timeFormat: '24h',
  calendar: 'gregorian',
  timezone: 'Asia/Riyadh',
  
  // Writing
  autoCorrect: true,
  autoComplete: true,
  animatedTyping: true,
  
  // Privacy
  dataSharing: false,
  anonymousAnalytics: true,
  smartPersonalization: true,
  memoryEnabled: true,
  historyEnabled: true,
  historyRetention: '30d',
  temporaryChatMode: false,
  improveModelForAll: true,
  
  // Notifications
  inAppNotifications: true,
  pushNotifications: true,
  emailNotifications: true,
  soundEnabled: true,
  vibrationEnabled: true,
  doNotDisturb: false,
  doNotDisturbStart: '22:00',
  doNotDisturbEnd: '08:00',
  dailyDigest: false,
  digestTime: '09:00',
  
  // Notification Types
  notifyNewMessage: true,
  notifyPriceAlerts: true,
  notifySystemUpdates: true,
  notifyTips: true,
  
  // Voice
  voiceEnabled: true,
  selectedVoice: 'breeze',
  voiceSpeed: 1.0,
  voicePitch: 1.0,
  autoPlayResponse: false,
  pushToTalk: false,
  noiseCancellation: true,
  microphoneSensitivity: 5,
  pauseBetweenSentences: 1.0,
  
  // Assistant
  defaultAssistant: 'general',
  responseLength: 'detailed',
  responseTone: 'friendly',
  responseLanguage: 'auto',
  customInstructions: '',
  showSources: true,
  askConfirmation: true,
  creativity: 50,
  preferredAnalysis: {
    technical: true,
    fundamental: true,
    onchain: true,
  },
  favoriteCoins: ['BTC', 'ETH'],
  
  // Advanced
  developerMode: false,
  debugLogs: false,
  showElementIds: false,
  preloadData: true,
  compressImages: true,
  memoryLimit: '512MB',
  experimentalFeatures: false,
  updateChannel: 'stable',
  connectionTimeout: 30,
  retryAttempts: 3,
  useProxy: false,
  proxyUrl: '',
  
  // Files
  autoDeleteFiles: false,
  fileRetentionDays: 30,
  excludeFavorites: true,
  compressUploads: true,
  
  // App Settings
  defaultPage: 'dashboard',
  openLastConversation: true,
  startMinimized: false,
  hardwareAcceleration: true,
  lowPowerMode: false,
  quality: 'high',
  autoUpdate: true,
  notifyBeforeUpdate: true,
  highContrast: false,
  screenReader: false,
  swipeNavigation: true,
  landscapeMode: true,
  
  // Plugins
  autoUpdatePlugins: true,
  allowExternalPlugins: false,
  showPluginPermissions: true,
  
  // Notifications — ChatGPT-style dropdown preferences
  notifyResponses: 'all',
  notifyTasks: 'all',
  notifyRecommendations: 'important',
  notifyUsage: 'off',

  // Personalization
  stylePreference: 'informal',
  traitCreativity: 'medium',
  traitDetail: 'balanced',
  traitTone: 'neutral',
  traitLength: 'medium',
  preferredName: '',
  occupation: '',
  additionalInfo: '',
  webSearchEnabled: true,
  canvasEnabled: true,

  // Meta
  _lastSaved: null,
  _saveStatus: 'idle',
};

// ============================================
// Section to Keys Mapping
// ============================================
const sectionKeys: Record<SettingsSectionId, (keyof SettingsState)[]> = {
  general: [
    'theme', 'fontSize', 'language', 'direction',
  ],
  notifications: [
    'notifyResponses', 'notifyTasks', 'notifyRecommendations', 'notifyUsage',
    'inAppNotifications', 'pushNotifications', 'emailNotifications',
    'soundEnabled',
  ],
  personalization: [
    'stylePreference', 'traitCreativity', 'traitDetail', 'traitTone', 'traitLength',
    'preferredName', 'occupation', 'additionalInfo',
    'customInstructions', 'memoryEnabled', 'webSearchEnabled', 'canvasEnabled',
    'defaultAssistant', 'responseLength', 'responseTone', 'responseLanguage',
    'showSources', 'askConfirmation', 'creativity',
  ],
  apps: [], // Managed separately via integration store
  'data-controls': [
    'dataSharing', 'anonymousAnalytics', 'improveModelForAll',
    'historyEnabled', 'historyRetention',
  ],
  security: [], // Managed via Firebase Auth
  account: [], // Account data managed separately via Firestore
};

// ============================================
// Zustand Store
// ============================================
export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set, get) => ({
      ...defaultSettings,
      
      // Update a single setting
      updateSetting: (key, value) => {
        set({ 
          [key]: value,
          _lastSaved: new Date(),
          _saveStatus: 'saved' as SaveStatus,
        });
        
        // Reset save status after 2 seconds
        setTimeout(() => {
          set({ _saveStatus: 'idle' as SaveStatus });
        }, 2000);
      },
      
      // Update multiple settings at once
      updateMultiple: (updates) => {
        set({ 
          ...updates,
          _lastSaved: new Date(),
          _saveStatus: 'saved' as SaveStatus,
        });
        
        setTimeout(() => {
          set({ _saveStatus: 'idle' as SaveStatus });
        }, 2000);
      },
      
      // Reset all settings to defaults
      resetToDefaults: () => {
        set({
          ...defaultSettings,
          _lastSaved: new Date(),
          _saveStatus: 'saved' as SaveStatus,
        });
      },
      
      // Reset a specific section
      resetSection: (section) => {
        const keys = sectionKeys[section];
        const resetValues: Partial<SettingsState> = {};
        
        keys.forEach((key) => {
          (resetValues as any)[key] = defaultSettings[key];
        });
        
        set({
          ...resetValues,
          _lastSaved: new Date(),
          _saveStatus: 'saved' as SaveStatus,
        });
      },
      
      // Export settings as JSON
      exportSettings: () => {
        const state = get();
        const exportData: Partial<SettingsState> = { ...state };
        
        // Remove meta fields
        delete (exportData as any)._lastSaved;
        delete (exportData as any)._saveStatus;
        
        return JSON.stringify(exportData, null, 2);
      },
      
      // Import settings from JSON
      importSettings: (json) => {
        try {
          const imported = JSON.parse(json);
          
          // Validate and merge with defaults
          const validSettings: Partial<SettingsState> = {};
          
          Object.keys(defaultSettings).forEach((key) => {
            if (key.startsWith('_')) return; // Skip meta fields
            if (imported[key] !== undefined) {
              (validSettings as any)[key] = imported[key];
            }
          });
          
          set({
            ...validSettings,
            _lastSaved: new Date(),
            _saveStatus: 'saved' as SaveStatus,
          });
          
          return true;
        } catch {
          return false;
        }
      },
      
      // Set save status
      setSaveStatus: (status) => {
        set({ _saveStatus: status });
      },
    }),
    {
      name: 'CCWAYS-settings',
      partialize: (state) => {
        // Exclude meta fields from persistence
        const { _lastSaved, _saveStatus, ...rest } = state;
        return rest;
      },
    }
  )
);

// ============================================
// Selectors (for performance optimization)
// ============================================
export const useTheme = () => useSettingsStore((s) => s.theme);
export const useLanguage = () => useSettingsStore((s) => s.language);
export const useAnimations = () => useSettingsStore((s) => s.animations);
export const useSaveStatus = () => useSettingsStore((s) => s._saveStatus);
export const useDefaultAssistant = () => useSettingsStore((s) => s.defaultAssistant);
