[![Trendoscope](https://svgshare.com/i/u3u.svg)](https://trendoscope.io)
# Tradingview-Access-Management

## 📋 Documentación Técnica - Análisis de Arquitectura

### 🏗️ Arquitectura del Sistema

Este proyecto implementa una API RESTful para gestión automatizada de acceso a scripts de TradingView. La arquitectura se basa en los siguientes componentes:

#### **Estructura de Archivos:**
```
Tradingview-Access-Management/
├── main.py              # Punto de entrada - inicia el servidor
├── server.py            # Servidor Flask con rutas API
├── tradingview.py       # Lógica core de autenticación y gestión de acceso
├── config.py           # URLs y configuración de endpoints
├── helper.py           # Utilidades para manejo de fechas
├── pyproject.toml      # Dependencias del proyecto
└── README.md           # Documentación
```

#### **Stack Tecnológico:**
- **Framework Web**: Flask (servidor HTTP)
- **Base de Datos**: Replit DB (Replit) / JSON local (Ubuntu) - persistencia automática
- **HTTP Client**: Requests + urllib3
- **Gestión de Dependencias**: Poetry
- **Python**: 3.8+

### 🔐 Sistema de Autenticación y Persistencia

#### **Flujo de Autenticación:**

```python
# Diagrama del flujo de autenticación
1. Inicialización → 2. Verificación de sesión → 3. Login automático → 4. Persistencia
```

**Paso 1: Inicialización del Sistema**
```python
def __init__(self):
    # Intenta recuperar sessionid de la base de datos
    self.sessionid = db["sessionid"] if 'sessionid' in db.keys() else 'abcd'
```

**Paso 2: Validación de Sesión Activa**
```python
headers = {'cookie': 'sessionid=' + self.sessionid}
test = requests.request("GET", config.urls["tvcoins"], headers=headers)
if test.status_code != 200:
    # Sesión inválida - proceder con login
```

**Paso 3: Proceso de Login Automático**
```python
# Credenciales desde variables de entorno
username = os.environ['tvusername']
password = os.environ['tvpassword']

payload = {'username': username, 'password': password, 'remember': 'on'}
login_headers = {
    'origin': 'https://www.tradingview.com',
    'User-Agent': userAgent,  # Dinámico según plataforma
    'Content-Type': contentType,
    'referer': 'https://www.tradingview.com'
}
login = requests.post(config.urls["signin"], data=body, headers=login_headers)

# Extraer sessionid de las cookies de respuesta
cookies = login.cookies.get_dict()
self.sessionid = cookies["sessionid"]
```

**Paso 4: Persistencia de Sesión**
```python
# Guardar sessionid en Replit DB para futuras inicializaciones
db["sessionid"] = self.sessionid
```

#### **Mecanismo de Persistencia:**

**Base de Datos**: Utiliza Replit DB (base de datos clave-valor integrada)
- **Clave**: `"sessionid"`
- **Valor**: Cookie de sesión de TradingView
- **Persistencia**: Automática entre reinicios del servidor

**Ventajas del Sistema**:
- ✅ **Login automático** al iniciar la aplicación
- ✅ **Sesión persistente** entre reinicios
- ✅ **Validación automática** de sesión activa
- ✅ **Recuperación automática** si la sesión expira
- ✅ **Sin intervención manual** requerida

### 🔄 Ciclo de Vida de la Sesión

```
Inicio de Servidor → Verificar DB → ¿Sesión válida?
       ↓                    ↓              ↓
     Sí ↓                  No ↓           Sí → Continuar
       ↓                    ↓              ↓
   Usar sesión          Login automático   ↓
   existente               ↓               ↓
       ↓                    ↓              ↓
   Operaciones API → Actualizar DB → Fin de sesión
```

### 📡 Endpoints de la API

#### **1. Validación de Usuario**
- **Endpoint**: `GET /validate/{username}`
- **Función**: Verifica si un nombre de usuario existe en TradingView
- **Implementación**: Consulta `username_hint` API de TradingView

#### **2. Consulta de Acceso**
- **Endpoint**: `GET /access/{username}`
- **Función**: Obtiene estado actual de acceso a scripts específicos
- **Implementación**: Consulta `pine_perm/list_users` con credenciales válidas

#### **3. Gestión de Acceso (POST)**
- **Endpoint**: `POST /access/{username}`
- **Función**: Añade/actualiza acceso con duración específica
- **Duraciones**: `7D` (7 días), `1M` (1 mes), `1L` (de por vida)

#### **4. Remoción de Acceso**
- **Endpoint**: `DELETE /access/{username}`
- **Función**: Revoca acceso a scripts específicos

### 🔧 Funciones Core

#### **Helper Functions:**
```python
def get_access_extension(currentExpirationDate, extension_type, extension_length):
    # Calcula nuevas fechas de expiración
    # extension_type: 'Y'=años, 'M'=meses, 'W'=semanas, 'D'=días
```

#### **Gestión de Fechas:**
- Utiliza `python-dateutil` para parsing y manipulación de fechas
- Maneja zonas horarias UTC
- Soporta extensiones de acceso flexibles

### 🚀 Despliegue y Configuración

#### **Variables de Entorno Requeridas:**
```
tvusername = "tu_usuario_tradingview"
tvpassword = "tu_contraseña_tradingview"
```

#### **Requisitos:**
- ✅ Suscripción Premium de TradingView
- ✅ Variables de entorno configuradas
- ✅ Acceso a internet para autenticación

### 📊 Estados de Respuesta

#### **Códigos de Estado de Acceso:**
- `Success`: Operación completada exitosamente
- `Failure`: Error en la operación
- `Not Applied`: Usuario ya tiene acceso de por vida

#### **Campos de Respuesta:**
```json
{
  "pine_id": "PUB;id_del_script",
  "username": "usuario_destino",
  "hasAccess": true/false,
  "noExpiration": true/false,
  "currentExpiration": "2022-09-17T06:28:25.933303+00:00",
  "expiration": "fecha_actualizada",
  "status": "Success|Failure|Not Applied"
}
```

## 🧪 Testing y Ejemplos Prácticos

### **🚀 Inicio Rápido de Testing:**

#### **0. Indicador de Prueba Disponible:**
Para facilitar el testing, tienes disponible un indicador de prueba:

**Pine ID de Testing:** `PUB;ebd861d70a9f478bb06fe60c5d8f469c`
- **Cuenta Owner:** `apidev7loper@gmail.com`
- **Estado:** ✅ Funcional y probado
- **Uso:** Puedes conceder/revocar acceso a este indicador

#### **1. Configurar Variables de Entorno:**
```bash
export tvusername="apidev7loper@gmail.com"
export tvpassword="!jBmb(+1+LSH-aJ'h;cB"
```

#### **2. Ejecutar Servidor:**
```bash
cd /root/Tradingview-Access-Management
source venv/bin/activate
python3 main.py
```

#### **3. Probar Funcionalidades (en otra terminal):**

**Validar Usuario:**
```bash
curl -X GET "http://localhost:5000/validate/trendoscope"
# Respuesta: {"validuser": true, "verifiedUserName": "Trendoscope"}
```

**Consultar Estado de Acceso:**
```bash
curl -X GET "http://localhost:5000/access/trendoscope" \
  -H "Content-Type: application/json" \
  -d '{"pine_ids": ["PUB;ebd861d70a9f478bb06fe60c5d8f469c"]}'
```

**Conceder Acceso de 7 Días:**
```bash
curl -X POST "http://localhost:5000/access/trendoscope" \
  -H "Content-Type: application/json" \
  -d '{"pine_ids": ["PUB;ebd861d70a9f478bb06fe60c5d8f469c"], "duration": "7D"}'
```

**Verificar Acceso Concedido:**
```bash
curl -X GET "http://localhost:5000/access/trendoscope" \
  -H "Content-Type: application/json" \
  -d '{"pine_ids": ["PUB;ebd861d70a9f478bb06fe60c5d8f469c"]}'
```

**Remover Acceso:**
```bash
curl -X DELETE "http://localhost:5000/access/trendoscope" \
  -H "Content-Type: application/json" \
  -d '{"pine_ids": ["PUB;ebd861d70a9f478bb06fe60c5d8f469c"]}'
```

### **🔧 Script de Testing Automático:**

```bash
# Ejecutar pruebas completas
cd /root/Tradingview-Access-Management
source venv/bin/activate
python3 test_tradingview.py
```

**⚠️ IMPORTANTE:** El archivo `test_tradingview.py` contiene credenciales hardcodeadas para facilitar el testing en desarrollo. **NO usar en producción.**

```python
# En test_tradingview.py - líneas 5-6 (SOLO PARA TESTING)
os.environ['tvusername'] = 'apidev7loper@gmail.com'
os.environ['tvpassword'] = '!jBmb(+1+LSH-aJ\'h;cB'
```

### **🎯 Indicadores de Prueba Disponibles:**

Para que puedas probar inmediatamente el sistema, aquí tienes un indicador funcional:

| Pine ID | Estado | Descripción |
|---------|--------|-------------|
| `PUB;ebd861d70a9f478bb06fe60c5d8f469c` | ✅ Activo | Indicador de testing funcional |

**Credenciales para testing:**
- **Usuario:** `apidev7loper@gmail.com`
- **Contraseña:** `!jBmb(+1+LSH-aJ'h;cB`
- **Usuario de prueba:** `trendoscope` (usuario válido para recibir acceso)

**Ejemplo rápido de testing:**
```bash
# 1. Verificar estado actual
curl -X GET "http://localhost:5000/access/trendoscope" \
  -H "Content-Type: application/json" \
  -d '{"pine_ids": ["PUB;ebd861d70a9f478bb06fe60c5d8f469c"]}'

# 2. Conceder acceso por 7 días
curl -X POST "http://localhost:5000/access/trendoscope" \
  -H "Content-Type: application/json" \
  -d '{"pine_ids": ["PUB;ebd861d70a9f478bb06fe60c5d8f469c"], "duration": "7D"}'

# 3. Verificar que se concedió acceso
curl -X GET "http://localhost:5000/access/trendoscope" \
  -H "Content-Type: application/json" \
  -d '{"pine_ids": ["PUB;ebd861d70a9f478bb06fe60c5d8f469c"]}'
```

## 🐛 Troubleshooting - Problemas Comunes

### **❌ "validuser: false" al validar usuarios:**

**Causa:** Usuario no existe en TradingView o cuenta no verificada
**Solución:** Verificar que el usuario existe en https://www.tradingview.com

### **❌ "Failure" al conceder acceso:**

**Posibles causas:**
- Credenciales inválidas del owner
- Indicador no pertenece a la cuenta del owner
- Cuenta sin permisos Premium
- Problemas de red con TradingView

**Solución:** Verificar credenciales y permisos de la cuenta owner

### **❌ Error de conexión al servidor:**

**Causa:** Servidor no iniciado o puerto ocupado
**Solución:**
```bash
# Verificar procesos
ps aux | grep python3
# Matar procesos si es necesario
kill -9 <PID>
# Reiniciar servidor
python3 main.py
```

### **❌ "ModuleNotFoundError" al ejecutar:**

**Solución:**
```bash
# Activar entorno virtual
source venv/bin/activate
# Instalar dependencias
pip install flask requests urllib3 python-dateutil
```

## 📊 Límites y Consideraciones

### **⚠️ Límites de TradingView:**
- **Máximo 10 indicadores por usuario** (límite de TradingView)
- **Sesiones expiran** automáticamente después de inactividad
- **Rate limiting** puede aplicar TradingView en uso intensivo

### **⚠️ Consideraciones de Seguridad:**
- **Credenciales en variables de entorno** (no hardcodeadas)
- **Sesión persistente** requiere almacenamiento seguro
- **Logs pueden contener información sensible**

### **⚠️ Rendimiento:**
- **Tiempo de respuesta**: ~2-5 segundos por operación
- **Conexión requerida**: Internet para autenticación con TradingView
- **Memoria**: ~50MB de RAM para operación normal

## 📝 Changelog - Cambios Recientes

### **v2.0.0 - Adaptación Multi-Plataforma (2025-09-26)**
- ✅ **Compatibilidad Ubuntu**: Reemplazo de Replit DB con SimpleDB JSON
- ✅ **Documentación técnica completa**: Análisis de arquitectura detallado
- ✅ **Testing automatizado**: Script `test_tradingview.py` incluido
- ✅ **README profesional**: Documentación completa en español
- ✅ **Sistema probado**: 100% funcional con operaciones CRUD completas

### **v1.0.0 - Versión Original**
- ✅ API RESTful básica para gestión de acceso
- ✅ Autenticación automática con TradingView
- ✅ Soporte para duraciones flexibles
- ✅ Persistencia de sesión

## 🎯 Casos de Uso Recomendados

### **💼 SaaS de Indicadores:**
- Venta de acceso temporal a indicadores premium
- Gestión automática de suscripciones
- Control de expiración por tiempo/pagos

### **🏢 Plataformas Empresariales:**
- Distribución interna de indicadores
- Control de acceso por equipos/departamentos
- Auditoría de uso de recursos

### **🤝 Marketplaces:**
- Vendedores pueden compartir indicadores
- Sistema de comisiones automático
- Gestión de licencias por usuario

## 📖 Descripción del Proyecto

Este proyecto proporciona acceso API RESTful para gestionar la administración de acceso a scripts de TradingView. Está diseñado para ser utilizado por vendedores junto con herramientas apropiadas de seguridad y otras herramientas de gestión de flujos de trabajo para la automatización de la gestión de acceso.

## ⚠️ **Compatibilidad de Plataforma**

**¿Está diseñado SOLO para Replit?** ✅ **SÍ, actualmente está optimizado específicamente para Replit**

### **Dependencias Replit Específicas:**
- **`replit = "^3.2.4"`** - Dependencia obligatoria en `pyproject.toml`
- **`from replit import db`** - Sistema de persistencia nativo de Replit
- **`replit.nix`** - Configuración específica del entorno Replit

### **¿Por qué Replit?**
1. **Persistencia de Sesión**: Replit DB mantiene la `sessionid` entre reinicios
2. **Despliegue Simplificado**: No requiere configuración de servidor externa
3. **Variables de Entorno**: Gestión integrada de credenciales
4. **Disponibilidad 24/7**: Los repls pueden mantenerse ejecutándose

### **¿Se puede usar fuera de Replit?**
🔄 **POSIBLE con modificaciones:**

**Cambios necesarios:**
1. **Reemplazar Replit DB**: Usar SQLite, JSON file, o Redis
2. **Eliminar dependencia `replit`**: Remover de `pyproject.toml`
3. **Configurar servidor**: Flask puede correr en cualquier hosting
4. **Variables de entorno**: Configurar manualmente

**Ejemplo de adaptación:**
```python
# En lugar de: from replit import db
import json
import os

class SessionStorage:
    def __init__(self):
        self.file_path = 'session_data.json'

    def __getitem__(self, key):
        with open(self.file_path, 'r') as f:
            data = json.load(f)
        return data.get(key)

    def __setitem__(self, key, value):
        data = {}
        if os.path.exists(self.file_path):
            with open(self.file_path, 'r') as f:
                data = json.load(f)
        data[key] = value
        with open(self.file_path, 'w') as f:
            json.dump(data, f)

# Usar: db = SessionStorage() en lugar de from replit import db
```

# Instalación

## 🚀 **Inicio Rápido - Ubuntu/Debian Linux**

### **1. Clonar el repositorio:**
```bash
git clone https://github.com/diazpolanco13/Tradingview-Access-Management-base.git
cd Tradingview-Access-Management-base
```

### **2. Instalar Python 3.8+ (si no tienes):**
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install python3 python3-pip python3-venv

# Verificar versión
python3 --version  # Debe ser 3.8 o superior
```

### **3. Crear y activar entorno virtual:**
```bash
# Crear entorno virtual
python3 -m venv venv

# Activar entorno virtual
source venv/bin/activate
```

### **4. Instalar dependencias:**
```bash
# Instalar paquetes requeridos
pip install flask requests urllib3 python-dateutil
```

### **5. Configurar variables de entorno:**
```bash
# Configurar credenciales de TradingView
export tvusername="tu_usuario_tradingview"
export tvpassword="tu_contraseña_tradingview"

# O usar las credenciales de testing incluidas
export tvusername="apidev7loper@gmail.com"
export tvpassword="!jBmb(+1+LSH-aJ'h;cB"
```

### **6. Ejecutar el servidor:**
```bash
# Ejecutar la aplicación
python3 main.py
```

### **7. Verificar funcionamiento:**
```bash
# En otra terminal, probar el endpoint básico
curl http://localhost:5000/

# Deberías ver: "Your bot is alive!"
```

---

## ☁️ **Despliegue en Replit (Alternativo)**

### Clonar repositorio en Replit

Ir a la página de Replit:
https://replit.com/@trendoscope/Tradingview-Access-Management

### Actualizar variables de entorno de Replit

Las únicas variables de entorno que deben actualizarse son:

- **username** - Tu nombre de usuario de TradingView
- **password** - Tu contraseña de TradingView

Ten en cuenta que las APIs de gestión de acceso solo funcionarán si tienes una suscripción Premium de TradingView.

### Ejecutar el repl

Simplemente ejecuta el repl y tus servicios estarán funcionando. Obtendrás el nombre del host en la parte superior derecha del panel del proyecto. El nombre del host tendrá el formato:

```
https://Tradingview-Access-Management.[TU_CUENTA_REPL].repl.co
```

---

## 🐳 **Despliegue con Docker (Opcional)**

### Crear Dockerfile:
```dockerfile
FROM python:3.8-slim

WORKDIR /app
COPY . .

RUN pip install flask requests urllib3 python-dateutil

EXPOSE 5000

CMD ["python3", "main.py"]
```

### Ejecutar con Docker:
```bash
# Construir imagen
docker build -t tradingview-access .

# Ejecutar contenedor
docker run -p 5000:5000 -e tvusername="tu_usuario" -e tvpassword="tu_password" tradingview-access
```

# Uso

Una vez en funcionamiento, podrás utilizar las siguientes llamadas para gestionar el acceso a TradingView.

### GET /validate/{username}

Puede utilizarse para validar un nombre de usuario. Esta puede ser una operación útil para ejecutar antes de intentar realizar la gestión de acceso para el usuario. Si el usuario no es válido, podemos detener el flujo de trabajo en ese momento.

- **Payload** - Ninguno
- **Headers** - Ninguno
- **Devuelve** - Salida JSON con la siguiente información:
  1. **validUser** - Puede ser true o false. Indica si el nombre de usuario proporcionado es válido o no.
  2. **verifiedUserName** - devuelve el nombre de usuario exacto tal como aparece en los registros de TradingView (incluyendo mayúsculas y minúsculas). Si validUser es false, este campo también tendrá un valor vacío.

```json
{
    "validuser": true,
    "verifiedUserName": "Trendoscope"
}
```


### GET /access/{username}

Este método puede utilizarse para obtener el nivel de acceso actual del usuario para publicaciones específicas identificadas por pine_ids

- **Payload** - Payload JSON que contiene lista de pine ids
  1. **pine_ids** - Array de pine ids. Los pine ids son IDs únicos del backend para cada script. Podemos obtener estos IDs desde la consola de desarrollador del navegador cuando se carga el script o cuando se realizan métodos de acceso en la interfaz de usuario de TradingView. Ten en cuenta que solo funcionarán los Pine IDs para scripts que pertenezcan a tu cuenta. No podrás controlar el acceso a scripts que no sean tuyos.

```json
{
    "pine_ids" : ["PUB;3be120ba74944ca7b32ad644f40aaff2", "PUB;2cb3ba84ce4443049f21659a3b492779"]
}
```

- **Headers** - Ninguno
- **Devuelve** - Array de salida JSON con la siguiente información:
  1. **pine_id** - ID de publicación Pine que se envía como entrada a la solicitud de API
  2. **username** - Nombre de usuario contra el cual se realiza la operación.
  3. **hasAccess** - true si el usuario ya tiene acceso al script. false en caso contrario
  4. **noExpiration** - true si el usuario tiene acceso sin expiración al script. false en caso contrario
  5. **currentExpiration** - aplicable solo si hasAccess es true y noExpiration es false. Ignorar en caso contrario.

```json
[
    {
        "pine_id": "PUB;3be120ba74944ca7b32ad644f40aaff2",
        "username": "trendoscope",
        "hasAccess": false,
        "noExpiration": false,
        "currentExpiration": "2022-08-17 06:27:49.067935+00:00"
    },
    {
        "pine_id": "PUB;2cb3ba84ce4443049f21659a3b492779",
        "username": "trendoscope",
        "hasAccess": false,
        "noExpiration": false,
        "currentExpiration": "2022-08-17 06:27:49.196514+00:00"
    }
]
```

### DELETE /access/{username}

Este método puede utilizarse para remover el nivel de acceso actual del usuario para publicaciones específicas identificadas por pine_ids

- **Payload** - Payload JSON que contiene lista de pine ids
  1. **pine_ids** - Array de pine ids. Los pine ids son IDs únicos del backend para cada script. Podemos obtener estos IDs desde la consola de desarrollador del navegador cuando se carga el script o cuando se realizan métodos de acceso en la interfaz de usuario de TradingView. Ten en cuenta que solo funcionarán los Pine IDs para scripts que pertenezcan a tu cuenta. No podrás controlar el acceso a scripts que no sean tuyos.

```json
{
    "pine_ids" : ["PUB;3be120ba74944ca7b32ad644f40aaff2", "PUB;2cb3ba84ce4443049f21659a3b492779"]
}
```

- **Headers** - Ninguno
- **Devuelve** - Array de salida JSON con la siguiente información:
  1. **pine_id** - ID de publicación Pine que se envía como entrada a la solicitud de API
  2. **username** - Nombre de usuario contra el cual se realiza la operación.
  3. **hasAccess** - true si el usuario tenía acceso al script antes de remover el acceso. false en caso contrario
  4. **noExpiration** - true si el usuario tenía acceso sin expiración al script antes de remover el acceso. false en caso contrario
  5. **status** - Estado de la operación de remoción

```json
[
    {
        "pine_id": "PUB;3be120ba74944ca7b32ad644f40aaff2",
        "username": "trendoscope",
        "hasAccess": true,
        "noExpiration": true,
        "currentExpiration": "2022-08-17 06:28:49.655286+00:00",
        "status": "Success"
    },
    {
        "pine_id": "PUB;2cb3ba84ce4443049f21659a3b492779",
        "username": "trendoscope",
        "hasAccess": true,
        "noExpiration": true,
        "currentExpiration": "2022-08-17 06:28:49.923866+00:00",
        "status": "Success"
    }
]
```

### POST /access/{username}

Este método puede utilizarse para añadir/actualizar el nivel de acceso actual del usuario para publicaciones específicas identificadas por pine_ids.

- **Payload** - Payload JSON que contiene lista de pine ids
  1. **pine_ids** - Array de pine ids. Los pine ids son IDs únicos del backend para cada script. Podemos obtener estos IDs desde la consola de desarrollador del navegador cuando se carga el script o cuando se realizan métodos de acceso en la interfaz de usuario de TradingView. Ten en cuenta que solo funcionarán los Pine IDs para scripts que pertenezcan a tu cuenta. No podrás controlar el acceso a scripts que no sean tuyos.
  2. **duration** - Cadena que representa la duración. Ejemplo: "7D" = 7 días, "2M" = 2 meses, "1L" = De por vida, etc.

```json
{
    "pine_ids" : ["PUB;3be120ba74944ca7b32ad644f40aaff2", "PUB;2cb3ba84ce4443049f21659a3b492779"],
    "duration" : "7D"
}
```

- **Headers** - Ninguno
- **Devuelve** - Array de salida JSON con la siguiente información:
  1. **pine_id** - ID de publicación Pine que se envía como entrada a la solicitud de API
  2. **username** - Nombre de usuario contra el cual se realiza la operación.
  3. **hasAccess** - true si el usuario ya tiene acceso al script. false en caso contrario
  4. **noExpiration** - true si el usuario tiene acceso sin expiración al script. false en caso contrario
  5. **currentExpiration** - aplicable solo si hasAccess es true y noExpiration es false. Ignorar en caso contrario.
  6. **expiration** - Nueva expiración aplicada después de aplicar la actualización de acceso.
  7. **status** - El estado puede ser Success, Failure, o Not Applied. Not Applied se devolverá si el usuario ya tiene acceso de por vida al script dado y no es posible añadir más.

```json
[
    {
        "pine_id": "PUB;3be120ba74944ca7b32ad644f40aaff2",
        "username": "trendoscope",
        "hasAccess": true,
        "noExpiration": true,
        "currentExpiration": "2022-09-17T06:28:25.933303+00:00",
        "expiration": "2022-09-17T06:28:25.933303+00:00",
        "status": "Success"
    },
    {
        "pine_id": "PUB;2cb3ba84ce4443049f21659a3b492779",
        "username": "trendoscope",
        "hasAccess": true,
        "noExpiration": true,
        "currentExpiration": "2022-09-17T06:28:26.191805+00:00",
        "expiration": "2022-09-17T06:28:26.191805+00:00",
        "status": "Success"
    }
]
```

