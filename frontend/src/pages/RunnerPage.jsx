import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import PageShell from "../components/PageShell";
import { endSession, startSession, submitAttempt } from "../api/client";
import BubblePickGame from "../games/BubblePickGame";
import { getStoredStudent } from "../utils/storage";

const BELL_DURATION_SECONDS = 600;
const ENGINE_COMPONENTS = {
  mcq: BubblePickGame,
};

function normalizeAnswer(answer) {
  if (answer === null || answer === undefined) return "";
  if (typeof answer === "object") return JSON.stringify(answer);
  return String(answer);
}

function isCorrectAnswer(givenAnswer, answerObj) {
  if (!answerObj || typeof answerObj !== "object") return false;

  const value = givenAnswer?.value;
  if (Object.prototype.hasOwnProperty.call(answerObj, "value")) {
    return normalizeAnswer(value) === normalizeAnswer(answerObj.value);
  }

  if (Object.prototype.hasOwnProperty.call(answerObj, "answer")) {
    return normalizeAnswer(value) === normalizeAnswer(answerObj.answer);
  }

  if (Array.isArray(answerObj.correct_choices)) {
    return answerObj.correct_choices.map(normalizeAnswer).includes(normalizeAnswer(value));
  }

  return false;
}

function formatSeconds(totalSeconds) {
  const value = Math.max(0, Number(totalSeconds || 0));
  const mm = String(Math.floor(value / 60)).padStart(2, "0");
  const ss = String(value % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

function RunnerPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const grade = params.get("grade") || "1";
  const domain = params.get("domain") || "Addition";
  const skill = params.get("skill") || "";
  const mode = params.get("mode") || "practice";
  const ui = params.get("ui") || "mcq";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [questions, setQuestions] = useState([]);
  const [index, setIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [questionStartTs, setQuestionStartTs] = useState(Date.now());
  const [remainingSeconds, setRemainingSeconds] = useState(
    mode === "bell_session" ? BELL_DURATION_SECONDS : null
  );

  const didFinishRef = useRef(false);
  const startBellRef = useRef(null);
  const endBellRef = useRef(null);

  const current = questions[index] || null;

  const subtitle = useMemo(() => {
    if (mode === "bell_session") return "حصة الجرس";
    return "تدريب";
  }, [mode]);

  const CurrentEngine = ENGINE_COMPONENTS[current?.question?.ui] || BubblePickGame;

  useEffect(() => {
    startBellRef.current = new Audio("/assets/math_bell/bell_start.mp3");
    endBellRef.current = new Audio("/assets/math_bell/bell_end.mp3");
    return () => {
      startBellRef.current = null;
      endBellRef.current = null;
    };
  }, []);

  useEffect(() => {
    let alive = true;
    const student = getStoredStudent();

    setLoading(true);
    setError("");
    setSessionId("");
    setAttempts(0);
    setCorrect(0);
    didFinishRef.current = false;
    setRemainingSeconds(mode === "bell_session" ? BELL_DURATION_SECONDS : null);

    startSession({
      session_type: mode,
      grade,
      domain,
      skill,
      ui,
      duration_seconds: mode === "bell_session" ? BELL_DURATION_SECONDS : undefined,
      student: student?.student_id,
    })
      .then((res) => {
        if (!alive) return;
        const payload = res?.data || {};
        setSessionId(payload.session_id || "");
        setQuestions(Array.isArray(payload.questions) ? payload.questions : []);
        setIndex(0);
        setQuestionStartTs(Date.now());

        if (mode === "bell_session") {
          startBellRef.current?.play().catch(() => {});
        }
      })
      .catch((err) => {
        if (!alive) return;
        setError(err.message || "فشل بدء الجلسة");
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [grade, domain, skill, mode, ui]);

  useEffect(() => {
    if (mode !== "bell_session") return undefined;
    if (loading || !sessionId || didFinishRef.current) return undefined;

    const timer = window.setInterval(() => {
      setRemainingSeconds((prev) => {
        const next = Number(prev || 0) - 1;
        if (next <= 0) {
          window.clearInterval(timer);
          return 0;
        }
        return next;
      });
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [mode, loading, sessionId]);

  useEffect(() => {
    if (mode !== "bell_session") return;
    if (!sessionId || loading) return;
    if (remainingSeconds === null || remainingSeconds > 0) return;
    if (didFinishRef.current) return;

    didFinishRef.current = true;
    endBellRef.current?.play().catch(() => {});
    endSession({ session_id: sessionId })
      .then((res) => {
        navigate(`/report/${sessionId}`, {
          state: {
            report: res?.data?.report || null,
            mode,
          },
        });
      })
      .catch((err) => {
        setError(err.message || "فشل إنهاء الجلسة");
      });
  }, [remainingSeconds, mode, sessionId, loading, navigate]);

  async function finishSession() {
    if (!sessionId || didFinishRef.current) return;
    didFinishRef.current = true;

    setSubmitting(true);
    try {
      endBellRef.current?.play().catch(() => {});
      const res = await endSession({ session_id: sessionId });
      navigate(`/report/${sessionId}`, {
        state: {
          report: res?.data?.report || null,
          mode,
        },
      });
    } catch (err) {
      setError(err.message || "فشل إنهاء الجلسة");
      didFinishRef.current = false;
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAnswer(givenAnswer, meta = {}) {
    if (!current || submitting || !sessionId || didFinishRef.current) return;

    const spentMs = Math.max(1, Date.now() - questionStartTs);
    const isCorrect = isCorrectAnswer(givenAnswer, current.answer);

    setSubmitting(true);
    try {
      await submitAttempt({
        session_id: sessionId,
        skill: current.skill || skill,
        question_ref: current.question_ref,
        given_answer_json: givenAnswer,
        is_correct: isCorrect ? 1 : 0,
        time_ms: Number(meta.time_ms || spentMs),
        hint_used: Number(meta.hint_used || 0),
      });

      setAttempts((prev) => prev + 1);
      if (isCorrect) setCorrect((prev) => prev + 1);

      const nextIndex = index + 1;
      if (nextIndex >= questions.length) {
        await finishSession();
        return;
      }

      setIndex(nextIndex);
      setQuestionStartTs(Date.now());
    } catch (err) {
      setError(err.message || "فشل إرسال الإجابة");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PageShell title="تشغيل الجلسة" subtitle={subtitle}>
      {loading ? <p>...جاري التحميل</p> : null}
      {error ? <p className="error-text">{error}</p> : null}

      {mode === "bell_session" && remainingSeconds !== null ? (
        <p className="timer-badge">
          الوقت المتبقي: <strong>{formatSeconds(remainingSeconds)}</strong>
        </p>
      ) : null}

      {!loading && !error && questions.length === 0 ? (
        <div>
          <p>لا توجد أسئلة متاحة لهذه المهارة.</p>
          <button type="button" className="secondary-btn" onClick={() => navigate(-1)}>
            رجوع
          </button>
        </div>
      ) : null}

      {!loading && !error && current ? (
        <>
          <div className="runner-meta">
            <span>
              {index + 1} / {questions.length}
            </span>
            <span>
              إجابات صحيحة: {correct} | المحاولات: {attempts}
            </span>
          </div>

          <CurrentEngine question={current.question} disabled={submitting} onAnswer={handleAnswer} />

          <div className="actions-inline">
            <button type="button" className="secondary-btn" onClick={finishSession} disabled={submitting}>
              إنهاء
            </button>
            <span className="hint-text">التالي: أجب للانتقال</span>
          </div>
        </>
      ) : null}
    </PageShell>
  );
}

export default RunnerPage;
