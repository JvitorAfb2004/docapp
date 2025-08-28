const { verifyToken } = require('../../../lib/auth');
const { rateLimit } = require('../../../lib/security');
const { getDecryptedOpenAIKey } = require('../../../lib/encryption');
const multer = require('multer');
const mammoth = require('mammoth');
const fs = require('fs');
const path = require('path');
const db = require('../../../models');

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

// Função para enviar arquivo diretamente para OpenAI (como ChatGPT)
async function processDocxWithOpenAI(fileBuffer, fileName) {
  const apiKey = await getDecryptedOpenAIKey(db);
  if (!apiKey) {
    throw new Error('Nenhuma chave OpenAI ativa encontrada');
  }

  // Carregar prompt específico para DFD
  const dfdPromptPath = path.join(process.cwd(), 'documentos', 'prompt-dfd-import.txt');
  let prompt = '';
  if (fs.existsSync(dfdPromptPath)) {
    prompt = fs.readFileSync(dfdPromptPath, 'utf8');
  } else {
    prompt = `Analise este documento DFD (Documento de Formalização de Demanda) e extraia todas as informações relevantes em formato JSON. Retorne APENAS o JSON válido com os campos estruturados.`;
  }

  console.log('📄 Enviando arquivo DOCX diretamente para OpenAI...');

  try {
    // Extrair texto do DOCX primeiro (similar ao que o ChatGPT faz internamente)
    const textResult = await mammoth.extractRawText({ buffer: fileBuffer });
    const documentText = textResult.value;

    if (!documentText || documentText.trim() === '') {
      throw new Error('Não foi possível extrair texto do arquivo DOCX');
    }

    console.log('📝 Texto extraído do DOCX:', documentText.length, 'caracteres');

    // Enviar para OpenAI como se fosse uma conversa do ChatGPT
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4-turbo',
        messages: [
          {
            role: 'system',
            content: 'Você é um especialista em análise de documentos administrativos brasileiros. Retorne APENAS JSON válido, sem texto adicional, comentários ou explicações.'
          },
          {
            role: 'user',
            content: `${prompt}\n\nTEXTO DO DOCUMENTO DFD:\n\n${documentText}`
          }
        ],
        temperature: 0.1,
        max_tokens: 3000
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('❌ Erro na API OpenAI:', error);
      throw new Error(`Erro na API OpenAI: ${response.statusText}`);
    }

    const result = await response.json();
    const content = result.choices[0]?.message?.content || '';

    console.log('📄 Resposta bruta da OpenAI:', content);

    // Fazer parse do JSON retornado
    try {
      let cleanContent = content.trim();
      const startIndex = cleanContent.indexOf('{');
      const lastIndex = cleanContent.lastIndexOf('}');
      if (startIndex !== -1 && lastIndex !== -1) {
        cleanContent = cleanContent.substring(startIndex, lastIndex + 1);
      }

      const parsedData = JSON.parse(cleanContent);
      console.log('✅ Dados extraídos com sucesso pela OpenAI:', parsedData);
      
      return {
        success: true,
        data: parsedData,
        usage: result.usage,
        model: result.model
      };
    } catch (parseError) {
      console.error('❌ Erro ao fazer parse do JSON:', parseError);
      console.log('📄 Resposta que causou erro:', content);
      throw new Error('Resposta da IA não é um JSON válido');
    }

  } catch (error) {
    console.error('❌ Erro no processamento com OpenAI:', error);
    throw error;
  }
}

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
          console.log('📄 Processando arquivo DOCX diretamente com OpenAI:', request.file.originalname);
          console.log('👤 Usuário:', decoded.email);

          // Enviar arquivo diretamente para OpenAI (como ChatGPT)
          const result = await processDocxWithOpenAI(request.file.buffer, request.file.originalname);

          if (!result.success) {
            throw new Error('Falha no processamento com OpenAI');
          }

          // Salvar resultado no banco de dados
          const documento = await db.DocumentoGerado.create({
            tipo: 'DFD',
            numeroSGD: result.data.numeroSGD || null,
            numeroDFD: result.data.numeroDFD || null,
            numeroETP: null,
            dadosProcessados: result.data,
            dadosOriginais: { fileName: request.file.originalname, size: request.file.size },
            status: 'processado',
            tokensGastos: result.usage?.total_tokens || 0,
            modeloIA: result.model || 'gpt-4-turbo',
            criadoPor: decoded.userId,
            dataProcessamento: new Date(),
            ativo: true,
            downloadCount: 0
          });

          console.log('✅ DFD processado diretamente pela OpenAI e salvo (ID:', documento.id, ')');

          // Retornar dados processados
          return response.status(200).json({
            success: true,
            message: 'DFD processado diretamente pela OpenAI com sucesso!',
            dadosProcessados: result.data,
            documento: {
              id: documento.id,
              tipo: 'DFD',
              numeroSGD: result.data.numeroSGD,
              numeroDFD: result.data.numeroDFD,
              status: 'processado',
              dataProcessamento: documento.dataProcessamento
            },
            processamento: {
              usouIA: true,
              tokensGastos: result.usage?.total_tokens || 0,
              modeloIA: result.model || 'gpt-4-turbo',
              metodo: 'direto_openai'
            }
          });

        } catch (error) {
          console.error('❌ Erro ao processar DOCX com OpenAI:', error);
          return response.status(500).json({ 
            error: 'Erro ao processar arquivo DOCX com OpenAI', 
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