/**
 * Generate a 6-digit numeric PIN code
 * @param {number} length 
 * @returns {string}
 */
function generatePinCode(length = 6) {
    const characters = '0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
  }
  
  module.exports = { generatePinCode };
  