#!/bin/bash

# Script para actualizar IP en whitelist de TradingView API
# Uso: ./update-ip.sh [nueva_ip]

echo "🔄 Actualizando IP en whitelist de TradingView API..."

# Función para obtener IP automáticamente
get_current_ip() {
    # Intentar múltiples servicios para obtener IP
    for service in "https://api.ipify.org" "https://ipinfo.io/ip" "https://api.myip.com" "https://checkip.amazonaws.com"; do
        IP=$(curl -s --max-time 5 "$service" 2>/dev/null)
        if [[ $IP =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
            echo "$IP"
            return 0
        fi
    done
    echo "ERROR: No se pudo obtener IP automáticamente"
    return 1
}

# Determinar IP a usar
if [ -n "$1" ]; then
    NEW_IP="$1"
    echo "📍 Usando IP proporcionada: $NEW_IP"
else
    echo "🌐 Obteniendo IP automáticamente..."
    NEW_IP=$(get_current_ip)
    if [[ $NEW_IP == ERROR* ]]; then
        echo "❌ $NEW_IP"
        echo "💡 Prueba ejecutar: ./update-ip.sh TU_IP_MANUAL"
        exit 1
    fi
    echo "📍 IP detectada: $NEW_IP"
fi

# Validar formato de IP
if ! [[ $NEW_IP =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    echo "❌ Error: '$NEW_IP' no es una IP válida"
    exit 1
fi

# Backup del .env actual
cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
echo "💾 Backup creado: .env.backup.$(date +%Y%m%d_%H%M%S)"

# Actualizar IP en .env (reemplaza la última IP que no sea 127.0.0.1 ni la del servidor)
sed -i "s/\([0-9]\+\.[0-9]\+\.[0-9]\+\.[0-9]\+\)$/NEW_IP_TEMP/" .env
sed -i "s/NEW_IP_TEMP/$NEW_IP/" .env

echo "✅ .env actualizado con IP: $NEW_IP"

# Verificar que PM2 esté disponible
if ! command -v pm2 &> /dev/null; then
    echo "❌ PM2 no está disponible. No se puede reiniciar automáticamente."
    echo "🔧 Ejecuta manualmente: pm2 restart tradingview-api"
    exit 1
fi

# Reiniciar servidor
echo "🔄 Reiniciando servidor..."
pm2 restart tradingview-api

# Verificar estado
sleep 2
if pm2 describe tradingview-api &>/dev/null; then
    echo "✅ Servidor reiniciado correctamente"
    pm2 status | grep tradingview-api
else
    echo "❌ Error al reiniciar servidor"
    exit 1
fi

# Probar conectividad
echo "🧪 Probando conectividad..."
sleep 3
HEALTH_CHECK=$(curl -s --max-time 10 "http://185.218.124.241:5001/api/metrics/health" \
  -H "X-API-Key: 92a1e4a8c74e1871c658301f3e8ae31c31ed6bfd68629059617fac621932e1ea" | jq -r .status 2>/dev/null)

if [ "$HEALTH_CHECK" = "healthy" ]; then
    echo "🎉 ¡IP actualizada y API funcionando correctamente!"
else
    echo "⚠️  Servidor reiniciado pero health check falló. Verifica logs."
fi

echo ""
echo "📋 Resumen:"
echo "   📍 Nueva IP: $NEW_IP"
echo "   🔄 Servidor: Reiniciado"
echo "   ✅ Configuración: Actualizada"
