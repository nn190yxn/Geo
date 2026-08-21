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
  'app\apps\api\prisma\seed.js',
  'app\apps\api\prisma\migrations',
  'app\apps\web\dist\index.html',
  'app\apps\api\node_modules\prisma\build\index.js',
  'app\apps\api\node_modules\@prisma\engines\schema-engine-windows.exe',
  'app\apps\api\node_modules\@prisma\client\default.js',
  'app\apps\api\node_modules\.prisma\client\default.js',
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

# Execute the CLI from its final workspace location to validate its dependency closure.
$env:ELECTRON_RUN_AS_NODE = '1'
$env:DATABASE_URL = 'postgresql://geo:geo@127.0.0.1:5432/geo_platform?schema=public'
$electron = Join-Path $PayloadRoot 'runtime\electron\electron.exe'
$prismaCli = Join-Path $PayloadRoot 'app\apps\api\node_modules\prisma\build\index.js'
$prismaSchema = Join-Path $PayloadRoot 'app\apps\api\prisma\schema.prisma'

# electron.exe is a GUI subsystem binary. Calling it with the call operator does
# not block and does not update $LASTEXITCODE, so Start-Process -Wait is required.
# Start-Process re-joins ArgumentList into a single command line, so arguments
# containing spaces or quotes are wrapped manually to survive that re-joining.
function Invoke-ElectronNode {
  param([Parameter(Mandatory = $true)][string[]]$Arguments)
  $stdoutFile = Join-Path $env:TEMP ('electron-node-out-' + [guid]::NewGuid().ToString('N') + '.log')
  $stderrFile = Join-Path $env:TEMP ('electron-node-err-' + [guid]::NewGuid().ToString('N') + '.log')
  $quotedArguments = $Arguments | ForEach-Object {
    if ($_ -match '[\s"]') { '"' + ($_ -replace '"', '\"') + '"' } else { $_ }
  }
  $process = Start-Process -FilePath $electron -ArgumentList $quotedArguments -Wait -PassThru -NoNewWindow -RedirectStandardOutput $stdoutFile -RedirectStandardError $stderrFile
  $stdout = if (Test-Path $stdoutFile) { Get-Content $stdoutFile -Raw } else { '' }
  $stderr = if (Test-Path $stderrFile) { Get-Content $stderrFile -Raw } else { '' }
  [pscustomobject]@{ ExitCode = $process.ExitCode; Output = ($stdout + $stderr) }
}

# Use a probe script file instead of -e so embedded quotes are not re-parsed.
$probeFile = Join-Path $env:TEMP ('electron-probe-' + [guid]::NewGuid().ToString('N') + '.js')
Set-Content -Path $probeFile -Value "console.log('ELECTRON_NODE_OK')" -Encoding ascii
$probe = Invoke-ElectronNode @($probeFile)
if ($probe.ExitCode -ne 0 -or $probe.Output -notmatch 'ELECTRON_NODE_OK') {
  throw "Electron runtime did not start in Node mode (exit $($probe.ExitCode)): $($probe.Output)"
}

$validateResult = Invoke-ElectronNode @($prismaCli, 'validate', '--schema', $prismaSchema)
if ($validateResult.ExitCode -ne 0) {
  throw "Bundled Prisma CLI failed to validate the schema from the final payload (exit $($validateResult.ExitCode)): $($validateResult.Output)"
}

$versionResult = Invoke-ElectronNode @($prismaCli, '--version')
if ($versionResult.ExitCode -ne 0) {
  throw "Bundled Prisma CLI failed to load from the final payload (exit $($versionResult.ExitCode)): $($versionResult.Output)"
}
Write-Output "Bundled Prisma CLI reported: $($versionResult.Output.Trim())"

Write-Output "Validated Windows payload at $PayloadRoot"
