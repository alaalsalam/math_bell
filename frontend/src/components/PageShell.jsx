import { useNavigate } from "react-router-dom";
import { clearStoredStudent, getStoredStudent } from "../utils/storage";

function PageShell({ title, subtitle, children, hideStudentHeader = false }) {
  const navigate = useNavigate();
  const student = getStoredStudent();

  function logout() {
    clearStoredStudent();
    navigate("/login", { replace: true });
  }

  return (
    <main className="page-shell">
      <section className="page-card">
        {!hideStudentHeader && student ? (
          <div className="student-topbar">
            <div className="student-chip">
              <span className="avatar">{student.avatar_emoji || "😀"}</span>
              <span>{student.display_name}</span>
            </div>
            <button type="button" className="secondary-btn" onClick={logout}>
              خروج
            </button>
          </div>
        ) : null}

        <h1>{title}</h1>
        {subtitle ? <p className="subtitle">{subtitle}</p> : null}
        <div className="content">{children}</div>
      </section>
    </main>
  );
}

export default PageShell;
