$ErrorActionPreference = "SilentlyContinue"
$Root = Resolve-Path (Join-Path $PSScriptRoot "..")
$PidFile = Join-Path $Root "data\watchdog.pid"

if (Test-Path $PidFile) {
  $watchdogPid = Get-Content -LiteralPath $PidFile
  if ($watchdogPid) {
    Stop-Process -Id $watchdogPid -Force
  }
  Remove-Item -LiteralPath $PidFile -Force
}

netstat -ano | Select-String ":3003" | Select-String "LISTENING" | ForEach-Object {
  $parts = $_.ToString().Trim() -split "\s+"
  Stop-Process -Id $parts[-1] -Force
}

Write-Output "SISAPEC site and watchdog stopped."
