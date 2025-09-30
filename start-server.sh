#!/bin/bash

# Script para iniciar el servidor TradingView Access Management
# Compatible con PM2 (producción) y desarrollo local
# Uso: ./start-server.sh [dev|prod]

MODE=${1:-auto}  # Default: auto (detecta entorno)

echo "🚀 Iniciando servidor TradingView Access Management..."

# Configurar entorno Node.js
echo "🔧 Configurando entorno Node.js..."

# Cargar nvm si existe
export NVM_DIR="$HOME/.nvm"
if [ -s "$NVM_DIR/nvm.sh" ]; then
    \. "$NVM_DIR/nvm.sh"
    nvm use 18 >/dev/null 2>&1
fi

# Verificar que Node.js esté disponible
if ! command -v node &> /dev/null; then
    echo "❌ Error: Node.js no está instalado o no está en PATH"
    echo "Ejecuta: curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash"
    echo "Luego: nvm install 18 && nvm use 18"
    exit 1
fi

echo "✅ Node.js $(node --version) listo"
echo "✅ npm $(npm --version) listo"

# Detectar modo automáticamente si no se especificó
if [ "$MODE" = "auto" ]; then
    if [ "$NODE_ENV" = "production" ] || [ -f "ecosystem.config.js" ]; then
        MODE="prod"
    else
        MODE="dev"
    fi
fi

echo "🎯 Modo detectado/seleccionado: $MODE"
echo ""

if [ "$MODE" = "prod" ]; then
    echo "🏭 MODO PRODUCCIÓN - Usando PM2"

    # Verificar si PM2 está disponible
    if command -v pm2 &> /dev/null; then
        echo "🚀 Iniciando con PM2 (cluster mode)..."

        # Verificar si ya está ejecutándose
        if pm2 describe tradingview-api &>/dev/null; then
            echo "ℹ️  Servidor ya está ejecutándose. Usando: ./restart-server.sh prod"
            pm2 status
            exit 0
        fi

        pm2 start ecosystem.config.js --env production
        pm2 save

        echo ""
        echo "✅ Servidor iniciado con PM2"
        echo "📊 Estado:"
        pm2 status
        echo ""
        echo "🌐 URLs de producción:"
        echo "   📡 API: http://185.218.124.241:5001"
        echo "   🎛️ Admin: http://185.218.124.241:5001/admin"
        echo "   📚 Docs: http://185.218.124.241:5001/doc-endpoint"

    else
        echo "❌ PM2 no está instalado. Instalando..."
        npm install -g pm2
        echo "🔄 Ejecuta nuevamente: ./start-server.sh prod"
        exit 1
    fi

elif [ "$MODE" = "dev" ]; then
    echo "💻 MODO DESARROLLO - Usando Node.js directo"

    # Verificar si el puerto está libre
    if lsof -i:5001 &>/dev/null; then
        echo "⚠️  Puerto 5001 ocupado. Deteniendo procesos existentes..."
        PIDS=$(lsof -ti:5001 2>/dev/null)
        if [ ! -z "$PIDS" ]; then
            kill -9 $PIDS 2>/dev/null
            sleep 2
        fi
    fi

    echo "🚀 Iniciando servidor en modo desarrollo..."
    echo "📡 Puerto: 5001"
    echo "🌐 URL: http://localhost:5001"
    echo "🎛️ Admin: http://localhost:5001/admin"
    echo "📚 Docs: http://localhost:5001/doc-endpoint"
    echo ""

    npm run dev

else
    echo "❌ Modo inválido. Uso:"
    echo "  ./start-server.sh          # Auto-detecta entorno"
    echo "  ./start-server.sh prod     # Producción (PM2)"
    echo "  ./start-server.sh dev      # Desarrollo (Node.js directo)"
    exit 1
fi
