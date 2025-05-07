const staticQuestions = require('../data/questions');

/**
 * Get a set of questions
 * For now: from static JSON
 * Later: fetch from external model/API
 * @param {number} count 
 * @returns {Array}
 */
const getQuestions = (count = 5) => {
  const shuffled = [...staticQuestions].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
};

module.exports = { getQuestions };
