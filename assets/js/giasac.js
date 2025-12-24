/**
 * File: assets/js/giasac.js
 * Mô tả: Module JavaScript quản lý trang Giá Sạc (CHỈ ADMIN)
 * Chức năng: 
 *   - Load và hiển thị danh sách giá sạc
 *   - Tìm kiếm và lọc giá sạc (theo loại cổng sạc, trạng thái)
 *   - CRUD operations (Create, Read, Update, Delete) - CHỈ ADMIN
 *   - Modal form để thêm/sửa giá sạc
 *   - Format số tiền đẹp (VNĐ/kWh)
 * Tác giả: Hệ thống quản lý trạm sạc
 */

// ============================================
// HÀM LOAD GIÁ SẠC
// ============================================

/**
 * Hàm: loadGiaSac()
 * Mô tả: Load và hiển thị danh sách giá sạc với đầy đủ tính năng tìm kiếm và lọc
 * @return {Promise<void>} Promise không trả về giá trị
 * Chức năng:
 *   1. Kiểm tra quyền admin (chỉ admin mới được truy cập)
 *   2. Gọi API lấy danh sách giá sạc
 *   3. Tạo HTML với thanh tìm kiếm và bộ lọc
 *   4. Hiển thị danh sách giá sạc dưới dạng card
 *   5. Thiết lập sự kiện tìm kiếm và lọc
 *   6. Xử lý lỗi nếu có
 */
async function loadGiaSac() {
    // Lấy phần tử container của trang giá sạc
    const pageElement = document.getElementById('giasac');
    
    // Nếu không tìm thấy thì dừng lại
    if (!pageElement) return;
    
    // Kiểm tra quyền: CHỈ ADMIN mới được truy cập
    // canSetPrice(): Hàm từ auth.js, kiểm tra user có phải admin không
    if (!canSetPrice()) {
        pageElement.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Không có quyền truy cập</h3>
                <p>Chỉ admin mới có quyền quản lý giá sạc.</p>
            </div>
        `;
        return;
    }
    
    // Hiển thị loading indicator
    showLoading();
    
    try {
        // Gọi API lấy danh sách giá sạc
        // apiFetch(): Helper function từ core.js, tự động thêm credentials: 'include'
        const response = await apiFetch(`${API_BASE}/giasac.php`);
        
        // Kiểm tra response
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        // Parse JSON response
        const gias = await response.json();
        
        // Kiểm tra xem có phải là mảng không
        const safeGias = Array.isArray(gias) ? gias : [];
        
        // Tạo HTML và gán vào pageElement
        pageElement.innerHTML = `
            <!-- Header của section với tiêu đề và nút thêm mới -->
            <div class="section-header">
                <h2>Quản Lý Giá Sạc</h2>
                <!-- Nút thêm giá sạc mới, onclick sẽ gọi hàm openGiaSacModal() -->
                <button class="btn btn-primary" onclick="openGiaSacModal()">
                    <i class="fas fa-plus"></i> Thêm Giá Sạc Mới
                </button>
            </div>
            
            <!-- Thanh tìm kiếm và lọc -->
            <div class="filter-section">
                <!-- Ô tìm kiếm -->
                <div class="search-box">
                    <i class="fas fa-search"></i>
                    <input 
                        type="text" 
                        id="giasac-search" 
                        placeholder="Tìm kiếm theo mã giá, loại cổng sạc..." 
                        oninput="filterGiaSac()"
                    >
                </div>
                
                <!-- Bộ lọc theo loại cổng sạc -->
                <div class="filter-group">
                    <label for="giasac-loaicong-filter">Lọc theo loại cổng:</label>
                    <select id="giasac-loaicong-filter" onchange="filterGiaSac()">
                        <option value="">Tất cả loại cổng</option>
                        <option value="Type 2 AC">Type 2 AC</option>
                        <option value="CCS2 DC">CCS2 DC</option>
                        <option value="CHAdeMO">CHAdeMO</option>
                    </select>
                </div>
                
                <!-- Bộ lọc theo trạng thái -->
                <div class="filter-group">
                    <label for="giasac-status-filter">Lọc theo trạng thái:</label>
                    <select id="giasac-status-filter" onchange="filterGiaSac()">
                        <option value="">Tất cả trạng thái</option>
                        <option value="Đang áp dụng">Đang áp dụng</option>
                        <option value="Hết hiệu lực">Hết hiệu lực</option>
                    </select>
                </div>
            </div>
            
            <!-- Thông báo số lượng kết quả -->
            <div class="results-info">
                <span id="giasac-count">Hiển thị <strong>${safeGias.length}</strong> giá sạc</span>
            </div>
            
            <!-- Grid container chứa các card giá sạc -->
            <div class="giasac-grid" id="giasac-grid">
                ${safeGias.length > 0 
                    ? safeGias.map(gia => createGiaSacCard(gia)).join('')
                    : '<div class="empty-state"><i class="fas fa-dollar-sign"></i><h3>Chưa có giá sạc nào</h3><p>Nhấn nút "Thêm Giá Sạc Mới" để tạo giá đầu tiên</p></div>'
                }
            </div>
        `;
        
        // Lưu danh sách giá sạc vào biến toàn cục để dùng cho tìm kiếm/lọc
        window.giasacData = safeGias;
        
    } catch (error) {
        // Xử lý lỗi
        console.error('Error loading gia sac:', error);
        pageElement.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Không thể tải dữ liệu</h3>
                <p>Đã xảy ra lỗi khi tải danh sách giá sạc. Vui lòng thử lại sau.</p>
                <button class="btn btn-primary" onclick="loadGiaSac()">
                    <i class="fas fa-redo"></i> Thử lại
                </button>
            </div>
        `;
    } finally {
        // Ẩn loading indicator
        hideLoading();
    }
}

/**
 * Hàm: createGiaSacCard(gia)
 * Mô tả: Tạo HTML card cho một giá sạc
 * @param {Object} gia - Đối tượng chứa thông tin giá sạc
 * @return {string} Chuỗi HTML của card giá sạc
 */
function createGiaSacCard(gia) {
    // Format số tiền đẹp (VNĐ)
    const formatCurrency = (amount) => {
        if (!amount) return '0';
        return parseFloat(amount).toLocaleString('vi-VN');
    };
    
    // Format ngày đẹp
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
    
    // Xác định class cho badge trạng thái
    const getStatusClass = (trangthai) => {
        if (!trangthai) return 'dang-ap-dung';
        const lower = trangthai.toLowerCase();
        if (lower.includes('đang') || lower.includes('dang')) return 'dang-ap-dung';
        return 'het-hieu-luc';
    };
    
    return `
        <div class="giasac-card" data-magia="${escapeHtml(gia.MaGia)}" data-loaicong="${escapeHtml(gia.LoaiCongSac || '')}" data-trangthai="${escapeHtml(gia.TrangThai || '')}">
            <div class="giasac-header">
                <div>
                    <div class="giasac-magia">${escapeHtml(gia.MaGia)}</div>
                    <div class="giasac-dongia">${formatCurrency(gia.DonGia)} VNĐ/kWh</div>
                </div>
                <span class="status-badge ${getStatusClass(gia.TrangThai)}">${escapeHtml(gia.TrangThai || 'Đang áp dụng')}</span>
            </div>
            <div class="giasac-info">
                <div class="giasac-info-item">
                    <i class="fas fa-plug"></i>
                    <span>Loại cổng: <strong>${escapeHtml(gia.LoaiCongSac || '')}</strong></span>
                </div>
                <div class="giasac-info-item">
                    <i class="fas fa-calendar"></i>
                    <span>Ngày áp dụng: ${formatDate(gia.NgayApDung)}</span>
                </div>
                ${gia.NgayKetThuc ? `
                <div class="giasac-info-item">
                    <i class="fas fa-calendar-times"></i>
                    <span>Ngày kết thúc: ${formatDate(gia.NgayKetThuc)}</span>
                </div>
                ` : ''}
            </div>
            <div class="giasac-actions">
                <button class="btn btn-success btn-sm" onclick="editGiaSac('${escapeHtml(gia.MaGia)}')" title="Sửa giá sạc">
                    <i class="fas fa-edit"></i> Sửa
                </button>
                <button class="btn btn-danger btn-sm" onclick="deleteGiaSac('${escapeHtml(gia.MaGia)}')" title="Xóa giá sạc">
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
 * Hàm: filterGiaSac()
 * Mô tả: Tìm kiếm và lọc danh sách giá sạc
 */
function filterGiaSac() {
    const allGias = window.giasacData || [];
    const searchTerm = (document.getElementById('giasac-search')?.value || '').toLowerCase().trim();
    const loaicongFilter = document.getElementById('giasac-loaicong-filter')?.value || '';
    const statusFilter = document.getElementById('giasac-status-filter')?.value || '';
    
    const filteredGias = allGias.filter(gia => {
        const matchesSearch = !searchTerm || 
            (gia.MaGia && gia.MaGia.toLowerCase().includes(searchTerm)) ||
            (gia.LoaiCongSac && gia.LoaiCongSac.toLowerCase().includes(searchTerm));
        
        const matchesLoaiCong = !loaicongFilter || gia.LoaiCongSac === loaicongFilter;
        const matchesStatus = !statusFilter || (gia.TrangThai || 'Đang áp dụng') === statusFilter;
        
        return matchesSearch && matchesLoaiCong && matchesStatus;
    });
    
    const gridContainer = document.getElementById('giasac-grid');
    const countElement = document.getElementById('giasac-count');
    
    if (!gridContainer) return;
    
    if (countElement) {
        countElement.innerHTML = `Hiển thị <strong>${filteredGias.length}</strong> giá sạc`;
    }
    
    if (filteredGias.length > 0) {
        gridContainer.innerHTML = filteredGias.map(gia => createGiaSacCard(gia)).join('');
    } else {
        gridContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-search"></i>
                <h3>Không tìm thấy giá sạc nào</h3>
                <p>Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc</p>
            </div>
        `;
    }
}

// ============================================
// HÀM CRUD OPERATIONS
// ============================================

/**
 * Hàm: openGiaSacModal(magia)
 * Mô tả: Mở modal form để thêm mới hoặc sửa giá sạc
 */
async function openGiaSacModal(magia = null) {
    // Kiểm tra quyền
    if (!canSetPrice()) {
        alert('Chỉ admin mới có quyền quản lý giá sạc');
        return;
    }
    
    let modal = document.getElementById('giasac-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'giasac-modal';
        modal.className = 'modal';
        document.body.appendChild(modal);
    }
    
    const isEdit = magia !== null;
    const modalTitle = isEdit ? 'Sửa Giá Sạc' : 'Thêm Giá Sạc Mới';
    
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>${modalTitle}</h2>
                <span class="close" onclick="closeGiaSacModal()">&times;</span>
            </div>
            <form id="giasac-form" onsubmit="saveGiaSac(event)">
                <div class="form-group">
                    <label for="giasac-magia">Mã Giá Sạc <span class="required">*</span></label>
                    <input 
                        type="text" 
                        id="giasac-magia" 
                        name="MaGia" 
                        required 
                        maxlength="5"
                        ${isEdit ? 'readonly' : ''}
                        placeholder="VD: GS001"
                    >
                    <small class="form-hint">Mã giá sạc gồm 5 ký tự (VD: GS001)</small>
                </div>
                <div class="form-group">
                    <label for="giasac-loaicong">Loại Cổng Sạc <span class="required">*</span></label>
                    <select id="giasac-loaicong" name="LoaiCongSac" required>
                        <option value="">-- Chọn loại cổng sạc --</option>
                        <option value="Type 2 AC">Type 2 AC</option>
                        <option value="CCS2 DC">CCS2 DC</option>
                        <option value="CHAdeMO">CHAdeMO</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="giasac-dongia">Đơn Giá (VNĐ/kWh) <span class="required">*</span></label>
                    <input 
                        type="number" 
                        id="giasac-dongia" 
                        name="DonGia" 
                        required
                        step="0.01"
                        min="0"
                        placeholder="VD: 5000"
                    >
                    <small class="form-hint">Giá mỗi kWh tính bằng VNĐ</small>
                </div>
                <div class="form-group">
                    <label for="giasac-ngayapdung">Ngày Áp Dụng <span class="required">*</span></label>
                    <input 
                        type="date" 
                        id="giasac-ngayapdung" 
                        name="NgayApDung" 
                        required
                    >
                </div>
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="closeGiaSacModal()">
                        <i class="fas fa-times"></i> Hủy
                    </button>
                    <button type="submit" class="btn btn-primary">
                        <i class="fas fa-save"></i> ${isEdit ? 'Cập nhật' : 'Thêm mới'}
                    </button>
                </div>
            </form>
        </div>
    `;
    
    if (isEdit && magia) {
        showLoading();
        try {
            const response = await apiFetch(`${API_BASE}/giasac.php?id=${encodeURIComponent(magia)}`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const gia = await response.json();
            
            const convertToDateInput = (dateStr) => {
                if (!dateStr) return '';
                try {
                    const date = new Date(dateStr);
                    const year = date.getFullYear();
                    const month = String(date.getMonth() + 1).padStart(2, '0');
                    const day = String(date.getDate()).padStart(2, '0');
                    return `${year}-${month}-${day}`;
                } catch (e) {
                    return '';
                }
            };
            
            document.getElementById('giasac-magia').value = gia.MaGia || '';
            document.getElementById('giasac-loaicong').value = gia.LoaiCongSac || '';
            document.getElementById('giasac-dongia').value = gia.DonGia || '';
            document.getElementById('giasac-ngayapdung').value = convertToDateInput(gia.NgayApDung);
        } catch (error) {
            console.error('Error loading gia sac data:', error);
            alert('Không thể tải thông tin giá sạc. Vui lòng thử lại.');
            closeGiaSacModal();
            return;
        } finally {
            hideLoading();
        }
    } else {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const defaultDate = `${year}-${month}-${day}`;
        setTimeout(() => {
            const ngayApDungInput = document.getElementById('giasac-ngayapdung');
            if (ngayApDungInput) {
                ngayApDungInput.value = defaultDate;
            }
        }, 100);
    }
    
    modal.classList.add('show');
    modal.onclick = (e) => {
        if (e.target === modal) {
            closeGiaSacModal();
        }
    };
    
    const handleEscKey = (e) => {
        if (e.key === 'Escape') {
            closeGiaSacModal();
            document.removeEventListener('keydown', handleEscKey);
        }
    };
    document.addEventListener('keydown', handleEscKey);
    
    if (!isEdit) {
        setTimeout(() => {
            document.getElementById('giasac-magia')?.focus();
        }, 100);
    }
}

function closeGiaSacModal() {
    const modal = document.getElementById('giasac-modal');
    if (modal) {
        modal.classList.remove('show');
    }
}

async function saveGiaSac(event) {
    event.preventDefault();
    const form = document.getElementById('giasac-form');
    if (!form) return;
    
    const formData = new FormData(form);
    const giaData = {
        MaGia: formData.get('MaGia')?.trim() || '',
        LoaiCongSac: formData.get('LoaiCongSac')?.trim() || '',
        DonGia: formData.get('DonGia') ? parseFloat(formData.get('DonGia')) : 0,
        NgayApDung: formData.get('NgayApDung')?.trim() || ''
    };
    
    if (!giaData.MaGia || !giaData.LoaiCongSac || giaData.DonGia <= 0) {
        alert('Vui lòng điền đầy đủ thông tin và đơn giá phải lớn hơn 0');
        return;
    }
    
    const isEdit = document.getElementById('giasac-magia')?.readOnly || false;
    const method = isEdit ? 'PUT' : 'POST';
    const url = `${API_BASE}/giasac.php`;
    
    showLoading();
    try {
        // apiFetch(): Helper function từ core.js, tự động thêm credentials: 'include'
        const response = await apiFetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(giaData)
        });
        
        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.error || 'Có lỗi xảy ra khi lưu giá sạc');
        }
        
        alert(isEdit ? 'Cập nhật giá sạc thành công!' : 'Thêm giá sạc thành công!');
        closeGiaSacModal();
        await loadGiaSac();
    } catch (error) {
        console.error('Error saving gia sac:', error);
        alert(error.message || 'Có lỗi xảy ra khi lưu giá sạc. Vui lòng thử lại.');
    } finally {
        hideLoading();
    }
}

function editGiaSac(magia) {
    if (!magia) {
        alert('Mã giá sạc không hợp lệ');
        return;
    }
    openGiaSacModal(magia);
}

async function deleteGiaSac(magia) {
    if (!magia) {
        alert('Mã giá sạc không hợp lệ');
        return;
    }
    
    if (!confirm(`Bạn có chắc chắn muốn xóa giá sạc "${magia}"?`)) {
        return;
    }
    
    showLoading();
    try {
        // apiFetch(): Helper function từ core.js, tự động thêm credentials: 'include'
        const response = await apiFetch(`${API_BASE}/giasac.php?id=${encodeURIComponent(magia)}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.error || 'Có lỗi xảy ra khi xóa giá sạc');
        }
        
        alert('Xóa giá sạc thành công!');
        await loadGiaSac();
    } catch (error) {
        console.error('Error deleting gia sac:', error);
        alert(error.message || 'Có lỗi xảy ra khi xóa giá sạc. Vui lòng thử lại.');
    } finally {
        hideLoading();
    }
}

// ============================================
// EXPOSE FUNCTIONS TO WINDOW OBJECT
// ============================================

window.openGiaSacModal = openGiaSacModal;
window.closeGiaSacModal = closeGiaSacModal;
window.saveGiaSac = saveGiaSac;
window.editGiaSac = editGiaSac;
window.deleteGiaSac = deleteGiaSac;
window.filterGiaSac = filterGiaSac;
window.loadGiaSac = loadGiaSac;

