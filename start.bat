@echo off
:: KidZone - Khoi chay bo cong cu hoc tap tuong tac
:: Chi can chay file nay de bat dau!

set PORT=8080
echo.
echo   ======================================
echo      KIDZONE - HOC TAP TUONG TAC
echo      Bo cong cu cho tre em 3-8 tuoi
echo   ======================================
echo.
echo   Dang khoi chay tai: http://localhost:%PORT%
echo   Nhan Ctrl+C de dung.
echo.

cd /d "%~dp0"
python -m http.server %PORT%
if errorlevel 1 (
    echo   Loi: Khong tim thay Python.
    echo   Vui long cai dat Python hoac mo bang Live Server.
    pause
)
