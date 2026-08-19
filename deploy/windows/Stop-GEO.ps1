[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$appRoot = Join-Path (Split-Path -Parent $PSScriptRoot) 'app'
$dataRoot = Join-Path $env:LOCALAPPDATA 'AI-Brand-Visibility-Assistant\data'
$processes = Get-CimInstance Win32_Process | Where-Object {
  ($_.Name -eq 'electron.exe' -and $_.CommandLine -like "*$appRoot*") -or
  ($_.Name -eq 'postgres.exe' -and $_.CommandLine -like "*$dataRoot\postgres-data*")
}

foreach ($process in $processes) {
  Stop-Process -Id $process.ProcessId -Force
}
