'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '../../components/ProtectedRoute';

export default function DocumentosPage() {
  const router = useRouter();

  const handleCriarDFD = () => {
    router.push('/documentos/dfd');
  };

  const handleCriarETP = () => {
    router.push('/documentos/etp');
  };

  const handleCriarUnificado = () => {
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
            Escolha como deseja criar seus documentos
          </p>
        </div>

        {/* Opções Separadas */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* DFD */}
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-300 hover:border-blue-400 transition-all duration-300 hover:shadow-lg">
            <CardContent className="p-8 text-center">
              <div className="text-6xl mb-6">📋</div>
              <h2 className="text-2xl font-bold text-blue-800 mb-4">
                Criar DFD
              </h2>
              <p className="text-blue-700 mb-6 text-sm leading-relaxed">
                <strong>Documento de Formalização de Demanda</strong>
                <br />
                Gerado diretamente dos dados do formulário, sem uso de IA.
                <br />
                Processo rápido e eficiente.
              </p>
              <Button 
                onClick={handleCriarDFD}
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 font-semibold shadow-md hover:shadow-lg transition-all duration-300"
              >
                📋 Criar DFD
              </Button>
            </CardContent>
          </Card>

          {/* ETP */}
          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-300 hover:border-green-400 transition-all duration-300 hover:shadow-lg">
            <CardContent className="p-8 text-center">
     
              <h2 className="text-2xl font-bold text-green-800 mb-4">
                Criar ETP
              </h2>
              <p className="text-green-700 mb-6 text-sm leading-relaxed">
                <strong>Estudo Técnico Preliminar</strong>
                <br />
                Formulário manual OU importação de PDF via IA.
                <br />
                Processamento inteligente de dados.
              </p>
              <Button 
                onClick={handleCriarETP}
                className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 font-semibold shadow-md hover:shadow-lg transition-all duration-300"
              >
                 Criar ETP
              </Button>
            </CardContent>
          </Card>
        </div>

       
        {/* Informações sobre o processo */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="text-center p-6 bg-blue-50 border-blue-200">
            <div className="text-4xl mb-4">📋</div>
            <h3 className="text-lg font-semibold mb-2 text-blue-800">DFD</h3>
            <p className="text-blue-700 text-sm">
              Sem IA - Geração direta dos dados
            </p>
          </Card>
          
          <Card className="text-center p-6 bg-green-50 border-green-200">
        
            <h3 className="text-lg font-semibold mb-2 text-green-800">ETP</h3>
            <p className="text-green-700 text-sm">
              Com IA - Manual ou importação PDF
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
