<?php
/**
 * File: api/stations.php
 * Mô tả: API endpoint để quản lý trạm sạc (CRUD operations)
 * Chức năng: Xử lý các request GET, POST, PUT, DELETE cho trạm sạc
 */

// ============================================
// CẤU HÌNH HEADER HTTP
// ============================================

// Thiết lập Content-Type là JSON với encoding UTF-8
header('Content-Type: application/json; charset=utf-8');

// Cho phép tất cả các domain truy cập API (CORS)
header('Access-Control-Allow-Origin: *');

// Cho phép các phương thức HTTP được sử dụng
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');

// Cho phép header Content-Type trong request
header('Access-Control-Allow-Headers: Content-Type');

// Include file cấu hình database
require_once '../config/database.php';

// ============================================
// XỬ LÝ REQUEST METHOD
// ============================================

// Lấy phương thức HTTP từ request (GET, POST, PUT, DELETE)
$method = $_SERVER['REQUEST_METHOD'];

// Xử lý preflight request (OPTIONS) cho CORS
if ($method === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Tạo kết nối đến database
$conn = getDBConnection();

// Xử lý các phương thức HTTP khác nhau
switch ($method) {
    // ============================================
    // GET: Lấy danh sách hoặc chi tiết trạm sạc
    // ============================================
    case 'GET':
        // Kiểm tra xem có tham số id trong URL không
        if (isset($_GET['id'])) {
            // Nếu có id, lấy thông tin một trạm sạc cụ thể
            
            // Chuyển đổi id sang số nguyên để tránh SQL injection
            $id = intval($_GET['id']);
            
            // Chuẩn bị câu lệnh SQL với prepared statement
            $stmt = $conn->prepare("SELECT * FROM charging_stations WHERE id = ?");
            
            // Bind tham số: "i" = integer, $id = giá trị
            $stmt->bind_param("i", $id);
            
            // Thực thi câu lệnh
            $stmt->execute();
            
            // Lấy kết quả
            $result = $stmt->get_result();
            
            // Lấy dòng dữ liệu đầu tiên dưới dạng associative array
            $station = $result->fetch_assoc();
            
            // Kiểm tra xem có tìm thấy trạm sạc không
            if ($station) {
                // Trả về dữ liệu JSON với UTF-8 encoding
                echo json_encode($station, JSON_UNESCAPED_UNICODE);
            } else {
                // Trả về lỗi 404 nếu không tìm thấy
                http_response_code(404);
                echo json_encode(['error' => 'Station not found'], JSON_UNESCAPED_UNICODE);
            }
            
            // Đóng statement
            $stmt->close();
        } else {
            // Nếu không có id, lấy tất cả trạm sạc
            
            // Thực thi câu lệnh SQL để lấy tất cả trạm sạc, sắp xếp theo thời gian tạo mới nhất
            $result = $conn->query("SELECT * FROM charging_stations ORDER BY created_at DESC");
            
            // Khởi tạo mảng để chứa danh sách trạm sạc
            $stations = [];
            
            // Duyệt qua từng dòng kết quả
            while ($row = $result->fetch_assoc()) {
                // Thêm mỗi trạm sạc vào mảng
                $stations[] = $row;
            }
            
            // Trả về danh sách dưới dạng JSON
            echo json_encode($stations, JSON_UNESCAPED_UNICODE);
        }
        break;
        
    // ============================================
    // POST: Tạo trạm sạc mới
    // ============================================
    case 'POST':
        // Đọc dữ liệu JSON từ request body
        $data = json_decode(file_get_contents('php://input'), true);
        
        // Lấy các giá trị từ dữ liệu JSON, sử dụng toán tử ?? để đặt giá trị mặc định
        $name = $data['name'] ?? '';                    // Tên trạm sạc
        $address = $data['address'] ?? '';               // Địa chỉ
        $location_lat = $data['location_lat'] ?? null;  // Vĩ độ (latitude)
        $location_lng = $data['location_lng'] ?? null;  // Kinh độ (longitude)
        $total_ports = intval($data['total_ports'] ?? 0);           // Tổng số cổng sạc (chuyển sang integer)
        $available_ports = intval($data['available_ports'] ?? $total_ports); // Số cổng còn trống (mặc định = total_ports)
        $status = $data['status'] ?? 'active';          // Trạng thái (mặc định: active)
        $charging_type = $data['charging_type'] ?? 'Both'; // Loại sạc (mặc định: Both)
        $power_kw = floatval($data['power_kw'] ?? 0);   // Công suất (kW) - chuyển sang float
        $price_per_kwh = floatval($data['price_per_kwh'] ?? 0); // Giá mỗi kWh - chuyển sang float
        $operating_hours = $data['operating_hours'] ?? '24/7'; // Giờ hoạt động (mặc định: 24/7)
        $phone = $data['phone'] ?? '';                  // Số điện thoại
        $email = $data['email'] ?? '';                  // Email
        
        // Chuẩn bị câu lệnh SQL INSERT
        // "ssddiisssdsss" = string, string, double, double, int, int, string, string, string, double, string, string, string
        $stmt = $conn->prepare("INSERT INTO charging_stations (name, address, location_lat, location_lng, total_ports, available_ports, status, charging_type, power_kw, price_per_kwh, operating_hours, phone, email) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        
        // Bind các tham số vào câu lệnh SQL
        $stmt->bind_param("ssddiisssdsss", $name, $address, $location_lat, $location_lng, $total_ports, $available_ports, $status, $charging_type, $power_kw, $price_per_kwh, $operating_hours, $phone, $email);
        
        // Thực thi câu lệnh
        if ($stmt->execute()) {
            // Nếu thành công, trả về mã 201 (Created) và ID của trạm sạc vừa tạo
            http_response_code(201);
            echo json_encode(['id' => $conn->insert_id, 'message' => 'Station created successfully'], JSON_UNESCAPED_UNICODE);
        } else {
            // Nếu thất bại, trả về mã 400 (Bad Request) và thông báo lỗi
            http_response_code(400);
            echo json_encode(['error' => 'Failed to create station'], JSON_UNESCAPED_UNICODE);
        }
        
        // Đóng statement
        $stmt->close();
        break;
        
    // ============================================
    // PUT: Cập nhật thông tin trạm sạc
    // ============================================
    case 'PUT':
        // Đọc dữ liệu JSON từ request body
        $data = json_decode(file_get_contents('php://input'), true);
        
        // Lấy ID của trạm sạc cần cập nhật và chuyển sang integer
        $id = intval($data['id'] ?? 0);
        
        // Kiểm tra tính hợp lệ của ID
        if ($id === 0) {
            // Nếu ID không hợp lệ, trả về lỗi 400
            http_response_code(400);
            echo json_encode(['error' => 'Invalid station ID'], JSON_UNESCAPED_UNICODE);
            break;
        }
        
        // Lấy các giá trị từ dữ liệu JSON để cập nhật
        $name = $data['name'] ?? '';
        $address = $data['address'] ?? '';
        $location_lat = $data['location_lat'] ?? null;
        $location_lng = $data['location_lng'] ?? null;
        $total_ports = intval($data['total_ports'] ?? 0);
        $available_ports = intval($data['available_ports'] ?? 0);
        $status = $data['status'] ?? 'active';
        $charging_type = $data['charging_type'] ?? 'Both';
        $power_kw = floatval($data['power_kw'] ?? 0);
        $price_per_kwh = floatval($data['price_per_kwh'] ?? 0);
        $operating_hours = $data['operating_hours'] ?? '24/7';
        $phone = $data['phone'] ?? '';
        $email = $data['email'] ?? '';
        
        // Chuẩn bị câu lệnh SQL UPDATE
        // "ssddiisssdsssi" = string, string, double, double, int, int, string, string, string, double, string, string, string, int
        $stmt = $conn->prepare("UPDATE charging_stations SET name=?, address=?, location_lat=?, location_lng=?, total_ports=?, available_ports=?, status=?, charging_type=?, power_kw=?, price_per_kwh=?, operating_hours=?, phone=?, email=? WHERE id=?");
        
        // Bind các tham số vào câu lệnh SQL
        $stmt->bind_param("ssddiisssdsssi", $name, $address, $location_lat, $location_lng, $total_ports, $available_ports, $status, $charging_type, $power_kw, $price_per_kwh, $operating_hours, $phone, $email, $id);
        
        // Thực thi câu lệnh
        if ($stmt->execute()) {
            // Nếu thành công, trả về thông báo thành công
            echo json_encode(['message' => 'Station updated successfully'], JSON_UNESCAPED_UNICODE);
        } else {
            // Nếu thất bại, trả về mã 400 và thông báo lỗi
            http_response_code(400);
            echo json_encode(['error' => 'Failed to update station'], JSON_UNESCAPED_UNICODE);
        }
        
        // Đóng statement
        $stmt->close();
        break;
        
    // ============================================
    // DELETE: Xóa trạm sạc
    // ============================================
    case 'DELETE':
        // Lấy ID của trạm sạc cần xóa từ tham số URL và chuyển sang integer
        $id = intval($_GET['id'] ?? 0);
        
        // Kiểm tra tính hợp lệ của ID
        if ($id === 0) {
            // Nếu ID không hợp lệ, trả về lỗi 400
            http_response_code(400);
            echo json_encode(['error' => 'Invalid station ID'], JSON_UNESCAPED_UNICODE);
            break;
        }
        
        // Chuẩn bị câu lệnh SQL DELETE
        $stmt = $conn->prepare("DELETE FROM charging_stations WHERE id=?");
        
        // Bind tham số: "i" = integer
        $stmt->bind_param("i", $id);
        
        // Thực thi câu lệnh
        if ($stmt->execute()) {
            // Nếu thành công, trả về thông báo thành công
            echo json_encode(['message' => 'Station deleted successfully'], JSON_UNESCAPED_UNICODE);
        } else {
            // Nếu thất bại, trả về mã 400 và thông báo lỗi
            http_response_code(400);
            echo json_encode(['error' => 'Failed to delete station'], JSON_UNESCAPED_UNICODE);
        }
        
        // Đóng statement
        $stmt->close();
        break;
    
    // ============================================
    // DEFAULT: Xử lý phương thức HTTP không được hỗ trợ
    // ============================================
    default:
        // Trả về mã 405 (Method Not Allowed) cho các phương thức không được hỗ trợ
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed'], JSON_UNESCAPED_UNICODE);
        break;
}

// Đóng kết nối database
closeDBConnection($conn);
?>

