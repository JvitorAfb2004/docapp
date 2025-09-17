import { NextApiRequest, NextApiResponse } from 'next';
import { verifyToken } from '../../../lib/auth';
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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

    const { textoDFD, numeroBloco, resumoDFD } = req.body;

    if (!textoDFD || !numeroBloco) {
      return res.status(400).json({ error: 'Texto do DFD e número do bloco são obrigatórios' });
    }

    // Carregar orientações técnicas
    const orientacoesPath = path.join(process.cwd(), 'documentos', 'orientacoes-detalhamento.txt');
    const orientacoes = fs.readFileSync(orientacoesPath, 'utf8');

    // Definir prompts específicos para cada bloco
    const promptsBlocos = {
      1: {
        titulo: 'Bloco 1 - Características Contratuais Fundamentais',
        prompt: `
ORIENTAÇÕES TÉCNICAS PARA DETALHAMENTO:
${orientacoes}

BLOCO 1 - CARACTERÍSTICAS CONTRATUAIS FUNDAMENTAIS

Você é um especialista em contratações públicas. Analise o DFD e gere respostas técnicas detalhadas para cada campo, seguindo as orientações de densidade textual e fundamentação técnica.

INSTRUÇÕES ESPECÍFICAS:
1. Use linguagem técnica da administração pública
2. Fundamente cada resposta com base no contexto do DFD
3. Para campos não informados, gere justificativas técnicas apropriadas
4. Mantenha consistência com a Lei 14.133/2021
5. Use terminologia específica da área de contratação

CAMPOS A PREENCHER:

1. TIPO DE OBJETO: Identifique se é "Bem" ou "Serviço" baseado na descrição
2. VIGÊNCIA DO CONTRATO: Estime prazo adequado baseado na complexidade e natureza
3. PRORROGAÇÃO: Analise se o objeto permite prorrogação e justifique
4. NATUREZA DA CONTRATAÇÃO: Identifique se é comum, especial, emergencial, etc.
5. FORNECIMENTO/SERVIÇO CONTINUADO: Determine se é continuado ou pontual
6. ENDEREÇO COMPLETO DE EXECUÇÃO: Extraia ou infira local de execução
7. NÚMERO DO PROTOCOLO PNCP: Informe se disponível no DFD

FORMATO DE RESPOSTA OBRIGATÓRIO (JSON):
{
  "tipoObjeto": "Bem|Serviço",
  "vigenciaContrato": "Descrição técnica detalhada da vigência com justificativa",
  "prorrogacao": "Análise técnica sobre possibilidade de prorrogação com fundamentação",
  "naturezaContratacao": "Classificação técnica da natureza com justificativa legal",
  "fornecimentoContinuado": "Análise sobre continuidade do fornecimento/serviço",
  "enderecoCompleto": "Endereço completo de execução ou localização técnica",
  "protocoloPNCP": "Número do protocolo PNCP ou justificativa para ausência"
}

CRITÉRIOS DE QUALIDADE:
- Cada resposta deve ter 2-3 linhas de texto técnico
- Use terminologia específica da administração pública
- Fundamente com base em normas e regulamentos
- Mantenha consistência com o contexto do DFD

=== TEXTO DO DFD PARA ANÁLISE ===
${textoDFD}`
      },
      2: {
        titulo: 'Bloco 2 - Requisitos Técnicos e Regulamentares',
        prompt: `
ORIENTAÇÕES TÉCNICAS PARA DETALHAMENTO:
${orientacoes}

BLOCO 2 - REQUISITOS TÉCNICOS E REGULAMENTARES

Você é um especialista em requisitos técnicos e regulamentares para contratações públicas. Analise o DFD e gere análises técnicas detalhadas para cada aspecto regulamentar.

INSTRUÇÕES ESPECÍFICAS:
1. Analise cada requisito com base na natureza do objeto contratual
2. Considere normas técnicas, ambientais e de sustentabilidade aplicáveis
3. Avalie aspectos de capacitação e treinamento necessários
4. Identifique restrições legais e regulamentares
5. Use terminologia técnica específica de cada área

CAMPOS A ANALISAR:

1. CRITÉRIOS DE SUSTENTABILIDADE: Analise requisitos ambientais, sociais e econômicos
2. NECESSIDADE DE TREINAMENTO: Avalie capacitação técnica necessária para execução
3. BEM DE LUXO: Determine se o objeto se enquadra como bem de luxo
4. TRANSIÇÃO CONTRATUAL: Analise necessidade de transição entre contratos
5. NORMATIVOS ESPECÍFICOS: Identifique normas técnicas e regulamentares aplicáveis
6. AMOSTRA OU PROVA DE CONCEITO: Avalie necessidade de demonstração técnica
7. MARCA ESPECÍFICA: Determine se há exigência de marca específica
8. SUBCONTRATAÇÃO: Analise possibilidade e restrições de subcontratação

FORMATO DE RESPOSTA OBRIGATÓRIO (JSON):
{
  "sustentabilidade": "Análise técnica detalhada dos critérios de sustentabilidade aplicáveis com fundamentação normativa",
  "treinamento": "Avaliação técnica da necessidade de capacitação com especificação de requisitos",
  "bemLuxo": "Análise técnica sobre classificação como bem de luxo com justificativa legal",
  "transicaoContratual": "Avaliação técnica sobre necessidade de transição contratual com fundamentação",
  "normativosEspecificos": "Identificação técnica de normas e regulamentos aplicáveis com referências",
  "amostra": "Análise técnica sobre necessidade de amostra ou prova de conceito com justificativa",
  "marcaEspecifica": "Avaliação técnica sobre exigência de marca específica com fundamentação legal",
  "subcontratacao": "Análise técnica sobre possibilidade de subcontratação com restrições aplicáveis"
}

CRITÉRIOS DE QUALIDADE:
- Cada resposta deve ter 2-4 linhas de análise técnica
- Cite normas e regulamentos específicos quando aplicável
- Fundamente com base na natureza do objeto contratual
- Use terminologia técnica apropriada para cada área

=== TEXTO DO DFD PARA ANÁLISE ===
${textoDFD}`
      },
      3: {
        titulo: 'Bloco 3 - Dimensionamento Quantitativo',
        prompt: `
ORIENTAÇÕES TÉCNICAS PARA DETALHAMENTO:
${orientacoes}

BLOCO 3 - DIMENSIONAMENTO QUANTITATIVO

Você é um especialista em dimensionamento quantitativo para contratações públicas. Analise o DFD e gere análises técnicas detalhadas sobre o dimensionamento, baseando-se na tabela de itens e especificações técnicas.

INSTRUÇÕES ESPECÍFICAS:
1. Analise a tabela de itens do DFD para extrair quantidades e especificações
2. Desenvolva metodologia de cálculo baseada na natureza do objeto
3. Considere aspectos operacionais e de demanda
4. Use dados históricos quando disponíveis ou gere estimativas técnicas
5. Fundamente com base em critérios técnicos e operacionais

CAMPOS A DESENVOLVER:

1. METODOLOGIA DO QUANTITATIVO: Desenvolva metodologia técnica de cálculo das quantidades
2. DESCRIÇÃO DETALHADA DO DIMENSIONAMENTO: Detalhe como foi calculado cada item
3. SÉRIE HISTÓRICA: Analise dados históricos ou gere estimativas baseadas em parâmetros técnicos
4. CONFIRMAÇÃO DE UNIDADES E QUANTIDADES: Valide e confirme as unidades e quantidades especificadas

FORMATO DE RESPOSTA OBRIGATÓRIO (JSON):
{
  "metodologiaQuantitativo": "Metodologia técnica detalhada para cálculo das quantidades com fundamentação em critérios operacionais e técnicos específicos da área",
  "descricaoDetalhada": "Descrição técnica detalhada do dimensionamento com análise de cada item, considerando especificações técnicas e requisitos operacionais",
  "serieHistorica": "Análise de série histórica com dados de consumo/necessidade ou estimativas técnicas baseadas em parâmetros operacionais e de demanda",
  "confirmacaoUnidades": "Confirmação técnica das unidades e quantidades com validação baseada em especificações técnicas e requisitos operacionais"
}

CRITÉRIOS DE QUALIDADE:
- Cada resposta deve ter 3-5 linhas de análise técnica detalhada
- Use dados da tabela de itens do DFD como base
- Fundamente com critérios técnicos e operacionais
- Considere aspectos de demanda e capacidade operacional
- Use terminologia técnica específica de dimensionamento

=== TEXTO DO DFD PARA ANÁLISE ===
${textoDFD}`
      },
      4: {
        titulo: 'Bloco 4 - Análise de Mercado e Viabilidade',
        prompt: `
ORIENTAÇÕES TÉCNICAS PARA DETALHAMENTO:
${orientacoes}

BLOCO 4 - ANÁLISE DE MERCADO E VIABILIDADE

Você é um especialista em análise de mercado e viabilidade para contratações públicas. Desenvolva análises técnicas detalhadas sobre viabilidade técnica e econômica, baseando-se nas especificações do DFD.

INSTRUÇÕES ESPECÍFICAS:
1. Desenvolva análise de mercado baseada na natureza do objeto contratual
2. Elabore justificativas técnicas fundamentadas em critérios técnicos
3. Analise viabilidade econômica com base no valor e benefícios esperados
4. Identifique restrições de mercado e alternativas disponíveis
5. Considere aspectos de tratamento diferenciado para ME/EPP

CAMPOS A DESENVOLVER:

1. FONTES DE PESQUISA: Identifique fontes de pesquisa de mercado relevantes
2. JUSTIFICATIVA TÉCNICA: Desenvolva justificativa técnica detalhada da solução escolhida
3. JUSTIFICATIVA ECONÔMICA: Elabore análise econômica com relação custo-benefício
4. RESTRIÇÕES DE MERCADO: Identifique limitações e restrições do mercado fornecedor
5. TRATAMENTO DIFERENCIADO PARA ME/EPP: Analise possibilidade e benefícios para ME/EPP

FORMATO DE RESPOSTA OBRIGATÓRIO (JSON):
{
  "fontesPesquisa": "Identificação técnica detalhada das fontes de pesquisa de mercado com especificação de bases de dados, consultas a fornecedores e análises setoriais relevantes",
  "justificativaTecnica": "Justificativa técnica detalhada da solução escolhida com análise de adequação às especificações, conformidade normativa e vantagens técnicas diferenciais",
  "justificativaEconomica": "Análise econômica detalhada com relação custo-benefício, comparação de alternativas, eficiência do investimento e sustentabilidade financeira",
  "restricoesMercado": "Identificação técnica de restrições e limitações do mercado fornecedor com análise de alternativas disponíveis e riscos de suprimento",
  "tratamentoMEEPP": "Análise técnica sobre tratamento diferenciado para ME/EPP com avaliação de possibilidade, benefícios e impactos na competitividade"
}

CRITÉRIOS DE QUALIDADE:
- Cada resposta deve ter 3-5 linhas de análise técnica detalhada
- Use dados do DFD como base para análise
- Fundamente com critérios técnicos e econômicos
- Considere aspectos de mercado e competitividade
- Use terminologia técnica específica de análise de mercado

=== TEXTO DO DFD PARA ANÁLISE ===
${textoDFD}`
      },
      5: {
        titulo: 'Bloco 5 - Solução Técnica Detalhada',
        prompt: `
ORIENTAÇÕES TÉCNICAS PARA DETALHAMENTO:
${orientacoes}

BLOCO 5 - SOLUÇÃO TÉCNICA DETALHADA

Você é um especialista em soluções técnicas para contratações públicas. Desenvolva descrições técnicas detalhadas da solução contratual, baseando-se nas especificações e requisitos do DFD.

INSTRUÇÕES ESPECÍFICAS:
1. Desenvolva descrição técnica completa da solução contratual
2. Analise aspectos de pesquisa de preços e metodologia de cálculo
3. Especifique requisitos de garantia, assistência técnica e manutenção
4. Avalie possibilidade de parcelamento e condições de pagamento
5. Use terminologia técnica específica da área de contratação

CAMPOS A DESENVOLVER:

1. PESQUISA DE PREÇOS: Desenvolva metodologia de pesquisa de preços com fontes e critérios
2. DESCRIÇÃO COMPLETA DA CONTRATAÇÃO: Elabore descrição técnica detalhada do escopo contratual
3. GARANTIA: Especifique requisitos técnicos de garantia com prazos e condições
4. ASSISTÊNCIA TÉCNICA: Defina requisitos de assistência técnica com especificações
5. MANUTENÇÃO: Especifique requisitos de manutenção com cronograma e condições
6. PARCELAMENTO: Analise possibilidade de parcelamento com justificativa técnica

FORMATO DE RESPOSTA OBRIGATÓRIO (JSON):
{
  "pesquisaPrecos": "Metodologia técnica detalhada de pesquisa de preços com especificação de fontes, critérios de comparação e análise de mercado fornecedor",
  "descricaoCompleta": "Descrição técnica completa da contratação com especificação detalhada do escopo, características técnicas, condições de execução e entregáveis",
  "garantia": "Especificação técnica detalhada dos requisitos de garantia com prazos, condições, cobertura e responsabilidades técnicas",
  "assistenciaTecnica": "Definição técnica detalhada dos requisitos de assistência técnica com especificações de suporte, capacitação e acompanhamento técnico",
  "manutencao": "Especificação técnica detalhada dos requisitos de manutenção com cronograma, condições, procedimentos e responsabilidades técnicas",
  "parcelamento": "Análise técnica detalhada sobre possibilidade de parcelamento com justificativa econômica, condições de pagamento e impactos financeiros"
}

CRITÉRIOS DE QUALIDADE:
- Cada resposta deve ter 3-5 linhas de especificação técnica detalhada
- Use dados do DFD como base para especificações
- Fundamente com critérios técnicos e operacionais
- Considere aspectos de execução e manutenção
- Use terminologia técnica específica de soluções contratuais

=== TEXTO DO DFD PARA ANÁLISE ===
${textoDFD}`
      },
      6: {
        titulo: 'Bloco 6 - Resultados e Gestão',
        prompt: `
ORIENTAÇÕES TÉCNICAS PARA DETALHAMENTO:
${orientacoes}

BLOCO 6 - RESULTADOS E GESTÃO

Você é um especialista em gestão de resultados e fiscalização de contratações públicas. Desenvolva análises técnicas detalhadas sobre resultados esperados, gestão e fiscalização, baseando-se nas especificações do DFD.

INSTRUÇÕES ESPECÍFICAS:
1. Desenvolva análise detalhada dos benefícios e resultados esperados
2. Elabore nota explicativa técnica sobre os resultados da contratação
3. Identifique providências pendentes e requisitos de gestão
4. Especifique competências e responsabilidades de gestão e fiscalização
5. Analise contratações relacionadas e dependências

CAMPOS A DESENVOLVER:

1. BENEFÍCIOS PRETENDIDOS: Desenvolva análise detalhada dos benefícios esperados
2. NOTA EXPLICATIVA DOS RESULTADOS: Elabore nota técnica explicativa sobre os resultados
3. PROVIDÊNCIAS PENDENTES: Identifique providências e requisitos pendentes
4. GESTÃO E FISCALIZAÇÃO: Especifique competências e responsabilidades técnicas
5. CONTRATAÇÕES RELACIONADAS: Analise contratações relacionadas e dependências

FORMATO DE RESPOSTA OBRIGATÓRIO (JSON):
{
  "beneficiosPretendidos": "Análise técnica detalhada dos benefícios pretendidos com especificação de impactos operacionais, melhorias de eficiência e contribuições para objetivos institucionais",
  "notaExplicativa": "Nota técnica explicativa detalhada dos resultados esperados com fundamentação em critérios de eficiência, eficácia e efetividade da contratação",
  "providenciasPendentes": "Identificação técnica detalhada de providências pendentes com especificação de requisitos, prazos e responsabilidades para implementação",
  "gestaoFiscalizacao": "Especificação técnica detalhada das competências de gestão e fiscalização com definição de responsabilidades, qualificações e atividades técnicas",
  "contratacoesRelacionadas": "Análise técnica detalhada de contratações relacionadas com identificação de dependências, interfaces e impactos em outras contratações"
}

CRITÉRIOS DE QUALIDADE:
- Cada resposta deve ter 3-5 linhas de análise técnica detalhada
- Use dados do DFD como base para análise
- Fundamente com critérios de gestão e fiscalização
- Considere aspectos de resultados e impactos
- Use terminologia técnica específica de gestão de resultados

=== TEXTO DO DFD PARA ANÁLISE ===
${textoDFD}`
      }
    };

    const promptBloco = promptsBlocos[numeroBloco];
    if (!promptBloco) {
      return res.status(400).json({ error: 'Número do bloco inválido' });
    }

    console.log(`🤖 Gerando ${promptBloco.titulo}...`);

    // Enviar para OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "Você é um assistente especializado em processamento de documentos administrativos do setor público brasileiro. Analise o DFD fornecido e extraia as informações necessárias para o bloco específico seguindo exatamente o formato JSON solicitado."
        },
        {
          role: "user",
          content: promptBloco.prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 2000
    });

    const respostaIA = completion.choices[0].message.content;
    console.log('✅ Resposta da IA recebida para bloco', numeroBloco);

    // Tentar extrair JSON da resposta
    let dadosBloco;
    try {
      const jsonMatch = respostaIA.match(/```json\s*([\s\S]*?)\s*```/) || 
                       respostaIA.match(/{[\s\S]*}/);
      
      if (jsonMatch) {
        const jsonString = jsonMatch[1] || jsonMatch[0];
        dadosBloco = JSON.parse(jsonString);
        console.log('✅ JSON parseado com sucesso para bloco', numeroBloco);
      } else {
        throw new Error('JSON não encontrado na resposta');
      }
    } catch (parseError) {
      console.error('❌ Erro ao fazer parse do JSON para bloco', numeroBloco, ':', parseError);
      
      // Fallback: criar estrutura básica
      dadosBloco = {};
      Object.keys(promptsBlocos[numeroBloco].prompt.match(/"([^"]+)":/g) || []).forEach(key => {
        dadosBloco[key.replace(/"/g, '')] = 'Não informado no DFD';
      });
    }

    res.status(200).json({
      success: true,
      bloco: {
        id: numeroBloco,
        titulo: promptBloco.titulo,
        dados: dadosBloco,
        tipo: 'bloco'
      },
      message: `${promptBloco.titulo} gerado com sucesso`
    });

  } catch (error) {
    console.error('❌ Erro no processamento do bloco:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: error.message 
    });
  }
}
