export function getTimeGreeting() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 17) return "صباح الأبطال ☀️";
  return "مساء النجوم ✨";
}

export function personalizedStart(displayName) {
  const name = String(displayName || "بطل").trim();
  return `يلا يا ${name} نبدأ!`;
}

export function personalizedProgress(displayName) {
  const name = String(displayName || "بطل").trim();
  return `مستواك يتحسن يا ${name} 👏`;
}
