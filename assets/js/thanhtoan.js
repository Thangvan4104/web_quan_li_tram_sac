/**
 * File: assets/js/thanhtoan.js
 * Mô tả: Module JavaScript quản lý trang Thanh Toán
 * Chức năng: 
 *   - Load và hiển thị danh sách thanh toán
 *   - Tìm kiếm và lọc thanh toán (theo mã thanh toán, hóa đơn, phương thức, trạng thái, ngày)
 *   - CRUD operations (Create, Read, Update, Delete)
 *   - Modal form để thêm/sửa thanh toán với dropdown chọn hóa đơn
 *   - Format số tiền đẹp (VNĐ)
 *   - Hiển thị thông tin hóa đơn liên quan
 * Tác giả: Hệ thống quản lý trạm sạc
 */

// ============================================
// HÀM LOAD THANH TOÁN
// ============================================

/**
 * Hàm: loadThanhToan()
 * Mô tả: Load và hiển thị danh sách thanh toán với đầy đủ tính năng tìm kiếm và lọc
 * @return {Promise<void>} Promise không trả về giá trị
 * Chức năng:
 *   1. Gọi API lấy danh sách thanh toán (có thông tin liên quan từ JOIN)
 *   2. Gọi API lấy danh sách hóa đơn (để populate dropdown)
 *   3. Tạo HTML với thanh tìm kiếm và bộ lọc
 *   4. Hiển thị danh sách thanh toán dưới dạng card
 *   5. Thiết lập sự kiện tìm kiếm và lọc
 *   6. Xử lý lỗi nếu có
 */
async function loadThanhToan() {
    // Lấy phần tử container của trang thanh toán
    // getElementById: Tìm phần tử HTML theo ID
    const pageElement = document.getElementById('thanhtoan');
    
    // Nếu không tìm thấy thì dừng lại
    // Early return: Tránh xử lý không cần thiết
    if (!pageElement) return;
    
    // Hiển thị loading indicator trong khi đang tải dữ liệu
    showLoading();
    
    try {
        // Gọi API lấy danh sách thanh toán và hóa đơn cùng lúc
        // Promise.all: Chờ tất cả các promise hoàn thành
        // Kiểm tra xem apiFetch và API_BASE có tồn tại không
        const apiBase = typeof API_BASE !== 'undefined' ? API_BASE : 'api';
        const fetchFn = typeof apiFetch !== 'undefined' ? apiFetch : fetch;
        
        const [thanhtoansResponse, hoadonsResponse] = await Promise.all([
            // Gọi API lấy danh sách thanh toán (có thông tin liên quan từ JOIN)
            // apiFetch(): Helper function từ core.js, tự động thêm credentials: 'include'
            fetchFn(`${apiBase}/thanhtoan.php`, { credentials: 'include' }),
            // Gọi API lấy danh sách hóa đơn (để populate dropdown)
            fetchFn(`${apiBase}/hoadon.php`, { credentials: 'include' })
        ]);
        
        // Kiểm tra response của thanh toán
        if (!thanhtoansResponse.ok) {
            throw new Error(`HTTP error! status: ${thanhtoansResponse.status}`);
        }
        
        // Kiểm tra response của hóa đơn
        if (!hoadonsResponse.ok) {
            throw new Error(`HTTP error! status: ${hoadonsResponse.status}`);
        }
        
        // Parse JSON response
        const thanhtoans = await thanhtoansResponse.json();
        const hoadons = await hoadonsResponse.json();
        
        // Kiểm tra xem các biến có phải là mảng không
        // Array.isArray(): Kiểm tra xem biến có phải mảng không
        const safeThanhtoans = Array.isArray(thanhtoans) ? thanhtoans : [];
        const safeHoadons = Array.isArray(hoadons) ? hoadons : [];
        
        // Tạo HTML cho dropdown hóa đơn
        // map(): Duyệt qua mảng và tạo option cho mỗi hóa đơn
        // join(''): Nối tất cả các option lại với nhau
        const hoadonOptions = safeHoadons.map(hoadon => {
            // Format ngày để hiển thị
            const formatDate = (dateStr) => {
                if (!dateStr) return '';
                try {
                    const date = new Date(dateStr);
                    return date.toLocaleDateString('vi-VN', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit'
                    });
                } catch (e) {
                    return dateStr;
                }
            };
            
            // Format số tiền để hiển thị
            const formatCurrency = (amount) => {
                if (!amount) return '0';
                return parseFloat(amount).toLocaleString('vi-VN');
            };
            
            const displayText = `${escapeHtml(hoadon.MaHD)} - ${formatDate(hoadon.NgayLap)} (${formatCurrency(hoadon.SoTien)} VNĐ)`;
            return `<option value="${escapeHtml(hoadon.MaHD)}">${displayText}</option>`;
        }).join('');
        
        // Tạo HTML và gán vào pageElement
        // innerHTML: Gán nội dung HTML vào phần tử
        pageElement.innerHTML = `
            <!-- Header của section với tiêu đề -->
            <!-- LƯU Ý: Thanh toán chỉ được tạo từ hóa đơn, không thể thêm thủ công -->
            <div class="section-header">
                <h2>Danh Sách Hóa Đơn Đã Thanh Toán</h2>
            </div>
            
            <!-- Thanh tìm kiếm và lọc -->
            <div class="filter-section">
                <!-- Ô tìm kiếm -->
                <div class="search-box">
                    <i class="fas fa-search"></i>
                    <!-- 
                        Input tìm kiếm
                        id="thanhtoan-search": ID để JavaScript có thể truy cập
                        placeholder: Text gợi ý hiển thị khi input trống
                        oninput: Sự kiện khi người dùng nhập, gọi hàm filterThanhToan()
                    -->
                    <input 
                        type="text" 
                        id="thanhtoan-search" 
                        placeholder="Tìm kiếm theo mã hóa đơn, phiên sạc, khách hàng..." 
                        oninput="filterThanhToan()"
                    >
                </div>
                
                <!-- Bộ lọc theo hóa đơn -->
                <div class="filter-group">
                    <label for="thanhtoan-hoadon-filter">Lọc theo hóa đơn:</label>
                    <!-- 
                        Select dropdown để lọc theo hóa đơn
                        id="thanhtoan-hoadon-filter": ID để JavaScript có thể truy cập
                        onchange: Sự kiện khi người dùng chọn, gọi hàm filterThanhToan()
                    -->
                    <select id="thanhtoan-hoadon-filter" onchange="filterThanhToan()">
                        <option value="">Tất cả hóa đơn</option>
                        ${hoadonOptions}
                    </select>
                </div>
                
                <!-- Bộ lọc theo phương thức -->
                <div class="filter-group">
                    <label for="thanhtoan-phuongthuc-filter">Lọc theo phương thức:</label>
                    <!-- 
                        Select dropdown để lọc theo phương thức thanh toán
                        id="thanhtoan-phuongthuc-filter": ID để JavaScript có thể truy cập
                        onchange: Sự kiện khi người dùng chọn, gọi hàm filterThanhToan()
                    -->
                    <select id="thanhtoan-phuongthuc-filter" onchange="filterThanhToan()">
                        <option value="">Tất cả phương thức</option>
                        <option value="Ví điện tử">Ví điện tử</option>
                        <option value="Thẻ ngân hàng">Thẻ ngân hàng</option>
                        <option value="Tiền mặt">Tiền mặt</option>
                    </select>
                </div>
                
                <!-- Bộ lọc theo trạng thái -->
                <div class="filter-group">
                    <label for="thanhtoan-status-filter">Lọc theo trạng thái:</label>
                    <!-- 
                        Select dropdown để lọc theo trạng thái
                        id="thanhtoan-status-filter": ID để JavaScript có thể truy cập
                        onchange: Sự kiện khi người dùng chọn, gọi hàm filterThanhToan()
                    -->
                    <select id="thanhtoan-status-filter" onchange="filterThanhToan()">
                        <option value="">Tất cả trạng thái</option>
                        <option value="Hoàn tất">Hoàn tất</option>
                        <option value="Đang xử lý">Đang xử lý</option>
                        <option value="Thất bại">Thất bại</option>
                    </select>
                </div>
                
                <!-- Bộ lọc theo ngày -->
                <div class="filter-group">
                    <label for="thanhtoan-date-filter">Lọc theo ngày:</label>
                    <!-- 
                        Input date để lọc theo ngày thanh toán
                        id="thanhtoan-date-filter": ID để JavaScript có thể truy cập
                        onchange: Sự kiện khi người dùng chọn, gọi hàm filterThanhToan()
                    -->
                    <input 
                        type="date" 
                        id="thanhtoan-date-filter" 
                        onchange="filterThanhToan()"
                    >
                </div>
            </div>
            
            <!-- Thông báo số lượng kết quả -->
            <div class="results-info">
                <span id="thanhtoan-count">Hiển thị <strong>${safeThanhtoans.length}</strong> hóa đơn đã thanh toán</span>
            </div>
            
            <!-- Grid container chứa các card hóa đơn đã thanh toán -->
            <div class="thanhtoan-grid" id="thanhtoan-grid">
                ${safeThanhtoans.length > 0 
                    ? safeThanhtoans.map(hd => createHoaDonDaThanhToanCard(hd)).join('')
                    : '<div class="empty-state"><i class="fas fa-credit-card"></i><h3>Chưa có hóa đơn nào đã thanh toán</h3><p>Các hóa đơn đã thanh toán sẽ hiển thị ở đây</p></div>'
                }
            </div>
        `;
        
        // Lưu danh sách thanh toán và hóa đơn vào biến toàn cục để dùng cho tìm kiếm/lọc
        // window.thanhtoanData: Lưu vào window object để có thể truy cập từ các hàm khác
        window.thanhtoanData = safeThanhtoans;
        window.thanhtoanHoadons = safeHoadons;  // Lưu danh sách hóa đơn để dùng trong modal
        
    } catch (error) {
        // Xử lý lỗi: Hiển thị thông báo lỗi
        // console.error(): In lỗi ra console để debug
        console.error('Error loading thanh toan:', error);
        
        // Hiển thị thông báo lỗi trên giao diện
        pageElement.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Không thể tải dữ liệu</h3>
                <p>Đã xảy ra lỗi khi tải danh sách thanh toán. Vui lòng thử lại sau.</p>
                <button class="btn btn-primary" onclick="loadThanhToan()">
                    <i class="fas fa-redo"></i> Thử lại
                </button>
            </div>
        `;
    } finally {
        // Ẩn loading indicator dù thành công hay thất bại
        // finally: Luôn chạy sau khi try/catch hoàn thành
        hideLoading();
    }
}

/**
 * Hàm: createHoaDonDaThanhToanCard(hd)
 * Mô tả: Tạo HTML card cho một hóa đơn đã thanh toán với đầy đủ thông tin
 * @param {Object} hd - Đối tượng chứa thông tin hóa đơn đã thanh toán
 * @return {string} Chuỗi HTML của card hóa đơn đã thanh toán
 * Chức năng: 
 *   1. Tạo template HTML để hiển thị thông tin hóa đơn đã thanh toán
 *   2. Hiển thị mã hóa đơn, số tiền (format đẹp), ngày thanh toán
 *   3. Hiển thị thông tin khách hàng, phương tiện
 *   4. Hiển thị phương thức thanh toán
 */
function createHoaDonDaThanhToanCard(hd) {
    // Format số tiền đẹp (VNĐ)
    const formatCurrency = (amount) => {
        if (!amount) return '0';
        return parseFloat(amount).toLocaleString('vi-VN');
    };
    
    // Format ngày đẹp (dd/mm/yyyy)
    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        try {
            const date = new Date(dateStr);
            return date.toLocaleDateString('vi-VN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
            });
        } catch (e) {
            return dateStr;
        }
    };
    
    // Xác định class CSS cho badge trạng thái
    const statusClass = 'approved'; // Đã thanh toán
    
    return `
        <div class="thanhtoan-card" data-mahd="${escapeHtml(hd.MaHD)}">
            <!-- Header của card: Mã hóa đơn và trạng thái -->
            <div class="thanhtoan-header">
                <div>
                    <!-- Mã hóa đơn (nhỏ, màu xám) -->
                    <div class="thanhtoan-matt">${escapeHtml(hd.MaHD)}</div>
                    <!-- Trạng thái: Đã thanh toán -->
                    <div class="thanhtoan-title">Hóa đơn đã thanh toán</div>
                    <!-- Badge trạng thái -->
                    <span class="status-badge ${statusClass}">Đã thanh toán</span>
                </div>
            </div>
            <!-- Thông tin chi tiết -->
            <div class="thanhtoan-info">
                <!-- Số tiền hóa đơn -->
                <div class="thanhtoan-amount">
                    <span class="amount-label">Tổng tiền:</span>
                    <span class="amount-value">${formatCurrency(hd.TongTienHD)} VNĐ</span>
                </div>
                <!-- Đã thanh toán -->
                <div class="thanhtoan-info-item">
                    <i class="fas fa-check-circle"></i>
                    <span>Đã thanh toán: ${formatCurrency(hd.TongDaThanhToan)} VNĐ</span>
                </div>
                <!-- Ngày lập hóa đơn -->
                <div class="thanhtoan-info-item">
                    <i class="fas fa-calendar"></i>
                    <span>Ngày lập: ${formatDate(hd.NgayLap)}</span>
                </div>
                <!-- Ngày thanh toán cuối -->
                ${hd.NgayThanhToanCuoi ? `
                <div class="thanhtoan-info-item">
                    <i class="fas fa-check"></i>
                    <span>Ngày thanh toán: ${formatDate(hd.NgayThanhToanCuoi)}</span>
                </div>
                ` : ''}
                <!-- Khách hàng -->
                ${hd.TenKhachHang ? `
                <div class="thanhtoan-info-item">
                    <i class="fas fa-user"></i>
                    <span>Khách hàng: ${escapeHtml(hd.TenKhachHang)}</span>
                </div>
                ` : ''}
                <!-- Phương tiện -->
                ${hd.BienSo ? `
                <div class="thanhtoan-info-item">
                    <i class="fas fa-car"></i>
                    <span>Phương tiện: ${escapeHtml(hd.BienSo)} ${hd.DongXe ? `(${escapeHtml(hd.DongXe)})` : ''}</span>
                </div>
                ` : ''}
                <!-- Phiên sạc -->
                ${hd.MaPhien ? `
                <div class="thanhtoan-info-item">
                    <i class="fas fa-bolt"></i>
                    <span>Phiên sạc: ${escapeHtml(hd.MaPhien)}</span>
                </div>
                ` : ''}
                <!-- Phương thức thanh toán -->
                ${hd.PhuongThucThanhToan ? `
                <div class="thanhtoan-info-item">
                    <i class="fas fa-credit-card"></i>
                    <span>Phương thức: ${escapeHtml(hd.PhuongThucThanhToan)}</span>
                </div>
                ` : ''}
            </div>
        </div>
    `;
}

/**
 * Hàm: createThanhToanCard(tt) - DEPRECATED
 * Mô tả: Tạo HTML card cho một giao dịch thanh toán với đầy đủ thông tin
 * @param {Object} tt - Đối tượng chứa thông tin thanh toán (có thể có thông tin liên quan từ JOIN)
 * @return {string} Chuỗi HTML của card thanh toán
 * @deprecated Sử dụng createHoaDonDaThanhToanCard() thay thế
 */
function createThanhToanCard(tt) {
    // Format số tiền đẹp (VNĐ)
    // toLocaleString('vi-VN'): Format số theo định dạng Việt Nam (1.000.000)
    const formatCurrency = (amount) => {
        if (!amount) return '0';
        return parseFloat(amount).toLocaleString('vi-VN');
    };
    
    // Format ngày giờ đẹp
    // toLocaleString('vi-VN'): Format ngày giờ theo định dạng Việt Nam
    const formatDateTime = (dateStr) => {
        if (!dateStr) return 'Chưa có';
        try {
            const date = new Date(dateStr);
            return date.toLocaleString('vi-VN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (e) {
            return dateStr;
        }
    };
    
    // Xác định class cho badge phương thức thanh toán
    // Dựa vào giá trị PhuongThuc để gán class CSS phù hợp
    const getPhuongThucClass = (phuongthuc) => {
        if (!phuongthuc) return '';
        const lower = phuongthuc.toLowerCase();
        if (lower.includes('ví') || lower.includes('vi')) return 'vi-dien-tu';
        if (lower.includes('thẻ') || lower.includes('the')) return 'the-ngan-hang';
        if (lower.includes('tiền') || lower.includes('tien')) return 'tien-mat';
        return '';
    };
    
    // Xác định class cho badge trạng thái
    // Dựa vào giá trị TrangThai để gán class CSS phù hợp
    const getStatusClass = (trangthai) => {
        if (!trangthai) return 'hoan-tat';
        const lower = trangthai.toLowerCase();
        if (lower.includes('hoàn') || lower.includes('hoan')) return 'hoan-tat';
        if (lower.includes('đang') || lower.includes('dang')) return 'dang-xu-ly';
        if (lower.includes('thất') || lower.includes('that')) return 'that-bai';
        return 'hoan-tat';
    };
    
    // Trả về HTML template cho card thanh toán
    // Template string (backtick): Cho phép nhúng biến và xuống dòng
    return `
        <div class="thanhtoan-card" data-matt="${escapeHtml(tt.MaTT)}" data-mahd="${escapeHtml(tt.MaHD || '')}" data-phuongthuc="${escapeHtml(tt.PhuongThuc || '')}" data-trangthai="${escapeHtml(tt.TrangThai || 'Hoàn tất')}">
            <!-- Header của card: Mã thanh toán và số tiền -->
            <div class="thanhtoan-header">
                <div>
                    <!-- Mã thanh toán (nhỏ, màu xám) -->
                    <div class="thanhtoan-matt">${escapeHtml(tt.MaTT)}</div>
                    <!-- Số tiền (lớn, màu primary) -->
                    <div class="thanhtoan-sotien">${formatCurrency(tt.SoTien)} VNĐ</div>
                </div>
                <!-- Badge trạng thái -->
                <span class="status-badge ${getStatusClass(tt.TrangThai)}">${escapeHtml(tt.TrangThai || 'Hoàn tất')}</span>
            </div>
            <!-- Thông tin chi tiết của thanh toán -->
            <div class="thanhtoan-info">
                <!-- Thông tin phương thức thanh toán -->
                ${tt.PhuongThuc ? `
                <div class="thanhtoan-info-item">
                    <i class="fas fa-wallet"></i>
                    <span>Phương thức: <span class="phuongthuc-badge ${getPhuongThucClass(tt.PhuongThuc)}">${escapeHtml(tt.PhuongThuc)}</span></span>
                </div>
                ` : ''}
                <!-- Thông tin hóa đơn -->
                ${tt.MaHD ? `
                <div class="thanhtoan-info-item">
                    <i class="fas fa-receipt"></i>
                    <span>Hóa đơn: <span class="hoadon-badge">${escapeHtml(tt.MaHD)}</span></span>
                </div>
                ` : ''}
            </div>
            <!-- Thông tin ngày thanh toán -->
            <div class="thanhtoan-date">
                <i class="fas fa-calendar-alt"></i>
                <span>Ngày thanh toán: ${formatDateTime(tt.NgayTT)}</span>
            </div>
            <!-- Các nút hành động: Không có (thanh toán đã hoàn tất không thể sửa) -->
            <!-- LƯU Ý: Thanh toán sau khi xác nhận không thể sửa hoặc xóa -->
        </div>
    `;
}

// ============================================
// HÀM TÌM KIẾM VÀ LỌC
// ============================================

/**
 * Hàm: filterThanhToan()
 * Mô tả: Tìm kiếm và lọc danh sách thanh toán theo từ khóa, hóa đơn, phương thức, trạng thái và ngày
 * @return {void} Không trả về giá trị
 * Chức năng:
 *   1. Lấy giá trị từ ô tìm kiếm và các dropdown lọc
 *   2. Lọc danh sách thanh toán theo điều kiện
 *   3. Cập nhật lại giao diện với kết quả đã lọc
 */
function filterThanhToan() {
    // Lấy danh sách thanh toán từ biến toàn cục
    // window.thanhtoanData: Dữ liệu đã được lưu khi load trang
    const allThanhtoans = window.thanhtoanData || [];
    
    // Lấy giá trị từ ô tìm kiếm
    // getElementById: Tìm phần tử HTML theo ID
    // value: Lấy giá trị nhập vào input
    // toLowerCase(): Chuyển sang chữ thường để tìm kiếm không phân biệt hoa thường
    // trim(): Xóa khoảng trắng ở đầu và cuối
    const searchTerm = (document.getElementById('thanhtoan-search')?.value || '').toLowerCase().trim();
    
    // Lấy giá trị từ các dropdown lọc
    const hoadonFilter = document.getElementById('thanhtoan-hoadon-filter')?.value || '';
    const phuongthucFilter = document.getElementById('thanhtoan-phuongthuc-filter')?.value || '';
    const statusFilter = document.getElementById('thanhtoan-status-filter')?.value || '';
    const dateFilter = document.getElementById('thanhtoan-date-filter')?.value || '';
    
    // Lọc danh sách hóa đơn đã thanh toán theo điều kiện
    // filter(): Tạo mảng mới chứa các phần tử thỏa mãn điều kiện
    const filteredThanhtoans = allThanhtoans.filter(hd => {
        // Kiểm tra điều kiện tìm kiếm
        // includes(): Kiểm tra xem chuỗi có chứa từ khóa không
        const matchesSearch = !searchTerm || 
            (hd.MaHD && hd.MaHD.toLowerCase().includes(searchTerm)) ||
            (hd.MaPhien && hd.MaPhien && hd.MaPhien.toLowerCase().includes(searchTerm)) ||
            (hd.TenKhachHang && hd.TenKhachHang && hd.TenKhachHang.toLowerCase().includes(searchTerm)) ||
            (hd.BienSo && hd.BienSo && hd.BienSo.toLowerCase().includes(searchTerm));
        
        // Kiểm tra điều kiện lọc hóa đơn
        // Nếu không chọn hóa đơn (rỗng) thì hiển thị tất cả
        const matchesHoadon = !hoadonFilter || hd.MaHD === hoadonFilter;
        
        // Kiểm tra điều kiện lọc phương thức
        const matchesPhuongThuc = !phuongthucFilter || (hd.PhuongThucThanhToan && hd.PhuongThucThanhToan.toLowerCase().includes(phuongthucFilter.toLowerCase()));
        
        // Kiểm tra điều kiện lọc trạng thái - luôn là "Đã thanh toán"
        const matchesStatus = !statusFilter || statusFilter === 'Hoàn tất';
        
        // Kiểm tra điều kiện lọc ngày
        // Nếu không chọn ngày (rỗng) thì hiển thị tất cả
        // Nếu có chọn ngày, so sánh với NgayThanhToanCuoi
        const matchesDate = !dateFilter || 
            (hd.NgayThanhToanCuoi && hd.NgayThanhToanCuoi.startsWith(dateFilter));
        
        // Trả về true nếu tất cả điều kiện đều thỏa mãn
        return matchesSearch && matchesHoadon && matchesPhuongThuc && matchesStatus && matchesDate;
    });
    
    // Lấy container grid để hiển thị kết quả
    const gridContainer = document.getElementById('thanhtoan-grid');
    
    // Lấy phần tử hiển thị số lượng kết quả
    const countElement = document.getElementById('thanhtoan-count');
    
    // Kiểm tra xem các phần tử có tồn tại không
    if (!gridContainer) return;
    
    // Cập nhật số lượng kết quả
    if (countElement) {
        countElement.innerHTML = `Hiển thị <strong>${filteredThanhtoans.length}</strong> hóa đơn đã thanh toán`;
    }
    
        // Cập nhật nội dung grid với kết quả đã lọc
        if (filteredThanhtoans.length > 0) {
            // Tạo HTML cho từng card hóa đơn đã thanh toán và nối lại
            // map(): Duyệt qua mảng và tạo HTML cho mỗi phần tử
            // join(''): Nối tất cả các chuỗi HTML lại với nhau
            gridContainer.innerHTML = filteredThanhtoans.map(hd => createHoaDonDaThanhToanCard(hd)).join('');
        } else {
        // Nếu không có kết quả, hiển thị thông báo trống
        gridContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-search"></i>
                <h3>Không tìm thấy hóa đơn đã thanh toán nào</h3>
                <p>Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc</p>
            </div>
        `;
    }
}

// ============================================
// HÀM CRUD OPERATIONS
// ============================================

/**
 * Hàm: openThanhToanModal(matt)
 * Mô tả: Mở modal form để thêm mới hoặc sửa thanh toán
 * @param {string|null} matt - Mã thanh toán cần sửa (null nếu thêm mới)
 * @return {Promise<void>} Promise không trả về giá trị
 * Chức năng:
 *   1. Tạo hoặc cập nhật modal form
 *   2. Populate dropdown hóa đơn
 *   3. Nếu có matt, load dữ liệu thanh toán vào form
 *   4. Hiển thị modal
 */
async function openThanhToanModal(matt = null) {
    // Kiểm tra xem modal đã tồn tại chưa
    let modal = document.getElementById('thanhtoan-modal');
    
    // Nếu chưa tồn tại, tạo modal mới
    if (!modal) {
        // Tạo phần tử div cho modal
        modal = document.createElement('div');
        modal.id = 'thanhtoan-modal';
        modal.className = 'modal';
        
        // Thêm modal vào body
        document.body.appendChild(modal);
    }
    
    // Xác định tiêu đề modal (Thêm mới hoặc Sửa)
    const isEdit = matt !== null;
    const modalTitle = isEdit ? 'Sửa Thanh Toán' : 'Thêm Thanh Toán Mới';
    
    // Lấy danh sách hóa đơn từ biến toàn cục hoặc gọi API
    let hoadons = window.thanhtoanHoadons || [];
    
    // Nếu chưa có danh sách, gọi API để lấy
    if (hoadons.length === 0) {
        try {
            const apiBase = typeof API_BASE !== 'undefined' ? API_BASE : 'api';
            const fetchFn = typeof apiFetch !== 'undefined' ? apiFetch : fetch;
            const hoadonsResponse = await fetchFn(`${apiBase}/hoadon.php`, { credentials: 'include' });
            
            if (hoadonsResponse.ok) {
                hoadons = await hoadonsResponse.json();
                window.thanhtoanHoadons = hoadons;
            }
        } catch (error) {
            console.error('Error loading data:', error);
        }
    }
    
    // Tạo HTML cho dropdown hóa đơn
    const hoadonOptions = hoadons.map(hoadon => {
        const formatDate = (dateStr) => {
            if (!dateStr) return '';
            try {
                const date = new Date(dateStr);
                return date.toLocaleDateString('vi-VN', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit'
                });
            } catch (e) {
                return dateStr;
            }
        };
        
        const formatCurrency = (amount) => {
            if (!amount) return '0';
            return parseFloat(amount).toLocaleString('vi-VN');
        };
        
        const displayText = `${escapeHtml(hoadon.MaHD)} - ${formatDate(hoadon.NgayLap)} (${formatCurrency(hoadon.SoTien)} VNĐ)`;
        return `<option value="${escapeHtml(hoadon.MaHD)}">${displayText}</option>`;
    }).join('');
    
    // Tạo nội dung modal với form
    modal.innerHTML = `
        <div class="modal-content">
            <!-- Header của modal -->
            <div class="modal-header">
                <h2>${modalTitle}</h2>
                <!-- Nút đóng modal -->
                <span class="close" onclick="closeThanhToanModal()">&times;</span>
            </div>
            
            <!-- Form nhập liệu -->
            <form id="thanhtoan-form" onsubmit="saveThanhToan(event)">
                <!-- Mã thanh toán (chỉ hiển thị khi sửa, disabled khi thêm mới) -->
                <div class="form-group">
                    <label for="thanhtoan-matt">Mã Thanh Toán <span class="required">*</span></label>
                    <input 
                        type="text" 
                        id="thanhtoan-matt" 
                        name="MaTT" 
                        required 
                        maxlength="5"
                        ${isEdit ? 'readonly' : ''}
                        placeholder="VD: TT001"
                        title="Mã thanh toán gồm 5 ký tự (VD: TT001)"
                    >
                    <small class="form-hint">Mã thanh toán gồm 5 ký tự (VD: TT001)</small>
                </div>
                
                <!-- Hóa đơn (dropdown) -->
                <div class="form-group">
                    <label for="thanhtoan-mahd">Hóa Đơn <span class="required">*</span></label>
                    <select id="thanhtoan-mahd" name="MaHD" required>
                        <option value="">-- Chọn hóa đơn --</option>
                        ${hoadonOptions}
                    </select>
                </div>
                
                <!-- Phương thức thanh toán (dropdown) -->
                <div class="form-group">
                    <label for="thanhtoan-phuongthuc">Phương Thức Thanh Toán <span class="required">*</span></label>
                    <select id="thanhtoan-phuongthuc" name="PhuongThuc" required>
                        <option value="">-- Chọn phương thức --</option>
                        <option value="Ví điện tử">Ví điện tử</option>
                        <option value="Thẻ ngân hàng">Thẻ ngân hàng</option>
                        <option value="Tiền mặt">Tiền mặt</option>
                    </select>
                </div>
                
                <!-- Số tiền -->
                <div class="form-group">
                    <label for="thanhtoan-sotien">Số Tiền (VNĐ) <span class="required">*</span></label>
                    <input 
                        type="number" 
                        id="thanhtoan-sotien" 
                        name="SoTien" 
                        required
                        step="0.01"
                        min="0"
                        placeholder="VD: 167500"
                    >
                    <small class="form-hint">Số tiền thanh toán tính bằng VNĐ</small>
                </div>
                
                <!-- Ngày thanh toán -->
                <div class="form-group">
                    <label for="thanhtoan-ngaytt">Ngày Thanh Toán <span class="required">*</span></label>
                    <input 
                        type="datetime-local" 
                        id="thanhtoan-ngaytt" 
                        name="NgayTT" 
                        required
                    >
                    <small class="form-hint">Ngày và giờ thanh toán</small>
                </div>
                
                <!-- Trạng thái (dropdown) -->
                <div class="form-group">
                    <label for="thanhtoan-trangthai">Trạng Thái <span class="required">*</span></label>
                    <select id="thanhtoan-trangthai" name="TrangThai" required>
                        <option value="Hoàn tất">Hoàn tất</option>
                        <option value="Đang xử lý">Đang xử lý</option>
                        <option value="Thất bại">Thất bại</option>
                    </select>
                </div>
                
                <!-- Các nút hành động -->
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="closeThanhToanModal()">
                        <i class="fas fa-times"></i> Hủy
                    </button>
                    <button type="submit" class="btn btn-primary">
                        <i class="fas fa-save"></i> ${isEdit ? 'Cập nhật' : 'Thêm mới'}
                    </button>
                </div>
            </form>
        </div>
    `;
    
    // Nếu đang sửa, load dữ liệu thanh toán vào form
    if (isEdit && matt) {
        // Hiển thị loading indicator
        showLoading();
        
        try {
            // Gọi API lấy thông tin thanh toán
            // apiFetch(): Helper function từ core.js, tự động thêm credentials: 'include'
            const apiBase = typeof API_BASE !== 'undefined' ? API_BASE : 'api';
            const fetchFn = typeof apiFetch !== 'undefined' ? apiFetch : fetch;
            const response = await fetchFn(`${apiBase}/thanhtoan.php?id=${encodeURIComponent(matt)}`, { credentials: 'include' });
            
            // Kiểm tra response
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            // Parse JSON response
            const thanhtoan = await response.json();
            
            // Hàm chuyển đổi datetime từ MySQL format sang datetime-local format
            // datetime-local input yêu cầu format: YYYY-MM-DDTHH:mm
            const convertToLocalDateTime = (dateStr) => {
                if (!dateStr) return '';
                try {
                    // Tạo Date object từ chuỗi
                    const date = new Date(dateStr);
                    // Lấy năm, tháng, ngày, giờ, phút
                    const year = date.getFullYear();
                    const month = String(date.getMonth() + 1).padStart(2, '0');
                    const day = String(date.getDate()).padStart(2, '0');
                    const hours = String(date.getHours()).padStart(2, '0');
                    const minutes = String(date.getMinutes()).padStart(2, '0');
                    // Trả về format YYYY-MM-DDTHH:mm
                    return `${year}-${month}-${day}T${hours}:${minutes}`;
                } catch (e) {
                    return '';
                }
            };
            
            // Điền dữ liệu vào form
            // getElementById: Tìm phần tử theo ID
            // value: Gán giá trị cho input/select
            document.getElementById('thanhtoan-matt').value = thanhtoan.MaTT || '';
            document.getElementById('thanhtoan-mahd').value = thanhtoan.MaHD || '';
            document.getElementById('thanhtoan-phuongthuc').value = thanhtoan.PhuongThuc || '';
            document.getElementById('thanhtoan-sotien').value = thanhtoan.SoTien || '';
            document.getElementById('thanhtoan-ngaytt').value = convertToLocalDateTime(thanhtoan.NgayTT);
            document.getElementById('thanhtoan-trangthai').value = thanhtoan.TrangThai || 'Hoàn tất';
            
        } catch (error) {
            // Xử lý lỗi
            console.error('Error loading thanh toan data:', error);
            alert('Không thể tải thông tin thanh toán. Vui lòng thử lại.');
            closeThanhToanModal();
            return;
        } finally {
            // Ẩn loading indicator
            hideLoading();
        }
    } else {
        // Nếu thêm mới, set ngày thanh toán mặc định là hiện tại
        // new Date(): Tạo đối tượng Date với thời gian hiện tại
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const defaultDateTime = `${year}-${month}-${day}T${hours}:${minutes}`;
        
        // Set giá trị mặc định sau khi modal được render
        setTimeout(() => {
            const ngayTTInput = document.getElementById('thanhtoan-ngaytt');
            if (ngayTTInput) {
                ngayTTInput.value = defaultDateTime;
            }
        }, 100);
    }
    
    // Hiển thị modal
    // classList.add: Thêm class 'show' để hiển thị modal
    modal.classList.add('show');
    
    // Thiết lập sự kiện đóng modal khi click vào overlay (ngoài modal-content)
    // Sử dụng event delegation để xử lý click
    modal.onclick = (e) => {
        // Nếu click vào chính modal (overlay), không phải modal-content
        if (e.target === modal) {
            closeThanhToanModal();
        }
    };
    
    // Thiết lập sự kiện đóng modal khi nhấn phím ESC
    // keydown: Sự kiện khi nhấn phím
    const handleEscKey = (e) => {
        // key === 'Escape': Kiểm tra xem có phải phím ESC không
        if (e.key === 'Escape') {
            closeThanhToanModal();
            // Xóa event listener sau khi đóng modal
            document.removeEventListener('keydown', handleEscKey);
        }
    };
    
    // Thêm event listener cho phím ESC
    document.addEventListener('keydown', handleEscKey);
    
    // Focus vào ô input đầu tiên (trừ khi đang sửa và mã thanh toán là readonly)
    if (!isEdit) {
        setTimeout(() => {
            document.getElementById('thanhtoan-matt')?.focus();
        }, 100);
    } else {
        setTimeout(() => {
            document.getElementById('thanhtoan-mahd')?.focus();
        }, 100);
    }
}

/**
 * Hàm: closeThanhToanModal()
 * Mô tả: Đóng modal form thanh toán
 * @return {void} Không trả về giá trị
 * Chức năng: Xóa class 'show' để ẩn modal
 */
function closeThanhToanModal() {
    // Lấy phần tử modal
    const modal = document.getElementById('thanhtoan-modal');
    
    // Nếu tìm thấy, xóa class 'show' để ẩn modal
    if (modal) {
        modal.classList.remove('show');
    }
}

/**
 * Hàm: saveThanhToan(event)
 * Mô tả: Lưu thanh toán mới hoặc cập nhật thanh toán hiện có
 * @param {Event} event - Event object từ form submit
 * @return {Promise<void>} Promise không trả về giá trị
 * Chức năng:
 *   1. Ngăn chặn form submit mặc định
 *   2. Lấy dữ liệu từ form
 *   3. Validate dữ liệu
 *   4. Chuyển đổi datetime-local sang format MySQL (YYYY-MM-DD HH:mm:ss)
 *   5. Gọi API POST (thêm mới) hoặc PUT (cập nhật)
 *   6. Reload danh sách và đóng modal
 */
async function saveThanhToan(event) {
    // Ngăn chặn form submit mặc định (tránh reload trang)
    // preventDefault(): Ngăn chặn hành vi mặc định của event
    event.preventDefault();
    
    // Lấy form element
    const form = document.getElementById('thanhtoan-form');
    
    // Kiểm tra form có tồn tại không
    if (!form) return;
    
    // Lấy các giá trị từ form
    // FormData: API để lấy dữ liệu từ form
    const formData = new FormData(form);
    
    // Hàm chuyển đổi datetime-local sang format MySQL
    // datetime-local format: YYYY-MM-DDTHH:mm
    // MySQL format: YYYY-MM-DD HH:mm:ss
    const convertToMySQLDateTime = (dateTimeLocal) => {
        if (!dateTimeLocal) return null;
        // Thay thế 'T' bằng khoảng trắng và thêm ':00' cho giây
        return dateTimeLocal.replace('T', ' ') + ':00';
    };
    
    // Tạo object chứa dữ liệu thanh toán
    // Object.fromEntries(): Chuyển FormData sang object
    const thanhtoanData = {
        MaTT: formData.get('MaTT')?.trim() || '',                    // Mã thanh toán (Primary Key)
        MaHD: formData.get('MaHD')?.trim() || '',                   // Mã hóa đơn (Foreign Key)
        PhuongThuc: formData.get('PhuongThuc')?.trim() || '',      // Phương thức thanh toán
        SoTien: formData.get('SoTien') ? parseFloat(formData.get('SoTien')) : 0,  // Số tiền (FLOAT)
        NgayTT: convertToMySQLDateTime(formData.get('NgayTT')),    // Ngày thanh toán (DATETIME)
        TrangThai: formData.get('TrangThai')?.trim() || 'Hoàn tất'  // Trạng thái (mặc định: Hoàn tất)
    };
    
    // Validate dữ liệu
    // Kiểm tra mã thanh toán không được rỗng
    if (!thanhtoanData.MaTT) {
        alert('Vui lòng nhập mã thanh toán');
        document.getElementById('thanhtoan-matt')?.focus();
        return;
    }
    
    // Kiểm tra các trường bắt buộc
    if (!thanhtoanData.MaHD || !thanhtoanData.PhuongThuc || !thanhtoanData.SoTien || !thanhtoanData.NgayTT) {
        alert('Vui lòng điền đầy đủ thông tin bắt buộc');
        return;
    }
    
    // Kiểm tra số tiền phải lớn hơn 0
    if (thanhtoanData.SoTien <= 0) {
        alert('Số tiền phải lớn hơn 0');
        document.getElementById('thanhtoan-sotien')?.focus();
        return;
    }
    
    // Xác định phương thức HTTP và URL
    // Kiểm tra xem có mã thanh toán trong form không (đang sửa)
    const isEdit = document.getElementById('thanhtoan-matt')?.readOnly || false;
    const method = isEdit ? 'PUT' : 'POST';
    const apiBase = typeof API_BASE !== 'undefined' ? API_BASE : 'api';
    const url = `${apiBase}/thanhtoan.php`;
    const fetchFn = typeof apiFetch !== 'undefined' ? apiFetch : fetch;
    
    // Hiển thị loading indicator
    showLoading();
    
    try {
        // Gọi API để lưu thanh toán
        // apiFetch(): Helper function từ core.js, tự động thêm credentials: 'include'
        const response = await fetchFn(url, {
            method: method,                    // POST hoặc PUT
            headers: {
                'Content-Type': 'application/json'  // Gửi dữ liệu dạng JSON
            },
            body: JSON.stringify(thanhtoanData)     // Chuyển object sang JSON string
        });
        
        // Parse JSON response
        const result = await response.json();
        
        // Kiểm tra response
        if (!response.ok) {
            // Nếu có lỗi, hiển thị thông báo
            throw new Error(result.error || 'Có lỗi xảy ra khi lưu thanh toán');
        }
        
        // Nếu thành công, hiển thị thông báo
        alert(isEdit ? 'Cập nhật thanh toán thành công!' : 'Thêm thanh toán thành công!');
        
        // Đóng modal
        closeThanhToanModal();
        
        // Reload danh sách thanh toán
        await loadThanhToan();
        
    } catch (error) {
        // Xử lý lỗi
        console.error('Error saving thanh toan:', error);
        alert(error.message || 'Có lỗi xảy ra khi lưu thanh toán. Vui lòng thử lại.');
    } finally {
        // Ẩn loading indicator
        hideLoading();
    }
}

/**
 * Hàm: editThanhToan(matt)
 * Mô tả: Mở modal form để sửa thông tin thanh toán
 * @param {string} matt - Mã thanh toán cần sửa
 * @return {void} Không trả về giá trị
 * Chức năng: Gọi openThanhToanModal() với mã thanh toán để mở form sửa
 */
function editThanhToan(matt) {
    // Kiểm tra mã thanh toán có hợp lệ không
    if (!matt) {
        alert('Mã thanh toán không hợp lệ');
        return;
    }
    
    // Mở modal với mã thanh toán (chế độ sửa)
    openThanhToanModal(matt);
}

/**
 * Hàm: deleteThanhToan(matt)
 * Mô tả: Xóa thanh toán sau khi xác nhận
 * @param {string} matt - Mã thanh toán cần xóa
 * @return {Promise<void>} Promise không trả về giá trị
 * Chức năng:
 *   1. Hiển thị dialog xác nhận
 *   2. Nếu xác nhận, gọi API DELETE
 *   3. Reload danh sách sau khi xóa thành công
 */
async function deleteThanhToan(matt) {
    // Kiểm tra mã thanh toán có hợp lệ không
    if (!matt) {
        alert('Mã thanh toán không hợp lệ');
        return;
    }
    
    // Hiển thị dialog xác nhận
    // confirm(): Hiển thị dialog xác nhận, trả về true nếu OK, false nếu Cancel
    const confirmMessage = `Bạn có chắc chắn muốn xóa giao dịch thanh toán "${matt}"?`;
    
    if (!confirm(confirmMessage)) {
        // Nếu người dùng không xác nhận, dừng lại
        return;
    }
    
    // Hiển thị loading indicator
    showLoading();
    
    try {
        // Gọi API DELETE để xóa thanh toán
        // encodeURIComponent(): Mã hóa URL để tránh ký tự đặc biệt
        // apiFetch(): Helper function từ core.js, tự động thêm credentials: 'include'
        const apiBase = typeof API_BASE !== 'undefined' ? API_BASE : 'api';
        const fetchFn = typeof apiFetch !== 'undefined' ? apiFetch : fetch;
        const response = await fetchFn(`${apiBase}/thanhtoan.php?id=${encodeURIComponent(matt)}`, {
            method: 'DELETE'  // Phương thức DELETE
        });
        
        // Parse JSON response
        const result = await response.json();
        
        // Kiểm tra response
        if (!response.ok) {
            // Nếu có lỗi, hiển thị thông báo
            throw new Error(result.error || 'Có lỗi xảy ra khi xóa thanh toán');
        }
        
        // Nếu thành công, hiển thị thông báo
        alert('Xóa thanh toán thành công!');
        
        // Reload danh sách thanh toán
        await loadThanhToan();
        
    } catch (error) {
        // Xử lý lỗi
        console.error('Error deleting thanh toan:', error);
        alert(error.message || 'Có lỗi xảy ra khi xóa thanh toán. Vui lòng thử lại.');
    } finally {
        // Ẩn loading indicator
        hideLoading();
    }
}

// ============================================
// EXPOSE FUNCTIONS TO WINDOW OBJECT
// ============================================

/**
 * Expose các hàm quản lý thanh toán ra window object
 * Mục đích: Cho phép gọi các hàm từ HTML onclick attributes
 * 
 * Khi sử dụng onclick="openThanhToanModal()" trong HTML,
 * trình duyệt sẽ tìm hàm trong window scope.
 * Nếu không expose, sẽ báo lỗi "openThanhToanModal is not defined"
 */
/**
 * Hàm: openThanhToanModalForHoaDon(mahd)
 * Mô tả: Mở modal thanh toán với thông tin hóa đơn đã điền sẵn (MaHD và SoTien)
 * @param {string} mahd - Mã hóa đơn cần thanh toán
 * @return {Promise<void>} Promise không trả về giá trị
 * Chức năng:
 *   1. Gọi API lấy thông tin hóa đơn
 *   2. Mở modal thanh toán với MaHD và SoTien đã điền sẵn (readonly)
 *   3. Chỉ cho phép chọn phương thức thanh toán và xác nhận
 */
async function openThanhToanModalForHoaDon(mahd) {
    // Kiểm tra mã hóa đơn có hợp lệ không
    if (!mahd) {
        alert('Mã hóa đơn không hợp lệ');
        return;
    }
    
    // Hiển thị loading indicator
    showLoading();
    
    try {
        // Gọi API lấy thông tin hóa đơn
        const apiBase = typeof API_BASE !== 'undefined' ? API_BASE : 'api';
        const fetchFn = typeof apiFetch !== 'undefined' ? apiFetch : fetch;
        const response = await fetchFn(`${apiBase}/hoadon.php?id=${encodeURIComponent(mahd)}`, { credentials: 'include' });
        
        // Kiểm tra response
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        // Parse JSON response
        const hoadon = await response.json();
        
        // Kiểm tra xem hóa đơn đã có thanh toán chưa
        // Nếu đã có thanh toán, không cho phép thanh toán lại
        if (hoadon.ThanhToan && hoadon.ThanhToan.length > 0) {
            alert('Hóa đơn này đã được thanh toán. Không thể thanh toán lại.');
            hideLoading();
            return;
        }
        
        // Mở modal thanh toán với thông tin hóa đơn
        // Sử dụng hàm openThanhToanModal() nhưng với chế độ đặc biệt
        await openThanhToanModalForHoaDonInternal(mahd, hoadon.SoTien);
        
    } catch (error) {
        // Xử lý lỗi
        console.error('Error loading hoa don for payment:', error);
        alert('Không thể tải thông tin hóa đơn. Vui lòng thử lại.');
    } finally {
        // Ẩn loading indicator
        hideLoading();
    }
}

/**
 * Hàm: openThanhToanModalForHoaDonInternal(mahd, sotien)
 * Mô tả: Mở modal thanh toán với thông tin đã có sẵn (helper function)
 * @param {string} mahd - Mã hóa đơn
 * @param {number} sotien - Số tiền cần thanh toán
 * @return {Promise<void>} Promise không trả về giá trị
 */
async function openThanhToanModalForHoaDonInternal(mahd, sotien) {
    // Kiểm tra xem modal đã tồn tại chưa
    let modal = document.getElementById('thanhtoan-modal');
    
    // Nếu chưa tồn tại, tạo modal mới
    if (!modal) {
        // Tạo phần tử div cho modal
        modal = document.createElement('div');
        modal.id = 'thanhtoan-modal';
        modal.className = 'modal';
        
        // Thêm modal vào body
        document.body.appendChild(modal);
    }
    
    // Format số tiền để hiển thị
    const formatCurrency = (amount) => {
        if (!amount) return '0';
        return parseFloat(amount).toLocaleString('vi-VN');
    };
    
    // Tạo nội dung modal với form
    modal.innerHTML = `
        <div class="modal-content">
            <!-- Header của modal -->
            <div class="modal-header">
                <h2>Thanh Toán Hóa Đơn</h2>
                <!-- Nút đóng modal -->
                <span class="close" onclick="closeThanhToanModal()">&times;</span>
            </div>
            
            <!-- Form nhập liệu -->
            <form id="thanhtoan-form" onsubmit="saveThanhToanFromHoaDon(event)">
                <!-- Mã hóa đơn (readonly) -->
                <div class="form-group">
                    <label for="thanhtoan-mahd">Mã Hóa Đơn <span class="required">*</span></label>
                    <input 
                        type="text" 
                        id="thanhtoan-mahd" 
                        name="MaHD" 
                        value="${escapeHtml(mahd)}"
                        readonly
                        required
                    >
                    <small class="form-hint">Mã hóa đơn (không thể thay đổi)</small>
                </div>
                
                <!-- Số tiền (readonly) -->
                <div class="form-group">
                    <label for="thanhtoan-sotien">Số Tiền (VNĐ) <span class="required">*</span></label>
                    <input 
                        type="text" 
                        id="thanhtoan-sotien-display" 
                        value="${formatCurrency(sotien)} VNĐ"
                        readonly
                        style="background-color: #f5f5f5;"
                    >
                    <input 
                        type="hidden" 
                        id="thanhtoan-sotien" 
                        name="SoTien" 
                        value="${sotien}"
                    >
                    <small class="form-hint">Số tiền cần thanh toán (không thể thay đổi)</small>
                </div>
                
                <!-- Phương thức thanh toán (dropdown) -->
                <div class="form-group">
                    <label for="thanhtoan-phuongthuc">Phương Thức Thanh Toán <span class="required">*</span></label>
                    <select id="thanhtoan-phuongthuc" name="PhuongThuc" required>
                        <option value="">-- Chọn phương thức --</option>
                        <option value="Ví điện tử">Ví điện tử</option>
                        <option value="Thẻ ngân hàng">Thẻ ngân hàng</option>
                        <option value="Tiền mặt">Tiền mặt</option>
                    </select>
                    <small class="form-hint">Chọn phương thức thanh toán</small>
                </div>
                
                <!-- Ngày thanh toán (tự động set là hiện tại) -->
                <div class="form-group">
                    <label for="thanhtoan-ngaytt">Ngày Thanh Toán <span class="required">*</span></label>
                    <input 
                        type="datetime-local" 
                        id="thanhtoan-ngaytt" 
                        name="NgayTT" 
                        required
                    >
                    <small class="form-hint">Ngày và giờ thanh toán (mặc định: hiện tại)</small>
                </div>
                
                <!-- Trạng thái (mặc định: Hoàn tất, readonly) -->
                <div class="form-group">
                    <label for="thanhtoan-trangthai">Trạng Thái <span class="required">*</span></label>
                    <input 
                        type="text" 
                        id="thanhtoan-trangthai" 
                        name="TrangThai" 
                        value="Hoàn tất"
                        readonly
                        style="background-color: #f5f5f5;"
                    >
                    <small class="form-hint">Trạng thái thanh toán (mặc định: Hoàn tất)</small>
                </div>
                
                <!-- Các nút hành động -->
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="closeThanhToanModal()">
                        <i class="fas fa-times"></i> Hủy
                    </button>
                    <button type="submit" class="btn btn-primary">
                        <i class="fas fa-check"></i> Xác Nhận Thanh Toán
                    </button>
                </div>
            </form>
        </div>
    `;
    
    // Set ngày thanh toán mặc định là hiện tại
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const defaultDateTime = `${year}-${month}-${day}T${hours}:${minutes}`;
    
    // Set giá trị mặc định sau khi modal được render
    setTimeout(() => {
        const ngayTTInput = document.getElementById('thanhtoan-ngaytt');
        if (ngayTTInput) {
            ngayTTInput.value = defaultDateTime;
        }
    }, 100);
    
    // Hiển thị modal
    modal.classList.add('show');
    
    // Thiết lập sự kiện đóng modal khi click vào overlay
    modal.onclick = (e) => {
        if (e.target === modal) {
            closeThanhToanModal();
        }
    };
    
    // Thiết lập sự kiện đóng modal khi nhấn phím ESC
    const handleEscKey = (e) => {
        if (e.key === 'Escape') {
            closeThanhToanModal();
            document.removeEventListener('keydown', handleEscKey);
        }
    };
    
    document.addEventListener('keydown', handleEscKey);
    
    // Focus vào dropdown phương thức thanh toán
    setTimeout(() => {
        document.getElementById('thanhtoan-phuongthuc')?.focus();
    }, 100);
}

/**
 * Hàm: saveThanhToanFromHoaDon(event)
 * Mô tả: Lưu thanh toán từ hóa đơn (không cho phép sửa sau khi xác nhận)
 * @param {Event} event - Event object từ form submit
 * @return {Promise<void>} Promise không trả về giá trị
 */
async function saveThanhToanFromHoaDon(event) {
    // Ngăn chặn form submit mặc định
    event.preventDefault();
    
    // Lấy form element
    const form = document.getElementById('thanhtoan-form');
    
    // Kiểm tra form có tồn tại không
    if (!form) return;
    
    // Lấy các giá trị từ form
    const formData = new FormData(form);
    
    // Hàm chuyển đổi datetime-local sang format MySQL
    const convertToMySQLDateTime = (dateTimeLocal) => {
        if (!dateTimeLocal) return null;
        return dateTimeLocal.replace('T', ' ') + ':00';
    };
    
    // Tạo mã thanh toán tự động
    // Tạm thời sử dụng format: TT + timestamp (5 ký tự)
    const generateMaTT = () => {
        const timestamp = Date.now().toString().slice(-5);
        return 'TT' + timestamp.padStart(3, '0');
    };
    
    // Tạo object chứa dữ liệu thanh toán
    const thanhtoanData = {
        MaTT: generateMaTT(),                                    // Mã thanh toán (tự động tạo)
        MaHD: formData.get('MaHD')?.trim() || '',               // Mã hóa đơn (readonly)
        PhuongThuc: formData.get('PhuongThuc')?.trim() || '',   // Phương thức thanh toán
        SoTien: parseFloat(formData.get('SoTien')) || 0,         // Số tiền (readonly)
        NgayTT: convertToMySQLDateTime(formData.get('NgayTT')),  // Ngày thanh toán
        TrangThai: 'Hoàn tất'                                    // Trạng thái (mặc định: Hoàn tất)
    };
    
    // Validate dữ liệu
    if (!thanhtoanData.MaHD || !thanhtoanData.PhuongThuc || !thanhtoanData.SoTien || !thanhtoanData.NgayTT) {
        alert('Vui lòng điền đầy đủ thông tin bắt buộc');
        return;
    }
    
    // Kiểm tra số tiền phải lớn hơn 0
    if (thanhtoanData.SoTien <= 0) {
        alert('Số tiền phải lớn hơn 0');
        return;
    }
    
    // Xác nhận thanh toán
    const confirmMessage = `Xác nhận thanh toán hóa đơn ${thanhtoanData.MaHD}?\n\nSố tiền: ${thanhtoanData.SoTien.toLocaleString('vi-VN')} VNĐ\nPhương thức: ${thanhtoanData.PhuongThuc}\n\nLưu ý: Sau khi xác nhận, thanh toán này không thể sửa hoặc xóa.`;
    
    if (!confirm(confirmMessage)) {
        return;
    }
    
    const apiBase = typeof API_BASE !== 'undefined' ? API_BASE : 'api';
    const fetchFn = typeof apiFetch !== 'undefined' ? apiFetch : fetch;
    
    // Hiển thị loading indicator
    showLoading();
    
    try {
        // Gọi API để lưu thanh toán
        const response = await fetchFn(`${apiBase}/thanhtoan.php`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(thanhtoanData),
            credentials: 'include'
        });
        
        // Parse JSON response
        const result = await response.json();
        
        // Kiểm tra response
        if (!response.ok) {
            throw new Error(result.error || 'Có lỗi xảy ra khi lưu thanh toán');
        }
        
        // Nếu thành công, hiển thị thông báo
        alert('Thanh toán thành công!');
        
        // Đóng modal
        closeThanhToanModal();
        
        // Reload danh sách thanh toán
        await loadThanhToan();
        
        // Reload danh sách hóa đơn để cập nhật trạng thái
        if (typeof loadHoaDon === 'function') {
            await loadHoaDon();
        }
        
    } catch (error) {
        // Xử lý lỗi
        console.error('Error saving thanh toan from hoa don:', error);
        alert(error.message || 'Có lỗi xảy ra khi lưu thanh toán. Vui lòng thử lại.');
    } finally {
        // Ẩn loading indicator
        hideLoading();
    }
}

window.openThanhToanModal = openThanhToanModal;
window.closeThanhToanModal = closeThanhToanModal;
window.saveThanhToan = saveThanhToan;
window.editThanhToan = editThanhToan;
window.deleteThanhToan = deleteThanhToan;
window.filterThanhToan = filterThanhToan;
window.loadThanhToan = loadThanhToan;
window.openThanhToanModalForHoaDon = openThanhToanModalForHoaDon;
window.saveThanhToanFromHoaDon = saveThanhToanFromHoaDon;

