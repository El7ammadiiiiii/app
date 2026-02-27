# 🎨 دليل توليد الصور - Gemini 3 Pro Image (4K)

## نظرة عامة | Overview

تم دمج نظام توليد الصور بالكامل باستخدام **Google Gemini 3 Pro Image** مع دعم دقة 4K وجميع المميزات المتقدمة من Google.

Complete image generation system integrated using **Google Gemini 3 Pro Image** with 4K resolution and all advanced features.

---

## 🚀 كيفية الاستخدام | How to Use

### الوصول إلى الأداة | Access the Tool

1. **افتح واجهة المحادثة** | Open chat interface
2. **انقر على زر الأدوات** (أيقونة Sliders) | Click the Tools button
3. **اختر "Generate Image"** من القائمة | Select "Generate Image"

---

## 🎨 أنواع التوليد | Generation Types

### 1️⃣ نص إلى صورة | Text to Image
إنشاء صور من النص مباشرة

**الاستخدام:**
- أدخل وصف نصي للصورة
- اختر الإعدادات (دقة، نسبة، نمط)
- اضغط "توليد الصورة"

**مثال:**
```
A photorealistic close-up portrait of a Japanese artisan 
carefully examining a handmade ceramic bowl in their studio, 
warm afternoon light streaming through the window
```

### 2️⃣ تعديل الصورة | Image Editing
تعديل صورة موجودة باستخدام النص

**الاستخدام:**
- ارفع الصورة الأصلية
- أدخل وصف التعديل المطلوب
- اختر الإعدادات

**أمثلة:**
```
- "إضافة قبعة ساحر على القط"
- "تغيير لون الأريكة إلى أزرق"
- "إزالة الخلفية واجعلها شفافة"
- "إضافة نظارات شمسية على الشخص"
```

### 3️⃣ نقل الأسلوب | Style Transfer
نقل أسلوب فني من صور مرجعية

**الاستخدام:**
- ارفع صورة أو أكثر كمرجع للأسلوب
- أدخل وصف المحتوى المطلوب
- الأداة تطبق الأسلوب على المحتوى الجديد

**مثال:**
```
Reference: صور أنمي يابانية
Prompt: "قط صغير يلعب بالكرة في حديقة"
Result: قط بأسلوب أنمي
```

### 4️⃣ دمج الصور | Image Composition
دمج عدة صور في صورة واحدة

**الاستخدام:**
- ارفع صورتين أو أكثر
- أدخل وصف كيفية الدمج
- احصل على صورة مركبة

**أمثلة:**
```
- "ضع الشخص من الصورة 1 في البيئة من الصورة 2"
- "ادمج الفستان من الصورة مع المانيكان"
- "أضف العنصر من الصورة 1 إلى الصورة 2"
```

---

## ⚙️ الإعدادات المتقدمة | Advanced Settings

### الدقة | Resolution

| الدقة | الأبعاد | الاستخدام الأمثل |
|------|---------|------------------|
| **4K** | 4096×4096 | أعلى جودة، للطباعة والعرض الكبير |
| **2K** | 2048×2048 | جودة عالية، للويب والشاشات |
| **1080p** | 1920×1080 | جودة قياسية، سريع التوليد |
| **720p** | 1280×720 | جودة منخفضة، أسرع |

### نسبة العرض | Aspect Ratio

| النسبة | الاستخدام |
|--------|-----------|
| **1:1** | Instagram، صور ملفات شخصية |
| **16:9** | YouTube، TV، عروض تقديمية |
| **9:16** | Stories، TikTok، Reels |
| **3:2** | صور فوتوغرافية تقليدية |
| **2:3** | صور بورتريه |
| **4:3** | شاشات قديمة، عروض |
| **3:4** | بورتريه عمودي |

### أنماط التوليد | Style Modes

#### 1. **Realistic** - واقعي
- صور فوتوغرافية واقعية
- إضاءة طبيعية
- تفاصيل دقيقة

#### 2. **Illustration** - رسوم
- رسومات توضيحية
- ألوان زاهية
- خطوط واضحة

#### 3. **Sticker** - ملصقات
- تصميم بسيط
- خلفية شفافة
- أشكال كرتونية

#### 4. **Minimalist** - بسيط
- تصميم نظيف
- ألوان محدودة
- مساحات فارغة

#### 5. **Commercial** - تجاري
- صور منتجات
- إضاءة استوديو
- جودة احترافية

#### 6. **Comic** - كوميك
- أسلوب كتب مصورة
- خطوط سوداء قوية
- ألوان ساطعة

#### 7. **Artistic** - فني
- لمسة فنية
- ألوان غير تقليدية
- أسلوب إبداعي

---

## 💡 نصائح لكتابة Prompts فعالة

### البنية الأساسية
```
[نوع الصورة] of [الموضوع], [الفعل/الحالة], [البيئة/الخلفية], [الإضاءة], [المزاج], [تفاصيل إضافية]
```

### أمثلة مفصلة

#### ✅ Prompt جيد
```
A high-resolution, studio-lit product photograph of a 
sleek black coffee mug on a minimalist concrete surface. 
The lighting is a three-point softbox setup creating 
gentle highlights and shadows. Shot from a low angle 
to emphasize the mug's elegant form. Ultra-realistic, 
sharp focus, 4K quality.
```

#### ❌ Prompt ضعيف
```
coffee mug
```

### العناصر المهمة

1. **نوع الصورة** | Image Type
   - "A photorealistic portrait"
   - "An illustration"
   - "A minimalist composition"

2. **الموضوع الرئيسي** | Main Subject
   - "an elderly craftsman"
   - "a sports car"
   - "a bouquet of flowers"

3. **الفعل/الحالة** | Action/State
   - "carefully examining"
   - "driving through"
   - "sitting on a table"

4. **البيئة** | Environment
   - "in a traditional workshop"
   - "a winding mountain road"
   - "with soft morning light"

5. **الإضاءة** | Lighting
   - "warm golden hour sunlight"
   - "studio lighting"
   - "dramatic backlighting"

6. **التفاصيل الفنية** | Technical Details
   - "shallow depth of field"
   - "4K resolution"
   - "cinematic composition"

---

## 🎯 أمثلة لحالات استخدام شائعة

### 1. **مشاهد واقعية** | Realistic Scenes

```
A photorealistic shot of an old man with weathered hands 
holding a traditional Japanese tea cup in a minimalist 
tearoom. Soft window light from the left creates gentle 
shadows. The background is slightly out of focus, 
emphasizing the subject. 4K, professional photography.
```

### 2. **رسومات توضيحية** | Illustrations

```
A colorful, whimsical illustration of a red panda 
wearing an explorer's hat, holding a bamboo stick, 
standing in a vibrant forest. Bright colors, cute 
character design, sticker style.
```

### 3. **نص دقيق** | Text in Images

```
Create a circular logo with bold black text "THE DAILY 
GRIND" curved along the top, a coffee bean and gear 
icon in the center, clean lines, minimalist design.
```

### 4. **تصوير منتجات** | Product Photography

```
High-resolution product photo of a black ceramic mug 
with steam rising from hot coffee inside, placed on 
a light gray concrete platform. Three-point studio 
lighting, shallow depth of field focusing on the mug, 
professional commercial photography style.
```

### 5. **تصميم بسيط** | Minimalist Design

```
A minimalist composition featuring a single red maple 
leaf positioned in the bottom-right corner of an 
empty beige canvas, creating significant negative 
space. Soft, diffused lighting. Clean aesthetic.
```

### 6. **كوميك** | Comic Style

```
Make a 3 panel comic strip showing a person's journey 
at work. Panel 1: arriving excited, Panel 2: stressed 
at desk with coffee, Panel 3: leaving exhausted. 
Black and white, bold lines, expressive faces.
```

### 7. **استخدام Google Search** | With Google Search

```
Using the provided image of [subject], please [add/remove/modify] 
[element] to/from the scene. Ensure the change is [description 
of how change should integrate]. The lighting is [lighting setup], 
and the camera angle is [angle type] to showcase [specific feature].
```

---

## 🔧 ميزات متقدمة | Advanced Features

### ✨ Thinking Process
- عرض عملية تفكير النموذج
- فهم كيفية تفسير Prompt
- تحسين Prompts المستقبلية

### 📊 Negative Prompts
استبعاد عناصر غير مرغوبة:
```
Negative: "blurry, low quality, distorted, ugly, text, watermark"
```

### 🔢 Multi-Image Generation
- توليد 1-4 صور في آن واحد
- مقارنة الأشكال المختلفة
- اختيار الأفضل

### 💾 التخزين والتاريخ
- حفظ تلقائي للصور المولدة
- عرض تفاصيل كل صورة
- تنزيل بجودة عالية

---

## 📝 نصائح للحصول على أفضل النتائج

### ✅ افعل | DO
- **كن محدداً**: أضف تفاصيل كثيرة عن المشهد
- **حدد الإضاءة**: اذكر نوع الإضاءة والجو
- **اذكر الزاوية**: "من الأعلى"، "من الجانب"، "عن قرب"
- **حدد الجودة**: "4K"، "ultra realistic"، "professional"
- **استخدم المصطلحات الفنية**: "bokeh"، "depth of field"، "cinematic"

### ❌ لا تفعل | DON'T
- **لا تكن غامضاً**: "صورة جميلة" غير كافٍ
- **لا تطلب المستحيل**: احترم قوانين الفيزياء
- **لا تنسخ Prompts بدون تعديل**: خصص حسب احتياجك
- **لا تتجاهل النسبة**: اختر النسبة المناسبة للاستخدام

---

## 🌟 أمثلة متقدمة

### تعديل الصور | Image Editing Examples

#### إضافة عناصر
```
Using the provided image, add a wizard hat on the cat. 
Make sure it fits naturally and matches the lighting.
```

#### تغيير الألوان
```
Change the color of the sofa in the image from brown 
to navy blue, keeping everything else exactly the same.
```

#### نقل الأسلوب
```
Transform this photo into the artistic style of Van Gogh's 
Starry Night, with swirling brush strokes and vibrant colors.
```

#### دمج متقدم
```
Place the person from image 1 into the environment from 
image 2. Match the lighting and shadows naturally. The 
final scene should show them [doing action].
```

---

## 🔐 معلومات API

```typescript
API Key: AIzaSyBXAqw4wkcEabRLjmQ5QiZtt-z59GVkOtw
API Base: https://generativelanguage.googleapis.com/v1beta
Model: gemini-3-pro-image-preview
```

⚠️ **ملاحظة أمنية**: في الإنتاج، انقل المفتاح إلى `.env.local`

---

## 🐛 استكشاف الأخطاء | Troubleshooting

### مشكلة: الصورة غير واضحة
**الحل:**
- استخدم دقة 4K
- أضف "sharp focus, detailed, high quality" للPrompt
- تجنب Prompts متناقضة

### مشكلة: النتيجة لا تطابق Prompt
**الحل:**
- كن أكثر تحديداً في الوصف
- استخدم Negative Prompt لاستبعاد ما لا تريد
- جرب أوضاع مختلفة (realistic, illustration, etc.)

### مشكلة: فشل التحميل
**الحل:**
- تأكد من حجم الصورة < 5MB
- استخدم صيغ مدعومة: JPG, PNG
- تحقق من اتصال الإنترنت

### مشكلة: بطء التوليد
**الحل:**
- استخدم دقة أقل (2K أو 1080p)
- قلل عدد الصور المولدة
- تجنب Prompts معقدة جداً

---

## 📊 المقارنات

### Gemini 3 Pro Image vs Other Models

| الميزة | Gemini 3 Pro | DALL-E 3 | Midjourney |
|--------|-------------|----------|------------|
| الدقة القصوى | 4K ✅ | 1024×1024 | 2048×2048 |
| تعديل الصور | ✅ | ✅ | ❌ |
| نص في الصور | ✅ | ⚠️ | ⚠️ |
| دمج الصور | ✅ | ❌ | ❌ |
| نقل الأسلوب | ✅ | ❌ | ✅ |
| Thinking Process | ✅ | ❌ | ❌ |
| Google Search Integration | ✅ | ❌ | ❌ |

---

## 🎓 موارد إضافية

### وثائق Google
- [Gemini API Documentation](https://ai.google.dev/gemini-api/docs/image-generation)
- [Image Generation Guide](https://ai.google.dev/gemini-api/docs/image-generation?hl=ar)
- [Best Practices](https://ai.google.dev/)

### نصائح Prompt Engineering
- استخدم أفعال واضحة ومحددة
- اذكر التفاصيل الصغيرة
- حدد المزاج والإحساس
- أضف سياق للمشهد

---

## 🔄 تحديثات مستقبلية

- [ ] تحرير الصور بالمحادثة المتعددة الأدوار
- [ ] إنشاء شخصيات 360 درجة
- [ ] تحسين دقة الصور القديمة
- [ ] تصدير بصيغ متعددة (SVG, WebP)
- [ ] قوالب Prompts جاهزة
- [ ] مشاركة مباشرة على منصات التواصل

---

## 📞 الدعم | Support

للمساعدة:
1. راجع هذا الدليل أولاً
2. تحقق من رسائل الخطأ
3. جرب Prompts أبسط
4. استخدم دقة أقل للاختبار

---

## 🎬 البدء السريع | Quick Start

```bash
# 1. ابدأ التطبيق
npm run dev

# 2. افتح المتصفح
http://localhost:3000

# 3. اضغط Tools > Generate Image

# 4. جرب هذا Prompt:
"A photorealistic portrait of a cat wearing sunglasses, 
sitting in a cafe, cinematic lighting, 4K"

# 5. اختر:
- Resolution: 4K
- Aspect Ratio: 1:1
- Mode: Realistic

# 6. اضغط "توليد الصورة"
```

---

**تاريخ الإنشاء**: 2 فبراير 2026  
**الإصدار**: 1.0.0  
**الحالة**: ✅ جاهز للاستخدام  
**API Model**: gemini-3-pro-image-preview
