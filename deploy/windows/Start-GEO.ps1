[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$installRoot = Split-Path -Parent $PSScriptRoot
$releaseRoot = Join-Path $installRoot 'release'
$envFile = Join-Path $releaseRoot '.env'
$composeFile = Join-Path $releaseRoot 'compose.release.yaml'
$imageArchive = Join-Path $releaseRoot 'geo-platform-images.tar'

function Assert-DockerReady {
  if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    throw '未检测到 Docker Desktop。请安装并启动 Docker Desktop 后重新运行 AI品牌曝光助手。'
  }

  docker info *> $null
  if ($LASTEXITCODE -ne 0) {
    throw 'Docker Desktop 当前未运行。请启动 Docker Desktop 并等待引擎就绪后重新运行 AI品牌曝光助手。'
  }
}

Assert-DockerReady

if (-not (Test-Path $envFile) -or -not (Test-Path $composeFile) -or -not (Test-Path $imageArchive)) {
  throw 'AI品牌曝光助手安装内容不完整。请重新安装对应版本的安装包。'
}

docker image load --input $imageArchive
if ($LASTEXITCODE -ne 0) { throw 'AI品牌曝光助手离线镜像导入失败。' }

docker compose --env-file $envFile --project-name geo-platform -f $composeFile up -d
if ($LASTEXITCODE -ne 0) { throw 'AI品牌曝光助手服务启动失败。' }

Start-Process 'http://localhost:4173'
