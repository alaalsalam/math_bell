import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import PageShell from "../components/PageShell";
import { getClassReport, getTeacherOverview, listStudents } from "../api/client";

function TeacherClassPage() {
  const { classId } = useParams();

  const [classRow, setClassRow] = useState(null);
  const [students, setStudents] = useState([]);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;

    async function loadData() {
      setLoading(true);
      setError("");
      try {
        const [overviewRes, studentsRes, reportRes] = await Promise.all([
          getTeacherOverview(),
          listStudents({ class_group: classId }),
          getClassReport({ class_group: classId }),
        ]);

        if (!alive) return;
        const classInfo = (overviewRes?.data?.classes || []).find((item) => item.name === classId) || null;
        setClassRow(classInfo);
        setStudents(studentsRes?.data?.students || []);
        setReport(reportRes?.data || null);
      } catch (err) {
        if (!alive) return;
        setError(err.message || "فشل تحميل بيانات الفصل");
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    }

    loadData();

    return () => {
      alive = false;
    };
  }, [classId]);

  return (
    <PageShell title="تفاصيل الفصل" subtitle={classRow?.title || classId}>
      {loading ? <p>...جاري التحميل</p> : null}
      {error ? <p className="error-text">{error}</p> : null}

      {!loading && !error && classRow ? (
        <>
          <section className="teacher-block">
            <h3>بيانات الفصل</h3>
            <div className="class-card">
              <p>الاسم: {classRow.title}</p>
              <p>الصف: {classRow.grade}</p>
              <p>رمز الانضمام: {classRow.join_code}</p>
              <p>عدد الطلاب: {classRow.students_count}</p>
            </div>
          </section>

          {report ? (
            <section className="teacher-block">
              <h3>تقرير الفصل</h3>
              <div className="class-card">
                <p>إجمالي الجلسات: {report.total_sessions || 0}</p>
                <p>متوسط الدقة: {Math.round((report.avg_accuracy || 0) * 100)}%</p>
                <p>أكثر المهارات تدريبًا:</p>
                <ul>
                  {(report.top_skills || []).map((row) => (
                    <li key={row.skill}>
                      {row.skill}: {row.attempts}
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          ) : null}

          <section className="teacher-block">
            <h3>الطلاب</h3>
            <div className="class-grid">
              {students.map((student) => (
                <article className="class-card" key={student.name}>
                  <p>
                    {student.avatar_emoji || "😀"} {student.display_name}
                  </p>
                  <p>آخر دخول: {student.last_login || "-"}</p>
                  <Link className="teacher-link" to={`/teacher/student/${student.name}`}>
                    تقرير الطالب
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

export default TeacherClassPage;
