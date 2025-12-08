/**
 * 🤖 CCCWAYS Canvas - AI Components Index
 * ملف تصدير مكونات الذكاء الاصطناعي
 */

// مساعد الذكاء الاصطناعي
export { AIAssistant } from './AIAssistant';
export { default as AIAssistantDefault } from './AIAssistant';

// الاقتراحات الذكية
export { SmartSuggestions } from './SmartSuggestions';
export { default as SmartSuggestionsDefault } from './SmartSuggestions';

// الأوامر الصوتية
export { VoiceCommands } from './VoiceCommands';
export { default as VoiceCommandsDefault } from './VoiceCommands';

/**
 * جميع مكونات AI كـ object واحد
 */
export const AIComponents = {
  Assistant: AIAssistant,
  Suggestions: SmartSuggestions,
  Voice: VoiceCommands
};

export default AIComponents;
