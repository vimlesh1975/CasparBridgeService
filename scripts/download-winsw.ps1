$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$vendorDir = Join-Path $root "vendor\winsw"
$wrapperPath = Join-Path $vendorDir "WinSW-x64.exe"
$downloadUrl = "https://github.com/winsw/winsw/releases/download/v2.12.0/WinSW-x64.exe"

New-Item -ItemType Directory -Force -Path $vendorDir | Out-Null

Write-Host "Downloading WinSW wrapper..."
Invoke-WebRequest -Uri $downloadUrl -OutFile $wrapperPath

Write-Host "Saved WinSW to $wrapperPath"
