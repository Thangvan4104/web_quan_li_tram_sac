<?php
/**
 * File: api/phiensac.php
 * Mô tả: API endpoint để quản lý phiên sạc (CRUD operations)
 * Chức năng: Xử lý các request GET, POST, PUT, DELETE cho phiên sạc
 * Bảng dữ liệu: PhienSac
 * Quan hệ: 
 *   - N-1 với CotSac (Nhiều phiên sạc sử dụng 1 cột sạc)
 *   - N-1 với PhuongTien (Nhiều phiên sạc từ 1 phương tiện)
 *   - 1-1 với HoaDon (1 phiên sạc sinh ra 1 hóa đơn)
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

// Include file helper functions
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
// requireStaff(): Yêu cầu user phải là staff hoặc admin, đã đăng nhập và được duyệt
$user = requireStaff();

// Tạo kết nối đến database
$conn = getDBConnection();

// ============================================
// XỬ LÝ CÁC PHƯƠNG THỨC HTTP
// ============================================

switch ($method) {
    // ============================================
    // GET: Lấy danh sách hoặc chi tiết phiên sạc
    // ============================================
    case 'GET':
        // Kiểm tra xem có tham số id trong URL không (lấy một phiên sạc cụ thể)
        if (isset($_GET['id'])) {
            // Escape string để tránh SQL injection
            $id = $conn->real_escape_string($_GET['id']);
            
            // Câu lệnh SQL phức tạp với nhiều LEFT JOIN để lấy đầy đủ thông tin
            // ps.*: Lấy tất cả cột từ bảng PhienSac (alias ps)
            // c.MaCot, c.LoaiCongSac, c.CongSuat: Thông tin cột sạc
            // pt.BienSo, pt.DongXe, pt.HangXe: Thông tin phương tiện
            // kh.HoTen as TenKhachHang: Tên khách hàng (từ bảng KhachHang)
            // hd.MaHD, hd.SoTien: Thông tin hóa đơn
            // LEFT JOIN: Kết nối các bảng để lấy thông tin liên quan
            $result = $conn->query("SELECT ps.*, 
                                    c.MaCot, c.LoaiCongSac, c.CongSuat,
                                    pt.BienSo, pt.DongXe, pt.HangXe,
                                    kh.HoTen as TenKhachHang,
                                    hd.MaHD, hd.SoTien
                                    FROM PhienSac ps
                                    LEFT JOIN CotSac c ON ps.MaCot = c.MaCot
                                    LEFT JOIN PhuongTien pt ON ps.BienSoPT = pt.BienSo
                                    LEFT JOIN KhachHang kh ON pt.MaKH = kh.MaKH
                                    LEFT JOIN HoaDon hd ON ps.MaHoaDon = hd.MaHD
                                    WHERE ps.MaPhien = '$id'");
            
            // Lấy dòng dữ liệu đầu tiên
            $phien = $result->fetch_assoc();
            
            // Kiểm tra xem có tìm thấy phiên sạc không
            if ($phien) {
                // Nếu là staff (không phải admin), kiểm tra xem phiên sạc có thuộc trạm của nhân viên không
                $isAdmin = ($user['role'] === 'admin');
                $userMaTram = $user['MaTram'] ?? null;
                
                // Lấy MaTram từ cột sạc
                $cotMaTram = null;
                if (isset($phien['MaCot'])) {
                    $cotResult = $conn->query("SELECT MaTram FROM CotSac WHERE MaCot = '{$phien['MaCot']}'");
                    if ($cotRow = $cotResult->fetch_assoc()) {
                        $cotMaTram = $cotRow['MaTram'];
                    }
                }
                
                if (!$isAdmin && $userMaTram && $cotMaTram !== $userMaTram) {
                    // Staff không có quyền xem phiên sạc của trạm khác
                    http_response_code(403);
                    echo json_encode(['error' => 'Bạn không có quyền xem phiên sạc này'], JSON_UNESCAPED_UNICODE);
                } else {
                    // Trả về dữ liệu dưới dạng JSON
                    echo json_encode($phien, JSON_UNESCAPED_UNICODE);
                }
            } else {
                // Nếu không tìm thấy, trả về lỗi 404
                http_response_code(404);
                echo json_encode(['error' => 'Phiên sạc không tồn tại'], JSON_UNESCAPED_UNICODE);
            }
        } else {
            // Nếu không có id, lấy tất cả phiên sạc
            // Nếu là staff (không phải admin), chỉ lấy phiên sạc của trạm nhân viên đó
            
            // Kiểm tra xem user có phải admin không
            $isAdmin = ($user['role'] === 'admin');
            $userMaTram = $user['MaTram'] ?? null;
            
            // Xây dựng điều kiện WHERE
            $whereClause = "";
            if (!$isAdmin && $userMaTram) {
                // Staff chỉ thấy phiên sạc của trạm mình (thông qua cột sạc)
                $userMaTram = $conn->real_escape_string($userMaTram);
                $whereClause = "WHERE c.MaTram = '$userMaTram'";
            }
            
            // Câu lệnh SQL lấy tất cả phiên sạc với thông tin liên quan
            // ORDER BY ps.ThoiGianBatDau DESC: Sắp xếp theo thời gian bắt đầu, mới nhất trước
            $result = $conn->query("SELECT ps.*, 
                                    c.LoaiCongSac, c.MaTram,
                                    pt.DongXe, pt.HangXe,
                                    kh.HoTen as TenKhachHang,
                                    hd.SoTien
                                    FROM PhienSac ps
                                    LEFT JOIN CotSac c ON ps.MaCot = c.MaCot
                                    LEFT JOIN PhuongTien pt ON ps.BienSoPT = pt.BienSo
                                    LEFT JOIN KhachHang kh ON pt.MaKH = kh.MaKH
                                    LEFT JOIN HoaDon hd ON ps.MaHoaDon = hd.MaHD
                                    $whereClause
                                    ORDER BY ps.ThoiGianBatDau DESC");
            
            // Khởi tạo mảng để chứa danh sách phiên sạc
            $phiens = [];
            
            // Duyệt qua từng dòng kết quả
            while ($row = $result->fetch_assoc()) {
                // Thêm mỗi phiên sạc vào mảng
                $phiens[] = $row;
            }
            
            // Trả về danh sách dưới dạng JSON
            echo json_encode($phiens, JSON_UNESCAPED_UNICODE);
        }
        break;
        
    // ============================================
    // POST: Tạo phiên sạc mới
    // ============================================
    case 'POST':
        // Đọc dữ liệu JSON từ request body
        $data = json_decode(file_get_contents('php://input'), true);
        
        // Lấy các giá trị từ dữ liệu JSON và escape
        $maphien = $conn->real_escape_string($data['MaPhien'] ?? '');                    // Mã phiên sạc (CHAR(5))
        // Thời gian bắt đầu: Nếu không có thì dùng thời gian hiện tại
        // date('Y-m-d H:i:s'): Định dạng ngày giờ MySQL (YYYY-MM-DD HH:MM:SS)
        $thoigianbatdau = $conn->real_escape_string($data['ThoiGianBatDau'] ?? date('Y-m-d H:i:s'));
        // Thời gian kết thúc: Có thể NULL nếu đang sạc
        $thoigianketthuc = !empty($data['ThoiGianKetThuc']) ? $conn->real_escape_string($data['ThoiGianKetThuc']) : null;
        // Điện tiêu thụ: Có thể NULL nếu chưa có
        $dientieuthu = isset($data['DienTieuThu']) && $data['DienTieuThu'] !== null && $data['DienTieuThu'] !== '' ? floatval($data['DienTieuThu']) : null;
        $macot = $conn->real_escape_string($data['MaCot'] ?? '');                       // Mã cột sạc sử dụng (Foreign Key)
        // BienSoPT có thể NULL cho khách hàng vãng lai (không muốn đăng ký thông tin)
        $biensopt = !empty($data['BienSoPT']) ? $conn->real_escape_string($data['BienSoPT']) : null;
        
        // Chuẩn bị câu lệnh SQL INSERT
        // "sssdss": string, string, string, double, string, string (hoặc NULL)
        $stmt = $conn->prepare("INSERT INTO PhienSac (MaPhien, ThoiGianBatDau, ThoiGianKetThuc, DienTieuThu, MaCot, BienSoPT) VALUES (?, ?, ?, ?, ?, ?)");
        
        // Bind các tham số - xử lý NULL đúng cách
        // Nếu BienSoPT là NULL, cần dùng "s" thay vì "s" cho string
        $stmt->bind_param("sssdss", $maphien, $thoigianbatdau, $thoigianketthuc, $dientieuthu, $macot, $biensopt);
        
        // Thực thi câu lệnh
        if ($stmt->execute()) {
            // Nếu tạo phiên sạc thành công, cập nhật trạng thái cột sạc thành "Đang sạc"
            // Mục đích: Đảm bảo trạng thái cột sạc luôn chính xác
            $conn->query("UPDATE CotSac SET TinhTrang = 'Đang sạc' WHERE MaCot = '$macot'");
            
            // Trả về mã 201 (Created)
            http_response_code(201);
            echo json_encode(['message' => 'Tạo phiên sạc thành công'], JSON_UNESCAPED_UNICODE);
        } else {
            // Nếu thất bại, trả về mã 400 và thông báo lỗi
            http_response_code(400);
            echo json_encode(['error' => 'Không thể tạo phiên sạc: ' . $stmt->error], JSON_UNESCAPED_UNICODE);
        }
        
        // Đóng statement
        $stmt->close();
        break;
        
    // ============================================
    // PUT: Cập nhật thông tin phiên sạc
    // ============================================
    case 'PUT':
        // Đọc dữ liệu JSON từ request body
        $data = json_decode(file_get_contents('php://input'), true);
        
        // Lấy mã phiên sạc cần cập nhật
        $maphien = $conn->real_escape_string($data['MaPhien'] ?? '');
        
        // Lấy các giá trị cần cập nhật
        $thoigianbatdau = $conn->real_escape_string($data['ThoiGianBatDau'] ?? '');
        // Thời gian kết thúc: Có thể NULL
        $thoigianketthuc = !empty($data['ThoiGianKetThuc']) ? $conn->real_escape_string($data['ThoiGianKetThuc']) : null;
        // Điện tiêu thụ: Có thể NULL (sẽ được tính tự động nếu có thời gian kết thúc)
        $dientieuthu = isset($data['DienTieuThu']) && $data['DienTieuThu'] !== null && $data['DienTieuThu'] !== '' ? floatval($data['DienTieuThu']) : null;
        $macot = $conn->real_escape_string($data['MaCot'] ?? '');
        // BienSoPT có thể NULL cho khách hàng vãng lai
        $biensopt = !empty($data['BienSoPT']) ? $conn->real_escape_string($data['BienSoPT']) : null;
        
        // Kiểm tra xem có đang kết thúc phiên sạc không (có ThoiGianKetThuc và chưa có hóa đơn)
        // Lấy thông tin phiên sạc hiện tại từ database
        $checkPhien = $conn->query("SELECT ps.*, c.LoaiCongSac, c.CongSuat 
                                   FROM PhienSac ps 
                                   LEFT JOIN CotSac c ON ps.MaCot = c.MaCot 
                                   WHERE ps.MaPhien = '$maphien'");
        $phienInfo = $checkPhien->fetch_assoc();
        
        if (!$phienInfo) {
            http_response_code(404);
            echo json_encode(['error' => 'Không tìm thấy phiên sạc'], JSON_UNESCAPED_UNICODE);
            break;
        }
        
        $autoCalculate = false;
        $calculatedData = null;
        
        // Nếu có thời gian kết thúc và chưa có hóa đơn, tự động tính toán
        // Kiểm tra: ThoiGianKetThuc được set VÀ chưa có MaHoaDon trong database
        // Sử dụng kiểm tra rõ ràng hơn: NULL hoặc empty string đều được coi là chưa có hóa đơn
        $maHoaDon = $phienInfo['MaHoaDon'] ?? null;
        $hasInvoice = !empty($maHoaDon) && trim($maHoaDon) !== '';
        
        if ($thoigianketthuc && !$hasInvoice) {
            // Kiểm tra thông tin cột sạc
            $loaiCongSac = $phienInfo['LoaiCongSac'] ?? null;
            $congSuat = $phienInfo['CongSuat'] ?? null;
            
            if (!empty($loaiCongSac) && !empty($congSuat) && $congSuat > 0) {
                // Log thông tin đầu vào để debug
                error_log("Bắt đầu tính toán tự động cho phiên sạc: MaPhien = " . $maphien);
                error_log("Thông tin: ThoiGianBatDau = " . $phienInfo['ThoiGianBatDau'] . ", ThoiGianKetThuc = " . $thoigianketthuc . ", CongSuat = " . $congSuat . ", LoaiCongSac = " . $loaiCongSac);
                
                // Tính toán tự động dựa trên thời gian bắt đầu từ database (chính xác hơn)
                $calculatedData = calculateChargingCost(
                    $conn, 
                    $phienInfo['ThoiGianBatDau'], 
                    $thoigianketthuc, 
                    floatval($congSuat), 
                    $loaiCongSac
                );
                
                if ($calculatedData) {
                    $autoCalculate = true;
                    $dientieuthu = $calculatedData['dienTieuThu'];
                    
                    // Log kết quả tính toán
                    error_log("Kết quả tính toán: DienTieuThu = " . $dientieuthu . " kWh, SoGio = " . ($calculatedData['soGio'] ?? 'N/A') . ", CongSuatKW = " . ($calculatedData['congSuatKW'] ?? 'N/A') . " kW");
                    
                    // Kiểm tra kết quả hợp lý
                    if ($dientieuthu > 1000) {
                        error_log("CẢNH BÁO: Điện tiêu thụ quá cao (" . $dientieuthu . " kWh) cho phiên sạc " . $maphien . ". Có thể có lỗi trong tính toán!");
                    }
                } else {
                    // Nếu không tìm thấy giá, vẫn cập nhật phiên sạc nhưng không tạo hóa đơn
                    error_log("Không tìm thấy giá cho loại cổng sạc: " . $loaiCongSac . " (MaPhien: " . $maphien . ")");
                }
            } else {
                // Log lỗi nếu thiếu thông tin cột sạc
                error_log("Thiếu thông tin cột sạc - LoaiCongSac: " . ($loaiCongSac ?? 'NULL') . ", CongSuat: " . ($congSuat ?? 'NULL') . " (MaPhien: " . $maphien . ")");
            }
        } else {
            // Log để debug
            if ($thoigianketthuc && $hasInvoice) {
                error_log("Phiên sạc đã có hóa đơn, không tạo mới (MaPhien: " . $maphien . ", MaHoaDon: " . $maHoaDon . ")");
            }
        }
        
        // Chuẩn bị câu lệnh SQL UPDATE
        // "ssdsss": string, string, double, string, string (hoặc NULL), string
        $stmt = $conn->prepare("UPDATE PhienSac SET ThoiGianBatDau=?, ThoiGianKetThuc=?, DienTieuThu=?, MaCot=?, BienSoPT=? WHERE MaPhien=?");
        
        // Bind các tham số - xử lý NULL đúng cách
        $stmt->bind_param("ssdsss", $thoigianbatdau, $thoigianketthuc, $dientieuthu, $macot, $biensopt, $maphien);
        
        // Bắt đầu transaction để đảm bảo tính nhất quán
        $conn->autocommit(false);
        
        try {
            // Thực thi câu lệnh UPDATE phiên sạc
            if (!$stmt->execute()) {
                throw new Exception('Không thể cập nhật phiên sạc: ' . $stmt->error);
            }
            
            // Nếu đã tính toán tự động, tạo hóa đơn
            if ($autoCalculate && $calculatedData) {
                // Tạo mã hóa đơn mới
                $mahd = generateMaHD($conn);
                
                // Tạo hóa đơn
                $ngaylap = date('Y-m-d');
                $sotien = $calculatedData['soTien'];
                
                $stmtHD = $conn->prepare("INSERT INTO HoaDon (MaHD, NgayLap, SoTien, MaPhien) VALUES (?, ?, ?, ?)");
                $stmtHD->bind_param("ssds", $mahd, $ngaylap, $sotien, $maphien);
                
                if (!$stmtHD->execute()) {
                    throw new Exception('Không thể tạo hóa đơn: ' . $stmtHD->error);
                }
                
                // Cập nhật MaHoaDon vào PhienSac
                $conn->query("UPDATE PhienSac SET MaHoaDon = '$mahd' WHERE MaPhien = '$maphien'");
                
                $stmtHD->close();
            }
            
            // Nếu đã có thời gian kết thúc, nghĩa là phiên sạc đã hoàn thành
            // Cập nhật trạng thái cột sạc thành "Rảnh" để có thể sử dụng lại
            if ($thoigianketthuc) {
                $conn->query("UPDATE CotSac SET TinhTrang = 'Rảnh' WHERE MaCot = '$macot'");
            }
            
            // Commit transaction
            $conn->commit();
            $conn->autocommit(true);
            
            // Trả về thông báo thành công
            $response = ['message' => 'Cập nhật phiên sạc thành công'];
            if ($autoCalculate && $calculatedData && isset($mahd)) {
                $response['message'] = 'Cập nhật phiên sạc thành công và đã tạo hóa đơn tự động';
                $response['calculated'] = [
                    'dienTieuThu' => $calculatedData['dienTieuThu'],
                    'soTien' => $calculatedData['soTien'],
                    'soGio' => $calculatedData['soGio'],
                    'maHD' => $mahd
                ];
            } elseif ($thoigianketthuc && !$hasInvoice && !$autoCalculate) {
                // Nếu có thời gian kết thúc nhưng không tạo được hóa đơn
                $response['warning'] = 'Phiên sạc đã kết thúc nhưng không thể tạo hóa đơn tự động. Vui lòng kiểm tra thông tin cột sạc và giá sạc.';
            }
            echo json_encode($response, JSON_UNESCAPED_UNICODE);
            
        } catch (Exception $e) {
            // Rollback nếu có lỗi
            $conn->rollback();
            $conn->autocommit(true);
            
            http_response_code(400);
            echo json_encode(['error' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
        }
        
        // Đóng statement
        $stmt->close();
        break;
        
    // ============================================
    // DELETE: Xóa phiên sạc
    // ============================================
    case 'DELETE':
        // Lấy ID của phiên sạc cần xóa từ tham số URL
        $id = $conn->real_escape_string($_GET['id'] ?? '');
        
        // Kiểm tra tính hợp lệ của ID
        if (empty($id)) {
            // Nếu ID không hợp lệ, trả về lỗi 400
            http_response_code(400);
            echo json_encode(['error' => 'Mã phiên sạc không hợp lệ'], JSON_UNESCAPED_UNICODE);
            break; // Dừng xử lý
        }
        
        // Lấy mã cột sạc trước khi xóa phiên sạc
        // Mục đích: Để cập nhật trạng thái cột sạc sau khi xóa
        $cotResult = $conn->query("SELECT MaCot FROM PhienSac WHERE MaPhien = '$id'");
        $cot = $cotResult->fetch_assoc();
        
        // Chuẩn bị câu lệnh SQL DELETE
        $stmt = $conn->prepare("DELETE FROM PhienSac WHERE MaPhien=?");
        
        // Bind tham số: "s" = string
        $stmt->bind_param("s", $id);
        
        // Thực thi câu lệnh
        if ($stmt->execute()) {
            // Nếu xóa thành công, cập nhật trạng thái cột sạc thành "Rảnh"
            // Mục đích: Giải phóng cột sạc để có thể sử dụng lại
            if ($cot) {
                $conn->query("UPDATE CotSac SET TinhTrang = 'Rảnh' WHERE MaCot = '{$cot['MaCot']}'");
            }
            
            // Trả về thông báo thành công
            echo json_encode(['message' => 'Xóa phiên sạc thành công'], JSON_UNESCAPED_UNICODE);
        } else {
            // Nếu thất bại, trả về lỗi
            http_response_code(400);
            echo json_encode(['error' => 'Không thể xóa phiên sạc'], JSON_UNESCAPED_UNICODE);
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
