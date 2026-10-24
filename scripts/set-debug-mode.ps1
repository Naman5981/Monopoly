param (
    [switch]$Disable,
    [switch]$Enable
)

$scriptDir = $PSScriptRoot
$repoRoot = (Resolve-Path "$scriptDir\..").Path
$buildConfigFile = "$repoRoot\world-tycoon\src\game\buildConfig.js"
$indexHtmlFile = "$repoRoot\world-tycoon\index.html"

if ($Disable) {
    Write-Host "[set-debug-mode] Disabling debug mode for production/CI release build..." -ForegroundColor Yellow

    # 1. Update buildConfig.js
    if (Test-Path $buildConfigFile) {
        $content = Get-Content $buildConfigFile -Raw
        $content = $content -replace "DEBUG_ENABLED:\s*true", "DEBUG_ENABLED: false"
        Set-Content -Path $buildConfigFile -Value $content -NoNewline
        Write-Host "[+] Updated $buildConfigFile -> DEBUG_ENABLED: false" -ForegroundColor Green
    }

    # 2. Update index.html to add data-debug-disabled and comment out data-debug-ui buttons
    if (Test-Path $indexHtmlFile) {
        $html = Get-Content $indexHtmlFile -Raw
        
        # Add data-debug-disabled attribute to body if not present
        if ($html -notmatch 'data-debug-disabled="true"') {
            $html = $html -replace '<body\b', '<body data-debug-disabled="true"'
        }
        
        # Comment out data-debug-ui button elements
        $pattern = '(?s)(<button\b[^>]*data-debug-ui="true"[^>]*>.*?</button>)'
        $html = [regex]::Replace($html, $pattern, {
            param($match)
            return "<!-- [CI_STRIPPED_DEBUG_START] " + $match.Value + " [CI_STRIPPED_DEBUG_END] -->"
        })

        Set-Content -Path $indexHtmlFile -Value $html -NoNewline
        Write-Host "[+] Updated $indexHtmlFile -> Debug UI triggers stripped" -ForegroundColor Green
    }
} elseif ($Enable) {
    Write-Host "[set-debug-mode] Enabling debug mode for local developer PC..." -ForegroundColor Cyan

    # 1. Restore buildConfig.js
    if (Test-Path $buildConfigFile) {
        $content = Get-Content $buildConfigFile -Raw
        $content = $content -replace "DEBUG_ENABLED:\s*false", "DEBUG_ENABLED: true"
        Set-Content -Path $buildConfigFile -Value $content -NoNewline
        Write-Host "[+] Restored $buildConfigFile -> DEBUG_ENABLED: true" -ForegroundColor Green
    }

    # 2. Restore index.html
    if (Test-Path $indexHtmlFile) {
        $html = Get-Content $indexHtmlFile -Raw
        
        # Remove data-debug-disabled
        $html = $html -replace '\s*data-debug-disabled="true"', ''

        # Uncomment data-debug-ui button elements
        $restorePattern = '<!--\s*\[CI_STRIPPED_DEBUG_START\]\s*(<button\b.*?<\/button>)\s*\[CI_STRIPPED_DEBUG_END\]\s*-->'
        $html = [regex]::Replace($html, $restorePattern, '$1')

        Set-Content -Path $indexHtmlFile -Value $html -NoNewline
        Write-Host "[+] Restored $indexHtmlFile -> Debug UI triggers restored" -ForegroundColor Green
    }
} else {
    Write-Host "Usage: .\set-debug-mode.ps1 -Disable | -Enable" -ForegroundColor Red
}
