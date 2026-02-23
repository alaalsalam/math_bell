import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import PageShell from "../components/PageShell";
import { endSession, startDailyChallenge, startSession } from "../api/client";
import Balloons from "../kidfx/balloons";
import Confetti from "../kidfx/confetti";
import { tapHaptic } from "../kidfx/haptics";
import { getRandomMessage } from "../kidfx/messages";
import { getSaudiMessage } from "../saudi/saudi_messages";
import { personalizedProgress, personalizedStart } from "../saudi/greetings";
import { playSfx } from "../kidfx/sounds";
import BubblePickGame from "../games/BubblePickGame";
import DragDropGroupsGame from "../games/DragDropGroupsGame";
import VerticalColumnGame from "../games/VerticalColumnGame";
import FractionBuilderGame from "../games/FractionBuilderGame";
import { getStoredStudent } from "../utils/storage";

const BELL_DURATION_SECONDS = 600;
const ENGINE_COMPONENTS = {
  mcq: BubblePickGame,
  drag_drop_groups: DragDropGroupsGame,
  vertical_column: VerticalColumnGame,
  fraction_builder: FractionBuilderGame,
};

function localHintForQuestion(question) {
  const ui = (question?.ui || "").trim();
  const payload = question?.payload || {};
  const text = String(question?.text || "");

  if (ui === "vertical_column") {
    if (payload.op === "-") return "ابدأ بالآحاد… وإذا احتجت، استلف من الخانة اللي قبلها 😉";
    return "ابدأ بالآحاد… وإذا الناتج أكبر من 9 تذكّر الحمل 🔟";
  }
  if (ui === "fraction_builder") {
    return "عد الأجزاء المظللة أولًا، بعدين اكتبها فوق/تحت 🍕";
  }
  if (text.includes("قارن") && text.includes("/")) {
    return "قارن البسط والمقام بهدوء… وتخيل نفس الشكل 👀";
  }
  if (text.includes("+")) {
    return "اجمع الرقمين خطوة خطوة، وراجع الناتج مرة ثانية ✅";
  }
  if (text.includes("-")) {
    return "اطرح من الأكبر، وركز على ترتيب الخانات 👌";
  }
  return "خذ نفس… وابدأ من الأسهل ثم راجع إجابتك 👍";
}

async function submitAttemptWithCount(payload) {
  const body = new URLSearchParams();
  Object.entries(payload || {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    body.append(key, typeof value === "object" ? JSON.stringify(value) : String(value));
  });

  const response = await fetch("/api/method/math_bell.api.sessions.submit_attempt", {
    method: "POST",
    credentials: "include",
    headers: { Accept: "application/json" },
    body,
  });
  const data = await response.json();
  if (!response.ok || !data?.message) {
    throw new Error(data?.message || response.statusText || "فشل إرسال الإجابة");
  }
  if (data.message.ok === false) {
    throw new Error(data.message.message || data.message.error || "فشل إرسال الإجابة");
  }
  return data.message;
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
  const isDailyChallenge = params.get("daily_challenge") === "1";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [questions, setQuestions] = useState([]);
  const [index, setIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [streakCorrect, setStreakCorrect] = useState(0);
  const [questionStartTs, setQuestionStartTs] = useState(Date.now());
  const [remainingSeconds, setRemainingSeconds] = useState(
    mode === "bell_session" ? BELL_DURATION_SECONDS : null
  );
  const [hintsLeft, setHintsLeft] = useState(2);
  const [pendingHintCount, setPendingHintCount] = useState(0);
  const [hintBubble, setHintBubble] = useState("");
  const [mistakeBadge, setMistakeBadge] = useState("");

  const [fxMessage, setFxMessage] = useState("");
  const [showConfetti, setShowConfetti] = useState(false);
  const [showBalloons, setShowBalloons] = useState(false);
  const [feedback, setFeedback] = useState({ status: "idle", value: null });
  const [mascotMood, setMascotMood] = useState("🙂");
  const [mascotText, setMascotText] = useState("ترى أؤمن فيك 😄");

  const didFinishRef = useRef(false);

  const current = questions[index] || null;

  const subtitle = useMemo(() => {
    if (isDailyChallenge) return "تحدي اليوم 🔥";
    if (mode === "bell_session") return "حصة الجرس";
    return "تدريب";
  }, [isDailyChallenge, mode]);

  const CurrentEngine = ENGINE_COMPONENTS[current?.question?.ui] || BubblePickGame;

  useEffect(() => {
    let alive = true;
    const student = getStoredStudent();

    setLoading(true);
    setError("");
    setSessionId("");
    setAttempts(0);
    setCorrect(0);
    setStreakCorrect(0);
    setFxMessage("");
    setFeedback({ status: "idle", value: null });
    setHintsLeft(2);
    setPendingHintCount(0);
    setHintBubble("");
    setMistakeBadge("");
    setMascotMood("🙂");
    setMascotText("ترى أؤمن فيك 😄");
    didFinishRef.current = false;
    setRemainingSeconds(mode === "bell_session" ? BELL_DURATION_SECONDS : null);

    const action = isDailyChallenge
      ? startDailyChallenge({
          student_id: student?.student_id,
          ui,
        })
      : startSession({
          session_type: mode,
          grade,
          domain,
          skill,
          ui,
          duration_seconds: mode === "bell_session" ? BELL_DURATION_SECONDS : undefined,
          student: student?.student_id,
        });

    action
      .then((res) => {
        if (!alive) return;
        const payload = res?.data || {};
        setSessionId(payload.session_id || "");
        setQuestions(Array.isArray(payload.questions) ? payload.questions : []);
        setIndex(0);
        setQuestionStartTs(Date.now());

        if (mode === "bell_session") {
          playSfx("bell_start", 0.8);
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
  }, [grade, domain, skill, mode, ui, isDailyChallenge]);

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

  function showMessageTemporarily(text) {
    setFxMessage(text);
    window.setTimeout(() => setFxMessage(""), 1200);
  }

  function triggerConfetti(duration = 1000) {
    setShowConfetti(true);
    window.setTimeout(() => setShowConfetti(false), duration);
  }

  function triggerBalloons(duration = 2000) {
    setShowBalloons(true);
    window.setTimeout(() => setShowBalloons(false), duration);
  }

  function showHintBubble(text) {
    if (!text) return;
    setHintBubble(text);
    window.setTimeout(() => setHintBubble(""), 1800);
  }

  function useHintBeforeAnswer() {
    if (submitting || !current) return;
    if (hintsLeft <= 0) {
      showHintBubble("خلصت التلميحات لهذه الحصة ✋");
      return;
    }
    const hintText = localHintForQuestion(current.question);
    setHintsLeft((prev) => Math.max(0, prev - 1));
    setPendingHintCount((prev) => prev + 1);
    playSfx("pop", 0.45);
    showHintBubble(`تلميح: ${hintText}`);
  }

  useEffect(() => {
    if (mode !== "bell_session") return;
    if (!sessionId || loading) return;
    if (remainingSeconds === null || remainingSeconds > 0) return;
    if (didFinishRef.current) return;

    didFinishRef.current = true;
    setMascotMood("🥳");
    playSfx("bell_end", 0.85);
    playSfx("applause", 0.7);
    triggerConfetti(1200);
    triggerBalloons(2200);
    showMessageTemporarily("أحسنت! انتهت الحصة 🔔");

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
    setMascotMood("🥳");

    setSubmitting(true);
    try {
      playSfx("bell_end", 0.85);
      playSfx("applause", 0.7);
      triggerConfetti(1200);
      triggerBalloons(2200);
      showMessageTemporarily("أحسنت! انتهت الحصة 🔔");

      const res = await endSession({ session_id: sessionId });
      window.setTimeout(() => {
        navigate(`/report/${sessionId}`, {
          state: {
            report: res?.data?.report || null,
            mode,
          },
        });
      }, 350);
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
    const pickedValue = givenAnswer?.value;
    const usedHintsForQuestion = Number(meta.hint_used_count || pendingHintCount || 0);
    const usedHint = usedHintsForQuestion > 0 || Number(meta.hint_used || 0) > 0;

    setSubmitting(true);
    try {
      const attemptRes = await submitAttemptWithCount({
        session_id: sessionId,
        skill: current.skill || skill,
        question_ref: current.question_ref,
        given_answer_json: givenAnswer,
        is_correct: 0,
        time_ms: Number(meta.time_ms || spentMs),
        hint_used: usedHint ? 1 : 0,
        hint_used_count: usedHintsForQuestion,
      });
      const isCorrect = Boolean(attemptRes?.data?.is_correct);
      const mistakeType = String(attemptRes?.data?.mistake_type || "none");
      const backendHint = String(attemptRes?.data?.hint_text || "");

      setFeedback({ status: isCorrect ? "correct" : "wrong", value: pickedValue });
      window.setTimeout(() => setFeedback({ status: "idle", value: null }), 700);
      setPendingHintCount(0);
      setMistakeBadge("");

      if (isCorrect) {
        setMascotMood("😄");
        tapHaptic([18, 28]);
        playSfx("correct", 0.85);
        if ((streakCorrect + 1) % 2 === 0) playSfx("applause", 0.45);
        triggerConfetti(1000);
        showMessageTemporarily(getSaudiMessage("correct"));
        if ((streakCorrect + 1) >= 3) showMessageTemporarily(getSaudiMessage("streak"));
        if (getStoredStudent()?.display_name) setMascotText(personalizedProgress(getStoredStudent().display_name));
        if ((streakCorrect + 1) % 3 === 0) {
          triggerBalloons(2000);
          playSfx("pop", 0.5);
        }
        if ((correct + 1) % 5 === 0) {
          triggerConfetti(1200);
          showMessageTemporarily(getSaudiMessage("level_up"));
        }
      } else {
        setMascotMood("🤔");
        tapHaptic([45]);
        playSfx("wrong", 0.7);
        showMessageTemporarily(getSaudiMessage("wrong"));
        setMascotText("بس ركز معي شوي 👀");
        if (backendHint) {
          showHintBubble(backendHint);
        }
        if (mistakeType === "off_by_one") {
          setMistakeBadge("قريب! 🎯");
        } else if (mistakeType === "place_value") {
          setMistakeBadge("انتبه للخانات 🧮");
        }
      }

      setAttempts((prev) => prev + 1);
      if (isCorrect) {
        setCorrect((prev) => prev + 1);
        setStreakCorrect((prev) => prev + 1);
      } else {
        setStreakCorrect(0);
      }

      const nextIndex = index + 1;
      if (nextIndex >= questions.length) {
        await finishSession();
        return;
      }

      setIndex(nextIndex);
      setQuestionStartTs(Date.now());
      setHintBubble("");
      window.setTimeout(() => setMascotMood("🙂"), 500);
    } catch (err) {
      setError(err.message || "فشل إرسال الإجابة");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PageShell title="تشغيل الجلسة" subtitle={subtitle}>
      <Confetti active={showConfetti} />
      <Balloons active={showBalloons} />
      <div className="mascot-helper">{mascotMood}</div>
      <div className="mascot-helper-text">{mascotText}</div>
      {fxMessage ? <div className="kid-message-banner">{fxMessage}</div> : null}
      {hintBubble ? <div className="hint-bubble">{hintBubble}</div> : null}
      {mistakeBadge ? <div className="mistake-badge">{mistakeBadge}</div> : null}

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
            <span>السلسلة: {streakCorrect} 🔥</span>
            <span>التلميحات المتبقية: {hintsLeft} 💡</span>
          </div>

          <CurrentEngine
            question={current.question}
            disabled={submitting}
            onAnswer={handleAnswer}
            feedback={feedback}
            questionIndex={index}
            totalQuestions={questions.length}
          />

          <div className="actions-inline">
            <button
              type="button"
              className="hint-btn"
              onClick={useHintBeforeAnswer}
              disabled={submitting || hintsLeft <= 0}
            >
              تلميح 💡
            </button>
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
