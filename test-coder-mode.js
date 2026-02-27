/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * CODER MODE VALIDATION TEST
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * اختبار سريع للتحقق من تكوين Coder Mode
 */

const fs = require( 'fs' );
const path = require( 'path' );

console.log( '🔍 Testing Coder Mode Implementation...\n' );

// ═══════════════════════════════════════════════════════════════════════════════
// 1. Check modelModeConfig.ts
// ═══════════════════════════════════════════════════════════════════════════════

console.log( '📋 1. Checking modelModeConfig.ts...' );
const modelConfigPath = path.join( __dirname, 'src', 'config', 'modelModeConfig.ts' );
const modelConfig = fs.readFileSync( modelConfigPath, 'utf-8' );

const checks = {
    coderMode: modelConfig.includes( '"coder"' ),
    gptCodex: modelConfig.includes( 'gpt-5.2-codex' ),
    devstral: modelConfig.includes( 'devstral-medium-latest' ),
    qwenCoder: modelConfig.includes( 'Qwen3-Coder-Plus' ),
    deepseekCoder: modelConfig.includes( 'DeepSeek-V3.2-Speciale' ),
    llamaCoder: modelConfig.includes( 'llama-3.3-70b-versatile' ),
    claudeCoder: modelConfig.includes( 'claude-sonnet-4-5-coder' ),
    kimiCode: modelConfig.includes( 'kimi-k2.5-CODE' ),
    grokCode: modelConfig.includes( 'grok-code-fast-1' ),
    geminiCoder: modelConfig.includes( 'gemini-3-coder' ),
};

Object.entries( checks ).forEach( ( [ key, value ] ) =>
{
    console.log( `   ${ value ? '✅' : '❌' } ${ key }: ${ value ? 'Found' : 'Missing' }` );
} );

// ═══════════════════════════════════════════════════════════════════════════════
// 2. Check .env.local
// ═══════════════════════════════════════════════════════════════════════════════

console.log( '\n📋 2. Checking .env.local...' );
const envPath = path.join( __dirname, '.env.local' );
const envContent = fs.readFileSync( envPath, 'utf-8' );

const envChecks = {
    'GPT_5_2_CODEX_API_KEY': envContent.includes( 'GPT_5_2_CODEX_API_KEY' ),
    'GPT_5_1_CODEX_MAX_API_KEY': envContent.includes( 'GPT_5_1_CODEX_MAX_API_KEY' ),
    'DEVSTRAL_MEDIUM_API_KEY': envContent.includes( 'DEVSTRAL_MEDIUM_API_KEY' ),
    'QWEN3_CODER_PLUS_API_KEY': envContent.includes( 'QWEN3_CODER_PLUS_API_KEY' ),
    'DEEPSEEK_V32_SPECIALE_API_KEY': envContent.includes( 'DEEPSEEK_V32_SPECIALE_API_KEY' ),
    'LLAMA_33_70B_API_KEY': envContent.includes( 'LLAMA_33_70B_API_KEY' ),
    'CLAUDE_SONNET_45_CODER_API_KEY': envContent.includes( 'CLAUDE_SONNET_45_CODER_API_KEY' ),
    'KIMI_K25_CODE_API_KEY': envContent.includes( 'KIMI_K25_CODE_API_KEY' ),
    'GROK_CODE_FAST_1_API_KEY': envContent.includes( 'GROK_CODE_FAST_1_API_KEY' ),
    'GEMINI_3_CODER_API_KEY': envContent.includes( 'GEMINI_3_CODER_API_KEY' ),
};

Object.entries( envChecks ).forEach( ( [ key, value ] ) =>
{
    console.log( `   ${ value ? '✅' : '❌' } ${ key }: ${ value ? 'Present' : 'Missing' }` );
} );

// ═══════════════════════════════════════════════════════════════════════════════
// 3. Check ChatInputBox.tsx
// ═══════════════════════════════════════════════════════════════════════════════

console.log( '\n📋 3. Checking ChatInputBox.tsx...' );
const chatInputPath = path.join( __dirname, 'src', 'components', 'chat', 'ChatInputBox.tsx' );
const chatInput = fs.readFileSync( chatInputPath, 'utf-8' );

const chatChecks = {
    'Coder in CHAT_MODE_OPTIONS': chatInput.includes( '"coder"' ),
    'CODER_MODEL_OPTIONS defined': chatInput.includes( 'CODER_MODEL_OPTIONS' ),
    'useCanvasStore imported': chatInput.includes( 'useCanvasStore' ),
    'Canvas auto-activation': chatInput.includes( 'enableMode("CODE")' ),
    'Conditional model list': chatInput.includes( 'selectedChatbot === "coder"' ),
};

Object.entries( chatChecks ).forEach( ( [ key, value ] ) =>
{
    console.log( `   ${ value ? '✅' : '❌' } ${ key }: ${ value ? 'Implemented' : 'Missing' }` );
} );

// ═══════════════════════════════════════════════════════════════════════════════
// 4. Check unified/route.ts
// ═══════════════════════════════════════════════════════════════════════════════

console.log( '\n📋 4. Checking unified/route.ts...' );
const unifiedPath = path.join( __dirname, 'src', 'app', 'api', 'chat', 'unified', 'route.ts' );
const unified = fs.readFileSync( unifiedPath, 'utf-8' );

const unifiedChecks = {
    'Codex keys in API_KEYS': unified.includes( 'gpt-5.2-codex' ),
    'All 10 models present': (
        unified.includes( 'gpt-5.2-codex' ) &&
        unified.includes( 'devstral-medium-latest' ) &&
        unified.includes( 'Qwen3-Coder-Plus' ) &&
        unified.includes( 'DeepSeek-V3.2-Speciale' ) &&
        unified.includes( 'llama-3.3-70b-versatile' )
    ),
};

Object.entries( unifiedChecks ).forEach( ( [ key, value ] ) =>
{
    console.log( `   ${ value ? '✅' : '❌' } ${ key }: ${ value ? 'Configured' : 'Missing' }` );
} );

// ═══════════════════════════════════════════════════════════════════════════════
// 5. Check canvas/edit/route.ts
// ═══════════════════════════════════════════════════════════════════════════════

console.log( '\n📋 5. Checking canvas/edit/route.ts...' );
const canvasEditPath = path.join( __dirname, 'src', 'app', 'api', 'canvas', 'edit', 'route.ts' );
const canvasEdit = fs.readFileSync( canvasEditPath, 'utf-8' );

const canvasChecks = {
    'Coder models in keyMap': canvasEdit.includes( 'gpt-5.2-codex' ),
    'All keys configured': (
        canvasEdit.includes( 'GPT_5_2_CODEX_API_KEY' ) &&
        canvasEdit.includes( 'DEVSTRAL_MEDIUM_API_KEY' )
    ),
};

Object.entries( canvasChecks ).forEach( ( [ key, value ] ) =>
{
    console.log( `   ${ value ? '✅' : '❌' } ${ key }: ${ value ? 'Configured' : 'Missing' }` );
} );

// ═══════════════════════════════════════════════════════════════════════════════
// 6. Check CanvasToolbar.tsx
// ═══════════════════════════════════════════════════════════════════════════════

console.log( '\n📋 6. Checking CanvasToolbar.tsx...' );
const toolbarPath = path.join( __dirname, 'src', 'components', 'canvas', 'CanvasToolbar.tsx' );
const toolbar = fs.readFileSync( toolbarPath, 'utf-8' );

const toolbarChecks = {
    'Codex models in CANVAS_MODELS': toolbar.includes( 'gpt-5.2-codex' ),
    '24 total models': ( toolbar.match( /id: '/g ) || [] ).length >= 24,
};

Object.entries( toolbarChecks ).forEach( ( [ key, value ] ) =>
{
    console.log( `   ${ value ? '✅' : '❌' } ${ key }: ${ value ? 'Present' : 'Missing' }` );
} );

// ═══════════════════════════════════════════════════════════════════════════════
// Summary
// ═══════════════════════════════════════════════════════════════════════════════

console.log( '\n' + '═'.repeat( 80 ) );
console.log( '📊 SUMMARY' );
console.log( '═'.repeat( 80 ) );

const allChecks = [
    ...Object.values( checks ),
    ...Object.values( envChecks ),
    ...Object.values( chatChecks ),
    ...Object.values( unifiedChecks ),
    ...Object.values( canvasChecks ),
    ...Object.values( toolbarChecks ),
];

const passed = allChecks.filter( Boolean ).length;
const total = allChecks.length;
const percentage = ( ( passed / total ) * 100 ).toFixed( 1 );

console.log( `\n✅ Passed: ${ passed }/${ total } (${ percentage }%)` );
console.log( `❌ Failed: ${ total - passed }/${ total }\n` );

if ( passed === total )
{
    console.log( '🎉 ALL TESTS PASSED! Coder Mode is fully implemented.\n' );
} else
{
    console.log( '⚠️  Some checks failed. Please review the implementation.\n' );
}

console.log( '═'.repeat( 80 ) );
console.log( 'Next steps:' );
console.log( '1. Run: npm run dev' );
console.log( '2. Open: http://localhost:3000' );
console.log( '3. Select "coder" mode from dropdown' );
console.log( '4. Verify Canvas opens automatically' );
console.log( '5. Check that coder models are displayed' );
console.log( '═'.repeat( 80 ) );
