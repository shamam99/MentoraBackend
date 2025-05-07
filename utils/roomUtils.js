const Room = require('../models/Room');

/**
 * Generate a unique 6-digit PIN code for room joining.
 * Ensures no collision in the Room collection.
 * @returns {Promise<string>} A unique 6-digit string
 */
const generatePinCode = async () => {
  let pin;
  let exists = true;

  while (exists) {
    pin = Math.floor(100000 + Math.random() * 900000).toString();
    exists = await Room.findOne({ pinCode: pin });
  }

  return pin;
};

module.exports = {
  generatePinCode,
};
