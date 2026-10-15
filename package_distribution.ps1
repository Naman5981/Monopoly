param()

$distFolder = "$PSScriptRoot\dist_package"
if (Test-Path $distFolder) {
    Remove-Item $distFolder -Recurse -Force
}
New-Item -ItemType Directory -Path $distFolder | Out-Null

Copy-Item "$PSScriptRoot\WorldTycoon.exe" $distFolder
Copy-Item "$PSScriptRoot\INSTRUCTIONS.txt" $distFolder
Copy-Item "$PSScriptRoot\run.bat" $distFolder

$zipDest = "$PSScriptRoot\WorldTycoon_Online_Game.zip"
if (Test-Path $zipDest) {
    Remove-Item $zipDest -Force
}

Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::CreateFromDirectory($distFolder, $zipDest, [System.IO.Compression.CompressionLevel]::Optimal, $false)

Remove-Item $distFolder -Recurse -Force

$item = Get-Item $zipDest
Write-Host "DISTRIBUTION PACKAGE CREATED:" -ForegroundColor Green
Write-Host "File: $($item.FullName)" -ForegroundColor Yellow
Write-Host "Size: $($item.Length) bytes ($([Math]::Round($item.Length / 1KB, 2)) KB)" -ForegroundColor Cyan
