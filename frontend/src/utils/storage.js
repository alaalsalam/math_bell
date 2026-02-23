const STUDENT_KEY = "mb_student";

export function getStoredStudent() {
  try {
    const raw = window.localStorage.getItem(STUDENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function setStoredStudent(student) {
  window.localStorage.setItem(STUDENT_KEY, JSON.stringify(student));
}

export function clearStoredStudent() {
  window.localStorage.removeItem(STUDENT_KEY);
}

export { STUDENT_KEY };
