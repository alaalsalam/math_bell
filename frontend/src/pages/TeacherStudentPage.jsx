import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import PageShell from "../components/PageShell";
import { getStudentDetail } from "../api/client";

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

  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;

    async function loadData() {
      setLoading(true);
      setError("");
      try {
        const res = await getStudentDetail({ student_id: studentId });
        if (!alive) return;
        setDetail(res?.data || null);
      } catch (err) {
        if (!alive) return;
        setError(err.message || "فشل تحميل تحليل الطالب");
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

  const student = detail?.student || null;
  const timeline = detail?.sessions_timeline || [];
  const topSkills = detail?.top_skills || [];
  const weakSkills = detail?.weak_skills || [];
  const topMistakes = detail?.top_mistakes_last_7d || [];
  const recommendedFocus = detail?.recommended_focus || [];
  const weeklyPlan = detail?.weekly_plan || null;

  const summary = useMemo(() => {
    const sessions = timeline.length;
    const avgAccuracy =
      sessions > 0
        ? Math.round(
            (timeline.reduce((acc, row) => acc + Number(row.accuracy || 0), 0) / Math.max(sessions, 1)) * 100
          )
        : 0;
    return {
      sessions,
      avgAccuracy,
      totalTime: Number(detail?.time_spent_seconds || 0),
      recommendation: detail?.recommended_next_skill || "-",
      stars: Number(detail?.reward_summary?.total_stars_earned || 0),
      currentStreak: Number(detail?.reward_summary?.current_streak || 0),
      bestStreak: Number(detail?.reward_summary?.best_streak || 0),
      currentLevel: Number(detail?.reward_summary?.current_level || 1),
    };
  }, [timeline, detail]);

  return (
    <PageShell title="تحليل الطالب" subtitle={student?.display_name || studentId}>
      {loading ? <p>...جاري التحميل</p> : null}
      {error ? <p className="error-text">{error}</p> : null}

      {!loading && !error && detail ? (
        <>
          <section className="teacher-stats">
            <article className="stat-card">
              <h3>الجلسات</h3>
              <p>{summary.sessions}</p>
            </article>
            <article className="stat-card">
              <h3>الدقة المتوسطة</h3>
              <p>{summary.avgAccuracy}%</p>
            </article>
            <article className="stat-card">
              <h3>الوقت الكلي</h3>
              <p>{summary.totalTime} ث</p>
            </article>
            <article className="stat-card">
              <h3>المهارة المقترحة</h3>
              <p>{summary.recommendation}</p>
            </article>
            <article className="stat-card">
              <h3>المستوى الحالي</h3>
              <p>{summary.currentLevel}</p>
            </article>
            <article className="stat-card">
              <h3>السلسلة الحالية</h3>
              <p>{summary.currentStreak} 🔥</p>
            </article>
            <article className="stat-card">
              <h3>أفضل سلسلة</h3>
              <p>{summary.bestStreak} 🔥</p>
            </article>
            <article className="stat-card">
              <h3>إجمالي النجوم</h3>
              <p>{summary.stars} ⭐</p>
            </article>
          </section>

          <section className="teacher-block class-grid">
            <article className="class-card">
              <h3>نقاط القوة</h3>
              <ul>
                {topSkills.map((row) => (
                  <li key={row.skill}>
                    {row.skill}: {Math.round((row.accuracy || 0) * 100)}% ({row.attempts})
                  </li>
                ))}
                {topSkills.length === 0 ? <li>لا توجد بيانات كافية.</li> : null}
              </ul>
            </article>
            <article className="class-card">
              <h3>نقاط الضعف</h3>
              <ul>
                {weakSkills.map((row) => (
                  <li key={row.skill}>
                    {row.skill}: {Math.round((row.accuracy || 0) * 100)}% ({row.attempts})
                  </li>
                ))}
                {weakSkills.length === 0 ? <li>لا توجد بيانات كافية.</li> : null}
              </ul>
              <button type="button" className="primary-btn" onClick={() => window.alert(`المقترح: ${summary.recommendation}`)}>
                عرض التوصية
              </button>
            </article>
          </section>

          <section className="teacher-block class-grid">
            <article className="class-card">
              <h3>أكثر أخطاء شائعة (آخر 7 أيام)</h3>
              <ul>
                {topMistakes.map((row, idx) => (
                  <li key={`${row.mistake_type}-${idx}`}>
                    {row.mistake_type}: {row.count}
                  </li>
                ))}
                {topMistakes.length === 0 ? <li>لا توجد أخطاء كافية للتحليل.</li> : null}
              </ul>
            </article>
            <article className="class-card">
              <h3>اقتراح تدريب</h3>
              <ul>
                {recommendedFocus.map((item, idx) => (
                  <li key={`${item}-${idx}`}>{item}</li>
                ))}
                {recommendedFocus.length === 0 ? <li>مراجعة قصيرة للمهارات الأساسية.</li> : null}
              </ul>
            </article>
          </section>

          <section className="teacher-block class-card">
            <h3>الخطة الأسبوعية</h3>
            <p>
              من {weeklyPlan?.week_start || "-"} إلى {weeklyPlan?.week_end || "-"}
            </p>
            <p>نسبة الإنجاز: {Math.round(Number(weeklyPlan?.completion_rate || 0))}%</p>
            <p>الالتزام: {weeklyPlan?.days_completed || 0} / 5</p>
            <div className="class-grid">
              {[1, 2, 3, 4, 5].map((dayNo) => {
                const day = weeklyPlan?.plan?.[`day_${dayNo}`] || {};
                return (
                  <article className="class-card" key={`teacher-plan-day-${dayNo}`}>
                    <h4>اليوم {dayNo}</h4>
                    <p>{day.title_ar || "مراجعة عامة"}</p>
                    <p>التركيز: {day.focus || "-"}</p>
                    <p>{day.completed ? "✔ مكتمل" : "غير مكتمل"}</p>
                  </article>
                );
              })}
            </div>
          </section>

          <section className="teacher-block class-card">
            <h3>الأداء حسب المجال</h3>
            <div className="class-grid">
              {Object.entries(detail.attempts_per_domain || {}).map(([domain, row]) => (
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
            <h3>آخر 30 جلسة</h3>
            <div className="sessions-table-wrap">
              <table className="sessions-table">
                <thead>
                  <tr>
                    <th>النوع</th>
                    <th>المجال</th>
                    <th>المهارة</th>
                    <th>بدأت</th>
                    <th>المدة</th>
                    <th>الدقة</th>
                  </tr>
                </thead>
                <tbody>
                  {timeline.map((session) => (
                    <tr key={session.name}>
                      <td>{session.session_type === "bell_session" ? "جرس" : "تدريب"}</td>
                      <td>{DOMAIN_LABELS[session.domain] || session.domain || "-"}</td>
                      <td>{session.skill || "-"}</td>
                      <td>{formatDateTime(session.started_at)}</td>
                      <td>{session.duration_seconds || 0} ث</td>
                      <td>{Math.round((session.accuracy || 0) * 100)}%</td>
                    </tr>
                  ))}
                  {timeline.length === 0 ? (
                    <tr>
                      <td colSpan={6}>لا توجد جلسات.</td>
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
