import { useEffect } from 'react';
import { useAuth } from '../AuthContext';

export function useAdminCheck() {
  const { isLoggedIn, refreshAdminStatus } = useAuth();

  useEffect(() => {
    if (isLoggedIn) {
      // Verificar imediatamente
      refreshAdminStatus();
    }
  }, [isLoggedIn, refreshAdminStatus]);

  // Função para forçar verificação manual
  const forceCheck = () => {
    refreshAdminStatus();
  };

  return { forceCheck };
}
