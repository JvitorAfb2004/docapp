'use strict';

const Sequelize = require('sequelize');
const { dbConfig } = require('../lib/config');

const db = {};

let sequelize;
if (dbConfig.use_env_variable) {
  sequelize = new Sequelize(process.env[dbConfig.use_env_variable], dbConfig);
} else {
  sequelize = new Sequelize(
    dbConfig.database, 
    dbConfig.username, 
    dbConfig.password, 
    {
      host: dbConfig.host,
      port: dbConfig.port,
      dialect: dbConfig.dialect,
      logging: false,
      pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
      }
    }
  );
}

// Carregar modelos manualmente
const User = require('./User')(sequelize, Sequelize.DataTypes);
const OpenAIToken = require('./OpenAIToken')(sequelize, Sequelize.DataTypes);
const Prompt = require('./Prompt')(sequelize, Sequelize.DataTypes);
const DocumentoGerado = require('./DocumentoGerado')(sequelize, Sequelize.DataTypes);

// Adicionar modelos ao objeto db
db.User = User;
db.OpenAIToken = OpenAIToken;
db.Prompt = Prompt;
db.DocumentoGerado = DocumentoGerado;
db.sequelize = sequelize;
db.Sequelize = Sequelize;

// Configurar associações
Object.keys(db).forEach(modelName => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

module.exports = db;
