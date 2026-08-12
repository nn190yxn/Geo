[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$installRoot = Split-Path -Parent $PSScriptRoot
$releaseRoot = Join-Path $installRoot 'release'

docker compose --env-file (Join-Path $releaseRoot '.env') --project-name geo-platform -f (Join-Path $releaseRoot 'compose.release.yaml') down
if ($LASTEXITCODE -ne 0) { throw 'GEO 服务停止失败。' }
