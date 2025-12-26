<?php
/**
 * File: api/cotsac.php
 * Mô tả: API endpoint để quản lý cột sạc (CRUD operations)
 * Chức năng: Xử lý các request GET, POST, PUT, DELETE cho cột sạc
 * Bảng dữ liệu: CotSac
 * Quan hệ: N-1 với TramSac (Nhiều cột sạc thuộc 1 trạm)
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
    // GET: Lấy danh sách hoặc chi tiết cột sạc
    // ============================================
    case 'GET':
        // Kiểm tra xem có tham số id trong URL không (lấy một cột sạc cụ thể)
        if (isset($_GET['id'])) {
            // Escape string để tránh SQL injection
            $id = $conn->real_escape_string($_GET['id']);
            
            // Câu lệnh SQL với LEFT JOIN để lấy thông tin trạm sạc
            // c.*: Lấy tất cả cột từ bảng CotSac (alias c)
            // t.TenTram, t.DiaChi: Lấy tên trạm và địa chỉ từ bảng TramSac (alias t)
            // LEFT JOIN: Kết nối bảng, giữ lại tất cả dòng từ bảng bên trái (CotSac)
            // ON: Điều kiện kết nối (MaTram của CotSac = MaTram của TramSac)
            $result = $conn->query("SELECT c.*, t.TenTram, t.DiaChi FROM CotSac c 
                                    LEFT JOIN TramSac t ON c.MaTram = t.MaTram 
                                    WHERE c.MaCot = '$id'");
            
            // Lấy dòng dữ liệu đầu tiên
            $cot = $result->fetch_assoc();
            
            // Kiểm tra xem có tìm thấy cột sạc không
            if ($cot) {
                // Nếu là staff (không phải admin), kiểm tra xem cột sạc có thuộc trạm của nhân viên không
                $isAdmin = ($user['role'] === 'admin');
                $userMaTram = $user['MaTram'] ?? null;
                
                if (!$isAdmin && $userMaTram && $cot['MaTram'] !== $userMaTram) {
                    // Staff không có quyền xem cột sạc của trạm khác
                    http_response_code(403);
                    echo json_encode(['error' => 'Bạn không có quyền xem cột sạc này'], JSON_UNESCAPED_UNICODE);
                } else {
                    // Trả về dữ liệu dưới dạng JSON
                    echo json_encode($cot, JSON_UNESCAPED_UNICODE);
                }
            } else {
                // Nếu không tìm thấy, trả về lỗi 404
                http_response_code(404);
                echo json_encode(['error' => 'Cột sạc không tồn tại'], JSON_UNESCAPED_UNICODE);
            }
        } else if (isset($_GET['matram'])) {
            // Nếu có tham số matram, lấy tất cả cột sạc của một trạm cụ thể
            
            // Escape string
            $matram = $conn->real_escape_string($_GET['matram']);
            
            // Kiểm tra quyền: Nếu là staff, chỉ được xem cột sạc của trạm mình
            $isAdmin = ($user['role'] === 'admin');
            $userMaTram = $user['MaTram'] ?? null;
            
            if (!$isAdmin && $userMaTram && $matram !== $userMaTram) {
                // Staff không có quyền xem cột sạc của trạm khác
                http_response_code(403);
                echo json_encode(['error' => 'Bạn không có quyền xem cột sạc của trạm này'], JSON_UNESCAPED_UNICODE);
                break;
            }
            
            // Câu lệnh SQL lấy tất cả cột sạc thuộc trạm được chỉ định
            // WHERE c.MaTram = '$matram': Lọc theo mã trạm
            // ORDER BY c.MaCot: Sắp xếp theo mã cột
            $result = $conn->query("SELECT c.*, t.TenTram FROM CotSac c 
                                    LEFT JOIN TramSac t ON c.MaTram = t.MaTram 
                                    WHERE c.MaTram = '$matram' 
                                    ORDER BY c.MaCot");
            
            // Khởi tạo mảng để chứa danh sách cột sạc
            $cots = [];
            
            // Duyệt qua từng dòng kết quả
            while ($row = $result->fetch_assoc()) {
                // Thêm mỗi cột sạc vào mảng
                $cots[] = $row;
            }
            
            // Trả về danh sách dưới dạng JSON
            echo json_encode($cots, JSON_UNESCAPED_UNICODE);
        } else {
            // Nếu không có tham số, lấy tất cả cột sạc
            // Nếu là staff (không phải admin), chỉ lấy cột sạc của trạm nhân viên đó
            
            // Kiểm tra xem user có phải admin không
            $isAdmin = ($user['role'] === 'admin');
            $userMaTram = $user['MaTram'] ?? null;
            
            // Xây dựng điều kiện WHERE
            $whereClause = "";
            if (!$isAdmin && $userMaTram) {
                // Staff chỉ thấy cột sạc của trạm mình
                $userMaTram = $conn->real_escape_string($userMaTram);
                $whereClause = "WHERE c.MaTram = '$userMaTram'";
            }
            
            // Câu lệnh SQL lấy tất cả cột sạc với thông tin trạm
            $result = $conn->query("SELECT c.*, t.TenTram, t.DiaChi FROM CotSac c 
                                    LEFT JOIN TramSac t ON c.MaTram = t.MaTram 
                                    $whereClause
                                    ORDER BY c.MaCot");
            
            // Khởi tạo mảng
            $cots = [];
            
            // Duyệt qua kết quả
            while ($row = $result->fetch_assoc()) {
                $cots[] = $row;
            }
            
            // Trả về danh sách
            echo json_encode($cots, JSON_UNESCAPED_UNICODE);
        }
        break;
        
    // ============================================
    // POST: Tạo cột sạc mới
    // ============================================
    case 'POST':
        // Đọc dữ liệu JSON từ request body
        $data = json_decode(file_get_contents('php://input'), true);
        
        // Lấy các giá trị từ dữ liệu JSON và escape
        $macot = $conn->real_escape_string($data['MaCot'] ?? '');              // Mã cột sạc (CHAR(5))
        $loaicong = $conn->real_escape_string($data['LoaiCongSac'] ?? '');      // Loại cổng sạc (VD: Type 2 AC, CCS2 DC)
        $congsuat = intval($data['CongSuat'] ?? 0);                              // Công suất (kW) - chuyển sang integer
        $tinhtrang = $conn->real_escape_string($data['TinhTrang'] ?? 'Rảnh');   // Tình trạng (mặc định: Rảnh)
        $matram = $conn->real_escape_string($data['MaTram'] ?? '');             // Mã trạm sạc chủ quản
        
        // Chuẩn bị câu lệnh SQL INSERT
        // "ssiss": string, string, integer, string, string
        $stmt = $conn->prepare("INSERT INTO CotSac (MaCot, LoaiCongSac, CongSuat, TinhTrang, MaTram) VALUES (?, ?, ?, ?, ?)");
        
        // Bind các tham số
        // s = string, i = integer
        $stmt->bind_param("ssiss", $macot, $loaicong, $congsuat, $tinhtrang, $matram);
        
        // Thực thi câu lệnh
        if ($stmt->execute()) {
            // Nếu thành công, trả về mã 201 (Created)
            http_response_code(201);
            echo json_encode(['message' => 'Tạo cột sạc thành công'], JSON_UNESCAPED_UNICODE);
        } else {
            // Nếu thất bại, trả về mã 400 và thông báo lỗi
            http_response_code(400);
            echo json_encode(['error' => 'Không thể tạo cột sạc: ' . $stmt->error], JSON_UNESCAPED_UNICODE);
        }
        
        // Đóng statement
        $stmt->close();
        break;
        
    // ============================================
    // PUT: Cập nhật thông tin cột sạc
    // ============================================
    case 'PUT':
        // Kiểm tra quyền: Chỉ admin mới được sửa cột sạc
        $isAdmin = ($user['role'] === 'admin');
        if (!$isAdmin) {
            http_response_code(403);
            echo json_encode(['error' => 'Nhân viên chỉ được xem thông tin cột sạc, không được thay đổi thông số'], JSON_UNESCAPED_UNICODE);
            break;
        }
        
        // Đọc dữ liệu JSON từ request body
        $data = json_decode(file_get_contents('php://input'), true);
        
        // Lấy mã cột sạc cần cập nhật
        $macot = $conn->real_escape_string($data['MaCot'] ?? '');
        
        // Lấy các giá trị cần cập nhật
        $loaicong = $conn->real_escape_string($data['LoaiCongSac'] ?? '');
        $congsuat = intval($data['CongSuat'] ?? 0);
        // Không cho phép cập nhật TinhTrang từ form quản lý
        // TinhTrang chỉ được thay đổi tự động từ bảo trì hoặc phiên sạc
        $matram = $conn->real_escape_string($data['MaTram'] ?? '');
        
        // Chuẩn bị câu lệnh SQL UPDATE (không cập nhật TinhTrang)
        // "siss": string, integer, string, string
        $stmt = $conn->prepare("UPDATE CotSac SET LoaiCongSac=?, CongSuat=?, MaTram=? WHERE MaCot=?");
        
        // Bind các tham số
        // "siss": string (LoaiCongSac), integer (CongSuat), string (MaTram), string (MaCot)
        $stmt->bind_param("siss", $loaicong, $congsuat, $matram, $macot);
        
        // Thực thi câu lệnh
        if ($stmt->execute()) {
            // Nếu thành công, trả về thông báo thành công
            echo json_encode(['message' => 'Cập nhật cột sạc thành công'], JSON_UNESCAPED_UNICODE);
        } else {
            // Nếu thất bại, trả về lỗi
            http_response_code(400);
            echo json_encode(['error' => 'Không thể cập nhật cột sạc'], JSON_UNESCAPED_UNICODE);
        }
        
        // Đóng statement
        $stmt->close();
        break;
        
    // ============================================
    // DELETE: Xóa cột sạc
    // ============================================
    case 'DELETE':
        // Lấy ID của cột sạc cần xóa từ tham số URL
        $id = $conn->real_escape_string($_GET['id'] ?? '');
        
        // Kiểm tra tính hợp lệ của ID
        if (empty($id)) {
            // Nếu ID không hợp lệ, trả về lỗi 400
            http_response_code(400);
            echo json_encode(['error' => 'Mã cột sạc không hợp lệ'], JSON_UNESCAPED_UNICODE);
            break; // Dừng xử lý
        }
        
        // Chuẩn bị câu lệnh SQL DELETE
        $stmt = $conn->prepare("DELETE FROM CotSac WHERE MaCot=?");
        
        // Bind tham số: "s" = string
        $stmt->bind_param("s", $id);
        
        // Thực thi câu lệnh
        if ($stmt->execute()) {
            // Nếu thành công, trả về thông báo thành công
            echo json_encode(['message' => 'Xóa cột sạc thành công'], JSON_UNESCAPED_UNICODE);
        } else {
            // Nếu thất bại, trả về lỗi
            http_response_code(400);
            echo json_encode(['error' => 'Không thể xóa cột sạc'], JSON_UNESCAPED_UNICODE);
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
