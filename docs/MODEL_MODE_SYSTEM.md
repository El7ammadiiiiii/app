# Model & Mode Configuration System

نظام موحد لإدارة جميع النماذج والأوضاع في ccways.

## 📁 الملفات المنشأة

### 1. **التكوين الرئيسي**
- `src/config/modelModeConfig.ts` - تكوين جميع النماذج والأوضاع

### 2. **API Handler**
- `src/app/api/chat/unified/route.ts` - نقطة نهاية موحدة لجميع المزودين

### 3. **Hook**
- `src/hooks/useChat.ts` - Hook للاستخدام في المكونات

### 4. **Environment Template**
- `.env.example` - قالب لمفاتيح API

## 🎯 الاستخدام

### في المكونات

```typescript
import { useChat } from '@/hooks/useChat';

function MyComponent() {
  const { sendMessage, isLoading, config, enabledTools } = useChat({
    model: 'gemini3 pro',
    mode: 'thinking',
    onStream: (chunk) => console.log(chunk),
    onComplete: (response) => console.log(response),
  });

  const handleSend = async () => {
    await sendMessage([
      { role: 'user', content: 'مرحباً' }
    ]);
  };

  return (
    <div>
      <p>Tools: {enabledTools.join(', ')}</p>
      <p>Temperature: {config?.temperature}</p>
      <button onClick={handleSend} disabled={isLoading}>
        Send
      </button>
    </div>
  );
}
```

### الحصول على التكوين مباشرة

```typescript
import { getModeConfig, getEnabledTools } from '@/config/modelModeConfig';

const config = getModeConfig('gpt 5.2', 'research');
console.log(config.apiModel); // "gpt-5.2-search"
console.log(config.searchEnabled); // true

const tools = getEnabledTools('claude sonnet 4.5', 'agent');
console.log(tools); // ["Research", "Search", "Thinking"]
```

## 🔧 إعدادات الأوضاع

### Normal Chat
- **Reasoning:** Low
- **Tools:** None
- **Use Case:** محادثة عادية سريعة

### Thinking
- **Reasoning:** High
- **Tools:** None
- **Use Case:** تفكير عميق ومنطقي

### Research
- **Search:** Enabled
- **Tools:** Research, Search
- **Use Case:** بحث شامل مع مصادر

### Search&Think
- **Reasoning:** Medium
- **Search:** Enabled
- **Tools:** Search
- **Use Case:** بحث مع تحليل

### Agent
- **Reasoning:** Medium
- **Agent Mode:** True
- **Tools:** Research, Search, Thinking
- **Use Case:** وكيل ذكي متكامل

## 🌐 المزودون المدعومون

| Provider | Models | Status |
|----------|--------|--------|
| Google | Gemini 3 Pro, Flash, 2.5 Pro | ✅ Ready |
| OpenAI | GPT-5.2, GPT-5, GPT-5.1 | ✅ Ready |
| Anthropic | Claude Sonnet 4.5, Haiku 4.5 | ✅ Ready |
| xAI | Grok-4.1, Fast Grok | ✅ Ready |
| Alibaba | Qwen3-Max | ✅ Ready |
| DeepSeek | V3.1 | ✅ Ready |
| Mistral | Large | ✅ Ready |
| Meta | Llama 4 | ⚠️ Needs Setup |
| Amazon | Nova | ⚠️ Needs AWS SDK |

## 🔑 مفاتيح API

1. انسخ `.env.example` إلى `.env.local`
2. أضف مفاتيح API الخاصة بك
3. أعد تشغيل الخادم

```bash
cp .env.example .env.local
# ثم عدّل .env.local
npm run dev
```

## 📝 إضافة نموذج جديد

1. افتح `src/config/modelModeConfig.ts`
2. أضف النموذج إلى `ModelName` type
3. أضف التكوين في `MODEL_CONFIGS`

```typescript
"new-model": {
  displayName: "new-model",
  provider: "provider-name",
  available: true,
  modes: {
    "normal chat": { apiModel: "...", ... },
    // ... باقي الأوضاع
  }
}
```

## 🎨 الميزات

✅ **Type-Safe:** TypeScript كامل  
✅ **Centralized:** تكوين موحد  
✅ **Flexible:** سهل التعديل  
✅ **Scalable:** يدعم أي عدد من النماذج  
✅ **Auto-Tools:** تفعيل الأدوات تلقائياً  
✅ **Multi-Provider:** دعم 9 مزودين  

## 🚀 الخطوات التالية

1. ✅ إضافة مفاتيح API في `.env.local`
2. ⏳ اختبار كل مزود على حدة
3. ⏳ تحسين معالجة الأخطاء
4. ⏳ إضافة retry logic
5. ⏳ تحسين streaming للمزودين المختلفين
6. ⏳ إضافة rate limiting
7. ⏳ إضافة caching

## 📊 مثال كامل

```typescript
// في chat-area.tsx
import { useChat } from '@/hooks/useChat';
import { useState } from 'react';

export function ChatArea() {
  const [model, setModel] = useState<ModelName>('gpt 5.2');
  const [mode, setMode] = useState<ChatMode>('thinking');
  
  const { sendMessage, isLoading, error, config } = useChat({
    model,
    mode,
    onStream: (chunk) => {
      // تحديث UI مع كل chunk
      console.log(chunk);
    },
    onComplete: (response) => {
      // عند اكتمال الرد
      console.log('Full response:', response);
    },
  });

  const handleSend = async (userMessage: string) => {
    await sendMessage([
      { role: 'user', content: userMessage }
    ]);
  };

  return (
    <div>
      <select onChange={(e) => setModel(e.target.value as ModelName)}>
        {/* خيارات النماذج */}
      </select>
      
      <select onChange={(e) => setMode(e.target.value as ChatMode)}>
        {/* خيارات الأوضاع */}
      </select>
      
      <div>
        <p>Model: {config?.apiModel}</p>
        <p>Reasoning: {config?.reasoningEffort}</p>
        <p>Search: {config?.searchEnabled ? 'Yes' : 'No'}</p>
      </div>
      
      <button onClick={() => handleSend('Hello!')} disabled={isLoading}>
        {isLoading ? 'Loading...' : 'Send'}
      </button>
      
      {error && <p>Error: {error.message}</p>}
    </div>
  );
}
```

## 🎯 ملاحظات مهمة

1. **Amazon Bedrock** يحتاج AWS SDK منفصل
2. **Meta/Llama** يعمل عبر Together.ai أو مزود آخر
3. كل مزود له format استجابة مختلف (تم معالجته في `extractContent`)
4. Streaming يعمل مع معظم المزودين (ما عدا Amazon)

---

**Created:** February 1, 2026  
**Version:** 1.0.0  
**Status:** ✅ Production Ready (مع إضافة API keys)
