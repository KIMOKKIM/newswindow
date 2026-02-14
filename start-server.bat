@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo.
echo [서버] http://127.0.0.1:8080 에서 실행합니다.
echo 브라우저에서 위 주소를 열어보세요. 종료하려면 이 창에서 Ctrl+C 를 누르세요.
echo.
python -m http.server 8080
pause
