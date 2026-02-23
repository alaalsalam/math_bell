import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import PageShell from "../components/PageShell";
import { getStudentReport, listStudents } from "../api/client";

const DOMAIN_LABELS = {
  Addition: "الجمع",
  Subtraction: "الطرح",
  Fractions: "الكسور",
};

function formatDateTime(value) {
  if (!value) return "-";
  return String(value).replace("T", " ").slice(0, 16);
}

function TeacherStudentPage() {
  const { studentId } = useParams();

  const [student, setStudent] = useState(null);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;

    async function loadData() {
      setLoading(true);
      setError("");
      try {
        const [studentsRes, reportRes] = await Promise.all([
          listStudents(),
          getStudentReport({ student_id: studentId }),
        ]);

        if (!alive) return;
        const row = (studentsRes?.data?.students || []).find((item) => item.name === studentId) || null;
        setStudent(row);
        setReport(reportRes?.data || null);
      } catch (err) {
        if (!alive) return;
        setError(err.message || "فشل تحميل تقرير الطالب");
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    }

    loadData();

    return () => {
      alive = false;
    };
  }, [studentId]);

  return (
    <PageShell title="تقرير الطالب" subtitle={student?.display_name || studentId}>
      {loading ? <p>...جاري التحميل</p> : null}
      {error ? <p className="error-text">{error}</p> : null}

      {!loading && !error && report ? (
        <>
          <section className="teacher-block">
            <div className="class-card">
              <p>إجمالي الجلسات: {report.sessions_summary?.total || 0}</p>
              <p>تدريب: {report.sessions_summary?.practice_count || 0}</p>
              <p>حصة الجرس: {report.sessions_summary?.bell_count || 0}</p>
              <p>الدقة: {Math.round((report.avg_accuracy || 0) * 100)}%</p>
              <p>
                المحاولات: {report.attempts || 0} | الإجابات الصحيحة: {report.correct || 0}
              </p>
            </div>
          </section>

          <section className="teacher-block">
            <h3>حسب المجال</h3>
            <div className="class-grid">
              {Object.entries(report.domain_breakdown || {}).map(([domain, row]) => (
                <article className="class-card" key={domain}>
                  <h4>{DOMAIN_LABELS[domain] || domain}</h4>
                  <p>المحاولات: {row.attempts || 0}</p>
                  <p>الصحيحة: {row.correct || 0}</p>
                  <p>الدقة: {Math.round((row.accuracy || 0) * 100)}%</p>
                </article>
              ))}
            </div>
          </section>

          <section className="teacher-block">
            <h3>آخر 20 جلسة</h3>
            <div className="sessions-table-wrap">
              <table className="sessions-table">
                <thead>
                  <tr>
                    <th>النوع</th>
                    <th>المجال</th>
                    <th>المهارة</th>
                    <th>بدأت</th>
                    <th>انتهت</th>
                    <th>المدة</th>
                    <th>الدقة</th>
                  </tr>
                </thead>
                <tbody>
                  {(report.recent_sessions || []).map((session, idx) => (
                    <tr key={`${session.started_at || "s"}-${idx}`}>
                      <td>{session.session_type === "bell_session" ? "جرس" : "تدريب"}</td>
                      <td>{DOMAIN_LABELS[session.domain] || session.domain || "-"}</td>
                      <td>{session.skill || "-"}</td>
                      <td>{formatDateTime(session.started_at)}</td>
                      <td>{formatDateTime(session.ended_at)}</td>
                      <td>{session.duration_seconds || 0} ث</td>
                      <td>{Math.round((session.accuracy || 0) * 100)}%</td>
                    </tr>
                  ))}
                  {(report.recent_sessions || []).length === 0 ? (
                    <tr>
                      <td colSpan={7}>لا توجد جلسات حديثة.</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : null}
    </PageShell>
  );
}

export default TeacherStudentPage;
