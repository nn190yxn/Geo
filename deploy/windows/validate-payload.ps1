param(
  [Parameter(Mandatory = $true)]
  [string]$PayloadRoot
)

$ErrorActionPreference = 'Stop'

function Assert-File {
  param([Parameter(Mandatory = $true)][string]$Path)
  if (-not (Test-Path $Path -PathType Leaf)) {
    throw "Required Windows payload file is missing: $Path"
  }
}

$requiredFiles = @(
  'app\package.json',
  'app\desktop\main.cjs',
  'app\desktop\runtime.cjs',
  'app\apps\api\dist\apps\api\src\main.js',
  'app\apps\api\prisma\schema.prisma',
  'app\apps\api\prisma\migrations',
  'app\apps\web\dist\index.html',
  'app\node_modules\prisma\build\index.js',
  'app\node_modules\@prisma\engines\schema-engine-windows.exe',
  'app\node_modules\@prisma\client\default.js',
  'app\node_modules\.prisma\client\default.js',
  'runtime\electron\electron.exe',
  'runtime\postgres\bin\initdb.exe',
  'runtime\postgres\bin\postgres.exe',
  'runtime\postgres\bin\pg_ctl.exe',
  'runtime\postgres\bin\psql.exe',
  'runtime\postgres\bin\createdb.exe',
  'windows\Start-GEO.ps1',
  'windows\Stop-GEO.ps1'
)

foreach ($relativePath in $requiredFiles) {
  $path = Join-Path $PayloadRoot $relativePath
  if ($relativePath -eq 'app\apps\api\prisma\migrations') {
    if (-not (Test-Path $path -PathType Container) -or -not (Get-ChildItem $path -Directory)) {
      throw "Required Prisma migrations are missing: $path"
    }
  } else {
    Assert-File $path
  }
}

$package = Get-Content (Join-Path $PayloadRoot 'app\package.json') -Raw | ConvertFrom-Json
if ($package.version -ne '0.1.0') {
  throw "Unexpected application package version: $($package.version)"
}

$electronPackage = Get-Content (Join-Path $PayloadRoot 'app\node_modules\electron\package.json') -Raw -ErrorAction SilentlyContinue
if ($electronPackage) {
  throw 'Electron package metadata must not be copied into the API production dependency tree.'
}

Write-Output "Validated Windows payload at $PayloadRoot"
