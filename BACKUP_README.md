# GitHub 백업 / 개발 모드

## 자동 개발 모드 (권장)

**로컬 서버 상시 실행 + 코딩 끝날 때마다 자동 커밋**을 한 번에 쓰려면:

```powershell
cd c:\Users\elini\Desktop\kkm
.\start-dev.ps1
```

- **로컬 서버**: http://127.0.0.1:5500 이 자동으로 켜집니다. (이미 켜져 있으면 그대로 사용)
- **자동 커밋**: 파일을 수정한 뒤 **60초 동안 추가 수정이 없으면** 자동으로 `backup.ps1`이 실행되어 커밋 후 GitHub에 push 합니다.
- 이 터미널 창을 **닫지 마세요**. 닫으면 자동 커밋만 멈추고, 서버는 별도 창에서 계속 실행됩니다.
- 종료하려면 이 창에서 **Ctrl+C** 를 누르세요.

---

## 1. 처음 한 번만 설정 (원격 저장소 연결)

1. **GitHub에서 저장소 만들기**
   - https://github.com/new 접속
   - 저장소 이름 예: `kkm` 또는 `news-window`
   - "Create repository" 클릭

2. **프로젝트 폴더에서 원격 연결**
   ```powershell
   cd c:\Users\elini\Desktop\kkm
   git remote add origin https://github.com/본인아이디/저장소이름.git
   ```

3. **첫 백업**
   ```powershell
   .\backup.ps1
   ```

## 2. 코딩 끝날 때마다 백업

PowerShell에서 프로젝트 폴더로 이동한 뒤:

```powershell
cd c:\Users\elini\Desktop\kkm
.\backup.ps1
```

또는 Cursor 터미널에서 `.\backup.ps1` 만 실행하면 됩니다.

- 변경사항이 있으면 자동으로 커밋 후 GitHub에 push 합니다.
- 변경사항이 없으면 "커밋할 변경사항이 없습니다"만 표시됩니다.

## 실행 정책 오류가 나올 때

"스크립트를 실행할 수 없습니다" 메시지가 나오면:

```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

한 번 실행한 뒤 다시 `.\backup.ps1`을 실행하세요.
