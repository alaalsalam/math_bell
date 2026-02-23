import { useNavigate } from "react-router-dom";
import { clearStoredStudent, getStoredStudent } from "../utils/storage";

function StudentTopBar() {
  const navigate = useNavigate();
  const student = getStoredStudent();

  function goWorld() {
    navigate("/world");
  }

  function logout() {
    clearStoredStudent();
    navigate("/login", { replace: true });
  }

  if (!student?.student_id) return null;

  return (
    <div className="student-topbar">
      <div className="student-chip">
        <span className="avatar">{student.avatar_emoji || "🙂"}</span>
        <span>{student.display_name}</span>
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
