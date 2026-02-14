# 뉴스의창 - 개발 모드: 로컬 서버 상시 실행 + 코딩 끝날 때 자동 커밋
# 사용법: PowerShell에서 .\start-dev.ps1 실행 후 터미널을 닫지 마세요.

# 한글이 깨지지 않도록 터미널 인코딩을 UTF-8로 설정
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
chcp 65001 | Out-Null

$ErrorActionPreference = "Stop"
$ProjectRoot = $PSScriptRoot
$Port = 8080
$CommitDelaySeconds = 60   # 마지막 수정 후 이 시간(초) 지나면 자동 커밋
$serverJob = $null

Set-Location $ProjectRoot

# ----- 1. 로컬 서버 시작 (이미 떠 있으면 건너뜀) -----
$serverRunning = $false
try {
    $conn = [System.Net.Sockets.TcpClient]::new("127.0.0.1", $Port)
    $conn.Close()
    $serverRunning = $true
} catch {}

if (-not $serverRunning) {
    Write-Host "[서버] http://127.0.0.1:${Port} 에서 로컬 서버를 시작합니다..." -ForegroundColor Green
    $script:serverJob = Start-Job -ScriptBlock {
        Set-Location $using:ProjectRoot
        python -m http.server $using:Port
    }
    Start-Sleep -Seconds 2
    $state = (Get-Job -Id $serverJob.Id).State
    if ($state -eq "Running") {
        Write-Host "[서버] 정상적으로 시작되었습니다. 브라우저에서 http://127.0.0.1:${Port} 를 열어보세요." -ForegroundColor Green
    } else {
        Write-Host "[서버] 경고: 서버 작업 상태가 $state 입니다. Python이 설치되어 있는지 확인하세요." -ForegroundColor Yellow
    }
} else {
    Write-Host "[서버] 이미 http://127.0.0.1:${Port} 에서 실행 중입니다." -ForegroundColor Cyan
}

# ----- 2. 파일 변경 감지 후 자동 커밋 -----
Write-Host "[자동커밋] 파일 변경을 감지하고 있습니다. 수정 후 ${CommitDelaySeconds}초 지나면 자동 커밋합니다. (종료: Ctrl+C)" -ForegroundColor Yellow

$watcher = New-Object System.IO.FileSystemWatcher
$watcher.Path = $ProjectRoot
$watcher.IncludeSubdirectories = $true
$watcher.EnableRaisingEvents = $true

$onChange = {
    $path = $Event.SourceEventArgs.FullPath
    if ($path -match '\\.git\\') { return }
    $name = $Event.SourceEventArgs.Name
    if ($name -eq '') { return }
    if ($global:autoCommitTimer) {
        $global:autoCommitTimer.Dispose()
    }
    $global:autoCommitTimer = New-Object System.Timers.Timer
    $global:autoCommitTimer.Interval = $CommitDelaySeconds * 1000
    $global:autoCommitTimer.AutoReset = $false
    $rootCopy = $ProjectRoot
    Register-ObjectEvent -InputObject $global:autoCommitTimer -EventName Elapsed -Action {
        Unregister-Event -SourceIdentifier $EventArgs.SourceIdentifier -ErrorAction SilentlyContinue
        Set-Location $rootCopy
        Write-Host "[자동커밋] 변경 감지됨. 커밋 실행..." -ForegroundColor Gray
        & "$rootCopy\backup.ps1"
    } | Out-Null
    $global:autoCommitTimer.Start()
}

$null = Register-ObjectEvent -InputObject $watcher -EventName Changed -Action $onChange
$null = Register-ObjectEvent -InputObject $watcher -EventName Created -Action $onChange
$null = Register-ObjectEvent -InputObject $watcher -EventName Deleted -Action $onChange
$null = Register-ObjectEvent -InputObject $watcher -EventName Renamed -Action $onChange

try {
    Write-Host ""
    Write-Host "개발 모드 실행 중. 종료하려면 Ctrl+C 를 누르세요." -ForegroundColor White
    while ($true) { Start-Sleep -Seconds 60 }
} finally {
    $watcher.EnableRaisingEvents = $false
    $watcher.Dispose()
    Get-EventSubscriber | Unregister-Event -ErrorAction SilentlyContinue
    if ($serverJob -and (Get-Job -Id $serverJob.Id -ErrorAction SilentlyContinue)) {
        Stop-Job -Id $serverJob.Id -ErrorAction SilentlyContinue
        Remove-Job -Id $serverJob.Id -Force -ErrorAction SilentlyContinue
        Write-Host "[서버] 종료되었습니다." -ForegroundColor Gray
    }
}
