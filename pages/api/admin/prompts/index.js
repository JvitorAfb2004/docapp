const db = require('../../../../models');
const { verifyAdminToken } = require('../../../../lib/auth');

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
      const prompts = await db.Prompt.findAll({
        order: [['type', 'ASC']]
      });

      return response.status(200).json({ prompts });
    }

    if (request.method === 'POST') {
      const { type, content } = request.body;

      if (!type || !content) {
        return response.status(400).json({ error: 'Tipo e conteúdo são obrigatórios' });
      }

      // Validar tipos aceitos
      const validTypes = ['dfd', 'etp'];
      if (!validTypes.includes(type)) {
        return response.status(400).json({ error: 'Tipo de prompt inválido. Use: dfd ou etp' });
      }

      // Verificar se já existe um prompt do mesmo tipo usando findOrCreate para evitar race condition
      const [newPrompt, created] = await db.Prompt.findOrCreate({
        where: { type },
        defaults: {
          type,
          content,
          createdBy: decoded.userId
        }
      });

      if (!created) {
        return response.status(400).json({ error: 'Já existe um prompt para este tipo' });
      }

      return response.status(201).json({ prompt: newPrompt });
    }

    return response.status(405).json({ error: 'Método não permitido' });
  } catch (error) {
    console.error('Erro na API de prompts:', error);
    return response.status(500).json({ error: 'Erro interno do servidor' });
  }
}
