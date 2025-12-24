<?php
/**
 * File: config/cors.php
 * Mô tả: Helper function để cấu hình CORS headers cho API
 * Chức năng: 
 *   - Set CORS headers với origin cụ thể
 *   - Hỗ trợ credentials (cookies/session)
 *   - Đảm bảo session cookies hoạt động đúng
 * Tác giả: Hệ thống quản lý trạm sạc
 */

/**
 * Hàm: setCORSHeaders()
 * Mô tả: Thiết lập CORS headers với origin cụ thể và credentials
 * @return void
 * Chức năng:
 *   1. Lấy Origin từ request header hoặc Referer
 *   2. Set Access-Control-Allow-Origin với origin cụ thể
 *   3. Set Access-Control-Allow-Credentials: true
 *   4. Set các headers CORS khác (Methods, Headers)
 */
function setCORSHeaders() {
    // Lấy Origin từ request header (domain của client)
    // Nếu không có Origin, lấy từ Referer hoặc dùng localhost
    $origin = null;
    if (isset($_SERVER['HTTP_ORIGIN'])) {
        $origin = $_SERVER['HTTP_ORIGIN'];
    } elseif (isset($_SERVER['HTTP_REFERER'])) {
        $parsed = parse_url($_SERVER['HTTP_REFERER']);
        if ($parsed) {
            $origin = $parsed['scheme'] . '://' . $parsed['host'];
            if (isset($parsed['port'])) {
                $origin .= ':' . $parsed['port'];
            }
        }
    }
    
    // Cho phép domain hiện tại truy cập API (CORS)
    // QUAN TRỌNG: Luôn set credentials để session cookie hoạt động
    // KHÔNG thể dùng '*' với credentials, phải chỉ định origin cụ thể
    if ($origin) {
        header("Access-Control-Allow-Origin: $origin");
        header('Access-Control-Allow-Credentials: true');
    } else {
        // Nếu không có origin, thử lấy từ SERVER_NAME hoặc HTTP_HOST
        // Đây là same-origin request, không cần CORS nhưng vẫn cần set cookie
        $serverName = $_SERVER['SERVER_NAME'] ?? $_SERVER['HTTP_HOST'] ?? 'localhost';
        $serverPort = $_SERVER['SERVER_PORT'] ?? 80;
        $scheme = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https' : 'http';
        $defaultOrigin = $scheme . '://' . $serverName;
        if ($serverPort != 80 && $serverPort != 443) {
            $defaultOrigin .= ':' . $serverPort;
        }
        header("Access-Control-Allow-Origin: $defaultOrigin");
        header('Access-Control-Allow-Credentials: true');
    }
    
    // Cho phép các phương thức HTTP được sử dụng
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    
    // Cho phép header Content-Type trong request
    header('Access-Control-Allow-Headers: Content-Type');
}
?>

