'use client';

import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // Função para verificar status de admin em tempo real
  const checkAdminStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch('/api/auth/check-admin', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        const newAdminStatus = data.isAdmin;
        
        // Só atualizar se o status mudou
        if (newAdminStatus !== isAdmin) {
          setIsAdmin(newAdminStatus);
          
          // Atualizar o usuário com o status de admin atual
          if (user) {
            setUser(prevUser => ({
              ...prevUser,
              isAdmin: newAdminStatus
            }));
          }
        }
      }
    } catch (error) {
      console.error('Erro ao verificar status de admin:', error);
    }
  };

  useEffect(() => {
    // Verificar se há token e dados do usuário no localStorage ao carregar a página
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('userData');
    
    if (token && userData) {
      try {
        const parsedUserData = JSON.parse(userData);
        
        // Não salvar isAdmin do localStorage, sempre verificar em tempo real
        const userWithoutAdmin = {
          ...parsedUserData,
          isAdmin: false // Valor temporário até verificar no banco
        };
        
        setIsLoggedIn(true);
        setUser(userWithoutAdmin);
        
        // Verificar status de admin em tempo real
        checkAdminStatus();
        
      } catch (error) {
        console.error('Erro ao parsear dados do usuário:', error);
        // Se houver erro, limpar dados corrompidos
        localStorage.removeItem('token');
        localStorage.removeItem('userData');
      }
    }
    
    setIsLoading(false);
  }, []);

  const login = (token, userData) => {
    // Não salvar isAdmin no localStorage
    const userWithoutAdmin = {
      ...userData,
      isAdmin: false // Valor temporário até verificar no banco
    };
    
    localStorage.setItem('token', token);
    localStorage.setItem('userData', JSON.stringify(userWithoutAdmin));
    setIsLoggedIn(true);
    setUser(userWithoutAdmin);
    setIsAdmin(false); // Reset temporário
    
    // Verificar status de admin após login
    checkAdminStatus();
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userData');
    setIsLoggedIn(false);
    setUser(null);
    setIsAdmin(false);
  };

  const updateUser = (userData) => {
    // Não salvar isAdmin no localStorage
    const userWithoutAdmin = {
      ...userData,
      isAdmin: isAdmin // Manter o valor atual verificado
    };
    
    localStorage.setItem('userData', JSON.stringify(userWithoutAdmin));
    setUser(userWithoutAdmin);
  };

  // Função para forçar verificação de admin (pode ser chamada quando necessário)
  const refreshAdminStatus = () => {
    checkAdminStatus();
  };

  const value = {
    isLoggedIn,
    user,
    isAdmin,
    login,
    logout,
    updateUser,
    refreshAdminStatus,
    isLoading
  };


  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
}
