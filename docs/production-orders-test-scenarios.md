# Kịch Bản Kiểm Thử Lệnh Sản Xuất (Production Orders Test Scenarios)

Dưới đây là 10 kịch bản kiểm thử (Test Scenarios) đã được cập nhật dựa trên cấu trúc dữ liệu mới nhất (mỗi máy chạy một mã lệnh sản xuất riêng biệt).

---

## 1. Tạo mới Lệnh sản xuất khi máy rảnh (Normal Path - Machine Idle)
* **Mục đích:** Xác minh luồng tạo lệnh cơ bản hoạt động chính xác khi máy chỉ định đang không bận.
* **Các bước thực hiện:**
  1. Truy cập tab **Quản lý lệnh sản xuất**.
  2. Nhập một Số Lệnh sản xuất mới (ví dụ: `LSX-TEST-01`).
  3. Chọn máy chỉ định đang rảnh (ví dụ: `DD23` - máy này đang ở trạng thái Tạm dừng).
  4. Điền Mã sản phẩm, Tên sản phẩm, Công đoạn sản xuất, Số lượng kế hoạch.
  5. Bấm **LƯU LỆNH SX**.
* **Kết quả mong đợi:**
  - Hệ thống báo lưu lệnh thành công.
  - Lệnh mới được tạo với trạng thái **Đang thực thi** (`running`) do máy `DD23` đang rảnh.
  - Trên trang **Tổng quan**, thẻ máy `DD23` cập nhật ngay thông tin Lệnh `LSX-TEST-01`, sản lượng thực tế bắt đầu từ 0.

---

## 2. Tự động xếp hàng Lệnh sản xuất mới khi máy bận (Auto-Queuing)
* **Mục đích:** Đảm bảo lệnh mới tạo cho một máy đang bận sẽ tự động đưa vào hàng chờ (`pending`) thay vì ghi đè lệnh đang chạy.
* **Các bước thực hiện:**
  1. Chọn một máy đang bận chạy lệnh khác (ví dụ máy `DD26` - mId = 2 đang chạy lệnh `LSX-20260702-01`).
  2. Nhập thông tin tạo Lệnh mới (ví dụ: `LSX-TEST-02`) gán cho máy `DD26`.
  3. Bấm **LƯU LỆNH SX**.
* **Kết quả mong đợi:**
  - Hệ thống lưu lệnh thành công.
  - Lệnh `LSX-TEST-02` được tạo với trạng thái **Chờ chạy** (`pending`).
  - Trên trang **Tổng quan**, máy `DD26` vẫn hiển thị lệnh `LSX-20260702-01` đang chạy bình thường.
  - Trong bảng **Danh sách lệnh sản xuất**, lệnh `LSX-TEST-02` hiển thị nút hành động **Chạy**.

---

## 3. Kích hoạt thủ công Lệnh đang chờ (Start/Activate Pending Order)
* **Mục đích:** Xác minh người dùng có thể kích hoạt chạy lệnh đang chờ, đồng thời lệnh đang chạy trước đó sẽ tự động tạm dừng.
* **Các bước thực hiện:**
  1. Tìm lệnh `LSX-TEST-02` (`pending` trên máy `DD26`) trong bảng danh sách.
  2. Bấm nút **Chạy** ở cột Thao tác.
  3. Xác nhận trên hộp thoại cảnh báo của trình duyệt.
* **Kết quả mong đợi:**
  - Hệ thống báo kích hoạt thành công.
  - Lệnh `LSX-TEST-02` chuyển sang trạng thái **Đang thực thi** (`running`).
  - Lệnh cũ `LSX-20260702-01` tự động chuyển về trạng thái **Chờ chạy** (`pending`).
  - Thẻ máy `DD26` trên trang **Tổng quan** đổi sang hiển thị thông tin Lệnh `LSX-TEST-02`.

---

## 4. Hủy Lệnh sản xuất đang chạy (Cancel Running Order)
* **Mục đích:** Xác minh việc dừng và hủy lệnh sản xuất giữa chừng để chốt sản lượng thực tế.
* **Các bước thực hiện:**
  1. Tìm lệnh `LSX-TEST-02` (`running`) trong bảng danh sách.
  2. Bấm nút **Hủy** ở cột Thao tác.
  3. Xác nhận trên hộp thoại cảnh báo.
* **Kết quả mong đợi:**
  - Lệnh chuyển trạng thái sang **Đã hủy** (`cancelled`).
  - Số lượng thực tế tại thời điểm hủy được khóa lại và không thể tăng thêm.
  - Nút **Hủy** biến mất khỏi cột Thao tác của lệnh này.

---

## 5. Kế thừa sản lượng từ Lệnh bị hủy (Inheritance - Same Order No)
* **Mục đích:** Đảm bảo khi tạo lại lệnh trùng mã với lệnh đã hủy, hệ thống tự động kế thừa thông tin và tính toán sản lượng còn lại.
* **Các bước thực hiện:**
  1. Tại form Thiết lập, nhập Số Lệnh trùng khớp với lệnh đã hủy (ví dụ: `LSX-TEST-02`).
  2. Nhấp chuột ra ngoài hoặc nhấn Tab để kích hoạt bộ bắt sự kiện.
* **Kết quả mong đợi:**
  - Hệ thống hiển thị hộp thông báo gợi ý màu xanh lá cây: *"Phát hiện lệnh cũ bị hủy. Sản lượng còn lại: [Số lượng kế hoạch gốc - Sản lượng thực tế đã đạt]..."*.
  - Các ô Mã sản phẩm, Tên sản phẩm, Công đoạn tự động điền giống lệnh cũ.
  - Ô Số lượng kế hoạch tự động điền sản lượng còn thiếu (người dùng vẫn có thể điều chỉnh tùy ý).

---

## 6. Kiểm tra phiên bản tự tăng khi kế thừa (Auto-Incrementing Version)
* **Mục đích:** Xác minh database lưu trữ đúng thuộc tính Version để tách biệt các lệnh cùng mã chạy ở các thời điểm hoặc các máy khác nhau (Tương tự ca máy `RV14` gán lệnh `LSX-20260727-01` [Version 2] kế thừa từ máy `RV24` chạy lệnh `LSX-20260727-01` [Version 1]).
* **Các bước thực hiện:**
  1. Tiếp tục lưu Lệnh kế thừa `LSX-TEST-02` đã thiết lập ở bước 5.
  2. Kiểm tra dữ liệu trong bảng `ProductionOrders` của MySQL hoặc kiểm tra chi tiết lệnh.
* **Kết quả mong đợi:**
  - Lệnh cũ bị hủy gốc có `Version = 1`.
  - Lệnh kế thừa mới tạo thành công có `Version = 2`.
  - Cả hai bản ghi đều hiển thị độc lập trong danh sách lệnh.

---

## 7. Lọc Danh sách lệnh sản xuất theo các trạng thái mới (Status Filter Validation)
* **Mục đích:** Xác định bộ lọc trạng thái hoạt động chính xác cho cả hai trạng thái "Tạm dừng" và "Đã hủy" mới thêm vào.
* **Các bước thực hiện:**
  1. Di chuyển xuống bảng danh sách Lệnh sản xuất.
  2. Tại dropdown lọc trạng thái, chọn **Tạm dừng**.
  3. Chọn tiếp trạng thái **Đã hủy**.
* **Kết quả mong đợi:**
  - Khi chọn **Tạm dừng**, bảng chỉ hiển thị các lệnh có status `'stopped'` hoặc `'pending'`.
  - Khi chọn **Đã hủy**, bảng chỉ hiển thị duy nhất các lệnh có status `'cancelled'`.

---

## 8. Phân trang danh sách Lệnh sản xuất (Pagination Validation)
* **Mục đích:** Đảm bảo thanh phân trang chia trang chính xác và tự động reset trang khi lọc/tìm kiếm.
* **Các bước thực hiện:**
  1. Tạo thêm lệnh để danh sách vượt quá 8 lệnh (kích thước trang).
  2. Bấm nút số `2` trên thanh phân trang dưới chân bảng.
  3. Gõ từ khóa tìm kiếm vào ô tìm kiếm hoặc thay đổi bộ lọc trạng thái.
* **Kết quả mong đợi:**
  - Bảng chỉ hiển thị tối đa 8 lệnh trên Trang 1.
  - Bấm trang 2 hiển thị các lệnh tiếp theo.
  - Khi gõ tìm kiếm hoặc thay đổi bộ lọc, thanh phân trang tự động đưa chỉ mục trang hiện tại về Trang 1 để tránh lỗi hiển thị rỗng.

---

## 9. Thứ tự ưu tiên hiển thị lệnh trên trang Tổng quan (Card Display Priority)
* **Mục đích:** Xác minh thẻ thiết bị luôn hiển thị lệnh hoạt động tối ưu nhất theo nghiệp vụ.
* **Các bước thực hiện:**
  1. Máy dập `DD02` (mId = 1) đang có lệnh hoàn thành `LSX-20260701-01` (`completed`).
  2. Tạo mới một lệnh chờ `pending` cho máy `DD02`.
  3. Kiểm tra thông tin hiển thị trên thẻ máy `DD02` ở trang **Tổng quan**.
* **Kết quả mong đợi:**
  - Thẻ máy `DD02` phải hiển thị lệnh hoàn thành `LSX-20260701-01` và trạng thái `Đạt kế hoạch - Dừng SX` thay vì bị đè bởi lệnh đang chờ (sản lượng bằng 0).
  - Chỉ khi nào lệnh chờ được kích hoạt **Chạy** (`running`), thẻ máy mới chuyển sang hiển thị lệnh mới.

---

## 10. Ràng buộc máy chỉ định hợp lệ khi thiết lập (Validation - Non-existent Machine)
* **Mục đích:** Ngăn chặn việc nhập thủ công một mã máy không có thực trong cơ xưởng sản xuất.
* **Các bước thực hiện:**
  1. Tại ô Máy chỉ định, nhập tay một mã máy không tồn tại (ví dụ: `MAY-AO-99`).
  2. Điền đầy đủ thông tin bắt buộc còn lại.
  3. Bấm **LƯU LỆNH SX**.
* **Kết quả mong đợi:**
  - Hệ thống kiểm tra và hiển thị thông báo lỗi: Máy chỉ định không tồn tại trong hệ thống thiết bị.
  - Lệnh không được phép lưu vào cơ sở dữ liệu.
