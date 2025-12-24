<?php
/**
 * File: login.php
 * Mô tả: Xử lý đăng nhập - form và logic xử lý trong cùng một file
 * Chức năng:
 *   - Hiển thị form đăng nhập
 *   - Xử lý POST request đăng nhập
 *   - Kiểm tra email và password
 *   - Tạo session và redirect
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

// Biến lưu thông báo lỗi
$error = '';

// Xử lý form đăng nhập khi submit
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Lấy dữ liệu từ form
    $email = trim($_POST['email'] ?? '');
    $password = $_POST['password'] ?? '';
    
    // Validation
    if (empty($email) || empty($password)) {
        $error = 'Email và mật khẩu không được để trống';
    } elseif (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        $error = 'Định dạng email không hợp lệ';
    } else {
        // Kết nối database
        $conn = getDBConnection();
        
        // Tìm trong bảng Admin trước
        $stmt = $conn->prepare("SELECT 'admin' as user_type, MaAdmin as user_id, HoTen, Email, password FROM Admin WHERE Email = ?");
        if ($stmt) {
            $stmt->bind_param("s", $email);
            $stmt->execute();
            $result = $stmt->get_result();
            $user = $result->fetch_assoc();
            $stmt->close();
        }
        
        // Nếu không tìm thấy trong Admin, tìm trong bảng NhanVien
        if (!$user) {
            $stmt = $conn->prepare("SELECT 'staff' as user_type, MaNV as user_id, HoTen, Email, password, is_approved, is_first_login FROM NhanVien WHERE Email = ?");
            if ($stmt) {
                $stmt->bind_param("s", $email);
                $stmt->execute();
                $result = $stmt->get_result();
                $user = $result->fetch_assoc();
                $stmt->close();
            }
        }
        
        // Kiểm tra user và password
        if ($user && password_verify($password, $user['password'])) {
            $userType = $user['user_type'];
            
            // Nếu là admin
            if ($userType === 'admin') {
                // Regenerate session ID để bảo mật
                session_regenerate_id(true);
                
                // Lưu thông tin vào session
                $_SESSION['user_id'] = $user['user_id'];
                $_SESSION['user_type'] = 'admin';
                $_SESSION['user_role'] = 'admin';
                $_SESSION['user_name'] = $user['HoTen'];
                $_SESSION['is_approved'] = 1;
                $_SESSION['login_time'] = time();
                
                closeDBConnection($conn);
                header('Location: admin.html');
                exit();
            }
            // Nếu là nhân viên
            else if ($userType === 'staff') {
                // Kiểm tra tài khoản đã được duyệt chưa
                if ($user['is_approved'] == 1) {
                    // Kiểm tra lần đăng nhập đầu tiên
                    $isFirstLogin = isset($user['is_first_login']) ? $user['is_first_login'] : 1;
                    
                    // Regenerate session ID để bảo mật
                    session_regenerate_id(true);
                    
                    // Lưu thông tin vào session
                    $_SESSION['user_id'] = $user['user_id'];
                    $_SESSION['user_type'] = 'staff';
                    $_SESSION['user_role'] = 'staff';
                    $_SESSION['user_name'] = $user['HoTen'];
                    $_SESSION['is_approved'] = 1;
                    $_SESSION['is_first_login'] = $isFirstLogin;
                    $_SESSION['login_time'] = time();
                    
                    closeDBConnection($conn);
                    
                    // Nếu là lần đăng nhập đầu, redirect đến trang đổi mật khẩu
                    if ($isFirstLogin == 1) {
                        header('Location: change_password.php');
                    } else {
                        header('Location: staff.html');
                    }
                    exit();
                } else {
                    $error = 'Tài khoản chưa được duyệt. Vui lòng liên hệ admin.';
                }
            }
        } else {
            $error = 'Email hoặc mật khẩu không đúng';
        }
        
        closeDBConnection($conn);
    }
}

// Nếu đã đăng nhập, redirect về trang chủ
if (isset($_SESSION['user_id'])) {
    $userType = $_SESSION['user_type'] ?? 'staff';
    if ($userType === 'admin') {
        header('Location: admin.html');
        exit();
    } else if ($userType === 'staff') {
        // Kiểm tra lần đăng nhập đầu tiên
        if (isset($_SESSION['is_first_login']) && $_SESSION['is_first_login'] == 1) {
            header('Location: change_password.php');
        } else {
            header('Location: staff.html');
        }
        exit();
    }
}
?>
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Đăng Nhập - Hệ Thống Quản Lý Trạm Sạc</title>
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
    </style>
</head>
<body class="login-page">
    <div class="login-container">
        <div class="login-card">
            <div class="login-header">
                <div class="login-icon">
                    <i class="fas fa-bolt"></i>
                </div>
                <h1>Hệ Thống Quản Lý Trạm Sạc</h1>
                <p>Đăng nhập để tiếp tục</p>
            </div>
            
            <?php if ($error): ?>
                <div class="error-message">
                    <i class="fas fa-exclamation-circle"></i>
                    <span><?php echo htmlspecialchars($error); ?></span>
                </div>
            <?php endif; ?>
            
            <form method="POST" action="" class="login-form">
                <div class="form-group">
                    <label for="email">
                        <i class="fas fa-envelope"></i>
                        Email
                    </label>
                    <input 
                        type="email" 
                        id="email" 
                        name="email" 
                        required 
                        autocomplete="email"
                        value="<?php echo isset($_POST['email']) ? htmlspecialchars($_POST['email']) : ''; ?>"
                        placeholder="Nhập email của bạn"
                    >
                </div>
                
                <div class="form-group">
                    <label for="password">
                        <i class="fas fa-lock"></i>
                        Mật khẩu
                    </label>
                    <input 
                        type="password" 
                        id="password" 
                        name="password" 
                        required 
                        autocomplete="current-password"
                        placeholder="Nhập mật khẩu của bạn"
                    >
                    <button type="button" class="toggle-password" onclick="togglePassword()">
                        <i class="fas fa-eye" id="toggle-icon"></i>
                    </button>
                </div>
                
                <button type="submit" class="btn-login">
                    <i class="fas fa-sign-in-alt"></i>
                    <span>Đăng Nhập</span>
                </button>
            </form>
        </div>
    </div>
    
    <script>
        function togglePassword() {
            const passwordInput = document.getElementById('password');
            const toggleIcon = document.getElementById('toggle-icon');
            
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
    </script>
</body>
</html>

