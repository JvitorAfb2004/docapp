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

    const { id } = request.query;

    if (request.method === 'GET') {
      const prompt = await db.Prompt.findByPk(id);

      if (!prompt) {
        return response.status(404).json({ error: 'Prompt não encontrado' });
      }

      return response.status(200).json({ prompt });
    }

    if (request.method === 'PUT') {
      const { type, content, isActive } = request.body;

      const prompt = await db.Prompt.findByPk(id);
      if (!prompt) {
        return response.status(404).json({ error: 'Prompt não encontrado' });
      }

      // Validar tipo se fornecido
      if (type) {
        const validTypes = ['dfd', 'etp'];
        if (!validTypes.includes(type)) {
          return response.status(400).json({ error: 'Tipo de prompt inválido. Use: dfd ou etp' });
        }

        // Verificar se o novo tipo já existe em outro prompt
        if (type !== prompt.type) {
          const existingPrompt = await db.Prompt.findOne({ 
            where: { 
              type,
              id: { [db.Sequelize.Op.ne]: id } // Excluir o prompt atual da verificação
            } 
          });
          if (existingPrompt) {
            return response.status(400).json({ error: 'Já existe um prompt para este tipo' });
          }
        }
      }

      await prompt.update({
        type: type || prompt.type,
        content: content || prompt.content,
        isActive: isActive !== undefined ? isActive : prompt.isActive,
        version: prompt.version + 1
      });

      return response.status(200).json({ prompt });
    }

    if (request.method === 'DELETE') {
      const prompt = await db.Prompt.findByPk(id);

      if (!prompt) {
        return response.status(404).json({ error: 'Prompt não encontrado' });
      }

      await prompt.destroy();

      return response.status(200).json({ message: 'Prompt removido com sucesso' });
    }

    return response.status(405).json({ error: 'Método não permitido' });
  } catch (error) {
    console.error('Erro na API de prompt por ID:', error);
    return response.status(500).json({ error: 'Erro interno do servidor' });
  }
}
