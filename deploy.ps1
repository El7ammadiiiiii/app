# ═══════════════════════════════════════════════
# 🚀 deploy.ps1 — Deploy CCWays to Google Cloud
# Deploys python-backend to Cloud Run + Next.js to Firebase
# Project: ccways-5a160 | Region: us-central1
# ═══════════════════════════════════════════════

param(
    [string]$ProjectId = 'ccways-5a160',
    [string]$Region = 'us-central1',
    [string]$ServiceName = 'ccways-backend',
    [string]$ImageName = 'gcr.io/ccways-5a160/ccways-backend',
    [switch]$SkipFrontend,
    [switch]$SkipBackend
)

$ErrorActionPreference = 'Stop'

Write-Host '═══════════════════════════════════════════════' -ForegroundColor Cyan
Write-Host '  🚀 CCWays — Google Cloud Deployment' -ForegroundColor Cyan
Write-Host "  Project: $ProjectId | Region: $Region" -ForegroundColor Cyan
Write-Host '═══════════════════════════════════════════════' -ForegroundColor Cyan

# ─── Prerequisites ───
Write-Host "`n📋 Checking prerequisites..." -ForegroundColor Yellow
$gcloud = Get-Command gcloud -ErrorAction SilentlyContinue
if (-not $gcloud) {
    Write-Host '❌ gcloud CLI not found. Install from: https://cloud.google.com/sdk/docs/install' -ForegroundColor Red
    exit 1
}

# Set project
gcloud config set project $ProjectId

# ═══════════════════════════════════════════════
# 1. PYTHON BACKEND → Cloud Run
# ═══════════════════════════════════════════════
if (-not $SkipBackend) {
    Write-Host "`n🐍 [1/3] Building Python Backend Docker image..." -ForegroundColor Green
    
    $backendPath = Join-Path $PSScriptRoot 'python-backend'
    
    # Copy service account key into build context
    $keySrc = Join-Path $PSScriptRoot 'backend-api-service\keys\service-account-key.json'
    $keyDst = Join-Path $backendPath 'keys\service-account-key.json'
    if (-not (Test-Path (Join-Path $backendPath 'keys'))) {
        New-Item -ItemType Directory -Path (Join-Path $backendPath 'keys') -Force | Out-Null
    }
    if (Test-Path $keySrc) {
        Copy-Item $keySrc $keyDst -Force
        Write-Host '  ✅ Service account key copied' -ForegroundColor Gray
    }
    else {
        # Try alternate location
        $keySrc2 = 'C:\Users\GAME\elhammadi\backend-api-service\keys\service-account-key.json'
        if (Test-Path $keySrc2) {
            Copy-Item $keySrc2 $keyDst -Force
            Write-Host '  ✅ Service account key copied (alt path)' -ForegroundColor Gray
        }
        else {
            Write-Host '  ⚠️ Service account key not found — Firebase will use GOOGLE_APPLICATION_CREDENTIALS env' -ForegroundColor Yellow
        }
    }
    
    # Build with Cloud Build (or local Docker)
    Write-Host "`n🏗️ Submitting build to Cloud Build..." -ForegroundColor Green
    Push-Location $backendPath
    gcloud builds submit --tag "$ImageName`:latest" --timeout=600
    Pop-Location
    
    # Deploy to Cloud Run
    Write-Host "`n☁️ [2/3] Deploying to Cloud Run ($ServiceName)..." -ForegroundColor Green
    gcloud run deploy $ServiceName `
        --image "$ImageName`:latest" `
        --region $Region `
        --platform managed `
        --allow-unauthenticated `
        --memory 2Gi `
        --cpu 2 `
        --timeout 3600 `
        --min-instances 1 `
        --max-instances 3 `
        --set-env-vars "FASTAPI_PORT=8080,CORS_ORIGINS=*,FIREBASE_PROJECT_ID=$ProjectId" `
        --port 8080

    # Get the URL
    $backendUrl = gcloud run services describe $ServiceName --region $Region --format 'value(status.url)'
    Write-Host "`n✅ Backend deployed: $backendUrl" -ForegroundColor Green
    Write-Host "   Health check: $backendUrl/health" -ForegroundColor Gray
    Write-Host "   API docs: $backendUrl/docs" -ForegroundColor Gray
    
    # Clean up key from build context
    if (Test-Path $keyDst) {
        Remove-Item $keyDst -Force
        # Remove keys dir if empty
        $keysDir = Join-Path $backendPath 'keys'
        if ((Get-ChildItem $keysDir | Measure-Object).Count -eq 0) {
            Remove-Item $keysDir -Force
        }
    }
}

# ═══════════════════════════════════════════════
# 2. NEXT.JS FRONTEND → Firebase Hosting
# ═══════════════════════════════════════════════
if (-not $SkipFrontend) {
    Write-Host "`n🌐 [3/3] Building & deploying Next.js frontend to Firebase Hosting..." -ForegroundColor Green
    
    $frontendPath = $PSScriptRoot
    Push-Location $frontendPath
    
    # Check if firebase.json exists
    if (-not (Test-Path 'firebase.json')) {
        Write-Host '  ⚠️ firebase.json not found — skipping frontend deploy' -ForegroundColor Yellow
        Write-Host "  Run 'firebase init hosting' first" -ForegroundColor Yellow
        Pop-Location
    }
    else {
        # Build Next.js
        Write-Host '  📦 Building Next.js...' -ForegroundColor Gray
        npm run build
        
        # Deploy to Firebase
        Write-Host '  🔥 Deploying to Firebase Hosting...' -ForegroundColor Gray
        npx firebase deploy --only hosting --project $ProjectId
        
        Write-Host '  ✅ Frontend deployed to Firebase Hosting' -ForegroundColor Green
        Pop-Location
    }
}

Write-Host "`n═══════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host '  ✅ Deployment Complete!' -ForegroundColor Green
Write-Host '═══════════════════════════════════════════════' -ForegroundColor Cyan
Write-Host ''
Write-Host '  Services:' -ForegroundColor White
if (-not $SkipBackend) {
    Write-Host "    Backend:  Cloud Run ($ServiceName)" -ForegroundColor Gray
}
if (-not $SkipFrontend) {
    Write-Host '    Frontend: Firebase Hosting' -ForegroundColor Gray
}
Write-Host ''
Write-Host '  Crawlers running on backend:' -ForegroundColor White
Write-Host '    Chain Explorer:  every 4h  → crawler_data/chains' -ForegroundColor Gray
Write-Host '    StakingRewards:  every 4h  → crawler_data/stakingrewards' -ForegroundColor Gray
Write-Host '    Top Holders:     every 12h → crawler_data/holders' -ForegroundColor Gray
Write-Host '    News (10 RSS):   every 1h  → crawler_data/news + SQLite' -ForegroundColor Gray
Write-Host ''
