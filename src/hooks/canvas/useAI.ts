// =============================================================================
// 📦 CCCWAYS Canvas - useAI Hook
// Hook للتكامل مع الذكاء الاصطناعي
// =============================================================================

import { useCallback, useMemo, useRef, useState } from "react";
import { useCanvasStore } from "@/stores/canvasStore";
import { useUIStore } from "@/stores/uiStore";
import type { CanvasElement, Point } from "@/types/canvas";
import {
  CanvasAIService,
  getContextualSuggestions,
  type AIAssistantResponse,
  type LayoutSuggestion,
  type ContentAnalysis,
  type DesignSuggestion,
  type SmartSuggestion,
} from "@/lib/ai/canvas-ai";

// =============================================================================
// ⚙️ Types
// =============================================================================

export interface AIState {
  isProcessing: boolean;
  isStreaming: boolean;
  lastResponse: AIAssistantResponse | null;
  suggestions: SmartSuggestion[];
  error: Error | null;
}

export interface AIConfig {
  apiKey: string;
  enabled?: boolean;
  autoSuggestions?: boolean;
}

// Default viewport size for calculations
const DEFAULT_VIEWPORT_SIZE = { width: 1920, height: 1080 };

// =============================================================================
// 🎨 Hook
// =============================================================================

export function useAI(config?: AIConfig) {
  // Stores
  const elementsRecord = useCanvasStore((state) => state.elements);
  const elements = useMemo(() => Object.values(elementsRecord), [elementsRecord]);
  const selectedIds = useCanvasStore((state) => state.selectedIds);
  const activeTool = useCanvasStore((state) => state.activeTool);
  const viewport = useCanvasStore((state) => state.viewport);
  const addElement = useCanvasStore((state) => state.addElement);
  const updateElement = useCanvasStore((state) => state.updateElement);

  const addToast = useUIStore((state) => state.addToast);

  // State
  const [isProcessing, setIsProcessing] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [lastResponse, setLastResponse] = useState<AIAssistantResponse | null>(null);
  const [suggestions, setSuggestions] = useState<SmartSuggestion[]>([]);
  const [error, setError] = useState<Error | null>(null);

  // AI Service ref
  const aiServiceRef = useRef<CanvasAIService | null>(null);

  // Initialize AI service
  const getAIService = useCallback((): CanvasAIService | null => {
    if (!config?.apiKey) {
      setError(new Error("API Key required"));
      return null;
    }

    if (!aiServiceRef.current) {
      aiServiceRef.current = new CanvasAIService(config.apiKey);
    }

    return aiServiceRef.current;
  }, [config?.apiKey]);

  // =============================================================================
  // 💬 Chat
  // =============================================================================

  /**
   * محادثة مع المساعد
   */
  const chat = useCallback(
    async (message: string): Promise<AIAssistantResponse | null> => {
      const service = getAIService();
      if (!service) return null;

      setIsProcessing(true);
      setError(null);

      try {
        const response = await service.chat(message, elements);
        setLastResponse(response);

        // Handle actions from response
        if (response.actions) {
          handleAIActions(response.actions);
        }

        return response;
      } catch (err) {
        const error = err as Error;
        setError(error);
        addToast({
          title: "خطأ في AI",
          message: error.message,
          type: "error",
        });
        return null;
      } finally {
        setIsProcessing(false);
      }
    },
    [getAIService, elements, addToast]
  );

  /**
   * محادثة مع التدفق
   */
  const chatStream = useCallback(
    async function* (message: string): AsyncGenerator<string, void, unknown> {
      const service = getAIService();
      if (!service) return;

      setIsStreaming(true);
      setError(null);

      try {
        let fullResponse = "";
        for await (const chunk of service.chatStream(message, elements)) {
          fullResponse += chunk;
          yield chunk;
        }

        setLastResponse({ message: fullResponse });
      } catch (err) {
        const error = err as Error;
        setError(error);
        addToast({
          title: "خطأ في AI",
          message: error.message,
          type: "error",
        });
      } finally {
        setIsStreaming(false);
      }
    },
    [getAIService, elements, addToast]
  );

  // =============================================================================
  // 🎨 Generation
  // =============================================================================

  /**
   * توليد أشكال من وصف نصي
   */
  const generateShapes = useCallback(
    async (description: string): Promise<CanvasElement[]> => {
      const service = getAIService();
      if (!service) return [];

      setIsProcessing(true);
      setError(null);

      try {
        const viewportCenter: Point = {
          x: viewport.x + DEFAULT_VIEWPORT_SIZE.width / viewport.zoom / 2,
          y: viewport.y + DEFAULT_VIEWPORT_SIZE.height / viewport.zoom / 2,
        };

        const shapes = await service.generateShapes(
          description,
          viewportCenter,
          elements
        );

        // Add generated shapes to canvas
        shapes.forEach((shape) => {
          addElement(shape);
        });

        addToast({
          title: "تم التوليد",
          message: `تم إنشاء ${shapes.length} عنصر`,
          type: "success",
        });

        return shapes;
      } catch (err) {
        const error = err as Error;
        setError(error);
        addToast({
          title: "خطأ في التوليد",
          message: error.message,
          type: "error",
        });
        return [];
      } finally {
        setIsProcessing(false);
      }
    },
    [getAIService, viewport, elements, addElement, addToast]
  );

  /**
   * توليد صورة
   */
  const generateImage = useCallback(
    async (prompt: string): Promise<string | null> => {
      const service = getAIService();
      if (!service) return null;

      setIsProcessing(true);
      setError(null);

      try {
        const imageUrl = await service.generateImage(prompt);

        addToast({
          title: "تم توليد الصورة",
          message: "يمكنك الآن إضافتها للكانفاس",
          type: "success",
        });

        return imageUrl;
      } catch (err) {
        const error = err as Error;
        setError(error);
        addToast({
          title: "خطأ في توليد الصورة",
          message: error.message,
          type: "error",
        });
        return null;
      } finally {
        setIsProcessing(false);
      }
    },
    [getAIService, addToast]
  );

  // =============================================================================
  // 📊 Analysis
  // =============================================================================

  /**
   * تحليل المحتوى
   */
  const analyzeContent = useCallback(async (): Promise<ContentAnalysis | null> => {
    const service = getAIService();
    if (!service) return null;

    setIsProcessing(true);
    setError(null);

    try {
      const analysis = await service.analyzeContent(elements);
      return analysis;
    } catch (err) {
      const error = err as Error;
      setError(error);
      addToast({
        title: "خطأ في التحليل",
        message: error.message,
        type: "error",
      });
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, [getAIService, elements, addToast]);

  /**
   * اقتراحات تحسين التخطيط
   */
  const suggestLayout = useCallback(async (): Promise<LayoutSuggestion[]> => {
    const service = getAIService();
    if (!service) return [];

    setIsProcessing(true);
    setError(null);

    try {
      const suggestions = await service.suggestLayoutOptimization(elements, {
        width: DEFAULT_VIEWPORT_SIZE.width,
        height: DEFAULT_VIEWPORT_SIZE.height,
      });

      return suggestions;
    } catch (err) {
      const error = err as Error;
      setError(error);
      addToast({
        title: "خطأ في الاقتراحات",
        message: error.message,
        type: "error",
      });
      return [];
    } finally {
      setIsProcessing(false);
    }
  }, [getAIService, elements, viewport, addToast]);

  /**
   * تطبيق اقتراحات التخطيط
   */
  const applyLayoutSuggestions = useCallback(
    (suggestions: LayoutSuggestion[]) => {
      const updates = suggestions.map((s) => ({
        id: s.elementId,
        updates: {
          x: s.newPosition.x,
          y: s.newPosition.y,
          ...(s.newSize || {}),
        },
      }));

      // Update elements one by one since batchUpdateElements doesn't exist
      updates.forEach(({ id, updates: elementUpdates }) => {
        updateElement(id, elementUpdates);
      });

      addToast({
        title: "تم التطبيق",
        message: `تم تطبيق ${suggestions.length} اقتراح`,
        type: "success",
      });
    },
    [updateElement, addToast]
  );

  /**
   * اقتراحات التصميم
   */
  const suggestDesign = useCallback(async (): Promise<DesignSuggestion[]> => {
    const service = getAIService();
    if (!service) return [];

    setIsProcessing(true);
    setError(null);

    try {
      const suggestions = await service.getDesignSuggestions(elements);
      return suggestions;
    } catch (err) {
      const error = err as Error;
      setError(error);
      return [];
    } finally {
      setIsProcessing(false);
    }
  }, [getAIService, elements]);

  // =============================================================================
  // 🎤 Voice
  // =============================================================================

  /**
   * معالجة الأمر الصوتي
   */
  const processVoiceCommand = useCallback(
    async (audioBlob: Blob): Promise<AIAssistantResponse | null> => {
      const service = getAIService();
      if (!service) return null;

      setIsProcessing(true);
      setError(null);

      try {
        const response = await service.processVoiceCommand(audioBlob, elements);
        setLastResponse(response);

        if (response.actions) {
          handleAIActions(response.actions);
        }

        return response;
      } catch (err) {
        const error = err as Error;
        setError(error);
        addToast({
          title: "خطأ في الصوت",
          message: error.message,
          type: "error",
        });
        return null;
      } finally {
        setIsProcessing(false);
      }
    },
    [getAIService, elements, addToast]
  );

  // =============================================================================
  // 💡 Smart Suggestions
  // =============================================================================

  /**
   * تحديث الاقتراحات الذكية
   */
  const updateSuggestions = useCallback(() => {
    if (!config?.autoSuggestions) return;

    const newSuggestions = getContextualSuggestions(
      elements,
      selectedIds,
      activeTool
    );
    setSuggestions(newSuggestions);
  }, [config?.autoSuggestions, elements, selectedIds, activeTool]);

  /**
   * الإكمال التلقائي للنص
   */
  const getAutoComplete = useCallback(
    async (partialText: string): Promise<string[]> => {
      const service = getAIService();
      if (!service) return [];

      try {
        return await service.getAutoComplete(partialText);
      } catch {
        return [];
      }
    },
    [getAIService]
  );

  // =============================================================================
  // 🔧 Helpers
  // =============================================================================

  /**
   * معالجة إجراءات AI
   */
  const handleAIActions = useCallback(
    (actions: NonNullable<AIAssistantResponse["actions"]>) => {
      actions.forEach((action) => {
        switch (action.type) {
          case "create":
            if (action.data) {
              addElement(action.data);
            }
            break;
          case "update":
            if (action.target && action.data) {
              updateElement(action.target, action.data);
            }
            break;
          case "delete":
            if (action.target) {
              // deleteElement would be called here
            }
            break;
          // Other action types...
        }
      });
    },
    [addElement, updateElement]
  );

  /**
   * إعادة تعيين المحادثة
   */
  const resetConversation = useCallback(() => {
    if (aiServiceRef.current) {
      aiServiceRef.current.resetConversation();
    }
    setLastResponse(null);
  }, []);

  // =============================================================================
  // 📤 Return
  // =============================================================================

  return {
    // State
    isProcessing,
    isStreaming,
    lastResponse,
    suggestions,
    error,
    isEnabled: !!config?.apiKey,

    // Chat
    chat,
    chatStream,
    resetConversation,

    // Generation
    generateShapes,
    generateImage,

    // Analysis
    analyzeContent,
    suggestLayout,
    applyLayoutSuggestions,
    suggestDesign,

    // Voice
    processVoiceCommand,

    // Suggestions
    updateSuggestions,
    getAutoComplete,
  };
}
