#define ProductName "GEO Platform"
#define ProductVersion GetEnv("GEO_RELEASE_VERSION")
#define ReleaseRoot GetEnv("GEO_RELEASE_STAGE")

[Setup]
AppId={{2BFF3D4C-9EBB-4F49-8C2D-7F81D24F5585}
AppName={#ProductName}
AppVersion={#ProductVersion}
DefaultDirName={autopf}\GEO Platform
DefaultGroupName={#ProductName}
OutputDir={#ReleaseRoot}\output
OutputBaseFilename=GEO-Platform-{#ProductVersion}-Setup
Compression=lzma2
SolidCompression=yes
ArchitecturesInstallIn64BitMode=x64
UninstallDisplayIcon={app}\windows\Start-GEO.ps1

[Files]
Source: "{#ReleaseRoot}\payload\*"; DestDir: "{app}"; Flags: recursesubdirs ignoreversion

[Icons]
Name: "{group}\启动 GEO Platform"; Filename: "powershell.exe"; Parameters: "-ExecutionPolicy Bypass -File ""{app}\windows\Start-GEO.ps1"""
Name: "{group}\停止 GEO Platform"; Filename: "powershell.exe"; Parameters: "-ExecutionPolicy Bypass -File ""{app}\windows\Stop-GEO.ps1"""

[Run]
Filename: "powershell.exe"; Parameters: "-ExecutionPolicy Bypass -File ""{app}\windows\Start-GEO.ps1"""; Description: "启动 GEO Platform"; Flags: postinstall nowait skipifsilent
