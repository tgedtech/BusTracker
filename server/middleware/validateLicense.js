// server/middleware/validateLicense.js

const { AccessCode } = require('../models');

module.exports = async function validateLicense(req, res, next) {
  const { code } = req.session; // Or however you associate the access code with the session
  if (!code) {
    return res.status(403).json({ error: "Access code is required for this resource." });
  }
  try {
    const record = await AccessCode.findOne({ where: { code } });
    if (!record) {
      return res.status(403).json({ error: "Access code not found." });
    }
    if (record.expiresAt) {
      const now = new Date();
      const expires = new Date(record.expiresAt);
      if (now > expires) {
        return res.status(403).json({ error: "Access code has expired." });
      }
    }
    // Optionally check status and if already assigned
    if (record.status !== 'active' || record.userEmail) {
      return res.status(403).json({ error: "Access code is not active." });
    }
    next();
  } catch (error) {
    next(error);
  }
};