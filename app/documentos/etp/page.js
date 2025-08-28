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
import MinimizableLoadingModal from '../../../components/MinimizableLoadingModal';
import { useCustomAlert } from '../../../components/CustomAlert';
import { Download, CheckCircle, AlertCircle, Clock, FileText, Upload, ArrowLeft } from 'lucide-react';
import DFDImportModal from '../../../components/DFDImportModal';

export default function CriarETPPage() {
  const router = useRouter();
  const { showAlert, AlertComponent } = useCustomAlert();
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationMessage, setGenerationMessage] = useState('');
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [documents, setDocuments] = useState([]);
     const [showDFDImportModal, setShowDFDImportModal] = useState(false);
  
  const [formData, setFormData] = useState({
    // Dados básicos do ETP
    numeroSGD: '',           // Número do SGD (obrigatório)
    numeroETP: '',
    tipoObjeto: 'Bem',
    natureza: 'não continuada',
    vigencia: '',
    prorrogavel: false,
    servicoContinuado: false,
    justificativaServicoContinuado: '',
    
    // Dados do DFD (importados)
    descricaoNecessidade: '',
    valorEstimado: '',
    classificacaoOrcamentaria: '',
    fonte: '',
    elementoDespesa: '',
    previsaoPCA: false,
    recursoConvenio: false,
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
    responsavelPlanejamento: {
      nome: '',
      cargo: '',
      numeroFuncional: ''
    },
    responsaveisAcaoOrcamentaria: [],
    itens: [],
    assinaturas: {
      gerenteConvenios: '',
      gerenteCompras: '',
      ordenadorDespesa: ''
    },
    dataDocumento: '',
    localDocumento: '',
    
    // Produtos
    produtos: [
      {
        item: '',
        codigoSIGA: '',
        descricao: ''
      }
    ],
    
    // Critérios de sustentabilidade
    criteriosSustentabilidade: '',
    necessidadeTreinamento: false,
    bemLuxo: false,
    transicaoContratual: false,
    normativosTecnicos: '',
    localEntrega: '',
    amostraProvaConceito: false,
    marcaEspecifica: false,
    subcontratacao: false,
    
    // Estimativas e quantidades
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
    
    // Levantamento de mercado
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
    
    // Resultados pretendidos
    resultadosPretendidos: {
      beneficios: '',
      notaExplicativa: ''
    },
    
    // Providências prévias
    providenciasPrevias: {
      providencias: '',
      requisitosGestao: '',
      requisitosFiscalizacao: ''
    },
    
    // Contratações correlatas
    contratacoesCorrelatas: false,
    indicacaoContratacoesCorrelatas: '',
    
    // Impactos ambientais
    impactosAmbientais: false,
    especificacaoImpactosAmbientais: '',
    
    // Posicionamento conclusivo
    posicionamentoConclusivo: {
      viabilidade: true,
      textoConclusivo: ''
    }
  });

  const [currentSection, setCurrentSection] = useState(0);
  const [errors, setErrors] = useState({});

  const etpSections = [
    {
      title: '0. Dados Importados do DFD',
      description: 'Informações extraídas do Documento de Formalização de Demanda',
      fields: [
        { name: 'descricaoNecessidade', label: 'Descrição da Necessidade', type: 'textarea', rows: 4, readOnly: true },
        { name: 'valorEstimado', label: 'Valor Estimado', type: 'text', readOnly: true },
        { name: 'classificacaoOrcamentaria', label: 'Classificação Orçamentária', type: 'text', readOnly: true },
        { name: 'fonte', label: 'Fonte', type: 'text', readOnly: true },
        { name: 'elementoDespesa', label: 'Elemento de Despesa', type: 'text', readOnly: true },
        { name: 'fiscalTitular', label: 'Fiscal Titular', type: 'text', readOnly: true },
        { name: 'gestorTitular', label: 'Gestor Titular', type: 'text', readOnly: true },
        { name: 'demandante.nome', label: 'Demandante', type: 'text', readOnly: true },
        { name: 'responsavelPlanejamento.nome', label: 'Responsável Planejamento', type: 'text', readOnly: true },
        { name: 'dataDocumento', label: 'Data do Documento', type: 'text', readOnly: true },
        { name: 'localDocumento', label: 'Local', type: 'text', readOnly: true }
      ],
      showOnlyIf: 'hasDFDData'
    },
    {
      title: '1. Identificação e Caracterização do Objeto',
      description: 'Dados básicos do ETP',
      fields: [
        { name: 'numeroSGD', label: 'Número do SGD', type: 'text', required: true },
        { name: 'numeroETP', label: 'Número do ETP', type: 'text', required: true },
        { name: 'tipoObjeto', label: 'Tipo do Objeto', type: 'select', required: true, options: ['Bem', 'Serviço'] },
        { name: 'natureza', label: 'Natureza', type: 'select', required: true, options: ['não continuada', 'continuada'] },
        { name: 'vigencia', label: 'Vigência', type: 'text' },
        { name: 'prorrogavel', label: 'Prorrogável?', type: 'checkbox' },
        { name: 'servicoContinuado', label: 'Serviço Continuado?', type: 'checkbox' },
        { name: 'justificativaServicoContinuado', label: 'Justificativa do Serviço Continuado', type: 'textarea', rows: 3, showIf: 'servicoContinuado' }
      ]
    },
    {
      title: '2. Especificação do Objeto',
      description: 'Detalhamento dos produtos/serviços',
      fields: [
        { name: 'produtos.0.item', label: 'Item Principal', type: 'text', required: true },
        { name: 'produtos.0.codigoSIGA', label: 'Código SIGA', type: 'text', required: true },
        { name: 'produtos.0.descricao', label: 'Descrição Detalhada', type: 'textarea', required: true, rows: 4 }
      ]
    },
    {
      title: '3. Critérios de Sustentabilidade',
      description: 'Aspectos ambientais e sociais',
      fields: [
        { name: 'criteriosSustentabilidade', label: 'Critérios de Sustentabilidade', type: 'textarea', rows: 4 },
        { name: 'necessidadeTreinamento', label: 'Necessidade de Treinamento?', type: 'checkbox' },
        { name: 'bemLuxo', label: 'Bem de Luxo?', type: 'checkbox' },
        { name: 'justificativaBemLuxo', label: 'Justificativa do Bem de Luxo', type: 'textarea', rows: 3, showIf: 'bemLuxo' },
        { name: 'transicaoContratual', label: 'Transição Contratual?', type: 'checkbox' }
      ]
    },
    {
      title: '4. Aspectos Técnicos',
      description: 'Especificações técnicas e normativas',
      fields: [
        { name: 'normativosTecnicos', label: 'Normativos Técnicos', type: 'textarea', rows: 3 },
        { name: 'localEntrega', label: 'Local de Entrega', type: 'text' },
        { name: 'amostraProvaConceito', label: 'Amostra/Prova de Conceito?', type: 'checkbox' },
        { name: 'marcaEspecifica', label: 'Marca Específica?', type: 'checkbox' },
        { name: 'subcontratacao', label: 'Permite Subcontratação?', type: 'checkbox' }
      ]
    },
    {
      title: '5. Estimativas de Quantidades',
      description: 'Métodos e dados históricos',
      fields: [
        { name: 'estimativasQuantidades.metodo', label: 'Método de Estimativa', type: 'text' },
        { name: 'estimativasQuantidades.descricao', label: 'Descrição do Método', type: 'textarea', rows: 3 },
        { name: 'serieHistorica.exercicio', label: 'Exercício (Série Histórica)', type: 'text' },
        { name: 'serieHistorica.quantidadeConsumida', label: 'Quantidade Consumida', type: 'text' },
        { name: 'serieHistorica.unidade', label: 'Unidade', type: 'text' }
      ]
    },
    {
      title: '6. Levantamento de Mercado',
      description: 'Pesquisa de preços e fornecedores',
      fields: [
        { name: 'levantamentoMercado.fontes', label: 'Fontes de Pesquisa', type: 'textarea', rows: 3 },
        { name: 'levantamentoMercado.justificativa', label: 'Justificativa', type: 'textarea', rows: 3 },
        { name: 'levantamentoMercado.restricoes', label: 'Restrições', type: 'textarea', rows: 2 },
        { name: 'levantamentoMercado.tratamentoME', label: 'Tratamento Diferenciado ME/EPP?', type: 'checkbox' }
      ]
    },
    {
      title: '7. Aspectos Contratuais',
      description: 'Garantias e manutenção',
      fields: [
        { name: 'prazoGarantia', label: 'Prazo de Garantia', type: 'text' },
        { name: 'assistenciaTecnica', label: 'Assistência Técnica?', type: 'checkbox' },
        { name: 'manutencao', label: 'Manutenção?', type: 'checkbox' },
        { name: 'parcelamento', label: 'Permite Parcelamento?', type: 'checkbox' },
        { name: 'justificativaParcelamento', label: 'Justificativa do Parcelamento', type: 'textarea', rows: 3 }
      ]
    },
    {
      title: '8. Resultados Pretendidos',
      description: 'Benefícios esperados',
      fields: [
        { name: 'resultadosPretendidos.beneficios', label: 'Benefícios Esperados', type: 'textarea', required: true, rows: 4 },
        { name: 'resultadosPretendidos.notaExplicativa', label: 'Nota Explicativa', type: 'textarea', rows: 3 }
      ]
    },
    {
      title: '9. Providências Prévias',
      description: 'Requisitos de gestão e fiscalização',
      fields: [
        { name: 'providenciasPrevias.providencias', label: 'Providências Necessárias', type: 'textarea', rows: 3 },
        { name: 'providenciasPrevias.requisitosGestao', label: 'Requisitos de Gestão', type: 'textarea', rows: 3 },
        { name: 'providenciasPrevias.requisitosFiscalizacao', label: 'Requisitos de Fiscalização', type: 'textarea', rows: 3 }
      ]
    },
    {
      title: '10. Contratações Correlatas e Impactos',
      description: 'Análise de correlações e impactos ambientais',
      fields: [
        { name: 'contratacoesCorrelatas', label: 'Há Contratações Correlatas?', type: 'checkbox' },
        { name: 'indicacaoContratacoesCorrelatas', label: 'Indicação das Contratações Correlatas', type: 'textarea', rows: 3 },
        { name: 'impactosAmbientais', label: 'Há Impactos Ambientais?', type: 'checkbox' },
        { name: 'especificacaoImpactosAmbientais', label: 'Especificação dos Impactos Ambientais', type: 'textarea', rows: 3 }
      ]
    },
    {
      title: '11. Posicionamento Conclusivo',
      description: 'Conclusão sobre a viabilidade',
      fields: [
        { name: 'posicionamentoConclusivo.viabilidade', label: 'Viável?', type: 'checkbox' },
        { name: 'posicionamentoConclusivo.textoConclusivo', label: 'Texto Conclusivo', type: 'textarea', required: true, rows: 4 }
      ]
    }
  ];

  const handleInputChange = (fieldName, value) => {
    setFormData(prev => {
      if (fieldName.includes('.')) {
        const keys = fieldName.split('.');
        let newData = { ...prev };
        let current = newData;
        
        for (let i = 0; i < keys.length - 1; i++) {
          const key = keys[i];
          if (Array.isArray(current[key])) {
            current[key] = [...current[key]];
            current = current[key];
          } else {
            current[key] = { ...current[key] };
            current = current[key];
          }
        }
        
        current[keys[keys.length - 1]] = value;
        return newData;
      }
      return {
        ...prev,
        [fieldName]: value
      };
    });
    
    if (errors[fieldName] && value) {
      setErrors(prev => ({ ...prev, [fieldName]: null }));
    }
  };

  const getValue = (fieldName) => {
    if (fieldName.includes('.')) {
      const keys = fieldName.split('.');
      let current = formData;
      
      for (const key of keys) {
        if (current === null || current === undefined) {
          return undefined;
        }
        
        // Se a chave for um número, tratar como índice de array
        if (!isNaN(key) && Array.isArray(current)) {
          current = current[parseInt(key)];
        } else {
          current = current[key];
        }
      }
      
      return current;
    }
    return formData[fieldName];
  };

  const renderField = (field) => {
    const value = getValue(field.name);
    const key = `${field.name}-${currentSection}`;
    
    // Verificar se o campo deve ser exibido (campos condicionais)
    if (field.showIf) {
      const conditionValue = getValue(field.showIf);
      if (!conditionValue) {
        return null; // Não exibir o campo se a condição não for atendida
      }
    }

    // Verificar se a seção deve ser mostrada (ex: dados do DFD)
    const currentSectionData = etpSections[currentSection];
    if (currentSectionData.showOnlyIf === 'hasDFDData') {
      const hasDFDData = formData.descricaoNecessidade || formData.valorEstimado || formData.fiscalTitular;
      if (!hasDFDData) {
        return (
          <div key={key} className="col-span-2 text-center py-8 text-gray-500">
            <p>📎 Nenhum dado do DFD foi importado ainda.</p>
            <p className="text-sm mt-2">Use o botão "Importar DFD (DOCX)" para preencher automaticamente estes campos.</p>
          </div>
        );
      }
    }

    switch (field.type) {
      case 'textarea':
        return (
          <div key={key} className="space-y-2">
            <Label htmlFor={field.name} className="text-sm font-medium">
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </Label>
            <Textarea
              id={field.name}
              value={value || ''}
              onChange={field.readOnly ? undefined : (e) => handleInputChange(field.name, e.target.value)}
              className={`min-h-[${(field.rows || 3) * 24}px] ${errors[field.name] ? 'border-red-500' : ''} ${field.readOnly ? 'bg-gray-50 cursor-not-allowed' : ''}`}
              placeholder={field.readOnly ? '' : `Digite ${field.label.toLowerCase()}`}
              rows={field.rows || 3}
              readOnly={field.readOnly}
            />
            {errors[field.name] && (
              <p className="text-red-500 text-xs">{errors[field.name]}</p>
            )}
          </div>
        );

      case 'select':
        return (
          <div key={key} className="space-y-2">
            <Label htmlFor={field.name} className="text-sm font-medium">
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </Label>
            <Select onValueChange={(value) => handleInputChange(field.name, value)} value={value || ''}>
              <SelectTrigger className={errors[field.name] ? 'border-red-500' : ''}>
                <SelectValue placeholder={`Selecione ${field.label.toLowerCase()}`} />
              </SelectTrigger>
              <SelectContent>
                {field.options?.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors[field.name] && (
              <p className="text-red-500 text-xs">{errors[field.name]}</p>
            )}
          </div>
        );

      case 'checkbox':
        return (
          <div key={key} className="flex items-center space-x-2">
            <input
              type="checkbox"
              id={field.name}
              checked={value || false}
              onChange={(e) => handleInputChange(field.name, e.target.checked)}
              className="rounded border-gray-300"
            />
            <Label htmlFor={field.name} className="text-sm font-medium">
              {field.label}
            </Label>
          </div>
        );

      default:
        return (
          <div key={key} className="space-y-2">
            <Label htmlFor={field.name} className="text-sm font-medium">
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </Label>
            <Input
              id={field.name}
              type="text"
              value={value || ''}
              onChange={field.readOnly ? undefined : (e) => handleInputChange(field.name, e.target.value)}
              className={`${errors[field.name] ? 'border-red-500' : ''} ${field.readOnly ? 'bg-gray-50 cursor-not-allowed' : ''}`}
              placeholder={field.readOnly ? '' : `Digite ${field.label.toLowerCase()}`}
              readOnly={field.readOnly}
            />
            {errors[field.name] && (
              <p className="text-red-500 text-xs">{errors[field.name]}</p>
            )}
          </div>
        );
    }
  };

  const validateSection = () => {
    const section = etpSections[currentSection];
    const newErrors = {};
    
    section.fields.forEach(field => {
      if (field.required) {
        const value = getValue(field.name);
        
        // Validação consistente com validateAllSections
        let isValid = true;
        
        if (value === null || value === undefined) {
          isValid = false;
        } else if (typeof value === 'string' && value.trim() === '') {
          isValid = false;
        } else if (Array.isArray(value)) {
          if (value.length === 0) {
            isValid = false;
          } else if (field.name.includes('produtos.0.')) {
            const firstItem = value[0];
            if (typeof firstItem === 'object' && firstItem !== null) {
              const fieldKey = field.name.split('.').pop();
              const fieldValue = firstItem[fieldKey];
              if (!fieldValue || (typeof fieldValue === 'string' && fieldValue.trim() === '')) {
                isValid = false;
              }
            }
          }
        } else if (typeof value === 'object' && value !== null) {
          const hasContent = Object.values(value).some(val => 
            val && (typeof val !== 'string' || val.trim() !== '')
          );
          if (!hasContent) {
            isValid = false;
          }
        }
        
        if (!isValid) {
          newErrors[field.name] = `${field.label} é obrigatório`;
        }
      }
    });
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateSection()) {
      setCurrentSection(prev => Math.min(prev + 1, etpSections.length - 1));
    }
  };

  const handlePrevious = () => {
    setCurrentSection(prev => Math.max(prev - 1, 0));
  };

     const validateAllSections = () => {
     const allErrors = {};
     
     console.log('🔍 Validando todas as seções do ETP...');
     
     // Verificar se um DFD foi importado (indicado pela presença de dados específicos)
     const dfdFoiImportado = formData.numeroSGD || formData.descricaoNecessidade || formData.valorEstimado;
     
     if (dfdFoiImportado) {
       console.log('📄 DFD detectado - validação será mais flexível para campos básicos');
     }
     
     etpSections.forEach((section, sectionIndex) => {
       console.log(`📝 Validando seção ${sectionIndex + 1}: ${section.title}`);
       
       section.fields.forEach(field => {
         if (field.required) {
           const value = getValue(field.name);
           console.log(`- Campo: ${field.name}, Valor: "${value}", Tipo: ${typeof value}, Obrigatório: ${field.required}`);
           
           // Se é um DFD e o campo é básico (SGD, ETP), ser mais flexível
           if (dfdFoiImportado && (field.name === 'numeroSGD' || field.name === 'numeroETP')) {
             console.log(`ℹ️ Campo ${field.name} é básico e DFD foi importado - validação flexível`);
             // Continuar com validação normal, mas não bloquear se estiver vazio
           }
           
           // Validação mais robusta para diferentes tipos de campos
           let isValid = true;
           let errorMessage = '';
           
           if (value === null || value === undefined) {
             isValid = false;
             errorMessage = 'Campo é null ou undefined';
           } else if (typeof value === 'string' && value.trim() === '') {
             isValid = false;
             errorMessage = 'String vazia ou apenas espaços';
           } else if (typeof value === 'boolean') {
             // Para checkboxes, tanto true quanto false são válidos
             isValid = true;
           } else if (Array.isArray(value)) {
             // Para arrays, verificar se tem pelo menos um item
             if (value.length === 0) {
               isValid = false;
               errorMessage = 'Array vazio';
             } else {
               // Verificar se o primeiro item tem os campos obrigatórios
               const firstItem = value[0];
               if (typeof firstItem === 'object' && firstItem !== null) {
                 // Para campos como produtos.0.item, verificar se o item existe e tem conteúdo
                 if (field.name.includes('produtos.0.')) {
                   const fieldKey = field.name.split('.').pop();
                   const fieldValue = firstItem[fieldKey];
                   if (!fieldValue || (typeof fieldValue === 'string' && fieldValue.trim() === '')) {
                     isValid = false;
                     errorMessage = `Campo ${fieldKey} do primeiro produto está vazio`;
                   }
                 }
               }
             }
           } else if (typeof value === 'object' && value !== null) {
             // Para objetos aninhados, verificar se tem pelo menos uma propriedade preenchida
             const hasContent = Object.values(value).some(val => 
               val && (typeof val !== 'string' || val.trim() !== '')
             );
             if (!hasContent) {
               isValid = false;
               errorMessage = 'Objeto sem conteúdo';
             }
           }
           
           if (!isValid) {
             allErrors[field.name] = `${field.label} é obrigatório (Seção ${sectionIndex + 1}) - ${errorMessage}`;
             console.log(`❌ Campo obrigatório não preenchido: ${field.name} - ${errorMessage}`);
           } else {
             console.log(`✅ Campo preenchido corretamente: ${field.name}`);
           }
         }
       });
     });
     
     console.log('📊 Resumo dos erros:', allErrors);
     console.log('🔢 Total de erros encontrados:', Object.keys(allErrors).length);
     setErrors(allErrors);
     return Object.keys(allErrors).length === 0;
   };

  const handleProcessETP = async () => {
    console.log('🚀 Iniciando processamento do ETP...');
    console.log('📋 FormData atual:', formData);
    
         if (!validateAllSections()) {
       const errorMessages = Object.values(errors).filter(msg => msg);
       
       // Verificar se um DFD foi importado
       const dfdFoiImportado = formData.numeroSGD || formData.descricaoNecessidade || formData.valorEstimado;
       
       let mensagem = '';
       if (dfdFoiImportado) {
         mensagem = `📄 DFD importado detectado!\n\n`;
         mensagem += `⚠️ Alguns campos ainda precisam ser preenchidos manualmente:\n\n`;
         mensagem += `${errorMessages.join('\n')}\n\n`;
         mensagem += `💡 O DFD contém apenas algumas informações básicas. Complete os demais campos para finalizar o ETP.`;
       } else {
         mensagem = `Por favor, preencha todos os campos obrigatórios:\n${errorMessages.join('\n')}`;
       }
       
       showAlert(mensagem, 'error');
       return;
     }

    setIsGenerating(true);
    setGenerationProgress(0);
    setGenerationMessage('Processando ETP com IA...');

    try {
      const requestBody = { dados: formData };
      console.log('📤 Enviando para API:', requestBody);
      
      const response = await fetch('/api/documentos/processar-etp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(requestBody)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao processar ETP');
      }

      setGenerationProgress(100);
      setGenerationMessage('ETP processado com sucesso!');
      
      setDocuments([result.documento]);
      setShowDownloadModal(true);
      
      showAlert('ETP processado e salvo com sucesso!', 'success');

    } catch (error) {
      console.error('Erro ao processar ETP:', error);
      showAlert(error.message || 'Erro ao processar ETP', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

     const handleDFDDataExtracted = (extractedData) => {
     // Preencher o formulário com os dados extraídos do DFD
     console.log('📄 Dados extraídos do DFD:', extractedData);
     
     // Mapear os dados extraídos para o formato do formulário
     const mappedData = {
       // Dados básicos
       numeroSGD: extractedData.numeroSGD || '',
       numeroETP: extractedData.numeroETP || '',
       
       // Informações extraídas do DFD
       descricaoNecessidade: extractedData.descricaoNecessidade || '',
       valorEstimado: extractedData.valorEstimado || '',
       classificacaoOrcamentaria: extractedData.classificacaoOrcamentaria || '',
       fonte: extractedData.fonte || '',
       elementoDespesa: extractedData.elementoDespesa || '',
       previsaoPCA: extractedData.previsaoPCA || false,
       recursoConvenio: extractedData.recursoConvenio || false,
       
       // Responsáveis
       fiscalTitular: extractedData.fiscalTitular || '',
       fiscalSuplente: extractedData.fiscalSuplente || '',
       gestorTitular: extractedData.gestorTitular || '',
       gestorSuplente: extractedData.gestorSuplente || '',
       
       // Demandante
       demandante: {
         orgao: extractedData.demandante?.orgao || '',
         setor: extractedData.demandante?.setor || '',
         cargo: extractedData.demandante?.cargo || '',
         nome: extractedData.demandante?.nome || '',
         numeroFuncional: extractedData.demandante?.numeroFuncional || ''
       },
       
       // Responsável pelo planejamento
       responsavelPlanejamento: {
         nome: extractedData.responsavelPlanejamento?.nome || '',
         cargo: extractedData.responsavelPlanejamento?.cargo || '',
         numeroFuncional: extractedData.responsavelPlanejamento?.numeroFuncional || ''
       },
       
       // Itens (se houver)
       itens: extractedData.itens || [],
       
       // Responsáveis da ação orçamentária
       responsaveisAcaoOrcamentaria: extractedData.responsaveisAcaoOrcamentaria || [],
       
       // Assinaturas
       assinaturas: extractedData.assinaturas || {},
       
       // Data e local
       dataDocumento: extractedData.dataDocumento || '',
       localDocumento: extractedData.localDocumento || ''
     };
     
     console.log('🗂️ Dados mapeados para o formulário:', mappedData);
     
     setFormData(prev => ({
       ...prev,
       ...mappedData
     }));
     
           // Verificar quais campos foram preenchidos pelo DFD
      const camposPreenchidos = [];
      const camposPendentes = [];
      
      if (mappedData.numeroSGD) camposPreenchidos.push('Número do SGD');
      else camposPendentes.push('Número do SGD');
      
      if (mappedData.numeroETP) camposPreenchidos.push('Número do ETP');
      else camposPendentes.push('Número do ETP');
      
      if (mappedData.descricaoNecessidade) camposPreenchidos.push('Descrição da Necessidade');
      if (mappedData.valorEstimado) camposPreenchidos.push('Valor Estimado');
      if (mappedData.classificacaoOrcamentaria) camposPreenchidos.push('Classificação Orçamentária');
      if (mappedData.fonte) camposPreenchidos.push('Fonte');
      if (mappedData.elementoDespesa) camposPreenchidos.push('Elemento de Despesa');
      if (mappedData.fiscalTitular) camposPreenchidos.push('Fiscal Titular');
      if (mappedData.gestorTitular) camposPreenchidos.push('Gestor Titular');
      if (mappedData.demandante?.nome) camposPreenchidos.push('Demandante');
      if (mappedData.responsavelPlanejamento?.nome) camposPreenchidos.push('Responsável pelo Planejamento');
      if (mappedData.itens && mappedData.itens.length > 0) camposPreenchidos.push(`${mappedData.itens.length} item(ns)`);
      if (mappedData.assinaturas?.gerenteConvenios) camposPreenchidos.push('Assinaturas');
      if (mappedData.dataDocumento) camposPreenchidos.push('Data do Documento');
      if (mappedData.localDocumento) camposPreenchidos.push('Local');
      
      let mensagem = `✅ Dados do DFD importados com sucesso!\n\n`;
      mensagem += `📋 Campos extraídos automaticamente:\n`;
      mensagem += `• ${camposPreenchidos.join('\n• ')}\n\n`;
      
      if (camposPendentes.length > 0) {
        mensagem += `⚠️ Campos que precisam ser preenchidos manualmente:\n`;
        mensagem += `• ${camposPendentes.join('\n• ')}\n\n`;
        mensagem += `💡 Complete os demais campos técnicos para finalizar o ETP.`;
      } else {
        mensagem += `🎉 Informações básicas do DFD preenchidas! Complete as seções técnicas do ETP.`;
      }
      
      showAlert(mensagem, 'success');
   };

  const handleDownload = async (documentId) => {
    try {
      const response = await fetch(`/api/documentos/download/${documentId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Erro ao fazer download');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ETP_${formData.numeroETP || 'documento'}.docx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

    } catch (error) {
      console.error('Erro no download:', error);
      showAlert('Erro ao fazer download do documento', 'error');
    }
  };

  const handleCloseGenerationModal = () => {
    setIsGenerating(false);
    setGenerationProgress(0);
    setGenerationMessage('');
  };

  return (
    <ProtectedRoute>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <AlertComponent />
        
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Button
              onClick={() => router.push('/documentos')}
              variant="outline"
              size="sm"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-green-600">
                🔍 Criar ETP
              </h1>
              <p className="text-gray-600">
                Estudo Técnico Preliminar
              </p>
            </div>
          </div>

                     {/* Botão de Importar DFD (DOCX) */}
           <div className="mt-4">
             <Button
               onClick={() => setShowDFDImportModal(true)}
               variant="outline"
               className="bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100"
             >
               <Upload className="w-4 h-4 mr-2" />
               Importar DFD (DOCX)
             </Button>
                           <p className="text-xs text-gray-500 mt-2">
                Carregue um arquivo DOCX do DFD e a IA extrairá as informações disponíveis. 
                <br />
                <span className="text-orange-600 font-medium">⚠️ O DFD contém apenas dados básicos - você precisará complementar os demais campos manualmente.</span>
              </p>
            

          </div>
        </div>
                 {/* Resumo de Erros */}
         {Object.keys(errors).length > 0 && (
           <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
             <div className="flex items-center gap-2 mb-2">
               <AlertCircle className="h-5 w-5 text-red-500" />
               <h3 className="font-medium text-red-800">Resumo de Erros</h3>
             </div>
             <div className="space-y-1">
               {Object.values(errors).filter(msg => msg).map((error, index) => (
                 <p key={index} className="text-sm text-red-700">• {error}</p>
               ))}
             </div>
           </div>
         )}

         {/* Progress Bar */}
         <div className="mb-8">
           {(() => {
             // Filtrar seções que devem ser mostradas
             const visibleSections = etpSections.filter((section, index) => {
               if (section.showOnlyIf === 'hasDFDData') {
                 const hasDFDData = formData.descricaoNecessidade || formData.valorEstimado || formData.fiscalTitular;
                 return hasDFDData;
               }
               return true;
             });
             
             const totalSections = visibleSections.length;
             const currentVisibleIndex = visibleSections.findIndex((section, index) => 
               etpSections.indexOf(section) === currentSection
             );
             
             return (
               <>
                 <div className="w-full bg-gray-200 rounded-full h-2">
                   <div 
                     className="h-2 rounded-full transition-all duration-300 bg-green-600"
                     style={{ width: `${((currentVisibleIndex + 1) / totalSections) * 100}%` }}
                   ></div>
                 </div>
                 <div className="flex justify-between text-sm text-gray-600 mt-2">
                   {visibleSections.map((section, visibleIndex) => {
                     const actualIndex = etpSections.indexOf(section);
                     const hasErrors = section.fields.some(field => 
                       field.required && errors[field.name]
                     );
                     return (
                       <span 
                         key={actualIndex}
                         className={`cursor-pointer ${actualIndex <= currentSection ? 'text-green-600 font-medium' : ''} ${hasErrors ? 'text-red-500' : ''}`}
                         onClick={() => setCurrentSection(actualIndex)}
                       >
                         {section.showOnlyIf === 'hasDFDData' ? 'DFD' : visibleIndex + 1}
                       </span>
                     );
                   })}
                 </div>
               </>
             );
           })()}
         </div>

        {/* Current Section */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-xl text-green-600">
              {etpSections[currentSection].title}
            </CardTitle>
            <p className="text-gray-600">{etpSections[currentSection].description}</p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {etpSections[currentSection].fields.map(renderField)}
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

          {currentSection === etpSections.length - 1 ? (
            <Button
              onClick={handleProcessETP}
              className="px-6 bg-green-600 hover:bg-green-700 text-white"
              disabled={isGenerating}
            >
              🔍 Processar ETP
            </Button>
          ) : (
            <Button
              onClick={handleNext}
              className="px-6 bg-green-600 hover:bg-green-700 text-white"
            >
              Próximo →
            </Button>
          )}
        </div>

        {/* Modal de Download */}
        {showDownloadModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <div className="text-center mb-4">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
                <h2 className="text-xl font-bold text-gray-900 mb-2">
                  🎉 ETP Processado!
                </h2>
                <p className="text-gray-600">
                  Seu documento ETP foi processado com sucesso e está pronto para download.
                </p>
              </div>
              
              <div className="space-y-3 mb-6">
                {documents.map((doc, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        <span className="text-green-600 font-medium text-sm">ETP</span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">ETP - {formData.numeroETP}</p>
                        <p className="text-xs text-gray-500">Documento DOCX</p>
                      </div>
                    </div>
                    <Button
                      onClick={() => handleDownload(doc.id)}
                      size="sm"
                      className="bg-green-600 hover:bg-green-700 text-white"
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
                    router.push('/documentos/lista');
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

        {/* Modal de Carregamento */}
        <MinimizableLoadingModal
          isOpen={isGenerating}
          progress={generationProgress}
          message={generationMessage}
          onClose={handleCloseGenerationModal}
        />

                 {/* Modal de Importação DFD */}
         <DFDImportModal
           isOpen={showDFDImportModal}
           onClose={() => setShowDFDImportModal(false)}
           onDataExtracted={handleDFDDataExtracted}
         />
      </div>
    </ProtectedRoute>
  );
}