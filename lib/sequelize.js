const { DataTypes } = require('sequelize');
const db = require('../models');
const sequelize = db.sequelize;
const { dbConfig } = require('./config');

// Testar a conexão
let dbPromise = null;
async function connectDB() {
  if (dbPromise) return dbPromise;
  dbPromise = (async () => {
    try {
      await sequelize.authenticate();
      console.log('Conexão com o banco de dados estabelecida com sucesso.');
      // Não sincronizar automaticamente - usar apenas para conexão
      console.log('Conexão estabelecida. Use npm run init-db para sincronizar modelos.');
    } catch (error) {
      console.error('Não foi possível conectar ao banco de dados:', error);
      throw error;
    }
  })();
  return dbPromise;
}

module.exports = {
  sequelize,
  DataTypes,
  connectDB
};