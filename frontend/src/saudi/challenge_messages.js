const PACKS = {
  challenge_start: [
    "جاهز للتحدي؟ يلا نكسرها 🔥",
    "شد الحيل يا بطل، تحدي اليوم ينتظرك 💪",
    "يلا نبدأ تحدي قوي وممتع 😎",
  ],
  challenge_done: [
    "يا سلام عليك! ختمت تحدي اليوم 🔥",
    "كفو يا بطل! أنجزت التحدي اليومي 👏",
    "أبدعت! تحدي اليوم صار منجز ✅",
  ],
  badge_earned: [
    "كفو! حصلت شارة جديدة 👑",
    "إنجاز جميل! شارة جديدة باسمك ⭐",
    "ما شاء الله! فتحت شارة جديدة 🏅",
  ],
  leaderboard_rank: [
    "كفو يا بطل! دخلت قائمة الشرف 👑",
    "مستواك يرتفع بسرعة.. استمر 👏",
    "يا نجم! ترتيبك الأسبوعي ممتاز 🌟",
  ],
};

function pick(arr) {
  if (!Array.isArray(arr) || arr.length === 0) return "";
  return arr[Math.floor(Math.random() * arr.length)] || arr[0];
}

export function getChallengeMessage(type) {
  return pick(PACKS[type] || []);
}
