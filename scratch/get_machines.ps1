try {
    $response = Invoke-RestMethod -Uri "https://diane-fuzzy-filter-verified.trycloudflare.com/Api/GetMachines" -Method Get
    Write-Output "Success: $($response.success)"
    Write-Output "Count: $($response.data.Count)"
    
    # Show first item of each type to inspect properties
    $stamping = $response.data | Where-Object { $_.type -eq "stamping" } | Select-Object -First 1
    $heading = $response.data | Where-Object { $_.type -eq "heading" } | Select-Object -First 1
    $threading = $response.data | Where-Object { $_.type -eq "threading" } | Select-Object -First 1
    
    Write-Output "`n--- Stamping Sample ---"
    $stamping | Format-List *
    
    Write-Output "`n--- Heading Sample ---"
    $heading | Format-List *
    
    Write-Output "`n--- Threading Sample ---"
    $threading | Format-List *
} catch {
    Write-Error $_.Exception.Message
}
