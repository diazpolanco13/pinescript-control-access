import { useState } from 'react';
import { apiService } from '../services/api';

const TradingViewConnection = ({ onCredentialsSave }) => {
  const [credentials, setCredentials] = useState({
    username: '',
    password: ''
  });
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionResult, setConnectionResult] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCredentials(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const testConnection = async () => {
    if (!credentials.username || !credentials.password) {
      setConnectionResult({
        success: false,
        message: 'Por favor ingresa usuario y contraseña'
      });
      return;
    }

    setIsTestingConnection(true);
    setConnectionResult(null);

    try {
      const result = await apiService.testTradingViewCredentials(
        credentials.username, 
        credentials.password
      );
      
      if (result.success) {
        setConnectionResult({
          success: true,
          message: result.data.message,
          accountInfo: result.data.accountInfo
        });
      } else {
        setConnectionResult({
          success: false,
          message: result.error || 'Error de conexión'
        });
      }
    } catch (error) {
      setConnectionResult({
        success: false,
        message: 'Error de conexión: ' + error.message
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  const saveCredentials = async () => {
    if (!connectionResult?.success) return;

    try {
      const result = await apiService.saveTradingViewCredentials(
        credentials.username,
        credentials.password
      );

      if (result.success) {
        onCredentialsSave?.(credentials);
        setConnectionResult(prev => ({
          ...prev,
          message: 'Credenciales guardadas exitosamente ✅'
        }));
      } else {
        setConnectionResult(prev => ({
          ...prev,
          success: false,
          message: 'Error al guardar: ' + result.error
        }));
      }
    } catch (error) {
      setConnectionResult(prev => ({
        ...prev,
        success: false,
        message: 'Error al guardar credenciales: ' + error.message
      }));
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6 shadow-xl">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-semibold">🔐 Conexión TradingView</h2>
        <div className="text-sm text-gray-400">
          Cuenta principal para gestionar accesos
        </div>
      </div>

      <div className="space-y-4">
        {/* Username Input */}
        <div>
          <label htmlFor="username" className="block text-sm font-medium text-gray-300 mb-2">
            Usuario TradingView
          </label>
          <input
            type="text"
            id="username"
            name="username"
            value={credentials.username}
            onChange={handleInputChange}
            placeholder="tu_usuario_tradingview"
            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </div>

        {/* Password Input */}
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
            Contraseña TradingView
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              id="password"
              name="password"
              value={credentials.password}
              onChange={handleInputChange}
              placeholder="••••••••••••"
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent pr-12"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-400 hover:text-gray-300"
            >
              {showPassword ? '🙈' : '👁️'}
            </button>
          </div>
        </div>

        {/* Test Connection Button */}
        <div className="flex space-x-3">
          <button
            onClick={testConnection}
            disabled={isTestingConnection || !credentials.username || !credentials.password}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed px-6 py-3 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
          >
            {isTestingConnection ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Probando conexión...</span>
              </>
            ) : (
              <>
                <span>🔌</span>
                <span>Probar Conexión</span>
              </>
            )}
          </button>

          {connectionResult?.success && (
            <button
              onClick={saveCredentials}
              className="bg-green-600 hover:bg-green-700 px-6 py-3 rounded-lg font-medium transition-colors"
            >
              💾 Guardar
            </button>
          )}
        </div>

        {/* Connection Result */}
        {connectionResult && (
          <div className={`rounded-lg p-4 border ${
            connectionResult.success 
              ? 'bg-green-900 border-green-600' 
              : 'bg-red-900 border-red-600'
          }`}>
            <p className={connectionResult.success ? 'text-green-300' : 'text-red-300'}>
              {connectionResult.success ? '✅' : '❌'} {connectionResult.message}
            </p>
            
            {connectionResult.success && connectionResult.accountInfo && (
              <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                <div className="bg-gray-800 p-2 rounded">
                  <p className="text-gray-400">Usuario</p>
                  <p className="font-semibold text-green-300">{connectionResult.accountInfo.username}</p>
                </div>
                <div className="bg-gray-800 p-2 rounded">
                  <p className="text-gray-400">Tipo Cuenta</p>
                  <p className="font-semibold text-green-300">{connectionResult.accountInfo.accountType}</p>
                </div>
                <div className="bg-gray-800 p-2 rounded">
                  <p className="text-gray-400">Indicadores</p>
                  <p className="font-semibold text-green-300">{connectionResult.accountInfo.indicators}</p>
                </div>
                <div className="bg-gray-800 p-2 rounded">
                  <p className="text-gray-400">Último acceso</p>
                  <p className="font-semibold text-green-300">{connectionResult.accountInfo.lastLogin}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Warning Message */}
        <div className="bg-yellow-900 border border-yellow-600 rounded-lg p-4">
          <div className="flex items-start space-x-2">
            <span className="text-yellow-400 mt-0.5">⚠️</span>
            <div className="text-yellow-300 text-sm">
              <p className="font-medium mb-1">Información de seguridad:</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Esta cuenta debe tener permisos para gestionar accesos a tus indicadores</li>
                <li>Las credenciales se almacenan de forma segura en el servidor</li>
                <li>Se recomienda usar una cuenta dedicada para la API</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TradingViewConnection;
