// server/controllers/accessCodeController.js

const { AccessCode } = require('../models');
const crypto = require('crypto');

async function createAccessCode() {
  // Generate a random 12-character hex string (6 bytes)
  const code = crypto.randomBytes(6).toString('hex');
  // Insert a new access code record in the database
  const newCode = await AccessCode.create({
    code,
    status: 'active'
    // Additional metadata or expiration can be added here
  });
  return newCode.code;
}

async function validateAccessCode(code) {
  const record = await AccessCode.findOne({ where: { code } });
  if (!record) {
    return { valid: false, message: "Access code not found.", expiresAt: "No Expiration" };
  }
  if (record.status !== 'active' || record.userEmail) {
    return { 
      valid: false, 
      message: "Access code has already been used or is not active.", 
      expiresAt: record.expiresAt ? new Date(record.expiresAt).toLocaleString() : "No Expiration" 
    };
  }
  // Check if there's an expiration date and if it is valid
  if (record.expiresAt) {
    const now = new Date();
    const expiry = new Date(record.expiresAt);
    if (isNaN(expiry.getTime()) || now > expiry) {
      return { 
        valid: false, 
        message: "Access code has expired.", 
        expiresAt: !isNaN(expiry.getTime()) ? expiry.toLocaleString() : "No Expiration"
      };
    } else {
      return { 
        valid: true, 
        message: "Access code is valid.", 
        expiresAt: expiry.toLocaleString() 
      };
    }
  } else {
    return { valid: true, message: "Access code is valid.", expiresAt: "No Expiration" };
  }
}

// New function to assign an access code to a user's email and mark it as used.
async function assignAccessCode(code, email) {
  // Find the active, unassigned access code
  const record = await AccessCode.findOne({ where: { code, status: 'active', userEmail: null } });
  if (!record) {
    throw new Error("Access code is invalid, already used, or does not exist.");
  }
  // Update the record with the user's email and mark it as used
  record.userEmail = email;
  record.status = 'used';
  await record.save();
  return record;
}

module.exports = {
  createAccessCode,
  validateAccessCode,
  assignAccessCode
};