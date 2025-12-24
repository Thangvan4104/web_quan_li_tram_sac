<?php
/**
 * File: config/auth.php
 * Mô tả: Middleware kiểm tra quyền truy cập (RBAC - Role-Based Access Control)
 * Chức năng: 
 *   - Kiểm tra session đăng nhập
 *   - Kiểm tra quyền (admin/staff)
 *   - Kiểm tra trạng thái duyệt (is_approved)
 *   - Cung cấp các hàm tiện ích để kiểm tra quyền
 * Tác giả: Hệ thống quản lý trạm sạc
 */

// Include file cấu hình database để sử dụng các hàm kết nối
require_once __DIR__ . '/database.php';

// ============================================
// HÀM LẤY THÔNG TIN USER HIỆN TẠI
// ============================================

/**
 * Hàm: getCurrentUser()
 * Mô tả: Lấy thông tin user hiện tại từ session
 * @return array|null Thông tin user (MaNV, HoTen, Email, role, is_approved, MaTram) hoặc null nếu chưa đăng nhập
 * Chức năng:
 *   1. Bắt đầu session nếu chưa bắt đầu
 *   2. Kiểm tra xem có session user_id không
 *   3. Nếu có, lấy thông tin user từ database
 *   4. Trả về thông tin user hoặc null
 */
function getCurrentUser() {
    // Bắt đầu session nếu chưa bắt đầu
    // session_status(): Kiểm tra trạng thái session
    // PHP_SESSION_NONE: Session chưa được bắt đầu
    if (session_status() === PHP_SESSION_NONE) {
        // QUAN TRỌNG: Cấu hình session cookie TRƯỚC KHI start session
        // Đảm bảo session cookie được set đúng cách
        ini_set('session.cookie_httponly', 1);
        ini_set('session.cookie_samesite', 'Lax');
        ini_set('session.cookie_lifetime', 86400);
        ini_set('session.use_strict_mode', 1);
        ini_set('session.cookie_path', '/');
        ini_set('session.cookie_domain', '');
        ini_set('session.cookie_secure', 0);
        ini_set('session.gc_maxlifetime', 86400); // 24 giờ - giữ session trong 24 giờ
        session_start();
    }
    
    // Kiểm tra xem có session user_id không
    // isset(): Kiểm tra biến có tồn tại và không null không
    if (!isset($_SESSION['user_id'])) {
        // Nếu chưa đăng nhập, trả về null
        return null;
    }
    
    // Lấy thông tin user từ database
    // getDBConnection(): Hàm kết nối database từ config/database.php
    $conn = getDBConnection();
    
    // Escape string để tránh SQL injection
    // $_SESSION['user_id']: Mã admin hoặc nhân viên đã lưu trong session khi đăng nhập
    $userId = $conn->real_escape_string($_SESSION['user_id']);
    
    // Lấy user_type từ session để biết kiểm tra bảng nào
    $userType = $_SESSION['user_type'] ?? 'staff'; // Mặc định là staff để tương thích
    
    // Kiểm tra user_type để query đúng bảng
    if ($userType === 'admin') {
        // Query từ bảng Admin
        $result = $conn->query("SELECT MaAdmin as MaNV, HoTen, Email, 'admin' as role, 1 as is_approved, NULL as MaTram 
                                FROM Admin 
                                WHERE MaAdmin = '$userId'");
    } else {
        // Query từ bảng NhanVien (staff) - bao gồm ChucVu để kiểm tra trưởng trạm
        $result = $conn->query("SELECT MaNV, HoTen, Email, 'staff' as role, is_approved, MaTram, is_first_login, ChucVu
                                FROM NhanVien 
                                WHERE MaNV = '$userId'");
    }
    
    // Kiểm tra xem có tìm thấy user không
    if ($result && $row = $result->fetch_assoc()) {
        // Đóng kết nối database
        closeDBConnection($conn);
        // Trả về thông tin user dưới dạng mảng
        return $row;
    }
    
    // Nếu không tìm thấy, đóng kết nối và trả về null
    closeDBConnection($conn);
    return null;
}

// ============================================
// HÀM YÊU CẦU ĐĂNG NHẬP
// ============================================

/**
 * Hàm: requireLogin()
 * Mô tả: Yêu cầu user phải đăng nhập và đã được duyệt
 * @return array Thông tin user (MaNV, HoTen, Email, role, is_approved, MaTram)
 * @throws Exception Nếu chưa đăng nhập hoặc chưa được duyệt
 * Chức năng:
 *   1. Gọi getCurrentUser() để lấy thông tin user
 *   2. Nếu chưa đăng nhập, trả về lỗi 401 (Unauthorized)
 *   3. Nếu chưa được duyệt (is_approved != 1), trả về lỗi 403 (Forbidden)
 *   4. Trả về thông tin user nếu hợp lệ
 */
function requireLogin() {
    // Lấy thông tin user hiện tại
    $user = getCurrentUser();
    
    // Kiểm tra xem user có đăng nhập không
    if (!$user) {
        // Nếu chưa đăng nhập, trả về lỗi 401 (Unauthorized)
        // http_response_code(): Thiết lập mã trạng thái HTTP
        http_response_code(401);
        // Trả về JSON error message
        echo json_encode(['error' => 'Chưa đăng nhập'], JSON_UNESCAPED_UNICODE);
        // exit(): Dừng thực thi script
        exit();
    }
    
    // Kiểm tra nhân viên đã được duyệt chưa
    // is_approved = 1: Đã được duyệt, có thể sử dụng hệ thống
    // is_approved = 0: Chờ duyệt, không thể sử dụng hệ thống
    if ($user['is_approved'] != 1) {
        // Nếu chưa được duyệt, trả về lỗi 403 (Forbidden)
        http_response_code(403);
        echo json_encode(['error' => 'Tài khoản chưa được duyệt. Vui lòng liên hệ admin.'], JSON_UNESCAPED_UNICODE);
        exit();
    }
    
    // Nếu hợp lệ, trả về thông tin user
    return $user;
}

// ============================================
// HÀM YÊU CẦU QUYỀN ADMIN
// ============================================

/**
 * Hàm: requireAdmin()
 * Mô tả: Yêu cầu user phải là admin (role = 'admin')
 * @return array Thông tin admin (MaNV, HoTen, Email, role, is_approved, MaTram)
 * @throws Exception Nếu không phải admin
 * Chức năng:
 *   1. Gọi requireLogin() để đảm bảo user đã đăng nhập và được duyệt
 *   2. Kiểm tra role có phải 'admin' không
 *   3. Nếu không phải admin, trả về lỗi 403 (Forbidden)
 *   4. Trả về thông tin admin nếu hợp lệ
 */
function requireAdmin() {
    // Yêu cầu user phải đăng nhập và được duyệt
    $user = requireLogin();
    
    // Kiểm tra role có phải 'admin' không
    // !== : So sánh nghiêm ngặt (cả giá trị và kiểu dữ liệu)
    if ($user['role'] !== 'admin') {
        // Nếu không phải admin, trả về lỗi 403 (Forbidden)
        http_response_code(403);
        echo json_encode(['error' => 'Chỉ admin mới có quyền thực hiện thao tác này'], JSON_UNESCAPED_UNICODE);
        exit();
    }
    
    // Nếu hợp lệ, trả về thông tin admin
    return $user;
}

// ============================================
// HÀM YÊU CẦU QUYỀN STAFF
// ============================================

/**
 * Hàm: requireStaff()
 * Mô tả: Yêu cầu user phải là staff hoặc admin (đã đăng nhập và được duyệt)
 * @return array Thông tin user (MaNV, HoTen, Email, role, is_approved, MaTram)
 * Chức năng:
 *   1. Gọi requireLogin() để đảm bảo user đã đăng nhập và được duyệt
 *   2. Trả về thông tin user (cả admin và staff đều có thể truy cập)
 * Lưu ý: Hàm này không kiểm tra role cụ thể vì cả admin và staff đều có quyền truy cập
 */
function requireStaff() {
    // Yêu cầu user phải đăng nhập và được duyệt
    // Cả admin và staff đều có thể truy cập
    return requireLogin();
}

// ============================================
// HÀM KIỂM TRA QUYỀN SET GIÁ
// ============================================

/**
 * Hàm: canSetPrice()
 * Mô tả: Kiểm tra user có quyền set giá sạc không (chỉ admin)
 * @return bool true nếu có quyền, false nếu không
 * Chức năng:
 *   1. Lấy thông tin user hiện tại
 *   2. Kiểm tra user có tồn tại, role = 'admin' và is_approved = 1 không
 *   3. Trả về true nếu có quyền, false nếu không
 */
function canSetPrice() {
    // Lấy thông tin user hiện tại
    $user = getCurrentUser();
    
    // Kiểm tra user có tồn tại, là admin và đã được duyệt không
    // && : Toán tử AND logic (tất cả điều kiện phải đúng)
    return $user && $user['role'] === 'admin' && $user['is_approved'] == 1;
}

// ============================================
// HÀM KIỂM TRA QUYỀN DUYỆT NHÂN VIÊN
// ============================================

/**
 * Hàm: canApproveStaff()
 * Mô tả: Kiểm tra user có quyền duyệt/khóa nhân viên không (chỉ admin)
 * @return bool true nếu có quyền, false nếu không
 * Chức năng:
 *   1. Lấy thông tin user hiện tại
 *   2. Kiểm tra user có tồn tại, role = 'admin' và is_approved = 1 không
 *   3. Trả về true nếu có quyền, false nếu không
 */
function canApproveStaff() {
    // Lấy thông tin user hiện tại
    $user = getCurrentUser();
    
    // Kiểm tra user có tồn tại, là admin và đã được duyệt không
    return $user && $user['role'] === 'admin' && $user['is_approved'] == 1;
}

// ============================================
// HÀM KIỂM TRA QUYỀN XEM TOÀN BỘ DỮ LIỆU
// ============================================

/**
 * Hàm: canViewAllData()
 * Mô tả: Kiểm tra user có quyền xem toàn bộ dữ liệu không (chỉ admin)
 * @return bool true nếu có quyền, false nếu không
 * Chức năng:
 *   1. Lấy thông tin user hiện tại
 *   2. Kiểm tra user có tồn tại, role = 'admin' và is_approved = 1 không
 *   3. Trả về true nếu có quyền, false nếu không
 */
function canViewAllData() {
    // Lấy thông tin user hiện tại
    $user = getCurrentUser();
    
    // Kiểm tra user có tồn tại, là admin và đã được duyệt không
    return $user && $user['role'] === 'admin' && $user['is_approved'] == 1;
}
?>

