const { verifyToken } = require('../../../../lib/auth');
const { requireAuth, requireDocumentOwnership, rateLimit, validateFileAccess } = require('../../../../lib/security');
const db = require('../../../../models');
const fs = require('fs');
const path = require('path');

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    return response.status(405).json({ error: 'Método não permitido' });
  }

  rateLimit(5, 60000)(request, response, async () => {
    validateFileAccess(request, response, async () => {
      const decoded = await requireAuth(request, response);
      if (!decoded) return;

      const { id } = request.query;

      console.log('\nDownload solicitado');
      console.log(`Usuário: ${decoded.email} (ID: ${decoded.userId})`);
      console.log(`Documento ID: ${id}`);
      console.log(`Data/Hora: ${new Date().toLocaleString('pt-BR')}`);

      const ownershipCheck = await requireDocumentOwnership(request, response, id, decoded.userId);
      if (!ownershipCheck.valid) {
        return response.status(ownershipCheck.status).json({ error: ownershipCheck.error });
      }

      const documento = ownershipCheck.documento;

      if (!fs.existsSync(documento.caminhoArquivo)) {
        console.log(`Arquivo não encontrado: ${documento.caminhoArquivo}`);
        return response.status(404).json({ 
          error: 'Arquivo não encontrado no servidor',
          message: 'O arquivo pode ter sido movido ou excluído'
        });
      }

      console.log(`Acesso autorizado para usuário ${decoded.email}`);
      console.log(`Arquivo: ${documento.nomeArquivo}`);
      console.log(`Tamanho: ${(documento.tamanhoArquivo / 1024).toFixed(2)} KB`);

      await documento.update({
        downloadCount: documento.downloadCount + 1,
        ultimoDownload: new Date()
      });

      const fileBuffer = fs.readFileSync(documento.caminhoArquivo);

      response.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      response.setHeader('Content-Disposition', `attachment; filename="${documento.nomeArquivo}"`);
      response.setHeader('Content-Length', fileBuffer.length);

      console.log(`Download iniciado: ${documento.nomeArquivo}`);
      console.log(`Total de downloads: ${documento.downloadCount + 1}`);

      return response.status(200).send(fileBuffer);
    });
  });
}