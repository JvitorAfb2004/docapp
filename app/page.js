'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '../lib/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';

export default function Home() {
  const router = useRouter();
  const { isLoggedIn } = useAuth();

  const handleCriarAmbos = () => {
    router.push('/documentos/criar');
  };

  const handleCriarDFD = () => {
    router.push('/documentos/criar/dfd');
  };

  const handleCriarETP = () => {
    router.push('/documentos/criar/etp');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      <div className="container mx-auto px-6 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-3 bg-blue-100 text-blue-800 px-4 py-2 rounded-full text-sm font-medium mb-6">
            🤖 Sistema Inteligente com IA
            <span className="animate-pulse">✨</span>
          </div>
          <h1 className="text-6xl font-bold text-gray-900 mb-6 leading-tight">
            Gere Documentos
            <span className="block text-blue-600">DFD e ETP</span>
            <span className="block text-2xl text-gray-600 mt-4">com Inteligência Artificial</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed">
            Automatize a criação de documentos oficiais usando IA avançada.
            Gere DFDs e ETPs de forma inteligente, rápida e precisa.
          </p>
          
          {isLoggedIn && (
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              <Button 
                onClick={handleCriarAmbos} 
                className="bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 text-white px-8 py-8 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
              >
                🚀 Criar DFD + ETP Simultaneamente
              </Button>
            </div>
          )}
        </div>

      
      </div>
    </div>
  );
}
