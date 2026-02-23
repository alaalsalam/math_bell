import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import PageShell from "../components/PageShell";
import Confetti from "../kidfx/confetti";
import { calcStarsFromScore } from "../kidfx/rewards";
import { getSaudiMessage } from "../saudi/saudi_messages";
import { endSession } from "../api/client";

function ReportPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [loading, setLoading] = useState(!location.state?.report);
  const [error, setError] = useState("");
  const [report, setReport] = useState(location.state?.report || null);
  const [showStarsFx, setShowStarsFx] = useState(false);

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
    const timer = window.setTimeout(() => setShowStarsFx(false), 1400);
    return () => window.clearTimeout(timer);
  }, [report]);

  const accuracyPercent = useMemo(() => {
    const accuracy = Number(report?.accuracy || 0);
    return Math.round(accuracy * 100);
  }, [report]);

  const stars = calcStarsFromScore(Number(report?.correct || 0), Number(report?.attempts || 0));
  const streakBroken = Boolean(report?.streak_broken);

  return (
    <PageShell title="النتيجة" subtitle={`Session: ${sessionId || "-"}`}>
      <Confetti active={showStarsFx} />

      {loading ? <p>...جاري التحميل</p> : null}
      {error ? <p className="error-text">{error}</p> : null}

      {!loading && !error && report ? (
        <section className="report-card">
          <p>
            النتيجة: <strong>{accuracyPercent}%</strong>
          </p>
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

          <p className="ok-text">{getSaudiMessage("daily_comeback")}</p>
          {report.daily_challenge ? <p className="ok-text">يا سلام عليك! ختمت تحدي اليوم 🔥</p> : null}
          {(report.earned_badges || []).length ? (
            <p className="ok-text">
              شارات جديدة: {(report.earned_badges || []).map((item) => item.title_ar).join("، ")}
            </p>
          ) : null}
          {streakBroken ? <p className="error-text">فاتك أمس 😢 بس نقدر نرجع أقوى اليوم!</p> : null}

          <div className="actions-inline">
            <button type="button" className="primary-btn" onClick={() => navigate("/play")}>ابدأ تحدي جديد</button>
            <button type="button" className="secondary-btn" onClick={() => navigate("/dashboard")}>أرجع للوحة</button>
          </div>
        </section>
      ) : null}
    </PageShell>
  );
}

export default ReportPage;
