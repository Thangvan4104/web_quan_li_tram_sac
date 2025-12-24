/**
 * File: assets/js/baotri.js
 * Mô tả: Module JavaScript quản lý trang Bảo Trì
 * 
 * Tác giả: Hệ thống quản lý trạm sạc
 * 
 * Chức năng chính:
 *   1. Load và hiển thị danh sách phiếu bảo trì
 *   2. Tạo phiếu bảo trì mới:
 *      - Chọn trạm sạc cần bảo trì
 *      - Chọn loại bảo trì: toàn trạm hoặc cột sạc cụ thể
 *      - Chọn nhân viên bảo trì (chỉ hiển thị nhân viên có chức vụ "Nhân viên bảo trì" tại trạm đã chọn)
 *      - Nhập ngày bảo trì, nội dung, trạng thái
 *   3. Sửa phiếu bảo trì (cập nhật thông tin và trạng thái)
 *   4. Xóa phiếu bảo trì (với kiểm tra và cập nhật trạng thái trạm/cột sạc)
 *   5. Tự động cập nhật trạng thái trạm/cột sạc khi tạo/sửa/xóa phiếu bảo trì
 * 
 * Quyền truy cập:
 *   - Tất cả nhân viên đã đăng nhập có thể xem danh sách bảo trì
 *   - Tạo/Sửa/Xóa: Tùy theo quyền (thường là admin hoặc quản lý trạm)
 * 
 * API sử dụng:
 *   - GET /api/baotri.php: Lấy danh sách tất cả phiếu bảo trì
 *   - GET /api/baotri.php?id={mabt}: Lấy thông tin chi tiết một phiếu bảo trì
 *   - GET /api/tramsac.php: Lấy danh sách trạm sạc
 *   - GET /api/cotsac.php: Lấy danh sách cột sạc
 *   - GET /api/nhanvien.php: Lấy danh sách nhân viên
 *   - POST /api/baotri.php: Tạo phiếu bảo trì mới
 *   - PUT /api/baotri.php: Cập nhật phiếu bảo trì
 *   - DELETE /api/baotri.php?id={mabt}: Xóa phiếu bảo trì
 * 
 * Cấu trúc dữ liệu:
 *   - window.baotriData: Mảng chứa tất cả phiếu bảo trì
 *   - window.baotriTrams: Mảng chứa danh sách trạm sạc (cache)
 *   - window.baotriCots: Mảng chứa danh sách cột sạc (cache)
 *   - window.baotriNhanViens: Mảng chứa danh sách nhân viên (cache)
 */

// ============================================
// HÀM LOAD BẢO TRÌ
// ============================================

/**
 * Hàm: loadBaoTri()
 * Mô tả: Load và hiển thị danh sách phiếu bảo trì
 * @return {Promise<void>}
 * Chức năng:
 *   1. Gọi API lấy danh sách phiếu bảo trì, trạm sạc, cột sạc, nhân viên cùng lúc (Promise.all)
 *   2. Lưu dữ liệu vào biến toàn cục để dùng cho modal
 *   3. Render danh sách phiếu bảo trì dưới dạng grid cards
 *   4. Hiển thị thông báo lỗi nếu có vấn đề khi load dữ liệu
 */
async function loadBaoTri() {
    const pageElement = document.getElementById('baotri');
    if (!pageElement) return;

    showLoading();

    try {
        // Gọi song song 4 API để lấy dữ liệu cùng lúc (tối ưu performance)
        // Promise.all: Chờ tất cả các promise hoàn thành, nếu một promise lỗi thì toàn bộ sẽ reject
        const [btRes, tramRes, cotRes, nvRes] = await Promise.all([
            apiFetch(`${API_BASE}/baotri.php`),        // Danh sách phiếu bảo trì
            apiFetch(`${API_BASE}/tramsac.php`),       // Danh sách trạm sạc
            apiFetch(`${API_BASE}/cotsac.php`),        // Danh sách cột sạc
            apiFetch(`${API_BASE}/nhanvien.php`)       // Danh sách nhân viên
        ]);

        // Kiểm tra từng response có thành công không (status 200-299)
        if (!btRes.ok) throw new Error(`HTTP error! status: ${btRes.status}`);
        if (!tramRes.ok) throw new Error(`HTTP error! status: ${tramRes.status}`);
        if (!cotRes.ok) throw new Error(`HTTP error! status: ${cotRes.status}`);
        if (!nvRes.ok) throw new Error(`HTTP error! status: ${nvRes.status}`);

        // Parse JSON response thành mảng JavaScript
        const baotris = await btRes.json();
        const trams = await tramRes.json();
        const cots = await cotRes.json();
        const nvs = await nvRes.json();

        // Đảm bảo dữ liệu là mảng (tránh lỗi nếu API trả về null hoặc object)
        const allBT = Array.isArray(baotris) ? baotris : [];
        
        // Lọc các phiếu bảo trì có MaBT hợp lệ
        const safeBT = allBT.filter(bt => {
            if (!bt || !bt.MaBT || typeof bt.MaBT !== 'string' || bt.MaBT.trim() === '') {
                console.warn('loadBaoTri: Skipping invalid maintenance ticket (missing or invalid MaBT):', bt);
                return false;
            }
            return true;
        });
        
        let safeTrams = Array.isArray(trams) ? trams : [];
        const safeCots = Array.isArray(cots) ? cots : [];
        const safeNVs = Array.isArray(nvs) ? nvs : [];

        // Nếu là trưởng trạm (không phải admin), chỉ hiển thị trạm của mình
        const isAdminUser = typeof isAdmin === 'function' ? isAdmin() : false;
        const isTruongTramUser = isTruongTram();
        const currentUser = window.currentUser || {};
        const userMaTram = currentUser.MaTram;
        
        if (!isAdminUser && isTruongTramUser && userMaTram) {
            safeTrams = safeTrams.filter(t => t.MaTram === userMaTram);
        }

        // Lưu vào biến toàn cục (window) để các hàm khác (modal, filter) có thể sử dụng
        // Cache dữ liệu này để không cần gọi API lại mỗi lần mở modal
        window.baotriData = safeBT;
        window.baotriTrams = safeTrams;
        window.baotriCots = safeCots;
        window.baotriNhanViens = safeNVs;

        // Kiểm tra quyền: Admin hoặc trưởng trạm mới được tạo bảo trì
        const canCreateBaoTri = (typeof isAdmin === 'function' && isAdmin()) || isTruongTram();
        
        pageElement.innerHTML = `
            <div class="section-header">
                <h2>Quản Lý Bảo Trì</h2>
                ${canCreateBaoTri ? `
                <button class="btn btn-primary" onclick="openBaoTriModal()">
                    <i class="fas fa-tools"></i> Tạo Bảo Trì Mới
                </button>
                ` : ''}
            </div>

            <div class="results-info">
                <span>Hiển thị <strong>${safeBT.length}</strong> phiếu bảo trì</span>
            </div>

            <div class="baotri-grid" id="baotri-grid">
                ${
                    safeBT.length > 0
                        ? safeBT.map(bt => createBaoTriCard(bt)).join('')
                        : '<div class="empty-state"><i class="fas fa-tools"></i><h3>Chưa có phiếu bảo trì nào</h3></div>'
                }
            </div>
        `;
    } catch (error) {
        console.error('Error loading baotri:', error);
        pageElement.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Không thể tải dữ liệu</h3>
                <p>Đã xảy ra lỗi khi tải danh sách bảo trì. Vui lòng thử lại sau.</p>
                <button class="btn btn-primary" onclick="loadBaoTri()">
                    <i class="fas fa-redo"></i> Thử lại
                </button>
            </div>
        `;
    } finally {
        hideLoading();
    }
}

// ============================================
// HÀM KIỂM TRA QUYỀN
// ============================================

/**
 * Hàm: isTruongTram()
 * Mô tả: Kiểm tra xem user hiện tại có phải trưởng trạm không
 * @return {boolean} true nếu là trưởng trạm, false nếu không
 */
function isTruongTram() {
    const currentUser = window.currentUser || {};
    const chucVu = currentUser.ChucVu || '';
    // Kiểm tra ChucVu có phải "Quản lý trạm" hoặc "Trưởng trạm" không
    return chucVu === 'Quản lý trạm' || chucVu === 'Trưởng trạm';
}

// ============================================
// HÀM TẠO CARD BẢO TRÌ
// ============================================

/**
 * Hàm: createBaoTriCard(bt)
 * Mô tả: Tạo HTML card hiển thị thông tin một phiếu bảo trì
 * @param {Object} bt - Đối tượng phiếu bảo trì chứa: MaBT, NgayBaoTri, NoiDung, MaNV, TenNhanVien, MaCot, LoaiCongSac, TenTram, TrangThai
 * @return {string} HTML string của card phiếu bảo trì
 * Chức năng:
 *   1. Format ngày bảo trì theo định dạng VN (dd/mm/yyyy)
 *   2. Xác định loại bảo trì (cột sạc hay toàn trạm) dựa trên MaCot
 *   3. Xác định trạng thái (Đã hoàn tất / Đang thực hiện) và CSS class tương ứng
 *   4. Render card với đầy đủ thông tin và các nút Edit/Delete (nếu có quyền)
 */
function createBaoTriCard(bt) {
    /**
     * Hàm helper: formatDate(dateStr)
     * Mô tả: Format ngày từ chuỗi YYYY-MM-DD sang định dạng VN (dd/mm/yyyy)
     * @param {string} dateStr - Chuỗi ngày từ database (YYYY-MM-DD)
     * @return {string} Ngày đã format (dd/mm/yyyy) hoặc chuỗi gốc nếu lỗi
     */
    const formatDate = dateStr => {
        if (!dateStr) return '';
        try {
            const d = new Date(dateStr);
            // toLocaleDateString: Chuyển đổi Date object sang chuỗi theo locale VN
            return d.toLocaleDateString('vi-VN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
            });
        } catch {
            // Nếu lỗi parse, trả về chuỗi gốc
            return dateStr;
        }
    };

    // Kiểm tra và đảm bảo MaBT có giá trị hợp lệ
    if (!bt.MaBT || typeof bt.MaBT !== 'string' || bt.MaBT.trim() === '') {
        console.error('createBaoTriCard: Invalid MaBT:', bt);
        return ''; // Trả về chuỗi rỗng nếu không có MaBT hợp lệ
    }
    
    // Xác định loại bảo trì: Nếu có MaCot thì là bảo trì cột sạc, ngược lại là bảo trì toàn trạm
    // !!bt.MaCot: Chuyển thành boolean (true nếu có MaCot, false nếu null/undefined)
    const isCot = !!bt.MaCot;

    // Xác định CSS class cho badge trạng thái
    const statusClass = bt.TrangThai === 'Hoàn tất' ? 'approved' : 'pending';
    
    // Chuẩn hóa MaBT để đảm bảo an toàn
    const safeMaBT = escapeHtml(bt.MaBT.trim());

    // Tạo HTML card với đầy đủ thông tin
    return `
        <div class="baotri-card" data-mabt="${safeMaBT}">
            <!-- Header của card: Mã phiếu, tên trạm và badge trạng thái -->
            <div class="baotri-header">
                <div>
                    <!-- Mã phiếu bảo trì (nhỏ, màu xám) -->
                    <div class="baotri-code">${safeMaBT}</div>
                    <!-- Tên trạm sạc -->
                    <div class="baotri-tram">${escapeHtml(bt.TenTram || 'Không xác định trạm')}</div>
                </div>
                <!-- Badge trạng thái với màu sắc tương ứng -->
                <span class="status-badge ${statusClass}">
                    ${escapeHtml(bt.TrangThai || '')}
                </span>
            </div>
            <!-- Thông tin chi tiết phiếu bảo trì -->
            <div class="baotri-info">
                <!-- Ngày bảo trì -->
                <div class="baotri-info-item">
                    <i class="fas fa-calendar"></i>
                    <span>Ngày bảo trì: ${formatDate(bt.NgayBaoTri)}</span>
                </div>
                <!-- Nhân viên thực hiện -->
                <div class="baotri-info-item">
                    <i class="fas fa-user-cog"></i>
                    <span>Nhân viên: ${escapeHtml(bt.TenNhanVien || bt.MaNV || '')}</span>
                </div>
                <!-- Loại bảo trì: Cột sạc hoặc toàn trạm -->
                <div class="baotri-info-item">
                    <i class="fas ${isCot ? 'fa-charging-station' : 'fa-building'}"></i>
                    <span>${isCot ? `Cột sạc: ${escapeHtml(bt.MaCot || '')} ${bt.LoaiCongSac ? `(${escapeHtml(bt.LoaiCongSac)})` : ''}` : 'Bảo trì toàn trạm'}</span>
                </div>
                <!-- Nội dung bảo trì -->
                <div class="baotri-info-item">
                    <i class="fas fa-info-circle"></i>
                    <span>${escapeHtml(bt.NoiDung || '')}</span>
                </div>
            </div>
            <!-- Các nút hành động: Sửa và Xóa (chỉ admin hoặc trưởng trạm) -->
            ${(typeof isAdmin === 'function' && isAdmin()) || isTruongTram() ? `
            <div class="baotri-actions">
                <button class="btn btn-success btn-sm" onclick="editBaoTri('${safeMaBT}')" title="Sửa phiếu bảo trì">
                    <i class="fas fa-edit"></i> Sửa
                </button>
                <button class="btn btn-danger btn-sm" onclick="deleteBaoTri('${safeMaBT}')" title="Xóa phiếu bảo trì">
                    <i class="fas fa-trash"></i> Xóa
                </button>
            </div>
            ` : ''}
        </div>
    `;
}

// ============================================
// MODAL TẠO BẢO TRÌ
// ============================================

/**
 * Hàm: openBaoTriModal()
 * Mô tả: Mở modal để tạo phiếu bảo trì mới
 * @return {void}
 * Chức năng:
 *   1. Tạo hoặc lấy modal element
 *   2. Render form với các trường: Mã BT, Trạm, Loại bảo trì, Cột sạc, Nhân viên, Ngày, Nội dung, Trạng thái
 *   3. Set ngày mặc định là hôm nay
 *   4. Khởi tạo dropdown nhân viên và cột sạc theo trạm đầu tiên (nếu có)
 *   5. Hiển thị modal với animation
 * Lưu ý: Dropdown cột sạc chỉ hiện khi chọn "Bảo trì cột sạc"
 */
function openBaoTriModal() {
    let modal = document.getElementById('baotri-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'baotri-modal';
        modal.className = 'modal';
        document.body.appendChild(modal);
    }

    // Lọc trạm: Nếu là trưởng trạm (không phải admin), chỉ hiển thị trạm của mình
    let trams = window.baotriTrams || [];
    const isAdminUser = typeof isAdmin === 'function' ? isAdmin() : false;
    const isTruongTramUser = isTruongTram();
    const currentUser = window.currentUser || {};
    const userMaTram = currentUser.MaTram;
    
    // Nếu là trưởng trạm (không phải admin), chỉ hiển thị trạm của mình
    if (!isAdminUser && isTruongTramUser && userMaTram) {
        trams = trams.filter(t => t.MaTram === userMaTram);
    }

    const tramOptions = trams
        .map(
            t =>
                `<option value="${escapeHtml(t.MaTram)}">${escapeHtml(t.TenTram)} (${escapeHtml(
                    t.MaTram
                )})</option>`
        )
        .join('');

    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>Tạo Phiếu Bảo Trì</h2>
                <span class="close" onclick="closeBaoTriModal()">&times;</span>
            </div>
            <form id="baotri-form" onsubmit="saveBaoTri(event)">
                <div class="form-group">
                    <label for="baotri-mabt">Mã Bảo Trì <span class="required">*</span></label>
                    <input
                        type="text"
                        id="baotri-mabt"
                        name="MaBT"
                        required
                        maxlength="5"
                        placeholder="VD: BT001"
                    >
                    <small class="form-hint">Có thể để trống để hệ thống tự tạo.</small>
                </div>

                <div class="form-group">
                    <label for="baotri-matram">Trạm <span class="required">*</span></label>
                    <select id="baotri-matram" name="MaTram" required onchange="onBaoTriTramChange()">
                        <option value="">-- Chọn trạm --</option>
                        ${tramOptions}
                    </select>
                </div>

                <div class="form-group">
                    <label>Loại bảo trì <span class="required">*</span></label>
                    <div class="radio-group">
                        <label>
                            <input type="radio" name="LoaiBaoTri" value="tram" checked onchange="onLoaiBaoTriChange()">
                            Bảo trì toàn trạm
                        </label>
                        <label>
                            <input type="radio" name="LoaiBaoTri" value="cot" onchange="onLoaiBaoTriChange()">
                            Bảo trì cột sạc
                        </label>
                    </div>
                </div>

                <div class="form-group" id="baotri-cot-wrapper" style="display: none;">
                    <label for="baotri-macot">Cột sạc</label>
                    <select id="baotri-macot" name="MaCot">
                        <option value="">-- Chọn cột sạc --</option>
                    </select>
                    <small class="form-hint">Chỉ cần chọn khi bảo trì cột sạc.</small>
                </div>

                <div class="form-group">
                    <label for="baotri-manv">Nhân viên bảo trì <span class="required">*</span></label>
                    <select id="baotri-manv" name="MaNV" required>
                        <option value="">-- Chọn nhân viên --</option>
                    </select>
                    <small class="form-hint">Chỉ hiển thị nhân viên có chức vụ "Nhân viên bảo trì" tại trạm đã chọn.</small>
                </div>

                <div class="form-group">
                    <label for="baotri-ngay">Ngày bảo trì <span class="required">*</span></label>
                    <input type="date" id="baotri-ngay" name="NgayBaoTri" required>
                </div>

                <div class="form-group">
                    <label for="baotri-noidung">Nội dung bảo trì <span class="required">*</span></label>
                    <textarea id="baotri-noidung" name="NoiDung" rows="3" required></textarea>
                </div>

                <div class="form-group">
                    <label for="baotri-trangthai">Trạng thái <span class="required">*</span></label>
                    <select id="baotri-trangthai" name="TrangThai" required>
                        <option value="Đang thực hiện">Đang thực hiện</option>
                        <option value="Hoàn tất">Hoàn tất</option>
                    </select>
                </div>

                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="closeBaoTriModal()">
                        <i class="fas fa-times"></i> Hủy
                    </button>
                    <button type="submit" class="btn btn-primary">
                        <i class="fas fa-save"></i> Lưu Phiếu Bảo Trì
                    </button>
                </div>
            </form>
        </div>
    `;

    // Set ngày mặc định là hôm nay
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    const ngay = document.getElementById('baotri-ngay');
    if (ngay) ngay.value = `${y}-${m}-${d}`;

    modal.classList.add('show');
    modal.onclick = e => {
        if (e.target === modal) {
            closeBaoTriModal();
        }
    };

    // Khởi tạo danh sách nhân viên & cột sạc theo trạm đầu tiên nếu có
    setTimeout(() => {
        onBaoTriTramChange();
        onLoaiBaoTriChange();
    }, 100);
}

/**
 * Hàm: closeBaoTriModal()
 * Mô tả: Đóng modal tạo phiếu bảo trì
 * @return {void}
 */
function closeBaoTriModal() {
    const modal = document.getElementById('baotri-modal');
    if (modal) {
        modal.classList.remove('show'); // Xóa class 'show' để ẩn modal
    }
}

// ============================================
// CẬP NHẬT DROPDOWN THEO TRẠM / LOẠI BẢO TRÌ
// ============================================

/**
 * Hàm: onBaoTriTramChange()
 * Mô tả: Cập nhật danh sách cột sạc và nhân viên bảo trì khi chọn trạm
 * @return {void}
 * Chức năng:
 *   1. Lấy mã trạm đã chọn
 *   2. Lọc danh sách cột sạc theo trạm đã chọn và cập nhật dropdown
 *   3. Lọc danh sách nhân viên theo trạm, chức vụ "Nhân viên bảo trì" và trạng thái đã duyệt
 *   4. Cập nhật dropdown nhân viên bảo trì
 * Lưu ý: Chỉ hiển thị nhân viên có ChucVu = "Nhân viên bảo trì", MaTram = trạm đã chọn, is_approved = 1
 */
function onBaoTriTramChange() {
    const matram = document.getElementById('baotri-matram')?.value || '';
    const cots = window.baotriCots || [];
    const nvs = window.baotriNhanViens || [];

    // Cập nhật danh sách cột sạc theo trạm đã chọn
    const macotSelect = document.getElementById('baotri-macot');
    if (macotSelect) {
        // Lọc cột sạc: chỉ lấy các cột sạc thuộc trạm đã chọn
        const filteredCots = cots.filter(c => c.MaTram === matram);
        
        // Render options: Mã cột - Loại cổng sạc (VD: CS001 - Type 2 AC)
        macotSelect.innerHTML =
            '<option value="">-- Chọn cột sạc --</option>' +
            filteredCots
                .map(
                    c =>
                        `<option value="${escapeHtml(c.MaCot)}">${escapeHtml(c.MaCot)} - ${escapeHtml(
                            c.LoaiCongSac || ''
                        )}</option>`
                )
                .join('');
    }

    // Cập nhật danh sách nhân viên bảo trì theo trạm đã chọn
    const manvSelect = document.getElementById('baotri-manv');
    if (manvSelect) {
        // Lọc nhân viên với điều kiện:
        // 1. Thuộc trạm đã chọn (MaTram === matram)
        // 2. Có chức vụ "Nhân viên bảo trì" (ChucVu === 'Nhân viên bảo trì')
        // 3. Đã được duyệt (is_approved === 1)
        const filteredNVs = nvs.filter(
            nv => nv.MaTram === matram && nv.ChucVu === 'Nhân viên bảo trì' && nv.is_approved === 1
        );
        
        // Render options: Tên nhân viên (Mã NV) (VD: Nguyễn Văn A (NV001))
        manvSelect.innerHTML =
            '<option value="">-- Chọn nhân viên --</option>' +
            filteredNVs
                .map(
                    nv =>
                        `<option value="${escapeHtml(nv.MaNV)}">${escapeHtml(nv.HoTen)} (${escapeHtml(
                            nv.MaNV
                        )})</option>`
                )
                .join('');
    }
}

/**
 * Hàm: onLoaiBaoTriChange()
 * Mô tả: Hiện/ẩn dropdown chọn cột sạc dựa trên loại bảo trì đã chọn
 * @return {void}
 * Chức năng:
 *   1. Lấy giá trị radio button đã chọn (tram hoặc cot)
 *   2. Nếu chọn "Bảo trì cột sạc" (cot): Hiển thị dropdown chọn cột sạc
 *   3. Nếu chọn "Bảo trì toàn trạm" (tram): Ẩn dropdown và reset giá trị về rỗng
 */
function onLoaiBaoTriChange() {
    // Lấy giá trị radio button đã được checked
    // querySelector với :checked: Tìm radio button đang được chọn
    const value = document.querySelector('input[name="LoaiBaoTri"]:checked')?.value || 'tram';
    const cotWrapper = document.getElementById('baotri-cot-wrapper');
    if (!cotWrapper) return; // Nếu không tìm thấy element, dừng lại

    // Nếu chọn "Bảo trì cột sạc", hiển thị dropdown cột sạc
    if (value === 'cot') {
        cotWrapper.style.display = 'block';
    } else {
        // Nếu chọn "Bảo trì toàn trạm", ẩn dropdown và reset giá trị
        cotWrapper.style.display = 'none';
        const macotSelect = document.getElementById('baotri-macot');
        if (macotSelect) macotSelect.value = ''; // Reset về giá trị rỗng
    }
}

// ============================================
// LƯU PHIẾU BẢO TRÌ
// ============================================

/**
 * Hàm: saveBaoTri(event)
 * Mô tả: Lưu phiếu bảo trì mới sau khi submit form
 * @param {Event} event - Event object từ form submit
 * @return {Promise<void>}
 * Chức năng:
 *   1. Lấy dữ liệu từ form
 *   2. Validate dữ liệu bắt buộc
 *   3. Tự động tạo mã phiếu bảo trì nếu không được cung cấp
 *   4. Xác định MaCot và MaTram dựa trên loại bảo trì
 *   5. Gọi API POST để tạo phiếu bảo trì mới
 *   6. Reload danh sách bảo trì sau khi tạo thành công
 * Lưu ý: API sẽ tự động cập nhật trạng thái trạm/cột sạc thành "Bảo trì"
 */
async function saveBaoTri(event) {
    event.preventDefault();

    const form = document.getElementById('baotri-form');
    if (!form) return;

    const formData = new FormData(form);

    // Lấy loại bảo trì (tram: toàn trạm, cot: cột sạc)
    const loaiBaoTri = formData.get('LoaiBaoTri') || 'tram';
    
    // Lấy mã phiếu bảo trì, có thể để trống để hệ thống tự tạo
    let mabt = formData.get('MaBT')?.trim() || '';

    // Tự động tạo mã phiếu bảo trì nếu không được cung cấp
    // Format: BT + 3 số cuối của timestamp (VD: BT123)
    if (!mabt) {
        const ts = Date.now().toString().slice(-3); // Lấy 3 số cuối của timestamp
        mabt = `BT${ts}`;
    }

    // Lấy các giá trị từ form
    const matram = formData.get('MaTram')?.trim() || '';
    // MaCot chỉ có khi chọn "Bảo trì cột sạc"
    const macot = loaiBaoTri === 'cot' ? formData.get('MaCot')?.trim() || '' : '';
    const manv = formData.get('MaNV')?.trim() || '';
    const ngay = formData.get('NgayBaoTri')?.trim() || '';
    const noidung = formData.get('NoiDung')?.trim() || '';
    const trangthai = formData.get('TrangThai')?.trim() || 'Đang thực hiện';

    // Validate dữ liệu bắt buộc
    if (!matram || !manv || !ngay || !noidung) {
        alert('Vui lòng điền đầy đủ thông tin bắt buộc.');
        return;
    }

    // Validate: Nếu chọn "Bảo trì cột sạc" thì phải chọn cột sạc
    if (loaiBaoTri === 'cot' && !macot) {
        alert('Vui lòng chọn cột sạc khi bảo trì cột sạc.');
        return;
    }

    // Chuẩn bị payload để gửi lên server
    // MaCot: null nếu bảo trì toàn trạm, có giá trị nếu bảo trì cột sạc
    // MaTram: Có giá trị để API biết cần cập nhật trạng thái trạm khi bảo trì toàn trạm
    const payload = {
        MaBT: mabt,
        NgayBaoTri: ngay,
        NoiDung: noidung,
        MaNV: manv,
        MaCot: macot || null,  // null nếu bảo trì toàn trạm
        MaTram: matram || null, // Cần có để API cập nhật trạng thái trạm
        TrangThai: trangthai
    };

    showLoading();

    try {
        const response = await apiFetch(`${API_BASE}/baotri.php`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.error || 'Có lỗi xảy ra khi lưu phiếu bảo trì');
        }

        alert('Tạo phiếu bảo trì thành công!');
        closeBaoTriModal();
        await loadBaoTri();
    } catch (error) {
        console.error('Error saving baotri:', error);
        alert(error.message || 'Có lỗi xảy ra khi lưu phiếu bảo trì. Vui lòng thử lại.');
    } finally {
        hideLoading();
    }
}

// ============================================
// EXPOSE HÀM RA WINDOW
// ============================================

// ============================================
// HÀM EDIT VÀ DELETE (CHỈ ADMIN)
// ============================================

/**
 * Hàm: editBaoTri(mabt)
 * Mô tả: Mở modal chỉnh sửa phiếu bảo trì
 * @param {string} mabt - Mã phiếu bảo trì cần chỉnh sửa
 * @return {Promise<void>}
 * Chức năng:
 *   1. Gọi API lấy thông tin chi tiết phiếu bảo trì
 *   2. Hiển thị modal với form đã điền sẵn thông tin
 *   3. Cho phép cập nhật thông tin và trạng thái
 *   4. Khi cập nhật trạng thái thành "Hoàn tất", API sẽ tự động cập nhật trạng thái trạm/cột sạc
 */
async function editBaoTri(mabt) {
    // Kiểm tra và chuẩn hóa mã phiếu bảo trì
    if (!mabt || typeof mabt !== 'string' || mabt.trim() === '') {
        console.error('editBaoTri: Invalid MaBT:', mabt);
        alert('Mã phiếu bảo trì không hợp lệ');
        return;
    }
    
    // Chuẩn hóa mã (loại bỏ khoảng trắng)
    mabt = mabt.trim();
    console.log('editBaoTri: Loading maintenance ticket:', mabt);

    showLoading();
    try {
        // Gọi API lấy thông tin chi tiết phiếu bảo trì
        const apiUrl = `${API_BASE}/baotri.php?id=${encodeURIComponent(mabt)}`;
        console.log('editBaoTri: API URL:', apiUrl);
        
        const response = await apiFetch(apiUrl);
        console.log('editBaoTri: Response status:', response.status);
        
        const bt = await response.json();
        console.log('editBaoTri: Response data:', bt);
        
        // Kiểm tra nếu API trả về lỗi
        if (!response.ok || bt.error) {
            const errorMsg = bt.error || `HTTP error! status: ${response.status}`;
            console.error('editBaoTri: API error:', errorMsg);
            throw new Error(errorMsg);
        }
        
        // Kiểm tra nếu không có dữ liệu
        if (!bt || !bt.MaBT) {
            console.error('editBaoTri: No data or missing MaBT:', bt);
            throw new Error('Không tìm thấy thông tin phiếu bảo trì');
        }

        // Tạo hoặc lấy modal element
        let modal = document.getElementById('baotri-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'baotri-modal';
            modal.className = 'modal';
            document.body.appendChild(modal);
        }

        const trams = window.baotriTrams || [];
        const tramOptions = trams
            .map(
                t =>
                    `<option value="${escapeHtml(t.MaTram)}" ${t.MaTram === (bt.MaTram || '') ? 'selected' : ''}>${escapeHtml(t.TenTram)} (${escapeHtml(t.MaTram)})</option>`
            )
            .join('');

        // Xác định loại bảo trì: Nếu có MaCot thì là bảo trì cột sạc
        const isCotBaoTri = !!bt.MaCot;

        // Render modal với form đã điền sẵn
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Chỉnh Sửa Phiếu Bảo Trì</h2>
                    <span class="close" onclick="closeBaoTriModal()">&times;</span>
                </div>
                <form id="baotri-form" onsubmit="updateBaoTri(event)">
                    <input type="hidden" id="baotri-mabt" name="MaBT" value="${escapeHtml(bt.MaBT)}">

                    <div class="form-group">
                        <label>Mã phiếu bảo trì</label>
                        <div><strong>${escapeHtml(bt.MaBT)}</strong> (Không thể thay đổi)</div>
                    </div>

                    <div class="form-group">
                        <label for="baotri-matram">Trạm <span class="required">*</span></label>
                        <select id="baotri-matram" name="MaTram" required onchange="onBaoTriTramChange()">
                            <option value="">-- Chọn trạm --</option>
                            ${tramOptions}
                        </select>
                    </div>

                    <div class="form-group">
                        <label>Loại bảo trì <span class="required">*</span></label>
                        <div class="radio-group">
                            <label>
                                <input type="radio" name="LoaiBaoTri" value="tram" ${!isCotBaoTri ? 'checked' : ''} onchange="onLoaiBaoTriChange()">
                                Bảo trì toàn trạm
                            </label>
                            <label>
                                <input type="radio" name="LoaiBaoTri" value="cot" ${isCotBaoTri ? 'checked' : ''} onchange="onLoaiBaoTriChange()">
                                Bảo trì cột sạc
                            </label>
                        </div>
                    </div>

                    <div class="form-group" id="baotri-cot-wrapper" style="display: ${isCotBaoTri ? 'block' : 'none'};">
                        <label for="baotri-macot">Cột sạc</label>
                        <select id="baotri-macot" name="MaCot">
                            <option value="">-- Chọn cột sạc --</option>
                        </select>
                    </div>

                    <div class="form-group">
                        <label for="baotri-manv">Nhân viên bảo trì <span class="required">*</span></label>
                        <select id="baotri-manv" name="MaNV" required>
                            <option value="">-- Chọn nhân viên --</option>
                        </select>
                    </div>

                    <div class="form-group">
                        <label for="baotri-ngay">Ngày bảo trì <span class="required">*</span></label>
                        <input type="date" id="baotri-ngay" name="NgayBaoTri" required value="${bt.NgayBaoTri || ''}">
                    </div>

                    <div class="form-group">
                        <label for="baotri-noidung">Nội dung bảo trì <span class="required">*</span></label>
                        <textarea id="baotri-noidung" name="NoiDung" rows="3" required>${escapeHtml(bt.NoiDung || '')}</textarea>
                    </div>

                    <div class="form-group">
                        <label for="baotri-trangthai">Trạng thái <span class="required">*</span></label>
                        <select id="baotri-trangthai" name="TrangThai" required>
                            <option value="Đang thực hiện" ${bt.TrangThai === 'Đang thực hiện' ? 'selected' : ''}>Đang thực hiện</option>
                            <option value="Hoàn tất" ${bt.TrangThai === 'Hoàn tất' ? 'selected' : ''}>Hoàn tất</option>
                        </select>
                    </div>

                    <div class="form-actions">
                        <button type="button" class="btn btn-secondary" onclick="closeBaoTriModal()">
                            <i class="fas fa-times"></i> Hủy
                        </button>
                        <button type="submit" class="btn btn-primary">
                            <i class="fas fa-save"></i> Lưu Thay Đổi
                        </button>
                    </div>
                </form>
            </div>
        `;

        modal.classList.add('show');
        modal.onclick = e => {
            if (e.target === modal) {
                closeBaoTriModal();
            }
        };

        // Khởi tạo dropdown sau khi modal được render
        setTimeout(() => {
            onBaoTriTramChange();
            onLoaiBaoTriChange();
            // Set giá trị cột sạc nếu đang bảo trì cột sạc
            if (isCotBaoTri && bt.MaCot) {
                const macotSelect = document.getElementById('baotri-macot');
                if (macotSelect) {
                    macotSelect.value = bt.MaCot;
                }
            }
            // Set giá trị nhân viên
            if (bt.MaNV) {
                const manvSelect = document.getElementById('baotri-manv');
                if (manvSelect) {
                    manvSelect.value = bt.MaNV;
                }
            }
        }, 100);
    } catch (error) {
        console.error('Error loading baotri for edit:', error);
        const errorMessage = error.message || 'Không thể tải thông tin phiếu bảo trì. Vui lòng thử lại.';
        alert(errorMessage);
    } finally {
        hideLoading();
    }
}

/**
 * Hàm: updateBaoTri(event)
 * Mô tả: Cập nhật phiếu bảo trì sau khi submit form
 * @param {Event} event - Event object từ form submit
 * @return {Promise<void>}
 */
async function updateBaoTri(event) {
    event.preventDefault();

    const form = document.getElementById('baotri-form');
    if (!form) return;

    const formData = new FormData(form);
    const mabt = formData.get('MaBT')?.trim() || '';
    const loaiBaoTri = formData.get('LoaiBaoTri') || 'tram';
    const matram = formData.get('MaTram')?.trim() || '';
    const macot = loaiBaoTri === 'cot' ? formData.get('MaCot')?.trim() || '' : '';
    const manv = formData.get('MaNV')?.trim() || '';
    const ngay = formData.get('NgayBaoTri')?.trim() || '';
    const noidung = formData.get('NoiDung')?.trim() || '';
    const trangthai = formData.get('TrangThai')?.trim() || 'Đang thực hiện';

    if (!mabt || !matram || !manv || !ngay || !noidung) {
        alert('Vui lòng điền đầy đủ thông tin bắt buộc.');
        return;
    }

    if (loaiBaoTri === 'cot' && !macot) {
        alert('Vui lòng chọn cột sạc khi bảo trì cột sạc.');
        return;
    }

    const payload = {
        MaBT: mabt,
        NgayBaoTri: ngay,
        NoiDung: noidung,
        MaNV: manv,
        MaCot: macot || null,
        MaTram: matram || null,
        TrangThai: trangthai
    };

    showLoading();
    try {
        const response = await apiFetch(`${API_BASE}/baotri.php`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.error || 'Có lỗi xảy ra khi cập nhật phiếu bảo trì');
        }

        alert('Cập nhật phiếu bảo trì thành công!');
        closeBaoTriModal();
        await loadBaoTri();
    } catch (error) {
        console.error('Error updating baotri:', error);
        alert(error.message || 'Có lỗi xảy ra khi cập nhật phiếu bảo trì. Vui lòng thử lại.');
    } finally {
        hideLoading();
    }
}

/**
 * Hàm: deleteBaoTri(mabt)
 * Mô tả: Xóa phiếu bảo trì
 * @param {string} mabt - Mã phiếu bảo trì cần xóa
 * @return {Promise<void>}
 * Chức năng:
 *   1. Hiển thị dialog xác nhận
 *   2. Gọi API DELETE để xóa phiếu bảo trì
 *   3. API sẽ tự động cập nhật trạng thái trạm/cột sạc về trạng thái ban đầu
 *   4. Reload danh sách bảo trì
 */
async function deleteBaoTri(mabt) {
    if (!mabt) {
        alert('Mã phiếu bảo trì không hợp lệ');
        return;
    }

    const confirmed = confirm(`Bạn có chắc chắn muốn xóa phiếu bảo trì "${mabt}"?\n\nLưu ý: Hành động này không thể hoàn tác!`);
    if (!confirmed) {
        return;
    }

    showLoading();
    try {
        const response = await apiFetch(`${API_BASE}/baotri.php?id=${encodeURIComponent(mabt)}`, {
            method: 'DELETE'
        });

        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.error || 'Có lỗi xảy ra khi xóa phiếu bảo trì');
        }

        alert('Xóa phiếu bảo trì thành công!');
        await loadBaoTri();
        
        // Reload trang cột sạc để cập nhật trạng thái sau khi xóa bảo trì
        // API đã cập nhật trạng thái cột sạc thành "Rảnh", cần reload để hiển thị
        if (typeof loadCotSac === 'function') {
            console.log('Reloading cột sạc page after deleting maintenance...');
            try {
                await loadCotSac();
            } catch (error) {
                console.warn('Failed to reload cột sạc page:', error);
                // Không throw error vì đây chỉ là refresh, không ảnh hưởng đến việc xóa bảo trì
            }
        }
    } catch (error) {
        console.error('Error deleting baotri:', error);
        alert(error.message || 'Có lỗi xảy ra khi xóa phiếu bảo trì. Vui lòng thử lại.');
    } finally {
        hideLoading();
    }
}

// ============================================
// EXPOSE HÀM RA WINDOW
// ============================================

window.loadBaoTri = loadBaoTri;
window.openBaoTriModal = openBaoTriModal;
window.closeBaoTriModal = closeBaoTriModal;
window.saveBaoTri = saveBaoTri;
window.editBaoTri = editBaoTri;
window.updateBaoTri = updateBaoTri;
window.deleteBaoTri = deleteBaoTri;
window.onBaoTriTramChange = onBaoTriTramChange;
window.onLoaiBaoTriChange = onLoaiBaoTriChange;


