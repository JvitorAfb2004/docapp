// openai-helper.js ATUALIZADO

const { getDecryptedOpenAIKey } = require('./encryption');
const db = require('../models');

// Função para fazer a chamada à API
async function makeOpenAIRequest(prompt, tokenId = null) {
  const apiKey = await getDecryptedOpenAIKey(db, tokenId);
  if (!apiKey) {
    throw new Error('Nenhuma chave OpenAI ativa encontrada');
  }

  console.log('🤖 Enviando requisição para OpenAI...');
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-4', // Considere usar 'gpt-4-turbo' ou 'gpt-4o' para mais velocidade e menor custo
      messages: [
        {
          role: 'system',
          content: 'Você é um processador de dados JSON. Retorne APENAS JSON válido, sem texto adicional, comentários ou explicações. O JSON deve ser bem formatado e válido.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.1,
      max_tokens: 2048, // Aumentei um pouco para garantir que JSONs complexos não sejam cortados
    })
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('❌ Erro na API OpenAI:', errorBody);
    throw new Error(`Erro na API OpenAI: ${response.statusText}`);
  }

  const result = await response.json();
  console.log('✅ Resposta recebida da OpenAI');
  return {
    success: true,
    content: result.choices[0]?.message?.content || '',
    usage: result.usage,
    model: result.model
  };
}

// Função principal de processamento
async function processFormDataWithAI(formData, systemPrompt) {
  // 1. Monta o prompt
  const prompt = `${systemPrompt}\n\n**Input:**\n${JSON.stringify(formData, null, 2)}`;

  // 2. Chama a IA
  const result = await makeOpenAIRequest(prompt);

  // 3. Tenta fazer o parse do JSON
  if (result.success && result.content) {
    try {
      let cleanContent = result.content.trim();
      const startIndex = cleanContent.indexOf('{');
      const lastIndex = cleanContent.lastIndexOf('}');
      if (startIndex !== -1 && lastIndex !== -1) {
        cleanContent = cleanContent.substring(startIndex, lastIndex + 1);
      }

      const parsedResult = JSON.parse(cleanContent);
      console.log('✅ JSON da IA parseado com sucesso.');
      return {
        success: true,
        processedData: parsedResult,
        usage: result.usage,
        model: result.model
      };
    } catch (parseError) {
      console.error('❌ Erro ao fazer parse da resposta da IA:', parseError);
      console.log('📄 Resposta bruta recebida:', result.content);
      // Retorna falha para que o chamador (gerar.js) decida usar o fallback
      return { success: false, error: 'JSON inválido retornado pela IA', rawResponse: result.content };
    }
  }

  // Se a chamada falhou ou não houve conteúdo, retorna falha.
  return { success: false, error: 'Falha na comunicação com a IA ou resposta vazia' };
}

module.exports = {
  processFormDataWithAI
};