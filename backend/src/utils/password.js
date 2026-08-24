const bcrypt = require('bcryptjs');
const config = require('../config/env');

/**
 * Hashes a plaintext password using bcrypt
 */
const hashPassword = async (password) => {
  return bcrypt.hash(password, config.bcryptSaltRounds);
};

/**
 * Compares plaintext password with stored bcrypt hash
 */
const comparePassword = async (password, hash) => {
  return bcrypt.compare(password, hash);
};

module.exports = {
  hashPassword,
  comparePassword,
};
