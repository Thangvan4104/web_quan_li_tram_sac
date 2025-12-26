/**
 * File: assets/js/cotsac.js
 * Mô tả: Module JavaScript quản lý trang Cột Sạc
 * Chức năng: 
 *   - Load và hiển thị danh sách cột sạc
 *   - Tìm kiếm và lọc cột sạc (theo trạm, loại cổng, tình trạng)
 *   - CRUD operations (Create, Read, Update, Delete)
 *   - Modal form để thêm/sửa cột sạc với dropdown chọn trạm
 * Tác giả: Hệ thống quản lý trạm sạc
 */

// ============================================
// HÀM LOAD CỘT SẠC
// ============================================

/**
 * Hàm: loadCotSac()
 * Mô tả: Load và hiển thị danh sách cột sạc với đầy đủ tính năng tìm kiếm và lọc
 * @return {Promise<void>} Promise không trả về giá trị
 * Chức năng:
 *   1. Gọi API lấy danh sách cột sạc (có thông tin trạm)
 *   2. Gọi API lấy danh sách trạm sạc (để populate dropdown)
 *   3. Tạo HTML với thanh tìm kiếm và bộ lọc
 *   4. Hiển thị danh sách cột sạc dưới dạng card
 *   5. Thiết lập sự kiện tìm kiếm và lọc
 *   6. Xử lý lỗi nếu có
 */
async function loadCotSac() {
    // Lấy phần tử container của trang cột sạc
    // getElementById: Tìm phần tử HTML theo ID
    const pageElement = document.getElementById('cotsac');
    
    // Nếu không tìm thấy thì dừng lại
    // Early return: Tránh xử lý không cần thiết
    if (!pageElement) return;
    
    // Hiển thị loading indicator trong khi đang tải dữ liệu
    showLoading();
    
    try {
        // Gọi API lấy danh sách cột sạc và danh sách trạm sạc cùng lúc
        // Promise.all: Chờ tất cả các promise hoàn thành
        const [cotsResponse, tramsResponse] = await Promise.all([
            // Gọi API lấy danh sách cột sạc (có thông tin trạm từ JOIN)
            // apiFetch(): Helper function từ core.js, tự động thêm credentials: 'include'
            apiFetch(`${API_BASE}/cotsac.php`),
            // Gọi API lấy danh sách trạm sạc (để populate dropdown)
            apiFetch(`${API_BASE}/tramsac.php`)
        ]);
        
        // Kiểm tra response của cột sạc
        if (!cotsResponse.ok) {
            throw new Error(`HTTP error! status: ${cotsResponse.status}`);
        }
        
        // Kiểm tra response của trạm sạc
        if (!tramsResponse.ok) {
            throw new Error(`HTTP error! status: ${tramsResponse.status}`);
        }
        
        // Parse JSON response
        const cots = await cotsResponse.json();
        const trams = await tramsResponse.json();
        
        // Kiểm tra xem cots và trams có phải là mảng không
        // Array.isArray(): Kiểm tra xem biến có phải mảng không
        const safeCots = Array.isArray(cots) ? cots : [];
        const safeTrams = Array.isArray(trams) ? trams : [];
        
        // Kiểm tra xem user có phải admin không
        const isAdminUser = typeof isAdmin === 'function' ? isAdmin() : false;
        
        // Tạo HTML cho dropdown trạm sạc (chỉ cho admin)
        // map(): Duyệt qua mảng và tạo option cho mỗi trạm
        // join(''): Nối tất cả các option lại với nhau
        const tramOptions = safeTrams.map(tram => 
            `<option value="${escapeHtml(tram.MaTram)}">${escapeHtml(tram.TenTram)} (${escapeHtml(tram.MaTram)})</option>`
        ).join('');
        
        // Tạo HTML và gán vào pageElement
        // innerHTML: Gán nội dung HTML vào phần tử
        pageElement.innerHTML = `
            <!-- Header của section với tiêu đề và nút thêm mới -->
            <div class="section-header">
                <h2>Danh Sách Cột Sạc</h2>
                ${typeof isAdmin === 'function' && isAdmin() ? `
                <!-- Nút thêm cột sạc mới, onclick sẽ gọi hàm openCotSacModal() (chỉ admin) -->
                <button class="btn btn-primary" onclick="openCotSacModal()">
                    <i class="fas fa-plus"></i> Thêm Cột Sạc Mới
                </button>
                ` : ''}
            </div>
            
            <!-- Thanh tìm kiếm và lọc -->
            <div class="filter-section">
                <!-- Ô tìm kiếm -->
                <div class="search-box">
                    <i class="fas fa-search"></i>
                    <!-- 
                        Input tìm kiếm
                        id="cotsac-search": ID để JavaScript có thể truy cập
                        placeholder: Text gợi ý hiển thị khi input trống
                        oninput: Sự kiện khi người dùng nhập, gọi hàm filterCotSac()
                    -->
                    <input 
                        type="text" 
                        id="cotsac-search" 
                        placeholder="Tìm kiếm theo mã cột, loại cổng, tên trạm..." 
                        oninput="filterCotSac()"
                    >
                </div>
                
                <!-- Bộ lọc theo trạm sạc (chỉ cho admin) -->
                ${isAdminUser ? `
                <div class="filter-group">
                    <label for="cotsac-tram-filter">Lọc theo trạm:</label>
                    <!-- 
                        Select dropdown để lọc theo trạm
                        id="cotsac-tram-filter": ID để JavaScript có thể truy cập
                        onchange: Sự kiện khi người dùng chọn, gọi hàm filterCotSac()
                    -->
                    <select id="cotsac-tram-filter" onchange="filterCotSac()">
                        <option value="">Tất cả trạm</option>
                        ${tramOptions}
                    </select>
                </div>
                ` : ''}
                
                <!-- Bộ lọc theo loại cổng sạc -->
                <div class="filter-group">
                    <label for="cotsac-loai-filter">Lọc theo loại cổng:</label>
                    <!-- 
                        Select dropdown để lọc theo loại cổng
                        id="cotsac-loai-filter": ID để JavaScript có thể truy cập
                        onchange: Sự kiện khi người dùng chọn, gọi hàm filterCotSac()
                    -->
                    <select id="cotsac-loai-filter" onchange="filterCotSac()">
                        <option value="">Tất cả loại</option>
                        <option value="Type 2 AC">Type 2 AC</option>
                        <option value="CCS2 DC">CCS2 DC</option>
                        <option value="CHAdeMO">CHAdeMO</option>
                        <option value="Type 1 AC">Type 1 AC</option>
                        <option value="GB/T">GB/T</option>
                    </select>
                </div>
                
                <!-- Bộ lọc theo tình trạng -->
                <div class="filter-group">
                    <label for="cotsac-status-filter">Lọc theo tình trạng:</label>
                    <!-- 
                        Select dropdown để lọc theo tình trạng
                        id="cotsac-status-filter": ID để JavaScript có thể truy cập
                        onchange: Sự kiện khi người dùng chọn, gọi hàm filterCotSac()
                    -->
                    <select id="cotsac-status-filter" onchange="filterCotSac()">
                        <option value="">Tất cả</option>
                        <option value="Rảnh">Rảnh</option>
                        <option value="Đang sạc">Đang sạc</option>
                        <option value="Bảo trì">Bảo trì</option>
                    </select>
                </div>
            </div>
            
            <!-- Thông báo số lượng kết quả -->
            <div class="results-info">
                <span id="cotsac-count">Hiển thị <strong>${safeCots.length}</strong> cột sạc</span>
            </div>
            
            <!-- Grid container chứa các card cột sạc -->
            <div class="cotsac-grid" id="cotsac-grid">
                ${safeCots.length > 0 
                    ? safeCots.map(cot => createCotSacCard(cot)).join('')
                    : '<div class="empty-state"><i class="fas fa-plug"></i><h3>Chưa có cột sạc nào</h3><p>Nhấn nút "Thêm Cột Sạc Mới" để tạo cột sạc đầu tiên</p></div>'
                }
            </div>
        `;
        
        // Lưu danh sách cột sạc và trạm sạc vào biến toàn cục để dùng cho tìm kiếm/lọc
        // window.cotsacData: Lưu vào window object để có thể truy cập từ các hàm khác
        window.cotsacData = safeCots;
        window.cotsacTrams = safeTrams;  // Lưu danh sách trạm để dùng trong modal
        
    } catch (error) {
        // Xử lý lỗi: Hiển thị thông báo lỗi
        // console.error(): In lỗi ra console để debug
        console.error('Error loading cot sac:', error);
        
        // Hiển thị thông báo lỗi trên giao diện
        pageElement.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Không thể tải dữ liệu</h3>
                <p>Đã xảy ra lỗi khi tải danh sách cột sạc. Vui lòng thử lại sau.</p>
                <button class="btn btn-primary" onclick="loadCotSac()">
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
 * Hàm: createCotSacCard(cot)
 * Mô tả: Tạo HTML card cho một cột sạc với đầy đủ thông tin
 * @param {Object} cot - Đối tượng chứa thông tin cột sạc (có thể có thông tin trạm từ JOIN)
 * @return {string} Chuỗi HTML của card cột sạc
 * Chức năng: 
 *   1. Tạo template HTML để hiển thị thông tin cột sạc
 *   2. Hiển thị mã cột, loại cổng, công suất, tình trạng, trạm sạc
 *   3. Thêm các nút hành động (Sửa, Xóa)
 */
function createCotSacCard(cot) {
    // Kiểm tra xem user có phải admin không
    const isAdminUser = typeof isAdmin === 'function' ? isAdmin() : false;
    
    // Xác định class CSS cho badge trạng thái dựa trên giá trị TinhTrang
    // Toán tử ternary: Chuyển đổi tình trạng thành class CSS
    let statusClass = 'ranh';
    if (cot.TinhTrang === 'Đang sạc') {
        statusClass = 'dang-sac';
    } else if (cot.TinhTrang === 'Bảo trì') {
        statusClass = 'bao-tri';
    }
    
    // Trả về HTML template cho card cột sạc
    // Template string (backtick): Cho phép nhúng biến và xuống dòng
    return `
        <div class="cotsac-card" data-macot="${escapeHtml(cot.MaCot)}" data-loaicong="${escapeHtml(cot.LoaiCongSac)}" data-congsuat="${cot.CongSuat}" data-tinhtrang="${escapeHtml(cot.TinhTrang)}" data-matram="${escapeHtml(cot.MaTram)}">
            <!-- Header của card: Mã cột và trạng thái -->
            <div class="cotsac-header">
                <div>
                    <!-- Mã cột sạc (nhỏ, màu xám) -->
                    <div class="cotsac-code">${escapeHtml(cot.MaCot)}</div>
                    <!-- Tên/Thông tin cột sạc, escapeHtml để tránh XSS attack -->
                    <div class="cotsac-name">${escapeHtml(cot.LoaiCongSac)}</div>
                    <!-- Badge trạng thái với màu sắc tương ứng -->
                    <span class="status-badge ${statusClass}">${escapeHtml(cot.TinhTrang)}</span>
                </div>
            </div>
            <!-- Thông tin chi tiết của cột sạc -->
            <div class="cotsac-info">
                <!-- Thông tin trạm sạc -->
                <div class="cotsac-info-item">
                    <i class="fas fa-building"></i>
                    <span>${escapeHtml(cot.TenTram || 'Chưa xác định')} (${escapeHtml(cot.MaTram)})</span>
                </div>
                <!-- Thông tin địa chỉ trạm (nếu có) -->
                ${cot.DiaChi ? `
                <div class="cotsac-info-item">
                    <i class="fas fa-map-marker-alt"></i>
                    <span>${escapeHtml(cot.DiaChi)}</span>
                </div>
                ` : ''}
            </div>
            <!-- Thông số kỹ thuật: Công suất và loại cổng -->
            <div class="cotsac-specs">
                <!-- Công suất -->
                <div class="spec-item">
                    <div class="spec-item-value">${cot.CongSuat || 0}</div>
                    <div class="spec-item-label">kW</div>
                </div>
                <!-- Loại cổng -->
                <div class="spec-item">
                    <div class="spec-item-value">${escapeHtml(cot.LoaiCongSac)}</div>
                    <div class="spec-item-label">Loại cổng</div>
                </div>
            </div>
            <!-- Các nút hành động: Sửa và Xóa (admin) hoặc Yêu cầu bảo trì (staff) -->
            <div class="cotsac-actions">
                ${isAdminUser ? `
                <!-- Nút Sửa: Gọi hàm editCotSac() với mã cột (chỉ admin) -->
                <button class="btn btn-success btn-sm" onclick="editCotSac('${escapeHtml(cot.MaCot)}')" title="Sửa thông tin cột sạc">
                    <i class="fas fa-edit"></i> Sửa
                </button>
                <!-- Nút Xóa: Gọi hàm deleteCotSac() với mã cột (chỉ admin) -->
                <button class="btn btn-danger btn-sm" onclick="deleteCotSac('${escapeHtml(cot.MaCot)}', '${escapeHtml(cot.LoaiCongSac)}')" title="Xóa cột sạc">
                    <i class="fas fa-trash"></i> Xóa
                </button>
                ` : `
                <!-- Nút Yêu cầu bảo trì: Gọi hàm requestBaoTri() với mã cột (chỉ staff) -->
                <button class="btn btn-warning btn-sm" onclick="requestBaoTri('${escapeHtml(cot.MaCot)}', '${escapeHtml(cot.MaTram)}')" title="Yêu cầu bảo trì cột sạc">
                    <i class="fas fa-tools"></i> Yêu cầu bảo trì
                </button>
                `}
            </div>
        </div>
    `;
}

// ============================================
// HÀM TÌM KIẾM VÀ LỌC
// ============================================

/**
 * Hàm: filterCotSac()
 * Mô tả: Tìm kiếm và lọc danh sách cột sạc theo từ khóa, trạm, loại cổng và tình trạng
 * @return {void} Không trả về giá trị
 * Chức năng:
 *   1. Lấy giá trị từ ô tìm kiếm và các dropdown lọc
 *   2. Lọc danh sách cột sạc theo điều kiện
 *   3. Cập nhật lại giao diện với kết quả đã lọc
 */
function filterCotSac() {
    // Lấy danh sách cột sạc từ biến toàn cục
    // window.cotsacData: Dữ liệu đã được lưu khi load trang
    const allCots = window.cotsacData || [];
    
    // Lấy giá trị từ ô tìm kiếm
    // getElementById: Tìm phần tử HTML theo ID
    // value: Lấy giá trị nhập vào input
    // toLowerCase(): Chuyển sang chữ thường để tìm kiếm không phân biệt hoa thường
    // trim(): Xóa khoảng trắng ở đầu và cuối
    const searchTerm = (document.getElementById('cotsac-search')?.value || '').toLowerCase().trim();
    
    // Lấy giá trị từ các dropdown lọc
    // Kiểm tra xem dropdown có tồn tại không (nhân viên không có dropdown lọc trạm)
    const tramFilterElement = document.getElementById('cotsac-tram-filter');
    const tramFilter = tramFilterElement ? tramFilterElement.value : '';
    const loaiFilter = document.getElementById('cotsac-loai-filter')?.value || '';
    const statusFilter = document.getElementById('cotsac-status-filter')?.value || '';
    
    // Lọc danh sách cột sạc theo điều kiện
    // filter(): Tạo mảng mới chứa các phần tử thỏa mãn điều kiện
    const filteredCots = allCots.filter(cot => {
        // Kiểm tra điều kiện tìm kiếm
        // includes(): Kiểm tra xem chuỗi có chứa từ khóa không
        const matchesSearch = !searchTerm || 
            (cot.MaCot && cot.MaCot.toLowerCase().includes(searchTerm)) ||
            (cot.LoaiCongSac && cot.LoaiCongSac.toLowerCase().includes(searchTerm)) ||
            (cot.TenTram && cot.TenTram.toLowerCase().includes(searchTerm)) ||
            (cot.MaTram && cot.MaTram.toLowerCase().includes(searchTerm));
        
        // Kiểm tra điều kiện lọc trạm
        // Nếu không có dropdown (nhân viên) hoặc không chọn trạm (rỗng) thì hiển thị tất cả
        // Nhân viên chỉ thấy cột sạc của trạm mình (đã được filter ở API)
        const matchesTram = !tramFilter || cot.MaTram === tramFilter;
        
        // Kiểm tra điều kiện lọc loại cổng
        const matchesLoai = !loaiFilter || cot.LoaiCongSac === loaiFilter;
        
        // Kiểm tra điều kiện lọc tình trạng
        const matchesStatus = !statusFilter || cot.TinhTrang === statusFilter;
        
        // Trả về true nếu tất cả điều kiện đều thỏa mãn
        return matchesSearch && matchesTram && matchesLoai && matchesStatus;
    });
    
    // Lấy container grid để hiển thị kết quả
    const gridContainer = document.getElementById('cotsac-grid');
    
    // Lấy phần tử hiển thị số lượng kết quả
    const countElement = document.getElementById('cotsac-count');
    
    // Kiểm tra xem các phần tử có tồn tại không
    if (!gridContainer) return;
    
    // Cập nhật số lượng kết quả
    if (countElement) {
        countElement.innerHTML = `Hiển thị <strong>${filteredCots.length}</strong> cột sạc`;
    }
    
    // Cập nhật nội dung grid với kết quả đã lọc
    if (filteredCots.length > 0) {
        // Tạo HTML cho từng card cột sạc và nối lại
        // map(): Duyệt qua mảng và tạo HTML cho mỗi phần tử
        // join(''): Nối tất cả các chuỗi HTML lại với nhau
        gridContainer.innerHTML = filteredCots.map(cot => createCotSacCard(cot)).join('');
    } else {
        // Nếu không có kết quả, hiển thị thông báo trống
        gridContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-search"></i>
                <h3>Không tìm thấy cột sạc nào</h3>
                <p>Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc</p>
            </div>
        `;
    }
}

// ============================================
// HÀM YÊU CẦU BẢO TRÌ
// ============================================

/**
 * Hàm: requestBaoTri(macot, matram)
 * Mô tả: Tạo yêu cầu bảo trì cho cột sạc (dành cho nhân viên)
 * @param {string} macot - Mã cột sạc cần bảo trì
 * @param {string} matram - Mã trạm sạc
 * @return {Promise<void>} Promise không trả về giá trị
 * Chức năng:
 *   1. Lấy thông tin user hiện tại
 *   2. Tạo phiếu bảo trì với MaCot và MaNV
 *   3. Hiển thị thông báo thành công
 */
async function requestBaoTri(macot, matram) {
    try {
        // Lấy thông tin user hiện tại
        const currentUser = window.currentUser || {};
        const maNV = currentUser.MaNV;
        
        if (!maNV) {
            alert('Không thể xác định nhân viên. Vui lòng đăng nhập lại.');
            return;
        }
        
        // Xác nhận với user
        const confirmed = confirm(`Bạn có chắc chắn muốn yêu cầu bảo trì cho cột sạc ${macot}?`);
        if (!confirmed) return;
        
        // Tạo dữ liệu phiếu bảo trì
        const baoTriData = {
            MaCot: macot,
            MaTram: matram,
            MaNV: maNV,
            NgayBaoTri: new Date().toISOString().split('T')[0], // Ngày hiện tại (YYYY-MM-DD)
            NoiDung: `Yêu cầu bảo trì cột sạc ${macot}`,
            TrangThai: 'Chờ xử lý'
        };
        
        // Gọi API tạo phiếu bảo trì
        const response = await apiFetch(`${API_BASE}/baotri.php`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(baoTriData)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Không thể tạo yêu cầu bảo trì');
        }
        
        // Thông báo thành công
        alert('Yêu cầu bảo trì đã được gửi thành công!');
        
        // Reload trang để cập nhật danh sách
        loadCotSac();
        
    } catch (error) {
        console.error('Error requesting maintenance:', error);
        alert('Lỗi: ' + (error.message || 'Không thể tạo yêu cầu bảo trì. Vui lòng thử lại.'));
    }
}

// ============================================
// HÀM CRUD OPERATIONS
// ============================================

/**
 * Hàm: openCotSacModal(macot)
 * Mô tả: Mở modal form để thêm mới hoặc sửa cột sạc
 * @param {string|null} macot - Mã cột sạc cần sửa (null nếu thêm mới)
 * @return {Promise<void>} Promise không trả về giá trị
 * Chức năng:
 *   1. Tạo hoặc cập nhật modal form
 *   2. Populate dropdown trạm sạc
 *   3. Nếu có macot, load dữ liệu cột sạc vào form
 *   4. Hiển thị modal
 */
async function openCotSacModal(macot = null) {
    // Kiểm tra xem modal đã tồn tại chưa
    let modal = document.getElementById('cotsac-modal');
    
    // Nếu chưa tồn tại, tạo modal mới
    if (!modal) {
        // Tạo phần tử div cho modal
        modal = document.createElement('div');
        modal.id = 'cotsac-modal';
        modal.className = 'modal';
        
        // Thêm modal vào body
        document.body.appendChild(modal);
    }
    
    // Xác định tiêu đề modal (Thêm mới hoặc Sửa)
    const isEdit = macot !== null;
    const modalTitle = isEdit ? 'Sửa Cột Sạc' : 'Thêm Cột Sạc Mới';
    
    // Lấy danh sách trạm sạc từ biến toàn cục hoặc gọi API
    let trams = window.cotsacTrams || [];
    
    // Nếu chưa có danh sách trạm, gọi API để lấy
    if (trams.length === 0) {
        try {
            const response = await apiFetch(`${API_BASE}/tramsac.php`);
            if (response.ok) {
                trams = await response.json();
                window.cotsacTrams = trams;
            }
        } catch (error) {
            console.error('Error loading trams:', error);
        }
    }
    
    // Tạo HTML cho dropdown trạm sạc
    const tramOptions = trams.map(tram => 
        `<option value="${escapeHtml(tram.MaTram)}">${escapeHtml(tram.TenTram)} (${escapeHtml(tram.MaTram)})</option>`
    ).join('');
    
    // Tạo nội dung modal với form
    modal.innerHTML = `
        <div class="modal-content">
            <!-- Header của modal -->
            <div class="modal-header">
                <h2>${modalTitle}</h2>
                <!-- Nút đóng modal -->
                <span class="close" onclick="closeCotSacModal()">&times;</span>
            </div>
            
            <!-- Form nhập liệu -->
            <form id="cotsac-form" onsubmit="saveCotSac(event)">
                <!-- Mã cột sạc (chỉ hiển thị khi sửa, disabled khi thêm mới) -->
                <div class="form-group">
                    <label for="cotsac-macot">Mã Cột Sạc <span class="required">*</span></label>
                    <input 
                        type="text" 
                        id="cotsac-macot" 
                        name="MaCot" 
                        required 
                        maxlength="5"
                        pattern="[A-Z0-9]{5}"
                        ${isEdit ? 'readonly' : ''}
                        placeholder="VD: CS001"
                        title="Mã cột sạc phải có 5 ký tự (chữ hoa hoặc số)"
                    >
                    <small class="form-hint">Mã cột sạc gồm 5 ký tự (VD: CS001)</small>
                </div>
                
                <!-- Trạm sạc (dropdown) -->
                <div class="form-group">
                    <label for="cotsac-matram">Trạm Sạc <span class="required">*</span></label>
                    <select id="cotsac-matram" name="MaTram" required>
                        <option value="">-- Chọn trạm sạc --</option>
                        ${tramOptions}
                    </select>
                </div>
                
                <!-- Loại cổng sạc -->
                <div class="form-group">
                    <label for="cotsac-loaicong">Loại Cổng Sạc <span class="required">*</span></label>
                    <select id="cotsac-loaicong" name="LoaiCongSac" required>
                        <option value="">-- Chọn loại cổng --</option>
                        <option value="Type 2 AC">Type 2 AC</option>
                        <option value="CCS2 DC">CCS2 DC</option>
                        <option value="CHAdeMO">CHAdeMO</option>
                        <option value="Type 1 AC">Type 1 AC</option>
                        <option value="GB/T">GB/T</option>
                    </select>
                </div>
                
                <!-- Công suất -->
                <div class="form-group">
                    <label for="cotsac-congsuat">Công Suất (kW) <span class="required">*</span></label>
                    <input 
                        type="number" 
                        id="cotsac-congsuat" 
                        name="CongSuat" 
                        required 
                        min="1"
                        max="500"
                        placeholder="VD: 22"
                        title="Công suất từ 1 đến 500 kW"
                    >
                    <small class="form-hint">Công suất từ 1 đến 500 kW</small>
                </div>
                
                <!-- Tình trạng (chỉ hiển thị, không cho chỉnh sửa) -->
                <div class="form-group">
                    <label for="cotsac-tinhtrang">Tình Trạng</label>
                    <input 
                        type="text" 
                        id="cotsac-tinhtrang" 
                        name="TinhTrang" 
                        readonly
                        disabled
                        style="background-color: #f5f5f5; cursor: not-allowed;"
                        placeholder="Tình trạng chỉ được thay đổi tự động"
                    >
                    <small class="form-hint" style="color: #666;">Tình trạng chỉ được thay đổi tự động khi tạo bảo trì hoặc phiên sạc</small>
                </div>
                
                <!-- Các nút hành động -->
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="closeCotSacModal()">
                        <i class="fas fa-times"></i> Hủy
                    </button>
                    <button type="submit" class="btn btn-primary">
                        <i class="fas fa-save"></i> ${isEdit ? 'Cập nhật' : 'Thêm mới'}
                    </button>
                </div>
            </form>
        </div>
    `;
    
    // Nếu đang sửa, load dữ liệu cột sạc vào form
    if (isEdit && macot) {
        // Hiển thị loading indicator
        showLoading();
        
        try {
            // Gọi API lấy thông tin cột sạc
            // apiFetch(): Helper function từ core.js, tự động thêm credentials: 'include'
            const response = await apiFetch(`${API_BASE}/cotsac.php?id=${encodeURIComponent(macot)}`);
            
            // Kiểm tra response
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            // Parse JSON response
            const cot = await response.json();
            
            // Điền dữ liệu vào form
            // getElementById: Tìm phần tử theo ID
            // value: Gán giá trị cho input/select
            document.getElementById('cotsac-macot').value = cot.MaCot || '';
            document.getElementById('cotsac-matram').value = cot.MaTram || '';
            document.getElementById('cotsac-loaicong').value = cot.LoaiCongSac || '';
            document.getElementById('cotsac-congsuat').value = cot.CongSuat || '';
            // Tình trạng chỉ hiển thị, không cho chỉnh sửa
            const tinhTrangInput = document.getElementById('cotsac-tinhtrang');
            if (tinhTrangInput) {
                tinhTrangInput.value = cot.TinhTrang || 'Rảnh';
            }
            
        } catch (error) {
            // Xử lý lỗi
            console.error('Error loading cot data:', error);
            alert('Không thể tải thông tin cột sạc. Vui lòng thử lại.');
            closeCotSacModal();
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
            closeCotSacModal();
        }
    };
    
    // Thiết lập sự kiện đóng modal khi nhấn phím ESC
    // keydown: Sự kiện khi nhấn phím
    const handleEscKey = (e) => {
        // key === 'Escape': Kiểm tra xem có phải phím ESC không
        if (e.key === 'Escape') {
            closeCotSacModal();
            // Xóa event listener sau khi đóng modal
            document.removeEventListener('keydown', handleEscKey);
        }
    };
    
    // Thêm event listener cho phím ESC
    document.addEventListener('keydown', handleEscKey);
    
    // Focus vào ô input đầu tiên (trừ khi đang sửa và mã cột là readonly)
    if (!isEdit) {
        setTimeout(() => {
            document.getElementById('cotsac-macot')?.focus();
        }, 100);
    } else {
        setTimeout(() => {
            document.getElementById('cotsac-matram')?.focus();
        }, 100);
    }
}

/**
 * Hàm: closeCotSacModal()
 * Mô tả: Đóng modal form cột sạc
 * @return {void} Không trả về giá trị
 * Chức năng: Xóa class 'show' để ẩn modal
 */
function closeCotSacModal() {
    // Lấy phần tử modal
    const modal = document.getElementById('cotsac-modal');
    
    // Nếu tìm thấy, xóa class 'show' để ẩn modal
    if (modal) {
        modal.classList.remove('show');
    }
}

/**
 * Hàm: saveCotSac(event)
 * Mô tả: Lưu cột sạc mới hoặc cập nhật cột sạc hiện có
 * @param {Event} event - Event object từ form submit
 * @return {Promise<void>} Promise không trả về giá trị
 * Chức năng:
 *   1. Ngăn chặn form submit mặc định
 *   2. Lấy dữ liệu từ form
 *   3. Validate dữ liệu
 *   4. Gọi API POST (thêm mới) hoặc PUT (cập nhật)
 *   5. Reload danh sách và đóng modal
 */
async function saveCotSac(event) {
    // Ngăn chặn form submit mặc định (tránh reload trang)
    // preventDefault(): Ngăn chặn hành vi mặc định của event
    event.preventDefault();
    
    // Lấy form element
    const form = document.getElementById('cotsac-form');
    
    // Kiểm tra form có tồn tại không
    if (!form) return;
    
    // Lấy các giá trị từ form
    // FormData: API để lấy dữ liệu từ form
    const formData = new FormData(form);
    
    // Tạo object chứa dữ liệu cột sạc
    // Object.fromEntries(): Chuyển FormData sang object
    const cotData = {
        MaCot: formData.get('MaCot')?.trim().toUpperCase() || '',      // Chuyển sang chữ hoa
        MaTram: formData.get('MaTram')?.trim() || '',
        LoaiCongSac: formData.get('LoaiCongSac')?.trim() || '',
        CongSuat: parseInt(formData.get('CongSuat') || '0', 10)        // Chuyển sang integer
        // Không gửi TinhTrang - tình trạng chỉ được thay đổi tự động từ bảo trì hoặc phiên sạc
    };
    
    // Validate dữ liệu
    // Kiểm tra mã cột sạc phải có đúng 5 ký tự
    if (cotData.MaCot.length !== 5) {
        alert('Mã cột sạc phải có đúng 5 ký tự (VD: CS001)');
        document.getElementById('cotsac-macot')?.focus();
        return;
    }
    
    // Kiểm tra công suất phải lớn hơn 0
    if (cotData.CongSuat <= 0 || cotData.CongSuat > 500) {
        alert('Công suất phải từ 1 đến 500 kW');
        document.getElementById('cotsac-congsuat')?.focus();
        return;
    }
    
    // Kiểm tra các trường bắt buộc
    if (!cotData.MaTram || !cotData.LoaiCongSac) {
        alert('Vui lòng điền đầy đủ thông tin bắt buộc');
        return;
    }
    
    // Xác định phương thức HTTP và URL
    // Kiểm tra xem có mã cột sạc trong form không (đang sửa)
    const isEdit = document.getElementById('cotsac-macot')?.readOnly || false;
    const method = isEdit ? 'PUT' : 'POST';
    const url = `${API_BASE}/cotsac.php`;
    
    // Hiển thị loading indicator
    showLoading();
    
    try {
        // Gọi API để lưu cột sạc
        // apiFetch(): Helper function từ core.js, tự động thêm credentials: 'include'
        const response = await apiFetch(url, {
            method: method,                    // POST hoặc PUT
            headers: {
                'Content-Type': 'application/json'  // Gửi dữ liệu dạng JSON
            },
            body: JSON.stringify(cotData)     // Chuyển object sang JSON string
        });
        
        // Parse JSON response
        const result = await response.json();
        
        // Kiểm tra response
        if (!response.ok) {
            // Nếu có lỗi, hiển thị thông báo
            throw new Error(result.error || 'Có lỗi xảy ra khi lưu cột sạc');
        }
        
        // Nếu thành công, hiển thị thông báo
        alert(isEdit ? 'Cập nhật cột sạc thành công!' : 'Thêm cột sạc thành công!');
        
        // Đóng modal
        closeCotSacModal();
        
        // Reload danh sách cột sạc
        await loadCotSac();
        
    } catch (error) {
        // Xử lý lỗi
        console.error('Error saving cot sac:', error);
        alert(error.message || 'Có lỗi xảy ra khi lưu cột sạc. Vui lòng thử lại.');
    } finally {
        // Ẩn loading indicator
        hideLoading();
    }
}

/**
 * Hàm: editCotSac(macot)
 * Mô tả: Mở modal form để sửa thông tin cột sạc
 * @param {string} macot - Mã cột sạc cần sửa
 * @return {void} Không trả về giá trị
 * Chức năng: Gọi openCotSacModal() với mã cột để mở form sửa
 */
function editCotSac(macot) {
    // Kiểm tra mã cột sạc có hợp lệ không
    if (!macot) {
        alert('Mã cột sạc không hợp lệ');
        return;
    }
    
    // Mở modal với mã cột sạc (chế độ sửa)
    openCotSacModal(macot);
}

/**
 * Hàm: deleteCotSac(macot, loaicong)
 * Mô tả: Xóa cột sạc sau khi xác nhận
 * @param {string} macot - Mã cột sạc cần xóa
 * @param {string} loaicong - Loại cổng sạc (để hiển thị trong confirm dialog)
 * @return {Promise<void>} Promise không trả về giá trị
 * Chức năng:
 *   1. Hiển thị dialog xác nhận
 *   2. Nếu xác nhận, gọi API DELETE
 *   3. Reload danh sách sau khi xóa thành công
 */
async function deleteCotSac(macot, loaicong = '') {
    // Kiểm tra mã cột sạc có hợp lệ không
    if (!macot) {
        alert('Mã cột sạc không hợp lệ');
        return;
    }
    
    // Hiển thị dialog xác nhận
    // confirm(): Hiển thị dialog xác nhận, trả về true nếu OK, false nếu Cancel
    const confirmMessage = loaicong 
        ? `Bạn có chắc chắn muốn xóa cột sạc "${loaicong}" (${macot})?\n\nLưu ý: Tất cả phiên sạc và bảo trì liên quan cũng sẽ bị xóa.`
        : `Bạn có chắc chắn muốn xóa cột sạc "${macot}"?\n\nLưu ý: Tất cả phiên sạc và bảo trì liên quan cũng sẽ bị xóa.`;
    
    if (!confirm(confirmMessage)) {
        // Nếu người dùng không xác nhận, dừng lại
        return;
    }
    
    // Hiển thị loading indicator
    showLoading();
    
    try {
        // Gọi API DELETE để xóa cột sạc
        // encodeURIComponent(): Mã hóa URL để tránh ký tự đặc biệt
        // apiFetch(): Helper function từ core.js, tự động thêm credentials: 'include'
        const response = await apiFetch(`${API_BASE}/cotsac.php?id=${encodeURIComponent(macot)}`, {
            method: 'DELETE'  // Phương thức DELETE
        });
        
        // Parse JSON response
        const result = await response.json();
        
        // Kiểm tra response
        if (!response.ok) {
            // Nếu có lỗi, hiển thị thông báo
            throw new Error(result.error || 'Có lỗi xảy ra khi xóa cột sạc');
        }
        
        // Nếu thành công, hiển thị thông báo
        alert('Xóa cột sạc thành công!');
        
        // Reload danh sách cột sạc
        await loadCotSac();
        
    } catch (error) {
        // Xử lý lỗi
        console.error('Error deleting cot sac:', error);
        alert(error.message || 'Có lỗi xảy ra khi xóa cột sạc. Vui lòng thử lại.');
    } finally {
        // Ẩn loading indicator
        hideLoading();
    }
}

// ============================================
// EXPOSE FUNCTIONS TO WINDOW OBJECT
// ============================================

/**
 * Expose các hàm quản lý cột sạc ra window object
 * Mục đích: Cho phép gọi các hàm từ HTML onclick attributes
 * 
 * Khi sử dụng onclick="openCotSacModal()" trong HTML,
 * trình duyệt sẽ tìm hàm trong window scope.
 * Nếu không expose, sẽ báo lỗi "openCotSacModal is not defined"
 */
window.openCotSacModal = openCotSacModal;
window.closeCotSacModal = closeCotSacModal;
window.saveCotSac = saveCotSac;
window.editCotSac = editCotSac;
window.deleteCotSac = deleteCotSac;
window.filterCotSac = filterCotSac;
window.loadCotSac = loadCotSac;

