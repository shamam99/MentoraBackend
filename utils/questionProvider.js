const staticQuestions = require('../data/questions');

/**
 * Utility to fetch a set of static questions
 * 
 * @param {number} count - Number of questions to retrieve
 * @returns {Array<Object>} - Array of question objects
 */

function getQuestions(count = 5) {
  const shuffled = [...staticQuestions].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

module.exports = { getQuestions };
