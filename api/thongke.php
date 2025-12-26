<?php
/**
 * File: api/thongke.php
 * Mô tả: API endpoint để lấy thống kê doanh thu chi tiết
 * Chức năng: 
 *   - GET: Lấy thống kê doanh thu theo ngày, tháng, năm
 *   - Hỗ trợ lọc theo trạm cho nhân viên
 * Tác giả: Hệ thống quản lý trạm sạc
 */

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
// INCLUDE FILE CẤU HÌNH
// ============================================

// Include file cấu hình database
require_once '../config/database.php';

// Include file cấu hình auth để kiểm tra quyền truy cập
require_once '../config/auth.php';

// ============================================
// XỬ LÝ REQUEST METHOD
// ============================================

// Lấy phương thức HTTP từ request
$method = $_SERVER['REQUEST_METHOD'];

// Xử lý preflight request (OPTIONS) cho CORS
if ($method === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// ============================================
// KIỂM TRA QUYỀN TRUY CẬP
// ============================================

// Kiểm tra user đã đăng nhập và được duyệt
$user = requireStaff();

// Tạo kết nối đến database
$conn = getDBConnection();

// ============================================
// XỬ LÝ CÁC PHƯƠNG THỨC HTTP
// ============================================

switch ($method) {
    // ============================================
    // GET: Lấy thống kê doanh thu
    // ============================================
    case 'GET':
        // Kiểm tra xem có tham số type trong URL không
        $type = isset($_GET['type']) ? $conn->real_escape_string($_GET['type']) : 'daily';
        // type có thể là: daily (theo ngày), monthly (theo tháng), yearly (theo năm)
        
        // Kiểm tra quyền: Nếu là staff, chỉ lấy thống kê của trạm mình
        $isAdmin = ($user['role'] === 'admin');
        $userMaTram = $user['MaTram'] ?? null;
        
        // Xây dựng điều kiện WHERE cho lọc theo trạm
        $whereClause = "";
        if (!$isAdmin && $userMaTram) {
            // Staff chỉ thấy thống kê của trạm mình
            // Cần JOIN với PhienSac và CotSac để lấy MaTram
            $userMaTram = $conn->real_escape_string($userMaTram);
            $whereClause = "AND c.MaTram = '$userMaTram'";
        }
        
        $result = [];
        
        if ($type === 'daily') {
            // Thống kê doanh thu theo ngày (30 ngày gần nhất)
            $query = "SELECT 
                        DATE(hd.NgayLap) as ngay,
                        SUM(hd.SoTien) as tongTien,
                        COUNT(hd.MaHD) as soHoaDon
                      FROM HoaDon hd
                      LEFT JOIN PhienSac ps ON hd.MaPhien = ps.MaPhien
                      LEFT JOIN CotSac c ON ps.MaCot = c.MaCot
                      WHERE hd.NgayLap >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
                      $whereClause
                      GROUP BY DATE(hd.NgayLap)
                      ORDER BY ngay ASC";
            
            $sqlResult = $conn->query($query);
            while ($row = $sqlResult->fetch_assoc()) {
                $result[] = [
                    'ngay' => $row['ngay'],
                    'tongTien' => floatval($row['tongTien']),
                    'soHoaDon' => intval($row['soHoaDon'])
                ];
            }
        } elseif ($type === 'monthly') {
            // Thống kê doanh thu theo tháng (12 tháng gần nhất) - chia theo loại cột sạc
            $query = "SELECT 
                        DATE_FORMAT(hd.NgayLap, '%Y-%m') as thang,
                        DATE_FORMAT(hd.NgayLap, '%m/%Y') as thangHienThi,
                        COALESCE(c.LoaiCongSac, 'Không xác định') as loaiCongSac,
                        SUM(hd.SoTien) as tongTien,
                        COUNT(hd.MaHD) as soHoaDon
                      FROM HoaDon hd
                      LEFT JOIN PhienSac ps ON hd.MaPhien = ps.MaPhien
                      LEFT JOIN CotSac c ON ps.MaCot = c.MaCot
                      WHERE hd.NgayLap >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
                      $whereClause
                      GROUP BY DATE_FORMAT(hd.NgayLap, '%Y-%m'), c.LoaiCongSac
                      ORDER BY thang ASC, loaiCongSac ASC";
            
            $sqlResult = $conn->query($query);
            $monthlyData = [];
            while ($row = $sqlResult->fetch_assoc()) {
                $thang = $row['thang'];
                $loaiCongSac = $row['loaiCongSac'] ?? 'Không xác định';
                
                if (!isset($monthlyData[$thang])) {
                    $monthlyData[$thang] = [
                        'thang' => $thang,
                        'thangHienThi' => $row['thangHienThi'],
                        'tongTien' => 0,
                        'soHoaDon' => 0,
                        'chiTiet' => []
                    ];
                }
                
                $monthlyData[$thang]['tongTien'] += floatval($row['tongTien']);
                $monthlyData[$thang]['soHoaDon'] += intval($row['soHoaDon']);
                $monthlyData[$thang]['chiTiet'][$loaiCongSac] = [
                    'tongTien' => floatval($row['tongTien']),
                    'soHoaDon' => intval($row['soHoaDon'])
                ];
            }
            
            // Chuyển đổi sang array
            foreach ($monthlyData as $data) {
                $result[] = $data;
            }
        } elseif ($type === 'yearly') {
            // Thống kê doanh thu theo năm (5 năm gần nhất)
            $query = "SELECT 
                        YEAR(hd.NgayLap) as nam,
                        SUM(hd.SoTien) as tongTien,
                        COUNT(hd.MaHD) as soHoaDon
                      FROM HoaDon hd
                      LEFT JOIN PhienSac ps ON hd.MaPhien = ps.MaPhien
                      LEFT JOIN CotSac c ON ps.MaCot = c.MaCot
                      WHERE hd.NgayLap >= DATE_SUB(CURDATE(), INTERVAL 5 YEAR)
                      $whereClause
                      GROUP BY YEAR(hd.NgayLap)
                      ORDER BY nam ASC";
            
            $sqlResult = $conn->query($query);
            while ($row = $sqlResult->fetch_assoc()) {
                $result[] = [
                    'nam' => intval($row['nam']),
                    'tongTien' => floatval($row['tongTien']),
                    'soHoaDon' => intval($row['soHoaDon'])
                ];
            }
        } else {
            http_response_code(400);
            echo json_encode(['error' => 'Loại thống kê không hợp lệ. Sử dụng: daily, monthly, yearly'], JSON_UNESCAPED_UNICODE);
            break;
        }
        
        // Trả về kết quả
        echo json_encode($result, JSON_UNESCAPED_UNICODE);
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
?>

