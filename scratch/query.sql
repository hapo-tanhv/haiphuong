DELETE FROM MachineTypeAttributes;

-- 1. Máy đột dập (TypeId = 1)
INSERT INTO MachineTypeAttributes (MachineTypeId, AttributeKey, DisplayName, Unit, DisplayOrder, InputType) VALUES
(1, 'hang_san_xuat', 'Hãng sản xuất', NULL, 1, 'text'),
(1, 'model', 'Model', NULL, 2, 'text'),
(1, 'luc_dap', 'Lực dập', 'Tons', 3, 'text'),
(1, 'hanh_trinh_dau_truot', 'Hành trình đầu trượt', 'mm', 4, 'text'),
(1, 'die_height', 'DIE HEIGHT', 'mm', 5, 'text'),
(1, 'toc_do_dap', 'Tốc độ dập', 'spm', 6, 'text'),
(1, 'dieu_chinh_dau_truot', 'Điều chỉnh đầu trượt', 'mm', 7, 'text'),
(1, 'kich_thuoc_dau_truot', 'Kích thước đầu trượt', 'mm', 8, 'text'),
(1, 'kich_thuoc_ban_may', 'Kích thước bàn máy', 'mm', 9, 'text'),
(1, 'chieu_day_ban_may', 'Chiều dày bàn máy', 'mm', 10, 'text'),
(1, 'khoang_ho_hong_may', 'Khoảng hở họng máy', 'mm', 11, 'text'),
(1, 'ngay_su_dung', 'Ngày đưa vào sử dụng', NULL, 12, 'text');

-- 2. Máy đấm vít (TypeId = 2)
INSERT INTO MachineTypeAttributes (MachineTypeId, AttributeKey, DisplayName, Unit, DisplayOrder, InputType) VALUES
(2, 'model', 'Model', NULL, 1, 'text'),
(2, 'hang_san_xuat', 'Hãng sản xuất', NULL, 2, 'text'),
(2, 'duong_kinh_day', 'Đường kính dây gia công', 'mm', 3, 'text'),
(2, 'chieu_dai_phoi', 'Chiều dài phôi gia công', 'mm', 4, 'text'),
(2, 'so_bua_dam', 'Số búa đấm', NULL, 5, 'text'),
(2, 'toc_do_may', 'Tốc độ máy', 'pcs/phút', 6, 'text'),
(2, 'cong_suat_motor', 'Công suất Motor', 'kW', 7, 'text'),
(2, 'ngay_su_dung', 'Ngày đưa vào sử dụng', NULL, 8, 'text');

-- 3. Máy ren vít (TypeId = 3)
INSERT INTO MachineTypeAttributes (MachineTypeId, AttributeKey, DisplayName, Unit, DisplayOrder, InputType) VALUES
(3, 'model', 'Model', NULL, 1, 'text'),
(3, 'hang_san_xuat', 'Hãng sản xuất', NULL, 2, 'text'),
(3, 'duong_kinh_phoi', 'Đường kính phôi gia công', 'mm', 3, 'text'),
(3, 'chieu_dai_phoi', 'Chiều dài phôi gia công', 'mm', 4, 'text'),
(3, 'kha_nang_gia_cong_ren', 'Khả năng gia công ren', NULL, 5, 'text'),
(3, 'chieu_dai_ren_max', 'Chiều dài ren tối đa', 'mm', 6, 'text'),
(3, 'toc_do_may', 'Tốc độ máy', 'pcs/phút', 7, 'text'),
(3, 'cong_suat_motor', 'Công suất Motor', 'kW', 8, 'text'),
(3, 'ngay_su_dung', 'Ngày đưa vào sử dụng', NULL, 9, 'text');
