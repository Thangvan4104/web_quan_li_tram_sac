<?php
/**
 * File: api/approve.php
 * Mô tả: API duyệt/khóa nhân viên (CHỈ ADMIN)
 * Chức năng: Xử lý các request GET, PUT để duyệt hoặc khóa nhân viên
 * Bảng dữ liệu: NhanVien
 * Quyền truy cập: CHỈ ADMIN mới có quyền duyệt/khóa nhân viên
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
    // GET: Lấy danh sách nhân viên chờ duyệt hoặc tất cả nhân viên
    // ============================================
    case 'GET':
        // Kiểm tra xem có tham số pending trong URL không (chỉ lấy nhân viên chờ duyệt)
        if (isset($_GET['pending']) && $_GET['pending'] == '1') {
            // Lấy danh sách nhân viên chờ duyệt
            // WHERE is_approved = 0: Chỉ lấy nhân viên chưa được duyệt
            // ORDER BY created_at DESC: Sắp xếp theo ngày tạo, mới nhất trước
            $result = $conn->query("SELECT MaNV, HoTen, Email, SDT, ChucVu, MaTram, role, is_approved, created_at 
                                   FROM NhanVien 
                                   WHERE is_approved = 0 
                                   ORDER BY created_at DESC");
            
            // Khởi tạo mảng để chứa danh sách nhân viên chờ duyệt
            $pending = [];
            
            // Duyệt qua từng dòng kết quả
            while ($row = $result->fetch_assoc()) {
                // Thêm mỗi nhân viên vào mảng
                $pending[] = $row;
            }
            
            // Trả về danh sách dưới dạng JSON
            echo json_encode($pending, JSON_UNESCAPED_UNICODE);
        } else {
            // Nếu không có tham số pending, lấy tất cả nhân viên với thông tin trạm
            // LEFT JOIN: Kết nối với bảng TramSac để lấy tên trạm
            $result = $conn->query("SELECT nv.MaNV, nv.HoTen, nv.Email, nv.SDT, nv.ChucVu, nv.MaTram, 
                                           nv.role, nv.is_approved, nv.created_at, t.TenTram 
                                   FROM NhanVien nv 
                                   LEFT JOIN TramSac t ON nv.MaTram = t.MaTram 
                                   ORDER BY nv.is_approved ASC, nv.created_at DESC");
            
            // Khởi tạo mảng để chứa danh sách nhân viên
            $nvs = [];
            
            // Duyệt qua từng dòng kết quả
            while ($row = $result->fetch_assoc()) {
                // Thêm mỗi nhân viên vào mảng
                $nvs[] = $row;
            }
            
            // Trả về danh sách dưới dạng JSON
            echo json_encode($nvs, JSON_UNESCAPED_UNICODE);
        }
        break;
    
    // ============================================
    // PUT: Duyệt hoặc khóa nhân viên (CHỈ ADMIN)
    // ============================================
    case 'PUT':
        // Đọc dữ liệu JSON từ request body
        $data = json_decode(file_get_contents('php://input'), true);
        
        // Lấy mã nhân viên cần cập nhật
        $manv = $conn->real_escape_string($data['MaNV'] ?? '');
        
        // Lấy giá trị is_approved (0 = chờ duyệt/khóa, 1 = đã duyệt)
        // intval(): Chuyển đổi sang integer
        $isApproved = intval($data['is_approved'] ?? 0);

        // Khi duyệt nhân viên (isApproved = 1), admin phải chọn MaTram và ChucVu
        $maTram = $conn->real_escape_string($data['MaTram'] ?? '');
        $chucVu = $conn->real_escape_string($data['ChucVu'] ?? '');
        
        // Validate dữ liệu
        if (empty($manv)) {
            http_response_code(400);
            echo json_encode(['error' => 'Mã nhân viên không hợp lệ'], JSON_UNESCAPED_UNICODE);
            break;
        }

        // Nếu isApproved = 1 (duyệt), bắt buộc phải có MaTram và ChucVu
        if ($isApproved === 1) {
            if (empty($maTram) || empty($chucVu)) {
                http_response_code(400);
                echo json_encode(['error' => 'Vui lòng chọn trạm làm việc và chức vụ cho nhân viên khi duyệt'], JSON_UNESCAPED_UNICODE);
                break;
            }
        }
        
        // Kiểm tra xem nhân viên có tồn tại không
        $checkResult = $conn->query("SELECT MaNV FROM NhanVien WHERE MaNV = '$manv'");
        if (!$checkResult || $checkResult->num_rows === 0) {
            http_response_code(404);
            echo json_encode(['error' => 'Không tìm thấy nhân viên'], JSON_UNESCAPED_UNICODE);
            break;
        }
        
        // Không cho phép admin tự khóa chính mình
        if ($manv === $admin['MaNV'] && $isApproved == 0) {
            http_response_code(400);
            echo json_encode(['error' => 'Không thể khóa chính tài khoản admin của bạn'], JSON_UNESCAPED_UNICODE);
            break;
        }
        
        // Chuẩn bị câu lệnh SQL UPDATE
        if ($isApproved === 1) {
            // Khi duyệt: cập nhật cả is_approved, MaTram và ChucVu
            // "isss": integer, string, string, string
            $stmt = $conn->prepare("UPDATE NhanVien SET is_approved = ?, MaTram = ?, ChucVu = ? WHERE MaNV = ?");
            $stmt->bind_param("isss", $isApproved, $maTram, $chucVu, $manv);
        } else {
            // Khi khóa / từ chối: chỉ cập nhật is_approved
            // "is": integer, string
            $stmt = $conn->prepare("UPDATE NhanVien SET is_approved = ? WHERE MaNV = ?");
            $stmt->bind_param("is", $isApproved, $manv);
        }
        
        // Thực thi câu lệnh
        if ($stmt->execute()) {
            // Nếu thành công, trả về thông báo thành công
            $message = $isApproved ? 'Duyệt nhân viên thành công' : 'Khóa nhân viên thành công';
            echo json_encode(['message' => $message], JSON_UNESCAPED_UNICODE);
        } else {
            // Nếu thất bại, trả về lỗi
            http_response_code(400);
            echo json_encode(['error' => 'Không thể cập nhật trạng thái nhân viên'], JSON_UNESCAPED_UNICODE);
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

