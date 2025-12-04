<?php
/**
 * File: api/stats.php
 * Mô tả: API endpoint để lấy thống kê tổng quan về trạm sạc
 * Chức năng: Tính toán và trả về các số liệu thống kê từ database
 */

// ============================================
// CẤU HÌNH HEADER HTTP
// ============================================

// Thiết lập Content-Type là JSON với encoding UTF-8
header('Content-Type: application/json; charset=utf-8');

// Cho phép tất cả các domain truy cập API (CORS)
header('Access-Control-Allow-Origin: *');

// Include file cấu hình database
require_once '../config/database.php';

// ============================================
// KẾT NỐI DATABASE
// ============================================

// Tạo kết nối đến database
$conn = getDBConnection();

// ============================================
// TÍNH TOÁN THỐNG KÊ
// ============================================

// Khởi tạo mảng để chứa các số liệu thống kê
$stats = [];

// Thống kê 1: Tổng số trạm sạc
// Đếm tổng số bản ghi trong bảng charging_stations
$result = $conn->query("SELECT COUNT(*) as total FROM charging_stations");
$stats['total_stations'] = $result->fetch_assoc()['total'];

// Thống kê 2: Số trạm đang hoạt động
// Đếm số trạm có status = 'active'
$result = $conn->query("SELECT COUNT(*) as total FROM charging_stations WHERE status = 'active'");
$stats['active_stations'] = $result->fetch_assoc()['total'];

// Thống kê 3: Tổng số cổng sạc
// Tính tổng của cột total_ports từ tất cả các trạm
$result = $conn->query("SELECT SUM(total_ports) as total FROM charging_stations");
// Sử dụng ?? để đặt giá trị mặc định là 0 nếu kết quả là NULL
$stats['total_ports'] = $result->fetch_assoc()['total'] ?? 0;

// Thống kê 4: Số cổng sạc còn trống
// Tính tổng của cột available_ports từ tất cả các trạm
$result = $conn->query("SELECT SUM(available_ports) as total FROM charging_stations");
$stats['available_ports'] = $result->fetch_assoc()['total'] ?? 0;

// Thống kê 5: Số trạm theo từng trạng thái
// Nhóm các trạm theo status và đếm số lượng mỗi nhóm
$result = $conn->query("SELECT status, COUNT(*) as count FROM charging_stations GROUP BY status");
$stats['by_status'] = [];

// Duyệt qua từng dòng kết quả
while ($row = $result->fetch_assoc()) {
    // Lưu số lượng trạm theo từng trạng thái (active, maintenance, inactive)
    $stats['by_status'][$row['status']] = $row['count'];
}

// ============================================
// TRẢ VỀ KẾT QUẢ
// ============================================

// Đóng kết nối database
closeDBConnection($conn);

// Trả về dữ liệu thống kê dưới dạng JSON với UTF-8 encoding
echo json_encode($stats, JSON_UNESCAPED_UNICODE);
?>

