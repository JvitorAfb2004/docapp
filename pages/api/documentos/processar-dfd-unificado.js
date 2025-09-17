import { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';
import mammoth from 'mammoth';
import { verifyToken } from '../../../lib/auth';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    // Verificar autenticação
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Token não fornecido' });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ error: 'Token inválido' });
    }

    // Parse do arquivo
    const form = formidable({
      uploadDir: './tmp',
      keepExtensions: true,
      maxFileSize: 10 * 1024 * 1024, // 10MB
    });

    const [fields, files] = await form.parse(req);
    const docxFile = Array.isArray(files.docx) ? files.docx[0] : files.docx;

    if (!docxFile) {
      return res.status(400).json({ error: 'Arquivo DOCX não encontrado' });
    }

    // Ler o conteúdo do arquivo DOCX
    const buffer = fs.readFileSync(docxFile.filepath);
    const result = await mammoth.extractRawText({ buffer });
    const textoDFD = result.value;

    console.log('📄 Texto extraído do DFD:', textoDFD.substring(0, 500) + '...');

    // Carregar os prompts necessários
    const promptUnificadoPath = path.join(process.cwd(), 'documentos', 'prompt-unificado-dfd-etp.txt');
    const blocoPerguntasPath = path.join(process.cwd(), 'documentos', 'bloco-de-perguntas_dfd_para_etp.txt');
    const orientacoesPath = path.join(process.cwd(), 'documentos', 'orientacoes-detalhamento.txt');
    
    const promptUnificado = fs.readFileSync(promptUnificadoPath, 'utf8');
    const blocoPerguntas = fs.readFileSync(blocoPerguntasPath, 'utf8');
    const orientacoes = fs.readFileSync(orientacoesPath, 'utf8');

    // Preparar o prompt final para gerar apenas o resumo do DFD
    const promptFinal = `
${promptUnificado}

ORIENTAÇÕES TÉCNICAS:
${orientacoes}

INSTRUÇÃO ESPECÍFICA PARA ANÁLISE DE DFD:
Analise o DFD fornecido e extraia as informações básicas para criar um resumo estruturado.

FORMATO DE RESPOSTA OBRIGATÓRIO (JSON):
{
  "numero": "string",
  "orgao": "string", 
  "sgd": "string",
  "siga": "string",
  "descricaoObjeto": "string",
  "tipo": "string",
  "itens": ["string"],
  "quantidadeTotal": "string",
  "valorEstimado": "string",
  "classificacao": "string",
  "fonte": "string",
  "fiscal": "string",
  "gestor": "string",
  "demandante": "string",
  "statusPCA": "string"
}

IMPORTANTE:
1. Extraia TODAS as informações disponíveis no DFD
2. Para informações não encontradas no DFD, use "Não informado no DFD"
3. Use linguagem técnica apropriada
4. Retorne APENAS o JSON, sem texto adicional

=== TEXTO DO DFD PARA ANÁLISE ===
${textoDFD}`;

    console.log('🤖 Enviando para OpenAI...');

    // Enviar para OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "Você é um assistente especializado em processamento de documentos administrativos do setor público brasileiro. Analise o DFD fornecido e extraia/gere todas as informações necessárias para criar um ETP completo seguindo exatamente o formato JSON solicitado."
        },
        {
          role: "user",
          content: promptFinal
        }
      ],
      temperature: 0.3,
      max_tokens: 4000
    });

    const respostaIA = completion.choices[0].message.content;
    console.log('✅ Resposta da IA recebida:', respostaIA.substring(0, 200) + '...');

    // Tentar extrair JSON da resposta
    let resumoDFD;
    try {
      // Procurar por JSON na resposta
      const jsonMatch = respostaIA.match(/```json\s*([\s\S]*?)\s*```/) || 
                       respostaIA.match(/{[\s\S]*}/);
      
      if (jsonMatch) {
        const jsonString = jsonMatch[1] || jsonMatch[0];
        resumoDFD = JSON.parse(jsonString);
        console.log('✅ Resumo do DFD parseado com sucesso:', resumoDFD);
      } else {
        throw new Error('JSON não encontrado na resposta');
      }
    } catch (parseError) {
      console.error('❌ Erro ao fazer parse do JSON:', parseError);
      console.log('📄 Resposta completa da IA:', respostaIA);
      
      // Fallback: criar estrutura básica com dados do DFD
      resumoDFD = {
        numero: 'Não identificado',
        orgao: 'Não identificado',
        sgd: 'Não identificado',
        siga: 'Não identificado',
        descricaoObjeto: textoDFD.substring(0, 500),
        tipo: 'Serviço',
        itens: ['Item não especificado'],
        quantidadeTotal: '1',
        valorEstimado: 'Não informado',
        classificacao: 'Não informado',
        fonte: 'Não informado',
        fiscal: 'Não informado',
        gestor: 'Não informado',
        demandante: 'Não informado',
        statusPCA: 'Não incluído'
      };
    }

    // Limpar arquivo temporário
    fs.unlinkSync(docxFile.filepath);

    console.log('✅ Processamento concluído com sucesso');

    res.status(200).json({
      success: true,
      resumoDFD,
      textoDFD,
      message: 'DFD processado com sucesso - resumo gerado'
    });

  } catch (error) {
    console.error('❌ Erro no processamento:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: error.message 
    });
  }
}