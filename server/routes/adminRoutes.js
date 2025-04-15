// server/routes/adminRoutes.js

const express = require('express');
const router = express.Router();
const { sequelize } = require('../models'); // Ensure your sequelize instance is exported from models/index.js
const logger = require('../logger');

// Endpoint: Get list of tables in the public schema.
router.get('/schema/tables', async (req, res) => {
  try {
    // Query PostgreSQL's catalog for tables in the public schema.
    const [results] = await sequelize.query(
      "SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = 'public';"
    );
    // Extract table names.
    const tableNames = results.map(row => row.tablename);
    res.json(tableNames);
  } catch (error) {
    logger.error("Error fetching tables: " + error.message);
    res.status(500).json({ error: "Failed to fetch tables", details: error.message });
  }
});

// Endpoint: Get list of columns for a given table.
router.get('/schema/columns', async (req, res) => {
  const tableName = req.query.table;
  if (!tableName) {
    return res.status(400).json({ error: 'The "table" query parameter is required.' });
  }
  try {
    // Use Sequelize's queryInterface.describeTable to get column details.
    const queryInterface = sequelize.getQueryInterface();
    const tableDescription = await queryInterface.describeTable(tableName);
    // tableDescription is an object where keys are column names.
    const columns = Object.keys(tableDescription);
    res.json(columns);
  } catch (error) {
    logger.error("Error fetching columns for table " + tableName + ": " + error.message);
    res.status(500).json({ error: "Failed to fetch columns for table " + tableName, details: error.message });
  }
});

// Endpoint to add a new column to a table.
router.post('/schema/add-column', async (req, res) => {
  const { tableName, columnName, dataType } = req.body;
  if (!tableName || !columnName || !dataType) {
    return res.status(400).json({ error: 'tableName, columnName, and dataType are required.' });
  }
  try {
    const queryInterface = sequelize.getQueryInterface();
    
    // Map common data type strings to Sequelize data types.
    let sequelizeDataType;
    switch (dataType.toUpperCase()) {
      case 'STRING':
        sequelizeDataType = sequelize.constructor.STRING;
        break;
      case 'INTEGER':
        sequelizeDataType = sequelize.constructor.INTEGER;
        break;
      case 'DATE':
        sequelizeDataType = sequelize.constructor.DATE;
        break;
      case 'BOOLEAN':
        sequelizeDataType = sequelize.constructor.BOOLEAN;
        break;
      case 'JSONB':
        sequelizeDataType = sequelize.constructor.JSONB;
        break;
      default:
        return res.status(400).json({ error: 'Unsupported data type.' });
    }
    
    // Attempt to add the new column.
    await queryInterface.addColumn(tableName, columnName, {
      type: sequelizeDataType,
      allowNull: true,
    });
    logger.info(`Column ${columnName} added to table ${tableName}.`);
    res.json({ message: `Column ${columnName} added to table ${tableName}.` });
  } catch (error) {
    logger.error("Error adding column: " + error.message);
    res.status(500).json({ error: "Failed to add column", details: error.message });
  }
});

module.exports = router;