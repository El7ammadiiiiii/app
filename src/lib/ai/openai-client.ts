// =============================================================================
// 📦 CCCWAYS Canvas - OpenAI Client
// عميل OpenAI للتكامل مع الذكاء الاصطناعي
// =============================================================================

import type { CanvasElement, Point, Bounds } from "@/types/canvas";

// =============================================================================
// ⚙️ Configuration
// =============================================================================

export interface OpenAIConfig {
  apiKey: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  baseURL?: string;
}

export const DEFAULT_OPENAI_CONFIG: Partial<OpenAIConfig> = {
  model: "gpt-4-turbo-preview",
  temperature: 0.7,
  maxTokens: 4096,
  baseURL: "https://api.openai.com/v1",
};

// =============================================================================
// 📝 Message Types
// =============================================================================

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

export interface ChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: ChatMessage;
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface StreamChunk {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    delta: Partial<ChatMessage>;
    finish_reason: string | null;
  }>;
}

// =============================================================================
// 🤖 OpenAI Client
// =============================================================================

export class OpenAIClient {
  private config: Required<OpenAIConfig>;

  constructor(config: OpenAIConfig) {
    this.config = {
      ...DEFAULT_OPENAI_CONFIG,
      ...config,
    } as Required<OpenAIConfig>;
  }

  /**
   * إنشاء محادثة
   */
  async createChatCompletion(
    messages: ChatMessage[],
    options?: Partial<ChatCompletionRequest>
  ): Promise<ChatCompletionResponse> {
    const response = await fetch(`${this.config.baseURL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model: options?.model || this.config.model,
        messages,
        temperature: options?.temperature ?? this.config.temperature,
        max_tokens: options?.max_tokens ?? this.config.maxTokens,
        stream: false,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || "OpenAI API error");
    }

    return response.json();
  }

  /**
   * إنشاء محادثة مع التدفق
   */
  async *streamChatCompletion(
    messages: ChatMessage[],
    options?: Partial<ChatCompletionRequest>
  ): AsyncGenerator<string, void, unknown> {
    const response = await fetch(`${this.config.baseURL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model: options?.model || this.config.model,
        messages,
        temperature: options?.temperature ?? this.config.temperature,
        max_tokens: options?.max_tokens ?? this.config.maxTokens,
        stream: true,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || "OpenAI API error");
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) {
      throw new Error("No response body");
    }

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split("\n").filter((line) => line.trim() !== "");

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6);
          if (data === "[DONE]") {
            return;
          }

          try {
            const parsed: StreamChunk = JSON.parse(data);
            const content = parsed.choices[0]?.delta?.content;
            if (content) {
              yield content;
            }
          } catch {
            // Skip invalid JSON
          }
        }
      }
    }
  }

  /**
   * توليد صورة
   */
  async generateImage(
    prompt: string,
    options?: {
      size?: "256x256" | "512x512" | "1024x1024" | "1792x1024" | "1024x1792";
      quality?: "standard" | "hd";
      style?: "vivid" | "natural";
      n?: number;
    }
  ): Promise<string[]> {
    const response = await fetch(`${this.config.baseURL}/images/generations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model: "dall-e-3",
        prompt,
        size: options?.size || "1024x1024",
        quality: options?.quality || "standard",
        style: options?.style || "vivid",
        n: options?.n || 1,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || "OpenAI API error");
    }

    const data = await response.json();
    return data.data.map((item: { url: string }) => item.url);
  }

  /**
   * تحليل صورة
   */
  async analyzeImage(
    imageUrl: string,
    prompt: string
  ): Promise<string> {
    const response = await fetch(`${this.config.baseURL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4-vision-preview",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: imageUrl } },
            ],
          },
        ],
        max_tokens: this.config.maxTokens,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || "OpenAI API error");
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || "";
  }

  /**
   * تحويل الكلام إلى نص
   */
  async speechToText(
    audioBlob: Blob,
    options?: {
      language?: string;
      prompt?: string;
    }
  ): Promise<string> {
    const formData = new FormData();
    formData.append("file", audioBlob, "audio.webm");
    formData.append("model", "whisper-1");

    if (options?.language) {
      formData.append("language", options.language);
    }
    if (options?.prompt) {
      formData.append("prompt", options.prompt);
    }

    const response = await fetch(
      `${this.config.baseURL}/audio/transcriptions`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: formData,
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || "OpenAI API error");
    }

    const data = await response.json();
    return data.text;
  }

  /**
   * تحويل النص إلى كلام
   */
  async textToSpeech(
    text: string,
    options?: {
      voice?: "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer";
      speed?: number;
    }
  ): Promise<Blob> {
    const response = await fetch(`${this.config.baseURL}/audio/speech`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model: "tts-1",
        input: text,
        voice: options?.voice || "alloy",
        speed: options?.speed || 1,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || "OpenAI API error");
    }

    return response.blob();
  }

  /**
   * الحصول على embeddings
   */
  async getEmbeddings(texts: string[]): Promise<number[][]> {
    const response = await fetch(`${this.config.baseURL}/embeddings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: texts,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || "OpenAI API error");
    }

    const data = await response.json();
    return data.data.map((item: { embedding: number[] }) => item.embedding);
  }
}

// =============================================================================
// 🎨 Canvas-Specific Prompts
// =============================================================================

export const CANVAS_SYSTEM_PROMPTS = {
  general: `أنت مساعد ذكي متخصص في التصميم والرسم على الكانفاس.
يمكنك:
- اقتراح تصاميم وأفكار إبداعية
- المساعدة في تنظيم العناصر
- تحليل التخطيط وتحسينه
- إنشاء أشكال وعناصر جديدة

تحدث بالعربية وكن مختصراً ومفيداً.`,

  layoutOptimization: `أنت خبير في تحسين تخطيط التصميمات.
مهمتك هي تحليل العناصر الموجودة واقتراح أفضل ترتيب لها.
قدم اقتراحات محددة مع الإحداثيات الدقيقة.`,

  shapeGeneration: `أنت منشئ أشكال ذكي.
عندما يصف المستخدم شكلاً، أنشئ الشكل المناسب مع:
- النوع (rectangle, circle, triangle, etc.)
- الأبعاد
- الألوان
- الموضع

قدم النتيجة بتنسيق JSON.`,

  contentAnalysis: `أنت محلل محتوى بصري.
قم بتحليل العناصر على الكانفاس وقدم:
- ملخص للمحتوى
- اقتراحات للتحسين
- ملاحظات عن التناسق البصري`,

  collaboration: `أنت مساعد تعاون.
ساعد المستخدمين في:
- تنظيم العمل الجماعي
- حل التعارضات
- تحسين سير العمل`,
};

// =============================================================================
// 🔧 Utility Functions
// =============================================================================

/**
 * إنشاء سياق من عناصر الكانفاس
 */
export function createCanvasContext(elements: CanvasElement[]): string {
  const summary = elements.map((el) => {
    const baseInfo = `- ${el.type} (id: ${el.id}) at (${el.x}, ${el.y}), size: ${el.width}x${el.height}`;
    switch (el.type) {
      case "text":
        return `${baseInfo}, content: "${(el as any).content?.substring(0, 50)}..."`;
      case "shape":
        return `${baseInfo}, shape: ${(el as any).shapeType}`;
      case "sticky":
        return `${baseInfo}, color: ${(el as any).color}`;
      default:
        return baseInfo;
    }
  });

  return `Canvas Elements (${elements.length}):\n${summary.join("\n")}`;
}

/**
 * تحليل استجابة الأشكال
 */
export function parseShapeResponse(response: string): Partial<CanvasElement>[] {
  try {
    // Try to extract JSON from response
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    const objectMatch = response.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      return [JSON.parse(objectMatch[0])];
    }

    return [];
  } catch {
    console.warn("Failed to parse shape response:", response);
    return [];
  }
}

// =============================================================================
// 📤 Export
// =============================================================================

export const OpenAI = {
  OpenAIClient,
  CANVAS_SYSTEM_PROMPTS,
  createCanvasContext,
  parseShapeResponse,
};
