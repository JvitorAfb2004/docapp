﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { Textarea } from '../../../components/ui/textarea';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '../../../components/ProtectedRoute';
import MinimizableLoadingModal from '../../../components/MinimizableLoadingModal';
import { useCustomAlert } from '../../../components/CustomAlert';
import { Download, CheckCircle, AlertCircle, Clock, FileText, Upload } from 'lucide-react';
import PDFImportModal from '../../../components/PDFImportModal';


export default function CriarDocumentoUnificadoPage() {
  const router = useRouter();
  const { showAlert, AlertComponent } = useCustomAlert();
  

  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationMessage, setGenerationMessage] = useState('');
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [showPDFImportModal, setShowPDFImportModal] = useState(false);
  const [processingType, setProcessingType] = useState(null); // 'dfd' ou 'etp'
  
  const [formData, setFormData] = useState({

    numeroSGD: '',
    descricaoNecessidade: '',
    valorEstimado: '',
    classificacaoOrcamentaria: '',
    fonte: '',
    elementoDespesa: '',
    protocoloPNCP: '',
    acaoOrcamentariaNumero: '',
    previsaoPCA: true,
    justificativaPCA: '',
    

    numeroDFD: '',
    especificacaoBensServicos: '',
    codigoSIGA: '',
    recursoConvenio: false,
    item: '',
    quantidade: '',
    unidade: '',
    especificacaoDetalhada: '',
    fiscalTitular: '',
    fiscalSuplente: '',
    gestorTitular: '',
    gestorSuplente: '',
    demandante: {
      orgao: '',
      setor: '',
      cargo: '',
      nome: '',
      numeroFuncional: ''
    },
    responsaveisAcaoOrcamentaria: [
      {
        nome: '',
        numeroFuncional: ''
      }
    ],
    responsavelPlanejamento: {
      nome: '',
      numeroFuncional: '',
      cargo: ''
    },
    

    numeroETP: '',
    tipoObjeto: 'Bem',
    natureza: 'nÃ£o continuada',
    vigencia: '',
    prorrogavel: false,
    servicoContinuado: false,
    justificativaServicoContinuado: '',
    produtos: [
      {
        item: '',
        codigoSIGA: '',
        descricao: ''
      }
    ],
    criteriosSustentabilidade: '',
    necessidadeTreinamento: false,
    bemLuxo: false,
    transicaoContratual: false,
    normativosTecnicos: '',
    localEntrega: '',
    amostraProvaConceito: false,
    marcaEspecifica: false,
    subcontratacao: false,
    estimativasQuantidades: {
      metodo: '',
      descricao: ''
    },
    serieHistorica: {
      exercicio: '',
      quantidadeConsumida: '',
      unidade: ''
    },
    quantitativos: {
      item: '',
      descricao: '',
      unidade: '',
      quantidade: ''
    },
    levantamentoMercado: {
      fontes: '',
      justificativa: '',
      restricoes: '',
      tratamentoME: false
    },
    meiosPesquisaPrecos: '',
    descricaoSolucao: '',
    prazoGarantia: '',
    assistenciaTecnica: false,
    manutencao: false,
    parcelamento: false,
    justificativaParcelamento: '',
    resultadosPretendidos: {
      beneficios: '',
      notaExplicativa: ''
    },
    providenciasPrevias: {
      providencias: '',
      requisitosGestao: '',
      requisitosFiscalizacao: ''
    },
    contratacoesCorrelatas: false,
    indicacaoContratacoesCorrelatas: '',
    impactosAmbientais: false,
    especificacaoImpactosAmbientais: '',
    posicionamentoConclusivo: {
      viabilidade: true,
      textoConclusivo: ''
    }
  });

  const [currentDocument, setCurrentDocument] = useState('dfd');
  const [currentSection, setCurrentSection] = useState(0);
  const [errors, setErrors] = useState({});

  const dfdSections = [
    {
      title: '1. Identificação do DFD',
      description: 'Documento de Formalização de Demanda',
      fields: [
        { name: 'numeroDFD', label: 'Número do DFD', type: 'text', required: true },
        { name: 'numeroSGD', label: 'Número do SGD', type: 'text', required: true }
      ]
    },
    {
      title: '2. Descrição da Demanda e Justificativa da Necessidade da Contratação',
      description: 'Detalhamento da necessidade e justificativa legal',
      fields: [
        { name: 'descricaoNecessidade', label: 'Descrição da Demanda e Justificativa da Necessidade', type: 'textarea', required: true, rows: 6 }
      ]
    },
    {
      title: '3. Especificação dos Bens e/ou Serviços',
      description: 'Detalhamento dos itens com quantidades e especificações',
      fields: [
        { name: 'item', label: 'Item', type: 'text', required: true },
        { name: 'quantidade', label: 'Quantidade', type: 'text', required: true },
        { name: 'unidade', label: 'Unidade', type: 'text', required: true },
        { name: 'codigoSIGA', label: 'Código SIGA', type: 'text', required: true },
        { name: 'especificacaoDetalhada', label: 'Especificação Completa', type: 'textarea', required: true, rows: 4 }
      ]
    },
    {
      title: '4. Estimativa Preliminar do Valor da Contratação',
      description: 'Valor total estimado para a contratação',
      fields: [
        { name: 'valorEstimado', label: 'Valor Total Estimado (R$)', type: 'currency', required: true }
      ]
    },
    {
      title: '5. Programação Orçamentária',
      description: 'Dados da classificação orçamentária',
      fields: [
        { name: 'classificacaoOrcamentaria', label: 'Classificação Orçamentária', type: 'text', required: true },
        { name: 'fonte', label: 'Fonte', type: 'text', required: true },
        { name: 'elementoDespesa', label: 'Elemento de Despesa', type: 'text', required: true }
      ]
    },
    {
      title: '6. Recurso de Convênio',
      description: 'Indicação se o recurso é proveniente de convênio',
      fields: [
        { name: 'recursoConvenio', label: 'O recurso é de convênio?', type: 'checkbox' }
      ]
    },
    {
      title: '7. Demanda Prevista no Plano de Contratação Anual - PCA',
      description: 'Verificação da inclusão no PCA e justificativa',
      fields: [
        { name: 'previsaoPCA', label: 'A demanda está prevista no PCA?', type: 'checkbox', required: true },
        { name: 'justificativaPCA', label: 'Justificativa (obrigatória se NÃO estiver no PCA)', type: 'textarea', rows: 3 }
      ]
    },
    {
      title: '8. Indicação de Fiscal e Gestor do Contrato',
      description: 'Definição dos responsáveis pela fiscalização e gestão',
      fields: [
        { name: 'fiscalTitular', label: 'Fiscal Titular - Nome', type: 'text', required: true },
        { name: 'fiscalSuplente', label: 'Fiscal Suplente - Nome', type: 'text' },
        { name: 'gestorTitular', label: 'Gestor Titular - Nome', type: 'text', required: true },
        { name: 'gestorSuplente', label: 'Gestor Suplente - Nome', type: 'text' }
      ]
    },
    {
      title: '9. Demandante',
      description: 'Informações do responsável pela demanda',
      fields: [
        { name: 'demandante.orgao', label: 'Órgão', type: 'text', required: true },
        { name: 'demandante.setor', label: 'Setor', type: 'text', required: true },
        { name: 'demandante.cargo', label: 'Cargo/Função', type: 'text', required: true },
        { name: 'demandante.nome', label: 'Nome', type: 'text', required: true },
        { name: 'demandante.numeroFuncional', label: 'Nº Funcional', type: 'text', required: true }
      ]
    },
    {
      title: '10. Responsável pela Ação Orçamentária',
      description: 'Definição dos responsáveis pela execução da ação orçamentária',
      fields: [
        { name: 'acaoOrcamentariaNumero', label: 'Número da Ação Orçamentária', type: 'text', required: true },
        { name: 'responsaveisAcaoOrcamentaria', label: 'Responsáveis pela Ação Orçamentária', type: 'dynamic_array', required: true }
      ]
    },
    {
      title: '11. Responsável pelo Planejamento e Orçamento',
      description: 'Dados do responsável pelo acompanhamento das metas',
      fields: [
        { name: 'responsavelPlanejamento.nome', label: 'Nome', type: 'text', required: true },
        { name: 'responsavelPlanejamento.numeroFuncional', label: 'Nº Funcional', type: 'text', required: true },
        { name: 'responsavelPlanejamento.cargo', label: 'Cargo/Função', type: 'text', required: true }
      ]
    }
  ];

  const etpSections = [
    {
      title: '1. Identificação do ETP',
      description: 'Estudo Técnico Preliminar - Dados básicos',
      fields: [
        { name: 'numeroETP', label: 'Número do ETP', type: 'text', required: true },
        { name: 'numeroSGD', label: 'Número do SGD', type: 'text', required: true }
      ]
    },
    {
      title: '2. Dados Básicos da Contratação',
      description: 'Informações fundamentais para o ETP',
      fields: [
        { name: 'descricaoNecessidade', label: 'Descrição da Necessidade', type: 'textarea', required: true, rows: 6 },
        { name: 'valorEstimado', label: 'Valor Estimado (R$)', type: 'currency', required: true },
        { name: 'tipoObjeto', label: 'Tipo de Objeto', type: 'select', options: ['Bem', 'Serviço'], required: true },
        { name: 'natureza', label: 'Natureza', type: 'select', options: ['continuada', 'com monopólio', 'sem monopólio', 'não continuada'], required: true },
        { name: 'vigencia', label: 'Vigência do Contrato', type: 'text', placeholder: 'Ex: 30 dias, 12 meses, 5 anos' },
        { name: 'prorrogavel', label: 'Prorrogável?', type: 'checkbox' },
        { name: 'servicoContinuado', label: 'É serviço continuado?', type: 'checkbox' }
      ]
    },
    {
      title: '3. Produtos e Especificações Técnicas',
      description: 'Detalhes dos produtos ou serviços a serem contratados',
      fields: [
        { name: 'produtos', label: 'Produtos/Serviços', type: 'dynamic_array', required: true },
        { name: 'criteriosSustentabilidade', label: 'Critérios de Sustentabilidade', type: 'textarea' },
        { name: 'necessidadeTreinamento', label: 'Necessita de Treinamento?', type: 'checkbox' },
        { name: 'bemLuxo', label: 'É bem de luxo?', type: 'checkbox' },
        { name: 'localEntrega', label: 'Local de Entrega/Execução', type: 'text' },
        { name: 'marcaEspecifica', label: 'Exige marca específica?', type: 'checkbox' },
        { name: 'subcontratacao', label: 'Permite subcontratação?', type: 'checkbox' }
      ]
    },
    {
      title: '4. Estimativas e Levantamento de Mercado',
      description: 'Análise de quantidades e mercado',
      fields: [
        { name: 'estimativasQuantidades.metodo', label: 'Método para Estimar Quantidade', type: 'text' },
        { name: 'estimativasQuantidades.descricao', label: 'Descrição do Quantitativo', type: 'textarea' },
        { name: 'levantamentoMercado.fontes', label: 'Fontes de Pesquisa de Mercado', type: 'textarea', placeholder: 'Ex: contratações similares, sites especializados' },
        { name: 'levantamentoMercado.justificativa', label: 'Justificativa Técnica e Econômica', type: 'textarea' },
        { name: 'meiosPesquisaPrecos', label: 'Meios Usados na Pesquisa de Preços', type: 'textarea' }
      ]
    },
    {
      title: '5. Descrição da Solução',
      description: 'Solução técnica e requisitos',
      fields: [
        { name: 'descricaoSolucao', label: 'Descrição Completa da Solução', type: 'textarea', required: true, rows: 6 },
        { name: 'prazoGarantia', label: 'Prazo de Garantia', type: 'text' },
        { name: 'assistenciaTecnica', label: 'Necessita de assistência técnica?', type: 'checkbox' },
        { name: 'manutencao', label: 'Necessita de manutenção?', type: 'checkbox' },
        { name: 'parcelamento', label: 'A solução será dividida em itens?', type: 'checkbox' },
        { name: 'justificativaParcelamento', label: 'Justificativa para parcelamento', type: 'textarea' }
      ]
    },
    {
      title: '6. Resultados Pretendidos e Impactos',
      description: 'Benefícios esperados e impactos ambientais',
      fields: [
        { name: 'resultadosPretendidos.beneficios', label: 'Benefícios Esperados', type: 'textarea', placeholder: 'Ex: redução de custos, ganho de eficiência' },
        { name: 'resultadosPretendidos.notaExplicativa', label: 'Nota Explicativa dos Resultados', type: 'textarea' },
        { name: 'impactosAmbientais', label: 'Há impacto ambiental?', type: 'checkbox' },
        { name: 'especificacaoImpactosAmbientais', label: 'Especificação dos impactos ambientais', type: 'textarea' }
      ]
    },
    {
      title: '7. Posicionamento Conclusivo',
      description: 'Conclusão sobre a viabilidade da contratação',
      fields: [
        { name: 'posicionamentoConclusivo.viabilidade', label: 'Viabilidade Técnica, Socioeconômica e Ambiental', type: 'checkbox', required: true },
        { name: 'posicionamentoConclusivo.textoConclusivo', label: 'Posicionamento Conclusivo Detalhado', type: 'textarea', required: true, rows: 6 }
      ]
    }
  ];

  const getCurrentSections = () => {
    return currentDocument === 'dfd' ? dfdSections : etpSections;
  };

  const getCurrentSectionsLength = () => {
    return currentDocument === 'dfd' ? dfdSections.length : etpSections.length;
  };

  const addResponsavelAcaoOrcamentaria = () => {
    setFormData(prev => ({
      ...prev,
      responsaveisAcaoOrcamentaria: [
        ...prev.responsaveisAcaoOrcamentaria,
        { nome: '', numeroFuncional: '' }
      ]
    }));
  };

  const removeResponsavelAcaoOrcamentaria = (index) => {
    if (formData.responsaveisAcaoOrcamentaria.length > 1) {
      setFormData(prev => ({
        ...prev,
        responsaveisAcaoOrcamentaria: prev.responsaveisAcaoOrcamentaria.filter((_, i) => i !== index)
      }));
    }
  };

  const handleResponsavelAcaoOrcamentariaChange = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      responsaveisAcaoOrcamentaria: prev.responsaveisAcaoOrcamentaria.map((responsavel, i) => 
        i === index ? { ...responsavel, [field]: value } : responsavel
      )
    }));
  };

  const addProduto = () => {
    setFormData(prev => ({
      ...prev,
      produtos: [
        ...prev.produtos,
        { item: '', codigoSIGA: '', descricao: '' }
      ]
    }));
  };

  const removeProduto = (index) => {
    if (formData.produtos.length > 1) {
      setFormData(prev => ({
        ...prev,
        produtos: prev.produtos.filter((_, i) => i !== index)
      }));
    }
  };

  const handleProdutoChange = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      produtos: prev.produtos.map((produto, i) => 
        i === index ? { ...produto, [field]: value } : produto
      )
    }));
  };

  const validateSection = (sectionIndex) => {
    const sections = getCurrentSections();
    const section = sections[sectionIndex];
    const newErrors = {};
    
    section.fields.forEach(field => {
      if (field.required) {

        if (field.name === 'responsaveisAcaoOrcamentaria') {
          const responsaveis = formData.responsaveisAcaoOrcamentaria || [];
          
          if (responsaveis.length === 0) {
            newErrors[field.name] = 'Deve haver pelo menos 1 responsável pela ação orçamentária';
          } else {
  
            responsaveis.forEach((responsavel, index) => {
              if (!responsavel.nome || responsavel.nome.trim() === '') {
                newErrors[`responsaveisAcaoOrcamentaria[${index}].nome`] = 'Nome é obrigatório';
              }
              if (!responsavel.numeroFuncional || responsavel.numeroFuncional.trim() === '') {
                newErrors[`responsaveisAcaoOrcamentaria[${index}].numeroFuncional`] = 'Número funcional é obrigatório';
              }
            });
          }
        } else if (field.name === 'produtos') {
          const produtos = formData.produtos || [];
          
          if (produtos.length === 0) {
            newErrors[field.name] = 'Deve haver pelo menos 1 produto';
          } else {
            produtos.forEach((produto, index) => {
              if (!produto.item || produto.item.trim() === '') {
                newErrors[`produtos[${index}].item`] = 'Item é obrigatório';
              }
              if (!produto.codigoSIGA || produto.codigoSIGA.trim() === '') {
                newErrors[`produtos[${index}].codigoSIGA`] = 'Código SIGA é obrigatório';
              }
              if (!produto.descricao || produto.descricao.trim() === '') {
                newErrors[`produtos[${index}].descricao`] = 'Descrição é obrigatória';
              }
            });
          }
        } else {
          const value = field.name.includes('.') 
            ? formData[field.name.split('.')[0]]?.[field.name.split('.')[1]] || ''
            : formData[field.name] || '';
          
          if (!value || (typeof value === 'string' && value.trim() === '')) {
            newErrors[field.name] = 'Este campo é obrigatório';
          }
        }
      }
    });
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (name, value) => {
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
    

    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  // Função para processar dados extraídos do PDF
  const handlePDFDataExtracted = (extractedData) => {
    try {
      console.log('Dados extraídos do PDF:', extractedData);
      
      // Mapear dados do resumo DFD
      const resumoDFD = extractedData.resumoDFD || {};
      const bloco1 = extractedData.bloco1 || {};
      const bloco2 = extractedData.bloco2 || {};
      const bloco3 = extractedData.bloco3 || {};
      const bloco4 = extractedData.bloco4 || {};
      const bloco5 = extractedData.bloco5 || {};
      const bloco6 = extractedData.bloco6 || {};
      const bloco7 = extractedData.bloco7 || {};
      
      setFormData(prev => ({
        ...prev,
        // Dados básicos do DFD
        numeroSGD: resumoDFD.sgd || prev.numeroSGD,
        numeroDFD: resumoDFD.numero || prev.numeroDFD,
        descricaoNecessidade: resumoDFD.descricaoObjeto || prev.descricaoNecessidade,
        valorEstimado: resumoDFD.valorEstimado ? resumoDFD.valorEstimado.replace(/[^\d]/g, '') : prev.valorEstimado,
        classificacaoOrcamentaria: resumoDFD.classificacao || prev.classificacaoOrcamentaria,
        fonte: resumoDFD.fonte || prev.fonte,
        protocoloPNCP: bloco1.protocoloPNCP || prev.protocoloPNCP,
        codigoSIGA: resumoDFD.siga || prev.codigoSIGA,
        
        // Especificações do DFD
        especificacaoBensServicos: resumoDFD.descricaoObjeto || prev.especificacaoBensServicos,
        item: resumoDFD.itens && resumoDFD.itens.length > 0 ? resumoDFD.itens[0] : prev.item,
        quantidade: resumoDFD.quantidadeTotal || prev.quantidade,
        unidade: 'UN', // padrão
        especificacaoDetalhada: resumoDFD.descricaoObjeto || prev.especificacaoDetalhada,
        
        // Responsáveis
        fiscalTitular: resumoDFD.fiscal || prev.fiscalTitular,
        gestorTitular: resumoDFD.gestor || prev.gestorTitular,
        
        // Dados do ETP - Bloco 1
        tipoObjeto: bloco1.tipoObjeto || prev.tipoObjeto,
        vigencia: bloco1.vigenciaContrato || prev.vigencia,
        localEntrega: bloco1.enderecoCompleto || prev.localEntrega,
        
        // Dados do ETP - Bloco 2
        criteriosSustentabilidade: bloco2.sustentabilidade !== 'Não informado no DFD' ? bloco2.sustentabilidade : prev.criteriosSustentabilidade,
        necessidadeTreinamento: bloco2.treinamento === 'Sim' || bloco2.treinamento === 'true',
        bemLuxo: bloco2.bemLuxo === 'Sim' || bloco2.bemLuxo === 'true',
        transicaoContratual: bloco2.transicaoContratual === 'Sim' || bloco2.transicaoContratual === 'true',
        normativosTecnicos: bloco2.normativosEspecificos !== 'Não informado no DFD' ? bloco2.normativosEspecificos : prev.normativosTecnicos,
        marcaEspecifica: bloco2.marcaEspecifica === 'Sim' || bloco2.marcaEspecifica === 'true',
        subcontratacao: bloco2.subcontratacao === 'Sim' || bloco2.subcontratacao === 'true',
        
        // Dados do ETP - Bloco 3
        estimativasQuantidades: {
          metodo: bloco3.metodologiaQuantitativo || prev.estimativasQuantidades.metodo,
          descricao: bloco3.descricaoDetalhada || prev.estimativasQuantidades.descricao
        },
        
        // Dados do ETP - Bloco 4
        levantamentoMercado: {
          fontes: bloco4.fontesPesquisa || prev.levantamentoMercado.fontes,
          justificativa: bloco4.justificativaTecnica || prev.levantamentoMercado.justificativa,
          restricoes: bloco4.restricoesMercado || prev.levantamentoMercado.restricoes,
          tratamentoME: bloco4.tratamentoMEEPP === 'Sim' || bloco4.tratamentoMEEPP === 'true'
        },
        
        // Dados do ETP - Bloco 5
        meiosPesquisaPrecos: bloco5.pesquisaPrecos || prev.meiosPesquisaPrecos,
        descricaoSolucao: bloco5.descricaoCompleta || prev.descricaoSolucao,
        prazoGarantia: bloco5.garantia || prev.prazoGarantia,
        assistenciaTecnica: bloco5.assistenciaTecnica === 'Sim' || bloco5.assistenciaTecnica === 'true',
        manutencao: bloco5.manutencao === 'Sim' || bloco5.manutencao === 'true',
        parcelamento: bloco5.parcelamento === 'Sim' || bloco5.parcelamento === 'true',
        
        // Dados do ETP - Bloco 6
        resultadosPretendidos: {
          beneficios: bloco6.beneficiosPretendidos || prev.resultadosPretendidos.beneficios,
          notaExplicativa: bloco6.notaExplicativa || prev.resultadosPretendidos.notaExplicativa
        },
        
        providenciasPrevias: {
          providencias: bloco6.providenciasPendentes || prev.providenciasPrevias.providencias,
          requisitosGestao: bloco6.gestaoFiscalizacao ? bloco6.gestaoFiscalizacao.split('Fiscalização:')[0] : prev.providenciasPrevias.requisitosGestao,
          requisitosFiscalizacao: bloco6.gestaoFiscalizacao ? bloco6.gestaoFiscalizacao.split('Fiscalização:')[1] || bloco6.gestaoFiscalizacao : prev.providenciasPrevias.requisitosFiscalizacao
        },
        
        contratacoesCorrelatas: bloco6.contratacoesRelacionadas === 'Sim' || bloco6.contratacoesRelacionadas === 'true',
        indicacaoContratacoesCorrelatas: bloco6.contratacoesRelacionadas !== 'Não informado no DFD' ? bloco6.contratacoesRelacionadas : prev.indicacaoContratacoesCorrelatas,
        
        // Dados do ETP - Bloco 7
        impactosAmbientais: bloco7.impactosAmbientais === 'Sim' || bloco7.impactosAmbientais === 'true',
        especificacaoImpactosAmbientais: bloco7.medidasMitigacao || prev.especificacaoImpactosAmbientais,
        
        posicionamentoConclusivo: {
          viabilidade: bloco7.viabilidadeContratacao === 'Sim' || bloco7.viabilidadeContratacao === 'true',
          textoConclusivo: bloco7.posicionamentoConclusivo || prev.posicionamentoConclusivo.textoConclusivo
        }
      }));
      
      showAlert({
        title: 'PDF Importado com Sucesso!',
        message: `Dados do DFD foram extraídos e preenchidos automaticamente nos campos do formulário. Revise as informações antes de prosseguir.`,
        type: 'success'
      });
      
    } catch (error) {
      console.error('Erro ao processar dados do PDF:', error);
      showAlert({
        title: 'Erro ao Importar',
        message: 'Houve um erro ao processar os dados do PDF. Verifique o arquivo e tente novamente.',
        type: 'error'
      });
    }
  };

  const formatCurrency = (value) => {
    if (!value) return '';
    const numericValue = value.replace(/\D/g, '');
    if (numericValue === '') return '';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(numericValue / 100);
  };

  const handleCurrencyChange = (name, value) => {
    const numericValue = value.replace(/\D/g, '');
    handleInputChange(name, numericValue);
  };
  const handleNext = () => {
    if (validateSection(currentSection)) {
      const sections = getCurrentSections();
      if (currentSection < sections.length - 1) {
        setCurrentSection(currentSection + 1);
      } else {
    
        if (currentDocument === 'dfd') {
         
          setCurrentDocument('etp');
          setCurrentSection(0);
           setFormData(prev => ({
            ...prev,
            numeroETP: prev.numeroDFD ? `${prev.numeroDFD}-ETP` : '',
            produtos: prev.produtos.map(produto => ({
              ...produto,
              codigoSIGA: produto.codigoSIGA || prev.codigoSIGA || ''
            })),
          
            descricaoNecessidade: prev.descricaoNecessidade,
            valorEstimado: prev.valorEstimado,
            classificacaoOrcamentaria: prev.classificacaoOrcamentaria,
            fonte: prev.fonte,
            elementoDespesa: prev.elementoDespesa,
            previsaoPCA: prev.previsaoPCA,
            justificativaPCA: prev.justificativaPCA
          }));
          

          setTimeout(() => {
            showAlert({
              title: 'DFD Finalizado!',
              message: 'DFD finalizado com sucesso! Agora você está preenchendo o ETP. Alguns campos foram preenchidos automaticamente com base no DFD.',
              type: 'success'
            });
          }, 100);
        }
       
      }
    }
  };

  const handlePrevious = () => {
    if (currentSection > 0) {
      setCurrentSection(currentSection - 1);
    }
  };

  // Função para processar DFD individualmente
  const handleProcessDFD = async () => {
    if (!validateSection(currentSection)) return;
    
    setIsGenerating(true);
    setProcessingType('dfd');
    setGenerationProgress(0);
    setGenerationMessage('Processando DFD...');
    
    try {
      const mappedData = mapFormDataToBackend(formData);
      
      setGenerationProgress(50);
      setGenerationMessage('Salvando dados do DFD...');
      
      const response = await fetch('/api/documentos/processar-dfd', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(mappedData)
      });
      
      setGenerationProgress(100);
      
      if (response.ok) {
        const result = await response.json();
        setIsGenerating(false);
        
        showAlert({
          title: '✅ DFD Processado!',
          message: `DFD processado com sucesso!\n\nID: ${result.documento.id}\nNúmero: ${result.documento.numeroDFD}\nStatus: Pronto para download`,
          type: 'success'
        });
        
        // Opcional: redirecionar para lista de documentos
        setTimeout(() => {
          router.push('/documentos');
        }, 2000);
        
      } else {
        const error = await response.json();
        setIsGenerating(false);
        showAlert({
          title: 'Erro ao Processar DFD',
          message: `Erro: ${error.error}`,
          type: 'error'
        });
      }
    } catch (error) {
      setIsGenerating(false);
      showAlert({
        title: 'Erro de Conexão',
        message: 'Erro de conexão ao processar DFD.',
        type: 'error'
      });
    }
  };
  
  // Função para processar ETP individualmente
  const handleProcessETP = async () => {
    if (!validateSection(currentSection)) return;
    
    setIsGenerating(true);
    setProcessingType('etp');
    setGenerationProgress(0);
    setGenerationMessage('Iniciando processamento ETP...');
    
    try {
      const mappedData = mapFormDataToBackend(formData);
      
      setGenerationProgress(30);
      setGenerationMessage('Enviando dados para IA...');
      
      const response = await fetch('/api/documentos/processar-etp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(mappedData)
      });
      
      setGenerationProgress(100);
      setGenerationMessage('Salvando dados processados...');
      
      if (response.ok) {
        const result = await response.json();
        setIsGenerating(false);
        
        showAlert({
          title: '✅ ETP Processado!',
          message: `ETP processado ${result.processamento.usouIA ? 'com IA' : 'com dados do formulário'}!\n\nID: ${result.documento.id}\nNúmero: ${result.documento.numeroETP}\nTokens usados: ${result.processamento.tokensGastos}\nStatus: Pronto para download`,
          type: 'success'
        });
        
        // Opcional: redirecionar para lista de documentos
        setTimeout(() => {
          router.push('/documentos');
        }, 2000);
        
      } else {
        const error = await response.json();
        setIsGenerating(false);
        showAlert({
          title: 'Erro ao Processar ETP',
          message: `Erro: ${error.error}`,
          type: 'error'
        });
      }
    } catch (error) {
      setIsGenerating(false);
      showAlert({
        title: 'Erro de Conexão',
        message: 'Erro de conexão ao processar ETP.',
        type: 'error'
      });
    }
  };

  const handleGenerateDocuments = async () => {
    if (validateSection(currentSection)) {
      try {
        console.log('🚀 Gerando documentos com IA...');
        
        const mappedData = mapFormDataToBackend(formData);
        console.log('📊 Dados mapeados para o backend:', mappedData);
        
        const response = await fetch('/api/documentos/gerar', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify(mappedData)
        });

        if (response.ok) {
          const result = await response.json();
          console.log('âœ… Documentos gerados com sucesso:', result);
          
          const docsInfo = result.documentsGenerated.map(doc => 
            `â€¢ ${doc.type}: ${doc.fileName} (${(doc.size / 1024).toFixed(2)} KB)`
          ).join('\n');
          
          const errorInfo = result.errors.length > 0 ? 
            `\n\nâš ï¸ Erros:\n${result.errors.map(err => `â€¢ ${err.type}: ${err.error}`).join('\n')}` : '';
          
          showAlert({
            title: '🎉 Documentos Gerados!',
            message: `Documentos gerados com sucesso!\n\nResumo:\n• SGD: ${result.resumo.numeroSGD}\n• Documentos gerados: ${result.resumo.documentosGerados}\n• ${result.resumo.processamento || 'Processamento concluído'}\n\n📄 Arquivos:\n${docsInfo}${errorInfo}\n\n📁 Local: documentos/gerados/`,
            type: 'success'
          });

        } else {
          const error = await response.json();
          console.error('âŒ Erro na geração:', error);
          showAlert({
            title: 'Erro ao Gerar Documentos',
            message: `Erro ao gerar documentos: ${error.error}\n\nDetalhes: ${error.details || 'Erro desconhecido'}`,
            type: 'error'
          });
        }
      } catch (error) {
        console.error('❌ Erro ao gerar documentos:', error);
        showAlert({
          title: 'Erro de Conexão',
          message: 'Erro de conexão ao gerar documentos. Verifique sua internet e tente novamente.',
          type: 'error'
        });
      }
    }
  };


  const handleSubmit = async () => {
    if (validateSection(currentSection)) {
      if (currentDocument === 'dfd') {

        setCurrentDocument('etp');
        setCurrentSection(0);
        setFormData(prev => ({
          ...prev,
          numeroETP: prev.numeroDFD ? `${prev.numeroDFD}-ETP` : '',
          produtos: prev.produtos.map(produto => ({
            ...produto,
            codigoSIGA: produto.codigoSIGA || prev.codigoSIGA || ''
          })),
       
          descricaoNecessidade: prev.descricaoNecessidade,
          valorEstimado: prev.valorEstimado,
          classificacaoOrcamentaria: prev.classificacaoOrcamentaria,
          fonte: prev.fonte,
          elementoDespesa: prev.elementoDespesa,
          previsaoPCA: prev.previsaoPCA,
          justificativaPCA: prev.justificativaPCA
        }));
        
       
        setTimeout(() => {
          alert('DFD finalizado com sucesso! Agora você está preenchendo o ETP. Alguns campos foram preenchidos automaticamente com base no DFD.');
        }, 100);
      } else {
      
        await generateDocumentsWithLoading();
      }
    }
  };

 
  const mapFormDataToBackend = (frontendData) => {
    return {
      numeroSGD: frontendData.numeroSGD,
      descricaoNecessidade: frontendData.descricaoNecessidade,
      valorEstimado: parseFloat(frontendData.valorEstimado) / 100 || 0, 
      classificacaoOrcamentaria: frontendData.classificacaoOrcamentaria,
      fonte: frontendData.fonte,
      elementoDespesa: frontendData.elementoDespesa,
      previsaoPCA: frontendData.previsaoPCA,
      protocoloPNCP: frontendData.protocoloPNCP || '', 
      justificativaPCA: frontendData.justificativaPCA || '',
      
      numeroDFD: frontendData.numeroDFD,
      recursoConvenio: frontendData.recursoConvenio,
      acaoOrcamentariaNumero: frontendData.acaoOrcamentariaNumero || '', 
      
    
      itens: frontendData.item ? [{
        item: "1",
        qtd: frontendData.quantidade || "1",
        unid: frontendData.unidade || "UN",
        codigo_siga_item: frontendData.codigoSIGA || frontendData.elementoDespesa,
        especificacao_item: frontendData.especificacaoDetalhada || frontendData.descricaoNecessidade
      }] : [],
      
      fiscalTitular: frontendData.fiscalTitular,
      fiscalSuplente: frontendData.fiscalSuplente,
      gestorTitular: frontendData.gestorTitular,
      gestorSuplente: frontendData.gestorSuplente,
      
      demandante: frontendData.demandante,
      responsaveisAcaoOrcamentaria: frontendData.responsaveisAcaoOrcamentaria,
      responsavelPlanejamento: frontendData.responsavelPlanejamento,
      
      numeroETP: frontendData.numeroETP,
      tipoObjeto: frontendData.tipoObjeto,
      natureza: frontendData.natureza,
      vigencia: frontendData.vigencia,
      prorrogavel: frontendData.prorrogavel,
      servicoContinuado: frontendData.servicoContinuado,
      
      produto: frontendData.produtos && frontendData.produtos.length > 0 ? frontendData.produtos[0] : { item: '', codigoSIGA: '', descricao: '' },
      produtos: frontendData.produtos || [],
      criteriosSustentabilidade: frontendData.criteriosSustentabilidade,
      necessidadeTreinamento: frontendData.necessidadeTreinamento,
      bemLuxo: frontendData.bemLuxo,
      transicaoContratual: frontendData.transicaoContratual,
      normativosTecnicos: frontendData.normativosTecnicos,
      localEntrega: frontendData.localEntrega,
      amostraProvaConceito: frontendData.amostraProvaConceito,
      marcaEspecifica: frontendData.marcaEspecifica,
      subcontratacao: frontendData.subcontratacao,
      
      estimativasQuantidades: frontendData.estimativasQuantidades,
      
    
      serieHistorica: {
        exercicio: frontendData.serieHistorica.exercicio,
        quantidadeConsumida: frontendData.serieHistorica.quantidadeConsumida,
        unidade: frontendData.serieHistorica.unidade,
        descricao: `Consumo de ${frontendData.descricaoNecessidade || 'itens'} no exercício anterior`,
        pae: `PAE-${frontendData.serieHistorica.exercicio}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`
      },
      
      quantitativos: frontendData.quantitativos.item ? [{
        item: frontendData.quantitativos.item,
        descricao: frontendData.quantitativos.descricao,
        unidade: frontendData.quantitativos.unidade,
        quantidade: frontendData.quantitativos.quantidade
      }] : [],
 
      levantamentoMercado: {
        fontes: frontendData.levantamentoMercado.fontes ? 
          frontendData.levantamentoMercado.fontes.split(',').map(f => f.trim()) : 
          ["similares", "internet"],
        justificativaTecnica: frontendData.levantamentoMercado.justificativa || 'A solução escolhida atende aos requisitos técnicos.',
        justificativaEconomica: 'A análise de custo-benefício indica viabilidade econômica da contratação.'
      },
      
      restricaoFornecedores: false, 
      tratamentoDiferenciado: frontendData.levantamentoMercado?.tratamentoME || true,
      
   
      meiosPesquisa: frontendData.meiosPesquisaPrecos ? 
        frontendData.meiosPesquisaPrecos.split(',').map(m => m.trim()) : 
        ["sites", "contratacoes"],
      
      descricaoSolucao: frontendData.descricaoSolucao,
  
      prazoGarantia: frontendData.prazoGarantia ? 
        frontendData.prazoGarantia.replace(/\s+/g, '_').toLowerCase() : 
        "12_meses",
      
      assistenciaTecnica: frontendData.assistenciaTecnica,
      manutencao: frontendData.manutencao,
      parcelamento: frontendData.parcelamento,
      justificativaParcelamento: frontendData.justificativaParcelamento,
      
  
      beneficios: frontendData.resultadosPretendidos?.beneficios ? 
        frontendData.resultadosPretendidos.beneficios.split(',').map(b => b.trim()) : 
        ["eficiencia", "qualidade"],
      

      providenciasPendentes: frontendData.providenciasPrevias?.providencias || 'Nenhuma providência pendente.',
      requisitosGestao: frontendData.providenciasPrevias?.requisitosGestao || 'Acompanhamento da execução contratual.',
      requisitosFiscalizacao: frontendData.providenciasPrevias?.requisitosFiscalizacao || 'Verificação de conformidade técnica.',
      
      contratacoesCorrelatas: frontendData.contratacoesCorrelatas,
      impactosAmbientais: frontendData.especificacaoImpactosAmbientais || 'Impactos ambientais mínimos, conforme legislação aplicável.',
      
      posicionamentoConclusivo: frontendData.posicionamentoConclusivo
    };
  };


  const generateDocumentsWithLoading = async () => {
    setIsGenerating(true);
    setGenerationProgress(0);
    setGenerationMessage('Iniciando geração de documentos...');

    try {
   
      const progressSteps = [
        { progress: 15, message: 'Processando dados do formulário...', delay: 500 },
        { progress: 30, message: 'Preparando geração de documentos...', delay: 1000 },
        { progress: 50, message: 'Gerando DFD (sem IA)...', delay: 2000 },
        { progress: 70, message: 'Processando ETP com IA...', delay: 5000 },
        { progress: 90, message: 'Gerando documento ETP...', delay: 3000 },
        { progress: 100, message: 'Finalizando e salvando documentos...', delay: 1000 }
      ];


      for (const step of progressSteps) {
        await new Promise(resolve => setTimeout(resolve, step.delay));
        setGenerationProgress(step.progress);
        setGenerationMessage(step.message);
      }

     
      const mappedData = mapFormDataToBackend(formData);
      console.log('📊 Dados mapeados para o backend:', mappedData);
      
      const response = await fetch('/api/documentos/gerar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(mappedData)
      });

      if (response.ok) {
        const result = await response.json();
        setDocuments(result.documents || []);
        setIsGenerating(false);
        setShowDownloadModal(true);
      } else {
        const error = await response.json();
        setIsGenerating(false);
        showAlert({
          title: 'Erro ao Gerar Documentos',
          message: `Erro ao gerar documentos: ${error.error}`,
          type: 'error'
        });
      }
    } catch (error) {
      setIsGenerating(false);
      showAlert({
        title: 'Erro de Conexão',
        message: 'Erro de conexão ao gerar documentos. Verifique sua internet e tente novamente.',
        type: 'error'
      });
    }
  };

  const handleCloseGenerationModal = () => {
    setIsGenerating(false);
    setGenerationProgress(0);
    setGenerationMessage('');
  };


  const handleDownload = async (documentId) => {
    try {
      const response = await fetch(`/api/documentos/download/${documentId}`, {
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
        const filename = contentDisposition 
          ? contentDisposition.split('filename=')[1]?.replace(/"/g, '')
          : 'documento.docx';
        
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } else {
        showAlert({
          title: 'Erro no Download',
          message: 'Erro ao baixar o documento',
          type: 'error'
        });
      }
    } catch (error) {
      console.error('Erro no download:', error);
      showAlert({
        title: 'Erro no Download',
        message: 'Erro ao baixar o documento',
        type: 'error'
      });
    }
  };

  const renderField = (field) => {
    const value = field.name.includes('.') 
      ? formData[field.name.split('.')[0]]?.[field.name.split('.')[1]] || ''
      : formData[field.name] || '';

    const error = errors[field.name];

    if (field.type === 'dynamic_array' && field.name === 'responsaveisAcaoOrcamentaria') {
      const responsaveis = formData.responsaveisAcaoOrcamentaria || [];
      const hasError = errors[field.name];
      
      return (
        <div key={field.name} className="space-y-4 col-span-2">
          <Label className="text-sm font-medium">
            {field.label} {field.required && <span className="text-red-500">*</span>}
          </Label>
          
          {responsaveis.map((responsavel, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4 space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="text-md font-medium text-gray-700">
                  ResponsÃ¡vel {index + 1}
                </h4>
                {responsaveis.length > 1 && (
                  <Button
                    type="button"
                    onClick={() => removeResponsavelAcaoOrcamentaria(index)}
                    variant="outline"
                    size="sm"
                    className="text-red-600 border-red-300 hover:bg-red-50"
                  >
                    âŒ Remover
                  </Button>
                )}
              </div>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Nome <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="text"
                    value={responsavel.nome || ''}
                    onChange={(e) => handleResponsavelAcaoOrcamentariaChange(index, 'nome', e.target.value)}
                    className={`focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors[`responsaveisAcaoOrcamentaria[${index}].nome`] ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Nome completo"
                  />
                  {errors[`responsaveisAcaoOrcamentaria[${index}].nome`] && (
                    <p className="text-red-500 text-sm">{errors[`responsaveisAcaoOrcamentaria[${index}].nome`]}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    NÃºmero Funcional <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="text"
                    value={responsavel.numeroFuncional || ''}
                    onChange={(e) => handleResponsavelAcaoOrcamentariaChange(index, 'numeroFuncional', e.target.value)}
                    className={`focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors[`responsaveisAcaoOrcamentaria[${index}].numeroFuncional`] ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="NÃºmero funcional"
                  />
                  {errors[`responsaveisAcaoOrcamentaria[${index}].numeroFuncional`] && (
                    <p className="text-red-500 text-sm">{errors[`responsaveisAcaoOrcamentaria[${index}].numeroFuncional`]}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
          
          <Button
            type="button"
            onClick={addResponsavelAcaoOrcamentaria}
            variant="outline"
            className="w-full border-dashed border-blue-300 text-blue-600 hover:bg-blue-50"
          >
            âž• Adicionar ResponsÃ¡vel
          </Button>
          
          {hasError && <p className="text-red-500 text-sm">{hasError}</p>}
        </div>
      );
    }

    if (field.type === 'dynamic_array' && field.name === 'produtos') {
      const produtos = formData.produtos || [];
      const hasError = errors[field.name];
      
      return (
        <div key={field.name} className="space-y-4 col-span-2">
          <Label className="text-sm font-medium">
            {field.label} {field.required && <span className="text-red-500">*</span>}
          </Label>
          
          {produtos.map((produto, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4 space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="text-md font-medium text-gray-700">
                  Produto {index + 1}
                </h4>
                {produtos.length > 1 && (
                  <Button
                    type="button"
                    onClick={() => removeProduto(index)}
                    variant="outline"
                    size="sm"
                    className="text-red-600 border-red-300 hover:bg-red-50"
                  >
                    âŒ Remover
                  </Button>
                )}
              </div>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Item <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="text"
                    value={produto.item || ''}
                    onChange={(e) => handleProdutoChange(index, 'item', e.target.value)}
                    className={`focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors[`produtos[${index}].item`] ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Nome do item"
                  />
                  {errors[`produtos[${index}].item`] && (
                    <p className="text-red-500 text-sm">{errors[`produtos[${index}].item`]}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Código SIGA <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="text"
                    value={produto.codigoSIGA || ''}
                    onChange={(e) => handleProdutoChange(index, 'codigoSIGA', e.target.value)}
                    className={`focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors[`produtos[${index}].codigoSIGA`] ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Código SIGA"
                  />
                  {errors[`produtos[${index}].codigoSIGA`] && (
                    <p className="text-red-500 text-sm">{errors[`produtos[${index}].codigoSIGA`]}</p>
                  )}
                </div>
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Descrição Detalhada <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  value={produto.descricao || ''}
                  onChange={(e) => handleProdutoChange(index, 'descricao', e.target.value)}
                  className={`focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors[`produtos[${index}].descricao`] ? 'border-red-500' : 'border-gray-300'
                  }`}
                  rows={3}
                  placeholder="Descrição detalhada do produto/serviço"
                />
                {errors[`produtos[${index}].descricao`] && (
                  <p className="text-red-500 text-sm">{errors[`produtos[${index}].descricao`]}</p>
                )}
              </div>
            </div>
          ))}
          
          <Button
            type="button"
            onClick={addProduto}
            variant="outline"
            className="w-full border-dashed border-blue-300 text-blue-600 hover:bg-blue-50"
          >
            âž• Adicionar Produto
          </Button>
          
          {hasError && <p className="text-red-500 text-sm">{hasError}</p>}
        </div>
      );
    }

    if (field.type === 'textarea') {
      return (
        <div key={field.name} className="space-y-2">
          <Label htmlFor={field.name} className="text-sm font-medium">
            {field.label} {field.required && <span className="text-red-500">*</span>}
          </Label>
          <Textarea
            id={field.name}
            value={value}
            onChange={(e) => handleInputChange(field.name, e.target.value)}
            className={`focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              error ? 'border-red-500' : 'border-gray-300'
            }`}
            rows={4}
            required={field.required}
            placeholder={field.placeholder}
          />
          {error && <p className="text-red-500 text-sm">{error}</p>}
        </div>
      );
    }

    if (field.type === 'checkbox') {
      return (
        <div key={field.name} className="flex items-center space-x-2">
          <input
            type="checkbox"
            id={field.name}
            checked={value}
            onChange={(e) => handleInputChange(field.name, e.target.checked)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <Label htmlFor={field.name} className="text-sm font-medium">
            {field.label}
          </Label>
        </div>
      );
    }

    if (field.type === 'select') {
      return (
        <div key={field.name} className="space-y-2">
          <Label htmlFor={field.name} className="text-sm font-medium">
            {field.label} {field.required && <span className="text-red-500">*</span>}
          </Label>
          <Select value={value} onValueChange={(value) => handleInputChange(field.name, value)}>
            <SelectTrigger className={`focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              error ? 'border-red-500' : 'border-gray-300'
            }`}>
              <SelectValue placeholder={`Selecione ${field.label.toLowerCase()}`} />
            </SelectTrigger>
            <SelectContent>
              {field.options.map(option => (
                <SelectItem key={option} value={option}>{option}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {error && <p className="text-red-500 text-sm">{error}</p>}
        </div>
      );
    }

    if (field.type === 'currency') {
      return (
        <div key={field.name} className="space-y-2">
          <Label htmlFor={field.name} className="text-sm font-medium">
            {field.label} {field.required && <span className="text-red-500">*</span>}
          </Label>
          <Input
            id={field.name}
            type="text"
            value={formatCurrency(value)}
            onChange={(e) => handleCurrencyChange(field.name, e.target.value)}
            required={field.required}
            placeholder="R$ 0,00"
            className={`focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              error ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {error && <p className="text-red-500 text-sm">{error}</p>}
        </div>
      );
    }

    return (
      <div key={field.name} className="space-y-2">
        <Label htmlFor={field.name} className="text-sm font-medium">
          {field.label} {field.required && <span className="text-red-500">*</span>}
        </Label>
        <Input
          id={field.name}
          type={field.type}
          value={value}
          onChange={(e) => handleInputChange(field.name, e.target.value)}
          required={field.required}
          placeholder={field.placeholder}
          className={`focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
            error ? 'border-red-500' : 'border-gray-300'
          }`}
        />
        {error && <p className="text-red-500 text-sm">{error}</p>}
      </div>
    );
  };

  const currentSections = getCurrentSections();
  const currentSectionsLength = getCurrentSectionsLength();

  return (
    <ProtectedRoute>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {currentDocument === 'dfd' ? 'Criar DFD' : 'Criar ETP'}
            </h1>
            <p className="text-gray-600">
              Seção {currentSection + 1} de {currentSectionsLength}: {currentSections[currentSection].title}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              {currentSections[currentSection].description}
            </p>
            
            {/* Indicador de documento atual */}
            <div className="mt-4 flex justify-center space-x-4">
              <div className={`px-4 py-2 rounded-lg ${currentDocument === 'dfd' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'}`}>
                📋 DFD {currentDocument === 'dfd' ? '(Atual)' : ''}
              </div>
              <div className={`px-4 py-2 rounded-lg ${currentDocument === 'etp' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                📝 ETP {currentDocument === 'etp' ? '(Atual)' : ''}
              </div>
            </div>
            
            {/* Botão de Importar PDF - apenas no ETP */}
            {currentDocument === 'etp' && (
              <div className="mt-4">
                <Button
                  onClick={() => setShowPDFImportModal(true)}
                  variant="outline"
                  className="bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Importar ETP do PDF
                </Button>
                <p className="text-xs text-gray-500 mt-2">
                  Carregue um PDF do ETP e a IA preencherá automaticamente os campos
                </p>
              </div>
            )}
          </div>

          {/* Progress Bar */}
          <div className="mb-8">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all duration-300 ${
                  currentDocument === 'dfd' ? 'bg-blue-600' : 'bg-green-600'
                }`}
                style={{ width: `${((currentSection + 1) / currentSectionsLength) * 100}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-sm text-gray-600 mt-2">
              {currentSections.map((section, index) => (
                <span 
                  key={index}
                  className={`cursor-pointer ${index <= currentSection ? 'text-blue-600 font-medium' : ''}`}
                  onClick={() => setCurrentSection(index)}
                >
                  {index + 1}
                </span>
              ))}
            </div>
          </div>

          {/* Current Section */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className={`text-xl ${currentDocument === 'dfd' ? 'text-blue-600' : 'text-green-600'}`}>
                {currentSections[currentSection].title}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                {currentSections[currentSection].fields.map(renderField)}
              </div>
            </CardContent>
          </Card>

          {/* Navigation */}
          <div className="flex justify-between">
            <Button
              onClick={handlePrevious}
              disabled={currentSection === 0}
              variant="outline"
              className="px-6"
            >
              ← Anterior
            </Button>

            {currentSection === currentSectionsLength - 1 ? (
              <Button
                onClick={handleSubmit}
                className={`px-6 text-white ${
                  currentDocument === 'dfd' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {currentDocument === 'dfd' ? '✅ Finalizar DFD' : '✅ Finalizar ETP'}
              </Button>
            ) : (
              <Button
                onClick={handleNext}
                className={`px-6 text-white ${
                  currentDocument === 'dfd' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                Próximo →
              </Button>
            )}
          </div>

          {/* Botões de Geração Individual */}
          <div className="text-center mt-6">
            <div className="flex justify-center space-x-4">
              {/* Botão para gerar DFD - aparece quando finalizar DFD */}
              {currentDocument === 'dfd' && currentSection === currentSectionsLength - 1 && (
                <div className="text-center">
                  <Button
                    onClick={handleProcessDFD}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6"
                    disabled={isGenerating}
                  >
                    📋 Processar DFD
                  </Button>
                  <p className="text-xs text-gray-500 mt-2">
                    Salva dados do DFD no banco (sem IA)
                  </p>
                </div>
              )}
              
              {/* Botão para gerar ETP - aparece quando finalizar ETP */}
              {currentDocument === 'etp' && currentSection === currentSectionsLength - 1 && (
                <div className="text-center">
                  <Button
                    onClick={handleProcessETP}
                    className="bg-green-600 hover:bg-green-700 text-white px-6"
                    disabled={isGenerating}
                  >
                    🔍 Processar ETP
                  </Button>
                  <p className="text-xs text-gray-500 mt-2">
                    Processa ETP com IA e salva no banco
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Sistema agora usa modal de carregamento síncrono */}
        </div>

        {/* Modal de Download */}
        {showDownloadModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <div className="text-center mb-4">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
                <h2 className="text-xl font-bold text-gray-900 mb-2">
                  🎉 Documentos Prontos!
                </h2>
                <p className="text-gray-600">
                  Documentos processados com sucesso. Clique em "Gerar e Baixar" para criar os arquivos DOCX.
                </p>
              </div>
              
              <div className="space-y-3 mb-6">
                {documents.map((doc, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 font-medium text-sm">{doc.type}</span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{doc.fileName}</p>
                        <p className="text-xs text-gray-500">
                          {Math.round(doc.size / 1024)} KB
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={() => handleDownload(doc.id)}
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Gerar e Baixar
                    </Button>
                  </div>
                ))}
              </div>
              
              <div className="flex gap-3">
                <Button
                  onClick={() => {
                    setShowDownloadModal(false);
                    router.push('/documentos');
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  Ver Lista
                </Button>
                <Button
                  onClick={() => setShowDownloadModal(false)}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                >
                  Fechar
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Carregamento Minimizável */}
        <MinimizableLoadingModal
          isOpen={isGenerating}
          progress={generationProgress}
          message={generationMessage || `Processando ${processingType?.toUpperCase() || 'documento'}...`}
          onClose={handleCloseGenerationModal}
        />

        {/* Alert Component */}
        <AlertComponent />
        
        {/* Modal de Importação de PDF */}
        <PDFImportModal
          isOpen={showPDFImportModal}
          onClose={() => setShowPDFImportModal(false)}
          onDataExtracted={handlePDFDataExtracted}
        />
      </div>
    </ProtectedRoute>
  );
}
