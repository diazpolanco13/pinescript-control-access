#!/bin/bash

# Script para iniciar el servidor TradingView Access Management en Linux
# Asegura que nvm y Node.js estén disponibles

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
echo ""
echo "🚀 Iniciando servidor TradingView Access Management..."
echo "📡 Puerto: 5001"
echo "🌐 URL: http://localhost:5001"
echo "🎛️  Admin: http://localhost:5001/admin"
echo ""

npm start
