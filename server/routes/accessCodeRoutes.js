// server/routes/accessCodeRoutes.js

const express = require('express');
const router = express.Router();
const { createAccessCode, validateAccessCode } = require('../controllers/accessCodeController');

// Endpoint to generate a new access code
router.get('/generate', async (req, res) => {
  try {
    const code = await createAccessCode();
    res.json({ code });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate access code', details: error.message });
  }
});

// Endpoint to validate an access code
router.post('/validate', async (req, res) => {
  const { code } = req.body;
  if (!code) {
    return res.status(400).json({ error: 'Access code is required' });
  }
  try {
    const isValid = await validateAccessCode(code);
    res.json({ valid: isValid });
  } catch (error) {
    res.status(500).json({ error: 'Failed to validate access code', details: error.message });
  }
});

module.exports = router;