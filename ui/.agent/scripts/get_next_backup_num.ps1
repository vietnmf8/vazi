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
Write-Output "NEXT_NUMBER=$next"
