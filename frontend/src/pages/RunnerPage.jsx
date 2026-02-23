import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import PageShell from "../components/PageShell";
import { endSession, startSession, submitAttempt } from "../api/client";
import { getStoredStudent } from "../utils/storage";

function normalizeAnswer(answer) {
  if (answer === null || answer === undefined) return "";
  if (typeof answer === "object") return JSON.stringify(answer);
  return String(answer);
}

function isCorrectChoice(choice, answerObj) {
  if (!answerObj || typeof answerObj !== "object") return false;

  if (Object.prototype.hasOwnProperty.call(answerObj, "value")) {
    return normalizeAnswer(choice) === normalizeAnswer(answerObj.value);
  }

  if (Object.prototype.hasOwnProperty.call(answerObj, "answer")) {
    return normalizeAnswer(choice) === normalizeAnswer(answerObj.answer);
  }

  if (Array.isArray(answerObj.correct_choices)) {
    return answerObj.correct_choices.map(normalizeAnswer).includes(normalizeAnswer(choice));
  }

  return false;
}

function RunnerPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const grade = params.get("grade") || "1";
  const domain = params.get("domain") || "Addition";
  const skill = params.get("skill") || "";
  const mode = params.get("mode") || "practice";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [questions, setQuestions] = useState([]);
  const [index, setIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [questionStartTs, setQuestionStartTs] = useState(Date.now());

  const current = questions[index] || null;

  const subtitle = useMemo(() => {
    if (mode === "bell_session") return "حصة الجرس";
    return "تدريب";
  }, [mode]);

  useEffect(() => {
    let alive = true;
    const student = getStoredStudent();

    setLoading(true);
    setError("");
    setSessionId("");

    startSession({
      session_type: mode,
      grade,
      domain,
      skill,
      duration_seconds: mode === "bell_session" ? 600 : undefined,
      student: student?.student_id,
    })
      .then((res) => {
        if (!alive) return;
        const payload = res?.data || {};
        setSessionId(payload.session_id || "");
        setQuestions(Array.isArray(payload.questions) ? payload.questions : []);
        setIndex(0);
        setQuestionStartTs(Date.now());
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
  }, [grade, domain, skill, mode]);

  async function finishSession() {
    if (!sessionId) return;
    setSubmitting(true);
    try {
      const res = await endSession({ session_id: sessionId });
      navigate(`/report/${sessionId}`, {
        state: {
          report: res?.data?.report || null,
          mode,
        },
      });
    } catch (err) {
      setError(err.message || "فشل إنهاء الجلسة");
    } finally {
      setSubmitting(false);
    }
  }

  async function answerQuestion(choice) {
    if (!current || submitting || !sessionId) return;

    const spentMs = Math.max(1, Date.now() - questionStartTs);
    const isCorrect = isCorrectChoice(choice, current.answer);

    setSubmitting(true);
    try {
      await submitAttempt({
        session_id: sessionId,
        skill: current.skill || skill,
        question_ref: current.question_ref,
        given_answer_json: { value: choice },
        is_correct: isCorrect ? 1 : 0,
        time_ms: spentMs,
        hint_used: 0,
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

      {!loading && !error && questions.length === 0 ? (
        <div>
          <p>لا توجد أسئلة متاحة لهذه المهارة.</p>
          <button type="button" className="secondary-btn" onClick={() => navigate(-1)}>
            رجوع
          </button>
        </div>
      ) : null}

      {!loading && !error && current ? (
        <section className="runner-card">
          <div className="runner-meta">
            <span>
              {index + 1} / {questions.length}
            </span>
            <span>
              إجابات صحيحة: {correct} | المحاولات: {attempts}
            </span>
          </div>

          <h2>{current?.question?.text || "سؤال"}</h2>

          <div className="choices-grid">
            {(current?.question?.choices || []).map((choice, choiceIndex) => (
              <button
                type="button"
                key={`${choiceIndex}-${normalizeAnswer(choice)}`}
                className="choice-btn"
                onClick={() => answerQuestion(choice)}
                disabled={submitting}
              >
                {String(choice)}
              </button>
            ))}
          </div>

          <div className="actions-inline">
            <button type="button" className="secondary-btn" onClick={finishSession} disabled={submitting}>
              إنهاء
            </button>
            <span className="hint-text">التالي: اختر إجابة للانتقال</span>
          </div>
        </section>
      ) : null}
    </PageShell>
  );
}

export default RunnerPage;
