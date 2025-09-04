const { verifyToken, verifyAdminToken } = require('./auth');
const db = require('../models');

function sanitizeInput(input) {
  if (typeof input !== 'string') return input;
  
  return input
    .trim()
    .replace(/[<>]/g, '')
    .substring(0, 1000);
}

function validateRequiredFields(data, requiredFields) {
  const missing = [];
  
  for (const field of requiredFields) {
    if (!data[field] || (typeof data[field] === 'string' && !data[field].trim())) {
      missing.push(field);
    }
  }
  
  return missing;
}

async function requireAuth(req, res, next) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Token não fornecido' });
    }

    const decoded = await verifyToken(token);
    if (!decoded) {
      return res.status(403).json({ error: 'Token inválido ou expirado' });
    }

    req.user = decoded;
    if (typeof next === 'function') next();
    return decoded;
  } catch (error) {
    return res.status(500).json({ error: 'Erro na autenticação' });
  }
}

async function requireAdmin(req, res, next) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Token não fornecido' });
    }

    const decoded = await verifyAdminToken(token, db);
    if (!decoded) {
      return res.status(403).json({ error: 'Acesso negado. Privilégios de administrador necessários.' });
    }

    req.user = decoded;
    if (typeof next === 'function') next();
    return decoded;
  } catch (error) {
    return res.status(500).json({ error: 'Erro na verificação de privilégios' });
  }
}

async function requireDocumentOwnership(req, res, documentId, userId) {
  try {
    const documento = await db.DocumentoGerado.findOne({
      where: {
        id: documentId,
        ativo: true
      }
    });

    if (!documento) {
      return { valid: false, error: 'Documento não encontrado', status: 404 };
    }

    if (documento.criadoPor !== userId) {
      return { valid: false, error: 'Acesso negado. Você só pode acessar documentos próprios.', status: 403 };
    }

    return { valid: true, documento };
  } catch (error) {
    return { valid: false, error: 'Erro ao verificar propriedade do documento', status: 500 };
  }
}

const rateLimitMap = new Map();

function rateLimit(maxRequests = 40, windowMs = 60000) {
  return (req, res, next) => {
    const identifier = req.ip || req.connection.remoteAddress || 'unknown';
    const now = Date.now();
    
    if (!rateLimitMap.has(identifier)) {
      rateLimitMap.set(identifier, []);
    }
    
    const requests = rateLimitMap.get(identifier);
    const validRequests = requests.filter(time => now - time < windowMs);
    
    if (validRequests.length >= maxRequests) {
      return res.status(429).json({ 
        error: 'Muitas tentativas. Tente novamente em alguns instantes.' 
      });
    }
    
    validRequests.push(now);
    rateLimitMap.set(identifier, validRequests);
    
    if (typeof next === 'function') next();
  };
}

function validateFileAccess(req, res, next) {
  const { id } = req.query;
  
  if (!id || typeof id !== 'string' || !/^\d+$/.test(id)) {
    return res.status(400).json({ error: 'ID de documento inválido' });
  }
  
  if (typeof next === 'function') next();
}

module.exports = {
  sanitizeInput,
  validateRequiredFields,
  requireAuth,
  requireAdmin,
  requireDocumentOwnership,
  rateLimit,
  validateFileAccess
};