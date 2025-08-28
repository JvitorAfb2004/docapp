'use client';

import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Upload, FileText, X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

export default function DFDImportModal({ isOpen, onClose, onDataExtracted }) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedData, setExtractedData] = useState(null);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  const fileInputRef = useRef(null);

  // Função para simular progresso fake até 90%
  const simulateProgress = () => {
    const steps = [
      { progress: 8, message: 'Carregando arquivo DOCX...', delay: 500 },
      { progress: 20, message: 'Extraindo texto do documento...', delay: 800 },
      { progress: 35, message: 'Conectando com a IA...', delay: 1200 },
      { progress: 50, message: 'Analisando estrutura do DFD...', delay: 1500 },
      { progress: 65, message: 'Identificando seções e tabelas...', delay: 1800 },
      { progress: 78, message: 'Extraindo informações específicas...', delay: 2000 },
      { progress: 85, message: 'Processando dados encontrados...', delay: 1500 },
      { progress: 90, message: 'Finalizando processamento...', delay: 1000 }
    ];

    let currentStep = 0;
    let timeoutId;

    const executeStep = () => {
      if (currentStep < steps.length) {
        setProgress(steps[currentStep].progress);
        setProgressMessage(steps[currentStep].message);
        
        timeoutId = setTimeout(() => {
          currentStep++;
          executeStep();
        }, steps[currentStep].delay);
      }
    };

    // Iniciar a primeira etapa imediatamente
    executeStep();

    // Retornar função para limpar todos os timeouts
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    const docxFile = files.find(file => file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    
    if (docxFile) {
      setSelectedFile(docxFile);
      setError('');
    } else {
      setError('Por favor, selecione apenas arquivos DOCX.');
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      setSelectedFile(file);
      setError('');
    } else {
      setError('Por favor, selecione apenas arquivos DOCX.');
    }
  };

  const processFile = async () => {
    if (!selectedFile) return;
    
    setIsProcessing(true);
    setError('');
    setProgress(0);
    setProgressMessage('Iniciando processamento...');
    
    // Iniciar simulação de progresso
    const clearProgressSimulation = simulateProgress();
    
    try {
      // Enviar o arquivo DOCX diretamente para a IA, como no ChatGPT
      const formData = new FormData();
      formData.append('docx', selectedFile);
      
      // Enviar diretamente para processamento com IA (sem extrair texto primeiro)
      const response = await fetch('/api/documentos/processar-dfd-direto', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Erro ao processar DOCX');
      }
      
      // Limpar simulação de progresso fake
      clearProgressSimulation();
      
      // Progresso final (100%)
      setProgress(100);
      setProgressMessage('✅ Processamento concluído com sucesso!');
      
      console.log('📄 Dados processados pela IA:', result);
      
      // Usar os dados extraídos diretamente da IA
      const dfdProcessedData = {
        numeroSGD: result.dadosProcessados?.numeroSGD || '',
        numeroETP: result.dadosProcessados?.numeroETP || '',
        numeroDFD: result.dadosProcessados?.numeroDFD || '',
        descricaoNecessidade: result.dadosProcessados?.descricaoNecessidade || '',
        valorEstimado: result.dadosProcessados?.valorEstimado || '',
        classificacaoOrcamentaria: result.dadosProcessados?.classificacaoOrcamentaria || '',
        fonte: result.dadosProcessados?.fonte || '',
        elementoDespesa: result.dadosProcessados?.elementoDespesa || '',
        previsaoPCA: result.dadosProcessados?.previsaoPCA || false,
        recursoConvenio: result.dadosProcessados?.recursoConvenio || false,
        fiscalTitular: result.dadosProcessados?.fiscalTitular || '',
        fiscalSuplente: result.dadosProcessados?.fiscalSuplente || '',
        gestorTitular: result.dadosProcessados?.gestorTitular || '',
        gestorSuplente: result.dadosProcessados?.gestorSuplente || '',
        demandante: {
          orgao: result.dadosProcessados?.demandante?.orgao || '',
          setor: result.dadosProcessados?.demandante?.setor || '',
          cargo: result.dadosProcessados?.demandante?.cargo || '',
          nome: result.dadosProcessados?.demandante?.nome || '',
          numeroFuncional: result.dadosProcessados?.demandante?.numeroFuncional || ''
        },
        responsavelPlanejamento: {
          nome: result.dadosProcessados?.responsavelPlanejamento?.nome || '',
          cargo: result.dadosProcessados?.responsavelPlanejamento?.cargo || '',
          numeroFuncional: result.dadosProcessados?.responsavelPlanejamento?.numeroFuncional || ''
        },
        itens: result.dadosProcessados?.itens || [],
        responsaveisAcaoOrcamentaria: result.dadosProcessados?.responsaveisAcaoOrcamentaria || [],
        assinaturas: result.dadosProcessados?.assinaturas || {},
        dataDocumento: result.dadosProcessados?.dataDocumento || '',
        localDocumento: result.dadosProcessados?.localDocumento || ''
      };
      
      // Aguardar um pouco para mostrar o sucesso
      setTimeout(() => {
        setExtractedData(dfdProcessedData);
      }, 1000);
      
    } catch (error) {
      // Limpar simulação de progresso fake
      clearProgressSimulation();
      
      console.error('Erro ao processar DOCX:', error);
      setError(error.message || 'Erro ao processar o arquivo DOCX');
      setProgress(0);
      setProgressMessage('');
    } finally {
      setTimeout(() => {
        setIsProcessing(false);
      }, 1000);
    }
  };

  const confirmImport = () => {
    if (extractedData && onDataExtracted) {
      onDataExtracted(extractedData);
      handleClose();
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setExtractedData(null);
    setError('');
    setIsProcessing(false);
    setIsDragging(false);
    if (onClose) onClose();
  };

  const removeFile = () => {
    setSelectedFile(null);
    setExtractedData(null);
    setError('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-semibold flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Importar DFD (DOCX)
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClose}
                className="h-8 w-8 p-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-sm text-gray-600">
              Envie um arquivo DOCX com o DFD (Documento de Formalização de Demanda) e a IA extrairá automaticamente as informações para preencher o ETP.
            </p>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {!selectedFile && !extractedData && (
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  isDragging 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-300 hover:border-gray-400'
                }`}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
              >
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-lg font-medium text-gray-700 mb-2">
                  Arraste o DOCX aqui ou clique para selecionar
                </p>
                <p className="text-sm text-gray-500 mb-4">
                  Apenas arquivos DOCX são aceitos (máx. 10MB)
                </p>
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  variant="outline"
                >
                  Selecionar Arquivo
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".docx"
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </div>
            )}

            {selectedFile && !extractedData && (
              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <FileText className="w-8 h-8 text-blue-500" />
                    <div>
                      <p className="font-medium">{selectedFile.name}</p>
                      <p className="text-sm text-gray-500">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  {!isProcessing && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={removeFile}
                      className="text-red-500 hover:text-red-700"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>

                {/* Barra de Progresso */}
                {isProcessing && (
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">
                        {progressMessage}
                      </span>
                      <span className="text-sm font-medium text-gray-700">
                        {progress}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                      <div 
                        className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-1000 ease-out shadow-sm"
                        style={{ width: `${progress}%` }}
                      >
                        <div className="h-full bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-pulse"></div>
                      </div>
                    </div>
                    {progress >= 90 && (
                      <p className="text-xs text-gray-500 mt-1 animate-pulse">
                        🔜 Aguardando resposta da IA...
                      </p>
                    )}
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    onClick={processFile}
                    disabled={isProcessing}
                    className="flex-1"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processando...
                      </>
                    ) : (
                      <>
                        <FileText className="w-4 h-4 mr-2" />
                        Analisar DFD
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={removeFile}
                    disabled={isProcessing}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            )}

            {error && (
              <div className="border border-red-200 bg-red-50 rounded-lg p-4 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                <p className="text-red-700">{error}</p>
              </div>
            )}

            {extractedData && (
              <div className="space-y-4">
                <div className="border border-green-200 bg-green-50 rounded-lg p-4 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <p className="text-green-700">
                    DFD processado com sucesso! As informações foram extraídas e estão prontas para importação.
                  </p>
                </div>

                <div className="border rounded-lg p-4 bg-gray-50">
                  <h4 className="font-medium mb-3">Resumo dos dados extraídos:</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">DFD nº:</span> {extractedData.numeroDFD || 'N/A'}
                    </div>
                    <div>
                      <span className="font-medium">SGD:</span> {extractedData.numeroSGD || 'N/A'}
                    </div>
                    <div className="col-span-2">
                      <span className="font-medium">Descrição:</span> {extractedData.descricaoNecessidade ? (extractedData.descricaoNecessidade.length > 100 ? extractedData.descricaoNecessidade.substring(0, 100) + '...' : extractedData.descricaoNecessidade) : 'N/A'}
                    </div>
                    <div>
                      <span className="font-medium">Valor Estimado:</span> {extractedData.valorEstimado || 'N/A'}
                    </div>
                    <div>
                      <span className="font-medium">Fonte:</span> {extractedData.fonte || 'N/A'}
                    </div>
                    <div>
                      <span className="font-medium">Fiscal Titular:</span> {extractedData.fiscalTitular || 'N/A'}
                    </div>
                    <div>
                      <span className="font-medium">Gestor Titular:</span> {extractedData.gestorTitular || 'N/A'}
                    </div>
                    <div>
                      <span className="font-medium">Órgão:</span> {extractedData.demandante?.orgao || 'N/A'}
                    </div>
                    <div>
                      <span className="font-medium">Demandante:</span> {extractedData.demandante?.nome || 'N/A'}
                    </div>
                    {extractedData.itens && extractedData.itens.length > 0 && (
                      <div className="col-span-2">
                        <span className="font-medium">Itens encontrados:</span> {extractedData.itens.length} item(ns)
                      </div>
                    )}
                    <div>
                      <span className="font-medium">Previsão PCA:</span> {extractedData.previsaoPCA ? 'Sim' : 'Não'}
                    </div>
                    <div>
                      <span className="font-medium">Recurso Convênio:</span> {extractedData.recursoConvenio ? 'Sim' : 'Não'}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={confirmImport}
                    className="flex-1"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Importar Dados
                  </Button>
                  <Button
                    variant="outline"
                    onClick={removeFile}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}