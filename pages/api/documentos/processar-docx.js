const { verifyToken } = require('../../../lib/auth');
const { sanitizeInput, rateLimit } = require('../../../lib/security');
const multer = require('multer');
const mammoth = require('mammoth');
const fs = require('fs');
const path = require('path');

// Configuração do multer para upload de arquivos
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      cb(null, true);
    } else {
      cb(new Error('Apenas arquivos DOCX são permitidos'), false);
    }
  },
});

// Middleware para processar o upload
const uploadMiddleware = upload.single('docx');

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Método não permitido' });
  }

  rateLimit(3, 300000)(request, response, async () => {
    try {
      // Verificar autenticação
      const token = request.headers.authorization?.replace('Bearer ', '');
      if (!token) return response.status(401).json({ error: 'Token não fornecido' });
      const decoded = await verifyToken(token);
      if (!decoded) return response.status(403).json({ error: 'Token inválido' });

      // Processar upload do arquivo
      uploadMiddleware(request, response, async (err) => {
        if (err) {
          console.error('❌ Erro no upload:', err);
          return response.status(400).json({ error: err.message });
        }

        if (!request.file) {
          return response.status(400).json({ error: 'Nenhum arquivo DOCX fornecido' });
        }

        try {
          console.log('📄 Processando arquivo DOCX:', request.file.originalname);
          console.log('👤 Usuário:', decoded.email);

          // Extrair texto do arquivo DOCX
          const result = await mammoth.extractRawText({ buffer: request.file.buffer });
          const extractedText = result.value;

          if (!extractedText || extractedText.trim() === '') {
            return response.status(400).json({ error: 'Não foi possível extrair texto do arquivo DOCX' });
          }

          console.log('✅ Texto extraído do DOCX com sucesso');
          console.log('📝 Tamanho do texto:', extractedText.length, 'caracteres');

          // Sanitizar o texto extraído
          const sanitizedText = sanitizeInput(extractedText);

          // Retornar o texto extraído para processamento pela IA
          return response.status(200).json({
            success: true,
            message: 'DOCX processado com sucesso!',
            dados: {
              textoExtraido: sanitizedText,
              nomeArquivo: request.file.originalname,
              tamanhoArquivo: request.file.size,
              dataProcessamento: new Date().toISOString()
            }
          });

        } catch (error) {
          console.error('❌ Erro ao processar DOCX:', error);
          return response.status(500).json({ 
            error: 'Erro ao processar arquivo DOCX', 
            details: error.message 
          });
        }
      });

    } catch (error) {
      console.error('❌ Erro geral:', error);
      return response.status(500).json({ 
        error: 'Erro interno do servidor', 
        details: error.message 
      });
    }
  });
}

// Configuração para Next.js
export const config = {
  api: {
    bodyParser: false,
  },
};
