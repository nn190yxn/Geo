[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$installRoot = Split-Path -Parent $PSScriptRoot
$releaseRoot = Join-Path $installRoot 'release'
$envFile = Join-Path $releaseRoot '.env'
$composeFile = Join-Path $releaseRoot 'compose.release.yaml'
$imageArchive = Join-Path $releaseRoot 'geo-platform-images.tar'
$logDirectory = Join-Path $env:LOCALAPPDATA 'AI品牌曝光助手'
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
    "$Message`n`n详细日志：$logFile",
    'AI品牌曝光助手启动失败',
    [System.Windows.Forms.MessageBoxButtons]::OK,
    [System.Windows.Forms.MessageBoxIcon]::Error
  ) | Out-Null
}

function Assert-DockerReady {
  if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    throw '未检测到 Docker Desktop。请安装并启动 Docker Desktop 后重新运行 AI品牌曝光助手。'
  }

  docker info *> $null
  if ($LASTEXITCODE -ne 0) {
    throw 'Docker Desktop 当前未运行。请启动 Docker Desktop 并等待引擎就绪后重新运行 AI品牌曝光助手。'
  }
}

try {
  Remove-Item -Path $logFile -Force -ErrorAction SilentlyContinue
  Write-StartupLog '开始启动 AI品牌曝光助手。'
  Assert-DockerReady

  if (-not (Test-Path $envFile) -or -not (Test-Path $composeFile) -or -not (Test-Path $imageArchive)) {
    throw 'AI品牌曝光助手安装内容不完整。请重新安装对应版本的安装包。'
  }

  $imageLoadOutput = docker image load --input $imageArchive 2>&1
  $imageLoadOutput | ForEach-Object { Write-StartupLog $_ }
  if ($LASTEXITCODE -ne 0) { throw 'AI品牌曝光助手离线镜像导入失败。' }

  $composeOutput = docker compose --env-file $envFile --project-name geo-platform -f $composeFile up -d --wait 2>&1
  $composeOutput | ForEach-Object { Write-StartupLog $_ }
  if ($LASTEXITCODE -ne 0) { throw 'AI品牌曝光助手服务启动失败。' }

  Write-StartupLog '服务启动成功，正在打开浏览器。'
  Start-Process 'http://localhost:4173'
} catch {
  $message = $_.Exception.Message
  Write-StartupLog "启动失败：$message"
  Show-StartupError $message
  exit 1
}
