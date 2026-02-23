import { useEffect, useMemo, useState } from "react";
import PageShell from "../components/PageShell";
import { getTeacherRiskOverview } from "../api/client";

const RISK_LABELS = {
  high: "عالٍ",
  medium: "متوسط",
  low: "منخفض",
};

function TeacherRiskPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [overview, setOverview] = useState(null);
  const [query, setQuery] = useState("");

  async function loadOverview() {
    setLoading(true);
    setError("");
    try {
      const res = await getTeacherRiskOverview();
      setOverview(res?.data || null);
    } catch (err) {
      setError(err.message || "فشل تحميل لوحة المخاطر");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOverview();
  }, []);

  const students = useMemo(() => {
    const rows = overview?.at_risk_students || [];
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => {
      const name = String(row.display_name || "").toLowerCase();
      const skill = String(row.top_risk_skill_title_ar || row.top_risk_skill || "").toLowerCase();
      return name.includes(q) || skill.includes(q);
    });
  }, [overview, query]);

  return (
    <PageShell title="التدخل المبكر" subtitle="طلاب ومهارات معرضة للخطر">
      <section className="teacher-block class-card">
        <div className="filters-row">
          <input
            className="field"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="بحث باسم الطالب أو المهارة"
          />
          <button className="secondary-btn" type="button" onClick={loadOverview}>
            تحديث
          </button>
        </div>
      </section>

      {loading ? <p>...جاري التحميل</p> : null}
      {error ? <p className="error-text">{error}</p> : null}

      {!loading && !error && overview ? (
        <>
          <section className="teacher-stats">
            <article className="stat-card">
              <h3>مخاطر عالية</h3>
              <p>{Number(overview.distribution?.high || 0)}</p>
            </article>
            <article className="stat-card">
              <h3>مخاطر متوسطة</h3>
              <p>{Number(overview.distribution?.medium || 0)}</p>
            </article>
            <article className="stat-card">
              <h3>مخاطر منخفضة</h3>
              <p>{Number(overview.distribution?.low || 0)}</p>
            </article>
          </section>

          <section className="teacher-block sessions-table-wrap">
            <h3>الطلاب الأكثر حاجة للتدخل</h3>
            <table className="sessions-table">
              <thead>
                <tr>
                  <th>الطالب</th>
                  <th>الصف</th>
                  <th>المخاطر</th>
                  <th>المهارة الأكثر خطورة</th>
                  <th>آخر نشاط</th>
                  <th>التدخل المقترح</th>
                </tr>
              </thead>
              <tbody>
                {students.map((row) => (
                  <tr key={row.student_id}>
                    <td>
                      {row.avatar_emoji || "😀"} {row.display_name || row.student_id}
                    </td>
                    <td>{row.grade || "-"}</td>
                    <td>{RISK_LABELS[row.risk_level] || row.risk_level || "-"}</td>
                    <td>{row.top_risk_skill_title_ar || row.top_risk_skill || "-"}</td>
                    <td>{row.last_active || "-"}</td>
                    <td>{row.suggestion || "-"}</td>
                  </tr>
                ))}
                {students.length === 0 ? (
                  <tr>
                    <td colSpan={6}>لا توجد بيانات مخاطر حاليًا.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </section>

          <section className="teacher-block sessions-table-wrap">
            <h3>المهارات المعرضة للخطر</h3>
            <table className="sessions-table">
              <thead>
                <tr>
                  <th>المهارة</th>
                  <th>عدد الطلاب المعرضين</th>
                  <th>أكثر خطأ</th>
                </tr>
              </thead>
              <tbody>
                {(overview.at_risk_skills || []).map((row, index) => (
                  <tr key={`${row.skill || row.title_ar}-${index}`}>
                    <td>{row.title_ar || row.skill}</td>
                    <td>{Number(row.students_at_risk || 0)}</td>
                    <td>{row.top_mistake_type || "random"}</td>
                  </tr>
                ))}
                {(overview.at_risk_skills || []).length === 0 ? (
                  <tr>
                    <td colSpan={3}>لا توجد مهارات عالية المخاطر.</td>
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

export default TeacherRiskPage;
