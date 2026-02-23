export function calcStarsFromScore(correct, attempts) {
  const solved = Number(correct || 0);
  const total = Number(attempts || 0);

  if (total <= 0) return 1;
  if (solved === 10 && total === 10) return 3;
  if (solved >= 7) return 2;
  return 1;
}
