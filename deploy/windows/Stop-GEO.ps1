[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$installRoot = Split-Path -Parent $PSScriptRoot
$releaseRoot = Join-Path $installRoot 'release'

docker compose --env-file (Join-Path $releaseRoot '.env') --project-name geo-platform -f (Join-Path $releaseRoot 'compose.release.yaml') down
if ($LASTEXITCODE -ne 0) { throw 'Application service shutdown failed.' }
