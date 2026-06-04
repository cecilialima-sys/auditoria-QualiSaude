param(
  [string]$ServiceName = $env:POSTGRES_SERVICE_NAME
)

$ErrorActionPreference = "Stop"

function Find-PostgresService {
  if ($ServiceName) {
    $service = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
    if ($service) { return $service }
    throw "Serviço PostgreSQL informado em POSTGRES_SERVICE_NAME não encontrado: $ServiceName"
  }

  $services = Get-Service | Where-Object {
    $_.Name -like "*postgres*" -or $_.DisplayName -like "*postgres*"
  } | Sort-Object -Property Name

  if (-not $services) {
    throw "Nenhum serviço PostgreSQL foi encontrado no Windows."
  }

  return $services | Select-Object -First 1
}

$service = Find-PostgresService
Write-Output "[db:start] Serviço PostgreSQL detectado: $($service.Name) ($($service.Status))"

try {
  Set-Service -Name $service.Name -StartupType Automatic -ErrorAction SilentlyContinue
} catch {
  Write-Output "[db:start] Não foi possível alterar StartupType. Execute como Administrador se desejar forçar inicialização automática."
}

if ($service.Status -ne "Running") {
  Write-Output "[db:start] Iniciando PostgreSQL..."
  Start-Service -Name $service.Name
  $service.WaitForStatus("Running", "00:00:30")
}

$service = Get-Service -Name $service.Name
if ($service.Status -ne "Running") {
  throw "PostgreSQL não iniciou. Verifique o serviço $($service.Name)."
}

Write-Output "[db:start] PostgreSQL rodando."
