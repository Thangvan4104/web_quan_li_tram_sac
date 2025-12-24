<?php
/**
 * File: api/giasac.php
 * Mô tả: API quản lý giá sạc (CHỈ ADMIN)
 * Chức năng: Xử lý các request GET, POST, PUT, DELETE cho giá sạc
 * Bảng dữ liệu: GiaSac
 * Quyền truy cập: CHỈ ADMIN mới có quyền set giá sạc
 * Tác giả: Hệ thống quản lý trạm sạc
 */

// ============================================
// CẤU HÌNH HEADER HTTP
// ============================================

// Thiết lập Content-Type là JSON với encoding UTF-8
header('Content-Type: application/json; charset=utf-8');

// Cấu hình CORS để hỗ trợ credentials (cookies/session)
// QUAN TRỌNG: Khi dùng credentials, không thể dùng '*' cho Origin
// Phải chỉ định domain cụ thể hoặc lấy từ request header

// Include file cấu hình CORS để sử dụng hàm setCORSHeaders()
require_once '../config/cors.php';

// Set CORS headers với origin cụ thể và credentials
setCORSHeaders();

// ============================================
// XỬ LÝ PREFLIGHT REQUEST
// ============================================

// Xử lý preflight request (OPTIONS) cho CORS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// ============================================
// INCLUDE FILE CẤU HÌNH
// ============================================

// Include file cấu hình database và auth
require_once '../config/database.php';
require_once '../config/auth.php';

// ============================================
// KIỂM TRA QUYỀN TRUY CẬP
// ============================================

// Kiểm tra quyền: CHỈ ADMIN mới được truy cập API này
// requireAdmin(): Hàm từ config/auth.php, yêu cầu user phải là admin
// Nếu không phải admin, hàm này sẽ trả về lỗi 403 và dừng script
$admin = requireAdmin();

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
    // GET: Lấy danh sách hoặc chi tiết giá sạc
    // ============================================
    case 'GET':
        // Kiểm tra xem có tham số id trong URL không (lấy một giá sạc cụ thể)
        if (isset($_GET['id'])) {
            // Escape string để tránh SQL injection
            $id = $conn->real_escape_string($_GET['id']);
            
            // Câu lệnh SQL lấy thông tin giá sạc theo mã
            // SELECT *: Lấy tất cả cột từ bảng GiaSac
            // WHERE MaGia = '$id': Lọc theo mã giá
            $result = $conn->query("SELECT * FROM GiaSac WHERE MaGia = '$id'");
            
            // Lấy dòng dữ liệu đầu tiên
            $gia = $result->fetch_assoc();
            
            // Kiểm tra xem có tìm thấy giá sạc không
            if ($gia) {
                // Trả về dữ liệu dưới dạng JSON
                echo json_encode($gia, JSON_UNESCAPED_UNICODE);
            } else {
                // Nếu không tìm thấy, trả về lỗi 404
                http_response_code(404);
                echo json_encode(['error' => 'Không tìm thấy giá sạc'], JSON_UNESCAPED_UNICODE);
            }
        } else if (isset($_GET['loaicong'])) {
            // Nếu có tham số loaicong, lấy giá đang áp dụng của loại cổng sạc đó
            $loaicong = $conn->real_escape_string($_GET['loaicong']);
            
            // Câu lệnh SQL lấy giá đang áp dụng
            // WHERE LoaiCongSac = '$loaicong' AND TrangThai = 'Đang áp dụng': Lọc theo loại cổng và trạng thái
            // ORDER BY NgayApDung DESC: Sắp xếp theo ngày áp dụng, mới nhất trước
            // LIMIT 1: Chỉ lấy 1 kết quả (giá mới nhất)
            $result = $conn->query("SELECT * FROM GiaSac 
                                   WHERE LoaiCongSac = '$loaicong' AND TrangThai = 'Đang áp dụng' 
                                   ORDER BY NgayApDung DESC 
                                   LIMIT 1");
            
            $gia = $result->fetch_assoc();
            
            if ($gia) {
                echo json_encode($gia, JSON_UNESCAPED_UNICODE);
            } else {
                http_response_code(404);
                echo json_encode(['error' => 'Không tìm thấy giá cho loại cổng sạc này'], JSON_UNESCAPED_UNICODE);
            }
        } else {
            // Nếu không có tham số, lấy tất cả giá sạc
            // ORDER BY NgayApDung DESC: Sắp xếp theo ngày áp dụng, mới nhất trước
            $result = $conn->query("SELECT * FROM GiaSac ORDER BY NgayApDung DESC");
            
            // Khởi tạo mảng để chứa danh sách giá sạc
            $gias = [];
            
            // Duyệt qua từng dòng kết quả
            while ($row = $result->fetch_assoc()) {
                // Thêm mỗi giá sạc vào mảng
                $gias[] = $row;
            }
            
            // Trả về danh sách dưới dạng JSON
            echo json_encode($gias, JSON_UNESCAPED_UNICODE);
        }
        break;
    
    // ============================================
    // POST: Tạo giá sạc mới (CHỈ ADMIN)
    // ============================================
    case 'POST':
        // Đọc dữ liệu JSON từ request body
        $data = json_decode(file_get_contents('php://input'), true);
        
        // Lấy các giá trị từ dữ liệu JSON và escape
        $magia = $conn->real_escape_string($data['MaGia'] ?? '');                    // Mã giá sạc (CHAR(5))
        $loaicong = $conn->real_escape_string($data['LoaiCongSac'] ?? '');          // Loại cổng sạc (Type 2 AC, CCS2 DC, CHAdeMO)
        $dongia = floatval($data['DonGia'] ?? 0);                                    // Đơn giá mỗi kWh (VNĐ) - chuyển sang float
        $ngayapdung = $conn->real_escape_string($data['NgayApDung'] ?? date('Y-m-d'));  // Ngày áp dụng (mặc định: hôm nay)
        
        // Validate dữ liệu
        if (empty($magia) || empty($loaicong) || $dongia <= 0) {
            http_response_code(400);
            echo json_encode(['error' => 'Vui lòng điền đầy đủ thông tin và đơn giá phải lớn hơn 0'], JSON_UNESCAPED_UNICODE);
            break;
        }
        
        // Vô hiệu hóa giá cũ cùng loại cổng sạc
        // Mục đích: Chỉ có 1 giá đang áp dụng cho mỗi loại cổng sạc tại một thời điểm
        // UPDATE: Cập nhật trạng thái và ngày kết thúc của giá cũ
        // WHERE LoaiCongSac = '$loaicong' AND TrangThai = 'Đang áp dụng': Chỉ cập nhật giá đang áp dụng cùng loại
        $conn->query("UPDATE GiaSac 
                     SET TrangThai = 'Hết hiệu lực', NgayKetThuc = CURDATE() 
                     WHERE LoaiCongSac = '$loaicong' AND TrangThai = 'Đang áp dụng'");
        
        // Chuẩn bị câu lệnh SQL INSERT
        // "ssdss": string, string, double, string, string
        // NguoiTao: Mã nhân viên (admin) tạo giá này
        $stmt = $conn->prepare("INSERT INTO GiaSac (MaGia, LoaiCongSac, DonGia, NgayApDung, NguoiTao) 
                               VALUES (?, ?, ?, ?, ?)");
        
        // Bind các tham số
        $stmt->bind_param("ssdss", $magia, $loaicong, $dongia, $ngayapdung, $admin['MaNV']);
        
        // Thực thi câu lệnh
        if ($stmt->execute()) {
            // Nếu thành công, trả về mã 201 (Created)
            http_response_code(201);
            echo json_encode(['message' => 'Tạo giá sạc thành công'], JSON_UNESCAPED_UNICODE);
        } else {
            // Nếu thất bại, trả về mã 400 và thông báo lỗi
            http_response_code(400);
            echo json_encode(['error' => 'Không thể tạo giá sạc: ' . $stmt->error], JSON_UNESCAPED_UNICODE);
        }
        
        // Đóng statement
        $stmt->close();
        break;
    
    // ============================================
    // PUT: Cập nhật thông tin giá sạc (CHỈ ADMIN)
    // ============================================
    case 'PUT':
        // Đọc dữ liệu JSON từ request body
        $data = json_decode(file_get_contents('php://input'), true);
        
        // Lấy mã giá sạc cần cập nhật
        $magia = $conn->real_escape_string($data['MaGia'] ?? '');
        
        // Lấy các giá trị cần cập nhật
        $loaicong = $conn->real_escape_string($data['LoaiCongSac'] ?? '');
        $dongia = floatval($data['DonGia'] ?? 0);
        $ngayapdung = $conn->real_escape_string($data['NgayApDung'] ?? '');
        $trangthai = $conn->real_escape_string($data['TrangThai'] ?? 'Đang áp dụng');
        
        // Validate dữ liệu
        if (empty($magia) || empty($loaicong) || $dongia <= 0) {
            http_response_code(400);
            echo json_encode(['error' => 'Vui lòng điền đầy đủ thông tin và đơn giá phải lớn hơn 0'], JSON_UNESCAPED_UNICODE);
            break;
        }
        
        // Chuẩn bị câu lệnh SQL UPDATE
        // "sdsss": double, string, string, string, string
        $stmt = $conn->prepare("UPDATE GiaSac SET DonGia=?, NgayApDung=?, TrangThai=? WHERE MaGia=?");
        
        // Bind các tham số
        $stmt->bind_param("dsss", $dongia, $ngayapdung, $trangthai, $magia);
        
        // Thực thi câu lệnh
        if ($stmt->execute()) {
            // Nếu thành công, trả về thông báo thành công
            echo json_encode(['message' => 'Cập nhật giá sạc thành công'], JSON_UNESCAPED_UNICODE);
        } else {
            // Nếu thất bại, trả về lỗi
            http_response_code(400);
            echo json_encode(['error' => 'Không thể cập nhật giá sạc'], JSON_UNESCAPED_UNICODE);
        }
        
        // Đóng statement
        $stmt->close();
        break;
    
    // ============================================
    // DELETE: Xóa giá sạc (CHỈ ADMIN)
    // ============================================
    case 'DELETE':
        // Lấy ID của giá sạc cần xóa từ tham số URL
        $id = $conn->real_escape_string($_GET['id'] ?? '');
        
        // Kiểm tra tính hợp lệ của ID
        if (empty($id)) {
            // Nếu ID không hợp lệ, trả về lỗi 400
            http_response_code(400);
            echo json_encode(['error' => 'Mã giá sạc không hợp lệ'], JSON_UNESCAPED_UNICODE);
            break; // Dừng xử lý
        }
        
        // Chuẩn bị câu lệnh SQL DELETE
        $stmt = $conn->prepare("DELETE FROM GiaSac WHERE MaGia=?");
        
        // Bind tham số: "s" = string
        $stmt->bind_param("s", $id);
        
        // Thực thi câu lệnh
        if ($stmt->execute()) {
            // Nếu thành công, trả về thông báo thành công
            echo json_encode(['message' => 'Xóa giá sạc thành công'], JSON_UNESCAPED_UNICODE);
        } else {
            // Nếu thất bại, trả về lỗi
            http_response_code(400);
            echo json_encode(['error' => 'Không thể xóa giá sạc'], JSON_UNESCAPED_UNICODE);
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

