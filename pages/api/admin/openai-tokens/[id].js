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

    const { id } = request.query;

    if (request.method === 'GET') {
      const openAIToken = await db.OpenAIToken.findByPk(id);

      if (!openAIToken) {
        return response.status(404).json({ error: 'Token não encontrado' });
      }

      // Não retornar a chave descriptografada
      const tokenResponse = {
        id: openAIToken.id,
        name: openAIToken.name,
        model: openAIToken.model,
        isActive: openAIToken.isActive,
        lastUsed: openAIToken.lastUsed,
        usageCount: openAIToken.usageCount,
        createdAt: openAIToken.createdAt,
        updatedAt: openAIToken.updatedAt,
        key: '***criptografada***'
      };

      return response.status(200).json({ token: tokenResponse });
    }

    if (request.method === 'PUT') {
      const { name, key, model, isActive } = request.body;

      // Validar chave OpenAI se fornecida
      if (key && !key.startsWith('sk-')) {
        return response.status(400).json({ error: 'Formato de chave OpenAI inválido' });
      }

      // Validar modelo se fornecido
      if (model) {
        const validModels = ['gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo', 'gpt-4o'];
        if (!validModels.includes(model)) {
          return response.status(400).json({ error: 'Modelo não suportado' });
        }
      }

      const openAIToken = await db.OpenAIToken.findByPk(id);
      if (!openAIToken) {
        return response.status(404).json({ error: 'Token não encontrado' });
      }

      // Preparar dados para atualização
      const updateData = {
        name: name || openAIToken.name,
        model: model || openAIToken.model,
        isActive: isActive !== undefined ? isActive : openAIToken.isActive
      };

      // Se uma nova chave foi fornecida, criptografar
      if (key) {
        updateData.key = encrypt(key);
      }

      await openAIToken.update(updateData);

      // Retornar sem a chave descriptografada
      const tokenResponse = {
        id: openAIToken.id,
        name: openAIToken.name,
        model: openAIToken.model,
        isActive: openAIToken.isActive,
        lastUsed: openAIToken.lastUsed,
        usageCount: openAIToken.usageCount,
        createdAt: openAIToken.createdAt,
        updatedAt: openAIToken.updatedAt,
        key: '***criptografada***'
      };

      return response.status(200).json({ token: tokenResponse });
    }

    if (request.method === 'DELETE') {
      const openAIToken = await db.OpenAIToken.findByPk(id);

      if (!openAIToken) {
        return response.status(404).json({ error: 'Token não encontrado' });
      }

      await openAIToken.destroy();

      return response.status(200).json({ message: 'Token removido com sucesso' });
    }

    return response.status(405).json({ error: 'Método não permitido' });
  } catch (error) {
    console.error('Erro na API de token OpenAI por ID:', error);
    return response.status(500).json({ error: 'Erro interno do servidor' });
  }
}
