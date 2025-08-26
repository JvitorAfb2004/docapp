import { useEffect, useRef } from 'react';
import { useAuth } from '../AuthContext';

export function useAdminCheck(intervalMs = 30000) { // Verificar a cada 30 segundos por padrão
  const { isLoggedIn, refreshAdminStatus } = useAuth();
  const intervalRef = useRef(null);

  useEffect(() => {
    if (isLoggedIn) {
      // Verificar imediatamente
      refreshAdminStatus();
      
      // Configurar verificação periódica
      intervalRef.current = setInterval(() => {
        refreshAdminStatus();
      }, intervalMs);

      // Cleanup ao desmontar
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [isLoggedIn, refreshAdminStatus, intervalMs]);

  // Função para forçar verificação manual
  const forceCheck = () => {
    refreshAdminStatus();
  };

  return { forceCheck };
}
