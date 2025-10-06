# 🔐 Obtener Token de Administrador

Cuando el servidor está corriendo con PM2, los logs de la consola no son visibles. Aquí tienes **3 formas** de obtener el token de administrador:

## 🚀 Método 1: Comando NPM (Recomendado)

```bash
npm run get-token
```

Este comando ejecuta un script que lee el token desde el archivo guardado automáticamente.

## 🌐 Método 2: Endpoint HTTP (Desde localhost)

```bash
curl http://localhost:5001/admin-token
```

O abre en tu navegador: `http://localhost:5001/admin-token`

**Nota:** Solo funciona desde localhost por seguridad.

## 📄 Método 3: Archivo Directo

El token se guarda automáticamente en el archivo `admin-token.txt` en la raíz del proyecto:

```bash
cat admin-token.txt
```

## 🔄 ¿Qué sucede cuando reinicias el servidor?

- El token **cambia automáticamente** cada vez que reinicias
- Se **guarda en el archivo** `admin-token.txt`
- Se **muestra en la consola** (si no usas PM2)
- Está disponible via **endpoint** `/admin-token`

## 🎯 Usar el token

Una vez obtenido el token, úsalo para acceder al panel de administración:

1. Ve a: `http://185.218.124.241:5001/admin`
2. Pega el token en el campo "Token de Administrador"
3. Haz clic en "Acceder al Panel"

## 🔒 Seguridad

- El endpoint `/admin-token` solo funciona desde localhost
- El token cambia en cada reinicio del servidor
- Nunca compartas el token por canales inseguros

## ❓ Problemas comunes

**"Archivo no encontrado"**
- El servidor no está ejecutándose
- Verifica con: `pm2 list`

**"Endpoint no accesible"**
- Asegúrate de estar en localhost
- El servidor debe estar corriendo en puerto 5001

**"Token inválido"**
- El token cambia al reiniciar
- Obtén uno nuevo con cualquiera de los métodos anteriores
