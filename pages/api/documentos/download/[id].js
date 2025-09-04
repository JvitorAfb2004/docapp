const { verifyToken } = require('../../../../lib/auth');
const { requireAuth, requireDocumentOwnership, rateLimit, validateFileAccess } = require('../../../../lib/security');
const db = require('../../../../models');
const fs = require('fs');
const path = require('path');
const DocxTemplater = require('docxtemplater');
const PizZip = require('pizzip');

// Função para gerar documento DOCX a partir dos dados processados
async function generateDocumentFromData(tipo, data) {
  try {
    const templatePath = path.join(process.cwd(), 'documentos', `${tipo}.docx`);
    if (!fs.existsSync(templatePath)) {
      console.error(`Template não encontrado: ${templatePath}`);
      return { success: false, error: 'Template não encontrado' };
    }

    const content = fs.readFileSync(templatePath);
    const zip = new PizZip(content);
    const doc = new DocxTemplater(zip, { 
      paragraphLoop: true, 
      linebreaks: true, 
      nullGetter: () => "",
      delimiters: {
        start: '{',
        end: '}'
      }
    });

    console.log(`\n--- Dados enviados para template ${tipo} ---`);
    console.log(JSON.stringify(data, null, 2));
    console.log('--- Fim dos dados ---\n');
    
    // Limpar valores undefined/null e substituir por strings vazias
    Object.keys(data).forEach(key => {
      if (data[key] === undefined || data[key] === null) {
        data[key] = '';
      }
      // Garantir que valores não sejam objetos complexos
      if (typeof data[key] === 'object' && !Array.isArray(data[key])) {
        data[key] = JSON.stringify(data[key]);
      }
    });

    try {
      doc.render(data);
      console.log('✅ Template renderizado com sucesso no download');
    } catch (renderError) {
      console.error('❌ Erro ao renderizar template no download:', renderError.message);
      if (renderError.properties && renderError.properties.errors) {
        console.error('📋 Erros detalhados no download:');
        renderError.properties.errors.forEach((err, index) => {
          console.error(`  ${index + 1}. ${err.name}: ${err.message}`);
        });
      }
      throw renderError;
    }
    
    const buf = doc.getZip().generate({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: {
        level: 6,
      },
    });

    const now = new Date();
    const horas = now.getHours().toString().padStart(2, '0');
    const minutos = now.getMinutes().toString().padStart(2, '0');
    const segundos = now.getSeconds().toString().padStart(2, '0');
    const horario = `${horas}:${minutos}:${segundos}`;
    const fileName = `${tipo}_${horario}.docx`;
    
    console.log(`${tipo} gerado em memória:`, fileName);
    return { success: true, document: { fileName, buffer: buf, size: buf.length, type: tipo } };
  } catch (error) {
    console.error(`Erro ao gerar ${tipo}:`, error.message);
    if (error.properties && error.properties.errors) {
      error.properties.errors.forEach(err => console.error(err));
    }
    return { success: false, error: error.message };
  }
}

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    return response.status(405).json({ error: 'Método não permitido' });
  }

  rateLimit(5, 60000)(request, response, async () => {
    validateFileAccess(request, response, async () => {
      const decoded = await requireAuth(request, response);
      if (!decoded) return;

      const { id } = request.query;

      console.log('\nDownload/geração solicitada');
      console.log(`Usuário: ${decoded.email} (ID: ${decoded.userId})`);
      console.log(`Documento ID: ${id}`);
      console.log(`Data/Hora: ${new Date().toLocaleString('pt-BR')}`);

      // Buscar documento no banco
      const documento = await db.DocumentoGerado.findOne({
        where: {
          id: id,
          criadoPor: decoded.userId,
          ativo: true
        }
      });

      if (!documento) {
        console.log(`Documento não encontrado ou acesso negado: ID ${id}`);
        return response.status(404).json({ 
          error: 'Documento não encontrado',
          message: 'O documento não existe ou você não tem permissão para acessá-lo'
        });
      }

      // Verificar se existe um arquivo físico já gerado
      if (documento.caminhoArquivo && fs.existsSync(documento.caminhoArquivo)) {
        console.log(`Arquivo físico encontrado: ${documento.caminhoArquivo}`);
        
        // Atualizar estatísticas do documento
        await documento.update({
          downloadCount: documento.downloadCount + 1,
          ultimoDownload: new Date()
        });

        console.log(`Acesso autorizado para usuário ${decoded.email}`);
        console.log(`Arquivo existente: ${documento.nomeArquivo}`);
        console.log(`Caminho: ${documento.caminhoArquivo}`);
        console.log(`Total de downloads: ${documento.downloadCount + 1}`);

        // Ler e enviar o arquivo existente
        const fileBuffer = fs.readFileSync(documento.caminhoArquivo);
        
        response.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        response.setHeader('Content-Disposition', `attachment; filename="${documento.nomeArquivo}"`);
        response.setHeader('Content-Length', fileBuffer.length);

        console.log(`Download iniciado: ${documento.nomeArquivo}`);
        
        return response.status(200).send(fileBuffer);
      }

      // Se não existe arquivo físico, verificar se tem dados processados para gerar
      if (!documento.dadosProcessados) {
        console.log(`Documento ${id} não tem dados processados nem arquivo físico`);
        return response.status(400).json({ 
          error: 'Documento sem dados processados',
          message: 'Este documento não foi processado corretamente'
        });
      }

      console.log(`Arquivo físico não encontrado, gerando ${documento.tipo} a partir dos dados salvos...`);
      console.log(`Status atual: ${documento.status}`);

      // Gerar documento DOCX a partir dos dados salvos
      const result = await generateDocumentFromData(documento.tipo, documento.dadosProcessados);
      
      if (!result.success) {
        console.error('Erro na geração:', result.error);
        return response.status(500).json({ 
          error: 'Erro ao gerar documento',
          details: result.error
        });
      }

      // Atualizar estatísticas do documento
      await documento.update({
        downloadCount: documento.downloadCount + 1,
        ultimoDownload: new Date(),
        status: 'arquivo_gerado', // Marcar que o arquivo foi gerado
        nomeArquivo: result.document.fileName, // Atualizar nome do arquivo
        tamanhoArquivo: result.document.size // Atualizar tamanho
      });

      console.log(`Acesso autorizado para usuário ${decoded.email}`);
      console.log(`Arquivo gerado: ${result.document.fileName}`);
      console.log(`Tamanho: ${(result.document.size / 1024).toFixed(2)} KB`);
      console.log(`Total de downloads: ${documento.downloadCount + 1}`);

      // Enviar arquivo gerado
      response.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      response.setHeader('Content-Disposition', `attachment; filename="${result.document.fileName}"`);
      response.setHeader('Content-Length', result.document.buffer.length);

      console.log(`Download iniciado: ${result.document.fileName}`);
      
      return response.status(200).send(result.document.buffer);
    });
  });
}