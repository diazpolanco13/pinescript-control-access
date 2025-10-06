# 🔐 Obtener Token de Administrador

Cuando el servidor está corriendo con PM2, los logs de la consola no son visibles. Aquí tienes **4 formas** de obtener el token de administrador:

## 🌐 Método 1: Endpoint Remoto con X-API-Key (⭐ NUEVO - Acceso desde cualquier lugar)

```bash
curl -H "X-API-Key: your_api_key" http://185.218.124.241:5001/admin/get-token
```

**Ventajas:**
- ✅ Accesible desde **cualquier lugar** (no solo localhost)
- ✅ Seguro (requiere tu X-API-Key del e-commerce)
- ✅ Funciona desde móvil, laptop, tablet
- ✅ Mismo API Key que ya usas para bulk operations

**Respuesta:**
```json
{
  "success": true,
  "token": "abc123def456...",
  "message": "Token admin obtenido exitosamente",
  "usage": "Usa este token con X-Admin-Token header o en el panel /admin",
  "expiresOn": "Cambia cada vez que se reinicia el servidor"
}
```

## 🚀 Método 2: Comando NPM (Local)

```bash
npm run get-token
```

Este comando ejecuta un script que lee el token desde el archivo guardado automáticamente.

## 🌐 Método 3: Endpoint HTTP Local (Solo localhost)

```bash
curl http://localhost:5001/admin-token
```

O abre en tu navegador: `http://localhost:5001/admin-token`

**Nota:** Solo funciona desde localhost por seguridad. Si estás en la calle, usa el Método 1 con X-API-Key.

## 📄 Método 4: Archivo Directo (Requiere acceso al servidor)

El token se guarda automáticamente en el archivo `admin-token.txt` en la raíz del proyecto:

```bash
cat admin-token.txt
```

## 🔄 ¿Qué sucede cuando reinicias el servidor?

- El token **cambia automáticamente** cada vez que reinicias
- Se **guarda en el archivo** `admin-token.txt`
- Se **muestra en la consola** (si no usas PM2)
- Está disponible via **endpoints**: `/admin-token` (localhost) y `/admin/get-token` (remoto)

## 🎯 Usar el token

Una vez obtenido el token, úsalo para acceder al panel de administración:

1. Ve a: `http://185.218.124.241:5001/admin`
2. Pega el token en el campo "Token de Administrador"
3. Haz clic en "Acceder al Panel"

## 🔒 Seguridad

- `/admin-token` solo funciona desde localhost por seguridad
- `/admin/get-token` requiere X-API-Key válida (seguro para acceso remoto)
- El token cambia en cada reinicio del servidor
- Nunca compartas el token ni la X-API-Key por canales inseguros

## 🌍 Acceso Remoto (Desde la Calle)

Si estás fuera de casa/oficina y necesitas acceder al panel:

```bash
# Paso 1: Obtener token con tu X-API-Key
TOKEN=$(curl -s -H "X-API-Key: your_api_key" \
  http://185.218.124.241:5001/admin/get-token | jq -r '.token')

# Paso 2: Abrir navegador
open http://185.218.124.241:5001/admin

# Paso 3: Pegar el token obtenido
```

O simplemente desde tu móvil:
1. Usa Postman/Thunder Client/curl para llamar `/admin/get-token`
2. Copia el token de la respuesta
3. Abre el navegador en `/admin`
4. Pega el token

## ❓ Problemas comunes

**"Archivo no encontrado"**
- El servidor no está ejecutándose
- Verifica con: `pm2 list`

**"Endpoint /admin-token no accesible desde fuera"**
- ✅ **SOLUCIÓN:** Usa `/admin/get-token` con X-API-Key
- Este endpoint SÍ funciona remotamente

**"Token inválido"**
- El token cambia al reiniciar
- Obtén uno nuevo con cualquiera de los 4 métodos

**"Estoy en la calle y necesito acceso"**
- ✅ **SOLUCIÓN:** Usa el Método 1 con X-API-Key
- Funciona desde cualquier lugar con internet

**"No tengo la X-API-Key"**
- Busca en tu archivo `.env`: `ECOMMERCE_API_KEY`
- O consulta con el administrador del sistema
