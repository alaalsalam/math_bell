import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import PageShell from "../components/PageShell";
import { endSession, startDailyChallenge, startSession } from "../api/client";
import Balloons from "../kidfx/balloons";
import Confetti from "../kidfx/confetti";
import { tapHaptic } from "../kidfx/haptics";
import { personalizedProgress } from "../saudi/greetings";
import { playSfx } from "../kidfx/sounds";
import BubblePickGame from "../games/BubblePickGame";
import DragDropGroupsGame from "../games/DragDropGroupsGame";
import VerticalColumnGame from "../games/VerticalColumnGame";
import FractionBuilderGame from "../games/FractionBuilderGame";
import { getStoredStudent } from "../utils/storage";
import { loadBootstrap } from "../utils/bootstrapCache";
import { mergeTeacherSettings } from "../utils/teacherQuickSettings";
import { correctPhrases, pickPhrase, wrongPhrases } from "../ui/saudiCopy";
import { getSaudiMessage } from "../saudi/saudi_messages";

const BELL_DURATION_SECONDS = 600;
const STICKER_MILESTONES = [2, 4, 6, 8, 10, 12, 15, 18, 21, 24, 27, 30];
const SESSION_STICKERS = [
  { emoji: "⭐", title: "نجم البداية", tier: "برونزي", cheer: "بداية قوية يا بطل! هذا أول نجم لك 🌟" },
  { emoji: "🎯", title: "قنّاص الإجابات", tier: "برونزي", cheer: "تصويب ممتاز! تركيزك عالي جدًا 🎯" },
  { emoji: "🏅", title: "صائد النقاط", tier: "فضي", cheer: "يا سلام! نقاطك ترتفع بسرعة خرافية 🏅" },
  { emoji: "🚀", title: "انطلاقة صاروخية", tier: "فضي", cheer: "سرعة + دقة = بطل صاروخي 🚀" },
  { emoji: "🌟", title: "نجم الحصة", tier: "ذهبي", cheer: "أبدعت! مستواك صار يلمع اليوم 🌟" },
  { emoji: "👑", title: "ملك التحدي", tier: "ذهبي", cheer: "يا كفو! لعبك احترافي يا ملك 👑" },
  { emoji: "🏆", title: "كأس الإتقان", tier: "ألماسي", cheer: "أسطورة! وصلت مرحلة الإتقان 🏆" },
];
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

function delay(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, Math.max(0, Number(ms) || 0)));
}

function readingDuration(text, baseMs = 1800) {
  const content = String(text || "").trim();
  const extra = Math.max(0, content.length - 16) * 42;
  return Math.min(4600, Math.max(baseMs, baseMs + extra));
}

function RunnerPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const grade = params.get("grade") || "1";
  const domain = params.get("domain") || "Addition";
  const skill = params.get("skill") || "";
  const mode = params.get("mode") || "practice";
  const ui = params.get("ui") || "mcq";
  const questionCount = Number(params.get("question_count") || 10);
  const durationFromQuery = Number(params.get("duration_seconds") || BELL_DURATION_SECONDS);
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
  const [streakBanner, setStreakBanner] = useState("");
  const [earnedStickers, setEarnedStickers] = useState([]);
  const [newStickerFx, setNewStickerFx] = useState(null);
  const [wrongRetryByQuestion, setWrongRetryByQuestion] = useState({});

  const [fxMessage, setFxMessage] = useState("");
  const [showConfetti, setShowConfetti] = useState(false);
  const [showBalloons, setShowBalloons] = useState(false);
  const [feedback, setFeedback] = useState({ status: "idle", value: null });
  const [mascotMood, setMascotMood] = useState("🙂");
  const [mascotText, setMascotText] = useState("ترى أؤمن فيك 😄");
  const [fxSettings, setFxSettings] = useState({
    enable_sound: 1,
    enable_confetti: 1,
    enable_balloons: 1,
  });

  const didFinishRef = useRef(false);
  const awardedMilestonesRef = useRef(new Set());

  const current = questions[index] || null;
  const accuracyPercent = useMemo(() => {
    if (!attempts) return 0;
    return Math.max(0, Math.min(100, Math.round((correct / attempts) * 100)));
  }, [attempts, correct]);
  const nextStickerTarget = useMemo(
    () => STICKER_MILESTONES.find((value) => value > correct) || null,
    [correct]
  );
  const toNextSticker = useMemo(() => {
    if (!nextStickerTarget) return 0;
    return Math.max(0, nextStickerTarget - correct);
  }, [nextStickerTarget, correct]);

  const subtitle = useMemo(() => {
    if (isDailyChallenge) return "تحدي اليوم 🔥";
    if (mode === "bell_session") return "حصة الجرس";
    return "تدريب";
  }, [isDailyChallenge, mode]);

  const CurrentEngine = ENGINE_COMPONENTS[current?.question?.ui] || BubblePickGame;

  function soundEnabled() {
    return Boolean(Number(fxSettings?.enable_sound ?? 1));
  }

  function confettiEnabled() {
    return Boolean(Number(fxSettings?.enable_confetti ?? 1));
  }

  function balloonsEnabled() {
    return Boolean(Number(fxSettings?.enable_balloons ?? 1));
  }

  function playSound(name, volume) {
    if (!soundEnabled()) return;
    playSfx(name, volume);
  }

  useEffect(() => {
    let alive = true;
    const student = getStoredStudent();
    loadBootstrap({ studentId: student?.student_id || null })
      .then((data) => {
        if (!alive) return;
        setFxSettings(mergeTeacherSettings(data?.settings || {}));
      })
      .catch(() => {
        if (!alive) return;
        setFxSettings(mergeTeacherSettings({}));
      });

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
    setStreakBanner("");
    setEarnedStickers([]);
    setNewStickerFx(null);
    setWrongRetryByQuestion({});
    awardedMilestonesRef.current = new Set();
    setMascotMood("🙂");
    setMascotText("ترى أؤمن فيك 😄");
    didFinishRef.current = false;
    setRemainingSeconds(mode === "bell_session" ? durationFromQuery : null);

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
          question_count: questionCount,
          duration_seconds: mode === "bell_session" ? durationFromQuery : undefined,
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
          playSound("bell_start", 0.8);
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
  }, [grade, domain, skill, mode, ui, isDailyChallenge, questionCount, durationFromQuery]);

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

  function showMessageTemporarily(text, durationMs = 1800) {
    setFxMessage(text);
    window.setTimeout(() => setFxMessage(""), readingDuration(text, durationMs));
  }

  function showStreakBanner(text, durationMs = 2000) {
    if (!text) return;
    setStreakBanner(text);
    window.setTimeout(() => setStreakBanner(""), readingDuration(text, durationMs));
  }

  function awardSticker(rewardIndex = 0) {
    const sticker = SESSION_STICKERS[Math.max(0, rewardIndex) % SESSION_STICKERS.length];
    setEarnedStickers((prev) => {
      const next = [...prev, sticker];
      return next.slice(-10);
    });
    setNewStickerFx(sticker);
    window.setTimeout(() => setNewStickerFx(null), 1600);
    return sticker;
  }

  function maybeAwardMilestoneSticker(nextCorrect, nextStreak) {
    const milestone = STICKER_MILESTONES.find((value) => value === nextCorrect);
    if (!milestone || awardedMilestonesRef.current.has(milestone)) return null;
    awardedMilestonesRef.current.add(milestone);
    const sticker = awardSticker(awardedMilestonesRef.current.size - 1);
    if (!sticker) return null;

    if (nextStreak >= 3) {
      triggerConfetti(1500);
      triggerBalloons(2300);
      playSound("applause", 0.85);
    } else {
      triggerConfetti(1000);
      playSound("applause", 0.6);
    }
    showMessageTemporarily(sticker.cheer, 2400);
    showStreakBanner(`ملصق جديد: ${sticker.emoji} ${sticker.title} (${sticker.tier})`, 2600);
    setMascotText(sticker.cheer);
    return sticker;
  }

  function triggerConfetti(duration = 1000) {
    if (!confettiEnabled()) return;
    setShowConfetti(true);
    window.setTimeout(() => setShowConfetti(false), duration);
  }

  function triggerBalloons(duration = 2000) {
    if (!balloonsEnabled()) return;
    setShowBalloons(true);
    window.setTimeout(() => setShowBalloons(false), duration);
  }

  function showHintBubble(text, durationMs = 2600) {
    if (!text) return;
    setHintBubble(text);
    window.setTimeout(() => setHintBubble(""), readingDuration(text, durationMs));
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
    playSound("pop", 0.45);
    showHintBubble(`تلميح: ${hintText}`);
  }

  useEffect(() => {
    if (mode !== "bell_session") return;
    if (!sessionId || loading) return;
    if (remainingSeconds === null || remainingSeconds > 0) return;
    if (didFinishRef.current) return;

    didFinishRef.current = true;
    setMascotMood("🥳");
    playSound("bell_end", 0.85);
    playSound("applause", 0.7);
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
          replace: true,
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
      playSound("bell_end", 0.85);
      playSound("applause", 0.7);
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
          replace: true,
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

    tapHaptic([10]);
    playSound("pop", 0.24);
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
      window.setTimeout(
        () => setFeedback({ status: "idle", value: null }),
        isCorrect ? 1300 : 2200
      );
      setPendingHintCount(0);
      setMistakeBadge("");
      let readingPauseMs = 0;

      if (isCorrect) {
        const nextStreak = streakCorrect + 1;
        const nextCorrect = correct + 1;
        setMascotMood("😄");
        tapHaptic([18, 28]);
        playSound("correct", 0.85);
        if (nextStreak % 2 === 0) playSound("applause", 0.45);
        triggerConfetti(1000);
        const correctText = pickPhrase(correctPhrases, "كفو يا بطل! 👏");
        showMessageTemporarily(correctText, 1700);
        readingPauseMs = Math.max(readingPauseMs, 1100);
        if (nextStreak >= 3) {
          const streakText = getSaudiMessage("streak");
          showStreakBanner(streakText, 2100);
          setMascotText(streakText);
          readingPauseMs = Math.max(readingPauseMs, 1300);
        } else if (getStoredStudent()?.display_name) {
          setMascotText(personalizedProgress(getStoredStudent().display_name));
        }
        if (nextStreak % 3 === 0) {
          triggerBalloons(2000);
          playSound("pop", 0.5);
          showStreakBanner("سلسلة نار! كمل يا وحش 🔥", 2300);
          readingPauseMs = Math.max(readingPauseMs, 1400);
        }
        const milestoneSticker = maybeAwardMilestoneSticker(nextCorrect, nextStreak);
        if (!milestoneSticker && nextCorrect % 5 === 0) {
          triggerConfetti(1200);
          playSound("applause", 0.65);
          const levelText = getSaudiMessage("level_up");
          showMessageTemporarily(levelText, 2200);
          readingPauseMs = Math.max(readingPauseMs, 1400);
        }
      } else {
        setMascotMood("🤔");
        tapHaptic([45]);
        playSound("wrong", 0.7);
        const wrongText = pickPhrase(wrongPhrases, "قريب مره… جرّب ثانية 😉");
        showMessageTemporarily(wrongText, 2800);
        setMascotText("بس ركز معي شوي 👀");
        setStreakBanner("");
        readingPauseMs = Math.max(readingPauseMs, 2300);
        if (backendHint) {
          showHintBubble(backendHint, 3200);
          readingPauseMs = Math.max(readingPauseMs, 2800);
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
        if (current?.question_ref) {
          setWrongRetryByQuestion((prev) => {
            if (!prev[current.question_ref]) return prev;
            const next = { ...prev };
            delete next[current.question_ref];
            return next;
          });
        }
      } else {
        setStreakCorrect(0);
        const currentRef = current?.question_ref;
        const retries = currentRef ? Number(wrongRetryByQuestion[currentRef] || 0) : 0;
        if (currentRef && retries < 1) {
          setWrongRetryByQuestion((prev) => ({ ...prev, [currentRef]: retries + 1 }));
          showHintBubble("يلا نجرب نفس السؤال مرة ثانية بهدوء 💪", 2800);
          setQuestionStartTs(Date.now());
          return;
        }
      }

      const nextIndex = index + 1;
      if (nextIndex >= questions.length) {
        if (readingPauseMs > 0) await delay(Math.min(readingPauseMs, 2400));
        await finishSession();
        return;
      }

      if (readingPauseMs > 0) {
        await delay(readingPauseMs);
      }
      if (didFinishRef.current) return;

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
      {!loading && error ? (
        <div className="actions-inline">
          <button type="button" className="primary-btn" onClick={() => navigate("/world", { replace: true })}>
            العودة لعالم المغامرة
          </button>
          <button type="button" className="secondary-btn" onClick={() => navigate("/dashboard", { replace: true })}>
            الذهاب إلى لوحة الإنجازات
          </button>
        </div>
      ) : null}

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
          {streakBanner ? <div className="streak-banner">{streakBanner}</div> : null}
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

          <div className="runner-status-grid">
            <div className={`streak-chip ${streakCorrect >= 3 ? "hot" : ""}`}>
              سلسلة النجاح: {streakCorrect} 🔥
            </div>
            <div className="ring-wrap">
              <div>
                <div className="progress-ring runner-progress-ring" style={{ "--progress": `${accuracyPercent}%` }}>
                  <span>{accuracyPercent}%</span>
                </div>
                <small className="hint-text">نسبة الدقة</small>
              </div>
            </div>
            <div className="sticker-pouch">
              <small>ملصقات الأبطال</small>
              <div className="sticker-next-meter">
                {nextStickerTarget ? (
                  <strong>باقي {toNextSticker} صح للملصق القادم</strong>
                ) : (
                  <strong>ختمت كل ملصقات الحصة! يا أسطورة 👑</strong>
                )}
              </div>
              <div className="sticker-row">
                {earnedStickers.length ? (
                  earnedStickers.map((sticker, stickerIndex) => (
                    <span key={`${stickerIndex}-${sticker.emoji}-${sticker.title}`} className="sticker-token">
                      {sticker.emoji}
                    </span>
                  ))
                ) : (
                  <span className="sticker-empty">أول ملصق يفتح عند 2 إجابات صحيحة ✨</span>
                )}
              </div>
              {earnedStickers.length ? (
                <p className="sticker-last-title">
                  آخر ملصق: {earnedStickers[earnedStickers.length - 1].emoji}{" "}
                  {earnedStickers[earnedStickers.length - 1].title}
                </p>
              ) : null}
            </div>
          </div>

          {newStickerFx ? (
            <div className="new-sticker-fx">
              <span className="sticker-fx-emoji">{newStickerFx.emoji}</span>
              <span>ملصق جديد!</span>
              <strong>{newStickerFx.title}</strong>
              <small>{newStickerFx.tier}</small>
            </div>
          ) : null}

          <div className="question-stage" key={`question-${index}`}>
            <CurrentEngine
              question={current.question}
              disabled={submitting}
              onAnswer={handleAnswer}
              feedback={feedback}
              questionIndex={index}
              totalQuestions={questions.length}
            />
          </div>

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
