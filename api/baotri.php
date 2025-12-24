<?php
/**
 * File: api/baotri.php
 * Mô tả: API endpoint để quản lý bảo trì (CRUD operations)
 * 
 * Tác giả: Hệ thống quản lý trạm sạc
 * 
 * Chức năng chính:
 *   - GET: Lấy danh sách hoặc chi tiết phiếu bảo trì (kèm thông tin nhân viên, cột sạc, trạm)
 *   - POST: Tạo phiếu bảo trì mới (tự động cập nhật trạng thái trạm/cột sạc thành "Bảo trì")
 *   - PUT: Cập nhật phiếu bảo trì (tự động cập nhật trạng thái trạm/cột sạc dựa trên trạng thái bảo trì)
 *   - DELETE: Xóa phiếu bảo trì (tự động cập nhật trạng thái trạm/cột sạc về trạng thái ban đầu)
 * 
 * Bảng dữ liệu: BaoTri
 * 
 * Quan hệ với các bảng khác:
 *   - N-1 với NhanVien: Nhiều bảo trì được thực hiện bởi 1 nhân viên (Foreign Key: MaNV)
 *   - N-1 với CotSac: Nhiều bảo trì cho 1 cột sạc, có thể NULL nếu bảo trì toàn trạm (Foreign Key: MaCot, nullable)
 *   - Liên kết gián tiếp với TramSac: Thông qua CotSac (cột sạc thuộc trạm nào)
 * 
 * Quyền truy cập:
 *   - GET: Tất cả nhân viên đã đăng nhập (requireStaff)
 *   - POST/PUT/DELETE: Tùy theo quyền (thường là admin hoặc quản lý trạm)
 * 
 * Logic đặc biệt:
 *   - Khi tạo phiếu bảo trì:
 *     + Nếu có MaCot: Cập nhật CotSac.TinhTrang = 'Bảo trì'
 *     + Nếu không có MaCot nhưng có MaTram: Cập nhật TramSac.TrangThai = 'Bảo trì'
 *   - Khi cập nhật phiếu bảo trì:
 *     + Nếu TrangThai = 'Hoàn tất':
 *       * Nếu có MaCot: Cập nhật CotSac.TinhTrang = 'Rảnh'
 *       * Nếu có MaTram: Cập nhật TramSac.TrangThai = 'Hoạt động'
 *     + Nếu TrangThai ≠ 'Hoàn tất':
 *       * Giữ trạng thái "Bảo trì" cho trạm/cột sạc
 *   - Khi xóa phiếu bảo trì:
 *     + Nếu có MaCot: Cập nhật CotSac.TinhTrang = 'Rảnh'
 *     + Nếu có MaTram: Cập nhật TramSac.TrangThai = 'Hoạt động'
 * 
 * Bảo mật:
 *   - Sử dụng prepared statements để tránh SQL injection
 *   - Escape tất cả user input với real_escape_string()
 *   - Kiểm tra quyền truy cập cho các thao tác nhạy cảm
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
    // GET: Lấy danh sách hoặc chi tiết bảo trì
    // ============================================
    case 'GET':
        // Kiểm tra xem có tham số id trong URL không (lấy một phiếu bảo trì cụ thể)
        if (isset($_GET['id'])) {
            // Escape string để tránh SQL injection
            $id = $conn->real_escape_string($_GET['id']);
            
            // Kiểm tra quyền: Nếu là trưởng trạm, chỉ được xem bảo trì của trạm mình
            $isAdmin = ($user['role'] === 'admin');
            $userMaTram = $user['MaTram'] ?? null;
            $userChucVu = $user['ChucVu'] ?? '';
            $isTruongTram = ($userChucVu === 'Quản lý trạm' || $userChucVu === 'Trưởng trạm');
            
            // Câu lệnh SQL phức tạp với nhiều LEFT JOIN để lấy đầy đủ thông tin
            // bt.*: Lấy tất cả cột từ bảng BaoTri (alias bt)
            // nv.HoTen as TenNhanVien, nv.ChucVu, nv.MaTram as NVMaTram: Thông tin nhân viên thực hiện (bao gồm trạm của nhân viên)
            // c.MaCot, c.LoaiCongSac, c.MaTram as CotMaTram: Thông tin cột sạc (nếu có) và trạm từ cột sạc
            // COALESCE: Ưu tiên lấy MaTram từ cột sạc, nếu NULL thì lấy từ nhân viên (dùng cho bảo trì toàn trạm)
            // t.MaTram, t.TenTram: Thông tin trạm sạc (kết hợp từ cả cột sạc và nhân viên)
            // LEFT JOIN: Kết nối các bảng để lấy thông tin liên quan
            $result = $conn->query("SELECT bt.*, 
                                    nv.HoTen as TenNhanVien, nv.ChucVu, nv.MaTram as NVMaTram,
                                    c.MaCot, c.LoaiCongSac, c.MaTram as CotMaTram,
                                    COALESCE(c.MaTram, nv.MaTram) as MaTram,
                                    COALESCE(ts_cot.TenTram, ts_nv.TenTram) as TenTram
                                    FROM BaoTri bt
                                    LEFT JOIN NhanVien nv ON bt.MaNV = nv.MaNV
                                    LEFT JOIN CotSac c ON bt.MaCot = c.MaCot
                                    LEFT JOIN TramSac ts_cot ON c.MaTram = ts_cot.MaTram
                                    LEFT JOIN TramSac ts_nv ON nv.MaTram = ts_nv.MaTram
                                    WHERE bt.MaBT = '$id'");
            
            // Lấy dòng dữ liệu đầu tiên
            $bt = $result->fetch_assoc();
            
            // Kiểm tra xem có tìm thấy phiếu bảo trì không
            if ($bt) {
                // Kiểm tra quyền: Nếu là trưởng trạm, chỉ được xem bảo trì của trạm mình
                if (!$isAdmin && $isTruongTram && $userMaTram) {
                    $btMaTram = $bt['MaTram'];
                    if ($btMaTram !== $userMaTram) {
                        http_response_code(403);
                        echo json_encode(['error' => 'Bạn chỉ có quyền xem bảo trì của trạm mình'], JSON_UNESCAPED_UNICODE);
                        break;
                    }
                }
                
                // Trả về dữ liệu dưới dạng JSON
                echo json_encode($bt, JSON_UNESCAPED_UNICODE);
            } else {
                // Nếu không tìm thấy, trả về lỗi 404
                http_response_code(404);
                echo json_encode(['error' => 'Phiếu bảo trì không tồn tại'], JSON_UNESCAPED_UNICODE);
            }
        } else {
            // Nếu không có id, lấy tất cả phiếu bảo trì
            // Nếu là staff (không phải admin), chỉ lấy bảo trì của trạm nhân viên đó
            
            // Kiểm tra xem user có phải admin không
            $isAdmin = ($user['role'] === 'admin');
            $userMaTram = $user['MaTram'] ?? null;
            
            // Xây dựng điều kiện WHERE
            $whereClause = "";
            if (!$isAdmin && $userMaTram) {
                // Staff chỉ thấy bảo trì của trạm mình
                $userMaTram = $conn->real_escape_string($userMaTram);
                $whereClause = "WHERE (COALESCE(c.MaTram, nv.MaTram) = '$userMaTram')";
            }
            
            // Lọc bỏ các phiếu bảo trì có MaBT rỗng hoặc không hợp lệ
            $maBTFilter = "AND bt.MaBT IS NOT NULL AND bt.MaBT != '' AND LENGTH(bt.MaBT) = 5";
            if ($whereClause) {
                $whereClause .= " $maBTFilter";
            } else {
                $whereClause = "WHERE 1=1 $maBTFilter";
            }
            
            // Câu lệnh SQL lấy tất cả phiếu bảo trì với thông tin liên quan
            // COALESCE: Ưu tiên lấy MaTram/TenTram từ cột sạc (nếu bảo trì cột sạc)
            //          Nếu NULL (bảo trì toàn trạm), lấy từ nhân viên (nv.MaTram)
            // ORDER BY bt.NgayBaoTri DESC: Sắp xếp theo ngày bảo trì, mới nhất trước
            $result = $conn->query("SELECT bt.*, 
                                    nv.HoTen as TenNhanVien,
                                    c.MaCot, c.LoaiCongSac,
                                    COALESCE(c.MaTram, nv.MaTram) as MaTram,
                                    COALESCE(ts_cot.TenTram, ts_nv.TenTram) as TenTram
                                    FROM BaoTri bt
                                    LEFT JOIN NhanVien nv ON bt.MaNV = nv.MaNV
                                    LEFT JOIN CotSac c ON bt.MaCot = c.MaCot
                                    LEFT JOIN TramSac ts_cot ON c.MaTram = ts_cot.MaTram
                                    LEFT JOIN TramSac ts_nv ON nv.MaTram = ts_nv.MaTram
                                    $whereClause
                                    ORDER BY bt.NgayBaoTri DESC");
            
            // Khởi tạo mảng để chứa danh sách phiếu bảo trì
            $bts = [];
            
            // Duyệt qua từng dòng kết quả
            while ($row = $result->fetch_assoc()) {
                // Thêm mỗi phiếu bảo trì vào mảng
                $bts[] = $row;
            }
            
            // Trả về danh sách dưới dạng JSON
            echo json_encode($bts, JSON_UNESCAPED_UNICODE);
        }
        break;
        
    // ============================================
    // POST: Tạo phiếu bảo trì mới
    // ============================================
    case 'POST':
        // Kiểm tra quyền: Chỉ admin hoặc trưởng trạm mới được tạo bảo trì
        $isAdmin = ($user['role'] === 'admin');
        $userMaTram = $user['MaTram'] ?? null;
        $userChucVu = $user['ChucVu'] ?? '';
        $isTruongTram = ($userChucVu === 'Quản lý trạm' || $userChucVu === 'Trưởng trạm');
        
        // Đọc dữ liệu JSON từ request body
        $data = json_decode(file_get_contents('php://input'), true);
        
        // Lấy các giá trị từ dữ liệu JSON và escape
        // Nếu không có MaBT hoặc MaBT rỗng, tự động tạo mã mới
        if (empty($data['MaBT']) || trim($data['MaBT']) === '') {
            // Tạo mã bảo trì mới: BT + số thứ tự (BT001, BT002, ...)
            // Lọc bỏ các MaBT rỗng hoặc không hợp lệ
            $maxResult = $conn->query("SELECT MAX(CAST(SUBSTRING(MaBT, 3) AS UNSIGNED)) as maxNum 
                                       FROM BaoTri 
                                       WHERE MaBT LIKE 'BT%' 
                                       AND LENGTH(MaBT) = 5 
                                       AND MaBT != ''");
            $maxRow = $maxResult->fetch_assoc();
            $nextNum = ($maxRow['maxNum'] ?? 0) + 1;
            $mabt = 'BT' . str_pad($nextNum, 3, '0', STR_PAD_LEFT); // BT001, BT002, ...
            
            // Đảm bảo MaBT không trùng (trong trường hợp hiếm)
            $checkResult = $conn->query("SELECT MaBT FROM BaoTri WHERE MaBT = '$mabt'");
            $attempts = 0;
            while ($checkResult && $checkResult->num_rows > 0 && $attempts < 100) {
                $nextNum++;
                $mabt = 'BT' . str_pad($nextNum, 3, '0', STR_PAD_LEFT);
                $checkResult = $conn->query("SELECT MaBT FROM BaoTri WHERE MaBT = '$mabt'");
                $attempts++;
            }
        } else {
            $mabt = trim($conn->real_escape_string($data['MaBT']));
            // Validate MaBT format
            if (strlen($mabt) !== 5 || !preg_match('/^BT\d{3}$/', $mabt)) {
                http_response_code(400);
                echo json_encode(['error' => 'Mã phiếu bảo trì không hợp lệ. Format: BT001, BT002, ...'], JSON_UNESCAPED_UNICODE);
                break;
            }
            // Kiểm tra xem MaBT đã tồn tại chưa
            $checkResult = $conn->query("SELECT MaBT FROM BaoTri WHERE MaBT = '$mabt'");
            if ($checkResult && $checkResult->num_rows > 0) {
                http_response_code(400);
                echo json_encode(['error' => 'Mã phiếu bảo trì đã tồn tại'], JSON_UNESCAPED_UNICODE);
                break;
            }
        }
        // Ngày bảo trì: Nếu không có thì dùng ngày hiện tại
        // date('Y-m-d'): Định dạng ngày MySQL (YYYY-MM-DD)
        $ngaybaotri = $conn->real_escape_string($data['NgayBaoTri'] ?? date('Y-m-d'));
        $noidung = $conn->real_escape_string($data['NoiDung'] ?? '');               // Nội dung bảo trì (mô tả công việc)
        $manv = $conn->real_escape_string($data['MaNV'] ?? '');                     // Mã nhân viên thực hiện (Foreign Key)
        // Mã cột sạc: Có thể NULL nếu bảo trì toàn trạm
        $macot = !empty($data['MaCot']) ? $conn->real_escape_string($data['MaCot']) : null;
        // MaTram: Dùng khi bảo trì toàn trạm (không có MaCot)
        $matram = !empty($data['MaTram']) ? $conn->real_escape_string($data['MaTram']) : null;
        $trangthai = $conn->real_escape_string($data['TrangThai'] ?? 'Hoàn tất');   // Trạng thái (mặc định: Hoàn tất)
        
        // Xác định trạm của phiếu bảo trì
        $requestMaTram = null;
        if ($macot) {
            // Nếu có MaCot, lấy MaTram từ cột sạc
            $cotResult = $conn->query("SELECT MaTram FROM CotSac WHERE MaCot = '$macot'");
            if ($cotRow = $cotResult->fetch_assoc()) {
                $requestMaTram = $cotRow['MaTram'];
            }
        } elseif ($matram) {
            // Nếu có MaTram trực tiếp
            $requestMaTram = $matram;
        }
        
        // Kiểm tra quyền: 
        // - Admin: Có thể tạo bảo trì cho mọi trạm
        // - Trưởng trạm: Chỉ được tạo bảo trì cho trạm của mình
        // - Nhân viên thường: Có thể tạo yêu cầu bảo trì cho trạm của mình (từ trang cột sạc)
        if (!$isAdmin) {
            // Nhân viên (bao gồm cả trưởng trạm) chỉ được tạo bảo trì cho trạm của mình
            if ($requestMaTram !== $userMaTram) {
                http_response_code(403);
                echo json_encode(['error' => 'Bạn chỉ có quyền tạo bảo trì cho trạm của mình'], JSON_UNESCAPED_UNICODE);
                break;
            }
        }
        
        // Chuẩn bị câu lệnh SQL INSERT
        // "ssssss": 6 tham số, tất cả đều là string (macot có thể NULL)
        $stmt = $conn->prepare("INSERT INTO BaoTri (MaBT, NgayBaoTri, NoiDung, MaNV, MaCot, TrangThai) VALUES (?, ?, ?, ?, ?, ?)");
        
        // Bind các tham số - xử lý NULL đúng cách
        $stmt->bind_param("ssssss", $mabt, $ngaybaotri, $noidung, $manv, $macot, $trangthai);
        
        // Thực thi câu lệnh
        if ($stmt->execute()) {
            // Nếu bảo trì cột sạc (macot không NULL), cập nhật trạng thái cột sạc thành "Bảo trì"
            // Mục đích: Đánh dấu cột sạc đang được bảo trì, không thể sử dụng
            if ($macot) {
                $conn->query("UPDATE CotSac SET TinhTrang = 'Bảo trì' WHERE MaCot = '$macot'");
            } elseif ($matram) {
                // Nếu bảo trì toàn trạm (không có MaCot nhưng có MaTram), cập nhật trạng thái trạm
                $conn->query("UPDATE TramSac SET TrangThai = 'Bảo trì' WHERE MaTram = '$matram'");
            }
            
            // Trả về mã 201 (Created)
            http_response_code(201);
            echo json_encode(['message' => 'Tạo phiếu bảo trì thành công'], JSON_UNESCAPED_UNICODE);
        } else {
            // Nếu thất bại, trả về mã 400 và thông báo lỗi
            http_response_code(400);
            echo json_encode(['error' => 'Không thể tạo phiếu bảo trì: ' . $stmt->error], JSON_UNESCAPED_UNICODE);
        }
        
        // Đóng statement
        $stmt->close();
        break;
        
    // ============================================
    // PUT: Cập nhật thông tin phiếu bảo trì
    // ============================================
    case 'PUT':
        // Kiểm tra quyền: Chỉ admin hoặc trưởng trạm mới được sửa bảo trì
        $isAdmin = ($user['role'] === 'admin');
        $userMaTram = $user['MaTram'] ?? null;
        $userChucVu = $user['ChucVu'] ?? '';
        $isTruongTram = ($userChucVu === 'Quản lý trạm' || $userChucVu === 'Trưởng trạm');
        
        // Đọc dữ liệu JSON từ request body
        $data = json_decode(file_get_contents('php://input'), true);
        
        // Kiểm tra mã phiếu bảo trì
        if (empty($data['MaBT'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Mã phiếu bảo trì không hợp lệ'], JSON_UNESCAPED_UNICODE);
            break;
        }
        
        // Lấy mã phiếu bảo trì cần cập nhật
        $mabt = $conn->real_escape_string($data['MaBT']);
        
        // Lấy phiếu bảo trì hiện tại để kiểm tra quyền
        $currentBT = $conn->query("SELECT bt.*, 
                                    COALESCE(c.MaTram, nv.MaTram) as MaTram
                                    FROM BaoTri bt
                                    LEFT JOIN NhanVien nv ON bt.MaNV = nv.MaNV
                                    LEFT JOIN CotSac c ON bt.MaCot = c.MaCot
                                    WHERE bt.MaBT = '$mabt'");
        if (!$currentBT || !($btRow = $currentBT->fetch_assoc())) {
            http_response_code(404);
            echo json_encode(['error' => 'Phiếu bảo trì không tồn tại'], JSON_UNESCAPED_UNICODE);
            break;
        }
        
        // Kiểm tra quyền: Nếu là trưởng trạm, chỉ được sửa bảo trì của trạm mình
        if (!$isAdmin && $isTruongTram) {
            $btMaTram = $btRow['MaTram'];
            if ($btMaTram !== $userMaTram) {
                http_response_code(403);
                echo json_encode(['error' => 'Bạn chỉ có quyền sửa bảo trì của trạm mình'], JSON_UNESCAPED_UNICODE);
                break;
            }
        } elseif (!$isAdmin && !$isTruongTram) {
            // Nhân viên thường không được sửa bảo trì
            http_response_code(403);
            echo json_encode(['error' => 'Bạn không có quyền sửa phiếu bảo trì'], JSON_UNESCAPED_UNICODE);
            break;
        }
        
        // Lấy các giá trị cần cập nhật
        $ngaybaotri = $conn->real_escape_string($data['NgayBaoTri'] ?? '');
        $noidung = $conn->real_escape_string($data['NoiDung'] ?? '');
        $manv = $conn->real_escape_string($data['MaNV'] ?? '');
        // Mã cột sạc: Có thể NULL
        $macot = !empty($data['MaCot']) ? $conn->real_escape_string($data['MaCot']) : null;
        // MaTram: Dùng khi bảo trì toàn trạm
        $matram = !empty($data['MaTram']) ? $conn->real_escape_string($data['MaTram']) : null;
        $trangthai = $conn->real_escape_string($data['TrangThai'] ?? 'Hoàn tất');
        
        // Chuẩn bị câu lệnh SQL UPDATE
        // "ssssss": 6 tham số string
        $stmt = $conn->prepare("UPDATE BaoTri SET NgayBaoTri=?, NoiDung=?, MaNV=?, MaCot=?, TrangThai=? WHERE MaBT=?");
        
        // Bind các tham số - xử lý NULL đúng cách
        $stmt->bind_param("ssssss", $ngaybaotri, $noidung, $manv, $macot, $trangthai, $mabt);
        
        // Thực thi câu lệnh
        if ($stmt->execute()) {
            // Cập nhật trạng thái cột sạc dựa trên trạng thái bảo trì
            if ($macot) {
                // Nếu trạng thái là "Hoàn tất", cập nhật cột sạc thành "Rảnh" (sẵn sàng sử dụng)
                if ($trangthai == 'Hoàn tất') {
                    $conn->query("UPDATE CotSac SET TinhTrang = 'Rảnh' WHERE MaCot = '$macot'");
                } else {
                    // Nếu chưa hoàn tất, giữ trạng thái "Bảo trì"
                    $conn->query("UPDATE CotSac SET TinhTrang = 'Bảo trì' WHERE MaCot = '$macot'");
                }
            } elseif ($matram) {
                // Bảo trì toàn trạm: cập nhật trạng thái trạm
                if ($trangthai == 'Hoàn tất') {
                    $conn->query("UPDATE TramSac SET TrangThai = 'Hoạt động' WHERE MaTram = '$matram'");
                } else {
                    $conn->query("UPDATE TramSac SET TrangThai = 'Bảo trì' WHERE MaTram = '$matram'");
                }
            }
            
            // Trả về thông báo thành công
            echo json_encode(['message' => 'Cập nhật phiếu bảo trì thành công'], JSON_UNESCAPED_UNICODE);
        } else {
            // Nếu thất bại, trả về lỗi
            http_response_code(400);
            echo json_encode(['error' => 'Không thể cập nhật phiếu bảo trì'], JSON_UNESCAPED_UNICODE);
        }
        
        // Đóng statement
        $stmt->close();
        break;
        
    // ============================================
    // DELETE: Xóa phiếu bảo trì
    // ============================================
    case 'DELETE':
        // Kiểm tra quyền: Chỉ admin hoặc trưởng trạm mới được xóa bảo trì
        $isAdmin = ($user['role'] === 'admin');
        $userMaTram = $user['MaTram'] ?? null;
        $userChucVu = $user['ChucVu'] ?? '';
        $isTruongTram = ($userChucVu === 'Quản lý trạm' || $userChucVu === 'Trưởng trạm');
        
        // Lấy ID của phiếu bảo trì cần xóa từ tham số URL
        $id = $conn->real_escape_string($_GET['id'] ?? '');
        
        // Kiểm tra tính hợp lệ của ID
        if (empty($id)) {
            // Nếu ID không hợp lệ, trả về lỗi 400
            http_response_code(400);
            echo json_encode(['error' => 'Mã phiếu bảo trì không hợp lệ'], JSON_UNESCAPED_UNICODE);
            break; // Dừng xử lý
        }
        
        // Lấy phiếu bảo trì hiện tại để kiểm tra quyền
        $currentBT = $conn->query("SELECT bt.*, 
                                    COALESCE(c.MaTram, nv.MaTram) as MaTram
                                    FROM BaoTri bt
                                    LEFT JOIN NhanVien nv ON bt.MaNV = nv.MaNV
                                    LEFT JOIN CotSac c ON bt.MaCot = c.MaCot
                                    WHERE bt.MaBT = '$id'");
        if (!$currentBT || !($btRow = $currentBT->fetch_assoc())) {
            http_response_code(404);
            echo json_encode(['error' => 'Phiếu bảo trì không tồn tại'], JSON_UNESCAPED_UNICODE);
            break;
        }
        
        // Kiểm tra quyền: Nếu là trưởng trạm, chỉ được xóa bảo trì của trạm mình
        if (!$isAdmin && $isTruongTram) {
            $btMaTram = $btRow['MaTram'];
            if ($btMaTram !== $userMaTram) {
                http_response_code(403);
                echo json_encode(['error' => 'Bạn chỉ có quyền xóa bảo trì của trạm mình'], JSON_UNESCAPED_UNICODE);
                break;
            }
        } elseif (!$isAdmin && !$isTruongTram) {
            // Nhân viên thường không được xóa bảo trì
            http_response_code(403);
            echo json_encode(['error' => 'Bạn không có quyền xóa phiếu bảo trì'], JSON_UNESCAPED_UNICODE);
            break;
        }
        
        // Lấy mã cột sạc trước khi xóa phiếu bảo trì
        // Mục đích: Để cập nhật trạng thái cột sạc sau khi xóa
        $cotResult = $conn->query("SELECT MaCot FROM BaoTri WHERE MaBT = '$id'");
        $cot = $cotResult->fetch_assoc();
        
        // Chuẩn bị câu lệnh SQL DELETE
        $stmt = $conn->prepare("DELETE FROM BaoTri WHERE MaBT=?");
        
        // Bind tham số: "s" = string
        $stmt->bind_param("s", $id);
        
        // Thực thi câu lệnh
        if ($stmt->execute()) {
            // Nếu xóa thành công và có mã cột sạc, cập nhật trạng thái cột sạc thành "Rảnh"
            // Mục đích: Giải phóng cột sạc để có thể sử dụng lại
            if ($cot && $cot['MaCot']) {
                $conn->query("UPDATE CotSac SET TinhTrang = 'Rảnh' WHERE MaCot = '{$cot['MaCot']}'");
            }
            
            // Trả về thông báo thành công
            echo json_encode(['message' => 'Xóa phiếu bảo trì thành công'], JSON_UNESCAPED_UNICODE);
        } else {
            // Nếu thất bại, trả về lỗi
            http_response_code(400);
            echo json_encode(['error' => 'Không thể xóa phiếu bảo trì'], JSON_UNESCAPED_UNICODE);
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
