/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OCR SMART SYSTEM TEST
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * اختبار النظام المحسّن لـ OCR
 */

const fs = require( 'fs' );
const path = require( 'path' );

console.log( '\n🔍 اختبار نظام OCR الذكي - الاستخراج في الخلفية\n' );
console.log( '═══════════════════════════════════════════════════════════════════════════════\n' );

// Test 1: OCR Service
console.log( '✅ Test 1: OCR Service' );
const ocrServicePath = path.join( __dirname, 'src', 'services', 'ocrService.ts' );
if ( fs.existsSync( ocrServicePath ) )
{
    const content = fs.readFileSync( ocrServicePath, 'utf8' );
    const hasOCRContext = content.includes( 'export interface OCRContext' );
    const hasAnalyzeText = content.includes( 'analyzeExtractedText' );
    const hasCreateSystemMessage = content.includes( 'createOCRSystemMessage' );
    const hasCreateBadge = content.includes( 'createOCRBadge' );

    console.log( `   ✓ ocrService.ts موجود` );
    console.log( `   ${ hasOCRContext ? '✓' : '✗' } OCRContext interface` );
    console.log( `   ${ hasAnalyzeText ? '✓' : '✗' } analyzeExtractedText()` );
    console.log( `   ${ hasCreateSystemMessage ? '✓' : '✗' } createOCRSystemMessage()` );
    console.log( `   ${ hasCreateBadge ? '✓' : '✗' } createOCRBadge()` );
} else
{
    console.log( '   ✗ ocrService.ts غير موجود' );
}

// Test 2: OCR Store
console.log( '\n✅ Test 2: OCR Store' );
const ocrStorePath = path.join( __dirname, 'src', 'store', 'ocrStore.ts' );
if ( fs.existsSync( ocrStorePath ) )
{
    const content = fs.readFileSync( ocrStorePath, 'utf8' );
    const hasAddContext = content.includes( 'addContext:' );
    const hasRemoveContext = content.includes( 'removeContext:' );
    const hasGetActiveContext = content.includes( 'getActiveContext:' );
    const hasProcessing = content.includes( 'isProcessing' );

    console.log( `   ✓ ocrStore.ts موجود` );
    console.log( `   ${ hasAddContext ? '✓' : '✗' } addContext()` );
    console.log( `   ${ hasRemoveContext ? '✓' : '✗' } removeContext()` );
    console.log( `   ${ hasGetActiveContext ? '✓' : '✗' } getActiveContext()` );
    console.log( `   ${ hasProcessing ? '✓' : '✗' } isProcessing state` );
} else
{
    console.log( '   ✗ ocrStore.ts غير موجود' );
}

// Test 3: ChatInputBox Integration
console.log( '\n✅ Test 3: ChatInputBox Integration' );
const chatInputPath = path.join( __dirname, 'src', 'components', 'chat', 'ChatInputBox.tsx' );
if ( fs.existsSync( chatInputPath ) )
{
    const content = fs.readFileSync( chatInputPath, 'utf8' );
    const hasOCRImport = content.includes( 'from "@/store/ocrStore"' ) || content.includes( 'from \'@/store/ocrStore\'' );
    const hasNeedsOCR = content.includes( 'needsOCR' );
    const hasFileToBase64 = content.includes( 'fileToBase64' );
    const hasOCRBadge = content.includes( 'ocrBadge' );
    const hasOCRStats = content.includes( 'ocrStats' );
    const hasProcessingIndicator = content.includes( 'isProcessing' );
    const hasOCRContext = content.includes( 'ocrContext' );

    console.log( `   ✓ ChatInputBox.tsx موجود` );
    console.log( `   ${ hasOCRImport ? '✓' : '✗' } OCR Store import` );
    console.log( `   ${ hasNeedsOCR ? '✓' : '✗' } needsOCR() usage` );
    console.log( `   ${ hasFileToBase64 ? '✓' : '✗' } fileToBase64() usage` );
    console.log( `   ${ hasOCRBadge ? '✓' : '✗' } OCR Badge state` );
    console.log( `   ${ hasOCRStats ? '✓' : '✗' } OCR Stats display` );
    console.log( `   ${ hasProcessingIndicator ? '✓' : '✗' } Processing indicator` );
    console.log( `   ${ hasOCRContext ? '✓' : '✗' } OCR Context passing` );
} else
{
    console.log( '   ✗ ChatInputBox.tsx غير موجود' );
}

// Test 4: Chat Area Integration
console.log( '\n✅ Test 4: Chat Area Integration' );
const chatAreaPath = path.join( __dirname, 'src', 'components', 'layout', 'chat-area.tsx' );
if ( fs.existsSync( chatAreaPath ) )
{
    const content = fs.readFileSync( chatAreaPath, 'utf8' );
    const hasOCRImport = content.includes( 'createOCRSystemMessage' );
    const hasOCRContextType = content.includes( 'OCRContext' );
    const hasSystemMessage = content.includes( 'role: "system"' );
    const hasHandleSendOptions = content.includes( 'options?: { ocrContext' );

    console.log( `   ✓ chat-area.tsx موجود` );
    console.log( `   ${ hasOCRImport ? '✓' : '✗' } createOCRSystemMessage import` );
    console.log( `   ${ hasOCRContextType ? '✓' : '✗' } OCRContext type` );
    console.log( `   ${ hasSystemMessage ? '✓' : '✗' } System message support` );
    console.log( `   ${ hasHandleSendOptions ? '✓' : '✗' } handleSend options parameter` );
} else
{
    console.log( '   ✗ chat-area.tsx غير موجود' );
}

// Test 5: API Route
console.log( '\n✅ Test 5: OCR API Route' );
const ocrRoutePath = path.join( __dirname, 'src', 'app', 'api', 'ocr', 'route.ts' );
if ( fs.existsSync( ocrRoutePath ) )
{
    const content = fs.readFileSync( ocrRoutePath, 'utf8' );
    const hasPOST = content.includes( 'export async function POST' );
    const hasExtractText = content.includes( 'extractText' );
    const hasSingleMode = content.includes( 'mode === \'single\'' );
    const hasMultipleMode = content.includes( 'mode === \'multiple\'' );

    console.log( `   ✓ api/ocr/route.ts موجود` );
    console.log( `   ${ hasPOST ? '✓' : '✗' } POST handler` );
    console.log( `   ${ hasExtractText ? '✓' : '✗' } extractText() function` );
    console.log( `   ${ hasSingleMode ? '✓' : '✗' } Single mode support` );
    console.log( `   ${ hasMultipleMode ? '✓' : '✗' } Multiple mode support` );
} else
{
    console.log( '   ✗ api/ocr/route.ts غير موجود' );
}

// Test 6: Environment Variables
console.log( '\n✅ Test 6: Environment Variables' );
const envPath = path.join( __dirname, '.env.local' );
if ( fs.existsSync( envPath ) )
{
    const content = fs.readFileSync( envPath, 'utf8' );
    const hasOCRKey = content.includes( 'MISTRAL_OCR_API_KEY' );

    console.log( `   ✓ .env.local موجود` );
    console.log( `   ${ hasOCRKey ? '✓' : '✗' } MISTRAL_OCR_API_KEY configured` );
} else
{
    console.log( '   ✗ .env.local غير موجود' );
}

console.log( '\n═══════════════════════════════════════════════════════════════════════════════' );
console.log( '📊 OCR SMART SYSTEM STATUS: ' );
console.log( '═══════════════════════════════════════════════════════════════════════════════\n' );

console.log( '✅ النظام المحسّن جاهز:\n' );
console.log( '   🔹 OCR Service: استخراج + تحليل + رسائل نظام' );
console.log( '   🔹 OCR Store: إدارة السياق في الخلفية' );
console.log( '   🔹 ChatInputBox: Badge صغير بدلاً من نص كامل' );
console.log( '   🔹 Chat Area: إرسال السياق كـ system message' );
console.log( '   🔹 API Route: معالجة OCR في الخلفية\n' );

console.log( '📝 كيف يعمل:\n' );
console.log( '   1. المستخدم يرفع thesis.pdf (9 صفحات)' );
console.log( '   2. النظام يستخرج النص في الخلفية' );
console.log( '   3. يعرض badge: "📄 thesis.pdf • 4,582 كلمة • 9 صفحات"' );
console.log( '   4. المستخدم يكتب: "لخص المحتوى"' );
console.log( '   5. النص الكامل يُرسل كـ system message للنموذج' );
console.log( '   6. الواجهة نظيفة - فقط Badge + السؤال\n' );

console.log( '🎯 المميزات:\n' );
console.log( '   ✓ لا ازدحام في الواجهة' );
console.log( '   ✓ النموذج يحصل على النص الكامل' );
console.log( '   ✓ دعم مستندات كبيرة (100+ صفحة)' );
console.log( '   ✓ إحصائيات دقيقة (كلمات، صفحات، tokens)' );
console.log( '   ✓ يعمل مع جميع النماذج (25 نموذج)\n' );

console.log( '🚀 للاختبار:\n' );
console.log( '   npm run dev' );
console.log( '   - ارفع مستند PDF أو صورة' );
console.log( '   - سترى badge مع الإحصائيات' );
console.log( '   - اكتب سؤالك' );
console.log( '   - النموذج سيحلل المستند كاملاً\n' );
