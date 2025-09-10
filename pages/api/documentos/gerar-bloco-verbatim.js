import { NextApiRequest, NextApiResponse } from 'next';
import { verifyToken } from '../../../lib/auth';
import { getDecryptedOpenAIKey } from '../../../lib/encryption';
import db from '../../../models';
import fs from 'fs';
import path from 'path';

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

    const { textoDFD, numeroBloco, resumoDFD, documentosApoio } = req.body;

    if (!textoDFD || !numeroBloco) {
      return res.status(400).json({ error: 'Texto do DFD e número do bloco são obrigatórios' });
    }

    // Obter chave OpenAI
    const apiKey = await getDecryptedOpenAIKey(db);
    if (!apiKey) {
      throw new Error('Nenhuma chave OpenAI ativa encontrada');
    }

    // Carregar prompts verbatim
    const promptsPath = path.join(process.cwd(), 'documentos', 'prompts-verbatim-blocos.txt');
    const promptsContent = fs.readFileSync(promptsPath, 'utf8');

    // Extrair prompt específico do bloco
    const blocoSection = extractBlocoPrompt(promptsContent, numeroBloco);
    if (!blocoSection) {
      return res.status(400).json({ error: 'Prompt não encontrado para o bloco especificado' });
    }

    console.log(`🤖 Gerando Bloco ${numeroBloco} com prompt verbatim...`);

    // Preparar contexto completo
    let contextoCompleto = `DFD ANALISADO:\n${textoDFD}\n\n`;
    
    if (resumoDFD) {
      contextoCompleto += `RESUMO DO DFD:\n${JSON.stringify(resumoDFD, null, 2)}\n\n`;
    }

    if (documentosApoio && documentosApoio.length > 0) {
      contextoCompleto += `DOCUMENTOS DE APOIO:\n`;
      documentosApoio.forEach((doc, index) => {
        contextoCompleto += `Documento ${index + 1}: ${doc.conteudo}\n\n`;
      });
    }

    // Enviar para OpenAI
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'Você é um especialista em Estudos Técnicos Preliminares (ETP) para contratações públicas brasileiras. Siga exatamente as instruções fornecidas e retorne apenas o JSON solicitado.'
          },
          {
            role: 'user',
            content: `${blocoSection.promptTecnico}\n\n${blocoSection.promptResposta}\n\n${contextoCompleto}`
          }
        ],
        temperature: 0.3,
        max_tokens: 3000
      })
    });

    if (!openaiResponse.ok) {
      const error = await openaiResponse.text();
      console.error('❌ Erro na API OpenAI:', error);
      throw new Error(`Erro na API OpenAI: ${openaiResponse.statusText}`);
    }

    const result = await openaiResponse.json();
    const rawContent = result.choices[0]?.message?.content || '';

    console.log('✅ Resposta da IA recebida para bloco', numeroBloco);

    // Tentar extrair JSON da resposta
    let dadosBloco;
    try {
      const jsonMatch = rawContent.match(/```json\s*([\s\S]*?)\s*```/) || 
                       rawContent.match(/{[\s\S]*}/);
      
      if (jsonMatch) {
        const jsonString = jsonMatch[1] || jsonMatch[0];
        dadosBloco = JSON.parse(jsonString);
        console.log('✅ JSON parseado com sucesso para bloco', numeroBloco);
      } else {
        throw new Error('JSON não encontrado na resposta');
      }
    } catch (parseError) {
      console.error('❌ Erro ao fazer parse do JSON para bloco', numeroBloco, ':', parseError);
      console.log('📄 Resposta completa da IA:', rawContent);
      
      // Fallback: criar estrutura básica
      dadosBloco = createFallbackStructure(numeroBloco);
    }

    // Criar estrutura do bloco com perguntas estruturadas
    const bloco = {
      id: numeroBloco,
      titulo: blocoSection.titulo,
      perguntas: createPerguntasEstruturadas(dadosBloco, numeroBloco),
      conteudoGerado: rawContent,
      tipo: 'bloco',
      dataGeracao: new Date().toISOString()
    };

    res.status(200).json({
      success: true,
      bloco,
      message: `${blocoSection.titulo} gerado com sucesso`
    });

  } catch (error) {
    console.error('❌ Erro no processamento do bloco:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: error.message 
    });
  }
}

// Função para extrair prompt específico do bloco
function extractBlocoPrompt(promptsContent, numeroBloco) {
  const blocos = {
    1: {
      titulo: 'Bloco 1 - Características Contratuais Fundamentais',
      promptTecnico: extractSection(promptsContent, '### PROMPT TÉCNICO:', '### PROMPT DE RESPOSTA:'),
      promptResposta: extractSection(promptsContent, '### PROMPT DE RESPOSTA:', '---')
    },
    2: {
      titulo: 'Bloco 2 - Requisitos Técnicos e Regulamentares',
      promptTecnico: extractSection(promptsContent, '## BLOCO 2 - REQUISITOS TÉCNICOS E REGULAMENTARES', '### PROMPT TÉCNICO:'),
      promptResposta: extractSection(promptsContent, '### PROMPT DE RESPOSTA:', '---')
    },
    3: {
      titulo: 'Bloco 3 - Dimensionamento Quantitativo',
      promptTecnico: extractSection(promptsContent, '## BLOCO 3 - DIMENSIONAMENTO QUANTITATIVO', '### PROMPT TÉCNICO:'),
      promptResposta: extractSection(promptsContent, '### PROMPT DE RESPOSTA:', '---')
    },
    4: {
      titulo: 'Bloco 4 - Análise de Mercado e Viabilidade',
      promptTecnico: extractSection(promptsContent, '## BLOCO 4 - ANÁLISE DE MERCADO E VIABILIDADE', '### PROMPT TÉCNICO:'),
      promptResposta: extractSection(promptsContent, '### PROMPT DE RESPOSTA:', '---')
    },
    5: {
      titulo: 'Bloco 5 - Solução Técnica Detalhada',
      promptTecnico: extractSection(promptsContent, '## BLOCO 5 - SOLUÇÃO TÉCNICA DETALHADA', '### PROMPT TÉCNICO:'),
      promptResposta: extractSection(promptsContent, '### PROMPT DE RESPOSTA:', '---')
    },
    6: {
      titulo: 'Bloco 6 - Resultados e Gestão',
      promptTecnico: extractSection(promptsContent, '## BLOCO 6 - RESULTADOS E GESTÃO', '### PROMPT TÉCNICO:'),
      promptResposta: extractSection(promptsContent, '### PROMPT DE RESPOSTA:', '---')
    },
    7: {
      titulo: 'Bloco 7 - Aspectos Complementares e Finalizações',
      promptTecnico: extractSection(promptsContent, '## BLOCO 7 - ASPECTOS COMPLEMENTARES E FINALIZAÇÕES', '### PROMPT TÉCNICO:'),
      promptResposta: extractSection(promptsContent, '### PROMPT DE RESPOSTA:', '---')
    }
  };

  return blocos[numeroBloco];
}

// Função para extrair seção do texto
function extractSection(content, startMarker, endMarker) {
  const startIndex = content.indexOf(startMarker);
  if (startIndex === -1) {
    console.log(`Marcador não encontrado: ${startMarker}`);
    return null;
  }

  const endIndex = content.indexOf(endMarker, startIndex);
  const section = content.substring(startIndex, endIndex === -1 ? content.length : endIndex);
  
  // Remover o marcador inicial e limpar
  let result = section.replace(startMarker, '').trim();
  
  // Se encontrou marcador final, remover também
  if (endIndex !== -1) {
    result = result.replace(endMarker, '').trim();
  }
  
  return result;
}

// Função para criar estrutura de fallback
function createFallbackStructure(numeroBloco) {
  const estruturas = {
    1: {
      tipoObjeto: 'Serviço',
      vigenciaContrato: 'Não informado no DFD',
      prorrogacao: 'Não informado no DFD',
      naturezaContratacao: 'Não informado no DFD',
      fornecimentoContinuado: 'Não informado no DFD',
      enderecoCompleto: 'Não informado no DFD',
      protocoloPNCP: 'Não informado no DFD'
    },
    2: {
      sustentabilidade: 'Não informado no DFD',
      treinamento: 'Não informado no DFD',
      bemLuxo: 'Não informado no DFD',
      transicaoContratual: 'Não informado no DFD',
      normativosEspecificos: 'Não informado no DFD',
      amostra: 'Não informado no DFD',
      marcaEspecifica: 'Não informado no DFD',
      subcontratacao: 'Não informado no DFD'
    },
    3: {
      metodologiaQuantitativo: 'Não informado no DFD',
      descricaoDetalhada: 'Não informado no DFD',
      serieHistorica: 'Não informado no DFD',
      confirmacaoUnidades: 'Não informado no DFD'
    },
    4: {
      fontesPesquisa: 'Não informado no DFD',
      justificativaTecnica: 'Não informado no DFD',
      justificativaEconomica: 'Não informado no DFD',
      restricoesMercado: 'Não informado no DFD',
      tratamentoMEEPP: 'Não informado no DFD'
    },
    5: {
      pesquisaPrecos: 'Não informado no DFD',
      descricaoCompleta: 'Não informado no DFD',
      garantia: 'Não informado no DFD',
      assistenciaTecnica: 'Não informado no DFD',
      manutencao: 'Não informado no DFD',
      parcelamento: 'Não informado no DFD'
    },
    6: {
      beneficiosPretendidos: 'Não informado no DFD',
      notaExplicativa: 'Não informado no DFD',
      providenciasPendentes: 'Não informado no DFD',
      gestaoFiscalizacao: 'Não informado no DFD',
      contratacoesRelacionadas: 'Não informado no DFD'
    }
  };

  return estruturas[numeroBloco] || {};
}

// Função para criar perguntas estruturadas baseadas no estudo de referência
function createPerguntasEstruturadas(dadosBloco, numeroBloco) {
  const perguntas = [];
  
  // Mapeamento das perguntas por bloco baseado no estudo de referência
  const perguntasPorBloco = {
    1: [
      { campo: 'tipoObjeto', label: 'Qual o tipo de objeto da contratação?', type: 'checkbox', opcoes: ['Bem', 'Serviço'] },
      { campo: 'vigenciaContrato', label: 'Qual a vigência estimada do contrato?', type: 'text' },
      { campo: 'prorrogacao', label: 'É possível prorrogar o contrato?', type: 'checkbox', opcoes: ['Sim', 'Não', 'Não se aplica'] },
      { campo: 'naturezaContratacao', label: 'Qual a natureza da contratação?', type: 'checkbox', opcoes: ['Continuada sem monopólio', 'Continuada com monopólio', 'Não continuada'] },
      { campo: 'fornecimentoContinuado', label: 'O fornecimento/serviço é continuado?', type: 'checkbox', opcoes: ['Sim', 'Não'] },
      { campo: 'enderecoCompleto', label: 'Qual o endereço completo de execução?', type: 'text' },
      { campo: 'protocoloPNCP', label: 'Qual o número do protocolo PNCP?', type: 'text' }
    ],
    2: [
      { campo: 'sustentabilidade', label: 'Há critérios de sustentabilidade aplicáveis?', type: 'checkbox', opcoes: ['Sim', 'Não'] },
      { campo: 'treinamento', label: 'Haverá necessidade de capacitação/treinamento?', type: 'checkbox', opcoes: ['Sim', 'Não'] },
      { campo: 'bemLuxo', label: 'O objeto se caracteriza como bem de luxo (Decreto 10.818/2021)?', type: 'checkbox', opcoes: ['Sim', 'Não'] },
      { campo: 'transicaoContratual', label: 'Será necessária transição contratual?', type: 'checkbox', opcoes: ['Sim', 'Não'] },
      { campo: 'normativosEspecificos', label: 'Há normativos específicos aplicáveis (NBR, NR, resoluções)?', type: 'checkbox', opcoes: ['Sim', 'Não'] },
      { campo: 'amostra', label: 'Será exigida amostra ou prova de conceito?', type: 'checkbox', opcoes: ['Sim', 'Não'] },
      { campo: 'marcaEspecifica', label: 'Há exigência de marca específica?', type: 'checkbox', opcoes: ['Sim', 'Não'] },
      { campo: 'subcontratacao', label: 'É permitida subcontratação?', type: 'checkbox', opcoes: ['Sim', 'Não'] }
    ],
    3: [
      { campo: 'metodologiaQuantitativo', label: 'Qual a metodologia utilizada para o dimensionamento quantitativo?', type: 'text' },
      { campo: 'descricaoDetalhada', label: 'Como foi calculado o dimensionamento de cada item?', type: 'text' },
      { campo: 'serieHistorica', label: 'Existe série histórica de consumo/necessidade?', type: 'checkbox', opcoes: ['Sim', 'Não'] },
      { campo: 'confirmacaoUnidades', label: 'As unidades e quantidades estão corretas?', type: 'text' }
    ],
    4: [
      { campo: 'fontesPesquisa', label: 'Quais foram as fontes de pesquisa de mercado utilizadas?', type: 'text' },
      { campo: 'justificativaTecnica', label: 'Qual a justificativa técnica da solução escolhida?', type: 'text' },
      { campo: 'justificativaEconomica', label: 'Qual a justificativa econômica da contratação?', type: 'text' },
      { campo: 'restricoesMercado', label: 'Existem restrições no mercado fornecedor?', type: 'checkbox', opcoes: ['Sim', 'Não'] },
      { campo: 'tratamentoMEEPP', label: 'É aplicável o tratamento diferenciado para ME/EPP?', type: 'checkbox', opcoes: ['Sim', 'Não'] }
    ],
    5: [
      { campo: 'pesquisaPrecos', label: 'Qual a metodologia de pesquisa de preços utilizada?', type: 'text' },
      { campo: 'descricaoCompleta', label: 'Qual a descrição completa da contratação?', type: 'text' },
      { campo: 'garantia', label: 'Quais os requisitos de garantia?', type: 'text' },
      { campo: 'assistenciaTecnica', label: 'É necessária assistência técnica?', type: 'checkbox', opcoes: ['Sim', 'Não'] },
      { campo: 'manutencao', label: 'É necessária manutenção?', type: 'checkbox', opcoes: ['Sim', 'Não'] },
      { campo: 'parcelamento', label: 'É possível parcelar a contratação?', type: 'checkbox', opcoes: ['Sim', 'Não'] }
    ],
    6: [
      { campo: 'beneficiosPretendidos', label: 'Quais os benefícios pretendidos com a contratação?', type: 'text' },
      { campo: 'notaExplicativa', label: 'Qual a nota explicativa dos resultados esperados?', type: 'text' },
      { campo: 'providenciasPendentes', label: 'Existem providências pendentes antes da contratação?', type: 'checkbox', opcoes: ['Sim', 'Não'] },
      { campo: 'gestaoFiscalizacao', label: 'Quais as competências de gestão e fiscalização do contrato?', type: 'text' },
      { campo: 'contratacoesRelacionadas', label: 'Existem contratações relacionadas?', type: 'checkbox', opcoes: ['Sim', 'Não'] }
    ],
    7: [
      { campo: 'impactosAmbientais', label: 'Há previsão de impactos ambientais?', type: 'checkbox', opcoes: ['Sim', 'Não'] },
      { campo: 'medidasMitigacao', label: 'Quais medidas de mitigação ambiental serão adotadas?', type: 'text' },
      { campo: 'viabilidade', label: 'A contratação possui viabilidade técnica, socioeconômica e ambiental?', type: 'checkbox', opcoes: ['Sim', 'Não'] },
      { campo: 'posicionamentoConclusivo', label: 'Forneça posicionamento conclusivo detalhado sobre a adequação da contratação.', type: 'text' },
      { campo: 'responsaveisTecnicos', label: 'Quem são os responsáveis técnicos pela elaboração do ETP?', type: 'text' },
      { campo: 'ordenadorDespesa', label: 'Quais os dados do ordenador de despesa?', type: 'text' }
    ]
  };

  const perguntasBloco = perguntasPorBloco[numeroBloco] || [];
  
  perguntasBloco.forEach((pergunta, index) => {
    const valor = dadosBloco[pergunta.campo] || '';
    
    // Determinar valor correto para checkbox
    let valorCheckbox = '';
    if (pergunta.type === 'checkbox') {
      if (pergunta.opcoes.includes(valor)) {
        valorCheckbox = valor;
      } else {
        // Se o valor não está nas opções, usar "Não" como padrão
        valorCheckbox = 'Não';
      }
    }
    
    const perguntaEstruturada = {
      id: `${numeroBloco}_${pergunta.campo}`,
      label: pergunta.label,
      type: pergunta.type,
      order: index + 1,
      opcoes: pergunta.opcoes || [],
      value: {
        text: pergunta.type === 'text' ? valor : '',
        checkbox: valorCheckbox
      }
    };
    
    perguntas.push(perguntaEstruturada);
  });

  return perguntas.sort((a, b) => a.order - b.order);
}

// Função para formatar label
function formatLabel(campo) {
  return campo
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();
}

// Função para determinar tipo do campo
function determineType(campo, valor) {
  // Campos que devem ser checkbox
  const checkboxFields = [
    'sustentabilidade', 'treinamento', 'bemLuxo', 'transicaoContratual',
    'normativosEspecificos', 'amostra', 'marcaEspecifica', 'subcontratacao',
    'prorrogacao', 'fornecimentoContinuado', 'assistenciaTecnica', 'manutencao',
    'parcelamento', 'providenciasPendentes', 'contratacoesRelacionadas'
  ];

  if (checkboxFields.some(field => campo.toLowerCase().includes(field))) {
    return 'checkbox';
  }

  return 'text';
}
