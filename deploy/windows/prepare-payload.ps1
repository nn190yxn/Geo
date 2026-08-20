param(
  [Parameter(Mandatory = $true)]
  [string]$Workspace,
  [Parameter(Mandatory = $true)]
  [string]$RuntimeDirectory
)

$ErrorActionPreference = 'Stop'
$payload = Join-Path $Workspace 'release\payload'
$app = Join-Path $payload 'app'

function Copy-DirectoryContents {
  param(
    [Parameter(Mandatory = $true)][string]$Source,
    [Parameter(Mandatory = $true)][string]$Destination
  )

  if (-not (Test-Path $Source)) {
    throw "Required release source is missing: $Source"
  }

  New-Item -ItemType Directory -Force -Path $Destination | Out-Null
  robocopy $Source $Destination /E /COPY:DAT /DCOPY:DAT /R:2 /W:1 /NFL /NDL /NJH /NJS /NP
  if ($LASTEXITCODE -gt 7) {
    throw "robocopy failed while copying $Source to $Destination with exit code $LASTEXITCODE"
  }
}

function Resolve-FirstExistingDirectory {
  param([string[]]$Candidates)

  foreach ($candidate in $Candidates) {
    if (Test-Path $candidate -PathType Container) { return $candidate }
  }
  throw "Required release source is missing: $($Candidates -join ', ')"
}

New-Item -ItemType Directory -Force -Path $app, (Join-Path $app 'apps\api'), (Join-Path $app 'apps\web'), (Join-Path $app 'packages\shared-types'), (Join-Path $payload 'runtime\electron'), (Join-Path $payload 'runtime\postgres'), (Join-Path $payload 'windows'), (Join-Path $Workspace 'release\output') | Out-Null

Copy-Item (Join-Path $Workspace 'package.json'), (Join-Path $Workspace 'package-lock.json') -Destination $app
Copy-Item (Join-Path $Workspace 'apps\api\package.json') -Destination (Join-Path $app 'apps\api')
Copy-Item (Join-Path $Workspace 'packages\shared-types\package.json') -Destination (Join-Path $app 'packages\shared-types')
Copy-DirectoryContents (Join-Path $Workspace 'apps\api\prisma') (Join-Path $app 'apps\api\prisma')

Push-Location $app
try {
  # Electron and the built Web bundle are packaged separately; only API production dependencies are needed.
  npm ci --omit=dev --ignore-scripts
  if ($LASTEXITCODE -ne 0) { throw "npm ci failed with exit code $LASTEXITCODE" }
} finally {
  Pop-Location
}

Copy-DirectoryContents (Join-Path $Workspace 'desktop') (Join-Path $app 'desktop')
Copy-DirectoryContents (Join-Path $Workspace 'apps\api\dist') (Join-Path $app 'apps\api\dist')
Copy-DirectoryContents (Join-Path $Workspace 'apps\web\dist') (Join-Path $app 'apps\web\dist')
Copy-DirectoryContents (Join-Path $Workspace 'packages\shared-types\dist') (Join-Path $app 'packages\shared-types\dist')
$prismaClient = Resolve-FirstExistingDirectory @(
  (Join-Path $Workspace 'apps\api\node_modules\@prisma\client'),
  (Join-Path $Workspace 'node_modules\@prisma\client')
)
$generatedPrismaClient = Resolve-FirstExistingDirectory @(
  (Join-Path $Workspace 'apps\api\node_modules\.prisma\client'),
  (Join-Path $Workspace 'node_modules\.prisma\client')
)
$prismaEngines = Resolve-FirstExistingDirectory @(
  (Join-Path $Workspace 'apps\api\node_modules\@prisma\engines'),
  (Join-Path $Workspace 'node_modules\@prisma\engines')
)
$prismaCli = Resolve-FirstExistingDirectory @(
  (Join-Path $Workspace 'apps\api\node_modules\prisma'),
  (Join-Path $Workspace 'node_modules\prisma')
)
Copy-DirectoryContents $prismaClient (Join-Path $app 'node_modules\@prisma\client')
Copy-DirectoryContents $generatedPrismaClient (Join-Path $app 'node_modules\.prisma\client')
# npm ci uses --ignore-scripts for a deterministic payload, so copy the Windows schema engine explicitly.
Copy-DirectoryContents $prismaEngines (Join-Path $app 'node_modules\@prisma\engines')
Copy-DirectoryContents $prismaCli (Join-Path $app 'node_modules\prisma')
Copy-DirectoryContents (Join-Path $Workspace 'node_modules\electron\dist') (Join-Path $payload 'runtime\electron')
Copy-Item (Join-Path $Workspace 'deploy\windows\Start-GEO.ps1'), (Join-Path $Workspace 'deploy\windows\Stop-GEO.ps1') -Destination (Join-Path $payload 'windows')

$requiredPayloadFiles = @(
  (Join-Path $app 'desktop\main.cjs'),
  (Join-Path $app 'desktop\runtime.cjs'),
  (Join-Path $app 'apps\api\dist\apps\api\src\main.js'),
  (Join-Path $app 'apps\api\prisma\schema.prisma'),
  (Join-Path $app 'node_modules\prisma\build\index.js'),
  (Join-Path $app 'node_modules\@prisma\engines\schema-engine-windows.exe'),
  (Join-Path $app 'node_modules\@prisma\client\default.js'),
  (Join-Path $app 'node_modules\.prisma\client\default.js'),
  (Join-Path $app 'apps\web\dist\index.html'),
  (Join-Path $payload 'runtime\electron\electron.exe'),
  (Join-Path $payload 'windows\Start-GEO.ps1')
)
foreach ($requiredFile in $requiredPayloadFiles) {
  if (-not (Test-Path $requiredFile -PathType Leaf)) {
    throw "Required desktop payload file is missing: $requiredFile"
  }
}

$postgresZip = Join-Path $RuntimeDirectory 'postgresql.zip'
$postgresExtract = Join-Path $RuntimeDirectory 'postgresql'
Invoke-WebRequest -Uri 'https://get.enterprisedb.com/postgresql/postgresql-16.4-1-windows-x64-binaries.zip' -OutFile $postgresZip
Expand-Archive -Path $postgresZip -DestinationPath $postgresExtract -Force
$postgresRoot = Get-ChildItem $postgresExtract -Directory | Where-Object { Test-Path (Join-Path $_.FullName 'bin\initdb.exe') } | Select-Object -First 1
if (-not $postgresRoot) { throw 'PostgreSQL archive does not contain initdb.exe.' }

# pgAdmin 4 bundles a large Python environment that the embedded database server never uses.
foreach ($directory in @('bin', 'lib', 'share')) {
  Copy-DirectoryContents (Join-Path $postgresRoot.FullName $directory) (Join-Path $payload "runtime\postgres\$directory")
}

# robocopy returns 1 when it successfully copies files; normalize the script result for Actions.
exit 0
