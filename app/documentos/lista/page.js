'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { 
  Download, 
  FileText, 
  Calendar, 
  User, 
  HardDrive,
  RefreshCw
} from 'lucide-react';
import ProtectedRoute from '../../../components/ProtectedRoute';
import { useCustomAlert } from '../../../components/CustomAlert';

export default function ListaDocumentosPage() {
  const { showAlert, AlertComponent } = useCustomAlert();
  const [documentos, setDocumentos] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState({});
  const [error, setError] = useState('');

  useEffect(() => {
    carregarDocumentos();
  }, []);

  const carregarDocumentos = async () => {
    try {
      const response = await fetch('/api/documentos/listar', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setDocumentos(data.documentos || []);
        setStats(data.stats || null);
      } else {
        setError('Erro ao carregar documentos');
      }
    } catch (error) {
      console.error('Erro ao carregar documentos:', error);
      setError('Erro ao carregar documentos');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (documentoId) => {
    try {
      const response = await fetch(`/api/documentos/download/${documentoId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        
    
        const contentDisposition = response.headers.get('content-disposition');
        const nomeArquivo = contentDisposition 
          ? contentDisposition.split('filename=')[1]?.replace(/"/g, '')
          : 'documento.docx';
        
        link.download = nomeArquivo;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } else {
        console.error('Erro no download:', response.statusText);
        showAlert({
          title: 'Erro no Download',
          message: 'Erro ao fazer download do documento',
          type: 'error'
        });
      }
    } catch (error) {
      console.error('Erro no download:', error);
      showAlert({
        title: 'Erro de Conexão',
        message: 'Erro ao fazer download do documento. Verifique sua conexão e tente novamente.',
        type: 'error'
      });
    }
  };

  const formatarData = (data) => {
    return new Date(data).toLocaleString('pt-BR');
  };

  const getIconeDocumento = (tipo) => {
    return tipo === 'DFD' ? '📋' : '🔍';
  };

  const getCorTipo = (tipo) => {
    return tipo === 'DFD' ? 'text-blue-600' : 'text-green-600';
  };

  return (
    <ProtectedRoute>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                📁 Meus Documentos
              </h1>
              <p className="text-gray-600">
                Documentos DFD e ETP que você gerou
              </p>
            </div>
            <Button
              onClick={carregarDocumentos}
              disabled={loading}
              variant="outline"
              className="flex items-center space-x-2"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Atualizar</span>
            </Button>
          </div>

          {/* Estatísticas */}
          {!loading && stats && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <FileText className="h-8 w-8 text-blue-500" />
                    <div>
                      <p className="text-sm text-gray-600">Total Documentos</p>
                      <p className="text-2xl font-bold">{stats.totalDocumentos}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl">🤖</span>
                    <div>
                      <p className="text-sm text-gray-600">Tokens Gastos</p>
                      <p className="text-2xl font-bold text-purple-600">{stats.totalTokensGastos}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <Download className="h-8 w-8 text-green-500" />
                    <div>
                      <p className="text-sm text-gray-600">Downloads</p>
                      <p className="text-2xl font-bold">{stats.totalDownloads}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl">📊</span>
                    <div>
                      <p className="text-sm text-gray-600">Tipos</p>
                      <p className="text-lg font-semibold">
                        {stats.documentosPorTipo.DFD} DFD | {stats.documentosPorTipo.ETP} ETP
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="text-center py-8">
              <div className="inline-flex items-center space-x-2 text-gray-600">
                <RefreshCw className="h-5 w-5 animate-spin" />
                <span>Carregando documentos...</span>
              </div>
            </div>
          )}

          {/* Lista vazia */}
          {!loading && documentos.length === 0 && (
            <Card className="text-center py-12">
              <CardContent>
                <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Nenhum documento encontrado
                </h3>
                <p className="text-gray-600 mb-4">
                  Você ainda não gerou nenhum documento DFD ou ETP.
                </p>
                <Button 
                  onClick={() => window.location.href = '/documentos/criar'}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  📋 Criar Novo Documento
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Lista de documentos */}
          {!loading && documentos.length > 0 && (
            <div className="space-y-4">
              {documentos.map((documento) => (
                <Card key={documento.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      {/* Informações do documento */}
                      <div className="flex items-center space-x-4">
                        <div className="text-4xl">
                          {getIconeDocumento(documento.tipo)}
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <h3 className="text-lg font-semibold text-gray-900">
                              {documento.nomeArquivo}
                            </h3>
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getCorTipo(documento.tipo)} bg-gray-100`}>
                              {documento.tipo}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm text-gray-600">
                            <div className="flex items-center space-x-1">
                              <FileText className="h-4 w-4" />
                              <span>SGD: {documento.numeroSGD || 'N/A'}</span>
                            </div>
                            
                            <div className="flex items-center space-x-1">
                              <Calendar className="h-4 w-4" />
                              <span>{formatarData(documento.dataGeracao)}</span>
                            </div>
                            
                            <div className="flex items-center space-x-1">
                              <HardDrive className="h-4 w-4" />
                              <span>{documento.tamanhoFormatado}</span>
                            </div>
                            
                            <div className="flex items-center space-x-1">
                              <Download className="h-4 w-4" />
                              <span>{documento.downloadCount} downloads</span>
                            </div>
                            
                            <div className="flex items-center space-x-1">
                              <span className="text-blue-600">🤖</span>
                              <span>{(documento.tokensGastos || 0).toLocaleString()} tokens</span>
                            </div>
                            
                            {documento.modeloIA && documento.modeloIA !== 'N/A' && (
                              <div className="flex items-center space-x-1">
                                <span className="text-purple-600">📊</span>
                                <span>Modelo: {documento.modeloIA}</span>
                              </div>
                            )}
                          </div>
                          
                          {documento.modeloIA && (
                            <p className="text-xs text-gray-500 mt-1">
                              Modelo IA: {documento.modeloIA}
                            </p>
                          )}

                          {documento.ultimoDownload && (
                            <p className="text-xs text-gray-500 mt-1">
                              Último download: {formatarData(documento.ultimoDownload)}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Botão de download */}
                      <div className="flex items-center space-x-2">
                        <Button
                          onClick={() => handleDownload(documento.id)}
                          disabled={downloading[documento.id]}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          {downloading[documento.id] ? (
                            <>
                              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                              Baixando...
                            </>
                          ) : (
                            <>
                              <Download className="h-4 w-4 mr-2" />
                              Download
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Footer com resumo */}
          {!loading && documentos.length > 0 && (
            <div className="mt-8 p-4 bg-gray-50 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-blue-600">
                    {documentos.filter(d => d.tipo === 'DFD').length}
                  </div>
                  <div className="text-sm text-gray-600">Documentos DFD</div>
                </div>
                
                <div>
                  <div className="text-2xl font-bold text-green-600">
                    {documentos.filter(d => d.tipo === 'ETP').length}
                  </div>
                  <div className="text-sm text-gray-600">Documentos ETP</div>
                </div>
                
                <div>
                  <div className="text-2xl font-bold text-gray-700">
                    {documentos.reduce((total, doc) => total + doc.downloadCount, 0)}
                  </div>
                  <div className="text-sm text-gray-600">Total de Downloads</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Alert Component */}
        <AlertComponent />
      </div>
    </ProtectedRoute>
  );
}
