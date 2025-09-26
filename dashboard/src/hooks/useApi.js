// Custom hook para manejar llamadas a la API
import { useState, useEffect } from 'react';
import { apiService } from '../services/api';

// Hook para verificar el estado de la API
export function useApiHealth() {
  const [apiStatus, setApiStatus] = useState({
    status: 'checking',
    data: null,
    error: null,
    lastCheck: null
  });

  const checkHealth = async () => {
    setApiStatus(prev => ({ ...prev, status: 'checking' }));
    
    const result = await apiService.getHealthStatus();
    
    setApiStatus({
      status: result.success ? 'connected' : 'error',
      data: result.data,
      error: result.error,
      lastCheck: new Date().toLocaleTimeString()
    });
  };

  useEffect(() => {
    checkHealth();
    // Verificar cada 30 segundos
    const interval = setInterval(checkHealth, 30000);
    
    return () => clearInterval(interval);
  }, []);

  return { apiStatus, checkHealth };
}

// Hook para validar usuarios
export function useUserValidation() {
  const [validationState, setValidationState] = useState({
    isValidating: false,
    result: null,
    error: null
  });

  const validateUser = async (username) => {
    if (!username.trim()) return;
    
    setValidationState({ isValidating: true, result: null, error: null });
    
    const result = await apiService.validateUser(username);
    
    if (result.success) {
      setValidationState({
        isValidating: false,
        result: result.data,
        error: null
      });
    } else {
      setValidationState({
        isValidating: false,
        result: null,
        error: result.error
      });
    }
  };

  return { validationState, validateUser };
}

// Hook para métricas del sistema
export function useSystemMetrics() {
  const [metrics, setMetrics] = useState({
    loading: true,
    data: null,
    error: null
  });

  useEffect(() => {
    const fetchMetrics = async () => {
      const result = await apiService.getSystemMetrics();
      
      setMetrics({
        loading: false,
        data: result.data,
        error: result.success ? null : result.error
      });
    };

    fetchMetrics();
    // Actualizar cada 60 segundos
    const interval = setInterval(fetchMetrics, 60000);
    
    return () => clearInterval(interval);
  }, []);

  return metrics;
}
