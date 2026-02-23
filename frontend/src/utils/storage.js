const STUDENT_KEY = "mb_student";

function normalizeStudent(raw) {
  if (!raw || typeof raw !== "object") return null;
  if (!raw.student_id) return null;

  return {
    student_id: raw.student_id,
    student_code: raw.student_code || "",
    grade: raw.grade || "",
    display_name: raw.display_name || "",
    avatar_emoji: raw.avatar_emoji || "😀",
    token: raw.token || "mvp-local",
  };
}

export function getStoredStudent() {
  try {
    const raw = window.localStorage.getItem(STUDENT_KEY);
    if (!raw) return null;
    return normalizeStudent(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function setStoredStudent(student) {
  const normalized = normalizeStudent(student);
  if (!normalized) return;
  window.localStorage.setItem(STUDENT_KEY, JSON.stringify(normalized));
}

export function clearStoredStudent() {
  window.localStorage.removeItem(STUDENT_KEY);
}

export function isStudentLoggedIn() {
  return Boolean(getStoredStudent()?.student_id);
}

export { STUDENT_KEY };
