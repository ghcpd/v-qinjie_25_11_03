Param(
    [switch]$SkipInstall
)

$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Definition
$ProjectRoot = Join-Path $ProjectRoot ".."
Set-Location $ProjectRoot

if (-not $SkipInstall) {
    Write-Host "[+] Installing dependencies"
    npm install | Write-Output
}

Write-Host "[+] Running lint checks"
try {
    npm run lint
} catch {
    Write-Warning "Lint script failed: $($_.Exception.Message)"
}

Write-Host "[+] Executing automated security regression tests"
npm test
