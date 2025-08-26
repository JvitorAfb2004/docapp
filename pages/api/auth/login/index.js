const bcrypt = require('bcrypt');
const { connectDB } = require('../../../../lib/sequelize');
const { generateToken } = require('../../../../lib/auth');
const db = require('../../../../models');

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método não permitido' });
    }

    try {
        // Conectar ao banco de dados
        await connectDB();

        const { email, password } = req.body;

        // Validações básicas
        if (!email || !password) {
            return res.status(400).json({ 
                error: 'Email e senha são obrigatórios' 
            });
        }

        // Buscar usuário pelo email
        const user = await db.User.findOne({ where: { email } });
        if (!user) {
            return res.status(401).json({ 
                error: 'Email ou senha inválidos' 
            });
        }

        // Verificar a senha
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ 
                error: 'Email ou senha inválidos' 
            });
        }

        // Atualizar último acesso
        await user.update({ last_access: new Date() });

        // Gerar token JWT usando a função auxiliar
        const token = generateToken({ 
            userId: user.id, 
            email: user.email,
            isAdmin: Boolean(user.isAdmin) // Garantir que seja boolean
        });

        // Retornar resposta sem a senha
        const userResponse = {
            id: user.id,
            name: user.name,
            email: user.email,
            isAdmin: Boolean(user.isAdmin), // Garantir que seja boolean
            last_access: user.last_access
        };

        res.status(200).json({
            message: 'Login realizado com sucesso',
            user: userResponse,
            token
        });

    } catch (error) {
        console.error('Erro no login:', error);
        res.status(500).json({ 
            error: 'Erro interno do servidor',
            details: error.message
        });
    }
}