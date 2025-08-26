const crypto = require('crypto');

// Algoritmo e chave para criptografia
const ALGORITHM = 'aes-256-cbc';
const ENCRYPTION_KEY = Buffer.from(process.env.ENCRYPTION_KEY || 'your-32-char-secret-key-here-123456', 'utf8').slice(0, 32); // Garantir 32 bytes
const IV_LENGTH = 16; // Para AES, o IV é sempre 16 bytes

// Função para criptografar texto
function encrypt(text) {
  if (!text) return null;
  
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  return iv.toString('hex') + ':' + encrypted;
}

// Função para descriptografar texto
function decrypt(encryptedText) {
  if (!encryptedText) return null;
  
  const textParts = encryptedText.split(':');
  const iv = Buffer.from(textParts.shift(), 'hex');
  const encryptedData = textParts.join(':');
  
  const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  
  let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

// Função para obter a chave OpenAI descriptografada (uso interno apenas)
async function getDecryptedOpenAIKey(db, tokenId = null) {
  try {
    let token;
    
    if (tokenId) {
      token = await db.OpenAIToken.findByPk(tokenId);
    } else {
      // Buscar o token ativo mais recente
      token = await db.OpenAIToken.findOne({
        where: { isActive: true },
        order: [['lastUsed', 'DESC'], ['createdAt', 'DESC']]
      });
    }
    
    if (!token || !token.key) {
      return null;
    }
    
    return decrypt(token.key);
  } catch (error) {
    console.error('Erro ao descriptografar chave OpenAI:', error);
    return null;
  }
}

module.exports = {
  encrypt,
  decrypt,
  getDecryptedOpenAIKey
};