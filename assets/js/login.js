/**
 * File: assets/js/login.js
 * Mô tả: Module JavaScript cho trang đăng nhập
 * Lưu ý: Với login.php, form submit trực tiếp nên không cần nhiều logic JavaScript
 * Chỉ giữ lại các hàm tiện ích nếu cần
 */

// ============================================
// HÀM TOGGLE HIỆN/ẨN MẬT KHẨU
// ============================================

/**
 * Hàm: togglePassword()
 * Mô tả: Chuyển đổi giữa hiển thị và ẩn mật khẩu
 * @return {void} Không trả về giá trị
 */
function togglePassword() {
    const passwordInput = document.getElementById('password');
    const toggleIcon = document.getElementById('toggle-icon');
    
    if (!passwordInput || !toggleIcon) {
        return;
    }
    
    // Chuyển đổi type giữa 'password' và 'text'
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        toggleIcon.classList.remove('fa-eye');
        toggleIcon.classList.add('fa-eye-slash');
    } else {
        passwordInput.type = 'password';
        toggleIcon.classList.remove('fa-eye-slash');
        toggleIcon.classList.add('fa-eye');
    }
}

// ============================================
// EXPOSE FUNCTIONS TO WINDOW OBJECT
// ============================================

/**
 * Expose các hàm ra window object
 * Mục đích: Cho phép gọi các hàm từ HTML onclick attributes
 */
window.togglePassword = togglePassword;
