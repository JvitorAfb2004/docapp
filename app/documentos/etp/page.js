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
import { Download, CheckCircle, AlertCircle, Clock, FileText, Upload, ArrowLeft, X, Loader2, Play, Pause, ChevronRight } from 'lucide-react';

export default function CriarETPPage() {
  const router = useRouter();
  const { showAlert, AlertComponent } = useCustomAlert();
  
  // Estados para o novo fluxo sequencial
  const [selectedFile, setSelectedFile] = useState(null);
  const [isProcessingDfd, setIsProcessingDfd] = useState(false);
  const [dfdResumo, setDfdResumo] = useState(null);
  const [textoDFD, setTextoDFD] = useState('');
  
  // Estados dos blocos
  const [blocosGerados, setBlocosGerados] = useState([]);
  const [blocoAtual, setBlocoAtual] = useState(1); // Próximo bloco a ser gerado
  const [isGeneratingBloco, setIsGeneratingBloco] = useState(false);
  const [blocoVisualizando, setBlocoVisualizando] = useState(null);
  const [blocoEditando, setBlocoEditando] = useState(null);
  const [editandoPergunta, setEditandoPergunta] = useState(null);
  
  // Estados do ETP final
  const [etpConsolidado, setEtpConsolidado] = useState(null);
  const [isConsolidando, setIsConsolidando] = useState(false);
  const [numeroETP, setNumeroETP] = useState('');
  const [podeFazerDownload, setPodeFazerDownload] = useState(false);
  const [documentoId, setDocumentoId] = useState(null);
  

  
  // Função para processar o arquivo DFD
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
      
      // Inicializar estados
      setBlocosGerados([]);
      setBlocoAtual(1);
      setEtpConsolidado(null);
      setPodeFazerDownload(false);
      
      showAlert({
        title: '✅ DFD Processado!',
        message: 'DFD processado com sucesso! Agora você pode iniciar a geração dos blocos.',
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

  // Função para gerar o próximo bloco sequencialmente
  const gerarProximoBloco = async () => {
    if (!textoDFD) {
      showAlert({
        title: '❌ Erro',
        message: 'Texto do DFD não disponível.',
        type: 'error'
      });
      return;
    }

    if (blocoAtual > 7) {
      showAlert({
        title: '✅ Todos os Blocos Gerados!',
        message: 'Todos os 7 blocos foram gerados. Agora você pode consolidar o ETP.',
        type: 'success'
      });
      return;
    }

    setIsGeneratingBloco(true);

    try {
      const response = await fetch('/api/documentos/gerar-bloco-verbatim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          textoDFD,
          numeroBloco: blocoAtual,
          resumoDFD: dfdResumo
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao gerar bloco');
      }

      // Adicionar o bloco gerado à lista
      setBlocosGerados(prev => [...prev, result.bloco]);

      // Avançar para o próximo bloco
      setBlocoAtual(prev => prev + 1);

      // Definir o bloco gerado como visualizando
      setBlocoVisualizando(result.bloco);
      
      console.log('📋 Bloco gerado recebido:', result.bloco);
      console.log('📝 Perguntas do bloco:', result.bloco.perguntas);

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
      setIsGeneratingBloco(false);
    }
  };

  // Função para consolidar o ETP final
  const consolidarETP = async () => {
    if (!dfdResumo || blocosGerados.length === 0) {
      showAlert({
        title: '❌ Erro',
        message: 'Você precisa gerar pelo menos um bloco primeiro.',
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
    
    setIsConsolidando(true);
    
    try {
      const response = await fetch('/api/documentos/consolidar-etp-final', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          blocos: blocosGerados,
          resumoDFD: dfdResumo,
          numeroETP: numeroETP
        })
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Erro ao consolidar ETP');
      }
      
      setEtpConsolidado(result.etp);
      setDocumentoId(result.documento.id);
      setPodeFazerDownload(true);
      
      showAlert({
        title: '✅ ETP Consolidado!',
        message: `ETP consolidado com sucesso! Agora você pode fazer o download.`,
        type: 'success'
      });
      
    } catch (error) {
      console.error('Erro ao consolidar ETP:', error);
      showAlert({
        title: '❌ Erro',
        message: error.message || 'Erro ao consolidar ETP',
        type: 'error'
      });
    } finally {
      setIsConsolidando(false);
    }
  };

  // Função para visualizar um bloco específico
  const visualizarBloco = (bloco) => {
    setBlocoVisualizando(bloco);
    setBlocoEditando(null);
    setEditandoPergunta(null);
  };


  // Função para atualizar valor de pergunta
  const atualizarValorPergunta = (perguntaId, campo, valor) => {
    if (!blocoVisualizando) return;
    
    setBlocoVisualizando(prev => ({
      ...prev,
      perguntas: prev.perguntas.map(pergunta => {
        if (pergunta.id === perguntaId) {
          if (campo === 'dependencia') {
            // Atualizar dependências
            return {
              ...pergunta,
              value: {
                ...pergunta.value,
                dependencias: {
                  ...pergunta.value.dependencias,
                  ...valor
                }
              }
            };
          } else {
            // Atualizar campo normal
            return {
              ...pergunta,
              value: {
                ...pergunta.value,
                [campo]: valor
              }
            };
          }
        }
        return pergunta;
      })
    }));
    
    // Também atualizar no array de blocos gerados
    setBlocosGerados(prev => prev.map(bloco => {
      if (bloco.id === blocoVisualizando.id) {
        return {
          ...bloco,
          perguntas: bloco.perguntas.map(pergunta => {
            if (pergunta.id === perguntaId) {
              if (campo === 'dependencia') {
                return {
                  ...pergunta,
                  value: {
                    ...pergunta.value,
                    dependencias: {
                      ...pergunta.value.dependencias,
                      ...valor
                    }
                  }
                };
              } else {
                return {
                  ...pergunta,
                  value: {
                    ...pergunta.value,
                    [campo]: valor
                  }
                };
              }
            }
            return pergunta;
          })
        };
      }
      return bloco;
    }));
  };

  // Função para navegar entre blocos
  const navegarBloco = (direcao) => {
    if (!blocosGerados.length) return;
    
    const indiceAtual = blocosGerados.findIndex(b => b.id === blocoVisualizando?.id);
    let novoIndice;
    
    if (direcao === 'anterior') {
      novoIndice = indiceAtual > 0 ? indiceAtual - 1 : blocosGerados.length - 1;
    } else {
      novoIndice = indiceAtual < blocosGerados.length - 1 ? indiceAtual + 1 : 0;
    }
    
    const novoBloco = blocosGerados[novoIndice];
    visualizarBloco(novoBloco);
  };


  // Função para fazer download do ETP consolidado
  const fazerDownload = async () => {
    if (!documentoId) {
      showAlert({
        title: '❌ Erro',
        message: 'ID do documento não encontrado.',
        type: 'error'
      });
      return;
    }

    try {
      const response = await fetch(`/api/documentos/download/${documentoId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao fazer download');
      }

      // Obter o nome do arquivo do header Content-Disposition
      const contentDisposition = response.headers.get('Content-Disposition');
      const fileName = contentDisposition 
        ? contentDisposition.split('filename=')[1]?.replace(/"/g, '')
        : `ETP_${numeroETP}_${Date.now()}.docx`;

      // Converter resposta para blob
      const blob = await response.blob();
      
      // Criar URL temporária para download
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      showAlert({
        title: '✅ Download Iniciado!',
        message: `Download do ETP iniciado: ${fileName}`,
        type: 'success'
      });
    } catch (error) {
      console.error('Erro ao fazer download:', error);
      showAlert({
        title: '❌ Erro',
        message: error.message || 'Erro ao fazer download do ETP',
        type: 'error'
      });
    }
  };

  // Função para renderizar o resumo do DFD com botão de início
  const renderDFDResumo = () => {
    if (!dfdResumo || blocosGerados.length > 0) return null;
    
    return (
      <Card className="mb-6 border-green-200 bg-green-50">
        <CardHeader>
          <CardTitle className="text-lg text-green-700 flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            DFD Importado com Sucesso
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

          {/* Botão para iniciar geração do Bloco 1 */}
          <div className="mt-6 text-center">
            <Button
              onClick={gerarProximoBloco}
              disabled={isGeneratingBloco || blocoAtual > 6}
              className="bg-green-600 hover:bg-green-700 text-white px-8 py-3"
              size="lg"
            >
              {isGeneratingBloco ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Gerando Bloco {blocoAtual}...
                </>
              ) : blocoAtual > 6 ? (
                'Todos os Blocos Gerados'
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Iniciar (gerar Bloco {blocoAtual})
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Função para renderizar uma pergunta individual
  const renderPergunta = (pergunta) => {
    const currentValue = pergunta.value;
    
    // Se é uma pergunta de texto simples
    if (pergunta.type === 'text') {
      return (
        <div className="space-y-2">
          <textarea
            value={currentValue.text || ''}
            onChange={(e) => atualizarValorPergunta(pergunta.id, 'text', e.target.value)}
            placeholder="Digite sua resposta..."
            className="w-full min-h-[100px] p-3 border border-gray-300 rounded-md resize-vertical focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            rows={4}
          />
        </div>
      );
    }
    
    // Se é uma pergunta com opções (checkbox/radio)
    if (pergunta.type === 'checkbox' && pergunta.opcoes && pergunta.opcoes.length > 0) {
      return (
        <div className="space-y-2">
          <div className="space-y-2">
            <div className="flex items-center gap-4 flex-wrap">
              {pergunta.opcoes.map((opcao) => (
                <div key={opcao.valor || opcao} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name={`pergunta_${pergunta.id}`}
                    id={`${pergunta.id}_${opcao.valor || opcao}`}
                    value={opcao.valor || opcao}
                    checked={currentValue.checkbox === (opcao.valor || opcao)}
                    onChange={(e) => {
                      atualizarValorPergunta(pergunta.id, 'checkbox', e.target.value);
                      // Se a opção tem dependência, limpar campos dependentes
                      if (opcao.dependencia && currentValue.dependencias) {
                        const depKey = opcao.dependencia;
                        if (currentValue.dependencias[depKey]) {
                          atualizarValorPergunta(pergunta.id, 'dependencia', { [depKey]: '' });
                        }
                      }
                    }}
                    className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                  />
                  <label htmlFor={`${pergunta.id}_${opcao.valor || opcao}`} className="text-sm text-gray-700 cursor-pointer">
                    {opcao.valor || opcao}
                  </label>
                </div>
              ))}
            </div>
            
            {/* Renderizar campos dependentes */}
            {pergunta.dependencias && Object.keys(pergunta.dependencias).map(depKey => {
              const dependencia = pergunta.dependencias[depKey];
              const opcaoSelecionada = pergunta.opcoes.find(op => op.dependencia === depKey);
              const mostrarDependencia = opcaoSelecionada && currentValue.checkbox === opcaoSelecionada.valor;
              
              if (!mostrarDependencia) return null;
              
              return (
                <div key={depKey} className="mt-4 p-3 bg-blue-50 rounded border border-blue-200">
                  <Label className="text-sm font-medium text-blue-800 mb-2 block">
                    {dependencia.descricao}
                  </Label>
                  
                  {dependencia.tipo_conteudo === 'texto' ? (
                    <textarea
                      value={currentValue.dependencias?.[depKey]?.valor || ''}
                      onChange={(e) => atualizarValorPergunta(pergunta.id, 'dependencia', { 
                        [depKey]: e.target.value 
                      })}
                      placeholder="Digite a justificativa..."
                      className="w-full min-h-[80px] p-3 border border-gray-300 rounded-md resize-vertical focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      rows={3}
                    />
                  ) : dependencia.tipo_conteudo === 'marcar_x_e_texto' ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-4 flex-wrap">
                        {dependencia.variaveis_etp.map((variavel) => (
                          <div key={variavel} className="flex items-center gap-2">
                            <input
                              type="radio"
                              name={`dependencia_${pergunta.id}_${depKey}`}
                              id={`${pergunta.id}_${depKey}_${variavel}`}
                              value={variavel}
                              checked={currentValue.dependencias?.[depKey]?.valor === variavel}
                              onChange={(e) => atualizarValorPergunta(pergunta.id, 'dependencia', { 
                                [depKey]: e.target.value 
                              })}
                              className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                            />
                            <label htmlFor={`${pergunta.id}_${depKey}_${variavel}`} className="text-sm text-gray-700 cursor-pointer">
                              {variavel.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </label>
                          </div>
                        ))}
                      </div>
                      <textarea
                        value={currentValue.dependencias?.[depKey]?.texto || ''}
                        onChange={(e) => atualizarValorPergunta(pergunta.id, 'dependencia', { 
                          [depKey]: { ...currentValue.dependencias?.[depKey], texto: e.target.value }
                        })}
                        placeholder="Especificar quantidade..."
                        className="w-full mt-2 min-h-[60px] p-3 border border-gray-300 rounded-md resize-vertical focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        rows={2}
                      />
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      );
    }
    
    // Fallback para estrutura antiga
    return (
      <div className="space-y-2">
        <textarea
          value={currentValue.text || ''}
          onChange={(e) => atualizarValorPergunta(pergunta.id, 'text', e.target.value)}
          placeholder="Digite sua resposta..."
          className="w-full min-h-[100px] p-3 border border-gray-300 rounded-md resize-vertical focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          rows={4}
        />
      </div>
    );
  };

  // Função para renderizar os blocos gerados
  const renderBlocosGerados = () => {
    if (!dfdResumo || blocosGerados.length === 0) return null;
    
    return (
      <div className="space-y-6">
        <h3 className="text-xl font-semibold text-gray-700">📋 Blocos Gerados</h3>
        
        {/* Navegação entre Blocos Gerados */}
        <div className="flex flex-wrap gap-2 justify-center">
          {blocosGerados.map((bloco) => (
            <Button
              key={bloco.id}
              variant={blocoVisualizando?.id === bloco.id ? "default" : "outline"}
              onClick={() => visualizarBloco(bloco)}
              className="text-sm"
            >
              {bloco.titulo}
            </Button>
          ))}
        </div>

        {/* Conteúdo do Bloco Visualizando */}
        {blocoVisualizando && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{blocoVisualizando.titulo}</span>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-green-600">Gerado</span>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {blocoVisualizando.perguntas && blocoVisualizando.perguntas.map((pergunta) => (
                  <div key={pergunta.id} className="border-b pb-4">
                    <div className="mb-3">
                      <Label className="font-medium text-gray-800 text-sm">
                        {pergunta.order}. {pergunta.label}
                      </Label>
                    </div>
                    
                    {renderPergunta(pergunta)}
                  </div>
                ))}
              </div>
              
              {/* Botões de ação para edição */}
            </CardContent>
          </Card>
        )}

        {/* Navegação entre blocos */}
        {blocosGerados.length > 1 && (
          <div className="flex justify-center gap-4">
            <Button
              onClick={() => navegarBloco('anterior')}
              variant="outline"
              disabled={blocoEditando}
            >
              ← Bloco Anterior
            </Button>
            <Button
              onClick={() => navegarBloco('proximo')}
              variant="outline"
              disabled={blocoEditando}
            >
              Próximo Bloco →
            </Button>
          </div>
        )}

        {/* Botão para gerar próximo bloco */}
        {blocoAtual <= 7 && blocosGerados.length < 7 && (
          <div className="text-center">
            <Button
              onClick={gerarProximoBloco}
              disabled={isGeneratingBloco || blocoEditando}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2"
            >
              {isGeneratingBloco ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Gerando Bloco {blocoAtual}...
                </>
              ) : (
                <>
                  <ChevronRight className="w-4 h-4 mr-2" />
                  Gerar Próximo Bloco ({blocoAtual})
                </>
              )}
            </Button>
          </div>
        )}

        {/* Mensagem quando todos os blocos estiverem gerados */}
        {blocosGerados.length >= 7 && (
          <div className="text-center p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center justify-center gap-2 text-green-700">
              <CheckCircle className="w-5 h-5" />
              <span className="font-medium">Todos os 7 blocos foram gerados!</span>
            </div>
            <p className="text-sm text-green-600 mt-1">
              Agora você pode consolidar o ETP final na seção abaixo.
            </p>
          </div>
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
                📋 Criar ETP - Fluxo Sequencial
              </h1>
              <p className="text-gray-600">
                Importe um DFD, gere os blocos sequencialmente e consolide o ETP final
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
          
          {/* Etapa 4: Consolidar ETP */}
          {dfdResumo && blocosGerados.length >= 7 && (
            <Card className="mt-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="w-5 h-5" />
                  Consolidar ETP Final
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
                      onClick={consolidarETP}
                      disabled={isConsolidando || !numeroETP.trim()}
                      className="bg-green-600 hover:bg-green-700 text-white px-8 py-3"
                      size="lg"
                    >
                      {isConsolidando ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Consolidando ETP...
                        </>
                      ) : (
                        'Consolidar ETP Final'
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

          {/* Etapa 5: Download do ETP */}
          {podeFazerDownload && etpConsolidado && (
            <Card className="mt-8 border-green-200 bg-green-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-700">
                  <CheckCircle className="w-5 h-5" />
                  ETP Consolidado com Sucesso!
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center space-y-4">
                  <p className="text-gray-600">
                    O ETP foi consolidado com sucesso e está pronto para download.
                  </p>
                  
                  <Button
                    onClick={fazerDownload}
                    className="bg-green-600 hover:bg-green-700 text-white px-8 py-3"
                    size="lg"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Fazer Download do ETP
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}