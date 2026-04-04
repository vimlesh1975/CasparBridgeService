#define MyAppName "Caspar Bridge Service"
#define MyAppVersion "1.0.0"
#define MyAppPublisher "Caspar Bridge"
#define MyAppExeName "CasparBridgeService.exe"
#define MyServiceWrapperExeName "CasparBridgeServiceService.exe"
#define MyServiceConfigName "CasparBridgeServiceService.xml"

[Setup]
AppId={{B1C0E08A-4E68-4A65-B9C0-8A80A952C7A0}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
DefaultDirName={autopf}\CasparBridgeService
DefaultGroupName={#MyAppName}
OutputDir=..\build
OutputBaseFilename=CasparBridgeService-Service-Setup
Compression=lzma
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=admin

[Dirs]
Name: "{app}\service-logs"

[Files]
Source: "..\build\{#MyAppExeName}"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\vendor\winsw\WinSW-x64.exe"; DestDir: "{app}"; DestName: "{#MyServiceWrapperExeName}"; Flags: ignoreversion
Source: "service\{#MyServiceConfigName}"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\.env.example"; DestDir: "{app}"; DestName: ".env"; Flags: onlyifdoesntexist

[Icons]
Name: "{group}\Open Install Folder"; Filename: "{app}"
Name: "{group}\Uninstall {#MyAppName}"; Filename: "{uninstallexe}"

[Run]
Filename: "{app}\{#MyServiceWrapperExeName}"; Parameters: "install"; Flags: runhidden waituntilterminated
Filename: "{cmd}"; Parameters: "/C sc description ""CasparBridgeService"" ""Receives localhost:3000 CasparCG bridge commands and forwards them to CasparCG."""; Flags: runhidden waituntilterminated
Filename: "{app}\{#MyServiceWrapperExeName}"; Parameters: "start"; Description: "Start {#MyAppName} service"; Flags: runhidden waituntilterminated postinstall skipifsilent

[UninstallRun]
Filename: "{app}\{#MyServiceWrapperExeName}"; Parameters: "stop"; RunOnceId: "StopCasparBridgeService"; Flags: runhidden waituntilterminated skipifdoesntexist
Filename: "{app}\{#MyServiceWrapperExeName}"; Parameters: "uninstall"; RunOnceId: "UninstallCasparBridgeService"; Flags: runhidden waituntilterminated skipifdoesntexist
