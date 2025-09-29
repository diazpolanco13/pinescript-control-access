#!/bin/bash

# Script para detener procesos en puertos y reiniciar servidor
# Uso: ./restart-server.sh

echo "🛑 Deteniendo procesos en puertos..."

# Detener procesos que usan el puerto 5001
PIDS=$(lsof -ti:5001 2>/dev/null)
if [ ! -z "$PIDS" ]; then
    echo "Deteniendo procesos en puerto 5001: $PIDS"
    kill -9 $PIDS 2>/dev/null
    sleep 2
fi

# Detener todos los procesos de Node.js por si acaso
echo "Deteniendo procesos de Node.js..."
pkill -f "node" 2>/dev/null
sleep 1

echo "🚀 Iniciando servidor..."
npm start
