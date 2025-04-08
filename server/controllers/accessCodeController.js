// server/controllers/accessCodeController.js

const { AccessCode } = require('../models');
const crypto = require('crypto');

async function createAccessCode() {
  // Generate a random 12-character hex string (6 bytes)
  const code = crypto.randomBytes(6).toString('hex');
  // Insert a new access code into the database
  const newCode = await AccessCode.create({
    code: code,
    status: 'active'
    // Additional metadata or expiration time can be added here
  });
  return newCode.code;
}

async function validateAccessCode(code) {
  const record = await AccessCode.findOne({ where: { code } });
  if (record && record.status === 'active') {
    return true;
  }
  return false;
}

module.exports = {
  createAccessCode,
  validateAccessCode
};