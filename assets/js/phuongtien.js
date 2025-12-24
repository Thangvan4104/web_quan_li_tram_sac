/**
 * File: assets/js/phuongtien.js
 * Mô tả: Module JavaScript quản lý trang Phương Tiện
 * Chức năng: 
 *   - Load và hiển thị danh sách phương tiện
 *   - Tìm kiếm và lọc phương tiện (theo biển số, dòng xe, hãng xe, chủ xe)
 *   - CRUD operations (Create, Read, Update, Delete)
 *   - Modal form để thêm/sửa phương tiện với dropdown chọn khách hàng
 * Tác giả: Hệ thống quản lý trạm sạc
 */

// ============================================
// HÀM LOAD PHƯƠNG TIỆN
// ============================================

/**
 * Hàm: loadPhuongTien()
 * Mô tả: Load và hiển thị danh sách phương tiện với đầy đủ tính năng tìm kiếm và lọc
 * @return {Promise<void>} Promise không trả về giá trị
 * Chức năng:
 *   1. Gọi API lấy danh sách phương tiện (có thông tin chủ xe từ JOIN)
 *   2. Gọi API lấy danh sách khách hàng (để populate dropdown)
 *   3. Tạo HTML với thanh tìm kiếm và bộ lọc
 *   4. Hiển thị danh sách phương tiện dưới dạng card
 *   5. Thiết lập sự kiện tìm kiếm và lọc
 *   6. Xử lý lỗi nếu có
 */
async function loadPhuongTien() {
    // Lấy phần tử container của trang phương tiện
    // getElementById: Tìm phần tử HTML theo ID
    const pageElement = document.getElementById('phuongtien');
    
    // Nếu không tìm thấy thì dừng lại
    // Early return: Tránh xử lý không cần thiết
    if (!pageElement) return;
    
    // Hiển thị loading indicator trong khi đang tải dữ liệu
    showLoading();
    
    try {
        // Gọi API lấy danh sách phương tiện và danh sách khách hàng cùng lúc
        // Promise.all: Chờ tất cả các promise hoàn thành
        const [phuongtiensResponse, khsResponse] = await Promise.all([
            // Gọi API lấy danh sách phương tiện (có thông tin chủ xe từ JOIN)
            // apiFetch(): Helper function từ core.js, tự động thêm credentials: 'include'
            apiFetch(`${API_BASE}/phuongtien.php`),
            // Gọi API lấy danh sách khách hàng (để populate dropdown)
            apiFetch(`${API_BASE}/khachhang.php`)
        ]);
        
        // Kiểm tra response của phương tiện
        if (!phuongtiensResponse.ok) {
            throw new Error(`HTTP error! status: ${phuongtiensResponse.status}`);
        }
        
        // Kiểm tra response của khách hàng
        if (!khsResponse.ok) {
            throw new Error(`HTTP error! status: ${khsResponse.status}`);
        }
        
        // Parse JSON response
        const phuongtiens = await phuongtiensResponse.json();
        const khs = await khsResponse.json();
        
        // Kiểm tra xem phuongtiens và khs có phải là mảng không
        // Array.isArray(): Kiểm tra xem biến có phải mảng không
        const safePhuongtiens = Array.isArray(phuongtiens) ? phuongtiens : [];
        const safeKhs = Array.isArray(khs) ? khs : [];
        
        // Lấy danh sách hãng xe duy nhất từ danh sách phương tiện
        // Set: Tập hợp chỉ chứa các giá trị duy nhất
        // map(): Lấy tất cả hãng xe
        // filter(): Lọc bỏ giá trị null/undefined/rỗng
        // [...new Set()]: Chuyển Set thành mảng và loại bỏ trùng lặp
        const uniqueHangXe = [...new Set(safePhuongtiens.map(pt => pt.HangXe).filter(h => h))].sort();
        
        // Tạo HTML cho dropdown khách hàng
        // map(): Duyệt qua mảng và tạo option cho mỗi khách hàng
        // join(''): Nối tất cả các option lại với nhau
        const khOptions = safeKhs.map(kh => 
            `<option value="${escapeHtml(kh.MaKH)}">${escapeHtml(kh.HoTen)} (${escapeHtml(kh.MaKH)})</option>`
        ).join('');
        
        // Tạo HTML cho dropdown hãng xe
        const hangXeOptions = uniqueHangXe.map(hang => 
            `<option value="${escapeHtml(hang)}">${escapeHtml(hang)}</option>`
        ).join('');
        
        // Tạo HTML và gán vào pageElement
        // innerHTML: Gán nội dung HTML vào phần tử
        pageElement.innerHTML = `
            <!-- Header của section với tiêu đề và nút thêm mới -->
            <div class="section-header">
                <h2>Danh Sách Phương Tiện</h2>
                <!-- Nút thêm phương tiện mới, onclick sẽ gọi hàm openPhuongTienModal() -->
                <button class="btn btn-primary" onclick="openPhuongTienModal()">
                    <i class="fas fa-plus"></i> Thêm Phương Tiện Mới
                </button>
            </div>
            
            <!-- Thanh tìm kiếm và lọc -->
            <div class="filter-section">
                <!-- Ô tìm kiếm -->
                <div class="search-box">
                    <i class="fas fa-search"></i>
                    <!-- 
                        Input tìm kiếm
                        id="phuongtien-search": ID để JavaScript có thể truy cập
                        placeholder: Text gợi ý hiển thị khi input trống
                        oninput: Sự kiện khi người dùng nhập, gọi hàm filterPhuongTien()
                    -->
                    <input 
                        type="text" 
                        id="phuongtien-search" 
                        placeholder="Tìm kiếm theo biển số, dòng xe, hãng xe, chủ xe..." 
                        oninput="filterPhuongTien()"
                    >
                </div>
                
                <!-- Bộ lọc theo khách hàng -->
                <div class="filter-group">
                    <label for="phuongtien-kh-filter">Lọc theo khách hàng:</label>
                    <!-- 
                        Select dropdown để lọc theo khách hàng
                        id="phuongtien-kh-filter": ID để JavaScript có thể truy cập
                        onchange: Sự kiện khi người dùng chọn, gọi hàm filterPhuongTien()
                    -->
                    <select id="phuongtien-kh-filter" onchange="filterPhuongTien()">
                        <option value="">Tất cả khách hàng</option>
                        ${khOptions}
                    </select>
                </div>
                
                <!-- Bộ lọc theo hãng xe -->
                <div class="filter-group">
                    <label for="phuongtien-hang-filter">Lọc theo hãng xe:</label>
                    <!-- 
                        Select dropdown để lọc theo hãng xe
                        id="phuongtien-hang-filter": ID để JavaScript có thể truy cập
                        onchange: Sự kiện khi người dùng chọn, gọi hàm filterPhuongTien()
                    -->
                    <select id="phuongtien-hang-filter" onchange="filterPhuongTien()">
                        <option value="">Tất cả hãng</option>
                        ${hangXeOptions}
                    </select>
                </div>
            </div>
            
            <!-- Thông báo số lượng kết quả -->
            <div class="results-info">
                <span id="phuongtien-count">Hiển thị <strong>${safePhuongtiens.length}</strong> phương tiện</span>
            </div>
            
            <!-- Grid container chứa các card phương tiện -->
            <div class="phuongtien-grid" id="phuongtien-grid">
                ${safePhuongtiens.length > 0 
                    ? safePhuongtiens.map(pt => createPhuongTienCard(pt)).join('')
                    : '<div class="empty-state"><i class="fas fa-car"></i><h3>Chưa có phương tiện nào</h3><p>Nhấn nút "Thêm Phương Tiện Mới" để tạo phương tiện đầu tiên</p></div>'
                }
            </div>
        `;
        
        // Lưu danh sách phương tiện và khách hàng vào biến toàn cục để dùng cho tìm kiếm/lọc
        // window.phuongtienData: Lưu vào window object để có thể truy cập từ các hàm khác
        window.phuongtienData = safePhuongtiens;
        window.phuongtienKhs = safeKhs;  // Lưu danh sách khách hàng để dùng trong modal
        
    } catch (error) {
        // Xử lý lỗi: Hiển thị thông báo lỗi
        // console.error(): In lỗi ra console để debug
        console.error('Error loading phuong tien:', error);
        
        // Hiển thị thông báo lỗi trên giao diện
        pageElement.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Không thể tải dữ liệu</h3>
                <p>Đã xảy ra lỗi khi tải danh sách phương tiện. Vui lòng thử lại sau.</p>
                <button class="btn btn-primary" onclick="loadPhuongTien()">
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
 * Hàm: createPhuongTienCard(pt)
 * Mô tả: Tạo HTML card cho một phương tiện với đầy đủ thông tin
 * @param {Object} pt - Đối tượng chứa thông tin phương tiện (có thể có TenChuXe từ JOIN)
 * @return {string} Chuỗi HTML của card phương tiện
 * Chức năng: 
 *   1. Tạo template HTML để hiển thị thông tin phương tiện
 *   2. Hiển thị biển số, dòng xe, hãng xe, chủ xe
 *   3. Thêm các nút hành động (Sửa, Xóa)
 */
function createPhuongTienCard(pt) {
    // Xác định class CSS cho badge hãng xe
    // Chuyển đổi hãng xe thành class CSS (chữ thường, thay khoảng trắng bằng dấu gạch ngang)
    let brandClass = 'other';
    if (pt.HangXe) {
        const hangXeLower = pt.HangXe.toLowerCase().replace(/\s+/g, '-');
        if (hangXeLower.includes('vinfast')) {
            brandClass = 'vinfast';
        } else if (hangXeLower.includes('pega')) {
            brandClass = 'pega';
        } else if (hangXeLower.includes('tesla')) {
            brandClass = 'tesla';
        }
    }
    
    // Trả về HTML template cho card phương tiện
    // Template string (backtick): Cho phép nhúng biến và xuống dòng
    return `
        <div class="phuongtien-card" data-bienso="${escapeHtml(pt.BienSo)}" data-dongxe="${escapeHtml(pt.DongXe)}" data-hangxe="${escapeHtml(pt.HangXe)}" data-makh="${escapeHtml(pt.MaKH)}">
            <!-- Header của card: Biển số và hãng xe -->
            <div class="phuongtien-header">
                <div>
                    <!-- Biển số phương tiện (nhỏ, màu xám) -->
                    <div class="phuongtien-bienso">${escapeHtml(pt.BienSo)}</div>
                    <!-- Tên dòng xe, escapeHtml để tránh XSS attack -->
                    <div class="phuongtien-name">${escapeHtml(pt.DongXe)}</div>
                    <!-- Badge hãng xe với màu sắc tương ứng -->
                    ${pt.HangXe ? `<span class="brand-badge ${brandClass}">${escapeHtml(pt.HangXe)}</span>` : ''}
                </div>
            </div>
            <!-- Thông tin chi tiết của phương tiện -->
            <div class="phuongtien-info">
                <!-- Thông tin chủ xe -->
                ${pt.TenChuXe ? `
                <div class="phuongtien-info-item">
                    <i class="fas fa-user"></i>
                    <span>Chủ xe: ${escapeHtml(pt.TenChuXe)} (${escapeHtml(pt.MaKH)})</span>
                </div>
                ` : `
                <div class="phuongtien-info-item">
                    <i class="fas fa-user"></i>
                    <span>Chủ xe: Chưa xác định (${escapeHtml(pt.MaKH)})</span>
                </div>
                `}
            </div>
            <!-- Các nút hành động: Sửa và Xóa -->
            <div class="phuongtien-actions">
                <!-- Nút Sửa: Gọi hàm editPhuongTien() với biển số -->
                <button class="btn btn-success btn-sm" onclick="editPhuongTien('${escapeHtml(pt.BienSo)}')" title="Sửa thông tin phương tiện">
                    <i class="fas fa-edit"></i> Sửa
                </button>
                <!-- Nút Xóa: Gọi hàm deletePhuongTien() với biển số -->
                <button class="btn btn-danger btn-sm" onclick="deletePhuongTien('${escapeHtml(pt.BienSo)}', '${escapeHtml(pt.DongXe)}')" title="Xóa phương tiện">
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
 * Hàm: filterPhuongTien()
 * Mô tả: Tìm kiếm và lọc danh sách phương tiện theo từ khóa, khách hàng và hãng xe
 * @return {void} Không trả về giá trị
 * Chức năng:
 *   1. Lấy giá trị từ ô tìm kiếm và các dropdown lọc
 *   2. Lọc danh sách phương tiện theo điều kiện
 *   3. Cập nhật lại giao diện với kết quả đã lọc
 */
function filterPhuongTien() {
    // Lấy danh sách phương tiện từ biến toàn cục
    // window.phuongtienData: Dữ liệu đã được lưu khi load trang
    const allPhuongtiens = window.phuongtienData || [];
    
    // Lấy giá trị từ ô tìm kiếm
    // getElementById: Tìm phần tử HTML theo ID
    // value: Lấy giá trị nhập vào input
    // toLowerCase(): Chuyển sang chữ thường để tìm kiếm không phân biệt hoa thường
    // trim(): Xóa khoảng trắng ở đầu và cuối
    const searchTerm = (document.getElementById('phuongtien-search')?.value || '').toLowerCase().trim();
    
    // Lấy giá trị từ các dropdown lọc
    const khFilter = document.getElementById('phuongtien-kh-filter')?.value || '';
    const hangFilter = document.getElementById('phuongtien-hang-filter')?.value || '';
    
    // Lọc danh sách phương tiện theo điều kiện
    // filter(): Tạo mảng mới chứa các phần tử thỏa mãn điều kiện
    const filteredPhuongtiens = allPhuongtiens.filter(pt => {
        // Kiểm tra điều kiện tìm kiếm
        // includes(): Kiểm tra xem chuỗi có chứa từ khóa không
        const matchesSearch = !searchTerm || 
            (pt.BienSo && pt.BienSo.toLowerCase().includes(searchTerm)) ||
            (pt.DongXe && pt.DongXe.toLowerCase().includes(searchTerm)) ||
            (pt.HangXe && pt.HangXe.toLowerCase().includes(searchTerm)) ||
            (pt.TenChuXe && pt.TenChuXe.toLowerCase().includes(searchTerm)) ||
            (pt.MaKH && pt.MaKH.toLowerCase().includes(searchTerm));
        
        // Kiểm tra điều kiện lọc khách hàng
        // Nếu không chọn khách hàng (rỗng) thì hiển thị tất cả
        const matchesKH = !khFilter || pt.MaKH === khFilter;
        
        // Kiểm tra điều kiện lọc hãng xe
        const matchesHang = !hangFilter || pt.HangXe === hangFilter;
        
        // Trả về true nếu tất cả điều kiện đều thỏa mãn
        return matchesSearch && matchesKH && matchesHang;
    });
    
    // Lấy container grid để hiển thị kết quả
    const gridContainer = document.getElementById('phuongtien-grid');
    
    // Lấy phần tử hiển thị số lượng kết quả
    const countElement = document.getElementById('phuongtien-count');
    
    // Kiểm tra xem các phần tử có tồn tại không
    if (!gridContainer) return;
    
    // Cập nhật số lượng kết quả
    if (countElement) {
        countElement.innerHTML = `Hiển thị <strong>${filteredPhuongtiens.length}</strong> phương tiện`;
    }
    
    // Cập nhật nội dung grid với kết quả đã lọc
    if (filteredPhuongtiens.length > 0) {
        // Tạo HTML cho từng card phương tiện và nối lại
        // map(): Duyệt qua mảng và tạo HTML cho mỗi phần tử
        // join(''): Nối tất cả các chuỗi HTML lại với nhau
        gridContainer.innerHTML = filteredPhuongtiens.map(pt => createPhuongTienCard(pt)).join('');
    } else {
        // Nếu không có kết quả, hiển thị thông báo trống
        gridContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-search"></i>
                <h3>Không tìm thấy phương tiện nào</h3>
                <p>Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc</p>
            </div>
        `;
    }
}

// ============================================
// HÀM CRUD OPERATIONS
// ============================================

/**
 * Hàm: openPhuongTienModal(bienso)
 * Mô tả: Mở modal form để thêm mới hoặc sửa phương tiện
 * @param {string|null} bienso - Biển số phương tiện cần sửa (null nếu thêm mới)
 * @return {Promise<void>} Promise không trả về giá trị
 * Chức năng:
 *   1. Tạo hoặc cập nhật modal form
 *   2. Populate dropdown khách hàng
 *   3. Nếu có bienso, load dữ liệu phương tiện vào form
 *   4. Hiển thị modal
 */
async function openPhuongTienModal(bienso = null) {
    // Kiểm tra xem modal đã tồn tại chưa
    let modal = document.getElementById('phuongtien-modal');
    
    // Nếu chưa tồn tại, tạo modal mới
    if (!modal) {
        // Tạo phần tử div cho modal
        modal = document.createElement('div');
        modal.id = 'phuongtien-modal';
        modal.className = 'modal';
        
        // Thêm modal vào body
        document.body.appendChild(modal);
    }
    
    // Xác định tiêu đề modal (Thêm mới hoặc Sửa)
    const isEdit = bienso !== null;
    const modalTitle = isEdit ? 'Sửa Phương Tiện' : 'Thêm Phương Tiện Mới';
    
    // Lấy danh sách khách hàng từ biến toàn cục hoặc gọi API
    let khs = window.phuongtienKhs || [];
    
    // Nếu chưa có danh sách khách hàng, gọi API để lấy
    if (khs.length === 0) {
        try {
            const response = await apiFetch(`${API_BASE}/khachhang.php`);
            if (response.ok) {
                khs = await response.json();
                window.phuongtienKhs = khs;
            }
        } catch (error) {
            console.error('Error loading khach hang:', error);
        }
    }
    
    // Tạo HTML cho dropdown khách hàng
    const khOptions = khs.map(kh => 
        `<option value="${escapeHtml(kh.MaKH)}">${escapeHtml(kh.HoTen)} (${escapeHtml(kh.MaKH)})</option>`
    ).join('');
    
    // Tạo nội dung modal với form
    modal.innerHTML = `
        <div class="modal-content">
            <!-- Header của modal -->
            <div class="modal-header">
                <h2>${modalTitle}</h2>
                <!-- Nút đóng modal -->
                <span class="close" onclick="closePhuongTienModal()">&times;</span>
            </div>
            
            <!-- Form nhập liệu -->
            <form id="phuongtien-form" onsubmit="savePhuongTien(event)">
                <!-- Biển số (chỉ hiển thị khi sửa, disabled khi thêm mới) -->
                <div class="form-group">
                    <label for="phuongtien-bienso">Biển Số <span class="required">*</span></label>
                    <input 
                        type="text" 
                        id="phuongtien-bienso" 
                        name="BienSo" 
                        required 
                        maxlength="15"
                        ${isEdit ? 'readonly' : ''}
                        placeholder="VD: 29A1-12345"
                        title="Biển số phương tiện (tối đa 15 ký tự)"
                    >
                    <small class="form-hint">Biển số phương tiện (tối đa 15 ký tự, VD: 29A1-12345)</small>
                </div>
                
                <!-- Khách hàng (dropdown) -->
                <div class="form-group">
                    <label for="phuongtien-makh">Chủ Xe (Khách Hàng) <span class="required">*</span></label>
                    <select id="phuongtien-makh" name="MaKH" required>
                        <option value="">-- Chọn khách hàng --</option>
                        ${khOptions}
                    </select>
                </div>
                
                <!-- Dòng xe -->
                <div class="form-group">
                    <label for="phuongtien-dongxe">Dòng Xe <span class="required">*</span></label>
                    <input 
                        type="text" 
                        id="phuongtien-dongxe" 
                        name="DongXe" 
                        required 
                        maxlength="50"
                        placeholder="VD: VinFast VF e34"
                    >
                </div>
                
                <!-- Hãng xe -->
                <div class="form-group">
                    <label for="phuongtien-hangxe">Hãng Xe <span class="required">*</span></label>
                    <input 
                        type="text" 
                        id="phuongtien-hangxe" 
                        name="HangXe" 
                        required 
                        maxlength="50"
                        placeholder="VD: VinFast, Pega, Tesla"
                    >
                </div>
                
                <!-- Các nút hành động -->
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="closePhuongTienModal()">
                        <i class="fas fa-times"></i> Hủy
                    </button>
                    <button type="submit" class="btn btn-primary">
                        <i class="fas fa-save"></i> ${isEdit ? 'Cập nhật' : 'Thêm mới'}
                    </button>
                </div>
            </form>
        </div>
    `;
    
    // Nếu đang sửa, load dữ liệu phương tiện vào form
    if (isEdit && bienso) {
        // Hiển thị loading indicator
        showLoading();
        
        try {
            // Gọi API lấy thông tin phương tiện
            // apiFetch(): Helper function từ core.js, tự động thêm credentials: 'include'
            const response = await apiFetch(`${API_BASE}/phuongtien.php?id=${encodeURIComponent(bienso)}`);
            
            // Kiểm tra response
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            // Parse JSON response
            const pt = await response.json();
            
            // Điền dữ liệu vào form
            // getElementById: Tìm phần tử theo ID
            // value: Gán giá trị cho input/select
            document.getElementById('phuongtien-bienso').value = pt.BienSo || '';
            document.getElementById('phuongtien-makh').value = pt.MaKH || '';
            document.getElementById('phuongtien-dongxe').value = pt.DongXe || '';
            document.getElementById('phuongtien-hangxe').value = pt.HangXe || '';
            
        } catch (error) {
            // Xử lý lỗi
            console.error('Error loading phuong tien data:', error);
            alert('Không thể tải thông tin phương tiện. Vui lòng thử lại.');
            closePhuongTienModal();
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
            closePhuongTienModal();
        }
    };
    
    // Thiết lập sự kiện đóng modal khi nhấn phím ESC
    // keydown: Sự kiện khi nhấn phím
    const handleEscKey = (e) => {
        // key === 'Escape': Kiểm tra xem có phải phím ESC không
        if (e.key === 'Escape') {
            closePhuongTienModal();
            // Xóa event listener sau khi đóng modal
            document.removeEventListener('keydown', handleEscKey);
        }
    };
    
    // Thêm event listener cho phím ESC
    document.addEventListener('keydown', handleEscKey);
    
    // Focus vào ô input đầu tiên (trừ khi đang sửa và biển số là readonly)
    if (!isEdit) {
        setTimeout(() => {
            document.getElementById('phuongtien-bienso')?.focus();
        }, 100);
    } else {
        setTimeout(() => {
            document.getElementById('phuongtien-makh')?.focus();
        }, 100);
    }
}

/**
 * Hàm: closePhuongTienModal()
 * Mô tả: Đóng modal form phương tiện
 * @return {void} Không trả về giá trị
 * Chức năng: Xóa class 'show' để ẩn modal
 */
function closePhuongTienModal() {
    // Lấy phần tử modal
    const modal = document.getElementById('phuongtien-modal');
    
    // Nếu tìm thấy, xóa class 'show' để ẩn modal
    if (modal) {
        modal.classList.remove('show');
    }
}

/**
 * Hàm: savePhuongTien(event)
 * Mô tả: Lưu phương tiện mới hoặc cập nhật phương tiện hiện có
 * @param {Event} event - Event object từ form submit
 * @return {Promise<void>} Promise không trả về giá trị
 * Chức năng:
 *   1. Ngăn chặn form submit mặc định
 *   2. Lấy dữ liệu từ form
 *   3. Validate dữ liệu
 *   4. Gọi API POST (thêm mới) hoặc PUT (cập nhật)
 *   5. Reload danh sách và đóng modal
 */
async function savePhuongTien(event) {
    // Ngăn chặn form submit mặc định (tránh reload trang)
    // preventDefault(): Ngăn chặn hành vi mặc định của event
    event.preventDefault();
    
    // Lấy form element
    const form = document.getElementById('phuongtien-form');
    
    // Kiểm tra form có tồn tại không
    if (!form) return;
    
    // Lấy các giá trị từ form
    // FormData: API để lấy dữ liệu từ form
    const formData = new FormData(form);
    
    // Tạo object chứa dữ liệu phương tiện
    // Object.fromEntries(): Chuyển FormData sang object
    const ptData = {
        BienSo: formData.get('BienSo')?.trim() || '',      // Biển số (Primary Key)
        MaKH: formData.get('MaKH')?.trim() || '',          // Mã khách hàng
        DongXe: formData.get('DongXe')?.trim() || '',      // Dòng xe
        HangXe: formData.get('HangXe')?.trim() || ''        // Hãng xe
    };
    
    // Validate dữ liệu
    // Kiểm tra biển số không được rỗng
    if (!ptData.BienSo) {
        alert('Vui lòng nhập biển số phương tiện');
        document.getElementById('phuongtien-bienso')?.focus();
        return;
    }
    
    // Kiểm tra các trường bắt buộc
    if (!ptData.MaKH || !ptData.DongXe || !ptData.HangXe) {
        alert('Vui lòng điền đầy đủ thông tin bắt buộc');
        return;
    }
    
    // Xác định phương thức HTTP và URL
    // Kiểm tra xem có biển số trong form không (đang sửa)
    const isEdit = document.getElementById('phuongtien-bienso')?.readOnly || false;
    const method = isEdit ? 'PUT' : 'POST';
    const url = `${API_BASE}/phuongtien.php`;
    
    // Hiển thị loading indicator
    showLoading();
    
    try {
        // Gọi API để lưu phương tiện
        // apiFetch(): Helper function từ core.js, tự động thêm credentials: 'include'
        const response = await apiFetch(url, {
            method: method,                    // POST hoặc PUT
            headers: {
                'Content-Type': 'application/json'  // Gửi dữ liệu dạng JSON
            },
            body: JSON.stringify(ptData)     // Chuyển object sang JSON string
        });
        
        // Parse JSON response
        const result = await response.json();
        
        // Kiểm tra response
        if (!response.ok) {
            // Nếu có lỗi, hiển thị thông báo
            throw new Error(result.error || 'Có lỗi xảy ra khi lưu phương tiện');
        }
        
        // Nếu thành công, hiển thị thông báo
        alert(isEdit ? 'Cập nhật phương tiện thành công!' : 'Thêm phương tiện thành công!');
        
        // Đóng modal
        closePhuongTienModal();
        
        // Reload danh sách phương tiện
        await loadPhuongTien();
        
    } catch (error) {
        // Xử lý lỗi
        console.error('Error saving phuong tien:', error);
        alert(error.message || 'Có lỗi xảy ra khi lưu phương tiện. Vui lòng thử lại.');
    } finally {
        // Ẩn loading indicator
        hideLoading();
    }
}

/**
 * Hàm: editPhuongTien(bienso)
 * Mô tả: Mở modal form để sửa thông tin phương tiện
 * @param {string} bienso - Biển số phương tiện cần sửa
 * @return {void} Không trả về giá trị
 * Chức năng: Gọi openPhuongTienModal() với biển số để mở form sửa
 */
function editPhuongTien(bienso) {
    // Kiểm tra biển số có hợp lệ không
    if (!bienso) {
        alert('Biển số không hợp lệ');
        return;
    }
    
    // Mở modal với biển số (chế độ sửa)
    openPhuongTienModal(bienso);
}

/**
 * Hàm: deletePhuongTien(bienso, dongxe)
 * Mô tả: Xóa phương tiện sau khi xác nhận
 * @param {string} bienso - Biển số phương tiện cần xóa
 * @param {string} dongxe - Dòng xe (để hiển thị trong confirm dialog)
 * @return {Promise<void>} Promise không trả về giá trị
 * Chức năng:
 *   1. Hiển thị dialog xác nhận
 *   2. Nếu xác nhận, gọi API DELETE
 *   3. Reload danh sách sau khi xóa thành công
 */
async function deletePhuongTien(bienso, dongxe = '') {
    // Kiểm tra biển số có hợp lệ không
    if (!bienso) {
        alert('Biển số không hợp lệ');
        return;
    }
    
    // Hiển thị dialog xác nhận
    // confirm(): Hiển thị dialog xác nhận, trả về true nếu OK, false nếu Cancel
    const confirmMessage = dongxe 
        ? `Bạn có chắc chắn muốn xóa phương tiện "${dongxe}" (${bienso})?\n\nLưu ý: Tất cả phiên sạc liên quan cũng sẽ bị xóa.`
        : `Bạn có chắc chắn muốn xóa phương tiện "${bienso}"?\n\nLưu ý: Tất cả phiên sạc liên quan cũng sẽ bị xóa.`;
    
    if (!confirm(confirmMessage)) {
        // Nếu người dùng không xác nhận, dừng lại
        return;
    }
    
    // Hiển thị loading indicator
    showLoading();
    
    try {
        // Gọi API DELETE để xóa phương tiện
        // encodeURIComponent(): Mã hóa URL để tránh ký tự đặc biệt
        // apiFetch(): Helper function từ core.js, tự động thêm credentials: 'include'
        const response = await apiFetch(`${API_BASE}/phuongtien.php?id=${encodeURIComponent(bienso)}`, {
            method: 'DELETE'  // Phương thức DELETE
        });
        
        // Parse JSON response
        const result = await response.json();
        
        // Kiểm tra response
        if (!response.ok) {
            // Nếu có lỗi, hiển thị thông báo
            throw new Error(result.error || 'Có lỗi xảy ra khi xóa phương tiện');
        }
        
        // Nếu thành công, hiển thị thông báo
        alert('Xóa phương tiện thành công!');
        
        // Reload danh sách phương tiện
        await loadPhuongTien();
        
    } catch (error) {
        // Xử lý lỗi
        console.error('Error deleting phuong tien:', error);
        alert(error.message || 'Có lỗi xảy ra khi xóa phương tiện. Vui lòng thử lại.');
    } finally {
        // Ẩn loading indicator
        hideLoading();
    }
}

// ============================================
// EXPOSE FUNCTIONS TO WINDOW OBJECT
// ============================================

/**
 * Expose các hàm quản lý phương tiện ra window object
 * Mục đích: Cho phép gọi các hàm từ HTML onclick attributes
 * 
 * Khi sử dụng onclick="openPhuongTienModal()" trong HTML,
 * trình duyệt sẽ tìm hàm trong window scope.
 * Nếu không expose, sẽ báo lỗi "openPhuongTienModal is not defined"
 */
window.openPhuongTienModal = openPhuongTienModal;
window.closePhuongTienModal = closePhuongTienModal;
window.savePhuongTien = savePhuongTien;
window.editPhuongTien = editPhuongTien;
window.deletePhuongTien = deletePhuongTien;
window.filterPhuongTien = filterPhuongTien;
window.loadPhuongTien = loadPhuongTien;

