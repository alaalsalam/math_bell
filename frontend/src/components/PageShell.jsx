import { getStoredStudent } from "../utils/storage";
import StudentTopBar from "./StudentTopBar";

function PageShell({ title, subtitle, children, hideStudentHeader = false }) {
  const student = getStoredStudent();

  return (
    <main className="page-shell">
      <section className="page-card">
        {!hideStudentHeader && student ? <StudentTopBar /> : null}

        <h1>{title}</h1>
        {subtitle ? <p className="subtitle">{subtitle}</p> : null}
        <div className="content">{children}</div>
      </section>
    </main>
  );
}

export default PageShell;
