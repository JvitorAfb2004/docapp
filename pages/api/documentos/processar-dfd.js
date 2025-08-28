const { verifyToken } = require('../../../lib/auth');
const { sanitizeInput, validateRequiredFields, rateLimit } = require('../../../lib/security');
const db = require('../../../models');

function createFallbackData(formData) {
  const toCheckbox = (value) => value ? 'x' : ' ';
  const hasText = (value) => value && typeof value === 'string' && value.trim() !== '';

  const formatValue = (value) => {
    const number = parseFloat(String(value).replace(/[^0-9,-]/g, '').replace(',', '.'));
    if (isNaN(number)) return '';
    return `R$ ${number.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return {
    numero_dfd: formData.numeroDFD || '',
    numero_etp: formData.numeroETP || '',
    numero_sgd: formData.numeroSGD || '',
    protocolo_pncp: formData.protocoloPNCP || '',
    data: new Date().toLocaleDateString('pt-BR'),
    descricao_necessidade: formData.descricaoNecessidade || '',
    descricao_justificativa: formData.descricaoNecessidade || '',
    valor_estimado: formatValue(formData.valorEstimado),
    estimativa_valor: formatValue(formData.valorEstimado),
    classificacao_orcamentaria: formData.classificacaoOrcamentaria || '',
    fonte: formData.fonte || '',
    elemento_despesa: formData.elementoDespesa || '',
    pca_dfd_sim: toCheckbox(formData.previsaoPCA),
    pca_dfd_nao: toCheckbox(!formData.previsaoPCA),
    pca_dfd_justificativa: formData.justificativaPCA || '',
    previsao_pca_etp_sim: toCheckbox(formData.previsaoPCA),
    previsao_pca_etp_nao: toCheckbox(!formData.previsaoPCA),
    previsao_pca_etp_justificativa: formData.justificativaPCA || '',
    recurso_convenio_sim: toCheckbox(formData.recursoConvenio),
    recurso_convenio_nao: toCheckbox(!formData.recursoConvenio),
    fiscal_titular: formData.fiscalTitular || '',
    fiscal_suplente: formData.fiscalSuplente || '',
    gestor_titular: formData.gestorTitular || '',
    gestor_suplente: formData.gestorSuplente || '',
    orgao_demandante: formData.demandante?.orgao || '',
    setor_demandante: formData.demandante?.setor || '',
    funcao_demandante: formData.demandante?.cargo || '',
    nome_demandante: formData.demandante?.nome || '',
    numero_funcional_demandante: formData.demandante?.numeroFuncional || '',
    
    // --- Itens e Serviços (Campos dinâmicos para tabela) ---
    // Array principal para loop no template
    itens: formData.itens && formData.itens.length > 0 ? formData.itens.map((item, index) => ({
      item: item.item || `Item ${index + 1}`,
      qtd: item.quantidade || '',
      unid: item.unidade || '',
      codigo_siga_item: item.codigoSIGA || '',
      especificacao_item: item.especificacaoDetalhada || ''
    })) : [],
    
    // Campos individuais para compatibilidade
    item: formData.itens && formData.itens.length > 0 ? formData.itens[0].item : '',
    quantidade: formData.itens && formData.itens.length > 0 ? formData.itens[0].quantidade : '',
    unidade: formData.itens && formData.itens.length > 0 ? formData.itens[0].unidade : '',
    codigo_siga: formData.itens && formData.itens.length > 0 ? formData.itens[0].codigoSIGA : '',
    especificacao_detalhada: formData.itens && formData.itens.length > 0 ? formData.itens[0].especificacaoDetalhada : formData.descricaoNecessidade,
    
    // --- Responsáveis pela Ação Orçamentária (Campos dinâmicos) ---
    // Array principal para loop no template
    responsaveis_acao_orcamentaria: formData.responsaveisAcaoOrcamentaria && formData.responsaveisAcaoOrcamentaria.length > 0 ? 
      formData.responsaveisAcaoOrcamentaria.map(resp => ({
        acao: formData.acaoOrcamentariaNumero || 'N/A',
        nome: resp.nome || '',
        numero_funcional: resp.numeroFuncional || ''
      })) : [],
    
    // Campos individuais para compatibilidade
    acao_orcamentaria: formData.acaoOrcamentariaNumero || '',
    nome_responsavel_acao: formData.responsaveisAcaoOrcamentaria && formData.responsaveisAcaoOrcamentaria.length > 0 ? 
      formData.responsaveisAcaoOrcamentaria[0].nome : '',
    numero_funcional_acao: formData.responsaveisAcaoOrcamentaria && formData.responsaveisAcaoOrcamentaria.length > 0 ? 
      formData.responsaveisAcaoOrcamentaria[0].numeroFuncional : '',
    
    // --- Responsável pelo Planejamento e Orçamento (Campos dinâmicos) ---
    // Array principal para loop no template
    responsaveis_planejamentos: formData.responsavelPlanejamento ? [{
      nome_responsavel_planejamento: formData.responsavelPlanejamento.nome || '',
      numero_funcional_responsavel_planejamento: formData.responsavelPlanejamento.numeroFuncional || '',
      cargo_responsavel_planejamento: formData.responsavelPlanejamento.cargo || ''
    }] : [],
    
    // Campos individuais para compatibilidade
    nome_responsavel_planejamento: formData.responsavelPlanejamento?.nome || '',
    cargo_responsavel_planejamento: formData.responsavelPlanejamento?.cargo || '',
    numero_funcional_responsavel_planejamento: formData.responsavelPlanejamento?.numeroFuncional || '',
    
    // Campos legados para compatibilidade
    resp_planej_orc_nome: formData.responsavelPlanejamento?.nome || '',
    resp_planej_orc_cargo: formData.responsavelPlanejamento?.cargo || '',
    resp_planej_orc_funcional: formData.responsavelPlanejamento?.numeroFuncional || '',
    
    // Campos para produtos (mantidos para compatibilidade)
    itens_produto: formData.itens && formData.itens.length > 0 ? formData.itens.map((item, index) => ({
      item: item.item || `Item ${index + 1}`,
      codigosig_produto: item.codigoSIGA || '',
      descricao_detalhada_produto: item.especificacaoDetalhada || ''
    })) : [],
    codigosig_produto: formData.itens && formData.itens.length > 0 ? formData.itens[0].codigoSIGA || '' : '',
    descricao_detalhada_produto: formData.itens && formData.itens.length > 0 ? formData.itens[0].especificacaoDetalhada || '' : ''
  };
}

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Método não permitido' });
  }

  rateLimit(3, 300000)(request, response, async () => {
    try {
      // Verificar autenticação
      const token = request.headers.authorization?.replace('Bearer ', '');
      if (!token) return response.status(401).json({ error: 'Token não fornecido' });
      const decoded = await verifyToken(token);
      if (!decoded) return response.status(403).json({ error: 'Token inválido' });

      let formData = request.body.dados || request.body;
      
      console.log('\n DEBUG API - Dados recebidos:');
      console.log('Request body completo:', request.body);
      console.log('FormData extraído:', formData);
      console.log('Tipo do formData:', typeof formData);
      
      // Se formData for undefined ou null, tentar extrair de outras formas
      if (!formData) {
        console.log('⚠️ FormData é undefined/null, tentando extrair de outras formas...');
        if (request.body && typeof request.body === 'string') {
          try {
            formData = JSON.parse(request.body);
            console.log('✅ Parseado de string JSON:', formData);
          } catch (e) {
            console.log('❌ Erro ao fazer parse JSON:', e.message);
          }
        }
      }
      
      if (!formData) {
        return response.status(400).json({ 
          error: 'Dados do formulário não recebidos ou formato inválido',
          receivedBody: request.body
        });
      }
      
      // Validar campos obrigatórios
      const requiredFields = [
        'numeroSGD', 
        'numeroDFD', 
        'descricaoNecessidade',
        'valorEstimado',
        'classificacaoOrcamentaria',
        'fonte',
        'elementoDespesa',
        'fiscalTitular',
        'fiscalSuplente',
        'gestorTitular',
        'gestorSuplente'
      ];
      
      // Validar campos aninhados obrigatórios
      const nestedRequiredFields = [
        'demandante.orgao',
        'demandante.setor',
        'demandante.cargo',
        'demandante.nome',
        'demandante.numeroFuncional'
      ];
      
      console.log('\n DEBUG API - Validando campos:');
      console.log('Campos obrigatórios:', requiredFields);
      console.log('Campos aninhados:', nestedRequiredFields);
      
      const missing = validateRequiredFields(formData, requiredFields);
      
      console.log('\n📋 Validação de campos simples:');
      requiredFields.forEach(field => {
        const value = formData[field];
        console.log(`  - ${field}: "${value}" (${typeof value})`);
        if (!value || (typeof value === 'string' && !value.trim())) {
          console.log(`    ❌ Campo obrigatório não preenchido`);
        } else {
          console.log(`    ✅ Campo preenchido corretamente`);
        }
      });
      
      console.log('\n📋 Validação de campos aninhados:');
      // Validar campos aninhados
      for (const nestedField of nestedRequiredFields) {
        const [parent, child] = nestedField.split('.');
        const parentObj = formData[parent];
        const value = parentObj ? parentObj[child] : undefined;
        
        console.log(`  - ${nestedField}:`);
        console.log(`    Parent object:`, parentObj);
        console.log(`    Value: "${value}" (${typeof value})`);
        
        if (!formData[parent] || !formData[parent][child] || 
            (typeof formData[parent][child] === 'string' && !formData[parent][child].trim())) {
          missing.push(nestedField);
          console.log(`    ❌ Campo obrigatório não preenchido`);
        } else {
          console.log(`    ✅ Campo preenchido corretamente`);
        }
      }
      
      // Validar itens dinâmicos
      console.log('\n📋 Validação de itens dinâmicos:');
      if (!formData.itens || !Array.isArray(formData.itens) || formData.itens.length === 0) {
        missing.push('itens');
        console.log(`  ❌ Nenhum item encontrado`);
      } else {
        formData.itens.forEach((item, index) => {
          console.log(`  - Validando item ${index + 1}:`, item);
          
          const itemFields = ['item', 'quantidade', 'unidade', 'codigoSIGA', 'especificacaoDetalhada'];
          itemFields.forEach(fieldName => {
            const value = item[fieldName];
            console.log(`    - Campo: ${fieldName}, Valor: "${value}"`);
            
            if (!value || (typeof value === 'string' && value.trim() === '')) {
              missing.push(`itens.${index}.${fieldName}`);
              console.log(`      ❌ Campo obrigatório não preenchido`);
            } else {
              console.log(`      ✅ Campo preenchido corretamente`);
            }
          });
        });
      }
      
      if (missing.length > 0) {
        const missingLabels = {
          'numeroSGD': 'Número do SGD',
          'numeroDFD': 'Número do DFD',
          'descricaoNecessidade': 'Descrição da Demanda',
          'itens': 'Itens e Serviços',
          'valorEstimado': 'Valor Estimado',
          'classificacaoOrcamentaria': 'Classificação Orçamentária',
          'fonte': 'Fonte',
          'elementoDespesa': 'Elemento de Despesa',
          'fiscalTitular': 'Fiscal Titular',
          'fiscalSuplente': 'Fiscal Suplente',
          'gestorTitular': 'Gestor Titular',
          'gestorSuplente': 'Gestor Suplente',
          'demandante.orgao': 'Órgão do Demandante',
          'demandante.setor': 'Setor do Demandante',
          'demandante.cargo': 'Cargo do Demandante',
          'demandante.nome': 'Nome do Demandante',
          'demandante.numeroFuncional': 'Número Funcional do Demandante'
        };
        
        const missingFieldLabels = missing.map(field => missingLabels[field] || field);
        
        return response.status(400).json({ 
          error: `Campos obrigatórios faltando: ${missingFieldLabels.join(', ')}`,
          missing: missing,
          missingLabels: missingFieldLabels
        });
      }

      // Sanitizar dados
      if (formData.numeroSGD) formData.numeroSGD = sanitizeInput(formData.numeroSGD);
      if (formData.numeroDFD) formData.numeroDFD = sanitizeInput(formData.numeroDFD);
      if (formData.descricaoNecessidade) formData.descricaoNecessidade = sanitizeInput(formData.descricaoNecessidade);

      console.log('\n📋 Processando DFD (sem IA)');
      console.log('Usuário:', decoded.email);
      console.log('SGD:', formData.numeroSGD);
      console.log('DFD:', formData.numeroDFD);

      // Processar dados do DFD (sem IA)
      const dadosProcessados = createFallbackData(formData);

      // Salvar no banco de dados
      const documento = await db.DocumentoGerado.create({
        tipo: 'DFD',
        numeroSGD: formData.numeroSGD,
        numeroDFD: formData.numeroDFD,
        numeroETP: null,
        dadosProcessados: dadosProcessados,
        dadosOriginais: formData,
        status: 'processado',
        tokensGastos: 0, // DFD não usa IA
        modeloIA: 'sem-ia-formulario',
        criadoPor: decoded.userId,
        dataProcessamento: new Date(),
        ativo: true,
        downloadCount: 0
      });

      console.log('✅ DFD processado e salvo no banco (ID:', documento.id, ')');

      return response.status(200).json({
        success: true,
        message: 'DFD processado com sucesso!',
        documento: {
          id: documento.id,
          tipo: 'DFD',
          numeroSGD: formData.numeroSGD,
          numeroDFD: formData.numeroDFD,
          status: 'processado',
          dataProcessamento: documento.dataProcessamento
        },
        processamento: {
          usouIA: false,
          tokensGastos: 0,
          modeloIA: 'sem-ia-formulario'
        }
      });

    } catch (error) {
      console.error('\n❌ Erro ao processar DFD:', error);
      return response.status(500).json({ 
        error: 'Erro interno do servidor', 
        details: error.message 
      });
    }
  });
}