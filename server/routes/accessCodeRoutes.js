// server/routes/accessCodeRoutes.js

const express = require('express');
const router = express.Router();
const { createAccessCode, validateAccessCode, assignAccessCode } = require('../controllers/accessCodeController');

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
    const result = await validateAccessCode(code);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to validate access code', details: error.message });
  }
});

// Updated: Endpoint to assign an access code to a user's email and school name
router.post('/assign', async (req, res) => {
  const { code, email, schoolName } = req.body;
  if (!code || !email || !schoolName) {
    return res.status(400).json({ error: 'Access code, email, and school name are required.' });
  }
  try {
    const record = await assignAccessCode(code, email, schoolName);
    res.json({ message: 'Access code successfully assigned', record });
  } catch (error) {
    res.status(500).json({ error: 'Failed to assign access code', details: error.message });
  }
});

module.exports = router;