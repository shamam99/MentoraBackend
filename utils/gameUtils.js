exports.calculateScore = (answer, correctAnswer) => {
    return answer.trim().toLowerCase() === correctAnswer.trim().toLowerCase() ? 1 : 0;
  };
  