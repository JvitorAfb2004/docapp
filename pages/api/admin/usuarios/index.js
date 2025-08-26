const db = require('../../../../models');
const { requireAdmin, rateLimit } = require('../../../../lib/security');
const { Op } = require('sequelize');

export default async function handler(request, response) {
  rateLimit(10, 60000)(request, response, async () => {
    try {
      const decoded = await requireAdmin(request, response);
      if (!decoded) return;

      if (request.method === 'GET') {
        const { search } = request.query;

        let whereClause = {};
        if (search && search.trim()) {
          whereClause = {
            [Op.or]: [
              { name: { [Op.iLike]: `%${search.trim()}%` } },
              { email: { [Op.iLike]: `%${search.trim()}%` } }
            ]
          };
        }

        const users = await db.User.findAll({
          attributes: ['id', 'name', 'email', 'isAdmin', 'last_access', 'createdAt'],
          where: whereClause,
          order: [['createdAt', 'DESC']]
        });
        const usersWithStats = await Promise.all(users.map(async (user) => {
          const documentsCount = await db.DocumentoGerado.count({
            where: {
              criadoPor: user.id,
              ativo: true
            }
          });

          const tokensUsed = await db.DocumentoGerado.sum('tokensGastos', {
            where: {
              criadoPor: user.id,
              ativo: true
            }
          }) || 0;

          const totalDownloads = await db.DocumentoGerado.sum('downloadCount', {
            where: {
              criadoPor: user.id,
              ativo: true
            }
          }) || 0;

          return {
            id: user.id,
            name: user.name,
            email: user.email,
            isAdmin: user.isAdmin,
            last_access: user.last_access,
            created_at: user.createdAt,
            documents_count: documentsCount,
            tokens_used: tokensUsed,
            total_downloads: totalDownloads
          };
        }));

        const totalUsers = users.length;
        const adminUsers = users.filter(u => u.isAdmin).length;
        const totalDocuments = usersWithStats.reduce((sum, u) => sum + u.documents_count, 0);
        const totalTokensConsumed = usersWithStats.reduce((sum, u) => sum + u.tokens_used, 0);

        console.log(`Admin buscou usuários: ${totalUsers} encontrados`);
        if (search) {
          console.log(`Filtro aplicado: "${search}"`);
        }

        return response.status(200).json({ 
          users: usersWithStats,
          stats: {
            totalUsers,
            adminUsers,
            regularUsers: totalUsers - adminUsers,
            totalDocuments,
            totalTokensConsumed
          }
        });
      }

      return response.status(405).json({ error: 'Método não permitido' });
    } catch (error) {
      console.error('Erro na API de usuários:', error);
      return response.status(500).json({ error: 'Erro interno do servidor' });
    }
  });
}