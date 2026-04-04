$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$buildDir = Join-Path $root "build"
$exePath = Join-Path $buildDir "CasparBridgeService.exe"
$issPath = Join-Path $root "installer\CasparBridgeService.iss"
$wrapperPath = Join-Path $root "vendor\winsw\WinSW-x64.exe"

if (-not (Test-Path $exePath)) {
    Write-Host "Building Windows executable..."
    & npm run build:exe
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to build executable."
    }
}

if (-not (Test-Path $wrapperPath)) {
    throw "WinSW was not found at $wrapperPath. Run npm run download:winsw first."
}

$iscc = Get-Command ISCC.exe -ErrorAction SilentlyContinue
if (-not $iscc) {
    $candidatePaths = @(
        "${env:ProgramFiles(x86)}\Inno Setup 6\ISCC.exe",
        "$env:ProgramFiles\Inno Setup 6\ISCC.exe",
        "$env:LocalAppData\Programs\Inno Setup 6\ISCC.exe"
    )

    $resolvedPath = $candidatePaths | Where-Object { Test-Path $_ } | Select-Object -First 1
    if ($resolvedPath) {
        $iscc = [pscustomobject]@{
            Source = $resolvedPath
        }
    }
}

if (-not $iscc) {
    throw "Inno Setup compiler (ISCC.exe) was not found. Install Inno Setup, then rerun npm run build:installer."
}

Write-Host "Building installer..."
& $iscc.Source $issPath
if ($LASTEXITCODE -ne 0) {
    throw "Failed to build installer."
}

Write-Host "Installer created in $buildDir"
