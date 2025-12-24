<?php
/**
 * File: config/helpers.php
 * Mô tả: Các hàm helper hỗ trợ tính toán
 */

/**
 * Hàm: generateMaHD()
 * Mô tả: Tạo mã hóa đơn mới tự động
 * @param mysqli $conn Kết nối database
 * @return string Mã hóa đơn mới
 */
function generateMaHD($conn) {
    // Lấy mã hóa đơn lớn nhất hiện tại
    $result = $conn->query("SELECT MaHD FROM HoaDon ORDER BY MaHD DESC LIMIT 1");
    
    if ($result && $row = $result->fetch_assoc()) {
        $lastMa = $row['MaHD'];
        // Lấy số từ mã (VD: HD001 -> 1)
        $number = intval(substr($lastMa, 2));
        $newNumber = $number + 1;
        // Tạo mã mới (VD: HD002)
        return 'HD' . str_pad($newNumber, 3, '0', STR_PAD_LEFT);
    } else {
        // Nếu chưa có hóa đơn nào, bắt đầu từ HD001
        return 'HD001';
    }
}

/**
 * Hàm: generateMaTT()
 * Mô tả: Tạo mã thanh toán mới tự động
 * @param mysqli $conn Kết nối database
 * @return string Mã thanh toán mới
 */
function generateMaTT($conn) {
    // Lấy mã thanh toán lớn nhất hiện tại
    $result = $conn->query("SELECT MaTT FROM ThanhToan ORDER BY MaTT DESC LIMIT 1");
    
    if ($result && $row = $result->fetch_assoc()) {
        $lastMa = $row['MaTT'];
        // Lấy số từ mã (VD: TT001 -> 1)
        $number = intval(substr($lastMa, 2));
        $newNumber = $number + 1;
        // Tạo mã mới (VD: TT002)
        return 'TT' . str_pad($newNumber, 3, '0', STR_PAD_LEFT);
    } else {
        // Nếu chưa có thanh toán nào, bắt đầu từ TT001
        return 'TT001';
    }
}

/**
 * Hàm: generateMaNV()
 * Mô tả: Tạo mã nhân viên mới tự động
 * @param mysqli $conn Kết nối database
 * @return string Mã nhân viên mới
 */
function generateMaNV($conn) {
    // Lấy mã nhân viên lớn nhất hiện tại
    $result = $conn->query("SELECT MaNV FROM NhanVien ORDER BY MaNV DESC LIMIT 1");
    
    if ($result && $row = $result->fetch_assoc()) {
        $lastMa = $row['MaNV'];
        // Lấy số từ mã (VD: NV001 -> 1)
        $number = intval(substr($lastMa, 2));
        $newNumber = $number + 1;
        // Tạo mã mới (VD: NV002)
        return 'NV' . str_pad($newNumber, 3, '0', STR_PAD_LEFT);
    } else {
        // Nếu chưa có nhân viên nào, bắt đầu từ NV001
        return 'NV001';
    }
}

/**
 * Hàm: getCurrentPrice()
 * Mô tả: Lấy giá đang áp dụng cho loại cổng sạc
 * @param mysqli $conn Kết nối database
 * @param string $loaiCongSac Loại cổng sạc
 * @return float|null Đơn giá (VNĐ/kWh) hoặc null nếu không tìm thấy
 */
function getCurrentPrice($conn, $loaiCongSac) {
    $loaiCongSac = $conn->real_escape_string($loaiCongSac);
    
    $result = $conn->query("SELECT DonGia FROM GiaSac 
                           WHERE LoaiCongSac = '$loaiCongSac' AND TrangThai = 'Đang áp dụng' 
                           ORDER BY NgayApDung DESC 
                           LIMIT 1");
    
    if ($result && $row = $result->fetch_assoc()) {
        return floatval($row['DonGia']);
    }
    
    return null;
}

/**
 * Hàm: calculateChargingCost()
 * Mô tả: Tính toán chi phí sạc
 * @param mysqli $conn Kết nối database
 * @param string $thoiGianBatDau Thời gian bắt đầu (DATETIME)
 * @param string $thoiGianKetThuc Thời gian kết thúc (DATETIME)
 * @param float $congSuat Công suất cột sạc (kW)
 * @param string $loaiCongSac Loại cổng sạc
 * @return array Mảng chứa ['dienTieuThu' => float, 'soTien' => float, 'donGia' => float] hoặc null nếu lỗi
 */
function calculateChargingCost($conn, $thoiGianBatDau, $thoiGianKetThuc, $congSuat, $loaiCongSac) {
    // Tính số giờ sạc
    $datetime1 = new DateTime($thoiGianBatDau);
    $datetime2 = new DateTime($thoiGianKetThuc);
    $interval = $datetime1->diff($datetime2);
    
    // Chuyển đổi sang giờ (bao gồm cả phút và giây)
    $hours = $interval->h + ($interval->i / 60) + ($interval->s / 3600);
    $hours += ($interval->days * 24);
    
    // Tính điện tiêu thụ (kWh) = số giờ × công suất (kW)
    $dienTieuThu = $hours * $congSuat;
    
    // Lấy giá hiện tại
    $donGia = getCurrentPrice($conn, $loaiCongSac);
    
    if ($donGia === null) {
        return null; // Không tìm thấy giá
    }
    
    // Tính số tiền (VNĐ) = điện tiêu thụ × đơn giá
    $soTien = $dienTieuThu * $donGia;
    
    return [
        'dienTieuThu' => round($dienTieuThu, 2),
        'soTien' => round($soTien, 0),
        'donGia' => $donGia,
        'soGio' => round($hours, 2)
    ];
}

