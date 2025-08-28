const { verifyToken } = require('../../../lib/auth');
const { processFormDataWithAI } = require('../../../lib/openai-helper');
const { sanitizeInput, validateRequiredFields, rateLimit } = require('../../../lib/security');
const DocxTemplater = require('docxtemplater');
const PizZip = require('pizzip');
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
   vigencia_contrato_30_dias: toCheckbox(formData.vigencia === '30 dias'),
    vigencia_contrato_12_meses: toCheckbox(formData.vigencia === '12 meses'), // Marca a opção principal
    vigencia_contrato_5_anos: toCheckbox(formData.vigencia === '5 anos'),
    vigencia_contrato_indeterminado: toCheckbox(formData.vigencia === 'indeterminado'),
   
    vigencia_contrato_outro: toCheckbox(formData.vigencia === 'outro' || !!formData.vigenciaDias || !!formData.vigenciaMeses || !!formData.vigenciaAnos),
    vigencia_contrato_qtd_dias: formData.vigenciaDias || '',
    vigencia_contrato_qtd_meses: formData.vigenciaMeses || (formData.vigencia === '12 meses' ? '12' : ''),
    vigencia_contrato_qtd_anos: formData.vigenciaAnos || '',
    prorrogacao_contrato_sim: toCheckbox(formData.prorrogavel),
    prorrogacao_contrato_nao: toCheckbox(!formData.prorrogavel),
    prorrogacao_contrato_indeterminado: toCheckbox(formData.prazoIndeterminado),
    objeto_continuado_sim: toCheckbox(formData.servicoContinuado),
    objeto_continuado_nao: toCheckbox(!formData.servicoContinuado),
    objeto_continuado_justificativa: formData.justificativaServicoContinuado || '',
    criterios_sustentabilidade_sim: toCheckbox(hasText(formData.criteriosSustentabilidade)),
    criterios_sustentabilidade_nao: toCheckbox(!hasText(formData.criteriosSustentabilidade)),
    criterios_sustentabilidade_justificativa: formData.criteriosSustentabilidade || '',
    necessidade_treinamento_sim: toCheckbox(formData.necessidadeTreinamento),
    necessidade_treinamento_nao: toCheckbox(!formData.necessidadeTreinamento),
    bem_luxo_sim: toCheckbox(formData.bemLuxo),
    bem_luxo_nao: toCheckbox(!formData.bemLuxo),
    bem_luxo_justificativa: formData.justificativaBemLuxo || '',
    transicao_contratual_sim: toCheckbox(formData.transicaoContratual),
    transicao_contratual_nao: toCheckbox(!formData.transicaoContratual),
    transicao_contratual_numero: formData.numeroContratoTransicao || '',
    transicao_contratual_prazo: formData.prazoTransicao || '',
    normativos_especificos_sim: toCheckbox(hasText(formData.normativosTecnicos)),
    normativos_especificos_nao: toCheckbox(!hasText(formData.normativosTecnicos)),
    normativos_especificos_justificativa: formData.normativosTecnicos || '',
    local_entrega_servico: formData.localEntrega || '',
    amostra_prova_conceito_sim: toCheckbox(formData.amostraProvaConceito),
    amostra_prova_conceito_nao: toCheckbox(!formData.amostraProvaConceito),
    amostra_prova_conceito_justificativa: formData.justificativaAmostra || '',
    exigencia_marca_especifica_sim: toCheckbox(formData.marcaEspecifica),
    exigencia_marca_especifica_nao: toCheckbox(!formData.marcaEspecifica),
    exigencia_marca_especifica_justificativa: formData.justificativaMarca || '',
    permitida_subcontratacao_sim: toCheckbox(formData.subcontratacao),
    permitida_subcontratacao_nao: toCheckbox(!formData.subcontratacao),
    permitida_subcontratacao_limitado: formData.limitesSubcontratacao || '',

    // --- Estimativas de Quantidades (ETP) ---
    obtencao_quantitativo_contratos_anteriores: toCheckbox(formData.estimativasQuantidades?.metodo === 'anteriores'),
    obtencao_quantitativo_contratos_similares: toCheckbox(formData.estimativasQuantidades?.metodo === 'similares'),
    obtencao_quantitativo_outro: toCheckbox(formData.estimativasQuantidades?.metodo === 'outro'),
    obtencao_quantitativo_especifico: formData.estimativasQuantidades?.outroMetodo || '',
    quantidade_total_estimada: formData.estimativasQuantidades?.descricao || '',
    quantidade_item_exercicio: formData.serieHistorica?.exercicio || '',
    quantidade_item_pae: formData.serieHistorica?.pae || '',
    quantidade_item_descricao: formData.serieHistorica?.descricao || '',
    quantidade_item_un: formData.serieHistorica?.unidade || '',
    quantidade_item_qtd: formData.serieHistorica?.quantidadeConsumida || '',
    quantitativos_itens: formData.quantitativos || [],
    quantidade_item_quantitativos_desc: '',
    quantidade_item_quantitativos_qtd: '',

    // --- Levantamento de Mercado (ETP) ---
    pesquisa_solucoes_similares: toCheckbox(formData.levantamentoMercado?.fontes?.includes('similares')),
    pesquisa_solucoes_internet: toCheckbox(formData.levantamentoMercado?.fontes?.includes('internet')),
    pesquisa_solucoes_aud_publica: toCheckbox(formData.levantamentoMercado?.fontes?.includes('audiencia')),
    pesquisa_solucoes_outro: toCheckbox(formData.levantamentoMercado?.fontes?.includes('outro')),
    pesquisa_solucoes_justificativa: formData.levantamentoMercado?.outrasFontes || '',
    justificativa_tecnica_tecnica: formData.levantamentoMercado?.justificativaTecnica || '',
    justificativa_tecnica_economica: formData.levantamentoMercado?.justificativaEconomica || '',
    restricao_fornecedores_sim: toCheckbox(formData.restricaoFornecedores),
    restricao_fornecedores_nao: toCheckbox(!formData.restricaoFornecedores),
    tratamento_diferenciado_simplificado_sim: toCheckbox(formData.tratamentoDiferenciado),
    tratamento_diferenciado_simplificado_nao: toCheckbox(!formData.tratamentoDiferenciado),
    tratamento_diferenciado_simplificado_justificativa: formData.justificativaTratamentoDiferenciado || '',

    // --- Estimativa de Valor (ETP) ---
    meios_pesquisa_valor_site_oficial: toCheckbox(formData.meiosPesquisa?.includes('sites')),
    meios_pesquisa_valor_contratacao_similar: toCheckbox(formData.meiosPesquisa?.includes('contratacoes')),
    meios_pesquisa_valor_tabela_aprovadas: toCheckbox(formData.meiosPesquisa?.includes('tabelas')),
    meios_pesquisa_valor_sitio_eletronico: toCheckbox(formData.meiosPesquisa?.includes('sitios')),
    meios_pesquisa_valor_fornecedor: toCheckbox(formData.meiosPesquisa?.includes('fornecedores')),
    meios_pesquisa_valor_outro: toCheckbox(formData.meiosPesquisa?.includes('outro')),
    meios_pesquisa_valor_espefico: formData.outrosMeiosPesquisa || '',

    // --- Descrição da Solução (ETP) ---
    solucao_escolhida: formData.descricaoSolucao || '',
    prazo_garantia_nao_ha: toCheckbox(formData.prazoGarantia === 'nao_ha'),
    prazo_garantia_90_dias: toCheckbox(formData.prazoGarantia === '90_dias'),
    prazo_garantia_12_meses: toCheckbox(formData.prazoGarantia === '12_meses'),
    prazo_garantia_outro: toCheckbox(formData.prazoGarantia === 'outro'),
    prazo_garantia_dias: formData.garantiaPersonalizada?.tipo === 'dias' ? formData.garantiaPersonalizada.valor : '',
    prazo_garantia_meses: formData.garantiaPersonalizada?.tipo === 'meses' ? formData.garantiaPersonalizada.valor : '',
    prazo_garantia_anos: formData.garantiaPersonalizada?.tipo === 'anos' ? formData.garantiaPersonalizada.valor : '',
    necessidade_assistencia_tecnica_sim: toCheckbox(formData.assistenciaTecnica),
    necessidade_assistencia_tecnica_nao: toCheckbox(!formData.assistenciaTecnica),
    necessidade_assistencia_tecnica_justificativa: formData.justificativaAssistencia || '',
    necessidade_manutencao_sim: toCheckbox(formData.manutencao),
    necessidade_manutencao_nao: toCheckbox(!formData.manutencao),
    necessidade_manutencao_justificativa: formData.justificativaManutencao || '',

    // --- Parcelamento e Resultados (ETP) ---
    solucao_dividida_itens_sim: toCheckbox(formData.parcelamento),
    solucao_dividida_itens_nao: toCheckbox(!formData.parcelamento),
    justificativa_nao_parcelamento: formData.justificativaParcelamento || '',
    beneficios_pretendidos_manutencao: toCheckbox(formData.beneficios?.includes('manutencao')),
    beneficios_pretendidos_reducao: toCheckbox(formData.beneficios?.includes('reducao')),
    beneficios_pretendidos_aproveitamento: toCheckbox(formData.beneficios?.includes('aproveitamento')),
    beneficios_pretendidos_reducao_riscos: toCheckbox(formData.beneficios?.includes('riscos')),
    beneficios_pretendidos_ganho_eficiente: toCheckbox(formData.beneficios?.includes('eficiencia')),
    beneficios_pretendidos_qualidade: toCheckbox(formData.beneficios?.includes('qualidade')),
    beneficios_pretendidos_politica_publica: toCheckbox(formData.beneficios?.includes('politica')),
    beneficios_pretendidos_outro: toCheckbox(formData.beneficios?.includes('outro')),
    beneficios_pretendidos_beneficio: formData.outroBeneficio || '',
    beneficios_pretendidos_explicacao: formData.notaExplicativaBeneficios || '',
    
    // --- Providências e Contratações (ETP) ---
    providencias_pendentes_sim: toCheckbox(hasText(formData.providenciasPendentes)),
    providencias_pendentes_nao: toCheckbox(!hasText(formData.providenciasPendentes)),
    providencias_pendentes_especificar: formData.providenciasPendentes || '',
    requisitos_gestao_contratual: formData.requisitosGestao || '',
    requisitos_fiscalizacao: formData.requisitosFiscalizacao || '',
    contratacoes_correlatas_sim: toCheckbox(formData.contratacoesCorrelatas),
    contratacoes_correlatas_nao: toCheckbox(!formData.contratacoesCorrelatas),
    contratacoes_correlatas_justificativa: formData.justificativaCorrelatas || '',
    
    // --- Impactos e Conclusão (ETP) ---
    impactos_ambientais_sim: toCheckbox(hasText(formData.impactosAmbientais)),
    impactos_ambientais_nao: toCheckbox(!hasText(formData.impactosAmbientais)),
    impactos_ambientais_impactos: formData.impactosAmbientais || '',
    posicionamento_conclusivo: formData.posicionamentoConclusivo?.textoConclusivo || '',
    posicionamento_conclusivo_sim: toCheckbox(formData.posicionamentoConclusivo?.viabilidade),
    posicionamento_conclusivo_nao: toCheckbox(!formData.posicionamentoConclusivo?.viabilidade),
  };
}

async function generateDocument(tipo, data) {
  try {
    const templatePath = path.join(process.cwd(), 'documentos', `${tipo}.docx`);
    if (!fs.existsSync(templatePath)) {
      console.error(`Template não encontrado: ${templatePath}`);
      return { success: false, error: 'Template não encontrado' };
    }

    const content = fs.readFileSync(templatePath, 'binary');
    const zip = new PizZip(content);
    const doc = new DocxTemplater(zip, { paragraphLoop: true, linebreaks: true, nullGetter: () => "" });

    console.log(`\n--- Dados enviados para template ${tipo} ---`);
    console.log(JSON.stringify(data, null, 2));
    console.log('--- Fim dos dados ---\n');

    doc.render(data);
    const buf = doc.getZip().generate({ type: 'nodebuffer' });

    const now = new Date();
    const horas = now.getHours().toString().padStart(2, '0');
    const minutos = now.getMinutes().toString().padStart(2, '0');
    const segundos = now.getSeconds().toString().padStart(2, '0');
    const horario = `${horas}:${minutos}:${segundos}`;
    const fileName = `${tipo}_${horario}.docx`;
    const uploadDir = path.join(process.cwd(), 'documentos', 'gerados');
    
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    
    const filePath = path.join(uploadDir, fileName);
    fs.writeFileSync(filePath, buf);

    console.log(`${tipo} gerado:`, fileName);
    return { success: true, document: { fileName, filePath, size: buf.length, type: tipo } };
  } catch (error) {
    console.error(`Erro ao gerar ${tipo}:`, error.message);
    // Log detalhado do erro do docxtemplater
    if (error.properties && error.properties.errors) {
      error.properties.errors.forEach(err => console.error(err));
    }
    return { success: false, error: error.message };
  }
}

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Método não permitido' });
  }

  rateLimit(3, 300000)(request, response, async () => {
    try {
      const token = request.headers.authorization?.replace('Bearer ', '');
      if (!token) return response.status(401).json({ error: 'Token não fornecido' });
      const decoded = await verifyToken(token);
      if (!decoded) return response.status(403).json({ error: 'Token inválido' });

      const formData = request.body;
      
      const requiredFields = ['numeroSGD'];
      const missing = validateRequiredFields(formData, requiredFields);
      if (missing.length > 0) {
        return response.status(400).json({ 
          error: 'Campos obrigatórios faltando',
          missing: missing
        });
      }

      if (formData.numeroSGD) {
        formData.numeroSGD = sanitizeInput(formData.numeroSGD);
      }
      if (formData.numeroDFD) {
        formData.numeroDFD = sanitizeInput(formData.numeroDFD);
      }
      if (formData.numeroETP) {
        formData.numeroETP = sanitizeInput(formData.numeroETP);
      }
      if (formData.descricaoNecessidade) {
        formData.descricaoNecessidade = sanitizeInput(formData.descricaoNecessidade);
      }

      console.log('\nGeração de documentos iniciada');
      console.log('Usuário:', decoded.email);
      console.log('SGD:', formData.numeroSGD);
    
    // 1. Ler prompt fixo
    const promptPath = path.join(process.cwd(), 'documentos', 'prompt.txt');
    let systemPrompt = '';
    if (fs.existsSync(promptPath)) {
      systemPrompt = fs.readFileSync(promptPath, 'utf8');
      console.log('Prompt fixo carregado:', promptPath);
    } else {
      console.warn('Prompt fixo não encontrado:', promptPath);
    }

    // 2. BUSCAR PROMPT PERSONALIZADO DO BANCO (se existir)
    try {
      const customPrompt = await db.Prompt.findOne({
        where: { 
          ativo: true,
          tipo: 'sistema' // ou o tipo que você usar
        },
        order: [['updatedAt', 'DESC']] // Pega o mais recente
      });
      
      if (customPrompt && customPrompt.conteudo) {
        // Combinar: prompt fixo + prompt do banco
        systemPrompt = systemPrompt + '\n\n--- INSTRUÇÕES PERSONALIZADAS ---\n' + customPrompt.conteudo;
        console.log('✅ Prompt personalizado adicionado do banco de dados (ID:', customPrompt.id, ')');
      } else {
        console.log('📊 Nenhum prompt personalizado ativo encontrado no banco');
      }
    } catch (dbError) {
      console.warn('⚠️ Erro ao buscar prompt no banco:', dbError.message);
      // Continua com o prompt fixo apenas
    }

    if (!systemPrompt.trim()) {
      console.error('❌ Nenhum prompt disponível (nem fixo nem do banco)');
      return response.status(500).json({ error: 'Prompt do sistema não encontrado' });
    }

    // 3. PROCESSAMENTO CONFORME TIPO DE DOCUMENTO
    console.log('📝 Preparando geração de documentos...');
    
    // Base de dados sempre criada a partir do formulário
    const baseData = createFallbackData(formData);
    
    // Para DFD: usar apenas dados do formulário (sem IA)
    let dfdData = baseData;
    
    // Para ETP: usar IA se disponível, senão fallback
    let etpData = { ...baseData }; // Começa com base
    let tokensUsados = 0;
    let modeloUsado = 'dados-formulario';
    
    // Processar ETP com IA apenas se for gerar ETP
    if (formData.numeroETP) {
      console.log('🤖 Processando ETP com IA...');
      try {
        const aiResult = await processFormDataWithAI(formData, systemPrompt);
        if (aiResult.success) {
          etpData = { ...baseData, ...aiResult.processedData }; // Mescla IA com base
          tokensUsados = aiResult.usage?.total_tokens || 0;
          modeloUsado = aiResult.model || 'openai';
          console.log(`✅ IA processou ETP com sucesso. Modelo: ${modeloUsado}, Tokens: ${tokensUsados}`);
        } else {
          console.warn('⚠️ IA falhou para ETP:', aiResult.error, 'Usando dados do formulário.');
          modeloUsado = 'fallback-formulario';
        }
      } catch (error) {
        console.error('❌ Erro crítico na IA para ETP:', error.message, 'Usando dados do formulário.');
        modeloUsado = 'fallback-erro';
      }
    }

    // 4. GERAR DOCUMENTOS COM DADOS ESPECÍFICOS
    const generatedDocs = [];
    const errors = [];

    // Gerar DFD (SEM IA - apenas dados do formulário)
    if (formData.numeroDFD) {
      console.log('📋 Gerando documento DFD (sem IA)...');
      const dfdResult = await generateDocument('DFD', dfdData);
      if (dfdResult.success) {
        try {
          // Salvar no banco de dados
          const documento = await db.DocumentoGerado.create({
            nomeArquivo: dfdResult.document.fileName,
            tipo: 'DFD',
            numeroSGD: formData.numeroSGD,
            numeroDFD: formData.numeroDFD,
            numeroETP: null,
            caminhoArquivo: dfdResult.document.filePath,
            tamanhoArquivo: dfdResult.document.size,
            tokensGastos: 0, // DFD não usa tokens
            modeloIA: 'sem-ia-formulario',
            criadoPor: decoded.userId,
            dataGeracao: new Date(),
            ativo: true,
            downloadCount: 0
          });
          
          generatedDocs.push({
            id: documento.id,
            type: 'DFD',
            fileName: dfdResult.document.fileName,
            size: dfdResult.document.size
          });
          console.log('✅ DFD gerado com sucesso (sem IA)');
        } catch (dbError) {
          console.error('❌ Erro ao salvar DFD no banco:', dbError.message);
          errors.push({ type: 'DFD', error: 'Documento gerado mas não salvo no banco' });
        }
      } else {
        errors.push({ type: 'DFD', error: dfdResult.error });
      }
    }

    // Gerar ETP (COM IA quando possível)
    if (formData.numeroETP) {
      console.log('🔍 Gerando documento ETP (com IA)...');
      const etpResult = await generateDocument('ETP', etpData);
      if (etpResult.success) {
        try {
          // Salvar no banco de dados
          const documento = await db.DocumentoGerado.create({
            nomeArquivo: etpResult.document.fileName,
            tipo: 'ETP',
            numeroSGD: formData.numeroSGD,
            numeroDFD: null,
            numeroETP: formData.numeroETP,
            caminhoArquivo: etpResult.document.filePath,
            tamanhoArquivo: etpResult.document.size,
            tokensGastos: tokensUsados, // ETP pode usar tokens da IA
            modeloIA: modeloUsado,
            criadoPor: decoded.userId,
            dataGeracao: new Date(),
            ativo: true,
            downloadCount: 0
          });
          
          generatedDocs.push({
            id: documento.id,
            type: 'ETP',
            fileName: etpResult.document.fileName,
            size: etpResult.document.size
          });
          console.log('✅ ETP gerado com sucesso (com IA)');
        } catch (dbError) {
          console.error('❌ Erro ao salvar ETP no banco:', dbError.message);
          errors.push({ type: 'ETP', error: 'Documento gerado mas não salvo no banco' });
        }
      } else {
        errors.push({ type: 'ETP', error: etpResult.error });
      }
    }
    
    console.log('✅ Processo de geração finalizado!');
    console.log('📋 DFD: gerado sem IA (apenas formulário)');
    console.log('🔍 ETP: gerado com IA (quando possível)');
    console.log('📄 Documentos gerados:', generatedDocs.length);
    console.log('⚠️ Erros encontrados:', errors.length);
    
    // Determinar mensagem baseada no tipo de processamento
    let mensagemProcessamento = '';
    if (formData.numeroDFD && formData.numeroETP) {
      mensagemProcessamento = `DFD gerado com dados do formulário. ETP gerado com ${modeloUsado.includes('openai') ? 'IA' : 'dados do formulário'}.`;
    } else if (formData.numeroDFD) {
      mensagemProcessamento = 'DFD gerado com dados do formulário (sem IA).';
    } else if (formData.numeroETP) {
      mensagemProcessamento = `ETP gerado com ${modeloUsado.includes('openai') ? 'IA' : 'dados do formulário'}.`;
    }
    
    return response.status(200).json({
      success: true,
      message: 'Documentos processados!',
      documentsGenerated: generatedDocs,
      errors,
      resumo: {
        numeroSGD: formData.numeroSGD,
        documentosGerados: generatedDocs.length,
        tokensUsados,
        modeloUsado,
        processamento: mensagemProcessamento
      },
      modeloUsado,
      tokensUsados
    });

  } catch (error) {
    console.error('\nErro geral na API /gerar:', error);
    return response.status(500).json({ error: 'Erro interno do servidor', details: error.message });
  }
  });
}