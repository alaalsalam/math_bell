import { getStoredStudent } from "../utils/storage";
import StudentTopBar from "./StudentTopBar";

function PageShell({ title, subtitle, children, hideStudentHeader = false, showAishaBrand = true }) {
  const student = getStoredStudent();
  const renderBrandSlogan = showAishaBrand && (hideStudentHeader || !student);

  return (
    <main className="page-shell">
      <section className="page-card">
        {!hideStudentHeader && student ? <StudentTopBar /> : null}

        <h1>{title}</h1>
        {subtitle ? <p className="subtitle">{subtitle}</p> : null}
        {renderBrandSlogan ? (
          <div className="page-brand-slogan" aria-label="Aisha brand slogan">
            <span className="page-brand-spark">✨</span>
            <strong>تعلم والعب مع الاستاذة عائشه</strong>
          </div>
        ) : null}
        <div className="content">{children}</div>
      </section>
    </main>
  );
}

export default PageShell;
