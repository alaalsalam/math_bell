import { useNavigate } from "react-router-dom";
import { getStoredStudent } from "../utils/storage";
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
  const renderBrandSlogan = showAishaBrand && (hideStudentHeader || !student);
  function goBack() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate(backFallback, { replace: true });
  }

  return (
    <main className="page-shell">
      <section className="page-card">
        {!hideStudentHeader && student ? <StudentTopBar /> : null}

        <div className="page-heading-row">
          {showBackButton ? (
            <button type="button" className="secondary-btn page-back-btn" onClick={goBack} title="رجوع">
              رجوع
            </button>
          ) : (
            <span />
          )}
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
