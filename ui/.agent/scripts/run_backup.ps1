$next = 45
$targetDir = "D:\F8_K15_BTVN\BACKUP\BACKUP PROJECT\FASTVISA #$next"
New-Item -Path $targetDir -ItemType Directory | Out-Null

Robocopy "D:\F8_K15_BTVN\FASTVISA\ui" "$targetDir\ui" /E /XD "node_modules" ".next"
Robocopy "D:\F8_K15_BTVN\FASTVISA\api" "$targetDir\api" /E /XD "node_modules" ".next"
Robocopy "D:\F8_K15_BTVN\FASTVISA\admin" "$targetDir\admin" /E /XD "node_modules" ".next"
Robocopy "D:\F8_K15_BTVN\FASTVISA\business" "$targetDir\business" /E /XD "node_modules" ".next"

Exit 0
