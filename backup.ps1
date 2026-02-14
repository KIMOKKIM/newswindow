# 뉴스의창 프로젝트 - GitHub 백업 스크립트
# 사용법: PowerShell에서 .\backup.ps1 실행 (또는 코딩 마칠 때 실행)

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

# Git 저장소 확인
if (-not (Test-Path .git)) {
    Write-Host "Git이 초기화되어 있지 않습니다. git init 실행 중..."
    git init
}

# 변경사항 확인
$status = git status --porcelain
if (-not $status) {
    Write-Host "커밋할 변경사항이 없습니다."
    exit 0
}

# 커밋 메시지 (날짜/시간 포함)
$msg = "Backup: " + (Get-Date -Format "yyyy-MM-dd HH:mm")

git add -A
git commit -m $msg

# 원격 저장소가 있으면 push
$remote = git remote get-url origin 2>$null
if ($remote) {
    git push origin HEAD
    Write-Host "GitHub 백업 완료: $msg"
} else {
    Write-Host "커밋 완료. GitHub에 백업하려면 먼저 원격 저장소를 연결하세요:"
    Write-Host "  1. https://github.com 에서 새 저장소 생성"
    Write-Host "  2. git remote add origin https://github.com/사용자명/저장소명.git"
    Write-Host "  3. 다시 .\backup.ps1 실행"
}
