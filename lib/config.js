const config = require('../config/config.json');

// Usar ambiente de desenvolvimento por padrão
const env =  'development';
const dbConfig = config[env];

module.exports = {
  dbConfig,
  env
};
