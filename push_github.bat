@echo off
chcp 65001 >nul
echo ========================================
echo PUSH CODE LEN GITHUB
echo ========================================
echo.

REM Xóa remote cũ và thêm lại với HTTPS
"C:\Program Files\Git\bin\git.exe" remote remove origin
"C:\Program Files\Git\bin\git.exe" remote add origin https://github.com/Thangvan4104/web_quan_li_tram_sac.git

echo Dang push code len GitHub...
echo.
echo Luu y: Neu hoi username va password:
echo - Username: Thangvan4104
echo - Password: Su dung Personal Access Token (khong phai mat khau GitHub)
echo.
echo Tao token tai: https://github.com/settings/tokens
echo.
pause

"C:\Program Files\Git\bin\git.exe" push -u origin main

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo [SUCCESS] Da push code thanh cong len GitHub!
    echo ========================================
    echo.
    echo Xem code tai: https://github.com/Thangvan4104/web_quan_li_tram_sac
) else (
    echo.
    echo ========================================
    echo [ERROR] Co loi xay ra khi push!
    echo ========================================
)

pause

