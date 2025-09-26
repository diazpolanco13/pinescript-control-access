# 🚀 TradingView Access Management - Node.js Edition

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.18+-blue.svg)](https://expressjs.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**API RESTful ultrarrápida para gestión masiva de acceso a scripts de TradingView**

> **Versión 2.0** - Optimizada para operaciones masivas con paralelización y rate limiting inteligente

## ⚡ Características Principales

- 🚀 **Rendimiento Extremo**: 5.96 operaciones/segundo (3x más rápido que Python)
- 📊 **Operaciones Masivas**: 25,000+ accesos en ~70 minutos
- 🛡️ **Rate Limiting Inteligente**: Evita bloqueos de TradingView
- 📝 **Logging Avanzado**: Seguimiento completo con Pino
- 🔒 **Seguridad**: Autenticación automática con TradingView
- 🎯 **API RESTful**: Endpoints intuitivos y bien documentados

## 📊 Rendimiento Probado

| Operación | Tiempo | Tasa de Éxito |
|-----------|--------|---------------|
| 35 usuarios × 1 indicador | 6 segundos | 100% |
| 35 usuarios × 25 indicadores | ~2 minutos | 95-100% |
| 1000 usuarios × 25 indicadores | ~70 minutos | 95-100% |

## 🏗️ Arquitectura

```
TradingView Access Management (Node.js)
├── src/
│   ├── server.js              # Servidor Express principal
│   ├── routes/                # Endpoints REST
│   │   ├── validate.js        # Validación de usuarios
│   │   └── access.js          # Gestión de accesos
│   ├── services/
│   │   └── tradingViewService.js # Lógica core TradingView
│   ├── utils/                 # Utilidades
│   │   ├── logger.js          # Sistema de logging
│   │   ├── dateHelper.js      # Manejo de fechas
│   │   └── sessionStorage.js  # Persistencia de sesiones
│   └── middleware/
│       └── rateLimit.js       # Control de rate limiting
├── config/                    # Configuración
├── scripts/                   # Scripts de testing
└── tests/                     # Tests automatizados
```

## 🚀 Inicio Rápido

### 1. Clonar e Instalar

```bash
git clone https://github.com/diazpolanco13/Tradingview-Access-Management-base.git
cd Tradingview-Access-Management-base
npm install
```

### 2. Configurar Variables de Entorno

```bash
cp env.example .env
# Editar .env con tus credenciales de TradingView
```

```env
# TradingView Credentials
TV_USERNAME=tu_usuario_tradingview
TV_PASSWORD=tu_password_tradingview

# Server Configuration
PORT=5000
NODE_ENV=development
```

### 3. Ejecutar

```bash
# Desarrollo
npm run dev

# Producción
npm start

# Tests
npm test

# Prueba de rendimiento masivo
npm run test:bulk
```

## 📡 API Endpoints

### Validación de Usuario
```http
GET /api/validate/:username
```

**Respuesta:**
```json
{
  "validuser": true,
  "verifiedUserName": "Trendoscope"
}
```

### Consulta de Acceso
```http
GET /api/access/:username
```

**Body:**
```json
{
  "pine_ids": ["PUB;your_pine_id"]
}
```

### Conceder Acceso
```http
POST /api/access/:username
```

**Body:**
```json
{
  "pine_ids": ["PUB;your_pine_id"],
  "duration": "7D"
}
```

### Remover Acceso
```http
DELETE /api/access/:username
```

### Acceso Masivo (⭐ Feature Premium)
```http
POST /api/access/bulk
```

**Body:**
```json
{
  "users": ["user1", "user2", "user3"],
  "pine_ids": ["PUB;id1", "PUB;id2"],
  "duration": "7D",
  "options": {
    "batchSize": 10,
    "delayMs": 200
  }
}
```

## 🧪 Testing y Ejemplos

### Prueba Básica
```bash
# Validar usuario
curl "http://localhost:5000/api/validate/trendoscope"

# Conceder acceso
curl -X POST "http://localhost:5000/api/access/trendoscope" \
  -H "Content-Type: application/json" \
  -d '{"pine_ids": ["PUB;ebd861d70a9f478bb06fe60c5d8f469c"], "duration": "7D"}'
```

### Prueba de Rendimiento Masivo
```bash
npm run test:bulk
```

## ⚙️ Configuración

### Variables de Entorno

| Variable | Descripción | Default |
|----------|-------------|---------|
| `TV_USERNAME` | Usuario de TradingView | - |
| `TV_PASSWORD` | Password de TradingView | - |
| `PORT` | Puerto del servidor | 5000 |
| `NODE_ENV` | Entorno | development |
| `BULK_BATCH_SIZE` | Tamaño de lotes para operaciones masivas | 10 |
| `BULK_DELAY_MS` | Delay entre lotes (ms) | 100 |

### Rate Limiting

- **API General**: 100 requests/15min
- **Operaciones Bulk**: 5 requests/min
- **TradingView**: 30 requests/min

## 🔧 Desarrollo

### Scripts Disponibles

```bash
npm run dev          # Desarrollo con hot reload
npm start           # Producción
npm test            # Ejecutar tests
npm run test:bulk   # Prueba de rendimiento masivo
npm run lint        # Verificar código
npm run lint:fix    # Corregir código
```

### Estructura de Logs

```
[INFO] Starting bulk grant-access operation
[INFO] Processing batch 1/7 (batchSize: 5)
[INFO] Bulk grant-access progress: 5/35 (14%)
[SUCCESS] Bulk grant-access completed (35/35 successful, 100% rate)
```

## 🚀 Despliegue

### Docker (Opcional)

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 5000
CMD ["npm", "start"]
```

### PM2 (Producción)

```bash
npm install -g pm2
pm2 start src/server.js --name "tv-access-api"
pm2 save
pm2 startup
```

## 📊 Monitoreo y Métricas

- **Logs en tiempo real** con Pino
- **Métricas de rendimiento** por operación
- **Rate limiting** automático
- **Health checks** integrados

## 🛡️ Seguridad

- ✅ **Variables de entorno** para credenciales
- ✅ **Rate limiting** anti-abuso
- ✅ **Helmet.js** para headers seguros
- ✅ **CORS** configurado
- ✅ **Validación de input** en todos los endpoints

## 📈 Casos de Uso

### 💼 SaaS de Indicadores
- Venta de acceso temporal a indicadores premium
- Gestión automática de suscripciones
- Control de expiración por pagos

### 🏢 Plataformas Empresariales
- Distribución interna de indicadores
- Control de acceso por equipos/departamentos
- Auditoría de uso de recursos

### 🏪 Ecommerce Integration
- Integración perfecta con plataformas Node.js/React
- API RESTful para gestión de accesos
- Operaciones masivas para promociones

## 🐛 Troubleshooting

### Error: "Cannot access 'duration' before initialization"
- ✅ **Solucionado** en v2.0.0 - variable renombrada correctamente

### Rate Limit Exceeded
- **Solución**: Reducir `BULK_BATCH_SIZE` o aumentar `BULK_DELAY_MS`

### Session Expired
- **Solución**: Reiniciar servidor - login automático se ejecuta nuevamente

## 📝 Changelog

### v2.0.0 - Node.js Edition (2025-09-26)
- ✅ **Migración completa** de Python a Node.js
- ✅ **Paralelización masiva** con Promise.all()
- ✅ **Rendimiento 3x superior**: 5.96 ops/seg
- ✅ **Rate limiting inteligente**
- ✅ **Logging avanzado** con Pino
- ✅ **Tests exhaustivos** con usuarios reales
- ✅ **API optimizada** para operaciones bulk

### v1.0.0 - Python Edition
- ✅ API RESTful básica
- ✅ Autenticación TradingView
- ✅ Gestión de accesos individual
- ✅ ~2-3 ops/seg de rendimiento

## 🤝 Contribuir

1. Fork el proyecto
2. Crear rama feature (`git checkout -b feature/amazing-feature`)
3. Commit cambios (`git commit -m 'Add amazing feature'`)
4. Push a la rama (`git push origin feature/amazing-feature`)
5. Abrir Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para más detalles.

## 🙏 Agradecimientos

- TradingView por su excelente plataforma
- Comunidad Node.js por las herramientas increíbles
- Todos los traders que hacen que esto sea posible

---

**⭐ Si te gusta este proyecto, dale una estrella en GitHub!**

**📧 Contacto**: diazpolanco13@github.com
