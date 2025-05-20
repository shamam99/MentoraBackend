function updateStreak(user) {
    const today = new Date();
    const todayDateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    if (!user.lastStreakDate) {
      user.streak = 1;
    } else {
      const last = new Date(user.lastStreakDate.getFullYear(), user.lastStreakDate.getMonth(), user.lastStreakDate.getDate());
      const diffDays = Math.floor((todayDateOnly - last) / (1000 * 60 * 60 * 24));
  
      if (diffDays === 0) {
        // same day → do nothing
      } else if (diffDays === 1) {
        user.streak = user.streak === 6 ? 1 : user.streak + 1;
      } else {
        user.streak = 1; // missed a day or too many days passed
      }
    }
  
    user.lastStreakDate = todayDateOnly;
  }
  module.exports = { updateStreak };
  