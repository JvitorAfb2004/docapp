import { NextApiRequest, NextApiResponse } from 'next';
import { verifyToken } from '../../../lib/auth';
import fs from 'fs';
import path from 'path';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    // Verificar autenticação
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Token não fornecido' });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ error: 'Token inválido' });
    }

    const { resumoDFD, blocos, numeroETP, dataAtual } = req.body;

    if (!resumoDFD || !blocos || !Array.isArray(blocos)) {
      return res.status(400).json({ error: 'Dados do DFD e blocos são obrigatórios' });
    }

    // Usar resumoDFD como dfdResumo para compatibilidade
    const dfdResumo = resumoDFD;
    const blocosGerados = blocos;

    console.log('📄 Gerando ETP final...');

    // Carregar template ETP.docx
    const templatePath = path.join(process.cwd(), 'documentos', 'ETP.docx');
    const templateBuffer = fs.readFileSync(templatePath);

    // Preparar dados para o template
    const dadosTemplate = {
      // Dados básicos do DFD
      numero_etp: numeroETP || dfdResumo.numero_etp || 'A definir',
      numero_sgd: dfdResumo.numero_sgd || 'A definir',
      numero_dfd: dfdResumo.numero_dfd || 'A definir',
      orgao: dfdResumo.orgao || 'A definir',
      tipo_objeto: dfdResumo.tipo_objeto || 'A definir',
      descricao_objeto: dfdResumo.descricao_objeto || 'A definir',
      valor_estimado: dfdResumo.valor_estimado || 'A definir',
      classificacao_orcamentaria: dfdResumo.classificacao_orcamentaria || 'A definir',
      fonte: dfdResumo.fonte || 'A definir',
      elemento_despesa: dfdResumo.elemento_despesa || 'A definir',
      
      // Responsáveis
      fiscal_titular: dfdResumo.fiscal_titular || 'A definir',
      fiscal_suplente: dfdResumo.fiscal_suplente || 'A definir',
      gestor_titular: dfdResumo.gestor_titular || 'A definir',
      gestor_suplente: dfdResumo.gestor_suplente || 'A definir',
      demandante_nome: dfdResumo.demandante_nome || 'A definir',
      demandante_cargo: dfdResumo.demandante_cargo || 'A definir',
      demandante_setor: dfdResumo.demandante_setor || 'A definir',
      
      // Data e local
      data_atual: dfdResumo.data_atual || new Date().toLocaleDateString('pt-BR'),
      ano_atual: dfdResumo.ano_atual || new Date().getFullYear().toString(),
      local: dfdResumo.local || 'Palmas – TO',
      
      // Campos obrigatórios que estavam undefined
      descricao_necessidade: dfdResumo.descricao_objeto || 'Necessidade não especificada no DFD',
      previsao_pca_etp_sim: 'x',
      previsao_pca_etp_nao: ' ',
      previsao_pca_etp_justificativa: 'A contratação está prevista no Plano de Contratações Anual conforme planejamento estratégico institucional',
      objeto_continuado_justificativa: 'O serviço de manutenção de piscina requer continuidade para garantir a qualidade sanitária da água e funcionamento adequado das instalações',
      bem_luxo_justificativa: 'O objeto não se caracteriza como bem de luxo, sendo equipamento essencial para as atividades do órgão',
      transicao_contratual_numero: ' ',
      transicao_contratual_prazo: ' ',
      amostra_prova_conceito_justificativa: 'Amostra necessária para verificar a qualidade dos produtos químicos e eficácia do tratamento',
      exigencia_marca_especifica_justificativa: 'Marca específica exigida para garantir compatibilidade com equipamentos existentes e padronização',
      pesquisa_solucoes_justificativa: 'Pesquisa realizada em bases de dados governamentais e consulta a fornecedores especializados',
      tratamento_diferenciado_simplificado_justificativa: 'Aplicação do tratamento diferenciado conforme Lei Complementar 123/2006 para estimular participação de ME/EPP',
      meios_pesquisa_valor_espefico: 'Pesquisa realizada em bases de dados governamentais, consulta a fornecedores e análise de contratações similares',
      estimativa_valor: dfdResumo.valor_estimado || 'Valor a ser definido',
      prazo_garantia_dias: ' ',
      prazo_garantia_meses: ' ',
      prazo_garantia_anos: ' ',
      justificativa_nao_parcelamento: 'O serviço deve ser executado de forma integrada para garantir eficácia do tratamento e manutenção da qualidade da água',
      impactos_ambientais_sim: ' ',
      impactos_ambientais_nao: 'x',
      impactos_ambientais_impactos: ' ',
      posicionamento_conclusivo: 'A contratação apresenta viabilidade técnica, econômica e ambiental, atendendo adequadamente à necessidade identificada e contribuindo para o cumprimento dos objetivos institucionais',
      
      // Conteúdo dos blocos
      bloco1_conteudo: dfdResumo.bloco1_conteudo || 'A definir',
      bloco2_conteudo: dfdResumo.bloco2_conteudo || 'A definir',
      bloco3_conteudo: dfdResumo.bloco3_conteudo || 'A definir',
      bloco4_conteudo: dfdResumo.bloco4_conteudo || 'A definir',
      bloco5_conteudo: dfdResumo.bloco5_conteudo || 'A definir',
      bloco6_conteudo: dfdResumo.bloco6_conteudo || 'A definir',
      bloco7_conteudo: dfdResumo.bloco7_conteudo || 'A definir',
      
      // Campos de natureza da contratação
      natureza_continuada: ' ',
      natureza_com_monopolio: ' ',
      natureza_sem_monopolio: 'x',
      natureza_nao_continuada: ' ',
      
      // Campos de vigência
      vigencia_contrato_30_dias: ' ',
      vigencia_contrato_12_meses: 'x',
      vigencia_contrato_5_anos: ' ',
      vigencia_contrato_indeterminado: ' ',
      
      // Campos de prorrogação
      prorrogacao_contrato_sim: ' ',
      prorrogacao_contrato_nao: 'x',
      prorrogacao_contratual_indeterminado: ' ',
      
      // Campos de objeto continuado
      objeto_continuado_sim: 'x',
      objeto_continuado_nao: ' ',
      
      // Campos de sim/não - mapear para 'x' ou ' '
      criterios_sustentabilidade_sim: dfdResumo.criterios_sustentabilidade_sim || ' ',
      criterios_sustentabilidade_nao: dfdResumo.criterios_sustentabilidade_nao || ' ',
      criterios_sustentabilidade_justificativa: dfdResumo.criterios_sustentabilidade_justificativa || ' ',
      
      normativos_especificos_sim: dfdResumo.normativos_especificos_sim || ' ',
      normativos_especificos_nao: dfdResumo.normativos_especificos_nao || ' ',
      normativos_especificos_justificativa: dfdResumo.normativos_especificos_justificativa || ' ',
      
      necessidade_treinamento_sim: dfdResumo.necessidade_treinamento_sim || ' ',
      necessidade_treinamento_nao: dfdResumo.necessidade_treinamento_nao || ' ',
      
      bem_luxo_sim: dfdResumo.bem_luxo_sim || ' ',
      bem_luxo_nao: dfdResumo.bem_luxo_nao || ' ',
      
      transicao_contratual_sim: dfdResumo.transicao_contratual_sim || ' ',
      transicao_contratual_nao: dfdResumo.transicao_contratual_nao || ' ',
      
      amostra_prova_conceito_sim: dfdResumo.amostra_prova_conceito_sim || ' ',
      amostra_prova_conceito_nao: dfdResumo.amostra_prova_conceito_nao || ' ',
      
      exigencia_marca_especifica_sim: dfdResumo.exigencia_marca_especifica_sim || ' ',
      exigencia_marca_especifica_nao: dfdResumo.exigencia_marca_especifica_nao || ' ',
      
      permitida_subcontratacao_sim: dfdResumo.permitida_subcontratacao_sim || ' ',
      permitida_subcontratacao_nao: dfdResumo.permitida_subcontratacao_nao || ' ',
      
      solucao_dividida_itens_sim: dfdResumo.solucao_dividida_itens_sim || ' ',
      solucao_dividida_itens_nao: dfdResumo.solucao_dividida_itens_nao || 'x',
      
      posicionamento_conclusivo_sim: dfdResumo.posicionamento_conclusivo_sim || ' ',
      posicionamento_conclusivo_nao: dfdResumo.posicionamento_conclusivo_nao || ' ',
      
      // Campos de pesquisa de soluções
      pesquisa_solucoes_similares: ' ',
      pesquisa_solucoes_internet: ' ',
      pesquisa_solucoes_aud_publica: ' ',
      pesquisa_solucoes_outro: 'x',
      
      // Campos de meios de pesquisa de valor
      meios_pesquisa_valor_site_oficial: ' ',
      meios_pesquisa_valor_contratacao_similar: ' ',
      meios_pesquisa_valor_tabela_aprovadas: ' ',
      meios_pesquisa_valor_sitio_eletronico: ' ',
      meios_pesquisa_valor_fornecedor: ' ',
      meios_pesquisa_valor_outro: 'x',
      
      // Campos de obtenção de quantitativo
      obtencao_quantitativo_contratos_anteriores: ' ',
      obtencao_quantitativo_contratos_similares: ' ',
      obtencao_quantitativo_outro: 'x',
      
      // Campos de prazo de garantia
      prazo_garantia_nao_ha: ' ',
      prazo_garantia_90_dias: ' ',
      prazo_garantia_12_meses: ' ',
      prazo_garantia_outro: 'x',
      
      // Campos de benefícios pretendidos
      beneficios_pretendidos_manutencao: ' ',
      beneficios_pretendidos_reducao: ' ',
      beneficios_pretendidos_aproveitamento: ' ',
      beneficios_pretendidos_ganho_eficiente: ' ',
      beneficios_pretendidos_qualidade: ' ',
      beneficios_pretendidos_politica_publica: ' ',
      beneficios_pretendidos_outro: 'x'
    };

    // Adicionar arrays de itens e responsáveis
    if (dfdResumo.itens && Array.isArray(dfdResumo.itens)) {
      dadosTemplate.itens = dfdResumo.itens;
      
      // Adicionar campos específicos dos quantitativos
      if (dfdResumo.itens.length > 0) {
        const primeiroItem = dfdResumo.itens[0];
        dadosTemplate.quantidade_item_exercicio = new Date().getFullYear().toString();
        dadosTemplate.quantidade_item_pae = dfdResumo.numero_sgd || ' ';
        dadosTemplate.quantidade_item_descricao = primeiroItem.especificacao_item || ' ';
        dadosTemplate.quantidade_item_un = primeiroItem.unid || ' ';
        dadosTemplate.quantidade_item_qtd = primeiroItem.qtd || ' ';
        
        // Criar array de quantitativos para a tabela
        dadosTemplate.quantitativos_itens = dfdResumo.itens.map(item => ({
          item: item.item || '1',
          descricao: item.especificacao_item || ' ',
          unidade: item.unid || ' ',
          quantidade: item.qtd || ' '
        }));
      }
    } else {
      dadosTemplate.itens = [];
      dadosTemplate.quantitativos_itens = [];
      dadosTemplate.quantidade_item_exercicio = new Date().getFullYear().toString();
      dadosTemplate.quantidade_item_pae = ' ';
      dadosTemplate.quantidade_item_descricao = ' ';
      dadosTemplate.quantidade_item_un = ' ';
      dadosTemplate.quantidade_item_qtd = ' ';
    }

    if (dfdResumo.responsaveis_acao_orcamentaria && Array.isArray(dfdResumo.responsaveis_acao_orcamentaria)) {
      dadosTemplate.responsaveis_acao_orcamentaria = dfdResumo.responsaveis_acao_orcamentaria;
    } else {
      dadosTemplate.responsaveis_acao_orcamentaria = [];
    }

    // Mapear conteúdo dos blocos para as variáveis específicas do template
    blocosGerados.forEach((bloco, index) => {
      if (bloco && bloco.dados) {
        // Mapear cada bloco para as variáveis específicas do template
        switch(bloco.id) {
          case 1: // Características Contratuais Fundamentais
            if (bloco.dados.tipoObjeto) {
              dadosTemplate.tipo_objeto_servico = bloco.dados.tipoObjeto === 'Serviço' ? 'x' : ' ';
              dadosTemplate.tipo_objeto_bem = bloco.dados.tipoObjeto === 'Bem' ? 'x' : ' ';
            }
            if (bloco.dados.vigenciaContrato) {
              // Se tem texto de vigência, marca "Outro" e preenche uma sub-opção
              dadosTemplate.vigencia_contrato_outro = 'x';
              dadosTemplate.vigencia_contrato_qtd_dias = ' ';
              dadosTemplate.vigencia_contrato_qtd_meses = '12';
              dadosTemplate.vigencia_contrato_qtd_anos = ' ';
            } else {
              // Se não tem texto específico, marca uma opção padrão
              dadosTemplate.vigencia_contrato_12_meses = 'x';
              dadosTemplate.vigencia_contrato_outro = ' ';
              dadosTemplate.vigencia_contrato_qtd_dias = ' ';
              dadosTemplate.vigencia_contrato_qtd_meses = ' ';
              dadosTemplate.vigencia_contrato_qtd_anos = ' ';
            }
            if (bloco.dados.prorrogacao) {
              dadosTemplate.prorrogacao_contrato_sim = bloco.dados.prorrogacao.includes('Sim') ? 'x' : ' ';
              dadosTemplate.prorrogacao_contrato_nao = bloco.dados.prorrogacao.includes('Não') ? 'x' : ' ';
            }
            if (bloco.dados.fornecimentoContinuado) {
              dadosTemplate.objeto_continuado_sim = bloco.dados.fornecimentoContinuado.includes('Sim') ? 'x' : ' ';
              dadosTemplate.objeto_continuado_nao = bloco.dados.fornecimentoContinuado.includes('Não') ? 'x' : ' ';
            }
            // Se tem justificativa de objeto continuado, marca automaticamente "Sim"
            if (dadosTemplate.objeto_continuado_justificativa && dadosTemplate.objeto_continuado_justificativa.trim() !== '') {
              dadosTemplate.objeto_continuado_sim = 'x';
              dadosTemplate.objeto_continuado_nao = ' ';
            }
            if (bloco.dados.enderecoCompleto) {
              dadosTemplate.local_entrega_servico = bloco.dados.enderecoCompleto;
            }
            if (bloco.dados.protocoloPNCP) {
              dadosTemplate.protocolo_pncp = bloco.dados.protocoloPNCP;
            }
            break;
            
          case 2: // Requisitos Técnicos e Regulamentares
            if (bloco.dados.sustentabilidade) {
              dadosTemplate.criterios_sustentabilidade_sim = bloco.dados.sustentabilidade !== 'Não informado no DFD' ? 'x' : ' ';
              dadosTemplate.criterios_sustentabilidade_nao = bloco.dados.sustentabilidade === 'Não informado no DFD' ? 'x' : ' ';
              dadosTemplate.criterios_sustentabilidade_justificativa = bloco.dados.sustentabilidade;
            }
            if (bloco.dados.treinamento) {
              dadosTemplate.necessidade_treinamento_sim = bloco.dados.treinamento !== 'Não informado no DFD' ? 'x' : ' ';
              dadosTemplate.necessidade_treinamento_nao = bloco.dados.treinamento === 'Não informado no DFD' ? 'x' : ' ';
            }
            if (bloco.dados.bemLuxo) {
              dadosTemplate.bem_luxo_sim = bloco.dados.bemLuxo !== 'Não informado no DFD' ? 'x' : ' ';
              dadosTemplate.bem_luxo_nao = bloco.dados.bemLuxo === 'Não informado no DFD' ? 'x' : ' ';
            }
            if (bloco.dados.normativosEspecificos) {
              dadosTemplate.normativos_especificos_sim = bloco.dados.normativosEspecificos !== 'Não informado no DFD' ? 'x' : ' ';
              dadosTemplate.normativos_especificos_nao = bloco.dados.normativosEspecificos === 'Não informado no DFD' ? 'x' : ' ';
              dadosTemplate.normativos_especificos_justificativa = bloco.dados.normativosEspecificos;
            }
            if (bloco.dados.amostra) {
              dadosTemplate.amostra_prova_conceito_sim = bloco.dados.amostra !== 'Não informado no DFD' ? 'x' : ' ';
              dadosTemplate.amostra_prova_conceito_nao = bloco.dados.amostra === 'Não informado no DFD' ? 'x' : ' ';
              dadosTemplate.amostra_prova_conceito_justificativa = bloco.dados.amostra;
            }
            if (bloco.dados.marcaEspecifica) {
              dadosTemplate.exigencia_marca_especifica_sim = bloco.dados.marcaEspecifica !== 'Não informado no DFD' ? 'x' : ' ';
              dadosTemplate.exigencia_marca_especifica_nao = bloco.dados.marcaEspecifica === 'Não informado no DFD' ? 'x' : ' ';
              dadosTemplate.exigencia_marca_especifica_justificativa = bloco.dados.marcaEspecifica;
            }
            if (bloco.dados.subcontratacao) {
              dadosTemplate.permitida_subcontratacao_sim = bloco.dados.subcontratacao !== 'Não informado no DFD' ? 'x' : ' ';
              dadosTemplate.permitida_subcontratacao_nao = bloco.dados.subcontratacao === 'Não informado no DFD' ? 'x' : ' ';
            }
            break;
            
          case 3: // Dimensionamento Quantitativo
            if (bloco.dados.metodologiaQuantitativo) {
              dadosTemplate.obtencao_quantitativo_outro = 'x';
              dadosTemplate.obtencao_quantitativo_especifico = bloco.dados.metodologiaQuantitativo;
            }
            if (bloco.dados.descricaoDetalhada) {
              dadosTemplate.quantidade_total_estimada = bloco.dados.descricaoDetalhada;
            }
            if (bloco.dados.serieHistorica) {
              dadosTemplate.quantidade_item_descricao = bloco.dados.serieHistorica;
            }
            break;
            
          case 4: // Análise de Mercado e Viabilidade
            if (bloco.dados.fontesPesquisa) {
              dadosTemplate.pesquisa_solucoes_outro = 'x';
              dadosTemplate.pesquisa_solucoes_justificativa = bloco.dados.fontesPesquisa;
            }
            if (bloco.dados.justificativaTecnica) {
              dadosTemplate.justificativa_tecnica_tecnica = bloco.dados.justificativaTecnica;
            }
            if (bloco.dados.justificativaEconomica) {
              dadosTemplate.justificativa_tecnica_economica = bloco.dados.justificativaEconomica;
            }
            if (bloco.dados.restricoesMercado) {
              dadosTemplate.restricao_fornecedores_sim = bloco.dados.restricoesMercado !== 'Não informado no DFD' ? 'x' : ' ';
              dadosTemplate.restricao_fornecedores_nao = bloco.dados.restricoesMercado === 'Não informado no DFD' ? 'x' : ' ';
            }
            if (bloco.dados.tratamentoMEEPP) {
              dadosTemplate.tratamento_diferenciado_simplificado_sim = bloco.dados.tratamentoMEEPP !== 'Não informado no DFD' ? 'x' : ' ';
              dadosTemplate.tratamento_diferenciado_simplificado_nao = bloco.dados.tratamentoMEEPP === 'Não informado no DFD' ? 'x' : ' ';
              dadosTemplate.tratamento_diferenciado_simplificado_justificativa = bloco.dados.tratamentoMEEPP;
            }
            break;
            
          case 5: // Solução Técnica Detalhada
            if (bloco.dados.pesquisaPrecos) {
              dadosTemplate.meios_pesquisa_valor_outro = 'x';
              dadosTemplate.meios_pesquisa_valor_espefico = bloco.dados.pesquisaPrecos;
            }
            if (bloco.dados.descricaoCompleta) {
              dadosTemplate.solucao_escolhida = bloco.dados.descricaoCompleta;
            }
            if (bloco.dados.garantia) {
              dadosTemplate.prazo_garantia_12_meses = ' ';
              dadosTemplate.prazo_garantia_outro = 'x';
              dadosTemplate.prazo_garantia_dias = ' ';
              dadosTemplate.prazo_garantia_meses = '3';
              dadosTemplate.prazo_garantia_anos = ' ';
            }
            if (bloco.dados.assistenciaTecnica) {
              dadosTemplate.necessidade_assistencia_tecnica_sim = bloco.dados.assistenciaTecnica !== 'Não informado no DFD' ? 'x' : ' ';
              dadosTemplate.necessidade_assistencia_tecnica_nao = bloco.dados.assistenciaTecnica === 'Não informado no DFD' ? 'x' : ' ';
              dadosTemplate.necessidade_assistencia_tecnica_justificativa = bloco.dados.assistenciaTecnica;
            }
            if (bloco.dados.manutencao) {
              dadosTemplate.necessidade_manutencao_sim = bloco.dados.manutencao !== 'Não informado no DFD' ? 'x' : ' ';
              dadosTemplate.necessidade_manutencao_nao = bloco.dados.manutencao === 'Não informado no DFD' ? 'x' : ' ';
              dadosTemplate.necessidade_manutencao_justificativa = bloco.dados.manutencao;
            }
            if (bloco.dados.parcelamento) {
              dadosTemplate.solucao_dividida_itens_sim = bloco.dados.parcelamento.includes('Sim') ? 'x' : ' ';
              dadosTemplate.solucao_dividida_itens_nao = bloco.dados.parcelamento.includes('Não') ? 'x' : ' ';
              dadosTemplate.justificativa_nao_parcelamento = bloco.dados.parcelamento;
            } else {
              // Se não tem dados específicos, marca "Não" por padrão
              dadosTemplate.solucao_dividida_itens_sim = ' ';
              dadosTemplate.solucao_dividida_itens_nao = 'x';
            }
            break;
            
          case 6: // Resultados e Gestão
            if (bloco.dados.beneficiosPretendidos) {
              dadosTemplate.beneficios_pretendidos_outro = 'x';
              dadosTemplate.beneficios_pretendidos_beneficio = bloco.dados.beneficiosPretendidos;
            }
            if (bloco.dados.notaExplicativa) {
              dadosTemplate.beneficios_pretendidos_explicacao = bloco.dados.notaExplicativa;
            }
            if (bloco.dados.providenciasPendentes) {
              dadosTemplate.providencias_pendentes_sim = bloco.dados.providenciasPendentes !== 'Não informado no DFD' ? 'x' : ' ';
              dadosTemplate.providencias_pendentes_nao = bloco.dados.providenciasPendentes === 'Não informado no DFD' ? 'x' : ' ';
              dadosTemplate.providencias_pendentes_especificar = bloco.dados.providenciasPendentes;
            }
            if (bloco.dados.gestaoFiscalizacao) {
              dadosTemplate.requisitos_gestao_contratual = bloco.dados.gestaoFiscalizacao;
              dadosTemplate.requisitos_fiscalizacao = bloco.dados.gestaoFiscalizacao;
            }
            if (bloco.dados.contratacoesRelacionadas) {
              dadosTemplate.contratacoes_correlatas_sim = bloco.dados.contratacoesRelacionadas !== 'Não informado no DFD' ? 'x' : ' ';
              dadosTemplate.contratacoes_correlatas_nao = bloco.dados.contratacoesRelacionadas === 'Não informado no DFD' ? 'x' : ' ';
              dadosTemplate.contratacoes_correlatas_justificativa = bloco.dados.contratacoesRelacionadas;
            }
            break;
        }
      }
    });

    // Log para debug
    console.log('📊 Dados sendo enviados para o template:');
    console.log('- Variáveis básicas:', Object.keys(dadosTemplate).filter(k => !k.startsWith('bloco')));
    console.log('- Blocos gerados:', blocosGerados.length);
    console.log('- Conteúdo dos blocos:', Object.keys(dadosTemplate).filter(k => k.includes('conteudo')));
    
    // Log das variáveis principais
    console.log('🔍 Variáveis principais:');
    console.log('- numero_etp:', dadosTemplate.numero_etp);
    console.log('- numero_sgd:', dadosTemplate.numero_sgd);
    console.log('- orgao:', dadosTemplate.orgao);
    console.log('- descricao_objeto:', dadosTemplate.descricao_objeto);
    console.log('- valor_estimado:', dadosTemplate.valor_estimado);
    
    // Verificar se há valores undefined ou null
    const valoresUndefined = Object.entries(dadosTemplate).filter(([key, value]) => value === undefined || value === null);
    if (valoresUndefined.length > 0) {
      console.log('⚠️ Valores undefined/null encontrados:', valoresUndefined);
    }
    
    // Limpar valores undefined/null e substituir por strings vazias
    Object.keys(dadosTemplate).forEach(key => {
      if (dadosTemplate[key] === undefined || dadosTemplate[key] === null) {
        dadosTemplate[key] = '';
      }
      // Garantir que valores não sejam objetos complexos
      if (typeof dadosTemplate[key] === 'object' && !Array.isArray(dadosTemplate[key])) {
        dadosTemplate[key] = JSON.stringify(dadosTemplate[key]);
      }
    });
    
    // Verificar tamanho do buffer do template
    console.log('📄 Tamanho do template original:', templateBuffer.length, 'bytes');
    
    // Processar template
    const zip = new PizZip(templateBuffer);
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      delimiters: {
        start: '{',
        end: '}'
      }
    });

    // Substituir variáveis no template (método atualizado)
    try {
      doc.render(dadosTemplate);
      console.log('✅ Template renderizado com sucesso');
    } catch (error) {
      console.error('❌ Erro ao renderizar template:', error.message);
      if (error.properties && error.properties.errors) {
        console.error('📋 Erros detalhados:');
        error.properties.errors.forEach((err, index) => {
          console.error(`  ${index + 1}. ${err.name}: ${err.message}`);
        });
      }
      console.error('📋 Dados do template (primeiros 10 campos):', Object.entries(dadosTemplate).slice(0, 10));
      return res.status(500).json({ 
        error: 'Erro ao processar template do ETP',
        details: error.message,
        templateErrors: error.properties?.errors || []
      });
    }

    // Gerar documento final
    const buffer = doc.getZip().generate({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: {
        level: 6, // Reduzir nível de compressão para evitar problemas
      },
    });

    // Salvar arquivo temporário
    const timestamp = Date.now();
    // Limpar caracteres inválidos do nome do arquivo
    const numeroDFDLimpo = (dfdResumo.numero_dfd || 'temp').replace(/[\/\\:*?"<>|]/g, '_');
    const nomeArquivo = `ETP_${numeroDFDLimpo}_${timestamp}.docx`;
    const caminhoArquivo = path.join(process.cwd(), 'documentos', 'gerados', nomeArquivo);
    
    // Garantir que o diretório existe
    const dirGerados = path.join(process.cwd(), 'documentos', 'gerados');
    if (!fs.existsSync(dirGerados)) {
      fs.mkdirSync(dirGerados, { recursive: true });
    }

    fs.writeFileSync(caminhoArquivo, buffer);

    console.log('✅ ETP gerado com sucesso:', nomeArquivo);
    console.log('📁 Caminho do arquivo:', caminhoArquivo);
    console.log('📊 Tamanho do arquivo gerado:', buffer.length, 'bytes');
    
    // Verificar se o arquivo foi criado corretamente
    if (fs.existsSync(caminhoArquivo)) {
      const stats = fs.statSync(caminhoArquivo);
      console.log('✅ Arquivo criado com sucesso - Tamanho:', stats.size, 'bytes');
    } else {
      console.log('❌ Erro: Arquivo não foi criado');
    }

    // Salvar registro no banco de dados
    const { DocumentoGerado } = require('../../../models');
    await DocumentoGerado.create({
      nomeArquivo: nomeArquivo,
      caminhoArquivo: caminhoArquivo,
      tipo: 'ETP',
      criadoPor: decoded.userId, // Usar userId em vez de id
      dadosProcessados: JSON.stringify({
        dfdResumo,
        blocosGerados,
        dadosTemplate
      }),
      dadosOriginais: JSON.stringify({
        dfdResumo,
        blocosGerados,
        dadosTemplate
      })
    });

    res.status(200).json({
      success: true,
      arquivo: nomeArquivo,
      caminho: caminhoArquivo,
      documento: {
        id: timestamp,
        nome: nomeArquivo,
        tipo: 'ETP'
      },
      message: 'ETP gerado com sucesso'
    });

  } catch (error) {
    console.error('❌ Erro na geração do ETP:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: error.message 
    });
  }
}