const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const DocumentoGerado = sequelize.define('DocumentoGerado', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    nomeArquivo: {
      type: DataTypes.STRING,
      allowNull: true, // Agora opcional pois pode ser gerado depois
      comment: 'Nome do arquivo gerado'
    },
    caminhoArquivo: {
      type: DataTypes.STRING,
      allowNull: true, // Agora opcional pois pode ser gerado depois
      comment: 'Caminho completo do arquivo'
    },
    tipo: {
      type: DataTypes.ENUM('DFD', 'ETP'),
      allowNull: false,
      comment: 'Tipo do documento'
    },
    numeroSGD: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Número do SGD'
    },
    numeroDFD: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Número do DFD'
    },
    numeroETP: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Número do ETP'
    },
    tamanhoArquivo: {
      type: DataTypes.INTEGER,
      allowNull: true, // Opcional até o arquivo ser gerado
      defaultValue: null,
      comment: 'Tamanho do arquivo em bytes'
    },
    // Campos para dados processados
    dadosProcessados: {
      type: DataTypes.JSONB,
      allowNull: false,
      comment: 'Dados processados do formulário (para gerar DOCX depois)'
    },
    dadosOriginais: {
      type: DataTypes.JSONB,
      allowNull: false,
      comment: 'Dados originais do formulário enviado pelo usuário'
    },
    status: {
      type: DataTypes.ENUM('processado', 'arquivo_gerado', 'consolidado'),
      allowNull: false,
      defaultValue: 'processado',
      comment: 'Status do documento: processado (dados salvos), arquivo_gerado (DOCX criado) ou consolidado (ETP consolidado)'
    },
    dataProcessamento: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      comment: 'Data quando os dados foram processados'
    },
    tokensGastos: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
      comment: 'Número de tokens gastos na geração do documento'
    },
    modeloIA: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Modelo da IA utilizado (ex: gpt-4)'
    },
    criadoPor: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      comment: 'ID do usuário que criou o documento'
    },
    dataGeracao: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      comment: 'Data e hora de geração do documento'
    },
    downloadCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Número de downloads realizados'
    },
    ultimoDownload: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Data do último download'
    },
    ativo: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Se o documento ainda está disponível'
    }
  }, {
    tableName: 'documentos_gerados',
    timestamps: true,
    indexes: [
      {
        fields: ['criadoPor']
      },
      {
        fields: ['tipo']
      },
      {
        fields: ['dataGeracao']
      },
      {
        fields: ['status']
      },
      {
        fields: ['dataProcessamento']
      }
    ]
  });

  // Associações
  DocumentoGerado.associate = function(models) {
    DocumentoGerado.belongsTo(models.User, {
      foreignKey: 'criadoPor',
      as: 'criador'
    });
  };

  return DocumentoGerado;
};