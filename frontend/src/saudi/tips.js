const TIPS = [
  "إذا ركزت 10 دقائق كل يوم بتصير خطير بالحساب 🔥",
  "جرب تحل بسرعة وبهدوء بنفس الوقت 👌",
  "أغلب الأبطال يغلطون قبل ما ينجحون 💛",
  "خطوة صغيرة يوميًا تسوي فرق كبير 🌟",
  "حاول تراجع السؤال قبل ما تختار الإجابة 👀",
];

export function getDailyTip(date = new Date()) {
  const key = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
  return TIPS[hash % TIPS.length];
}

export default TIPS;
