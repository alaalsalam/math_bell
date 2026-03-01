import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { tapHaptic } from "../kidfx/haptics";
import { playSfx } from "../kidfx/sounds";
import { clearStoredStudent, getStoredStudent } from "../utils/storage";

const AISHA_TOPBAR_LINES = [
  "مع الأستاذة عائشة الحارثي ✨",
  "أبطال الحساب مع الأستاذة عائشة الحارثي 🚀",
  "نلعب ونتعلم مع الأستاذة عائشة الحارثي 🎯",
  "جاهزين للمغامرة مع الأستاذة عائشة الحارثي 🌟",
];

function StudentTopBar() {
  const navigate = useNavigate();
  const student = getStoredStudent();
  const [lineIndex, setLineIndex] = useState(() => Math.floor(Math.random() * AISHA_TOPBAR_LINES.length));

  useEffect(() => {
    const timer = window.setInterval(() => {
      setLineIndex((prev) => (prev + 1) % AISHA_TOPBAR_LINES.length);
    }, 3200);
    return () => window.clearInterval(timer);
  }, []);

  function goWorld() {
    tapHaptic([12]);
    playSfx("pop", 0.45);
    navigate("/world");
  }

  function goDashboard() {
    tapHaptic([12]);
    playSfx("pop", 0.45);
    navigate("/dashboard");
  }

  function logout() {
    tapHaptic([16, 24]);
    playSfx("bell_end", 0.36);
    clearStoredStudent();
    navigate("/login", { replace: true });
  }

  if (!student?.student_id) return null;

  return (
    <div className="student-topbar">
      <div className="student-identity">
        <div className="student-chip">
          <span className="avatar">{student.avatar_emoji || "🙂"}</span>
          <span>{student.display_name}</span>
        </div>
        <small className="aisha-mini-badge" key={`aisha-line-${lineIndex}`}>
          {AISHA_TOPBAR_LINES[lineIndex]}
        </small>
      </div>
      <div className="student-top-actions">
        <button type="button" className="secondary-btn top-icon-btn" onClick={goDashboard} title="لوحة الإنجازات">
          📊
        </button>
        <button type="button" className="secondary-btn top-icon-btn" onClick={goWorld} title="الرئيسية">
          🏠
        </button>
        <button type="button" className="secondary-btn top-icon-btn" onClick={logout} title="خروج">
          🚪
        </button>
      </div>
    </div>
  );
}

export default StudentTopBar;
