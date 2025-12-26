/**
 * File: assets/js/main.js
 * Mô tả: File JavaScript chính quản lý điều hướng và load các module của hệ thống
 * Chức năng: 
 *   - Quản lý navigation menu và chuyển đổi giữa các trang
 *   - Load dữ liệu cho từng module khi chuyển trang
 *   - Khởi tạo ứng dụng khi DOM ready
 * Tác giả: Hệ thống quản lý trạm sạc
 */

// ============================================
// KHỞI TẠO ỨNG DỤNG
// ============================================

/**
 * Sự kiện: DOMContentLoaded
 * Mô tả: Chạy khi DOM (HTML) đã được tải xong hoàn toàn
 * Chức năng: Khởi tạo ứng dụng bằng cách:
 *   1. Kiểm tra session đăng nhập
 *   2. Thiết lập navigation menu
 *   3. Ẩn/hiện menu theo quyền
 *   4. Hiển thị thông tin user
 *   5. Load dashboard với dữ liệu ban đầu
 * Lý do: Đảm bảo tất cả phần tử HTML đã tồn tại trước khi JavaScript chạy
 */
// Flag để tránh redirect loop - sử dụng sessionStorage để persist qua page reload
const REDIRECT_KEY = 'auth_redirect_attempt';
const MAX_REDIRECT_COUNT = 2; // Giảm xuống 2 lần để tránh loop

// LOG NGAY LẬP TỨC khi file được load (trước DOMContentLoaded)
console.log('📦 [MAIN] main.js file loaded');
console.log('📦 [MAIN] Current URL:', window.location.href);
console.log('📦 [MAIN] Current pathname:', window.location.pathname);

document.addEventListener('DOMContentLoaded', async () => {
    console.log('📦 [MAIN] DOMContentLoaded event fired');
    
    // QUAN TRỌNG: Chỉ chạy trên admin.html và staff.html, KHÔNG chạy trên login.php
    const currentPath = window.location.pathname.toLowerCase();
    const currentHref = window.location.href.toLowerCase();
    const isOnLoginPage = currentPath.includes('login.php') || currentHref.includes('login.php');
    
    console.log('📦 [MAIN] Page check:', {
        'currentPath': currentPath,
        'currentHref': currentHref,
        'isOnLoginPage': isOnLoginPage
    });
    
    // Nếu đang ở trang login, KHÔNG chạy logic này
    if (isOnLoginPage) {
        console.log('ℹ️ [MAIN] On login page, skipping main.js logic');
        return;
    }
    
    // Meta refresh đã được xóa hoàn toàn từ HTML, không cần xóa nữa
    // Giữ lại code này để đảm bảo nếu có meta refresh nào đó còn sót lại
    const metaRefresh = document.querySelector('meta[http-equiv="refresh"]');
    if (metaRefresh) {
        console.warn('⚠️ [MAIN] Found meta refresh tag, removing it');
        metaRefresh.remove();
    }
    
    // QUAN TRỌNG: Xóa style="display: none;" từ user-info ngay khi DOM ready
    // Điều này đảm bảo element sẵn sàng được hiển thị khi có user
    const userInfo = document.getElementById('user-info');
    if (userInfo) {
        // Xóa style inline "display: none" nếu có
        if (userInfo.hasAttribute('style') && userInfo.style.display === 'none') {
            console.log('🔧 [MAIN] Removing inline display:none from user-info');
            userInfo.removeAttribute('style');
        }
    }
    
    // Hiển thị "Đang kiểm tra đăng nhập..." trong khi kiểm tra
    document.body.classList.add('auth-checking');
    console.log('🚀 [MAIN] Starting authentication check process');
    
    // Đơn giản hóa: Chỉ đợi 500ms để cookie được xử lý
    console.log('⏳ [MAIN] Waiting for session cookie to be processed (500ms)...');
    await new Promise(resolve => setTimeout(resolve, 500));
    console.log('✅ [MAIN] Starting auth check...');
    
    // Kiểm tra redirect count từ sessionStorage
    let redirectCount = parseInt(sessionStorage.getItem(REDIRECT_KEY) || '0', 10);
    
    // Nếu đã vượt quá số lần redirect, dừng lại
    if (redirectCount >= MAX_REDIRECT_COUNT) {
        console.error('❌ [MAIN] Redirect loop detected! Clearing sessionStorage and stopping.');
        sessionStorage.removeItem(REDIRECT_KEY);
        alert('Đã xảy ra lỗi xác thực. Vui lòng làm mới trang và đăng nhập lại.');
        return;
    }
    
    // Kiểm tra session đăng nhập - chỉ check một lần, không retry
    let isAuthenticated = false;
    try {
        isAuthenticated = await checkAuth();
        console.log('✅ [MAIN] Auth check result:', isAuthenticated);
        
        // Nếu có user, reset redirect count
        if (window.currentUser) {
            sessionStorage.removeItem(REDIRECT_KEY);
            console.log('✅ [MAIN] User authenticated, cleared redirect count');
        }
    } catch (error) {
        console.error('❌ [MAIN] Auth check error:', error);
        // Nếu có lỗi nhưng có currentUser, vẫn coi là authenticated
        if (window.currentUser) {
            isAuthenticated = true;
            sessionStorage.removeItem(REDIRECT_KEY);
        }
    }
    
    // Kiểm tra lại xem vẫn còn ở admin.html hoặc staff.html
            const stillOnIndexPage = !window.location.pathname.toLowerCase().includes('login.php') && 
                                     !window.location.href.toLowerCase().includes('login.php');
    
    // CHỈ redirect nếu:
    // 1. Chưa authenticated
    // 2. Không có currentUser
    // 3. Vẫn đang ở trang admin/staff
    // 4. Chưa vượt quá số lần redirect
    if (!isAuthenticated && !window.currentUser && stillOnIndexPage && redirectCount < MAX_REDIRECT_COUNT) {
        redirectCount++;
        sessionStorage.setItem(REDIRECT_KEY, redirectCount.toString());
        console.warn(`❌ [MAIN] Authentication failed, redirecting to login... (${redirectCount}/${MAX_REDIRECT_COUNT})`);
        window.location.replace('login.php');
        return;
    }
    
    // Nếu đã có currentUser, đảm bảo không redirect
    if (window.currentUser) {
        sessionStorage.removeItem(REDIRECT_KEY);
        isAuthenticated = true;
    }
    
    // QUAN TRỌNG: Nếu có currentUser, đảm bảo hiển thị user-info ngay lập tức
    if (window.currentUser) {
        console.log('✅ [MAIN] currentUser found, displaying user info immediately');
        displayUserInfo();
    }
    
    // Nếu đã đăng nhập, kiểm tra xem user có truy cập đúng trang không
    // CHỈ redirect nếu user đang ở trang SAI - tránh redirect loop
    if (isAuthenticated && window.currentUser) {
        const currentPage = window.location.pathname.toLowerCase();
        const isOnAdminPage = currentPage.includes('admin.html');
        const isOnStaffPage = currentPage.includes('staff.html');
        const userIsAdmin = window.currentUser.role === 'admin';
        
        // CHỈ redirect nếu:
        // 1. User là admin VÀ đang ở staff.html
        // 2. User là staff VÀ đang ở admin.html
        // KHÔNG redirect nếu user đã ở đúng trang
        if (userIsAdmin && isOnStaffPage) {
            console.warn('⚠️ [MAIN] Admin user on staff page, redirecting to admin.html...');
            window.location.replace('admin.html');
            return;
        }
        
        if (!userIsAdmin && isOnAdminPage) {
            console.warn('⚠️ [MAIN] Staff user on admin page, redirecting to staff.html...');
            window.location.replace('staff.html');
            return;
        }
        
        // Reset redirect count sau khi đã ở đúng trang
        sessionStorage.removeItem(REDIRECT_KEY);
        
        console.log('✅ [MAIN] Authentication successful, initializing application...');
        console.log('✅ [MAIN] Current user:', window.currentUser);
        console.log('✅ [MAIN] User is on correct page:', isOnAdminPage ? 'admin.html' : 'staff.html');
        
        try {
            // Xóa class auth-checking để hiển thị nội dung
            document.body.classList.remove('auth-checking');
            console.log('✅ [MAIN] Removed auth-checking class');
            
            // Meta refresh đã được xóa ở đầu hàm, không cần xóa lại
            
            // Gọi hàm khởi tạo navigation menu
            console.log('✅ [MAIN] Initializing navigation...');
            initNavigation();
            
            // Ẩn/hiện menu theo quyền (không còn cần thiết vì đã có admin.html và staff.html riêng)
            // Giữ lại để đảm bảo menu được hiển thị đúng (nếu có thay đổi động)
            console.log('✅ [MAIN] Setting up menu by role...');
            setupMenuByRole();
            
            // Hiển thị thông tin user
            console.log('✅ [MAIN] Displaying user info...');
            displayUserInfo();
            
            // Kiểm tra lại một lần sau 500ms để đảm bảo hiển thị (nếu cần)
            setTimeout(() => {
                const userInfo = document.getElementById('user-info');
                if (userInfo && window.currentUser) {
                    const computedStyle = window.getComputedStyle(userInfo);
                    if (computedStyle.display === 'none' || computedStyle.visibility === 'hidden') {
                        console.warn('⚠️ [MAIN] user-info is hidden, forcing display...');
                        userInfo.style.setProperty('display', 'flex', 'important');
                        userInfo.style.setProperty('visibility', 'visible', 'important');
                        userInfo.style.setProperty('opacity', '1', 'important');
                        console.log('✅ [MAIN] Force displayed user-info');
                    }
                }
            }, 500);
            
            // Load dashboard với dữ liệu thống kê ban đầu
            // Đợi một chút để đảm bảo dashboard.js đã load xong
            setTimeout(() => {
                if (typeof loadDashboard === 'function' || (typeof window !== 'undefined' && typeof window.loadDashboard === 'function')) {
                    console.log('✅ [MAIN] Loading dashboard...');
                    const dashboardFunc = typeof loadDashboard === 'function' ? loadDashboard : window.loadDashboard;
                    dashboardFunc();
                } else {
                    console.warn('⚠️ [MAIN] loadDashboard function not found');
                }
            }, 100);
            
            console.log('✅ [MAIN] Application initialized successfully');
            
            // Lưu interval ID vào window để có thể clear khi cần
            // CHỈ chạy interval nếu cần thiết (ví dụ: để debug)
            // Trong production, không cần interval này vì đã có setTimeout ở trên
            // Giữ lại với thời gian dài hơn để tránh spam console
            if (window.DEBUG_MODE) {
                window.userInfoCheckInterval = setInterval(() => {
                    const userInfo = document.getElementById('user-info');
                    if (userInfo && window.currentUser) {
                        const computedStyle = window.getComputedStyle(userInfo);
                        if (computedStyle.display === 'none' || computedStyle.visibility === 'hidden') {
                            console.warn('⚠️ [MAIN] user-info is hidden, forcing display...');
                            userInfo.style.setProperty('display', 'flex', 'important');
                            userInfo.style.setProperty('visibility', 'visible', 'important');
                            userInfo.style.setProperty('opacity', '1', 'important');
                        }
                    } else if (!window.currentUser && window.userInfoCheckInterval) {
                        // Nếu không có user, dừng interval
                        clearInterval(window.userInfoCheckInterval);
                        window.userInfoCheckInterval = null;
                    }
                }, 5000); // Kiểm tra mỗi 5 giây (chỉ trong debug mode)
            }
            
        } catch (error) {
            // Xử lý lỗi khi khởi tạo ứng dụng
            console.error('❌ [MAIN] Error initializing application:', error);
            console.error('❌ [MAIN] Error stack:', error.stack);
            
            // Không redirect về login vì đã authenticated
            // Chỉ log lỗi và tiếp tục
            // Nhưng vẫn cố gắng hiển thị user info
            try {
                displayUserInfo();
            } catch (displayError) {
                console.error('❌ [MAIN] Error displaying user info:', displayError);
            }
        }
    } else {
        // Debug: Log lý do không hiển thị nội dung
        console.warn('⚠️ [MAIN] Not displaying content:', {
            'isAuthenticated': isAuthenticated,
            'stillOnIndexPage': stillOnIndexPage,
            'hasCurrentUser': !!window.currentUser,
            'currentUser': window.currentUser
        });
    }
});

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
        'giasac': 'Quản Lý Giá Sạc',                // Trang quản lý giá sạc (chỉ admin)
        'approve': 'Duyệt Nhân Viên',               // Trang duyệt nhân viên (chỉ admin)
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
    loadPageContent(pageName);
}

/**
 * Hàm: loadPageContent(pageName)
 * Mô tả: Load nội dung dữ liệu cho từng trang module
 * @param {string} pageName - Tên trang cần load (ví dụ: 'dashboard', 'tramsac')
 * @return {void} Không trả về giá trị
 * Chức năng: Gọi hàm load tương ứng với từng module
 */
function loadPageContent(pageName) {
    // Lấy phần tử container của trang
    const pageElement = document.getElementById(pageName);
    
    // Nếu không tìm thấy phần tử thì dừng lại
    if (!pageElement) return;
    
    // Sử dụng switch-case để gọi hàm load tương ứng với từng module
    switch(pageName) {
        case 'dashboard':
            // Load dashboard với thống kê tổng quan
            if (typeof loadDashboard === 'function') {
                loadDashboard();
            }
            break;
        case 'tramsac':
            // Load trang quản lý trạm sạc
            if (typeof loadTramSac === 'function') {
                loadTramSac();
            }
            break;
        case 'cotsac':
            // Load trang quản lý cột sạc
            if (typeof loadCotSac === 'function') {
                loadCotSac();
            } else {
                pageElement.innerHTML = '<h2>Quản Lý Cột Sạc</h2><p>Đang phát triển...</p>';
            }
            break;
        case 'khachhang':
            // Load trang quản lý khách hàng
            if (typeof loadKhachHang === 'function') {
                loadKhachHang();
            } else {
                pageElement.innerHTML = '<h2>Quản Lý Khách Hàng</h2><p>Đang phát triển...</p>';
            }
            break;
        case 'phuongtien':
            // Load trang quản lý phương tiện
            if (typeof loadPhuongTien === 'function') {
                loadPhuongTien();
            } else {
                pageElement.innerHTML = '<h2>Quản Lý Phương Tiện</h2><p>Đang phát triển...</p>';
            }
            break;
        case 'phiensac':
            // Load trang quản lý phiên sạc
            if (typeof loadPhienSac === 'function') {
                loadPhienSac();
            } else {
                pageElement.innerHTML = '<h2>Quản Lý Phiên Sạc</h2><p>Đang phát triển...</p>';
            }
            break;
        case 'hoadon':
            // Load trang quản lý hóa đơn
            if (typeof loadHoaDon === 'function') {
                loadHoaDon();
            } else {
                pageElement.innerHTML = '<h2>Quản Lý Hóa Đơn</h2><p>Đang phát triển...</p>';
            }
            break;
        case 'thanhtoan':
            // Load trang quản lý thanh toán
            if (typeof loadThanhToan === 'function') {
                loadThanhToan();
            } else {
                pageElement.innerHTML = '<h2>Quản Lý Thanh Toán</h2><p>Đang phát triển...</p>';
            }
            break;
        case 'nhanvien':
            // Load trang quản lý nhân viên
            if (typeof loadNhanVien === 'function') {
                loadNhanVien();
            } else {
                pageElement.innerHTML = '<h2>Quản Lý Nhân Viên</h2><p>Đang phát triển...</p>';
            }
            break;
        case 'baotri':
            // Load trang quản lý bảo trì
            if (typeof loadBaoTri === 'function') {
                loadBaoTri();
            } else {
                pageElement.innerHTML = '<h2>Quản Lý Bảo Trì</h2><p>Đang phát triển...</p>';
            }
            break;
        case 'giasac':
            // Load trang quản lý giá sạc (CHỈ ADMIN)
            if (typeof loadGiaSac === 'function') {
                loadGiaSac();
            } else {
                pageElement.innerHTML = '<h2>Quản Lý Giá Sạc</h2><p>Đang phát triển...</p>';
            }
            break;
        case 'approve':
            // Load trang duyệt nhân viên (CHỈ ADMIN)
            if (typeof loadApprove === 'function') {
                loadApprove();
            } else {
                pageElement.innerHTML = '<h2>Duyệt Nhân Viên</h2><p>Đang phát triển...</p>';
            }
            break;
    }
}

// ============================================
// HÀM THIẾT LẬP MENU THEO QUYỀN
// ============================================

/**
 * Hàm: setupMenuByRole()
 * Mô tả: Ẩn/hiện menu items theo quyền của user
 * Chức năng:
 *   1. Kiểm tra user có phải admin không
 *   2. Hiển thị menu "Giá Sạc" và "Duyệt Nhân Viên" nếu là admin
 *   3. Ẩn các menu này nếu không phải admin
 */
function setupMenuByRole() {
    console.log('🔐 [MAIN] setupMenuByRole() called');
    console.log('🔐 [MAIN] window.currentUser:', window.currentUser);
    console.log('🔐 [MAIN] isAdmin():', isAdmin());
    
    // Lưu ý: Hàm này vẫn được giữ lại để đảm bảo menu được hiển thị đúng
    // Tuy nhiên, vì giờ đã có admin.html và staff.html riêng biệt,
    // menu đã được ẩn/hiện trực tiếp trong HTML nên hàm này chủ yếu chỉ để đảm bảo tương thích
    
    // Kiểm tra user có phải admin không
    // isAdmin(): Hàm từ auth.js, kiểm tra role === 'admin'
    if (isAdmin()) {
        console.log('✅ [MAIN] User is admin - should be on admin.html');
        // Nếu là admin, đảm bảo menu "Giá Sạc", "Duyệt Nhân Viên" và "Nhân Viên" được hiển thị
        const menuGiaSac = document.getElementById('menu-giasac');
        const menuApprove = document.getElementById('menu-approve');
        const menuNhanVien = document.getElementById('menu-nhanvien');
        
        if (menuGiaSac) {
            menuGiaSac.style.display = 'block';
            console.log('✅ [MAIN] Menu "Giá Sạc" displayed');
        }
        if (menuApprove) {
            menuApprove.style.display = 'block';
            console.log('✅ [MAIN] Menu "Duyệt Nhân Viên" displayed');
        }
        // Hiển thị menu "Nhân Viên" cho admin
        if (menuNhanVien) {
            menuNhanVien.style.display = 'block';
            console.log('✅ [MAIN] Menu "Nhân Viên" displayed for admin');
        }
    } else {
        console.log('ℹ️ [MAIN] User is staff - should be on staff.html');
        // Nếu không phải admin, đảm bảo các menu chỉ dành cho admin bị ẩn
        const menuGiaSac = document.getElementById('menu-giasac');
        const menuApprove = document.getElementById('menu-approve');
        const menuNhanVien = document.getElementById('menu-nhanvien');
        
        if (menuGiaSac) {
            menuGiaSac.style.display = 'none';
        }
        if (menuApprove) {
            menuApprove.style.display = 'none';
        }
        // Ẩn menu "Nhân Viên" cho nhân viên
        if (menuNhanVien) {
            menuNhanVien.style.display = 'none';
            console.log('✅ [MAIN] Menu "Nhân Viên" hidden for staff');
        }
    }
}

// ============================================
// HÀM HIỂN THỊ THÔNG TIN USER
// ============================================

/**
 * Hàm: displayUserInfo()
 * Mô tả: Hiển thị thông tin user hiện tại ở header
 * Chức năng:
 *   1. Lấy thông tin user từ window.currentUser
 *   2. Hiển thị tên và vai trò của user
 *   3. Hiển thị nút đăng xuất
 */
function displayUserInfo() {
    console.log('👤 [MAIN] displayUserInfo() called');
    console.log('👤 [MAIN] window.currentUser:', window.currentUser);
    
    // Lấy các phần tử UI cần thiết
    const userInfo = document.getElementById('user-info');
    const userName = document.getElementById('user-name');
    const userRole = document.getElementById('user-role');
    
    // Kiểm tra xem các phần tử có tồn tại không
    if (!userInfo) {
        console.error('❌ [MAIN] user-info element not found');
        return;
    }
    if (!userName) {
        console.error('❌ [MAIN] user-name element not found');
        return;
    }
    if (!userRole) {
        console.error('❌ [MAIN] user-role element not found');
        return;
    }
    
    // Kiểm tra xem có thông tin user không
    if (window.currentUser) {
        console.log('✅ [MAIN] User found, displaying user info');
        
        // Hiển thị tên user
        userName.textContent = window.currentUser.HoTen || 'User';
        
        // Hiển thị vai trò với badge màu sắc
        const roleText = window.currentUser.role === 'admin' ? 'Admin' : 'Nhân viên';
        const roleClass = window.currentUser.role === 'admin' ? 'admin-badge' : 'staff-badge';
        userRole.innerHTML = `<span class="${roleClass}">${roleText}</span>`;
        
        // QUAN TRỌNG: Force hiển thị bằng cách:
        // 1. Xóa toàn bộ style attribute cũ
        // 2. Set lại style với !important để override mọi CSS khác
        userInfo.removeAttribute('style');
        
        // Hiển thị phần tử user-info với !important
        userInfo.style.setProperty('display', 'flex', 'important');
        userInfo.style.setProperty('visibility', 'visible', 'important');
        userInfo.style.setProperty('opacity', '1', 'important');
        userInfo.style.setProperty('position', 'relative', 'important');
        userInfo.style.setProperty('z-index', '1', 'important');
        
        // Đảm bảo nút đăng xuất cũng hiển thị (nút đăng xuất giờ là phần tử riêng trong header)
        const header = userInfo.closest('.main-header');
        const logoutBtn = header ? header.querySelector('.btn-logout') : document.querySelector('.main-header .btn-logout');
        if (logoutBtn) {
            logoutBtn.style.setProperty('display', 'inline-flex', 'important');
            logoutBtn.style.setProperty('visibility', 'visible', 'important');
            logoutBtn.style.setProperty('opacity', '1', 'important');
            logoutBtn.style.setProperty('cursor', 'pointer', 'important');
            logoutBtn.style.removeProperty('display'); // Xóa inline style để dùng CSS
            logoutBtn.style.removeProperty('visibility');
            logoutBtn.style.removeProperty('opacity');
            console.log('✅ [MAIN] Logout button style applied');
        } else {
            console.warn('⚠️ [MAIN] Logout button not found');
        }
        
        // Kiểm tra lại sau 50ms để đảm bảo style được áp dụng
        setTimeout(() => {
            const computedStyle = window.getComputedStyle(userInfo);
            if (computedStyle.display === 'none') {
                console.warn('⚠️ [MAIN] user-info still hidden by CSS, forcing again...');
                // Tạo một style element để force hiển thị
                const style = document.createElement('style');
                style.textContent = '#user-info { display: flex !important; visibility: visible !important; opacity: 1 !important; }';
                document.head.appendChild(style);
            }
        }, 50);
        
        console.log('✅ [MAIN] User info displayed:', {
            'name': window.currentUser.HoTen,
            'role': window.currentUser.role,
            'display': userInfo.style.display,
            'hasLogoutBtn': !!logoutBtn,
            'computedDisplay': window.getComputedStyle(userInfo).display
        });
    } else {
        console.warn('⚠️ [MAIN] No user found, hiding user info');
        // Nếu không có thông tin user, ẩn phần tử
        userInfo.style.display = 'none';
    }
}

