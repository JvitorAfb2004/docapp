import formidable from 'formidable';
import fs from 'fs';
import path from 'path';
import pdfParse from 'pdf-parse';
import { authenticateToken } from '../../../lib/auth';
import { getOpenAIInstance } from '../../../lib/openai-helper';

export const config = {
  api: {
    bodyParser: false,
  },
};

// Prompt especializado para análise de DFD e extração de informações para ETP
const getPromptEspecializado = () => {
  const blocoPerguntasPath = path.join(process.cwd(), 'documentos', 'bloco-de-perguntas_dfd_para_etp.txt');
  const promptImportPath = path.join(process.cwd(), 'documentos', 'prompt-pdf-import.txt');
  const orientacoesPath = path.join(process.cwd(), 'documentos', 'orientacoes para o detalhamento.txt');
  
  const blocoPerguntasContent = fs.readFileSync(blocoPerguntasPath, 'utf-8');
  const promptImportContent = fs.readFileSync(promptImportPath, 'utf-8');
  const orientacoesContent = fs.readFileSync(orientacoesPath, 'utf-8');

  return `
${promptImportContent}

ORIENTAÇÕES TÉCNICAS:
${orientacoesContent}

BLOCOS DE PERGUNTAS PARA EXTRAÇÃO:
${blocoPerguntasContent}

INSTRUÇÃO ESPECÍFICA PARA ANÁLISE DE PDF DFD:

Você deve analisar o PDF do DFD fornecido e extrair TODAS as informações necessárias para responder as 41 perguntas dos 7 blocos.

FORMATO DE RESPOSTA OBRIGATÓRIO (JSON):
{
  "resumoDFD": {
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
  },
  "bloco1": {
    "tipoObjeto": "Bem|Serviço",
    "vigenciaContrato": "string",
    "prorrogacao": "string",
    "naturezaContratacao": "string",
    "fornecimentoContinuado": "string",
    "enderecoCompleto": "string",
    "protocoloPNCP": "string"
  },
  "bloco2": {
    "sustentabilidade": "string",
    "treinamento": "string",
    "bemLuxo": "string",
    "transicaoContratual": "string",
    "normativosEspecificos": "string",
    "amostra": "string",
    "marcaEspecifica": "string",
    "subcontratacao": "string"
  },
  "bloco3": {
    "metodologiaQuantitativo": "string",
    "descricaoDetalhada": "string",
    "serieHistorica": "string",
    "confirmacaoUnidades": "string"
  },
  "bloco4": {
    "fontesPesquisa": "string",
    "justificativaTecnica": "string",
    "justificativaEconomica": "string",
    "restricoesMercado": "string",
    "tratamentoMEEPP": "string"
  },
  "bloco5": {
    "pesquisaPrecos": "string",
    "descricaoCompleta": "string",
    "garantia": "string",
    "assistenciaTecnica": "string",
    "manutencao": "string",
    "parcelamento": "string"
  },
  "bloco6": {
    "beneficiosPretendidos": "string",
    "notaExplicativa": "string",
    "providenciasPendentes": "string",
    "gestaoFiscalizacao": "string",
    "contratacoesRelacionadas": "string"
  },
  "bloco7": {
    "impactosAmbientais": "string",
    "medidasMitigacao": "string",
    "viabilidadeContratacao": "string",
    "posicionamentoConclusivo": "string",
    "equipeElaboracao": "string",
    "dadosAprovacao": "string"
  }
}

IMPORTANTE:
1. Extraia TODAS as informações disponíveis no DFD
2. Para informações não encontradas no PDF, use "Não informado no DFD" 
3. Mantenha consistência entre dados extraídos
4. Use linguagem técnica apropriada
5. Baseie-se nas orientações dos arquivos de referência
6. Retorne APENAS o JSON, sem texto adicional
`;
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    // Verificar autenticação
    const user = await authenticateToken(req);
    if (!user) {
      return res.status(401).json({ error: 'Token inválido' });
    }

    const form = formidable({
      uploadDir: './tmp',
      keepExtensions: true,
      maxFileSize: 10 * 1024 * 1024, // 10MB
    });

    const [fields, files] = await form.parse(req);
    
    const pdfFile = files.pdf?.[0];
    if (!pdfFile) {
      return res.status(400).json({ error: 'Arquivo PDF é obrigatório' });
    }

    // Validar tipo de arquivo
    if (!pdfFile.mimetype?.includes('pdf')) {
      return res.status(400).json({ error: 'Arquivo deve ser um PDF' });
    }

    // Ler e extrair texto do PDF
    const pdfBuffer = fs.readFileSync(pdfFile.filepath);
    const pdfData = await pdfParse(pdfBuffer);
    const pdfText = pdfData.text;

    // Limpar arquivo temporário
    fs.unlinkSync(pdfFile.filepath);

    if (!pdfText || pdfText.trim().length === 0) {
      return res.status(400).json({ error: 'Não foi possível extrair texto do PDF' });
    }

    // Obter instância do OpenAI
    const openai = await getOpenAIInstance();
    if (!openai) {
      return res.status(500).json({ error: 'OpenAI não configurado' });
    }

    // Enviar para OpenAI
    const prompt = getPromptEspecializado();
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: prompt
        },
        {
          role: "user",
          content: `Analise este DFD e extraia as informações conforme solicitado:\n\n${pdfText}`
        }
      ],
      temperature: 0.1,
      max_tokens: 4000
    });

    const responseText = completion.choices[0].message.content;
    
    try {
      // Tentar fazer parse do JSON retornado pela IA
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Formato JSON não encontrado na resposta');
      }
      
      const dadosExtraidos = JSON.parse(jsonMatch[0]);
      
      return res.status(200).json({
        success: true,
        dados: dadosExtraidos,
        textoExtraido: pdfText.substring(0, 500) + '...' // Preview do texto
      });

    } catch (parseError) {
      console.error('Erro ao fazer parse da resposta da IA:', parseError);
      return res.status(500).json({ 
        error: 'Erro ao processar resposta da IA',
        detalhes: parseError.message,
        respostaIA: responseText
      });
    }

  } catch (error) {
    console.error('Erro ao processar PDF:', error);
    return res.status(500).json({ 
      error: 'Erro interno do servidor',
      detalhes: error.message 
    });
  }
}