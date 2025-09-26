import { useState } from 'react'
import { useApiHealth, useUserValidation, useSystemMetrics } from './hooks/useApi'
import TradingViewConnection from './components/TradingViewConnection'

function App() {
  const [testUsername, setTestUsername] = useState('testuser')
  const [tvCredentialsConfigured, setTvCredentialsConfigured] = useState(false)
  const { apiStatus, checkHealth } = useApiHealth()
  const { validationState, validateUser } = useUserValidation()
  const metrics = useSystemMetrics()

  const handleCredentialsSave = (credentials) => {
    // TODO: Enviar credenciales al backend
    console.log('Credenciales guardadas:', credentials);
    setTvCredentialsConfigured(true);
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'connected': return 'bg-green-600'
      case 'error': return 'bg-red-600'
      case 'checking': return 'bg-yellow-600'
      default: return 'bg-gray-600'
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'connected': return '✅'
      case 'error': return '❌'
      case 'checking': return '⏳'
      default: return '❓'
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="text-center">
          <h1 className="text-6xl font-bold bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent mb-4">
            TradingView Dashboard
          </h1>
          <p className="text-gray-400">🔗 Conectado con API Backend en tiempo real</p>
        </div>
        
        {/* Estado de Conexión con la API */}
        <div className="bg-gray-800 rounded-lg p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-semibold">Estado de Conexión API</h2>
            <button 
              onClick={checkHealth}
              className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              🔄 Verificar Conexión
            </button>
          </div>
          
          <div className={`${getStatusColor(apiStatus.status)} rounded-lg p-4 mb-4`}>
            <div className="flex items-center space-x-2">
              <span className="text-2xl">{getStatusIcon(apiStatus.status)}</span>
              <div>
                <h3 className="font-bold">API Backend: {apiStatus.status.toUpperCase()}</h3>
                <p className="text-sm opacity-90">
                  {apiStatus.status === 'connected' && apiStatus.data?.message}
                  {apiStatus.status === 'error' && `Error: ${apiStatus.error}`}
                  {apiStatus.status === 'checking' && 'Verificando conexión...'}
                </p>
                {apiStatus.lastCheck && (
                  <p className="text-xs opacity-75 mt-1">
                    Última verificación: {apiStatus.lastCheck}
                  </p>
                )}
              </div>
            </div>
          </div>

          {apiStatus.data && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div className="bg-gray-700 p-3 rounded">
                <p className="text-gray-400">Versión</p>
                <p className="font-semibold">{apiStatus.data.version}</p>
              </div>
              <div className="bg-gray-700 p-3 rounded">
                <p className="text-gray-400">Estado</p>
                <p className="font-semibold">{apiStatus.data.status}</p>
              </div>
              <div className="bg-gray-700 p-3 rounded">
                <p className="text-gray-400">Endpoints</p>
                <p className="font-semibold">{Object.keys(apiStatus.data.endpoints || {}).length}</p>
              </div>
              <div className="bg-gray-700 p-3 rounded">
                <p className="text-gray-400">Timestamp</p>
                <p className="font-semibold text-xs">{new Date(apiStatus.data.timestamp).toLocaleTimeString()}</p>
              </div>
            </div>
          )}
        </div>

        {/* Conexión TradingView */}
        <TradingViewConnection onCredentialsSave={handleCredentialsSave} />

        {/* Métricas del Sistema */}
        <div className="bg-gray-800 rounded-lg p-6 shadow-xl">
          <h2 className="text-2xl font-semibold mb-4">Métricas del Sistema</h2>
          
          {metrics.loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
              <span className="ml-3">Cargando métricas...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-600 rounded-lg p-4">
                <h3 className="font-bold">Requests Hoy</h3>
                <p className="text-2xl font-bold">{metrics.data?.requestsToday || 0}</p>
              </div>
              
              <div className="bg-purple-600 rounded-lg p-4">
                <h3 className="font-bold">Usuarios Activos</h3>
                <p className="text-2xl font-bold">{metrics.data?.usersActive || 0}</p>
              </div>
              
              <div className="bg-green-600 rounded-lg p-4">
                <h3 className="font-bold">Uptime</h3>
                <p className="text-lg font-bold">{metrics.data?.uptime || 'N/A'}</p>
              </div>
            </div>
          )}
        </div>

        {/* Prueba de Validación de Usuario */}
        <div className="bg-gray-800 rounded-lg p-6 shadow-xl">
          <h2 className="text-2xl font-semibold mb-4">🧪 Prueba de API - Validar Usuario</h2>
          
          <div className="flex space-x-3 mb-4">
            <input 
              type="text"
              value={testUsername}
              onChange={(e) => setTestUsername(e.target.value)}
              placeholder="Nombre de usuario"
              className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <button 
              onClick={() => validateUser(testUsername)}
              disabled={validationState.isValidating}
              className="bg-green-600 hover:bg-green-700 disabled:opacity-50 px-6 py-2 rounded-lg font-medium transition-colors"
            >
              {validationState.isValidating ? '⏳' : '🔍'} Validar
            </button>
          </div>

          {validationState.result && (
            <div className={`rounded-lg p-4 border ${
              validationState.result.validuser 
                ? 'bg-green-900 border-green-600' 
                : 'bg-red-900 border-red-600'
            }`}>
              {validationState.result.validuser ? (
                <p className="text-green-300">
                  ✅ Usuario válido: <strong>{validationState.result.verifiedUserName}</strong>
                </p>
              ) : (
                <p className="text-red-300">
                  ❌ Usuario inválido: <strong>"{testUsername}"</strong> no existe en TradingView
                </p>
              )}
            </div>
          )}

          {validationState.error && (
            <div className="bg-red-900 border border-red-600 rounded-lg p-4">
              <p className="text-red-300">❌ Error de conexión: {validationState.error}</p>
            </div>
          )}
        </div>

        <div className="text-center text-gray-400 text-sm">
          🚀 Dashboard conectado en tiempo real con TradingView Access Management API
        </div>
      </div>
    </div>
  )
}

export default App
