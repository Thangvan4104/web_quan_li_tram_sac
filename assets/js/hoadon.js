/**
 * File: assets/js/hoadon.js
 * Mô tả: Module JavaScript quản lý trang Hóa Đơn
 * Chức năng: 
 *   - Load và hiển thị danh sách hóa đơn
 *   - Tìm kiếm và lọc hóa đơn (theo mã hóa đơn, ngày, khách hàng, phiên sạc)
 *   - CRUD operations (Create, Read, Update, Delete)
 *   - Modal form để thêm/sửa hóa đơn với dropdown chọn phiên sạc
 *   - Format số tiền đẹp (VNĐ)
 *   - Hiển thị thông tin phiên sạc và khách hàng liên quan
 * Tác giả: Hệ thống quản lý trạm sạc
 */

// ============================================
// HÀM LOAD HÓA ĐƠN
// ============================================

/**
 * Hàm: loadHoaDon()
 * Mô tả: Load và hiển thị danh sách hóa đơn với đầy đủ tính năng tìm kiếm và lọc
 * @return {Promise<void>} Promise không trả về giá trị
 * Chức năng:
 *   1. Gọi API lấy danh sách hóa đơn (có thông tin liên quan từ JOIN)
 *   2. Gọi API lấy danh sách phiên sạc (để populate dropdown)
 *   3. Tạo HTML với thanh tìm kiếm và bộ lọc
 *   4. Hiển thị danh sách hóa đơn dưới dạng card
 *   5. Thiết lập sự kiện tìm kiếm và lọc
 *   6. Xử lý lỗi nếu có
 */
async function loadHoaDon() {
    // Lấy phần tử container của trang hóa đơn
    // getElementById: Tìm phần tử HTML theo ID
    const pageElement = document.getElementById('hoadon');
    
    // Nếu không tìm thấy thì dừng lại
    // Early return: Tránh xử lý không cần thiết
    if (!pageElement) return;
    
    // Hiển thị loading indicator trong khi đang tải dữ liệu
    showLoading();
    
    try {
        // Gọi API lấy danh sách hóa đơn và phiên sạc cùng lúc
        // Promise.all: Chờ tất cả các promise hoàn thành
        const [hoadonsResponse, phiensResponse] = await Promise.all([
            // Gọi API lấy danh sách hóa đơn (có thông tin liên quan từ JOIN)
            // apiFetch(): Helper function từ core.js, tự động thêm credentials: 'include'
            apiFetch(`${API_BASE}/hoadon.php`),
            // Gọi API lấy danh sách phiên sạc (để populate dropdown)
            apiFetch(`${API_BASE}/phiensac.php`)
        ]);
        
        // Kiểm tra response của hóa đơn
        if (!hoadonsResponse.ok) {
            throw new Error(`HTTP error! status: ${hoadonsResponse.status}`);
        }
        
        // Kiểm tra response của phiên sạc
        if (!phiensResponse.ok) {
            throw new Error(`HTTP error! status: ${phiensResponse.status}`);
        }
        
        // Parse JSON response
        const hoadons = await hoadonsResponse.json();
        const phiens = await phiensResponse.json();
        
        // Kiểm tra xem các biến có phải là mảng không
        // Array.isArray(): Kiểm tra xem biến có phải mảng không
        const safeHoadons = Array.isArray(hoadons) ? hoadons : [];
        const safePhiens = Array.isArray(phiens) ? phiens : [];
        
        // Lọc các phiên sạc chưa có hóa đơn (để hiển thị trong dropdown khi thêm mới)
        // filter(): Tạo mảng mới chứa các phần tử thỏa mãn điều kiện
        // MaHoaDon là NULL hoặc rỗng nghĩa là phiên sạc chưa có hóa đơn
        const phiensChuaCoHoaDon = safePhiens.filter(phien => !phien.MaHoaDon || phien.MaHoaDon.trim() === '');
        
        // Tạo HTML cho dropdown phiên sạc (chỉ hiển thị các phiên sạc chưa có hóa đơn)
        // map(): Duyệt qua mảng và tạo option cho mỗi phiên sạc
        // join(''): Nối tất cả các option lại với nhau
        const phienOptions = phiensChuaCoHoaDon.map(phien => {
            // Format thời gian để hiển thị
            const formatDateTime = (dateStr) => {
                if (!dateStr) return '';
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
            
            const displayText = `${escapeHtml(phien.MaPhien)} - ${formatDateTime(phien.ThoiGianBatDau)}`;
            return `<option value="${escapeHtml(phien.MaPhien)}">${displayText}</option>`;
        }).join('');
        
        // Tạo HTML và gán vào pageElement
        // innerHTML: Gán nội dung HTML vào phần tử
        pageElement.innerHTML = `
            <!-- Header của section với tiêu đề -->
            <!-- LƯU Ý: Hóa đơn được tự động tạo khi phiên sạc kết thúc, không thể thêm thủ công -->
            <div class="section-header">
                <h2>Danh Sách Hóa Đơn</h2>
            </div>
            
            <!-- Thanh tìm kiếm và lọc -->
            <div class="filter-section">
                <!-- Ô tìm kiếm -->
                <div class="search-box">
                    <i class="fas fa-search"></i>
                    <!-- 
                        Input tìm kiếm
                        id="hoadon-search": ID để JavaScript có thể truy cập
                        placeholder: Text gợi ý hiển thị khi input trống
                        oninput: Sự kiện khi người dùng nhập, gọi hàm filterHoaDon()
                    -->
                    <input 
                        type="text" 
                        id="hoadon-search" 
                        placeholder="Tìm kiếm theo mã hóa đơn, phiên sạc, khách hàng..." 
                        oninput="filterHoaDon()"
                    >
                </div>
                
                <!-- Bộ lọc theo ngày -->
                <div class="filter-group">
                    <label for="hoadon-date-filter">Lọc theo ngày:</label>
                    <!-- 
                        Input date để lọc theo ngày lập
                        id="hoadon-date-filter": ID để JavaScript có thể truy cập
                        onchange: Sự kiện khi người dùng chọn, gọi hàm filterHoaDon()
                    -->
                    <input 
                        type="date" 
                        id="hoadon-date-filter" 
                        onchange="filterHoaDon()"
                    >
                </div>
                
                <!-- Bộ lọc theo phiên sạc -->
                <div class="filter-group">
                    <label for="hoadon-phien-filter">Lọc theo phiên sạc:</label>
                    <!-- 
                        Select dropdown để lọc theo phiên sạc
                        id="hoadon-phien-filter": ID để JavaScript có thể truy cập
                        onchange: Sự kiện khi người dùng chọn, gọi hàm filterHoaDon()
                    -->
                    <select id="hoadon-phien-filter" onchange="filterHoaDon()">
                        <option value="">Tất cả phiên sạc</option>
                        ${safePhiens.map(phien => 
                            `<option value="${escapeHtml(phien.MaPhien)}">${escapeHtml(phien.MaPhien)}</option>`
                        ).join('')}
                    </select>
                </div>
            </div>
            
            <!-- Thông báo số lượng kết quả -->
            <div class="results-info">
                <span id="hoadon-count">Hiển thị <strong>${safeHoadons.length}</strong> hóa đơn</span>
            </div>
            
            <!-- Grid container chứa các card hóa đơn -->
            <div class="hoadon-grid" id="hoadon-grid">
                ${safeHoadons.length > 0 
                    ? safeHoadons.map(hoadon => createHoaDonCard(hoadon)).join('')
                    : '<div class="empty-state"><i class="fas fa-receipt"></i><h3>Chưa có hóa đơn nào</h3><p>Nhấn nút "Thêm Hóa Đơn Mới" để tạo hóa đơn đầu tiên</p></div>'
                }
            </div>
        `;
        
        // Lưu danh sách hóa đơn và phiên sạc vào biến toàn cục để dùng cho tìm kiếm/lọc
        // window.hoadonData: Lưu vào window object để có thể truy cập từ các hàm khác
        window.hoadonData = safeHoadons;
        window.hoadonPhiens = safePhiens;  // Lưu danh sách phiên sạc để dùng trong modal
        window.hoadonPhiensChuaCoHoaDon = phiensChuaCoHoaDon;  // Lưu danh sách phiên sạc chưa có hóa đơn
        
    } catch (error) {
        // Xử lý lỗi: Hiển thị thông báo lỗi
        // console.error(): In lỗi ra console để debug
        console.error('Error loading hoa don:', error);
        
        // Hiển thị thông báo lỗi trên giao diện
        pageElement.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Không thể tải dữ liệu</h3>
                <p>Đã xảy ra lỗi khi tải danh sách hóa đơn. Vui lòng thử lại sau.</p>
                <button class="btn btn-primary" onclick="loadHoaDon()">
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
 * Hàm: createHoaDonCard(hoadon)
 * Mô tả: Tạo HTML card cho một hóa đơn với đầy đủ thông tin
 * @param {Object} hoadon - Đối tượng chứa thông tin hóa đơn (có thể có thông tin liên quan từ JOIN)
 * @return {string} Chuỗi HTML của card hóa đơn
 * Chức năng: 
 *   1. Tạo template HTML để hiển thị thông tin hóa đơn
 *   2. Hiển thị mã hóa đơn, số tiền (format đẹp), ngày lập
 *   3. Hiển thị thông tin phiên sạc và khách hàng liên quan
 *   4. Thêm các nút hành động (Sửa, Xóa)
 */
function createHoaDonCard(hoadon) {
    // Format số tiền đẹp (VNĐ)
    // toLocaleString('vi-VN'): Format số theo định dạng Việt Nam (1.000.000)
    const formatCurrency = (amount) => {
        if (!amount) return '0';
        return parseFloat(amount).toLocaleString('vi-VN');
    };
    
    // Format ngày đẹp
    // toLocaleDateString('vi-VN'): Format ngày theo định dạng Việt Nam (dd/mm/yyyy)
    const formatDate = (dateStr) => {
        if (!dateStr) return 'Chưa có';
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
    
    // Trả về HTML template cho card hóa đơn
    // Template string (backtick): Cho phép nhúng biến và xuống dòng
    return `
        <div class="hoadon-card" data-mahd="${escapeHtml(hoadon.MaHD)}" data-maphien="${escapeHtml(hoadon.MaPhien || '')}" data-ngaylap="${escapeHtml(hoadon.NgayLap || '')}">
            <!-- Header của card: Mã hóa đơn và số tiền -->
            <div class="hoadon-header">
                <div>
                    <!-- Mã hóa đơn (nhỏ, màu xám) -->
                    <div class="hoadon-mahd">${escapeHtml(hoadon.MaHD)}</div>
                    <!-- Số tiền (lớn, màu primary) -->
                    <div class="hoadon-sotien">${formatCurrency(hoadon.SoTien)} VNĐ</div>
                </div>
            </div>
            <!-- Thông tin chi tiết của hóa đơn -->
            <div class="hoadon-info">
                <!-- Thông tin ngày lập -->
                <div class="hoadon-info-item">
                    <i class="fas fa-calendar"></i>
                    <span>Ngày lập: ${formatDate(hoadon.NgayLap)}</span>
                </div>
                <!-- Thông tin phiên sạc -->
                ${hoadon.MaPhien ? `
                <div class="hoadon-info-item">
                    <i class="fas fa-bolt"></i>
                    <span>Phiên sạc: <span class="phien-badge">${escapeHtml(hoadon.MaPhien)}</span></span>
                </div>
                ` : ''}
                <!-- Thông tin khách hàng -->
                ${hoadon.TenKhachHang ? `
                <div class="hoadon-info-item">
                    <i class="fas fa-user"></i>
                    <span>Khách hàng: ${escapeHtml(hoadon.TenKhachHang)}</span>
                </div>
                ` : ''}
                <!-- Thông tin thời gian phiên sạc -->
                ${hoadon.ThoiGianBatDau ? `
                <div class="hoadon-phien">
                    <i class="fas fa-clock"></i>
                    <span>Thời gian sạc: ${formatDate(hoadon.ThoiGianBatDau)}</span>
                </div>
                ` : ''}
            </div>
            <!-- Các nút hành động: Chỉ có nút Thanh Toán -->
            <!-- LƯU Ý: Hóa đơn không thể sửa hoặc xóa, chỉ có thể thanh toán -->
            <div class="hoadon-actions">
                <!-- Nút Thanh Toán: Chuyển sang trang thanh toán và mở modal thanh toán cho hóa đơn này -->
                <button class="btn btn-primary btn-sm" onclick="goToThanhToan('${escapeHtml(hoadon.MaHD)}')" title="Thanh toán hóa đơn">
                    <i class="fas fa-money-bill-wave"></i> Thanh Toán
                </button>
            </div>
        </div>
    `;
}

// ============================================
// HÀM TÌM KIẾM VÀ LỌC
// ============================================

/**
 * Hàm: filterHoaDon()
 * Mô tả: Tìm kiếm và lọc danh sách hóa đơn theo từ khóa, ngày và phiên sạc
 * @return {void} Không trả về giá trị
 * Chức năng:
 *   1. Lấy giá trị từ ô tìm kiếm và các dropdown lọc
 *   2. Lọc danh sách hóa đơn theo điều kiện
 *   3. Cập nhật lại giao diện với kết quả đã lọc
 */
function filterHoaDon() {
    // Lấy danh sách hóa đơn từ biến toàn cục
    // window.hoadonData: Dữ liệu đã được lưu khi load trang
    const allHoadons = window.hoadonData || [];
    
    // Lấy giá trị từ ô tìm kiếm
    // getElementById: Tìm phần tử HTML theo ID
    // value: Lấy giá trị nhập vào input
    // toLowerCase(): Chuyển sang chữ thường để tìm kiếm không phân biệt hoa thường
    // trim(): Xóa khoảng trắng ở đầu và cuối
    const searchTerm = (document.getElementById('hoadon-search')?.value || '').toLowerCase().trim();
    
    // Lấy giá trị từ các dropdown lọc
    const dateFilter = document.getElementById('hoadon-date-filter')?.value || '';
    const phienFilter = document.getElementById('hoadon-phien-filter')?.value || '';
    
    // Lọc danh sách hóa đơn theo điều kiện
    // filter(): Tạo mảng mới chứa các phần tử thỏa mãn điều kiện
    const filteredHoadons = allHoadons.filter(hoadon => {
        // Kiểm tra điều kiện tìm kiếm
        // includes(): Kiểm tra xem chuỗi có chứa từ khóa không
        const matchesSearch = !searchTerm || 
            (hoadon.MaHD && hoadon.MaHD.toLowerCase().includes(searchTerm)) ||
            (hoadon.MaPhien && hoadon.MaPhien.toLowerCase().includes(searchTerm)) ||
            (hoadon.TenKhachHang && hoadon.TenKhachHang.toLowerCase().includes(searchTerm));
        
        // Kiểm tra điều kiện lọc ngày
        // Nếu không chọn ngày (rỗng) thì hiển thị tất cả
        // Nếu có chọn ngày, so sánh với NgayLap (chỉ so sánh phần ngày, bỏ qua giờ)
        const matchesDate = !dateFilter || 
            (hoadon.NgayLap && hoadon.NgayLap.startsWith(dateFilter));
        
        // Kiểm tra điều kiện lọc phiên sạc
        const matchesPhien = !phienFilter || hoadon.MaPhien === phienFilter;
        
        // Trả về true nếu tất cả điều kiện đều thỏa mãn
        return matchesSearch && matchesDate && matchesPhien;
    });
    
    // Lấy container grid để hiển thị kết quả
    const gridContainer = document.getElementById('hoadon-grid');
    
    // Lấy phần tử hiển thị số lượng kết quả
    const countElement = document.getElementById('hoadon-count');
    
    // Kiểm tra xem các phần tử có tồn tại không
    if (!gridContainer) return;
    
    // Cập nhật số lượng kết quả
    if (countElement) {
        countElement.innerHTML = `Hiển thị <strong>${filteredHoadons.length}</strong> hóa đơn`;
    }
    
    // Cập nhật nội dung grid với kết quả đã lọc
    if (filteredHoadons.length > 0) {
        // Tạo HTML cho từng card hóa đơn và nối lại
        // map(): Duyệt qua mảng và tạo HTML cho mỗi phần tử
        // join(''): Nối tất cả các chuỗi HTML lại với nhau
        gridContainer.innerHTML = filteredHoadons.map(hoadon => createHoaDonCard(hoadon)).join('');
    } else {
        // Nếu không có kết quả, hiển thị thông báo trống
        gridContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-search"></i>
                <h3>Không tìm thấy hóa đơn nào</h3>
                <p>Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc</p>
            </div>
        `;
    }
}

// ============================================
// HÀM CRUD OPERATIONS
// ============================================

/**
 * Hàm: openHoaDonModal(mahd)
 * Mô tả: Mở modal form để thêm mới hoặc sửa hóa đơn
 * @param {string|null} mahd - Mã hóa đơn cần sửa (null nếu thêm mới)
 * @return {Promise<void>} Promise không trả về giá trị
 * Chức năng:
 *   1. Tạo hoặc cập nhật modal form
 *   2. Populate dropdown phiên sạc (chỉ hiển thị các phiên sạc chưa có hóa đơn khi thêm mới)
 *   3. Nếu có mahd, load dữ liệu hóa đơn vào form
 *   4. Hiển thị modal
 */
async function openHoaDonModal(mahd = null) {
    // Kiểm tra xem modal đã tồn tại chưa
    let modal = document.getElementById('hoadon-modal');
    
    // Nếu chưa tồn tại, tạo modal mới
    if (!modal) {
        // Tạo phần tử div cho modal
        modal = document.createElement('div');
        modal.id = 'hoadon-modal';
        modal.className = 'modal';
        
        // Thêm modal vào body
        document.body.appendChild(modal);
    }
    
    // Xác định tiêu đề modal (Thêm mới hoặc Sửa)
    const isEdit = mahd !== null;
    const modalTitle = isEdit ? 'Sửa Hóa Đơn' : 'Thêm Hóa Đơn Mới';
    
    // Lấy danh sách phiên sạc từ biến toàn cục hoặc gọi API
    let phiens = window.hoadonPhiens || [];
    let phiensChuaCoHoaDon = window.hoadonPhiensChuaCoHoaDon || [];
    
    // Nếu chưa có danh sách, gọi API để lấy
    if (phiens.length === 0) {
        try {
            const phiensResponse = await apiFetch(`${API_BASE}/phiensac.php`);
            
            if (phiensResponse.ok) {
                phiens = await phiensResponse.json();
                window.hoadonPhiens = phiens;
                
                // Lọc các phiên sạc chưa có hóa đơn
                phiensChuaCoHoaDon = phiens.filter(phien => !phien.MaHoaDon || phien.MaHoaDon.trim() === '');
                window.hoadonPhiensChuaCoHoaDon = phiensChuaCoHoaDon;
            }
        } catch (error) {
            console.error('Error loading data:', error);
        }
    }
    
    // Tạo HTML cho dropdown phiên sạc
    // Nếu đang sửa, hiển thị tất cả phiên sạc (bao gồm phiên sạc hiện tại)
    // Nếu thêm mới, chỉ hiển thị các phiên sạc chưa có hóa đơn
    const phienOptionsForEdit = phiens.map(phien => {
        const formatDateTime = (dateStr) => {
            if (!dateStr) return '';
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
        
        const displayText = `${escapeHtml(phien.MaPhien)} - ${formatDateTime(phien.ThoiGianBatDau)}`;
        return `<option value="${escapeHtml(phien.MaPhien)}">${displayText}</option>`;
    }).join('');
    
    const phienOptionsForAdd = phiensChuaCoHoaDon.map(phien => {
        const formatDateTime = (dateStr) => {
            if (!dateStr) return '';
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
        
        const displayText = `${escapeHtml(phien.MaPhien)} - ${formatDateTime(phien.ThoiGianBatDau)}`;
        return `<option value="${escapeHtml(phien.MaPhien)}">${displayText}</option>`;
    }).join('');
    
    // Tạo nội dung modal với form
    modal.innerHTML = `
        <div class="modal-content">
            <!-- Header của modal -->
            <div class="modal-header">
                <h2>${modalTitle}</h2>
                <!-- Nút đóng modal -->
                <span class="close" onclick="closeHoaDonModal()">&times;</span>
            </div>
            
            <!-- Form nhập liệu -->
            <form id="hoadon-form" onsubmit="saveHoaDon(event)">
                <!-- Mã hóa đơn (chỉ hiển thị khi sửa, disabled khi thêm mới) -->
                <div class="form-group">
                    <label for="hoadon-mahd">Mã Hóa Đơn <span class="required">*</span></label>
                    <input 
                        type="text" 
                        id="hoadon-mahd" 
                        name="MaHD" 
                        required 
                        maxlength="5"
                        ${isEdit ? 'readonly' : ''}
                        placeholder="VD: HD001"
                        title="Mã hóa đơn gồm 5 ký tự (VD: HD001)"
                    >
                    <small class="form-hint">Mã hóa đơn gồm 5 ký tự (VD: HD001)</small>
                </div>
                
                <!-- Ngày lập -->
                <div class="form-group">
                    <label for="hoadon-ngaylap">Ngày Lập <span class="required">*</span></label>
                    <input 
                        type="date" 
                        id="hoadon-ngaylap" 
                        name="NgayLap" 
                        required
                    >
                    <small class="form-hint">Ngày lập hóa đơn</small>
                </div>
                
                <!-- Số tiền -->
                <div class="form-group">
                    <label for="hoadon-sotien">Số Tiền (VNĐ) <span class="required">*</span></label>
                    <input 
                        type="number" 
                        id="hoadon-sotien" 
                        name="SoTien" 
                        required
                        step="0.01"
                        min="0"
                        placeholder="VD: 167500"
                    >
                    <small class="form-hint">Số tiền tính bằng VNĐ</small>
                </div>
                
                <!-- Phiên sạc (dropdown) -->
                <div class="form-group">
                    <label for="hoadon-maphien">Phiên Sạc <span class="required">*</span></label>
                    <select id="hoadon-maphien" name="MaPhien" required>
                        <option value="">-- Chọn phiên sạc --</option>
                        ${isEdit ? phienOptionsForEdit : phienOptionsForAdd}
                    </select>
                    <small class="form-hint">${isEdit ? 'Chọn phiên sạc liên quan' : 'Chỉ hiển thị các phiên sạc chưa có hóa đơn'}</small>
                </div>
                
                <!-- Các nút hành động -->
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="closeHoaDonModal()">
                        <i class="fas fa-times"></i> Hủy
                    </button>
                    <button type="submit" class="btn btn-primary">
                        <i class="fas fa-save"></i> ${isEdit ? 'Cập nhật' : 'Thêm mới'}
                    </button>
                </div>
            </form>
        </div>
    `;
    
    // Nếu đang sửa, load dữ liệu hóa đơn vào form
    if (isEdit && mahd) {
        // Hiển thị loading indicator
        showLoading();
        
        try {
            // Gọi API lấy thông tin hóa đơn
            // apiFetch(): Helper function từ core.js, tự động thêm credentials: 'include'
            const response = await apiFetch(`${API_BASE}/hoadon.php?id=${encodeURIComponent(mahd)}`);
            
            // Kiểm tra response
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            // Parse JSON response
            const hoadon = await response.json();
            
            // Hàm chuyển đổi date từ MySQL format sang date input format
            // date input yêu cầu format: YYYY-MM-DD
            const convertToDateInput = (dateStr) => {
                if (!dateStr) return '';
                try {
                    // Tạo Date object từ chuỗi
                    const date = new Date(dateStr);
                    // Lấy năm, tháng, ngày
                    const year = date.getFullYear();
                    const month = String(date.getMonth() + 1).padStart(2, '0');
                    const day = String(date.getDate()).padStart(2, '0');
                    // Trả về format YYYY-MM-DD
                    return `${year}-${month}-${day}`;
                } catch (e) {
                    return '';
                }
            };
            
            // Điền dữ liệu vào form
            // getElementById: Tìm phần tử theo ID
            // value: Gán giá trị cho input/select
            document.getElementById('hoadon-mahd').value = hoadon.MaHD || '';
            document.getElementById('hoadon-ngaylap').value = convertToDateInput(hoadon.NgayLap);
            document.getElementById('hoadon-sotien').value = hoadon.SoTien || '';
            document.getElementById('hoadon-maphien').value = hoadon.MaPhien || '';
            
        } catch (error) {
            // Xử lý lỗi
            console.error('Error loading hoa don data:', error);
            alert('Không thể tải thông tin hóa đơn. Vui lòng thử lại.');
            closeHoaDonModal();
            return;
        } finally {
            // Ẩn loading indicator
            hideLoading();
        }
    } else {
        // Nếu thêm mới, set ngày lập mặc định là hiện tại
        // new Date(): Tạo đối tượng Date với thời gian hiện tại
        // toISOString(): Chuyển đổi sang chuỗi ISO (YYYY-MM-DDTHH:mm:ss.sssZ)
        // slice(0, 10): Lấy 10 ký tự đầu (YYYY-MM-DD) để phù hợp với date input
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const defaultDate = `${year}-${month}-${day}`;
        
        // Set giá trị mặc định sau khi modal được render
        setTimeout(() => {
            const ngayLapInput = document.getElementById('hoadon-ngaylap');
            if (ngayLapInput) {
                ngayLapInput.value = defaultDate;
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
            closeHoaDonModal();
        }
    };
    
    // Thiết lập sự kiện đóng modal khi nhấn phím ESC
    // keydown: Sự kiện khi nhấn phím
    const handleEscKey = (e) => {
        // key === 'Escape': Kiểm tra xem có phải phím ESC không
        if (e.key === 'Escape') {
            closeHoaDonModal();
            // Xóa event listener sau khi đóng modal
            document.removeEventListener('keydown', handleEscKey);
        }
    };
    
    // Thêm event listener cho phím ESC
    document.addEventListener('keydown', handleEscKey);
    
    // Focus vào ô input đầu tiên (trừ khi đang sửa và mã hóa đơn là readonly)
    if (!isEdit) {
        setTimeout(() => {
            document.getElementById('hoadon-mahd')?.focus();
        }, 100);
    } else {
        setTimeout(() => {
            document.getElementById('hoadon-ngaylap')?.focus();
        }, 100);
    }
}

/**
 * Hàm: closeHoaDonModal()
 * Mô tả: Đóng modal form hóa đơn
 * @return {void} Không trả về giá trị
 * Chức năng: Xóa class 'show' để ẩn modal
 */
function closeHoaDonModal() {
    // Lấy phần tử modal
    const modal = document.getElementById('hoadon-modal');
    
    // Nếu tìm thấy, xóa class 'show' để ẩn modal
    if (modal) {
        modal.classList.remove('show');
    }
}

/**
 * Hàm: saveHoaDon(event)
 * Mô tả: Lưu hóa đơn mới hoặc cập nhật hóa đơn hiện có
 * @param {Event} event - Event object từ form submit
 * @return {Promise<void>} Promise không trả về giá trị
 * Chức năng:
 *   1. Ngăn chặn form submit mặc định
 *   2. Lấy dữ liệu từ form
 *   3. Validate dữ liệu
 *   4. Gọi API POST (thêm mới) hoặc PUT (cập nhật)
 *   5. Reload danh sách và đóng modal
 */
async function saveHoaDon(event) {
    // Ngăn chặn form submit mặc định (tránh reload trang)
    // preventDefault(): Ngăn chặn hành vi mặc định của event
    event.preventDefault();
    
    // Lấy form element
    const form = document.getElementById('hoadon-form');
    
    // Kiểm tra form có tồn tại không
    if (!form) return;
    
    // Lấy các giá trị từ form
    // FormData: API để lấy dữ liệu từ form
    const formData = new FormData(form);
    
    // Tạo object chứa dữ liệu hóa đơn
    // Object.fromEntries(): Chuyển FormData sang object
    const hoadonData = {
        MaHD: formData.get('MaHD')?.trim() || '',                    // Mã hóa đơn (Primary Key)
        NgayLap: formData.get('NgayLap')?.trim() || '',             // Ngày lập (DATE format: YYYY-MM-DD)
        SoTien: formData.get('SoTien') ? parseFloat(formData.get('SoTien')) : 0,  // Số tiền (FLOAT)
        MaPhien: formData.get('MaPhien')?.trim() || ''              // Mã phiên sạc (Foreign Key, UNIQUE)
    };
    
    // Validate dữ liệu
    // Kiểm tra mã hóa đơn không được rỗng
    if (!hoadonData.MaHD) {
        alert('Vui lòng nhập mã hóa đơn');
        document.getElementById('hoadon-mahd')?.focus();
        return;
    }
    
    // Kiểm tra các trường bắt buộc
    if (!hoadonData.NgayLap || !hoadonData.SoTien || !hoadonData.MaPhien) {
        alert('Vui lòng điền đầy đủ thông tin bắt buộc');
        return;
    }
    
    // Kiểm tra số tiền phải lớn hơn 0
    if (hoadonData.SoTien <= 0) {
        alert('Số tiền phải lớn hơn 0');
        document.getElementById('hoadon-sotien')?.focus();
        return;
    }
    
    // Xác định phương thức HTTP và URL
    // Kiểm tra xem có mã hóa đơn trong form không (đang sửa)
    const isEdit = document.getElementById('hoadon-mahd')?.readOnly || false;
    const method = isEdit ? 'PUT' : 'POST';
    const url = `${API_BASE}/hoadon.php`;
    
    // Hiển thị loading indicator
    showLoading();
    
    try {
        // Gọi API để lưu hóa đơn
        // apiFetch(): Helper function từ core.js, tự động thêm credentials: 'include'
        const response = await apiFetch(url, {
            method: method,                    // POST hoặc PUT
            headers: {
                'Content-Type': 'application/json'  // Gửi dữ liệu dạng JSON
            },
            body: JSON.stringify(hoadonData)     // Chuyển object sang JSON string
        });
        
        // Parse JSON response
        const result = await response.json();
        
        // Kiểm tra response
        if (!response.ok) {
            // Nếu có lỗi, hiển thị thông báo
            throw new Error(result.error || 'Có lỗi xảy ra khi lưu hóa đơn');
        }
        
        // Nếu thành công, hiển thị thông báo
        alert(isEdit ? 'Cập nhật hóa đơn thành công!' : 'Thêm hóa đơn thành công!');
        
        // Đóng modal
        closeHoaDonModal();
        
        // Reload danh sách hóa đơn
        await loadHoaDon();
        
    } catch (error) {
        // Xử lý lỗi
        console.error('Error saving hoa don:', error);
        alert(error.message || 'Có lỗi xảy ra khi lưu hóa đơn. Vui lòng thử lại.');
    } finally {
        // Ẩn loading indicator
        hideLoading();
    }
}

/**
 * Hàm: editHoaDon(mahd)
 * Mô tả: Mở modal form để sửa thông tin hóa đơn
 * @param {string} mahd - Mã hóa đơn cần sửa
 * @return {void} Không trả về giá trị
 * Chức năng: Gọi openHoaDonModal() với mã hóa đơn để mở form sửa
 */
function editHoaDon(mahd) {
    // Kiểm tra mã hóa đơn có hợp lệ không
    if (!mahd) {
        alert('Mã hóa đơn không hợp lệ');
        return;
    }
    
    // Mở modal với mã hóa đơn (chế độ sửa)
    openHoaDonModal(mahd);
}

/**
 * Hàm: deleteHoaDon(mahd)
 * Mô tả: Xóa hóa đơn sau khi xác nhận
 * @param {string} mahd - Mã hóa đơn cần xóa
 * @return {Promise<void>} Promise không trả về giá trị
 * Chức năng:
 *   1. Hiển thị dialog xác nhận
 *   2. Nếu xác nhận, gọi API DELETE
 *   3. Reload danh sách sau khi xóa thành công
 */
async function deleteHoaDon(mahd) {
    // Kiểm tra mã hóa đơn có hợp lệ không
    if (!mahd) {
        alert('Mã hóa đơn không hợp lệ');
        return;
    }
    
    // Hiển thị dialog xác nhận
    // confirm(): Hiển thị dialog xác nhận, trả về true nếu OK, false nếu Cancel
    const confirmMessage = `Bạn có chắc chắn muốn xóa hóa đơn "${mahd}"?\n\nLưu ý: Các giao dịch thanh toán liên quan cũng sẽ bị xóa.`;
    
    if (!confirm(confirmMessage)) {
        // Nếu người dùng không xác nhận, dừng lại
        return;
    }
    
    // Hiển thị loading indicator
    showLoading();
    
    try {
        // Gọi API DELETE để xóa hóa đơn
        // encodeURIComponent(): Mã hóa URL để tránh ký tự đặc biệt
        // apiFetch(): Helper function từ core.js, tự động thêm credentials: 'include'
        const response = await apiFetch(`${API_BASE}/hoadon.php?id=${encodeURIComponent(mahd)}`, {
            method: 'DELETE'  // Phương thức DELETE
        });
        
        // Parse JSON response
        const result = await response.json();
        
        // Kiểm tra response
        if (!response.ok) {
            // Nếu có lỗi, hiển thị thông báo
            throw new Error(result.error || 'Có lỗi xảy ra khi xóa hóa đơn');
        }
        
        // Nếu thành công, hiển thị thông báo
        alert('Xóa hóa đơn thành công!');
        
        // Reload danh sách hóa đơn
        await loadHoaDon();
        
    } catch (error) {
        // Xử lý lỗi
        console.error('Error deleting hoa don:', error);
        alert(error.message || 'Có lỗi xảy ra khi xóa hóa đơn. Vui lòng thử lại.');
    } finally {
        // Ẩn loading indicator
        hideLoading();
    }
}

// ============================================
// EXPOSE FUNCTIONS TO WINDOW OBJECT
// ============================================

/**
 * Expose các hàm quản lý hóa đơn ra window object
 * Mục đích: Cho phép gọi các hàm từ HTML onclick attributes
 * 
 * Khi sử dụng onclick="openHoaDonModal()" trong HTML,
 * trình duyệt sẽ tìm hàm trong window scope.
 * Nếu không expose, sẽ báo lỗi "openHoaDonModal is not defined"
 */
/**
 * Hàm: goToThanhToan(mahd)
 * Mô tả: Chuyển sang trang thanh toán và mở modal thanh toán cho hóa đơn cụ thể
 * @param {string} mahd - Mã hóa đơn cần thanh toán
 * @return {Promise<void>} Promise không trả về giá trị
 * Chức năng:
 *   1. Chuyển sang trang thanh toán (trigger navigation)
 *   2. Mở modal thanh toán với thông tin hóa đơn đã điền sẵn
 */
async function goToThanhToan(mahd) {
    // Kiểm tra mã hóa đơn có hợp lệ không
    if (!mahd) {
        alert('Mã hóa đơn không hợp lệ');
        return;
    }
    
    // Chuyển sang trang thanh toán bằng cách trigger click vào menu item
    // Tìm menu item có data-page="thanhtoan"
    const thanhtoanMenuItem = document.querySelector('.nav-item[data-page="thanhtoan"]');
    if (thanhtoanMenuItem) {
        thanhtoanMenuItem.click();
    }
    
    // Đợi một chút để trang thanh toán được load
    // setTimeout: Đợi 500ms để đảm bảo loadThanhToan() đã chạy xong
    setTimeout(async () => {
        // Gọi hàm mở modal thanh toán từ hóa đơn
        // Hàm này sẽ được định nghĩa trong thanhtoan.js
        if (typeof openThanhToanModalForHoaDon === 'function') {
            await openThanhToanModalForHoaDon(mahd);
        } else {
            // Nếu hàm chưa được load, thử lại sau 500ms nữa
            setTimeout(async () => {
                if (typeof openThanhToanModalForHoaDon === 'function') {
                    await openThanhToanModalForHoaDon(mahd);
                } else {
                    alert('Đang tải trang thanh toán. Vui lòng thử lại sau.');
                }
            }, 500);
        }
    }, 500);
}

window.openHoaDonModal = openHoaDonModal;
window.closeHoaDonModal = closeHoaDonModal;
window.saveHoaDon = saveHoaDon;
window.editHoaDon = editHoaDon;
window.deleteHoaDon = deleteHoaDon;
window.filterHoaDon = filterHoaDon;
window.loadHoaDon = loadHoaDon;
window.goToThanhToan = goToThanhToan;

