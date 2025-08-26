'use client';

import { useAuth } from '../lib/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function AdminRoute({ children }) {
  const { isLoggedIn, isLoading, isAdmin } = useAuth();
  const router = useRouter();

  useEffect(() => {
  
    if (!isLoading && (!isLoggedIn || !isAdmin)) {
      router.push('/');
    }
  }, [isLoggedIn, isAdmin, isLoading, router]);


  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Verificando permissões...</p>
        </div>
      </div>
    );
  }


  if (!isAdmin) {
    return null;
  }


  return children;
}
