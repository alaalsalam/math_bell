import { useNavigate } from "react-router-dom";
import PageShell from "../components/PageShell";
import { enableTeacherMode, verifyTeacherPasscode } from "../utils/teacherMode";

const GRADES = [
  { key: "1", label: "الصف الأول" },
  { key: "2", label: "الصف الثاني" },
];

function HomePage() {
  const navigate = useNavigate();

  function openTeacherMode() {
    const input = window.prompt("أدخلي رمز وضع المعلمة");
    if (!input) return;

    if (!verifyTeacherPasscode(input)) {
      window.alert("رمز غير صحيح");
      return;
    }

    enableTeacherMode();
    navigate("/teacher");
  }

  return (
    <PageShell title="جرس الرياضيات" subtitle="اختر الصف">
      <div className="teacher-mode-link-wrap">
        <button type="button" className="teacher-link" onClick={openTeacherMode}>
          وضع المعلمة
        </button>
      </div>

      <div className="grid-buttons">
        {GRADES.map((item) => (
          <button
            type="button"
            key={item.key}
            className="big-btn"
            onClick={() => navigate(`/g/${item.key}`)}
          >
            {item.label}
          </button>
        ))}
      </div>
    </PageShell>
  );
}

export default HomePage;
