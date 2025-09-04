const { verifyToken } = require('../../../lib/auth');
const { rateLimit } = require('../../../lib/security');
const { getDecryptedOpenAIKey } = require('../../../lib/encryption');
const db = require('../../../models');
const fs = require('fs');
const path = require('path');

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Método não permitido' });
  }

  rateLimit(20, 300000)(request, response, async () => {
    try {
      // Verificar autenticação
      const token = request.headers.authorization?.replace('Bearer ', '');
      if (!token) return response.status(401).json({ error: 'Token não fornecido' });
      const decoded = await verifyToken(token);
      if (!decoded) return response.status(403).json({ error: 'Token inválido' });

      const { dfdData, blocosGerados, numeroETP } = request.body;

      if (!dfdData || !blocosGerados || !numeroETP) {
        return response.status(400).json({ error: 'Dados incompletos para geração do ETP' });
      }

      console.log('🚀 Gerando ETP em DOCX');
      console.log('👤 Usuário:', decoded.email);
      console.log('📋 Blocos:', blocosGerados.length);

      // Gerar ETP em DOCX usando docxtemplater
      console.log('🔧 Gerando ETP em DOCX...');
      
      // Criar o conteúdo estruturado para o template
      console.log('📊 Estrutura dfdData recebida:', JSON.stringify(dfdData, null, 2));
      console.log('📊 Estrutura blocosGerados recebida:', JSON.stringify(blocosGerados, null, 2));
      
      const templateData = {
        // Dados básicos do ETP
        numero_etp: numeroETP || 'N/A',
        numero_sgd: dfdData.sgd || dfdData.numeroSGD || 'N/A',
        numero_dfd: dfdData.numeroDFD || 'N/A',
        
        // Dados do órgão e demandante - corrigindo estrutura
        orgao: dfdData.orgao || dfdData.demandante?.orgao || 'N/A',
        tipo_objeto: dfdData.tipo || dfdData.objeto || dfdData.bloco1?.tipoObjeto || 'N/A',
        descricao_objeto: dfdData.descricao || dfdData.descricaoNecessidade || 'N/A',
        
        // Valor estimado - corrigindo formatação
        valor_estimado: dfdData.valorEstimado ? 
          (typeof dfdData.valorEstimado === 'string' ? dfdData.valorEstimado : 
           `R$ ${parseFloat(dfdData.valorEstimado).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`) : 'N/A',
        
        // Dados orçamentários
        classificacao_orcamentaria: dfdData.classificacao || dfdData.classificacaoOrcamentaria || 'N/A',
        fonte: dfdData.fonte || 'N/A',
        elemento_despesa: dfdData.elemento || dfdData.elementoDespesa || 'N/A',
        
        // Equipe - corrigindo estrutura aninhada
        fiscal_titular: dfdData.fiscal?.titular || dfdData.fiscalTitular || 'N/A',
        fiscal_suplente: dfdData.fiscal?.suplente || dfdData.fiscalSuplente || 'N/A',
        gestor_titular: dfdData.gestor?.titular || dfdData.gestorTitular || 'N/A',
        gestor_suplente: dfdData.gestor?.suplente || dfdData.gestorSuplente || 'N/A',
        demandante_nome: dfdData.demandante?.nome || 'N/A',
        demandante_cargo: dfdData.demandante?.cargo || 'N/A',
        
        // Data e local
        data_atual: new Date().toLocaleDateString('pt-BR'),
        ano_atual: new Date().getFullYear(),
        local: 'Palmas – TO',
        
        // Conteúdo dos blocos - garantindo que o conteúdo seja texto
        bloco1_conteudo: blocosGerados.find(b => b.id === 1)?.conteudo || 'Bloco não gerado',
        bloco2_conteudo: blocosGerados.find(b => b.id === 2)?.conteudo || 'Bloco não gerado',
        bloco3_conteudo: blocosGerados.find(b => b.id === 3)?.conteudo || 'Bloco não gerado',
        bloco4_conteudo: blocosGerados.find(b => b.id === 4)?.conteudo || 'Bloco não gerado',
        bloco5_conteudo: blocosGerados.find(b => b.id === 5)?.conteudo || 'Bloco não gerado',
        bloco6_conteudo: blocosGerados.find(b => b.id === 6)?.conteudo || 'Bloco não gerado',
        bloco7_conteudo: blocosGerados.find(b => b.id === 7)?.conteudo || 'Bloco não gerado'
      };
      
      console.log('📊 Template data final:', JSON.stringify(templateData, null, 2));

      // Gerar DOCX usando docxtemplater
      const PizZip = require('pizzip');
      const Docxtemplater = require('docxtemplater');
      
      // Carregar o template DOCX existente
      const templatePath = path.join(process.cwd(), 'documentos', 'ETP.docx');
      
      if (!fs.existsSync(templatePath)) {
        throw new Error('Template ETP.docx não encontrado');
      }
      
      console.log('📄 Carregando template DOCX:', templatePath);
      const templateContent = fs.readFileSync(templatePath, 'binary');
      
      if (!templateContent || templateContent.length === 0) {
        throw new Error('Template DOCX está vazio ou não pôde ser lido');
      }
      
      console.log('📊 Tamanho do template:', templateContent.length, 'bytes');
      
      console.log('📦 Criando PizZip com template...');
      const zip = new PizZip(templateContent);
      
      console.log('📝 Criando Docxtemplater...');
      const doc = new Docxtemplater(zip);
      
      console.log('🎨 Renderizando template com dados...');
      console.log('📊 Dados do template:', Object.keys(templateData));
      
      // Renderizar o template com os dados
      try {
        doc.render(templateData);
        console.log('✅ Template renderizado com sucesso');
      } catch (renderError) {
        console.error('❌ Erro ao renderizar template:', renderError);
        throw new Error(`Erro ao renderizar template: ${renderError.message}`);
      }
      
      console.log('📄 Gerando arquivo DOCX...');
      // Gerar o arquivo DOCX
      let buffer;
      try {
        buffer = doc.getZip().generate({ type: 'nodebuffer' });
        console.log('✅ Buffer DOCX gerado com sucesso');
      } catch (generateError) {
        console.error('❌ Erro ao gerar buffer DOCX:', generateError);
        throw new Error(`Erro ao gerar arquivo DOCX: ${generateError.message}`);
      }

      console.log('🔧 ETP DOCX gerado com sucesso');
      console.log('📋 Tamanho do DOCX:', buffer.length, 'bytes');

      // Nome do arquivo DOCX
      const fileName = `ETP_${numeroETP.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.docx`;
      
      // Salvar no diretório de documentos gerados
      const outputDir = path.join(process.cwd(), 'documentos', 'gerados');
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      
      const outputPath = path.join(outputDir, fileName);
      fs.writeFileSync(outputPath, buffer);

      console.log('✅ ETP DOCX gerado com sucesso:', outputPath);

      // Atualizar o documento no banco com o caminho do arquivo
      const documento = await db.DocumentoGerado.create({
        tipo: 'ETP',
        numeroSGD: dfdData.sgd || null,
        numeroDFD: dfdData.numeroDFD || null,
        numeroETP: numeroETP,
        nomeArquivo: fileName,
        caminhoArquivo: outputPath,
        tamanhoArquivo: buffer.length,
        dadosProcessados: {
          dfdData,
          blocosGerados,
          numeroETP,
          templateData
        },
        dadosOriginais: { 
          dfdData, 
          blocosGerados, 
          numeroETP 
        },
        status: 'arquivo_gerado',
        tokensGastos: 0,
        modeloIA: 'docx-gerado',
        criadoPor: decoded.userId,
        dataProcessamento: new Date(),
        ativo: true,
        downloadCount: 0
      });

      console.log('✅ ETP DOCX salvo no banco (ID:', documento.id, ')');

      // Retornar resposta com o arquivo DOCX
      response.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      response.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      response.setHeader('Content-Length', buffer.length);
      
      return response.status(200).send(buffer);

    } catch (error) {
      console.error('❌ Erro ao gerar ETP DOCX:', error);
      return response.status(500).json({ 
        error: 'Erro ao gerar ETP em DOCX', 
        details: error.message 
      });
    }
  });
}
