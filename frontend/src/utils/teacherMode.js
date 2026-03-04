import { readTeacherQuickSettings } from "./teacherQuickSettings";

const TEACHER_MODE_KEY = "mb_teacher_mode";
const TEACHER_MODE_USER_KEY = "mb_teacher_mode_user";
const TEACHER_MODE_AUTH_AT_KEY = "mb_teacher_mode_auth_at";
const TEACHER_MODE_SESSION_MS = 1000 * 60 * 60 * 10; // 10 hours

export function isTeacherModeEnabled() {
  if (typeof window === "undefined") return false;

  const enabled = window.localStorage.getItem(TEACHER_MODE_KEY) === "true";
  const username = String(window.localStorage.getItem(TEACHER_MODE_USER_KEY) || "").trim();
  const authAtRaw = String(window.localStorage.getItem(TEACHER_MODE_AUTH_AT_KEY) || "").trim();
  const authAt = Number(authAtRaw || 0);
  const isExpired = !authAt || Number.isNaN(authAt) || Date.now() - authAt > TEACHER_MODE_SESSION_MS;

  if (!enabled || !username || isExpired) {
    if (enabled || username || authAtRaw) {
      disableTeacherMode();
    }
    return false;
  }

  return true;
}

export function enableTeacherMode(username = "") {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TEACHER_MODE_KEY, "true");
  window.localStorage.setItem(TEACHER_MODE_USER_KEY, String(username || "").trim());
  window.localStorage.setItem(TEACHER_MODE_AUTH_AT_KEY, String(Date.now()));
}

export function disableTeacherMode() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(TEACHER_MODE_KEY);
  window.localStorage.removeItem(TEACHER_MODE_USER_KEY);
  window.localStorage.removeItem(TEACHER_MODE_AUTH_AT_KEY);
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
