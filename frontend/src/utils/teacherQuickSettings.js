const TEACHER_QUICK_SETTINGS_KEY = "mb_teacher_quick_settings_v1";

const DEFAULT_TEACHER_QUICK_SETTINGS = {
  teacher_passcode: "1234",
  default_bell_duration_seconds: 600,
  default_questions_per_session: 10,
  enable_sound: 1,
  enable_confetti: 1,
  enable_balloons: 1,
  show_only_skills_with_questions: 1,
  enabled_game_engines: ["mcq", "drag_drop_groups", "vertical_column", "fraction_builder"],
};

function sanitizeList(value) {
  if (!Array.isArray(value)) return DEFAULT_TEACHER_QUICK_SETTINGS.enabled_game_engines;
  const clean = value.map((item) => String(item)).filter(Boolean);
  return clean.length ? clean : DEFAULT_TEACHER_QUICK_SETTINGS.enabled_game_engines;
}

function normalizeSettings(input) {
  const raw = input && typeof input === "object" ? input : {};
  return {
    teacher_passcode: String(raw.teacher_passcode || DEFAULT_TEACHER_QUICK_SETTINGS.teacher_passcode),
    default_bell_duration_seconds: Math.max(120, Number(raw.default_bell_duration_seconds || 600)),
    default_questions_per_session: Math.max(3, Number(raw.default_questions_per_session || 10)),
    enable_sound: Number(raw.enable_sound) ? 1 : 0,
    enable_confetti: Number(raw.enable_confetti) ? 1 : 0,
    enable_balloons: Number(raw.enable_balloons) ? 1 : 0,
    show_only_skills_with_questions: Number(raw.show_only_skills_with_questions) ? 1 : 0,
    enabled_game_engines: sanitizeList(raw.enabled_game_engines),
  };
}

export function readTeacherQuickSettings() {
  try {
    const raw = window.localStorage.getItem(TEACHER_QUICK_SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_TEACHER_QUICK_SETTINGS };
    return normalizeSettings(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_TEACHER_QUICK_SETTINGS };
  }
}

export function writeTeacherQuickSettings(value) {
  const normalized = normalizeSettings(value);
  try {
    window.localStorage.setItem(TEACHER_QUICK_SETTINGS_KEY, JSON.stringify(normalized));
  } catch {
    // Ignore storage issues in MVP.
  }
  return normalized;
}

export function mergeTeacherSettings(remoteSettings = null) {
  const local = readTeacherQuickSettings();
  const remote = normalizeSettings(remoteSettings || {});
  return {
    ...remote,
    ...local,
  };
}

export { DEFAULT_TEACHER_QUICK_SETTINGS, TEACHER_QUICK_SETTINGS_KEY };

