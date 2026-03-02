# ═══════════════════════════════════════════════════════════════════════
# ccways.com — Restart All Services
# Usage: .\restart-ccways.ps1
#        .\restart-ccways.ps1 -BuildFirst   (rebuild then restart)
# ═══════════════════════════════════════════════════════════════════════

param([switch]$BuildFirst)

$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

Write-Host "`n=== CCWAYS Service Manager ===" -ForegroundColor Cyan

if ($BuildFirst) {
    Write-Host "`n[1/4] Building Next.js..." -ForegroundColor Yellow
    npm run build
    if ($LASTEXITCODE -ne 0) { Write-Host "BUILD FAILED" -ForegroundColor Red; exit 1 }
    Write-Host "  Build OK" -ForegroundColor Green
} else {
    Write-Host "`n[1/4] Skipping build (use -BuildFirst to rebuild)" -ForegroundColor DarkGray
}

Write-Host "`n[2/4] Restarting PM2 services..." -ForegroundColor Yellow
pm2 restart ecosystem.config.cjs
Start-Sleep -Seconds 5

Write-Host "`n[3/4] Checking status..." -ForegroundColor Yellow
pm2 status

Write-Host "`n[4/4] Quick health check..." -ForegroundColor Yellow
try {
    $api = Invoke-WebRequest -Uri "http://127.0.0.1:8000/ccways/chains" -TimeoutSec 10 -UseBasicParsing
    $web = Invoke-WebRequest -Uri "http://127.0.0.1:3001/chat/cwtracker" -TimeoutSec 10 -UseBasicParsing
    Write-Host "  API: $($api.StatusCode) OK" -ForegroundColor Green
    Write-Host "  WEB: $($web.StatusCode) OK" -ForegroundColor Green
} catch {
    Write-Host "  Health check failed: $_" -ForegroundColor Red
}

Write-Host "`n=== Done ===" -ForegroundColor Cyan
Write-Host "Logs: pm2 logs"
Write-Host "Status: pm2 status"
Write-Host ""
