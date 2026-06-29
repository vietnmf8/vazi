$ErrorActionPreference = "Stop"
$baseUrl = "http://localhost:5000/api/v1/newsletter/subscribe"
$headers = @{"Content-Type"="application/json"}

Write-Output "`n--- TEST 1: Đăng ký mới (Main Case) ---"
$body1 = '{"email": "vietnm.oes@gmail.com"}'
$res1 = Invoke-RestMethod -Uri $baseUrl -Method Post -Headers $headers -Body $body1
Write-Output "Response: $($res1 | ConvertTo-Json -Compress)"

Write-Output "`n--- TEST 2: Đăng ký lại email cũ (Idempotent) ---"
$res2 = Invoke-RestMethod -Uri $baseUrl -Method Post -Headers $headers -Body $body1
Write-Output "Response: $($res2 | ConvertTo-Json -Compress)"

Write-Output "`n--- TEST 3: Data không hợp lệ (Edge Case) ---"
try {
    $bodyInvalid = '{"email": "not-an-email"}'
    $res3 = Invoke-RestMethod -Uri $baseUrl -Method Post -Headers $headers -Body $bodyInvalid
} catch {
    Write-Output "Error Caught: $($_.Exception.Response.StatusCode.value__) - $($_.ErrorDetails.Message)"
}

Write-Output "`n--- TEST 4: Rate Limiting (Edge Case) ---"
$body4 = '{"email": "test-rate-limit-final@gmail.com"}'
$rateHeaders = @{"Content-Type"="application/json"}
for ($i=1; $i -le 4; $i++) {
    try {
        $res4 = Invoke-RestMethod -Uri "http://192.168.11.100:5000/api/v1/newsletter/subscribe" -Method Post -Headers $rateHeaders -Body $body4
        Write-Output "Req $i Success: $($res4.success)"
    } catch {
        Write-Output "Req $i Error: $($_.Exception.Response.StatusCode.value__) - Quota exceeded"
    }
}
