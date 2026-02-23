export const correctPhrases = ["كفو يا بطل! 👏", "يا سلام! ✨", "بطل! 🔥", "ممتاز يا نجم! ⭐", "عساك على القوة! 💚"];
export const wrongPhrases = ["قريب مره… جرّب ثانية 😉", "لا يهمك، حاول مرة ثانية 💪", "ركز شوي يا بطل 👀"];
export const welcomePhrases = ["هيا نبدأ المغامرة!", "جاهز يا نجم؟", "اليوم يومك! 🔥"];
export const regionTeasers = ["فيها تحديات ممتعة", "جاهزة للأبطال", "خلّك مركز وبتبدع"];

export function pickPhrase(list = [], fallback = "") {
  if (!Array.isArray(list) || list.length === 0) return fallback;
  const index = Math.floor(Math.random() * list.length);
  return list[index] || fallback;
}
