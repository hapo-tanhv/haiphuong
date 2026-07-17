# Query database to check machines and their types
$connStr = "Server=localhost;Port=3306;Database=haiphuong_db;Uid=root;Pwd=101101;AllowUserVariables=True"
try {
    [System.Reflection.Assembly]::LoadWithPartialName("MySql.Data") | Out-Null
    $conn = New-Object MySql.Data.MySqlClient.MySqlConnection($connStr)
    $conn.Open()
    
    $cmd = $conn.CreateCommand()
    $cmd.CommandText = "SELECT m.Id, m.MachineCode, m.Name, m.MachineTypeId, mt.Code as MachineTypeCode FROM Machines m JOIN MachineTypes mt ON m.MachineTypeId = mt.Id ORDER BY m.Id"
    $adapter = New-Object MySql.Data.MySqlClient.MySqlDataAdapter($cmd)
    $dt = New-Object System.Data.DataTable
    $adapter.Fill($dt) | Out-Null
    
    $dt | Format-Table -AutoSize
    
    $conn.Close()
} catch {
    Write-Error $_.Exception.Message
}
