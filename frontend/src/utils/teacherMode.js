import { readTeacherQuickSettings } from "./teacherQuickSettings";

const TEACHER_MODE_KEY = "mb_teacher_mode";

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
  const settings = readTeacherQuickSettings();
  return String(input || "") === String(settings.teacher_passcode || "1234");
}

export { TEACHER_MODE_KEY };
