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
import { Download, CheckCircle, AlertCircle, Clock, FileText, ArrowLeft } from 'lucide-react';

 export default function CriarDFDPage() {
   const router = useRouter();
   const { showAlert, AlertComponent } = useCustomAlert();
   
   // Função para formatar entrada de valores monetários
   const formatCurrencyInput = (value) => {
     if (!value) return '';
     
     // Remove tudo exceto números
     let cleanValue = value.replace(/\D/g, '');
     
     if (cleanValue === '') return '';
     
     // Converte para centavos
     const numericValue = parseInt(cleanValue, 10);
     
     // Formata como moeda brasileira
     const formatted = new Intl.NumberFormat('pt-BR', {
       minimumFractionDigits: 2,
       maximumFractionDigits: 2
     }).format(numericValue / 100);
     
     return formatted;
   };
   
   // Função para obter valor numérico limpo (em centavos)
   const getNumericValue = (formattedValue) => {
     if (!formattedValue) return '';
     return formattedValue.replace(/\D/g, '');
   };
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationMessage, setGenerationMessage] = useState('');
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [documents, setDocuments] = useState([]);
  
  const [formData, setFormData] = useState({
    // Dados básicos
    numeroDFD: '',
    numeroSGD: '',
    descricaoNecessidade: '',
    valorEstimado: '',
    classificacaoOrcamentaria: '',
    fonte: '',
    elementoDespesa: '',
    
    // Especificação dos bens/serviços (agora é um array)
    itens: [
      {
        item: '',
        quantidade: '',
        unidade: '',
        codigoSIGA: '',
        especificacaoDetalhada: ''
      }
    ],
    
         // Recurso de convênio
     recursoConvenio: false,
     
     // PCA
     previsaoPCA: false,
     justificativaPCA: '',
    
    // Responsáveis
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
         // Ação orçamentária
     acaoOrcamentariaNumero: '',
     responsaveisAcaoOrcamentaria: [
       {
         nome: '',
         numeroFuncional: ''
       }
     ],
     // Planejamento e orçamento
     responsaveisPlanejamento: [
       {
         nome: '',
         numeroFuncional: '',
         cargo: ''
       }
     ]
  });

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
      type: 'dynamic-items',
      required: true
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
       title: '7. Demanda Prevista no PCA',
       description: 'Indicação se a demanda está prevista no Plano de Contratação Anual',
       type: 'pca-section',
       required: true
     },
         {
       title: '8. Fiscal Titular',
       description: 'Responsável pela fiscalização do contrato',
       fields: [
         { name: 'fiscalTitular', label: 'Fiscal Titular', type: 'text', required: true }
       ]
     },
         {
       title: '9. Fiscal Suplente',
       description: 'Substituto do fiscal titular',
       fields: [
         { name: 'fiscalSuplente', label: 'Fiscal Suplente', type: 'text', required: true }
       ]
     },
     {
       title: '10. Gestor Titular',
       description: 'Responsável pela gestão do contrato',
       fields: [
         { name: 'gestorTitular', label: 'Gestor Titular', type: 'text', required: true }
       ]
     },
     {
       title: '11. Gestor Suplente',
       description: 'Substituto do gestor titular',
       fields: [
         { name: 'gestorSuplente', label: 'Gestor Suplente', type: 'text', required: true }
       ]
     },
     {
       title: '12. Demandante',
       description: 'Informações do órgão demandante',
       fields: [
         { name: 'demandante.orgao', label: 'Órgão', type: 'text', required: true },
         { name: 'demandante.setor', label: 'Setor', type: 'text', required: true },
         { name: 'demandante.cargo', label: 'Cargo', type: 'text', required: true },
         { name: 'demandante.nome', label: 'Nome', type: 'text', required: true },
         { name: 'demandante.numeroFuncional', label: 'Número Funcional', type: 'text', required: true }
       ]
     },
     {
       title: '13. Responsável pela Ação Orçamentária',
       description: 'Responsável pela execução da ação orçamentária',
       type: 'dynamic-acao-orcamentaria',
       required: true
     },
     {
       title: '14. Responsável pelo Planejamento e Orçamento',
       description: 'Responsável pelo acompanhamento das metas físicas e financeiras',
       type: 'dynamic-planejamento',
       required: true
     }
  ];

  const handleInputChange = (fieldName, value) => {
    setFormData(prev => {
      if (fieldName.includes('.')) {
        const [parent, child] = fieldName.split('.');
        return {
          ...prev,
          [parent]: {
            ...prev[parent],
            [child]: value
          }
        };
      }
      return {
        ...prev,
        [fieldName]: value
      };
    });
    
    // Limpar erro se o campo foi preenchido
    if (errors[fieldName] && value) {
      setErrors(prev => ({ ...prev, [fieldName]: null }));
    }
  };

  const handleItemChange = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      itens: prev.itens.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
    
    // Limpar erro se o campo foi preenchido
    const errorKey = `itens.${index}.${field}`;
    if (errors[errorKey] && value) {
      setErrors(prev => ({ ...prev, [errorKey]: null }));
    }
  };

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      itens: [
        ...prev.itens,
        {
          item: '',
          quantidade: '',
          unidade: '',
          codigoSIGA: '',
          especificacaoDetalhada: ''
        }
      ]
    }));
  };

  const removeItem = (index) => {
    if (formData.itens.length > 1) {
      setFormData(prev => ({
        ...prev,
        itens: prev.itens.filter((_, i) => i !== index)
      }));
      
      // Limpar erros relacionados ao item removido
      setErrors(prev => {
        const newErrors = { ...prev };
        Object.keys(newErrors).forEach(key => {
          if (key.startsWith(`itens.${index}.`)) {
            delete newErrors[key];
          }
        });
        return newErrors;
      });
    }
  };

  // Funções para Ação Orçamentária
  const addResponsavelAcao = () => {
    setFormData(prev => ({
      ...prev,
      responsaveisAcaoOrcamentaria: [
        ...prev.responsaveisAcaoOrcamentaria,
        {
          nome: '',
          numeroFuncional: ''
        }
      ]
    }));
  };

  const removeResponsavelAcao = (index) => {
    if (formData.responsaveisAcaoOrcamentaria.length > 1) {
      setFormData(prev => ({
        ...prev,
        responsaveisAcaoOrcamentaria: prev.responsaveisAcaoOrcamentaria.filter((_, i) => i !== index)
      }));
      
      // Limpar erros relacionados ao responsável removido
      setErrors(prev => {
        const newErrors = { ...prev };
        Object.keys(newErrors).forEach(key => {
          if (key.startsWith(`responsaveisAcaoOrcamentaria.${index}.`)) {
            delete newErrors[key];
          }
        });
        return newErrors;
      });
    }
  };

  const handleResponsavelAcaoChange = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      responsaveisAcaoOrcamentaria: prev.responsaveisAcaoOrcamentaria.map((resp, i) => 
        i === index ? { ...resp, [field]: value } : resp
      )
    }));
    
    // Limpar erro se o campo foi preenchido
    const errorKey = `responsaveisAcaoOrcamentaria.${index}.${field}`;
    if (errors[errorKey] && value) {
      setErrors(prev => ({ ...prev, [errorKey]: null }));
    }
  };

  // Funções para Planejamento e Orçamento
  const addResponsavelPlanejamento = () => {
    setFormData(prev => ({
      ...prev,
      responsaveisPlanejamento: [
        ...prev.responsaveisPlanejamento,
        {
          nome: '',
          numeroFuncional: '',
          cargo: ''
        }
      ]
    }));
  };

  const removeResponsavelPlanejamento = (index) => {
    if (formData.responsaveisPlanejamento.length > 1) {
      setFormData(prev => ({
        ...prev,
        responsaveisPlanejamento: prev.responsaveisPlanejamento.filter((_, i) => i !== index)
      }));
      
      // Limpar erros relacionados ao responsável removido
      setErrors(prev => {
        const newErrors = { ...prev };
        Object.keys(newErrors).forEach(key => {
          if (key.startsWith(`responsaveisPlanejamento.${index}.`)) {
            delete newErrors[key];
          }
        });
        return newErrors;
      });
    }
  };

  const handleResponsavelPlanejamentoChange = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      responsaveisPlanejamento: prev.responsaveisPlanejamento.map((resp, i) => 
        i === index ? { ...resp, [field]: value } : resp
      )
    }));
    
    // Limpar erro se o campo foi preenchido
    const errorKey = `responsaveisPlanejamento.${index}.${field}`;
    if (errors[errorKey] && value) {
      setErrors(prev => ({ ...prev, [errorKey]: null }));
    }
  };

  const renderField = (field) => {
    const value = field.name.includes('.') 
      ? field.name.split('.').reduce((obj, key) => obj?.[key], formData)
      : formData[field.name];

    const key = `${field.name}-${currentSection}`;

    switch (field.type) {
      case 'dynamic-items':
        return (
          <div key={key} className="space-y-6">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">
                Itens e Serviços <span className="text-red-500">*</span>
              </Label>
              <Button
                type="button"
                onClick={addItem}
                variant="outline"
                size="sm"
                className="text-blue-600 hover:text-blue-700"
              >
                + Adicionar Item
              </Button>
            </div>
            
            {formData.itens.map((item, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-medium text-gray-700">Item {index + 1}</h4>
                  {formData.itens.length > 1 && (
                    <Button
                      type="button"
                      onClick={() => removeItem(index)}
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:text-red-700"
                    >
                      Remover
                    </Button>
                  )}
                </div>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor={`item-${index}`} className="text-sm font-medium">
                      Item <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id={`item-${index}`}
                      value={item.item || ''}
                      onChange={(e) => handleItemChange(index, 'item', e.target.value)}
                      className={errors[`itens.${index}.item`] ? 'border-red-500' : ''}
                      placeholder="Descrição do item"
                    />
                    {errors[`itens.${index}.item`] && (
                      <p className="text-red-500 text-xs">{errors[`itens.${index}.item`]}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor={`quantidade-${index}`} className="text-sm font-medium">
                      Quantidade <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id={`quantidade-${index}`}
                      value={item.quantidade || ''}
                      onChange={(e) => handleItemChange(index, 'quantidade', e.target.value)}
                      className={errors[`itens.${index}.quantidade`] ? 'border-red-500' : ''}
                      placeholder="Quantidade"
                    />
                    {errors[`itens.${index}.quantidade`] && (
                      <p className="text-red-500 text-xs">{errors[`itens.${index}.quantidade`]}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor={`unidade-${index}`} className="text-sm font-medium">
                      Unidade <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id={`unidade-${index}`}
                      value={item.unidade || ''}
                      onChange={(e) => handleItemChange(index, 'unidade', e.target.value)}
                      className={errors[`itens.${index}.unidade`] ? 'border-red-500' : ''}
                      placeholder="Unidade (ex: unidade, kg, m²)"
                    />
                    {errors[`itens.${index}.unidade`] && (
                      <p className="text-red-500 text-xs">{errors[`itens.${index}.unidade`]}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor={`codigoSIGA-${index}`} className="text-sm font-medium">
                      Código SIGA <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id={`codigoSIGA-${index}`}
                      value={item.codigoSIGA || ''}
                      onChange={(e) => handleItemChange(index, 'codigoSIGA', e.target.value)}
                      className={errors[`itens.${index}.codigoSIGA`] ? 'border-red-500' : ''}
                      placeholder="Código SIGA"
                    />
                    {errors[`itens.${index}.codigoSIGA`] && (
                      <p className="text-red-500 text-xs">{errors[`itens.${index}.codigoSIGA`]}</p>
                    )}
                  </div>
                  
                  <div className="md:col-span-2 space-y-2">
                    <Label htmlFor={`especificacaoDetalhada-${index}`} className="text-sm font-medium">
                      Especificação Completa <span className="text-red-500">*</span>
                    </Label>
                    <Textarea
                      id={`especificacaoDetalhada-${index}`}
                      value={item.especificacaoDetalhada || ''}
                      onChange={(e) => handleItemChange(index, 'especificacaoDetalhada', e.target.value)}
                      className={`min-h-[96px] ${errors[`itens.${index}.especificacaoDetalhada`] ? 'border-red-500' : ''}`}
                      placeholder="Especificação detalhada do item"
                      rows={4}
                    />
                    {errors[`itens.${index}.especificacaoDetalhada`] && (
                      <p className="text-red-500 text-xs">{errors[`itens.${index}.especificacaoDetalhada`]}</p>
                    )}
                  </div>
                </div>
              </div>
                         ))}
           </div>
         );

       case 'dynamic-acao-orcamentaria':
         return (
           <div key={key} className="space-y-6">
             <div className="space-y-4">
               <div className="space-y-2">
                 <Label htmlFor="acaoOrcamentariaNumero" className="text-sm font-medium">
                   Número da Ação Orçamentária <span className="text-red-500">*</span>
                 </Label>
                 <Input
                   id="acaoOrcamentariaNumero"
                   value={formData.acaoOrcamentariaNumero || ''}
                   onChange={(e) => handleInputChange('acaoOrcamentariaNumero', e.target.value)}
                   className={errors['acaoOrcamentariaNumero'] ? 'border-red-500' : ''}
                   placeholder="Número da ação orçamentária"
                 />
                 {errors['acaoOrcamentariaNumero'] && (
                   <p className="text-red-500 text-xs">{errors['acaoOrcamentariaNumero']}</p>
                 )}
               </div>
               
               <div className="flex items-center justify-between">
                 <Label className="text-sm font-medium">
                   Responsáveis pela Ação Orçamentária <span className="text-red-500">*</span>
                 </Label>
                 <Button
                   type="button"
                   onClick={addResponsavelAcao}
                   variant="outline"
                   size="sm"
                   className="text-blue-600 hover:text-blue-700"
                 >
                   + Adicionar Responsável
                 </Button>
               </div>
               
               {formData.responsaveisAcaoOrcamentaria.map((responsavel, index) => (
                 <div key={index} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                   <div className="flex items-center justify-between mb-4">
                     <h4 className="font-medium text-gray-700">Responsável {index + 1}</h4>
                     {formData.responsaveisAcaoOrcamentaria.length > 1 && (
                       <Button
                         type="button"
                         onClick={() => removeResponsavelAcao(index)}
                         variant="outline"
                         size="sm"
                         className="text-red-600 hover:text-red-700"
                       >
                         Remover
                       </Button>
                     )}
                   </div>
                   
                   <div className="grid md:grid-cols-2 gap-4">
                     <div className="space-y-2">
                       <Label htmlFor={`nome-acao-${index}`} className="text-sm font-medium">
                         Nome <span className="text-red-500">*</span>
                       </Label>
                       <Input
                         id={`nome-acao-${index}`}
                         value={responsavel.nome || ''}
                         onChange={(e) => handleResponsavelAcaoChange(index, 'nome', e.target.value)}
                         className={errors[`responsaveisAcaoOrcamentaria.${index}.nome`] ? 'border-red-500' : ''}
                         placeholder="Nome do responsável"
                       />
                       {errors[`responsaveisAcaoOrcamentaria.${index}.nome`] && (
                         <p className="text-red-500 text-xs">{errors[`responsaveisAcaoOrcamentaria.${index}.nome`]}</p>
                       )}
                     </div>
                     
                     <div className="space-y-2">
                       <Label htmlFor={`numeroFuncional-acao-${index}`} className="text-sm font-medium">
                         Nº Funcional <span className="text-red-500">*</span>
                       </Label>
                       <Input
                         id={`numeroFuncional-acao-${index}`}
                         value={responsavel.numeroFuncional || ''}
                         onChange={(e) => handleResponsavelAcaoChange(index, 'numeroFuncional', e.target.value)}
                         className={errors[`responsaveisAcaoOrcamentaria.${index}.numeroFuncional`] ? 'border-red-500' : ''}
                         placeholder="Número funcional"
                       />
                       {errors[`responsaveisAcaoOrcamentaria.${index}.numeroFuncional`] && (
                         <p className="text-red-500 text-xs">{errors[`responsaveisAcaoOrcamentaria.${index}.numeroFuncional`]}</p>
                       )}
                     </div>
                   </div>
                 </div>
               ))}
             </div>
           </div>
         );

       case 'dynamic-planejamento':
         return (
           <div key={key} className="space-y-6">
             <div className="flex items-center justify-between">
               <Label className="text-sm font-medium">
                 Responsáveis pelo Planejamento e Orçamento <span className="text-red-500">*</span>
               </Label>
               <Button
                 type="button"
                 onClick={addResponsavelPlanejamento}
                 variant="outline"
                 size="sm"
                 className="text-blue-600 hover:text-blue-700"
               >
                 + Adicionar Responsável
               </Button>
             </div>
             
             {formData.responsaveisPlanejamento.map((responsavel, index) => (
               <div key={index} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                 <div className="flex items-center justify-between mb-4">
                   <h4 className="font-medium text-gray-700">Responsável {index + 1}</h4>
                   {formData.responsaveisPlanejamento.length > 1 && (
                     <Button
                       type="button"
                       onClick={() => removeResponsavelPlanejamento(index)}
                       variant="outline"
                       size="sm"
                       className="text-red-600 hover:text-red-700"
                     >
                       Remover
                     </Button>
                   )}
                 </div>
                 
                 <div className="grid md:grid-cols-2 gap-4">
                   <div className="space-y-2">
                     <Label htmlFor={`nome-planej-${index}`} className="text-sm font-medium">
                       Nome <span className="text-red-500">*</span>
                     </Label>
                     <Input
                       id={`nome-planej-${index}`}
                       value={responsavel.nome || ''}
                       onChange={(e) => handleResponsavelPlanejamentoChange(index, 'nome', e.target.value)}
                       className={errors[`responsaveisPlanejamento.${index}.nome`] ? 'border-red-500' : ''}
                       placeholder="Nome do responsável"
                     />
                     {errors[`responsaveisPlanejamento.${index}.nome`] && (
                       <p className="text-red-500 text-xs">{errors[`responsaveisPlanejamento.${index}.nome`]}</p>
                     )}
                   </div>
                   
                   <div className="space-y-2">
                     <Label htmlFor={`cargo-planej-${index}`} className="text-sm font-medium">
                       Cargo/Função <span className="text-red-500">*</span>
                     </Label>
                     <Input
                       id={`cargo-planej-${index}`}
                       value={responsavel.cargo || ''}
                       onChange={(e) => handleResponsavelPlanejamentoChange(index, 'cargo', e.target.value)}
                       className={errors[`responsaveisPlanejamento.${index}.cargo`] ? 'border-red-500' : ''}
                       placeholder="Cargo ou função"
                     />
                     {errors[`responsaveisPlanejamento.${index}.cargo`] && (
                       <p className="text-red-500 text-xs">{errors[`responsaveisPlanejamento.${index}.cargo`]}</p>
                     )}
                   </div>
                   
                   <div className="space-y-2">
                     <Label htmlFor={`numeroFuncional-planej-${index}`} className="text-sm font-medium">
                       Nº Funcional <span className="text-red-500">*</span>
                     </Label>
                     <Input
                       id={`numeroFuncional-planej-${index}`}
                       value={responsavel.numeroFuncional || ''}
                       onChange={(e) => handleResponsavelPlanejamentoChange(index, 'numeroFuncional', e.target.value)}
                       className={errors[`responsaveisPlanejamento.${index}.numeroFuncional`] ? 'border-red-500' : ''}
                       placeholder="Número funcional"
                     />
                     {errors[`responsaveisPlanejamento.${index}.numeroFuncional`] && (
                       <p className="text-red-500 text-xs">{errors[`responsaveisPlanejamento.${index}.numeroFuncional`]}</p>
                     )}
                   </div>
                 </div>
               </div>
             ))}
           </div>
         );

                case 'pca-section':
           return (
             <div key={key} className="space-y-6">
               <div className="space-y-4">
                 <div className="flex items-center space-x-4">
                   <div className="flex items-center space-x-2">
                     <input
                       type="radio"
                       id="pca-sim"
                       name="previsaoPCA"
                       checked={formData.previsaoPCA === true}
                       onChange={() => handleInputChange('previsaoPCA', true)}
                       className="text-blue-600"
                     />
                     <Label htmlFor="pca-sim">Sim</Label>
                   </div>
                   <div className="flex items-center space-x-2">
                     <input
                       type="radio"
                       id="pca-nao"
                       name="previsaoPCA"
                       checked={formData.previsaoPCA === false}
                       onChange={() => handleInputChange('previsaoPCA', false)}
                       className="text-blue-600"
                     />
                     <Label htmlFor="pca-nao">Não</Label>
                   </div>
                 </div>
                 
                 {formData.previsaoPCA === false && (
                   <div className="space-y-2">
                     <Label htmlFor="justificativaPCA" className="text-sm font-medium">
                       Justificativa <span className="text-red-500">*</span>
                     </Label>
                     <Textarea
                       id="justificativaPCA"
                       value={formData.justificativaPCA || ''}
                       onChange={(e) => handleInputChange('justificativaPCA', e.target.value)}
                       className={`min-h-[96px] ${errors['justificativaPCA'] ? 'border-red-500' : ''}`}
                       placeholder="Justifique por que a demanda não está prevista no PCA"
                       rows={4}
                     />
                     {errors['justificativaPCA'] && (
                       <p className="text-red-500 text-xs">{errors['justificativaPCA']}</p>
                     )}
                   </div>
                 )}
               </div>
             </div>
           );

         case 'textarea':
        return (
          <div key={key} className="space-y-2">
            <Label htmlFor={field.name} className="text-sm font-medium">
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </Label>
            <Textarea
              id={field.name}
              value={value || ''}
              onChange={(e) => handleInputChange(field.name, e.target.value)}
              className={`min-h-[${(field.rows || 3) * 24}px] ${errors[field.name] ? 'border-red-500' : ''}`}
              placeholder={`Digite ${field.label.toLowerCase()}`}
              rows={field.rows || 3}
            />
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

             case 'currency':
         return (
           <div key={key} className="space-y-2">
             <Label htmlFor={field.name} className="text-sm font-medium">
               {field.label} {field.required && <span className="text-red-500">*</span>}
             </Label>
             <div className="relative">
               <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">R$</span>
               <Input
                 id={field.name}
                 type="text"
                 value={value || ''}
                 onChange={(e) => {
                   // Apenas números são permitidos, formatação acontece automaticamente
                   const rawValue = e.target.value.replace(/\D/g, '');
                   const formattedValue = formatCurrencyInput(rawValue);
                   handleInputChange(field.name, formattedValue);
                 }}
                 className={`pl-10 ${errors[field.name] ? 'border-red-500' : ''}`}
                 placeholder="Digite apenas números (ex: 1500 para R$ 15,00)"
               />
             </div>
             {errors[field.name] && (
               <p className="text-red-500 text-xs">{errors[field.name]}</p>
             )}
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
              onChange={(e) => handleInputChange(field.name, e.target.value)}
              className={errors[field.name] ? 'border-red-500' : ''}
              placeholder={`Digite ${field.label.toLowerCase()}`}
            />
            {errors[field.name] && (
              <p className="text-red-500 text-xs">{errors[field.name]}</p>
            )}
          </div>
        );
    }
  };

  const validateSection = () => {
    const section = dfdSections[currentSection];
    const newErrors = {};
    
         if (section.type === 'dynamic-items') {
       // Validar seção de itens dinâmicos
       if (!formData.itens || formData.itens.length === 0) {
         newErrors['itens'] = 'Pelo menos um item é obrigatório';
       } else {
         formData.itens.forEach((item, index) => {
           const itemFields = ['item', 'quantidade', 'unidade', 'codigoSIGA', 'especificacaoDetalhada'];
           itemFields.forEach(fieldName => {
             const value = item[fieldName];
             if (!value || (typeof value === 'string' && value.trim() === '')) {
               newErrors[`itens.${index}.${fieldName}`] = `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} é obrigatório no item ${index + 1}`;
             }
           });
         });
       }
     } else if (section.type === 'dynamic-acao-orcamentaria') {
       // Validar seção de ação orçamentária
       if (!formData.acaoOrcamentariaNumero || formData.acaoOrcamentariaNumero.trim() === '') {
         newErrors['acaoOrcamentariaNumero'] = 'Número da ação orçamentária é obrigatório';
       }
       if (!formData.responsaveisAcaoOrcamentaria || formData.responsaveisAcaoOrcamentaria.length === 0) {
         newErrors['responsaveisAcaoOrcamentaria'] = 'Pelo menos um responsável pela ação orçamentária é obrigatório';
       } else {
         formData.responsaveisAcaoOrcamentaria.forEach((responsavel, index) => {
           if (!responsavel.nome || responsavel.nome.trim() === '') {
             newErrors[`responsaveisAcaoOrcamentaria.${index}.nome`] = `Nome é obrigatório no responsável ${index + 1}`;
           }
           if (!responsavel.numeroFuncional || responsavel.numeroFuncional.trim() === '') {
             newErrors[`responsaveisAcaoOrcamentaria.${index}.numeroFuncional`] = `Número funcional é obrigatório no responsável ${index + 1}`;
           }
         });
       }
            } else if (section.type === 'pca-section') {
         // Validar seção de PCA
         if (formData.previsaoPCA === undefined || formData.previsaoPCA === null) {
           newErrors['previsaoPCA'] = 'Selecione se a demanda está prevista no PCA';
         } else if (formData.previsaoPCA === false && (!formData.justificativaPCA || formData.justificativaPCA.trim() === '')) {
           newErrors['justificativaPCA'] = 'Justificativa é obrigatória quando a demanda não está prevista no PCA';
         }
       } else if (section.type === 'dynamic-planejamento') {
         // Validar seção de planejamento e orçamento
         if (!formData.responsaveisPlanejamento || formData.responsaveisPlanejamento.length === 0) {
           newErrors['responsaveisPlanejamento'] = 'Pelo menos um responsável pelo planejamento é obrigatório';
         } else {
           formData.responsaveisPlanejamento.forEach((responsavel, index) => {
             if (!responsavel.nome || responsavel.nome.trim() === '') {
               newErrors[`responsaveisPlanejamento.${index}.nome`] = `Nome é obrigatório no responsável ${index + 1}`;
             }
             if (!responsavel.cargo || responsavel.cargo.trim() === '') {
               newErrors[`responsaveisPlanejamento.${index}.cargo`] = `Cargo é obrigatório no responsável ${index + 1}`;
             }
             if (!responsavel.numeroFuncional || responsavel.numeroFuncional.trim() === '') {
               newErrors[`responsaveisPlanejamento.${index}.numeroFuncional`] = `Número funcional é obrigatório no responsável ${index + 1}`;
             }
           });
         }
       } else if (section.fields) {
      // Validar seções com campos tradicionais
      section.fields.forEach(field => {
        if (field.required) {
          const value = field.name.includes('.') 
            ? field.name.split('.').reduce((obj, key) => obj?.[key], formData)
            : formData[field.name];
          
          if (!value || (typeof value === 'string' && value.trim() === '')) {
            newErrors[field.name] = `${field.label} é obrigatório`;
          }
        }
      });
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateAllSections = () => {
    const allErrors = {};
    
    console.log('🔍 Validando todas as seções...');
    console.log('📋 FormData atual:', formData);
    
    dfdSections.forEach((section, sectionIndex) => {
      console.log(`\n📝 Validando seção ${sectionIndex + 1}: ${section.title}`);
      
             if (section.type === 'dynamic-items') {
         // Validar seção de itens dinâmicos
         console.log(`  - Seção de itens dinâmicos: ${section.title}`);
         
         if (!formData.itens || formData.itens.length === 0) {
           allErrors[`itens`] = `Pelo menos um item é obrigatório (Seção ${sectionIndex + 1})`;
           console.log(`    ❌ ERRO: Nenhum item encontrado`);
         } else {
           formData.itens.forEach((item, itemIndex) => {
             console.log(`    - Validando item ${itemIndex + 1}:`, item);
             
             // Validar cada campo do item
             const itemFields = ['item', 'quantidade', 'unidade', 'codigoSIGA', 'especificacaoDetalhada'];
             itemFields.forEach(fieldName => {
               const value = item[fieldName];
               const errorKey = `itens.${itemIndex}.${fieldName}`;
               
               console.log(`      - Campo: ${fieldName}, Valor: "${value}"`);
               
               if (!value || (typeof value === 'string' && value.trim() === '')) {
                 allErrors[errorKey] = `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} é obrigatório no item ${itemIndex + 1}`;
                 console.log(`        ❌ ERRO: Campo obrigatório não preenchido`);
               } else {
                 console.log(`        ✅ Campo preenchido corretamente`);
               }
             });
           });
         }
       } else if (section.type === 'pca-section') {
         // Validar seção de PCA
         console.log(`  - Seção de PCA: ${section.title}`);
         
         if (formData.previsaoPCA === undefined || formData.previsaoPCA === null) {
           allErrors['previsaoPCA'] = `Selecione se a demanda está prevista no PCA (Seção ${sectionIndex + 1})`;
           console.log(`    ❌ ERRO: PCA não selecionado`);
         } else {
           console.log(`    ✅ PCA selecionado: ${formData.previsaoPCA ? 'Sim' : 'Não'}`);
           
           if (formData.previsaoPCA === false && (!formData.justificativaPCA || formData.justificativaPCA.trim() === '')) {
             allErrors['justificativaPCA'] = `Justificativa é obrigatória quando a demanda não está prevista no PCA (Seção ${sectionIndex + 1})`;
             console.log(`    ❌ ERRO: Justificativa não preenchida`);
           } else if (formData.previsaoPCA === false) {
             console.log(`    ✅ Justificativa preenchida: "${formData.justificativaPCA}"`);
           }
         }
       } else if (section.type === 'dynamic-acao-orcamentaria') {
         // Validar seção de ação orçamentária
         console.log(`  - Seção de ação orçamentária: ${section.title}`);
         
         if (!formData.acaoOrcamentariaNumero || formData.acaoOrcamentariaNumero.trim() === '') {
           allErrors['acaoOrcamentariaNumero'] = `Número da ação orçamentária é obrigatório (Seção ${sectionIndex + 1})`;
           console.log(`    ❌ ERRO: Número da ação orçamentária não preenchido`);
         } else {
           console.log(`    ✅ Número da ação orçamentária preenchido: "${formData.acaoOrcamentariaNumero}"`);
         }
         
         if (!formData.responsaveisAcaoOrcamentaria || formData.responsaveisAcaoOrcamentaria.length === 0) {
           allErrors['responsaveisAcaoOrcamentaria'] = `Pelo menos um responsável pela ação orçamentária é obrigatório (Seção ${sectionIndex + 1})`;
           console.log(`    ❌ ERRO: Nenhum responsável pela ação orçamentária encontrado`);
         } else {
           formData.responsaveisAcaoOrcamentaria.forEach((responsavel, respIndex) => {
             console.log(`    - Validando responsável ${respIndex + 1}:`, responsavel);
             
             if (!responsavel.nome || responsavel.nome.trim() === '') {
               allErrors[`responsaveisAcaoOrcamentaria.${respIndex}.nome`] = `Nome é obrigatório no responsável ${respIndex + 1}`;
               console.log(`      ❌ ERRO: Nome não preenchido`);
             } else {
               console.log(`      ✅ Nome preenchido: "${responsavel.nome}"`);
             }
             
             if (!responsavel.numeroFuncional || responsavel.numeroFuncional.trim() === '') {
               allErrors[`responsaveisAcaoOrcamentaria.${respIndex}.numeroFuncional`] = `Número funcional é obrigatório no responsável ${respIndex + 1}`;
               console.log(`      ❌ ERRO: Número funcional não preenchido`);
             } else {
               console.log(`      ✅ Número funcional preenchido: "${responsavel.numeroFuncional}"`);
             }
           });
         }
       } else if (section.type === 'dynamic-planejamento') {
         // Validar seção de planejamento e orçamento
         console.log(`  - Seção de planejamento e orçamento: ${section.title}`);
         
         if (!formData.responsaveisPlanejamento || formData.responsaveisPlanejamento.length === 0) {
           allErrors['responsaveisPlanejamento'] = `Pelo menos um responsável pelo planejamento é obrigatório (Seção ${sectionIndex + 1})`;
           console.log(`    ❌ ERRO: Nenhum responsável pelo planejamento encontrado`);
         } else {
           formData.responsaveisPlanejamento.forEach((responsavel, respIndex) => {
             console.log(`    - Validando responsável ${respIndex + 1}:`, responsavel);
             
             if (!responsavel.nome || responsavel.nome.trim() === '') {
               allErrors[`responsaveisPlanejamento.${respIndex}.nome`] = `Nome é obrigatório no responsável ${respIndex + 1}`;
               console.log(`      ❌ ERRO: Nome não preenchido`);
             } else {
               console.log(`      ✅ Nome preenchido: "${responsavel.nome}"`);
             }
             
             if (!responsavel.cargo || responsavel.cargo.trim() === '') {
               allErrors[`responsaveisPlanejamento.${respIndex}.cargo`] = `Cargo é obrigatório no responsável ${respIndex + 1}`;
               console.log(`      ❌ ERRO: Cargo não preenchido`);
             } else {
               console.log(`      ✅ Cargo preenchido: "${responsavel.cargo}"`);
             }
             
             if (!responsavel.numeroFuncional || responsavel.numeroFuncional.trim() === '') {
               allErrors[`responsaveisPlanejamento.${respIndex}.numeroFuncional`] = `Número funcional é obrigatório no responsável ${respIndex + 1}`;
               console.log(`      ❌ ERRO: Número funcional não preenchido`);
             } else {
               console.log(`      ✅ Número funcional preenchido: "${responsavel.numeroFuncional}"`);
             }
           });
         }
       } else if (section.fields) {
        // Validar seções com campos tradicionais
        section.fields.forEach(field => {
          if (field.required) {
            const value = field.name.includes('.') 
              ? field.name.split('.').reduce((obj, key) => obj?.[key], formData)
              : formData[field.name];
            
            console.log(`  - Campo: ${field.name}, Valor: "${value}", Obrigatório: ${field.required}`);
            
            if (!value || (typeof value === 'string' && value.trim() === '')) {
              allErrors[field.name] = `${field.label} é obrigatório (Seção ${sectionIndex + 1})`;
              console.log(`    ❌ ERRO: Campo obrigatório não preenchido`);
            } else {
              console.log(`    ✅ Campo preenchido corretamente`);
            }
          }
        });
      }
    });
    
    console.log('\n📊 Resumo dos erros:', allErrors);
    setErrors(allErrors);
    return Object.keys(allErrors).length === 0;
  };

  const handleNext = () => {
    if (validateSection()) {
      setCurrentSection(prev => Math.min(prev + 1, dfdSections.length - 1));
    }
  };

  const handlePrevious = () => {
    setCurrentSection(prev => Math.max(prev - 1, 0));
  };

  const handleProcessDFD = async () => {
    if (!validateAllSections()) {
      showAlert('Por favor, preencha todos os campos obrigatórios de todas as seções.', 'error');
      return;
    }

    setIsGenerating(true);
    setGenerationProgress(0);
    setGenerationMessage('Processando dados do DFD...');

    try {
      const requestBody = { dados: formData };
      console.log('🚀 Frontend - Enviando dados para API:');
      console.log('Request body:', requestBody);
      console.log('FormData:', formData);
      
      const response = await fetch('/api/documentos/processar-dfd', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(requestBody)
      });

      const result = await response.json();

      if (!response.ok) {
        if (result.missingLabels && result.missingLabels.length > 0) {
          throw new Error(`Campos obrigatórios não preenchidos: ${result.missingLabels.join(', ')}`);
        }
        throw new Error(result.error || 'Erro ao processar DFD');
      }

      setGenerationProgress(100);
      setGenerationMessage('DFD processado com sucesso!');
      
      setDocuments([result.documento]);
      setShowDownloadModal(true);
      
      showAlert('DFD processado e salvo com sucesso!', 'success');

    } catch (error) {
      console.error('Erro ao processar DFD:', error);
      showAlert(error.message || 'Erro ao processar DFD', 'error');
    } finally {
      setIsGenerating(false);
    }
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
      a.download = `DFD_${formData.numeroDFD || 'documento'}.docx`;
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
              <h1 className="text-3xl font-bold text-blue-600">
                📋 Criar DFD
              </h1>
              <p className="text-gray-600">
                Documento de Formalização de Demanda
              </p>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="h-2 rounded-full transition-all duration-300 bg-blue-600"
              style={{ width: `${((currentSection + 1) / dfdSections.length) * 100}%` }}
            ></div>
          </div>
          <div className="flex justify-between text-sm text-gray-600 mt-2">
            {dfdSections.map((section, index) => {
              let hasErrors = false;
              
                             if (section.type === 'dynamic-items') {
                 // Verificar erros em itens dinâmicos
                 hasErrors = errors['itens'] || Object.keys(errors).some(key => key.startsWith('itens.'));
               } else if (section.type === 'pca-section') {
                 // Verificar erros em PCA
                 hasErrors = errors['previsaoPCA'] || errors['justificativaPCA'];
               } else if (section.type === 'dynamic-acao-orcamentaria') {
                 // Verificar erros em ação orçamentária
                 hasErrors = errors['acaoOrcamentariaNumero'] || errors['responsaveisAcaoOrcamentaria'] || 
                   Object.keys(errors).some(key => key.startsWith('responsaveisAcaoOrcamentaria.'));
               } else if (section.type === 'dynamic-planejamento') {
                 // Verificar erros em planejamento
                 hasErrors = errors['responsaveisPlanejamento'] || 
                   Object.keys(errors).some(key => key.startsWith('responsaveisPlanejamento.'));
               } else if (section.fields) {
                // Verificar erros em campos tradicionais
                hasErrors = section.fields.some(field => 
                  field.required && errors[field.name]
                );
              }
              
              return (
                <span 
                  key={index}
                  className={`cursor-pointer ${index <= currentSection ? 'text-blue-600 font-medium' : ''} ${
                    hasErrors ? 'text-red-500' : ''
                  }`}
                  onClick={() => setCurrentSection(index)}
                  title={hasErrors ? 'Esta seção tem campos obrigatórios não preenchidos' : ''}
                >
                  {index + 1}
                  {hasErrors && <span className="text-red-500 ml-1">⚠️</span>}
                </span>
              );
            })}
          </div>
        </div>

        {/* Resumo de Erros */}
        {Object.keys(errors).length > 0 && (
          <Card className="mb-6 border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle className="text-lg text-red-700 flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Campos obrigatórios não preenchidos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Object.entries(errors).map(([fieldName, errorMessage]) => (
                  <div key={fieldName} className="flex items-center gap-2 text-sm text-red-600">
                    <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                    <span>{errorMessage}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Current Section */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-xl text-blue-600">
              {dfdSections[currentSection].title}
            </CardTitle>
            <p className="text-gray-600">{dfdSections[currentSection].description}</p>
          </CardHeader>
                     <CardContent className="space-y-6">
             {dfdSections[currentSection].type === 'dynamic-items' ? (
               renderField({ name: 'dynamic-items', type: 'dynamic-items' })
             ) : dfdSections[currentSection].type === 'pca-section' ? (
               renderField({ name: 'pca-section', type: 'pca-section' })
             ) : dfdSections[currentSection].type === 'dynamic-acao-orcamentaria' ? (
               renderField({ name: 'dynamic-acao-orcamentaria', type: 'dynamic-acao-orcamentaria' })
             ) : dfdSections[currentSection].type === 'dynamic-planejamento' ? (
               renderField({ name: 'dynamic-planejamento', type: 'dynamic-planejamento' })
             ) : (
               <div className="grid md:grid-cols-2 gap-6">
                 {dfdSections[currentSection].fields.map(renderField)}
               </div>
             )}
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

          {currentSection === dfdSections.length - 1 ? (
            <Button
              onClick={handleProcessDFD}
              className="px-6 bg-blue-600 hover:bg-blue-700 text-white"
              disabled={isGenerating}
            >
              📋 Processar DFD
            </Button>
          ) : (
            <Button
              onClick={handleNext}
              className="px-6 bg-blue-600 hover:bg-blue-700 text-white"
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
                  🎉 DFD Processado!
                </h2>
                <p className="text-gray-600">
                  Seu DFD foi processado com sucesso. Clique em "Gerar e Baixar" para criar o documento DOCX.
                </p>
              </div>
              
              <div className="space-y-3 mb-6">
                {documents.map((doc, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 font-medium text-sm">DFD</span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">DFD - {formData.numeroDFD}</p>
                        <p className="text-xs text-gray-500">Documento DOCX</p>
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
      </div>
    </ProtectedRoute>
  );
}