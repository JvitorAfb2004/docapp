'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { Textarea } from '../../../components/ui/textarea';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '../../../components/ProtectedRoute';

import { useCustomAlert } from '../../../components/CustomAlert';
import { Download, CheckCircle, AlertCircle, Clock, FileText, Upload, ArrowLeft, X, Loader2, Play, Pause } from 'lucide-react';

export default function CriarETPPage() {
  const router = useRouter();
  const { showAlert, AlertComponent } = useCustomAlert();
  
  // Estados para o novo sistema unificado
  const [selectedFile, setSelectedFile] = useState(null);
  const [isProcessingDfd, setIsProcessingDfd] = useState(false);
  const [dfdResumo, setDfdResumo] = useState(null); // Resumo do DFD
  const [textoDFD, setTextoDFD] = useState(''); // Texto extraído do DFD
  const [blocosGerados, setBlocosGerados] = useState([]); // Blocos gerados pela IA
  const [blocoAtivo, setBlocoAtivo] = useState(null); // Bloco sendo visualizado/editado
  const [editandoBloco, setEditandoBloco] = useState(null); // ID do bloco sendo editado
  const [conteudoEditado, setConteudoEditado] = useState({}); // Conteúdo editado do bloco
  const [isGeneratingETP, setIsGeneratingETP] = useState(false);
  const [numeroETP, setNumeroETP] = useState('');
  const [isGeneratingBloco, setIsGeneratingBloco] = useState(null); // ID do bloco sendo gerado
  

  
  // Função para processar o arquivo DFD com o prompt unificado
  const processDFDFile = async () => {
    if (!selectedFile) return;
    
    setIsProcessingDfd(true);
    
    try {
      const formData = new FormData();
      formData.append('docx', selectedFile);
      
      const response = await fetch('/api/documentos/processar-dfd-unificado', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Erro ao processar DFD');
      }
      
      // Definir o resumo do DFD e o texto extraído
      setDfdResumo(result.resumoDFD);
      setTextoDFD(result.textoDFD);
      
      // Inicializar lista de blocos vazia
      setBlocosGerados([]);
      
      showAlert({
        title: '✅ DFD Processado!',
        message: 'DFD processado com sucesso! Agora você pode editar os campos e gerar o ETP.',
        type: 'success'
      });
      
    } catch (error) {
      console.error('Erro ao processar DFD:', error);
      showAlert({
        title: '❌ Erro',
        message: error.message || 'Erro ao processar DFD',
        type: 'error'
      });
    } finally {
      setIsProcessingDfd(false);
    }
  };

  // Função para gerar um bloco individual
  const gerarBloco = async (numeroBloco) => {
    if (!textoDFD) {
      showAlert({
        title: '❌ Erro',
        message: 'Texto do DFD não disponível.',
        type: 'error'
      });
      return;
    }

    setIsGeneratingBloco(numeroBloco);

    try {
      const response = await fetch('/api/documentos/gerar-bloco-individual', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          textoDFD,
          numeroBloco,
          resumoDFD: dfdResumo
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao gerar bloco');
      }

      // Adicionar o bloco gerado à lista
      setBlocosGerados(prev => {
        const existingIndex = prev.findIndex(b => b.id === numeroBloco);
        if (existingIndex >= 0) {
          // Substituir bloco existente
          const newBlocos = [...prev];
          newBlocos[existingIndex] = result.bloco;
          return newBlocos;
        } else {
          // Adicionar novo bloco
          return [...prev, result.bloco];
        }
      });

      // Definir o bloco gerado como ativo
      setBlocoAtivo(result.bloco);

      showAlert({
        title: '✅ Bloco Gerado!',
        message: `${result.bloco.titulo} gerado com sucesso!`,
        type: 'success'
      });

    } catch (error) {
      console.error('Erro ao gerar bloco:', error);
      showAlert({
        title: '❌ Erro',
        message: error.message || 'Erro ao gerar bloco',
        type: 'error'
      });
    } finally {
      setIsGeneratingBloco(null);
    }
  };

  // Função para gerar o ETP final
  const generateETP = async () => {
    if (!dfdResumo || blocosGerados.length === 0) {
      showAlert({
        title: '❌ Erro',
        message: 'Você precisa importar um DFD primeiro.',
        type: 'error'
      });
      return;
    }
    
    if (!numeroETP.trim()) {
      showAlert({
        title: '❌ Erro',
        message: 'O número do ETP é obrigatório.',
        type: 'error'
      });
      return;
    }
    
    setIsGeneratingETP(true);
    
    try {
      // Combinar dados do resumo e blocos para gerar o ETP
      const dadosFinais = {
        resumoDFD: dfdResumo,
        blocos: blocosGerados,
        numeroETP: numeroETP,
        dataAtual: new Date().toLocaleDateString('pt-BR')
      };
      
      const response = await fetch('/api/documentos/gerar-etp-final', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(dadosFinais)
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Erro ao gerar ETP');
      }
      
      showAlert({
        title: '✅ ETP Gerado!',
        message: `ETP gerado com sucesso! ID: ${result.documento.id}`,
        type: 'success'
      });
      
      // Opcional: redirecionar para lista de documentos
      setTimeout(() => {
        router.push('/documentos/lista');
      }, 2000);
      
    } catch (error) {
      console.error('Erro ao gerar ETP:', error);
      showAlert({
        title: '❌ Erro',
        message: error.message || 'Erro ao gerar ETP',
        type: 'error'
      });
    } finally {
      setIsGeneratingETP(false);
    }
  };

  // Função para iniciar edição de um bloco
  const iniciarEdicao = (bloco) => {
    setEditandoBloco(bloco.id);
    setConteudoEditado(bloco.dados);
  };

  // Função para salvar edição de um bloco
  const salvarEdicao = (blocoId) => {
    setBlocosGerados(prev => prev.map(bloco => 
      bloco.id === blocoId 
        ? { ...bloco, dados: conteudoEditado }
        : bloco
    ));
    setEditandoBloco(null);
    setConteudoEditado({});
  };

  // Função para cancelar edição
  const cancelarEdicao = () => {
    setEditandoBloco(null);
    setConteudoEditado({});
  };

  // Função para visualizar um bloco específico
  const visualizarBloco = (bloco) => {
      setBlocoAtivo(bloco);
      iniciarEdicao(bloco);
  };

  // Função para renderizar o resumo do DFD
  const renderDFDResumo = () => {
    if (!dfdResumo) return null;
    
    return (
      <Card className="mb-6 border-green-200 bg-green-50">
        <CardHeader>
          <CardTitle className="text-lg text-green-700 flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Resumo do DFD Analisado
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
              <p><strong>DFD nº:</strong> {dfdResumo.numero_dfd || 'Não informado'}</p>
              <p><strong>Órgão:</strong> {dfdResumo.orgao || 'Não informado'}</p>
              <p><strong>SGD:</strong> {dfdResumo.numero_sgd || 'Não informado'}</p>
              <p><strong>Tipo:</strong> {dfdResumo.tipo_objeto || 'Não informado'}</p>
                </div>
            <div>
              <p><strong>Valor Estimado:</strong> {dfdResumo.valor_estimado || 'Não informado'}</p>
              <p><strong>Classificação:</strong> {dfdResumo.classificacao_orcamentaria || 'Não informado'}</p>
              <p><strong>Fonte:</strong> {dfdResumo.fonte || 'Não informado'}</p>
              <p><strong>Elemento:</strong> {dfdResumo.elemento_despesa || 'Não informado'}</p>
              </div>
              <div>
              <p><strong>Fiscal Titular:</strong> {dfdResumo.fiscal_titular || 'Não informado'}</p>
              <p><strong>Fiscal Suplente:</strong> {dfdResumo.fiscal_suplente || 'Não informado'}</p>
              <p><strong>Gestor Titular:</strong> {dfdResumo.gestor_titular || 'Não informado'}</p>
              <p><strong>Gestor Suplente:</strong> {dfdResumo.gestor_suplente || 'Não informado'}</p>
              </div>
            </div>
            
          <div className="mt-4">
            <p><strong>Demandante:</strong></p>
            <p className="text-sm text-gray-600 mt-1">
              {dfdResumo.demandante_nome || 'Não informado'} - {dfdResumo.demandante_cargo || ''} 
              {dfdResumo.demandante_setor && ` (${dfdResumo.demandante_setor})`}
            </p>
            </div>
            
          <div className="mt-4">
            <p><strong>Descrição do Objeto:</strong></p>
            <p className="text-sm text-gray-600 mt-1">{dfdResumo.descricao_objeto || 'Não informado'}</p>
              </div>
              
          {dfdResumo.itens && dfdResumo.itens.length > 0 && (
            <div className="mt-4">
              <p><strong>Itens:</strong></p>
              <div className="mt-2 space-y-2">
                {dfdResumo.itens.map((item, index) => (
                  <div key={index} className="p-3 bg-white rounded border text-sm">
                    <p><strong>Item {item.item}:</strong> {item.qtd} {item.unid}</p>
                    <p><strong>Especificação:</strong> {item.especificacao_item}</p>
                    {item.codigo_siga_item && <p><strong>Código SIGA:</strong> {item.codigo_siga_item}</p>}
                </div>
                ))}
              </div>
            </div>
          )}
          
          {dfdResumo.responsaveis_acao_orcamentaria && dfdResumo.responsaveis_acao_orcamentaria.length > 0 && (
            <div className="mt-4">
              <p><strong>Responsáveis pela Ação Orçamentária:</strong></p>
              <div className="mt-2 space-y-1">
                {dfdResumo.responsaveis_acao_orcamentaria.map((responsavel, index) => (
                  <p key={index} className="text-sm text-gray-600">
                    {responsavel.nome} - {responsavel.numero_funcional} (Ação: {responsavel.acao})
                  </p>
                ))}
          </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  // Função para renderizar os blocos gerados
  const renderBlocosGerados = () => {
    if (!dfdResumo) return null;
    
    const blocosDisponiveis = [
      { id: 1, titulo: 'Bloco 1 - Características Contratuais Fundamentais' },
      { id: 2, titulo: 'Bloco 2 - Requisitos Técnicos e Regulamentares' },
      { id: 3, titulo: 'Bloco 3 - Dimensionamento Quantitativo' },
      { id: 4, titulo: 'Bloco 4 - Análise de Mercado e Viabilidade' },
      { id: 5, titulo: 'Bloco 5 - Solução Técnica Detalhada' },
      { id: 6, titulo: 'Bloco 6 - Resultados e Gestão' }
    ];
    
    return (
      <div className="space-y-6">
        <h3 className="text-xl font-semibold text-gray-700">📋 Gerar Blocos do ETP</h3>
        
        {/* Botões para gerar blocos */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {blocosDisponiveis.map((bloco) => {
            const blocoGerado = blocosGerados.find(b => b.id === bloco.id);
            const estaGerando = isGeneratingBloco === bloco.id;
            
            return (
              <Card key={bloco.id} className="p-4">
                <div className="space-y-3">
                  <h4 className="font-medium text-sm">{bloco.titulo}</h4>
                  
                  {blocoGerado ? (
                    <div className="space-y-2">
              <Button
                        variant={blocoAtivo?.id === bloco.id ? "default" : "outline"}
                        onClick={() => visualizarBloco(blocoGerado)}
                        className="w-full text-xs"
                        size="sm"
                      >
                        {blocoAtivo?.id === bloco.id ? 'Visualizando' : 'Visualizar'}
              </Button>
                    <Button
                        variant="outline"
                        onClick={() => gerarBloco(bloco.id)}
                        className="w-full text-xs"
                      size="sm"
                    >
                        Regenerar
                    </Button>
                  </div>
                  ) : (
                  <Button
                      onClick={() => gerarBloco(bloco.id)}
                      disabled={estaGerando}
                      className="w-full text-xs"
                      size="sm"
                    >
                      {estaGerando ? (
                        <>
                          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                          Gerando...
                      </>
                    ) : (
                        'Gerar Bloco'
                    )}
                  </Button>
              )}
            </div>
              </Card>
          );
        })}
      </div>
        
        {/* Navegação entre Blocos Gerados */}
        {blocosGerados.length > 0 && (
          <div className="flex flex-wrap gap-2 justify-center">
            {blocosGerados.map((bloco) => (
            <Button
              key={bloco.id}
              variant={blocoAtivo?.id === bloco.id ? "default" : "outline"}
                onClick={() => visualizarBloco(bloco)}
                className="text-sm"
            >
                {bloco.titulo}
            </Button>
          ))}
        </div>
        )}

        {/* Conteúdo do Bloco Ativo */}
        {blocoAtivo && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{blocoAtivo.titulo}</span>
                <div className="flex gap-2">
                  {editandoBloco === blocoAtivo.id ? (
                    <>
                      <Button size="sm" onClick={() => salvarEdicao(blocoAtivo.id)}>
                        Salvar
                      </Button>
                      <Button size="sm" variant="outline" onClick={cancelarEdicao}>
                        Cancelar
                      </Button>
                    </>
                  ) : (
                    <Button size="sm" onClick={() => iniciarEdicao(blocoAtivo)}>
                      Editar
                    </Button>
                  )}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {editandoBloco === blocoAtivo.id ? (
                <div className="space-y-4">
                  {conteudoEditado && Object.entries(conteudoEditado).map(([campo, valor]) => (
                    <div key={campo}>
                      <Label className="text-sm font-medium text-gray-700">
                        {campo.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                </Label>
                      <Textarea
                        value={valor || ''}
                        onChange={(e) => setConteudoEditado(prev => ({
                          ...prev,
                          [campo]: e.target.value
                        }))}
                  className="mt-1"
                        rows={3}
                />
              </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {blocoAtivo.dados && Object.entries(blocoAtivo.dados).map(([campo, valor]) => (
                    <div key={campo} className="border-b pb-2">
                      <p className="font-medium text-gray-700">
                        {campo.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}:
                      </p>
                      <p className="text-gray-600 mt-1">{valor}</p>
            </div>
                  ))}
          </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    );
  };



  // Função para lidar com seleção de arquivo
  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file && file.name.endsWith('.docx')) {
      setSelectedFile(file);
    } else {
      showAlert({
        title: '❌ Erro',
        message: 'Por favor, selecione um arquivo .docx válido.',
        type: 'error'
      });
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <AlertComponent />
        
        {/* Header */}
        <div className="max-w-6xl mx-auto mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                📋 Criar ETP - Novo Fluxo Unificado
              </h1>
              <p className="text-gray-600">
                Importe um DFD, edite os campos e gere o ETP completo
              </p>
            </div>
            <Button
              onClick={() => router.push('/documentos')}
              variant="outline"
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </Button>
          </div>
        </div>

        <div className="max-w-6xl mx-auto">
          {/* Etapa 1: Importar DFD */}
          {!dfdResumo && (
            <Card className="mb-8">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="w-5 h-5" />
                  Etapa 1: Importar DFD
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                  <div>
                    <Label htmlFor="dfd-file" className="text-sm font-medium">
                      Selecione o arquivo DFD (.docx)
                    </Label>
                    <Input
                      id="dfd-file"
                      type="file"
                      accept=".docx"
                      onChange={handleFileSelect}
                      className="mt-1"
                    />
                </div>

                  {selectedFile && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                      <p className="text-sm text-blue-800">
                        📄 Arquivo selecionado: {selectedFile.name}
                      </p>
                      </div>
                  )}
                
                      <Button
                    onClick={processDFDFile}
                    disabled={!selectedFile || isProcessingDfd}
                    className="w-full"
                  >
                    {isProcessingDfd ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processando DFD...
                          </>
                        ) : (
                      'Processar DFD'
                        )}
                      </Button>
              </div>
            </CardContent>
          </Card>
        )}

          {/* Etapa 2: Resumo do DFD */}
          {dfdResumo && renderDFDResumo()}
          
          {/* Etapa 3: Blocos Gerados */}
          {dfdResumo && renderBlocosGerados()}
          
          {/* Etapa 4: Gerar ETP */}
          {dfdResumo && blocosGerados.length > 0 && (
            <Card className="mt-8">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="w-5 h-5" />
                  Etapa 4: Gerar ETP Final
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                  <div>
                    <Label htmlFor="numero-etp" className="text-sm font-medium">
                      Número do ETP <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="numero-etp"
                      value={numeroETP}
                      onChange={(e) => setNumeroETP(e.target.value)}
                      placeholder="Ex: 001/2025"
                      className="mt-1"
                    />
                </div>
                
                  <div className="text-center">
                    <Button
                      onClick={generateETP}
                      disabled={isGeneratingETP || !numeroETP.trim()}
                      className="bg-green-600 hover:bg-green-700 text-white px-8 py-3"
                      size="lg"
                    >
                      {isGeneratingETP ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Gerando ETP...
                        </>
                      ) : (
                        'Gerar ETP Completo'
                      )}
                    </Button>
                    
                    {!numeroETP.trim() && (
                      <p className="text-sm text-red-500 mt-2">
                        ⚠️ O número do ETP é obrigatório
                      </p>
                    )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        </div>
      </div>
    </ProtectedRoute>
  );
}