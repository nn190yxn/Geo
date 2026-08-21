[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$installRoot = Split-Path -Parent $PSScriptRoot
$dataRoot = Join-Path $env:LOCALAPPDATA 'AI-Brand-Visibility-Assistant\data'
$stateFile = Join-Path $dataRoot 'runtime-state.json'
$pgCtl = Join-Path $installRoot 'runtime\postgres\bin\pg_ctl.exe'
$databaseRoot = Join-Path $dataRoot 'postgres-data'

if (-not (Test-Path $stateFile)) {
  exit 0
}

$state = Get-Content $stateFile -Raw | ConvertFrom-Json
if (Test-Path $pgCtl) {
  & $pgCtl -D $databaseRoot -m fast -w stop
  if ($LASTEXITCODE -ne 0) {
    & $pgCtl -D $databaseRoot -m immediate -w stop
  }
  $pgDeadline = (Get-Date).AddSeconds(30)
  while ((Get-Date) -lt $pgDeadline -and (Get-Process -Name 'postgres' -ErrorAction SilentlyContinue)) {
    Start-Sleep -Milliseconds 500
  }
}

foreach ($processId in @($state.apiProcessId, $state.processId)) {
  $process = if ($processId) { Get-Process -Id $processId -ErrorAction SilentlyContinue } else { $null }
  if ($process) {
    $process.CloseMainWindow() | Out-Null
    $deadline = (Get-Date).AddSeconds(10)
    while ((Get-Date) -lt $deadline -and (Get-Process -Id $processId -ErrorAction SilentlyContinue)) {
      Start-Sleep -Milliseconds 250
    }
    if (Get-Process -Id $processId -ErrorAction SilentlyContinue) {
      Stop-Process -Id $processId -ErrorAction SilentlyContinue
    }
  }
}
