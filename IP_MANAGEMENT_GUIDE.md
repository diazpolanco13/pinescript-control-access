# 🔐 Guía de Gestión de IPs - TradingView Access Management API

## 📋 Estado Actual

### ✅ IPs Configuradas:
```
ALLOWED_IPS=185.218.124.241,127.0.0.1,142.111.25.137
```

- `185.218.124.241` - Servidor de producción
- `127.0.0.1` - Desarrollo local
- `142.111.25.137` - Servidor de e-commerce

## 🚨 Problema: IPs Dinámicas

Si tu servidor de e-commerce tiene **IP dinámica**, necesitarás actualizar la whitelist cada vez que cambie.

### 🔍 ¿Cómo saber si tu IP cambió?

```bash
# Verificar tu IP actual
curl -s https://api.ipify.org

# O desde tu servidor
curl -s https://ipinfo.io/ip
```

### 🛠️ Opciones para Manejar IPs Dinámicas

#### **Opción 1: Actualización Manual (Recomendado para Seguridad)**
```bash
# 1. Obtener nueva IP
NEW_IP=$(curl -s https://api.ipify.org)

# 2. Actualizar .env
sed -i "s/142.111.25.137/$NEW_IP/" .env

# 3. Reiniciar servidor
pm2 restart tradingview-api
```

#### **Opción 2: Desactivar Validación por IP (Menos Seguro)**
```bash
# En .env, dejar ALLOWED_IPS vacío
ALLOWED_IPS=

# Reiniciar servidor
pm2 restart tradingview-api
```

**⚠️ ADVERTENCIA:** Esto reduce la seguridad al permitir acceso desde cualquier IP con la API key.

#### **Opción 3: Webhook para Auto-actualización (Avanzado)**
```javascript
// En tu servidor de e-commerce
const updateAPIWhitelist = async (newIP) => {
  // Llamar a un endpoint especial para actualizar whitelist
  await fetch('http://tu-api.com/admin/update-ip', {
    method: 'POST',
    headers: { 'X-Admin-Token': 'tu_token' },
    body: JSON.stringify({ newIP })
  });
};
```

## 🔧 ¿Cuál Opción Elegir?

### ✅ **Para Producción (Recomendado):**
- Mantén la validación por IP activada
- Actualiza la whitelist cuando cambie la IP
- Mayor seguridad con control de acceso

### ⚠️ **Para Desarrollo/Rápido Setup:**
- Desactiva validación por IP temporalmente
- Solo para testing, no para producción
- Menor seguridad, mayor conveniencia

## 📝 Script de Actualización Automática

Crea este script para facilitar actualizaciones:

```bash
#!/bin/bash
# update-ip.sh - Actualizar IP en whitelist

echo "🔄 Actualizando IP en whitelist..."

# Obtener IP actual
CURRENT_IP=$(curl -s https://api.ipify.org)
echo "📍 IP actual: $CURRENT_IP"

# Actualizar .env
sed -i "s/[0-9]\+\.[0-9]\+\.[0-9]\+\.[0-9]\+/$CURRENT_IP/" .env
echo "✅ .env actualizado"

# Reiniciar servidor
pm2 restart tradingview-api
echo "🔄 Servidor reiniciado"

echo "🎉 ¡IP actualizada correctamente!"
```

## 🔒 Recomendaciones de Seguridad

1. **Mantén validación por IP** siempre que sea posible
2. **Monitorea cambios de IP** regularmente
3. **Usa webhooks** para notificaciones de cambios
4. **Considera VPN** para IPs estáticas si es crítico
5. **Audita logs** de acceso por IP

## 📞 Contacto

Si necesitas ayuda con la configuración de IPs, contacta al administrador del sistema.
