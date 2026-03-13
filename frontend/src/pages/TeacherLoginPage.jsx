import { useState } from "react";
import { useNavigate } from "react-router-dom";
import PageShell from "../components/PageShell";
import { enableTeacherMode, verifyTeacherCredentials } from "../utils/teacherMode";

function TeacherLoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(event) {
    event.preventDefault();
    setError("");

    const ok = verifyTeacherCredentials({ username, password });
    if (!ok) {
      setError("بيانات الدخول غير صحيحة");
      return;
    }

    enableTeacherMode(username);
    navigate("/teacher", { replace: true });
  }

  return (
    <PageShell title="دخول الأستاذة" subtitle="دخول واضح وسريع إلى لوحة المعلمة">
      <section className="teacher-block class-card">
        <p className="hint-text">دليل سريع: ادخلي باسم المستخدم وكلمة المرور، ثم انتقلي مباشرة إلى لوحة المعلمة.</p>
      </section>

      <form className="auth-form" onSubmit={handleSubmit}>
        <input
          className="field"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          placeholder="اسم المستخدم"
          autoComplete="username"
          required
        />
        <input
          className="field"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="كلمة المرور"
          autoComplete="current-password"
          required
        />

        {error ? <p className="error-text">{error}</p> : null}

        <button type="submit" className="big-btn">
          دخول وضع الأستاذة
        </button>
        <button type="button" className="secondary-btn" onClick={() => navigate("/", { replace: true })}>
          رجوع
        </button>
      </form>
    </PageShell>
  );
}

export default TeacherLoginPage;
