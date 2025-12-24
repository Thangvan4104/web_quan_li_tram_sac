/**
 * File: assets/js/core.js
 * Mô tả: File JavaScript chứa các hàm và biến chung của hệ thống
 * Chức năng: 
 *   - Định nghĩa biến toàn cục (API_BASE)
 *   - Quản lý navigation menu
 *   - Chuyển đổi giữa các trang
 *   - Các hàm tiện ích (utility functions)
 * Tác giả: Hệ thống quản lý trạm sạc
 */

// LOG NGAY KHI FILE ĐƯỢC LOAD
console.log('📦 [CORE] core.js file loaded');

// ============================================
// CẤU HÌNH VÀ BIẾN TOÀN CỤC
// ============================================

/**
 * API_BASE: Đường dẫn cơ sở đến thư mục API
 * Giá trị: 'api' - tương đương với thư mục api/ trong project
 * Sử dụng: Được dùng trong tất cả các lời gọi fetch() để gọi API
 * Scope: Toàn cục, có thể truy cập từ mọi module
 */
const API_BASE = 'api';
console.log('📦 [CORE] API_BASE set to:', API_BASE);

// ============================================
// HÀM QUẢN LÝ NAVIGATION
// ============================================

/**
 * Hàm: initNavigation()
 * Mô tả: Khởi tạo và thiết lập các sự kiện cho navigation menu
 * Chức năng:
 *   1. Thiết lập menu toggle cho mobile (mở/đóng sidebar)
 *   2. Thiết lập sự kiện click cho tất cả menu items
 *   3. Xử lý chuyển đổi giữa các trang khi click menu
 * @return {void} Không trả về giá trị
 */
function initNavigation() {
    // Lấy phần tử menu toggle button (nút hamburger trên mobile)
    const menuToggle = document.getElementById('menuToggle');
    
    // Lấy phần tử sidebar để điều khiển show/hide
    const sidebar = document.getElementById('sidebar');
    
    // Kiểm tra xem menu toggle có tồn tại không (tránh lỗi nếu không tìm thấy)
    if (menuToggle) {
        // Thêm sự kiện click vào menu toggle
        menuToggle.addEventListener('click', () => {
            // Toggle class 'show' để hiện/ẩn sidebar trên mobile
            // classList.toggle: Nếu có class thì xóa, nếu không có thì thêm
            sidebar.classList.toggle('show');
        });
    }
    
    // Lấy tất cả các menu item (các link trong sidebar)
    // querySelectorAll: Trả về NodeList chứa tất cả phần tử có class 'nav-item'
    const navItems = document.querySelectorAll('.nav-item');
    
    // Duyệt qua từng menu item và thêm sự kiện click
    // forEach: Phương thức của NodeList để duyệt qua từng phần tử
    navItems.forEach(item => {
        // Thêm sự kiện click cho mỗi menu item
        item.addEventListener('click', (e) => {
            // Ngăn chặn hành vi mặc định của link (không điều hướng đến href="#")
            e.preventDefault();
            
            // Xóa class 'active' từ tất cả menu items
            // Mục đích: Chỉ highlight menu item đang được chọn
            navItems.forEach(nav => nav.classList.remove('active'));
            
            // Thêm class 'active' cho menu item vừa được click
            // Mục đích: Highlight menu item hiện tại
            item.classList.add('active');
            
            // Lấy tên trang từ attribute data-page
            // Ví dụ: data-page="dashboard" => pageName = "dashboard"
            const pageName = item.getAttribute('data-page');
            
            // Gọi hàm switchPage để chuyển sang trang tương ứng
            switchPage(pageName);
            
            // Đóng sidebar trên mobile sau khi chọn menu
            // window.innerWidth <= 768: Kiểm tra xem màn hình có phải mobile không
            if (window.innerWidth <= 768) {
                // Xóa class 'show' để ẩn sidebar
                sidebar.classList.remove('show');
            }
        });
    });
}

// ============================================
// HÀM CHUYỂN ĐỔI TRANG
// ============================================

/**
 * Hàm: switchPage(pageName)
 * Mô tả: Chuyển đổi giữa các trang module khác nhau
 * @param {string} pageName - Tên trang cần chuyển đến (ví dụ: 'dashboard', 'tramsac')
 * @return {void} Không trả về giá trị
 * Chức năng:
 *   1. Ẩn tất cả các trang hiện tại
 *   2. Hiển thị trang được chọn
 *   3. Cập nhật tiêu đề trang
 *   4. Load nội dung cho trang mới
 */
function switchPage(pageName) {
    // Lấy tất cả các phần tử có class 'page' (tất cả các trang)
    const pages = document.querySelectorAll('.page');
    
    // Duyệt qua từng trang và xóa class 'active'
    // Mục đích: Ẩn tất cả các trang
    pages.forEach(page => page.classList.remove('active'));
    
    // Lấy phần tử trang cần hiển thị dựa trên ID
    // pageName sẽ là ID của div (ví dụ: 'dashboard', 'tramsac')
    const targetPage = document.getElementById(pageName);
    
    // Kiểm tra xem trang có tồn tại không
    if (targetPage) {
        // Thêm class 'active' để hiển thị trang này
        // CSS sẽ dùng class 'active' để show/hide trang
        targetPage.classList.add('active');
    }
    
    // Lấy phần tử tiêu đề trang để cập nhật
    const pageTitle = document.getElementById('pageTitle');
    
    // Đối tượng chứa mapping giữa pageName và tiêu đề hiển thị
    // Key: tên trang (pageName), Value: tiêu đề hiển thị
    const titles = {
        'dashboard': 'Dashboard',                    // Trang tổng quan
        'tramsac': 'Quản Lý Trạm Sạc',              // Trang quản lý trạm sạc
        'cotsac': 'Quản Lý Cột Sạc',                // Trang quản lý cột sạc
        'khachhang': 'Quản Lý Khách Hàng',          // Trang quản lý khách hàng
        'phuongtien': 'Quản Lý Phương Tiện',        // Trang quản lý phương tiện
        'phiensac': 'Quản Lý Phiên Sạc',            // Trang quản lý phiên sạc
        'hoadon': 'Quản Lý Hóa Đơn',                // Trang quản lý hóa đơn
        'thanhtoan': 'Quản Lý Thanh Toán',          // Trang quản lý thanh toán
        'nhanvien': 'Quản Lý Nhân Viên',            // Trang quản lý nhân viên
        'baotri': 'Quản Lý Bảo Trì'                 // Trang quản lý bảo trì
    };
    
    // Kiểm tra xem pageTitle có tồn tại không
    if (pageTitle) {
        // Cập nhật nội dung text của tiêu đề
        // titles[pageName]: Lấy tiêu đề từ object titles
        // || 'Dashboard': Nếu không tìm thấy thì dùng 'Dashboard' làm mặc định
        pageTitle.textContent = titles[pageName] || 'Dashboard';
    }
    
    // Gọi hàm loadPageContent để load dữ liệu cho trang mới
    // Hàm này sẽ được định nghĩa trong main.js để quản lý việc load các module
    if (typeof loadPageContent === 'function') {
        loadPageContent(pageName);
    }
}

// ============================================
// HÀM TIỆN ÍCH (UTILITY FUNCTIONS)
// ============================================

/**
 * Hàm: escapeHtml(text)
 * Mô tả: Escape HTML để tránh XSS (Cross-Site Scripting) attack
 * @param {string} text - Chuỗi cần escape
 * @return {string} Chuỗi đã được escape an toàn
 * Chức năng: Chuyển đổi các ký tự đặc biệt HTML thành entity để hiển thị an toàn
 * Ví dụ: <script> => &lt;script&gt;
 */
function escapeHtml(text) {
    // Kiểm tra nếu text rỗng hoặc null/undefined thì trả về chuỗi rỗng
    if (!text) return '';
    
    // Tạo một element div tạm thời
    const div = document.createElement('div');
    
    // Gán text vào textContent (tự động escape HTML)
    // textContent: Chỉ lấy text, không parse HTML, tự động escape
    div.textContent = text;
    
    // Trả về innerHTML đã được escape
    // innerHTML: Lấy HTML đã được escape
    return div.innerHTML;
}

/**
 * Hàm: showLoading()
 * Mô tả: Hiển thị loading overlay
 * @return {void} Không trả về giá trị
 * Chức năng: Thêm class 'show' vào loading overlay để hiển thị
 */
function showLoading() {
    // Lấy phần tử loading overlay
    const loading = document.getElementById('loading');
    
    // Nếu tìm thấy thì thêm class 'show' để hiển thị
    if (loading) loading.classList.add('show');
}

/**
 * Hàm: hideLoading()
 * Mô tả: Ẩn loading overlay
 * @return {void} Không trả về giá trị
 * Chức năng: Xóa class 'show' khỏi loading overlay để ẩn
 */
function hideLoading() {
    // Lấy phần tử loading overlay
    const loading = document.getElementById('loading');
    
    // Nếu tìm thấy thì xóa class 'show' để ẩn
    if (loading) loading.classList.remove('show');
}

/**
 * Hàm: apiFetch(url, options)
 * Mô tả: Wrapper cho fetch() để tự động thêm credentials và xử lý lỗi
 * @param {string} url - URL của API endpoint
 * @param {object} options - Options cho fetch (method, headers, body, etc.)
 * @return {Promise<Response>} Promise trả về Response object
 * Chức năng:
 *   1. Tự động thêm credentials: 'include' để gửi session cookies
 *   2. Đảm bảo tất cả API calls đều gửi session cookies
 *   3. Hỗ trợ các options khác như method, headers, body
 * QUAN TRỌNG: Tất cả API calls phải sử dụng hàm này thay vì fetch() trực tiếp
 */
function apiFetch(url, options = {}) {
    // Merge options với credentials
    // Object.assign(): Merge các object lại với nhau
    // { credentials: 'include' }: Đảm bảo gửi cookies/session
    // ...options: Spread operator để copy tất cả options hiện có
    // Nếu options đã có credentials, sẽ được giữ nguyên (không override)
    const fetchOptions = Object.assign({ credentials: 'include' }, options);
    
    // Gọi fetch với options đã được merge
    return fetch(url, fetchOptions);
}

// Expose apiFetch ra window object để có thể sử dụng từ HTML onclick attributes
window.apiFetch = apiFetch;

