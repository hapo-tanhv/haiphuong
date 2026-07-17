# Tài Liệu Bàn Giao & Walkthrough: Cải Tiến Giao Diện & Tách Biệt Nhóm Thiết Bị (HaiPhuong)

Tài liệu này tổng hợp lại toàn bộ các công việc chỉnh sửa theo yêu cầu mới nhất của khách hàng nhằm tách biệt "Máy đấm vít" và "Máy ren vít", tối ưu hóa OEE hệ thống, và đồng bộ chỉ số chi tiết máy.

---

## 1. Các Thay Đổi Đã Thực Hiện

### Sidebar & Điều hướng (`_Sidebar.cshtml`, `navigation.js`, `state.js`, `machine.js`)
* **Menu Dropdown "Máy vít":**
  - Trong [_Sidebar.cshtml](file:///c:/Users/case%20046/source/repos/HaiPhuong/HaiPhuong/Views/Home/_Sidebar.cshtml), mục "Máy vít" đơn lẻ đã được chuyển đổi thành cấu trúc dropdown menu sử dụng các class có sẵn `.nav-item-parent`, `.expand-arrow`, và `.sidebar-submenu`.
  - Tách thành 2 mục con: **"Máy đấm vít"** (`data-tab="overview-heading"`) và **"Máy ren vít"** (`data-tab="overview-threading"`).
* **Định tuyến & Trạng thái hoạt động (`navigation.js`):**
  - Cấu hình bắt sự kiện click trên `.nav-dropdown-toggle` để đóng/mở submenu mượt mà bằng cách toggle class `.expanded`.
  - Hỗ trợ thiết lập `state.overviewType = 'heading'` và `state.overviewType = 'threading'` để lọc danh sách máy tương ứng trên Grid.
  - Thiết lập máy mặc định khi mở tab: Máy `11` cho máy đấm, máy `16` cho máy ren.
  - Tự động mở rộng (expand) dropdown menu nếu người dùng tải lại trang hoặc đang ở phân hệ máy đấm/ren vít.
* **Tiêu đề Trang động (`state.js`):**
  - Thêm dịch thuật đa ngôn ngữ vi/en cho hai trang mới: **TỔNG QUAN MÁY ĐẤM VÍT** và **TỔNG QUAN MÁY CÁN REN VÍT**.

### Card Hiệu suất toàn hệ thống (`_Overview.cshtml`, `overview.js`)
* **Tinh giản thông tin:** Loại bỏ hoàn toàn 3 khối hiển thị tĩnh gồm: **Sản lượng ngày**, **Sản lượng thực tế**, và **Tổng lệnh sản xuất** khỏi OEE panel. Giao diện giờ đây chỉ tập trung vào các chỉ số thời gian thực tế.
* **Thời gian trung bình trên thiết bị:**
  - Chuyển đổi các thông số: **Thời gian chạy thử**, **Thời gian sản xuất**, và **Thời gian máy chạy** từ dạng tổng cộng dồn sang dạng **trung bình trên mỗi thiết bị** (bằng tổng thời gian chia cho tổng số máy hoạt động thuộc phân hệ đó: `activeMachines.length`).
  - Cập nhật nhãn ngôn ngữ sang dạng **(TB)** trong [vi.js](file:///c:/Users/case%20046/source/repos/HaiPhuong/HaiPhuong/lang/vi.js) và **AVG** trong [en.js](file:///c:/Users/case%20046/source/repos/HaiPhuong/HaiPhuong/lang/en.js).

### Card Sản lượng thực tế theo thời gian (`_Overview.cshtml`)
* Loại bỏ phần box phụ hiển thị **"Hiệu suất sản lượng (TB)"** nằm dưới chân biểu đồ xu hướng. Giữ lại box **"Hiệu suất thời gian (TB)"** và để nó tự động co giãn chiếm trọn chiều rộng của hàng.

### Card Thông tin từng máy ngoài Tổng quan (`overview.js`)
* **Chỉ số 6 (Thời gian sản xuất / Thời gian máy chạy):** 
  - Đã tính toán thêm tỷ lệ phần trăm hiệu suất sản xuất chính thức (`prodRatio`).
  - Thêm hiển thị tỷ lệ phần trăm kế bên giá trị thời gian và thêm thanh tiến trình (progress bar) trực quan giống hệt định dạng của các Chỉ số 4 và 5.

### Trang Chi tiết thiết bị (`_MachineDetail.cshtml`, `machine.js`)
* **Đồng bộ 6 thông số THỐNG KÊ THEO NGÀY:**
  - Tái cấu trúc cấu trúc HTML và các ID liên kết trong [_MachineDetail.cshtml](file:///c:/Users/case%20046/source/repos/HaiPhuong/HaiPhuong/Views/Home/_MachineDetail.cshtml) để chuyển đổi từ các thống kê cũ sang **6 thông số chuẩn hóa** tương thích hoàn toàn với 6 chỉ số ngoài trang chủ Tổng quan:
    1. **Sản lượng ngày:** (`strokes`)
    2. **Sản lượng thực tế / Lệnh sản xuất:** (`strokes` / `totalOrder` với % tiến độ đơn hàng)
    3. **Thời gian máy chạy / Thời gian ca:** (`runtime` / `runtimeMax` với % hiệu suất thời gian)
    4. **Thời gian chạy thử / Thời gian máy chạy:** (`trialTime` / `runtime` với % chạy thử)
    5. **Thời gian sản xuất / Thời gian máy chạy:** (`productionTime` / `runtime` với % sản xuất thực tế)
    6. **Thời gian còn lại ước tính:** (`estTimeStr` định dạng thời lượng `hh:mm:ss`)

### Hỗ trợ APIs Backend (`ApiController.cs`, `alerts.js`, `history.js`)
* **Phân loại Database:** Lọc động `MachineTypeCode` trong API `GetMachines` trả về đúng loại máy đột dập (`stamping`), máy đấm vít (`heading`), và máy cán ren (`threading`).
* **Hỗ trợ Báo cáo & Lịch sử:**
  - Cập nhật các bộ lọc báo cáo và API lịch sử nhận diện chính xác các mã nhóm `all_heading` và `all_threading`.
  - Cập nhật hiển thị tên loại thiết bị tương ứng trong cảnh báo tự động (`alerts.js`) và nhật ký lịch sử (`history.js`).

### Sửa lỗi runtime & Sửa lỗi hiển thị danh sách thiết bị (Bug Fixes)
* **Sửa lỗi whitespace padding từ DB khiến máy đấm và máy ren biến mất:**
  - Cột `MachineTypeCode` trong database có định dạng `CHAR(x)` (hoặc có chứa khoảng trắng thừa ở cuối), dẫn đến chuỗi trả về từ MySQL là `"SCREW_HEADING       "`.
  - Điều này làm sai lệch phép so sánh trực tiếp dạng `"SCREW_HEADING" == typeStr` khiến API Controller tự động gán nhãn loại thiết bị về mặc định là `"screw"`. Vì vậy trên Frontend không thể tìm thấy máy nào có type tương ứng với `"heading"` và `"threading"`.
  - **Khắc phục:** Thêm phương thức `.Trim()` vào tất cả các điểm đọc `MachineTypeCode` trong `ApiController.cs` và build lại project để loại bỏ hoàn toàn khoảng trắng thừa.
* **Nâng cấp thuật toán sắp xếp mã máy alphanumeric:**
  - Thay thế hàm sắp xếp cũ dựa vào `parseInt` (vốn sẽ lỗi khi mã máy chuyển từ dạng số `"01"`, `"02"` sang dạng chuỗi `"DV09"`, `"RV24"`).
  - Sử dụng hàm chuẩn hóa Javascript `a.localeCompare(b, undefined, {numeric: true, sensitivity: 'base'})` tại tất cả các điểm sắp xếp mã thiết bị trên Grid, Dropdown chọn máy của Đơn hàng và trang Cấu hình.
* **Sửa lỗi `Cannot read properties of undefined (reading 'toUpperCase')` (`machine.js`):** 
  - Khắc phục lỗi khi tải danh sách cảnh báo liên quan của máy trong trang chi tiết. Nguyên nhân do cảnh báo thực tế tải về từ server không có trường tĩnh `.machine` (mà chỉ có `.machineId` và `.machineName`).
  - Cấu hình kiểm tra an toàn: Ưu tiên so khớp chính xác mã máy qua `a.machineId === machineId` và tự động fallback về substring matching với `a.machine` cho dữ liệu giả lập.
* **Sửa lỗi tương tự trong bộ lọc tìm kiếm cảnh báo (`alerts.js`):**
  - Phòng ngừa lỗi crash tương tự khi người dùng tìm kiếm cảnh báo bằng cách tự động sinh chuỗi so khớp an toàn `a.machine || ...` từ loại máy và mã máy.

---

## 2. Cách Hướng Dẫn Kiểm Thử (Verification Steps)

1. **Kiểm tra Sidebar:**
   * Click vào mục **Máy vít** -> Menu phải mở rộng ra hiển thị 2 dòng con **Máy đấm vít** và **Máy ren vít**.
   * Click vào từng mục con -> Tiêu đề trang phải thay đổi tương ứng, Grid phải lọc đúng danh sách máy của phân hệ đó (Máy đấm đầu mã ĐB/DV từ 11 đến 15; Máy cán ren mã RV từ 16 đến 20).
2. **Kiểm tra OEE Panel (Hiệu suất toàn hệ thống):**
   - Không còn thấy hiển thị các dòng Sản lượng ngày, thực tế, hay tổng lệnh dập.
   - Trị số thời gian phải nhỏ đi đáng kể do đã chia trung bình cho tổng số máy hoạt động.
3. **Kiểm tra đồ thị:**
   - Dưới đồ thị xu hướng chỉ còn duy nhất 1 hộp màu tối hiển thị "HIỆU SUẤT THỜI GIAN (TB)".
4. **Kiểm tra Chỉ số 6 trên Card máy (Dashboard):**
   - Chỉ số 6 bây giờ hiển thị trị số % màu xanh lá cây và có thanh tiến trình phía dưới.
5. **Kiểm tra Chi tiết máy:**
   - Click vào bất cứ máy nào ở trang Máy dập, Máy đấm vít hay Máy ren vít.
   - Trang chi tiết máy phải hoạt động mượt mà, không xảy ra bất kỳ lỗi Console nào, đồng thời bảng cảnh báo bên dưới phải hiển thị chính xác các cảnh báo của máy được chọn.
