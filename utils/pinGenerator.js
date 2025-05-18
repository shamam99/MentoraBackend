/**
 * Generate a 6-digit numeric PIN code
 * @param {number} length 
 * @returns {string}
 */
function generatePinCode(length = 6) {
    const digits = '0123456789';
    return Array.from({ length }, () => digits[Math.floor(Math.random() * digits.length)]).join('');
  }  
  
  module.exports = { generatePinCode };
  