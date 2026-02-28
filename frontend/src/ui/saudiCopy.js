export const correctPhrases = [
  "كفو يا بطل! 👏",
  "يا سلام! ✨",
  "بطل! 🔥",
  "ممتاز يا نجم! ⭐",
  "عساك على القوة! 💚",
  "يا وحش، جوابك ذهب! 🏆",
  "إبداع يا بعدي! 🌟",
  "حل مرتب جدًا… استمر 👌",
  "صقور الحساب كذا شغلهم 💥",
];

export const wrongPhrases = [
  "قريب مره… جرّب ثانية 😉",
  "لا يهمك، حاول مرة ثانية 💪",
  "ركز شوي يا بطل 👀",
  "أنت قدها، نعيدها ونضبطها 🔁",
  "معلش، خطوة واحدة وتجيبها صح ✨",
  "خذ نفس، وارجع لها بهدوء 🧠",
];

export const welcomePhrases = [
  "هيا نبدأ المغامرة!",
  "جاهز يا نجم؟",
  "اليوم يومك! 🔥",
  "يلا ننطلق ونكسب نجوم 🌠",
  "تعال نوريهم شطارتك 😎",
];

export const regionTeasers = [
  "فيها تحديات ممتعة",
  "جاهزة للأبطال",
  "خلّك مركز وبتبدع",
  "مغامراتها تحمس مرة",
  "فيها مفاجآت حلوة ✨",
];

export function pickPhrase(list = [], fallback = "") {
  if (!Array.isArray(list) || list.length === 0) return fallback;
  if (list.length === 1) return list[0] || fallback;
  const first = Math.floor(Math.random() * list.length);
  const second = Math.floor(Math.random() * list.length);
  const index = second === first ? (first + 1) % list.length : second;
  return list[index] || fallback;
}
