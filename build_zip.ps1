param()

$sourceDir = "$PSScriptRoot\world-tycoon"
$zipPath = "$PSScriptRoot\world-tycoon.zip"

if (Test-Path $zipPath) {
    Remove-Item $zipPath -Force
}

Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::CreateFromDirectory($sourceDir, $zipPath, [System.IO.Compression.CompressionLevel]::Optimal, $false)

$item = Get-Item $zipPath
Write-Host "ZIP Created: $($item.FullName) ($($item.Length) bytes)"
