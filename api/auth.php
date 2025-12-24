<?php
/**
 * File: api/auth.php
 * Mô tả: API xử lý đăng xuất và kiểm tra session
 * Chức năng: 
 *   - GET: Kiểm tra session hiện tại
 *   - DELETE: Đăng xuất
 * Lưu ý: Đăng nhập được xử lý trực tiếp trong login.php, không dùng API này
 * Tác giả: Hệ thống quản lý trạm sạc
 */

// ============================================
// CẤU HÌNH PHP
// ============================================

// Tắt hiển thị lỗi để tránh output HTML trước JSON
// Chỉ log lỗi, không hiển thị ra browser
ini_set('display_errors', 0);
ini_set('display_startup_errors', 0);
error_reporting(E_ALL);

// KHÔNG dùng output buffering vì có thể gây vấn đề với JSON response
// Thay vào đó, đảm bảo không có output nào trước JSON

// ============================================
// CẤU HÌNH HEADER HTTP
// ============================================

// Thiết lập Content-Type là JSON với encoding UTF-8
header('Content-Type: application/json; charset=utf-8');

// Include file cấu hình CORS để sử dụng hàm setCORSHeaders()
require_once '../config/cors.php';

// Set CORS headers với origin cụ thể và credentials
setCORSHeaders();

// ============================================
// XỬ LÝ PREFLIGHT REQUEST
// ============================================

// Xử lý preflight request (OPTIONS) cho CORS
// Preflight request: Browser gửi OPTIONS request trước khi gửi request thực sự
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// ============================================
// INCLUDE FILE CẤU HÌNH
// ============================================

// Include file cấu hình database
require_once '../config/database.php';

// Bắt đầu session để lưu trữ thông tin đăng nhập
// session_start(): Bắt đầu hoặc tiếp tục session
// CHỈ gọi nếu session chưa được bắt đầu
if (session_status() === PHP_SESSION_NONE) {
    // Cấu hình session cookie TRƯỚC KHI start session
    // QUAN TRỌNG: Phải set trước session_start() để có hiệu lực
    ini_set('session.cookie_httponly', 1);
    ini_set('session.cookie_samesite', 'Lax');
    ini_set('session.cookie_lifetime', 86400); // 24 giờ
    ini_set('session.use_strict_mode', 1); // Bảo mật: chỉ chấp nhận session ID do server tạo
    ini_set('session.cookie_path', '/'); // Cookie có hiệu lực cho toàn bộ domain
    ini_set('session.cookie_domain', ''); // Cookie có hiệu lực cho domain hiện tại (empty = current domain)
    ini_set('session.cookie_secure', 0); // 0 = cho phép HTTP (không chỉ HTTPS), 1 = chỉ HTTPS
    // QUAN TRỌNG: Set session.gc_maxlifetime để session không bị xóa quá sớm
    ini_set('session.gc_maxlifetime', 86400); // 24 giờ - giữ session trong 24 giờ
    session_start();
}

// ============================================
// XỬ LÝ REQUEST METHOD
// ============================================

// Lấy phương thức HTTP từ request
$method = $_SERVER['REQUEST_METHOD'];

// Tạo kết nối đến database
$conn = getDBConnection();

// ============================================
// XỬ LÝ CÁC PHƯƠNG THỨC HTTP
// ============================================

switch ($method) {
    // ============================================
    // GET: Kiểm tra session
    // ============================================
    case 'GET':
        // QUAN TRỌNG: Đảm bảo session được mở
        // Session đã được mở ở đầu file, nhưng kiểm tra lại để chắc chắn
        if (session_status() === PHP_SESSION_NONE) {
            // Nếu session chưa được mở, mở lại với cấu hình đúng
            ini_set('session.cookie_httponly', 1);
            ini_set('session.cookie_samesite', 'Lax');
            ini_set('session.cookie_lifetime', 86400);
            ini_set('session.use_strict_mode', 1);
            ini_set('session.cookie_path', '/');
            ini_set('session.cookie_domain', '');
            ini_set('session.cookie_secure', 0);
            ini_set('session.gc_maxlifetime', 86400); // 24 giờ
            session_start();
        }
        
        // CORS headers đã được set ở đầu file, không cần set lại
        
        // Debug: Log session status
        // session_id(): Lấy ID của session hiện tại
        // isset($_SESSION['user_id']): Kiểm tra xem có user_id trong session không
        $sessionId = session_id();
        $sessionName = session_name();
        $hasUserId = isset($_SESSION['user_id']);
        $userId = $hasUserId ? $_SESSION['user_id'] : null;
        
        // Debug: Log cookie headers để kiểm tra xem cookie có được gửi không
        $cookieHeader = isset($_SERVER['HTTP_COOKIE']) ? $_SERVER['HTTP_COOKIE'] : 'No Cookie header';
        $hasSessionCookie = strpos($cookieHeader, $sessionName . '=') !== false;
        
        // Kiểm tra xem có session user_id không
        if ($hasUserId) {
            // Refresh session để tránh timeout
            if (session_status() === PHP_SESSION_ACTIVE) {
                // Cập nhật thời gian hoạt động cuối cùng
                $_SESSION['last_activity'] = time();
                
                // Lấy user_type từ session để biết kiểm tra bảng nào
                $userType = $_SESSION['user_type'] ?? 'staff'; // Mặc định là staff để tương thích
                
                // Kiểm tra session timeout (24 giờ)
                if (isset($_SESSION['login_time']) && (time() - $_SESSION['login_time']) > 86400) {
                    // Session đã hết hạn, xóa session
                    session_destroy();
                    echo json_encode([
                        'authenticated' => false,
                        'reason' => 'Session expired'
                    ], JSON_UNESCAPED_UNICODE);
                    break;
                }
            }
            
            // Lấy thông tin user từ database để đảm bảo tính chính xác (sử dụng prepared statement)
            $userId = $_SESSION['user_id'];
            $userType = $_SESSION['user_type'] ?? 'staff'; // Mặc định là staff để tương thích
            
            // Kiểm tra user_type để query đúng bảng
            if ($userType === 'admin') {
                // Query từ bảng Admin
                $stmt = $conn->prepare("SELECT MaAdmin as MaNV, HoTen, Email, 'admin' as role, 1 as is_approved, NULL as MaTram 
                                       FROM Admin 
                                       WHERE MaAdmin = ?");
                if ($stmt) {
                    $stmt->bind_param("s", $userId);
                    $stmt->execute();
                    $result = $stmt->get_result();
                    $user = $result->fetch_assoc();
                    $stmt->close();
                } else {
                    // Fallback nếu prepared statement thất bại
                    $userId = $conn->real_escape_string($userId);
                    $result = $conn->query("SELECT MaAdmin as MaNV, HoTen, Email, 'admin' as role, 1 as is_approved, NULL as MaTram 
                                           FROM Admin 
                                           WHERE MaAdmin = '$userId'");
                    $user = $result->fetch_assoc();
                }
            } else {
                // Query từ bảng NhanVien (staff) - bao gồm ChucVu để kiểm tra trưởng trạm
                $stmt = $conn->prepare("SELECT MaNV, HoTen, Email, 'staff' as role, is_approved, MaTram, is_first_login, ChucVu
                                       FROM NhanVien 
                                       WHERE MaNV = ?");
                if ($stmt) {
                    $stmt->bind_param("s", $userId);
                    $stmt->execute();
                    $result = $stmt->get_result();
                    $user = $result->fetch_assoc();
                    $stmt->close();
                } else {
                    // Fallback nếu prepared statement thất bại
                    $userId = $conn->real_escape_string($userId);
                    $result = $conn->query("SELECT MaNV, HoTen, Email, 'staff' as role, is_approved, MaTram, is_first_login, ChucVu
                                           FROM NhanVien 
                                           WHERE MaNV = '$userId'");
                    $user = $result->fetch_assoc();
                }
            }
            
            // Kiểm tra user có tồn tại và đã được duyệt không
            // Admin luôn có is_approved = 1 (được set trong query)
            if ($user && ($user['is_approved'] == 1 || $userType === 'admin')) {
                // Regenerate session ID định kỳ để tăng bảo mật
                if (isset($_SESSION['last_regenerate'])) {
                    $regenerateInterval = 300; // 5 phút
                    if ((time() - $_SESSION['last_regenerate']) > $regenerateInterval) {
                        session_regenerate_id(true);
                        $_SESSION['last_regenerate'] = time();
                    }
                } else {
                    $_SESSION['last_regenerate'] = time();
                }
                
                // Nếu hợp lệ, trả về thông tin user
                echo json_encode([
                    'authenticated' => true,
                    'user' => $user
                ], JSON_UNESCAPED_UNICODE);
            } else {
                // Nếu không hợp lệ, xóa session và trả về false
                $reason = !$user ? 'User not found' : 'User not approved';
                session_destroy();
                echo json_encode([
                    'authenticated' => false,
                    'reason' => $reason
                ], JSON_UNESCAPED_UNICODE);
            }
        } else {
            // Nếu không có session, trả về false
            echo json_encode([
                'authenticated' => false,
                'reason' => 'No session'
            ], JSON_UNESCAPED_UNICODE);
        }
        break;
    
    // ============================================
    // DELETE: Đăng xuất
    // ============================================
    case 'DELETE':
        // Xóa tất cả dữ liệu session
        $_SESSION = array(); // Xóa tất cả biến session
        
        // Xóa session cookie
        if (ini_get("session.use_cookies")) {
            $params = session_get_cookie_params();
            setcookie(session_name(), '', time() - 42000,
                $params["path"], $params["domain"],
                $params["secure"], $params["httponly"]
            );
        }
        
        // Hủy session
        session_destroy();
        
        // Trả về thông báo thành công
        http_response_code(200);
        echo json_encode([
            'success' => true,
            'message' => 'Đăng xuất thành công'
        ], JSON_UNESCAPED_UNICODE);
        break;
    
    // ============================================
    // DEFAULT: Xử lý phương thức HTTP không được hỗ trợ
    // ============================================
    default:
        // Trả về mã 405 (Method Not Allowed)
        http_response_code(405);
        echo json_encode(['error' => 'Phương thức không được hỗ trợ'], JSON_UNESCAPED_UNICODE);
        break;
}

// ============================================
// ĐÓNG KẾT NỐI DATABASE
// ============================================

// Đóng kết nối database
closeDBConnection($conn);

// Không cần xử lý output buffer vì đã tắt display_errors
// JSON response đã được echo trong switch case
?>

