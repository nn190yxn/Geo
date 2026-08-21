[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$installRoot = Split-Path -Parent $PSScriptRoot
$electron = Join-Path $installRoot 'runtime\electron\electron.exe'
$appRoot = Join-Path $installRoot 'app'
$logFile = Join-Path $env:LOCALAPPDATA 'AI-Brand-Visibility-Assistant\data\logs\desktop.log'

try {
  if (-not (Test-Path $electron) -or -not (Test-Path (Join-Path $appRoot 'package.json'))) {
    throw 'The desktop application installation is incomplete. Reinstall the application.'
  }
  Start-Process -FilePath $electron -ArgumentList "`"$appRoot`"" -WorkingDirectory $appRoot
} catch {
  Add-Type -AssemblyName System.Windows.Forms
  [System.Windows.Forms.MessageBox]::Show(
    "$($_.Exception.Message)`n`nLog file: $logFile",
    'AI Brand Visibility Assistant startup failed',
    [System.Windows.Forms.MessageBoxButtons]::OK,
    [System.Windows.Forms.MessageBoxIcon]::Error
  ) | Out-Null
  exit 1
}
