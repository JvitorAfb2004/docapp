const { connectDB } = require('../../../../lib/sequelize');
const { authenticateToken } = require('../../../../lib/auth');
const db = require('../../../../models');

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Método não permitido' });
    }

    // Usar o middleware de autenticação
    authenticateToken(req, res, async () => {
        try {
            // Conectar ao banco de dados
            await connectDB();

            // Buscar usuário pelo ID do token (já verificado pelo middleware)
            const user = await db.User.findByPk(req.user.userId);
            if (!user) {
                return res.status(404).json({ 
                    error: 'Usuário não encontrado' 
                });
            }

            // Retornar apenas o status de admin
            res.status(200).json({
                isAdmin: user.isAdmin
            });

        } catch (error) {
            console.error('Erro ao verificar status de admin:', error);
            res.status(500).json({ 
                error: 'Erro interno do servidor',
                details: error.message
            });
        }
    });
}
