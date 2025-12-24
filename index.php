<?php
/**
 * File: index.php
 * Mô tả: File redirect chính - LUÔN LUÔN redirect đến login.php
 * Chức năng:
 *   - Đây là điểm vào chính của hệ thống
 *   - LUÔN LUÔN redirect đến login.php (bất kể đã đăng nhập hay chưa)
 *   - Sau khi đăng nhập thành công, user sẽ được redirect đến admin.html hoặc staff.html
 *   - Nếu user truy cập trực tiếp admin.html/staff.html mà chưa đăng nhập, sẽ được redirect về login.php
 * Tác giả: Hệ thống quản lý trạm sạc
 */

// LUÔN LUÔN redirect đến login.php
// User phải đăng nhập từ login.php, sau đó mới được chuyển đến admin.html hoặc staff.html
header('Location: login.php');
exit();
?>

