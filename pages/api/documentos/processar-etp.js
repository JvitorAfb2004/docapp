const { verifyToken } = require('../../../lib/auth');
const { processFormDataWithAI } = require('../../../lib/openai-helper');
const { sanitizeInput, validateRequiredFields, rateLimit } = require('../../../lib/security');
const fs = require('fs');
const path = require('path');
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
    
    // --- Descrição da Necessidade (Campos obrigatórios) ---
    descricao_necessidade: formData.descricaoNecessidade || '',
    descricao_justificativa: formData.descricaoNecessidade || '',
    descricao_necessidade_contratacao: formData.descricaoNecessidade || '',
    valor_estimado: formatValue(formData.valorEstimado),
    estimativa_valor: formatValue(formData.valorEstimado),
    classificacao_orcamentaria: formData.classificacaoOrcamentaria || '',
    fonte: formData.fonte || '',
    elemento_despesa: formData.elementoDespesa || '',
    pca_dfd_sim: toCheckbox(formData.previsaoPCA),
    pca_dfd_nao: toCheckbox(!formData.previsaoPCA),
    pca_dfd_justificativa: formData.justificativaPCA || '',
    // LÓGICA DE PREENCHIMENTO AUTOMÁTICO: Se não há previsão PCA, marca automaticamente "não"
    previsao_pca_etp_sim: toCheckbox(formData.previsaoPCA),
    previsao_pca_etp_nao: toCheckbox(!formData.previsaoPCA),
    // LÓGICA DE PREENCHIMENTO AUTOMÁTICO: Se não há previsão PCA, preenche justificativa automaticamente
    previsao_pca_etp_justificativa: formData.previsaoPCA ? '' : (formData.justificativaPCA || 'Não há previsão no PCA para esta contratação'),
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
    responsaveis_acao_orcamentaria: formData.responsaveisAcaoOrcamentaria?.map(resp => ({
        ...resp,
        acao: formData.acaoOrcamentariaNumero || 'N/A'
    })) || [],
    nome_responsavel_planejamento: formData.responsavelPlanejamento?.nome || '',
    cargo_responsavel_planejamento: formData.responsavelPlanejamento?.cargo || '',
    numero_funcional_responsavel_planejamento: formData.responsavelPlanejamento?.numeroFuncional || '',
    resp_planej_orc_nome: formData.responsavelPlanejamento?.nome || '',
    resp_planej_orc_cargo: formData.responsavelPlanejamento?.cargo || '',
    resp_planej_orc_funcional: formData.responsavelPlanejamento?.numeroFuncional || '',

    // --- Itens e Produtos ---
    itens: formData.itens && formData.itens.length > 0 ? formData.itens : [],
    itens_produto: formData.produtos && formData.produtos.length > 0 ? formData.produtos.map((produto, index) => ({
      item: produto.item || `${index + 1}`,
      codigosig_produto: produto.codigoSIGA || '',
      descricao_detalhada_produto: produto.descricao || ''
    })) : [],
    codigosig_produto: formData.produtos && formData.produtos.length > 0 ? formData.produtos[0].codigoSIGA || '' : '',
    descricao_detalhada_produto: formData.produtos && formData.produtos.length > 0 ? formData.produtos[0].descricao || '' : '',

    // --- Requisitos de Contratação (ETP) ---
    tipo_objeto_bem: toCheckbox(formData.tipoObjeto === 'Bem'),
    tipo_objeto_servico: toCheckbox(formData.tipoObjeto === 'Serviço'),
    natureza_continuada: toCheckbox(formData.natureza === 'continuada'),
    natureza_com_monopolio: toCheckbox(formData.natureza === 'com monopólio'),
    natureza_sem_monopolio: toCheckbox(formData.natureza === 'sem monopólio'),
    natureza_nao_continuada: toCheckbox(formData.natureza === 'não continuada'),
   vigencia_contrato_30_dias: toCheckbox(formData.vigencia && formData.vigencia.includes('30 dias')),
    vigencia_contrato_12_meses: toCheckbox(formData.vigencia && formData.vigencia.includes('12 meses')),
    vigencia_contrato_5_anos: toCheckbox(formData.vigencia && formData.vigencia.includes('5 anos')),
    vigencia_contrato_indeterminado: toCheckbox(formData.vigencia && formData.vigencia.includes('indeterminado')),
   
    // Só marca "Outro" se não for nenhuma das opções padrão
    vigencia_contrato_outro: toCheckbox(
      formData.vigencia && 
      !formData.vigencia.includes('30 dias') && 
      !formData.vigencia.includes('12 meses') && 
      !formData.vigencia.includes('5 anos') && 
      !formData.vigencia.includes('indeterminado') &&
      formData.vigencia.trim() !== ''
    ),
    vigencia_contrato_qtd_dias: formData.vigenciaDias || '',
    vigencia_contrato_qtd_meses: formData.vigenciaMeses || '',
    vigencia_contrato_qtd_anos: formData.vigenciaAnos || '',
    prorrogacao_contrato_sim: toCheckbox(formData.prorrogavel),
    prorrogacao_contrato_nao: toCheckbox(!formData.prorrogavel),
    prorrogacao_contrato_indeterminado: toCheckbox(
      formData.vigencia && formData.vigencia.includes('indeterminado')
    ),
    objeto_continuado_sim: toCheckbox(formData.servicoContinuado),
    objeto_continuado_nao: toCheckbox(!formData.servicoContinuado),
    objeto_continuado_justificativa: formData.justificativaServicoContinuado || '',
    justificativa_servico_continuado: formData.justificativaServicoContinuado || '',
    criterios_sustentabilidade_sim: toCheckbox(hasText(formData.criteriosSustentabilidade)),
    criterios_sustentabilidade_nao: toCheckbox(!hasText(formData.criteriosSustentabilidade)),
    criterios_sustentabilidade_justificativa: formData.criteriosSustentabilidade || '',
    justificativa_criterios: formData.criteriosSustentabilidade || '',
    justificativa_criterios_sustentabilidade: formData.criteriosSustentabilidade || '',
    justificativa_criterios_sustentabilidade_contratacao: formData.criteriosSustentabilidade || '',
    necessidade_treinamento_sim: toCheckbox(formData.necessidadeTreinamento),
    necessidade_treinamento_nao: toCheckbox(!formData.necessidadeTreinamento),
    justificativa_treinamento: formData.justificativaTreinamento || '',
    justificativa_necessidade_treinamento: formData.justificativaTreinamento || '',
    justificativa_necessidade_treinamento_contratacao: formData.justificativaTreinamento || '',
    bem_luxo_sim: toCheckbox(formData.bemLuxo),
    bem_luxo_nao: toCheckbox(!formData.bemLuxo),
    bem_luxo_justificativa: formData.justificativaBemLuxo || '',
    justificativa_bem_luxo: formData.justificativaBemLuxo || '',
    justificativa_bem_luxo_contratacao: formData.justificativaBemLuxo || '',
    justificativa_bem_luxo_contratacao_contratacao: formData.justificativaBemLuxo || '',
    transicao_contratual_sim: toCheckbox(formData.transicaoContratual),
    transicao_contratual_nao: toCheckbox(!formData.transicaoContratual),
    transicao_contratual_numero: formData.numeroContratoTransicao || '',
    transicao_contratual_prazo: formData.prazoTransicao || '',
    justificativa_transicao: formData.justificativaTransicao || '',
    justificativa_transicao_contratual: formData.justificativaTransicao || '',
    justificativa_transicao_contratual_contratacao: formData.justificativaTransicao || '',
    justificativa_transicao_contratual_contratacao_contratacao: formData.justificativaTransicao || '',
    normativos_especificos_sim: toCheckbox(hasText(formData.normativosTecnicos)),
    normativos_especificos_nao: toCheckbox(!hasText(formData.normativosTecnicos)),
    normativos_especificos_justificativa: formData.normativosTecnicos || '',
    normativos_tecnicos: formData.normativosTecnicos || '',
    justificativa_normativos: formData.normativosTecnicos || '',
    justificativa_normativos_tecnicos: formData.normativosTecnicos || '',
    justificativa_normativos_tecnicos_contratacao: formData.normativosTecnicos || '',
    local_entrega_servico: formData.localEntrega || '',
    
    // --- Especificação de Bens/Serviços (ETP) ---
    especificacao_bens_servicos: formData.especificacaoBensServicos || '',
    especificacao_objeto: formData.especificacaoBensServicos || '',
    especificacao_objeto_contratacao: formData.especificacaoBensServicos || '',
    especificacao_objeto_contratacao_contratacao: formData.especificacaoBensServicos || '',
    local_entrega: formData.localEntrega || '',
    local_entrega_execucao: formData.localEntrega || '',
    local_entrega_execucao_contratacao: formData.localEntrega || '',
    local_entrega_execucao_contratacao_contratacao: formData.localEntrega || '',
    
    amostra_prova_conceito_sim: toCheckbox(formData.amostraProvaConceito),
    amostra_prova_conceito_nao: toCheckbox(!formData.amostraProvaConceito),
    amostra_prova_conceito_justificativa: formData.justificativaAmostra || '',
    justificativa_amostra: formData.justificativaAmostra || '',
    justificativa_amostra_prova: formData.justificativaAmostra || '',
    justificativa_amostra_prova_conceito: formData.justificativaAmostra || '',
    justificativa_amostra_prova_conceito_contratacao: formData.justificativaAmostra || '',
    exigencia_marca_especifica_sim: toCheckbox(formData.marcaEspecifica),
    exigencia_marca_especifica_nao: toCheckbox(!formData.marcaEspecifica),
    exigencia_marca_especifica_justificativa: formData.justificativaMarca || '',
    justificativa_marca: formData.justificativaMarca || '',
    justificativa_marca_especifica: formData.justificativaMarca || '',
    justificativa_marca_especifica_contratacao: formData.justificativaMarca || '',
    justificativa_marca_especifica_contratacao_contratacao: formData.justificativaMarca || '',
    permitida_subcontratacao_sim: toCheckbox(formData.subcontratacao),
    permitida_subcontratacao_nao: toCheckbox(!formData.subcontratacao),
    permitida_subcontratacao_limitado: formData.limitesSubcontratacao || '',
    justificativa_subcontratacao: formData.justificativaSubcontratacao || '',
    justificativa_subcontratacao_permitida: formData.justificativaSubcontratacao || '',
    justificativa_subcontratacao_permitida_contratacao: formData.justificativaSubcontratacao || '',
    justificativa_subcontratacao_permitida_contratacao_contratacao: formData.justificativaSubcontratacao || '',

    // --- Estimativas de Quantidades (ETP) ---
    obtencao_quantitativo_contratos_anteriores: toCheckbox(formData.obtencaoQuantitativo === 'anteriores'),
    obtencao_quantitativo_contratos_similares: toCheckbox(formData.obtencaoQuantitativo === 'contratos_similares'),
    obtencao_quantitativo_outro: toCheckbox(formData.obtencaoQuantitativo === 'outro'),
    obtencao_quantitativo_especifico: formData.obtencaoQuantitativoEspecifico || '',
    quantidade_total_estimada: formData.quantidadeTotalEstimada || formData.estimativasQuantidades?.descricao || '',
    quantidade_item_exercicio: formData.serieHistorica?.exercicio || '',
    quantidade_item_pae: formData.quantidadeItemPAE || formData.serieHistorica?.pae || '',
    quantidade_item_descricao: formData.quantidadeItemDescricao || formData.serieHistorica?.descricao || '',
    quantidade_item_un: formData.serieHistorica?.unidade || '',
    quantidade_item_qtd: formData.serieHistorica?.quantidadeConsumida || '',
    quantitativos_itens: formData.quantitativos || [],
    quantidade_item_quantitativos_desc: formData.quantitativos?.descricao || '',
    quantidade_item_quantitativos_qtd: formData.quantitativos?.quantidade || '',
    
    // --- Campos adicionais para o template ---
    metodo_estimativa: formData.estimativasQuantidades?.metodo || '',
    descricao_estimativa: formData.estimativasQuantidades?.descricao || '',
    justificativa_estimativas: formData.estimativasQuantidades?.descricao || '',
    justificativa_estimativas_quantidades: formData.estimativasQuantidades?.descricao || '',
    justificativa_estimativas_quantidades_contratacao: formData.estimativasQuantidades?.descricao || '',
    exercicio_serie_historica: formData.serieHistorica?.exercicio || '',
    quantidade_consumida_serie_historica: formData.serieHistorica?.quantidadeConsumida || '',
    unidade_serie_historica: formData.serieHistorica?.unidade || '',
    justificativa_serie_historica: formData.serieHistorica?.descricao || '',
    justificativa_serie_historica_contratacao: formData.serieHistorica?.descricao || '',
    justificativa_serie_historica_contratacao_contratacao: formData.serieHistorica?.descricao || '',
    item_quantitativo: formData.quantitativos?.item || '',
    descricao_quantitativo: formData.quantitativos?.descricao || '',
    unidade_quantitativo: formData.quantitativos?.unidade || '',
    quantidade_quantitativo: formData.quantitativos?.quantidade || '',
    justificativa_quantitativos: formData.quantitativos?.descricao || '',
    justificativa_quantitativos_contratacao: formData.quantitativos?.descricao || '',
    justificativa_quantitativos_contratacao_contratacao: formData.quantitativos?.descricao || '',
    
    // --- Justificativas técnicas e econômicas ---
    justificativa_tecnica_tecnica: formData.justificativaTecnica || '',
    justificativa_tecnica_economica: formData.justificativaEconomica || '',

    // --- Levantamento de Mercado (ETP) ---
    pesquisa_solucoes_similares: toCheckbox(formData.levantamentoMercado?.fontes?.includes('similares')),
    pesquisa_solucoes_internet: toCheckbox(formData.levantamentoMercado?.fontes?.includes('internet')),
    pesquisa_solucoes_aud_publica: toCheckbox(formData.levantamentoMercado?.fontes?.includes('audiencia')),
    pesquisa_solucoes_outro: toCheckbox(formData.levantamentoMercado?.fontes?.includes('outro')),
    pesquisa_solucoes_justificativa: formData.levantamentoMercado?.outrasFontes || '',
    justificativa_tecnica_tecnica: formData.levantamentoMercado?.justificativaTecnica || '',
    justificativa_tecnica_economica: formData.levantamentoMercado?.justificativaEconomica || '',
    
    // --- Campos adicionais para o template ---
    fontes_levantamento_mercado: formData.levantamentoMercado?.fontes || '',
    justificativa_levantamento_mercado: formData.levantamentoMercado?.justificativa || '',
    restricoes_levantamento_mercado: formData.levantamentoMercado?.restricoes || '',
    justificativa_levantamento_mercado_fontes: formData.levantamentoMercado?.fontes || '',
    justificativa_levantamento_mercado_contratacao: formData.levantamentoMercado?.justificativa || '',
    justificativa_levantamento_mercado_contratacao_contratacao: formData.levantamentoMercado?.justificativa || '',
    
    // --- Dados Históricos ---
    dados_historicos_sim: toCheckbox(formData.levantamentoMercado?.dadosHistoricos),
    dados_historicos_nao: toCheckbox(!formData.levantamentoMercado?.dadosHistoricos),
    justificativa_dados_historicos: formData.levantamentoMercado?.justificativaDadosHistoricos || '',
    
    // --- Confirmação de Unidades e Quantidades ---
    confirmacao_unidades_quantidades_sim: toCheckbox(formData.confirmacaoUnidadesQuantidades),
    confirmacao_unidades_quantidades_nao: toCheckbox(!formData.confirmacaoUnidadesQuantidades),
    justificativa_unidades_quantidades: formData.justificativaUnidadesQuantidades || '',
    
    // --- Restrições de Mercado ---
    restricoes_mercado: formData.restricoesMercado || '',
    restricoes_mercado_detalhes: formData.restricoesMercado || '',
    
    tratamento_me_sim: toCheckbox(formData.levantamentoMercado?.tratamentoME),
    tratamento_me_nao: toCheckbox(!formData.levantamentoMercado?.tratamentoME),
    justificativa_tratamento_me: formData.levantamentoMercado?.justificativa || '',
    justificativa_tratamento_me_contratacao: formData.levantamentoMercado?.justificativa || '',
    justificativa_tratamento_me_contratacao_contratacao: formData.levantamentoMercado?.justificativa || '',
    restricao_fornecedores_sim: toCheckbox(formData.restricaoFornecedores),
    restricao_fornecedores_nao: toCheckbox(!formData.restricaoFornecedores),
    justificativa_restricao_fornecedores: formData.justificativaRestricaoFornecedores || '',
    justificativa_restricao_fornecedores_contratacao: formData.justificativaRestricaoFornecedores || '',
    justificativa_restricao_fornecedores_contratacao_contratacao: formData.justificativaRestricaoFornecedores || '',
    tratamento_diferenciado_simplificado_sim: toCheckbox(formData.tratamentoDiferenciado),
    tratamento_diferenciado_simplificado_nao: toCheckbox(!formData.tratamentoDiferenciado),
    tratamento_diferenciado_simplificado_justificativa: formData.justificativaTratamentoDiferenciado || '',
    justificativa_tratamento_diferenciado: formData.justificativaTratamentoDiferenciado || '',
    justificativa_tratamento_diferenciado_simplificado: formData.justificativaTratamentoDiferenciado || '',
    justificativa_tratamento_diferenciado_simplificado_contratacao: formData.justificativaTratamentoDiferenciado || '',
    justificativa_tratamento_diferenciado_simplificado_contratacao_contratacao: formData.justificativaTratamentoDiferenciado || '',

    // --- Estimativa de Valor (ETP) ---
    meios_pesquisa_valor_site_oficial: toCheckbox(formData.meiosPesquisa?.includes('sites')),
    meios_pesquisa_valor_contratacao_similar: toCheckbox(formData.meiosPesquisa?.includes('contratacoes')),
    meios_pesquisa_valor_tabela_aprovadas: toCheckbox(formData.meiosPesquisa?.includes('tabelas')),
    meios_pesquisa_valor_sitio_eletronico: toCheckbox(formData.meiosPesquisa?.includes('sitios')),
    meios_pesquisa_valor_fornecedor: toCheckbox(formData.meiosPesquisa?.includes('fornecedores')),
    meios_pesquisa_valor_outro: toCheckbox(formData.meiosPesquisa?.includes('outro')),
    meios_pesquisa_valor_espefico: formData.outrosMeiosPesquisa || '',
    justificativa_meios_pesquisa: formData.outrosMeiosPesquisa || '',
    justificativa_meios_pesquisa_contratacao: formData.outrosMeiosPesquisa || '',
    justificativa_meios_pesquisa_contratacao_contratacao: formData.outrosMeiosPesquisa || '',
    
    // --- Tratamento diferenciado ME/EPP ---
    tratamento_diferenciado_me_sim: toCheckbox(formData.tratamentoDiferenciadoME),
    tratamento_diferenciado_me_nao: toCheckbox(!formData.tratamentoDiferenciadoME),
    justificativa_tratamento_diferenciado_me: formData.justificativaTratamentoDiferenciado || '',
    tratamento_diferenciado_simplificado_sim: toCheckbox(formData.tratamentoDiferenciado),
    tratamento_diferenciado_simplificado_nao: toCheckbox(!formData.tratamentoDiferenciado),
    tratamento_diferenciado_simplificado_justificativa: formData.justificativaTratamentoDiferenciado || '',
    justificativa_tratamento_diferenciado: formData.justificativaTratamentoDiferenciado || '',
    justificativa_tratamento_diferenciado_simplificado: formData.justificativaTratamentoDiferenciado || '',
    justificativa_tratamento_diferenciado_simplificado_contratacao: formData.justificativaTratamentoDiferenciado || '',
    justificativa_tratamento_diferenciado_simplificado_contratacao_contratacao: formData.justificativaTratamentoDiferenciado || '',
    

    // --- Descrição da Solução (ETP) ---
    solucao_escolhida: formData.descricaoSolucao || '',
    descricao_solucao: formData.descricaoSolucao || '',
    descricao_detalhada_contratacao: formData.descricaoDetalhadaContratacao || '',
    justificativa_solucao: formData.descricaoSolucao || '',
    justificativa_solucao_contratacao: formData.descricaoSolucao || '',
    justificativa_solucao_contratacao_contratacao: formData.descricaoSolucao || '',
    prazo_garantia_nao_ha: toCheckbox(formData.prazoGarantiaDetalhado === 'nao_ha'),
    prazo_garantia_90_dias: toCheckbox(formData.prazoGarantiaDetalhado === '90_dias'),
    prazo_garantia_12_meses: toCheckbox(formData.prazoGarantiaDetalhado === '12_meses'),
    prazo_garantia_outro: toCheckbox(formData.prazoGarantiaDetalhado === 'outro'),
    prazo_garantia_dias: formData.garantiaPersonalizada?.tipo === 'dias' ? formData.garantiaPersonalizada.valor : '',
    prazo_garantia_meses: formData.garantiaPersonalizada?.tipo === 'meses' ? formData.garantiaPersonalizada.valor : '',
    prazo_garantia_anos: formData.garantiaPersonalizada?.tipo === 'anos' ? formData.garantiaPersonalizada.valor : '',
    justificativa_garantia: formData.justificativaGarantia || '',
    justificativa_garantia_contratacao: formData.justificativaGarantia || '',
    justificativa_garantia_contratacao_contratacao: formData.justificativaGarantia || '',
    necessidade_assistencia_tecnica_sim: toCheckbox(formData.assistenciaTecnica),
    necessidade_assistencia_tecnica_nao: toCheckbox(!formData.assistenciaTecnica),
    necessidade_assistencia_tecnica_justificativa: formData.justificativaAssistencia || '',
    justificativa_assistencia: formData.justificativaAssistencia || '',
    justificativa_assistencia_tecnica: formData.justificativaAssistencia || '',
    justificativa_assistencia_tecnica_necessidade: formData.justificativaAssistencia || '',
    justificativa_assistencia_tecnica_necessidade_contratacao: formData.justificativaAssistencia || '',
    justificativa_assistencia_tecnica_necessidade_contratacao_contratacao: formData.justificativaAssistencia || '',
    necessidade_manutencao_sim: toCheckbox(formData.manutencao),
    necessidade_manutencao_nao: toCheckbox(!formData.manutencao),
    necessidade_manutencao_justificativa: formData.justificativaManutencao || '',
    justificativa_manutencao: formData.justificativaManutencao || '',
    justificativa_manutencao_necessidade: formData.justificativaManutencao || '',
    justificativa_manutencao_necessidade_contratacao: formData.justificativaManutencao || '',
    justificativa_manutencao_necessidade_contratacao_contratacao: formData.justificativaManutencao || '',
    justificativa_manutencao_necessidade_contratacao_contratacao_contratacao: formData.justificativaManutencao || '',

    // --- Parcelamento e Pagamento (ETP) ---
    solucao_dividida_itens_sim: toCheckbox(formData.parcelamento),
    solucao_dividida_itens_nao: toCheckbox(!formData.parcelamento),
    // LÓGICA DE PREENCHIMENTO AUTOMÁTICO: Se não permite parcelamento, preenche justificativa automaticamente
    justificativa_nao_parcelamento: formData.parcelamento ? '' : (formData.justificativaNaoParcelamento || formData.justificativaParcelamento || 'Recursos disponíveis para pagamento à vista'),
    justificativa_parcelamento: formData.justificativaParcelamento || '',
    justificativa_parcelamento_solucao: formData.justificativaParcelamento || '',
    justificativa_parcelamento_solucao_contratacao: formData.justificativaParcelamento || '',
    justificativa_parcelamento_solucao_contratacao_contratacao: formData.justificativaParcelamento || '',
    
    // --- Pagamento Parcelado ---
    pagamento_parcelado_sim: toCheckbox(formData.pagamentoParcelado),
    pagamento_parcelado_nao: toCheckbox(!formData.pagamentoParcelado),
    justificativa_pagamento_parcelado: formData.justificativaPagamentoParcelado || '',
    
    // --- Benefícios Pretendidos (Mapeamento correto) ---
    beneficios_pretendidos_manutencao: toCheckbox(formData.beneficios?.includes('manutencao')),
    beneficios_pretendidos_reducao: toCheckbox(formData.beneficios?.includes('reducao')),
    beneficios_pretendidos_aproveitamento: toCheckbox(formData.beneficios?.includes('aproveitamento')),
    beneficios_pretendidos_reducao_riscos: toCheckbox(formData.beneficios?.includes('riscos')),
    beneficios_pretendidos_ganho_eficiente: toCheckbox(formData.beneficios?.includes('eficiencia')),
    beneficios_pretendidos_qualidade: toCheckbox(formData.beneficios?.includes('qualidade')),
    beneficios_pretendidos_politica_publica: toCheckbox(formData.beneficios?.includes('politica')),
    // LÓGICA DE PREENCHIMENTO AUTOMÁTICO: Se há explicação, marca automaticamente "outro"
    beneficios_pretendidos_outro: toCheckbox(hasText(formData.resultadosPretendidos?.notaExplicativa)),
    beneficios_pretendidos_beneficio: formData.outroBeneficio || '',
    // Mapeamento correto para o campo que existe no frontend
    beneficios_pretendidos_explicacao: formData.resultadosPretendidos?.notaExplicativa || '',
    beneficios_resultados_pretendidos: formData.resultadosPretendidos?.beneficios || '',
    nota_explicativa_resultados_pretendidos: formData.resultadosPretendidos?.notaExplicativa || '',
    justificativa_beneficios: formData.resultadosPretendidos?.notaExplicativa || '',
    justificativa_beneficios_pretendidos: formData.resultadosPretendidos?.notaExplicativa || '',
    justificativa_beneficios_pretendidos_contratacao: formData.resultadosPretendidos?.notaExplicativa || '',
    
    // --- Providências e Contratações (ETP) ---
    providencias_pendentes_sim: toCheckbox(hasText(formData.providenciasPrevias?.providencias)),
    providencias_pendentes_nao: toCheckbox(!hasText(formData.providenciasPrevias?.providencias)),
    providencias_pendentes_especificar: formData.providenciasPrevias?.providencias || '',
    // Mapeamento correto para os campos que existem no frontend
    requisitos_gestao_contratual: formData.providenciasPrevias?.requisitosGestao || '',
    requisitos_fiscalizacao: formData.providenciasPrevias?.requisitosFiscalizacao || '',
    // Campos adicionais para o template
    providencias_providencias_previas: formData.providenciasPrevias?.providencias || '',
    requisitos_gestao_providencias_previas: formData.providenciasPrevias?.requisitosGestao || '',
    requisitos_fiscalizacao_providencias_previas: formData.providenciasPrevias?.requisitosFiscalizacao || '',
    justificativa_providencias: formData.providenciasPrevias?.providencias || '',
    justificativa_providencias_contratacao: formData.providenciasPrevias?.providencias || '',
    contratacoes_correlatas_sim: toCheckbox(formData.contratacoesCorrelatas),
    contratacoes_correlatas_nao: toCheckbox(!formData.contratacoesCorrelatas),
    // Mapeamento correto para o campo que existe no frontend
    // LÓGICA DE PREENCHIMENTO AUTOMÁTICO: Se não há contratações correlatas, preenche justificativa automaticamente
    contratacoes_correlatas_justificativa: formData.contratacoesCorrelatas ? (formData.indicacaoContratacoesCorrelatas || '') : 'Não há contratações correlatas identificadas para este objeto',
    indicacao_contratacoes_correlatas: formData.indicacaoContratacoesCorrelatas || '',
    justificativa_correlatas: formData.indicacaoContratacoesCorrelatas || '',
    justificativa_contratacoes_correlatas: formData.indicacaoContratacoesCorrelatas || '',
    justificativa_contratacoes_correlatas_contratacao: formData.indicacaoContratacoesCorrelatas || '',
    
    // --- Impactos e Conclusão (ETP) ---
    impactos_ambientais_sim: toCheckbox(hasText(formData.especificacaoImpactosAmbientais)),
    impactos_ambientais_nao: toCheckbox(!hasText(formData.especificacaoImpactosAmbientais)),
    // LÓGICA DE PREENCHIMENTO AUTOMÁTICO: Se não há impactos ambientais, preenche justificativa automaticamente
    impactos_ambientais_impactos: formData.especificacaoImpactosAmbientais || 'Não há impactos ambientais significativos identificados para esta aquisição',
    especificacao_impactos_ambientais: formData.especificacaoImpactosAmbientais || 'Não há impactos ambientais significativos identificados para esta aquisição',
    justificativa_impactos: formData.especificacaoImpactosAmbientais || 'Não há impactos ambientais significativos identificados para esta aquisição',
    justificativa_impactos_ambientais: formData.especificacaoImpactosAmbientais || 'Não há impactos ambientais significativos identificados para esta aquisição',
    justificativa_impactos_ambientais_contratacao: formData.especificacaoImpactosAmbientais || 'Não há impactos ambientais significativos identificados para esta aquisição',
    
    // --- Posicionamento Conclusivo ---
    posicionamento_conclusivo: formData.posicionamentoConclusivo?.textoConclusivo || '',
    posicionamento_conclusivo_sim: toCheckbox(formData.posicionamentoConclusivo?.viabilidade),
    posicionamento_conclusivo_nao: toCheckbox(!formData.posicionamentoConclusivo?.viabilidade),
    // LÓGICA DE PREENCHIMENTO AUTOMÁTICO: Se não há texto conclusivo, preenche automaticamente
    texto_conclusivo: formData.posicionamentoConclusivo?.textoConclusivo || 'A aquisição é viável técnica e economicamente, atendendo às necessidades da administração e proporcionando benefícios significativos para a melhoria dos serviços prestados à população.',
    justificativa_posicionamento: formData.posicionamentoConclusivo?.textoConclusivo || 'A aquisição é viável técnica e economicamente, atendendo às necessidades da administração e proporcionando benefícios significativos para a melhoria dos serviços prestados à população.',
    justificativa_posicionamento_conclusivo: formData.posicionamentoConclusivo?.textoConclusivo || 'A aquisição é viável técnica e economicamente, atendendo às necessidades da administração e proporcionando benefícios significativos para a melhoria dos serviços prestados à população.',
    justificativa_posicionamento_conclusivo_contratacao: formData.posicionamentoConclusivo?.textoConclusivo || 'A aquisição é viável técnica e economicamente, atendendo às necessidades da administração e proporcionando benefícios significativos para a melhoria dos serviços prestados à população.',
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

      // Extrair dados do request body
      let formData = request.body.dados || request.body;
      
      // Se o body for uma string, tentar fazer parse
      if (typeof formData === 'string') {
        try {
          formData = JSON.parse(formData);
        } catch (parseError) {
          console.error('❌ Erro ao fazer parse do body:', parseError);
          return response.status(400).json({ error: 'Formato de dados inválido' });
        }
      }
      
      // Verificar se formData existe
      if (!formData) {
        console.error('❌ FormData não encontrado no request');
        return response.status(400).json({ error: 'Dados do formulário não fornecidos' });
      }
      
      console.log('📋 FormData recebido:', formData);
      
             // Validar campos obrigatórios - mas permitir que alguns venham do DFD
       const requiredFields = [
         'numeroSGD', 
         'numeroETP',
         'descricaoNecessidade',
         'valorEstimado',
         'confirmacaoUnidadesQuantidades',
         'tratamentoDiferenciadoME',
         'descricaoDetalhadaContratacao',
         'prazoGarantiaDetalhado',
         'assistenciaTecnica',
         'manutencao',
         'pagamentoParcelado'
       ];
       let missing = validateRequiredFields(formData, requiredFields);
       
       // Se há dados do DFD, verificar se eles preenchem os campos obrigatórios
       if (formData.dfdData && missing.length > 0) {
         console.log('📄 DFD detectado, verificando se preenche campos obrigatórios...');
         
         // Se o DFD não preencheu campos obrigatórios, não é erro - usuário deve preencher
         if (missing.length > 0) {
           console.log('ℹ️ DFD não preencheu todos os campos obrigatórios. Usuário deve complementar.');
           console.log('📝 Campos que precisam ser preenchidos manualmente:', missing);
           
           // Não retornar erro, apenas continuar com validação
           missing = [];
         }
       }
       
       // Se ainda há campos obrigatórios faltando (sem DFD), retornar erro
       if (missing.length > 0) {
         console.error('❌ Campos obrigatórios faltando:', missing);
         
         // Criar mensagem de erro mais detalhada
         const missingLabels = {
           numeroSGD: 'Número do SGD',
           numeroETP: 'Número do ETP',
           descricaoNecessidade: 'Descrição da Necessidade',
           valorEstimado: 'Valor Estimado',
           confirmacaoUnidadesQuantidades: 'Confirmação de Unidades e Quantidades',
           tratamentoDiferenciadoME: 'Tratamento Diferenciado para ME/EPP',
           descricaoDetalhadaContratacao: 'Descrição Detalhada da Contratação',
           prazoGarantiaDetalhado: 'Prazo de Garantia Contratual',
           assistenciaTecnica: 'Assistência Técnica Prevista',
           manutencao: 'Manutenção Planejada',
           pagamentoParcelado: 'Pagamento Parcelado'
         };
         
         const missingFieldLabels = missing.map(field => missingLabels[field] || field);
         
         return response.status(400).json({ 
           error: `Campos obrigatórios faltando: ${missingFieldLabels.join(', ')}`,
           missing: missing,
           message: 'Por favor, preencha os campos obrigatórios ou importe um DFD para preenchimento automático.'
         });
       }

      // Sanitizar dados
      if (formData.numeroSGD) formData.numeroSGD = sanitizeInput(formData.numeroSGD);
      if (formData.numeroETP) formData.numeroETP = sanitizeInput(formData.numeroETP);
      if (formData.descricaoNecessidade) formData.descricaoNecessidade = sanitizeInput(formData.descricaoNecessidade);

      console.log('\n Processando ETP (com IA)');
      console.log('Usuário:', decoded.email);
      console.log('SGD:', formData.numeroSGD);
      console.log('ETP:', formData.numeroETP);

      // 1. Ler prompt fixo
      const promptPath = path.join(process.cwd(), 'documentos', 'prompt.txt');
      let systemPrompt = '';
      if (fs.existsSync(promptPath)) {
        systemPrompt = fs.readFileSync(promptPath, 'utf8');
        console.log('📄 Prompt fixo carregado');
      } else {
        console.warn('⚠️ Prompt fixo não encontrado');
      }

      // 2. Buscar prompt personalizado do banco para ETP e adicionar ao prompt fixo
      try {
        const customPrompt = await db.Prompt.findOne({
          where: { 
            type: 'etp',
            isActive: true
          },
          order: [['updatedAt', 'DESC']]
        });
        
        if (customPrompt && customPrompt.content) {
          // Adicionar o prompt personalizado ao prompt fixo
          systemPrompt = systemPrompt + '\n\n--- INSTRUÇÕES PERSONALIZADAS PARA ETP ---\n' + customPrompt.content;
          console.log('✅ Prompt personalizado para ETP adicionado ao prompt fixo (ID:', customPrompt.id, ')');
        } else {
          console.log('📊 Usando apenas o prompt fixo - nenhum prompt personalizado para ETP encontrado');
        }
      } catch (dbError) {
        console.warn('⚠️ Erro ao buscar prompt ETP no banco:', dbError.message, '- usando apenas prompt fixo');
      }

      if (!systemPrompt.trim()) {
        console.error('❌ Nenhum prompt disponível');
        return response.status(500).json({ error: 'Prompt do sistema não encontrado' });
      }

             // 3. Processar com IA
       const baseData = createFallbackData(formData);
       let dadosProcessados = { ...baseData };
       let tokensUsados = 0;
       let modeloUsado = 'dados-formulario';
       let usouIA = false;
       
       // 4. Se há dados do DFD, processar com IA para extrair informações
       if (formData.dfdData) {
         console.log('📄 Dados do DFD detectados, processando com IA...');
         try {
           // Carregar prompt específico para DFD
           const dfdPromptPath = path.join(process.cwd(), 'documentos', 'prompt-dfd-import.txt');
           let dfdPrompt = '';
           if (fs.existsSync(dfdPromptPath)) {
             dfdPrompt = fs.readFileSync(dfdPromptPath, 'utf8');
             console.log('📄 Prompt específico para DFD carregado');
           } else {
             console.warn('⚠️ Prompt específico para DFD não encontrado, usando prompt genérico');
             dfdPrompt = `Analise este documento DFD e extraia as informações em formato JSON. Retorne APENAS o JSON válido.`;
           }
           
           // Adicionar o texto do DFD ao final do prompt
           const fullPrompt = `${dfdPrompt}\n\nTEXTO DO DOCUMENTO DFD:\n\n${formData.dfdData}`;
           
           // Enviar apenas o texto do documento como contexto
           const aiResult = await processFormDataWithAI({}, fullPrompt);
           if (aiResult.success) {
             const dfdInfo = aiResult.processedData;
             console.log('✅ Informações extraídas do DFD:', dfdInfo);
             
             // Mesclar informações do DFD com os dados do formulário
             dadosProcessados = { 
               ...baseData, 
               ...dfdInfo,
               // Mapear campos específicos do DFD para o template
               numero_sgd: dfdInfo.numeroSGD || formData.numeroSGD,
               numero_dfd: dfdInfo.numeroDFD || formData.numeroDFD,
               descricao_necessidade: dfdInfo.descricaoNecessidade || formData.descricaoNecessidade,
               descricao_justificativa: dfdInfo.descricaoNecessidade || formData.descricaoNecessidade,
               descricao_necessidade_contratacao: dfdInfo.descricaoNecessidade || formData.descricaoNecessidade,
               valor_estimado: dfdInfo.valorEstimado ? `R$ ${parseFloat(dfdInfo.valorEstimado).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : (formData.valorEstimado || ''),
               estimativa_valor: dfdInfo.valorEstimado ? `R$ ${parseFloat(dfdInfo.valorEstimado).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : (formData.valorEstimado || ''),
               classificacao_orcamentaria: dfdInfo.classificacaoOrcamentaria || formData.classificacaoOrcamentaria,
               fonte: dfdInfo.fonte || formData.fonte,
               elemento_despesa: dfdInfo.elementoDespesa || formData.elementoDespesa,
               
               // Checkbox para PCA
               pca_dfd_sim: dfdInfo.previsaoPCA ? 'x' : ' ',
               pca_dfd_nao: !dfdInfo.previsaoPCA ? 'x' : ' ',
               previsao_pca_etp_sim: dfdInfo.previsaoPCA ? 'x' : ' ',
               previsao_pca_etp_nao: !dfdInfo.previsaoPCA ? 'x' : ' ',
               previsao_pca_etp_justificativa: dfdInfo.justificativaPCA || (dfdInfo.previsaoPCA ? '' : 'Não há previsão no PCA para esta contratação'),
               
               // Checkbox para convênio
               recurso_convenio_sim: dfdInfo.recursoConvenio ? 'x' : ' ',
               recurso_convenio_nao: !dfdInfo.recursoConvenio ? 'x' : ' ',
               
               // Responsáveis
               fiscal_titular: dfdInfo.fiscalTitular || formData.fiscalTitular,
               fiscal_suplente: dfdInfo.fiscalSuplente || formData.fiscalSuplente,
               gestor_titular: dfdInfo.gestorTitular || formData.gestorTitular,
               gestor_suplente: dfdInfo.gestorSuplente || formData.gestorSuplente,
               
               // Demandante
               orgao_demandante: dfdInfo.demandante?.orgao || formData.demandante?.orgao,
               setor_demandante: dfdInfo.demandante?.setor || formData.demandante?.setor,
               funcao_demandante: dfdInfo.demandante?.cargo || formData.demandante?.cargo,
               nome_demandante: dfdInfo.demandante?.nome || formData.demandante?.nome,
               numero_funcional_demandante: dfdInfo.demandante?.numeroFuncional || formData.demandante?.numeroFuncional,
               
               // Responsável pelo planejamento
               nome_responsavel_planejamento: dfdInfo.responsavelPlanejamento?.nome || formData.responsavelPlanejamento?.nome,
               cargo_responsavel_planejamento: dfdInfo.responsavelPlanejamento?.cargo || formData.responsavelPlanejamento?.cargo,
               numero_funcional_responsavel_planejamento: dfdInfo.responsavelPlanejamento?.numeroFuncional || formData.responsavelPlanejamento?.numeroFuncional,
               resp_planej_orc_nome: dfdInfo.responsavelPlanejamento?.nome || formData.responsavelPlanejamento?.nome,
               resp_planej_orc_cargo: dfdInfo.responsavelPlanejamento?.cargo || formData.responsavelPlanejamento?.cargo,
               resp_planej_orc_funcional: dfdInfo.responsavelPlanejamento?.numeroFuncional || formData.responsavelPlanejamento?.numeroFuncional,
               
               // Itens e responsáveis da ação orçamentária
               itens: dfdInfo.itens && dfdInfo.itens.length > 0 ? dfdInfo.itens.map(item => ({
                 item: item.item || '',
                 qtd: item.quantidade || '',
                 unid: item.unidade || '',
                 codigo_siga_item: item.codigoSIGA || '',
                 especificacao_item: item.especificacao || ''
               })) : (formData.itens || []),
               
               responsaveis_acao_orcamentaria: dfdInfo.responsaveisAcaoOrcamentaria && dfdInfo.responsaveisAcaoOrcamentaria.length > 0 ? 
                 dfdInfo.responsaveisAcaoOrcamentaria.map(resp => ({
                   nome: resp.nome || '',
                   numero_funcional: resp.numeroFuncional || '',
                   acao: resp.acao || formData.acaoOrcamentariaNumero || 'N/A'
                 })) : (formData.responsaveisAcaoOrcamentaria || [])
             };
             
             tokensUsados = aiResult.usage?.total_tokens || 0;
             modeloUsado = aiResult.model || 'openai';
             usouIA = true;
             console.log(`✅ DFD processado com sucesso. Modelo: ${modeloUsado}, Tokens: ${tokensUsados}`);
           } else {
             console.error('❌ Erro no processamento do DFD:', aiResult.error);
           }
         } catch (error) {
           console.error('❌ Erro ao processar DFD:', error.message);
         }
       }

      try {
        console.log('🤖 Enviando para IA...');
        const aiResult = await processFormDataWithAI(formData, systemPrompt);
        if (aiResult.success) {
          dadosProcessados = { ...baseData, ...aiResult.processedData };
          tokensUsados = aiResult.usage?.total_tokens || 0;
          modeloUsado = aiResult.model || 'openai';
          usouIA = true;
          console.log(`✅ IA processou com sucesso. Modelo: ${modeloUsado}, Tokens: ${tokensUsados}`);
        } else {
          console.warn('⚠️ IA falhou:', aiResult.error, 'Usando dados do formulário');
          modeloUsado = 'fallback-formulario';
        }
      } catch (error) {
        console.error('❌ Erro na IA:', error.message, 'Usando dados do formulário');
        modeloUsado = 'fallback-erro';
      }

      // 4. Salvar no banco de dados
      const documento = await db.DocumentoGerado.create({
        tipo: 'ETP',
        numeroSGD: formData.numeroSGD,
        numeroDFD: null,
        numeroETP: formData.numeroETP,
        dadosProcessados: dadosProcessados,
        dadosOriginais: formData,
        status: 'processado',
        tokensGastos: tokensUsados,
        modeloIA: modeloUsado,
        criadoPor: decoded.userId,
        dataProcessamento: new Date(),
        ativo: true,
        downloadCount: 0
      });

      console.log('✅ ETP processado e salvo no banco (ID:', documento.id, ')');

             // Preparar resposta com dados processados pela IA
       const responseData = {
         success: true,
         message: `ETP processado com ${usouIA ? 'IA' : 'dados do formulário'}!`,
         documento: {
           id: documento.id,
           tipo: 'ETP',
           numeroSGD: formData.numeroSGD,
           numeroETP: formData.numeroETP,
           status: 'processado',
           dataProcessamento: documento.dataProcessamento
         },
         processamento: {
           usouIA: usouIA,
           tokensGastos: tokensUsados,
           modeloIA: modeloUsado
         }
       };
       
         // Se foi processado com IA e há dados do DFD, incluir os dados extraídos
         if (usouIA && formData.dfdData) {
           responseData.dadosProcessados = {
             numeroSGD: dadosProcessados.numero_sgd || formData.numeroSGD,
             numeroETP: dadosProcessados.numero_etp || formData.numeroETP,
             numeroDFD: dadosProcessados.numero_dfd || formData.numeroDFD || '',
             descricaoNecessidade: dadosProcessados.descricao_necessidade || '',
             valorEstimado: dadosProcessados.valor_estimado || '',
             classificacaoOrcamentaria: dadosProcessados.classificacao_orcamentaria || '',
             fonte: dadosProcessados.fonte || '',
             elementoDespesa: dadosProcessados.elemento_despesa || '',
             previsaoPCA: dadosProcessados.pca_dfd_sim === 'x',
             recursoConvenio: dadosProcessados.recurso_convenio_sim === 'x',
             fiscalTitular: dadosProcessados.fiscal_titular || '',
             fiscalSuplente: dadosProcessados.fiscal_suplente || '',
             gestorTitular: dadosProcessados.gestor_titular || '',
             gestorSuplente: dadosProcessados.gestor_suplente || '',
             demandante: {
               orgao: dadosProcessados.orgao_demandante || '',
               setor: dadosProcessados.setor_demandante || '',
               cargo: dadosProcessados.funcao_demandante || '',
               nome: dadosProcessados.nome_demandante || '',
               numeroFuncional: dadosProcessados.numero_funcional_demandante || ''
             },
             responsavelPlanejamento: {
               nome: dadosProcessados.nome_responsavel_planejamento || '',
               cargo: dadosProcessados.cargo_responsavel_planejamento || '',
               numeroFuncional: dadosProcessados.numero_funcional_responsavel_planejamento || ''
             },
             itens: dadosProcessados.itens || [],
             responsaveisAcaoOrcamentaria: dadosProcessados.responsaveis_acao_orcamentaria || []
           };
           
           console.log('📤 Dados processados sendo retornados:', responseData.dadosProcessados);
         }
       
       return response.status(200).json(responseData);

    } catch (error) {
      console.error('\n❌ Erro ao processar ETP:', error);
      return response.status(500).json({ 
        error: 'Erro interno do servidor', 
        details: error.message 
      });
    }
  });
}