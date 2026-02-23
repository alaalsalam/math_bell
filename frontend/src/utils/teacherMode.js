const TEACHER_MODE_KEY = "mb_teacher_mode";
const TEACHER_PASSCODE = "1234";

export function isTeacherModeEnabled() {
  return window.localStorage.getItem(TEACHER_MODE_KEY) === "true";
}

export function enableTeacherMode() {
  window.localStorage.setItem(TEACHER_MODE_KEY, "true");
}

export function disableTeacherMode() {
  window.localStorage.removeItem(TEACHER_MODE_KEY);
}

export function verifyTeacherPasscode(input) {
  return String(input || "") === TEACHER_PASSCODE;
}

export { TEACHER_MODE_KEY, TEACHER_PASSCODE };
