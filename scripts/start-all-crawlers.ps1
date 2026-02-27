# ═══════════════════════════════════════════════════════
#  Unified Parallel Crawlers Launcher v4
#  12 Messari + CoinGecko crawlers
# ═══════════════════════════════════════════════════════
#
# Usage:
#   .\start-all-crawlers.ps1 -CgDemoKey "CG-xxx"     # Full 5000-coin crawl
#   .\start-all-crawlers.ps1 -MessariOnly             # Only Messari (12 jobs)
#   .\start-all-crawlers.ps1 -CoinGeckoOnly           # Only CoinGecko jobs
#   .\start-all-crawlers.ps1 -Phase1Only              # Phase 1: logos + OHLCV 1-2000
#   .\start-all-crawlers.ps1 -Phase2Only              # Phase 2: details 1001-5000 + Messari 12-crawlers
#   .\start-all-crawlers.ps1 -Force                   # Force re-crawl
#

param(
    [string]$CgDemoKey = '',
    [switch]$Force,
    [switch]$SkipMerge,
    [switch]$MessariOnly,
    [switch]$CoinGeckoOnly,
    [switch]$Phase1Only,
    [switch]$Phase2Only
)

$ErrorActionPreference = 'Continue'
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# Set CG_DEMO_KEY environment variable for child processes
if ($CgDemoKey) {
    $env:CG_DEMO_KEY = $CgDemoKey
}

$forceArg = if ($Force) { '--force' } else { '' }

Write-Host ''
Write-Host '╔══════════════════════════════════════════════════╗' -ForegroundColor Cyan
Write-Host '║  🚀 Unified Parallel Crawlers v4                ║' -ForegroundColor Cyan
Write-Host '║  12 Messari + CoinGecko (Demo Key Support)      ║' -ForegroundColor Cyan
Write-Host '╚══════════════════════════════════════════════════╝' -ForegroundColor Cyan
Write-Host ''
Write-Host "  🔑 CG Demo Key: $(if ($CgDemoKey) { 'Active (2.2s delay)' } else { 'Not set (12s delay)' })" -ForegroundColor $(if ($CgDemoKey) { 'Green' } else { 'Yellow' })
Write-Host "  ⚡ Force: $Force" -ForegroundColor Gray
Write-Host ''

$startTime = Get-Date
$allJobs = @()

function Start-CrawlerJob {
    param([string]$Name, [string]$Script, [string]$CrawlerArgs)
    Write-Host "  ▶ Starting $Name..." -ForegroundColor Yellow
    $job = Start-Job -Name $Name -ScriptBlock {
        param($dir, $script, $crawlerArgs, $key)
        Set-Location $dir
        if ($key) { $env:CG_DEMO_KEY = $key }
        $argList = $crawlerArgs -split ' ' | Where-Object { $_ -ne '' }
        & node $script @argList 2>&1
    } -ArgumentList $ScriptDir, $Script, $CrawlerArgs, $CgDemoKey
    return $job
}

# ═══════════════════════════════════════════
#  PHASE 1: Exchange Logos + OHLCV (first 2000)
# ═══════════════════════════════════════════
if (-not $Phase2Only -and -not $MessariOnly) {
    Write-Host '  ════════════════════════════════════' -ForegroundColor Magenta
    Write-Host '  Phase 1: Exchange Logos + OHLCV' -ForegroundColor Magenta
    Write-Host '  ════════════════════════════════════' -ForegroundColor Magenta
    Write-Host ''

    # Step 1a: Fetch exchange logos (quick)
    Write-Host '  🏦 Fetching exchange logos...' -ForegroundColor Yellow
    Set-Location $ScriptDir
    $logoArgs = @('crawl-exchange-logos.js')
    & node @logoArgs 2>&1 | ForEach-Object { Write-Host "    $_" }

    # Step 1b: Patch existing details with logos
    Write-Host '  🔧 Patching exchange logos in details...' -ForegroundColor Yellow
    & node patch-exchange-logos.js 2>&1 | ForEach-Object { Write-Host "    $_" }
    Write-Host ''

    if (-not $CoinGeckoOnly -or $Phase1Only) {
        # Step 1c: OHLCV for first 2000 coins (runs in background)
        $allJobs += Start-CrawlerJob -Name 'OHLCV-1-2000' -Script 'crawl-ohlcv.js' -CrawlerArgs "--start 0 --limit 2000 $forceArg"
    }
}

# ═══════════════════════════════════════════
#  PHASE 2: 12 Messari Crawlers (4 ranges × 3 types)
#  Devs = Algolia API (all parallel), News+Profile = Puppeteer (sequential by range)
# ═══════════════════════════════════════════
if (-not $Phase1Only -and -not $CoinGeckoOnly) {
    Write-Host ''
    Write-Host '  ════════════════════════════════════' -ForegroundColor Magenta
    Write-Host '  Phase 2: 12 Messari Crawlers' -ForegroundColor Magenta
    Write-Host '  Devs: all parallel | News+Profile: sequential by range' -ForegroundColor Magenta
    Write-Host '  ════════════════════════════════════' -ForegroundColor Magenta
    Write-Host ''

    # ── Launch ALL Devs crawlers in parallel (Algolia API, no browser) ──
    Write-Host '  📡 Launching all Devs crawlers (Algolia API)...' -ForegroundColor Yellow
    $allJobs += Start-CrawlerJob -Name 'Devs-R2' -Script 'crawl-messari-devs.js' -CrawlerArgs "--start 1000 --limit 1000 --output r2 $forceArg"
    $allJobs += Start-CrawlerJob -Name 'Devs-R3' -Script 'crawl-messari-devs.js' -CrawlerArgs "--start 2000 --limit 1000 --output r3 $forceArg"
    $allJobs += Start-CrawlerJob -Name 'Devs-R4' -Script 'crawl-messari-devs.js' -CrawlerArgs "--start 3000 --limit 1000 --output r4 $forceArg"
    $allJobs += Start-CrawlerJob -Name 'Devs-R5' -Script 'crawl-messari-devs.js' -CrawlerArgs "--start 4000 --limit 1000 --output r5 $forceArg"
    Write-Host ''

    # ── Run News+Profile sequentially per range (max 2 Puppeteer browsers at a time) ──
    $ranges = @(
        @{ Num = 'R2'; Start = 1000 },
        @{ Num = 'R3'; Start = 2000 },
        @{ Num = 'R4'; Start = 3000 },
        @{ Num = 'R5'; Start = 4000 }
    )

    foreach ($range in $ranges) {
        $r = $range.Num
        $s = $range.Start
        Write-Host "  🌐 Range $r (start=$s): Launching News + Profile..." -ForegroundColor Yellow

        $newsJob = Start-CrawlerJob -Name "News-$r" -Script 'crawl-messari-news.js' -CrawlerArgs "--start $s --limit 1000 --output $($r.ToLower()) $forceArg"
        $profileJob = Start-CrawlerJob -Name "Profile-$r" -Script 'crawl-messari-profile.js' -CrawlerArgs "--start $s --limit 1000 --output $($r.ToLower()) $forceArg"
        $allJobs += $newsJob
        $allJobs += $profileJob

        # Wait for BOTH to finish before next range
        Write-Host "  ⏳ Waiting for News-$r & Profile-$r to finish..." -ForegroundColor DarkGray
        $newsJob, $profileJob | Wait-Job | Out-Null

        # Show results
        foreach ($j in @($newsJob, $profileJob)) {
            $output = Receive-Job -Job $j 2>&1
            $lines = ($output | Out-String).Trim().Split("`n")
            $lastLines = if ($lines.Count -gt 5) { $lines[-5..-1] } else { $lines }
            if ($j.State -eq 'Completed') {
                Write-Host "  ✅ $($j.Name) done" -ForegroundColor Green
            }
            else {
                Write-Host "  ⚠️ $($j.Name) finished with state: $($j.State)" -ForegroundColor Yellow
            }
            $lastLines | ForEach-Object { Write-Host "    $_" -ForegroundColor Gray }
        }
        Write-Host ''

        # Brief pause before next range
        if ($range -ne $ranges[-1]) {
            Write-Host '  ⏳ 15s cooldown before next range...' -ForegroundColor DarkGray
            Start-Sleep -Seconds 15
        }
    }
}

# ═══════════════════════════════════════════
#  PHASE 3: CoinGecko Details 1001-5000
# ═══════════════════════════════════════════
if (-not $Phase1Only -and -not $MessariOnly) {
    Write-Host ''
    Write-Host '  ════════════════════════════════════' -ForegroundColor Magenta
    Write-Host '  Phase 3: CoinGecko Details 1001-5000' -ForegroundColor Magenta
    Write-Host '  ════════════════════════════════════' -ForegroundColor Magenta
    Write-Host ''

    $allJobs += Start-CrawlerJob -Name 'Details-1001-5000' -Script 'crawl-all-details.js' -CrawlerArgs "--start 1000 --limit 4000 --with-ohlcv $forceArg"
}

# ═══════════════════════════════════════════
#  MONITOR ALL JOBS
# ═══════════════════════════════════════════
if ($allJobs.Count -gt 0) {
    Write-Host ''
    Write-Host "  ⏳ $($allJobs.Count) crawlers running in parallel..." -ForegroundColor Cyan
    Write-Host ''

    $completed = @{}
    while ($allJobs.Count -gt $completed.Count) {
        foreach ($job in $allJobs) {
            if ($completed.ContainsKey($job.Name)) { continue }

            if ($job.State -eq 'Completed') {
                $completed[$job.Name] = $true
                $output = Receive-Job -Job $job 2>&1
                Write-Host "  ✅ $($job.Name) finished!" -ForegroundColor Green
                # Show last 5 lines of output
                $lines = ($output | Out-String).Trim().Split("`n")
                $lastLines = if ($lines.Count -gt 5) { $lines[-5..-1] } else { $lines }
                $lastLines | ForEach-Object { Write-Host "    $_" -ForegroundColor Gray }
                Write-Host ''
            }
            elseif ($job.State -eq 'Failed') {
                $completed[$job.Name] = $true
                Write-Host "  ❌ $($job.Name) FAILED!" -ForegroundColor Red
                $err = Receive-Job -Job $job -ErrorAction SilentlyContinue 2>&1
                ($err | Out-String).Trim().Split("`n") | Select-Object -Last 3 | ForEach-Object { Write-Host "    $_" -ForegroundColor Red }
                Write-Host ''
            }
        }

        if ($allJobs.Count -gt $completed.Count) {
            Start-Sleep -Seconds 10
            $elapsed = [math]::Round(((Get-Date) - $startTime).TotalSeconds)
            $running = ($allJobs | Where-Object { $_.State -eq 'Running' } | Select-Object -ExpandProperty Name) -join ', '
            $pct = [math]::Round($completed.Count / $allJobs.Count * 100)
            Write-Host "`r  ⏱ ${elapsed}s | ${pct}% done ($($completed.Count)/$($allJobs.Count)) | Running: $running" -NoNewline -ForegroundColor DarkGray
        }
    }

    # Clean up
    $allJobs | Remove-Job -Force -ErrorAction SilentlyContinue
}

# ═══════════════════════════════════════════
#  MERGE MESSARI DATA
# ═══════════════════════════════════════════
if (-not $SkipMerge -and -not $CoinGeckoOnly -and -not $Phase1Only) {
    Write-Host ''
    Write-Host '  🔄 Merging all Messari data...' -ForegroundColor Yellow
    Set-Location $ScriptDir
    & node merge-messari.js 2>&1 | ForEach-Object { Write-Host "    $_" }
    Write-Host '  ✅ Merge complete!' -ForegroundColor Green
}

# ═══════════════════════════════════════════
#  SUMMARY
# ═══════════════════════════════════════════
$totalElapsed = [math]::Round(((Get-Date) - $startTime).TotalMinutes, 1)
Write-Host ''
Write-Host '  ═══════════════════════════════════════' -ForegroundColor Cyan
Write-Host "  🎉 All done! Total time: ${totalElapsed} minutes" -ForegroundColor Green
Write-Host '  ═══════════════════════════════════════' -ForegroundColor Cyan
Write-Host ''

# Quick data inventory
Write-Host '  📊 Data Inventory:' -ForegroundColor Cyan
$dataDir = Join-Path $ScriptDir '..\public\data'
$files = @(
    'coingecko-markets.json',
    'coingecko-details.json', 
    'coingecko-ohlcv.json',
    'exchange-logos.json',
    'messari-projects.json'
)
foreach ($f in $files) {
    $fp = Join-Path $dataDir $f
    if (Test-Path $fp) {
        $size = [math]::Round((Get-Item $fp).Length / 1MB, 1)
        Write-Host "    ✅ $f (${size} MB)" -ForegroundColor Gray
    }
    else {
        Write-Host "    ❌ $f (missing)" -ForegroundColor Red
    }
}

# Count range files
$rangeFiles = Get-ChildItem $dataDir -Filter 'messari-*-r*.json' -ErrorAction SilentlyContinue
if ($rangeFiles) {
    Write-Host "    📄 Range files: $($rangeFiles.Count) files" -ForegroundColor Gray
}
Write-Host ''
