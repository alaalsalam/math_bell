import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { clearStoredStudent, getStoredStudent } from "../utils/storage";
import { disableTeacherMode, isTeacherModeEnabled } from "../utils/teacherMode";
import StudentTopBar from "./StudentTopBar";

function PageShell({
  title,
  subtitle,
  children,
  hideStudentHeader = false,
  showAishaBrand = false,
  showBackButton = true,
  backFallback = "/",
}) {
  const navigate = useNavigate();
  const student = getStoredStudent();
  const teacherMode = isTeacherModeEnabled();
  const [menuOpen, setMenuOpen] = useState(false);
  const renderBrandSlogan = showAishaBrand && (hideStudentHeader || !student);
  const studentGrade = student?.grade || "1";

  const quickLinks = useMemo(() => {
    if (teacherMode) {
      return [
        { key: "teacher-home", label: "لوحة المعلمة", path: "/teacher" },
        { key: "teacher-students", label: "الطلاب", path: "/teacher/students" },
        { key: "teacher-curriculum", label: "باني المنهج", path: "/teacher/curriculum" },
        { key: "teacher-leaderboard", label: "لوحة الشرف", path: "/teacher/leaderboard" },
        { key: "teacher-risk", label: "التدخل المبكر", path: "/teacher/risk" },
      ];
    }

    if (student) {
      return [
        { key: "student-world", label: "عالم المغامرة", path: "/world" },
        { key: "student-dashboard", label: "لوحتي", path: "/dashboard" },
        { key: "student-domains", label: "المجالات", path: `/g/${studentGrade}` },
        { key: "student-play", label: "ابدأ اللعب", path: `/play?grade=${encodeURIComponent(studentGrade)}` },
      ];
    }

    return [
      { key: "login", label: "دخول الطالب", path: "/login" },
      { key: "teacher-login", label: "دخول المعلمة", path: "/teacher-login" },
    ];
  }, [student, studentGrade, teacherMode]);

  function goBack() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate(backFallback, { replace: true });
  }

  function goTo(path) {
    setMenuOpen(false);
    navigate(path);
  }

  function handleTeacherExit() {
    disableTeacherMode();
    setMenuOpen(false);
    navigate("/teacher-login", { replace: true });
  }

  return (
    <main className="page-shell">
      <section className="page-card">
        {!hideStudentHeader && student ? <StudentTopBar /> : null}

        <div className="page-heading-row">
          <div className="page-heading-actions">
            {showBackButton ? (
              <button type="button" className="secondary-btn page-back-btn" onClick={goBack} title="رجوع">
                رجوع
              </button>
            ) : (
              <span />
            )}
            <div className="quick-menu-wrap">
              <button
                type="button"
                className="secondary-btn page-back-btn"
                title="القائمة"
                onClick={() => setMenuOpen((current) => !current)}
              >
                القائمة ☰
              </button>
              {menuOpen ? (
                <div className="quick-menu-panel">
                  <p className="quick-menu-title">تنقل سريع</p>
                  <div className="quick-menu-grid">
                    {quickLinks.map((item) => (
                      <button
                        key={item.key}
                        type="button"
                        className="secondary-btn quick-menu-btn"
                        onClick={() => goTo(item.path)}
                      >
                        {item.label}
                      </button>
                    ))}
                    {student ? (
                      <button
                        type="button"
                        className="secondary-btn quick-menu-btn"
                        onClick={() => {
                          clearStoredStudent();
                          goTo("/login");
                        }}
                      >
                        تسجيل خروج الطالب
                      </button>
                    ) : null}
                    {teacherMode ? (
                      <button type="button" className="secondary-btn quick-menu-btn" onClick={handleTeacherExit}>
                        خروج من وضع المعلمة
                      </button>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
          <h1>{title}</h1>
        </div>
        {subtitle ? <p className="subtitle">{subtitle}</p> : null}
        {renderBrandSlogan ? (
          <div className="page-brand-slogan" aria-label="Aisha brand slogan">
            <span className="page-brand-spark">✨</span>
            <strong>تعلم والعب مع الأستاذة عائشه شفلوت الحارثي</strong>
          </div>
        ) : null}
        <div className="content">{children}</div>
      </section>
    </main>
  );
}

export default PageShell;
