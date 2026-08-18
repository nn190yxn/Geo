#define ProductName "AI品牌曝光助手"
#define ProductVersion GetEnv("GEO_RELEASE_VERSION")
#define ReleaseRoot GetEnv("GEO_RELEASE_STAGE")

[Setup]
AppId={{2BFF3D4C-9EBB-4F49-8C2D-7F81D24F5585}
AppName={#ProductName}
AppVersion={#ProductVersion}
DefaultDirName={autopf}\AI品牌曝光助手
DefaultGroupName={#ProductName}
OutputDir={#ReleaseRoot}\output
OutputBaseFilename=AI品牌曝光助手-{#ProductVersion}-安装程序
Compression=lzma2
SolidCompression=yes
ArchitecturesInstallIn64BitMode=x64
UninstallDisplayIcon={app}\runtime\electron\electron.exe

[Files]
Source: "{#ReleaseRoot}\payload\*"; DestDir: "{app}"; Flags: recursesubdirs ignoreversion

[Icons]
Name: "{group}\启动 AI品牌曝光助手"; Filename: "powershell.exe"; Parameters: "-ExecutionPolicy Bypass -File ""{app}\windows\Start-GEO.ps1"""
Name: "{group}\停止 AI品牌曝光助手"; Filename: "powershell.exe"; Parameters: "-ExecutionPolicy Bypass -File ""{app}\windows\Stop-GEO.ps1"""
Name: "{autodesktop}\AI品牌曝光助手"; Filename: "{app}\runtime\electron\electron.exe"; Parameters: """{app}\app"""; WorkingDir: "{app}\app"

[Run]
Filename: "{app}\runtime\electron\electron.exe"; Parameters: """{app}\app"""; WorkingDir: "{app}\app"; Description: "启动 AI品牌曝光助手"; Flags: postinstall nowait skipifsilent
