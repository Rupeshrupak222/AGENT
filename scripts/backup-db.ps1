# ==============================================================================
# AgentCall AI — Windows PowerShell Database Backup Script
# ==============================================================================

param(
    [string]$BackupDir = "./backups",
    [string]$DatabaseUrl = $env:DATABASE_URL
)

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
if (!(Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
}

$backupFile = Join-Path $BackupDir "agentcall_backup_$timestamp.dump"
Write-Host "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] Starting database backup to $backupFile..."

if ($DatabaseUrl) {
    pg_dump --format=custom --no-owner --no-privileges $DatabaseUrl | Out-File -FilePath $backupFile -Encoding Byte
} else {
    Write-Host "Please set DATABASE_URL environment variable or supply -DatabaseUrl parameter."
    exit 1
}

if (Test-Path $backupFile) {
    $size = (Get-Item $backupFile).Length
    Write-Host "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] Backup successfully created ($size bytes)."
} else {
    Write-Error "Backup file was not generated."
    exit 1
}
