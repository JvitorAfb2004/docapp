import { NextApiRequest, NextApiResponse } from 'next';
import { verifyToken } from '../../../lib/auth';
import { getDecryptedOpenAIKey } from '../../../lib/encryption';
import db from '../../../models';
import fs from 'fs';
import path from 'path';

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

    // Enviar para OpenAI
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o',
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
        max_tokens: 4000
      })
    });

    if (!openaiResponse.ok) {
      const error = await openaiResponse.text();
      console.error('❌ Erro na API OpenAI:', error);
      throw new Error(`Erro na API OpenAI: ${openaiResponse.statusText}`);
    }

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

    // Salvar no banco de dados
    const documento = await db.DocumentoGerado.create({
      tipo: 'ETP',
      numeroSGD: resumoDFD.numero_sgd || null,
      numeroDFD: resumoDFD.numero_dfd || null,
      numeroETP: numeroETP,
      dadosProcessados: {
        etpFinal,
        resumoDFD,
        blocos,
        documentosApoio
      },
      dadosOriginais: { 
        resumoDFD, 
        blocos, 
        numeroETP,
        documentosApoio
      },
      status: 'consolidado',
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
