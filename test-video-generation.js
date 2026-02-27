/**
 * Test Script for Video Generation Integration
 * Tests file structure, imports, and component connections
 */

const fs = require( 'fs' );
const path = require( 'path' );

console.log( '🎬 Testing Video Generation Integration...\n' );

const checks = [];
let passed = 0;
let failed = 0;

// Helper function
function check ( name, condition, details = '' )
{
    const result = condition ? '✅' : '❌';
    checks.push( { name, passed: condition, details } );
    if ( condition ) passed++;
    else failed++;
    console.log( `${ result } ${ name }` );
    if ( details ) console.log( `   ${ details }` );
}

// 1. Check core files exist
console.log( '\n📁 File Structure Checks:' );
check(
    'veoService.ts exists',
    fs.existsSync( 'src/services/veoService.ts' )
);

check(
    'veoStore.ts exists',
    fs.existsSync( 'src/store/veoStore.ts' )
);

check(
    'VideoGeneratorTool.tsx exists',
    fs.existsSync( 'src/components/tools/VideoGeneratorTool.tsx' )
);

check(
    'API generate route exists',
    fs.existsSync( 'src/app/api/veo/generate/route.ts' )
);

check(
    'API status route exists',
    fs.existsSync( 'src/app/api/veo/status/[operationName]/route.ts' )
);

check(
    'Documentation exists',
    fs.existsSync( 'VIDEO_GENERATION_GUIDE.md' )
);

// 2. Check service implementation
console.log( '\n⚙️ Service Implementation Checks:' );
if ( fs.existsSync( 'src/services/veoService.ts' ) )
{
    const serviceContent = fs.readFileSync( 'src/services/veoService.ts', 'utf8' );

    check(
        'Has generateVideoFromText function',
        serviceContent.includes( 'export async function generateVideoFromText' )
    );

    check(
        'Has generateVideoFromImage function',
        serviceContent.includes( 'export async function generateVideoFromImage' )
    );

    check(
        'Has generateVideoWithReferences function',
        serviceContent.includes( 'export async function generateVideoWithReferences' )
    );

    check(
        'Has generateVideoWithInterpolation function',
        serviceContent.includes( 'export async function generateVideoWithInterpolation' )
    );

    check(
        'Has extendVideo function',
        serviceContent.includes( 'export async function extendVideo' )
    );

    check(
        'Has checkVideoStatus function',
        serviceContent.includes( 'export async function checkVideoStatus' )
    );

    check(
        'Has API key configured',
        serviceContent.includes( 'AIzaSyA8095dzF_c0J6UlbACZrPCIzFRwQev7CI' )
    );

    check(
        'Has fileToBase64 helper',
        serviceContent.includes( 'export async function fileToBase64' )
    );
}

// 3. Check store implementation
console.log( '\n🗄️ Store Implementation Checks:' );
if ( fs.existsSync( 'src/store/veoStore.ts' ) )
{
    const storeContent = fs.readFileSync( 'src/store/veoStore.ts', 'utf8' );

    check(
        'Uses Zustand',
        storeContent.includes( 'import { create } from \'zustand\'' )
    );

    check(
        'Has persist middleware',
        storeContent.includes( 'import { persist } from \'zustand/middleware\'' )
    );

    check(
        'Has addVideo action',
        storeContent.includes( 'addVideo:' )
    );

    check(
        'Has updateVideo action',
        storeContent.includes( 'updateVideo:' )
    );

    check(
        'Has removeVideo action',
        storeContent.includes( 'removeVideo:' )
    );

    check(
        'Has helper functions exported',
        storeContent.includes( 'export function getVideoTypeLabel' ) &&
        storeContent.includes( 'export function getStatusColor' )
    );
}

// 4. Check UI component
console.log( '\n🎨 UI Component Checks:' );
if ( fs.existsSync( 'src/components/tools/VideoGeneratorTool.tsx' ) )
{
    const componentContent = fs.readFileSync( 'src/components/tools/VideoGeneratorTool.tsx', 'utf8' );

    check(
        'Is a client component',
        componentContent.includes( '"use client"' )
    );

    check(
        'Imports useVeoStore',
        componentContent.includes( 'useVeoStore' )
    );

    check(
        'Has file upload inputs',
        componentContent.includes( 'type="file"' )
    );

    check(
        'Has generation form',
        componentContent.includes( 'renderGenerationForm' )
    );

    check(
        'Has history view',
        componentContent.includes( 'renderHistory' )
    );

    check(
        'Has status polling',
        componentContent.includes( 'useEffect' ) && componentContent.includes( 'setInterval' )
    );

    check(
        'Can close modal',
        componentContent.includes( 'onClose' )
    );
}

// 5. Check ChatInputBox integration
console.log( '\n🔗 Integration Checks:' );
if ( fs.existsSync( 'src/components/chat/ChatInputBox.tsx' ) )
{
    const chatInputContent = fs.readFileSync( 'src/components/chat/ChatInputBox.tsx', 'utf8' );

    check(
        'Imports VideoGeneratorTool',
        chatInputContent.includes( 'import { VideoGeneratorTool }' )
    );

    check(
        'Has VideoIcon',
        chatInputContent.includes( 'const VideoIcon = ()' )
    );

    check(
        'Has showVideoGenerator state',
        chatInputContent.includes( 'showVideoGenerator' )
    );

    check(
        'Has Generate Video button in tools menu',
        chatInputContent.includes( 'Generate Video' ) || chatInputContent.includes( 'GENERATE Video' )
    );

    check(
        'Renders VideoGeneratorTool conditionally',
        chatInputContent.includes( '<VideoGeneratorTool' ) &&
        chatInputContent.includes( 'showVideoGenerator' )
    );
}

// 6. Check API routes
console.log( '\n🌐 API Routes Checks:' );
if ( fs.existsSync( 'src/app/api/veo/generate/route.ts' ) )
{
    const generateRouteContent = fs.readFileSync( 'src/app/api/veo/generate/route.ts', 'utf8' );

    check(
        'Exports POST handler',
        generateRouteContent.includes( 'export async function POST' )
    );

    check(
        'Imports service functions',
        generateRouteContent.includes( 'from \'@/services/veoService\'' )
    );

    check(
        'Handles all generation types',
        generateRouteContent.includes( 'text-to-video' ) &&
        generateRouteContent.includes( 'image-to-video' ) &&
        generateRouteContent.includes( 'video-with-references' ) &&
        generateRouteContent.includes( 'video-interpolation' ) &&
        generateRouteContent.includes( 'video-extension' )
    );
}

if ( fs.existsSync( 'src/app/api/veo/status/[operationName]/route.ts' ) )
{
    const statusRouteContent = fs.readFileSync( 'src/app/api/veo/status/[operationName]/route.ts', 'utf8' );

    check(
        'Exports GET handler',
        statusRouteContent.includes( 'export async function GET' )
    );

    check(
        'Calls checkVideoStatus',
        statusRouteContent.includes( 'checkVideoStatus' )
    );

    check(
        'Uses dynamic route params',
        statusRouteContent.includes( 'params.operationName' )
    );
}

// Summary
console.log( '\n' + '='.repeat( 50 ) );
console.log( '📊 Test Summary:' );
console.log( '='.repeat( 50 ) );
console.log( `✅ Passed: ${ passed }` );
console.log( `❌ Failed: ${ failed }` );
console.log( `📈 Success Rate: ${ ( ( passed / ( passed + failed ) ) * 100 ).toFixed( 1 ) }%` );

if ( failed === 0 )
{
    console.log( '\n🎉 All checks passed! Video generation is ready to use.' );
    console.log( '📖 See VIDEO_GENERATION_GUIDE.md for usage instructions.' );
} else
{
    console.log( '\n⚠️  Some checks failed. Please review the issues above.' );
}

console.log( '\n🔍 Quick Test Steps:' );
console.log( '1. Start the development server: npm run dev' );
console.log( '2. Open the chat interface' );
console.log( '3. Click the Tools button (Sliders icon)' );
console.log( '4. Select "Generate Video"' );
console.log( '5. Fill the form and generate a video' );
console.log( '6. Check the History tab for generated videos' );

process.exit( failed > 0 ? 1 : 0 );
