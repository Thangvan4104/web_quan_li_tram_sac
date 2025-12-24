<?php
/**
 * File: api/hoadon.php
 * Mô tả: API endpoint để quản lý hóa đơn (CRUD operations)
 * Chức năng: Xử lý các request GET, POST, PUT, DELETE cho hóa đơn
 * Bảng dữ liệu: HoaDon
 * Quan hệ: 
 *   - 1-1 với PhienSac (1 phiên sạc sinh ra 1 hóa đơn)
 *   - 1-N với ThanhToan (1 hóa đơn có thể có nhiều thanh toán)
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
// requireStaff(): Yêu cầu user phải là staff hoặc admin, đã đăng nhập và được duyệt
$user = requireStaff();

// Tạo kết nối đến database
$conn = getDBConnection();

// ============================================
// XỬ LÝ CÁC PHƯƠNG THỨC HTTP
// ============================================

switch ($method) {
    // ============================================
    // GET: Lấy danh sách hoặc chi tiết hóa đơn
    // ============================================
    case 'GET':
        // Kiểm tra xem có tham số id trong URL không (lấy một hóa đơn cụ thể)
        if (isset($_GET['id'])) {
            // Escape string để tránh SQL injection
            $id = $conn->real_escape_string($_GET['id']);
            
            // Câu lệnh SQL với nhiều LEFT JOIN để lấy đầy đủ thông tin
            // hd.*: Lấy tất cả cột từ bảng HoaDon (alias hd)
            // ps.MaPhien, ps.ThoiGianBatDau, ps.ThoiGianKetThuc, ps.DienTieuThu: Thông tin phiên sạc
            // pt.BienSo, pt.DongXe: Thông tin phương tiện
            // kh.HoTen as TenKhachHang: Tên khách hàng
            $result = $conn->query("SELECT hd.*, 
                                    ps.MaPhien, ps.ThoiGianBatDau, ps.ThoiGianKetThuc, ps.DienTieuThu,
                                    pt.BienSo, pt.DongXe,
                                    kh.HoTen as TenKhachHang
                                    FROM HoaDon hd
                                    LEFT JOIN PhienSac ps ON hd.MaPhien = ps.MaPhien
                                    LEFT JOIN PhuongTien pt ON ps.BienSoPT = pt.BienSo
                                    LEFT JOIN KhachHang kh ON pt.MaKH = kh.MaKH
                                    WHERE hd.MaHD = '$id'");
            
            // Lấy dòng dữ liệu đầu tiên
            $hd = $result->fetch_assoc();
            
            // Kiểm tra xem có tìm thấy hóa đơn không
            if ($hd) {
                // Lấy danh sách thanh toán của hóa đơn này
                // SELECT *: Lấy tất cả giao dịch thanh toán
                // WHERE MaHD = '$id': Lọc theo mã hóa đơn
                $ttResult = $conn->query("SELECT * FROM ThanhToan WHERE MaHD = '$id'");
                
                // Khởi tạo mảng để chứa danh sách thanh toán
                $hd['ThanhToan'] = [];
                
                // Duyệt qua từng giao dịch thanh toán
                while ($row = $ttResult->fetch_assoc()) {
                    // Thêm mỗi giao dịch thanh toán vào mảng
                    $hd['ThanhToan'][] = $row;
                }
                
                // Trả về dữ liệu hóa đơn kèm danh sách thanh toán dưới dạng JSON
                echo json_encode($hd, JSON_UNESCAPED_UNICODE);
            } else {
                // Nếu không tìm thấy, trả về lỗi 404
                http_response_code(404);
                echo json_encode(['error' => 'Hóa đơn không tồn tại'], JSON_UNESCAPED_UNICODE);
            }
        } else {
            // Nếu không có id, lấy tất cả hóa đơn
            // Nếu là staff (không phải admin), chỉ lấy hóa đơn của trạm nhân viên đó
            // Admin có thể lọc theo trạm bằng tham số matram
            
            // Kiểm tra xem user có phải admin không
            $isAdmin = ($user['role'] === 'admin');
            $userMaTram = $user['MaTram'] ?? null;
            
            // Xây dựng điều kiện WHERE
            $whereClause = "";
            if (!$isAdmin && $userMaTram) {
                // Staff chỉ thấy hóa đơn của trạm mình (thông qua cột sạc)
                $userMaTram = $conn->real_escape_string($userMaTram);
                $whereClause = "WHERE c.MaTram = '$userMaTram'";
            } else if ($isAdmin && isset($_GET['matram']) && !empty($_GET['matram'])) {
                // Admin có thể lọc theo trạm
                $filterMaTram = $conn->real_escape_string($_GET['matram']);
                $whereClause = "WHERE c.MaTram = '$filterMaTram'";
            }
            
            // Câu lệnh SQL lấy tất cả hóa đơn CHƯA THANH TOÁN với thông tin liên quan
            // Chỉ hiển thị hóa đơn có tổng số tiền đã thanh toán < SoTien hoặc chưa có thanh toán nào
            // ORDER BY hd.NgayLap DESC: Sắp xếp theo ngày lập, mới nhất trước
            $result = $conn->query("SELECT hd.*, 
                                    ps.ThoiGianBatDau, c.MaTram,
                                    kh.HoTen as TenKhachHang,
                                    COALESCE(SUM(tt.SoTien), 0) as DaThanhToan
                                    FROM HoaDon hd
                                    LEFT JOIN PhienSac ps ON hd.MaPhien = ps.MaPhien
                                    LEFT JOIN CotSac c ON ps.MaCot = c.MaCot
                                    LEFT JOIN PhuongTien pt ON ps.BienSoPT = pt.BienSo
                                    LEFT JOIN KhachHang kh ON pt.MaKH = kh.MaKH
                                    LEFT JOIN ThanhToan tt ON hd.MaHD = tt.MaHD
                                    $whereClause
                                    GROUP BY hd.MaHD
                                    HAVING COALESCE(SUM(tt.SoTien), 0) < hd.SoTien
                                    ORDER BY hd.NgayLap DESC");
            
            // Khởi tạo mảng để chứa danh sách hóa đơn
            $hds = [];
            
            // Duyệt qua từng dòng kết quả
            while ($row = $result->fetch_assoc()) {
                // Thêm mỗi hóa đơn vào mảng
                $hds[] = $row;
            }
            
            // Trả về danh sách dưới dạng JSON
            echo json_encode($hds, JSON_UNESCAPED_UNICODE);
        }
        break;
        
    // ============================================
    // POST: Tạo hóa đơn mới
    // ============================================
    case 'POST':
        // Đọc dữ liệu JSON từ request body
        $data = json_decode(file_get_contents('php://input'), true);
        
        // Lấy các giá trị từ dữ liệu JSON và escape
        $mahd = $conn->real_escape_string($data['MaHD'] ?? '');                    // Mã hóa đơn (CHAR(5))
        // Ngày lập: Nếu không có thì dùng ngày hiện tại
        // date('Y-m-d'): Định dạng ngày MySQL (YYYY-MM-DD)
        $ngaylap = $conn->real_escape_string($data['NgayLap'] ?? date('Y-m-d'));
        $sotien = floatval($data['SoTien'] ?? 0);                                  // Số tiền (VNĐ) - chuyển sang float
        $maphien = $conn->real_escape_string($data['MaPhien'] ?? '');             // Mã phiên sạc liên quan (Foreign Key, UNIQUE)
        
        // Chuẩn bị câu lệnh SQL INSERT
        // "ssds": string, string, double, string
        $stmt = $conn->prepare("INSERT INTO HoaDon (MaHD, NgayLap, SoTien, MaPhien) VALUES (?, ?, ?, ?)");
        
        // Bind các tham số
        $stmt->bind_param("ssds", $mahd, $ngaylap, $sotien, $maphien);
        
        // Thực thi câu lệnh
        if ($stmt->execute()) {
            // Nếu tạo hóa đơn thành công, cập nhật MaHoaDon trong bảng PhienSac
            // Mục đích: Tạo liên kết 1-1 giữa phiên sạc và hóa đơn
            $conn->query("UPDATE PhienSac SET MaHoaDon = '$mahd' WHERE MaPhien = '$maphien'");
            
            // Trả về mã 201 (Created)
            http_response_code(201);
            echo json_encode(['message' => 'Tạo hóa đơn thành công'], JSON_UNESCAPED_UNICODE);
        } else {
            // Nếu thất bại, trả về mã 400 và thông báo lỗi
            http_response_code(400);
            echo json_encode(['error' => 'Không thể tạo hóa đơn: ' . $stmt->error], JSON_UNESCAPED_UNICODE);
        }
        
        // Đóng statement
        $stmt->close();
        break;
        
    // ============================================
    // PUT: Cập nhật thông tin hóa đơn
    // ============================================
    case 'PUT':
        // Đọc dữ liệu JSON từ request body
        $data = json_decode(file_get_contents('php://input'), true);
        
        // Lấy mã hóa đơn cần cập nhật
        $mahd = $conn->real_escape_string($data['MaHD'] ?? '');
        
        // Lấy các giá trị cần cập nhật
        $ngaylap = $conn->real_escape_string($data['NgayLap'] ?? '');
        $sotien = floatval($data['SoTien'] ?? 0);
        $maphien = $conn->real_escape_string($data['MaPhien'] ?? '');
        
        // Chuẩn bị câu lệnh SQL UPDATE
        // "sds": string, double, string, string
        $stmt = $conn->prepare("UPDATE HoaDon SET NgayLap=?, SoTien=?, MaPhien=? WHERE MaHD=?");
        
        // Bind các tham số
        $stmt->bind_param("sds", $ngaylap, $sotien, $maphien, $mahd);
        
        // Thực thi câu lệnh
        if ($stmt->execute()) {
            // Nếu thành công, trả về thông báo thành công
            echo json_encode(['message' => 'Cập nhật hóa đơn thành công'], JSON_UNESCAPED_UNICODE);
        } else {
            // Nếu thất bại, trả về lỗi
            http_response_code(400);
            echo json_encode(['error' => 'Không thể cập nhật hóa đơn'], JSON_UNESCAPED_UNICODE);
        }
        
        // Đóng statement
        $stmt->close();
        break;
        
    // ============================================
    // DELETE: Xóa hóa đơn
    // ============================================
    case 'DELETE':
        // Lấy ID của hóa đơn cần xóa từ tham số URL
        $id = $conn->real_escape_string($_GET['id'] ?? '');
        
        // Kiểm tra tính hợp lệ của ID
        if (empty($id)) {
            // Nếu ID không hợp lệ, trả về lỗi 400
            http_response_code(400);
            echo json_encode(['error' => 'Mã hóa đơn không hợp lệ'], JSON_UNESCAPED_UNICODE);
            break; // Dừng xử lý
        }
        
        // Chuẩn bị câu lệnh SQL DELETE
        $stmt = $conn->prepare("DELETE FROM HoaDon WHERE MaHD=?");
        
        // Bind tham số: "s" = string
        $stmt->bind_param("s", $id);
        
        // Thực thi câu lệnh
        if ($stmt->execute()) {
            // Nếu thành công, trả về thông báo thành công
            echo json_encode(['message' => 'Xóa hóa đơn thành công'], JSON_UNESCAPED_UNICODE);
        } else {
            // Nếu thất bại, trả về lỗi
            http_response_code(400);
            echo json_encode(['error' => 'Không thể xóa hóa đơn'], JSON_UNESCAPED_UNICODE);
        }
        
        // Đóng statement
        $stmt->close();
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
