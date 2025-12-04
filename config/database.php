<?php
/**
 * File: config/database.php
 * Mô tả: File cấu hình kết nối database MySQL
 * Chức năng: Định nghĩa các hằng số kết nối và các hàm quản lý kết nối database
 */

// ============================================
// CẤU HÌNH DATABASE
// ============================================

// Địa chỉ máy chủ database (localhost cho XAMPP)
define('DB_HOST', 'localhost');

// Tên người dùng database (mặc định của XAMPP là 'root')
define('DB_USER', 'root');

// Mật khẩu database (mặc định của XAMPP là rỗng)
// Nếu bạn đã đặt mật khẩu cho MySQL, hãy thay đổi giá trị này
define('DB_PASS', '');

// Tên database chứa dữ liệu trạm sạc
define('DB_NAME', 'charging_station_db');

// ============================================
// HÀM KẾT NỐI DATABASE
// ============================================

/**
 * Hàm: getDBConnection()
 * Mô tả: Tạo và trả về kết nối đến database MySQL
 * @return mysqli|void Đối tượng kết nối MySQL hoặc dừng chương trình nếu lỗi
 */
function getDBConnection() {
    try {
        // Tạo kết nối mới đến MySQL server
        $conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
        
        // Kiểm tra xem kết nối có thành công không
        if ($conn->connect_error) {
            // Nếu lỗi, ném exception với thông báo lỗi
            throw new Exception("Connection failed: " . $conn->connect_error);
        }
        
        // Thiết lập charset UTF-8 để hỗ trợ tiếng Việt
        $conn->set_charset("utf8mb4");
        
        // Trả về đối tượng kết nối
        return $conn;
    } catch (Exception $e) {
        // Nếu có lỗi, dừng chương trình và hiển thị thông báo lỗi
        die("Database connection error: " . $e->getMessage());
    }
}

/**
 * Hàm: closeDBConnection($conn)
 * Mô tả: Đóng kết nối database
 * @param mysqli $conn Đối tượng kết nối MySQL cần đóng
 * @return void
 */
function closeDBConnection($conn) {
    // Kiểm tra xem kết nối có tồn tại không
    if ($conn) {
        // Đóng kết nối
        $conn->close();
    }
}
?>

