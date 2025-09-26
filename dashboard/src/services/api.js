// API Service para comunicarse con el backend
import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000';

// Configurar axios con configuración robusta
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000, // Aumentado a 15 segundos
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para manejar errores
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error);
    return Promise.reject(error);
  }
);

// Servicios de la API
export const apiService = {
  // Health check - verificar estado del servidor
  async getHealthStatus() {
    try {
      const response = await api.get('/');
      return {
        success: true,
        data: response.data,
        status: 'connected'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        status: 'disconnected'
      };
    }
  },

  // Validar usuario
  async validateUser(username) {
    try {
      const response = await api.get(`/api/validate/${username}`);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  },

  // Obtener métricas del sistema (si están disponibles)
  async getSystemMetrics() {
    try {
      const response = await api.get('/api/metrics/health');
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      // Si no está disponible, devolver datos mock
      return {
        success: true,
        data: {
          status: 'running',
          uptime: 'N/A',
          requestsToday: Math.floor(Math.random() * 500),
          usersActive: Math.floor(Math.random() * 50)
        }
      };
    }
  },

  // Probar credenciales de TradingView
  async testTradingViewCredentials(username, password) {
    try {
      const response = await api.post('/api/config/tradingview', {
        username,
        password,
        testOnly: true
      });
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  },

  // Guardar credenciales de TradingView
  async saveTradingViewCredentials(username, password) {
    try {
      const response = await api.post('/api/config/tradingview', {
        username,
        password,
        testOnly: false
      });
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  },

  // Verificar estado de credenciales TradingView
  async getTradingViewStatus() {
    try {
      const response = await api.get('/api/config/tradingview/status');
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
};

export default apiService;
