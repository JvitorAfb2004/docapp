'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '../../components/ProtectedRoute';

export default function DocumentosPage() {
  const router = useRouter();

  const handleCriarDocumento = () => {
    router.push('/documentos/criar');
  };

  const handleVerDocumentos = () => {
    router.push('/documentos/lista');
  };

  return (
    <ProtectedRoute>
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Geração de Documentos
          </h1>
          <p className="text-gray-600 text-lg">
            Crie seus documentos DFD e ETP de forma unificada
          </p>
        </div>

        {/* Opção Unificada */}
        <div className="mb-8">
          <Card className="bg-gradient-to-r from-blue-50 to-green-50 border-2 border-blue-300 hover:border-blue-400 transition-all duration-300">
            <CardContent className="p-8 text-center">
              <div className="text-6xl mb-6">🚀</div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Criar DFD + ETP Unificado
              </h2>
              <p className="text-gray-600 mb-8 text-lg leading-relaxed">
                Preencha ambos os documentos de uma vez com dados compartilhados. 
                <br />
                <strong>Fluxo sequencial:</strong> Primeiro os dados comuns, depois DFD e por último ETP.
                <br />
                Os campos comuns são automaticamente preenchidos em ambos os documentos.
              </p>
              <Button 
                onClick={handleCriarDocumento}
                className="bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 text-white px-10 py-4 text-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
              >
                🚀 Criar DFD + ETP Unificado
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Informações sobre o processo */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="text-center p-6">
            <div className="text-4xl mb-4">📝</div>
            <h3 className="text-lg font-semibold mb-2">1. Dados Comuns</h3>
            <p className="text-gray-600 text-sm">
              Informações básicas compartilhadas entre DFD e ETP
            </p>
          </Card>
          
          <Card className="text-center p-6">
            <div className="text-4xl mb-4">📋</div>
            <h3 className="text-lg font-semibold mb-2">2. DFD</h3>
            <p className="text-gray-600 text-sm">
              Documento de Formalização de Demanda
            </p>
          </Card>
          
          <Card className="text-center p-6">
            <div className="text-4xl mb-4">🔍</div>
            <h3 className="text-lg font-semibold mb-2">3. ETP</h3>
            <p className="text-gray-600 text-sm">
              Estudo Técnico Preliminar
            </p>
          </Card>
        </div>

        <div className="text-center">
          <Button 
            onClick={handleVerDocumentos}
            variant="outline"
            className="bg-white hover:bg-gray-50 px-8 py-3"
          >
            📚 Ver Documentos Existentes
          </Button>
        </div>
      </div>
    </ProtectedRoute>
  );
}
