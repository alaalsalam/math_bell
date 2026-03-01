import { useEffect, useState } from "react";
import PageShell from "../components/PageShell";
import { getTeacherOverview, getWeeklyLeaderboard } from "../api/client";

function TeacherLeaderboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [classes, setClasses] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [improvers, setImprovers] = useState([]);

  const [grade, setGrade] = useState("");
  const [classGroup, setClassGroup] = useState("");

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const [overviewRes, boardRes] = await Promise.all([
        getTeacherOverview(),
        getWeeklyLeaderboard({
          grade: grade || undefined,
          class_group: classGroup || undefined,
        }),
      ]);
      setClasses(overviewRes?.data?.classes || []);
      setLeaderboard(boardRes?.data?.leaderboard || []);
      setImprovers(boardRes?.data?.top_improvers || []);
    } catch (err) {
      setError(err.message || "فشل تحميل لوحة الشرف");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [grade, classGroup]);

  return (
    <PageShell title="لوحة الشرف الأسبوعية" subtitle="ترتيب + أكثر المتحسنين">
      <section className="teacher-block class-card">
        <p className="hint-text">دليل سريع: الجدول الأول لأفضل الطلاب هذا الأسبوع، والجدول الثاني يوضح الطلاب الأكثر تحسنًا.</p>
      </section>

      <section className="teacher-block class-card">
        <div className="filters-row">
          <select className="field" value={grade} onChange={(e) => setGrade(e.target.value)}>
            <option value="">كل الصفوف</option>
            <option value="1">الصف الأول</option>
            <option value="2">الصف الثاني</option>
          </select>
          <select className="field" value={classGroup} onChange={(e) => setClassGroup(e.target.value)}>
            <option value="">كل الفصول</option>
            {classes.map((row) => (
              <option key={row.name} value={row.name}>
                {row.title}
              </option>
            ))}
          </select>
          <button className="secondary-btn" type="button" onClick={loadData}>
            تحديث
          </button>
        </div>
      </section>

      {loading ? <p>...جاري التحميل</p> : null}
      {error ? <p className="error-text">{error}</p> : null}

      {!loading && !error ? (
        <>
          <section className="teacher-block sessions-table-wrap">
            <h3>أفضل 10 طلاب هذا الأسبوع</h3>
            <table className="sessions-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>الطالب</th>
                  <th>النقاط</th>
                  <th>الصحيح</th>
                  <th>السلسلة</th>
                  <th>الشارات</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((row, idx) => (
                  <tr key={row.name}>
                    <td>{idx + 1}</td>
                    <td>
                      {row.avatar_emoji || "😀"} {row.display_name}
                    </td>
                    <td>{row.points}</td>
                    <td>{row.correct_week}</td>
                    <td>{row.current_streak} 🔥</td>
                    <td>{(row.badges || []).map((b) => b.title_ar).join("، ") || "-"}</td>
                  </tr>
                ))}
                {leaderboard.length === 0 ? (
                  <tr>
                    <td colSpan={6}>لا توجد بيانات بعد.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </section>

          <section className="teacher-block sessions-table-wrap">
            <h3>أكثر الطلاب تحسنًا</h3>
            <table className="sessions-table">
              <thead>
                <tr>
                  <th>الطالب</th>
                  <th>دقة هذا الأسبوع</th>
                  <th>فرق التحسن</th>
                </tr>
              </thead>
              <tbody>
                {improvers.map((row) => (
                  <tr key={`improver-${row.name}`}>
                    <td>
                      {row.avatar_emoji || "😀"} {row.display_name}
                    </td>
                    <td>{Math.round(Number(row.accuracy_week || 0) * 100)}%</td>
                    <td>{Math.round(Number(row.accuracy_delta || 0) * 100)}%</td>
                  </tr>
                ))}
                {improvers.length === 0 ? (
                  <tr>
                    <td colSpan={3}>لا يوجد متحسنون كفاية هذا الأسبوع.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </section>
        </>
      ) : null}
    </PageShell>
  );
}

export default TeacherLeaderboardPage;
