const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const OpenAIToken = sequelize.define('OpenAIToken', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'Token Principal'
    },
    key: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    model: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'gpt-4'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    lastUsed: {
      type: DataTypes.DATE,
      allowNull: true
    },
    usageCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    }
  }, {
    tableName: 'openai_tokens',
    timestamps: true
  });

  return OpenAIToken;
};
