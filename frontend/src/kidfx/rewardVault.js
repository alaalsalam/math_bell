const REWARD_VAULT_PREFIX = "mb_reward_vault_v1";

function safeNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function buildStorageKey(studentId) {
  const keyPart = String(studentId || "guest").trim() || "guest";
  return `${REWARD_VAULT_PREFIX}:${keyPart}`;
}

function normalizeVault(raw) {
  const data = raw && typeof raw === "object" ? raw : {};
  const processedSessions = Array.isArray(data.processed_sessions)
    ? data.processed_sessions.map((id) => String(id)).filter(Boolean).slice(-80)
    : [];

  return {
    total_stars: Math.max(0, safeNumber(data.total_stars)),
    sessions_count: Math.max(0, safeNumber(data.sessions_count)),
    current_streak: Math.max(0, safeNumber(data.current_streak)),
    best_streak: Math.max(0, safeNumber(data.best_streak)),
    level: Math.max(1, safeNumber(data.level, 1)),
    badges_unlocked: Math.max(0, safeNumber(data.badges_unlocked)),
    perfect_sessions: Math.max(0, safeNumber(data.perfect_sessions)),
    last_session_at: String(data.last_session_at || ""),
    processed_sessions: processedSessions,
  };
}

function levelFromStars(totalStars) {
  return 1 + Math.floor(Math.max(0, safeNumber(totalStars)) / 8);
}

export function readRewardVault(studentId) {
  try {
    const raw = window.localStorage.getItem(buildStorageKey(studentId));
    if (!raw) return normalizeVault(null);
    return normalizeVault(JSON.parse(raw));
  } catch {
    return normalizeVault(null);
  }
}

export function writeRewardVault(studentId, value) {
  const normalized = normalizeVault(value);
  try {
    window.localStorage.setItem(buildStorageKey(studentId), JSON.stringify(normalized));
  } catch {
    // Ignore quota/storage issues for MVP.
  }
  return normalized;
}

export function applySessionToRewardVault(studentId, payload) {
  const vault = readRewardVault(studentId);
  const sessionId = String(payload?.session_id || "").trim();

  if (sessionId && vault.processed_sessions.includes(sessionId)) {
    return { vault, applied: false };
  }

  const stars = Math.max(0, safeNumber(payload?.stars));
  const correct = Math.max(0, safeNumber(payload?.correct));
  const attempts = Math.max(0, safeNumber(payload?.attempts));
  const badgesEarned = Math.max(0, safeNumber(payload?.badges_earned_count));
  const streakBroken = Boolean(payload?.streak_broken);

  const next = normalizeVault({
    ...vault,
    total_stars: vault.total_stars + stars,
    sessions_count: vault.sessions_count + 1,
    current_streak: streakBroken ? 1 : vault.current_streak + 1,
    badges_unlocked: vault.badges_unlocked + badgesEarned,
    perfect_sessions: vault.perfect_sessions + (attempts > 0 && correct === attempts ? 1 : 0),
    last_session_at: new Date().toISOString(),
    processed_sessions: sessionId ? [...vault.processed_sessions, sessionId].slice(-80) : vault.processed_sessions,
  });
  next.best_streak = Math.max(vault.best_streak, next.current_streak);
  next.level = levelFromStars(next.total_stars);

  return { vault: writeRewardVault(studentId, next), applied: true };
}

export function getNextLevelTarget(totalStars) {
  const stars = Math.max(0, safeNumber(totalStars));
  const level = levelFromStars(stars);
  const nextLevelTarget = level * 8;
  const progressInLevel = stars - (level - 1) * 8;
  return {
    level,
    next_level_target: nextLevelTarget,
    progress_in_level: Math.max(0, progressInLevel),
    stars_to_next: Math.max(0, nextLevelTarget - stars),
    level_span: 8,
  };
}

