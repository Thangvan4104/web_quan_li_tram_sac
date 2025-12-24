<?php
/**
 * File: create_password_hash.php
 * Mô tả: Script tạo password hash cho nhân viên
 * Cách sử dụng: 
 *   1. Chạy file này trong trình duyệt: http://localhost/web/create_password_hash.php
 *   2. Copy các hash được tạo ra
 *   3. Cập nhật vào database.sql hoặc trực tiếp vào database
 */

// Password mặc định cho admin
$adminPassword = 'admin123';

// Password mặc định cho staff
$staffPassword = 'staff123';

// Tạo hash cho admin password
$adminHash = password_hash($adminPassword, PASSWORD_DEFAULT);

// Tạo hash cho staff password
$staffHash = password_hash($staffPassword, PASSWORD_DEFAULT);

?>
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <title>Tạo Password Hash</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 50px auto;
            padding: 20px;
        }
        .hash-box {
            background: #f5f5f5;
            padding: 15px;
            border-radius: 8px;
            margin: 10px 0;
            word-break: break-all;
        }
        h1 {
            color: #2563eb;
        }
    </style>
</head>
<body>
    <h1>Tạo Password Hash</h1>
    
    <h2>Admin Password (admin123):</h2>
    <div class="hash-box">
        <strong><?php echo htmlspecialchars($adminHash); ?></strong>
    </div>
    
    <h2>Staff Password (staff123):</h2>
    <div class="hash-box">
        <strong><?php echo htmlspecialchars($staffHash); ?></strong>
    </div>
    
    <h2>SQL Update Statement:</h2>
    <div class="hash-box">
        <pre>
-- Cập nhật password cho admin (NV001)
UPDATE NhanVien SET password = '<?php echo $adminHash; ?>' WHERE MaNV = 'NV001';

-- Cập nhật password cho staff (NV002, NV003, NV004)
UPDATE NhanVien SET password = '<?php echo $staffHash; ?>' WHERE MaNV IN ('NV002', 'NV003', 'NV004');
        </pre>
    </div>
    
    <p><strong>Lưu ý:</strong> Copy các hash trên và cập nhật vào database sau khi import database.sql</p>
</body>
</html>

