try {
    Add-Type -Path "c:\Users\case 046\source\repos\HaiPhuong\packages\MySql.Data.dll"
} catch {
    try {
        [System.Reflection.Assembly]::LoadWithPartialName("MySql.Data") | Out-Null
    } catch {
        Write-Error "Cannot load MySQL assemblies."
        exit 1
    }
}

$sqlText = [System.IO.File]::ReadAllText("c:\Users\case 046\source\repos\HaiPhuong\scratch\query.sql", [System.Text.Encoding]::UTF8)

$connString = "server=localhost;port=3306;database=haiphuong_db;uid=root;password=101101;charset=utf8mb4"
$conn = New-Object MySql.Data.MySqlClient.MySqlConnection($connString)

try {
    $conn.Open()
    Write-Host "Connected to MySQL successfully."

    $cmd = New-Object MySql.Data.MySqlClient.MySqlCommand($sqlText, $conn)
    $cmd.ExecuteNonQuery() | Out-Null
    Write-Host "Executed query.sql successfully with UTF-8 encoding!"
} catch {
    Write-Error $_.Exception.Message
} finally {
    if ($conn.State -eq "Open") {
        $conn.Close()
    }
}
