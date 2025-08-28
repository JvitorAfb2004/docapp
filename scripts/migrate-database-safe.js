const { Sequelize, DataTypes } = require('sequelize');
const config = require('../config/config.json');

// Configurar conexão do banco
const sequelize = new Sequelize(
  config.development.database,
  config.development.username,
  config.development.password,
  config.development
);

async function migrateDatabaseChangesSafe() {
  try {
 
    // Conectar ao banco
    await sequelize.authenticate();
    console.log('Conexão com banco estabelecida');
    
    // Verificar se as colunas já existem
    const tableInfo = await sequelize.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'documentos_gerados' AND table_schema = 'public'",
      { type: sequelize.QueryTypes.SELECT }
    );
    
    const existingColumns = tableInfo.map(col => col.column_name);
  
    // 1. Adicionar dadosProcessados
    if (!existingColumns.includes('dadosProcessados')) {
      console.log('➕ Adicionando coluna: dadosProcessados');
      await sequelize.query(
        'ALTER TABLE documentos_gerados ADD COLUMN "dadosProcessados" JSONB'
      );
      await sequelize.query(
        "COMMENT ON COLUMN documentos_gerados.\"dadosProcessados\" IS 'Dados processados do formulário (para gerar DOCX depois)'"
      );
      console.log('✅ dadosProcessados adicionada');
    } else {
      console.log('✅ dadosProcessados já existe');
    }
    
    // 2. Adicionar dadosOriginais
    if (!existingColumns.includes('dadosOriginais')) {
      console.log('➕ Adicionando coluna: dadosOriginais');
      await sequelize.query(
        'ALTER TABLE documentos_gerados ADD COLUMN "dadosOriginais" JSONB'
      );
      await sequelize.query(
        "COMMENT ON COLUMN documentos_gerados.\"dadosOriginais\" IS 'Dados originais do formulário enviado pelo usuário'"
      );
      console.log('✅ dadosOriginais adicionada');
    } else {
      console.log('✅ dadosOriginais já existe');
    }
    
    // 3. Criar tipo ENUM e adicionar coluna status
    if (!existingColumns.includes('status')) {
      console.log('➕ Criando tipo ENUM e coluna status');
      
      // Verificar se o tipo ENUM já existe
      const enumExists = await sequelize.query(
        "SELECT 1 FROM pg_type WHERE typname = 'enum_documentos_gerados_status'",
        { type: sequelize.QueryTypes.SELECT }
      );
      
      if (enumExists.length === 0) {
        await sequelize.query(
          "CREATE TYPE enum_documentos_gerados_status AS ENUM ('processado', 'arquivo_gerado')"
        );
        console.log('✅ Tipo ENUM criado');
      } else {
        console.log('✅ Tipo ENUM já existe');
      }
      
      await sequelize.query(
        "ALTER TABLE documentos_gerados ADD COLUMN status enum_documentos_gerados_status NOT NULL DEFAULT 'arquivo_gerado'"
      );
      await sequelize.query(
        "COMMENT ON COLUMN documentos_gerados.status IS 'Status do documento: processado ou arquivo_gerado'"
      );
      console.log('✅ status adicionada');
    } else {
      console.log('✅ status já existe');
    }
    
    // 4. Adicionar dataProcessamento
    if (!existingColumns.includes('dataProcessamento')) {
      console.log('➕ Adicionando coluna: dataProcessamento');
      await sequelize.query(
        'ALTER TABLE documentos_gerados ADD COLUMN "dataProcessamento" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()'
      );
      await sequelize.query(
        "COMMENT ON COLUMN documentos_gerados.\"dataProcessamento\" IS 'Data quando os dados foram processados'"
      );
      console.log('✅ dataProcessamento adicionada');
    } else {
      console.log('✅ dataProcessamento já existe');
    }
    
    // 5. Modificar colunas existentes para permitir NULL
    console.log('🔧 Modificando colunas existentes para opcional...');
    
    try {
      await sequelize.query(
        'ALTER TABLE documentos_gerados ALTER COLUMN "nomeArquivo" DROP NOT NULL'
      );
      console.log('✅ nomeArquivo modificado para opcional');
    } catch (error) {
      console.log('⚠️ nomeArquivo já é opcional ou erro:', error.message.substring(0, 100));
    }
    
    try {
      await sequelize.query(
        'ALTER TABLE documentos_gerados ALTER COLUMN "caminhoArquivo" DROP NOT NULL'
      );
      console.log('✅ caminhoArquivo modificado para opcional');
    } catch (error) {
      console.log('⚠️ caminhoArquivo já é opcional ou erro:', error.message.substring(0, 100));
    }
    
    try {
      await sequelize.query(
        'ALTER TABLE documentos_gerados ALTER COLUMN "tamanhoArquivo" DROP NOT NULL'
      );
      console.log('✅ tamanhoArquivo modificado para opcional');
    } catch (error) {
      console.log('⚠️ tamanhoArquivo já é opcional ou erro:', error.message.substring(0, 100));
    }
    
    // 6. Criar índices
    console.log('📊 Criando índices...');
    
    try {
      await sequelize.query(
        'CREATE INDEX IF NOT EXISTS documentos_gerados_status_idx ON documentos_gerados (status)'
      );
      console.log('✅ Índice para status criado');
    } catch (error) {
      console.log('⚠️ Erro no índice status:', error.message.substring(0, 100));
    }
    
    try {
      await sequelize.query(
        'CREATE INDEX IF NOT EXISTS documentos_gerados_data_processamento_idx ON documentos_gerados ("dataProcessamento")'
      );
      console.log('✅ Índice para dataProcessamento criado');
    } catch (error) {
      console.log('⚠️ Erro no índice dataProcessamento:', error.message.substring(0, 100));
    }
    
    // 7. Verificar estrutura final

    const finalColumns = await sequelize.query(
      "SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'documentos_gerados' AND table_schema = 'public' ORDER BY ordinal_position",
      { type: sequelize.QueryTypes.SELECT }
    );
    
    console.log('📋 Estrutura final da tabela:');
    finalColumns.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });
    
    console.log('🎉 Migração concluída com sucesso!');
    console.log('');
    console.log('🚀 Sistema pronto para:');
    console.log('- ✅ Processamento individual de DFD (sem IA)');
    console.log('- ✅ Processamento individual de ETP (com IA)');
    console.log('- ✅ Importação de PDF para ETP');
    console.log('- ✅ Armazenamento de dados no banco');
    console.log('- ✅ Geração de DOCX sob demanda');
    
  } catch (error) {
    console.error('❌ Erro na migração:', error);
    console.error('Stack trace:', error.stack);
    throw error;
  } finally {
    await sequelize.close();
  }
}

// Executar migração se script for chamado diretamente
if (require.main === module) {
  migrateDatabaseChangesSafe()
    .then(() => {
      console.log('✅ Migração segura executada com sucesso!');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Falha na migração:', error.message);
      process.exit(1);
    });
}

module.exports = { migrateDatabaseChangesSafe };