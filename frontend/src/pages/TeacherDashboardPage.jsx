import { useEffect, useState } from "react";
import PageShell from "../components/PageShell";
import { createClass, getTeacherOverview } from "../api/client";

function TeacherDashboardPage() {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [title, setTitle] = useState("");
  const [grade, setGrade] = useState("1");
  const [creating, setCreating] = useState(false);

  async function loadOverview() {
    setLoading(true);
    setError("");
    try {
      const res = await getTeacherOverview();
      setOverview(res?.data || null);
    } catch (err) {
      setError(err.message || "فشل تحميل لوحة المعلمة");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOverview();
  }, []);

  async function handleCreateClass(event) {
    event.preventDefault();
    if (!title.trim()) return;

    setCreating(true);
    setError("");
    try {
      await createClass({ title: title.trim(), grade });
      setTitle("");
      await loadOverview();
    } catch (err) {
      setError(err.message || "فشل إنشاء الفصل");
    } finally {
      setCreating(false);
    }
  }

  return (
    <PageShell title="لوحة المعلمة" subtitle="نظرة عامة">
      {loading ? <p>...جاري التحميل</p> : null}
      {error ? <p className="error-text">{error}</p> : null}

      {!loading && overview ? (
        <>
          <section className="teacher-stats">
            <article className="stat-card">
              <h3>الفصول</h3>
              <p>{overview.classes?.length || 0}</p>
            </article>
            <article className="stat-card">
              <h3>جلسات آخر 7 أيام</h3>
              <p>{overview.recent_sessions_count || 0}</p>
            </article>
          </section>

          <section className="teacher-block">
            <h3>إنشاء فصل</h3>
            <form className="create-class-form" onSubmit={handleCreateClass}>
              <input
                className="field"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="اسم الفصل"
              />
              <select className="field" value={grade} onChange={(e) => setGrade(e.target.value)}>
                <option value="1">الصف الأول</option>
                <option value="2">الصف الثاني</option>
              </select>
              <button type="submit" className="primary-btn" disabled={creating}>
                {creating ? "..." : "إنشاء فصل"}
              </button>
            </form>
          </section>

          <section className="teacher-block">
            <h3>الفصول</h3>
            <div className="class-grid">
              {(overview.classes || []).map((classRow) => (
                <article className="class-card" key={classRow.name}>
                  <h4>{classRow.title}</h4>
                  <p>الصف: {classRow.grade}</p>
                  <p>رمز الانضمام: {classRow.join_code}</p>
                  <p>عدد الطلاب: {classRow.students_count}</p>
                </article>
              ))}
            </div>
          </section>
        </>
      ) : null}
    </PageShell>
  );
}

export default TeacherDashboardPage;
