[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$appRoot = Join-Path (Split-Path -Parent $PSScriptRoot) 'app'
$processes = Get-CimInstance Win32_Process | Where-Object {
  $_.Name -eq 'electron.exe' -and $_.CommandLine -like "*$appRoot*"
}

foreach ($process in $processes) {
  Stop-Process -Id $process.ProcessId -Force
}
