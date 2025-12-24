<?php
/**
 * File: api/khachhang.php
 * Mô tả: API endpoint để quản lý khách hàng (CRUD operations)
 * Chức năng: Xử lý các request GET, POST, PUT, DELETE cho khách hàng
 * Bảng dữ liệu: KhachHang
 * Quan hệ: 1-N với PhuongTien (1 khách hàng có nhiều phương tiện)
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
    // GET: Lấy danh sách hoặc chi tiết khách hàng
    // ============================================
    case 'GET':
        // Kiểm tra xem có tham số id trong URL không (lấy một khách hàng cụ thể)
        if (isset($_GET['id'])) {
            // Escape string để tránh SQL injection
            $id = $conn->real_escape_string($_GET['id']);
            
            // Câu lệnh SQL lấy thông tin khách hàng
            // SELECT *: Lấy tất cả cột từ bảng KhachHang
            // WHERE MaKH = '$id': Lọc theo mã khách hàng
            $result = $conn->query("SELECT * FROM KhachHang WHERE MaKH = '$id'");
            
            // Lấy dòng dữ liệu đầu tiên
            $kh = $result->fetch_assoc();
            
            // Kiểm tra xem có tìm thấy khách hàng không
            if ($kh) {
                // Nếu là staff (không phải admin), kiểm tra xem khách hàng có thuộc trạm của nhân viên không
                $isAdmin = ($user['role'] === 'admin');
                $userMaTram = $user['MaTram'] ?? null;
                
                if (!$isAdmin && $userMaTram && $kh['MaTram'] !== $userMaTram) {
                    // Staff không có quyền xem khách hàng của trạm khác
                    http_response_code(403);
                    echo json_encode(['error' => 'Bạn không có quyền xem khách hàng này'], JSON_UNESCAPED_UNICODE);
                } else {
                    // Lấy danh sách phương tiện của khách hàng này
                    // SELECT *: Lấy tất cả phương tiện
                    // WHERE MaKH = '$id': Lọc theo mã khách hàng
                    $ptResult = $conn->query("SELECT * FROM PhuongTien WHERE MaKH = '$id'");
                    
                    // Khởi tạo mảng để chứa danh sách phương tiện
                    $kh['PhuongTien'] = [];
                    
                    // Duyệt qua từng phương tiện
                    while ($row = $ptResult->fetch_assoc()) {
                        // Thêm mỗi phương tiện vào mảng
                        $kh['PhuongTien'][] = $row;
                    }
                    
                    // Trả về dữ liệu khách hàng kèm danh sách phương tiện dưới dạng JSON
                    echo json_encode($kh, JSON_UNESCAPED_UNICODE);
                }
            } else {
                // Nếu không tìm thấy, trả về lỗi 404
                http_response_code(404);
                echo json_encode(['error' => 'Khách hàng không tồn tại'], JSON_UNESCAPED_UNICODE);
            }
        } else {
            // Nếu không có id, lấy tất cả khách hàng
            // Nếu là staff (không phải admin), chỉ lấy khách hàng của trạm nhân viên đó
            
            // Kiểm tra xem user có phải admin không
            $isAdmin = ($user['role'] === 'admin');
            $userMaTram = $user['MaTram'] ?? null;
            
            // Xây dựng điều kiện WHERE
            $whereClause = "";
            if (!$isAdmin && $userMaTram) {
                // Staff chỉ thấy khách hàng của trạm mình
                $userMaTram = $conn->real_escape_string($userMaTram);
                $whereClause = "WHERE MaTram = '$userMaTram'";
            }
            
            // Câu lệnh SQL lấy tất cả khách hàng
            // ORDER BY MaKH: Sắp xếp theo mã khách hàng
            $result = $conn->query("SELECT * FROM KhachHang $whereClause ORDER BY MaKH");
            
            // Khởi tạo mảng để chứa danh sách khách hàng
            $khs = [];
            
            // Duyệt qua từng dòng kết quả
            while ($row = $result->fetch_assoc()) {
                // Thêm mỗi khách hàng vào mảng
                $khs[] = $row;
            }
            
            // Trả về danh sách dưới dạng JSON
            echo json_encode($khs, JSON_UNESCAPED_UNICODE);
        }
        break;
        
    // ============================================
    // POST: Tạo khách hàng mới
    // ============================================
    case 'POST':
        // Đọc dữ liệu JSON từ request body
        $data = json_decode(file_get_contents('php://input'), true);
        
        // Lấy các giá trị từ dữ liệu JSON và escape
        $makh = $conn->real_escape_string($data['MaKH'] ?? '');                          // Mã khách hàng (CHAR(5))
        $hoten = $conn->real_escape_string($data['HoTen'] ?? '');                         // Họ tên khách hàng
        $sdt = $conn->real_escape_string($data['SDT'] ?? '');                           // Số điện thoại (UNIQUE)
        $email = $conn->real_escape_string($data['Email'] ?? '');                        // Email (UNIQUE)
        $phuongthuc = $conn->real_escape_string($data['PhuongThucThanhToan'] ?? '');     // Phương thức thanh toán (Ví điện tử/Thẻ ngân hàng)
        
        // Tự động gán MaTram: Nếu là staff, dùng trạm của nhân viên; nếu là admin, dùng từ request hoặc NULL
        $isAdmin = ($user['role'] === 'admin');
        $matram = null;
        if (!$isAdmin && isset($user['MaTram'])) {
            // Staff: Tự động gán trạm của nhân viên
            $matram = $conn->real_escape_string($user['MaTram']);
        } else if ($isAdmin && !empty($data['MaTram'])) {
            // Admin: Có thể chỉ định trạm hoặc để NULL
            $matram = $conn->real_escape_string($data['MaTram']);
        }
        
        // Chuẩn bị câu lệnh SQL INSERT
        // "ssssss": 6 tham số, tất cả đều là string (matram có thể NULL)
        $stmt = $conn->prepare("INSERT INTO KhachHang (MaKH, HoTen, SDT, Email, PhuongThucThanhToan, MaTram) VALUES (?, ?, ?, ?, ?, ?)");
        
        // Bind các tham số
        $stmt->bind_param("ssssss", $makh, $hoten, $sdt, $email, $phuongthuc, $matram);
        
        // Thực thi câu lệnh
        if ($stmt->execute()) {
            // Nếu thành công, trả về mã 201 (Created)
            http_response_code(201);
            echo json_encode(['message' => 'Tạo khách hàng thành công'], JSON_UNESCAPED_UNICODE);
        } else {
            // Nếu thất bại, trả về mã 400 và thông báo lỗi
            http_response_code(400);
            echo json_encode(['error' => 'Không thể tạo khách hàng: ' . $stmt->error], JSON_UNESCAPED_UNICODE);
        }
        
        // Đóng statement
        $stmt->close();
        break;
        
    // ============================================
    // PUT: Cập nhật thông tin khách hàng
    // ============================================
    case 'PUT':
        // Đọc dữ liệu JSON từ request body
        $data = json_decode(file_get_contents('php://input'), true);
        
        // Lấy mã khách hàng cần cập nhật
        $makh = $conn->real_escape_string($data['MaKH'] ?? '');
        
        // Lấy các giá trị cần cập nhật
        $hoten = $conn->real_escape_string($data['HoTen'] ?? '');
        $sdt = $conn->real_escape_string($data['SDT'] ?? '');
        $email = $conn->real_escape_string($data['Email'] ?? '');
        $phuongthuc = $conn->real_escape_string($data['PhuongThucThanhToan'] ?? '');
        
        // Chuẩn bị câu lệnh SQL UPDATE
        // "sssss": 5 tham số string, thứ tự: HoTen, SDT, Email, PhuongThucThanhToan, MaKH
        $stmt = $conn->prepare("UPDATE KhachHang SET HoTen=?, SDT=?, Email=?, PhuongThucThanhToan=? WHERE MaKH=?");
        
        // Bind các tham số
        $stmt->bind_param("sssss", $hoten, $sdt, $email, $phuongthuc, $makh);
        
        // Thực thi câu lệnh
        if ($stmt->execute()) {
            // Nếu thành công, trả về thông báo thành công
            echo json_encode(['message' => 'Cập nhật khách hàng thành công'], JSON_UNESCAPED_UNICODE);
        } else {
            // Nếu thất bại, trả về lỗi
            http_response_code(400);
            echo json_encode(['error' => 'Không thể cập nhật khách hàng'], JSON_UNESCAPED_UNICODE);
        }
        
        // Đóng statement
        $stmt->close();
        break;
        
    // ============================================
    // DELETE: Xóa khách hàng
    // ============================================
    case 'DELETE':
        // Lấy ID của khách hàng cần xóa từ tham số URL
        $id = $conn->real_escape_string($_GET['id'] ?? '');
        
        // Kiểm tra tính hợp lệ của ID
        if (empty($id)) {
            // Nếu ID không hợp lệ, trả về lỗi 400
            http_response_code(400);
            echo json_encode(['error' => 'Mã khách hàng không hợp lệ'], JSON_UNESCAPED_UNICODE);
            break; // Dừng xử lý
        }
        
        // Chuẩn bị câu lệnh SQL DELETE
        $stmt = $conn->prepare("DELETE FROM KhachHang WHERE MaKH=?");
        
        // Bind tham số: "s" = string
        $stmt->bind_param("s", $id);
        
        // Thực thi câu lệnh
        if ($stmt->execute()) {
            // Nếu thành công, trả về thông báo thành công
            echo json_encode(['message' => 'Xóa khách hàng thành công'], JSON_UNESCAPED_UNICODE);
        } else {
            // Nếu thất bại, trả về lỗi
            http_response_code(400);
            echo json_encode(['error' => 'Không thể xóa khách hàng'], JSON_UNESCAPED_UNICODE);
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
