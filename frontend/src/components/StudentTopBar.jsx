import { useNavigate } from "react-router-dom";
import { tapHaptic } from "../kidfx/haptics";
import { playSfx } from "../kidfx/sounds";
import { clearStoredStudent, getStoredStudent } from "../utils/storage";

function StudentTopBar() {
  const navigate = useNavigate();
  const student = getStoredStudent();

  function goWorld() {
    tapHaptic([12]);
    playSfx("pop", 0.45);
    navigate("/world");
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
        <small className="aisha-mini-badge">مع الأستاذة عائشة</small>
      </div>
      <div className="student-top-actions">
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
