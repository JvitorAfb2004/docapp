const { verifyToken } = require('../../../lib/auth');
const { rateLimit } = require('../../../lib/security');
const { getDecryptedOpenAIKey } = require('../../../lib/encryption');
const db = require('../../../models');
const fs = require('fs');
const path = require('path');

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Método não permitido' });
  }

  rateLimit(20, 300000)(request, response, async () => {
    try {
      // Verificar autenticação
      const token = request.headers.authorization?.replace('Bearer ', '');
      if (!token) return response.status(401).json({ error: 'Token não fornecido' });
      const decoded = await verifyToken(token);
      if (!decoded) return response.status(403).json({ error: 'Token inválido' });

      const { dfdData, blocosGerados, numeroETP } = request.body;

      if (!dfdData || !blocosGerados || !numeroETP) {
        return response.status(400).json({ error: 'Dados incompletos para geração do ETP' });
      }

      console.log('🚀 Gerando ETP completo final');
      console.log('👤 Usuário:', decoded.email);
      console.log('📋 Blocos:', blocosGerados.length);

      // Obter chave OpenAI
      const apiKey = await getDecryptedOpenAIKey(db);
      if (!apiKey) {
        throw new Error('Nenhuma chave OpenAI ativa encontrada');
      }

      // Preparar o contexto completo para a IA
      const systemPrompt = `Você é um especialista em Estudos Técnicos Preliminares (ETP) para contratações públicas brasileiras. 

Sua tarefa é consolidar todos os blocos do ETP em um documento final completo e coeso, mantendo a estrutura dos dados estruturados.

IMPORTANTE:
- Mantenha a estrutura JSON de cada bloco
- Organize os blocos na ordem correta (1 a 7)
- Adicione cabeçalhos e separadores entre os blocos
- Mantenha o tom técnico e profissional
- Use as informações do DFD para contextualizar
- Crie um documento final estruturado que possa ser editado posteriormente

Contexto do DFD:
- Tipo de objeto: ${dfdData.tipo || 'Serviço'}
- Descrição: ${dfdData.descricao || 'Não especificado'}
- Valor estimado: R$ ${dfdData.valorEstimado || 'Não especificado'}
- Órgão: ${dfdData.orgao || 'Não especificado'}
- Número DFD: ${dfdData.numeroDFD || 'Não especificado'}
- Número SGD: ${dfdData.sgd || 'Não especificado'}

Agora consolide os seguintes blocos em um ETP completo:`;

      // Preparar o prompt com todos os blocos
      let blocosContent = '';
      blocosGerados.forEach((bloco, index) => {
        blocosContent += `\n\n--- ${bloco.titulo} ---\n${bloco.conteudo}`;
      });

      const userPrompt = `${systemPrompt}

${blocosContent}

Por favor, consolide todos os blocos acima em um ETP completo e final, mantendo a estrutura JSON e adicionando:
1. Cabeçalho com informações do DFD
2. Índice dos blocos
3. Conteúdo de cada bloco na ordem correta
4. Estrutura consistente
5. Conclusão final

IMPORTANTE: Retorne APENAS um JSON válido com a estrutura consolidada.
NÃO retorne HTML ou texto livre.`;

      // Enviar para OpenAI
      const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-4-turbo',
          messages: [
            {
              role: 'system',
              content: 'Você é um especialista em formatação de documentos técnicos. Retorne apenas o JSON estruturado.'
            },
            {
              role: 'user',
              content: userPrompt
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
      const rawContent = result.choices[0]?.message?.content || '';

      console.log('✅ ETP completo gerado com sucesso pela OpenAI');
      
      // Validar se a resposta é JSON válido
      let content;
      try {
        // Tentar fazer parse do JSON
        content = JSON.parse(rawContent);
        console.log('✅ Resposta da IA é JSON válido');
      } catch (jsonError) {
        console.error('❌ Resposta da IA não é JSON válido:', rawContent);
        throw new Error('A IA retornou uma resposta em formato inválido. Esperava JSON estruturado.');
      }

      // Salvar no banco de dados
      const documento = await db.DocumentoGerado.create({
        tipo: 'ETP',
        numeroSGD: dfdData.sgd || null,
        numeroDFD: dfdData.numeroDFD || null,
        numeroETP: numeroETP,
        dadosProcessados: {
          dfdData,
          blocosGerados,
          etpCompleto: content,
          numeroETP
        },
        dadosOriginais: { 
          dfdData, 
          blocosGerados, 
          numeroETP 
        },
        status: 'processado',
        tokensGastos: result.usage?.total_tokens || 0,
        modeloIA: result.model || 'gpt-4-turbo',
        criadoPor: decoded.userId,
        dataProcessamento: new Date(),
        ativo: true,
        downloadCount: 0
      });

      console.log('✅ ETP completo salvo no banco (ID:', documento.id, ')');

      // Retornar resposta
      return response.status(200).json({
        success: true,
        message: 'ETP completo gerado com sucesso!',
        etpCompleto: content,
        documento: {
          id: documento.id,
          tipo: 'ETP',
          numeroETP,
          status: 'processado',
          dataProcessamento: documento.dataProcessamento
        },
        processamento: {
          usouIA: true,
          tokensGastos: result.usage?.total_tokens || 0,
          modeloIA: result.model || 'gpt-4-turbo',
          metodo: 'geracao_etp_completo'
        }
      });

    } catch (error) {
      console.error('❌ Erro ao gerar ETP completo:', error);
      return response.status(500).json({ 
        error: 'Erro ao gerar ETP completo', 
        details: error.message 
      });
    }
  });
}
