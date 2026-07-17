# Kế Hoạch Chỉnh Sửa Giao Diện Trang Cài Đặt (HaiPhuong)

Tài liệu này mô tả chi tiết phương án chỉnh sửa bố cục trang Cài đặt thiết bị & tài khoản nhằm giải quyết vấn đề lộn xộn, mất cân đối và đè chồng các phần tử UI.

---

## 1. Các Vấn Đề Hiện Tại
* **Mất cân đối không gian:** Khối cấu hình thiết bị hiện đang hiển thị 1 cột duy nhất ở phía bên trái, chừa lại một khoảng trống đen lớn (~60% chiều rộng màn hình) ở phía bên phải.
* **Chồng chéo phần tử (Overlapping):** Nút **"LƯU CẤU HÌNH THIẾT BỊ"** hiển thị chồng lấn trực tiếp lên tiêu đề tab chữ "THÔNG SỐ VÀ CA LÀM VIỆC".
* **Thiếu trường nhập liệu:** Tệp JavaScript `js/settings.js` có logic xử lý nút checkbox đăng ký tăng ca `config-overtime-checkbox`, nhưng tệp giao diện `_Settings.cshtml` lại chưa định nghĩa trường nhập liệu này.
* **Selector thiếu cân đối:** Hộp tìm kiếm và các thẻ select thiết bị trên cùng một hàng có kích thước chưa đồng đều và thiếu các hiệu ứng hover/focus đồng nhất.

---

## 2. Phương Án Giải Quyết Chi Tiết

### A. Tái thiết kế bố cục Cấu hình thiết bị (2 Cột)
Thay vì sử dụng bố cục 1 cột dồn về bên trái, ta sẽ chuyển cấu hình thiết bị sang dạng **Grid 2 cột**:
1. **Cột bên trái (Cấu hình chung - Rộng 350px):**
   * Tiêu đề: **CẤU HÌNH CHUNG**
   * Trường chọn ca làm việc cố định (`#config-shift-select`).
   * Bổ sung nút Switch/Checkbox đăng ký tăng ca (`#config-overtime-checkbox`) đồng nhất với CSS hiện có trong dự án.
   * Thêm một Card hướng dẫn sử dụng/thông tin nhanh (Machine Status/Guide Card) để làm đầy không gian trống một cách trực quan.
2. **Cột bên phải (Thông số kỹ thuật - Rộng 1fr):**
   * Tiêu đề: **THÔNG SỐ KỸ THUẬT CHI TIẾT**
   * Hiển thị danh sách 14 thuộc tính kỹ thuật dưới dạng lưới Grid responsive (`repeat(auto-fill, minmax(220px, 1fr))`).
   * Di chuyển nút **"LƯU CẤU HÌNH THIẾT BỊ"** xuống dưới cùng bên phải của thẻ thông số kỹ thuật. Điều này giúp nút bấm hiển thị rõ ràng, khoa học và tránh hoàn toàn việc bị đè lên các tiêu đề.

### B. Cải tiến thanh chọn thiết bị (Selector Bar)
* Đồng nhất chiều cao và kích thước padding cho các phần tử: Category select, Search input, Machine select, và nút "+ Thêm thiết bị mới".
* Sử dụng flexbox căn chỉnh các phần tử gọn gàng, tăng khoảng cách padding và bo góc mềm mại hơn (`border-radius: 8px`).

---

## 3. Các Tệp Sẽ Chỉnh Sửa

* **[Views/Home/_Settings.cshtml](file:///c:/Users/case%20046/source/repos/HaiPhuong/HaiPhuong/Views/Home/_Settings.cshtml):** Thay đổi cấu trúc HTML của khu vực cấu hình thiết bị và thêm checkbox overtime.
* **[css/settings.css](file:///c:/Users/case%20046/source/repos/HaiPhuong/HaiPhuong/css/settings.css):** Bổ sung các class CSS hỗ trợ hiển thị bố cục 2 cột và tinh chỉnh giao diện cho nút/input.

---

## 4. Kế Hoạch Xác Minh (Verification)
* **Xác minh trực quan:** Kiểm tra bố cục trang cài đặt xem các cột đã hiển thị cân đối và nút lưu thiết bị có bị chồng chéo hay không.
* **Xác minh tính năng:** 
  - Thay đổi ca làm việc và nhấn lưu để đảm bảo API hoạt động đúng.
  - Thay đổi các thuộc tính máy, tích chọn tăng ca và lưu lại để kiểm tra tính năng ghi nhận dữ liệu xuống database.
