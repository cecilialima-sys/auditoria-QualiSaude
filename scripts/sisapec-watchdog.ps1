param(
  [int]$Port = 3003,
  [int]$IntervalSeconds = 30,
  [int]$HealthTimeoutSeconds = 75,
  [int]$MaxConsecutiveFailures = 3
)

$ErrorActionPreference = "SilentlyContinue"
$Root = Resolve-Path (Join-Path $PSScriptRoot "..")
$DataDir = Join-Path $Root "data"
$LogDir = Join-Path $Root "logs"
$PidFile = Join-Path $DataDir "watchdog.pid"
$RuntimeLog = Join-Path $LogDir "next-runtime.log"
$WatchdogLog = Join-Path $LogDir "watchdog.log"

New-Item -ItemType Directory -Force -Path $DataDir, $LogDir | Out-Null
$PID | Set-Content -LiteralPath $PidFile

function Write-WatchdogLog($Message) {
  $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
  Add-Content -LiteralPath $WatchdogLog -Value "[$timestamp] $Message"
}

function Get-ListeningPids {
  $matches = netstat -ano | Select-String ":$Port" | Select-String "LISTENING"
  $matches | ForEach-Object {
    $parts = $_.ToString().Trim() -split "\s+"
    $parts[-1]
  } | Sort-Object -Unique
}

function Stop-PortProcess {
  Get-ListeningPids | ForEach-Object {
    if ($_ -and [int]$_ -ne $PID) {
      Write-WatchdogLog "Stopping process on port ${Port}: PID $_"
      Stop-Process -Id $_ -Force
    }
  }
}

function Test-Site {
  try {
    $response = Invoke-WebRequest -UseBasicParsing "http://127.0.0.1:$Port/login" -TimeoutSec $HealthTimeoutSeconds
    return $response.StatusCode -eq 200
  } catch {
    return $false
  }
}

function Start-Site {
  Write-WatchdogLog "Starting SISAPEC on port $Port"
  $command = "cd /d `"$Root`" && npm run db:start >> `"$RuntimeLog`" 2>&1 && npm run db:check >> `"$RuntimeLog`" 2>&1 && npm run dev:next -- --port $Port >> `"$RuntimeLog`" 2>&1"
  Start-Process -FilePath "cmd.exe" -ArgumentList "/c", $command -WindowStyle Hidden | Out-Null
}

Write-WatchdogLog "Watchdog started. Root=$Root Port=$Port"
$failureCount = 0

while ($true) {
  if (-not (Get-ListeningPids)) {
    Write-WatchdogLog "No process listening on port $Port. Starting site immediately."
    Start-Site
    $failureCount = 0
    Start-Sleep -Seconds 35
    continue
  }

  if (Test-Site) {
    if ($failureCount -gt 0) {
      Write-WatchdogLog "Health check recovered after $failureCount failure(s)."
    }
    $failureCount = 0
  } else {
    $failureCount++
    Write-WatchdogLog "Health check failed ($failureCount/$MaxConsecutiveFailures)."
  }

  if ($failureCount -ge $MaxConsecutiveFailures) {
    Write-WatchdogLog "Failure threshold reached. Restarting site."
    Stop-PortProcess
    Start-Sleep -Seconds 3
    Start-Site
    $failureCount = 0
    Start-Sleep -Seconds 35
  }

  Start-Sleep -Seconds $IntervalSeconds
}
