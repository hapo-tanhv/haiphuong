-- Dữ liệu seed mẫu ban đầu cho hệ thống Hải Phương (MySQL)

USE `haiphuong_db`;

-- 1. Seed MachineTypes
INSERT INTO `MachineTypes` (`Id`, `Code`, `Name`, `Description`) VALUES
(1, 'STAMPING', 'Máy đột dập', 'Hệ thống máy dập định hình kim loại tấm'),
(2, 'SCREW_HEADING', 'Máy đấm đầu vít', 'Hệ thống máy đập đấm tạo đầu mũ vít'),
(3, 'SCREW_THREADING', 'Máy cán ren vít', 'Hệ thống máy cán tạo ren thân vít')
ON DUPLICATE KEY UPDATE `Name`=VALUES(`Name`), `Description`=VALUES(`Description`);

-- 2. Seed MachineTypeAttributes
INSERT INTO `MachineTypeAttributes` (`MachineTypeId`, `AttributeKey`, `DisplayName`, `Unit`, `DisplayOrder`, `InputType`) VALUES
-- Máy dập (1)
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
(1, 'ngay_su_dung', 'Ngày đưa vào sử dụng', NULL, 12, 'text'),

-- Máy đấm đầu vít (2)
(2, 'model', 'Model', NULL, 1, 'text'),
(2, 'hang_san_xuat', 'Hãng sản xuất', NULL, 2, 'text'),
(2, 'duong_kinh_day', 'Đường kính dây gia công', 'mm', 3, 'text'),
(2, 'chieu_dai_phoi', 'Chiều dài phôi gia công', 'mm', 4, 'text'),
(2, 'so_bua_dam', 'Số búa đấm', NULL, 5, 'text'),
(2, 'toc_do_may', 'Tốc độ máy', 'pcs/phút', 6, 'text'),
(2, 'cong_suat_motor', 'Công suất Motor', 'kW', 7, 'text'),
(2, 'ngay_su_dung', 'Ngày đưa vào sử dụng', NULL, 8, 'text'),

-- Máy cán ren vít (3)
(3, 'model', 'Model', NULL, 1, 'text'),
(3, 'hang_san_xuat', 'Hãng sản xuất', NULL, 2, 'text'),
(3, 'duong_kinh_phoi', 'Đường kính phôi gia công', 'mm', 3, 'text'),
(3, 'chieu_dai_phoi', 'Chiều dài phôi gia công', 'mm', 4, 'text'),
(3, 'kha_nang_gia_cong_ren', 'Khả năng gia công ren', NULL, 5, 'text'),
(3, 'chieu_dai_ren_max', 'Chiều dài ren tối đa', 'mm', 6, 'text'),
(3, 'toc_do_may', 'Tốc độ máy', 'pcs/phút', 7, 'text'),
(3, 'cong_suat_motor', 'Công suất Motor', 'kW', 8, 'text'),
(3, 'ngay_su_dung', 'Ngày đưa vào sử dụng', NULL, 9, 'text')
ON DUPLICATE KEY UPDATE `DisplayName`=VALUES(`DisplayName`), `Unit`=VALUES(`Unit`), `DisplayOrder`=VALUES(`DisplayOrder`), `InputType`=VALUES(`InputType`);

-- 3. Seed Machines
INSERT INTO `Machines` (`Id`, `MachineCode`, `Name`, `MachineTypeId`, `IsMonitored`, `Status`, `IpAddress`, `Port`, `AttributesJson`) VALUES
-- 10 Máy đột dập (Mã 01 - 10)
(1, '01', 'Máy dập 01', 1, 1, 'running', '192.168.1.101', 5002, '{"model": "NC1-110", "hang_san_xuat": "AIDA", "luc_dap": "110 Tons", "hanh_trinh_dau_truot": "180 mm", "die_height": "350 mm", "toc_do_dap": "55 spm", "kich_thuoc_ban_may": "1150x680 mm", "vi_tri_lap_dat": "Xưởng Dập A", "nguoi_phu_trach": "Nguyễn Văn Hùng"}'),
(2, '02', 'Máy dập 02', 1, 1, 'running', '192.168.1.102', 5002, '{"model": "NC1-110", "hang_san_xuat": "AIDA", "luc_dap": "110 Tons", "hanh_trinh_dau_truot": "180 mm", "die_height": "350 mm", "toc_do_dap": "50 spm", "kich_thuoc_ban_may": "1150x680 mm", "vi_tri_lap_dat": "Xưởng Dập A", "nguoi_phu_trach": "Nguyễn Văn Hùng"}'),
(3, '03', 'Máy dập 03', 1, 1, 'running', '192.168.1.103', 5002, '{"model": "NC1-150", "hang_san_xuat": "AIDA", "luc_dap": "150 Tons", "hanh_trinh_dau_truot": "200 mm", "die_height": "380 mm", "toc_do_dap": "45 spm", "kich_thuoc_ban_may": "1250x760 mm", "vi_tri_lap_dat": "Xưởng Dập A", "nguoi_phu_trach": "Phạm Minh Hoàng"}'),
(4, '04', 'Máy dập 04', 1, 1, 'running', '192.168.1.104', 5002, '{"model": "NC1-150", "hang_san_xuat": "AIDA", "luc_dap": "150 Tons", "hanh_trinh_dau_truot": "200 mm", "die_height": "380 mm", "toc_do_dap": "45 spm", "kich_thuoc_ban_may": "1250x760 mm", "vi_tri_lap_dat": "Xưởng Dập A", "nguoi_phu_trach": "Phạm Minh Hoàng"}'),
(5, '05', 'Máy dập 05', 1, 1, 'running', '192.168.1.105', 5002, '{"model": "NC1-80", "hang_san_xuat": "AIDA", "luc_dap": "80 Tons", "hanh_trinh_dau_truot": "150 mm", "die_height": "300 mm", "toc_do_dap": "65 spm", "kich_thuoc_ban_may": "1000x550 mm", "vi_tri_lap_dat": "Xưởng Dập B", "nguoi_phu_trach": "Lê Anh Tuấn"}'),
(6, '06', 'Máy dập 06', 1, 1, 'stopped', '192.168.1.106', 5002, '{"model": "NC1-80", "hang_san_xuat": "AIDA", "luc_dap": "80 Tons", "hanh_trinh_dau_truot": "150 mm", "die_height": "300 mm", "toc_do_dap": "60 spm", "kich_thuoc_ban_may": "1000x550 mm", "vi_tri_lap_dat": "Xưởng Dập B", "nguoi_phu_trach": "Lê Anh Tuấn"}'),
(7, '07', 'Máy dập 07', 1, 1, 'running', '192.168.1.107', 5002, '{"model": "NC1-200", "hang_san_xuat": "AIDA", "luc_dap": "200 Tons", "hanh_trinh_dau_truot": "220 mm", "die_height": "400 mm", "toc_do_dap": "40 spm", "kich_thuoc_ban_may": "1450x840 mm", "vi_tri_lap_dat": "Xưởng Dập B", "nguoi_phu_trach": "Đỗ Quốc Việt"}'),
(8, '08', 'Máy dập 08', 1, 1, 'running', '192.168.1.108', 5002, '{"model": "NC1-200", "hang_san_xuat": "AIDA", "luc_dap": "200 Tons", "hanh_trinh_dau_truot": "220 mm", "die_height": "400 mm", "toc_do_dap": "40 spm", "kich_thuoc_ban_may": "1450x840 mm", "vi_tri_lap_dat": "Xưởng Dập B", "nguoi_phu_trach": "Đỗ Quốc Việt"}'),
(9, '09', 'Máy dập 09', 1, 1, 'running', '192.168.1.109', 5002, '{"model": "NC1-110", "hang_san_xuat": "AIDA", "luc_dap": "110 Tons", "hanh_trinh_dau_truot": "180 mm", "die_height": "350 mm", "toc_do_dap": "55 spm", "kich_thuoc_ban_may": "1150x680 mm", "vi_tri_lap_dat": "Xưởng Dập B", "nguoi_phu_trach": "Nguyễn Văn Hùng"}'),
(10, '10', 'Máy dập 10', 1, 0, 'stopped', '192.168.1.110', 5002, '{"model": "NC1-80", "hang_san_xuat": "AIDA", "luc_dap": "80 Tons", "hanh_trinh_dau_truot": "150 mm", "die_height": "300 mm", "toc_do_dap": "60 spm", "kich_thuoc_ban_may": "1000x550 mm", "vi_tri_lap_dat": "Xưởng Dập B", "nguoi_phu_trach": "Lê Anh Tuấn"}'),

-- 5 Máy đấm đầu vít (Mã 11 - 15)
(11, '11', 'Máy đấm vít 11', 2, 1, 'running', '192.168.2.111', 5003, '{"model": "DV-Model-B", "hang_san_xuat": "HP-Machinery", "vi_tri_lap_dat": "Xưởng Đấm vít", "duong_kinh_day": "Ø2.0 ~ Ø6.0 mm", "chieu_dai_phoi": "8 ~ 80 mm", "loai_dau_vit": "Bake / Phillips", "so_bua_dam": "1K2B", "toc_do_may": "180.00 pcs/phút", "cong_suat_motor": "7.50 kW", "ngay_su_dung": "12/05/2025", "nguoi_phu_trach": "Trần Văn B", "ghi_chu": "Chuyên sản xuất vít gỗ"}'),
(12, '12', 'Máy đấm vít 12', 2, 1, 'running', '192.168.2.112', 5003, '{"model": "DV-Model-B", "hang_san_xuat": "HP-Machinery", "vi_tri_lap_dat": "Xưởng Đấm vít", "duong_kinh_day": "Ø2.0 ~ Ø6.0 mm", "chieu_dai_phoi": "8 ~ 80 mm", "loai_dau_vit": "Bake / Phillips", "so_bua_dam": "1K2B", "toc_do_may": "180.00 pcs/phút", "cong_suat_motor": "7.50 kW", "ngay_su_dung": "12/05/2025", "nguoi_phu_trach": "Trần Văn B"}'),
(13, '13', 'Máy đấm vít 13', 2, 1, 'stopped', '192.168.2.113', 5003, '{"model": "DV-Model-C", "hang_san_xuat": "HP-Machinery", "vi_tri_lap_dat": "Xưởng Đấm vít", "duong_kinh_day": "Ø3.0 ~ Ø8.0 mm", "chieu_dai_phoi": "10 ~ 100 mm", "loai_dau_vit": "Slotted / Bake", "so_bua_dam": "1K2B", "toc_do_may": "150.00 pcs/phút", "cong_suat_motor": "9.00 kW", "ngay_su_dung": "20/09/2025", "nguoi_phu_trach": "Lê Văn C"}'),
(14, '14', 'Máy đấm vít 14', 2, 1, 'running', '192.168.2.114', 5003, '{"model": "DV-Model-B", "hang_san_xuat": "HP-Machinery", "vi_tri_lap_dat": "Xưởng Đấm vít", "duong_kinh_day": "Ø2.0 ~ Ø6.0 mm", "chieu_dai_phoi": "8 ~ 80 mm", "loai_dau_vit": "Bake / Phillips", "so_bua_dam": "1K2B", "toc_do_may": "180.00 pcs/phút", "cong_suat_motor": "7.50 kW", "ngay_su_dung": "12/05/2025", "nguoi_phu_trach": "Trần Văn B"}'),
(15, '15', 'Máy đấm vít 15', 2, 1, 'running', '192.168.2.115', 5003, '{"model": "DV-Model-B", "hang_san_xuat": "HP-Machinery", "vi_tri_lap_dat": "Xưởng Đấm vít", "duong_kinh_day": "Ø2.0 ~ Ø6.0 mm", "chieu_dai_phoi": "8 ~ 80 mm", "loai_dau_vit": "Bake / Phillips", "so_bua_dam": "1K2B", "toc_do_may": "180.00 pcs/phút", "cong_suat_motor": "7.50 kW", "ngay_su_dung": "12/05/2025", "nguoi_phu_trach": "Trần Văn B"}'),

-- 5 Máy cán ren vít (Mã 16 - 20)
(16, '16', 'Máy cán ren 16', 3, 1, 'stopped', '192.168.3.116', 5004, '{"model": "RV-Model-A", "hang_san_xuat": "HP-Machinery", "vi_tri_lap_dat": "Xưởng Vít", "duong_kinh_phoi": "Ø2 ~ Ø8 mm", "chieu_dai_phoi": "10 ~ 80 mm", "kha_nang_gia_cong_ren": "M2 ~ M8", "chieu_dai_ren_max": "60 mm", "toc_do_may": "180 pcs/phút", "cong_suat_motor": "7.5 kW", "nguoi_phu_trach": "Nguyễn Văn A", "ghi_chu": "Máy hoạt động ổn định"}'),
(17, '17', 'Máy cán ren 17', 3, 1, 'running', '192.168.3.117', 5004, '{"model": "RV-Model-A", "hang_san_xuat": "HP-Machinery", "vi_tri_lap_dat": "Xưởng Vít", "duong_kinh_phoi": "Ø2 ~ Ø8 mm", "chieu_dai_phoi": "10 ~ 80 mm", "kha_nang_gia_cong_ren": "M2 ~ M8", "chieu_dai_ren_max": "60 mm", "toc_do_may": "180 pcs/phút", "cong_suat_motor": "7.5 kW", "nguoi_phu_trach": "Nguyễn Văn A"}'),
(18, '18', 'Máy cán ren 18', 3, 1, 'running', '192.168.3.118', 5004, '{"model": "RV-Model-A", "hang_san_xuat": "HP-Machinery", "vi_tri_lap_dat": "Xưởng Vít", "duong_kinh_phoi": "Ø2 ~ Ø8 mm", "chieu_dai_phoi": "10 ~ 80 mm", "kha_nang_gia_cong_ren": "M2 ~ M8", "chieu_dai_ren_max": "60 mm", "toc_do_may": "180 pcs/phút", "cong_suat_motor": "7.5 kW", "nguoi_phu_trach": "Nguyễn Văn A"}'),
(19, '19', 'Máy cán ren 19', 3, 1, 'running', '192.168.3.119', 5004, '{"model": "RV-Model-B", "hang_san_xuat": "HP-Machinery", "vi_tri_lap_dat": "Xưởng Vít", "duong_kinh_phoi": "Ø3 ~ Ø10 mm", "chieu_dai_phoi": "15 ~ 100 mm", "kha_nang_gia_cong_ren": "M3 ~ M10", "chieu_dai_ren_max": "80 mm", "toc_do_may": "150 pcs/phút", "cong_suat_motor": "9.0 kW", "nguoi_phu_trach": "Lê Hoàng Nam"}'),
(20, '20', 'Máy cán ren 20', 3, 0, 'stopped', '192.168.3.120', 5004, '{"model": "RV-Model-A", "hang_san_xuat": "HP-Machinery", "vi_tri_lap_dat": "Xưởng Vít", "duong_kinh_phoi": "Ø2 ~ Ø8 mm", "chieu_dai_phoi": "10 ~ 80 mm", "kha_nang_gia_cong_ren": "M2 ~ M8", "chieu_dai_ren_max": "60 mm", "toc_do_may": "180 pcs/phút", "cong_suat_motor": "7.5 kW", "nguoi_phu_trach": "Nguyễn Văn A"}')
ON DUPLICATE KEY UPDATE `Name`=VALUES(`Name`), `IsMonitored`=VALUES(`IsMonitored`), `Status`=VALUES(`Status`), `AttributesJson`=VALUES(`AttributesJson`);

-- 4. Seed ProductionOrders
INSERT INTO `ProductionOrders` (`Id`, `OrderNo`, `ProductCode`, `ProductName`, `TotalQuantity`, `Unit`, `Status`) VALUES
(1, 'LSX-20260709-01', 'V-WOOD-4X40', 'Vít gỗ đầu chìm 4x40mm', 15000, 'PCS', 'running'),
(2, 'LSX-20260709-02', 'V-SELF-5X20', 'Vít tự khoan Bake 5x20mm', 10000, 'PCS', 'running'),
(3, 'LSX-20260708-01', 'BL-M8X50', 'Bu lông lục giác M8x50mm', 8000, 'PCS', 'completed'),
(4, 'LSX-20260708-02', 'N-M8-NYLON', 'Đai ốc chống trôi M8', 20000, 'PCS', 'running')
ON DUPLICATE KEY UPDATE `ProductCode`=VALUES(`ProductCode`), `ProductName`=VALUES(`ProductName`), `TotalQuantity`=VALUES(`TotalQuantity`), `Status`=VALUES(`Status`);

-- 5. Seed MachineOrders (Liên kết máy - lệnh)
INSERT INTO `MachineOrders` (`MachineId`, `OrderId`, `TargetQuantity`, `ActualQuantity`, `CompletedAt`) VALUES
(1, 1, 5000, 1500, NULL),
(3, 1, 5000, 1500, NULL),
(11, 2, 5000, 2500, NULL),
(12, 2, 5000, 1800, NULL),
(6, 3, 2000, 2000, '2026-07-08 11:30:00'),
(2, 4, 10000, 1380, NULL)
ON DUPLICATE KEY UPDATE `TargetQuantity`=VALUES(`TargetQuantity`), `ActualQuantity`=VALUES(`ActualQuantity`);

-- 6. Seed MachineShifts
INSERT INTO `MachineShifts` (`MachineId`, `ShiftType`, `StartTime`, `EndTime`, `EffectiveDate`) VALUES
(1, '8h', '08:00:00', '16:00:00', '2026-07-01'),
(2, '12h', '07:00:00', '19:00:00', '2026-07-01'),
(3, '8h', '08:00:00', '16:00:00', '2026-07-01'),
(4, '8h', '08:00:00', '16:00:00', '2026-07-01'),
(5, '8h', '08:00:00', '16:00:00', '2026-07-01'),
(6, '8h', '08:00:00', '16:00:00', '2026-07-01'),
(7, '16h', '06:00:00', '22:00:00', '2026-07-01'),
(8, '16h', '06:00:00', '22:00:00', '2026-07-01'),
(9, '8h', '08:00:00', '16:00:00', '2026-07-01'),
(11, '8h', '08:00:00', '16:00:00', '2026-07-01'),
(12, '12h', '07:00:00', '19:00:00', '2026-07-01'),
(13, '8h', '08:00:00', '16:00:00', '2026-07-01'),
(14, '8h', '08:00:00', '16:00:00', '2026-07-01'),
(15, '8h', '08:00:00', '16:00:00', '2026-07-01'),
(16, '8h', '08:00:00', '16:00:00', '2026-07-01'),
(17, '8h', '08:00:00', '16:00:00', '2026-07-01'),
(18, '8h', '08:00:00', '16:00:00', '2026-07-01'),
(19, '8h', '08:00:00', '16:00:00', '2026-07-01');

-- 7. Seed ProductionLogs
INSERT INTO `ProductionLogs` (`MachineId`, `OrderId`, `Timestamp`, `ActualStrokes`, `RunningSeconds`, `SetupSeconds`, `Status`) VALUES
(1, 1, '2026-07-09 08:30:00', 250, 3600, 200, 'running'),
(1, 1, '2026-07-09 09:30:00', 300, 3600, 100, 'running'),
(1, 1, '2026-07-09 10:30:00', 280, 3600, 150, 'running'),
(3, 1, '2026-07-09 08:30:00', 320, 3600, 100, 'running'),
(11, 2, '2026-07-09 09:00:00', 500, 3600, 120, 'running'),
(12, 2, '2026-07-09 09:00:00', 400, 3600, 150, 'running');

-- 8. Seed Alarms
INSERT INTO `Alarms` (`MachineId`, `OrderId`, `Code`, `Severity`, `Description`, `Timestamp`, `Status`) VALUES
(6, 3, 'MACHINE-STOPPED-ALERT', 'critical', 'Thiết bị máy dập đang dừng hoạt động bất thường (Trạng thái stopped). Yêu cầu kiểm tra kết nối điện.', '2026-07-08 11:30:00', 'resolved'),
(13, 2, 'MACHINE-STOPPED-ALERT', 'critical', 'Thiết bị máy đấm vít đang dừng hoạt động bất thường (Trạng thái stopped). Yêu cầu kiểm tra kết nối điện.', '2026-07-09 07:00:00', 'emergency'),
(16, 2, 'MACHINE-STOPPED-ALERT', 'critical', 'Thiết bị máy cán ren đang dừng hoạt động bất thường (Trạng thái stopped). Yêu cầu kiểm tra kết nối điện.', '2026-07-09 08:15:00', 'emergency');
