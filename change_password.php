<?php
/**
 * File: change_password.php
 * Mô tả: Trang đổi mật khẩu cho nhân viên lần đăng nhập đầu tiên
 * Chức năng:
 *   - Hiển thị form đổi mật khẩu
 *   - Xử lý POST request đổi mật khẩu
 *   - Chỉ cho phép nhân viên đổi mật khẩu lần đầu
 */

// Include file cấu hình database
require_once 'config/database.php';

// Bắt đầu session
if (session_status() === PHP_SESSION_NONE) {
    ini_set('session.cookie_httponly', 1);
    ini_set('session.cookie_samesite', 'Lax');
    ini_set('session.cookie_lifetime', 86400);
    ini_set('session.use_strict_mode', 1);
    ini_set('session.cookie_path', '/');
    ini_set('session.cookie_domain', '');
    ini_set('session.cookie_secure', 0);
    ini_set('session.gc_maxlifetime', 86400);
    session_start();
}

// Kiểm tra đã đăng nhập và là nhân viên lần đầu đăng nhập
if (!isset($_SESSION['user_id']) || !isset($_SESSION['user_type']) || $_SESSION['user_type'] !== 'staff') {
    header('Location: login.php');
    exit();
}

if (!isset($_SESSION['is_first_login']) || $_SESSION['is_first_login'] != 1) {
    // Nếu không phải lần đăng nhập đầu, redirect về staff.html
    header('Location: staff.html');
    exit();
}

// Biến lưu thông báo lỗi và thành công
$error = '';
$success = '';

// Xử lý form đổi mật khẩu khi submit
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $newPassword = $_POST['new_password'] ?? '';
    $confirmPassword = $_POST['confirm_password'] ?? '';
    
    // Validation
    if (empty($newPassword) || empty($confirmPassword)) {
        $error = 'Vui lòng nhập đầy đủ mật khẩu mới và xác nhận mật khẩu';
    } elseif (strlen($newPassword) < 6) {
        $error = 'Mật khẩu phải có ít nhất 6 ký tự';
    } elseif ($newPassword !== $confirmPassword) {
        $error = 'Mật khẩu xác nhận không khớp';
    } else {
        // Kết nối database
        $conn = getDBConnection();
        
        // Cập nhật mật khẩu mới
        $userId = $_SESSION['user_id'];
        $hashedPassword = password_hash($newPassword, PASSWORD_DEFAULT);
        
        $stmt = $conn->prepare("UPDATE NhanVien SET password = ?, is_first_login = 0 WHERE MaNV = ?");
        if ($stmt) {
            $stmt->bind_param("ss", $hashedPassword, $userId);
            if ($stmt->execute()) {
                // Cập nhật session
                $_SESSION['is_first_login'] = 0;
                
                $stmt->close();
                closeDBConnection($conn);
                
                // Redirect về staff.html
                header('Location: staff.html');
                exit();
            } else {
                $error = 'Có lỗi xảy ra khi cập nhật mật khẩu. Vui lòng thử lại.';
            }
            $stmt->close();
        } else {
            $error = 'Lỗi kết nối database. Vui lòng thử lại sau.';
        }
        
        closeDBConnection($conn);
    }
}
?>
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Đổi Mật Khẩu - Hệ Thống Quản Lý Trạm Sạc</title>
    <link rel="stylesheet" href="assets/css/login.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        .error-message {
            background-color: #fee;
            border: 1px solid #fcc;
            color: #c33;
            padding: 12px;
            border-radius: 8px;
            margin-bottom: 20px;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .success-message {
            background-color: #efe;
            border: 1px solid #cfc;
            color: #3c3;
            padding: 12px;
            border-radius: 8px;
            margin-bottom: 20px;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .info-box {
            background-color: #e3f2fd;
            border: 1px solid #90caf9;
            color: #1976d2;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 20px;
        }
    </style>
</head>
<body class="login-page">
    <div class="login-container">
        <div class="login-card">
            <div class="login-header">
                <div class="login-icon">
                    <i class="fas fa-key"></i>
                </div>
                <h1>Đổi Mật Khẩu</h1>
                <p>Đây là lần đăng nhập đầu tiên của bạn. Vui lòng đổi mật khẩu mặc định</p>
            </div>
            
            <div class="info-box">
                <i class="fas fa-info-circle"></i>
                <span>Mật khẩu phải có ít nhất 6 ký tự</span>
            </div>
            
            <?php if ($error): ?>
                <div class="error-message">
                    <i class="fas fa-exclamation-circle"></i>
                    <span><?php echo htmlspecialchars($error); ?></span>
                </div>
            <?php endif; ?>
            
            <?php if ($success): ?>
                <div class="success-message">
                    <i class="fas fa-check-circle"></i>
                    <span><?php echo htmlspecialchars($success); ?></span>
                </div>
            <?php endif; ?>
            
            <form method="POST" action="" class="login-form">
                <div class="form-group">
                    <label for="new_password">
                        <i class="fas fa-lock"></i>
                        Mật khẩu mới
                    </label>
                    <div class="password-wrapper">
                        <input 
                            type="password" 
                            id="new_password" 
                            name="new_password" 
                            required 
                            minlength="6"
                            autocomplete="new-password"
                            placeholder="Nhập mật khẩu mới (tối thiểu 6 ký tự)"
                        >
                        <span class="toggle-password" onclick="togglePassword('new_password', 'toggle-icon-new')">
                            <i class="fas fa-eye" id="toggle-icon-new"></i>
                        </span>
                    </div>
                </div>
                
                <div class="form-group">
                    <label for="confirm_password">
                        <i class="fas fa-lock"></i>
                        Xác nhận mật khẩu
                    </label>
                    <div class="password-wrapper">
                        <input 
                            type="password" 
                            id="confirm_password" 
                            name="confirm_password" 
                            required 
                            minlength="6"
                            autocomplete="new-password"
                            placeholder="Nhập lại mật khẩu mới"
                        >
                        <span class="toggle-password" onclick="togglePassword('confirm_password', 'toggle-icon-confirm')">
                            <i class="fas fa-eye" id="toggle-icon-confirm"></i>
                        </span>
                    </div>
                </div>
                
                <button type="submit" class="btn btn-primary btn-block">
                    <i class="fas fa-save"></i>
                    <span>Đổi Mật Khẩu</span>
                </button>
            </form>
        </div>
    </div>
    
    <script>
        function togglePassword(inputId, iconId) {
            const passwordInput = document.getElementById(inputId);
            const toggleIcon = document.getElementById(iconId);
            
            if (passwordInput && toggleIcon) {
                if (passwordInput.type === 'password') {
                    passwordInput.type = 'text';
                    toggleIcon.classList.remove('fa-eye');
                    toggleIcon.classList.add('fa-eye-slash');
                } else {
                    passwordInput.type = 'password';
                    toggleIcon.classList.remove('fa-eye-slash');
                    toggleIcon.classList.add('fa-eye');
                }
            }
        }
    </script>
</body>
</html>

