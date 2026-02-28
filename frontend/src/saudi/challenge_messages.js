const PACKS = {
  challenge_start: [
    "جاهز للتحدي؟ يلا نكسرها 🔥",
    "شد الحيل يا بطل، تحدي اليوم ينتظرك 💪",
    "يلا نبدأ تحدي قوي وممتع 😎",
    "تركيزك اليوم يصنع الفارق يا نجم ⚡",
    "مستعدين؟ يلا نخطف الفوز 🎯",
    "خل الحماس شغال… وتحدي اليوم عليك 👑",
    "ابدأ بثقة، والباقي سهل بإذن الله ✨",
  ],
  challenge_done: [
    "يا سلام عليك! ختمت تحدي اليوم 🔥",
    "كفو يا بطل! أنجزت التحدي اليومي 👏",
    "أبدعت! تحدي اليوم صار منجز ✅",
    "ختمتها يا وحش! إنجاز مرتب 💥",
    "شغل نظيف! التحدي تحت السيطرة 💪",
    "اليوم يومك يا بطل، أنجزت بامتياز 🏆",
  ],
  badge_earned: [
    "كفو! حصلت شارة جديدة 👑",
    "إنجاز جميل! شارة جديدة باسمك ⭐",
    "ما شاء الله! فتحت شارة جديدة 🏅",
    "يا زينها عليك! شارة جديدة تلمع ✨",
    "ترقية معنوية قوية يا نجم 🌟",
    "إنجاز يستاهل التصفيق 👏",
  ],
  leaderboard_rank: [
    "كفو يا بطل! دخلت قائمة الشرف 👑",
    "مستواك يرتفع بسرعة.. استمر 👏",
    "يا نجم! ترتيبك الأسبوعي ممتاز 🌟",
    "اسمك صار بين الكبار… عز الله أنك بطل 🚀",
    "ترتيبك يشرف، استمر على نفس القوة 💥",
    "طلعت قدها وأكثر يا ذيب 🎖️",
  ],
};

const LAST_PICK = {};

function pick(arr) {
  if (!Array.isArray(arr) || arr.length === 0) return "";
  if (arr.length === 1) return arr[0];
  const key = arr.join("|");
  const previous = Number.isInteger(LAST_PICK[key]) ? LAST_PICK[key] : -1;
  let index = Math.floor(Math.random() * arr.length);
  if (index === previous) {
    index = (index + 1 + Math.floor(Math.random() * (arr.length - 1))) % arr.length;
  }
  LAST_PICK[key] = index;
  return arr[index] || arr[0];
}

export function getChallengeMessage(type) {
  return pick(PACKS[type] || []);
}
