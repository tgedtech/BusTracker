// server/routes/dashboardRoutes.js

const express = require('express');
const router = express.Router();
const { AccessCode } = require('../models'); // Import from models/index.js
const logger = require('../logger');

// Endpoint to fetch all access codes from the database
router.get('/access-codes', async (req, res) => {
  try {
    const codes = await AccessCode.findAll();
    res.json(codes);
  } catch (error) {
    logger.error("Error fetching access codes: " + error.message);
    res.status(500).json({ error: "Failed to fetch access codes", details: error.message });
  }
});

module.exports = router;