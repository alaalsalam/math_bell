import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PageShell from "../components/PageShell";
import { getTeacherOverview, listStudents } from "../api/client";

function TeacherStudentsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);

  const [grade, setGrade] = useState("");
  const [classGroup, setClassGroup] = useState("");
  const [query, setQuery] = useState("");

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const [overviewRes, studentsRes] = await Promise.all([
        getTeacherOverview(),
        listStudents({ grade: grade || undefined, class_group: classGroup || undefined }),
      ]);
      setClasses(overviewRes?.data?.classes || []);
      setStudents(studentsRes?.data?.students || []);
    } catch (err) {
      setError(err.message || "فشل تحميل قائمة الطلاب");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [grade, classGroup]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return students;
    return students.filter((item) => {
      const name = String(item.display_name || "").toLowerCase();
      const code = String(item.name || "").toLowerCase();
      return name.includes(q) || code.includes(q);
    });
  }, [students, query]);

  return (
    <PageShell title="الطلاب" subtitle="قائمة تحليلية مع فلاتر">
      <section className="teacher-block class-card">
        <div className="filters-row">
          <input
            className="field"
            placeholder="بحث بالاسم"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
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
        <section className="teacher-block sessions-table-wrap">
          <table className="sessions-table">
            <thead>
              <tr>
                <th>الاسم</th>
                <th>الصف</th>
                <th>الفصل</th>
                <th>آخر دخول</th>
                <th>الإجراء</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.name}>
                  <td>
                    {item.avatar_emoji || "😀"} {item.display_name}
                  </td>
                  <td>{item.grade || "-"}</td>
                  <td>{item.class_group || "-"}</td>
                  <td>{item.last_login || "-"}</td>
                  <td>
                    <Link className="teacher-link" to={`/teacher/students/${item.name}`}>
                      عرض التحليل
                    </Link>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5}>لا توجد نتائج.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </section>
      ) : null}
    </PageShell>
  );
}

export default TeacherStudentsPage;
