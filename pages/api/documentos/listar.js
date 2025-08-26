const { verifyToken } = require('../../../lib/auth');
const { requireAuth } = require('../../../lib/security');
const db = require('../../../models');

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    return response.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const decoded = await requireAuth(request, response);
    if (!decoded) return;

    console.log('\nListando documentos do usuário');
    console.log(`Usuário: ${decoded.email} (ID: ${decoded.userId})`);
    console.log(`Data/Hora: ${new Date().toLocaleString('pt-BR')}`);

    const documentos = await db.DocumentoGerado.findAll({
      where: {
        criadoPor: decoded.userId,
        ativo: true
      },
      order: [['dataGeracao', 'DESC']]
    });

    console.log(`Documentos encontrados: ${documentos.length}`);

    const usuario = await db.User.findByPk(decoded.userId, {
      attributes: ['id', 'name', 'email']
    });
    const documentosFormatados = documentos.map(doc => ({
      id: doc.id,
      nomeArquivo: doc.nomeArquivo,
      tipo: doc.tipo,
      numeroSGD: doc.numeroSGD,
      numeroDFD: doc.numeroDFD,
      numeroETP: doc.numeroETP,
      tamanhoArquivo: doc.tamanhoArquivo,
      tamanhoFormatado: `${(doc.tamanhoArquivo / 1024).toFixed(2)} KB`,
      tokensGastos: doc.tokensGastos || 0,
      modeloIA: doc.modeloIA || 'N/A',
      dataGeracao: doc.dataGeracao,
      downloadCount: doc.downloadCount,
      ultimoDownload: doc.ultimoDownload,
      criador: {
        id: usuario?.id || decoded.userId,
        nome: usuario?.name || 'Usuário',
        email: usuario?.email || decoded.email
      }
    }));

    // Calcular estatísticas
    const stats = {
      totalDocumentos: documentos.length,
      totalTokensGastos: documentos.reduce((sum, doc) => sum + (doc.tokensGastos || 0), 0),
      documentosPorTipo: {
        DFD: documentos.filter(doc => doc.tipo === 'DFD').length,
        ETP: documentos.filter(doc => doc.tipo === 'ETP').length
      },
      totalDownloads: documentos.reduce((sum, doc) => sum + (doc.downloadCount || 0), 0),
      modelosUsados: [...new Set(documentos.map(doc => doc.modeloIA).filter(Boolean))]
    };

    console.log('✅ Lista de documentos gerada com sucesso');

    return response.status(200).json({
      success: true,
      documentos: documentosFormatados,
      stats,
      total: documentos.length,
      usuario: {
        id: decoded.userId,
        email: decoded.email
      }
    });

  } catch (error) {
    console.error('❌ Erro ao listar documentos:', error);
    return response.status(500).json({ 
      error: 'Erro interno do servidor',
      details: error.message
    });
  }
}