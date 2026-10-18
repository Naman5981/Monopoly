param()

$macScript = "$PSScriptRoot\build_mac.js"
if (Test-Path $macScript) {
    node "$macScript"
} else {
    Write-Error "build_mac.js not found!"
}
