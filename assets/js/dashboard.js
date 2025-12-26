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
        // Đợi một chút để đảm bảo window.currentUser đã được set
        // Nếu chưa có, thử lấy từ API
        let currentUser = window.currentUser;
        if (!currentUser) {
            try {
                const userResponse = await apiFetch(`${API_BASE}/auth.php`);
                const userData = await userResponse.json();
                if (userData && userData.user) {
                    currentUser = userData.user;
                    window.currentUser = currentUser;
                }
            } catch (e) {
                console.warn('Không thể lấy thông tin user từ API:', e);
            }
        }
        
        currentUser = currentUser || {};
        const isAdminUser = currentUser.role === 'admin';
        const userMaTram = currentUser.MaTram || null;
        
        // Debug log
        console.log('Dashboard - Current User:', currentUser);
        console.log('Dashboard - Is Admin:', isAdminUser);
        console.log('Dashboard - User MaTram:', userMaTram);
        
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
            
            // Gọi API lấy danh sách hóa đơn (tất cả, không chỉ chưa thanh toán)
            apiFetch(`${API_BASE}/hoadon.php?all=true`).then(r => r.json()),
            
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
        // Tách riêng: Trạm đang bảo trì và Cột sạc đang bảo trì
        // safeCots đã được khai báo ở trên (dòng 142), không cần khai báo lại
        const safeTrams = Array.isArray(trams) ? trams : [];
        
        // Lọc bảo trì từ bảng BaoTri có trạng thái khác "Hoàn tất"
        const baotriFromTable = safeBaotris.filter(bt => {
            if (!bt || !bt.TrangThai) return false;
            const trangThai = bt.TrangThai.trim();
            return trangThai !== 'Hoàn tất' && trangThai !== '';
        });
        
        // Lọc trạm sạc đang bảo trì (TrangThai = 'Bảo trì')
        // Lưu ý: Có thể có khoảng trắng hoặc case khác nhau
        const tramsDangBaoTri = safeTrams.filter(tram => {
            if (!tram || !tram.TrangThai) return false;
            const trangThai = String(tram.TrangThai).trim();
            // So sánh chính xác và không phân biệt hoa thường
            const normalized = trangThai.toLowerCase().replace(/\s+/g, ' ').trim();
            const isBaoTri = normalized === 'bảo trì' || normalized.includes('bảo trì');
            if (isBaoTri) {
                console.log('Tìm thấy trạm đang bảo trì:', tram.MaTram, tram.TenTram, 'TrangThai:', tram.TrangThai);
            }
            return isBaoTri;
        });
        
        // Lọc cột sạc đang bảo trì (TinhTrang = 'Bảo trì')
        // Lưu ý: Có thể có khoảng trắng hoặc case khác nhau
        const cotsDangBaoTri = safeCots.filter(cot => {
            if (!cot || !cot.TinhTrang) return false;
            const tinhTrang = String(cot.TinhTrang).trim();
            // So sánh chính xác và không phân biệt hoa thường
            const normalized = tinhTrang.toLowerCase().replace(/\s+/g, ' ').trim();
            const isBaoTri = normalized === 'bảo trì' || normalized.includes('bảo trì');
            if (isBaoTri) {
                console.log('Tìm thấy cột sạc đang bảo trì:', cot.MaCot, 'TinhTrang:', cot.TinhTrang);
            }
            return isBaoTri;
        });
        
        // Debug log
        console.log('Dashboard - Tổng số trạm:', safeTrams.length);
        console.log('Dashboard - Trạm đang bảo trì:', tramsDangBaoTri.length, tramsDangBaoTri);
        console.log('Dashboard - Tổng số cột sạc:', safeCots.length);
        console.log('Dashboard - Cột sạc đang bảo trì:', cotsDangBaoTri.length, cotsDangBaoTri);
        
        // Tạo danh sách bảo trì đầy đủ: từ bảng BaoTri + từ trạm sạc đang bảo trì
        const allBaotriList = [...baotriFromTable];
        
        // Thêm các trạm sạc đang bảo trì vào danh sách (nếu chưa có trong bảng BaoTri)
        tramsDangBaoTri.forEach(tram => {
            // Kiểm tra xem trạm này đã có trong danh sách bảo trì chưa
            const existsInBaotri = baotriFromTable.some(bt => {
                // Kiểm tra qua MaTram từ bảo trì
                const btMaTram = bt.MaTram || (bt.CotMaTram) || (bt.NVMaTram);
                return btMaTram === tram.MaTram;
            });
            
            // Nếu chưa có, thêm vào danh sách như một bảo trì toàn trạm
            if (!existsInBaotri) {
                allBaotriList.push({
                    MaBT: null, // Không có mã bảo trì vì không có trong bảng BaoTri
                    NgayBaoTri: null,
                    NoiDung: 'Bảo trì toàn trạm',
                    TrangThai: 'Đang thực hiện',
                    MaCot: null,
                    MaTram: tram.MaTram,
                    TenTram: tram.TenTram,
                    TenNhanVien: null,
                    ChucVu: null,
                    LoaiCongSac: null,
                    isTramMaintenance: true // Flag để đánh dấu đây là bảo trì trạm
                });
            }
        });
        
        // Lưu danh sách bảo trì đang thực hiện để hiển thị khi click
        window.baotriDangThucHienList = allBaotriList;
        
        // Kiểm tra xem user có phải admin không
        if (isAdminUser) {
            // Admin: Hiển thị tổng số trạm đang bảo trì và tổng số cột sạc đang bảo trì
            const soTramDangBaoTri = tramsDangBaoTri.length || 0;
            const soCotDangBaoTri = cotsDangBaoTri.length || 0;
            
            console.log('Dashboard Admin - Số trạm đang bảo trì:', soTramDangBaoTri);
            console.log('Dashboard Admin - Số cột sạc đang bảo trì:', soCotDangBaoTri);
            
            // Cập nhật số trạm đang bảo trì
            const tramBaoTriElement = document.getElementById('tram-dang-bao-tri');
            if (tramBaoTriElement) {
                tramBaoTriElement.textContent = soTramDangBaoTri;
                console.log('Dashboard Admin - Đã cập nhật tram-dang-bao-tri:', soTramDangBaoTri);
            } else {
                console.warn('Dashboard Admin - Không tìm thấy element tram-dang-bao-tri');
            }
            
            // Cập nhật số cột sạc đang bảo trì
            const cotBaoTriElement = document.getElementById('cot-dang-bao-tri');
            if (cotBaoTriElement) {
                cotBaoTriElement.textContent = soCotDangBaoTri;
                console.log('Dashboard Admin - Đã cập nhật cot-dang-bao-tri:', soCotDangBaoTri);
            } else {
                console.warn('Dashboard Admin - Không tìm thấy element cot-dang-bao-tri');
            }
            
            // Cập nhật tổng số bảo trì (trạm + cột) cho card click
            const tongBaoTri = soTramDangBaoTri + soCotDangBaoTri;
            updateStat('baotri-dang-thuc-hien', tongBaoTri);
            console.log('Dashboard Admin - Tổng bảo trì:', tongBaoTri);
        } else {
            // Nhân viên: Chỉ hiển thị số cột sạc đang bảo trì của trạm mình
            const soCotDangBaoTri = cotsDangBaoTri.length || 0;
            console.log('Dashboard Staff - Số cột sạc đang bảo trì:', soCotDangBaoTri);
            updateStat('baotri-dang-thuc-hien', soCotDangBaoTri);
        }
        
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
        
        // Khởi tạo event handlers cho các card thống kê có thể click
        initRevenueChartClickHandlers();
        
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

// ============================================
// BIỂU ĐỒ THỐNG KÊ DOANH THU
// ============================================

// Biến lưu trữ instance của biểu đồ
let revenueChartInstance = null;
let currentChartType = 'daily';

/**
 * Hàm: initRevenueChartClickHandlers()
 * Mô tả: Khởi tạo event handlers cho các card thống kê doanh thu
 */
function initRevenueChartClickHandlers() {
    // Lấy tất cả các card có class clickable-stat
    const clickableStats = document.querySelectorAll('.clickable-stat');
    
    clickableStats.forEach(card => {
        card.addEventListener('click', function() {
            const statType = this.getAttribute('data-stat-type');
            if (statType === 'daily-revenue' || statType === 'total-revenue') {
                openRevenueChartModal(statType);
            } else if (statType === 'maintenance') {
                openMaintenanceModal();
            }
        });
        
        // Thêm style cursor pointer
        card.style.cursor = 'pointer';
    });
}

/**
 * Hàm: openRevenueChartModal(statType)
 * Mô tả: Mở modal hiển thị biểu đồ thống kê doanh thu
 * @param {string} statType - Loại thống kê: 'daily-revenue' hoặc 'total-revenue'
 */
function openRevenueChartModal(statType) {
    const modal = document.getElementById('revenueChartModal');
    const title = document.getElementById('chartModalTitle');
    
    if (!modal) return;
    
    // Đặt tiêu đề modal
    if (statType === 'daily-revenue') {
        title.textContent = 'Biểu Đồ Doanh Thu Theo Ngày';
    } else {
        title.textContent = 'Biểu Đồ Tổng Doanh Thu';
    }
    
    // Reset chart type về daily
    currentChartType = 'daily';
    updateChartTypeButtons();
    
    // Hiển thị modal
    modal.style.display = 'block';
    
    // Load và vẽ biểu đồ
    loadRevenueChart('daily');
}

/**
 * Hàm: closeRevenueChartModal()
 * Mô tả: Đóng modal biểu đồ
 */
function closeRevenueChartModal() {
    const modal = document.getElementById('revenueChartModal');
    if (modal) {
        modal.style.display = 'none';
    }
    
    // Hủy biểu đồ nếu có
    if (revenueChartInstance) {
        revenueChartInstance.destroy();
        revenueChartInstance = null;
    }
}

/**
 * Hàm: switchChartType(type)
 * Mô tả: Chuyển đổi loại biểu đồ (ngày/tháng/năm)
 * @param {string} type - Loại biểu đồ: 'daily', 'monthly', 'yearly'
 */
function switchChartType(type) {
    currentChartType = type;
    updateChartTypeButtons();
    // Thêm hiệu ứng fade khi chuyển đổi
    const chartContainer = document.querySelector('.chart-container');
    if (chartContainer) {
        chartContainer.style.opacity = '0.5';
        chartContainer.style.transition = 'opacity 0.3s ease';
    }
    loadRevenueChart(type).then(() => {
        if (chartContainer) {
            setTimeout(() => {
                chartContainer.style.opacity = '1';
            }, 100);
        }
    });
}

/**
 * Hàm: updateChartTypeButtons()
 * Mô tả: Cập nhật trạng thái các nút chuyển đổi loại biểu đồ
 */
function updateChartTypeButtons() {
    const buttons = document.querySelectorAll('.chart-controls button[data-chart-type]');
    buttons.forEach(btn => {
        const btnType = btn.getAttribute('data-chart-type');
        if (btnType === currentChartType) {
            btn.classList.remove('btn-secondary');
            btn.classList.add('btn-primary');
        } else {
            btn.classList.remove('btn-primary');
            btn.classList.add('btn-secondary');
        }
    });
}

/**
 * Hàm: loadRevenueChart(type)
 * Mô tả: Load dữ liệu và vẽ biểu đồ doanh thu
 * @param {string} type - Loại biểu đồ: 'daily', 'monthly', 'yearly'
 */
async function loadRevenueChart(type) {
    try {
        // Hiển thị loading
        const canvas = document.getElementById('revenueChart');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        
        // Gọi API để lấy dữ liệu thống kê
        const response = await apiFetch(`${API_BASE}/thongke.php?type=${type}`);
        const data = await response.json();
        
        if (!Array.isArray(data)) {
            console.error('Dữ liệu thống kê không hợp lệ:', data);
            return;
        }
        
        // Chuẩn bị dữ liệu cho biểu đồ
        let labels = [];
        let revenueData = [];
        let invoiceCountData = [];
        let datasets = []; // Khai báo ở scope cao hơn
        
        if (type === 'daily') {
            labels = data.map(item => {
                const date = new Date(item.ngay);
                return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
            });
            revenueData = data.map(item => item.tongTien);
            invoiceCountData = data.map(item => item.soHoaDon);
        } else if (type === 'monthly') {
            // Xử lý dữ liệu monthly với chi tiết theo loại cột sạc
            labels = data.map(item => {
                // Format: T1, T2, T3, ... T12
                const month = item.thang.split('-')[1];
                return 'T' + parseInt(month);
            });
            
            // Lấy danh sách các loại cột sạc duy nhất
            const loaiCongSacSet = new Set();
            data.forEach(item => {
                if (item.chiTiet) {
                    Object.keys(item.chiTiet).forEach(loai => loaiCongSacSet.add(loai));
                }
            });
            const loaiCongSacList = Array.from(loaiCongSacSet);
            
            // Tạo datasets cho từng loại cột sạc (stacked bar chart)
            const colors = [
                { border: '#f59e0b', fill: 'rgba(245, 158, 11, 0.8)' }, // Vàng cam
                { border: '#ef4444', fill: 'rgba(239, 68, 68, 0.8)' }, // Cam đỏ
                { border: '#14b8a6', fill: 'rgba(20, 184, 166, 0.8)' }  // Teal
            ];
            
            loaiCongSacList.forEach((loai, index) => {
                const color = colors[index % colors.length];
                const loaiData = data.map(item => {
                    if (item.chiTiet && item.chiTiet[loai]) {
                        return item.chiTiet[loai].tongTien;
                    }
                    return 0;
                });
                
                datasets.push({
                    label: loai,
                    data: loaiData,
                    borderColor: color.border,
                    backgroundColor: color.fill,
                    borderWidth: 2,
                    borderRadius: 6,
                    borderSkipped: false,
                    stack: 'revenue'
                });
            });
            
            // Nếu không có dữ liệu chi tiết, dùng dữ liệu tổng
            if (datasets.length === 0) {
                revenueData = data.map(item => item.tongTien);
                invoiceCountData = data.map(item => item.soHoaDon);
            } else {
                revenueData = null; // Sẽ dùng datasets
                invoiceCountData = data.map(item => item.soHoaDon);
            }
        } else if (type === 'yearly') {
            labels = data.map(item => item.nam.toString());
            revenueData = data.map(item => item.tongTien);
            invoiceCountData = data.map(item => item.soHoaDon);
        }
        
        // Hủy biểu đồ cũ nếu có
        if (revenueChartInstance) {
            revenueChartInstance.destroy();
        }
        
        // Tạo gradient đẹp hơn cho background
        const gradientRevenue = ctx.createLinearGradient(0, 0, 0, 500);
        gradientRevenue.addColorStop(0, 'rgba(59, 130, 246, 0.4)');
        gradientRevenue.addColorStop(0.5, 'rgba(59, 130, 246, 0.15)');
        gradientRevenue.addColorStop(1, 'rgba(59, 130, 246, 0.02)');
        
        const gradientInvoice = ctx.createLinearGradient(0, 0, 0, 500);
        gradientInvoice.addColorStop(0, 'rgba(16, 185, 129, 0.4)');
        gradientInvoice.addColorStop(0.5, 'rgba(16, 185, 129, 0.15)');
        gradientInvoice.addColorStop(1, 'rgba(16, 185, 129, 0.02)');
        
        // Xác định datasets dựa trên type
        let chartDatasets = [];
        const isMonthlyStacked = (type === 'monthly' && revenueData === null && datasets && datasets.length > 0);
        
        if (isMonthlyStacked) {
            // Sử dụng stacked bar chart cho monthly
            chartDatasets = datasets;
        } else {
            // Line chart cho daily và yearly
            chartDatasets = [
                {
                    label: '💰 Doanh Thu (VNĐ)',
                    data: revenueData,
                    borderColor: '#3b82f6',
                    backgroundColor: gradientRevenue,
                    borderWidth: 3.5,
                    tension: 0.5,
                    yAxisID: 'y',
                    fill: true,
                    pointRadius: 6,
                    pointHoverRadius: 10,
                    pointBackgroundColor: '#ffffff',
                    pointBorderColor: '#3b82f6',
                    pointBorderWidth: 3,
                    pointHoverBackgroundColor: '#3b82f6',
                    pointHoverBorderColor: '#ffffff',
                    pointHoverBorderWidth: 4,
                    cubicInterpolationMode: 'monotone'
                },
                {
                    label: '📄 Số Hóa Đơn',
                    data: invoiceCountData,
                    borderColor: '#10b981',
                    backgroundColor: gradientInvoice,
                    borderWidth: 3.5,
                    tension: 0.5,
                    yAxisID: 'y1',
                    fill: true,
                    pointRadius: 6,
                    pointHoverRadius: 10,
                    pointBackgroundColor: '#ffffff',
                    pointBorderColor: '#10b981',
                    pointBorderWidth: 3,
                    pointHoverBackgroundColor: '#10b981',
                    pointHoverBorderColor: '#ffffff',
                    pointHoverBorderWidth: 4,
                    cubicInterpolationMode: 'monotone'
                }
            ];
        }
        
        // Tạo biểu đồ mới với cấu hình đẹp hơn
        revenueChartInstance = new Chart(ctx, {
            type: isMonthlyStacked ? 'bar' : 'line',
            data: {
                labels: labels,
                datasets: chartDatasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                animation: {
                    duration: 1500,
                    easing: 'easeInOutQuart'
                },
                interaction: {
                    mode: isMonthlyStacked ? 'nearest' : 'index',
                    intersect: false,
                },
                plugins: {
                    title: {
                        display: true,
                        text: type === 'daily' ? '📈 Doanh Thu 30 Ngày Gần Nhất' : 
                              type === 'monthly' ? 'Biểu đồ Doanh thu' : 
                              '📈 Doanh Thu 5 Năm Gần Nhất',
                        font: {
                            size: 24,
                            weight: '700',
                            family: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
                        },
                        color: '#1e293b',
                        padding: {
                            top: 15,
                            bottom: 10
                        }
                    },
                    subtitle: type === 'monthly' ? {
                        display: true,
                        text: 'Tổng quan doanh thu theo tháng năm ' + new Date().getFullYear(),
                        font: {
                            size: 14,
                            weight: '400',
                            family: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
                        },
                        color: '#64748b',
                        padding: {
                            top: 0,
                            bottom: 25
                        }
                    } : undefined,
                    legend: {
                        display: true,
                        position: 'top',
                        align: 'center',
                        labels: {
                            usePointStyle: true,
                            pointStyle: 'circle',
                            padding: 15,
                            font: {
                                size: 14,
                                weight: '600',
                                family: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
                            },
                            color: '#374151'
                        }
                    },
                    tooltip: {
                        enabled: true,
                        backgroundColor: 'rgba(30, 41, 59, 0.95)',
                        titleColor: '#ffffff',
                        bodyColor: '#ffffff',
                        borderColor: 'rgba(59, 130, 246, 0.5)',
                        borderWidth: 2,
                        padding: 16,
                        cornerRadius: 12,
                        displayColors: true,
                        titleFont: {
                            size: 15,
                            weight: '700',
                            family: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
                        },
                        bodyFont: {
                            size: 14,
                            weight: '500',
                            family: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
                        },
                        titleSpacing: 8,
                        bodySpacing: 6,
                        boxPadding: 8,
                        usePointStyle: true,
                        callbacks: {
                            title: function(context) {
                                return '📅 ' + context[0].label;
                            },
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    // Loại bỏ emoji từ label để hiển thị đẹp hơn
                                    label = label.replace(/[💰📄]/g, '').trim();
                                    label += ': ';
                                }
                                
                                // Xử lý cho stacked area chart (monthly)
                                if (isMonthlyStacked) {
                                    const value = context.parsed.y;
                                    if (value >= 1000000) {
                                        label += (value / 1000000).toFixed(2) + 'M₫';
                                    } else if (value >= 1000) {
                                        label += (value / 1000).toFixed(0) + 'K₫';
                                    } else {
                                        label += new Intl.NumberFormat('vi-VN').format(value) + '₫';
                                    }
                                } else if (context.datasetIndex === 0) {
                                    // Doanh thu
                                    const value = context.parsed.y;
                                    if (value >= 1000000) {
                                        label += (value / 1000000).toFixed(2) + 'M VNĐ';
                                    } else if (value >= 1000) {
                                        label += (value / 1000).toFixed(0) + 'K VNĐ';
                                    } else {
                                        label += new Intl.NumberFormat('vi-VN').format(value) + ' VNĐ';
                                    }
                                } else {
                                    // Số hóa đơn
                                    label += context.parsed.y + ' hóa đơn';
                                }
                                return label;
                            },
                            labelColor: function(context) {
                                return {
                                    borderColor: context.dataset.borderColor,
                                    backgroundColor: context.dataset.borderColor,
                                    borderWidth: 3,
                                    borderRadius: 4
                                };
                            }
                        }
                    }
                },
                scales: isMonthlyStacked ? {
                    x: {
                        stacked: true,
                        grid: {
                            display: false,
                            drawBorder: false,
                            drawTicks: false
                        },
                        ticks: {
                            font: {
                                size: 13,
                                weight: '600',
                                family: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
                            },
                            color: '#475569',
                            padding: 12
                        },
                        title: {
                            display: true,
                            text: '📅 Tháng',
                            font: {
                                size: 15,
                                weight: '700',
                                family: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
                            },
                            color: '#1e293b',
                            padding: {
                                top: 15,
                                bottom: 10
                            }
                        }
                    },
                    y: {
                        stacked: true,
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(148, 163, 184, 0.15)',
                            lineWidth: 1.5,
                            drawBorder: false,
                            drawTicks: false
                        },
                        title: {
                            display: true,
                            text: 'Doanh Thu (VNĐ)',
                            font: {
                                size: 15,
                                weight: '700',
                                family: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
                            },
                            color: '#1e293b',
                            padding: {
                                top: 15,
                                bottom: 15
                            }
                        },
                        ticks: {
                            callback: function(value) {
                                if (value >= 1000000) {
                                    return (value / 1000000).toFixed(0) + 'M';
                                } else if (value >= 1000) {
                                    return (value / 1000).toFixed(0) + 'K';
                                }
                                return value.toString();
                            },
                            font: {
                                size: 13,
                                weight: '600',
                                family: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
                            },
                            color: '#475569',
                            padding: 10,
                            backdropColor: 'rgba(255, 255, 255, 0.8)'
                        }
                    }
                } : {
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(148, 163, 184, 0.15)',
                            lineWidth: 1.5,
                            drawBorder: false,
                            drawTicks: false
                        },
                        title: {
                            display: true,
                            text: '💰 Doanh Thu (VNĐ)',
                            font: {
                                size: 15,
                                weight: '700',
                                family: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
                            },
                            color: '#1e293b',
                            padding: {
                                top: 15,
                                bottom: 15
                            }
                        },
                        ticks: {
                            callback: function(value) {
                                if (value >= 1000000000) {
                                    return (value / 1000000000).toFixed(1) + 'B';
                                } else if (value >= 1000000) {
                                    return (value / 1000000).toFixed(1) + 'M';
                                } else if (value >= 1000) {
                                    return (value / 1000).toFixed(0) + 'K';
                                }
                                return value.toString();
                            },
                            font: {
                                size: 13,
                                weight: '600',
                                family: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
                            },
                            color: '#475569',
                            padding: 10,
                            backdropColor: 'rgba(255, 255, 255, 0.8)'
                        }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        beginAtZero: true,
                        grid: {
                            drawOnChartArea: false,
                            color: 'rgba(148, 163, 184, 0.1)',
                            drawTicks: false
                        },
                        title: {
                            display: true,
                            text: '📄 Số Hóa Đơn',
                            font: {
                                size: 15,
                                weight: '700',
                                family: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
                            },
                            color: '#1e293b',
                            padding: {
                                top: 15,
                                bottom: 15
                            }
                        },
                        ticks: {
                            font: {
                                size: 13,
                                weight: '600',
                                family: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
                            },
                            color: '#475569',
                            padding: 10,
                            stepSize: 1,
                            backdropColor: 'rgba(255, 255, 255, 0.8)'
                        }
                    },
                    x: {
                        grid: {
                            display: true,
                            color: 'rgba(148, 163, 184, 0.1)',
                            drawBorder: false,
                            drawTicks: false
                        },
                        ticks: {
                            maxRotation: type === 'daily' ? 45 : 0,
                            minRotation: type === 'daily' ? 45 : 0,
                            font: {
                                size: 13,
                                weight: '600',
                                family: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
                            },
                            color: '#475569',
                            padding: 12
                        },
                        title: {
                            display: true,
                            text: type === 'daily' ? '📅 Ngày' : type === 'monthly' ? '📅 Tháng' : '📅 Năm',
                            font: {
                                size: 15,
                                weight: '700',
                                family: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
                            },
                            color: '#1e293b',
                            padding: {
                                top: 15,
                                bottom: 10
                            }
                        }
                    }
                }
            }
        });
        
    } catch (error) {
        console.error('Lỗi khi load biểu đồ:', error);
        alert('Có lỗi xảy ra khi tải dữ liệu biểu đồ. Vui lòng thử lại sau.');
    }
}

// ============================================
// MODAL CHI TIẾT BẢO TRÌ
// ============================================

/**
 * Hàm: openMaintenanceModal()
 * Mô tả: Mở modal hiển thị chi tiết bảo trì đang thực hiện
 */
function openMaintenanceModal() {
    const modal = document.getElementById('maintenanceModal');
    if (!modal) return;
    
    // Hiển thị modal
    modal.style.display = 'block';
    
    // Load và hiển thị danh sách bảo trì
    loadMaintenanceList();
}

/**
 * Hàm: closeMaintenanceModal()
 * Mô tả: Đóng modal bảo trì
 */
function closeMaintenanceModal() {
    const modal = document.getElementById('maintenanceModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

/**
 * Hàm: loadMaintenanceList()
 * Mô tả: Load và hiển thị danh sách bảo trì đang thực hiện
 */
function loadMaintenanceList() {
    const container = document.getElementById('maintenanceList');
    if (!container) return;
    
    // Lấy danh sách bảo trì đang thực hiện đã được lưu
    const baotriList = window.baotriDangThucHienList || [];
    
    if (!baotriList || baotriList.length === 0) {
        container.innerHTML = '<p class="empty-state">Không có bảo trì nào đang thực hiện</p>';
        return;
    }
    
    // Tạo HTML cho danh sách bảo trì
    container.innerHTML = baotriList.map(bt => {
        // Format ngày bảo trì
        const ngayBaoTri = bt.NgayBaoTri 
            ? new Date(bt.NgayBaoTri).toLocaleDateString('vi-VN', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            })
            : (bt.isTramMaintenance ? 'Đang diễn ra' : 'Chưa có');
        
        // Xác định loại bảo trì
        const loaiBaoTri = bt.MaCot ? 'Bảo trì cột sạc' : 'Bảo trì toàn trạm';
        const tenCot = bt.MaCot ? `Cột ${escapeHtml(bt.MaCot)}` : '';
        const loaiCongSac = bt.LoaiCongSac ? `(${escapeHtml(bt.LoaiCongSac)})` : '';
        
        // Tên trạm
        const tenTram = bt.TenTram || bt.MaTram || 'Chưa xác định';
        
        // Trạng thái với màu sắc
        const trangThai = bt.TrangThai || (bt.isTramMaintenance ? 'Đang thực hiện' : 'Chưa xác định');
        const statusClass = trangThai === 'Hoàn tất' ? 'completed' : 'in-progress';
        
        // Mã bảo trì - nếu là bảo trì trạm không có trong bảng BaoTri
        const maBT = bt.MaBT || (bt.isTramMaintenance ? `Trạm ${escapeHtml(bt.MaTram)}` : 'N/A');
        
        return `
            <div class="maintenance-item ${statusClass}">
                <div class="maintenance-header">
                    <div class="maintenance-id">
                        <strong>${maBT}</strong>
                        <span class="maintenance-status ${statusClass}">${escapeHtml(trangThai)}</span>
                    </div>
                    <div class="maintenance-date">
                        <i class="fas fa-calendar"></i>
                        ${ngayBaoTri}
                    </div>
                </div>
                
                <div class="maintenance-content">
                    <div class="maintenance-detail">
                        <i class="fas fa-info-circle"></i>
                        <span><strong>Nội dung:</strong> ${escapeHtml(bt.NoiDung || (bt.isTramMaintenance ? 'Bảo trì toàn trạm' : 'Chưa có'))}</span>
                    </div>
                    
                    ${bt.TenNhanVien || bt.MaNV ? `
                    <div class="maintenance-detail">
                        <i class="fas fa-user-tie"></i>
                        <span><strong>Nhân viên:</strong> ${escapeHtml(bt.TenNhanVien || bt.MaNV || 'Chưa xác định')}</span>
                        ${bt.ChucVu ? `<span class="detail-badge">${escapeHtml(bt.ChucVu)}</span>` : ''}
                    </div>
                    ` : ''}
                    
                    <div class="maintenance-detail">
                        <i class="fas fa-building"></i>
                        <span><strong>Trạm:</strong> ${escapeHtml(tenTram)}</span>
                        ${bt.isTramMaintenance ? '<span class="detail-badge" style="background: #fef3c7; color: #92400e;">Toàn trạm</span>' : ''}
                    </div>
                    
                    ${bt.MaCot ? `
                    <div class="maintenance-detail">
                        <i class="fas fa-plug"></i>
                        <span><strong>${loaiBaoTri}:</strong> ${tenCot} ${loaiCongSac}</span>
                    </div>
                    ` : bt.isTramMaintenance ? '' : `
                    <div class="maintenance-detail">
                        <i class="fas fa-tools"></i>
                        <span><strong>Loại:</strong> ${loaiBaoTri}</span>
                    </div>
                    `}
                </div>
            </div>
        `;
    }).join('');
}

// Đóng modal khi click bên ngoài
window.addEventListener('click', function(event) {
    const revenueModal = document.getElementById('revenueChartModal');
    if (event.target === revenueModal) {
        closeRevenueChartModal();
    }
    
    const maintenanceModal = document.getElementById('maintenanceModal');
    if (event.target === maintenanceModal) {
        closeMaintenanceModal();
    }
});

// Đảm bảo function có thể truy cập được từ main.js
// Function declaration được hoisted, nhưng để chắc chắn, expose ra window
if (typeof window !== 'undefined') {
    window.loadDashboard = loadDashboard;
}


