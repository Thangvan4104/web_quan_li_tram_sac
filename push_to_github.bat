@echo off
REM Script để push code lên GitHub
REM Chạy file này bằng cách double-click hoặc chạy trong Command Prompt

echo ========================================
echo PUSH CODE LEN GITHUB
echo ========================================
echo.

REM Kiểm tra xem có git không
where git >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Git chua duoc cai dat hoac khong co trong PATH!
    echo.
    echo Vui long:
    echo 1. Cai dat Git tu: https://git-scm.com/download/win
    echo 2. Hoac them Git vao PATH
    echo 3. Khoi dong lai terminal va chay lai script nay
    pause
    exit /b 1
)

echo [OK] Git da duoc cai dat
echo.

REM Khởi tạo git repository nếu chưa có
if not exist ".git" (
    echo Dang khoi tao git repository...
    git init
    echo.
)

REM Kiểm tra remote đã được thêm chưa
git remote get-url origin >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Dang them remote repository...
    git remote add origin git@github.com:Thangvan4104/web_quan_li_tram_sac.git
    echo [OK] Da them remote origin
    echo.
)

REM Thêm tất cả file
echo Dang them cac file vao staging area...
git add .
echo [OK] Da them cac file
echo.

REM Commit
echo Dang commit...
git commit -m "Update: Hệ thống quản lý trạm sạc với đầy đủ chú thích"
if %ERRORLEVEL% NEQ 0 (
    echo [WARNING] Khong co thay doi nao de commit hoac da commit roi
    echo.
)

REM Đổi tên branch thành main nếu đang ở master
git branch -M main 2>nul

REM Push lên GitHub
echo.
echo Dang push code len GitHub...
echo.
git push -u origin main

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo [SUCCESS] Da push code thanh cong len GitHub!
    echo ========================================
) else (
    echo.
    echo ========================================
    echo [ERROR] Co loi xay ra khi push!
    echo.
    echo Kiem tra:
    echo 1. SSH key da duoc cau hinh voi GitHub chua?
    echo 2. Repository da duoc tao tren GitHub chua?
    echo 3. Ban co quyen truy cap vao repository khong?
    echo.
    echo Neu chua co SSH key, co the dung HTTPS:
    echo   git remote set-url origin https://github.com/Thangvan4104/web_quan_li_tram_sac.git
    echo ========================================
)

echo.
pause

