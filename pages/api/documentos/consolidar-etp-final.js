import { NextApiRequest, NextApiResponse } from 'next';
import { verifyToken } from '../../../lib/auth';
import { getDecryptedOpenAIKey } from '../../../lib/encryption';
import db from '../../../models';
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

    const { blocos, resumoDFD, numeroETP, documentosApoio } = req.body;

    if (!blocos || !Array.isArray(blocos) || blocos.length === 0) {
      return res.status(400).json({ error: 'Blocos são obrigatórios para consolidação' });
    }

    if (!numeroETP) {
      return res.status(400).json({ error: 'Número do ETP é obrigatório' });
    }

    // Obter chave OpenAI
    const apiKey = await getDecryptedOpenAIKey(db);
    if (!apiKey) {
      throw new Error('Nenhuma chave OpenAI ativa encontrada');
    }

    // Carregar prompt de consolidação
    const promptsPath = path.join(process.cwd(), 'documentos', 'prompts-verbatim-blocos.txt');
    const promptsContent = fs.readFileSync(promptsPath, 'utf8');
    
    const promptConsolidacao = extractConsolidacaoPrompt(promptsContent);
    if (!promptConsolidacao) {
      return res.status(400).json({ error: 'Prompt de consolidação não encontrado' });
    }

    console.log('🤖 Consolidando ETP final...');

    // Preparar contexto completo
    let contextoCompleto = `DADOS DO DFD:\n${JSON.stringify(resumoDFD, null, 2)}\n\n`;
    
    contextoCompleto += `BLOCOS GERADOS:\n`;
    blocos.forEach((bloco, index) => {
      contextoCompleto += `\n--- ${bloco.titulo} ---\n`;
      contextoCompleto += `Conteúdo: ${bloco.conteudoGerado}\n`;
      contextoCompleto += `Perguntas: ${JSON.stringify(bloco.perguntas, null, 2)}\n`;
    });

    if (documentosApoio && documentosApoio.length > 0) {
      contextoCompleto += `\nDOCUMENTOS DE APOIO:\n`;
      documentosApoio.forEach((doc, index) => {
        contextoCompleto += `Documento ${index + 1}: ${doc.conteudo}\n\n`;
      });
    }

    // Função para fazer retry em caso de erro
    const fazerRequisicaoOpenAI = async (tentativa = 1) => {
      try {
        console.log(`🔄 Tentativa ${tentativa} de consolidação do ETP...`);
        
        const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini', // Usar modelo mais leve para evitar timeouts
            messages: [
              {
                role: 'system',
                content: 'Você é um especialista em consolidação de Estudos Técnicos Preliminares (ETP) para contratações públicas brasileiras. Siga exatamente as instruções fornecidas e retorne um documento ETP completo e estruturado.'
              },
              {
                role: 'user',
                content: `${promptConsolidacao.promptTecnico}\n\n${promptConsolidacao.promptResposta}\n\n${contextoCompleto}`
              }
            ],
            temperature: 0.3,
            max_tokens: 3000 // Reduzir tokens para evitar timeouts
          })
        });

        if (!openaiResponse.ok) {
          const error = await openaiResponse.text();
          console.error(`❌ Erro na API OpenAI (tentativa ${tentativa}):`, error);
          
          // Se for erro de gateway ou rate limit, tentar novamente
          if ((openaiResponse.status === 502 || openaiResponse.status === 503 || 
               openaiResponse.status === 504 || openaiResponse.status === 429) && tentativa < 3) {
            console.log(`🔄 Tentando novamente em ${tentativa * 3} segundos...`);
            await new Promise(resolve => setTimeout(resolve, tentativa * 3000));
            return fazerRequisicaoOpenAI(tentativa + 1);
          }
          
          throw new Error(`Erro na API OpenAI: ${openaiResponse.status} - ${openaiResponse.statusText}`);
        }

        return openaiResponse;
      } catch (error) {
        if (tentativa < 3 && (error.message.includes('502') || error.message.includes('503') || 
                              error.message.includes('504') || error.message.includes('429') ||
                              error.message.includes('timeout') || error.message.includes('ECONNRESET'))) {
          console.log(`🔄 Tentando novamente em ${tentativa * 3} segundos...`);
          await new Promise(resolve => setTimeout(resolve, tentativa * 3000));
          return fazerRequisicaoOpenAI(tentativa + 1);
        }
        throw error;
      }
    };

    const openaiResponse = await fazerRequisicaoOpenAI();

    const result = await openaiResponse.json();
    const etpConsolidado = result.choices[0]?.message?.content || '';

    console.log('✅ ETP consolidado com sucesso');

    // Criar estrutura final do ETP
    const etpFinal = {
      id: `etp_${Date.now()}`,
      numeroETP,
      resumoDFD,
      blocos: blocos.map(bloco => ({
        id: bloco.id,
        titulo: bloco.titulo,
        perguntas: bloco.perguntas,
        conteudoGerado: bloco.conteudoGerado
      })),
      consolidado: etpConsolidado,
      dataConsolidacao: new Date().toISOString(),
      status: 'consolidado'
    };

    console.log('📊 Estrutura do ETP final criada:', JSON.stringify(etpFinal, null, 2));

    // Gerar DOCX usando docxtemplater
    console.log('📄 Gerando ETP em DOCX...');
    
    // Preparar dados para o template
    const dadosTemplate = prepararDadosTemplate(resumoDFD, blocos, numeroETP);
    
    console.log('📊 Dados do template preparados:', Object.keys(dadosTemplate));
    console.log('🔍 Valores das variáveis principais:');
    console.log('  - numero_etp:', dadosTemplate.numero_etp);
    console.log('  - numero_sgd:', dadosTemplate.numero_sgd);
    console.log('  - numero_dfd:', dadosTemplate.numero_dfd);
    
    // Carregar template ETP.docx
    const templatePath = path.join(process.cwd(), 'documentos', 'ETP.docx');
    
    if (!fs.existsSync(templatePath)) {
      throw new Error('Template ETP.docx não encontrado');
    }
    
    const templateBuffer = fs.readFileSync(templatePath);
    const zip = new PizZip(templateBuffer);
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      delimiters: {
        start: '{',
        end: '}'
      }
    });
    
    // Verificar se as variáveis estão no template
    const templateContent = zip.file('word/document.xml').asText();
    console.log('🔍 Verificando variáveis no template:');
    console.log('  - Template contém {numero_etp}:', templateContent.includes('{numero_etp}'));
    console.log('  - Template contém {numero_sgd}:', templateContent.includes('{numero_sgd}'));
    console.log('  - Template contém {numero_dfd}:', templateContent.includes('{numero_dfd}'));
    
    // Renderizar template
    try {
      console.log('🔄 Renderizando template com dados:', {
        numero_etp: dadosTemplate.numero_etp,
        numero_sgd: dadosTemplate.numero_sgd,
        numero_dfd: dadosTemplate.numero_dfd
      });
      
      doc.render(dadosTemplate);
      console.log('✅ Template renderizado com sucesso');
    } catch (error) {
      console.error('❌ Erro ao renderizar template:', error);
      console.error('❌ Dados enviados para renderização:', dadosTemplate);
      throw new Error(`Erro ao renderizar template: ${error.message}`);
    }
    
    // Gerar buffer do documento
    const buffer = doc.getZip().generate({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: {
        level: 6,
      },
    });
    
    // Salvar arquivo
    const timestamp = Date.now();
    const numeroDFDLimpo = (resumoDFD.numero_dfd || 'temp').replace(/[\/\\:*?"<>|]/g, '_');
    const nomeArquivo = `ETP_${numeroDFDLimpo}_${timestamp}.docx`;
    const caminhoArquivo = path.join(process.cwd(), 'documentos', 'gerados', nomeArquivo);
    
    // Garantir que o diretório existe
    const dirGerados = path.join(process.cwd(), 'documentos', 'gerados');
    if (!fs.existsSync(dirGerados)) {
      fs.mkdirSync(dirGerados, { recursive: true });
    }
    
    fs.writeFileSync(caminhoArquivo, buffer);
    
    console.log('✅ ETP DOCX gerado:', nomeArquivo);

    // Salvar no banco de dados
    const documento = await db.DocumentoGerado.create({
      tipo: 'ETP',
      numeroSGD: resumoDFD.numero_sgd || null,
      numeroDFD: resumoDFD.numero_dfd || null,
      numeroETP: numeroETP,
      nomeArquivo: nomeArquivo,
      caminhoArquivo: caminhoArquivo,
      tamanhoArquivo: buffer.length,
      dadosProcessados: {
        etpFinal,
        resumoDFD,
        blocos,
        dadosTemplate
      },
      dadosOriginais: { 
        resumoDFD, 
        blocos, 
        numeroETP
      },
      status: 'arquivo_gerado',
      tokensGastos: result.usage?.total_tokens || 0,
      modeloIA: result.model || 'gpt-4o',
      criadoPor: decoded.userId,
      dataProcessamento: new Date(),
      ativo: true,
      downloadCount: 0
    });

    console.log('✅ ETP salvo no banco (ID:', documento.id, ')');

    res.status(200).json({
      success: true,
      etp: etpFinal,
      documento: {
        id: documento.id,
        tipo: 'ETP',
        numeroETP,
        status: 'consolidado',
        dataProcessamento: documento.dataProcessamento
      },
      message: 'ETP consolidado com sucesso!'
    });

  } catch (error) {
    console.error('❌ Erro na consolidação do ETP:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: error.message 
    });
  }
}

// Função para extrair prompt de consolidação
function extractConsolidacaoPrompt(promptsContent) {
  const startMarker = '## PROMPT PARA CONSOLIDAÇÃO FINAL DO ETP';
  const endMarker = '### PROMPT DE RESPOSTA';
  
  const startIndex = promptsContent.indexOf(startMarker);
  if (startIndex === -1) return null;

  const endIndex = promptsContent.indexOf(endMarker, startIndex);
  const section = promptsContent.substring(startIndex, endIndex === -1 ? promptsContent.length : endIndex);
  
  const promptTecnico = section.replace(startMarker, '').trim();
  
  // Extrair prompt de resposta
  const respostaStart = promptsContent.indexOf(endMarker, startIndex);
  const respostaEnd = promptsContent.indexOf('```', respostaStart);
  const promptResposta = promptsContent.substring(respostaStart, respostaEnd === -1 ? promptsContent.length : respostaEnd)
    .replace(endMarker, '').trim();

  return {
    promptTecnico,
    promptResposta
  };
}

// Função para preparar dados do template
function prepararDadosTemplate(resumoDFD, blocos, numeroETP) {
  console.log('🔍 Dados recebidos para preparar template:');
  console.log('  - numeroETP:', numeroETP);
  console.log('  - resumoDFD:', resumoDFD);
  console.log('  - resumoDFD.numero_sgd:', resumoDFD?.numero_sgd);
  console.log('  - resumoDFD.sgd:', resumoDFD?.sgd);
  console.log('  - resumoDFD.numero_dfd:', resumoDFD?.numero_dfd);
  console.log('  - resumoDFD.numero:', resumoDFD?.numero);
  
  // Dados básicos
  const dadosTemplate = {
    // Dados básicos do ETP
    numero_etp: numeroETP || 'A definir',
    numero_sgd: resumoDFD?.numero_sgd || resumoDFD?.sgd || 'A definir',
    numero_dfd: resumoDFD?.numero_dfd || resumoDFD?.numero || 'A definir',
    orgao: resumoDFD?.orgao || 'A definir',
    tipo_objeto: resumoDFD?.tipo_objeto || resumoDFD?.tipo || 'A definir',
    descricao_objeto: resumoDFD?.descricao_objeto || resumoDFD?.descricaoObjeto || 'A definir',
    valor_estimado: resumoDFD?.valor_estimado || resumoDFD?.valorEstimado || 'A definir',
    classificacao_orcamentaria: resumoDFD?.classificacao_orcamentaria || resumoDFD?.classificacao || 'A definir',
    fonte: resumoDFD?.fonte || 'A definir',
    elemento_despesa: resumoDFD?.elemento_despesa || 'A definir',
    
    // Responsáveis
    fiscal_titular: resumoDFD?.fiscal_titular || resumoDFD?.fiscal || 'A definir',
    fiscal_suplente: resumoDFD?.fiscal_suplente || 'A definir',
    gestor_titular: resumoDFD?.gestor_titular || resumoDFD?.gestor || 'A definir',
    gestor_suplente: resumoDFD?.gestor_suplente || 'A definir',
    demandante_nome: resumoDFD?.demandante_nome || resumoDFD?.demandante || 'A definir',
    demandante_cargo: resumoDFD?.demandante_cargo || 'A definir',
    demandante_setor: resumoDFD?.demandante_setor || 'A definir',
    
    // Data e local
    data_atual: new Date().toLocaleDateString('pt-BR'),
    ano_atual: new Date().getFullYear().toString(),
    local: 'Palmas – TO',
    
    // Campos obrigatórios com valores padrão
    descricao_necessidade: resumoDFD?.descricao_objeto || 'Necessidade não especificada no DFD',
    previsao_pca_etp_sim: 'x',
    previsao_pca_etp_nao: ' ',
    previsao_pca_etp_justificativa: 'A contratação está prevista no Plano de Contratações Anual conforme planejamento estratégico institucional',
    
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
    objeto_continuado_sim: ' ',
    objeto_continuado_nao: 'x',
    
    // Posicionamento conclusivo padrão
    posicionamento_conclusivo: 'A contratação apresenta viabilidade técnica, econômica e ambiental, atendendo adequadamente à necessidade identificada e contribuindo para o cumprimento dos objetivos institucionais'
  };

  // Adicionar conteúdo dos blocos
  blocos.forEach((bloco, index) => {
    if (bloco) {
      dadosTemplate[`bloco${bloco.id}_conteudo`] = bloco.conteudo || bloco.conteudoGerado || 'Bloco não gerado';
    }
  });

  // Processar dados dos blocos
  blocos.forEach((bloco) => {
    if (bloco && bloco.perguntas) {
      bloco.perguntas.forEach((pergunta) => {
        const valor = pergunta.value;
        
        // Mapear campos específicos baseado no bloco e pergunta
        if (bloco.id === 1) { // Características Contratuais Fundamentais
          if (pergunta.id.includes('tipoObjeto')) {
            dadosTemplate.tipo_objeto_servico = valor.checkbox === 'Serviço' ? 'x' : ' ';
            dadosTemplate.tipo_objeto_bem = valor.checkbox === 'Bem' ? 'x' : ' ';
          } else if (pergunta.id.includes('vigenciaContrato')) {
            if (valor.text) {
              dadosTemplate.vigencia_contrato_outro = 'x';
              dadosTemplate.vigencia_contrato_qtd_meses = '12';
            }
          } else if (pergunta.id.includes('prorrogacao')) {
            dadosTemplate.prorrogacao_contrato_sim = valor.checkbox === 'Sim' ? 'x' : ' ';
            dadosTemplate.prorrogacao_contrato_nao = valor.checkbox === 'Não' ? 'x' : ' ';
          } else if (pergunta.id.includes('fornecimentoContinuado')) {
            dadosTemplate.objeto_continuado_sim = valor.checkbox === 'Sim' ? 'x' : ' ';
            dadosTemplate.objeto_continuado_nao = valor.checkbox === 'Não' ? 'x' : ' ';
          }
        }
        
        // Mapear outros blocos conforme necessário...
        if (bloco.id === 2) { // Requisitos Técnicos
          if (pergunta.id.includes('sustentabilidade')) {
            dadosTemplate.criterios_sustentabilidade_sim = valor.checkbox === 'Sim' ? 'x' : ' ';
            dadosTemplate.criterios_sustentabilidade_nao = valor.checkbox === 'Não' ? 'x' : ' ';
            dadosTemplate.criterios_sustentabilidade_justificativa = valor.text || valor.checkbox;
          } else if (pergunta.id.includes('treinamento')) {
            dadosTemplate.necessidade_treinamento_sim = valor.checkbox === 'Sim' ? 'x' : ' ';
            dadosTemplate.necessidade_treinamento_nao = valor.checkbox === 'Não' ? 'x' : ' ';
          } else if (pergunta.id.includes('bemLuxo')) {
            dadosTemplate.bem_luxo_sim = valor.checkbox === 'Sim' ? 'x' : ' ';
            dadosTemplate.bem_luxo_nao = valor.checkbox === 'Não' ? 'x' : ' ';
          }
        }
      });
    }
  });

  // Limpar valores undefined/null
  Object.keys(dadosTemplate).forEach(key => {
    if (dadosTemplate[key] === undefined || dadosTemplate[key] === null) {
      dadosTemplate[key] = '';
    }
  });

  console.log('✅ Dados finais do template preparados:');
  console.log('  - numero_etp:', dadosTemplate.numero_etp);
  console.log('  - numero_sgd:', dadosTemplate.numero_sgd);
  console.log('  - numero_dfd:', dadosTemplate.numero_dfd);
  console.log('  - orgao:', dadosTemplate.orgao);
  console.log('  - tipo_objeto:', dadosTemplate.tipo_objeto);

  return dadosTemplate;
}
