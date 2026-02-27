import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PageShell from "../components/PageShell";
import { createClass, getTeacherKpis, getTeacherOverview } from "../api/client";
import { disableTeacherMode } from "../utils/teacherMode";

const DOMAIN_LABELS = {
  Addition: "الجمع",
  Subtraction: "الطرح",
  Fractions: "الكسور",
};

function TinyBars({ rows, valueKey, labelKey, percent = false }) {
  const max = useMemo(() => {
    const values = rows.map((row) => Number(row[valueKey] || 0));
    return Math.max(1, ...values);
  }, [rows, valueKey]);

  return (
    <div className="tiny-bars">
      {rows.map((row, idx) => {
        const value = Number(row[valueKey] || 0);
        const width = Math.max(8, Math.round((value / max) * 100));
        return (
          <div className="tiny-bar-row" key={`${row[labelKey]}-${idx}`}>
            <span className="tiny-bar-label">{row[labelKey]}</span>
            <div className="tiny-bar-track">
              <div className="tiny-bar-fill" style={{ width: `${width}%` }} />
            </div>
            <span className="tiny-bar-value">{percent ? `${Math.round(value * 100)}%` : value}</span>
          </div>
        );
      })}
    </div>
  );
}

function TeacherDashboardPage() {
  const [overview, setOverview] = useState(null);
  const [kpis, setKpis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [title, setTitle] = useState("");
  const [grade, setGrade] = useState("1");
  const [creating, setCreating] = useState(false);

  async function loadOverview() {
    setLoading(true);
    setError("");
    try {
      const [overviewRes, kpisRes] = await Promise.all([getTeacherOverview(), getTeacherKpis()]);
      setOverview(overviewRes?.data || null);
      setKpis(kpisRes?.data || null);
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

  function exitTeacherMode() {
    disableTeacherMode();
    window.location.hash = "#/";
  }

  const sessionBars = (kpis?.sessions_by_day_7d || []).map((row) => ({
    day: String(row.day || "").slice(5),
    sessions: Number(row.sessions || 0),
  }));

  const domainBars = (kpis?.accuracy_by_domain_7d || []).map((row) => ({
    domain: DOMAIN_LABELS[row.domain] || row.domain,
    accuracy: Number(row.accuracy || 0),
  }));

  return (
    <PageShell title="لوحة المعلمة" subtitle="مؤشرات احترافية">
      <div className="teacher-mode-link-wrap">
        <button type="button" className="teacher-link" onClick={exitTeacherMode}>
          إغلاق وضع المعلمة
        </button>
      </div>

      {loading ? <p>...جاري التحميل</p> : null}
      {error ? <p className="error-text">{error}</p> : null}

      {!loading && overview && kpis ? (
        <>
          <section className="teacher-stats">
            <article className="stat-card">
              <h3>إجمالي الطلاب</h3>
              <p>{kpis.total_students || 0}</p>
            </article>
            <article className="stat-card">
              <h3>نشطون اليوم</h3>
              <p>{kpis.active_today || 0}</p>
            </article>
            <article className="stat-card">
              <h3>جلسات اليوم</h3>
              <p>{kpis.sessions_today || 0}</p>
            </article>
            <article className="stat-card">
              <h3>دقة 7 أيام</h3>
              <p>{Math.round((kpis.avg_accuracy_7d || 0) * 100)}%</p>
            </article>
          </section>

          <section className="teacher-block class-grid">
            <article className="class-card">
              <h3>الجلسات حسب اليوم (7 أيام)</h3>
              <TinyBars rows={sessionBars} valueKey="sessions" labelKey="day" />
            </article>
            <article className="class-card">
              <h3>الدقة حسب المجال (7 أيام)</h3>
              <TinyBars rows={domainBars} valueKey="accuracy" labelKey="domain" percent />
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
            <div className="teacher-nav-links">
              <Link className="teacher-link" to="/teacher/students">
                قائمة الطلاب التحليلية
              </Link>
              <Link className="teacher-link" to="/teacher/settings">
                أدوات المعلمة السريعة
              </Link>
              <Link className="teacher-link" to="/teacher/leaderboard">
                لوحة الشرف الأسبوعية
              </Link>
              <Link className="teacher-link" to="/teacher/risk">
                التدخل المبكر
              </Link>
              <Link className="teacher-link" to="/teacher/curriculum">
                باني المنهج
              </Link>
            </div>
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
                  <Link className="teacher-link" to={`/teacher/class/${classRow.name}`}>
                    تقرير الفصل
                  </Link>
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
