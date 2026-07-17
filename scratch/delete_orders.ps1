[System.Reflection.Assembly]::LoadFrom("c:\Users\case 046\source\repos\HaiPhuong\HaiPhuong\bin\MySql.Data.dll") | Out-Null
$connString = "server=localhost;port=3306;database=haiphuong_db;uid=root;password=101101;charset=utf8mb4"
$conn = New-Object MySql.Data.MySqlClient.MySqlConnection($connString)
try {
    $conn.Open()
    
    # Enable foreign key checks by default but we can check if it deletes successfully
    $cmd = New-Object MySql.Data.MySqlClient.MySqlCommand
    $cmd.Connection = $conn
    $cmd.CommandText = "DELETE FROM ProductionOrders WHERE OrderNo IN ('aa', 'a')"
    $rowsAffected = $cmd.ExecuteNonQuery()
    
    Write-Output "SUCCESS: Deleted $rowsAffected rows."
} catch {
    Write-Error $_.Exception.Message
} finally {
    if ($conn.State -eq [System.Data.ConnectionState]::Open) {
        $conn.Close()
    }
}
