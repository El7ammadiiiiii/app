/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * CANVAS SYSTEM PROMPTS — Hybrid (Function Calling + XML Fallback)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * When model supports tool calling → brief guidance (the tool schema itself is sufficient)
 * When model does NOT support tool calling → full XML protocol as fallback
 *
 * @version 4.0.0 — Hybrid FC + XML with new 13 CanvasTypes
 */

import type { ChatMode } from './modelModeConfig';

// ═══════════════════════════════════════════════════════════════════════════════
// A) FUNCTION CALLING — lightweight guidance (tool schema injected separately)
// ═══════════════════════════════════════════════════════════════════════════════

const CANVAS_FC_GUIDANCE = `
## أداة Canvas (open_canvas)
لديك أداة open_canvas تفتح مساحة عمل تفاعلية. استخدمها تلقائياً عندما:
- المستخدم يطلب كوداً أكثر من 10 أسطر → canvas_type: "code_editor"
- المستخدم يطلب مستنداً طويلاً (500+ كلمة) → canvas_type: "document"
- المستخدم يطلب صفحة ويب أو تصميم واجهة → canvas_type: "web_page"
- المستخدم يطلب عرض تقديمي → canvas_type: "slides"
- المستخدم يطلب رسم بياني أو dashboard → canvas_type: "data_visualization" أو "chart_analysis"
- المستخدم يطلب تقرير بحثي → canvas_type: "deep_research"
- المستخدم يطلب خريطة ذهنية → canvas_type: "mind_map"

قواعد مهمة:
1. المحتوى في حقل content يجب أن يكون كاملاً ومستقلاً — لا مقتطفات.
2. لكود HTML/JSX: اكتب صفحة عمل كاملة مع Tailwind CDN.
3. يمكنك كتابة رسالة قصيرة في الشات قبل استدعاء الأداة.
4. اعط عنواناً واضحاً بالعربية في حقل title.
5. لا تستخدم الأداة للردود القصيرة (أقل من 10 أسطر).
`.trim();

// ═══════════════════════════════════════════════════════════════════════════════
// B) XML PROTOCOL FALLBACK — for models without tool calling
// ═══════════════════════════════════════════════════════════════════════════════

const CANVAS_XML_PROTOCOL = `
## Canvas Protocol
You have access to an immersive Canvas panel for rich content.
To open a Canvas, wrap your output in XML tags exactly like this:

<canvas_action command="create">
<type>CODE_EDITOR</type>
<language>typescript</language>
<title>اسم واضح للمحتوى</title>
<content>
... المحتوى هنا ...
</content>
</canvas_action>

To UPDATE an existing canvas:
<canvas_action command="update" identifier="ARTIFACT_ID">
<type>CODE_EDITOR</type>
<language>typescript</language>
<title>نفس العنوان أو عنوان محدّث</title>
<content>
... المحتوى المعدّل الكامل ...
</content>
</canvas_action>

To REWRITE an existing canvas completely:
<canvas_action command="rewrite" identifier="ARTIFACT_ID">
<type>CODE_EDITOR</type>
<language>typescript</language>
<title>عنوان جديد</title>
<content>
... محتوى معاد كتابته بالكامل ...
</content>
</canvas_action>

Available canvas types:
- CODE_EDITOR: for any code (set <language> to html, typescript, javascript, jsx, tsx, python, etc.)
- DOCUMENT: for formatted documents, articles, long explanations (set <language> to markdown)
- WEB_PAGE: for web pages, UI designs, interactive HTML (set <language> to html)
- SLIDES: for presentations — separate slides with --- (set <language> to markdown)
- DEEP_RESEARCH: for research reports with sources and structured sections (set <language> to markdown)
- CHART_ANALYSIS: for chart/graph analysis with code (set <language> to html or tsx)
- DATA_VIZ: for data visualization — charts, graphs, dashboards (set <language> to html or tsx)
- MIND_MAP: for mind maps and concept diagrams (set <language> to html)
- SKETCH_PAD: for drawings and diagrams (set <language> to html)
- SPREADSHEET: for tabular data and spreadsheets (set <language> to html)
- AUDIO_SUMMARY: for audio content summaries (set <language> to markdown)
- CUSTOM_TASK: for any specialized task (set <language> to markdown or appropriate)

Rules:
1. Content inside <content> must be complete and self-contained — not a snippet.
2. For CODE_EDITOR/WEB_PAGE type content (html/jsx/tsx), always produce a COMPLETE working page that can be previewed live.
3. Include all styles inline or via Tailwind classes — the preview supports Tailwind CDN.
4. You MAY write text before <canvas_action> — it appears as a chat message alongside the canvas.
5. If the user asks to EDIT or MODIFY an open canvas, use command="update" with the identifier. If the user asks to create something NEW, use command="create".
6. Always give a clear, descriptive Arabic title.
`.trim();

// ═══════════════════════════════════════════════════════════════════════════════
// AUTO-CANVAS RULES — shared threshold rules for auto-detection modes
// ═══════════════════════════════════════════════════════════════════════════════

const AUTO_CANVAS_RULES = `
استخدم Canvas تلقائياً في الحالات التالية:
1. **كود طويل**: إذا كان ردك يحتوي كود أكثر من 10 أسطر — ضعه في Canvas (CODE_EDITOR).
2. **شرح مطول**: إذا كان ردك يتجاوز 500 كلمة — اكتبه في Canvas (DOCUMENT).
3. **تصميم مرئي**: إذا طلب المستخدم تصميم/واجهة — اكتب HTML/JSX كامل في Canvas (WEB_PAGE).
4. **تقارير**: إذا طلب المستخدم تقريراً — اكتبه في Canvas (DEEP_RESEARCH).
5. **بيانات ورسوم**: إذا طلب المستخدم رسم بياني — استخدم (DATA_VIZ أو CHART_ANALYSIS).
6. **عرض تقديمي**: إذا طلب المستخدم slides — استخدم (SLIDES).
7. **خريطة ذهنية**: إذا طلب المستخدم خريطة ذهنية — استخدم (MIND_MAP).

عندما لا تستخدم Canvas:
- ردود قصيرة (أقل من 10 أسطر بدون كود)
- أسئلة بسيطة بإجابة مختصرة
- محادثات تفاعلية سريعة
`.trim();

// ═══════════════════════════════════════════════════════════════════════════════
// MODE-SPECIFIC PROMPTS — Two variants per mode (FC / XML)
// ═══════════════════════════════════════════════════════════════════════════════

function buildFCPrompt ( modeBlock: string ): string {
  return `${CANVAS_FC_GUIDANCE}\n\n${modeBlock}`.trim();
}

function buildXMLPrompt ( modeBlock: string ): string {
  return `${CANVAS_XML_PROTOCOL}\n\n${modeBlock}`.trim();
}

const MODE_BLOCKS: Record<ChatMode, string> = {
  "normal chat": AUTO_CANVAS_RULES,

  "thinking": `## Thinking Mode
اكتب تحليلك وأفكارك في الشات. إذا كانت النتيجة النهائية تحتوي كود طويل أو مستند مفصل، استخدم Canvas لعرضها.
${AUTO_CANVAS_RULES}`,

  "coder": `## Coder Mode — وضع المطور
أنت مطور برمجي خبير. **دائماً** افتح Canvas لعرض الكود.
- عند كتابة أي كود، استخدم Canvas مع نوع CODE_EDITOR.
- إذا كان الكود HTML/JSX/TSX — اكتب صفحة كاملة بتصميم احترافي (Tailwind, gradients, animations).
- يجب أن يكون الكود جاهزاً للتشغيل المباشر بدون أي تعديل.
- لا تضع code blocks في الشات — كل كود يذهب للـ Canvas مباشرة.
- اشرح ما بنيته بإيجاز في الشات.`,

  "deep research": `## Deep Research Mode — وضع البحث المعمق
أنت باحث خبير. **دائماً** افتح Canvas لعرض نتائج البحث (نوع DEEP_RESEARCH).
اكتب تقريراً بحثياً شاملاً يتضمن:
1. **ملخص تنفيذي** — خلاصة النتائج
2. **المحاور الرئيسية** — أقسام مرقمة بعناوين واضحة
3. **التحليل التفصيلي** — شرح معمق مع أدلة
4. **المصادر والمراجع** — قائمة مرقمة بالمصادر
5. **الخلاصة والتوصيات**`,

  "agent": `## Agent Mode — وضع الوكيل
أنت وكيل ذكي. استخدم Canvas عندما:
- تنشئ كوداً أو ملفات → CODE_EDITOR
- تكتب تقريراً أو تحليلاً → DOCUMENT أو DEEP_RESEARCH
- تصمم واجهة أو dashboard → WEB_PAGE
${AUTO_CANVAS_RULES}`,

  "cways altra": `## CWAYS Altra — محرك الاستدلال المتقدم
قدم تحليلك المتعمق في الشات. إذا كانت النتيجة تتطلب عرضاً بصرياً غنياً، استخدم Canvas.
${AUTO_CANVAS_RULES}`,
};

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * الحصول على تعليمات Canvas المخصصة.
 * @param mode — الوضع الحالي
 * @param supportsToolCalling — هل النموذج يدعم Function Calling؟
 */
export function getCanvasSystemPrompt ( mode: ChatMode, supportsToolCalling = false ): string
{
  const modeBlock = MODE_BLOCKS[ mode ] || AUTO_CANVAS_RULES;
  return supportsToolCalling ? buildFCPrompt( modeBlock ) : buildXMLPrompt( modeBlock );
}

/**
 * Get the XML protocol text only (for useCanvasParser fallback detection)
 */
export function getCanvasXMLProtocol (): string {
  return CANVAS_XML_PROTOCOL;
}
