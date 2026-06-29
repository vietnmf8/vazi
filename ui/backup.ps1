$root = "D:\F8_K15_BTVN\BACKUP\BACKUP PROJECT"
if (!(Test-Path $root)) { New-Item -Path $root -ItemType Directory | Out-Null }
$dirs = Get-ChildItem -Path $root -Directory -Filter "FASTVISA #*"
$max = 0
foreach ($d in $dirs) {
  if ($d.Name -match "FASTVISA #(\d+)") {
    $num = [int]$Matches[1]
    if ($num -gt $max) { $max = $num }
  }
}
$next = $max + 1
$target = "$root\FASTVISA #$next"
New-Item -Path $target -ItemType Directory | Out-Null

Write-Output "Bắt đầu sao lưu vào thư mục: $target"

Robocopy "D:\F8_K15_BTVN\FASTVISA\ui" "$target\ui" /E /XD "node_modules" ".next" | Out-Null
Robocopy "D:\F8_K15_BTVN\FASTVISA\api" "$target\api" /E /XD "node_modules" ".next" | Out-Null
Robocopy "D:\F8_K15_BTVN\FASTVISA\admin" "$target\admin" /E /XD "node_modules" ".next" | Out-Null
Robocopy "D:\F8_K15_BTVN\FASTVISA\business" "$target\business" /E /XD "node_modules" ".next" | Out-Null
Robocopy "D:\F8_K15_BTVN\FASTVISA\docs" "$target\docs" /E /XD "node_modules" ".next" | Out-Null

Write-Output "Tiến trình sao lưu đã hoàn tất!"
