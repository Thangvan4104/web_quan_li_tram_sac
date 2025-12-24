/**
 * File: assets/js/approve.js
 * Mô tả: Module JavaScript quản lý trang Duyệt Nhân Viên (CHỈ ADMIN)
 * Chức năng: 
 *   - Load và hiển thị danh sách nhân viên chờ duyệt
 *   - Duyệt/khóa nhân viên (CHỈ ADMIN)
 *   - Hiển thị trạng thái duyệt của nhân viên
 * Tác giả: Hệ thống quản lý trạm sạc
 */

/**
 * Hàm: loadApprove()
 * Mô tả: Load và hiển thị danh sách nhân viên chờ duyệt
 */
async function loadApprove() {
    const pageElement = document.getElementById('approve');
    if (!pageElement) return;
    
    // Kiểm tra quyền: CHỈ ADMIN
    if (!canApproveStaff()) {
        pageElement.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Không có quyền truy cập</h3>
                <p>Chỉ admin mới có quyền duyệt nhân viên.</p>
            </div>
        `;
        return;
    }
    
    showLoading();
    
    try {
        // Gọi API lấy danh sách nhân viên chờ duyệt và danh sách trạm sạc cùng lúc
        const [pendingResponse, tramsResponse] = await Promise.all([
            apiFetch(`${API_BASE}/approve.php?pending=1`),
            apiFetch(`${API_BASE}/tramsac.php`)
        ]);

        if (!pendingResponse.ok) throw new Error(`HTTP error! status: ${pendingResponse.status}`);
        if (!tramsResponse.ok) throw new Error(`HTTP error! status: ${tramsResponse.status}`);
        
        const pending = await pendingResponse.json();
        const trams = await tramsResponse.json();
        const safePending = Array.isArray(pending) ? pending : [];
        const safeTrams = Array.isArray(trams) ? trams : [];
        
        pageElement.innerHTML = `
            <div class="section-header">
                <h2>Duyệt Nhân Viên</h2>
                <button class="btn btn-primary" onclick="openCreateNhanVienModal()" title="Tạo nhân viên mới">
                    <i class="fas fa-plus"></i> Thêm Nhân Viên Mới
                </button>
            </div>
            <div class="results-info">
                <span>Có <strong>${safePending.length}</strong> nhân viên chờ duyệt</span>
            </div>
            <div class="approve-grid" id="approve-grid">
                ${safePending.length > 0 
                    ? safePending.map(nv => createApproveCard(nv)).join('')
                    : '<div class="empty-state"><i class="fas fa-check-circle"></i><h3>Không có nhân viên nào chờ duyệt</h3></div>'
                }
            </div>
        `;
        
        // Lưu dữ liệu vào biến toàn cục để dùng cho modal
        window.approveData = safePending;
        window.approveTrams = safeTrams;
    } catch (error) {
        console.error('Error loading approve:', error);
        pageElement.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Không thể tải dữ liệu</h3>
                <p>Đã xảy ra lỗi khi tải danh sách nhân viên. Vui lòng thử lại sau.</p>
                <button class="btn btn-primary" onclick="loadApprove()">
                    <i class="fas fa-redo"></i> Thử lại
                </button>
            </div>
        `;
    } finally {
        hideLoading();
    }
}

function createApproveCard(nv) {
    return `
        <div class="approve-card" data-manv="${escapeHtml(nv.MaNV)}">
            <div class="approve-header">
                <div>
                    <div class="approve-manv">${escapeHtml(nv.MaNV)}</div>
                    <div class="approve-hoten">${escapeHtml(nv.HoTen)}</div>
                </div>
                <span class="status-badge pending">Chờ duyệt</span>
            </div>
            <div class="approve-info">
                <div class="approve-info-item">
                    <i class="fas fa-envelope"></i>
                    <span>${escapeHtml(nv.Email || '')}</span>
                </div>
                <div class="approve-info-item">
                    <i class="fas fa-phone"></i>
                    <span>${escapeHtml(nv.SDT || '')}</span>
                </div>
                <div class="approve-info-item">
                    <i class="fas fa-briefcase"></i>
                    <span>${escapeHtml(nv.ChucVu || '')}</span>
                </div>
                <div class="approve-info-item">
                    <i class="fas fa-user-tag"></i>
                    <span>Vai trò: ${escapeHtml(nv.role === 'admin' ? 'Admin' : 'Nhân viên')}</span>
                </div>
                </div>
            </div>
            <div class="approve-actions">
                <button class="btn btn-success btn-sm" onclick="openApproveModal('${escapeHtml(nv.MaNV)}')" title="Duyệt và phân trạm/chức vụ">
                    <i class="fas fa-check"></i> Duyệt & Phân công
                </button>
                <button class="btn btn-danger btn-sm" onclick="approveStaff('${escapeHtml(nv.MaNV)}', 0)" title="Từ chối">
                    <i class="fas fa-times"></i> Từ chối
                </button>
            </div>
        </div>
    `;
}

/**
 * Hàm: openApproveModal(manv)
 * Mô tả: Mở modal để admin chọn trạm và chức vụ khi duyệt nhân viên
 */
function openApproveModal(manv) {
    if (!manv) {
        alert('Mã nhân viên không hợp lệ');
        return;
    }

    const pendingList = window.approveData || [];
    const trams = window.approveTrams || [];

    const nv = pendingList.find(item => item.MaNV === manv);
    if (!nv) {
        alert('Không tìm thấy thông tin nhân viên');
        return;
    }

    let modal = document.getElementById('approve-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'approve-modal';
        modal.className = 'modal';
        document.body.appendChild(modal);
    }

    const tramOptions = trams.map(t => 
        `<option value="${escapeHtml(t.MaTram)}">${escapeHtml(t.TenTram)} (${escapeHtml(t.MaTram)})</option>`
    ).join('');

    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>Duyệt & Phân Công Nhân Viên</h2>
                <span class="close" onclick="closeApproveModal()">&times;</span>
            </div>
            <form id="approve-form" onsubmit="confirmApproveStaff(event)">
                <input type="hidden" id="approve-manv" name="MaNV" value="${escapeHtml(nv.MaNV)}">

                <div class="form-group">
                    <label>Nhân viên</label>
                    <div><strong>${escapeHtml(nv.HoTen)}</strong> (${escapeHtml(nv.MaNV)})</div>
                </div>

                <div class="form-group">
                    <label for="approve-matram">Trạm làm việc <span class="required">*</span></label>
                    <select id="approve-matram" name="MaTram" required>
                        <option value="">-- Chọn trạm --</option>
                        ${tramOptions}
                    </select>
                </div>

                <div class="form-group">
                    <label for="approve-chucvu">Chức vụ trong trạm <span class="required">*</span></label>
                    <select id="approve-chucvu" name="ChucVu" required>
                        <option value="">-- Chọn chức vụ --</option>
                        <option value="Quản lý trạm">Quản lý trạm</option>
                        <option value="Nhân viên bảo trì">Nhân viên bảo trì</option>
                        <option value="Nhân viên vận hành">Nhân viên vận hành</option>
                    </select>
                </div>

                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="closeApproveModal()">
                        <i class="fas fa-times"></i> Hủy
                    </button>
                    <button type="submit" class="btn btn-primary">
                        <i class="fas fa-check"></i> Xác Nhận Duyệt
                    </button>
                </div>
            </form>
        </div>
    `;

    modal.classList.add('show');
    modal.onclick = (e) => {
        if (e.target === modal) {
            closeApproveModal();
        }
    };
}

function closeApproveModal() {
    const modal = document.getElementById('approve-modal');
    if (modal) {
        modal.classList.remove('show');
    }
}

/**
 * Hàm: confirmApproveStaff(event)
 * Mô tả: Submit form duyệt nhân viên với MaTram và ChucVu
 */
async function confirmApproveStaff(event) {
    event.preventDefault();

    const form = document.getElementById('approve-form');
    if (!form) return;

    const formData = new FormData(form);
    const manv = formData.get('MaNV')?.trim() || '';
    const matram = formData.get('MaTram')?.trim() || '';
    const chucvu = formData.get('ChucVu')?.trim() || '';

    if (!manv || !matram || !chucvu) {
        alert('Vui lòng chọn đầy đủ trạm làm việc và chức vụ.');
        return;
    }

    if (!confirm(`Xác nhận duyệt nhân viên "${manv}" và phân công vào trạm ${matram} với chức vụ "${chucvu}"?`)) {
        return;
    }

    showLoading();
    try {
        const response = await apiFetch(`${API_BASE}/approve.php`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ MaNV: manv, is_approved: 1, MaTram: matram, ChucVu: chucvu })
        });

        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.error || 'Có lỗi xảy ra khi duyệt nhân viên');
        }

        alert('Duyệt và phân công nhân viên thành công!');
        closeApproveModal();
        await loadApprove();
    } catch (error) {
        console.error('Error approving staff:', error);
        alert(error.message || 'Có lỗi xảy ra khi duyệt nhân viên. Vui lòng thử lại.');
    } finally {
        hideLoading();
    }
}

/**
 * Hàm: approveStaff(manv, isApproved)
 * Mô tả: Dùng cho luồng TỪ CHỐI (isApproved = 0)
 */
async function approveStaff(manv, isApproved) {
    if (!manv) {
        alert('Mã nhân viên không hợp lệ');
        return;
    }
    
    const action = isApproved ? 'duyệt' : 'từ chối';
    if (!confirm(`Bạn có chắc chắn muốn ${action} nhân viên "${manv}"?`)) {
        return;
    }
    
    showLoading();
    try {
        // apiFetch(): Helper function từ core.js, tự động thêm credentials: 'include'
        const response = await apiFetch(`${API_BASE}/approve.php`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ MaNV: manv, is_approved: isApproved })
        });
        
        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.error || `Có lỗi xảy ra khi ${action} nhân viên`);
        }
        
        alert(`${action.charAt(0).toUpperCase() + action.slice(1)} nhân viên thành công!`);
        await loadApprove();
    } catch (error) {
        console.error('Error approving staff:', error);
        alert(error.message || `Có lỗi xảy ra khi ${action} nhân viên. Vui lòng thử lại.`);
    } finally {
        hideLoading();
    }
}

/**
 * Hàm: openCreateNhanVienModal()
 * Mô tả: Mở modal để admin tạo nhân viên mới
 */
async function openCreateNhanVienModal() {
    // Load danh sách trạm sạc nếu chưa có
    if (!window.approveTrams || window.approveTrams.length === 0) {
        try {
            const tramsResponse = await apiFetch(`${API_BASE}/tramsac.php`);
            if (tramsResponse.ok) {
                window.approveTrams = await tramsResponse.json();
            } else {
                window.approveTrams = [];
            }
        } catch (error) {
            console.error('Error loading trams:', error);
            window.approveTrams = [];
        }
    }

    const trams = window.approveTrams || [];

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
 * Mô tả: Lưu nhân viên mới
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
        // Reload cả trang duyệt và trang quản lý nhân viên
        await loadApprove();
        if (typeof loadNhanVien === 'function') {
            await loadNhanVien();
        }
    } catch (error) {
        console.error('Error creating nhan vien:', error);
        alert(error.message || 'Có lỗi xảy ra khi tạo nhân viên. Vui lòng thử lại.');
    } finally {
        hideLoading();
    }
}

window.loadApprove = loadApprove;
window.approveStaff = approveStaff;
window.openApproveModal = openApproveModal;
window.closeApproveModal = closeApproveModal;
window.confirmApproveStaff = confirmApproveStaff;
window.openCreateNhanVienModal = openCreateNhanVienModal;
window.closeCreateNhanVienModal = closeCreateNhanVienModal;
window.saveNhanVien = saveNhanVien;

