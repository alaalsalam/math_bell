import { useState } from "react";
import { useNavigate } from "react-router-dom";
import PageShell from "../components/PageShell";
import {
  DEFAULT_TEACHER_QUICK_SETTINGS,
  readTeacherQuickSettings,
} from "../utils/teacherQuickSettings";
import { enableTeacherMode, verifyTeacherCredentials } from "../utils/teacherMode";

function TeacherLoginPage() {
  const navigate = useNavigate();
  const quick = readTeacherQuickSettings();
  const [username, setUsername] = useState(String(quick.teacher_username || "aisha"));
  const [password, setPassword] = useState(String(quick.teacher_password || "Aisha1234"));
  const [error, setError] = useState("");

  function useDefaultCredentials() {
    setUsername(DEFAULT_TEACHER_QUICK_SETTINGS.teacher_username);
    setPassword(DEFAULT_TEACHER_QUICK_SETTINGS.teacher_password);
    setError("");
  }

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

      <section className="teacher-block class-card">
        <h3>بيانات الدخول الافتراضية</h3>
        <p>اسم المستخدم: <strong>{DEFAULT_TEACHER_QUICK_SETTINGS.teacher_username}</strong></p>
        <p>كلمة المرور: <strong>{DEFAULT_TEACHER_QUICK_SETTINGS.teacher_password}</strong></p>
        <button type="button" className="secondary-btn" onClick={useDefaultCredentials}>
          استخدام البيانات الافتراضية
        </button>
      </section>

      <form className="auth-form" onSubmit={handleSubmit}>
        <input
          className="field"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          placeholder="اسم المستخدم"
          autoComplete="username"
        />
        <input
          className="field"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="كلمة المرور"
          autoComplete="current-password"
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
