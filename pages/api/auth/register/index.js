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

        const { name, email, password } = req.body;

        // Validações básicas
        if (!name || !email || !password) {
            return res.status(400).json({ 
                error: 'Todos os campos são obrigatórios' 
            });
        }

        if (password.length < 6) {
            return res.status(400).json({ 
                error: 'A senha deve ter pelo menos 6 caracteres' 
            });
        }

        // Verificar se o email já existe
        const existingUser = await db.User.findOne({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ 
                error: 'Este email já está cadastrado' 
            });
        }

        // Criptografar a senha
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Criar o usuário
        const newUser = await db.User.create({
            name,
            email,
            password: hashedPassword,
            isAdmin: false, // Por padrão, novos usuários não são admin
            last_access: new Date()
        });

        // Gerar token JWT usando a função auxiliar
        const token = generateToken({ 
            userId: newUser.id, 
            email: newUser.email,
            isAdmin: newUser.isAdmin
        });

        // Retornar resposta sem a senha
        const userResponse = {
            id: newUser.id,
            name: newUser.name,
            email: newUser.email,
            isAdmin: newUser.isAdmin,
            last_access: newUser.last_access
        };

        res.status(201).json({
            message: 'Usuário criado com sucesso',
            user: userResponse,
            token
        });

    } catch (error) {
        console.error('Erro no cadastro:', error);
        res.status(500).json({ 
            error: 'Erro interno do servidor',
            details: error.message
        });
    }
}
