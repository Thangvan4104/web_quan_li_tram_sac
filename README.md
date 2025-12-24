# Hệ Thống Quản Lý Trạm Sạc Xe Điện

Hệ thống web quản lý toàn diện cho các trạm sạc xe điện với đầy đủ tính năng quản lý từ trạm sạc, cột sạc, khách hàng, phiên sạc, hóa đơn, thanh toán, nhân viên và bảo trì. Hệ thống được trang bị phân quyền RBAC (Role-Based Access Control) với hỗ trợ lọc dữ liệu theo trạm cho nhân viên.

## Tính Năng

### Quản Lý Cơ Bản
- ✅ **Quản lý Trạm Sạc**: Thêm, sửa, xóa, xem danh sách trạm sạc
- ✅ **Quản lý Cột Sạc**: Quản lý các cột sạc trong từng trạm
- ✅ **Quản lý Khách Hàng**: Lưu trữ thông tin khách hàng và phương thức thanh toán
- ✅ **Quản lý Phương Tiện**: Quản lý xe điện của khách hàng
- ✅ **Quản lý Phiên Sạc**: Theo dõi các phiên sạc, thời gian, điện tiêu thụ
- ✅ **Quản lý Hóa Đơn**: Tự động tạo hóa đơn từ phiên sạc
- ✅ **Quản lý Thanh Toán**: Theo dõi các giao dịch thanh toán
- ✅ **Quản lý Nhân Viên**: Quản lý nhân viên theo trạm với hệ thống duyệt tài khoản
- ✅ **Quản lý Bảo Trì**: Ghi nhận và theo dõi hoạt động bảo trì
- ✅ **Quản lý Giá Sạc**: Thiết lập giá sạc theo loại cổng (chỉ admin)

### Dashboard
- Thống kê tổng quan: Tổng số trạm, cột sạc, khách hàng, phiên sạc
- Hoạt động gần đây
- Giao diện hiện đại, responsive
- Tự động lọc theo trạm cho nhân viên

### Phân Quyền RBAC
- **Admin**: Toàn quyền quản trị hệ thống
- **Staff (đã duyệt)**: Quản lý dữ liệu trạm của mình
- **Staff (chờ duyệt)**: Không thể truy cập hệ thống

## Yêu Cầu Hệ Thống

- XAMPP (hoặc WAMP/LAMP) với PHP 7.4+
- MySQL 5.7+ hoặc MariaDB 10.3+
- Trình duyệt web hiện đại (Chrome, Firefox, Edge, Safari)

## Cài Đặt

### Bước 1: Cài đặt Database

1. Mở phpMyAdmin (thường tại `http://localhost/phpmyadmin`)
2. Import file `database.sql` để tạo database và bảng dữ liệu
3. Hoặc chạy lệnh SQL trong file `database.sql` trực tiếp

### Bước 2: Tạo Password Hash

**QUAN TRỌNG**: Password trong `database.sql` chỉ là hash mẫu. Bạn CẦN tạo hash thực sự:

1. Mở trình duyệt và truy cập: `http://localhost/web/create_password_hash.php`
2. Copy các password hash được tạo ra
3. Cập nhật password hash trong database cho các tài khoản cần sử dụng

Hoặc sử dụng file `create_password_hash.php` để tạo hash mới cho password của bạn.

### Bước 3: Cấu hình Database

Nếu cần thay đổi thông tin kết nối database, chỉnh sửa file `config/database.php`:

```php
define('DB_HOST', 'localhost');
define('DB_USER', 'root');
define('DB_PASS', '');  // Mật khẩu MySQL của bạn
define('DB_NAME', 'charging_station_db');
```

### Bước 4: Khởi động Server

1. Khởi động Apache và MySQL trong XAMPP Control Panel
2. Truy cập ứng dụng tại: `http://localhost/web/login.php`

## Cấu Trúc Database

Hệ thống sử dụng 11 bảng chính:

1. **TramSac** - Trạm sạc
2. **CotSac** - Cột sạc
3. **KhachHang** - Khách hàng (có cột `MaTram` để lọc theo trạm)
4. **PhuongTien** - Phương tiện (xe điện, có cột `MaTram`)
5. **PhienSac** - Phiên sạc
6. **HoaDon** - Hóa đơn
7. **ThanhToan** - Thanh toán
8. **NhanVien** - Nhân viên (có `role`, `is_approved`, `is_first_login`, `password`)
9. **BaoTri** - Bảo trì
10. **GiaSac** - Giá sạc theo loại cổng
11. **Admin** - Tài khoản quản trị viên

### Mô Tả Quan Hệ Dữ Liệu

- **1 Trạm Sạc** có nhiều **Cột Sạc** và **Nhân Viên**
- **1 Khách Hàng** sở hữu nhiều **Phương Tiện** và thuộc về **1 Trạm**
- **1 Cột Sạc** phục vụ nhiều **Phiên Sạc**
- **1 Phương Tiện** thực hiện nhiều **Phiên Sạc**
- **1 Phiên Sạc** sinh ra **1 Hóa Đơn**
- **1 Hóa Đơn** có thể có nhiều **Thanh Toán** (thanh toán nhiều lần)
- **1 Nhân Viên** thực hiện nhiều **Bảo Trì**
- **1 Cột Sạc** có nhiều **Bảo Trì**

## Hệ Thống Phân Quyền RBAC

### Cấu Trúc Phân Quyền

#### Admin
- ✅ Xem toàn bộ dữ liệu của tất cả các trạm
- ✅ Duyệt/khóa nhân viên (qua trang Duyệt Nhân Viên)
- ✅ Set giá sạc (qua trang Quản Lý Giá Sạc)
- ✅ Tất cả quyền của staff
- ✅ Tạo, sửa, xóa trạm sạc và cột sạc
- ✅ Sửa thông số cột sạc

#### Staff (đã duyệt - `is_approved = 1`)
- ✅ Quản lý trạm sạc của mình (chỉ xem, không sửa thông số)
- ✅ Quản lý phiên sạc của trạm mình
- ✅ Quản lý cột sạc của trạm mình (chỉ xem, không sửa thông số)
- ✅ Quản lý khách hàng của trạm mình (tự động gán `MaTram` khi tạo mới)
- ✅ Quản lý phương tiện của trạm mình (tự động gán `MaTram` khi tạo mới)
- ✅ Quản lý hóa đơn của trạm mình
- ✅ Quản lý thanh toán của trạm mình
- ✅ Quản lý nhân viên cùng trạm
- ✅ Quản lý bảo trì của trạm mình
- ❌ KHÔNG set giá sạc
- ❌ KHÔNG duyệt nhân viên
- ❌ KHÔNG sửa thông số cột sạc

#### Staff (chờ duyệt - `is_approved = 0`)
- ❌ KHÔNG vào được hệ thống
- ⏳ Chờ admin duyệt

### Lọc Dữ Liệu Theo Trạm

Hệ thống tự động lọc dữ liệu cho nhân viên:
- Staff chỉ thấy dữ liệu của trạm mình được phân về (`MaTram` trong bảng `NhanVien`)
- Khi staff tạo khách hàng/phương tiện mới, `MaTram` sẽ tự động được gán theo trạm của nhân viên
- Admin vẫn thấy tất cả dữ liệu và có thể lọc hóa đơn theo trạm bằng tham số `?matram=TS001`

### Đăng Nhập và Đổi Mật Khẩu

- Nhân viên mới được tạo sẽ có mật khẩu mặc định (cần set trong database hoặc qua API)
- Nhân viên **PHẢI** đổi mật khẩu lần đầu đăng nhập (tự động redirect đến `change_password.php`)
- Password được hash bằng `password_hash()` với `PASSWORD_DEFAULT`

## Cấu Trúc Thư Mục

```
web/
├── api/
│   ├── auth.php          # API xác thực (login, logout, session)
│   ├── approve.php       # API duyệt nhân viên (chỉ admin)
│   ├── tramsac.php       # API quản lý trạm sạc
│   ├── cotsac.php        # API quản lý cột sạc
│   ├── khachhang.php     # API quản lý khách hàng
│   ├── phuongtien.php    # API quản lý phương tiện
│   ├── phiensac.php      # API quản lý phiên sạc
│   ├── hoadon.php        # API quản lý hóa đơn
│   ├── thanhtoan.php     # API quản lý thanh toán
│   ├── nhanvien.php      # API quản lý nhân viên
│   ├── baotri.php        # API quản lý bảo trì
│   └── giasac.php        # API quản lý giá sạc (chỉ admin)
├── assets/
│   ├── css/
│   │   ├── base.css      # CSS cơ bản
│   │   ├── login.css     # CSS trang đăng nhập
│   │   ├── dashboard.css # CSS dashboard
│   │   └── [module].css  # CSS cho từng module
│   └── js/
│       ├── core.js       # JavaScript core
│       ├── auth.js       # Xử lý authentication
│       ├── login.js      # Logic đăng nhập
│       ├── dashboard.js  # Logic dashboard
│       └── [module].js   # JavaScript cho từng module
├── config/
│   ├── database.php      # Cấu hình database
│   ├── auth.php          # Hàm kiểm tra quyền
│   ├── cors.php          # Cấu hình CORS
│   └── helpers.php       # Các hàm helper
├── database.sql          # File SQL tạo database
├── database_migration_station_filter.sql  # Migration: Thêm cột MaTram
├── create_password_hash.php  # Tool tạo password hash
├── login.php             # Trang đăng nhập
├── change_password.php   # Trang đổi mật khẩu (nhân viên lần đầu)
├── index.php             # Trang chủ (redirect sau login)
├── admin.html            # Giao diện admin
├── staff.html            # Giao diện staff
└── README.md             # File hướng dẫn này
```

## API Endpoints

### Authentication
- `POST /api/auth.php` - Đăng nhập
- `GET /api/auth.php` - Kiểm tra session hiện tại
- `DELETE /api/auth.php` - Đăng xuất

### Trạm Sạc
- `GET /api/tramsac.php` - Lấy danh sách trạm sạc (staff chỉ thấy trạm của mình)
- `GET /api/tramsac.php?id={id}` - Lấy thông tin một trạm (staff chỉ xem được trạm của mình)
- `POST /api/tramsac.php` - Tạo trạm sạc mới (chỉ admin)
- `PUT /api/tramsac.php` - Cập nhật trạm sạc (chỉ admin)
- `DELETE /api/tramsac.php?id={id}` - Xóa trạm sạc (chỉ admin)

### Cột Sạc
- `GET /api/cotsac.php` - Lấy danh sách cột sạc (staff chỉ thấy cột sạc của trạm mình)
- `GET /api/cotsac.php?matram={id}` - Lấy cột sạc theo trạm
- `GET /api/cotsac.php?id={id}` - Lấy thông tin một cột sạc (staff chỉ xem được cột sạc của trạm mình)
- `POST /api/cotsac.php` - Tạo cột sạc mới (chỉ admin)
- `PUT /api/cotsac.php` - Cập nhật cột sạc (chỉ admin được sửa thông số, staff chỉ xem)
- `DELETE /api/cotsac.php?id={id}` - Xóa cột sạc (chỉ admin)

### Khách Hàng
- `GET /api/khachhang.php` - Lấy danh sách khách hàng (staff chỉ thấy khách hàng của trạm mình)
- `GET /api/khachhang.php?id={id}` - Lấy thông tin một khách hàng (staff chỉ xem được khách hàng của trạm mình)
- `POST /api/khachhang.php` - Tạo khách hàng mới (tự động gán `MaTram` cho staff)
- `PUT /api/khachhang.php` - Cập nhật khách hàng
- `DELETE /api/khachhang.php?id={id}` - Xóa khách hàng

### Phương Tiện
- `GET /api/phuongtien.php` - Lấy danh sách phương tiện (staff chỉ thấy phương tiện của trạm mình)
- `GET /api/phuongtien.php?makh={id}` - Lấy phương tiện theo khách hàng
- `GET /api/phuongtien.php?id={id}` - Lấy thông tin một phương tiện (staff chỉ xem được phương tiện của trạm mình)
- `POST /api/phuongtien.php` - Tạo phương tiện mới (tự động gán `MaTram` cho staff)
- `PUT /api/phuongtien.php` - Cập nhật phương tiện
- `DELETE /api/phuongtien.php?id={id}` - Xóa phương tiện

### Phiên Sạc
- `GET /api/phiensac.php` - Lấy danh sách phiên sạc (staff chỉ thấy phiên sạc của trạm mình)
- `GET /api/phiensac.php?id={id}` - Lấy thông tin một phiên sạc (staff chỉ xem được phiên sạc của trạm mình)
- `POST /api/phiensac.php` - Tạo phiên sạc mới
- `PUT /api/phiensac.php` - Cập nhật phiên sạc
- `DELETE /api/phiensac.php?id={id}` - Xóa phiên sạc

### Hóa Đơn
- `GET /api/hoadon.php` - Lấy danh sách hóa đơn (staff chỉ thấy hóa đơn của trạm mình)
- `GET /api/hoadon.php?matram={id}` - Lọc hóa đơn theo trạm (admin)
- `GET /api/hoadon.php?id={id}` - Lấy thông tin một hóa đơn (staff chỉ xem được hóa đơn của trạm mình)
- `POST /api/hoadon.php` - Tạo hóa đơn mới
- `PUT /api/hoadon.php` - Cập nhật hóa đơn
- `DELETE /api/hoadon.php?id={id}` - Xóa hóa đơn

### Thanh Toán
- `GET /api/thanhtoan.php` - Lấy danh sách thanh toán (staff chỉ thấy thanh toán của trạm mình)
- `GET /api/thanhtoan.php?mahd={id}` - Lấy thanh toán theo hóa đơn
- `GET /api/thanhtoan.php?id={id}` - Lấy thông tin một thanh toán (staff chỉ xem được thanh toán của trạm mình)
- `POST /api/thanhtoan.php` - Tạo giao dịch thanh toán
- `PUT /api/thanhtoan.php` - Cập nhật thanh toán
- `DELETE /api/thanhtoan.php?id={id}` - Xóa thanh toán

### Nhân Viên
- `GET /api/nhanvien.php` - Lấy danh sách nhân viên (staff chỉ thấy nhân viên cùng trạm)
- `GET /api/nhanvien.php?matram={id}` - Lấy nhân viên theo trạm
- `GET /api/nhanvien.php?id={id}` - Lấy thông tin một nhân viên (staff chỉ xem được nhân viên cùng trạm)
- `POST /api/nhanvien.php` - Tạo nhân viên mới (chỉ admin, tự động set mật khẩu mặc định)
- `PUT /api/nhanvien.php` - Cập nhật nhân viên
- `DELETE /api/nhanvien.php?id={id}` - Xóa nhân viên (chỉ admin)

### Bảo Trì
- `GET /api/baotri.php` - Lấy danh sách bảo trì (staff chỉ thấy bảo trì của trạm mình)
- `GET /api/baotri.php?id={id}` - Lấy thông tin một phiếu bảo trì (staff chỉ xem được bảo trì của trạm mình)
- `POST /api/baotri.php` - Tạo phiếu bảo trì mới
- `PUT /api/baotri.php` - Cập nhật phiếu bảo trì
- `DELETE /api/baotri.php?id={id}` - Xóa phiếu bảo trì

### Giá Sạc (Chỉ Admin)
- `GET /api/giasac.php` - Lấy danh sách giá sạc
- `GET /api/giasac.php?id={id}` - Lấy giá sạc theo ID
- `GET /api/giasac.php?loaicong={loai}` - Lấy giá đang áp dụng theo loại cổng
- `POST /api/giasac.php` - Tạo giá sạc mới (giá cũ cùng loại tự động hết hiệu lực)
- `PUT /api/giasac.php` - Cập nhật giá sạc
- `DELETE /api/giasac.php?id={id}` - Xóa giá sạc

### Duyệt Nhân Viên (Chỉ Admin)
- `GET /api/approve.php?pending=1` - Lấy danh sách nhân viên chờ duyệt
- `GET /api/approve.php` - Lấy tất cả nhân viên
- `PUT /api/approve.php` - Duyệt/khóa nhân viên (`is_approved`)

## Sử Dụng

### Đăng Nhập

1. Truy cập: `http://localhost/web/login.php`
2. Nhập email và password
3. Nhân viên lần đầu đăng nhập sẽ được redirect đến trang đổi mật khẩu
4. Sau khi đăng nhập thành công, sẽ được redirect đến dashboard tương ứng

### Điều Hướng

Sử dụng menu sidebar bên trái để chuyển đổi giữa các module:
- **Dashboard**: Xem tổng quan và thống kê (tự động lọc theo trạm cho staff)
- **Trạm Sạc**: Quản lý các trạm sạc (staff chỉ xem trạm của mình)
- **Cột Sạc**: Quản lý cột sạc trong từng trạm (staff không thể sửa thông số)
- **Khách Hàng**: Quản lý thông tin khách hàng (tự động gán trạm cho staff)
- **Phương Tiện**: Quản lý xe điện (tự động gán trạm cho staff)
- **Phiên Sạc**: Theo dõi các phiên sạc
- **Hóa Đơn**: Quản lý hóa đơn
- **Thanh Toán**: Quản lý giao dịch thanh toán
- **Nhân Viên**: Quản lý nhân viên (staff chỉ thấy nhân viên cùng trạm)
- **Bảo Trì**: Quản lý hoạt động bảo trì
- **Giá Sạc** (chỉ admin): Thiết lập giá sạc theo loại cổng
- **Duyệt Nhân Viên** (chỉ admin): Duyệt/khóa tài khoản nhân viên

### Thêm Dữ Liệu

1. Chọn module cần quản lý từ menu
2. Click nút "Thêm Mới" (nếu có)
3. Điền đầy đủ thông tin
4. Click "Lưu" để lưu dữ liệu
5. Đối với staff: Khách hàng và phương tiện mới sẽ tự động được gán trạm

## Migration và Cập Nhật

### Migration: Lọc Dữ Liệu Theo Trạm

Để kích hoạt tính năng lọc dữ liệu theo trạm cho nhân viên:

1. Chạy file `database_migration_station_filter.sql` trong MySQL
2. File này sẽ:
   - Thêm cột `MaTram` vào bảng `KhachHang`
   - Thêm cột `MaTram` vào bảng `PhuongTien`
   - Cập nhật dữ liệu hiện có: Gán `MaTram` dựa trên phiên sạc gần nhất

### Tách Bảng Admin và NhanVien

Hệ thống đã tách bảng `NhanVien` và `Admin`:
- **Bảng Admin**: Chứa tài khoản quản trị viên
- **Bảng NhanVien**: Chỉ chứa tài khoản nhân viên (có thêm cột `is_first_login`)

Tất cả API đã được cập nhật để kiểm tra cả 2 bảng khi đăng nhập.

## Dữ Liệu Mẫu

File `database.sql` đã bao gồm dữ liệu mẫu cho tất cả các bảng để bạn có thể test ngay. Tuy nhiên, bạn cần:
1. Tạo password hash thực sự cho các tài khoản (sử dụng `create_password_hash.php`)
2. Cập nhật password hash vào database

## Troubleshooting

### Không đăng nhập được
- Kiểm tra password hash đã được cập nhật chưa (sử dụng `create_password_hash.php`)
- Kiểm tra `is_approved = 1` trong database cho nhân viên
- Kiểm tra PHP session có hoạt động không
- Kiểm tra email và password có đúng không

### Không thấy menu "Giá Sạc" hoặc "Duyệt Nhân Viên"
- Kiểm tra user có phải admin không (bảng `Admin` hoặc `role = 'admin'` trong `NhanVien`)
- Kiểm tra `is_approved = 1`
- Refresh trang sau khi đăng nhập

### API trả về lỗi 401 hoặc 403
- Kiểm tra đã đăng nhập chưa
- Kiểm tra session còn hiệu lực không
- Kiểm tra quyền truy cập (admin/staff)
- Kiểm tra `is_approved = 1` cho staff

### Staff không thấy dữ liệu
- Kiểm tra `MaTram` đã được gán cho nhân viên chưa
- Kiểm tra dữ liệu có `MaTram` tương ứng không
- Đối với khách hàng/phương tiện: Kiểm tra đã chạy migration `database_migration_station_filter.sql` chưa

### Nhân viên không thể đổi mật khẩu
- Kiểm tra `is_first_login = 1` trong database
- Kiểm tra file `change_password.php` có tồn tại không
- Kiểm tra API `auth.php` có trả về `is_first_login` không

### Apache và MySQL không khởi động được
- Kiểm tra port 80 (Apache) và 3306 (MySQL) có bị chiếm không
- Kiểm tra XAMPP Control Panel có quyền administrator không
- Xem log lỗi trong XAMPP

## License

Dự án mã nguồn mở, tự do sử dụng và chỉnh sửa.
