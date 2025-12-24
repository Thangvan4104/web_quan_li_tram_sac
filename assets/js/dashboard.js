/**
 * File: assets/js/dashboard.js
 * Mô tả: Module JavaScript quản lý trang Dashboard
 * Chức năng: 
 *   - Load và hiển thị thống kê tổng quan từ tất cả các bảng
 *   - Hiển thị hoạt động gần đây
 * Tác giả: Hệ thống quản lý trạm sạc
 */

// ============================================
// HÀM LOAD DASHBOARD
// ============================================

/**
 * Hàm: loadDashboard()
 * Mô tả: Load và hiển thị dữ liệu thống kê đầy đủ trên dashboard
 * @return {Promise<void>} Promise không trả về giá trị
 * Chức năng:
 *   1. Gọi API để lấy dữ liệu từ tất cả các nguồn (9 bảng)
 *   2. Tính toán các số liệu thống kê chi tiết
 *   3. Cập nhật tất cả các card thống kê lên giao diện
 *   4. Hiển thị hoạt động gần đây với thông tin đầy đủ
 */
async function loadDashboard() {
    // Hiển thị loading indicator trong khi đang tải dữ liệu
    showLoading();
    
    try {
        // Kiểm tra xem user có phải admin không
        // Nếu là staff, các API sẽ tự động lọc theo trạm của nhân viên
        const isAdminUser = typeof isAdmin === 'function' ? isAdmin() : false;
        const userMaTram = window.currentUser?.MaTram || null;
        
        // Sử dụng Promise.all để gọi nhiều API cùng lúc (song song)
        // Mục đích: Tăng tốc độ load dữ liệu thay vì gọi tuần tự
        // Promise.all: Chờ tất cả các promise hoàn thành
        // Lấy dữ liệu từ tất cả 9 bảng trong database
        // Lưu ý: Nếu là staff, các API sẽ tự động lọc theo trạm của nhân viên
        const [trams, cots, khs, phuongtiens, phiens, hoadons, thanhtoans, nhanviens, baotris] = await Promise.all([
            // Gọi API lấy danh sách trạm sạc
            // apiFetch(): Helper function từ core.js, tự động thêm credentials: 'include'
            // .then(r => r.json()): Chuyển đổi response sang JSON
            apiFetch(`${API_BASE}/tramsac.php`).then(r => r.json()),
            
            // Gọi API lấy danh sách cột sạc
            apiFetch(`${API_BASE}/cotsac.php`).then(r => r.json()),
            
            // Gọi API lấy danh sách khách hàng
            apiFetch(`${API_BASE}/khachhang.php`).then(r => r.json()),
            
            // Gọi API lấy danh sách phương tiện
            apiFetch(`${API_BASE}/phuongtien.php`).then(r => r.json()),
            
            // Gọi API lấy danh sách phiên sạc
            apiFetch(`${API_BASE}/phiensac.php`).then(r => r.json()),
            
            // Gọi API lấy danh sách hóa đơn
            apiFetch(`${API_BASE}/hoadon.php`).then(r => r.json()),
            
            // Gọi API lấy danh sách thanh toán
            apiFetch(`${API_BASE}/thanhtoan.php`).then(r => r.json()),
            
            // Gọi API lấy danh sách nhân viên
            apiFetch(`${API_BASE}/nhanvien.php`).then(r => r.json()),
            
            // Gọi API lấy danh sách bảo trì
            apiFetch(`${API_BASE}/baotri.php`).then(r => r.json())
        ]);
        
        // ============================================
        // CẬP NHẬT CÁC SỐ LIỆU THỐNG KÊ CƠ BẢN
        // ============================================
        
        // Hàm helper để cập nhật số liệu an toàn
        // Kiểm tra phần tử có tồn tại trước khi cập nhật để tránh lỗi
        const updateStat = (id, value) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
            }
        };
        
        // Cập nhật số liệu tổng số trạm sạc (chỉ cho admin)
        // Nếu là staff, hiển thị tên trạm thay vì số lượng
        if (isAdminUser) {
            // Admin: Hiển thị tổng số trạm
            updateStat('total-trams', Array.isArray(trams) ? trams.length : 0);
        } else {
            // Staff: Hiển thị tên trạm
            const tramNameElement = document.getElementById('tram-name');
            if (tramNameElement && Array.isArray(trams) && trams.length > 0) {
                // Lấy tên trạm đầu tiên (staff chỉ thấy 1 trạm)
                const tramName = trams[0].TenTram || trams[0].MaTram || 'Chưa phân trạm';
                tramNameElement.textContent = tramName;
            } else if (tramNameElement) {
                tramNameElement.textContent = 'Chưa phân trạm';
            }
        }
        
        // Cập nhật số liệu tổng số cột sạc
        updateStat('total-cots', Array.isArray(cots) ? cots.length : 0);
        
        // Cập nhật số liệu tổng số khách hàng
        updateStat('total-kh', Array.isArray(khs) ? khs.length : 0);
        
        // Cập nhật số liệu tổng số phương tiện
        updateStat('total-phuongtien', Array.isArray(phuongtiens) ? phuongtiens.length : 0);
        
        // Cập nhật số liệu tổng số hóa đơn
        updateStat('total-hoadon', Array.isArray(hoadons) ? hoadons.length : 0);
        
        // Cập nhật số liệu tổng số nhân viên
        updateStat('total-nhanvien', Array.isArray(nhanviens) ? nhanviens.length : 0);
        
        // ============================================
        // TÍNH TOÁN CÁC SỐ LIỆU THỐNG KÊ CHI TIẾT
        // ============================================
        
        // Đảm bảo các biến là mảng trước khi xử lý
        // Array.isArray(): Kiểm tra xem có phải mảng không
        // || []: Nếu không phải mảng thì dùng mảng rỗng
        const safeCots = Array.isArray(cots) ? cots : [];
        const safePhiens = Array.isArray(phiens) ? phiens : [];
        const safeHoadons = Array.isArray(hoadons) ? hoadons : [];
        const safeBaotris = Array.isArray(baotris) ? baotris : [];
        
        // Tính số cột sạc đang sử dụng (trạng thái "Đang sạc")
        // filter(): Lọc các phần tử thỏa mãn điều kiện
        // c.TinhTrang === 'Đang sạc': Kiểm tra trạng thái cột sạc
        const cotsDangSac = safeCots.filter(c => c && c.TinhTrang === 'Đang sạc').length || 0;
        updateStat('cots-dang-sac', cotsDangSac);
        
        // Tính số phiên sạc đang diễn ra (chưa kết thúc)
        // ThoiGianKetThuc === null hoặc rỗng: Phiên sạc chưa kết thúc
        const phienDangDienRa = safePhiens.filter(p => p && (!p.ThoiGianKetThuc || p.ThoiGianKetThuc === null)).length || 0;
        updateStat('phien-dang-dien-ra', phienDangDienRa);
        
        // Tính số phiên sạc hôm nay
        // new Date(): Tạo đối tượng Date với thời gian hiện tại
        // .toISOString(): Chuyển sang chuỗi ISO format (YYYY-MM-DDTHH:mm:ss.sssZ)
        // .split('T')[0]: Tách chuỗi tại 'T' và lấy phần đầu (YYYY-MM-DD)
        const today = new Date().toISOString().split('T')[0];
        
        // Lọc các phiên sạc có ThoiGianBatDau bắt đầu bằng ngày hôm nay
        // p.ThoiGianBatDau.startsWith(today): Kiểm tra xem thời gian bắt đầu có phải hôm nay không
        const phienToday = safePhiens.filter(p => p && p.ThoiGianBatDau && p.ThoiGianBatDau.startsWith(today)).length || 0;
        updateStat('total-phien', phienToday);
        
        // Tính doanh thu hôm nay
        // Lọc các hóa đơn được tạo hôm nay
        // NgayLap: Ngày lập hóa đơn (format YYYY-MM-DD)
        const hoadonToday = safeHoadons.filter(hd => hd && hd.NgayLap && hd.NgayLap === today);
        
        // Tính tổng tiền từ các hóa đơn hôm nay
        // reduce(): Duyệt qua mảng và tính tổng
        // parseFloat(): Chuyển đổi chuỗi sang số thực
        // || 0: Nếu SoTien là null/undefined thì dùng 0
        const doanhThuHomNay = hoadonToday.reduce((sum, hd) => sum + (parseFloat(hd.SoTien) || 0), 0);
        
        // Format số tiền với dấu phẩy ngăn cách hàng nghìn
        // toLocaleString('vi-VN'): Format theo định dạng Việt Nam
        updateStat('doanh-thu-hom-nay', doanhThuHomNay.toLocaleString('vi-VN'));
        
        // Tính tổng doanh thu (tất cả hóa đơn)
        const tongDoanhThu = safeHoadons.reduce((sum, hd) => sum + (parseFloat(hd && hd.SoTien) || 0), 0);
        updateStat('tong-doanh-thu', tongDoanhThu.toLocaleString('vi-VN'));
        
        // Tính số bảo trì đang thực hiện
        // TrangThai === 'Đang thực hiện': Kiểm tra trạng thái bảo trì
        const baotriDangThucHien = safeBaotris.filter(bt => bt && bt.TrangThai === 'Đang thực hiện').length || 0;
        updateStat('baotri-dang-thuc-hien', baotriDangThucHien);
        
        // ============================================
        // LOAD VÀ HIỂN THỊ HOẠT ĐỘNG GẦN ĐÂY
        // ============================================
        
        // Sắp xếp phiên sạc theo thời gian bắt đầu (mới nhất trước)
        // [...safePhiens]: Tạo bản sao mảng để không ảnh hưởng mảng gốc
        // sort(): Sắp xếp mảng tại chỗ (mutate mảng)
        const phiensSorted = [...safePhiens].sort((a, b) => {
            // Kiểm tra và lấy thời gian bắt đầu, nếu không có thì dùng 0
            const timeA = (a && a.ThoiGianBatDau) ? new Date(a.ThoiGianBatDau).getTime() : 0;
            const timeB = (b && b.ThoiGianBatDau) ? new Date(b.ThoiGianBatDau).getTime() : 0;
            // Trả về số âm nếu a < b, dương nếu a > b, 0 nếu bằng nhau
            // Dấu trừ để sắp xếp giảm dần (mới nhất trước)
            return timeB - timeA;
        });
        
        // Load và hiển thị 5 hoạt động gần đây nhất
        // slice(0, 5): Lấy 5 phiên sạc đầu tiên (mới nhất)
        loadRecentActivities(phiensSorted.slice(0, 5));
        
    } catch (error) {
        // Xử lý lỗi nếu có
        // console.error(): In lỗi ra console để debug
        console.error('Error loading dashboard:', error);
        
        // Hiển thị thông báo lỗi cho người dùng
        // Có thể thêm thông báo lỗi lên giao diện nếu cần
        alert('Có lỗi xảy ra khi tải dữ liệu dashboard. Vui lòng thử lại sau.');
    } finally {
        // Ẩn loading indicator dù thành công hay thất bại
        // finally: Luôn chạy sau khi try/catch hoàn thành
        hideLoading();
    }
}

/**
 * Hàm: loadRecentActivities(activities)
 * Mô tả: Hiển thị danh sách hoạt động gần đây lên giao diện với thông tin đầy đủ
 * @param {Array} activities - Mảng chứa các phiên sạc gần đây (đã có thông tin JOIN từ API)
 * @return {void} Không trả về giá trị
 * Chức năng: 
 *   1. Tạo HTML cho từng hoạt động với thông tin chi tiết
 *   2. Hiển thị trạng thái phiên sạc (đang diễn ra, đã hoàn thành)
 *   3. Hiển thị thông tin khách hàng, phương tiện, cột sạc
 */
function loadRecentActivities(activities) {
    // Lấy container để hiển thị danh sách hoạt động
    // getElementById: Tìm phần tử HTML theo ID
    const container = document.getElementById('recentActivities');
    
    // Nếu không tìm thấy container thì dừng lại
    // Early return: Tránh xử lý không cần thiết
    if (!container) return;
    
    // Kiểm tra xem có hoạt động nào không
    // !activities: Kiểm tra null/undefined
    // activities.length === 0: Kiểm tra mảng rỗng
    if (!activities || activities.length === 0) {
        // Hiển thị thông báo trống nếu không có dữ liệu
        // innerHTML: Gán nội dung HTML vào phần tử
        container.innerHTML = '<p class="empty-state">Chưa có hoạt động nào</p>';
        return;
    }
    
    // Tạo HTML cho từng hoạt động
    // map(): Duyệt qua mảng và tạo HTML cho mỗi phần tử, trả về mảng mới
    // join(''): Nối tất cả các chuỗi HTML lại với nhau thành một chuỗi duy nhất
    container.innerHTML = activities.map(activity => {
        // ============================================
        // XỬ LÝ VÀ FORMAT DỮ LIỆU
        // ============================================
        
        // Chuyển đổi thời gian bắt đầu sang định dạng Việt Nam
        // new Date(activity.ThoiGianBatDau): Tạo đối tượng Date từ chuỗi thời gian
        // .toLocaleString('vi-VN'): Chuyển sang định dạng ngày giờ Việt Nam
        // Format: "dd/mm/yyyy, hh:mm:ss"
        const startTime = activity.ThoiGianBatDau 
            ? new Date(activity.ThoiGianBatDau).toLocaleString('vi-VN', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            })
            : 'Chưa có';
        
        // Kiểm tra trạng thái phiên sạc
        // ThoiGianKetThuc === null hoặc rỗng: Phiên sạc đang diễn ra
        const isActive = !activity.ThoiGianKetThuc || activity.ThoiGianKetThuc === null;
        
        // Xác định class CSS và text cho trạng thái
        // isActive ? 'active' : 'completed': Toán tử ternary (if-else ngắn gọn)
        const statusClass = isActive ? 'active' : 'completed';
        const statusText = isActive ? 'Đang sạc' : 'Hoàn thành';
        
        // Lấy tên khách hàng (có thể từ JOIN hoặc null)
        // || 'Khách vãng lai': Nếu không có tên thì dùng giá trị mặc định
        const tenKhachHang = activity.TenKhachHang || 'Khách vãng lai';
        
        // Lấy thông tin phương tiện
        // activity.DongXe: Dòng xe (ví dụ: VinFast VF e34)
        // activity.HangXe: Hãng xe (ví dụ: VinFast)
        // activity.BienSo: Biển số xe
        const dongXe = activity.DongXe || 'Chưa xác định';
        const bienSo = activity.BienSo || activity.BienSoPT || '';
        
        // Lấy thông tin cột sạc
        // activity.MaCot: Mã cột sạc
        // activity.LoaiCongSac: Loại cổng sạc (Type 2 AC, CCS2 DC, v.v.)
        // activity.CongSuat: Công suất cột sạc (kW)
        const maCot = activity.MaCot || '';
        const loaiCongSac = activity.LoaiCongSac || '';
        const congSuat = activity.CongSuat ? `${activity.CongSuat} kW` : '';
        
        // Lấy thông tin điện tiêu thụ
        // activity.DienTieuThu: Số kWh đã sạc
        const dienTieuThu = activity.DienTieuThu 
            ? `${parseFloat(activity.DienTieuThu).toFixed(1)} kWh` 
            : isActive ? 'Đang sạc...' : 'Chưa có';
        
        // Lấy thông tin hóa đơn nếu có
        // activity.MaHD: Mã hóa đơn
        // activity.SoTien: Số tiền hóa đơn
        const maHD = activity.MaHD || '';
        const soTien = activity.SoTien 
            ? `${parseFloat(activity.SoTien).toLocaleString('vi-VN')} VNĐ` 
            : '';
        
        // ============================================
        // TẠO HTML TEMPLATE
        // ============================================
        
        // Trả về HTML template cho mỗi hoạt động
        // Template string (backtick): Cho phép nhúng biến và xuống dòng
        // escapeHtml(): Hàm escape để tránh XSS attack
        return `
            <div class="activity-item ${statusClass}">
                <!-- Phần thông tin chính của hoạt động -->
                <div class="activity-info">
                    <!-- Tiêu đề: Mã phiên sạc và trạng thái -->
                    <div class="activity-header">
                        <strong>Phiên sạc ${escapeHtml(activity.MaPhien)}</strong>
                        <span class="activity-status ${statusClass}">${statusText}</span>
                    </div>
                    
                    <!-- Thông tin khách hàng và phương tiện -->
                    <div class="activity-detail">
                        <i class="fas fa-user"></i>
                        <span>${escapeHtml(tenKhachHang)}</span>
                    </div>
                    
                    <!-- Thông tin phương tiện -->
                    <div class="activity-detail">
                        <i class="fas fa-car"></i>
                        <span>${escapeHtml(dongXe)} ${bienSo ? `(${escapeHtml(bienSo)})` : ''}</span>
                    </div>
                    
                    <!-- Thông tin cột sạc -->
                    <div class="activity-detail">
                        <i class="fas fa-plug"></i>
                        <span>Cột ${escapeHtml(maCot)} - ${escapeHtml(loaiCongSac)} ${congSuat ? `(${congSuat})` : ''}</span>
                    </div>
                    
                    <!-- Thông tin điện tiêu thụ -->
                    ${dienTieuThu ? `
                    <div class="activity-detail">
                        <i class="fas fa-bolt"></i>
                        <span>${dienTieuThu}</span>
                    </div>
                    ` : ''}
                    
                    <!-- Thông tin hóa đơn nếu có -->
                    ${maHD ? `
                    <div class="activity-detail">
                        <i class="fas fa-file-invoice"></i>
                        <span>Hóa đơn ${escapeHtml(maHD)} ${soTien ? `- ${soTien}` : ''}</span>
                    </div>
                    ` : ''}
                </div>
                
                <!-- Phần thời gian bên phải -->
                <div class="activity-time">
                    <div class="time-label">Bắt đầu</div>
                    <div class="time-value">${startTime}</div>
                    ${!isActive && activity.ThoiGianKetThuc ? `
                        <div class="time-label" style="margin-top: 8px;">Kết thúc</div>
                        <div class="time-value">${new Date(activity.ThoiGianKetThuc).toLocaleString('vi-VN', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                        })}</div>
                    ` : ''}
                </div>
            </div>
        `;
    }).join(''); // Nối tất cả các chuỗi HTML lại với nhau
}

