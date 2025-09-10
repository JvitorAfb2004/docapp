const { verifyToken } = require('../../../../lib/auth');
const { requireAuth, requireDocumentOwnership, rateLimit, validateFileAccess } = require('../../../../lib/security');
const db = require('../../../../models');
const fs = require('fs');
const path = require('path');
const DocxTemplater = require('docxtemplater');
const PizZip = require('pizzip');

// Função para gerar documento DOCX a partir dos dados processados
async function generateDocumentFromData(tipo, data) {
  try {
    const templatePath = path.join(process.cwd(), 'documentos', `${tipo}.docx`);
    if (!fs.existsSync(templatePath)) {
      console.error(`Template não encontrado: ${templatePath}`);
      return { success: false, error: 'Template não encontrado' };
    }

    const content = fs.readFileSync(templatePath);
    const zip = new PizZip(content);
    const doc = new DocxTemplater(zip, { 
      paragraphLoop: true, 
      linebreaks: true, 
      nullGetter: () => "",
      delimiters: {
        start: '{',
        end: '}'
      }
    });

    console.log(`\n--- Dados enviados para template ${tipo} ---`);
    console.log('📋 Variáveis específicas:');
    console.log(`numero_etp: "${data.numero_etp}"`);
    console.log(`numero_sgd: "${data.numero_sgd}"`);
    console.log('📋 Dados completos:');
    console.log(JSON.stringify(data, null, 2));
    console.log('--- Fim dos dados ---\n');
    
    // Limpar valores undefined/null e substituir por strings vazias
    Object.keys(data).forEach(key => {
      if (data[key] === undefined || data[key] === null) {
        data[key] = '';
      }
      // Garantir que valores não sejam objetos complexos
      if (typeof data[key] === 'object' && !Array.isArray(data[key])) {
        data[key] = JSON.stringify(data[key]);
      }
    });

    try {
      console.log('🔧 Iniciando renderização do template...');
      console.log('📋 Dados finais para renderização:');
      console.log('numero_etp:', data.numero_etp);
      console.log('numero_sgd:', data.numero_sgd);
      
      doc.render(data);
      console.log('✅ Template renderizado com sucesso no download');
    } catch (renderError) {
      console.error('❌ Erro ao renderizar template no download:', renderError.message);
      if (renderError.properties && renderError.properties.errors) {
        console.error('📋 Erros detalhados no download:');
        renderError.properties.errors.forEach((err, index) => {
          console.error(`  ${index + 1}. ${err.name}: ${err.message}`);
        });
      }
      throw renderError;
    }
    
    const buf = doc.getZip().generate({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: {
        level: 6,
      },
    });

    const now = new Date();
    const horas = now.getHours().toString().padStart(2, '0');
    const minutos = now.getMinutes().toString().padStart(2, '0');
    const segundos = now.getSeconds().toString().padStart(2, '0');
    const horario = `${horas}:${minutos}:${segundos}`;
    const fileName = `${tipo}_${horario}.docx`;
    
    console.log(`${tipo} gerado em memória:`, fileName);
    return { success: true, document: { fileName, buffer: buf, size: buf.length, type: tipo } };
  } catch (error) {
    console.error(`Erro ao gerar ${tipo}:`, error.message);
    if (error.properties && error.properties.errors) {
      error.properties.errors.forEach(err => console.error(err));
    }
    return { success: false, error: error.message };
  }
}

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    return response.status(405).json({ error: 'Método não permitido' });
  }

  rateLimit(5, 60000)(request, response, async () => {
    validateFileAccess(request, response, async () => {
      const decoded = await requireAuth(request, response);
      if (!decoded) return;

      const { id } = request.query;

      console.log('\nDownload/geração solicitada');
      console.log(`Usuário: ${decoded.email} (ID: ${decoded.userId})`);
      console.log(`Documento ID: ${id}`);
      console.log(`Data/Hora: ${new Date().toLocaleString('pt-BR')}`);

      // Buscar documento no banco
      const documento = await db.DocumentoGerado.findOne({
        where: {
          id: id,
          criadoPor: decoded.userId,
          ativo: true
        }
      });

      if (!documento) {
        console.log(`Documento não encontrado ou acesso negado: ID ${id}`);
        return response.status(404).json({ 
          error: 'Documento não encontrado',
          message: 'O documento não existe ou você não tem permissão para acessá-lo'
        });
      }

      // Verificar se existe um arquivo físico já gerado
      if (documento.caminhoArquivo && fs.existsSync(documento.caminhoArquivo)) {
        console.log(`Arquivo físico encontrado: ${documento.caminhoArquivo}`);
        
        // Atualizar estatísticas do documento
        await documento.update({
          downloadCount: documento.downloadCount + 1,
          ultimoDownload: new Date()
        });

        console.log(`Acesso autorizado para usuário ${decoded.email}`);
        console.log(`Arquivo existente: ${documento.nomeArquivo}`);
        console.log(`Caminho: ${documento.caminhoArquivo}`);
        console.log(`Total de downloads: ${documento.downloadCount + 1}`);

        // Ler e enviar o arquivo existente
        const fileBuffer = fs.readFileSync(documento.caminhoArquivo);
        
        response.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        response.setHeader('Content-Disposition', `attachment; filename="${documento.nomeArquivo}"`);
        response.setHeader('Content-Length', fileBuffer.length);

        console.log(`Download iniciado: ${documento.nomeArquivo}`);
        
        return response.status(200).send(fileBuffer);
      }

      // Se não existe arquivo físico, verificar se tem dados processados para gerar
      if (!documento.dadosProcessados) {
        console.log(`Documento ${id} não tem dados processados nem arquivo físico`);
        return response.status(400).json({ 
          error: 'Documento sem dados processados',
          message: 'Este documento não foi processado corretamente'
        });
      }

      console.log(`Arquivo físico não encontrado, gerando ${documento.tipo} a partir dos dados salvos...`);
      console.log(`Status atual: ${documento.status}`);

      // Gerar documento DOCX a partir dos dados salvos
      let dadosParaTemplate;
      
      if (documento.tipo === 'ETP') {
        // Para ETP, extrair dados do resumoDFD e blocos
        const { resumoDFD, blocos, etpFinal } = documento.dadosProcessados;
        
        console.log('🔍 Debug ETP - Estrutura dos dados:');
        console.log('resumoDFD:', resumoDFD ? 'existe' : 'não existe');
        console.log('etpFinal:', etpFinal ? 'existe' : 'não existe');
        console.log('blocos:', blocos ? `existe (${blocos.length} blocos)` : 'não existe');
        
        if (etpFinal) {
          console.log('etpFinal.numeroETP:', etpFinal.numeroETP);
        }
        if (resumoDFD) {
          console.log('resumoDFD.numero_sgd:', resumoDFD.numero_sgd);
        }
        
        // Preparar dados no formato esperado pelo template ETP.docx
        const numeroETP = etpFinal?.numeroETP || resumoDFD?.numero_etp || 'A definir';
        const numeroSGD = resumoDFD?.numero_sgd || 'A definir';
        
        console.log('🔍 Valores extraídos:');
        console.log('numeroETP:', numeroETP);
        console.log('numeroSGD:', numeroSGD);
        
        // Criar objeto de dados simples e direto - foco nas variáveis principais
        dadosParaTemplate = {
          // Variáveis principais que estavam faltando
          numero_etp: numeroETP,
          numero_sgd: numeroSGD,
          
          // Dados básicos do DFD
          numero_dfd: resumoDFD?.numero_dfd || 'A definir',
          orgao: resumoDFD?.orgao || 'A definir',
          tipo_objeto: resumoDFD?.tipo_objeto || 'A definir',
          descricao_objeto: resumoDFD?.descricao_objeto || 'A definir',
          valor_estimado: resumoDFD?.valor_estimado || 'A definir',
          classificacao_orcamentaria: resumoDFD?.classificacao_orcamentaria || 'A definir',
          fonte: resumoDFD?.fonte || 'A definir',
          elemento_despesa: resumoDFD?.elemento_despesa || 'A definir',
          
          // Responsáveis
          fiscal_titular: resumoDFD?.fiscal_titular || 'A definir',
          fiscal_suplente: resumoDFD?.fiscal_suplente || 'A definir',
          gestor_titular: resumoDFD?.gestor_titular || 'A definir',
          gestor_suplente: resumoDFD?.gestor_suplente || 'A definir',
          demandante_nome: resumoDFD?.demandante_nome || 'A definir',
          demandante_cargo: resumoDFD?.demandante_cargo || 'A definir',
          demandante_setor: resumoDFD?.demandante_setor || 'A definir',
          
          // Data e local
          data_atual: resumoDFD?.data_atual || new Date().toLocaleDateString('pt-BR'),
          ano_atual: resumoDFD?.ano_atual || new Date().getFullYear().toString(),
          local: resumoDFD?.local || 'Palmas – TO',
          
          // Conteúdo consolidado do ETP
          conteudo_etp: etpFinal?.consolidado || 'Conteúdo do ETP não disponível',
          
          // Campos obrigatórios básicos
          descricao_necessidade: resumoDFD?.descricao_objeto || 'Necessidade não especificada no DFD',
          previsao_pca_etp_sim: 'x',
          previsao_pca_etp_nao: ' ',
          previsao_pca_etp_justificativa: 'A contratação está prevista no Plano de Contratações Anual conforme planejamento estratégico institucional',
          objeto_continuado_justificativa: 'O serviço requer continuidade para garantir a qualidade e funcionamento adequado das instalações',
          bem_luxo_justificativa: 'O objeto não se caracteriza como bem de luxo, sendo equipamento essencial para as atividades do órgão',
          transicao_contratual_numero: ' ',
          transicao_contratual_prazo: ' ',
          amostra_prova_conceito_justificativa: 'Amostra necessária para verificar a qualidade dos produtos e eficácia do serviço',
          exigencia_marca_especifica_justificativa: 'Marca específica exigida para garantir compatibilidade e padronização',
          pesquisa_solucoes_justificativa: 'Pesquisa realizada em bases de dados governamentais e consulta a fornecedores especializados',
          tratamento_diferenciado_simplificado_justificativa: 'Aplicação do tratamento diferenciado conforme Lei Complementar 123/2006 para estimular participação de ME/EPP',
          meios_pesquisa_valor_espefico: 'Pesquisa realizada em bases de dados governamentais, consulta a fornecedores e análise de contratações similares',
          estimativa_valor: resumoDFD?.valor_estimado || 'Valor a ser definido',
          prazo_garantia_dias: ' ',
          prazo_garantia_meses: ' ',
          prazo_garantia_anos: ' ',
          justificativa_nao_parcelamento: 'O serviço deve ser executado de forma integrada para garantir eficácia e qualidade',
          impactos_ambientais_sim: ' ',
          impactos_ambientais_nao: 'x',
          impactos_ambientais_justificativa: 'Não há previsão de impactos ambientais significativos',
          medidas_mitigacao: 'Não aplicável',
          viabilidade_tecnica_sim: 'x',
          viabilidade_tecnica_nao: ' ',
          viabilidade_tecnica_justificativa: 'A contratação apresenta viabilidade técnica comprovada através de análise de mercado e especificações técnicas',
          posicionamento_conclusivo_sim: 'x',
          posicionamento_conclusivo_nao: ' ',
          posicionamento_conclusivo_justificativa: 'A contratação é tecnicamente viável, economicamente justificada e está em conformidade com a legislação vigente',
          
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
          criterios_sustentabilidade_sim: resumoDFD?.criterios_sustentabilidade_sim || ' ',
          criterios_sustentabilidade_nao: resumoDFD?.criterios_sustentabilidade_nao || ' ',
          criterios_sustentabilidade_justificativa: resumoDFD?.criterios_sustentabilidade_justificativa || ' ',
          
          normativos_especificos_sim: resumoDFD?.normativos_especificos_sim || ' ',
          normativos_especificos_nao: resumoDFD?.normativos_especificos_nao || ' ',
          normativos_especificos_justificativa: resumoDFD?.normativos_especificos_justificativa || ' ',
          
          necessidade_treinamento_sim: resumoDFD?.necessidade_treinamento_sim || ' ',
          necessidade_treinamento_nao: resumoDFD?.necessidade_treinamento_nao || ' ',
          
          bem_luxo_sim: resumoDFD?.bem_luxo_sim || ' ',
          bem_luxo_nao: resumoDFD?.bem_luxo_nao || ' ',
          
          transicao_contratual_sim: resumoDFD?.transicao_contratual_sim || ' ',
          transicao_contratual_nao: resumoDFD?.transicao_contratual_nao || ' ',
          
          amostra_prova_conceito_sim: resumoDFD?.amostra_prova_conceito_sim || ' ',
          amostra_prova_conceito_nao: resumoDFD?.amostra_prova_conceito_nao || ' ',
          
          exigencia_marca_especifica_sim: resumoDFD?.exigencia_marca_especifica_sim || ' ',
          exigencia_marca_especifica_nao: resumoDFD?.exigencia_marca_especifica_nao || ' ',
          
          permitida_subcontratacao_sim: resumoDFD?.permitida_subcontratacao_sim || ' ',
          permitida_subcontratacao_nao: resumoDFD?.permitida_subcontratacao_nao || ' ',
          
          solucao_dividida_itens_sim: resumoDFD?.solucao_dividida_itens_sim || ' ',
          solucao_dividida_itens_nao: resumoDFD?.solucao_dividida_itens_nao || 'x',
          
          posicionamento_conclusivo_sim: resumoDFD?.posicionamento_conclusivo_sim || ' ',
          posicionamento_conclusivo_nao: resumoDFD?.posicionamento_conclusivo_nao || ' ',
          
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
          beneficios_pretendidos_outro: 'x',
          
          // Conteúdo dos blocos
          bloco1_conteudo: resumoDFD?.bloco1_conteudo || 'A definir',
          bloco2_conteudo: resumoDFD?.bloco2_conteudo || 'A definir',
          bloco3_conteudo: resumoDFD?.bloco3_conteudo || 'A definir',
          bloco4_conteudo: resumoDFD?.bloco4_conteudo || 'A definir',
          bloco5_conteudo: resumoDFD?.bloco5_conteudo || 'A definir',
          bloco6_conteudo: resumoDFD?.bloco6_conteudo || 'A definir',
          bloco7_conteudo: resumoDFD?.bloco7_conteudo || 'A definir',
          
          // Itens e responsáveis
          itens: resumoDFD?.itens || [],
          responsaveis_acao_orcamentaria: resumoDFD?.responsaveis_acao_orcamentaria || []
        };
      } else {
        // Para outros tipos, usar dados processados diretamente
        dadosParaTemplate = documento.dadosProcessados;
      }
      
      const result = await generateDocumentFromData(documento.tipo, dadosParaTemplate);
      
      if (!result.success) {
        console.error('Erro na geração:', result.error);
        return response.status(500).json({ 
          error: 'Erro ao gerar documento',
          details: result.error
        });
      }

      // Atualizar estatísticas do documento
      await documento.update({
        downloadCount: documento.downloadCount + 1,
        ultimoDownload: new Date(),
        status: 'arquivo_gerado', // Marcar que o arquivo foi gerado
        nomeArquivo: result.document.fileName, // Atualizar nome do arquivo
        tamanhoArquivo: result.document.size // Atualizar tamanho
      });

      console.log(`Acesso autorizado para usuário ${decoded.email}`);
      console.log(`Arquivo gerado: ${result.document.fileName}`);
      console.log(`Tamanho: ${(result.document.size / 1024).toFixed(2)} KB`);
      console.log(`Total de downloads: ${documento.downloadCount + 1}`);

      // Enviar arquivo gerado
      response.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      response.setHeader('Content-Disposition', `attachment; filename="${result.document.fileName}"`);
      response.setHeader('Content-Length', result.document.buffer.length);

      console.log(`Download iniciado: ${result.document.fileName}`);
      
      return response.status(200).send(result.document.buffer);
    });
  });
}