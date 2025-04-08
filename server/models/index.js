// server/models/index.js

const path = require('path'); // Ensure 'path' is required before other operations
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const fs = require('fs');
const { Sequelize } = require('sequelize');
const logger = require('../logger');

// Retrieve database connection settings from environment variables
const {
  DB_HOST,
  DB_PORT,
  DB_DATABASE,
  DB_USER,
  DB_PASSWORD
} = process.env;

if (!DB_HOST || !DB_PORT || !DB_DATABASE || !DB_USER || !DB_PASSWORD) {
  logger.error("Database connection variables are not set properly in .env");
  process.exit(1);
}

// Initialize Sequelize with our PostgreSQL connection, ensuring SSL is used.
const sequelize = new Sequelize(DB_DATABASE, DB_USER, DB_PASSWORD, {
  host: DB_HOST,
  port: DB_PORT,
  dialect: 'postgres',
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false,
    },
  },
  logging: msg => logger.debug(msg)
});

// Object to hold our models
const db = {};

// Read all files in this directory (except index.js) and import models.
fs.readdirSync(__dirname)
  .filter(file => file !== 'index.js' && file.slice(-3) === '.js')
  .forEach(file => {
    const model = require(path.join(__dirname, file))(sequelize, Sequelize.DataTypes);
    db[model.name] = model;
  });

// Setup model associations if they exist.
Object.keys(db).forEach(modelName => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;