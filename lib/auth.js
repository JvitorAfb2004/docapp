const jwt = require('jsonwebtoken');

// Chave secreta para JWT (em produção, use uma variável de ambiente)
const JWT_SECRET = process.env.JWT_SECRET || 'sua_chave_secreta_aqui';

/**
 * Middleware para verificar autenticação JWT
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next function
 */
function authenticateToken(req, res, next) {
    try {
        // Obter o token do header Authorization
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ 
                error: 'Token de autenticação não fornecido' 
            });
        }

        const token = authHeader.substring(7); // Remove 'Bearer ' do início

        // Verificar e decodificar o token
        const decoded = jwt.verify(token, JWT_SECRET);
        
        // Adicionar informações do usuário ao request
        req.user = decoded;
        
        // Se next for uma função, chamar ela (para compatibilidade com Express)
        if (typeof next === 'function') {
            next();
        }
        
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ 
                error: 'Token expirado' 
            });
        }
        
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ 
                error: 'Token inválido' 
            });
        }
        
        return res.status(500).json({ 
            error: 'Erro na verificação do token' 
        });
    }
}

/**
 * Função para gerar token JWT
 * @param {Object} payload - Dados para incluir no token
 * @returns {string} Token JWT
 */
function generateToken(payload) {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
}

/**
 * Função para verificar token JWT
 * @param {string} token - Token JWT
 * @returns {Object|null} Dados decodificados ou null se inválido
 */
function verifyToken(token) {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (error) {
        return null;
    }
}

/**
 * Função para verificar token JWT de administrador
 * @param {string} token - Token JWT
 * @param {Object} db - Instância do banco de dados
 * @returns {Object|null} Dados decodificados ou null se inválido
 */
async function verifyAdminToken(token, db) {
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        
        // Buscar usuário no banco para verificar isAdmin
        const user = await db.User.findByPk(decoded.userId);
        
        if (!user || !user.isAdmin) {
            return null;
        }
        
        return decoded;
    } catch (error) {
        return null;
    }
}

module.exports = {
    authenticateToken,
    generateToken,
    verifyToken,
    verifyAdminToken,
    JWT_SECRET
};
