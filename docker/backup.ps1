param(
  [string]$ContainerName = "cafe_igraonica_db",
  [string]$Database = "cafe_gaming",
  [string]$User = "postgres"
)

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupDir = Join-Path $PSScriptRoot "backups"
if (-not (Test-Path $backupDir)) {
  New-Item -ItemType Directory -Path $backupDir | Out-Null
}

$backupFile = Join-Path $backupDir "backup-$timestamp.sql"
docker exec $ContainerName pg_dump -U $User $Database | Out-File -FilePath $backupFile -Encoding UTF8
Write-Host "Backup saved to $backupFile"
