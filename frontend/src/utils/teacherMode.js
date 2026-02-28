import { readTeacherQuickSettings } from "./teacherQuickSettings";

const TEACHER_MODE_KEY = "mb_teacher_mode";
const TEACHER_MODE_USER_KEY = "mb_teacher_mode_user";

export function isTeacherModeEnabled() {
  return window.localStorage.getItem(TEACHER_MODE_KEY) === "true";
}

export function enableTeacherMode(username = "") {
  window.localStorage.setItem(TEACHER_MODE_KEY, "true");
  if (username) {
    window.localStorage.setItem(TEACHER_MODE_USER_KEY, String(username));
  }
}

export function disableTeacherMode() {
  window.localStorage.removeItem(TEACHER_MODE_KEY);
  window.localStorage.removeItem(TEACHER_MODE_USER_KEY);
}

export function getTeacherModeUser() {
  return String(window.localStorage.getItem(TEACHER_MODE_USER_KEY) || "").trim();
}

export function verifyTeacherCredentials({ username, password }) {
  const settings = readTeacherQuickSettings();
  const expectedUsername = String(settings.teacher_username || "aisha").trim().toLowerCase();
  const expectedPassword = String(settings.teacher_password || "Aisha1234");
  return (
    String(username || "").trim().toLowerCase() === expectedUsername &&
    String(password || "") === expectedPassword
  );
}

export function verifyTeacherPasscode(input) {
  const settings = readTeacherQuickSettings();
  return String(input || "") === String(settings.teacher_passcode || "1234");
}

export { TEACHER_MODE_KEY, TEACHER_MODE_USER_KEY };
