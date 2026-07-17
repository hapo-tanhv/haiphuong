# Danh Sách Nhiệm Vụ Chỉnh Sửa Giao Diện Trang Cài Đặt

- [x] Cập nhật giao diện `_Settings.cshtml` cấu hình thiết bị sang Grid 2 cột
- [x] Loại bỏ nút checkbox/switch đăng ký tăng ca `config-overtime-checkbox` ở cột bên trái theo yêu cầu mới
- [x] Di chuyển nút lưu cấu hình xuống góc dưới cùng bên phải của panel thuộc tính kỹ thuật
- [x] Cập nhật CSS trong `settings.css` để tạo kiểu dáng hiện đại cho bố cục mới
- [x] Cân bằng chiều cao 2 card bằng nhau (`align-items: stretch` và `margin-top: auto` cho hướng dẫn)
- [x] Đồng bộ số lượng hiển thị cảnh báo ở icon chuông (Header) và mục "Cảnh báo" (Sidebar)
- [x] Sửa logic "Thời gian còn lại ước tính" sang dạng thời lượng tương đối (`hh:mm:ss`) thay vì mốc giờ tuyệt đối
- [x] Cập nhật công thức tính thời gian hoạt động đồng bộ: `Thời gian sản xuất = Thời gian máy chạy - Thời gian chạy thử`
- [x] Tách phân hệ "Máy vít" ở Sidebar thành dropdown chứa "Máy đấm vít" và "Máy ren vít"
- [x] Tách logic xử lý và tiêu đề trang tổng quan cho Máy đấm (`heading`) và Máy ren (`threading`)
- [x] Loại bỏ sản lượng ngày, sản lượng thực tế, tổng lệnh sx khỏi card Hiệu suất toàn hệ thống
- [x] Tính trung bình thời gian (chạy thử, sản xuất, máy chạy) chia cho tổng số máy hoạt động ở card Hiệu suất toàn hệ thống
- [x] Loại bỏ hộp "Hiệu suất sản lượng (TB)" dưới biểu đồ xu hướng sản lượng
- [x] Tính thêm tỷ lệ % và vẽ thanh tiến trình cho Chỉ số 6 ở thông tin từng máy ngoài Dashboard
- [x] Đồng bộ hóa hoàn toàn 6 thông số ở phần THỐNG KÊ THEO NGÀY của Chi tiết máy tương thích 1-1 với 6 chỉ số ngoài Tổng quan
- [x] Kiểm tra giao diện và đảm bảo tất cả hoạt động mượt mà
