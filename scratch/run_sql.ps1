try {
    Add-Type -Path "c:\Users\case 046\source\repos\HaiPhuong\packages\MySql.Data.dll"
} catch {
    Write-Host "Failed to load MySql.Data.dll directly, trying GAC or default path..."
    try {
        [System.Reflection.Assembly]::LoadWithPartialName("MySql.Data") | Out-Null
    } catch {
        Write-Error "Cannot load MySQL assemblies."
        exit 1
    }
}

$connString = "server=localhost;port=3306;database=haiphuong_db;uid=root;password=101101;charset=utf8mb4"
$conn = New-Object MySql.Data.MySqlClient.MySqlConnection($connString)

try {
    $conn.Open()
    Write-Host "Connected to MySQL successfully."

    # 1. Clear old data
    $cmd = New-Object MySql.Data.MySqlClient.MySqlCommand("DELETE FROM MachineTypeAttributes", $conn)
    $cmd.ExecuteNonQuery() | Out-Null
    Write-Host "Cleared old MachineTypeAttributes records."

    # 2. Insert Press attributes (TypeId = 1)
    $pressSql = "
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
        (1, 'khoang_ho_hong_may', 'Khoảng hở họng máy', 'mm', 11, 'text');
    "
    $cmd.CommandText = $pressSql
    $cmd.ExecuteNonQuery() | Out-Null
    Write-Host "Inserted Stamping attributes."

    # 3. Insert Threading attributes (TypeId = 3)
    $threadSql = "
        INSERT INTO MachineTypeAttributes (MachineTypeId, AttributeKey, DisplayName, Unit, DisplayOrder, InputType) VALUES
        (3, 'model', 'Model', NULL, 1, 'text'),
        (3, 'hang_san_xuat', 'Hãng sản xuất', NULL, 2, 'text'),
        (3, 'vi_tri_lap_dat', 'Vị trí lắp đặt', NULL, 3, 'text'),
        (3, 'trang_thai', 'Trạng thái', NULL, 4, 'text'),
        (3, 'duong_kinh_phoi', 'Đường kính phôi gia công', 'mm', 5, 'text'),
        (3, 'chieu_dai_phoi', 'Chiều dài phôi gia công', 'mm', 6, 'text'),
        (3, 'kha_nang_gia_cong_ren', 'Khả năng gia công ren', NULL, 7, 'text'),
        (3, 'chieu_dai_ren_max', 'Chiều dài ren tối đa', 'mm', 8, 'text'),
        (3, 'toc_do_may', 'Tốc độ máy', 'pcs/phút', 9, 'text'),
        (3, 'cong_suat_motor', 'Công suất Motor', 'kW', 10, 'text'),
        (3, 'nguoi_phu_trach', 'Người phụ trách', NULL, 11, 'text'),
        (3, 'ghi_chu', 'Ghi chú', NULL, 12, 'text');
    "
    $cmd.CommandText = $threadSql
    $cmd.ExecuteNonQuery() | Out-Null
    Write-Host "Inserted Threading attributes."

    # 4. Insert Heading attributes (TypeId = 2)
    $headingSql = "
        INSERT INTO MachineTypeAttributes (MachineTypeId, AttributeKey, DisplayName, Unit, DisplayOrder, InputType) VALUES
        (2, 'model', 'Model', NULL, 1, 'text'),
        (2, 'hang_san_xuat', 'Hãng sản xuất', NULL, 2, 'text'),
        (2, 'vi_tri_lap_dat', 'Vị trí lắp đặt', NULL, 3, 'text'),
        (2, 'trang_thai', 'Trạng thái', NULL, 4, 'text'),
        (2, 'duong_kinh_day', 'Đường kính dây gia công', 'mm', 5, 'text'),
        (2, 'chieu_dai_phoi', 'Chiều dài phôi gia công', 'mm', 6, 'text'),
        (2, 'loai_dau_vit', 'Loại đầu vít gia công', NULL, 7, 'text'),
        (2, 'so_bua_dam', 'Số búa đấm', NULL, 8, 'text'),
        (2, 'toc_do_may', 'Tốc độ máy', 'pcs/phút', 9, 'text'),
        (2, 'cong_suat_motor', 'Công suất Motor', 'kW', 10, 'text'),
        (2, 'ngay_su_dung', 'Ngày đưa vào sử dụng', NULL, 11, 'text'),
        (2, 'nguoi_phu_trach', 'Người phụ trách', NULL, 12, 'text'),
        (2, 'ghi_chu', 'Ghi chú', NULL, 13, 'text');
    "
    $cmd.CommandText = $headingSql
    $cmd.ExecuteNonQuery() | Out-Null
    Write-Host "Inserted Heading attributes."

    Write-Host "Database attributes seed completed successfully!"
} catch {
    Write-Error $_.Exception.Message
} finally {
    if ($conn.State -eq "Open") {
        $conn.Close()
    }
}
