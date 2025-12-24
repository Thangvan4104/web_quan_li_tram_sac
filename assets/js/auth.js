/**
 * File: assets/js/auth.js
 * Mô tả: Module JavaScript xử lý authentication và kiểm tra quyền
 * Chức năng: 
 *   - Đăng nhập, đăng xuất
 *   - Kiểm tra session
 *   - Kiểm tra quyền (admin/staff)
 *   - Lưu trữ thông tin user hiện tại
 * Tác giả: Hệ thống quản lý trạm sạc
 */

// LOG NGAY KHI FILE ĐƯỢC LOAD
console.log('📦 [AUTH] auth.js file loaded');

// ============================================
// BIẾN TOÀN CỤC
// ============================================

// Lưu trữ thông tin user hiện tại
// window.currentUser: Có thể truy cập từ bất kỳ file JS nào
window.currentUser = null;
console.log('📦 [AUTH] window.currentUser initialized to null');

// ============================================
// HÀM KIỂM TRA SESSION
// ============================================

/**
 * Hàm: checkAuth()
 * Mô tả: Kiểm tra session đăng nhập khi load trang
 * @return {Promise<boolean>} Promise trả về true nếu đã đăng nhập, false nếu chưa
 * Chức năng:
 *   1. Gọi API kiểm tra session
 *   2. Nếu đã đăng nhập, lưu thông tin user vào window.currentUser
 *   3. Nếu chưa đăng nhập, redirect về trang login
 */
async function checkAuth() {
    console.log('🔍 [AUTH] checkAuth() called');
    try {
        // Đảm bảo API_BASE đã được định nghĩa
        const apiBase = typeof API_BASE !== 'undefined' ? API_BASE : 'api';
        console.log('🔍 [AUTH] API Base:', apiBase);
        
        // Tạo AbortController để có thể timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
            controller.abort();
            // KHÔNG redirect khi timeout - chỉ log warning và để main.js xử lý
            // Điều này tránh redirect loop
            const currentPath = window.location.pathname.toLowerCase();
            const currentHref = window.location.href.toLowerCase();
            const isOnLoginPage = currentPath.includes('login.php') || currentHref.includes('login.php');
            
            if (!isOnLoginPage) {
                console.warn('⏱️ [AUTH] Auth check timeout (10s) - NOT redirecting, letting main.js handle it');
            }
        }, 10000); // Timeout sau 10 giây nhưng KHÔNG redirect
        
        console.log('🔍 [AUTH] Fetching auth.php...');
        // Gọi API kiểm tra session
        // GET /api/auth.php: Trả về thông tin user nếu đã đăng nhập
        const response = await fetch(`${apiBase}/auth.php`, {
            signal: controller.signal,
            credentials: 'include' // Đảm bảo gửi cookies/session
        }).catch(err => {
            // Nếu fetch bị lỗi (network error, CORS, etc.)
            clearTimeout(timeoutId);
            
            // KHÔNG redirect ngay lập tức - chỉ log lỗi và để main.js xử lý
            // Điều này tránh redirect loop khi có lỗi network tạm thời
            console.error('❌ [AUTH] Fetch error:', err);
            console.warn('⚠️ [AUTH] NOT redirecting on fetch error - letting main.js handle it');
            
            throw err;
        });
        
        clearTimeout(timeoutId);
        console.log('🔍 [AUTH] Response received, status:', response.status);
        
        // Kiểm tra response có OK không
        if (!response.ok) {
            console.error('❌ [AUTH] HTTP error! status:', response.status);
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        // Parse JSON response
        let data;
        try {
            data = await response.json();
        } catch (parseError) {
            // KHÔNG redirect khi parse error - chỉ log và trả về false
            // Để main.js xử lý redirect
            console.error('❌ [AUTH] JSON parse error:', parseError);
            try {
                const text = await response.text();
                console.error('❌ [AUTH] Response text:', text);
            } catch (e) {
                console.error('❌ [AUTH] Could not read response text');
            }
            
            return false;
        }
        
        // Debug: Log response data
        console.log('🔍 [AUTH] Auth check response:', data);
        console.log('🔍 [AUTH] Response status:', response.status);
        console.log('🔍 [AUTH] Response headers:', {
            'content-type': response.headers.get('content-type'),
            'set-cookie': response.headers.get('set-cookie')
        });
        
        // Kiểm tra xem user đã đăng nhập chưa
        // QUAN TRỌNG: Chỉ coi là authenticated nếu:
        // 1. data.authenticated === true (chính xác true, không phải truthy)
        // 2. data.user tồn tại
        // 3. data.user.is_approved == 1 (đã được duyệt)
        if (data && data.authenticated === true && data.user && data.user.is_approved == 1) {
            // Nếu đã đăng nhập và đã được duyệt, lưu thông tin user vào biến toàn cục
            window.currentUser = data.user;
            console.log('✅ [AUTH] Authentication successful, user:', data.user);
            return true;
        } else {
            // Nếu chưa đăng nhập hoặc chưa được duyệt, xóa thông tin user
            window.currentUser = null;
            console.warn('❌ [AUTH] Authentication failed:', data);
            console.warn('❌ [AUTH] Debug info:', {
                'authenticated': data?.authenticated,
                'has_user': !!data?.user,
                'is_approved': data?.user?.is_approved,
                'reason': data?.reason,
                'session_id': data?.session_id,
                'cookie_header': data?.cookie_header
            });
            
            // QUAN TRỌNG: CHỈ redirect nếu:
            // 1. KHÔNG đang ở trang login (tránh redirect loop)
            // 2. Thực sự chưa đăng nhập (không phải lỗi tạm thời)
            const currentPath = window.location.pathname.toLowerCase();
            const currentHref = window.location.href.toLowerCase();
            const isOnLoginPage = currentPath.includes('login.php') || currentHref.includes('login.php');
            
            console.log('🔍 [AUTH] Current location:', {
                'pathname': currentPath,
                'href': currentHref,
                'isOnLoginPage': isOnLoginPage
            });
            
            // CHỈ redirect nếu KHÔNG đang ở trang login
            // Điều này đảm bảo không có redirect loop
            // KHÔNG redirect trong hàm checkAuth() - để main.js xử lý redirect
            if (!isOnLoginPage) {
                console.warn('⚠️ [AUTH] Authentication check failed');
                // KHÔNG redirect ở đây - main.js sẽ xử lý sau khi retry
            } else {
                console.log('ℹ️ [AUTH] Already on login page, not redirecting');
            }
            
            return false;
        }
    } catch (error) {
        // Xử lý lỗi: In ra console
        // Chỉ log nếu không phải AbortError (timeout đã xử lý)
        if (error.name !== 'AbortError') {
            console.error('❌ [AUTH] Error checking auth:', error);
            console.error('❌ [AUTH] Error stack:', error.stack);
        } else {
            console.warn('⏱️ [AUTH] Auth check aborted (timeout)');
        }
        window.currentUser = null;
        
        // CHỈ redirect nếu KHÔNG đang ở trang login (tránh redirect loop)
        const currentPath = window.location.pathname.toLowerCase();
        const currentHref = window.location.href.toLowerCase();
        const isOnLoginPage = currentPath.includes('login.php') || currentHref.includes('login.php');
        
        console.log('🔍 [AUTH] Error handler - Current location:', {
            'pathname': currentPath,
            'href': currentHref,
            'isOnLoginPage': isOnLoginPage
        });
        
        // KHÔNG redirect trong catch block - để main.js xử lý
        // Nếu có lỗi nhưng currentUser vẫn còn, giữ user ở lại
        if (window.currentUser) {
            console.warn('⚠️ [AUTH] Error occurred but currentUser exists, not redirecting');
            return true; // Trả về true để không redirect
        }
        
        if (!isOnLoginPage) {
            console.warn('⚠️ [AUTH] Error occurred and no currentUser, but not redirecting here');
            // KHÔNG redirect ở đây - để main.js xử lý sau khi retry
        } else {
            console.log('ℹ️ [AUTH] Already on login page, not redirecting (error)');
        }
        
        return false;
    }
}

/**
 * Hàm: redirectToLogin()
 * Mô tả: Redirect về trang login nếu không đang ở trang login
 * @return {void} Không trả về giá trị
 */
function redirectToLogin() {
    // Chỉ redirect nếu không đang ở trang login
    const currentPath = window.location.pathname.toLowerCase();
    const currentHref = window.location.href.toLowerCase();
    const isOnLoginPage = currentPath.includes('login.php') || currentHref.includes('login.php');
    
    if (!isOnLoginPage) {
        // Sử dụng window.location.replace() để redirect ngay lập tức và không lưu vào history
        try {
            window.location.replace('login.php');
        } catch (e) {
            // Nếu replace không hoạt động, thử href
            console.warn('replace() failed, trying href:', e);
                window.location.href = 'login.php';
        }
    }
}

// ============================================
// HÀM ĐĂNG NHẬP (DEPRECATED)
// ============================================

/**
 * Hàm: login(email, password)
 * @deprecated Hàm này không còn được sử dụng - đăng nhập được xử lý trực tiếp trong login.php
 * Form submit trực tiếp trong login.php, không cần hàm JavaScript này
 */
async function login(email, password) {
    console.warn('⚠️ [AUTH] login() function is deprecated. Use login.php form submit instead.');
    return false;
}

// ============================================
// HÀM ĐĂNG XUẤT
// ============================================

/**
 * Hàm: logout()
 * Mô tả: Đăng xuất và xóa session
 * @return {Promise<void>} Promise không trả về giá trị
 * Chức năng:
 *   1. Gọi API đăng xuất
 *   2. Xóa thông tin user khỏi biến toàn cục
 *   3. Redirect về trang login
 */
async function logout() {
    try {
        // Gọi API đăng xuất
        // DELETE /api/auth.php: Xóa session
        const apiBase = typeof API_BASE !== 'undefined' ? API_BASE : 'api';
        await fetch(`${apiBase}/auth.php`, {
            method: 'DELETE',
            credentials: 'include' // Đảm bảo gửi cookies/session để xóa session
        });
        
        // Xóa thông tin user khỏi biến toàn cục
        window.currentUser = null;
        
        // Clear tất cả redirect flags trong sessionStorage
        sessionStorage.removeItem('auth_redirect_attempt');
        sessionStorage.removeItem('login_redirect_attempt');
        
        // Redirect về trang login
        // Sử dụng replace() để không lưu vào history
        window.location.replace('login.php');
        
    } catch (error) {
        // Xử lý lỗi: In ra console và vẫn redirect về login
        console.error('Error logging out:', error);
        window.currentUser = null;
        
        // Clear tất cả redirect flags trong sessionStorage
        sessionStorage.removeItem('auth_redirect_attempt');
        sessionStorage.removeItem('login_redirect_attempt');
        
        // Vẫn redirect về login ngay cả khi có lỗi
        window.location.replace('login.php');
    }
}

// ============================================
// HÀM KIỂM TRA QUYỀN
// ============================================

/**
 * Hàm: isAdmin()
 * Mô tả: Kiểm tra user có phải admin không
 * @return {boolean} true nếu là admin, false nếu không
 */
function isAdmin() {
    return window.currentUser && window.currentUser.role === 'admin';
}

/**
 * Hàm: isStaff()
 * Mô tả: Kiểm tra user có phải staff không
 * @return {boolean} true nếu là staff, false nếu không
 */
function isStaff() {
    return window.currentUser && window.currentUser.role === 'staff';
}

/**
 * Hàm: canSetPrice()
 * Mô tả: Kiểm tra user có quyền set giá sạc không (chỉ admin)
 * @return {boolean} true nếu có quyền, false nếu không
 */
function canSetPrice() {
    return isAdmin();
}

/**
 * Hàm: canApproveStaff()
 * Mô tả: Kiểm tra user có quyền duyệt nhân viên không (chỉ admin)
 * @return {boolean} true nếu có quyền, false nếu không
 */
function canApproveStaff() {
    return isAdmin();
}

/**
 * Hàm: canViewAllData()
 * Mô tả: Kiểm tra user có quyền xem toàn bộ dữ liệu không (chỉ admin)
 * @return {boolean} true nếu có quyền, false nếu không
 */
function canViewAllData() {
    return isAdmin();
}

// ============================================
// EXPOSE FUNCTIONS TO WINDOW OBJECT
// ============================================

/**
 * Expose các hàm authentication ra window object
 * Mục đích: Cho phép gọi các hàm từ HTML onclick attributes hoặc các file JS khác
 */
window.checkAuth = checkAuth;
window.login = login;
window.logout = logout;
window.isAdmin = isAdmin;
window.isStaff = isStaff;
window.canSetPrice = canSetPrice;
window.canApproveStaff = canApproveStaff;
window.canViewAllData = canViewAllData;

