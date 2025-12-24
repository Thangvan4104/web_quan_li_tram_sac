/**
 * File: assets/js/nhanvien.js
 * Mô tả: Module JavaScript quản lý trang Nhân Viên
 * 
 * Tác giả: Hệ thống quản lý trạm sạc
 * 
 * Chức năng chính:
 *   1. Load và hiển thị danh sách nhân viên theo từng trạm sạc
 *   2. Tạo nhân viên mới (CHỈ ADMIN)
 *   3. Sửa thông tin nhân viên (CHỈ ADMIN)
 *   4. Xóa nhân viên (CHỈ ADMIN) - với kiểm tra ràng buộc
 *   5. Tìm kiếm và lọc nhân viên theo: tên, mã, email, SĐT, trạm, chức vụ, trạng thái duyệt
 * 
 * Quyền truy cập:
 *   - Xem danh sách: Tất cả nhân viên đã đăng nhập
 *   - Tạo/Sửa/Xóa: CHỈ ADMIN
 * 
 * API sử dụng:
 *   - GET /api/approve.php: Lấy danh sách tất cả nhân viên
 *   - GET /api/nhanvien.php?id={manv}: Lấy thông tin chi tiết một nhân viên
 *   - GET /api/tramsac.php: Lấy danh sách trạm sạc (để chọn khi tạo/sửa)
 *   - POST /api/nhanvien.php: Tạo nhân viên mới
 *   - PUT /api/nhanvien.php: Cập nhật thông tin nhân viên
 *   - DELETE /api/nhanvien.php?id={manv}: Xóa nhân viên
 * 
 * Cấu trúc dữ liệu:
 *   - window.nhanvienData: Mảng chứa tất cả nhân viên (dùng cho filter)
 *   - window.nhanvienTrams: Mảng chứa danh sách trạm sạc (cache)
 */

// ============================================
// HÀM LOAD NHÂN VIÊN
// ============================================

/**
 * Hàm: loadNhanVien()
 * Mô tả: Load và hiển thị danh sách nhân viên, nhóm theo trạm sạc
 * @return {Promise<void>}
 * Chức năng:
 *   1. Gọi API lấy danh sách tất cả nhân viên (kèm thông tin trạm)
 *   2. Nhóm nhân viên theo trạm sạc (MaTram)
 *   3. Hiển thị giao diện với search/filter và danh sách nhân viên đã nhóm
 *   4. Lưu dữ liệu vào window.nhanvienData để dùng cho filter
 */
async function loadNhanVien() {
    // Lấy phần tử container của trang nhân viên
    const pageElement = document.getElementById('nhanvien');
    if (!pageElement) return; // Nếu không tìm thấy, dừng lại

    // Hiển thị loading indicator
    showLoading();

    try {
        // Gọi API lấy danh sách nhân viên (từ nhanvien.php)
        // nhanvien.php sẽ tự động lọc theo trạm cho staff, admin thấy tất cả
        const response = await apiFetch(`${API_BASE}/nhanvien.php`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        // Parse JSON response thành mảng JavaScript
        const data = await response.json();
        // Đảm bảo data là mảng (tránh lỗi nếu API trả về null hoặc object)
        const safeData = Array.isArray(data) ? data : [];

        // Nhóm nhân viên theo trạm sạc (MaTram)
        // reduce(): Duyệt qua từng nhân viên và nhóm lại vào object
        const grouped = safeData.reduce((acc, nv) => {
            // Key để nhóm: MaTram hoặc 'NO_TRAM' nếu chưa có trạm
            const key = nv.MaTram || 'NO_TRAM';
            
            // Nếu chưa có nhóm cho key này, tạo nhóm mới
            if (!acc[key]) {
                acc[key] = {
                    MaTram: nv.MaTram || '',
                    TenTram: nv.TenTram || (nv.MaTram ? `Trạm ${nv.MaTram}` : 'Chưa phân trạm'),
                    items: [] // Mảng chứa danh sách nhân viên trong nhóm
                };
            }
            
            // Thêm nhân viên vào nhóm tương ứng
            acc[key].items.push(nv);
            return acc;
        }, {}); // Khởi tạo với object rỗng

        // Chuyển object grouped thành mảng các nhóm
        const groups = Object.values(grouped);

        pageElement.innerHTML = `
            <div class="section-header">
                <h2>Danh Sách Nhân Viên Theo Trạm</h2>
                ${isAdmin() ? `
                <button class="btn btn-primary" onclick="openCreateNhanVienModal()" title="Tạo nhân viên mới">
                    <i class="fas fa-plus"></i> Thêm Nhân Viên Mới
                </button>
                ` : ''}
            </div>

            <div class="filter-section">
                <div class="search-box">
                    <i class="fas fa-search"></i>
                    <input
                        type="text"
                        id="nhanvien-search"
                        placeholder="Tìm theo tên, mã NV, email, SĐT, chức vụ..."
                        oninput="filterNhanVien()"
                    >
                </div>

                <div class="filter-group">
                    <label for="nhanvien-tram-filter">Lọc theo trạm:</label>
                    <select id="nhanvien-tram-filter" onchange="filterNhanVien()">
                        <option value="">Tất cả trạm</option>
                        ${groups
                            .filter(g => g.MaTram)
                            .map(
                                g =>
                                    `<option value="${escapeHtml(g.MaTram)}">${escapeHtml(
                                        g.TenTram
                                    )} (${escapeHtml(g.MaTram)})</option>`
                            )
                            .join('')}
                        <option value="NO_TRAM">Chưa phân trạm</option>
                    </select>
                </div>

                <div class="filter-group">
                    <label for="nhanvien-chucvu-filter">Lọc theo chức vụ:</label>
                    <select id="nhanvien-chucvu-filter" onchange="filterNhanVien()">
                        <option value="">Tất cả</option>
                        <option value="Quản lý trạm">Quản lý trạm</option>
                        <option value="Nhân viên bảo trì">Nhân viên bảo trì</option>
                        <option value="Nhân viên vận hành">Nhân viên vận hành</option>
                    </select>
                </div>

                <div class="filter-group">
                    <label for="nhanvien-status-filter">Trạng thái duyệt:</label>
                    <select id="nhanvien-status-filter" onchange="filterNhanVien()">
                        <option value="">Tất cả</option>
                        <option value="1">Đã duyệt</option>
                        <option value="0">Chờ duyệt / bị khóa</option>
                    </select>
                </div>
            </div>

            <div class="results-info">
                <span id="nhanvien-count">Hiển thị <strong>${safeData.length}</strong> nhân viên</span>
            </div>

            <div class="nhanvien-group-list" id="nhanvien-groups">
                ${groups.length > 0
                    ? groups.map(group => createNhanVienGroup(group)).join('')
                    : '<div class="empty-state"><i class="fas fa-user-tie"></i><h3>Chưa có nhân viên nào</h3></div>'}
            </div>
        `;

        window.nhanvienData = safeData;
    } catch (error) {
        console.error('Error loading nhan vien:', error);
        pageElement.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Không thể tải dữ liệu</h3>
                <p>Đã xảy ra lỗi khi tải danh sách nhân viên. Vui lòng thử lại sau.</p>
                <button class="btn btn-primary" onclick="loadNhanVien()">
                    <i class="fas fa-redo"></i> Thử lại
                </button>
            </div>
        `;
    } finally {
        hideLoading();
    }
}

// ============================================
// HÀM TẠO HTML NHÓM THEO TRẠM
// ============================================

/**
 * Hàm: createNhanVienGroup(group)
 * Mô tả: Tạo HTML cho một nhóm nhân viên theo trạm
 * @param {Object} group - Đối tượng nhóm chứa: MaTram, TenTram, items (mảng nhân viên)
 * @return {string} HTML string của nhóm nhân viên
 * Chức năng:
 *   1. Xác định tiêu đề nhóm (tên trạm hoặc "Chưa phân trạm")
 *   2. Render header với tên trạm và số lượng nhân viên
 *   3. Render danh sách cards nhân viên trong nhóm
 */
function createNhanVienGroup(group) {
    // Xác định mã trạm, nếu không có thì dùng 'NO_TRAM' (chưa phân trạm)
    const maTram = group.MaTram || 'NO_TRAM';
    
    // Xác định tiêu đề nhóm: nếu chưa phân trạm thì hiển thị "Nhân Viên Chưa Phân Trạm"
    // Ngược lại hiển thị tên trạm kèm mã trạm
    const title =
        maTram === 'NO_TRAM'
            ? 'Nhân Viên Chưa Phân Trạm'
            : `${escapeHtml(group.TenTram)} (${escapeHtml(maTram)})`;

    // Tạo HTML cho nhóm nhân viên
    return `
        <div class="nhanvien-group" data-matram="${escapeHtml(maTram)}">
            <!-- Header của nhóm: Tên trạm và số lượng nhân viên -->
            <div class="nhanvien-group-header">
                <h3>${title}</h3>
                <span class="group-count">${group.items.length} nhân viên</span>
            </div>
            <!-- Grid chứa các cards nhân viên -->
            <div class="nhanvien-grid">
                ${group.items.map(nv => createNhanVienCard(nv)).join('')}
            </div>
        </div>
    `;
}

// ============================================
// HÀM TẠO CARD NHÂN VIÊN
// ============================================

/**
 * Hàm: createNhanVienCard(nv)
 * Mô tả: Tạo HTML card hiển thị thông tin một nhân viên
 * @param {Object} nv - Đối tượng nhân viên chứa thông tin: MaNV, HoTen, Email, SDT, ChucVu, MaTram, role, is_approved
 * @return {string} HTML string của card nhân viên
 * Chức năng:
 *   1. Xác định trạng thái duyệt (Đã duyệt / Chờ duyệt)
 *   2. Xác định vai trò (Admin / Nhân viên)
 *   3. Render card với thông tin nhân viên và các nút Edit/Delete (chỉ admin)
 */
function createNhanVienCard(nv) {
    // Kiểm tra trạng thái duyệt: is_approved = 1 hoặc '1' là đã duyệt
    const isApproved = nv.is_approved === 1 || nv.is_approved === '1';
    const statusClass = isApproved ? 'approved' : 'pending'; // CSS class cho badge
    const statusText = isApproved ? 'Đã duyệt' : 'Chờ duyệt / Khóa'; // Text hiển thị

    // Xác định vai trò và CSS class tương ứng
    const roleText = nv.role === 'admin' ? 'Admin' : 'Nhân viên';
    const roleClass = nv.role === 'admin' ? 'admin-badge' : 'staff-badge';

    // Tạo HTML card với các nút Edit/Delete chỉ hiện cho admin
    return `
        <div class="nhanvien-card" data-manv="${escapeHtml(nv.MaNV)}" data-matram="${escapeHtml(
        nv.MaTram || ''
    )}" data-chucvu="${escapeHtml(nv.ChucVu || '')}" data-approved="${isApproved ? '1' : '0'}">
            <!-- Header của card: Mã NV, tên và badge trạng thái -->
            <div class="nhanvien-header">
                <div>
                    <!-- Mã nhân viên (nhỏ, màu xám) -->
                    <div class="nhanvien-code">${escapeHtml(nv.MaNV)}</div>
                    <!-- Tên nhân viên, escapeHtml để tránh XSS attack -->
                    <div class="nhanvien-name">${escapeHtml(nv.HoTen)}</div>
                </div>
                <!-- Badge trạng thái duyệt với màu sắc tương ứng -->
                <span class="status-badge ${statusClass}">${statusText}</span>
            </div>
            <!-- Thông tin chi tiết của nhân viên -->
            <div class="nhanvien-info">
                <!-- Chức vụ trong trạm -->
                <div class="nhanvien-info-item">
                    <i class="fas fa-briefcase"></i>
                    <span>${escapeHtml(nv.ChucVu || 'Chưa phân chức vụ')}</span>
                </div>
                <!-- Vai trò hệ thống (Admin/Nhân viên) -->
                <div class="nhanvien-info-item">
                    <i class="fas fa-user-tag"></i>
                    <span>Vai trò: <span class="${roleClass}">${roleText}</span></span>
                </div>
                <!-- Email (chỉ hiện nếu có) -->
                ${nv.Email ? `
                <div class="nhanvien-info-item">
                    <i class="fas fa-envelope"></i>
                    <span>${escapeHtml(nv.Email)}</span>
                </div>` : ''}
                <!-- Số điện thoại (chỉ hiện nếu có) -->
                ${nv.SDT ? `
                <div class="nhanvien-info-item">
                    <i class="fas fa-phone"></i>
                    <span>${escapeHtml(nv.SDT)}</span>
                </div>` : ''}
            </div>
            <!-- Các nút hành động: Chỉ hiện cho admin -->
            ${isAdmin() ? `
            <div class="nhanvien-actions">
                <!-- Nút Sửa: Mở modal chỉnh sửa thông tin nhân viên -->
                <button class="btn btn-success btn-sm" onclick="editNhanVien('${escapeHtml(nv.MaNV)}')" title="Sửa thông tin nhân viên">
                    <i class="fas fa-edit"></i> Sửa
                </button>
                <!-- Nút Xóa: Xóa nhân viên khỏi hệ thống -->
                <button class="btn btn-danger btn-sm" onclick="deleteNhanVien('${escapeHtml(nv.MaNV)}', '${escapeHtml(nv.HoTen)}')" title="Xóa nhân viên">
                    <i class="fas fa-trash"></i> Xóa
                </button>
            </div>
            ` : ''}
        </div>
    `;
}

// ============================================
// HÀM TÌM KIẾM / LỌC
// ============================================

function filterNhanVien() {
    const all = window.nhanvienData || [];

    const searchTerm =
        (document.getElementById('nhanvien-search')?.value || '').toLowerCase().trim();
    const tramFilter = document.getElementById('nhanvien-tram-filter')?.value || '';
    const chucvuFilter = document.getElementById('nhanvien-chucvu-filter')?.value || '';
    const statusFilter = document.getElementById('nhanvien-status-filter')?.value || '';

    const filtered = all.filter(nv => {
        const matchesSearch =
            !searchTerm ||
            (nv.HoTen && nv.HoTen.toLowerCase().includes(searchTerm)) ||
            (nv.MaNV && nv.MaNV.toLowerCase().includes(searchTerm)) ||
            (nv.Email && nv.Email.toLowerCase().includes(searchTerm)) ||
            (nv.SDT && nv.SDT.toLowerCase().includes(searchTerm)) ||
            (nv.ChucVu && nv.ChucVu.toLowerCase().includes(searchTerm));

        const maTram = nv.MaTram || 'NO_TRAM';
        const matchesTram = !tramFilter || maTram === tramFilter;

        const matchesChucVu = !chucvuFilter || nv.ChucVu === chucvuFilter;

        const isApproved = nv.is_approved === 1 || nv.is_approved === '1';
        const matchesStatus =
            !statusFilter ||
            (statusFilter === '1' && isApproved) ||
            (statusFilter === '0' && !isApproved);

        return matchesSearch && matchesTram && matchesChucVu && matchesStatus;
    });

    // Nhóm lại theo trạm sau khi lọc
    const grouped = filtered.reduce((acc, nv) => {
        const key = nv.MaTram || 'NO_TRAM';
        if (!acc[key]) {
            acc[key] = {
                MaTram: nv.MaTram || 'NO_TRAM',
                TenTram: nv.TenTram || (nv.MaTram ? `Trạm ${nv.MaTram}` : 'Chưa phân trạm'),
                items: []
            };
        }
        acc[key].items.push(nv);
        return acc;
    }, {});

    const groups = Object.values(grouped);

    const container = document.getElementById('nhanvien-groups');
    const countElement = document.getElementById('nhanvien-count');

    if (countElement) {
        countElement.innerHTML = `Hiển thị <strong>${filtered.length}</strong> nhân viên`;
    }

    if (!container) return;

    if (groups.length > 0) {
        container.innerHTML = groups.map(group => createNhanVienGroup(group)).join('');
    } else {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-search"></i>
                <h3>Không tìm thấy nhân viên nào</h3>
                <p>Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc</p>
            </div>
        `;
    }
}

// ============================================
// EXPOSE HÀM RA WINDOW
// ============================================

/**
 * Hàm: openCreateNhanVienModal()
 * Mô tả: Mở modal để admin tạo nhân viên mới (dùng chung với approve.js)
 * @return {Promise<void>}
 * Chức năng:
 *   1. Load danh sách trạm sạc (nếu chưa có trong cache)
 *   2. Tạo modal với form nhập thông tin nhân viên
 *   3. Hiển thị modal cho admin điền thông tin
 * Lưu ý: Hàm này cũng được dùng trong approve.js, nên modal ID phải giống nhau
 */
async function openCreateNhanVienModal() {
    // Load danh sách trạm sạc nếu chưa có
    let trams = window.nhanvienTrams || [];
    if (trams.length === 0) {
        try {
            const tramsResponse = await apiFetch(`${API_BASE}/tramsac.php`);
            if (tramsResponse.ok) {
                trams = await tramsResponse.json();
                window.nhanvienTrams = trams;
            } else {
                trams = [];
            }
        } catch (error) {
            console.error('Error loading trams:', error);
            trams = [];
        }
    }

    let modal = document.getElementById('create-nhanvien-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'create-nhanvien-modal';
        modal.className = 'modal';
        document.body.appendChild(modal);
    }

    const tramOptions = trams.map(t => 
        `<option value="${escapeHtml(t.MaTram)}">${escapeHtml(t.TenTram)} (${escapeHtml(t.MaTram)})</option>`
    ).join('');

    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>Tạo Nhân Viên Mới</h2>
                <span class="close" onclick="closeCreateNhanVienModal()">&times;</span>
            </div>
            <form id="create-nhanvien-form" onsubmit="saveNhanVien(event)">
                <div class="form-group">
                    <label for="create-nv-email">Email <span class="required">*</span></label>
                    <input type="email" id="create-nv-email" name="Email" required placeholder="example@email.com">
                </div>

                <div class="form-group">
                    <label for="create-nv-hoten">Họ và tên <span class="required">*</span></label>
                    <input type="text" id="create-nv-hoten" name="HoTen" required placeholder="Nguyễn Văn A">
                </div>

                <div class="form-group">
                    <label for="create-nv-sdt">Số điện thoại</label>
                    <input type="tel" id="create-nv-sdt" name="SDT" placeholder="0912345678">
                </div>

                <div class="form-group">
                    <label for="create-nv-matram">Trạm làm việc <span class="required">*</span></label>
                    <select id="create-nv-matram" name="MaTram" required>
                        <option value="">-- Chọn trạm --</option>
                        ${tramOptions}
                    </select>
                </div>

                <div class="form-group">
                    <label for="create-nv-chucvu">Chức vụ trong trạm <span class="required">*</span></label>
                    <select id="create-nv-chucvu" name="ChucVu" required>
                        <option value="">-- Chọn chức vụ --</option>
                        <option value="Quản lý trạm">Quản lý trạm</option>
                        <option value="Nhân viên bảo trì">Nhân viên bảo trì</option>
                        <option value="Nhân viên vận hành">Nhân viên vận hành</option>
                    </select>
                </div>

                <div class="form-info">
                    <i class="fas fa-info-circle"></i>
                    <span>Mật khẩu mặc định: <strong>staff123</strong> (nhân viên sẽ phải đổi mật khẩu khi đăng nhập lần đầu)</span>
                </div>

                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="closeCreateNhanVienModal()">
                        <i class="fas fa-times"></i> Hủy
                    </button>
                    <button type="submit" class="btn btn-primary">
                        <i class="fas fa-save"></i> Tạo Nhân Viên
                    </button>
                </div>
            </form>
        </div>
    `;

    modal.classList.add('show');
    modal.onclick = (e) => {
        if (e.target === modal) {
            closeCreateNhanVienModal();
        }
    };
}

function closeCreateNhanVienModal() {
    const modal = document.getElementById('create-nhanvien-modal');
    if (modal) {
        modal.classList.remove('show');
    }
}

/**
 * Hàm: saveNhanVien(event)
 * Mô tả: Lưu nhân viên mới sau khi submit form
 * @param {Event} event - Event object từ form submit
 * @return {Promise<void>}
 * Chức năng:
 *   1. Lấy dữ liệu từ form
 *   2. Validate dữ liệu bắt buộc
 *   3. Gọi API POST để tạo nhân viên mới
 *   4. Hiển thị thông báo thành công và reload danh sách
 * Lưu ý: Mật khẩu mặc định "staff123" sẽ được set tự động bởi API
 */
async function saveNhanVien(event) {
    event.preventDefault();

    const form = document.getElementById('create-nhanvien-form');
    if (!form) return;

    const formData = new FormData(form);
    const email = formData.get('Email')?.trim() || '';
    const hoten = formData.get('HoTen')?.trim() || '';
    const sdt = formData.get('SDT')?.trim() || '';
    const matram = formData.get('MaTram')?.trim() || '';
    const chucvu = formData.get('ChucVu')?.trim() || '';

    if (!email || !hoten || !matram || !chucvu) {
        alert('Vui lòng điền đầy đủ thông tin bắt buộc.');
        return;
    }

    showLoading();
    try {
        const data = {
            Email: email,
            HoTen: hoten,
            SDT: sdt || null,
            MaTram: matram,
            ChucVu: chucvu
            // MaNV sẽ được tự động tạo bởi API
        };

        const response = await apiFetch(`${API_BASE}/nhanvien.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.error || 'Có lỗi xảy ra khi tạo nhân viên');
        }

        alert('Tạo nhân viên thành công! Mật khẩu mặc định: staff123');
        closeCreateNhanVienModal();
        // Reload trang quản lý nhân viên
        await loadNhanVien();
        // Nếu đang ở trang duyệt, reload luôn
        if (typeof loadApprove === 'function') {
            await loadApprove();
        }
    } catch (error) {
        console.error('Error creating nhan vien:', error);
        alert(error.message || 'Có lỗi xảy ra khi tạo nhân viên. Vui lòng thử lại.');
    } finally {
        hideLoading();
    }
}

/**
 * Hàm: editNhanVien(manv)
 * Mô tả: Mở modal chỉnh sửa thông tin nhân viên
 * @param {string} manv - Mã nhân viên cần chỉnh sửa
 * @return {Promise<void>}
 * Chức năng:
 *   1. Gọi API lấy thông tin chi tiết nhân viên
 *   2. Load danh sách trạm sạc
 *   3. Hiển thị modal với form đã điền sẵn thông tin nhân viên
 */
async function editNhanVien(manv) {
    if (!manv) {
        alert('Mã nhân viên không hợp lệ');
        return;
    }

    showLoading();
    try {
        // Gọi API lấy thông tin chi tiết nhân viên và danh sách trạm sạc cùng lúc
        const [nvResponse, tramsResponse] = await Promise.all([
            apiFetch(`${API_BASE}/nhanvien.php?id=${encodeURIComponent(manv)}`),
            apiFetch(`${API_BASE}/tramsac.php`)
        ]);

        if (!nvResponse.ok) {
            throw new Error(`HTTP error! status: ${nvResponse.status}`);
        }
        if (!tramsResponse.ok) {
            throw new Error(`HTTP error! status: ${tramsResponse.status}`);
        }

        const nv = await nvResponse.json();
        const trams = await tramsResponse.json();

        // Tạo hoặc lấy modal element
        let modal = document.getElementById('edit-nhanvien-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'edit-nhanvien-modal';
            modal.className = 'modal';
            document.body.appendChild(modal);
        }

        // Tạo options cho dropdown trạm sạc
        const tramOptions = trams.map(t => {
            const selected = t.MaTram === nv.MaTram ? 'selected' : '';
            return `<option value="${escapeHtml(t.MaTram)}" ${selected}>${escapeHtml(t.TenTram)} (${escapeHtml(t.MaTram)})</option>`;
        }).join('');

        // Render modal với form đã điền sẵn thông tin
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Chỉnh Sửa Nhân Viên</h2>
                    <span class="close" onclick="closeEditNhanVienModal()">&times;</span>
                </div>
                <form id="edit-nhanvien-form" onsubmit="updateNhanVien(event)">
                    <!-- Hidden field để lưu mã nhân viên (không thể sửa) -->
                    <input type="hidden" id="edit-nv-manv" name="MaNV" value="${escapeHtml(nv.MaNV)}">

                    <div class="form-group">
                        <label>Mã nhân viên</label>
                        <div><strong>${escapeHtml(nv.MaNV)}</strong> (Không thể thay đổi)</div>
                    </div>

                    <div class="form-group">
                        <label for="edit-nv-email">Email <span class="required">*</span></label>
                        <input type="email" id="edit-nv-email" name="Email" required placeholder="example@email.com" value="${escapeHtml(nv.Email || '')}">
                    </div>

                    <div class="form-group">
                        <label for="edit-nv-hoten">Họ và tên <span class="required">*</span></label>
                        <input type="text" id="edit-nv-hoten" name="HoTen" required placeholder="Nguyễn Văn A" value="${escapeHtml(nv.HoTen || '')}">
                    </div>

                    <div class="form-group">
                        <label for="edit-nv-sdt">Số điện thoại</label>
                        <input type="tel" id="edit-nv-sdt" name="SDT" placeholder="0912345678" value="${escapeHtml(nv.SDT || '')}">
                    </div>

                    <div class="form-group">
                        <label for="edit-nv-matram">Trạm làm việc <span class="required">*</span></label>
                        <select id="edit-nv-matram" name="MaTram" required>
                            <option value="">-- Chọn trạm --</option>
                            ${tramOptions}
                        </select>
                    </div>

                    <div class="form-group">
                        <label for="edit-nv-chucvu">Chức vụ trong trạm <span class="required">*</span></label>
                        <select id="edit-nv-chucvu" name="ChucVu" required>
                            <option value="">-- Chọn chức vụ --</option>
                            <option value="Quản lý trạm" ${nv.ChucVu === 'Quản lý trạm' ? 'selected' : ''}>Quản lý trạm</option>
                            <option value="Nhân viên bảo trì" ${nv.ChucVu === 'Nhân viên bảo trì' ? 'selected' : ''}>Nhân viên bảo trì</option>
                            <option value="Nhân viên vận hành" ${nv.ChucVu === 'Nhân viên vận hành' ? 'selected' : ''}>Nhân viên vận hành</option>
                        </select>
                    </div>

                    <div class="form-actions">
                        <button type="button" class="btn btn-secondary" onclick="closeEditNhanVienModal()">
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
        modal.onclick = (e) => {
            if (e.target === modal) {
                closeEditNhanVienModal();
            }
        };
    } catch (error) {
        console.error('Error loading nhan vien for edit:', error);
        alert('Không thể tải thông tin nhân viên. Vui lòng thử lại.');
    } finally {
        hideLoading();
    }
}

/**
 * Hàm: closeEditNhanVienModal()
 * Mô tả: Đóng modal chỉnh sửa nhân viên
 * @return {void}
 */
function closeEditNhanVienModal() {
    const modal = document.getElementById('edit-nhanvien-modal');
    if (modal) {
        modal.classList.remove('show');
    }
}

/**
 * Hàm: updateNhanVien(event)
 * Mô tả: Cập nhật thông tin nhân viên sau khi submit form
 * @param {Event} event - Event object từ form submit
 * @return {Promise<void>}
 * Chức năng:
 *   1. Lấy dữ liệu từ form
 *   2. Validate dữ liệu
 *   3. Gọi API PUT để cập nhật
 *   4. Reload danh sách nhân viên
 */
async function updateNhanVien(event) {
    event.preventDefault();

    const form = document.getElementById('edit-nhanvien-form');
    if (!form) return;

    const formData = new FormData(form);
    const manv = formData.get('MaNV')?.trim() || '';
    const email = formData.get('Email')?.trim() || '';
    const hoten = formData.get('HoTen')?.trim() || '';
    const sdt = formData.get('SDT')?.trim() || '';
    const matram = formData.get('MaTram')?.trim() || '';
    const chucvu = formData.get('ChucVu')?.trim() || '';

    // Validate dữ liệu bắt buộc
    if (!manv || !email || !hoten || !matram || !chucvu) {
        alert('Vui lòng điền đầy đủ thông tin bắt buộc.');
        return;
    }

    showLoading();
    try {
        const data = {
            MaNV: manv,
            Email: email,
            HoTen: hoten,
            SDT: sdt || null,
            MaTram: matram,
            ChucVu: chucvu
        };

        const response = await apiFetch(`${API_BASE}/nhanvien.php`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.error || 'Có lỗi xảy ra khi cập nhật nhân viên');
        }

        alert('Cập nhật thông tin nhân viên thành công!');
        closeEditNhanVienModal();
        await loadNhanVien();
    } catch (error) {
        console.error('Error updating nhan vien:', error);
        alert(error.message || 'Có lỗi xảy ra khi cập nhật nhân viên. Vui lòng thử lại.');
    } finally {
        hideLoading();
    }
}

/**
 * Hàm: deleteNhanVien(manv, hoten)
 * Mô tả: Xóa nhân viên khỏi hệ thống
 * @param {string} manv - Mã nhân viên cần xóa
 * @param {string} hoten - Họ tên nhân viên (để hiển thị trong confirm dialog)
 * @return {Promise<void>}
 * Chức năng:
 *   1. Hiển thị dialog xác nhận
 *   2. Gọi API DELETE để xóa nhân viên
 *   3. Reload danh sách nhân viên
 * Lưu ý: Chỉ admin mới có quyền xóa nhân viên
 */
async function deleteNhanVien(manv, hoten) {
    if (!manv) {
        alert('Mã nhân viên không hợp lệ');
        return;
    }

    // Hiển thị dialog xác nhận với tên nhân viên
    const confirmed = confirm(`Bạn có chắc chắn muốn xóa nhân viên "${hoten || manv}" (${manv})?\n\nLưu ý: Hành động này không thể hoàn tác!`);
    if (!confirmed) {
        return;
    }

    showLoading();
    try {
        const response = await apiFetch(`${API_BASE}/nhanvien.php?id=${encodeURIComponent(manv)}`, {
            method: 'DELETE'
        });

        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.error || 'Có lỗi xảy ra khi xóa nhân viên');
        }

        alert('Xóa nhân viên thành công!');
        await loadNhanVien();
    } catch (error) {
        console.error('Error deleting nhan vien:', error);
        alert(error.message || 'Có lỗi xảy ra khi xóa nhân viên. Vui lòng thử lại.\n\nLưu ý: Không thể xóa nhân viên nếu đang có dữ liệu liên quan (ví dụ: bảo trì).');
    } finally {
        hideLoading();
    }
}

window.loadNhanVien = loadNhanVien;
window.filterNhanVien = filterNhanVien;
window.openCreateNhanVienModal = openCreateNhanVienModal;
window.closeCreateNhanVienModal = closeCreateNhanVienModal;
window.saveNhanVien = saveNhanVien;
window.editNhanVien = editNhanVien;
window.closeEditNhanVienModal = closeEditNhanVienModal;
window.updateNhanVien = updateNhanVien;
window.deleteNhanVien = deleteNhanVien;


