<?php
/**
 * File: api/phuongtien.php
 * Mô tả: API endpoint để quản lý phương tiện (CRUD operations)
 * Chức năng: Xử lý các request GET, POST, PUT, DELETE cho phương tiện
 * Bảng dữ liệu: PhuongTien
 * Quan hệ: N-1 với KhachHang (Nhiều phương tiện thuộc 1 khách hàng)
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
    // GET: Lấy danh sách hoặc chi tiết phương tiện
    // ============================================
    case 'GET':
        // Kiểm tra xem có tham số id trong URL không (lấy một phương tiện cụ thể)
        if (isset($_GET['id'])) {
            // Escape string để tránh SQL injection
            $id = $conn->real_escape_string($_GET['id']);
            
            // Câu lệnh SQL với LEFT JOIN để lấy thông tin chủ xe
            // pt.*: Lấy tất cả cột từ bảng PhuongTien (alias pt)
            // kh.HoTen as TenChuXe: Lấy họ tên khách hàng và đặt alias là TenChuXe
            // LEFT JOIN: Kết nối với bảng KhachHang để lấy thông tin chủ xe
            // ON pt.MaKH = kh.MaKH: Điều kiện kết nối
            // WHERE pt.BienSo = '$id': Lọc theo biển số (Primary Key)
            $result = $conn->query("SELECT pt.*, kh.HoTen as TenChuXe 
                                    FROM PhuongTien pt 
                                    LEFT JOIN KhachHang kh ON pt.MaKH = kh.MaKH 
                                    WHERE pt.BienSo = '$id'");
            
            // Lấy dòng dữ liệu đầu tiên
            $pt = $result->fetch_assoc();
            
            // Kiểm tra xem có tìm thấy phương tiện không
            if ($pt) {
                // Nếu là staff (không phải admin), kiểm tra xem phương tiện có thuộc trạm của nhân viên không
                $isAdmin = ($user['role'] === 'admin');
                $userMaTram = $user['MaTram'] ?? null;
                
                if (!$isAdmin && $userMaTram && $pt['MaTram'] !== $userMaTram) {
                    // Staff không có quyền xem phương tiện của trạm khác
                    http_response_code(403);
                    echo json_encode(['error' => 'Bạn không có quyền xem phương tiện này'], JSON_UNESCAPED_UNICODE);
                } else {
                    // Trả về dữ liệu dưới dạng JSON
                    echo json_encode($pt, JSON_UNESCAPED_UNICODE);
                }
            } else {
                // Nếu không tìm thấy, trả về lỗi 404
                http_response_code(404);
                echo json_encode(['error' => 'Phương tiện không tồn tại'], JSON_UNESCAPED_UNICODE);
            }
        } else if (isset($_GET['makh'])) {
            // Nếu có tham số makh, lấy tất cả phương tiện của một khách hàng
            
            // Escape string
            $makh = $conn->real_escape_string($_GET['makh']);
            
            // Câu lệnh SQL lấy tất cả phương tiện thuộc khách hàng được chỉ định
            // WHERE MaKH = '$makh': Lọc theo mã khách hàng
            // ORDER BY BienSo: Sắp xếp theo biển số
            $result = $conn->query("SELECT * FROM PhuongTien WHERE MaKH = '$makh' ORDER BY BienSo");
            
            // Khởi tạo mảng để chứa danh sách phương tiện
            $pts = [];
            
            // Duyệt qua từng dòng kết quả
            while ($row = $result->fetch_assoc()) {
                // Thêm mỗi phương tiện vào mảng
                $pts[] = $row;
            }
            
            // Trả về danh sách dưới dạng JSON
            echo json_encode($pts, JSON_UNESCAPED_UNICODE);
        } else {
            // Nếu không có tham số, lấy tất cả phương tiện
            // Nếu là staff (không phải admin), chỉ lấy phương tiện của trạm nhân viên đó
            
            // Kiểm tra xem user có phải admin không
            $isAdmin = ($user['role'] === 'admin');
            $userMaTram = $user['MaTram'] ?? null;
            
            // Xây dựng điều kiện WHERE
            $whereClause = "";
            if (!$isAdmin && $userMaTram) {
                // Staff chỉ thấy phương tiện của trạm mình
                $userMaTram = $conn->real_escape_string($userMaTram);
                $whereClause = "WHERE pt.MaTram = '$userMaTram'";
            }
            
            // Câu lệnh SQL lấy tất cả phương tiện với thông tin chủ xe
            $result = $conn->query("SELECT pt.*, kh.HoTen as TenChuXe 
                                    FROM PhuongTien pt 
                                    LEFT JOIN KhachHang kh ON pt.MaKH = kh.MaKH 
                                    $whereClause
                                    ORDER BY pt.BienSo");
            
            // Khởi tạo mảng
            $pts = [];
            
            // Duyệt qua kết quả
            while ($row = $result->fetch_assoc()) {
                $pts[] = $row;
            }
            
            // Trả về danh sách
            echo json_encode($pts, JSON_UNESCAPED_UNICODE);
        }
        break;
        
    // ============================================
    // POST: Tạo phương tiện mới
    // ============================================
    case 'POST':
        // Đọc dữ liệu JSON từ request body
        $data = json_decode(file_get_contents('php://input'), true);
        
        // Lấy các giá trị từ dữ liệu JSON và escape
        $bienso = $conn->real_escape_string($data['BienSo'] ?? '');          // Biển số phương tiện (VARCHAR(15), Primary Key)
        $dongxe = $conn->real_escape_string($data['DongXe'] ?? '');         // Dòng xe (VD: VinFast VF e34)
        $hangxe = $conn->real_escape_string($data['HangXe'] ?? '');         // Hãng xe (VD: VinFast, Pega)
        $makh = $conn->real_escape_string($data['MaKH'] ?? '');            // Mã khách hàng sở hữu (Foreign Key)
        
        // Tự động gán MaTram: Nếu là staff, dùng trạm của nhân viên; nếu là admin, dùng từ request hoặc từ khách hàng
        $isAdmin = ($user['role'] === 'admin');
        $matram = null;
        if (!$isAdmin && isset($user['MaTram'])) {
            // Staff: Tự động gán trạm của nhân viên
            $matram = $conn->real_escape_string($user['MaTram']);
        } else if ($isAdmin && !empty($data['MaTram'])) {
            // Admin: Có thể chỉ định trạm
            $matram = $conn->real_escape_string($data['MaTram']);
        } else if ($isAdmin && !empty($makh)) {
            // Admin: Nếu không chỉ định, lấy từ khách hàng
            $khResult = $conn->query("SELECT MaTram FROM KhachHang WHERE MaKH = '$makh'");
            if ($khRow = $khResult->fetch_assoc()) {
                $matram = $khRow['MaTram'];
            }
        }
        
        // Chuẩn bị câu lệnh SQL INSERT
        // "sssss": 5 tham số, tất cả đều là string (matram có thể NULL)
        $stmt = $conn->prepare("INSERT INTO PhuongTien (BienSo, DongXe, HangXe, MaKH, MaTram) VALUES (?, ?, ?, ?, ?)");
        
        // Bind các tham số
        $stmt->bind_param("sssss", $bienso, $dongxe, $hangxe, $makh, $matram);
        
        // Thực thi câu lệnh
        if ($stmt->execute()) {
            // Nếu thành công, trả về mã 201 (Created)
            http_response_code(201);
            echo json_encode(['message' => 'Tạo phương tiện thành công'], JSON_UNESCAPED_UNICODE);
        } else {
            // Nếu thất bại, trả về mã 400 và thông báo lỗi
            http_response_code(400);
            echo json_encode(['error' => 'Không thể tạo phương tiện: ' . $stmt->error], JSON_UNESCAPED_UNICODE);
        }
        
        // Đóng statement
        $stmt->close();
        break;
        
    // ============================================
    // PUT: Cập nhật thông tin phương tiện
    // ============================================
    case 'PUT':
        // Đọc dữ liệu JSON từ request body
        $data = json_decode(file_get_contents('php://input'), true);
        
        // Lấy biển số phương tiện cần cập nhật (Primary Key)
        $bienso = $conn->real_escape_string($data['BienSo'] ?? '');
        
        // Lấy các giá trị cần cập nhật
        $dongxe = $conn->real_escape_string($data['DongXe'] ?? '');
        $hangxe = $conn->real_escape_string($data['HangXe'] ?? '');
        $makh = $conn->real_escape_string($data['MaKH'] ?? '');
        
        // Chuẩn bị câu lệnh SQL UPDATE
        // "ssss": 4 tham số string, thứ tự: DongXe, HangXe, MaKH, BienSo
        $stmt = $conn->prepare("UPDATE PhuongTien SET DongXe=?, HangXe=?, MaKH=? WHERE BienSo=?");
        
        // Bind các tham số
        $stmt->bind_param("ssss", $dongxe, $hangxe, $makh, $bienso);
        
        // Thực thi câu lệnh
        if ($stmt->execute()) {
            // Nếu thành công, trả về thông báo thành công
            echo json_encode(['message' => 'Cập nhật phương tiện thành công'], JSON_UNESCAPED_UNICODE);
        } else {
            // Nếu thất bại, trả về lỗi
            http_response_code(400);
            echo json_encode(['error' => 'Không thể cập nhật phương tiện'], JSON_UNESCAPED_UNICODE);
        }
        
        // Đóng statement
        $stmt->close();
        break;
        
    // ============================================
    // DELETE: Xóa phương tiện
    // ============================================
    case 'DELETE':
        // Lấy ID (biển số) của phương tiện cần xóa từ tham số URL
        $id = $conn->real_escape_string($_GET['id'] ?? '');
        
        // Kiểm tra tính hợp lệ của ID
        if (empty($id)) {
            // Nếu ID không hợp lệ, trả về lỗi 400
            http_response_code(400);
            echo json_encode(['error' => 'Biển số không hợp lệ'], JSON_UNESCAPED_UNICODE);
            break; // Dừng xử lý
        }
        
        // Chuẩn bị câu lệnh SQL DELETE
        // WHERE BienSo=?: Xóa phương tiện theo biển số
        $stmt = $conn->prepare("DELETE FROM PhuongTien WHERE BienSo=?");
        
        // Bind tham số: "s" = string
        $stmt->bind_param("s", $id);
        
        // Thực thi câu lệnh
        if ($stmt->execute()) {
            // Nếu thành công, trả về thông báo thành công
            echo json_encode(['message' => 'Xóa phương tiện thành công'], JSON_UNESCAPED_UNICODE);
        } else {
            // Nếu thất bại, trả về lỗi
            http_response_code(400);
            echo json_encode(['error' => 'Không thể xóa phương tiện'], JSON_UNESCAPED_UNICODE);
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
