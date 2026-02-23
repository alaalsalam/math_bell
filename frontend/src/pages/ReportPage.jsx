import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import PageShell from "../components/PageShell";
import { endSession } from "../api/client";

function calcStars(accuracyPercent) {
  if (accuracyPercent >= 90) return 3;
  if (accuracyPercent >= 70) return 2;
  return 1;
}

function ReportPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [loading, setLoading] = useState(!location.state?.report);
  const [error, setError] = useState("");
  const [report, setReport] = useState(location.state?.report || null);

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

  const accuracyPercent = useMemo(() => {
    const accuracy = Number(report?.accuracy || 0);
    return Math.round(accuracy * 100);
  }, [report]);

  const stars = calcStars(accuracyPercent);

  return (
    <PageShell title="النتيجة" subtitle={`Session: ${sessionId || "-"}`}>
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
          <p>
            النجوم: <strong>{"★".repeat(stars)}</strong>
          </p>

          <button type="button" className="primary-btn" onClick={() => navigate("/")}>
            العودة للرئيسية
          </button>
        </section>
      ) : null}
    </PageShell>
  );
}

export default ReportPage;
