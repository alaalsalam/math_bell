import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import PageShell from "../components/PageShell";
import { joinClass } from "../api/client";
import { getStoredStudent, setStoredStudent } from "../utils/storage";

const GRADES = [
  { key: "1", label: "الصف الأول" },
  { key: "2", label: "الصف الثاني" },
];

function HomePage() {
  const navigate = useNavigate();
  const existing = useMemo(() => getStoredStudent(), []);

  const [selectedGrade, setSelectedGrade] = useState(existing?.grade || "1");
  const [joinCode, setJoinCode] = useState("");
  const [displayName, setDisplayName] = useState(existing?.display_name || "");
  const [joinError, setJoinError] = useState("");
  const [joinInfo, setJoinInfo] = useState(
    existing?.display_name ? `تم الحفظ: ${existing.display_name}` : ""
  );
  const [joining, setJoining] = useState(false);

  async function handleJoin() {
    setJoinError("");
    setJoinInfo("");

    if (!joinCode.trim() || !displayName.trim()) {
      setJoinError("أدخل رمز الانضمام والاسم");
      return;
    }

    setJoining(true);
    try {
      const res = await joinClass({
        join_code: joinCode.trim().toUpperCase(),
        display_name: displayName.trim(),
        grade: selectedGrade,
      });

      const student = res?.data?.student_profile;
      const token = res?.data?.session_token;

      if (!student || !token) {
        throw new Error("استجابة الانضمام غير مكتملة");
      }

      setStoredStudent({
        student_id: student.name,
        student_code: student.student_code,
        grade: student.grade,
        display_name: student.display_name,
        token,
      });
      setJoinInfo(`تم الحفظ: ${student.display_name}`);
    } catch (error) {
      setJoinError(error.message || "فشل الانضمام");
    } finally {
      setJoining(false);
    }
  }

  return (
    <PageShell title="جرس الرياضيات" subtitle="اختر الصف">
      <div className="grid-buttons">
        {GRADES.map((item) => (
          <button
            type="button"
            key={item.key}
            className={`big-btn ${selectedGrade === item.key ? "active" : ""}`}
            onClick={() => {
              setSelectedGrade(item.key);
              navigate(`/g/${item.key}`);
            }}
          >
            {item.label}
          </button>
        ))}
      </div>

      <section className="join-box">
        <h2>تسجيل الطالب</h2>
        <div className="join-grid">
          <input
            value={joinCode}
            onChange={(event) => setJoinCode(event.target.value)}
            placeholder="رمز الانضمام"
            className="field"
          />
          <input
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            placeholder="اسم الطالب"
            className="field"
          />
        </div>
        <button type="button" className="secondary-btn" onClick={handleJoin} disabled={joining}>
          {joining ? "..." : "حفظ الطالب"}
        </button>
        {joinError ? <p className="error-text">{joinError}</p> : null}
        {joinInfo ? <p className="ok-text">{joinInfo}</p> : null}
      </section>
    </PageShell>
  );
}

export default HomePage;
