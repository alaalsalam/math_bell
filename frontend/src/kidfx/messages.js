const MESSAGES = {
  correct: [
    "رائع جدًا! 🎉",
    "أنت بطل! ⭐",
    "يا سلام عليك! 👏",
    "ممتاز! أكمل! 🚀",
    "إجابة صحيحة يا نجم! 🌟",
  ],
  wrong: [
    "قريب! حاول مرة ثانية 💪",
    "لا بأس! أنت تتعلم 🌟",
    "جرب من جديد 😄",
    "خطوة صغيرة ونوصل 🎯",
  ],
  streak: [
    "سلسلة نجاح! 🔥",
    "يا بطل مستمر! 🏆",
    "استمر أنت رائع! 🎮",
    "موجة انتصارات! ✨",
  ],
};

export function getRandomMessage(type = "correct") {
  const pool = MESSAGES[type] || MESSAGES.correct;
  return pool[Math.floor(Math.random() * pool.length)] || "ممتاز!";
}

export default MESSAGES;
