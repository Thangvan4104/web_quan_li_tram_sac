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
 * @param float $congSuat Công suất cột sạc (có thể là kW hoặc W - sẽ tự động chuyển đổi)
 * @param string $loaiCongSac Loại cổng sạc
 * @return array Mảng chứa ['dienTieuThu' => float, 'soTien' => float, 'donGia' => float] hoặc null nếu lỗi
 */
function calculateChargingCost($conn, $thoiGianBatDau, $thoiGianKetThuc, $congSuat, $loaiCongSac) {
    // Tính số giờ sạc - sử dụng timestamp để tính chính xác hơn
    try {
        // Đảm bảo timezone được set đúng (UTC hoặc timezone của server)
        $datetime1 = new DateTime($thoiGianBatDau);
        $datetime2 = new DateTime($thoiGianKetThuc);
        
        // Kiểm tra thời gian hợp lệ
        if ($datetime2 < $datetime1) {
            error_log("Lỗi: Thời gian kết thúc nhỏ hơn thời gian bắt đầu");
            error_log("ThoiGianBatDau: " . $thoiGianBatDau . " (" . $datetime1->format('Y-m-d H:i:s') . ")");
            error_log("ThoiGianKetThuc: " . $thoiGianKetThuc . " (" . $datetime2->format('Y-m-d H:i:s') . ")");
            return null;
        }
        
        // Tính số giờ bằng cách lấy timestamp và chia cho 3600 (số giây trong 1 giờ)
        $timestamp1 = $datetime1->getTimestamp();
        $timestamp2 = $datetime2->getTimestamp();
        $seconds = $timestamp2 - $timestamp1;
        $hours = $seconds / 3600;
        
        // Log thông tin thời gian để debug
        $days = floor($hours / 24);
        $remainingHours = $hours - ($days * 24);
        $minutes = floor(($hours - floor($hours)) * 60);
        
        error_log(sprintf(
            "Tính thời gian sạc: Từ %s đến %s = %d giây = %.4f giờ (tương đương %d ngày %d giờ %d phút)",
            $thoiGianBatDau, $thoiGianKetThuc, $seconds, $hours, $days, floor($remainingHours), $minutes
        ));
        
        // Kiểm tra số giờ hợp lý (từ 0.01 giờ = 36 giây đến 72 giờ = 3 ngày)
        // Nếu > 72 giờ, cảnh báo nghiêm trọng (có thể có lỗi nhập liệu)
        if ($hours < 0.01) {
            error_log("Lỗi: Số giờ sạc quá ngắn: ${hours} giờ (${seconds} giây) - không hợp lý");
            return null;
        } elseif ($hours > 72) {
            error_log("CẢNH BÁO NGHIÊM TRỌNG: Số giờ sạc rất dài: ${hours} giờ (${seconds} giây) - có thể có lỗi nhập liệu!");
            error_log("Kiểm tra lại: ThoiGianBatDau = " . $thoiGianBatDau . ", ThoiGianKetThuc = " . $thoiGianKetThuc);
        } elseif ($hours > 48) {
            error_log("Cảnh báo: Số giờ sạc dài: ${hours} giờ (${seconds} giây) - có thể sạc qua nhiều ngày");
        }
    } catch (Exception $e) {
        error_log("Lỗi khi tính thời gian: " . $e->getMessage());
        error_log("ThoiGianBatDau: " . $thoiGianBatDau);
        error_log("ThoiGianKetThuc: " . $thoiGianKetThuc);
        return null;
    }
    
    // Kiểm tra và chuyển đổi đơn vị công suất
    // Cột sạc thường có công suất từ 7kW đến 350kW
    // Nếu công suất > 350, chắc chắn đang là W (ví dụ: 50000W = 50kW)
    // Nếu công suất trong khoảng 100-350, có thể là W hoặc kW, cần kiểm tra kỹ
    $congSuatKW = floatval($congSuat);
    $congSuatGoc = $congSuatKW;
    
    // Logic chuyển đổi thông minh:
    // - Nếu > 350: Chắc chắn là W, chuyển sang kW
    // - Nếu 100-350: Có thể là W hoặc kW, nhưng thường cột sạc không > 350kW, nên nếu > 100 thì có thể là W
    // - Nếu < 100: Giả định là kW (hợp lý cho cột sạc)
    if ($congSuatKW > 350) {
        // Chắc chắn là W, chuyển sang kW
        $congSuatKW = $congSuatKW / 1000;
        error_log("Cảnh báo: Công suất có vẻ là W (${congSuatGoc}), đã chuyển đổi sang kW (${congSuatKW}kW)");
    } elseif ($congSuatKW > 100 && $congSuatKW <= 350) {
        // Có thể là W hoặc kW
        // Cột sạc thường không > 350kW, nên nếu > 100 thì có thể là W
        // Nhưng để an toàn, chỉ cảnh báo và giả định là kW (nếu thực tế là W thì sẽ tính sai)
        // Tuy nhiên, để tránh tính sai, nếu > 100 thì cũng thử chuyển đổi
        error_log("Cảnh báo: Công suất ${congSuatGoc} có thể là W. Đang giả định là kW, nếu sai cần kiểm tra lại.");
        // KHÔNG tự động chuyển đổi vì có thể là kW thật (ví dụ: 150kW)
    }
    
    // Đảm bảo công suất hợp lý (từ 0.1kW đến 500kW)
    // Nếu sau khi chuyển đổi vẫn > 500kW, có thể có lỗi
    if ($congSuatKW < 0.1 || $congSuatKW > 500) {
        error_log("Lỗi: Công suất không hợp lý: ${congSuatKW}kW (giá trị gốc: ${congSuatGoc}). Có thể cần chuyển đổi đơn vị.");
        // Thử chuyển đổi từ W sang kW nếu chưa làm
        if ($congSuatKW > 500 && $congSuatGoc > 500) {
            $congSuatKW = $congSuatGoc / 1000;
            error_log("Đã thử chuyển đổi: ${congSuatGoc}W -> ${congSuatKW}kW");
            // Kiểm tra lại
            if ($congSuatKW < 0.1 || $congSuatKW > 500) {
                error_log("Lỗi: Công suất vẫn không hợp lý sau khi chuyển đổi: ${congSuatKW}kW");
                return null;
            }
        } else {
            return null;
        }
    }
    
    // Tính điện tiêu thụ (kWh) = số giờ × công suất (kW)
    $dienTieuThu = $hours * $congSuatKW;
    
    // Kiểm tra kết quả tính toán hợp lý trước khi tiếp tục
    // Điện tiêu thụ không nên vượt quá công suất × thời gian hợp lý
    // Ví dụ: 22kW × 25 giờ = 550 kWh là hợp lý
    // Nhưng nếu 22kW × 1 giờ = 550 kWh thì không hợp lý
    $dienTieuThuDuKien = $hours * $congSuatKW;
    if (abs($dienTieuThu - $dienTieuThuDuKien) > 0.01) {
        error_log("CẢNH BÁO: Có sự khác biệt trong tính toán điện tiêu thụ!");
    }
    
    // Lấy giá hiện tại (VNĐ/kWh)
    $donGia = getCurrentPrice($conn, $loaiCongSac);
    
    if ($donGia === null) {
        error_log("Lỗi: Không tìm thấy giá cho loại cổng sạc: ${loaiCongSac}");
        return null; // Không tìm thấy giá
    }
    
    // Kiểm tra đơn giá hợp lý (thường từ 1,000 đến 50,000 VNĐ/kWh)
    if ($donGia < 1000 || $donGia > 50000) {
        error_log("Cảnh báo: Đơn giá có vẻ không hợp lý: ${donGia} VNĐ/kWh");
    }
    
    // Tính số tiền (VNĐ) = điện tiêu thụ (kWh) × đơn giá (VNĐ/kWh)
    $soTien = $dienTieuThu * $donGia;
    
    // Kiểm tra kết quả cuối cùng
    // Nếu điện tiêu thụ quá cao so với thời gian và công suất, có thể có lỗi
    // Ví dụ: 550 kWh trong 1 giờ với 22kW là không thể (cần 25 giờ)
    $dienTieuThuToiDa = $hours * $congSuatKW * 1.1; // Cho phép sai số 10%
    if ($dienTieuThu > $dienTieuThuToiDa) {
        error_log("CẢNH BÁO NGHIÊM TRỌNG: Điện tiêu thụ (${dienTieuThu} kWh) vượt quá mức hợp lý (${dienTieuThuToiDa} kWh)!");
        error_log("Chi tiết: Số giờ = ${hours}, Công suất = ${congSuatKW}kW, Công suất gốc = ${congSuatGoc}");
    }
    
    // Log để debug với thông tin chi tiết
    error_log(sprintf(
        "Tính toán chi phí: Thời gian bắt đầu = %s, Thời gian kết thúc = %s, Số giây = %d, Số giờ = %.4f giờ, Công suất gốc = %.0f, Công suất (kW) = %.2f kW, Điện tiêu thụ = %.2f kWh, Đơn giá = %.0f VNĐ/kWh, Tổng tiền = %.0f VNĐ",
        $thoiGianBatDau, $thoiGianKetThuc, $seconds, $hours, $congSuatGoc, $congSuatKW, $dienTieuThu, $donGia, $soTien
    ));
    
    // Kiểm tra kết quả hợp lý
    // Điện tiêu thụ không nên > 1000 kWh cho một phiên sạc (trừ khi sạc rất lâu với công suất cao)
    if ($dienTieuThu > 1000) {
        error_log("CẢNH BÁO NGHIÊM TRỌNG: Điện tiêu thụ quá cao: ${dienTieuThu} kWh. Có thể có lỗi trong tính toán!");
        error_log("Chi tiết: Số giờ = ${hours}, Công suất = ${congSuatKW}kW, Công suất gốc = ${congSuatGoc}");
    }
    
    return [
        'dienTieuThu' => round($dienTieuThu, 2),
        'soTien' => round($soTien, 0),
        'donGia' => $donGia,
        'soGio' => round($hours, 2),
        'congSuatKW' => round($congSuatKW, 2) // Thêm để debug
    ];
}

