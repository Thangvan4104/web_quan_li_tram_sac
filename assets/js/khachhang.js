/**
 * File: assets/js/khachhang.js
 * Mô tả: Module JavaScript quản lý trang Khách Hàng
 * Chức năng: 
 *   - Load và hiển thị danh sách khách hàng
 *   - Tìm kiếm và lọc khách hàng (theo tên, SDT, email, phương thức thanh toán)
 *   - CRUD operations (Create, Read, Update, Delete)
 *   - Modal form để thêm/sửa khách hàng
 *   - Hiển thị số lượng phương tiện của mỗi khách hàng
 * Tác giả: Hệ thống quản lý trạm sạc
 */

// ============================================
// HÀM LOAD KHÁCH HÀNG
// ============================================

/**
 * Hàm: loadKhachHang()
 * Mô tả: Load và hiển thị danh sách khách hàng với đầy đủ tính năng tìm kiếm và lọc
 * @return {Promise<void>} Promise không trả về giá trị
 * Chức năng:
 *   1. Gọi API lấy danh sách khách hàng
 *   2. Gọi API lấy danh sách phương tiện (để đếm số phương tiện của mỗi khách hàng)
 *   3. Tạo HTML với thanh tìm kiếm và bộ lọc
 *   4. Hiển thị danh sách khách hàng dưới dạng card
 *   5. Thiết lập sự kiện tìm kiếm và lọc
 *   6. Xử lý lỗi nếu có
 */
async function loadKhachHang() {
    // Lấy phần tử container của trang khách hàng
    // getElementById: Tìm phần tử HTML theo ID
    const pageElement = document.getElementById('khachhang');
    
    // Nếu không tìm thấy thì dừng lại
    // Early return: Tránh xử lý không cần thiết
    if (!pageElement) return;
    
    // Hiển thị loading indicator trong khi đang tải dữ liệu
    showLoading();
    
    try {
        // Gọi API lấy danh sách khách hàng và danh sách phương tiện cùng lúc
        // Promise.all: Chờ tất cả các promise hoàn thành
        const [khsResponse, phuongtiensResponse] = await Promise.all([
            // Gọi API lấy danh sách khách hàng
            // apiFetch(): Helper function từ core.js, tự động thêm credentials: 'include'
            apiFetch(`${API_BASE}/khachhang.php`),
            // Gọi API lấy danh sách phương tiện (để đếm số phương tiện của mỗi khách hàng)
            apiFetch(`${API_BASE}/phuongtien.php`)
        ]);
        
        // Kiểm tra response của khách hàng
        if (!khsResponse.ok) {
            throw new Error(`HTTP error! status: ${khsResponse.status}`);
        }
        
        // Kiểm tra response của phương tiện
        if (!phuongtiensResponse.ok) {
            throw new Error(`HTTP error! status: ${phuongtiensResponse.status}`);
        }
        
        // Parse JSON response
        const khs = await khsResponse.json();
        const phuongtiens = await phuongtiensResponse.json();
        
        // Kiểm tra xem khs và phuongtiens có phải là mảng không
        // Array.isArray(): Kiểm tra xem biến có phải mảng không
        const safeKhs = Array.isArray(khs) ? khs : [];
        const safePhuongtiens = Array.isArray(phuongtiens) ? phuongtiens : [];
        
        // Đếm số phương tiện của mỗi khách hàng
        // reduce(): Duyệt qua mảng và tạo object chứa số lượng phương tiện
        // Key: MaKH, Value: số lượng phương tiện
        const phuongtienCounts = safePhuongtiens.reduce((acc, pt) => {
            // Lấy mã khách hàng từ phương tiện
            const maKH = pt.MaKH;
            // Nếu chưa có trong object thì khởi tạo = 0, sau đó tăng lên 1
            acc[maKH] = (acc[maKH] || 0) + 1;
            return acc;
        }, {});
        
        // Thêm số lượng phương tiện vào mỗi khách hàng
        // map(): Duyệt qua mảng và thêm thuộc tính SoPhuongTien
        const khsWithCount = safeKhs.map(kh => ({
            ...kh,  // Spread operator: Copy tất cả thuộc tính của kh
            SoPhuongTien: phuongtienCounts[kh.MaKH] || 0  // Thêm số lượng phương tiện
        }));
        
        // Tạo HTML và gán vào pageElement
        // innerHTML: Gán nội dung HTML vào phần tử
        pageElement.innerHTML = `
            <!-- Header của section với tiêu đề và nút thêm mới -->
            <div class="section-header">
                <h2>Danh Sách Khách Hàng</h2>
                <!-- Nút thêm khách hàng mới, onclick sẽ gọi hàm openKhachHangModal() -->
                <button class="btn btn-primary" onclick="openKhachHangModal()">
                    <i class="fas fa-plus"></i> Thêm Khách Hàng Mới
                </button>
            </div>
            
            <!-- Thanh tìm kiếm và lọc -->
            <div class="filter-section">
                <!-- Ô tìm kiếm -->
                <div class="search-box">
                    <i class="fas fa-search"></i>
                    <!-- 
                        Input tìm kiếm
                        id="khachhang-search": ID để JavaScript có thể truy cập
                        placeholder: Text gợi ý hiển thị khi input trống
                        oninput: Sự kiện khi người dùng nhập, gọi hàm filterKhachHang()
                    -->
                    <input 
                        type="text" 
                        id="khachhang-search" 
                        placeholder="Tìm kiếm theo tên, SDT, email, mã khách hàng..." 
                        oninput="filterKhachHang()"
                    >
                </div>
                
                <!-- Bộ lọc theo phương thức thanh toán -->
                <div class="filter-group">
                    <label for="khachhang-payment-filter">Lọc theo phương thức thanh toán:</label>
                    <!-- 
                        Select dropdown để lọc theo phương thức thanh toán
                        id="khachhang-payment-filter": ID để JavaScript có thể truy cập
                        onchange: Sự kiện khi người dùng chọn, gọi hàm filterKhachHang()
                    -->
                    <select id="khachhang-payment-filter" onchange="filterKhachHang()">
                        <option value="">Tất cả</option>
                        <option value="Ví điện tử">Ví điện tử</option>
                        <option value="Thẻ ngân hàng">Thẻ ngân hàng</option>
                        <option value="Tiền mặt">Tiền mặt</option>
                    </select>
                </div>
            </div>
            
            <!-- Thông báo số lượng kết quả -->
            <div class="results-info">
                <span id="khachhang-count">Hiển thị <strong>${khsWithCount.length}</strong> khách hàng</span>
            </div>
            
            <!-- Grid container chứa các card khách hàng -->
            <div class="khachhang-grid" id="khachhang-grid">
                ${khsWithCount.length > 0 
                    ? khsWithCount.map(kh => createKhachHangCard(kh)).join('')
                    : '<div class="empty-state"><i class="fas fa-users"></i><h3>Chưa có khách hàng nào</h3><p>Nhấn nút "Thêm Khách Hàng Mới" để tạo khách hàng đầu tiên</p></div>'
                }
            </div>
        `;
        
        // Lưu danh sách khách hàng vào biến toàn cục để dùng cho tìm kiếm/lọc
        // window.khachhangData: Lưu vào window object để có thể truy cập từ các hàm khác
        window.khachhangData = khsWithCount;
        
    } catch (error) {
        // Xử lý lỗi: Hiển thị thông báo lỗi
        // console.error(): In lỗi ra console để debug
        console.error('Error loading khach hang:', error);
        
        // Hiển thị thông báo lỗi trên giao diện
        pageElement.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Không thể tải dữ liệu</h3>
                <p>Đã xảy ra lỗi khi tải danh sách khách hàng. Vui lòng thử lại sau.</p>
                <button class="btn btn-primary" onclick="loadKhachHang()">
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
 * Hàm: createKhachHangCard(kh)
 * Mô tả: Tạo HTML card cho một khách hàng với đầy đủ thông tin
 * @param {Object} kh - Đối tượng chứa thông tin khách hàng (có thể có SoPhuongTien)
 * @return {string} Chuỗi HTML của card khách hàng
 * Chức năng: 
 *   1. Tạo template HTML để hiển thị thông tin khách hàng
 *   2. Hiển thị mã khách hàng, họ tên, SDT, email, phương thức thanh toán
 *   3. Hiển thị số lượng phương tiện
 *   4. Thêm các nút hành động (Sửa, Xóa)
 */
function createKhachHangCard(kh) {
    // Xác định class CSS cho badge phương thức thanh toán
    // Chuyển đổi phương thức thanh toán thành class CSS
    let paymentClass = 'vi-dien-tu';
    if (kh.PhuongThucThanhToan === 'Thẻ ngân hàng') {
        paymentClass = 'the-ngan-hang';
    } else if (kh.PhuongThucThanhToan === 'Tiền mặt') {
        paymentClass = 'tien-mat';
    }
    
    // Trả về HTML template cho card khách hàng
    // Template string (backtick): Cho phép nhúng biến và xuống dòng
    return `
        <div class="khachhang-card" data-makh="${escapeHtml(kh.MaKH)}" data-hoten="${escapeHtml(kh.HoTen)}" data-sdt="${escapeHtml(kh.SDT)}" data-email="${escapeHtml(kh.Email)}" data-phuongthuc="${escapeHtml(kh.PhuongThucThanhToan)}">
            <!-- Header của card: Mã khách hàng và phương thức thanh toán -->
            <div class="khachhang-header">
                <div>
                    <!-- Mã khách hàng (nhỏ, màu xám) -->
                    <div class="khachhang-code">${escapeHtml(kh.MaKH)}</div>
                    <!-- Tên khách hàng, escapeHtml để tránh XSS attack -->
                    <div class="khachhang-name">${escapeHtml(kh.HoTen)}</div>
                    <!-- Badge phương thức thanh toán với màu sắc tương ứng -->
                    ${kh.PhuongThucThanhToan ? `<span class="payment-badge ${paymentClass}">${escapeHtml(kh.PhuongThucThanhToan)}</span>` : ''}
                </div>
            </div>
            <!-- Thông tin chi tiết của khách hàng -->
            <div class="khachhang-info">
                <!-- Thông tin số điện thoại -->
                ${kh.SDT ? `
                <div class="khachhang-info-item">
                    <i class="fas fa-phone"></i>
                    <span>${escapeHtml(kh.SDT)}</span>
                </div>
                ` : ''}
                <!-- Thông tin email -->
                ${kh.Email ? `
                <div class="khachhang-info-item">
                    <i class="fas fa-envelope"></i>
                    <span>${escapeHtml(kh.Email)}</span>
                </div>
                ` : ''}
            </div>
            <!-- Thống kê: Số lượng phương tiện -->
            <div class="khachhang-stats">
                <!-- Số phương tiện -->
                <div class="stat-item">
                    <div class="stat-item-value">${kh.SoPhuongTien || 0}</div>
                    <div class="stat-item-label">Phương tiện</div>
                </div>
            </div>
            <!-- Các nút hành động: Sửa và Xóa -->
            <div class="khachhang-actions">
                <!-- Nút Sửa: Gọi hàm editKhachHang() với mã khách hàng -->
                <button class="btn btn-success btn-sm" onclick="editKhachHang('${escapeHtml(kh.MaKH)}')" title="Sửa thông tin khách hàng">
                    <i class="fas fa-edit"></i> Sửa
                </button>
                <!-- Nút Xóa: Gọi hàm deleteKhachHang() với mã khách hàng -->
                <button class="btn btn-danger btn-sm" onclick="deleteKhachHang('${escapeHtml(kh.MaKH)}', '${escapeHtml(kh.HoTen)}')" title="Xóa khách hàng">
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
 * Hàm: filterKhachHang()
 * Mô tả: Tìm kiếm và lọc danh sách khách hàng theo từ khóa và phương thức thanh toán
 * @return {void} Không trả về giá trị
 * Chức năng:
 *   1. Lấy giá trị từ ô tìm kiếm và dropdown lọc
 *   2. Lọc danh sách khách hàng theo điều kiện
 *   3. Cập nhật lại giao diện với kết quả đã lọc
 */
function filterKhachHang() {
    // Lấy danh sách khách hàng từ biến toàn cục
    // window.khachhangData: Dữ liệu đã được lưu khi load trang
    const allKhs = window.khachhangData || [];
    
    // Lấy giá trị từ ô tìm kiếm
    // getElementById: Tìm phần tử HTML theo ID
    // value: Lấy giá trị nhập vào input
    // toLowerCase(): Chuyển sang chữ thường để tìm kiếm không phân biệt hoa thường
    // trim(): Xóa khoảng trắng ở đầu và cuối
    const searchTerm = (document.getElementById('khachhang-search')?.value || '').toLowerCase().trim();
    
    // Lấy giá trị từ dropdown lọc phương thức thanh toán
    const paymentFilter = document.getElementById('khachhang-payment-filter')?.value || '';
    
    // Lọc danh sách khách hàng theo điều kiện
    // filter(): Tạo mảng mới chứa các phần tử thỏa mãn điều kiện
    const filteredKhs = allKhs.filter(kh => {
        // Kiểm tra điều kiện tìm kiếm
        // includes(): Kiểm tra xem chuỗi có chứa từ khóa không
        const matchesSearch = !searchTerm || 
            (kh.HoTen && kh.HoTen.toLowerCase().includes(searchTerm)) ||
            (kh.SDT && kh.SDT.toLowerCase().includes(searchTerm)) ||
            (kh.Email && kh.Email.toLowerCase().includes(searchTerm)) ||
            (kh.MaKH && kh.MaKH.toLowerCase().includes(searchTerm));
        
        // Kiểm tra điều kiện lọc phương thức thanh toán
        // Nếu không chọn phương thức (rỗng) thì hiển thị tất cả
        const matchesPayment = !paymentFilter || kh.PhuongThucThanhToan === paymentFilter;
        
        // Trả về true nếu cả hai điều kiện đều thỏa mãn
        return matchesSearch && matchesPayment;
    });
    
    // Lấy container grid để hiển thị kết quả
    const gridContainer = document.getElementById('khachhang-grid');
    
    // Lấy phần tử hiển thị số lượng kết quả
    const countElement = document.getElementById('khachhang-count');
    
    // Kiểm tra xem các phần tử có tồn tại không
    if (!gridContainer) return;
    
    // Cập nhật số lượng kết quả
    if (countElement) {
        countElement.innerHTML = `Hiển thị <strong>${filteredKhs.length}</strong> khách hàng`;
    }
    
    // Cập nhật nội dung grid với kết quả đã lọc
    if (filteredKhs.length > 0) {
        // Tạo HTML cho từng card khách hàng và nối lại
        // map(): Duyệt qua mảng và tạo HTML cho mỗi phần tử
        // join(''): Nối tất cả các chuỗi HTML lại với nhau
        gridContainer.innerHTML = filteredKhs.map(kh => createKhachHangCard(kh)).join('');
    } else {
        // Nếu không có kết quả, hiển thị thông báo trống
        gridContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-search"></i>
                <h3>Không tìm thấy khách hàng nào</h3>
                <p>Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc</p>
            </div>
        `;
    }
}

// ============================================
// HÀM CRUD OPERATIONS
// ============================================

/**
 * Hàm: openKhachHangModal(makh)
 * Mô tả: Mở modal form để thêm mới hoặc sửa khách hàng
 * @param {string|null} makh - Mã khách hàng cần sửa (null nếu thêm mới)
 * @return {Promise<void>} Promise không trả về giá trị
 * Chức năng:
 *   1. Tạo hoặc cập nhật modal form
 *   2. Nếu có makh, load dữ liệu khách hàng vào form
 *   3. Hiển thị modal
 */
async function openKhachHangModal(makh = null) {
    // Kiểm tra xem modal đã tồn tại chưa
    let modal = document.getElementById('khachhang-modal');
    
    // Nếu chưa tồn tại, tạo modal mới
    if (!modal) {
        // Tạo phần tử div cho modal
        modal = document.createElement('div');
        modal.id = 'khachhang-modal';
        modal.className = 'modal';
        
        // Thêm modal vào body
        document.body.appendChild(modal);
    }
    
    // Xác định tiêu đề modal (Thêm mới hoặc Sửa)
    const isEdit = makh !== null;
    const modalTitle = isEdit ? 'Sửa Khách Hàng' : 'Thêm Khách Hàng Mới';
    
    // Tạo nội dung modal với form
    modal.innerHTML = `
        <div class="modal-content">
            <!-- Header của modal -->
            <div class="modal-header">
                <h2>${modalTitle}</h2>
                <!-- Nút đóng modal -->
                <span class="close" onclick="closeKhachHangModal()">&times;</span>
            </div>
            
            <!-- Form nhập liệu -->
            <form id="khachhang-form" onsubmit="saveKhachHang(event)">
                <!-- Mã khách hàng (chỉ hiển thị khi sửa, disabled khi thêm mới) -->
                <div class="form-group">
                    <label for="khachhang-makh">Mã Khách Hàng <span class="required">*</span></label>
                    <input 
                        type="text" 
                        id="khachhang-makh" 
                        name="MaKH" 
                        required 
                        maxlength="5"
                        pattern="[A-Z0-9]{5}"
                        ${isEdit ? 'readonly' : ''}
                        placeholder="VD: KH001"
                        title="Mã khách hàng phải có 5 ký tự (chữ hoa hoặc số)"
                    >
                    <small class="form-hint">Mã khách hàng gồm 5 ký tự (VD: KH001)</small>
                </div>
                
                <!-- Họ tên -->
                <div class="form-group">
                    <label for="khachhang-hoten">Họ Tên <span class="required">*</span></label>
                    <input 
                        type="text" 
                        id="khachhang-hoten" 
                        name="HoTen" 
                        required 
                        maxlength="100"
                        placeholder="VD: Nguyễn Văn A"
                    >
                </div>
                
                <!-- Số điện thoại -->
                <div class="form-group">
                    <label for="khachhang-sdt">Số Điện Thoại</label>
                    <input 
                        type="tel" 
                        id="khachhang-sdt" 
                        name="SDT" 
                        maxlength="10"
                        minlength="10"
                        placeholder="VD: 0987654321"
                        pattern="[0-9]{10}"
                        title="Số điện thoại phải có đúng 10 chữ số (nếu nhập)"
                    >
                    <small class="form-hint">Số điện thoại phải có đúng 10 chữ số (không bắt buộc, nhưng phải duy nhất nếu có)</small>
                </div>
                
                <!-- Email -->
                <div class="form-group">
                    <label for="khachhang-email">Email</label>
                    <input 
                        type="email" 
                        id="khachhang-email" 
                        name="Email" 
                        maxlength="100"
                        placeholder="VD: nguyenvana@example.com"
                        title="Email hợp lệ"
                    >
                    <small class="form-hint">Email hợp lệ (không bắt buộc, nhưng phải duy nhất nếu có)</small>
                </div>
                
                <!-- Phương thức thanh toán -->
                <div class="form-group">
                    <label for="khachhang-phuongthuc">Phương Thức Thanh Toán</label>
                    <select id="khachhang-phuongthuc" name="PhuongThucThanhToan">
                        <option value="">-- Chọn phương thức --</option>
                        <option value="Ví điện tử">Ví điện tử</option>
                        <option value="Thẻ ngân hàng">Thẻ ngân hàng</option>
                        <option value="Tiền mặt">Tiền mặt</option>
                    </select>
                    <small class="form-hint">Phương thức thanh toán ưa thích (không bắt buộc)</small>
                </div>
                
                <!-- ============================================ -->
                <!-- PHẦN PHƯƠNG TIỆN (chỉ hiển thị khi thêm mới) -->
                <!-- ============================================ -->
                ${!isEdit ? `
                <hr style="margin: 20px 0; border: none; border-top: 2px solid #e0e0e0;">
                <h3 style="margin-bottom: 15px; color: #333;">Thông Tin Phương Tiện</h3>
                <small style="display: block; margin-bottom: 15px; color: #666;">Nhập thông tin phương tiện đầu tiên của khách hàng (bắt buộc khi thêm mới)</small>
                
                <!-- Biển số phương tiện -->
                <div class="form-group">
                    <label for="khachhang-bienso">Biển Số Phương Tiện <span class="required">*</span></label>
                    <input 
                        type="text" 
                        id="khachhang-bienso" 
                        name="BienSo" 
                        required
                        maxlength="15"
                        placeholder="VD: 29A1-12345"
                        title="Biển số phương tiện (tối đa 15 ký tự)"
                    >
                    <small class="form-hint">Biển số phương tiện (tối đa 15 ký tự, VD: 29A1-12345)</small>
                </div>
                
                <!-- Dòng xe -->
                <div class="form-group">
                    <label for="khachhang-dongxe">Dòng Xe <span class="required">*</span></label>
                    <input 
                        type="text" 
                        id="khachhang-dongxe" 
                        name="DongXe" 
                        required
                        maxlength="50"
                        placeholder="VD: VinFast VF e34"
                    >
                    <small class="form-hint">Dòng xe (VD: VinFast VF e34, Pega)</small>
                </div>
                
                <!-- Hãng xe -->
                <div class="form-group">
                    <label for="khachhang-hangxe">Hãng Xe <span class="required">*</span></label>
                    <input 
                        type="text" 
                        id="khachhang-hangxe" 
                        name="HangXe" 
                        required
                        maxlength="50"
                        placeholder="VD: VinFast, Pega, Tesla"
                    >
                    <small class="form-hint">Hãng xe (VD: VinFast, Pega, Tesla)</small>
                </div>
                ` : ''}
                
                <!-- Các nút hành động -->
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="closeKhachHangModal()">
                        <i class="fas fa-times"></i> Hủy
                    </button>
                    <button type="submit" class="btn btn-primary">
                        <i class="fas fa-save"></i> ${isEdit ? 'Cập nhật' : 'Thêm mới'}
                    </button>
                </div>
            </form>
        </div>
    `;
    
    // Nếu đang sửa, load dữ liệu khách hàng vào form
    if (isEdit && makh) {
        // Hiển thị loading indicator
        showLoading();
        
        try {
            // Gọi API lấy thông tin khách hàng
            // apiFetch(): Helper function từ core.js, tự động thêm credentials: 'include'
            const response = await apiFetch(`${API_BASE}/khachhang.php?id=${encodeURIComponent(makh)}`);
            
            // Kiểm tra response
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            // Parse JSON response
            const kh = await response.json();
            
            // Điền dữ liệu vào form
            // getElementById: Tìm phần tử theo ID
            // value: Gán giá trị cho input/select
            document.getElementById('khachhang-makh').value = kh.MaKH || '';
            document.getElementById('khachhang-hoten').value = kh.HoTen || '';
            document.getElementById('khachhang-sdt').value = kh.SDT || '';
            document.getElementById('khachhang-email').value = kh.Email || '';
            document.getElementById('khachhang-phuongthuc').value = kh.PhuongThucThanhToan || '';
            
        } catch (error) {
            // Xử lý lỗi
            console.error('Error loading khach hang data:', error);
            alert('Không thể tải thông tin khách hàng. Vui lòng thử lại.');
            closeKhachHangModal();
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
            closeKhachHangModal();
        }
    };
    
    // Thiết lập sự kiện đóng modal khi nhấn phím ESC
    // keydown: Sự kiện khi nhấn phím
    const handleEscKey = (e) => {
        // key === 'Escape': Kiểm tra xem có phải phím ESC không
        if (e.key === 'Escape') {
            closeKhachHangModal();
            // Xóa event listener sau khi đóng modal
            document.removeEventListener('keydown', handleEscKey);
        }
    };
    
    // Thêm event listener cho phím ESC
    document.addEventListener('keydown', handleEscKey);
    
    // Focus vào ô input đầu tiên (trừ khi đang sửa và mã khách hàng là readonly)
    if (!isEdit) {
        setTimeout(() => {
            document.getElementById('khachhang-makh')?.focus();
        }, 100);
    } else {
        setTimeout(() => {
            document.getElementById('khachhang-hoten')?.focus();
        }, 100);
    }
}

/**
 * Hàm: closeKhachHangModal()
 * Mô tả: Đóng modal form khách hàng
 * @return {void} Không trả về giá trị
 * Chức năng: Xóa class 'show' để ẩn modal
 */
function closeKhachHangModal() {
    // Lấy phần tử modal
    const modal = document.getElementById('khachhang-modal');
    
    // Nếu tìm thấy, xóa class 'show' để ẩn modal
    if (modal) {
        modal.classList.remove('show');
    }
}

/**
 * Hàm: saveKhachHang(event)
 * Mô tả: Lưu khách hàng mới hoặc cập nhật khách hàng hiện có
 * @param {Event} event - Event object từ form submit
 * @return {Promise<void>} Promise không trả về giá trị
 * Chức năng:
 *   1. Ngăn chặn form submit mặc định
 *   2. Lấy dữ liệu từ form
 *   3. Validate dữ liệu
 *   4. Gọi API POST (thêm mới) hoặc PUT (cập nhật)
 *   5. Reload danh sách và đóng modal
 */
async function saveKhachHang(event) {
    // Ngăn chặn form submit mặc định (tránh reload trang)
    // preventDefault(): Ngăn chặn hành vi mặc định của event
    event.preventDefault();
    
    // Lấy form element
    const form = document.getElementById('khachhang-form');
    
    // Kiểm tra form có tồn tại không
    if (!form) return;
    
    // Lấy các giá trị từ form
    // FormData: API để lấy dữ liệu từ form
    const formData = new FormData(form);
    
    // Xác định xem đang thêm mới hay sửa
    const isEdit = document.getElementById('khachhang-makh')?.readOnly || false;
    
    // Tạo object chứa dữ liệu khách hàng
    // Object.fromEntries(): Chuyển FormData sang object
    const khData = {
        MaKH: formData.get('MaKH')?.trim().toUpperCase() || '',      // Chuyển sang chữ hoa
        HoTen: formData.get('HoTen')?.trim() || '',
        SDT: formData.get('SDT')?.trim() || '',                      // Có thể rỗng
        Email: formData.get('Email')?.trim() || '',                  // Có thể rỗng
        PhuongThucThanhToan: formData.get('PhuongThucThanhToan')?.trim() || ''  // Có thể rỗng
    };
    
    // Nếu đang thêm mới, lấy thông tin phương tiện
    let ptData = null;
    if (!isEdit) {
        ptData = {
            BienSo: formData.get('BienSo')?.trim() || '',
            DongXe: formData.get('DongXe')?.trim() || '',
            HangXe: formData.get('HangXe')?.trim() || '',
            MaKH: khData.MaKH  // Sẽ được set sau khi tạo khách hàng
        };
    }
    
    // Validate dữ liệu
    // Kiểm tra mã khách hàng phải có đúng 5 ký tự
    if (khData.MaKH.length !== 5) {
        alert('Mã khách hàng phải có đúng 5 ký tự (VD: KH001)');
        document.getElementById('khachhang-makh')?.focus();
        return;
    }
    
    // Kiểm tra họ tên bắt buộc
    if (!khData.HoTen) {
        alert('Vui lòng nhập họ tên khách hàng');
        document.getElementById('khachhang-hoten')?.focus();
        return;
    }
    
    // Validate email nếu có
    if (khData.Email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(khData.Email)) {
        alert('Email không hợp lệ');
        document.getElementById('khachhang-email')?.focus();
        return;
    }
    
    // Validate số điện thoại nếu có (chỉ chứa số, đúng 10 ký tự)
    // Chỉ kiểm tra nếu người dùng có nhập số điện thoại
    if (khData.SDT && !/^[0-9]{10}$/.test(khData.SDT)) {
        alert('Số điện thoại phải có đúng 10 chữ số (nếu nhập)');
        document.getElementById('khachhang-sdt')?.focus();
        return;
    }
    
    // Nếu đang thêm mới, validate thông tin phương tiện
    if (!isEdit && ptData) {
        if (!ptData.BienSo || !ptData.DongXe || !ptData.HangXe) {
            alert('Vui lòng điền đầy đủ thông tin phương tiện (Biển số, Dòng xe, Hãng xe)');
            return;
        }
    }
    
    // Xác định phương thức HTTP và URL
    const method = isEdit ? 'PUT' : 'POST';
    const url = `${API_BASE}/khachhang.php`;
    
    // Hiển thị loading indicator
    showLoading();
    
    try {
        // Gọi API để lưu khách hàng
        // apiFetch(): Helper function từ core.js, tự động thêm credentials: 'include'
        const response = await apiFetch(url, {
            method: method,                    // POST hoặc PUT
            headers: {
                'Content-Type': 'application/json'  // Gửi dữ liệu dạng JSON
            },
            body: JSON.stringify(khData)     // Chuyển object sang JSON string
        });
        
        // Parse JSON response
        const result = await response.json();
        
        // Kiểm tra response
        if (!response.ok) {
            // Nếu có lỗi, hiển thị thông báo
            throw new Error(result.error || 'Có lỗi xảy ra khi lưu khách hàng');
        }
        
        // Nếu thành công và đang thêm mới, tạo phương tiện
        if (!isEdit && ptData) {
            // Tạo phương tiện với MaKH vừa tạo
            ptData.MaKH = khData.MaKH;
            
            try {
                const ptResponse = await apiFetch(`${API_BASE}/phuongtien.php`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(ptData)
                });
                
                const ptResult = await ptResponse.json();
                
                if (!ptResponse.ok) {
                    throw new Error(ptResult.error || 'Không thể tạo phương tiện');
                }
                
                // Đóng modal khách hàng
                closeKhachHangModal();
                
                // Tự động mở modal phiên sạc với phương tiện vừa tạo
                // Đợi một chút để đảm bảo dữ liệu đã được cập nhật
                setTimeout(async () => {
                    // Chuyển sang trang phiên sạc
                    const phiensacMenuItem = document.querySelector('.nav-item[data-page="phiensac"]');
                    if (phiensacMenuItem) {
                        phiensacMenuItem.click();
                    }
                    
                    // Đợi trang phiên sạc load xong
                    setTimeout(async () => {
                        // Mở modal phiên sạc với phương tiện đã chọn
                        if (typeof openPhienSacModalWithPhuongTien === 'function') {
                            await openPhienSacModalWithPhuongTien(ptData.BienSo);
                        } else if (typeof openPhienSacModal === 'function') {
                            // Nếu hàm đặc biệt chưa có, dùng hàm thông thường
                            await openPhienSacModal();
                            // Sau đó set giá trị phương tiện
                            setTimeout(() => {
                                const biensoSelect = document.getElementById('phiensac-biensopt');
                                if (biensoSelect) {
                                    biensoSelect.value = ptData.BienSo;
                                }
                            }, 300);
                        }
                    }, 500);
                }, 500);
                
                // Reload danh sách khách hàng
                await loadKhachHang();
                
                alert('Thêm khách hàng và phương tiện thành công! Đang mở form phiên sạc...');
                
            } catch (ptError) {
                console.error('Error creating phuong tien:', ptError);
                alert('Đã tạo khách hàng nhưng không thể tạo phương tiện: ' + ptError.message);
                closeKhachHangModal();
                await loadKhachHang();
            }
        } else {
            // Nếu đang sửa hoặc không có phương tiện, chỉ reload danh sách
            alert(isEdit ? 'Cập nhật khách hàng thành công!' : 'Thêm khách hàng thành công!');
            closeKhachHangModal();
            await loadKhachHang();
        }
        
    } catch (error) {
        // Xử lý lỗi
        console.error('Error saving khach hang:', error);
        alert(error.message || 'Có lỗi xảy ra khi lưu khách hàng. Vui lòng thử lại.');
    } finally {
        // Ẩn loading indicator
        hideLoading();
    }
}

/**
 * Hàm: editKhachHang(makh)
 * Mô tả: Mở modal form để sửa thông tin khách hàng
 * @param {string} makh - Mã khách hàng cần sửa
 * @return {void} Không trả về giá trị
 * Chức năng: Gọi openKhachHangModal() với mã khách hàng để mở form sửa
 */
function editKhachHang(makh) {
    // Kiểm tra mã khách hàng có hợp lệ không
    if (!makh) {
        alert('Mã khách hàng không hợp lệ');
        return;
    }
    
    // Mở modal với mã khách hàng (chế độ sửa)
    openKhachHangModal(makh);
}

/**
 * Hàm: deleteKhachHang(makh, hoten)
 * Mô tả: Xóa khách hàng sau khi xác nhận
 * @param {string} makh - Mã khách hàng cần xóa
 * @param {string} hoten - Họ tên khách hàng (để hiển thị trong confirm dialog)
 * @return {Promise<void>} Promise không trả về giá trị
 * Chức năng:
 *   1. Hiển thị dialog xác nhận
 *   2. Nếu xác nhận, gọi API DELETE
 *   3. Reload danh sách sau khi xóa thành công
 */
async function deleteKhachHang(makh, hoten = '') {
    // Kiểm tra mã khách hàng có hợp lệ không
    if (!makh) {
        alert('Mã khách hàng không hợp lệ');
        return;
    }
    
    // Hiển thị dialog xác nhận
    // confirm(): Hiển thị dialog xác nhận, trả về true nếu OK, false nếu Cancel
    const confirmMessage = hoten 
        ? `Bạn có chắc chắn muốn xóa khách hàng "${hoten}" (${makh})?\n\nLưu ý: Tất cả phương tiện và phiên sạc liên quan cũng sẽ bị xóa.`
        : `Bạn có chắc chắn muốn xóa khách hàng "${makh}"?\n\nLưu ý: Tất cả phương tiện và phiên sạc liên quan cũng sẽ bị xóa.`;
    
    if (!confirm(confirmMessage)) {
        // Nếu người dùng không xác nhận, dừng lại
        return;
    }
    
    // Hiển thị loading indicator
    showLoading();
    
    try {
        // Gọi API DELETE để xóa khách hàng
        // encodeURIComponent(): Mã hóa URL để tránh ký tự đặc biệt
        // apiFetch(): Helper function từ core.js, tự động thêm credentials: 'include'
        const response = await apiFetch(`${API_BASE}/khachhang.php?id=${encodeURIComponent(makh)}`, {
            method: 'DELETE'  // Phương thức DELETE
        });
        
        // Parse JSON response
        const result = await response.json();
        
        // Kiểm tra response
        if (!response.ok) {
            // Nếu có lỗi, hiển thị thông báo
            throw new Error(result.error || 'Có lỗi xảy ra khi xóa khách hàng');
        }
        
        // Nếu thành công, hiển thị thông báo
        alert('Xóa khách hàng thành công!');
        
        // Reload danh sách khách hàng
        await loadKhachHang();
        
    } catch (error) {
        // Xử lý lỗi
        console.error('Error deleting khach hang:', error);
        alert(error.message || 'Có lỗi xảy ra khi xóa khách hàng. Vui lòng thử lại.');
    } finally {
        // Ẩn loading indicator
        hideLoading();
    }
}

// ============================================
// EXPOSE FUNCTIONS TO WINDOW OBJECT
// ============================================

/**
 * Expose các hàm quản lý khách hàng ra window object
 * Mục đích: Cho phép gọi các hàm từ HTML onclick attributes
 * 
 * Khi sử dụng onclick="openKhachHangModal()" trong HTML,
 * trình duyệt sẽ tìm hàm trong window scope.
 * Nếu không expose, sẽ báo lỗi "openKhachHangModal is not defined"
 */
window.openKhachHangModal = openKhachHangModal;
window.closeKhachHangModal = closeKhachHangModal;
window.saveKhachHang = saveKhachHang;
window.editKhachHang = editKhachHang;
window.deleteKhachHang = deleteKhachHang;
window.filterKhachHang = filterKhachHang;
window.loadKhachHang = loadKhachHang;

