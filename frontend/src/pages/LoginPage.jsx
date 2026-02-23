import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import PageShell from "../components/PageShell";
import { joinClass, loginStudent } from "../api/client";
import { getStoredStudent, setStoredStudent } from "../utils/storage";

function LoginPage() {
  const navigate = useNavigate();

  const [mode, setMode] = useState("login");
  const [displayName, setDisplayName] = useState("");
  const [passwordSimple, setPasswordSimple] = useState("");
  const [grade, setGrade] = useState("1");
  const [joinCode, setJoinCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const existing = getStoredStudent();
    if (existing?.student_id) {
      navigate("/welcome", { replace: true });
    }
  }, [navigate]);

  function saveStudent(profile) {
    setStoredStudent({
      student_id: profile.name,
      student_code: profile.student_code,
      grade: profile.grade,
      display_name: profile.display_name,
      avatar_emoji: profile.avatar_emoji || "😀",
      token: "mvp-local",
    });
  }

  async function handleLogin(event) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await loginStudent({
        display_name: displayName,
        password_simple: passwordSimple,
      });

      const student = res?.data?.student_profile;
      if (!student) {
        throw new Error("بيانات غير صحيحة");
      }

      saveStudent(student);
      navigate("/welcome", { replace: true });
    } catch (err) {
      setError(err.message || "بيانات غير صحيحة");
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(event) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await joinClass({
        display_name: displayName,
        password_simple: passwordSimple,
        grade,
        join_code: joinCode,
      });

      const student = res?.data?.student_profile;
      if (!student) {
        throw new Error("فشل التسجيل");
      }

      saveStudent(student);
      navigate("/welcome", { replace: true });
    } catch (err) {
      setError(err.message || "فشل التسجيل");
    } finally {
      setLoading(false);
    }
  }

  return (
    <PageShell title="دخول الأطفال" subtitle="مرحبا بك في جرس الرياضيات" hideStudentHeader>
      <div className="auth-switch">
        <button
          type="button"
          className={`secondary-btn ${mode === "login" ? "active-switch" : ""}`}
          onClick={() => setMode("login")}
        >
          دخول
        </button>
        <button
          type="button"
          className={`secondary-btn ${mode === "register" ? "active-switch" : ""}`}
          onClick={() => setMode("register")}
        >
          تسجيل جديد
        </button>
      </div>

      <form className="auth-form" onSubmit={mode === "login" ? handleLogin : handleRegister}>
        <input
          className="field"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="الاسم"
          required
        />
        <input
          className="field"
          value={passwordSimple}
          onChange={(e) => setPasswordSimple(e.target.value)}
          placeholder="كلمة المرور"
          required
        />

        {mode === "register" ? (
          <>
            <select className="field" value={grade} onChange={(e) => setGrade(e.target.value)}>
              <option value="1">الصف الأول</option>
              <option value="2">الصف الثاني</option>
            </select>
            <input
              className="field"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              placeholder="رمز الصف (اختياري)"
            />
          </>
        ) : null}

        <button type="submit" className="primary-btn" disabled={loading}>
          {loading ? "..." : mode === "login" ? "دخول" : "تسجيل جديد"}
        </button>
      </form>

      {error ? <p className="error-text">{error}</p> : null}
    </PageShell>
  );
}

export default LoginPage;
