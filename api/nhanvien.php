<?php
/**
 * File: api/nhanvien.php
 * Mô tả: API endpoint để quản lý nhân viên (CRUD operations)
 * 
 * Tác giả: Hệ thống quản lý trạm sạc
 * 
 * Chức năng chính:
 *   - GET: Lấy danh sách hoặc chi tiết nhân viên
 *   - POST: Tạo nhân viên mới (tự động generate MaNV, set password mặc định "staff123")
 *   - PUT: Cập nhật thông tin nhân viên (với validation đầy đủ)
 *   - DELETE: Xóa nhân viên (với kiểm tra ràng buộc)
 * 
 * Bảng dữ liệu: NhanVien
 * 
 * Quan hệ với các bảng khác:
 *   - N-1 với TramSac: Nhiều nhân viên làm việc tại 1 trạm (Foreign Key: MaTram)
 *   - 1-N với BaoTri: 1 nhân viên có thể thực hiện nhiều phiếu bảo trì (Foreign Key: MaNV)
 * 
 * Quyền truy cập:
 *   - GET: Tất cả nhân viên đã đăng nhập (requireStaff)
 *   - POST/PUT/DELETE: CHỈ ADMIN (cần kiểm tra thêm trong logic)
 * 
 * Validation:
 *   - Email: Phải hợp lệ và UNIQUE
 *   - SDT: UNIQUE (nếu có)
 *   - MaNV: UNIQUE (tự động generate nếu không có)
 *   - MaTram: Phải tồn tại trong bảng TramSac
 *   - HoTen, ChucVu: Bắt buộc
 * 
 * Bảo mật:
 *   - Sử dụng prepared statements để tránh SQL injection
 *   - Escape tất cả user input với real_escape_string()
 *   - Kiểm tra quyền truy cập cho các thao tác nhạy cảm
 *   - Không cho phép xóa chính tài khoản đang đăng nhập
 *   - Kiểm tra ràng buộc trước khi xóa (nhân viên có đang được sử dụng trong BaoTri không)
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

// Include file helpers để dùng hàm generateMaNV
require_once '../config/helpers.php';

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
// Lưu ý: Chỉ admin mới có quyền tạo/sửa/xóa nhân viên, nhưng staff có thể xem
$user = requireStaff();

// Tạo kết nối đến database
$conn = getDBConnection();

// ============================================
// XỬ LÝ CÁC PHƯƠNG THỨC HTTP
// ============================================

switch ($method) {
    // ============================================
    // GET: Lấy danh sách hoặc chi tiết nhân viên
    // ============================================
    case 'GET':
        // Kiểm tra xem có tham số id trong URL không (lấy một nhân viên cụ thể)
        if (isset($_GET['id'])) {
            // Escape string để tránh SQL injection
            $id = $conn->real_escape_string($_GET['id']);
            
            // Câu lệnh SQL với LEFT JOIN để lấy thông tin trạm sạc
            // nv.*: Lấy tất cả cột từ bảng NhanVien (alias nv)
            // t.TenTram, t.DiaChi: Tên trạm và địa chỉ từ bảng TramSac (alias t)
            // LEFT JOIN: Kết nối với bảng TramSac để lấy thông tin trạm làm việc
            // ON nv.MaTram = t.MaTram: Điều kiện kết nối
            // WHERE nv.MaNV = '$id': Lọc theo mã nhân viên
            $result = $conn->query("SELECT nv.*, t.TenTram, t.DiaChi 
                                    FROM NhanVien nv 
                                    LEFT JOIN TramSac t ON nv.MaTram = t.MaTram 
                                    WHERE nv.MaNV = '$id'");
            
            // Lấy dòng dữ liệu đầu tiên
            $nv = $result->fetch_assoc();
            
            // Kiểm tra xem có tìm thấy nhân viên không
            if ($nv) {
                // Nếu là staff (không phải admin), kiểm tra xem nhân viên có cùng trạm không
                $isAdmin = ($user['role'] === 'admin');
                $userMaTram = $user['MaTram'] ?? null;
                
                if (!$isAdmin && $userMaTram && $nv['MaTram'] !== $userMaTram) {
                    // Staff không có quyền xem nhân viên của trạm khác
                    http_response_code(403);
                    echo json_encode(['error' => 'Bạn không có quyền xem nhân viên này'], JSON_UNESCAPED_UNICODE);
                } else {
                    // Trả về dữ liệu dưới dạng JSON
                    echo json_encode($nv, JSON_UNESCAPED_UNICODE);
                }
            } else {
                // Nếu không tìm thấy, trả về lỗi 404
                http_response_code(404);
                echo json_encode(['error' => 'Nhân viên không tồn tại'], JSON_UNESCAPED_UNICODE);
            }
        } else if (isset($_GET['matram'])) {
            // Nếu có tham số matram, lấy tất cả nhân viên của một trạm
            
            // Escape string
            $matram = $conn->real_escape_string($_GET['matram']);
            
            // Câu lệnh SQL lấy tất cả nhân viên thuộc trạm được chỉ định
            // WHERE MaTram = '$matram': Lọc theo mã trạm
            // ORDER BY MaNV: Sắp xếp theo mã nhân viên
            $result = $conn->query("SELECT * FROM NhanVien WHERE MaTram = '$matram' ORDER BY MaNV");
            
            // Khởi tạo mảng để chứa danh sách nhân viên
            $nvs = [];
            
            // Duyệt qua từng dòng kết quả
            while ($row = $result->fetch_assoc()) {
                // Thêm mỗi nhân viên vào mảng
                $nvs[] = $row;
            }
            
            // Trả về danh sách dưới dạng JSON
            echo json_encode($nvs, JSON_UNESCAPED_UNICODE);
        } else {
            // Nếu không có tham số, lấy tất cả nhân viên
            // Nếu là staff (không phải admin), chỉ lấy nhân viên cùng trạm
            
            // Kiểm tra xem user có phải admin không
            $isAdmin = ($user['role'] === 'admin');
            $userMaTram = $user['MaTram'] ?? null;
            
            // Xây dựng điều kiện WHERE
            $whereClause = "";
            if (!$isAdmin && $userMaTram) {
                // Staff chỉ thấy nhân viên cùng trạm
                $userMaTram = $conn->real_escape_string($userMaTram);
                $whereClause = "WHERE nv.MaTram = '$userMaTram'";
            }
            
            // Câu lệnh SQL lấy tất cả nhân viên với thông tin trạm
            // LEFT JOIN để lấy TenTram từ bảng TramSac
            $result = $conn->query("SELECT nv.*, t.TenTram 
                                    FROM NhanVien nv 
                                    LEFT JOIN TramSac t ON nv.MaTram = t.MaTram 
                                    $whereClause
                                    ORDER BY nv.MaNV");
            
            // Khởi tạo mảng
            $nvs = [];
            
            // Duyệt qua kết quả
            while ($row = $result->fetch_assoc()) {
                $nvs[] = $row;
            }
            
            // Trả về danh sách
            echo json_encode($nvs, JSON_UNESCAPED_UNICODE);
        }
        break;
        
    // ============================================
    // POST: Tạo nhân viên mới
    // ============================================
    case 'POST':
        // Đọc dữ liệu JSON từ request body
        $data = json_decode(file_get_contents('php://input'), true);
        
        // Lấy các giá trị từ dữ liệu JSON và escape
        $manv = $conn->real_escape_string($data['MaNV'] ?? '');              // Mã nhân viên (CHAR(5))
        $hoten = $conn->real_escape_string($data['HoTen'] ?? '');            // Họ tên nhân viên
        $sdt = $conn->real_escape_string($data['SDT'] ?? '');                // Số điện thoại (UNIQUE)
        $email = $conn->real_escape_string($data['Email'] ?? '');             // Email (UNIQUE)
        $chucvu = $conn->real_escape_string($data['ChucVu'] ?? '');          // Chức vụ (VD: Quản lý trạm, Nhân viên kỹ thuật)
        $matram = $conn->real_escape_string($data['MaTram'] ?? '');          // Mã trạm sạc làm việc (Foreign Key)
        
        // Validate dữ liệu bắt buộc
        if (empty($hoten) || empty($email) || empty($chucvu) || empty($matram)) {
            http_response_code(400);
            echo json_encode(['error' => 'Vui lòng điền đầy đủ thông tin bắt buộc: Họ tên, Email, Chức vụ, Trạm làm việc'], JSON_UNESCAPED_UNICODE);
            break;
        }
        
        // Validate email format (cơ bản)
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            http_response_code(400);
            echo json_encode(['error' => 'Email không hợp lệ'], JSON_UNESCAPED_UNICODE);
            break;
        }
        
        // Kiểm tra email có bị trùng không (Email là UNIQUE trong database)
        $emailCheck = $conn->query("SELECT MaNV FROM NhanVien WHERE Email = '$email'");
        if ($emailCheck && $emailCheck->num_rows > 0) {
            http_response_code(400);
            echo json_encode(['error' => 'Email đã được sử dụng bởi nhân viên khác'], JSON_UNESCAPED_UNICODE);
            break;
        }
        
        // Kiểm tra SĐT có bị trùng không (nếu có SĐT, SĐT là UNIQUE trong database)
        if (!empty($sdt)) {
            $sdtCheck = $conn->query("SELECT MaNV FROM NhanVien WHERE SDT = '$sdt'");
            if ($sdtCheck && $sdtCheck->num_rows > 0) {
                http_response_code(400);
                echo json_encode(['error' => 'Số điện thoại đã được sử dụng bởi nhân viên khác'], JSON_UNESCAPED_UNICODE);
                break;
            }
        }
        
        // Kiểm tra trạm sạc có tồn tại không
        $tramCheck = $conn->query("SELECT MaTram FROM TramSac WHERE MaTram = '$matram'");
        if (!$tramCheck || $tramCheck->num_rows === 0) {
            http_response_code(400);
            echo json_encode(['error' => 'Trạm sạc không tồn tại'], JSON_UNESCAPED_UNICODE);
            break;
        }
        
        // Tự động tạo mã nhân viên nếu không được cung cấp
        // generateMaNV(): Hàm từ helpers.php, tự động tạo mã NV tiếp theo (NV001, NV002, ...)
        if (empty($manv)) {
            $manv = generateMaNV($conn);
        } else {
            // Nếu có cung cấp mã, kiểm tra mã có bị trùng không
            $manvCheck = $conn->query("SELECT MaNV FROM NhanVien WHERE MaNV = '$manv'");
            if ($manvCheck && $manvCheck->num_rows > 0) {
                http_response_code(400);
                echo json_encode(['error' => 'Mã nhân viên đã tồn tại'], JSON_UNESCAPED_UNICODE);
                break;
            }
        }
        
        // Mật khẩu mặc định cho nhân viên mới: staff123
        $defaultPassword = 'staff123';
        $hashedPassword = password_hash($defaultPassword, PASSWORD_DEFAULT);
        
        // Khi admin tạo nhân viên mới, tự động duyệt (is_approved = 1) và set is_first_login = 1
        $isApproved = 1; // Đã duyệt luôn khi admin tạo
        $isFirstLogin = 1; // Bắt buộc đổi mật khẩu lần đầu
        
        // Chuẩn bị câu lệnh SQL INSERT
        // "sssssss": 7 tham số string
        $stmt = $conn->prepare("INSERT INTO NhanVien (MaNV, HoTen, SDT, Email, ChucVu, MaTram, password, is_approved, is_first_login, role) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'staff')");
        
        // Bind các tham số
        $stmt->bind_param("sssssssii", $manv, $hoten, $sdt, $email, $chucvu, $matram, $hashedPassword, $isApproved, $isFirstLogin);
        
        // Thực thi câu lệnh
        if ($stmt->execute()) {
            // Nếu thành công, trả về mã 201 (Created) và mã nhân viên đã tạo
            http_response_code(201);
            echo json_encode(['message' => 'Tạo nhân viên thành công', 'MaNV' => $manv], JSON_UNESCAPED_UNICODE);
        } else {
            // Nếu thất bại, trả về mã 400 và thông báo lỗi
            http_response_code(400);
            echo json_encode(['error' => 'Không thể tạo nhân viên: ' . $stmt->error], JSON_UNESCAPED_UNICODE);
        }
        
        // Đóng statement
        $stmt->close();
        break;
        
    // ============================================
    // PUT: Cập nhật thông tin nhân viên
    // ============================================
    case 'PUT':
        // Đọc dữ liệu JSON từ request body
        // file_get_contents('php://input'): Đọc dữ liệu raw từ request body
        // json_decode(..., true): Chuyển JSON string sang mảng PHP (associative array)
        $data = json_decode(file_get_contents('php://input'), true);
        
        // Lấy mã nhân viên cần cập nhật (bắt buộc)
        $manv = $conn->real_escape_string($data['MaNV'] ?? '');
        
        // Validate: Mã nhân viên không được rỗng
        if (empty($manv)) {
            http_response_code(400);
            echo json_encode(['error' => 'Mã nhân viên không được để trống'], JSON_UNESCAPED_UNICODE);
            break;
        }
        
        // Kiểm tra nhân viên có tồn tại không
        $checkResult = $conn->query("SELECT MaNV FROM NhanVien WHERE MaNV = '$manv'");
        if (!$checkResult || $checkResult->num_rows === 0) {
            http_response_code(404);
            echo json_encode(['error' => 'Không tìm thấy nhân viên'], JSON_UNESCAPED_UNICODE);
            break;
        }
        
        // Lấy các giá trị cần cập nhật từ request
        $hoten = $conn->real_escape_string($data['HoTen'] ?? '');
        $sdt = $conn->real_escape_string($data['SDT'] ?? '');
        $email = $conn->real_escape_string($data['Email'] ?? '');
        $chucvu = $conn->real_escape_string($data['ChucVu'] ?? '');
        $matram = $conn->real_escape_string($data['MaTram'] ?? '');
        
        // Validate các trường bắt buộc
        if (empty($hoten) || empty($email) || empty($chucvu) || empty($matram)) {
            http_response_code(400);
            echo json_encode(['error' => 'Vui lòng điền đầy đủ thông tin bắt buộc: Họ tên, Email, Chức vụ, Trạm làm việc'], JSON_UNESCAPED_UNICODE);
            break;
        }
        
        // Validate email format (cơ bản)
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            http_response_code(400);
            echo json_encode(['error' => 'Email không hợp lệ'], JSON_UNESCAPED_UNICODE);
            break;
        }
        
        // Kiểm tra email có bị trùng với nhân viên khác không (trừ chính nhân viên này)
        $emailCheck = $conn->query("SELECT MaNV FROM NhanVien WHERE Email = '$email' AND MaNV != '$manv'");
        if ($emailCheck && $emailCheck->num_rows > 0) {
            http_response_code(400);
            echo json_encode(['error' => 'Email đã được sử dụng bởi nhân viên khác'], JSON_UNESCAPED_UNICODE);
            break;
        }
        
        // Kiểm tra SĐT có bị trùng với nhân viên khác không (nếu có SĐT)
        if (!empty($sdt)) {
            $sdtCheck = $conn->query("SELECT MaNV FROM NhanVien WHERE SDT = '$sdt' AND MaNV != '$manv'");
            if ($sdtCheck && $sdtCheck->num_rows > 0) {
                http_response_code(400);
                echo json_encode(['error' => 'Số điện thoại đã được sử dụng bởi nhân viên khác'], JSON_UNESCAPED_UNICODE);
                break;
            }
        }
        
        // Kiểm tra trạm sạc có tồn tại không
        $tramCheck = $conn->query("SELECT MaTram FROM TramSac WHERE MaTram = '$matram'");
        if (!$tramCheck || $tramCheck->num_rows === 0) {
            http_response_code(400);
            echo json_encode(['error' => 'Trạm sạc không tồn tại'], JSON_UNESCAPED_UNICODE);
            break;
        }
        
        // Chuẩn bị câu lệnh SQL UPDATE
        // Prepared statement để tránh SQL injection
        // "ssssss": 6 tham số string, thứ tự: HoTen, SDT, Email, ChucVu, MaTram, MaNV
        $stmt = $conn->prepare("UPDATE NhanVien SET HoTen=?, SDT=?, Email=?, ChucVu=?, MaTram=? WHERE MaNV=?");
        
        // Bind các tham số vào prepared statement
        $stmt->bind_param("ssssss", $hoten, $sdt, $email, $chucvu, $matram, $manv);
        
        // Thực thi câu lệnh
        if ($stmt->execute()) {
            // Nếu thành công, trả về thông báo thành công
            echo json_encode(['message' => 'Cập nhật nhân viên thành công'], JSON_UNESCAPED_UNICODE);
        } else {
            // Nếu thất bại, trả về lỗi với thông báo chi tiết
            http_response_code(400);
            echo json_encode(['error' => 'Không thể cập nhật nhân viên: ' . $stmt->error], JSON_UNESCAPED_UNICODE);
        }
        
        // Đóng statement để giải phóng tài nguyên
        $stmt->close();
        break;
        
    // ============================================
    // DELETE: Xóa nhân viên
    // ============================================
    case 'DELETE':
        // Lấy ID của nhân viên cần xóa từ tham số URL
        // $_GET['id']: Lấy giá trị từ query string (?id=NV001)
        // real_escape_string(): Escape string để tránh SQL injection
        $id = $conn->real_escape_string($_GET['id'] ?? '');
        
        // Kiểm tra tính hợp lệ của ID
        if (empty($id)) {
            // Nếu ID không hợp lệ, trả về lỗi 400
            http_response_code(400);
            echo json_encode(['error' => 'Mã nhân viên không hợp lệ'], JSON_UNESCAPED_UNICODE);
            break; // Dừng xử lý
        }
        
        // Kiểm tra nhân viên có tồn tại không
        $checkResult = $conn->query("SELECT MaNV, HoTen, role FROM NhanVien WHERE MaNV = '$id'");
        if (!$checkResult || $checkResult->num_rows === 0) {
            http_response_code(404);
            echo json_encode(['error' => 'Không tìm thấy nhân viên'], JSON_UNESCAPED_UNICODE);
            break;
        }
        
        $nvInfo = $checkResult->fetch_assoc();
        
        // Không cho phép xóa chính tài khoản đang đăng nhập
        if ($nvInfo['MaNV'] === $user['MaNV']) {
            http_response_code(400);
            echo json_encode(['error' => 'Không thể xóa chính tài khoản của bạn'], JSON_UNESCAPED_UNICODE);
            break;
        }
        
        // Kiểm tra ràng buộc: Nhân viên có đang được sử dụng trong bảng BaoTri không?
        // Nếu nhân viên đã thực hiện bảo trì, không nên xóa để giữ tính toàn vẹn dữ liệu
        $baotriCheck = $conn->query("SELECT COUNT(*) as count FROM BaoTri WHERE MaNV = '$id'");
        if ($baotriCheck) {
            $baotriRow = $baotriCheck->fetch_assoc();
            if ($baotriRow['count'] > 0) {
                http_response_code(400);
                echo json_encode(['error' => 'Không thể xóa nhân viên. Nhân viên này đã thực hiện ' . $baotriRow['count'] . ' phiếu bảo trì. Vui lòng xóa hoặc chuyển giao các phiếu bảo trì trước.'], JSON_UNESCAPED_UNICODE);
                break;
            }
        }
        
        // Chuẩn bị câu lệnh SQL DELETE
        // Prepared statement để tránh SQL injection
        $stmt = $conn->prepare("DELETE FROM NhanVien WHERE MaNV=?");
        
        // Bind tham số: "s" = string
        $stmt->bind_param("s", $id);
        
        // Thực thi câu lệnh
        if ($stmt->execute()) {
            // Nếu thành công, trả về thông báo thành công
            echo json_encode(['message' => 'Xóa nhân viên thành công'], JSON_UNESCAPED_UNICODE);
        } else {
            // Nếu thất bại, trả về lỗi với thông báo chi tiết
            http_response_code(400);
            echo json_encode(['error' => 'Không thể xóa nhân viên: ' . $stmt->error], JSON_UNESCAPED_UNICODE);
        }
        
        // Đóng statement để giải phóng tài nguyên
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
