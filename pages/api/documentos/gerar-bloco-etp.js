const { verifyToken } = require('../../../lib/auth');
const { rateLimit } = require('../../../lib/security');
const { getDecryptedOpenAIKey } = require('../../../lib/encryption');
const db = require('../../../models');

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

      const { prompt, blocoId, dfdData, blocoTitulo } = request.body;

      if (!prompt || blocoId === undefined || !dfdData) {
        return response.status(400).json({ error: 'Dados incompletos para geração do bloco' });
      }

      console.log('🚀 Gerando bloco ETP:', blocoId, blocoTitulo);
      console.log('👤 Usuário:', decoded.email);

      // Obter chave OpenAI
      const apiKey = await getDecryptedOpenAIKey(db);
      if (!apiKey) {
        throw new Error('Nenhuma chave OpenAI ativa encontrada');
      }

      // Preparar o contexto completo para a IA
      const systemPrompt = `Você é um especialista em Estudos Técnicos Preliminares (ETP) para contratações públicas brasileiras. 
      
Sua tarefa é gerar respostas estruturadas para os blocos do ETP, baseando-se nas informações do DFD fornecido.

IMPORTANTE: Você DEVE retornar APENAS um JSON válido com as respostas estruturadas.
NÃO retorne HTML, texto livre ou qualquer outra formatação.

FORMATO OBRIGATÓRIO - Retorne apenas o JSON:
Para cada pergunta do bloco, crie uma chave com o nome da variável e o valor da resposta.

Exemplo de resposta para Bloco 1:
{
  "tipo_objeto": "Serviço",
  "vigencia_contrato": "12 meses",
  "prorrogacao": "Sim",
  "natureza_contratacao": "Continuada sem monopólio",
  "fornecimento_continuado": "Sim",
  "endereco_execucao": "Rua Exemplo, 123 - Centro, Palmas-TO",
  "protocolo_pncp": "Não disponível"
}

Contexto do DFD:
- Tipo de objeto: ${dfdData.tipo || 'Serviço'}
- Descrição: ${dfdData.descricao || 'Não especificado'}
- Valor estimado: R$ ${dfdData.valorEstimado || 'Não especificado'}
- Órgão: ${dfdData.orgao || 'Não especificado'}
- Especificações: ${dfdData.especificacoes?.length || 0} itens

Agora responda ao seguinte prompt retornando APENAS o JSON:`;

      const userPrompt = `${prompt}

IMPORTANTE: Retorne APENAS um JSON válido com as respostas para este bloco.
NÃO inclua texto explicativo, HTML ou formatação adicional.
Apenas o JSON com as variáveis e valores das respostas.`;

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
              content: systemPrompt
            },
            {
              role: 'user',
              content: userPrompt
            }
          ],
          temperature: 0.3,
          max_tokens: 2000
        })
      });

      if (!openaiResponse.ok) {
        const error = await openaiResponse.text();
        console.error('❌ Erro na API OpenAI:', error);
        throw new Error(`Erro na API OpenAI: ${openaiResponse.statusText}`);
      }

      const result = await openaiResponse.json();
      const rawContent = result.choices[0]?.message?.content || '';

      console.log('✅ Bloco ETP gerado com sucesso pela OpenAI');
      
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
        numeroETP: null,
        dadosProcessados: {
          blocoId,
          blocoTitulo,
          conteudo: content,
          dfdData
        },
        dadosOriginais: { 
          prompt, 
          blocoId, 
          blocoTitulo 
        },
        status: 'processado',
        tokensGastos: result.usage?.total_tokens || 0,
        modeloIA: result.model || 'gpt-4-turbo',
        criadoPor: decoded.userId,
        dataProcessamento: new Date(),
        ativo: true,
        downloadCount: 0
      });

      console.log('✅ Bloco ETP salvo no banco (ID:', documento.id, ')');

      // Retornar resposta
      return response.status(200).json({
        success: true,
        message: `Bloco ${blocoId} do ETP gerado com sucesso!`,
        conteudo: content,
        blocoId,
        blocoTitulo,
        documento: {
          id: documento.id,
          tipo: 'ETP_BLOCO',
          blocoId,
          status: 'processado',
          dataProcessamento: documento.dataProcessamento
        },
        processamento: {
          usouIA: true,
          tokensGastos: result.usage?.total_tokens || 0,
          modeloIA: result.model || 'gpt-4-turbo',
          metodo: 'geracao_bloco_etp'
        }
      });

    } catch (error) {
      console.error('❌ Erro ao gerar bloco ETP:', error);
      return response.status(500).json({ 
        error: 'Erro ao gerar bloco do ETP', 
        details: error.message 
      });
    }
  });
}
