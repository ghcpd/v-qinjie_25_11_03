Set-StrictMode -Version Latest
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot ".."))
Set-Location $repoRoot
if (-not (Test-Path "package.json")) {
    Write-Error "package.json not found; run this script from inside the repository"
    exit 1
}
npm install
npm test
