# Script para detener procesos en puertos y reiniciar servidor
# Uso: .\restart-server.ps1

Write-Host "🛑 Deteniendo procesos en puertos..." -ForegroundColor Red

# Detener procesos que usan el puerto 5001
$processes = Get-NetTCPConnection -LocalPort 5001 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess
if ($processes) {
    foreach ($pid in $processes) {
        Write-Host "Deteniendo proceso PID: $pid" -ForegroundColor Yellow
        Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
    }
    Start-Sleep -Seconds 2
}

# Detener todos los procesos de Node.js por si acaso
Write-Host "Deteniendo procesos de Node.js..." -ForegroundColor Yellow
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force

Start-Sleep -Seconds 1

Write-Host "🚀 Iniciando servidor..." -ForegroundColor Green
npm start
