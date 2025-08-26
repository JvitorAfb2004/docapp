const db = require('../models');
const bcrypt = require('bcrypt');

async function initializeDatabase() {
  try {
    console.log('🔄 Inicializando banco de dados...');

    // Sincronizar modelos (recriar todas as tabelas)
    await db.sequelize.sync({ force: true });
    console.log('✅ Modelos sincronizados (User, OpenAIToken, Prompt, DocumentoGerado)');

    // Criar hash da senha admin123
    const hashedPassword = await bcrypt.hash('admin123', 10);

    // Criar usuário admin padrão
    const adminUser = await db.User.create({
      name: 'Administrador',
      email: 'admin@docapp.com',
      password: hashedPassword,
      isAdmin: true
    });
    console.log('✅ Usuário admin criado');

    // Criar token OpenAI padrão
    const openAIToken = await db.OpenAIToken.create({
      name: 'Token Principal',
      key: 'sk-example-token-1234567890abcdef',
      model: 'gpt-4',
      isActive: true
    });
    console.log('✅ Token OpenAI padrão criado');

    // Criar prompts padrão
    const dfdPrompt = await db.Prompt.create({
      type: 'dfd',
      content: 'Crie um Diagrama de Fluxo de Dados (DFD) para um sistema de vendas online que inclua: clientes, produtos, pedidos, pagamentos e estoque. Mostre os processos principais, entidades externas e fluxos de dados.',
      createdBy: adminUser.id
    });

    const etpPrompt = await db.Prompt.create({
      type: 'etp',
      content: 'Desenvolva um Esquema de Transição de Estados (ETP) para um sistema de autenticação que inclua: usuário não autenticado, tentativa de login, validação, usuário autenticado, logout e bloqueio por tentativas.',
      createdBy: adminUser.id
    });

    console.log('✅ Prompts padrão criados');

    console.log('\n🎉 Banco de dados inicializado com sucesso!');
    console.log('\n📋 Dados criados:');
    console.log(`   👤 Usuário Admin: admin@docapp.com (senha: admin123)`);
    console.log(`   🔑 Token OpenAI: ${openAIToken.name}`);
    console.log(`   💬 Prompt DFD: ${dfdPrompt.type.toUpperCase()}`);
    console.log(`   💬 Prompt ETP: ${etpPrompt.type.toUpperCase()}`);

  } catch (error) {
    console.error('❌ Erro ao inicializar banco de dados:', error);
  } finally {
    await db.sequelize.close();
    console.log('\n🔌 Conexão com banco fechada');
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  initializeDatabase();
}

module.exports = { initializeDatabase };
