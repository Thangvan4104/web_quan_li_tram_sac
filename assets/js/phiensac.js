/**
 * File: assets/js/phiensac.js
 * Mô tả: Module JavaScript quản lý trang Phiên Sạc
 * Chức năng: 
 *   - Load và hiển thị danh sách phiên sạc
 *   - Tìm kiếm và lọc phiên sạc (theo mã phiên, cột sạc, phương tiện, trạng thái)
 *   - CRUD operations (Create, Read, Update, Delete)
 *   - Modal form để thêm/sửa phiên sạc với dropdown chọn cột sạc và phương tiện
 *   - Xử lý trạng thái phiên sạc (Đang sạc / Hoàn thành)
 * Tác giả: Hệ thống quản lý trạm sạc
 */

// ============================================
// HÀM LOAD PHIÊN SẠC
// ============================================

/**
 * Hàm: loadPhienSac()
 * Mô tả: Load và hiển thị danh sách phiên sạc với đầy đủ tính năng tìm kiếm và lọc
 * @return {Promise<void>} Promise không trả về giá trị
 * Chức năng:
 *   1. Gọi API lấy danh sách phiên sạc (có thông tin liên quan từ JOIN)
 *   2. Gọi API lấy danh sách cột sạc và phương tiện (để populate dropdown)
 *   3. Tạo HTML với thanh tìm kiếm và bộ lọc
 *   4. Hiển thị danh sách phiên sạc dưới dạng card
 *   5. Thiết lập sự kiện tìm kiếm và lọc
 *   6. Xử lý lỗi nếu có
 */
async function loadPhienSac() {
    // Lấy phần tử container của trang phiên sạc
    // getElementById: Tìm phần tử HTML theo ID
    const pageElement = document.getElementById('phiensac');
    
    // Nếu không tìm thấy thì dừng lại
    // Early return: Tránh xử lý không cần thiết
    if (!pageElement) return;
    
    // Hiển thị loading indicator trong khi đang tải dữ liệu
    showLoading();
    
    try {
        // Gọi API lấy danh sách phiên sạc, cột sạc và phương tiện cùng lúc
        // Promise.all: Chờ tất cả các promise hoàn thành
        const [phiensResponse, cotsResponse, phuongtiensResponse] = await Promise.all([
            // Gọi API lấy danh sách phiên sạc (có thông tin liên quan từ JOIN)
            // apiFetch(): Helper function từ core.js, tự động thêm credentials: 'include'
            apiFetch(`${API_BASE}/phiensac.php`),
            // Gọi API lấy danh sách cột sạc (để populate dropdown)
            apiFetch(`${API_BASE}/cotsac.php`),
            // Gọi API lấy danh sách phương tiện (để populate dropdown)
            apiFetch(`${API_BASE}/phuongtien.php`)
        ]);
        
        // Kiểm tra response của phiên sạc
        if (!phiensResponse.ok) {
            throw new Error(`HTTP error! status: ${phiensResponse.status}`);
        }
        
        // Kiểm tra response của cột sạc
        if (!cotsResponse.ok) {
            throw new Error(`HTTP error! status: ${cotsResponse.status}`);
        }
        
        // Kiểm tra response của phương tiện
        if (!phuongtiensResponse.ok) {
            throw new Error(`HTTP error! status: ${phuongtiensResponse.status}`);
        }
        
        // Parse JSON response
        const phiens = await phiensResponse.json();
        const cots = await cotsResponse.json();
        const phuongtiens = await phuongtiensResponse.json();
        
        // Kiểm tra xem các biến có phải là mảng không
        // Array.isArray(): Kiểm tra xem biến có phải mảng không
        const safePhiens = Array.isArray(phiens) ? phiens : [];
        const safeCots = Array.isArray(cots) ? cots : [];
        const safePhuongtiens = Array.isArray(phuongtiens) ? phuongtiens : [];
        
        // Tạo HTML cho dropdown cột sạc
        // map(): Duyệt qua mảng và tạo option cho mỗi cột sạc
        // join(''): Nối tất cả các option lại với nhau
        const cotOptions = safeCots.map(cot => 
            `<option value="${escapeHtml(cot.MaCot)}">${escapeHtml(cot.MaCot)} - ${escapeHtml(cot.LoaiCongSac || '')} (${escapeHtml(cot.TenTram || '')})</option>`
        ).join('');
        
        // Tạo HTML cho dropdown phương tiện
        const phuongtienOptions = safePhuongtiens.map(pt => 
            `<option value="${escapeHtml(pt.BienSo)}">${escapeHtml(pt.BienSo)} - ${escapeHtml(pt.DongXe || '')} (${escapeHtml(pt.HangXe || '')})</option>`
        ).join('');
        
        // Tạo HTML và gán vào pageElement
        // innerHTML: Gán nội dung HTML vào phần tử
        pageElement.innerHTML = `
            <!-- Header của section với tiêu đề và nút thêm mới -->
            <div class="section-header">
                <h2>Danh Sách Phiên Sạc</h2>
                <!-- Nút thêm phiên sạc mới, onclick sẽ gọi hàm openPhienSacModal() -->
                <button class="btn btn-primary" onclick="openPhienSacModal()">
                    <i class="fas fa-plus"></i> Thêm Phiên Sạc Mới
                </button>
            </div>
            
            <!-- Thanh tìm kiếm và lọc -->
            <div class="filter-section">
                <!-- Ô tìm kiếm -->
                <div class="search-box">
                    <i class="fas fa-search"></i>
                    <!-- 
                        Input tìm kiếm
                        id="phiensac-search": ID để JavaScript có thể truy cập
                        placeholder: Text gợi ý hiển thị khi input trống
                        oninput: Sự kiện khi người dùng nhập, gọi hàm filterPhienSac()
                    -->
                    <input 
                        type="text" 
                        id="phiensac-search" 
                        placeholder="Tìm kiếm theo mã phiên, cột sạc, phương tiện, khách hàng..." 
                        oninput="filterPhienSac()"
                    >
                </div>
                
                <!-- Bộ lọc theo cột sạc -->
                <div class="filter-group">
                    <label for="phiensac-cot-filter">Lọc theo cột sạc:</label>
                    <!-- 
                        Select dropdown để lọc theo cột sạc
                        id="phiensac-cot-filter": ID để JavaScript có thể truy cập
                        onchange: Sự kiện khi người dùng chọn, gọi hàm filterPhienSac()
                    -->
                    <select id="phiensac-cot-filter" onchange="filterPhienSac()">
                        <option value="">Tất cả cột sạc</option>
                        ${cotOptions}
                    </select>
                </div>
                
                <!-- Bộ lọc theo trạng thái -->
                <div class="filter-group">
                    <label for="phiensac-status-filter">Lọc theo trạng thái:</label>
                    <!-- 
                        Select dropdown để lọc theo trạng thái
                        id="phiensac-status-filter": ID để JavaScript có thể truy cập
                        onchange: Sự kiện khi người dùng chọn, gọi hàm filterPhienSac()
                    -->
                    <select id="phiensac-status-filter" onchange="filterPhienSac()">
                        <option value="">Tất cả trạng thái</option>
                        <option value="dang-sac">Đang sạc</option>
                        <option value="hoan-thanh">Hoàn thành</option>
                    </select>
                </div>
            </div>
            
            <!-- Thông báo số lượng kết quả -->
            <div class="results-info">
                <span id="phiensac-count">Hiển thị <strong>${safePhiens.length}</strong> phiên sạc</span>
            </div>
            
            <!-- Grid container chứa các card phiên sạc -->
            <div class="phiensac-grid" id="phiensac-grid">
                ${safePhiens.length > 0 
                    ? safePhiens.map(phien => createPhienSacCard(phien)).join('')
                    : '<div class="empty-state"><i class="fas fa-bolt"></i><h3>Chưa có phiên sạc nào</h3><p>Nhấn nút "Thêm Phiên Sạc Mới" để tạo phiên sạc đầu tiên</p></div>'
                }
            </div>
        `;
        
        // Lưu danh sách phiên sạc, cột sạc và phương tiện vào biến toàn cục để dùng cho tìm kiếm/lọc
        // window.phiensacData: Lưu vào window object để có thể truy cập từ các hàm khác
        window.phiensacData = safePhiens;
        window.phiensacCots = safeCots;  // Lưu danh sách cột sạc để dùng trong modal
        window.phiensacPhuongtiens = safePhuongtiens;  // Lưu danh sách phương tiện để dùng trong modal
        
    } catch (error) {
        // Xử lý lỗi: Hiển thị thông báo lỗi
        // console.error(): In lỗi ra console để debug
        console.error('Error loading phien sac:', error);
        
        // Hiển thị thông báo lỗi trên giao diện
        pageElement.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Không thể tải dữ liệu</h3>
                <p>Đã xảy ra lỗi khi tải danh sách phiên sạc. Vui lòng thử lại sau.</p>
                <button class="btn btn-primary" onclick="loadPhienSac()">
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
 * Hàm: createPhienSacCard(phien)
 * Mô tả: Tạo HTML card cho một phiên sạc với đầy đủ thông tin
 * @param {Object} phien - Đối tượng chứa thông tin phiên sạc (có thể có thông tin liên quan từ JOIN)
 * @return {string} Chuỗi HTML của card phiên sạc
 * Chức năng: 
 *   1. Tạo template HTML để hiển thị thông tin phiên sạc
 *   2. Hiển thị mã phiên, trạng thái, cột sạc, phương tiện, khách hàng
 *   3. Hiển thị thời gian bắt đầu/kết thúc và điện tiêu thụ
 *   4. Thêm các nút hành động (Sửa, Xóa)
 */
function createPhienSacCard(phien) {
    // Xác định trạng thái phiên sạc
    // Nếu ThoiGianKetThuc là NULL hoặc rỗng, phiên sạc đang diễn ra
    // Ngược lại, phiên sạc đã hoàn thành
    const isCompleted = phien.ThoiGianKetThuc && phien.ThoiGianKetThuc.trim() !== '';
    const statusClass = isCompleted ? 'hoan-thanh' : 'dang-sac';
    const statusText = isCompleted ? 'Hoàn thành' : 'Đang sạc';
    
    // Format thời gian để hiển thị
    // new Date(): Tạo đối tượng Date từ chuỗi
    // toLocaleString(): Chuyển đổi sang định dạng ngày giờ địa phương
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
    
    // Trả về HTML template cho card phiên sạc
    // Template string (backtick): Cho phép nhúng biến và xuống dòng
    return `
        <div class="phiensac-card" data-maphien="${escapeHtml(phien.MaPhien)}" data-macot="${escapeHtml(phien.MaCot)}" data-biensopt="${escapeHtml(phien.BienSoPT)}" data-status="${statusClass}">
            <!-- Header của card: Mã phiên và trạng thái -->
            <div class="phiensac-header">
                <div>
                    <!-- Mã phiên sạc (nhỏ, màu xám) -->
                    <div class="phiensac-maphien">${escapeHtml(phien.MaPhien)}</div>
                    <!-- Badge trạng thái với màu sắc tương ứng -->
                    <span class="status-badge ${statusClass}">${statusText}</span>
                </div>
            </div>
            <!-- Thông tin chi tiết của phiên sạc -->
            <div class="phiensac-info">
                <!-- Thông tin cột sạc -->
                ${phien.LoaiCongSac ? `
                <div class="phiensac-info-item">
                    <i class="fas fa-plug"></i>
                    <span>Cột sạc: ${escapeHtml(phien.MaCot)} - ${escapeHtml(phien.LoaiCongSac)}</span>
                </div>
                ` : `
                <div class="phiensac-info-item">
                    <i class="fas fa-plug"></i>
                    <span>Cột sạc: ${escapeHtml(phien.MaCot)}</span>
                </div>
                `}
                <!-- Thông tin phương tiện -->
                ${phien.DongXe ? `
                <div class="phiensac-info-item">
                    <i class="fas fa-car"></i>
                    <span>Phương tiện: ${escapeHtml(phien.BienSoPT)} - ${escapeHtml(phien.DongXe)} (${escapeHtml(phien.HangXe || '')})</span>
                </div>
                ` : `
                <div class="phiensac-info-item">
                    <i class="fas fa-car"></i>
                    <span>Phương tiện: ${escapeHtml(phien.BienSoPT)}</span>
                </div>
                `}
                <!-- Thông tin khách hàng -->
                ${phien.TenKhachHang ? `
                <div class="phiensac-info-item">
                    <i class="fas fa-user"></i>
                    <span>Khách hàng: ${escapeHtml(phien.TenKhachHang)}</span>
                </div>
                ` : ''}
                <!-- Thông tin hóa đơn -->
                ${phien.MaHD && phien.SoTien ? `
                <div class="phiensac-info-item">
                    <i class="fas fa-receipt"></i>
                    <span>Hóa đơn: ${escapeHtml(phien.MaHD)} - ${parseFloat(phien.SoTien).toLocaleString('vi-VN')} VNĐ</span>
                </div>
                ` : ''}
            </div>
            <!-- Thông tin thời gian -->
            <div class="phiensac-time">
                <!-- Thời gian bắt đầu -->
                <div class="phiensac-time-item">
                    <i class="fas fa-play-circle"></i>
                    <span>Bắt đầu: ${formatDateTime(phien.ThoiGianBatDau)}</span>
                </div>
                <!-- Thời gian kết thúc -->
                ${isCompleted ? `
                <div class="phiensac-time-item">
                    <i class="fas fa-stop-circle"></i>
                    <span>Kết thúc: ${formatDateTime(phien.ThoiGianKetThuc)}</span>
                </div>
                ` : `
                <div class="phiensac-time-item">
                    <i class="fas fa-clock"></i>
                    <span>Đang sạc...</span>
                </div>
                `}
                <!-- Điện tiêu thụ -->
                ${phien.DienTieuThu ? `
                <div class="phiensac-dientieuthu">
                    <i class="fas fa-bolt"></i>
                    Điện tiêu thụ: ${parseFloat(phien.DienTieuThu).toFixed(2)} kWh
                </div>
                ` : ''}
            </div>
            <!-- Các nút hành động: Sửa và Xóa -->
            <div class="phiensac-actions">
                <!-- Nút Sửa: Gọi hàm editPhienSac() với mã phiên -->
                <button class="btn btn-success btn-sm" onclick="editPhienSac('${escapeHtml(phien.MaPhien)}')" title="Sửa thông tin phiên sạc">
                    <i class="fas fa-edit"></i> Sửa
                </button>
                <!-- Nút Xóa: Gọi hàm deletePhienSac() với mã phiên -->
                <button class="btn btn-danger btn-sm" onclick="deletePhienSac('${escapeHtml(phien.MaPhien)}')" title="Xóa phiên sạc">
                    <i class="fas fa-trash"></i> Xóa
                </button>
            </div>
        </div>
    `;
}

// ============================================
// HÀM TÌM KIẾM VÀ LỌC
// ============================================

/**
 * Hàm: filterPhienSac()
 * Mô tả: Tìm kiếm và lọc danh sách phiên sạc theo từ khóa, cột sạc và trạng thái
 * @return {void} Không trả về giá trị
 * Chức năng:
 *   1. Lấy giá trị từ ô tìm kiếm và các dropdown lọc
 *   2. Lọc danh sách phiên sạc theo điều kiện
 *   3. Cập nhật lại giao diện với kết quả đã lọc
 */
function filterPhienSac() {
    // Lấy danh sách phiên sạc từ biến toàn cục
    // window.phiensacData: Dữ liệu đã được lưu khi load trang
    const allPhiens = window.phiensacData || [];
    
    // Lấy giá trị từ ô tìm kiếm
    // getElementById: Tìm phần tử HTML theo ID
    // value: Lấy giá trị nhập vào input
    // toLowerCase(): Chuyển sang chữ thường để tìm kiếm không phân biệt hoa thường
    // trim(): Xóa khoảng trắng ở đầu và cuối
    const searchTerm = (document.getElementById('phiensac-search')?.value || '').toLowerCase().trim();
    
    // Lấy giá trị từ các dropdown lọc
    const cotFilter = document.getElementById('phiensac-cot-filter')?.value || '';
    const statusFilter = document.getElementById('phiensac-status-filter')?.value || '';
    
    // Lọc danh sách phiên sạc theo điều kiện
    // filter(): Tạo mảng mới chứa các phần tử thỏa mãn điều kiện
    const filteredPhiens = allPhiens.filter(phien => {
        // Xác định trạng thái phiên sạc
        const isCompleted = phien.ThoiGianKetThuc && phien.ThoiGianKetThuc.trim() !== '';
        const phienStatus = isCompleted ? 'hoan-thanh' : 'dang-sac';
        
        // Kiểm tra điều kiện tìm kiếm
        // includes(): Kiểm tra xem chuỗi có chứa từ khóa không
        const matchesSearch = !searchTerm || 
            (phien.MaPhien && phien.MaPhien.toLowerCase().includes(searchTerm)) ||
            (phien.MaCot && phien.MaCot.toLowerCase().includes(searchTerm)) ||
            (phien.BienSoPT && phien.BienSoPT.toLowerCase().includes(searchTerm)) ||
            (phien.DongXe && phien.DongXe.toLowerCase().includes(searchTerm)) ||
            (phien.TenKhachHang && phien.TenKhachHang.toLowerCase().includes(searchTerm)) ||
            (phien.LoaiCongSac && phien.LoaiCongSac.toLowerCase().includes(searchTerm));
        
        // Kiểm tra điều kiện lọc cột sạc
        // Nếu không chọn cột sạc (rỗng) thì hiển thị tất cả
        const matchesCot = !cotFilter || phien.MaCot === cotFilter;
        
        // Kiểm tra điều kiện lọc trạng thái
        const matchesStatus = !statusFilter || phienStatus === statusFilter;
        
        // Trả về true nếu tất cả điều kiện đều thỏa mãn
        return matchesSearch && matchesCot && matchesStatus;
    });
    
    // Lấy container grid để hiển thị kết quả
    const gridContainer = document.getElementById('phiensac-grid');
    
    // Lấy phần tử hiển thị số lượng kết quả
    const countElement = document.getElementById('phiensac-count');
    
    // Kiểm tra xem các phần tử có tồn tại không
    if (!gridContainer) return;
    
    // Cập nhật số lượng kết quả
    if (countElement) {
        countElement.innerHTML = `Hiển thị <strong>${filteredPhiens.length}</strong> phiên sạc`;
    }
    
    // Cập nhật nội dung grid với kết quả đã lọc
    if (filteredPhiens.length > 0) {
        // Tạo HTML cho từng card phiên sạc và nối lại
        // map(): Duyệt qua mảng và tạo HTML cho mỗi phần tử
        // join(''): Nối tất cả các chuỗi HTML lại với nhau
        gridContainer.innerHTML = filteredPhiens.map(phien => createPhienSacCard(phien)).join('');
    } else {
        // Nếu không có kết quả, hiển thị thông báo trống
        gridContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-search"></i>
                <h3>Không tìm thấy phiên sạc nào</h3>
                <p>Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc</p>
            </div>
        `;
    }
}

// ============================================
// HÀM CRUD OPERATIONS
// ============================================

/**
 * Hàm: openPhienSacModal(maphien)
 * Mô tả: Mở modal form để thêm mới hoặc sửa phiên sạc
 * @param {string|null} maphien - Mã phiên sạc cần sửa (null nếu thêm mới)
 * @return {Promise<void>} Promise không trả về giá trị
 * Chức năng:
 *   1. Tạo hoặc cập nhật modal form
 *   2. Populate dropdown cột sạc và phương tiện
 *   3. Nếu có maphien, load dữ liệu phiên sạc vào form
 *   4. Hiển thị modal
 */
async function openPhienSacModal(maphien = null) {
    // Kiểm tra xem modal đã tồn tại chưa
    let modal = document.getElementById('phiensac-modal');
    
    // Nếu chưa tồn tại, tạo modal mới
    if (!modal) {
        // Tạo phần tử div cho modal
        modal = document.createElement('div');
        modal.id = 'phiensac-modal';
        modal.className = 'modal';
        
        // Thêm modal vào body
        document.body.appendChild(modal);
    }
    
    // Xác định tiêu đề modal (Thêm mới hoặc Sửa)
    const isEdit = maphien !== null;
    const modalTitle = isEdit ? 'Sửa Phiên Sạc' : 'Thêm Phiên Sạc Mới';
    
    // Lấy danh sách cột sạc và phương tiện từ biến toàn cục hoặc gọi API
    let cots = window.phiensacCots || [];
    let phuongtiens = window.phiensacPhuongtiens || [];
    
    // Nếu chưa có danh sách, gọi API để lấy
    if (cots.length === 0 || phuongtiens.length === 0) {
        try {
            const [cotsResponse, phuongtiensResponse] = await Promise.all([
                // apiFetch(): Helper function từ core.js, tự động thêm credentials: 'include'
                apiFetch(`${API_BASE}/cotsac.php`),
                apiFetch(`${API_BASE}/phuongtien.php`)
            ]);
            
            if (cotsResponse.ok) {
                cots = await cotsResponse.json();
                window.phiensacCots = cots;
            }
            
            if (phuongtiensResponse.ok) {
                phuongtiens = await phuongtiensResponse.json();
                window.phiensacPhuongtiens = phuongtiens;
            }
        } catch (error) {
            console.error('Error loading data:', error);
        }
    }
    
    // Tạo HTML cho dropdown cột sạc
    const cotOptions = cots.map(cot => 
        `<option value="${escapeHtml(cot.MaCot)}">${escapeHtml(cot.MaCot)} - ${escapeHtml(cot.LoaiCongSac || '')} (${escapeHtml(cot.TenTram || '')})</option>`
    ).join('');
    
    // Tạo HTML cho dropdown phương tiện
    const phuongtienOptions = phuongtiens.map(pt => 
        `<option value="${escapeHtml(pt.BienSo)}">${escapeHtml(pt.BienSo)} - ${escapeHtml(pt.DongXe || '')} (${escapeHtml(pt.HangXe || '')})</option>`
    ).join('');
    
    // Tạo nội dung modal với form
    modal.innerHTML = `
        <div class="modal-content">
            <!-- Header của modal -->
            <div class="modal-header">
                <h2>${modalTitle}</h2>
                <!-- Nút đóng modal -->
                <span class="close" onclick="closePhienSacModal()">&times;</span>
            </div>
            
            <!-- Form nhập liệu -->
            <form id="phiensac-form" onsubmit="savePhienSac(event)">
                <!-- Mã phiên sạc (chỉ hiển thị khi sửa, disabled khi thêm mới) -->
                <div class="form-group">
                    <label for="phiensac-maphien">Mã Phiên Sạc <span class="required">*</span></label>
                    <input 
                        type="text" 
                        id="phiensac-maphien" 
                        name="MaPhien" 
                        required 
                        maxlength="5"
                        ${isEdit ? 'readonly' : ''}
                        placeholder="VD: PS001"
                        title="Mã phiên sạc gồm 5 ký tự (VD: PS001)"
                    >
                    <small class="form-hint">Mã phiên sạc gồm 5 ký tự (VD: PS001)</small>
                </div>
                
                <!-- Cột sạc (dropdown) -->
                <div class="form-group">
                    <label for="phiensac-macot">Cột Sạc <span class="required">*</span></label>
                    <select id="phiensac-macot" name="MaCot" required>
                        <option value="">-- Chọn cột sạc --</option>
                        ${cotOptions}
                    </select>
                </div>
                
                <!-- Phương tiện (dropdown) -->
                <div class="form-group">
                    <label for="phiensac-biensopt">Phương Tiện <span class="required">*</span></label>
                    <select id="phiensac-biensopt" name="BienSoPT" required>
                        <option value="">-- Chọn phương tiện --</option>
                        ${phuongtienOptions}
                    </select>
                </div>
                
                <!-- Thời gian bắt đầu -->
                <div class="form-group">
                    <label for="phiensac-thoigianbatdau">Thời Gian Bắt Đầu <span class="required">*</span></label>
                    <input 
                        type="datetime-local" 
                        id="phiensac-thoigianbatdau" 
                        name="ThoiGianBatDau" 
                        required
                    >
                    <small class="form-hint">Thời gian bắt đầu phiên sạc</small>
                </div>
                
                <!-- Thời gian kết thúc (không bắt buộc) -->
                <div class="form-group">
                    <label for="phiensac-thoigianketthuc">Thời Gian Kết Thúc</label>
                    <input 
                        type="datetime-local" 
                        id="phiensac-thoigianketthuc" 
                        name="ThoiGianKetThuc"
                    >
                    <small class="form-hint">Thời gian kết thúc phiên sạc (để trống nếu đang sạc)</small>
                </div>
                
                <!-- Điện tiêu thụ (không bắt buộc) -->
                <div class="form-group">
                    <label for="phiensac-dientieuthu">Điện Tiêu Thụ (kWh)</label>
                    <input 
                        type="number" 
                        id="phiensac-dientieuthu" 
                        name="DienTieuThu" 
                        step="0.01"
                        min="0"
                        placeholder="VD: 33.5"
                    >
                    <small class="form-hint">Lượng điện tiêu thụ tính bằng kWh</small>
                </div>
                
                <!-- Các nút hành động -->
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="closePhienSacModal()">
                        <i class="fas fa-times"></i> Hủy
                    </button>
                    <button type="submit" class="btn btn-primary">
                        <i class="fas fa-save"></i> ${isEdit ? 'Cập nhật' : 'Thêm mới'}
                    </button>
                </div>
            </form>
        </div>
    `;
    
    // Nếu đang sửa, load dữ liệu phiên sạc vào form
    if (isEdit && maphien) {
        // Hiển thị loading indicator
        showLoading();
        
        try {
            // Gọi API lấy thông tin phiên sạc
            // apiFetch(): Helper function từ core.js, tự động thêm credentials: 'include'
            const response = await apiFetch(`${API_BASE}/phiensac.php?id=${encodeURIComponent(maphien)}`);
            
            // Kiểm tra response
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            // Parse JSON response
            const phien = await response.json();
            
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
            document.getElementById('phiensac-maphien').value = phien.MaPhien || '';
            document.getElementById('phiensac-macot').value = phien.MaCot || '';
            document.getElementById('phiensac-biensopt').value = phien.BienSoPT || '';
            document.getElementById('phiensac-thoigianbatdau').value = convertToLocalDateTime(phien.ThoiGianBatDau);
            document.getElementById('phiensac-thoigianketthuc').value = convertToLocalDateTime(phien.ThoiGianKetThuc);
            document.getElementById('phiensac-dientieuthu').value = phien.DienTieuThu || '';
            
        } catch (error) {
            // Xử lý lỗi
            console.error('Error loading phien sac data:', error);
            alert('Không thể tải thông tin phiên sạc. Vui lòng thử lại.');
            closePhienSacModal();
            return;
        } finally {
            // Ẩn loading indicator
            hideLoading();
        }
    } else {
        // Nếu thêm mới, set thời gian bắt đầu mặc định là hiện tại
        // new Date(): Tạo đối tượng Date với thời gian hiện tại
        // toISOString(): Chuyển đổi sang chuỗi ISO (YYYY-MM-DDTHH:mm:ss.sssZ)
        // slice(0, 16): Lấy 16 ký tự đầu (YYYY-MM-DDTHH:mm) để phù hợp với datetime-local
        const now = new Date();
        // Điều chỉnh timezone: Lấy giờ địa phương
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const defaultDateTime = `${year}-${month}-${day}T${hours}:${minutes}`;
        
        // Set giá trị mặc định sau khi modal được render
        setTimeout(() => {
            const batDauInput = document.getElementById('phiensac-thoigianbatdau');
            if (batDauInput) {
                batDauInput.value = defaultDateTime;
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
            closePhienSacModal();
        }
    };
    
    // Thiết lập sự kiện đóng modal khi nhấn phím ESC
    // keydown: Sự kiện khi nhấn phím
    const handleEscKey = (e) => {
        // key === 'Escape': Kiểm tra xem có phải phím ESC không
        if (e.key === 'Escape') {
            closePhienSacModal();
            // Xóa event listener sau khi đóng modal
            document.removeEventListener('keydown', handleEscKey);
        }
    };
    
    // Thêm event listener cho phím ESC
    document.addEventListener('keydown', handleEscKey);
    
    // Focus vào ô input đầu tiên (trừ khi đang sửa và mã phiên là readonly)
    if (!isEdit) {
        setTimeout(() => {
            document.getElementById('phiensac-maphien')?.focus();
        }, 100);
    } else {
        setTimeout(() => {
            document.getElementById('phiensac-macot')?.focus();
        }, 100);
    }
}

/**
 * Hàm: closePhienSacModal()
 * Mô tả: Đóng modal form phiên sạc
 * @return {void} Không trả về giá trị
 * Chức năng: Xóa class 'show' để ẩn modal
 */
function closePhienSacModal() {
    // Lấy phần tử modal
    const modal = document.getElementById('phiensac-modal');
    
    // Nếu tìm thấy, xóa class 'show' để ẩn modal
    if (modal) {
        modal.classList.remove('show');
    }
}

/**
 * Hàm: savePhienSac(event)
 * Mô tả: Lưu phiên sạc mới hoặc cập nhật phiên sạc hiện có
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
async function savePhienSac(event) {
    // Ngăn chặn form submit mặc định (tránh reload trang)
    // preventDefault(): Ngăn chặn hành vi mặc định của event
    event.preventDefault();
    
    // Lấy form element
    const form = document.getElementById('phiensac-form');
    
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
    
    // Tạo object chứa dữ liệu phiên sạc
    // Object.fromEntries(): Chuyển FormData sang object
    const phienData = {
        MaPhien: formData.get('MaPhien')?.trim() || '',                    // Mã phiên sạc (Primary Key)
        MaCot: formData.get('MaCot')?.trim() || '',                      // Mã cột sạc
        BienSoPT: formData.get('BienSoPT')?.trim() || '',                // Biển số phương tiện
        ThoiGianBatDau: convertToMySQLDateTime(formData.get('ThoiGianBatDau')),  // Thời gian bắt đầu
        ThoiGianKetThuc: convertToMySQLDateTime(formData.get('ThoiGianKetThuc')) || null,  // Thời gian kết thúc (có thể NULL)
        DienTieuThu: formData.get('DienTieuThu') ? parseFloat(formData.get('DienTieuThu')) : null  // Điện tiêu thụ (có thể NULL)
    };
    
    // Validate dữ liệu
    // Kiểm tra mã phiên không được rỗng
    if (!phienData.MaPhien) {
        alert('Vui lòng nhập mã phiên sạc');
        document.getElementById('phiensac-maphien')?.focus();
        return;
    }
    
    // Kiểm tra các trường bắt buộc
    if (!phienData.MaCot || !phienData.BienSoPT || !phienData.ThoiGianBatDau) {
        alert('Vui lòng điền đầy đủ thông tin bắt buộc');
        return;
    }
    
    // Xác định phương thức HTTP và URL
    // Kiểm tra xem có mã phiên trong form không (đang sửa)
    const isEdit = document.getElementById('phiensac-maphien')?.readOnly || false;
    const method = isEdit ? 'PUT' : 'POST';
    const url = `${API_BASE}/phiensac.php`;
    
    // Hiển thị loading indicator
    showLoading();
    
    try {
        // Gọi API để lưu phiên sạc
        // apiFetch(): Helper function từ core.js, tự động thêm credentials: 'include'
        const response = await apiFetch(url, {
            method: method,                    // POST hoặc PUT
            headers: {
                'Content-Type': 'application/json'  // Gửi dữ liệu dạng JSON
            },
            body: JSON.stringify(phienData)     // Chuyển object sang JSON string
        });
        
        // Parse JSON response
        const result = await response.json();
        
        // Kiểm tra response
        if (!response.ok) {
            // Nếu có lỗi, hiển thị thông báo
            throw new Error(result.error || 'Có lỗi xảy ra khi lưu phiên sạc');
        }
        
        // Nếu thành công, hiển thị thông báo
        alert(isEdit ? 'Cập nhật phiên sạc thành công!' : 'Thêm phiên sạc thành công!');
        
        // Đóng modal
        closePhienSacModal();
        
        // Reload danh sách phiên sạc
        await loadPhienSac();
        
    } catch (error) {
        // Xử lý lỗi
        console.error('Error saving phien sac:', error);
        alert(error.message || 'Có lỗi xảy ra khi lưu phiên sạc. Vui lòng thử lại.');
    } finally {
        // Ẩn loading indicator
        hideLoading();
    }
}

/**
 * Hàm: editPhienSac(maphien)
 * Mô tả: Mở modal form để sửa thông tin phiên sạc
 * @param {string} maphien - Mã phiên sạc cần sửa
 * @return {void} Không trả về giá trị
 * Chức năng: Gọi openPhienSacModal() với mã phiên để mở form sửa
 */
function editPhienSac(maphien) {
    // Kiểm tra mã phiên có hợp lệ không
    if (!maphien) {
        alert('Mã phiên sạc không hợp lệ');
        return;
    }
    
    // Mở modal với mã phiên (chế độ sửa)
    openPhienSacModal(maphien);
}

/**
 * Hàm: deletePhienSac(maphien)
 * Mô tả: Xóa phiên sạc sau khi xác nhận
 * @param {string} maphien - Mã phiên sạc cần xóa
 * @return {Promise<void>} Promise không trả về giá trị
 * Chức năng:
 *   1. Hiển thị dialog xác nhận
 *   2. Nếu xác nhận, gọi API DELETE
 *   3. Reload danh sách sau khi xóa thành công
 */
async function deletePhienSac(maphien) {
    // Kiểm tra mã phiên có hợp lệ không
    if (!maphien) {
        alert('Mã phiên sạc không hợp lệ');
        return;
    }
    
    // Hiển thị dialog xác nhận
    // confirm(): Hiển thị dialog xác nhận, trả về true nếu OK, false nếu Cancel
    const confirmMessage = `Bạn có chắc chắn muốn xóa phiên sạc "${maphien}"?\n\nLưu ý: Hóa đơn liên quan cũng sẽ bị xóa.`;
    
    if (!confirm(confirmMessage)) {
        // Nếu người dùng không xác nhận, dừng lại
        return;
    }
    
    // Hiển thị loading indicator
    showLoading();
    
    try {
        // Gọi API DELETE để xóa phiên sạc
        // encodeURIComponent(): Mã hóa URL để tránh ký tự đặc biệt
        // apiFetch(): Helper function từ core.js, tự động thêm credentials: 'include'
        const response = await apiFetch(`${API_BASE}/phiensac.php?id=${encodeURIComponent(maphien)}`, {
            method: 'DELETE'  // Phương thức DELETE
        });
        
        // Parse JSON response
        const result = await response.json();
        
        // Kiểm tra response
        if (!response.ok) {
            // Nếu có lỗi, hiển thị thông báo
            throw new Error(result.error || 'Có lỗi xảy ra khi xóa phiên sạc');
        }
        
        // Nếu thành công, hiển thị thông báo
        alert('Xóa phiên sạc thành công!');
        
        // Reload danh sách phiên sạc
        await loadPhienSac();
        
    } catch (error) {
        // Xử lý lỗi
        console.error('Error deleting phien sac:', error);
        alert(error.message || 'Có lỗi xảy ra khi xóa phiên sạc. Vui lòng thử lại.');
    } finally {
        // Ẩn loading indicator
        hideLoading();
    }
}

/**
 * Hàm: openPhienSacModalWithPhuongTien(biensopt)
 * Mô tả: Mở modal phiên sạc với phương tiện đã chọn và thời gian bắt đầu là hiện tại
 * @param {string} biensopt - Biển số phương tiện đã chọn
 * @return {Promise<void>} Promise không trả về giá trị
 * Chức năng:
 *   1. Mở modal phiên sạc
 *   2. Set phương tiện đã chọn
 *   3. Set thời gian bắt đầu là hiện tại
 */
async function openPhienSacModalWithPhuongTien(biensopt) {
    // Mở modal phiên sạc thông thường
    await openPhienSacModal();
    
    // Đợi modal được render xong
    setTimeout(() => {
        // Set phương tiện đã chọn
        const biensoSelect = document.getElementById('phiensac-biensopt');
        if (biensoSelect && biensopt) {
            biensoSelect.value = biensopt;
        }
        
        // Set thời gian bắt đầu là hiện tại
        const thoigianbatdauInput = document.getElementById('phiensac-thoigianbatdau');
        if (thoigianbatdauInput) {
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            const defaultDateTime = `${year}-${month}-${day}T${hours}:${minutes}`;
            thoigianbatdauInput.value = defaultDateTime;
        }
    }, 300);
}

// ============================================
// EXPOSE FUNCTIONS TO WINDOW OBJECT
// ============================================

/**
 * Expose các hàm quản lý phiên sạc ra window object
 * Mục đích: Cho phép gọi các hàm từ HTML onclick attributes
 * 
 * Khi sử dụng onclick="openPhienSacModal()" trong HTML,
 * trình duyệt sẽ tìm hàm trong window scope.
 * Nếu không expose, sẽ báo lỗi "openPhienSacModal is not defined"
 */
window.openPhienSacModal = openPhienSacModal;
window.closePhienSacModal = closePhienSacModal;
window.savePhienSac = savePhienSac;
window.editPhienSac = editPhienSac;
window.deletePhienSac = deletePhienSac;
window.filterPhienSac = filterPhienSac;
window.loadPhienSac = loadPhienSac;
window.openPhienSacModalWithPhuongTien = openPhienSacModalWithPhuongTien;

