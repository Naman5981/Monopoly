param()

$csc = "C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe"
$outExe = "E:\study-material\Monopoly\WorldTycoon.exe"
$src = "E:\study-material\Monopoly\Launcher.cs"
$zip = "E:\study-material\Monopoly\world-tycoon.zip"

Write-Host "Compiling standalone executable: $outExe ..." -ForegroundColor Cyan

$args = @(
    "/target:exe",
    "/out:$outExe",
    "/resource:$zip,WorldTycoon.assets.zip",
    "/reference:System.IO.Compression.dll,System.IO.Compression.FileSystem.dll",
    "/optimize+",
    "/platform:anycpu",
    $src
)

$proc = Start-Process -FilePath $csc -ArgumentList $args -NoNewWindow -Wait -PassThru

if ($proc.ExitCode -eq 0 -and (Test-Path $outExe)) {
    $item = Get-Item $outExe
    Write-Host "BUILD SUCCESSFUL!" -ForegroundColor Green
    Write-Host "Output Executable: $($item.FullName) ($($item.Length) bytes / $([Math]::Round($item.Length / 1KB, 2)) KB)" -ForegroundColor Yellow
} else {
    Write-Host "BUILD FAILED! Exit Code: $($proc.ExitCode)" -ForegroundColor Red
}
