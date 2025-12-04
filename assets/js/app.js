/**
 * File: assets/js/app.js
 * Mô tả: File JavaScript chính xử lý logic frontend cho hệ thống quản lý trạm sạc
 * Chức năng: Quản lý UI, gọi API, xử lý form, hiển thị dữ liệu
 */

// ============================================
// CẤU HÌNH VÀ BIẾN TOÀN CỤC
// ============================================

// Đường dẫn cơ sở đến thư mục API
const API_BASE = 'api';

// Mảng chứa danh sách tất cả trạm sạc (được tải từ server)
let stations = [];

// ID của trạm sạc đang được chỉnh sửa (null nếu đang thêm mới)
let editingStationId = null;

// ============================================
// KHỞI TẠO ỨNG DỤNG
// ============================================

/**
 * Sự kiện: DOMContentLoaded
 * Mô tả: Chạy khi trang web đã tải xong HTML
 * Chức năng: Khởi tạo ứng dụng bằng cách tải dữ liệu và thiết lập event listeners
 */
document.addEventListener('DOMContentLoaded', () => {
    // Tải thống kê tổng quan
    loadStats();
    
    // Tải danh sách trạm sạc
    loadStations();
    
    // Thiết lập chức năng tìm kiếm
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        // Lắng nghe sự kiện khi người dùng nhập vào ô tìm kiếm
        searchInput.addEventListener('input', (e) => {
            // Lọc danh sách trạm sạc theo từ khóa tìm kiếm
            filterStations(e.target.value);
        });
    }
});

// ============================================
// HÀM TẢI DỮ LIỆU
// ============================================

/**
 * Hàm: loadStats()
 * Mô tả: Tải và hiển thị thống kê tổng quan từ server
 * @return {Promise<void>}
 */
async function loadStats() {
    try {
        // Gửi request GET đến API để lấy thống kê
        const response = await fetch(`${API_BASE}/stats.php`);
        
        // Chuyển đổi response sang JSON
        const stats = await response.json();
        
        // Cập nhật các số liệu thống kê lên giao diện
        document.getElementById('total-stations').textContent = stats.total_stations || 0;
        document.getElementById('active-stations').textContent = stats.active_stations || 0;
        document.getElementById('total-ports').textContent = stats.total_ports || 0;
        document.getElementById('available-ports').textContent = stats.available_ports || 0;
    } catch (error) {
        // Ghi log lỗi ra console nếu có
        console.error('Error loading stats:', error);
    }
}

/**
 * Hàm: loadStations()
 * Mô tả: Tải danh sách tất cả trạm sạc từ server
 * @return {Promise<void>}
 */
async function loadStations() {
    // Hiển thị loading indicator
    showLoading();
    
    try {
        // Gửi request GET đến API để lấy danh sách trạm sạc
        const response = await fetch(`${API_BASE}/stations.php`);
        
        // Chuyển đổi response sang JSON và lưu vào biến toàn cục
        stations = await response.json();
        
        // Hiển thị danh sách trạm sạc lên giao diện
        displayStations(stations);
    } catch (error) {
        // Ghi log lỗi và hiển thị thông báo lỗi cho người dùng
        console.error('Error loading stations:', error);
        showError('Không thể tải danh sách trạm sạc');
    } finally {
        // Ẩn loading indicator dù thành công hay thất bại
        hideLoading();
    }
}

// ============================================
// HÀM HIỂN THỊ DỮ LIỆU
// ============================================

/**
 * Hàm: displayStations(stationsToDisplay)
 * Mô tả: Hiển thị danh sách trạm sạc lên giao diện
 * @param {Array} stationsToDisplay - Mảng chứa các trạm sạc cần hiển thị
 * @return {void}
 */
function displayStations(stationsToDisplay) {
    // Lấy phần tử grid chứa danh sách trạm sạc
    const grid = document.getElementById('stations-grid');
    
    // Kiểm tra xem có trạm sạc nào không
    if (!stationsToDisplay || stationsToDisplay.length === 0) {
        // Nếu không có, hiển thị thông báo trống
        grid.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1;">
                <i class="fas fa-charging-station"></i>
                <h3>Chưa có trạm sạc nào</h3>
                <p>Hãy thêm trạm sạc đầu tiên của bạn</p>
            </div>
        `;
        return;
    }
    
    // Nếu có, tạo HTML cho từng trạm sạc và hiển thị
    grid.innerHTML = stationsToDisplay.map(station => createStationCard(station)).join('');
}

/**
 * Hàm: createStationCard(station)
 * Mô tả: Tạo HTML cho một card trạm sạc
 * @param {Object} station - Đối tượng chứa thông tin trạm sạc
 * @return {string} HTML string của card trạm sạc
 */
function createStationCard(station) {
    // Định nghĩa nhãn hiển thị cho các trạng thái
    const statusLabels = {
        'active': 'Đang Hoạt Động',
        'maintenance': 'Bảo Trì',
        'inactive': 'Ngừng Hoạt Động'
    };
    
    // Định nghĩa nhãn hiển thị cho các loại sạc
    const chargingTypeLabels = {
        'AC': 'AC',
        'DC': 'DC',
        'Both': 'Cả Hai'
    };
    
    // Tính phần trăm cổng đang sử dụng
    const usagePercent = station.total_ports > 0 
        ? Math.round((station.total_ports - station.available_ports) / station.total_ports * 100)
        : 0;
    
    // Trả về HTML template của card
    return `
        <div class="station-card">
            <!-- Header của card: tên và trạng thái -->
            <div class="station-header">
                <div>
                    <div class="station-name">${escapeHtml(station.name)}</div>
                    <span class="status-badge ${station.status}">${statusLabels[station.status] || station.status}</span>
                </div>
            </div>
            
            <!-- Thông tin chi tiết của trạm sạc -->
            <div class="station-info">
                <!-- Địa chỉ -->
                <div class="station-info-item">
                    <i class="fas fa-map-marker-alt"></i>
                    <span>${escapeHtml(station.address)}</span>
                </div>
                <!-- Loại sạc và công suất -->
                <div class="station-info-item">
                    <i class="fas fa-bolt"></i>
                    <span>${chargingTypeLabels[station.charging_type] || station.charging_type} - ${station.power_kw} kW</span>
                </div>
                <!-- Giờ hoạt động (nếu có) -->
                ${station.operating_hours ? `
                <div class="station-info-item">
                    <i class="fas fa-clock"></i>
                    <span>${escapeHtml(station.operating_hours)}</span>
                </div>
                ` : ''}
                <!-- Số điện thoại (nếu có) -->
                ${station.phone ? `
                <div class="station-info-item">
                    <i class="fas fa-phone"></i>
                    <span>${escapeHtml(station.phone)}</span>
                </div>
                ` : ''}
                <!-- Giá sạc (nếu có) -->
                ${station.price_per_kwh > 0 ? `
                <div class="station-info-item">
                    <i class="fas fa-money-bill-wave"></i>
                    <span>${formatCurrency(station.price_per_kwh)}/kWh</span>
                </div>
                ` : ''}
            </div>
            
            <!-- Thống kê cổng sạc -->
            <div class="station-stats">
                <div class="stat-item">
                    <div class="stat-item-value">${station.total_ports}</div>
                    <div class="stat-item-label">Tổng Cổng</div>
                </div>
                <div class="stat-item">
                    <div class="stat-item-value">${station.available_ports}</div>
                    <div class="stat-item-label">Còn Trống</div>
                </div>
                <div class="stat-item">
                    <div class="stat-item-value">${usagePercent}%</div>
                    <div class="stat-item-label">Đang Sử Dụng</div>
                </div>
            </div>
            
            <!-- Các nút hành động: Sửa và Xóa -->
            <div class="station-actions">
                <button class="btn btn-success btn-sm" onclick="editStation(${station.id})">
                    <i class="fas fa-edit"></i> Sửa
                </button>
                <button class="btn btn-danger btn-sm" onclick="deleteStation(${station.id}, '${escapeHtml(station.name)}')">
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
 * Hàm: filterStations(searchTerm)
 * Mô tả: Lọc danh sách trạm sạc theo từ khóa tìm kiếm
 * @param {string} searchTerm - Từ khóa tìm kiếm
 * @return {void}
 */
function filterStations(searchTerm) {
    // Lọc mảng stations theo từ khóa
    const filtered = stations.filter(station => {
        // Chuyển từ khóa sang chữ thường để so sánh không phân biệt hoa thường
        const term = searchTerm.toLowerCase();
        
        // Tìm kiếm trong tên, địa chỉ, hoặc số điện thoại
        return station.name.toLowerCase().includes(term) ||
               station.address.toLowerCase().includes(term) ||
               (station.phone && station.phone.includes(term));
    });
    
    // Hiển thị danh sách đã lọc
    displayStations(filtered);
}

// ============================================
// HÀM QUẢN LÝ MODAL
// ============================================

/**
 * Hàm: openAddModal()
 * Mô tả: Mở modal để thêm trạm sạc mới
 * @return {void}
 */
function openAddModal() {
    // Đặt editingStationId = null vì đang thêm mới
    editingStationId = null;
    
    // Thay đổi tiêu đề modal
    document.getElementById('modal-title').textContent = 'Thêm Trạm Sạc Mới';
    
    // Reset form về trạng thái ban đầu
    document.getElementById('station-form').reset();
    
    // Xóa ID (nếu có)
    document.getElementById('station-id').value = '';
    
    // Hiển thị modal
    document.getElementById('station-modal').classList.add('show');
}

/**
 * Hàm: editStation(id)
 * Mô tả: Mở modal để chỉnh sửa trạm sạc
 * @param {number} id - ID của trạm sạc cần chỉnh sửa
 * @return {Promise<void>}
 */
async function editStation(id) {
    // Hiển thị loading indicator
    showLoading();
    
    try {
        // Gửi request GET để lấy thông tin trạm sạc
        const response = await fetch(`${API_BASE}/stations.php?id=${id}`);
        
        // Chuyển đổi response sang JSON
        const station = await response.json();
        
        // Lưu ID của trạm đang chỉnh sửa
        editingStationId = id;
        
        // Thay đổi tiêu đề modal
        document.getElementById('modal-title').textContent = 'Chỉnh Sửa Trạm Sạc';
        
        // Điền dữ liệu vào các trường form
        document.getElementById('station-id').value = station.id;
        document.getElementById('name').value = station.name || '';
        document.getElementById('address').value = station.address || '';
        document.getElementById('location_lat').value = station.location_lat || '';
        document.getElementById('location_lng').value = station.location_lng || '';
        document.getElementById('total_ports').value = station.total_ports || '';
        document.getElementById('available_ports').value = station.available_ports || '';
        document.getElementById('status').value = station.status || 'active';
        document.getElementById('charging_type').value = station.charging_type || 'Both';
        document.getElementById('power_kw').value = station.power_kw || '';
        document.getElementById('price_per_kwh').value = station.price_per_kwh || '';
        document.getElementById('operating_hours').value = station.operating_hours || '';
        document.getElementById('phone').value = station.phone || '';
        document.getElementById('email').value = station.email || '';
        
        // Hiển thị modal
        document.getElementById('station-modal').classList.add('show');
    } catch (error) {
        // Ghi log lỗi và hiển thị thông báo
        console.error('Error loading station:', error);
        showError('Không thể tải thông tin trạm sạc');
    } finally {
        // Ẩn loading indicator
        hideLoading();
    }
}

/**
 * Hàm: closeModal()
 * Mô tả: Đóng modal
 * @return {void}
 */
function closeModal() {
    // Ẩn modal bằng cách xóa class 'show'
    document.getElementById('station-modal').classList.remove('show');
    
    // Reset biến editingStationId
    editingStationId = null;
}

/**
 * Sự kiện: window.onclick
 * Mô tả: Đóng modal khi click bên ngoài modal
 * @param {Event} event - Sự kiện click
 */
window.onclick = function(event) {
    const modal = document.getElementById('station-modal');
    // Nếu click vào phần overlay (bên ngoài modal), đóng modal
    if (event.target === modal) {
        closeModal();
    }
}

// ============================================
// HÀM XỬ LÝ FORM
// ============================================

/**
 * Hàm: saveStation(event)
 * Mô tả: Lưu trạm sạc (thêm mới hoặc cập nhật)
 * @param {Event} event - Sự kiện submit form
 * @return {Promise<void>}
 */
async function saveStation(event) {
    // Ngăn chặn form submit mặc định
    event.preventDefault();
    
    // Thu thập dữ liệu từ form
    const formData = {
        name: document.getElementById('name').value,
        address: document.getElementById('address').value,
        location_lat: document.getElementById('location_lat').value || null,
        location_lng: document.getElementById('location_lng').value || null,
        total_ports: parseInt(document.getElementById('total_ports').value) || 0,
        available_ports: parseInt(document.getElementById('available_ports').value) || 0,
        status: document.getElementById('status').value,
        charging_type: document.getElementById('charging_type').value,
        power_kw: parseFloat(document.getElementById('power_kw').value) || 0,
        price_per_kwh: parseFloat(document.getElementById('price_per_kwh').value) || 0,
        operating_hours: document.getElementById('operating_hours').value || '24/7',
        phone: document.getElementById('phone').value || '',
        email: document.getElementById('email').value || ''
    };
    
    // Tự động đặt available_ports = total_ports nếu không nhập
    if (!document.getElementById('available_ports').value && formData.total_ports > 0) {
        formData.available_ports = formData.total_ports;
    }
    
    // Hiển thị loading indicator
    showLoading();
    
    try {
        // Xác định URL và phương thức HTTP
        const url = `${API_BASE}/stations.php`;
        const method = editingStationId ? 'PUT' : 'POST';
        
        // Nếu đang chỉnh sửa, thêm ID vào formData
        if (editingStationId) {
            formData.id = editingStationId;
        }
        
        // Gửi request đến API
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        
        // Chuyển đổi response sang JSON
        const result = await response.json();
        
        // Kiểm tra kết quả
        if (response.ok) {
            // Nếu thành công, đóng modal, tải lại dữ liệu và hiển thị thông báo
            closeModal();
            loadStations();
            loadStats();
            showSuccess(editingStationId ? 'Cập nhật trạm sạc thành công!' : 'Thêm trạm sạc thành công!');
        } else {
            // Nếu thất bại, hiển thị thông báo lỗi
            showError(result.error || 'Có lỗi xảy ra');
        }
    } catch (error) {
        // Ghi log lỗi và hiển thị thông báo
        console.error('Error saving station:', error);
        showError('Không thể lưu trạm sạc');
    } finally {
        // Ẩn loading indicator
        hideLoading();
    }
}

// ============================================
// HÀM XÓA TRẠM SẠC
// ============================================

/**
 * Hàm: deleteStation(id, name)
 * Mô tả: Xóa trạm sạc
 * @param {number} id - ID của trạm sạc cần xóa
 * @param {string} name - Tên trạm sạc (để hiển thị trong confirm)
 * @return {Promise<void>}
 */
async function deleteStation(id, name) {
    // Hiển thị hộp thoại xác nhận
    if (!confirm(`Bạn có chắc chắn muốn xóa trạm "${name}"?`)) {
        // Nếu người dùng không xác nhận, dừng lại
        return;
    }
    
    // Hiển thị loading indicator
    showLoading();
    
    try {
        // Gửi request DELETE đến API
        const response = await fetch(`${API_BASE}/stations.php?id=${id}`, {
            method: 'DELETE'
        });
        
        // Chuyển đổi response sang JSON
        const result = await response.json();
        
        // Kiểm tra kết quả
        if (response.ok) {
            // Nếu thành công, tải lại dữ liệu và hiển thị thông báo
            loadStations();
            loadStats();
            showSuccess('Xóa trạm sạc thành công!');
        } else {
            // Nếu thất bại, hiển thị thông báo lỗi
            showError(result.error || 'Có lỗi xảy ra');
        }
    } catch (error) {
        // Ghi log lỗi và hiển thị thông báo
        console.error('Error deleting station:', error);
        showError('Không thể xóa trạm sạc');
    } finally {
        // Ẩn loading indicator
        hideLoading();
    }
}

// ============================================
// HÀM TIỆN ÍCH (UTILITY FUNCTIONS)
// ============================================

/**
 * Hàm: showLoading()
 * Mô tả: Hiển thị loading overlay
 * @return {void}
 */
function showLoading() {
    document.getElementById('loading').classList.add('show');
}

/**
 * Hàm: hideLoading()
 * Mô tả: Ẩn loading overlay
 * @return {void}
 */
function hideLoading() {
    document.getElementById('loading').classList.remove('show');
}

/**
 * Hàm: showError(message)
 * Mô tả: Hiển thị thông báo lỗi
 * @param {string} message - Nội dung thông báo lỗi
 * @return {void}
 */
function showError(message) {
    alert('Lỗi: ' + message);
}

/**
 * Hàm: showSuccess(message)
 * Mô tả: Hiển thị thông báo thành công
 * @param {string} message - Nội dung thông báo thành công
 * @return {void}
 */
function showSuccess(message) {
    alert(message);
}

/**
 * Hàm: escapeHtml(text)
 * Mô tả: Escape HTML để tránh XSS (Cross-Site Scripting) attack
 * @param {string} text - Chuỗi cần escape
 * @return {string} Chuỗi đã được escape
 */
function escapeHtml(text) {
    // Tạo một element div tạm thời
    const div = document.createElement('div');
    // Gán text vào textContent (tự động escape HTML)
    div.textContent = text;
    // Trả về innerHTML đã được escape
    return div.innerHTML;
}

/**
 * Hàm: formatCurrency(amount)
 * Mô tả: Định dạng số tiền theo định dạng Việt Nam
 * @param {number} amount - Số tiền cần định dạng
 * @return {string} Chuỗi đã được định dạng (VD: 5.000)
 */
function formatCurrency(amount) {
    // Sử dụng Intl.NumberFormat để định dạng số theo locale vi-VN
    return new Intl.NumberFormat('vi-VN').format(amount);
}
