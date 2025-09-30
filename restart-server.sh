#!/bin/bash

# Script para reiniciar servidor TradingView Access Management
# Compatible con PM2 (producción) y desarrollo local
# Uso: ./restart-server.sh [dev|prod]

MODE=${1:-prod}  # Default: prod

echo "🔄 Reiniciando servidor TradingView Access Management..."
echo "🎯 Modo: $MODE"

if [ "$MODE" = "prod" ]; then
    echo "🏭 MODO PRODUCCIÓN - Usando PM2"

    # Verificar si PM2 está disponible
    if command -v pm2 &> /dev/null; then
        echo "🛑 Deteniendo aplicaciones PM2..."
        pm2 stop tradingview-api 2>/dev/null
        pm2 delete tradingview-api 2>/dev/null
        sleep 2

        echo "🚀 Iniciando con PM2 (cluster mode)..."
        pm2 start ecosystem.config.js --env production
        pm2 save

        echo "✅ Servidor reiniciado con PM2"
        echo "📊 Estado:"
        pm2 status
    else
        echo "❌ PM2 no está instalado. Instalando..."
        npm install -g pm2
        echo "🔄 Ejecuta nuevamente: ./restart-server.sh prod"
        exit 1
    fi

elif [ "$MODE" = "dev" ]; then
    echo "💻 MODO DESARROLLO - Usando Node.js directo"

    echo "🛑 Deteniendo procesos existentes..."
    # Detener procesos que usan el puerto 5001
    PIDS=$(lsof -ti:5001 2>/dev/null)
    if [ ! -z "$PIDS" ]; then
        echo "Deteniendo procesos en puerto 5001: $PIDS"
        kill -9 $PIDS 2>/dev/null
        sleep 2
    fi

    # Detener específicamente procesos de desarrollo
    pkill -f "src/server.js" 2>/dev/null
    pkill -f "nodemon" 2>/dev/null
    sleep 1

    echo "🚀 Iniciando servidor en modo desarrollo..."
    npm run dev

else
    echo "❌ Modo inválido. Uso:"
    echo "  ./restart-server.sh         # Producción (PM2)"
    echo "  ./restart-server.sh prod    # Producción (PM2)"
    echo "  ./restart-server.sh dev     # Desarrollo (Node.js directo)"
    exit 1
fi
