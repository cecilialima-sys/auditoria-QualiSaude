param(
  [int]$Port = 3003
)

$ErrorActionPreference = "Stop"
$Root = Resolve-Path (Join-Path $PSScriptRoot "..")

Set-Location $Root

Write-Output "[dev] Preparando PostgreSQL local..."
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot "start-postgres-windows.ps1")

Write-Output "[dev] Validando conexão com DATABASE_URL..."
& node (Join-Path $PSScriptRoot "check-db.js")

if ($LASTEXITCODE -ne 0) {
  throw "Falha na validação do banco. O sistema não será iniciado."
}

Write-Output "[dev] Banco validado. Iniciando QualiSaúde em http://localhost:$Port"
& npm.cmd run dev:next -- --port $Port
