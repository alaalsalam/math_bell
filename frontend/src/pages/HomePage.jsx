import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import PageShell from "../components/PageShell";
import { getTimeGreeting, personalizedStart } from "../saudi/greetings";
import { getStudentHomeInsights } from "../api/client";
import { getStoredStudent } from "../utils/storage";
import { enableTeacherMode, verifyTeacherPasscode } from "../utils/teacherMode";

const GRADES = [
  { key: "1", label: "الصف الأول" },
  { key: "2", label: "الصف الثاني" },
];

function HomePage() {
  const navigate = useNavigate();
  const student = getStoredStudent();
  const greeting = getTimeGreeting();

  const [insight, setInsight] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    if (!student?.student_id) return undefined;

    getStudentHomeInsights({ student_id: student.student_id })
      .then((res) => {
        if (!alive) return;
        setInsight(res?.data || null);
      })
      .catch((err) => {
        if (!alive) return;
        setError(err.message || "فشل تحميل ملخص اليوم");
      });

    return () => {
      alive = false;
    };
  }, [student?.student_id]);

  function openTeacherMode() {
    const input = window.prompt("أدخلي رمز وضع المعلمة");
    if (!input) return;

    if (!verifyTeacherPasscode(input)) {
      window.alert("رمز غير صحيح");
      return;
    }

    enableTeacherMode();
    navigate("/teacher");
  }

  const progressPercent = useMemo(() => {
    const attempts = Number(insight?.attempts_today || 0);
    const target = Math.max(Number(insight?.target_today || 10), 1);
    return Math.min(100, Math.round((attempts / target) * 100));
  }, [insight]);

  return (
    <PageShell title="جرس الرياضيات" subtitle={greeting}>
      <div className="teacher-mode-link-wrap">
        <button type="button" className="teacher-link" onClick={openTeacherMode}>
          وضع المعلمة
        </button>
      </div>

      {insight ? (
        <section className="teacher-block class-grid">
          <article className="class-card">
            <h3>اقتراح اليوم</h3>
            <p>{insight.recommended_next_skill || "ابدأ أي مهارة متاحة"}</p>
            <p>
              المستوى: {insight.level || 1} | السلسلة: {insight.streak || 0} 🔥
            </p>
          </article>
          <article className="class-card">
            <h3>هدف اليوم</h3>
            <p>
              حل {insight.target_today || 10} أسئلة (اليوم: {insight.attempts_today || 0})
            </p>
            <div className="ring-wrap">
              <div className="progress-ring" style={{ "--progress": `${progressPercent}%` }}>
                <span>{progressPercent}%</span>
              </div>
            </div>
          </article>
        </section>
      ) : null}

      {student?.display_name ? <p className="ok-text">{personalizedStart(student.display_name)}</p> : null}
      {error ? <p className="error-text">{error}</p> : null}

      <div className="teacher-mode-link-wrap">
        <button type="button" className="teacher-link" onClick={() => navigate("/dashboard")}>
          لوحة الطالب
        </button>
      </div>

      <div className="grid-buttons">
        {GRADES.map((item) => (
          <button
            type="button"
            key={item.key}
            className="big-btn"
            onClick={() => navigate(`/g/${item.key}`)}
          >
            {item.label}
          </button>
        ))}
      </div>
    </PageShell>
  );
}

export default HomePage;
