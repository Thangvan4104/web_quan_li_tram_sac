/**
 * File: assets/js/tramsac.js
 * Mô tả: Module JavaScript quản lý trang Trạm Sạc
 * Chức năng: 
 *   - Load và hiển thị danh sách trạm sạc
 *   - Tìm kiếm và lọc trạm sạc
 *   - CRUD operations (Create, Read, Update, Delete)
 *   - Modal form để thêm/sửa trạm sạc
 * Tác giả: Hệ thống quản lý trạm sạc
 */

// ============================================
// HÀM LOAD TRẠM SẠC
// ============================================

/**
 * Hàm: loadTramSac()
 * Mô tả: Load và hiển thị danh sách trạm sạc với đầy đủ tính năng tìm kiếm và lọc
 * @return {Promise<void>} Promise không trả về giá trị
 * Chức năng:
 *   1. Gọi API lấy danh sách trạm sạc
 *   2. Tạo HTML với thanh tìm kiếm và bộ lọc
 *   3. Hiển thị danh sách trạm sạc dưới dạng card
 *   4. Thiết lập sự kiện tìm kiếm và lọc
 *   5. Xử lý lỗi nếu có
 */
async function loadTramSac() {
    // Lấy phần tử container của trang trạm sạc
    // getElementById: Tìm phần tử HTML theo ID
    const pageElement = document.getElementById('tramsac');
    
    // Nếu không tìm thấy thì dừng lại
    // Early return: Tránh xử lý không cần thiết
    if (!pageElement) return;
    
    // Hiển thị loading indicator trong khi đang tải dữ liệu
    showLoading();
    
    try {
        // Gọi API lấy danh sách trạm sạc
        // apiFetch(): Helper function từ core.js, tự động thêm credentials: 'include'
        // await: Chờ response trả về trước khi tiếp tục
        const response = await apiFetch(`${API_BASE}/tramsac.php`);
        
        // Kiểm tra xem response có thành công không
        // ok: Thuộc tính của Response object, true nếu status 200-299
        if (!response.ok) {
            // Nếu không thành công, throw error để vào catch block
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        // Chuyển đổi response sang JSON
        // json(): Phương thức của Response object để parse JSON
        const trams = await response.json();
        
        // Kiểm tra xem trams có phải là mảng không
        // Array.isArray(): Kiểm tra xem biến có phải mảng không
        const safeTrams = Array.isArray(trams) ? trams : [];
        
        // Kiểm tra xem user có phải admin không
        const isAdminUser = typeof isAdmin === 'function' ? isAdmin() : false;
        
        // Tạo HTML và gán vào pageElement
        // innerHTML: Gán nội dung HTML vào phần tử
        pageElement.innerHTML = `
            <!-- Header của section với tiêu đề và nút thêm mới -->
            <div class="section-header">
                <h2>${isAdminUser ? 'Danh Sách Trạm Sạc' : 'Thông Tin Trạm Sạc'}</h2>
                <!-- Nút thêm trạm mới, chỉ hiển thị cho admin -->
                ${isAdminUser ? `
                <button class="btn btn-primary" onclick="openTramSacModal()">
                    <i class="fas fa-plus"></i> Thêm Trạm Mới
                </button>
                ` : ''}
            </div>
            
            ${isAdminUser ? `
            <!-- Thanh tìm kiếm và lọc (chỉ cho admin) -->
            <div class="filter-section">
                <!-- Ô tìm kiếm -->
                <div class="search-box">
                    <i class="fas fa-search"></i>
                    <!-- 
                        Input tìm kiếm
                        id="tramsac-search": ID để JavaScript có thể truy cập
                        placeholder: Text gợi ý hiển thị khi input trống
                        oninput: Sự kiện khi người dùng nhập, gọi hàm filterTramSac()
                    -->
                    <input 
                        type="text" 
                        id="tramsac-search" 
                        placeholder="Tìm kiếm theo tên, địa chỉ, thành phố..." 
                        oninput="filterTramSac()"
                    >
                </div>
                
                <!-- Bộ lọc theo trạng thái -->
                <div class="filter-group">
                    <label for="tramsac-status-filter">Lọc theo trạng thái:</label>
                    <!-- 
                        Select dropdown để lọc
                        id="tramsac-status-filter": ID để JavaScript có thể truy cập
                        onchange: Sự kiện khi người dùng chọn, gọi hàm filterTramSac()
                    -->
                    <select id="tramsac-status-filter" onchange="filterTramSac()">
                        <option value="">Tất cả</option>
                        <option value="Hoạt động">Hoạt động</option>
                        <option value="Bảo trì">Bảo trì</option>
                        <option value="Ngừng hoạt động">Ngừng hoạt động</option>
                    </select>
                </div>
            </div>
            
            <!-- Thông báo số lượng kết quả -->
            <div class="results-info">
                <span id="tramsac-count">Hiển thị <strong>${safeTrams.length}</strong> trạm sạc</span>
            </div>
            ` : ''}
            
            <!-- Grid container chứa các card trạm sạc (admin) hoặc detail view (staff) -->
            ${isAdminUser ? `
            <div class="stations-grid" id="tramsac-grid">
                ${safeTrams.length > 0 
                    ? safeTrams.map(tram => createTramSacCard(tram)).join('')
                    : '<div class="empty-state"><i class="fas fa-building"></i><h3>Chưa có trạm sạc nào</h3><p>Nhấn nút "Thêm Trạm Mới" để tạo trạm sạc đầu tiên</p></div>'
                }
            </div>
            ` : `
            <!-- Detail view cho nhân viên -->
            <div id="tramsac-detail">
                ${safeTrams.length > 0 
                    ? '<div class="loading-detail">Đang tải thông tin chi tiết...</div>'
                    : '<div class="empty-state"><i class="fas fa-building"></i><h3>Chưa có trạm sạc nào</h3><p>Bạn chưa được phân về trạm nào</p></div>'
                }
            </div>
            `}
        `;
        
        // Nếu là staff và có trạm, load detail view
        if (!isAdminUser && safeTrams.length > 0) {
            loadTramSacDetailView(safeTrams[0]);
        }
        
        // Lưu danh sách trạm sạc vào biến toàn cục để dùng cho tìm kiếm/lọc
        // window.tramsacData: Lưu vào window object để có thể truy cập từ các hàm khác
        window.tramsacData = safeTrams;
        
    } catch (error) {
        // Xử lý lỗi: Hiển thị thông báo lỗi
        // console.error(): In lỗi ra console để debug
        console.error('Error loading tram sac:', error);
        
        // Hiển thị thông báo lỗi trên giao diện
        pageElement.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Không thể tải dữ liệu</h3>
                <p>Đã xảy ra lỗi khi tải danh sách trạm sạc. Vui lòng thử lại sau.</p>
                <button class="btn btn-primary" onclick="loadTramSac()">
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
 * Hàm: createTramSacCard(tram)
 * Mô tả: Tạo HTML card cho một trạm sạc với đầy đủ thông tin
 * @param {Object} tram - Đối tượng chứa thông tin trạm sạc
 * @return {string} Chuỗi HTML của card trạm sạc
 * Chức năng: 
 *   1. Tạo template HTML để hiển thị thông tin trạm sạc
 *   2. Hiển thị tên, địa chỉ, thành phố, số cột sạc, trạng thái
 *   3. Thêm các nút hành động (Sửa, Xóa)
 */
/**
 * Hàm: loadTramSacDetailView(tram)
 * Mô tả: Load và hiển thị chi tiết trạm sạc (dành cho nhân viên)
 * @param {Object} tram - Đối tượng chứa thông tin trạm sạc
 * @return {Promise<void>} Promise không trả về giá trị
 * Chức năng: 
 *   1. Load thông tin chi tiết (cột sạc, nhân viên)
 *   2. Tạo layout chi tiết với các section rõ ràng
 *   3. Hiển thị đầy đủ thông tin trạm sạc
 */
async function loadTramSacDetailView(tram) {
    const detailContainer = document.getElementById('tramsac-detail');
    if (!detailContainer) return;
    
    try {
        // Xác định class CSS cho badge trạng thái
        let statusClass = 'maintenance';
        if (tram.TrangThai === 'Hoạt động') {
            statusClass = 'active';
        } else if (tram.TrangThai === 'Ngừng hoạt động') {
            statusClass = 'inactive';
        }

        // Chuẩn hóa các giá trị thống kê
        const soCotSac = typeof tram.SoCotSac !== 'undefined' && tram.SoCotSac !== null ? tram.SoCotSac : 0;
        const soNhanVien = typeof tram.SoNhanVien !== 'undefined' && tram.SoNhanVien !== null ? tram.SoNhanVien : 0;
        const loaiCotSac = tram.LoaiCotSac ? tram.LoaiCotSac : 'Chưa có dữ liệu';
        const quanLyTram = tram.QuanLyTram ? tram.QuanLyTram : 'Chưa phân công';
        
        // Lấy danh sách cột sạc và nhân viên
        let cotsList = [];
        let nhanVienList = [];
        
        try {
            const [cotsRes, nvRes] = await Promise.all([
                apiFetch(`${API_BASE}/cotsac.php?matram=${encodeURIComponent(tram.MaTram)}`),
                apiFetch(`${API_BASE}/nhanvien.php?matram=${encodeURIComponent(tram.MaTram)}`)
            ]);
            
            const cotsData = await cotsRes.json();
            const nvData = await nvRes.json();
            
            cotsList = Array.isArray(cotsData) ? cotsData : [];
            nhanVienList = Array.isArray(nvData) ? nvData : [];
        } catch (apiError) {
            console.error('Error loading detail data:', apiError);
            // Tiếp tục với danh sách rỗng nếu có lỗi
            cotsList = [];
            nhanVienList = [];
        }
        
        // Tạo HTML chi tiết
        detailContainer.innerHTML = createTramSacDetailView(tram, cotsList, nhanVienList, statusClass, soCotSac, soNhanVien, loaiCotSac, quanLyTram);
    } catch (error) {
        console.error('Error loading detail view:', error);
        detailContainer.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Không thể tải thông tin chi tiết</h3>
                <p>Đã xảy ra lỗi khi tải thông tin trạm sạc. Vui lòng thử lại sau.</p>
            </div>
        `;
    }
}

/**
 * Hàm: createTramSacDetailView(tram, cotsList, nhanVienList, statusClass, soCotSac, soNhanVien, loaiCotSac, quanLyTram)
 * Mô tả: Tạo HTML chi tiết cho một trạm sạc (dành cho nhân viên)
 * @param {Object} tram - Đối tượng chứa thông tin trạm sạc
 * @param {Array} cotsList - Danh sách cột sạc
 * @param {Array} nhanVienList - Danh sách nhân viên
 * @param {string} statusClass - Class CSS cho badge trạng thái
 * @param {number} soCotSac - Số lượng cột sạc
 * @param {number} soNhanVien - Số lượng nhân viên
 * @param {string} loaiCotSac - Loại cột sạc
 * @param {string} quanLyTram - Tên quản lý trạm
 * @return {string} Chuỗi HTML chi tiết của trạm sạc
 */
function createTramSacDetailView(tram, cotsList = [], nhanVienList = [], statusClass = 'maintenance', soCotSac = 0, soNhanVien = 0, loaiCotSac = 'Chưa có dữ liệu', quanLyTram = 'Chưa phân công') {
    return `
        <div class="tram-detail-container">
            <!-- Header Section -->
            <div class="tram-detail-header">
                <div class="tram-detail-title-section">
                    <div class="tram-detail-code">${escapeHtml(tram.MaTram)}</div>
                    <h1 class="tram-detail-name">${escapeHtml(tram.TenTram)}</h1>
                    <span class="status-badge ${statusClass}">${escapeHtml(tram.TrangThai)}</span>
                </div>
            </div>
            
            <!-- Main Content Grid -->
            <div class="tram-detail-grid">
                <!-- Thông tin cơ bản -->
                <div class="tram-detail-section">
                    <div class="section-title">
                        <i class="fas fa-info-circle"></i>
                        <h3>Thông Tin Cơ Bản</h3>
                    </div>
                    <div class="detail-info-list">
                        <div class="detail-info-item">
                            <div class="detail-info-label">
                                <i class="fas fa-map-marker-alt"></i>
                                <span>Địa chỉ</span>
                            </div>
                            <div class="detail-info-value">${escapeHtml(tram.DiaChi)}</div>
                        </div>
                        <div class="detail-info-item">
                            <div class="detail-info-label">
                                <i class="fas fa-city"></i>
                                <span>Thành phố</span>
                            </div>
                            <div class="detail-info-value">${escapeHtml(tram.ThanhPho)}</div>
                        </div>
                        <div class="detail-info-item">
                            <div class="detail-info-label">
                                <i class="fas fa-user-shield"></i>
                                <span>Quản lý trạm</span>
                            </div>
                            <div class="detail-info-value">${escapeHtml(quanLyTram)}</div>
                        </div>
                    </div>
                </div>
                
                <!-- Thống kê -->
                <div class="tram-detail-section">
                    <div class="section-title">
                        <i class="fas fa-chart-bar"></i>
                        <h3>Thống Kê</h3>
                    </div>
                    <div class="detail-stats-grid">
                        <div class="detail-stat-card">
                            <div class="detail-stat-icon blue">
                                <i class="fas fa-plug"></i>
                            </div>
                            <div class="detail-stat-content">
                                <div class="detail-stat-value">${soCotSac}</div>
                                <div class="detail-stat-label">Cột sạc</div>
                            </div>
                        </div>
                        <div class="detail-stat-card">
                            <div class="detail-stat-icon green">
                                <i class="fas fa-user-tie"></i>
                            </div>
                            <div class="detail-stat-content">
                                <div class="detail-stat-value">${soNhanVien}</div>
                                <div class="detail-stat-label">Nhân viên</div>
                            </div>
                        </div>
                        <div class="detail-stat-card">
                            <div class="detail-stat-icon orange">
                                <i class="fas fa-charging-station"></i>
                            </div>
                            <div class="detail-stat-content">
                                <div class="detail-stat-value">${loaiCotSac.split(',').length}</div>
                                <div class="detail-stat-label">Loại cột sạc</div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Danh sách cột sạc -->
                <div class="tram-detail-section full-width">
                    <div class="section-title">
                        <i class="fas fa-plug"></i>
                        <h3>Danh Sách Cột Sạc (${cotsList.length})</h3>
                    </div>
                    ${cotsList.length > 0 ? `
                    <div class="detail-list">
                        ${cotsList.map(cot => `
                            <div class="detail-list-item">
                                <div class="detail-list-item-main">
                                    <div class="detail-list-item-icon">
                                        <i class="fas fa-plug"></i>
                                    </div>
                                    <div class="detail-list-item-info">
                                        <div class="detail-list-item-title">${escapeHtml(cot.MaCot)}</div>
                                        <div class="detail-list-item-subtitle">
                                            ${escapeHtml(cot.LoaiCongSac)} - ${cot.CongSuat} kW
                                        </div>
                                    </div>
                                </div>
                                <div class="detail-list-item-status">
                                    <span class="status-badge ${cot.TinhTrang === 'Rảnh' ? 'active' : cot.TinhTrang === 'Đang sạc' ? 'warning' : 'maintenance'}">${escapeHtml(cot.TinhTrang)}</span>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                    ` : '<div class="empty-state-small">Chưa có cột sạc nào</div>'}
                </div>
                
                <!-- Danh sách nhân viên -->
                <div class="tram-detail-section full-width">
                    <div class="section-title">
                        <i class="fas fa-user-tie"></i>
                        <h3>Danh Sách Nhân Viên (${nhanVienList.length})</h3>
                    </div>
                    ${nhanVienList.length > 0 ? `
                    <div class="detail-list">
                        ${nhanVienList.map(nv => `
                            <div class="detail-list-item">
                                <div class="detail-list-item-main">
                                    <div class="detail-list-item-icon">
                                        <i class="fas fa-user"></i>
                                    </div>
                                    <div class="detail-list-item-info">
                                        <div class="detail-list-item-title">${escapeHtml(nv.HoTen)}</div>
                                        <div class="detail-list-item-subtitle">
                                            ${escapeHtml(nv.MaNV)} - ${escapeHtml(nv.ChucVu || 'Chưa phân chức vụ')}
                                        </div>
                                    </div>
                                </div>
                                <div class="detail-list-item-status">
                                    ${nv.Email ? `<div class="detail-list-item-email"><i class="fas fa-envelope"></i> ${escapeHtml(nv.Email)}</div>` : ''}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                    ` : '<div class="empty-state-small">Chưa có nhân viên nào</div>'}
                </div>
                
                <!-- Thông tin bổ sung -->
                <div class="tram-detail-section">
                    <div class="section-title">
                        <i class="fas fa-info-circle"></i>
                        <h3>Thông Tin Bổ Sung</h3>
                    </div>
                    <div class="detail-info-list">
                        <div class="detail-info-item">
                            <div class="detail-info-label">
                                <i class="fas fa-charging-station"></i>
                                <span>Loại cột sạc</span>
                            </div>
                            <div class="detail-info-value">${escapeHtml(loaiCotSac)}</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function createTramSacCard(tram) {
    // Kiểm tra xem user có phải admin không
    const isAdminUser = typeof isAdmin === 'function' ? isAdmin() : false;
    
    // Xác định class CSS cho badge trạng thái dựa trên giá trị TrangThai
    let statusClass = 'maintenance';
    if (tram.TrangThai === 'Hoạt động') {
        statusClass = 'active';
    } else if (tram.TrangThai === 'Ngừng hoạt động') {
        statusClass = 'inactive';
    }

    // Chuẩn hóa các giá trị thống kê, fallback về 0 hoặc chuỗi phù hợp nếu null
    const soCotSac = typeof tram.SoCotSac !== 'undefined' && tram.SoCotSac !== null ? tram.SoCotSac : 0;
    const soNhanVien = typeof tram.SoNhanVien !== 'undefined' && tram.SoNhanVien !== null ? tram.SoNhanVien : 0;
    const loaiCotSac = tram.LoaiCotSac ? tram.LoaiCotSac : 'Chưa có dữ liệu';
    const quanLyTram = tram.QuanLyTram ? tram.QuanLyTram : 'Chưa phân công';
    
    // Trả về HTML template cho card trạm sạc
    // Bao gồm: địa chỉ, số cột sạc, số nhân viên, quản lý trạm, các loại cột sạc
    return `
        <div class="station-card" 
             data-matram="${escapeHtml(tram.MaTram)}" 
             data-tentram="${escapeHtml(tram.TenTram)}" 
             data-diachi="${escapeHtml(tram.DiaChi)}" 
             data-thanhpho="${escapeHtml(tram.ThanhPho)}" 
             data-trangthai="${escapeHtml(tram.TrangThai)}">
            <!-- Header của card: Tên trạm và trạng thái -->
            <div class="station-header">
                <div>
                    <!-- Mã trạm sạc (nhỏ, màu xám) -->
                    <div class="station-code">${escapeHtml(tram.MaTram)}</div>
                    <!-- Tên trạm sạc -->
                    <div class="station-name">${escapeHtml(tram.TenTram)}</div>
                    <!-- Badge trạng thái với màu sắc tương ứng -->
                    <span class="status-badge ${statusClass}">${escapeHtml(tram.TrangThai)}</span>
                </div>
            </div>
            <!-- Thông tin chi tiết của trạm -->
            <div class="station-info">
                <!-- Thông tin địa chỉ -->
                <div class="station-info-item">
                    <i class="fas fa-map-marker-alt"></i>
                    <span>${escapeHtml(tram.DiaChi)}, ${escapeHtml(tram.ThanhPho)}</span>
                </div>
                <!-- Thông tin số cột sạc -->
                <div class="station-info-item">
                    <i class="fas fa-plug"></i>
                    <span>${soCotSac} cột sạc</span>
                </div>
                <!-- Thông tin số nhân viên trong trạm -->
                <div class="station-info-item">
                    <i class="fas fa-user-tie"></i>
                    <span>${soNhanVien} nhân viên</span>
                </div>
                <!-- Thông tin quản lý trạm -->
                <div class="station-info-item">
                    <i class="fas fa-user-shield"></i>
                    <span>Quản lý trạm: ${escapeHtml(quanLyTram)}</span>
                </div>
                <!-- Thông tin các loại cột sạc trong trạm -->
                <div class="station-info-item">
                    <i class="fas fa-charging-station"></i>
                    <span>Loại cột sạc: ${escapeHtml(loaiCotSac)}</span>
                </div>
            </div>
            <!-- Các nút hành động: Sửa và Xóa (chỉ hiển thị cho admin) -->
            ${isAdminUser ? `
            <div class="station-actions">
                <!-- Nút Sửa: Gọi hàm editTramSac() với mã trạm -->
                <button class="btn btn-success btn-sm" onclick="editTramSac('${escapeHtml(tram.MaTram)}')" title="Sửa thông tin trạm sạc">
                    <i class="fas fa-edit"></i> Sửa
                </button>
                <!-- Nút Xóa: Gọi hàm deleteTramSac() với mã trạm -->
                <button class="btn btn-danger btn-sm" onclick="deleteTramSac('${escapeHtml(tram.MaTram)}', '${escapeHtml(tram.TenTram)}')" title="Xóa trạm sạc">
                    <i class="fas fa-trash"></i> Xóa
                </button>
            </div>
            ` : ''}
        </div>
    `;
}

// ============================================
// HÀM TÌM KIẾM VÀ LỌC
// ============================================

/**
 * Hàm: filterTramSac()
 * Mô tả: Tìm kiếm và lọc danh sách trạm sạc theo từ khóa và trạng thái
 * @return {void} Không trả về giá trị
 * Chức năng:
 *   1. Lấy giá trị từ ô tìm kiếm và dropdown lọc
 *   2. Lọc danh sách trạm sạc theo điều kiện
 *   3. Cập nhật lại giao diện với kết quả đã lọc
 */
function filterTramSac() {
    // Lấy danh sách trạm sạc từ biến toàn cục
    // window.tramsacData: Dữ liệu đã được lưu khi load trang
    const allTrams = window.tramsacData || [];
    
    // Lấy giá trị từ ô tìm kiếm
    // getElementById: Tìm phần tử HTML theo ID
    // value: Lấy giá trị nhập vào input
    // toLowerCase(): Chuyển sang chữ thường để tìm kiếm không phân biệt hoa thường
    // trim(): Xóa khoảng trắng ở đầu và cuối
    const searchTerm = (document.getElementById('tramsac-search')?.value || '').toLowerCase().trim();
    
    // Lấy giá trị từ dropdown lọc trạng thái
    const statusFilter = document.getElementById('tramsac-status-filter')?.value || '';
    
    // Lọc danh sách trạm sạc theo điều kiện
    // filter(): Tạo mảng mới chứa các phần tử thỏa mãn điều kiện
    const filteredTrams = allTrams.filter(tram => {
        // Kiểm tra điều kiện tìm kiếm
        // includes(): Kiểm tra xem chuỗi có chứa từ khóa không
        const matchesSearch = !searchTerm || 
            (tram.TenTram && tram.TenTram.toLowerCase().includes(searchTerm)) ||
            (tram.DiaChi && tram.DiaChi.toLowerCase().includes(searchTerm)) ||
            (tram.ThanhPho && tram.ThanhPho.toLowerCase().includes(searchTerm)) ||
            (tram.MaTram && tram.MaTram.toLowerCase().includes(searchTerm));
        
        // Kiểm tra điều kiện lọc trạng thái
        // Nếu không chọn trạng thái (rỗng) thì hiển thị tất cả
        const matchesStatus = !statusFilter || tram.TrangThai === statusFilter;
        
        // Trả về true nếu cả hai điều kiện đều thỏa mãn
        return matchesSearch && matchesStatus;
    });
    
    // Lấy container grid để hiển thị kết quả
    const gridContainer = document.getElementById('tramsac-grid');
    
    // Lấy phần tử hiển thị số lượng kết quả
    const countElement = document.getElementById('tramsac-count');
    
    // Kiểm tra xem các phần tử có tồn tại không
    if (!gridContainer) return;
    
    // Cập nhật số lượng kết quả
    if (countElement) {
        countElement.innerHTML = `Hiển thị <strong>${filteredTrams.length}</strong> trạm sạc`;
    }
    
    // Cập nhật nội dung grid với kết quả đã lọc
    if (filteredTrams.length > 0) {
        // Tạo HTML cho từng card trạm sạc và nối lại
        // map(): Duyệt qua mảng và tạo HTML cho mỗi phần tử
        // join(''): Nối tất cả các chuỗi HTML lại với nhau
        gridContainer.innerHTML = filteredTrams.map(tram => createTramSacCard(tram)).join('');
    } else {
        // Nếu không có kết quả, hiển thị thông báo trống
        gridContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-search"></i>
                <h3>Không tìm thấy trạm sạc nào</h3>
                <p>Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc</p>
            </div>
        `;
    }
}

// ============================================
// HÀM CRUD OPERATIONS
// ============================================

/**
 * Hàm: openTramSacModal(matram)
 * Mô tả: Mở modal form để thêm mới hoặc sửa trạm sạc
 * @param {string|null} matram - Mã trạm sạc cần sửa (null nếu thêm mới)
 * @return {Promise<void>} Promise không trả về giá trị
 * Chức năng:
 *   1. Tạo hoặc cập nhật modal form
 *   2. Nếu có matram, load dữ liệu trạm sạc vào form
 *   3. Hiển thị modal
 */
async function openTramSacModal(matram = null) {
    // Kiểm tra xem modal đã tồn tại chưa
    let modal = document.getElementById('tramsac-modal');
    
    // Nếu chưa tồn tại, tạo modal mới
    if (!modal) {
        // Tạo phần tử div cho modal
        modal = document.createElement('div');
        modal.id = 'tramsac-modal';
        modal.className = 'modal';
        
        // Thêm modal vào body
        document.body.appendChild(modal);
    }
    
    // Xác định tiêu đề modal (Thêm mới hoặc Sửa)
    const isEdit = matram !== null;
    const modalTitle = isEdit ? 'Sửa Trạm Sạc' : 'Thêm Trạm Mới';
    
    // Tạo nội dung modal với form
    modal.innerHTML = `
        <div class="modal-content">
            <!-- Header của modal -->
            <div class="modal-header">
                <h2>${modalTitle}</h2>
                <!-- Nút đóng modal -->
                <span class="close" onclick="closeTramSacModal()">&times;</span>
            </div>
            
            <!-- Form nhập liệu -->
            <form id="tramsac-form" onsubmit="saveTramSac(event)">
                <!-- Mã trạm (chỉ hiển thị khi sửa, disabled khi thêm mới) -->
                <div class="form-group">
                    <label for="tramsac-matram">Mã Trạm <span class="required">*</span></label>
                    <input 
                        type="text" 
                        id="tramsac-matram" 
                        name="MaTram" 
                        required 
                        maxlength="5"
                        pattern="[A-Z0-9]{5}"
                        ${isEdit ? 'readonly' : ''}
                        placeholder="VD: TS001"
                        title="Mã trạm phải có 5 ký tự (chữ hoa hoặc số)"
                    >
                    <small class="form-hint">Mã trạm gồm 5 ký tự (VD: TS001)</small>
                </div>
                
                <!-- Tên trạm -->
                <div class="form-group">
                    <label for="tramsac-tentram">Tên Trạm <span class="required">*</span></label>
                    <input 
                        type="text" 
                        id="tramsac-tentram" 
                        name="TenTram" 
                        required 
                        maxlength="100"
                        placeholder="VD: Trạm sạc Trung tâm Hà Nội"
                    >
                </div>
                
                <!-- Địa chỉ -->
                <div class="form-group">
                    <label for="tramsac-diachi">Địa Chỉ <span class="required">*</span></label>
                    <input 
                        type="text" 
                        id="tramsac-diachi" 
                        name="DiaChi" 
                        required 
                        maxlength="200"
                        placeholder="VD: 123 Đường Láng, Đống Đa"
                    >
                </div>
                
                <!-- Thành phố -->
                <div class="form-group">
                    <label for="tramsac-thanhpho">Thành Phố <span class="required">*</span></label>
                    <input 
                        type="text" 
                        id="tramsac-thanhpho" 
                        name="ThanhPho" 
                        required 
                        maxlength="50"
                        placeholder="VD: Hà Nội"
                    >
                </div>
                
                <!-- Trạng thái -->
                <div class="form-group">
                    <label for="tramsac-trangthai">Trạng Thái <span class="required">*</span></label>
                    <select id="tramsac-trangthai" name="TrangThai" required>
                        <option value="Hoạt động">Hoạt động</option>
                        <option value="Bảo trì">Bảo trì</option>
                        <option value="Ngừng hoạt động">Ngừng hoạt động</option>
                    </select>
                </div>
                
                <!-- Các nút hành động -->
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="closeTramSacModal()">
                        <i class="fas fa-times"></i> Hủy
                    </button>
                    <button type="submit" class="btn btn-primary">
                        <i class="fas fa-save"></i> ${isEdit ? 'Cập nhật' : 'Thêm mới'}
                    </button>
                </div>
            </form>
        </div>
    `;
    
    // Nếu đang sửa, load dữ liệu trạm sạc vào form
    if (isEdit && matram) {
        // Hiển thị loading indicator
        showLoading();
        
        try {
            // Gọi API lấy thông tin trạm sạc
            // apiFetch(): Helper function từ core.js, tự động thêm credentials: 'include'
            const response = await apiFetch(`${API_BASE}/tramsac.php?id=${encodeURIComponent(matram)}`);
            
            // Kiểm tra response
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            // Parse JSON response
            const tram = await response.json();
            
            // Điền dữ liệu vào form
            // getElementById: Tìm phần tử theo ID
            // value: Gán giá trị cho input
            document.getElementById('tramsac-matram').value = tram.MaTram || '';
            document.getElementById('tramsac-tentram').value = tram.TenTram || '';
            document.getElementById('tramsac-diachi').value = tram.DiaChi || '';
            document.getElementById('tramsac-thanhpho').value = tram.ThanhPho || '';
            document.getElementById('tramsac-trangthai').value = tram.TrangThai || 'Hoạt động';
            
        } catch (error) {
            // Xử lý lỗi
            console.error('Error loading tram data:', error);
            alert('Không thể tải thông tin trạm sạc. Vui lòng thử lại.');
            closeTramSacModal();
            return;
        } finally {
            // Ẩn loading indicator
            hideLoading();
        }
    }
    
    // Hiển thị modal
    // classList.add: Thêm class 'show' để hiển thị modal
    modal.classList.add('show');
    
    // Thiết lập sự kiện đóng modal khi click vào overlay (ngoài modal-content)
    // Sử dụng event delegation để xử lý click
    modal.onclick = (e) => {
        // Nếu click vào chính modal (overlay), không phải modal-content
        if (e.target === modal) {
            closeTramSacModal();
        }
    };
    
    // Thiết lập sự kiện đóng modal khi nhấn phím ESC
    // keydown: Sự kiện khi nhấn phím
    const handleEscKey = (e) => {
        // key === 'Escape': Kiểm tra xem có phải phím ESC không
        if (e.key === 'Escape') {
            closeTramSacModal();
            // Xóa event listener sau khi đóng modal
            document.removeEventListener('keydown', handleEscKey);
        }
    };
    
    // Thêm event listener cho phím ESC
    document.addEventListener('keydown', handleEscKey);
    
    // Focus vào ô input đầu tiên (trừ khi đang sửa và mã trạm là readonly)
    if (!isEdit) {
        setTimeout(() => {
            document.getElementById('tramsac-matram')?.focus();
        }, 100);
    } else {
        setTimeout(() => {
            document.getElementById('tramsac-tentram')?.focus();
        }, 100);
    }
}

/**
 * Hàm: closeTramSacModal()
 * Mô tả: Đóng modal form trạm sạc
 * @return {void} Không trả về giá trị
 * Chức năng: Xóa class 'show' để ẩn modal
 */
function closeTramSacModal() {
    // Lấy phần tử modal
    const modal = document.getElementById('tramsac-modal');
    
    // Nếu tìm thấy, xóa class 'show' để ẩn modal
    if (modal) {
        modal.classList.remove('show');
    }
}

/**
 * Hàm: saveTramSac(event)
 * Mô tả: Lưu trạm sạc mới hoặc cập nhật trạm sạc hiện có
 * @param {Event} event - Event object từ form submit
 * @return {Promise<void>} Promise không trả về giá trị
 * Chức năng:
 *   1. Ngăn chặn form submit mặc định
 *   2. Lấy dữ liệu từ form
 *   3. Validate dữ liệu
 *   4. Gọi API POST (thêm mới) hoặc PUT (cập nhật)
 *   5. Reload danh sách và đóng modal
 */
async function saveTramSac(event) {
    // Ngăn chặn form submit mặc định (tránh reload trang)
    // preventDefault(): Ngăn chặn hành vi mặc định của event
    event.preventDefault();
    
    // Lấy form element
    const form = document.getElementById('tramsac-form');
    
    // Kiểm tra form có tồn tại không
    if (!form) return;
    
    // Lấy các giá trị từ form
    // FormData: API để lấy dữ liệu từ form
    const formData = new FormData(form);
    
    // Tạo object chứa dữ liệu trạm sạc
    // Object.fromEntries(): Chuyển FormData sang object
    const tramData = {
        MaTram: formData.get('MaTram')?.trim().toUpperCase() || '',      // Chuyển sang chữ hoa
        TenTram: formData.get('TenTram')?.trim() || '',
        DiaChi: formData.get('DiaChi')?.trim() || '',
        ThanhPho: formData.get('ThanhPho')?.trim() || '',
        TrangThai: formData.get('TrangThai') || 'Hoạt động'
    };
    
    // Validate dữ liệu
    // Kiểm tra mã trạm phải có đúng 5 ký tự
    if (tramData.MaTram.length !== 5) {
        alert('Mã trạm phải có đúng 5 ký tự (VD: TS001)');
        document.getElementById('tramsac-matram')?.focus();
        return;
    }
    
    // Kiểm tra các trường bắt buộc
    if (!tramData.TenTram || !tramData.DiaChi || !tramData.ThanhPho) {
        alert('Vui lòng điền đầy đủ thông tin bắt buộc');
        return;
    }
    
    // Xác định phương thức HTTP và URL
    // Kiểm tra xem có mã trạm trong form không (đang sửa)
    const isEdit = document.getElementById('tramsac-matram')?.readOnly || false;
    const method = isEdit ? 'PUT' : 'POST';
    const url = `${API_BASE}/tramsac.php`;
    
    // Hiển thị loading indicator
    showLoading();
    
    try {
        // Gọi API để lưu trạm sạc
        // apiFetch(): Helper function từ core.js, tự động thêm credentials: 'include'
        const response = await apiFetch(url, {
            method: method,                    // POST hoặc PUT
            headers: {
                'Content-Type': 'application/json'  // Gửi dữ liệu dạng JSON
            },
            body: JSON.stringify(tramData)     // Chuyển object sang JSON string
        });
        
        // Parse JSON response
        const result = await response.json();
        
        // Kiểm tra response
        if (!response.ok) {
            // Nếu có lỗi, hiển thị thông báo
            throw new Error(result.error || 'Có lỗi xảy ra khi lưu trạm sạc');
        }
        
        // Nếu thành công, hiển thị thông báo
        alert(isEdit ? 'Cập nhật trạm sạc thành công!' : 'Thêm trạm sạc thành công!');
        
        // Đóng modal
        closeTramSacModal();
        
        // Reload danh sách trạm sạc
        await loadTramSac();
        
    } catch (error) {
        // Xử lý lỗi
        console.error('Error saving tram sac:', error);
        alert(error.message || 'Có lỗi xảy ra khi lưu trạm sạc. Vui lòng thử lại.');
    } finally {
        // Ẩn loading indicator
        hideLoading();
    }
}

/**
 * Hàm: editTramSac(matram)
 * Mô tả: Mở modal form để sửa thông tin trạm sạc
 * @param {string} matram - Mã trạm sạc cần sửa
 * @return {void} Không trả về giá trị
 * Chức năng: Gọi openTramSacModal() với mã trạm để mở form sửa
 */
function editTramSac(matram) {
    // Kiểm tra mã trạm có hợp lệ không
    if (!matram) {
        alert('Mã trạm không hợp lệ');
        return;
    }
    
    // Mở modal với mã trạm (chế độ sửa)
    openTramSacModal(matram);
}

/**
 * Hàm: deleteTramSac(matram, tentram)
 * Mô tả: Xóa trạm sạc sau khi xác nhận
 * @param {string} matram - Mã trạm sạc cần xóa
 * @param {string} tentram - Tên trạm sạc (để hiển thị trong confirm dialog)
 * @return {Promise<void>} Promise không trả về giá trị
 * Chức năng:
 *   1. Hiển thị dialog xác nhận
 *   2. Nếu xác nhận, gọi API DELETE
 *   3. Reload danh sách sau khi xóa thành công
 */
async function deleteTramSac(matram, tentram = '') {
    // Kiểm tra mã trạm có hợp lệ không
    if (!matram) {
        alert('Mã trạm không hợp lệ');
        return;
    }
    
    // Hiển thị dialog xác nhận
    // confirm(): Hiển thị dialog xác nhận, trả về true nếu OK, false nếu Cancel
    const confirmMessage = tentram 
        ? `Bạn có chắc chắn muốn xóa trạm sạc "${tentram}" (${matram})?\n\nLưu ý: Tất cả cột sạc thuộc trạm này cũng sẽ bị xóa.`
        : `Bạn có chắc chắn muốn xóa trạm sạc "${matram}"?\n\nLưu ý: Tất cả cột sạc thuộc trạm này cũng sẽ bị xóa.`;
    
    if (!confirm(confirmMessage)) {
        // Nếu người dùng không xác nhận, dừng lại
        return;
    }
    
    // Hiển thị loading indicator
    showLoading();
    
    try {
        // Gọi API DELETE để xóa trạm sạc
        // encodeURIComponent(): Mã hóa URL để tránh ký tự đặc biệt
        const response = await apiFetch(`${API_BASE}/tramsac.php?id=${encodeURIComponent(matram)}`, {
            method: 'DELETE'  // Phương thức DELETE
        });
        
        // Parse JSON response
        const result = await response.json();
        
        // Kiểm tra response
        if (!response.ok) {
            // Nếu có lỗi, hiển thị thông báo
            throw new Error(result.error || 'Có lỗi xảy ra khi xóa trạm sạc');
        }
        
        // Nếu thành công, hiển thị thông báo
        alert('Xóa trạm sạc thành công!');
        
        // Reload danh sách trạm sạc
        await loadTramSac();
        
    } catch (error) {
        // Xử lý lỗi
        console.error('Error deleting tram sac:', error);
        alert(error.message || 'Có lỗi xảy ra khi xóa trạm sạc. Vui lòng thử lại.');
    } finally {
        // Ẩn loading indicator
        hideLoading();
    }
}

// ============================================
// EXPOSE FUNCTIONS TO WINDOW OBJECT
// ============================================

/**
 * Expose các hàm quản lý trạm sạc ra window object
 * Mục đích: Cho phép gọi các hàm từ HTML onclick attributes
 * 
 * Khi sử dụng onclick="openTramSacModal()" trong HTML,
 * trình duyệt sẽ tìm hàm trong window scope.
 * Nếu không expose, sẽ báo lỗi "openTramSacModal is not defined"
 */
window.openTramSacModal = openTramSacModal;
window.closeTramSacModal = closeTramSacModal;
window.saveTramSac = saveTramSac;
window.editTramSac = editTramSac;
window.deleteTramSac = deleteTramSac;
window.filterTramSac = filterTramSac;
window.loadTramSac = loadTramSac;

