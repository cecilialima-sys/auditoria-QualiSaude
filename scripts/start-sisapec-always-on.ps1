$ErrorActionPreference = "SilentlyContinue"
$Root = Resolve-Path (Join-Path $PSScriptRoot "..")
$DataDir = Join-Path $Root "data"
$LogDir = Join-Path $Root "logs"
$PidFile = Join-Path $DataDir "watchdog.pid"
$Watchdog = Join-Path $PSScriptRoot "sisapec-watchdog.ps1"

New-Item -ItemType Directory -Force -Path $DataDir, $LogDir | Out-Null

if (Test-Path $PidFile) {
  $existingPid = Get-Content -LiteralPath $PidFile -ErrorAction SilentlyContinue
  if ($existingPid -and (Get-Process -Id $existingPid -ErrorAction SilentlyContinue)) {
    Write-Output "SISAPEC watchdog already running. PID=$existingPid"
    exit 0
  }
}

$process = Start-Process -FilePath "powershell.exe" `
  -ArgumentList "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", "`"$Watchdog`"" `
  -WindowStyle Hidden `
  -PassThru

$process.Id | Set-Content -LiteralPath $PidFile
Write-Output "SISAPEC watchdog started. PID=$($process.Id)"
Write-Output "Link: http://localhost:3003/login"
