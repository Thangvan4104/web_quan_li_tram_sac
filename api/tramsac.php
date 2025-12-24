<?php
/**
 * File: api/tramsac.php
 * Mô tả: API endpoint để quản lý trạm sạc (CRUD operations)
 * Chức năng: Xử lý các request GET, POST, PUT, DELETE cho trạm sạc
 * Bảng dữ liệu: TramSac
 * Tác giả: Hệ thống quản lý trạm sạc
 */

// ============================================
// CẤU HÌNH HEADER HTTP
// ============================================

// Thiết lập Content-Type là JSON với encoding UTF-8
// Mục đích: Đảm bảo response trả về là JSON và hỗ trợ tiếng Việt
header('Content-Type: application/json; charset=utf-8');

// Cấu hình CORS để hỗ trợ credentials (cookies/session)
// QUAN TRỌNG: Khi dùng credentials, không thể dùng '*' cho Origin
// Phải chỉ định domain cụ thể hoặc lấy từ request header

// Include file cấu hình CORS để sử dụng hàm setCORSHeaders()
require_once '../config/cors.php';

// Set CORS headers với origin cụ thể và credentials
setCORSHeaders();

// ============================================
// INCLUDE FILE CẤU HÌNH
// ============================================

// Include file cấu hình database để sử dụng hàm getDBConnection()
require_once '../config/database.php';

// Include file cấu hình auth để kiểm tra quyền truy cập
require_once '../config/auth.php';

// ============================================
// XỬ LÝ REQUEST METHOD
// ============================================

// Lấy phương thức HTTP từ request (GET, POST, PUT, DELETE, OPTIONS)
// $_SERVER['REQUEST_METHOD']: Biến superglobal chứa phương thức HTTP
$method = $_SERVER['REQUEST_METHOD'];

// Xử lý preflight request (OPTIONS) cho CORS
// Preflight: Browser tự động gửi OPTIONS request trước khi gửi request thực
if ($method === 'OPTIONS') {
    // Trả về mã 200 (OK) và dừng xử lý
    http_response_code(200);
    exit();
}

// ============================================
// KIỂM TRA QUYỀN TRUY CẬP
// ============================================

// Kiểm tra user đã đăng nhập và được duyệt
// requireStaff(): Yêu cầu user phải là staff hoặc admin, đã đăng nhập và được duyệt
// Nếu không thỏa mãn, hàm này sẽ trả về lỗi và dừng script
$user = requireStaff();

// Tạo kết nối đến database
// getDBConnection(): Hàm từ config/database.php trả về đối tượng mysqli
$conn = getDBConnection();

// ============================================
// XỬ LÝ CÁC PHƯƠNG THỨC HTTP
// ============================================

// Sử dụng switch-case để xử lý từng phương thức HTTP khác nhau
switch ($method) {
    // ============================================
    // GET: Lấy danh sách hoặc chi tiết trạm sạc
    // ============================================
    case 'GET':
        // Kiểm tra xem có tham số id trong URL không
        // isset(): Kiểm tra biến có tồn tại và không null
        if (isset($_GET['id'])) {
            // Nếu có id, lấy thông tin một trạm sạc cụ thể
            
            // Escape string để tránh SQL injection
            // real_escape_string(): Thêm backslash trước các ký tự đặc biệt SQL
            $id = $conn->real_escape_string($_GET['id']);
            
            // Câu lệnh SQL lấy thông tin chi tiết trạm sạc
            // Bao gồm:
            //  - SoCotSac: Tổng số cột sạc thuộc trạm
            //  - SoNhanVien: Tổng số nhân viên thuộc trạm
            //  - LoaiCotSac: Danh sách loại cổng sạc (DISTINCT) phân tách bởi dấu phẩy
            //  - QuanLyTram: Danh sách tên quản lý trạm (ChucVu = 'Quản lý trạm')
            $sql = "
                SELECT 
                    t.*,
                    (SELECT COUNT(*) FROM CotSac WHERE MaTram = t.MaTram) AS SoCotSac,
                    (SELECT COUNT(*) FROM NhanVien WHERE MaTram = t.MaTram) AS SoNhanVien,
                    (SELECT GROUP_CONCAT(DISTINCT LoaiCongSac SEPARATOR ', ') 
                     FROM CotSac 
                     WHERE MaTram = t.MaTram) AS LoaiCotSac,
                    (SELECT GROUP_CONCAT(HoTen SEPARATOR ', ') 
                     FROM NhanVien 
                     WHERE MaTram = t.MaTram AND ChucVu = 'Quản lý trạm') AS QuanLyTram
                FROM TramSac t
                WHERE t.MaTram = '$id'
            ";
            
            $result = $conn->query($sql);
            
            // Lấy dòng dữ liệu đầu tiên dưới dạng associative array
            // fetch_assoc(): Trả về mảng với key là tên cột
            $tram = $result->fetch_assoc();
            
            // Kiểm tra xem có tìm thấy trạm sạc không
            if ($tram) {
                // Nếu là staff (không phải admin), kiểm tra xem trạm có thuộc trạm của nhân viên không
                $isAdmin = ($user['role'] === 'admin');
                $userMaTram = $user['MaTram'] ?? null;
                
                if (!$isAdmin && $userMaTram && $tram['MaTram'] !== $userMaTram) {
                    // Staff không có quyền xem trạm khác
                    http_response_code(403);
                    echo json_encode(['error' => 'Bạn không có quyền xem trạm sạc này'], JSON_UNESCAPED_UNICODE);
                } else {
                    // Trả về dữ liệu dưới dạng JSON
                    // json_encode(): Chuyển mảng PHP sang JSON
                    // JSON_UNESCAPED_UNICODE: Giữ nguyên ký tự Unicode (tiếng Việt)
                    echo json_encode($tram, JSON_UNESCAPED_UNICODE);
                }
            } else {
                // Nếu không tìm thấy, trả về lỗi 404
                http_response_code(404);
                echo json_encode(['error' => 'Trạm sạc không tồn tại'], JSON_UNESCAPED_UNICODE);
            }
        } else {
            // Nếu không có id, lấy tất cả trạm sạc
            // Nếu là staff (không phải admin), chỉ lấy trạm của nhân viên đó
            
            // Kiểm tra xem user có phải admin không
            $isAdmin = ($user['role'] === 'admin');
            $userMaTram = $user['MaTram'] ?? null;
            
            // Xây dựng điều kiện WHERE
            $whereClause = "";
            if (!$isAdmin && $userMaTram) {
                // Staff chỉ thấy trạm của mình
                $userMaTram = $conn->real_escape_string($userMaTram);
                $whereClause = "WHERE t.MaTram = '$userMaTram'";
            }
            
            // Câu lệnh SQL với subquery để lấy thông tin tổng hợp
            // t.*: Lấy tất cả cột từ bảng TramSac (alias t)
            // SoCotSac: Tổng số cột sạc
            // SoNhanVien: Tổng số nhân viên
            // LoaiCotSac: Danh sách loại cổng sạc (DISTINCT)
            // QuanLyTram: Danh sách tên quản lý trạm
            $sql = "
                SELECT 
                    t.*,
                    (SELECT COUNT(*) FROM CotSac WHERE MaTram = t.MaTram) AS SoCotSac,
                    (SELECT COUNT(*) FROM NhanVien WHERE MaTram = t.MaTram) AS SoNhanVien,
                    (SELECT GROUP_CONCAT(DISTINCT LoaiCongSac SEPARATOR ', ') 
                     FROM CotSac 
                     WHERE MaTram = t.MaTram) AS LoaiCotSac,
                    (SELECT GROUP_CONCAT(HoTen SEPARATOR ', ') 
                     FROM NhanVien 
                     WHERE MaTram = t.MaTram AND ChucVu = 'Quản lý trạm') AS QuanLyTram
                FROM TramSac t 
                $whereClause
                ORDER BY t.MaTram
            ";
            
            $result = $conn->query($sql);
            
            // Khởi tạo mảng để chứa danh sách trạm sạc
            $trams = [];
            
            // Duyệt qua từng dòng kết quả
            // while: Lặp cho đến khi không còn dòng nào
            while ($row = $result->fetch_assoc()) {
                // Thêm mỗi trạm sạc vào mảng
                $trams[] = $row;
            }
            
            // Trả về danh sách dưới dạng JSON
            echo json_encode($trams, JSON_UNESCAPED_UNICODE);
        }
        break;
        
    // ============================================
    // POST: Tạo trạm sạc mới
    // ============================================
    case 'POST':
        // Đọc dữ liệu JSON từ request body
        // file_get_contents('php://input'): Đọc raw data từ request body
        // json_decode(..., true): Chuyển JSON sang mảng PHP (true = associative array)
        $data = json_decode(file_get_contents('php://input'), true);
        
        // Lấy các giá trị từ dữ liệu JSON và escape để tránh SQL injection
        // ??: Toán tử null coalescing, trả về giá trị mặc định nếu null/undefined
        $matram = $conn->real_escape_string($data['MaTram'] ?? '');        // Mã trạm (CHAR(5))
        $tentram = $conn->real_escape_string($data['TenTram'] ?? '');       // Tên trạm
        $diachi = $conn->real_escape_string($data['DiaChi'] ?? '');         // Địa chỉ
        $thanhpho = $conn->real_escape_string($data['ThanhPho'] ?? '');     // Thành phố
        $trangthai = $conn->real_escape_string($data['TrangThai'] ?? 'Hoạt động'); // Trạng thái (mặc định: Hoạt động)
        
        // Chuẩn bị câu lệnh SQL INSERT với prepared statement
        // prepare(): Chuẩn bị câu lệnh SQL, ? là placeholder cho giá trị
        // INSERT INTO: Chèn dữ liệu mới vào bảng
        $stmt = $conn->prepare("INSERT INTO TramSac (MaTram, TenTram, DiaChi, ThanhPho, TrangThai) VALUES (?, ?, ?, ?, ?)");
        
        // Bind các tham số vào câu lệnh SQL
        // bind_param(): Gán giá trị cho các placeholder
        // "sssss": 5 tham số, tất cả đều là string (s)
        // Thứ tự: MaTram, TenTram, DiaChi, ThanhPho, TrangThai
        $stmt->bind_param("sssss", $matram, $tentram, $diachi, $thanhpho, $trangthai);
        
        // Thực thi câu lệnh SQL
        if ($stmt->execute()) {
            // Nếu thành công, trả về mã 201 (Created)
            http_response_code(201);
            echo json_encode(['message' => 'Tạo trạm sạc thành công'], JSON_UNESCAPED_UNICODE);
        } else {
            // Nếu thất bại, trả về mã 400 (Bad Request) và thông báo lỗi
            http_response_code(400);
            // $stmt->error: Lấy thông báo lỗi từ MySQL
            echo json_encode(['error' => 'Không thể tạo trạm sạc: ' . $stmt->error], JSON_UNESCAPED_UNICODE);
        }
        
        // Đóng statement để giải phóng tài nguyên
        $stmt->close();
        break;
        
    // ============================================
    // PUT: Cập nhật thông tin trạm sạc
    // ============================================
    case 'PUT':
        // Đọc dữ liệu JSON từ request body
        $data = json_decode(file_get_contents('php://input'), true);
        
        // Lấy mã trạm cần cập nhật
        $matram = $conn->real_escape_string($data['MaTram'] ?? '');
        
        // Lấy các giá trị cần cập nhật
        $tentram = $conn->real_escape_string($data['TenTram'] ?? '');
        $diachi = $conn->real_escape_string($data['DiaChi'] ?? '');
        $thanhpho = $conn->real_escape_string($data['ThanhPho'] ?? '');
        $trangthai = $conn->real_escape_string($data['TrangThai'] ?? 'Hoạt động');
        
        // Chuẩn bị câu lệnh SQL UPDATE
        // UPDATE: Cập nhật dữ liệu trong bảng
        // SET: Thiết lập giá trị mới cho các cột
        // WHERE: Điều kiện để xác định dòng cần cập nhật
        $stmt = $conn->prepare("UPDATE TramSac SET TenTram=?, DiaChi=?, ThanhPho=?, TrangThai=? WHERE MaTram=?");
        
        // Bind các tham số
        // "sssss": 5 tham số string, thứ tự: TenTram, DiaChi, ThanhPho, TrangThai, MaTram
        $stmt->bind_param("sssss", $tentram, $diachi, $thanhpho, $trangthai, $matram);
        
        // Thực thi câu lệnh
        if ($stmt->execute()) {
            // Nếu thành công, trả về thông báo thành công
            echo json_encode(['message' => 'Cập nhật trạm sạc thành công'], JSON_UNESCAPED_UNICODE);
        } else {
            // Nếu thất bại, trả về lỗi
            http_response_code(400);
            echo json_encode(['error' => 'Không thể cập nhật trạm sạc'], JSON_UNESCAPED_UNICODE);
        }
        
        // Đóng statement
        $stmt->close();
        break;
        
    // ============================================
    // DELETE: Xóa trạm sạc
    // ============================================
    case 'DELETE':
        // Lấy ID của trạm sạc cần xóa từ tham số URL
        $id = $conn->real_escape_string($_GET['id'] ?? '');
        
        // Kiểm tra tính hợp lệ của ID
        // empty(): Kiểm tra xem biến có rỗng không (null, '', 0, false)
        if (empty($id)) {
            // Nếu ID không hợp lệ, trả về lỗi 400
            http_response_code(400);
            echo json_encode(['error' => 'Mã trạm không hợp lệ'], JSON_UNESCAPED_UNICODE);
            break; // Dừng xử lý
        }
        
        // Chuẩn bị câu lệnh SQL DELETE
        // DELETE FROM: Xóa dòng từ bảng
        // WHERE: Điều kiện để xác định dòng cần xóa
        $stmt = $conn->prepare("DELETE FROM TramSac WHERE MaTram=?");
        
        // Bind tham số: "s" = string
        $stmt->bind_param("s", $id);
        
        // Thực thi câu lệnh
        if ($stmt->execute()) {
            // Nếu thành công, trả về thông báo thành công
            echo json_encode(['message' => 'Xóa trạm sạc thành công'], JSON_UNESCAPED_UNICODE);
        } else {
            // Nếu thất bại, trả về lỗi
            http_response_code(400);
            echo json_encode(['error' => 'Không thể xóa trạm sạc'], JSON_UNESCAPED_UNICODE);
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

// Đóng kết nối database để giải phóng tài nguyên
// closeDBConnection(): Hàm từ config/database.php
closeDBConnection($conn);
?>
