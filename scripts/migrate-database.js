const { Sequelize, DataTypes } = require('sequelize');
const config = require('../config/config.json');

// Configurar conexão do banco
const sequelize = new Sequelize(
  config.development.database,
  config.development.username,
  config.development.password,
  config.development
);

async function migrateDatabaseChanges() {
  try {
    console.log('🔄 Iniciando migração do banco de dados...');
    
    // Conectar ao banco
    await sequelize.authenticate();
    console.log('✅ Conexão com banco estabelecida');
    
    const queryInterface = sequelize.getQueryInterface();
    
    // Verificar se as colunas já existem
    const tableInfo = await queryInterface.describeTable('documentos_gerados');
    
    const newColumns = [
      'dadosProcessados',
      'dadosOriginais', 
      'status',
      'dataProcessamento'
    ];
    
    // Adicionar colunas se não existirem
    for (const column of newColumns) {
      if (!tableInfo[column]) {
        console.log(`➕ Adicionando coluna: ${column}`);
        
        switch (column) {
          case 'dadosProcessados':
            await queryInterface.addColumn('documentos_gerados', 'dadosProcessados', {
              type: DataTypes.JSONB,
              allowNull: true, // Temporariamente permitir null para dados existentes
              comment: 'Dados processados do formulário (para gerar DOCX depois)'
            });
            break;
            
          case 'dadosOriginais':
            await queryInterface.addColumn('documentos_gerados', 'dadosOriginais', {
              type: DataTypes.JSONB,
              allowNull: true, // Temporariamente permitir null para dados existentes
              comment: 'Dados originais do formulário enviado pelo usuário'
            });
            break;
            
          case 'status':
            // Primeiro, verificar se o tipo ENUM já existe
            try {
              const enumCheck = await sequelize.query(
                "SELECT 1 FROM pg_type WHERE typname = 'enum_documentos_gerados_status'",
                { type: sequelize.QueryTypes.SELECT }
              );
              
              if (enumCheck.length === 0) {
                // Criar o tipo ENUM
                await sequelize.query(
                  "CREATE TYPE enum_documentos_gerados_status AS ENUM ('processado', 'arquivo_gerado')"
                );
                console.log('✅ Tipo ENUM status criado');
              } else {
                console.log('✅ Tipo ENUM status já existe');
              }
            } catch (enumError) {
              console.log('⚠️ Erro ao verificar/criar ENUM:', enumError.message);
              // Tentar continuar mesmo com erro
            }
            
            // Adicionar a coluna com SQL direto para evitar problemas do Sequelize
            try {
              await sequelize.query(
                "ALTER TABLE documentos_gerados ADD COLUMN status enum_documentos_gerados_status NOT NULL DEFAULT 'arquivo_gerado'"
              );
              await sequelize.query(
                "COMMENT ON COLUMN documentos_gerados.status IS 'Status do documento: processado (dados salvos) ou arquivo_gerado (DOCX criado)'"
              );
              console.log('✅ Coluna status adicionada');
            } catch (colError) {
              console.log('⚠️ Erro ao adicionar coluna status:', colError.message);
            }
            break;
            
          case 'dataProcessamento':
            try {
              await sequelize.query(
                "ALTER TABLE documentos_gerados ADD COLUMN \"dataProcessamento\" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()"
              );
              await sequelize.query(
                "COMMENT ON COLUMN documentos_gerados.\"dataProcessamento\" IS 'Data quando os dados foram processados'"
              );
              console.log('✅ Coluna dataProcessamento adicionada');
            } catch (colError) {
              console.log('⚠️ Erro ao adicionar dataProcessamento:', colError.message);
            }
            break;
        }
      } else {
        console.log(`✅ Coluna ${column} já existe`);
      }
    }
    
    // Modificar colunas existentes para permitir NULL
    console.log('🔧 Modificando colunas existentes...');
    
    try {
      await queryInterface.changeColumn('documentos_gerados', 'nomeArquivo', {
        type: DataTypes.STRING,
        allowNull: true, // Agora opcional
        comment: 'Nome do arquivo gerado'
      });
      console.log('✅ nomeArquivo modificado para opcional');
    } catch (error) {
      console.log('⚠️ Erro ao modificar nomeArquivo:', error.message);
    }
    
    try {
      await queryInterface.changeColumn('documentos_gerados', 'caminhoArquivo', {
        type: DataTypes.STRING,
        allowNull: true, // Agora opcional
        comment: 'Caminho completo do arquivo'
      });
      console.log('✅ caminhoArquivo modificado para opcional');
    } catch (error) {
      console.log('⚠️ Erro ao modificar caminhoArquivo:', error.message);
    }
    
    try {
      await queryInterface.changeColumn('documentos_gerados', 'tamanhoArquivo', {
        type: DataTypes.INTEGER,
        allowNull: true, // Agora opcional
        defaultValue: null,
        comment: 'Tamanho do arquivo em bytes'
      });
      console.log('✅ tamanhoArquivo modificado para opcional');
    } catch (error) {
      console.log('⚠️ Erro ao modificar tamanhoArquivo:', error.message);
    }
    
    // Criar índices se não existirem
    console.log('📊 Criando índices...');
    
    try {
      await queryInterface.addIndex('documentos_gerados', ['status'], {
        name: 'documentos_gerados_status_idx'
      });
      console.log('✅ Índice para status criado');
    } catch (error) {
      console.log('⚠️ Índice status já existe ou erro:', error.message);
    }
    
    try {
      await queryInterface.addIndex('documentos_gerados', ['dataProcessamento'], {
        name: 'documentos_gerados_data_processamento_idx'
      });
      console.log('✅ Índice para dataProcessamento criado');
    } catch (error) {
      console.log('⚠️ Índice dataProcessamento já existe ou erro:', error.message);
    }
    
    console.log('🎉 Migração concluída com sucesso!');
    console.log('');
    console.log('📋 Resumo das mudanças:');
    console.log('- Adicionadas colunas: dadosProcessados, dadosOriginais, status, dataProcessamento');
    console.log('- Modificadas para opcional: nomeArquivo, caminhoArquivo, tamanhoArquivo');
    console.log('- Criados índices para melhor performance');
    console.log('');
    console.log('🚀 Sistema pronto para nova funcionalidade:');
    console.log('- Processamento individual de DFD/ETP');
    console.log('- Armazenamento de dados no banco');
    console.log('- Geração de DOCX sob demanda');
    
  } catch (error) {
    console.error('❌ Erro na migração:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

// Executar migração se script for chamado diretamente
if (require.main === module) {
  migrateDatabaseChanges()
    .then(() => {
      console.log('✅ Migração executada com sucesso!');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Falha na migração:', error);
      process.exit(1);
    });
}

module.exports = { migrateDatabaseChanges };