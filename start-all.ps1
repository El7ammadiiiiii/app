# ============================================
# 🚀 Nexus Webapp - Start All Services
# ============================================
# Usage: .\start-all.ps1
# Starts FastAPI (port 8000) + Next.js (port 3002)
# ============================================

$ErrorActionPreference = 'Continue'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "`n🔷 ═══════════════════════════════════════" -ForegroundColor Cyan
Write-Host '   Nexus Webapp - Starting All Services' -ForegroundColor White
Write-Host "🔷 ═══════════════════════════════════════`n" -ForegroundColor Cyan

# ── 1. Check Python backend dependencies ──
$pythonBackend = Join-Path $root 'python-backend'
if (-not (Test-Path (Join-Path $pythonBackend 'requirements.txt'))) {
    Write-Host '❌ python-backend/requirements.txt not found!' -ForegroundColor Red
    exit 1
}

Write-Host '📦 Checking Python dependencies...' -ForegroundColor Yellow
pip install -r "$pythonBackend\requirements.txt" --quiet 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host '⚠️  Some Python packages may need manual install:' -ForegroundColor Yellow
    Write-Host '   pip install -r python-backend\requirements.txt' -ForegroundColor Gray
}

# ── 2. Start FastAPI backend ──
Write-Host "`n🐍 Starting FastAPI backend on port 8000..." -ForegroundColor Green
$fastApiJob = Start-Job -ScriptBlock {
    param($dir)
    Set-Location $dir
    python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
} -ArgumentList $pythonBackend

Start-Sleep -Seconds 3

# ── 3. Health check ──
Write-Host '🏥 Checking FastAPI health...' -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri 'http://localhost:8000/health' -TimeoutSec 5 -ErrorAction Stop
    Write-Host "✅ FastAPI is healthy: $($health.status)" -ForegroundColor Green
}
catch {
    Write-Host '⚠️  FastAPI may still be starting up...' -ForegroundColor Yellow
}

# ── 4. Start Next.js ──
Write-Host "`n⚡ Starting Next.js on port 3002..." -ForegroundColor Blue
$nextJob = Start-Job -ScriptBlock {
    param($dir)
    Set-Location $dir
    npm run dev
} -ArgumentList $root

Start-Sleep -Seconds 2

Write-Host "`n" -NoNewline
Write-Host '═══════════════════════════════════════════' -ForegroundColor Cyan
Write-Host '  🟢 FastAPI:  http://localhost:8000' -ForegroundColor Green
Write-Host '  🔵 Next.js:  http://localhost:3002' -ForegroundColor Blue
Write-Host '  📊 Health:   http://localhost:8000/health' -ForegroundColor Gray
Write-Host '═══════════════════════════════════════════' -ForegroundColor Cyan
Write-Host "`nPress Ctrl+C to stop all services`n" -ForegroundColor Yellow

# ── Keep running and forward output ──
try {
    while ($true) {
        # Check FastAPI output
        $fastOut = Receive-Job -Job $fastApiJob -ErrorAction SilentlyContinue
        if ($fastOut) { $fastOut | ForEach-Object { Write-Host "[FastAPI] $_" -ForegroundColor DarkGreen } }
        
        # Check Next.js output
        $nextOut = Receive-Job -Job $nextJob -ErrorAction SilentlyContinue
        if ($nextOut) { $nextOut | ForEach-Object { Write-Host "[Next.js] $_" -ForegroundColor DarkBlue } }
        
        # Check if jobs are still running
        if ($fastApiJob.State -eq 'Failed') {
            Write-Host '❌ FastAPI crashed! Check logs above.' -ForegroundColor Red
            Receive-Job -Job $fastApiJob -ErrorAction SilentlyContinue | Write-Host -ForegroundColor Red
        }
        if ($nextJob.State -eq 'Failed') {
            Write-Host '❌ Next.js crashed! Check logs above.' -ForegroundColor Red
            Receive-Job -Job $nextJob -ErrorAction SilentlyContinue | Write-Host -ForegroundColor Red
        }
        
        Start-Sleep -Seconds 2
    }
}
finally {
    Write-Host "`n🛑 Stopping all services..." -ForegroundColor Yellow
    Stop-Job -Job $fastApiJob -ErrorAction SilentlyContinue
    Stop-Job -Job $nextJob -ErrorAction SilentlyContinue
    Remove-Job -Job $fastApiJob -Force -ErrorAction SilentlyContinue
    Remove-Job -Job $nextJob -Force -ErrorAction SilentlyContinue
    Write-Host '✅ All services stopped.' -ForegroundColor Green
}
