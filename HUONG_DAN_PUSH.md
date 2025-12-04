# Hướng Dẫn Push Code Lên GitHub

## Cách 1: Sử dụng Script Tự Động (Khuyến nghị)

1. **Double-click vào file `push_to_github.bat`**
   - Script sẽ tự động thực hiện tất cả các bước
   - Nếu có lỗi, script sẽ hiển thị hướng dẫn

## Cách 2: Chạy Thủ Công

### Bước 1: Mở Git Bash hoặc Command Prompt trong thư mục dự án

### Bước 2: Chạy các lệnh sau:

```bash
# 1. Khởi tạo git repository (nếu chưa có)
git init

# 2. Thêm remote repository
git remote add origin git@github.com:Thangvan4104/web_quan_li_tram_sac.git

# 3. Thêm tất cả file vào staging
git add .

# 4. Commit
git commit -m "Initial commit: Hệ thống quản lý trạm sạc"

# 5. Đổi tên branch thành main
git branch -M main

# 6. Push lên GitHub
git push -u origin main
```

## Cách 3: Sử dụng HTTPS (Nếu chưa có SSH key)

```bash
# Thay đổi remote URL sang HTTPS
git remote set-url origin https://github.com/Thangvan4104/web_quan_li_tram_sac.git

# Push (sẽ yêu cầu nhập username và Personal Access Token)
git push -u origin main
```

## Lưu Ý Quan Trọng:

### 1. Cài Đặt Git
- Nếu chưa có Git, tải và cài đặt từ: https://git-scm.com/download/win
- Sau khi cài đặt, khởi động lại terminal

### 2. SSH Key (Cho phương thức SSH)
- Nếu dùng SSH (`git@github.com:...`), cần cấu hình SSH key
- Hướng dẫn: https://docs.github.com/en/authentication/connecting-to-github-with-ssh

### 3. Personal Access Token (Cho phương thức HTTPS)
- GitHub không còn chấp nhận mật khẩu
- Cần tạo Personal Access Token: https://github.com/settings/tokens
- Sử dụng token này thay cho mật khẩu khi push

### 4. Tạo Repository Trên GitHub
- Đảm bảo repository `web_quan_li_tram_sac` đã được tạo trên GitHub
- Link: https://github.com/Thangvan4104/web_quan_li_tram_sac

## Xử Lý Lỗi Thường Gặp:

### Lỗi: "git is not recognized"
- **Giải pháp**: Cài đặt Git và thêm vào PATH

### Lỗi: "Permission denied (publickey)"
- **Giải pháp**: Cấu hình SSH key hoặc chuyển sang HTTPS

### Lỗi: "Repository not found"
- **Giải pháp**: Kiểm tra tên repository và quyền truy cập

### Lỗi: "Updates were rejected"
- **Giải pháp**: Pull code mới nhất trước khi push:
  ```bash
  git pull origin main --allow-unrelated-histories
  git push -u origin main
  ```

## Kiểm Tra Sau Khi Push:

1. Truy cập: https://github.com/Thangvan4104/web_quan_li_tram_sac
2. Kiểm tra xem tất cả file đã được upload chưa
3. Kiểm tra README.md có hiển thị đúng không

