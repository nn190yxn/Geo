#define ProductName "AI品牌曝光助手"
#define ProductVersion GetEnv("GEO_RELEASE_VERSION")
#define ReleaseRoot GetEnv("GEO_RELEASE_STAGE")

[Setup]
AppId={{2BFF3D4C-9EBB-4F49-8C2D-7F81D24F5585}
AppName={#ProductName}
AppVersion={#ProductVersion}
DefaultDirName={autopf}\AI-Brand-Visibility-Assistant
DefaultGroupName={#ProductName}
OutputDir={#ReleaseRoot}\output
OutputBaseFilename=AI品牌曝光助手-{#ProductVersion}-安装程序
; ZIP compression favors installation speed for the bundled PostgreSQL runtime.
Compression=zip
SolidCompression=no
ArchitecturesInstallIn64BitMode=x64
UninstallDisplayIcon={app}\runtime\electron\electron.exe
CloseApplications=yes

[Files]
Source: "{#ReleaseRoot}\payload\*"; DestDir: "{app}"; Flags: recursesubdirs ignoreversion

[Icons]
Name: "{group}\启动 AI品牌曝光助手"; Filename: "powershell.exe"; Parameters: "-ExecutionPolicy Bypass -File ""{app}\windows\Start-GEO.ps1"""
Name: "{group}\停止 AI品牌曝光助手"; Filename: "powershell.exe"; Parameters: "-ExecutionPolicy Bypass -File ""{app}\windows\Stop-GEO.ps1"""
Name: "{autodesktop}\AI品牌曝光助手"; Filename: "{app}\runtime\electron\electron.exe"; Parameters: """{app}\app"""; WorkingDir: "{app}\app"

[Run]
Filename: "{app}\runtime\electron\electron.exe"; Parameters: """{app}\app"""; WorkingDir: "{app}\app"; Description: "启动 AI品牌曝光助手"; Flags: postinstall nowait skipifsilent

[UninstallRun]
Filename: "powershell.exe"; Parameters: "-ExecutionPolicy Bypass -File ""{app}\windows\Stop-GEO.ps1"""; Flags: runhidden waituntilterminated

[Code]
procedure CurUninstallStepChanged(CurUninstallStep: TUninstallStep);
var
  dataRoot: String;
begin
  if CurUninstallStep = usPostUninstall then begin
    if (not WizardSilent) and (MsgBox('是否保留本地业务数据和日志？选择“否”将删除该 Windows 用户的本地数据。', mbConfirmation, MB_YESNO) = IDNO) then begin
      dataRoot := ExpandConstant('{localappdata}\AI-Brand-Visibility-Assistant');
      DelTree(dataRoot, True, True, True);
    end;
  end;
end;
