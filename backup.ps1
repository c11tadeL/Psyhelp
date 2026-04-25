param(
    [string]$DbName = "psyhelp",
    [string]$DbUser = "postgres",
    [string]$BackupDir = "D:\Psyhelp\backups"
)

$date = Get-Date -Format "yyyyMMdd_HHmmss"
$file = "$BackupDir\psyhelp-$date.dump"

if (-not (Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir | Out-Null
}


& pg_dump -U $DbUser -Fc $DbName -f $file

if ($LASTEXITCODE -eq 0) {
    Write-Host "Backup created: $file" -ForegroundColor Green
    Write-Host "Size: $((Get-Item $file).Length / 1KB) KB"

    # Видаляємо бекапи старіше 30 днів
    Get-ChildItem $BackupDir -Filter "psyhelp-*.dump" |
        Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-30) } |
        Remove-Item -Force
}
else {
    Write-Host "Backup FAILED" -ForegroundColor Red
    exit 1
}