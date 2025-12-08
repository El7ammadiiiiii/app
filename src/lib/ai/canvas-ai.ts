// =============================================================================
// 📦 CCCWAYS Canvas - Canvas AI Service
// خدمة الذكاء الاصطناعي للكانفاس
// =============================================================================

import type { CanvasElement, Point, Bounds, ShapeType } from "@/types/canvas";
import {
  OpenAIClient,
  type ChatMessage,
  CANVAS_SYSTEM_PROMPTS,
  createCanvasContext,
  parseShapeResponse,
} from "./openai-client";
import { v4 as uuidv4 } from "uuid";

// =============================================================================
// ⚙️ Types
// =============================================================================

export interface AIGeneratedShape {
  type: "shape" | "text" | "sticky" | "connector" | "frame";
  shapeType?: ShapeType;
  x: number;
  y: number;
  width: number;
  height: number;
  content?: string;
  color?: string;
  fill?: { color: string; opacity: number };
  stroke?: { color: string; width: number };
}

export interface LayoutSuggestion {
  elementId: string;
  newPosition: Point;
  newSize?: { width: number; height: number };
  reason: string;
}

export interface DesignSuggestion {
  type: "color" | "spacing" | "alignment" | "grouping" | "style";
  description: string;
  affectedElements: string[];
  changes: Record<string, any>;
}

export interface ContentAnalysis {
  summary: string;
  elementCount: number;
  types: Record<string, number>;
  suggestions: string[];
  accessibility: string[];
}

export interface AIAssistantResponse {
  message: string;
  actions?: Array<{
    type: "create" | "update" | "delete" | "move" | "style";
    target?: string;
    data?: any;
  }>;
}

// =============================================================================
// 🤖 Canvas AI Service
// =============================================================================

export class CanvasAIService {
  private client: OpenAIClient;
  private conversationHistory: ChatMessage[] = [];

  constructor(apiKey: string) {
    this.client = new OpenAIClient({ apiKey });
  }

  /**
   * إعادة تعيين المحادثة
   */
  resetConversation(): void {
    this.conversationHistory = [];
  }

  /**
   * محادثة عامة مع المساعد
   */
  async chat(
    userMessage: string,
    elements: CanvasElement[] = []
  ): Promise<AIAssistantResponse> {
    const context = elements.length > 0 ? createCanvasContext(elements) : "";

    const messages: ChatMessage[] = [
      { role: "system", content: CANVAS_SYSTEM_PROMPTS.general },
      ...this.conversationHistory,
      {
        role: "user",
        content: context
          ? `${userMessage}\n\nContext:\n${context}`
          : userMessage,
      },
    ];

    const response = await this.client.createChatCompletion(messages);
    const assistantMessage = response.choices[0]?.message?.content || "";

    // Update history
    this.conversationHistory.push(
      { role: "user", content: userMessage },
      { role: "assistant", content: assistantMessage }
    );

    // Limit history
    if (this.conversationHistory.length > 20) {
      this.conversationHistory = this.conversationHistory.slice(-20);
    }

    return {
      message: assistantMessage,
      actions: this.extractActions(assistantMessage),
    };
  }

  /**
   * محادثة مع التدفق
   */
  async *chatStream(
    userMessage: string,
    elements: CanvasElement[] = []
  ): AsyncGenerator<string, void, unknown> {
    const context = elements.length > 0 ? createCanvasContext(elements) : "";

    const messages: ChatMessage[] = [
      { role: "system", content: CANVAS_SYSTEM_PROMPTS.general },
      ...this.conversationHistory,
      {
        role: "user",
        content: context
          ? `${userMessage}\n\nContext:\n${context}`
          : userMessage,
      },
    ];

    let fullResponse = "";
    for await (const chunk of this.client.streamChatCompletion(messages)) {
      fullResponse += chunk;
      yield chunk;
    }

    // Update history
    this.conversationHistory.push(
      { role: "user", content: userMessage },
      { role: "assistant", content: fullResponse }
    );
  }

  /**
   * توليد أشكال من وصف نصي
   */
  async generateShapes(
    description: string,
    viewportCenter: Point,
    existingElements: CanvasElement[] = []
  ): Promise<CanvasElement[]> {
    const prompt = `Based on this description, generate canvas elements as JSON array:
"${description}"

Current viewport center: (${viewportCenter.x}, ${viewportCenter.y})

Return a JSON array with objects having these properties:
- type: "shape", "text", or "sticky"
- shapeType: for shapes - "rectangle", "circle", "triangle", "diamond", "hexagon", "star"
- x, y: position (near viewport center)
- width, height: dimensions
- content: for text/sticky
- fill: { color, opacity }
- stroke: { color, width }

Only return the JSON array, no explanation.`;

    const messages: ChatMessage[] = [
      { role: "system", content: CANVAS_SYSTEM_PROMPTS.shapeGeneration },
      { role: "user", content: prompt },
    ];

    const response = await this.client.createChatCompletion(messages);
    const content = response.choices[0]?.message?.content || "";
    const parsedShapes = parseShapeResponse(content);

    return parsedShapes.map((shape) => this.createElementFromAI(shape as unknown as Partial<AIGeneratedShape>));
  }

  /**
   * اقتراح تحسين التخطيط
   */
  async suggestLayoutOptimization(
    elements: CanvasElement[],
    canvasSize: { width: number; height: number }
  ): Promise<LayoutSuggestion[]> {
    const context = createCanvasContext(elements);

    const prompt = `Analyze this canvas layout and suggest optimal positions:

${context}

Canvas size: ${canvasSize.width}x${canvasSize.height}

Return a JSON array with suggestions:
[
  {
    "elementId": "id",
    "newPosition": { "x": number, "y": number },
    "newSize": { "width": number, "height": number } (optional),
    "reason": "explanation"
  }
]

Focus on:
- Alignment
- Spacing
- Visual balance
- Grouping related elements

Only return the JSON array.`;

    const messages: ChatMessage[] = [
      { role: "system", content: CANVAS_SYSTEM_PROMPTS.layoutOptimization },
      { role: "user", content: prompt },
    ];

    const response = await this.client.createChatCompletion(messages);
    const content = response.choices[0]?.message?.content || "";

    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch {
      console.warn("Failed to parse layout suggestions");
    }

    return [];
  }

  /**
   * تحليل المحتوى
   */
  async analyzeContent(
    elements: CanvasElement[]
  ): Promise<ContentAnalysis> {
    const context = createCanvasContext(elements);

    const prompt = `Analyze this canvas content and provide insights:

${context}

Return a JSON object with:
{
  "summary": "brief summary in Arabic",
  "elementCount": number,
  "types": { "shape": count, "text": count, etc },
  "suggestions": ["improvement suggestion 1", "..."],
  "accessibility": ["accessibility note 1", "..."]
}

Only return the JSON object.`;

    const messages: ChatMessage[] = [
      { role: "system", content: CANVAS_SYSTEM_PROMPTS.contentAnalysis },
      { role: "user", content: prompt },
    ];

    const response = await this.client.createChatCompletion(messages);
    const content = response.choices[0]?.message?.content || "";

    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch {
      console.warn("Failed to parse content analysis");
    }

    // Fallback analysis
    const types: Record<string, number> = {};
    elements.forEach((el) => {
      types[el.type] = (types[el.type] || 0) + 1;
    });

    return {
      summary: `يحتوي الكانفاس على ${elements.length} عنصر`,
      elementCount: elements.length,
      types,
      suggestions: [],
      accessibility: [],
    };
  }

  /**
   * اقتراحات التصميم
   */
  async getDesignSuggestions(
    elements: CanvasElement[]
  ): Promise<DesignSuggestion[]> {
    const context = createCanvasContext(elements);

    const prompt = `Analyze this design and suggest improvements:

${context}

Return a JSON array with design suggestions:
[
  {
    "type": "color" | "spacing" | "alignment" | "grouping" | "style",
    "description": "description in Arabic",
    "affectedElements": ["id1", "id2"],
    "changes": { property: newValue }
  }
]

Only return the JSON array.`;

    const messages: ChatMessage[] = [
      { role: "system", content: CANVAS_SYSTEM_PROMPTS.contentAnalysis },
      { role: "user", content: prompt },
    ];

    const response = await this.client.createChatCompletion(messages);
    const content = response.choices[0]?.message?.content || "";

    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch {
      console.warn("Failed to parse design suggestions");
    }

    return [];
  }

  /**
   * توليد صورة للكانفاس
   */
  async generateImage(prompt: string): Promise<string> {
    const urls = await this.client.generateImage(prompt, {
      size: "1024x1024",
      quality: "standard",
    });
    return urls[0];
  }

  /**
   * تحويل الكلام إلى أوامر
   */
  async processVoiceCommand(
    audioBlob: Blob,
    elements: CanvasElement[] = []
  ): Promise<AIAssistantResponse> {
    // Transcribe audio
    const text = await this.client.speechToText(audioBlob, {
      language: "ar",
      prompt: "أوامر تصميم الكانفاس",
    });

    // Process as chat command
    return this.chat(text, elements);
  }

  /**
   * الحصول على إكمال تلقائي
   */
  async getAutoComplete(
    partialText: string,
    context: string = ""
  ): Promise<string[]> {
    const prompt = `Complete this text with 3 suggestions:
"${partialText}"

Context: ${context}

Return only a JSON array of 3 completion strings.`;

    const messages: ChatMessage[] = [
      { role: "system", content: "You are an autocomplete assistant. Return only JSON arrays." },
      { role: "user", content: prompt },
    ];

    const response = await this.client.createChatCompletion(messages, {
      max_tokens: 200,
    });
    const content = response.choices[0]?.message?.content || "";

    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch {
      console.warn("Failed to parse autocomplete");
    }

    return [];
  }

  /**
   * إنشاء عنصر من استجابة AI
   */
  private createElementFromAI(shape: Partial<AIGeneratedShape>): CanvasElement {
    const now = Date.now();
    const id = uuidv4();

    const base = {
      id,
      x: shape.x || 0,
      y: shape.y || 0,
      width: shape.width || 100,
      height: shape.height || 100,
      rotation: 0,
      visible: true,
      locked: false,
      layerId: "default",
      zIndex: 0,
      stroke: shape.stroke || { color: "#000000", width: 2, style: "solid", opacity: 1 },
      fill: shape.fill || { color: "#ffffff", opacity: 1 },
      metadata: { aiGenerated: true },
      createdAt: now,
      updatedAt: now,
      createdBy: "ai",
    };

    switch (shape.type) {
      case "shape":
        return {
          ...base,
          type: "shape",
          shapeType: shape.shapeType || "rectangle",
          cornerRadius: 0,
        } as any;

      case "text":
        return {
          ...base,
          type: "text",
          content: shape.content || "نص جديد",
          textOptions: {
            fontFamily: "Cairo",
            fontSize: 16,
            fontWeight: "normal",
            fontStyle: "normal",
            textAlign: "right",
            lineHeight: 1.5,
            letterSpacing: 0,
          },
        } as any;

      case "sticky":
        return {
          ...base,
          type: "sticky",
          content: shape.content || "ملاحظة",
          color: shape.color || "#fef3c7",
          author: "AI",
        } as any;

      default:
        return {
          ...base,
          type: "shape",
          shapeType: "rectangle",
          cornerRadius: 0,
        } as any;
    }
  }

  /**
   * استخراج الإجراءات من الاستجابة
   */
  private extractActions(response: string): AIAssistantResponse["actions"] {
    const actions: AIAssistantResponse["actions"] = [];

    // Look for action keywords in Arabic
    const createPattern = /أنشئ|إنشاء|أضف|إضافة/;
    const deletePattern = /احذف|حذف|أزل|إزالة/;
    const movePattern = /حرك|تحريك|انقل|نقل/;
    const stylePattern = /لون|غير|تغيير|نمط/;

    if (createPattern.test(response)) {
      actions.push({ type: "create" });
    }
    if (deletePattern.test(response)) {
      actions.push({ type: "delete" });
    }
    if (movePattern.test(response)) {
      actions.push({ type: "move" });
    }
    if (stylePattern.test(response)) {
      actions.push({ type: "style" });
    }

    return actions.length > 0 ? actions : undefined;
  }
}

// =============================================================================
// 🎯 Smart Suggestions
// =============================================================================

export interface SmartSuggestion {
  id: string;
  type: "shape" | "action" | "style" | "layout";
  title: string;
  description: string;
  icon: string;
  action: () => void | Promise<void>;
}

/**
 * الحصول على اقتراحات ذكية بناءً على السياق
 */
export function getContextualSuggestions(
  elements: CanvasElement[],
  selectedIds: string[],
  currentTool: string
): SmartSuggestion[] {
  const suggestions: SmartSuggestion[] = [];

  // Suggestions based on selection
  if (selectedIds.length > 1) {
    suggestions.push({
      id: "align-horizontal",
      type: "layout",
      title: "محاذاة أفقية",
      description: "محاذاة العناصر المحددة أفقياً",
      icon: "↔",
      action: () => {},
    });

    suggestions.push({
      id: "align-vertical",
      type: "layout",
      title: "محاذاة عمودية",
      description: "محاذاة العناصر المحددة عمودياً",
      icon: "↕",
      action: () => {},
    });

    suggestions.push({
      id: "group",
      type: "action",
      title: "تجميع",
      description: "تجميع العناصر المحددة",
      icon: "📦",
      action: () => {},
    });
  }

  // Suggestions based on current tool
  if (currentTool === "shape") {
    suggestions.push({
      id: "shape-circle",
      type: "shape",
      title: "دائرة",
      description: "إنشاء دائرة جديدة",
      icon: "⭕",
      action: () => {},
    });

    suggestions.push({
      id: "shape-rectangle",
      type: "shape",
      title: "مستطيل",
      description: "إنشاء مستطيل جديد",
      icon: "⬜",
      action: () => {},
    });
  }

  // Suggestions based on canvas state
  if (elements.length === 0) {
    suggestions.push({
      id: "start-template",
      type: "action",
      title: "ابدأ بقالب",
      description: "اختر قالباً للبدء",
      icon: "📋",
      action: () => {},
    });

    suggestions.push({
      id: "start-ai",
      type: "action",
      title: "استخدم الذكاء الاصطناعي",
      description: "اطلب من AI إنشاء تصميم",
      icon: "🤖",
      action: () => {},
    });
  }

  return suggestions;
}

// =============================================================================
// 📤 Export
// =============================================================================

export const CanvasAI = {
  CanvasAIService,
  getContextualSuggestions,
};
