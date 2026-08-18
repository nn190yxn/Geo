[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$installRoot = Split-Path -Parent $PSScriptRoot
$releaseRoot = Join-Path $installRoot 'release'
$envFile = Join-Path $releaseRoot '.env'
$composeFile = Join-Path $releaseRoot 'compose.release.yaml'
$imageArchive = Join-Path $releaseRoot 'geo-platform-images.tar'
$logDirectory = Join-Path $env:LOCALAPPDATA 'AI-Brand-Visibility-Assistant'
$logFile = Join-Path $logDirectory 'startup.log'

function Write-StartupLog {
  param([string]$Message)

  New-Item -ItemType Directory -Force -Path $logDirectory | Out-Null
  "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') $Message" | Add-Content -Path $logFile -Encoding UTF8
}

function Show-StartupError {
  param([string]$Message)

  Add-Type -AssemblyName System.Windows.Forms
  [System.Windows.Forms.MessageBox]::Show(
    "$Message`n`nLog file: $logFile",
    'AI Brand Visibility Assistant startup failed',
    [System.Windows.Forms.MessageBoxButtons]::OK,
    [System.Windows.Forms.MessageBoxIcon]::Error
  ) | Out-Null
}

function Assert-DockerReady {
  if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    throw 'Docker Desktop was not found. Install and start Docker Desktop, then run the application again.'
  }

  docker info *> $null
  if ($LASTEXITCODE -eq 0) {
    return
  }

  $dockerDesktop = Join-Path $env:ProgramFiles 'Docker\Docker\Docker Desktop.exe'
  if (-not (Test-Path $dockerDesktop)) {
    throw 'Docker Desktop is not running. Start Docker Desktop and wait for its engine to become ready.'
  }

  Write-StartupLog 'Docker Desktop is not running. Starting it and waiting for the engine.'
  Start-Process -FilePath $dockerDesktop
  $deadline = (Get-Date).AddSeconds(90)
  while ((Get-Date) -lt $deadline) {
    Start-Sleep -Seconds 3
    docker info *> $null
    if ($LASTEXITCODE -eq 0) {
      Write-StartupLog 'Docker Desktop engine is ready.'
      return
    }
  }

  throw 'Docker Desktop startup timed out. Confirm that Docker Desktop can start normally, then run the application again.'
}

try {
  Remove-Item -Path $logFile -Force -ErrorAction SilentlyContinue
  Write-StartupLog 'Starting AI Brand Visibility Assistant.'
  Assert-DockerReady

  if (-not (Test-Path $envFile) -or -not (Test-Path $composeFile) -or -not (Test-Path $imageArchive)) {
    throw 'The application installation is incomplete. Reinstall the matching installer version.'
  }

  $imageLoadOutput = docker image load --input $imageArchive 2>&1
  $imageLoadOutput | ForEach-Object { Write-StartupLog $_ }
  if ($LASTEXITCODE -ne 0) { throw 'Offline Docker image import failed.' }

  $composeOutput = docker compose --env-file $envFile --project-name geo-platform -f $composeFile up -d --wait 2>&1
  $composeOutput | ForEach-Object { Write-StartupLog $_ }
  if ($LASTEXITCODE -ne 0) { throw 'Application service startup failed.' }

  Write-StartupLog 'Services are ready. Opening the browser.'
  Start-Process 'http://localhost:4173'
} catch {
  $message = $_.Exception.Message
  Write-StartupLog "Startup failed: $message"
  Show-StartupError $message
  exit 1
}
