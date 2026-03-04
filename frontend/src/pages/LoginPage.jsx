import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import PageShell from "../components/PageShell";
import { joinClass, loginStudent } from "../api/client";
import { tapHaptic } from "../kidfx/haptics";
import { playSfx } from "../kidfx/sounds";
import { getSaudiMessage } from "../saudi/saudi_messages";
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
  const [helperText, setHelperText] = useState(getSaudiMessage("mascot"));
  const modeLabel = mode === "login" ? "رجوع الأبطال 🎯" : "بداية بطل جديد 🚀";
  const modeEmoji = mode === "login" ? "🧠" : "🌟";
  const GRADE_OPTIONS = [
    { key: "1", label: "الصف الأول", icon: "1️⃣" },
    { key: "2", label: "الصف الثاني", icon: "2️⃣" },
  ];

  useEffect(() => {
    const existing = getStoredStudent();
    if (existing?.student_id) {
      navigate("/splash", { replace: true });
    }
    // Keep helper copy lively for kids without overwhelming motion.
    const timer = window.setInterval(() => setHelperText(getSaudiMessage("mascot")), 3200);
    return () => window.clearInterval(timer);
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
      tapHaptic([25, 30]);
      playSfx("correct", 0.6);
      navigate("/splash", { replace: true });
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
      tapHaptic([25, 30]);
      playSfx("correct", 0.6);
      navigate("/splash", { replace: true });
    } catch (err) {
      setError(err.message || "فشل التسجيل");
    } finally {
      setLoading(false);
    }
  }

  return (
    <PageShell
      title="دخول الأطفال"
      subtitle="دخول سهل وممتع"
      hideStudentHeader
    >
      <section className="teacher-block class-card">
        <p className="hint-text">دليل سريع: إذا كان عند الطفل حساب اختاري (دخول)، وإذا أول مرة اختاري (تسجيل جديد) ثم حددي الصف.</p>
      </section>

      <section className="login-stage">
        {/* Decorative layer: playful symbols around the hero card. */}
        <div className="login-floating-icons" aria-hidden>
          <span>➕</span>
          <span>⭐</span>
          <span>🔢</span>
          <span>🎈</span>
          <span>✨</span>
        </div>

        <article className="login-hero-card">
          <div className="login-hero-emoji">👩🏻‍🏫</div>
          <h2>جاهز للمغامرة الحسابية؟</h2>
          <div className="login-mode-banner">
            <span>{modeEmoji}</span>
            <strong>{modeLabel}</strong>
          </div>
          <p className="login-helper-live" key={`${mode}-${helperText}`}>{helperText}</p>
          <p className="aisha-signature">إعداد وتقديم: الأستاذة عائشه شفلوت الحارثي</p>
        </article>

        <article className="login-form-card">
          {/* Vertical mode switches are easier for small touch screens. */}
          <div className="auth-switch">
            <button
              type="button"
              className={`secondary-btn ${mode === "login" ? "active-switch" : ""}`}
              onClick={() => {
                tapHaptic([12]);
                playSfx("pop", 0.42);
                setMode("login");
              }}
            >
              دخول
            </button>
            <button
              type="button"
              className={`secondary-btn ${mode === "register" ? "active-switch" : ""}`}
              onClick={() => {
                tapHaptic([12]);
                playSfx("pop", 0.42);
                setMode("register");
              }}
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
                <div className="choice-chip-group" role="group" aria-label="اختيار الصف">
                  {GRADE_OPTIONS.map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      className={`choice-chip ${grade === item.key ? "active" : ""}`}
                      onClick={() => {
                        tapHaptic([10]);
                        playSfx("pop", 0.32);
                        setGrade(item.key);
                      }}
                    >
                      <span>{item.icon}</span>
                      <strong>{item.label}</strong>
                    </button>
                  ))}
                </div>
                <input
                  className="field"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  placeholder="رمز الصف (اختياري)"
                />
              </>
            ) : null}

            <button
              type="submit"
              className="primary-btn login-submit-btn"
              disabled={loading}
              onClick={() => {
                tapHaptic([10]);
                playSfx("pop", 0.36);
              }}
            >
              {loading ? "..." : mode === "login" ? "دخول" : "تسجيل جديد"}
            </button>
          </form>

          <button
            type="button"
            className="secondary-btn"
            onClick={() => navigate("/teacher-login")}
            style={{ marginTop: 10 }}
          >
            دخول الأستاذة
          </button>

          {error ? <p className="error-text">{error}</p> : null}
        </article>
      </section>
      <div className="login-grade-pills" aria-hidden>
        <span>الصف الأول ✨</span>
        <span>الصف الثاني 🚀</span>
      </div>
    </PageShell>
  );
}

export default LoginPage;
