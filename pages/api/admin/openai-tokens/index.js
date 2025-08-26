const db = require('../../../../models');
const { verifyAdminToken } = require('../../../../lib/auth');
const { encrypt, decrypt } = require('../../../../lib/encryption');

export default async function handler(request, response) {
  try {
    const token = request.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return response.status(401).json({ error: 'Token não fornecido' });
    }

    const decoded = await verifyAdminToken(token, db);
    if (!decoded) {
      return response.status(403).json({ error: 'Acesso negado' });
    }

    if (request.method === 'GET') {
      const tokens = await db.OpenAIToken.findAll({
        order: [['createdAt', 'DESC']]
      });

      // Não retornar as chaves descriptografadas para o frontend
      const tokensWithoutKeys = tokens.map(token => ({
        id: token.id,
        name: token.name,
        model: token.model,
        isActive: token.isActive,
        lastUsed: token.lastUsed,
        usageCount: token.usageCount,
        createdAt: token.createdAt,
        updatedAt: token.updatedAt,
        // Não incluir a chave na resposta
        key: '***criptografada***'
      }));

      return response.status(200).json({ tokens: tokensWithoutKeys });
    }

    if (request.method === 'POST') {
      const { name, key, model } = request.body;

      if (!key || !model) {
        return response.status(400).json({ error: 'Chave e modelo são obrigatórios' });
      }

      // Validar formato básico da chave OpenAI
      if (!key.startsWith('sk-')) {
        return response.status(400).json({ error: 'Formato de chave OpenAI inválido' });
      }

      // Validar modelos aceitos
      const validModels = ['gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo', 'gpt-4o'];
      if (!validModels.includes(model)) {
        return response.status(400).json({ error: 'Modelo não suportado' });
      }

      // Criptografar a chave antes de salvar
      const encryptedKey = encrypt(key);

      const newToken = await db.OpenAIToken.create({
        name: name || 'Token Principal',
        key: encryptedKey,
        model,
        isActive: true
      });

      // Retornar sem a chave descriptografada
      const tokenResponse = {
        id: newToken.id,
        name: newToken.name,
        model: newToken.model,
        isActive: newToken.isActive,
        lastUsed: newToken.lastUsed,
        usageCount: newToken.usageCount,
        createdAt: newToken.createdAt,
        updatedAt: newToken.updatedAt,
        key: '***criptografada***'
      };

      return response.status(201).json({ token: tokenResponse });
    }

    return response.status(405).json({ error: 'Método não permitido' });
  } catch (error) {
    console.error('Erro na API de tokens OpenAI:', error);
    return response.status(500).json({ error: 'Erro interno do servidor' });
  }
}
