export function tapHaptic(pattern = [35]) {
  if (typeof window === "undefined") return;
  if (!window.navigator || typeof window.navigator.vibrate !== "function") return;
  window.navigator.vibrate(pattern);
}
