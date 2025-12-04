# Hệ Thống Quản Lý Trạm Sạc

Ứng dụng web quản lý trạm sạc điện với giao diện hiện đại và đầy đủ tính năng.

## Tính Năng

- ✅ Dashboard thống kê tổng quan
- ✅ Quản lý trạm sạc (Thêm, Sửa, Xóa)
- ✅ Tìm kiếm trạm sạc
- ✅ Hiển thị trạng thái trạm (Đang hoạt động, Bảo trì, Ngừng hoạt động)
- ✅ Quản lý thông tin chi tiết: địa chỉ, tọa độ, số cổng sạc, công suất, giá cả
- ✅ Giao diện responsive, thân thiện với người dùng

## Yêu Cầu Hệ Thống

- XAMPP (hoặc WAMP/LAMP) với PHP 7.4+
- MySQL 5.7+ hoặc MariaDB 10.3+
- Trình duyệt web hiện đại (Chrome, Firefox, Edge, Safari)

## Cài Đặt

### Bước 1: Cài đặt Database

1. Mở phpMyAdmin (thường tại `http://localhost/phpmyadmin`)
2. Import file `database.sql` để tạo database và bảng dữ liệu
3. Hoặc chạy lệnh SQL trong file `database.sql` trực tiếp

### Bước 2: Cấu hình Database

Nếu cần thay đổi thông tin kết nối database, chỉnh sửa file `config/database.php`:

```php
define('DB_HOST', 'localhost');
define('DB_USER', 'root');
define('DB_PASS', '');  // Mật khẩu MySQL của bạn
define('DB_NAME', 'charging_station_db');
```

### Bước 3: Khởi động Server

1. Khởi động Apache và MySQL trong XAMPP Control Panel
2. Truy cập ứng dụng tại: `http://localhost/web/`

## Cấu Trúc Thư Mục

```
web/
├── api/
│   ├── stations.php      # API quản lý trạm sạc (CRUD)
│   └── stats.php         # API thống kê
├── assets/
│   ├── css/
│   │   └── style.css     # Stylesheet chính
│   └── js/
│       └── app.js        # JavaScript chính
├── config/
│   └── database.php      # Cấu hình database
├── database.sql          # File SQL tạo database
├── index.html            # Trang chủ
└── README.md            # File hướng dẫn
```

## Sử Dụng

### Thêm Trạm Sạc Mới

1. Click nút "Thêm Trạm Mới" ở header
2. Điền đầy đủ thông tin (các trường có dấu * là bắt buộc)
3. Click "Lưu" để thêm trạm

### Chỉnh Sửa Trạm Sạc

1. Click nút "Sửa" trên card trạm sạc cần chỉnh sửa
2. Thay đổi thông tin
3. Click "Lưu" để cập nhật

### Xóa Trạm Sạc

1. Click nút "Xóa" trên card trạm sạc
2. Xác nhận xóa trong hộp thoại

### Tìm Kiếm

Sử dụng ô tìm kiếm ở đầu danh sách để tìm trạm theo tên, địa chỉ hoặc số điện thoại.

## API Endpoints

### GET `/api/stations.php`
Lấy danh sách tất cả trạm sạc

### GET `/api/stations.php?id={id}`
Lấy thông tin một trạm sạc cụ thể

### POST `/api/stations.php`
Tạo trạm sạc mới

### PUT `/api/stations.php`
Cập nhật thông tin trạm sạc

### DELETE `/api/stations.php?id={id}`
Xóa trạm sạc

### GET `/api/stats.php`
Lấy thống kê tổng quan

## Dữ Liệu Mẫu

File `database.sql` đã bao gồm 4 trạm sạc mẫu để bạn có thể test ngay.

## Hỗ Trợ

Nếu gặp vấn đề, vui lòng kiểm tra:
- Apache và MySQL đã khởi động chưa
- Database đã được tạo và import chưa
- Quyền truy cập file và folder
- Log lỗi trong PHP (nếu có)

## License

Dự án mã nguồn mở, tự do sử dụng và chỉnh sửa.

