export function getTimeGreeting() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "صباح الأبطال ☀️";
  if (hour >= 12 && hour < 17) return "مساء الإبداع يا نجوم 🌤️";
  return "مساء النجوم ✨";
}

export function personalizedStart(displayName) {
  const name = String(displayName || "بطل").trim();
  const lines = [
    `يلا يا ${name} نبدأ!`,
    `هلا ${name}، جاهز نكسرها اليوم؟ 🚀`,
    `${name} يا بطل، وقت النجوم ✨`,
    `حياك ${name}، نخلي الحساب ممتع اليوم 🎯`,
  ];
  return lines[Math.floor(Math.random() * lines.length)];
}

export function personalizedProgress(displayName) {
  const name = String(displayName || "بطل").trim();
  const lines = [
    `مستواك يتحسن يا ${name} 👏`,
    `${name} كفو! تقدم واضح اليوم 📈`,
    `يا سلام يا ${name}، مستواك يفرّح 💚`,
    `${name}، أنت داخل مود الأبطال 🔥`,
  ];
  return lines[Math.floor(Math.random() * lines.length)];
}
