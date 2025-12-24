/**
 * File: database.sql
 * Mô tả: Schema database đầy đủ cho hệ thống quản lý trạm sạc xe điện
 * Bao gồm các bảng chính theo thiết kế ER (TramSac, CotSac, KhachHang, PhuongTien, 
 * PhienSac, HoaDon, ThanhToan, NhanVien, BaoTri, GiaSac, Admin)
 */

-- Tạo database
CREATE DATABASE IF NOT EXISTS charging_station_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE charging_station_db;

-- ============================================
-- BẢNG 1: TRẠM SẠC (TramSac)
-- ============================================
CREATE TABLE IF NOT EXISTS TramSac (
    MaTram CHAR(5) PRIMARY KEY,
    TenTram VARCHAR(100) NOT NULL,
    DiaChi VARCHAR(200) NOT NULL,
    ThanhPho VARCHAR(50) NOT NULL,
    TrangThai VARCHAR(20) DEFAULT 'Hoạt động',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- BẢNG 2: CỘT SẠC (CotSac)
-- ============================================
CREATE TABLE IF NOT EXISTS CotSac (
    MaCot CHAR(5) PRIMARY KEY,
    LoaiCongSac VARCHAR(50) NOT NULL,
    CongSuat INT NOT NULL,
    TinhTrang VARCHAR(20) DEFAULT 'Rảnh',
    MaTram CHAR(5) NOT NULL,
    FOREIGN KEY (MaTram) REFERENCES TramSac(MaTram) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    -- Hỗ trợ thống kê và lọc cột sạc theo trạm
    INDEX idx_cotsac_tram (MaTram)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- BẢNG 3: KHÁCH HÀNG (KhachHang)
-- ============================================
CREATE TABLE IF NOT EXISTS KhachHang (
    MaKH CHAR(5) PRIMARY KEY,
    HoTen VARCHAR(100) NOT NULL,
    SDT VARCHAR(15) UNIQUE,
    Email VARCHAR(100) UNIQUE,
    PhuongThucThanhToan VARCHAR(50),
    MaTram CHAR(5) NULL COMMENT 'Trạm sạc mà khách hàng sử dụng',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_khachhang_tram (MaTram),
    FOREIGN KEY (MaTram) REFERENCES TramSac(MaTram) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- BẢNG 4: PHƯƠNG TIỆN (PhuongTien)
-- ============================================
CREATE TABLE IF NOT EXISTS PhuongTien (
    BienSo VARCHAR(15) PRIMARY KEY,
    DongXe VARCHAR(50) NOT NULL,
    HangXe VARCHAR(50) NOT NULL,
    MaKH CHAR(5) NOT NULL,
    MaTram CHAR(5) NULL COMMENT 'Trạm sạc mà phương tiện sử dụng',
    FOREIGN KEY (MaKH) REFERENCES KhachHang(MaKH) ON DELETE CASCADE,
    INDEX idx_phuongtien_tram (MaTram),
    FOREIGN KEY (MaTram) REFERENCES TramSac(MaTram) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- BẢNG 5: PHIÊN SẠC (PhienSac)
-- ============================================
CREATE TABLE IF NOT EXISTS PhienSac (
    MaPhien CHAR(5) PRIMARY KEY,
    ThoiGianBatDau DATETIME NOT NULL,
    ThoiGianKetThuc DATETIME NULL,
    DienTieuThu FLOAT NULL,
    MaCot CHAR(5) NOT NULL,
    BienSoPT VARCHAR(15) NOT NULL,
    MaHoaDon CHAR(5) NULL,
    FOREIGN KEY (MaCot) REFERENCES CotSac(MaCot) ON DELETE CASCADE,
    FOREIGN KEY (BienSoPT) REFERENCES PhuongTien(BienSo) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- BẢNG 6: HÓA ĐƠN (HoaDon)
-- ============================================
CREATE TABLE IF NOT EXISTS HoaDon (
    MaHD CHAR(5) PRIMARY KEY,
    NgayLap DATE NOT NULL,
    SoTien FLOAT NOT NULL,
    MaPhien CHAR(5) UNIQUE,
    FOREIGN KEY (MaPhien) REFERENCES PhienSac(MaPhien) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Thêm foreign key từ PhienSac đến HoaDon sau khi HoaDon đã được tạo
ALTER TABLE PhienSac ADD CONSTRAINT fk_phien_hoadon FOREIGN KEY (MaHoaDon) REFERENCES HoaDon(MaHD) ON DELETE SET NULL;

-- ============================================
-- BẢNG 7: THANH TOÁN (ThanhToan)
-- ============================================
CREATE TABLE IF NOT EXISTS ThanhToan (
    MaTT CHAR(5) PRIMARY KEY,
    MaHD CHAR(5) NOT NULL,
    PhuongThuc VARCHAR(50) NOT NULL,
    SoTien FLOAT NOT NULL,
    NgayTT DATETIME NOT NULL,
    TrangThai VARCHAR(20) DEFAULT 'Hoàn tất',
    FOREIGN KEY (MaHD) REFERENCES HoaDon(MaHD) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- BẢNG 8: NHÂN VIÊN (NhanVien)
-- ============================================
CREATE TABLE IF NOT EXISTS NhanVien (
    MaNV CHAR(5) PRIMARY KEY,
    HoTen VARCHAR(100) NOT NULL,
    SDT VARCHAR(15) UNIQUE,
    Email VARCHAR(100) UNIQUE,
    ChucVu VARCHAR(50) NOT NULL,
    MaTram CHAR(5) NOT NULL,
    -- Phân quyền RBAC: role (admin/staff), is_approved (0/1), password (đã hash)
    role ENUM('admin', 'staff') DEFAULT 'staff' COMMENT 'Vai trò: admin (quản trị viên) hoặc staff (nhân viên)',
    is_approved TINYINT(1) DEFAULT 0 COMMENT 'Trạng thái duyệt: 0 = chờ duyệt, 1 = đã duyệt',
    -- Cờ đánh dấu lần đăng nhập đầu tiên: 1 = lần đầu, 0 = đã đổi mật khẩu
    is_first_login TINYINT(1) DEFAULT 1 COMMENT '1 = lần đăng nhập đầu tiên, bắt buộc đổi mật khẩu',
    password VARCHAR(255) NOT NULL COMMENT 'Mật khẩu đã hash bằng password_hash()',
    FOREIGN KEY (MaTram) REFERENCES TramSac(MaTram) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    -- Hỗ trợ lọc nhân viên theo trạm và chức vụ (quản lý trạm / bảo trì / thao tác)
    INDEX idx_nhanvien_tram (MaTram),
    INDEX idx_nhanvien_tram_chucvu (MaTram, ChucVu)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- BẢNG 9: BẢO TRÌ (BaoTri)
-- ============================================
CREATE TABLE IF NOT EXISTS BaoTri (
    MaBT CHAR(5) PRIMARY KEY,
    NgayBaoTri DATE NOT NULL,
    NoiDung VARCHAR(200) NOT NULL,
    MaNV CHAR(5) NOT NULL,
    MaCot CHAR(5) NULL,
    TrangThai VARCHAR(20) DEFAULT 'Hoàn tất',
    FOREIGN KEY (MaNV) REFERENCES NhanVien(MaNV) ON DELETE CASCADE,
    FOREIGN KEY (MaCot) REFERENCES CotSac(MaCot) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    -- Hỗ trợ tra cứu phiếu bảo trì theo nhân viên và cột sạc
    INDEX idx_baotri_manv (MaNV),
    INDEX idx_baotri_macot (MaCot)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- BẢNG 10: GIÁ SẠC (GiaSac)
-- ============================================
-- Bảng quản lý giá sạc theo loại cổng sạc
-- Chỉ admin mới có quyền set giá
CREATE TABLE IF NOT EXISTS GiaSac (
    MaGia CHAR(5) PRIMARY KEY,
    LoaiCongSac VARCHAR(50) NOT NULL COMMENT 'Loại cổng sạc: Type 2 AC, CCS2 DC, CHAdeMO',
    DonGia FLOAT NOT NULL COMMENT 'Giá mỗi kWh (VNĐ)',
    NgayApDung DATE NOT NULL COMMENT 'Ngày bắt đầu áp dụng giá',
    NgayKetThuc DATE NULL COMMENT 'Ngày kết thúc (NULL = đang áp dụng)',
    TrangThai VARCHAR(20) DEFAULT 'Đang áp dụng' COMMENT 'Trạng thái: Đang áp dụng, Hết hiệu lực',
    NguoiTao CHAR(5) COMMENT 'Mã nhân viên (admin) tạo giá này',
    FOREIGN KEY (NguoiTao) REFERENCES NhanVien(MaNV) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_loaicong (LoaiCongSac),
    INDEX idx_trangthai (TrangThai)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- BẢNG 11: ADMIN (Admin)
-- ============================================
-- Bảng quản lý tài khoản quản trị hệ thống
CREATE TABLE IF NOT EXISTS Admin (
    MaAdmin CHAR(5) PRIMARY KEY,
    HoTen VARCHAR(100) NOT NULL,
    Email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL COMMENT 'Mật khẩu đã hash bằng password_hash()',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- INSERT DỮ LIỆU MẪU
-- ============================================

-- Dữ liệu mẫu: Trạm sạc
INSERT INTO TramSac (MaTram, TenTram, DiaChi, ThanhPho, TrangThai) VALUES
('TS001', 'Trạm sạc Trung tâm Hà Nội', '123 Đường Láng, Đống Đa', 'Hà Nội', 'Hoạt động'),
('TS002', 'Trạm sạc Quận 1 TP.HCM', '456 Nguyễn Huệ, Quận 1', 'TP.HCM', 'Hoạt động'),
('TS003', 'Trạm sạc Đà Nẵng', '789 Bạch Đằng, Hải Châu', 'Đà Nẵng', 'Hoạt động'),
('TS004', 'Trạm sạc Bảo trì', '321 Đường ABC, Quận XYZ', 'Hà Nội', 'Bảo trì');

-- Dữ liệu mẫu: Cột sạc
INSERT INTO CotSac (MaCot, LoaiCongSac, CongSuat, TinhTrang, MaTram) VALUES
('CS001', 'Type 2 AC', 22, 'Rảnh', 'TS001'),
('CS002', 'CCS2 DC', 50, 'Đang sạc', 'TS001'),
('CS003', 'CHAdeMO', 50, 'Rảnh', 'TS001'),
('CS004', 'Type 2 AC', 22, 'Rảnh', 'TS002'),
('CS005', 'CCS2 DC', 150, 'Rảnh', 'TS002'),
('CS006', 'Type 2 AC', 22, 'Rảnh', 'TS003'),
('CS007', 'CCS2 DC', 50, 'Bảo trì', 'TS004');

-- Dữ liệu mẫu: Khách hàng
INSERT INTO KhachHang (MaKH, HoTen, SDT, Email, PhuongThucThanhToan) VALUES
('KH001', 'Nguyễn Văn An', '0912345678', 'an.nguyen@email.com', 'Ví điện tử'),
('KH002', 'Trần Thị Bình', '0923456789', 'binh.tran@email.com', 'Thẻ ngân hàng'),
('KH003', 'Lê Văn Cường', '0934567890', 'cuong.le@email.com', 'Ví điện tử'),
('KH004', 'Phạm Thị Dung', '0945678901', 'dung.pham@email.com', 'Thẻ ngân hàng');

-- Dữ liệu mẫu: Phương tiện
INSERT INTO PhuongTien (BienSo, DongXe, HangXe, MaKH) VALUES
('29A1-12345', 'VinFast VF e34', 'VinFast', 'KH001'),
('30B2-67890', 'Pega', 'Pega', 'KH002'),
('51C3-11111', 'VinFast VF 8', 'VinFast', 'KH003'),
('43D4-22222', 'Pega', 'Pega', 'KH004');

-- Dữ liệu mẫu: Nhân viên
-- Lưu ý: Password mặc định là "admin123" cho admin và "staff123" cho staff
-- Password đã được hash bằng password_hash() với PASSWORD_DEFAULT
-- 
-- QUAN TRỌNG: Sau khi import database.sql, bạn CẦN chạy file create_password_hash.php
-- để tạo password hash thực sự, sau đó cập nhật vào database bằng các lệnh UPDATE sau:
--
-- UPDATE NhanVien SET password = '[hash từ create_password_hash.php]' WHERE MaNV = 'NV001';
-- UPDATE NhanVien SET password = '[hash từ create_password_hash.php]' WHERE MaNV IN ('NV002', 'NV003', 'NV004');
--
-- Hoặc chạy trực tiếp file create_password_hash.php và copy SQL statements
--
-- Tạm thời sử dụng hash mẫu (password: "password") - CẦN CẬP NHẬT SAU
INSERT INTO NhanVien (MaNV, HoTen, SDT, Email, ChucVu, MaTram, role, is_approved, password) VALUES
-- Admin: NV001 - password: admin123 (CẦN CẬP NHẬT PASSWORD HASH)
('NV001', 'Hoàng Văn Đức', '0987654321', 'duc.hoang@charging.com', 'Quản lý trạm', 'TS001', 'admin', 1, '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'),
-- Staff đã duyệt: NV002, NV003 - password: staff123 (CẦN CẬP NHẬT PASSWORD HASH)
('NV002', 'Vũ Thị Hoa', '0976543210', 'hoa.vu@charging.com', 'Nhân viên kỹ thuật', 'TS001', 'staff', 1, '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'),
('NV003', 'Đỗ Văn Khoa', '0965432109', 'khoa.do@charging.com', 'Quản lý trạm', 'TS002', 'staff', 1, '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'),
-- Staff chờ duyệt: NV004 - password: staff123 (chưa được duyệt, không thể đăng nhập) (CẦN CẬP NHẬT PASSWORD HASH)
('NV004', 'Bùi Thị Lan', '0954321098', 'lan.bui@charging.com', 'Nhân viên vận hành', 'TS003', 'staff', 0, '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi');

-- Dữ liệu mẫu: Admin
-- Tài khoản admin mặc định:
-- Email: admin@gmail.com
-- Password: admin123 (cần chạy create_password_hash.php để cập nhật hash thực tế nếu muốn)
INSERT INTO Admin (MaAdmin, HoTen, Email, password) VALUES
('AD001', 'Quản Trị Viên', 'admin@gmail.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi')
ON DUPLICATE KEY UPDATE 
    HoTen = VALUES(HoTen),
    password = VALUES(password);

-- Dữ liệu mẫu: Phiên sạc
-- Lưu ý: INSERT với MaHoaDon = NULL trước, sau đó sẽ UPDATE sau khi tạo hóa đơn
INSERT INTO PhienSac (MaPhien, ThoiGianBatDau, ThoiGianKetThuc, DienTieuThu, MaCot, BienSoPT, MaHoaDon) VALUES
('PS001', '2024-01-15 08:00:00', '2024-01-15 09:30:00', 33.5, 'CS002', '29A1-12345', NULL),
('PS002', '2024-01-15 10:00:00', '2024-01-15 11:00:00', 22.0, 'CS004', '30B2-67890', NULL),
('PS003', '2024-01-15 14:00:00', NULL, NULL, 'CS001', '51C3-11111', NULL);

-- Dữ liệu mẫu: Hóa đơn
-- Tạo hóa đơn sau khi phiên sạc đã tồn tại (vì HoaDon có foreign key đến PhienSac)
INSERT INTO HoaDon (MaHD, NgayLap, SoTien, MaPhien) VALUES
('HD001', '2024-01-15', 167500, 'PS001'),
('HD002', '2024-01-15', 110000, 'PS002');

-- Cập nhật MaHoaDon trong PhienSac sau khi hóa đơn đã được tạo
-- Mục đích: Tạo liên kết 1-1 giữa phiên sạc và hóa đơn
UPDATE PhienSac SET MaHoaDon = 'HD001' WHERE MaPhien = 'PS001';
UPDATE PhienSac SET MaHoaDon = 'HD002' WHERE MaPhien = 'PS002';

-- Dữ liệu mẫu: Thanh toán
INSERT INTO ThanhToan (MaTT, MaHD, PhuongThuc, SoTien, NgayTT, TrangThai) VALUES
('TT001', 'HD001', 'Ví điện tử', 167500, '2024-01-15 09:35:00', 'Hoàn tất'),
('TT002', 'HD002', 'Thẻ ngân hàng', 110000, '2024-01-15 11:05:00', 'Hoàn tất');

-- Dữ liệu mẫu: Bảo trì
INSERT INTO BaoTri (MaBT, NgayBaoTri, NoiDung, MaNV, MaCot, TrangThai) VALUES
('BT001', '2024-01-10', 'Kiểm tra và bảo dưỡng định kỳ cột sạc CS007', 'NV002', 'CS007', 'Hoàn tất'),
('BT002', '2024-01-12', 'Thay thế linh kiện cột sạc CS003', 'NV002', 'CS003', 'Hoàn tất'),
('BT003', '2024-01-20', 'Bảo trì toàn bộ trạm TS004', 'NV001', NULL, 'Đang thực hiện');

-- Dữ liệu mẫu: Giá sạc
-- Giá sạc theo loại cổng sạc (chỉ admin mới có quyền set giá)
INSERT INTO GiaSac (MaGia, LoaiCongSac, DonGia, NgayApDung, TrangThai, NguoiTao) VALUES
('GS001', 'Type 2 AC', 5000, '2024-01-01', 'Đang áp dụng', 'NV001'),
('GS002', 'CCS2 DC', 6000, '2024-01-01', 'Đang áp dụng', 'NV001'),
('GS003', 'CHAdeMO', 6000, '2024-01-01', 'Đang áp dụng', 'NV001');

-- ============================================
-- CẬP NHẬT DỮ LIỆU: Gán MaTram cho KhachHang và PhuongTien
-- ============================================
-- Cập nhật MaTram cho khách hàng dựa trên phiên sạc gần nhất
-- Nếu khách hàng đã có phiên sạc, lấy MaTram từ cột sạc của phiên sạc đó
UPDATE KhachHang kh
INNER JOIN PhuongTien pt ON kh.MaKH = pt.MaKH
INNER JOIN PhienSac ps ON pt.BienSo = ps.BienSoPT
INNER JOIN CotSac c ON ps.MaCot = c.MaCot
SET kh.MaTram = c.MaTram
WHERE kh.MaTram IS NULL;

-- Cập nhật MaTram cho phương tiện dựa trên phiên sạc gần nhất
UPDATE PhuongTien pt
INNER JOIN PhienSac ps ON pt.BienSo = ps.BienSoPT
INNER JOIN CotSac c ON ps.MaCot = c.MaCot
SET pt.MaTram = c.MaTram
WHERE pt.MaTram IS NULL;
