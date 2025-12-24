<?php
/**
 * File: api/thanhtoan.php
 * Mô tả: API endpoint để quản lý thanh toán (CRUD operations)
 * Chức năng: Xử lý các request GET, POST, PUT, DELETE cho thanh toán
 * Bảng dữ liệu: ThanhToan
 * Quan hệ: N-1 với HoaDon (Nhiều thanh toán cho 1 hóa đơn - thanh toán nhiều lần)
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
    // GET: Lấy danh sách hoặc chi tiết thanh toán
    // ============================================
    case 'GET':
        // Kiểm tra xem có tham số id trong URL không (lấy một giao dịch thanh toán cụ thể)
        if (isset($_GET['id'])) {
            // Escape string để tránh SQL injection
            $id = $conn->real_escape_string($_GET['id']);
            
            // Câu lệnh SQL với LEFT JOIN để lấy thông tin hóa đơn
            // tt.*: Lấy tất cả cột từ bảng ThanhToan (alias tt)
            // hd.SoTien as TongTienHD: Tổng tiền của hóa đơn để so sánh
            // LEFT JOIN: Kết nối với bảng HoaDon để lấy thông tin hóa đơn
            $result = $conn->query("SELECT tt.*, hd.SoTien as TongTienHD 
                                    FROM ThanhToan tt
                                    LEFT JOIN HoaDon hd ON tt.MaHD = hd.MaHD
                                    WHERE tt.MaTT = '$id'");
            
            // Lấy dòng dữ liệu đầu tiên
            $tt = $result->fetch_assoc();
            
            // Kiểm tra xem có tìm thấy giao dịch thanh toán không
            if ($tt) {
                // Trả về dữ liệu dưới dạng JSON
                echo json_encode($tt, JSON_UNESCAPED_UNICODE);
            } else {
                // Nếu không tìm thấy, trả về lỗi 404
                http_response_code(404);
                echo json_encode(['error' => 'Giao dịch thanh toán không tồn tại'], JSON_UNESCAPED_UNICODE);
            }
        } else if (isset($_GET['mahd'])) {
            // Nếu có tham số mahd, lấy tất cả thanh toán của một hóa đơn
            
            // Escape string
            $mahd = $conn->real_escape_string($_GET['mahd']);
            
            // Câu lệnh SQL lấy tất cả thanh toán thuộc hóa đơn được chỉ định
            // WHERE MaHD = '$mahd': Lọc theo mã hóa đơn
            // ORDER BY NgayTT DESC: Sắp xếp theo ngày thanh toán, mới nhất trước
            $result = $conn->query("SELECT * FROM ThanhToan WHERE MaHD = '$mahd' ORDER BY NgayTT DESC");
            
            // Khởi tạo mảng để chứa danh sách thanh toán
            $tts = [];
            
            // Duyệt qua từng dòng kết quả
            while ($row = $result->fetch_assoc()) {
                // Thêm mỗi thanh toán vào mảng
                $tts[] = $row;
            }
            
            // Trả về danh sách dưới dạng JSON
            echo json_encode($tts, JSON_UNESCAPED_UNICODE);
        } else {
            // Nếu không có tham số, lấy tất cả thanh toán
            // Nếu là staff (không phải admin), chỉ lấy thanh toán của trạm nhân viên đó
            
            // Kiểm tra xem user có phải admin không
            $isAdmin = ($user['role'] === 'admin');
            $userMaTram = $user['MaTram'] ?? null;
            
            // Xây dựng điều kiện WHERE cho staff
            $tramCondition = "";
            if (!$isAdmin && $userMaTram) {
                // Staff chỉ thấy hóa đơn đã thanh toán của trạm mình (thông qua cột sạc -> phiên sạc -> hóa đơn)
                $userMaTram = $conn->real_escape_string($userMaTram);
                $tramCondition = "AND c.MaTram = '$userMaTram'";
            }
            
            // Câu lệnh SQL lấy tất cả hóa đơn ĐÃ THANH TOÁN với thông tin thanh toán
            // Chỉ hiển thị các hóa đơn có tổng số tiền đã thanh toán >= SoTien
            // Sử dụng subquery để tính tổng thanh toán và filter
            $result = $conn->query("SELECT hd.MaHD,
                                    hd.NgayLap,
                                    hd.SoTien as TongTienHD,
                                    hd.MaPhien,
                                    ps.ThoiGianBatDau,
                                    c.MaTram,
                                    kh.HoTen as TenKhachHang,
                                    pt.BienSo,
                                    pt.DongXe,
                                    (SELECT COALESCE(SUM(tt2.SoTien), 0) 
                                     FROM ThanhToan tt2 
                                     WHERE tt2.MaHD = hd.MaHD) as TongDaThanhToan,
                                    (SELECT MAX(tt2.NgayTT)
                                     FROM ThanhToan tt2 
                                     WHERE tt2.MaHD = hd.MaHD) as NgayThanhToanCuoi,
                                    (SELECT GROUP_CONCAT(tt2.MaTT ORDER BY tt2.NgayTT DESC SEPARATOR ',')
                                     FROM ThanhToan tt2 
                                     WHERE tt2.MaHD = hd.MaHD) as DanhSachMaTT,
                                    (SELECT GROUP_CONCAT(tt2.PhuongThuc ORDER BY tt2.NgayTT DESC SEPARATOR ', ')
                                     FROM ThanhToan tt2 
                                     WHERE tt2.MaHD = hd.MaHD) as PhuongThucThanhToan
                                    FROM HoaDon hd
                                    LEFT JOIN PhienSac ps ON hd.MaPhien = ps.MaPhien
                                    LEFT JOIN CotSac c ON ps.MaCot = c.MaCot
                                    LEFT JOIN PhuongTien pt ON ps.BienSoPT = pt.BienSo
                                    LEFT JOIN KhachHang kh ON pt.MaKH = kh.MaKH
                                    WHERE (SELECT COALESCE(SUM(tt2.SoTien), 0) 
                                           FROM ThanhToan tt2 
                                           WHERE tt2.MaHD = hd.MaHD) >= hd.SoTien
                                    $tramCondition
                                    ORDER BY NgayThanhToanCuoi DESC");
            
            // Khởi tạo mảng
            $tts = [];
            
            // Duyệt qua kết quả
            while ($row = $result->fetch_assoc()) {
                $tts[] = $row;
            }
            
            // Trả về danh sách
            echo json_encode($tts, JSON_UNESCAPED_UNICODE);
        }
        break;
        
    // ============================================
    // POST: Tạo giao dịch thanh toán mới
    // ============================================
    case 'POST':
        // Đọc dữ liệu JSON từ request body
        $data = json_decode(file_get_contents('php://input'), true);
        
        // Lấy các giá trị từ dữ liệu JSON và escape
        // Nếu không có MaTT, tự động tạo mã mới
        $matt = !empty($data['MaTT']) ? $conn->real_escape_string($data['MaTT']) : generateMaTT($conn);
        $mahd = $conn->real_escape_string($data['MaHD'] ?? '');                        // Mã hóa đơn (Foreign Key)
        $phuongthuc = $conn->real_escape_string($data['PhuongThuc'] ?? '');            // Phương thức thanh toán (Ví điện tử/Thẻ ngân hàng)
        $sotien = floatval($data['SoTien'] ?? 0);                                      // Số tiền thanh toán (VNĐ) - chuyển sang float
        // Ngày thanh toán: Nếu không có thì dùng thời gian hiện tại
        // date('Y-m-d H:i:s'): Định dạng ngày giờ MySQL (YYYY-MM-DD HH:MM:SS)
        $ngaytt = $conn->real_escape_string($data['NgayTT'] ?? date('Y-m-d H:i:s'));
        $trangthai = $conn->real_escape_string($data['TrangThai'] ?? 'Hoàn tất');      // Trạng thái (mặc định: Hoàn tất)
        
        // Chuẩn bị câu lệnh SQL INSERT
        // "sssdss": string, string, string, double, string, string
        $stmt = $conn->prepare("INSERT INTO ThanhToan (MaTT, MaHD, PhuongThuc, SoTien, NgayTT, TrangThai) VALUES (?, ?, ?, ?, ?, ?)");
        
        // Bind các tham số
        $stmt->bind_param("sssdss", $matt, $mahd, $phuongthuc, $sotien, $ngaytt, $trangthai);
        
        // Thực thi câu lệnh
        if ($stmt->execute()) {
            // Nếu thành công, trả về mã 201 (Created)
            http_response_code(201);
            echo json_encode(['message' => 'Tạo giao dịch thanh toán thành công'], JSON_UNESCAPED_UNICODE);
        } else {
            // Nếu thất bại, trả về mã 400 và thông báo lỗi
            http_response_code(400);
            echo json_encode(['error' => 'Không thể tạo giao dịch thanh toán: ' . $stmt->error], JSON_UNESCAPED_UNICODE);
        }
        
        // Đóng statement
        $stmt->close();
        break;
        
    // ============================================
    // PUT: Cập nhật thông tin thanh toán
    // ============================================
    case 'PUT':
        // Đọc dữ liệu JSON từ request body
        $data = json_decode(file_get_contents('php://input'), true);
        
        // Lấy mã giao dịch thanh toán cần cập nhật
        $matt = $conn->real_escape_string($data['MaTT'] ?? '');
        
        // Lấy các giá trị cần cập nhật
        $mahd = $conn->real_escape_string($data['MaHD'] ?? '');
        $phuongthuc = $conn->real_escape_string($data['PhuongThuc'] ?? '');
        $sotien = floatval($data['SoTien'] ?? 0);
        $ngaytt = $conn->real_escape_string($data['NgayTT'] ?? '');
        $trangthai = $conn->real_escape_string($data['TrangThai'] ?? 'Hoàn tất');
        
        // Chuẩn bị câu lệnh SQL UPDATE
        // "ssdsss": string, string, double, string, string, string
        $stmt = $conn->prepare("UPDATE ThanhToan SET MaHD=?, PhuongThuc=?, SoTien=?, NgayTT=?, TrangThai=? WHERE MaTT=?");
        
        // Bind các tham số
        $stmt->bind_param("ssdsss", $mahd, $phuongthuc, $sotien, $ngaytt, $trangthai, $matt);
        
        // Thực thi câu lệnh
        if ($stmt->execute()) {
            // Nếu thành công, trả về thông báo thành công
            echo json_encode(['message' => 'Cập nhật giao dịch thanh toán thành công'], JSON_UNESCAPED_UNICODE);
        } else {
            // Nếu thất bại, trả về lỗi
            http_response_code(400);
            echo json_encode(['error' => 'Không thể cập nhật giao dịch thanh toán'], JSON_UNESCAPED_UNICODE);
        }
        
        // Đóng statement
        $stmt->close();
        break;
        
    // ============================================
    // DELETE: Xóa giao dịch thanh toán
    // ============================================
    case 'DELETE':
        // Lấy ID của giao dịch thanh toán cần xóa từ tham số URL
        $id = $conn->real_escape_string($_GET['id'] ?? '');
        
        // Kiểm tra tính hợp lệ của ID
        if (empty($id)) {
            // Nếu ID không hợp lệ, trả về lỗi 400
            http_response_code(400);
            echo json_encode(['error' => 'Mã giao dịch không hợp lệ'], JSON_UNESCAPED_UNICODE);
            break; // Dừng xử lý
        }
        
        // Chuẩn bị câu lệnh SQL DELETE
        $stmt = $conn->prepare("DELETE FROM ThanhToan WHERE MaTT=?");
        
        // Bind tham số: "s" = string
        $stmt->bind_param("s", $id);
        
        // Thực thi câu lệnh
        if ($stmt->execute()) {
            // Nếu thành công, trả về thông báo thành công
            echo json_encode(['message' => 'Xóa giao dịch thanh toán thành công'], JSON_UNESCAPED_UNICODE);
        } else {
            // Nếu thất bại, trả về lỗi
            http_response_code(400);
            echo json_encode(['error' => 'Không thể xóa giao dịch thanh toán'], JSON_UNESCAPED_UNICODE);
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
