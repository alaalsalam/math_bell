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

export async function joinClass({ join_code, display_name, grade }) {
  return request("math_bell.api.student_auth.join_class", {
    join_code,
    display_name,
    grade,
  });
}

export async function startSession({ session_type, grade, domain, skill, student, duration_seconds }) {
  return request("math_bell.api.sessions.start_session", {
    session_type,
    grade,
    domain,
    skill,
    student,
    duration_seconds,
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
