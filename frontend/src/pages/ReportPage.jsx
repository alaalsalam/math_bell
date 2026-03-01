import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import PageShell from "../components/PageShell";
import Confetti from "../kidfx/confetti";
import { calcStarsFromScore } from "../kidfx/rewards";
import { applySessionToRewardVault, getNextLevelTarget, readRewardVault } from "../kidfx/rewardVault";
import { tapHaptic } from "../kidfx/haptics";
import { playSfx } from "../kidfx/sounds";
import { getChallengeMessage } from "../saudi/challenge_messages";
import { getSaudiMessage } from "../saudi/saudi_messages";
import { endSession } from "../api/client";
import { getStoredStudent } from "../utils/storage";

function ReportPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const student = getStoredStudent();

  const [loading, setLoading] = useState(!location.state?.report);
  const [error, setError] = useState("");
  const [report, setReport] = useState(location.state?.report || null);
  const [showStarsFx, setShowStarsFx] = useState(false);
  const [vault, setVault] = useState(() => readRewardVault(student?.student_id));

  useEffect(() => {
    if (report) return;

    let alive = true;
    setLoading(true);
    endSession({ session_id: sessionId })
      .then((res) => {
        if (!alive) return;
        setReport(res?.data?.report || null);
      })
      .catch((err) => {
        if (!alive) return;
        setError(err.message || "فشل تحميل النتيجة");
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [sessionId, report]);

  useEffect(() => {
    if (!report) return;
    setShowStarsFx(true);
    tapHaptic([20, 30, 20]);
    playSfx("applause", 0.58);
    playSfx("correct", 0.45);
    const timer = window.setTimeout(() => setShowStarsFx(false), 1400);
    return () => window.clearTimeout(timer);
  }, [report]);

  const accuracyPercent = useMemo(() => {
    const accuracy = Number(report?.accuracy || 0);
    return Math.round(accuracy * 100);
  }, [report]);

  const stars = calcStarsFromScore(Number(report?.correct || 0), Number(report?.attempts || 0));
  const streakBroken = Boolean(report?.streak_broken);
  const studentId = student?.student_id;

  useEffect(() => {
    if (!report) return;
    const result = applySessionToRewardVault(studentId, {
      session_id: sessionId,
      stars,
      correct: Number(report?.correct || 0),
      attempts: Number(report?.attempts || 0),
      streak_broken: streakBroken,
      badges_earned_count: (report?.earned_badges || []).length,
    });
    setVault(result.vault);
  }, [report, sessionId, stars, streakBroken, studentId]);

  const levelInfo = useMemo(() => getNextLevelTarget(vault?.total_stars || 0), [vault?.total_stars]);
  const levelProgressPercent = Math.max(
    8,
    Math.min(100, Math.round((Number(levelInfo.progress_in_level || 0) * 100) / Math.max(1, Number(levelInfo.level_span || 8))))
  );
  const sessionMood =
    accuracyPercent >= 90
      ? "أداء أسطوري يا بطل! 🔥"
      : accuracyPercent >= 70
      ? "شغل ممتاز! خطوة رهيبة 👏"
      : "بداية جميلة… والجاي أقوى 💪";
  const rewardEmojis = Array.from({ length: Math.max(1, stars) }, (_, idx) => ["⭐", "🏅", "🎯", "🚀"][idx % 4]);

  return (
    <PageShell title="النتيجة" subtitle="أحسنت يا بطل! 🌟">
      <Confetti active={showStarsFx} />

      {loading ? <p>...جاري التحميل</p> : null}
      {error ? <p className="error-text">{error}</p> : null}

      {!loading && !error && report ? (
        <section className="report-card">
          <div className="report-hero-banner">
            <strong>{sessionMood}</strong>
            <span>إعداد وتقديم: الأستاذة عائشة الحارثي</span>
          </div>

          <p>
            النتيجة: <strong>{accuracyPercent}%</strong>
          </p>
          <p className="hint-text">نسبة الدقة = عدد الإجابات الصحيحة ÷ عدد المحاولات.</p>
          <p>
            إجابات صحيحة: <strong>{report.correct || 0}</strong> / المحاولات: <strong>{report.attempts || 0}</strong>
          </p>
          <p>
            الوقت المستغرق: <strong>{report.duration_seconds || 0}</strong> ثانية
          </p>
          <p className="stars-fx-row">
            النجوم:
            <strong className="stars-fx">{"★".repeat(stars)}</strong>
          </p>

          <div className="reward-emoji-row">
            {rewardEmojis.map((icon, idx) => (
              <span key={`${icon}-${idx}`} className="reward-emoji-token">
                {icon}
              </span>
            ))}
          </div>

          <div className="report-progress-grid">
            <article className="report-progress-card">
              <h4>مستواك الحالي</h4>
              <p className="report-progress-value">Lv. {vault?.level || 1}</p>
              <small>يرتفع المستوى كلما جمعت نجوم أكثر. المجموع: {vault?.total_stars || 0} ⭐</small>
            </article>
            <article className="report-progress-card">
              <h4>سلسلتك</h4>
              <p className="report-progress-value">{vault?.current_streak || 0} 🔥</p>
              <small>عدد الأيام المتتالية الحالية. أفضل سلسلة: {vault?.best_streak || 0}</small>
            </article>
            <article className="report-progress-card">
              <h4>شاراتك</h4>
              <p className="report-progress-value">{vault?.badges_unlocked || 0} 🏆</p>
              <small>جلسات كاملة: {vault?.perfect_sessions || 0}</small>
            </article>
          </div>

          <div className="next-level-box">
            <p>
              للمستوى القادم تحتاج: <strong>{levelInfo.stars_to_next}</strong> نجمة
            </p>
            <div className="mastery-track">
              <div className="mastery-fill green" style={{ width: `${levelProgressPercent}%` }} />
            </div>
            <small>التقدم داخل المستوى: {levelProgressPercent}%</small>
          </div>

          <p className="ok-text">{getSaudiMessage("daily_comeback")}</p>
          {report.daily_challenge ? <p className="ok-text">{getChallengeMessage("challenge_done")}</p> : null}
          {(report.earned_badges || []).length ? (
            <p className="ok-text">
              {getChallengeMessage("badge_earned")}: {(report.earned_badges || []).map((item) => item.title_ar).join("، ")}
            </p>
          ) : null}
          {streakBroken ? <p className="error-text">فاتك أمس 😢 بس نقدر نرجع أقوى اليوم!</p> : null}
          <p className="aisha-signature">ممتاز يا بطل — الأستاذة عائشة الحارثي</p>

          <div className="actions-inline">
            <button type="button" className="primary-btn" onClick={() => navigate("/play")}>ابدأ تحدي جديد</button>
            <button type="button" className="primary-btn" onClick={() => navigate(`/g/${student?.grade || 1}`)}>كمل السلسلة 🔥</button>
            <button type="button" className="secondary-btn" onClick={() => navigate("/dashboard")}>أرجع للوحة</button>
          </div>
        </section>
      ) : null}
    </PageShell>
  );
}

export default ReportPage;
