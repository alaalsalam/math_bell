const METHOD_BASE = "/api/method";

function normalizeError(message, fallback = "حدث خطأ غير متوقع") {
  if (!message) return fallback;
  if (typeof message === "string") return message;
  if (typeof message.message === "string") return message.message;
  return fallback;
}

async function request(methodPath, payload = null) {
  const url = `${METHOD_BASE}/${methodPath}`;
  const options = {
    method: payload ? "POST" : "GET",
    credentials: "include",
    headers: {
      Accept: "application/json",
    },
  };

  if (payload) {
    const body = new URLSearchParams();
    Object.entries(payload).forEach(([key, value]) => {
      if (value === undefined || value === null || value === "") return;
      body.append(key, typeof value === "object" ? JSON.stringify(value) : String(value));
    });
    options.body = body;
  }

  const response = await fetch(url, options);
  let data = null;

  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const httpError = data?.exception || data?.message || response.statusText;
    throw new Error(normalizeError(httpError, `HTTP ${response.status}`));
  }

  const message = data?.message;

  if (!message) {
    throw new Error("استجابة غير صالحة من الخادم");
  }

  if (message.ok === false) {
    const backendError = message.error || message.message || data?.exception;
    throw new Error(normalizeError(backendError));
  }

  return message;
}

export async function getBootstrap() {
  return request("math_bell.api.bootstrap.get_bootstrap");
}

export async function joinClass({ join_code, display_name, password_simple, grade, avatar_emoji }) {
  return request("math_bell.api.student_auth.join_class", {
    join_code,
    display_name,
    password_simple,
    grade,
    avatar_emoji,
  });
}

export async function loginStudent({ display_name, password_simple }) {
  return request("math_bell.api.student_auth.login_student", {
    display_name,
    password_simple,
  });
}

export async function startSession({ session_type, grade, domain, skill, student, duration_seconds, ui }) {
  return request("math_bell.api.sessions.start_session", {
    session_type,
    grade,
    domain,
    skill,
    student,
    duration_seconds,
    ui,
  });
}

export async function submitAttempt({
  session_id,
  skill,
  question_ref,
  given_answer_json,
  is_correct,
  time_ms,
  hint_used,
}) {
  return request("math_bell.api.sessions.submit_attempt", {
    session_id,
    skill,
    question_ref,
    given_answer_json,
    is_correct,
    time_ms,
    hint_used,
  });
}

export async function endSession({ session_id }) {
  return request("math_bell.api.sessions.end_session", {
    session_id,
  });
}

export async function getTeacherOverview() {
  return request("math_bell.api.teacher.get_teacher_overview");
}

export async function createClass({ title, grade }) {
  return request("math_bell.api.teacher.create_class", {
    title,
    grade,
  });
}

export async function listStudents({ class_group, grade } = {}) {
  return request("math_bell.api.teacher.list_students", {
    class_group,
    grade,
  });
}

export async function getStudentReport({ student_id, date_from, date_to }) {
  return request("math_bell.api.teacher.student_report", {
    student_id,
    date_from,
    date_to,
  });
}

export async function getClassReport({ class_group, date_from, date_to }) {
  return request("math_bell.api.teacher.class_report", {
    class_group,
    date_from,
    date_to,
  });
}

export async function getTeacherKpis() {
  return request("math_bell.api.analytics.teacher_kpis");
}

export async function getStudentDetail({ student_id }) {
  return request("math_bell.api.analytics.student_detail", { student_id });
}

export async function getSystemSettings() {
  return request("math_bell.api.teacher.get_settings");
}

export async function updateSystemSettings(payload) {
  return request("math_bell.api.teacher.update_settings", payload);
}

export async function getStudentHomeInsights({ student_id }) {
  return request("math_bell.api.analytics.student_home", { student_id });
}

export async function getDailyChallenge({ student_id }) {
  return request("math_bell.api.challenges.get_daily_challenge", { student_id });
}

export async function startDailyChallenge({ student_id, ui }) {
  return request("math_bell.api.challenges.start_daily_challenge", { student_id, ui });
}

export async function getWeeklyLeaderboard({ grade, class_group } = {}) {
  return request("math_bell.api.leaderboards.weekly_leaderboard", {
    grade,
    class_group,
  });
}

export async function getStudentWeeklyProgress({ student_id }) {
  return request("math_bell.api.analytics.student_weekly_progress", { student_id });
}
