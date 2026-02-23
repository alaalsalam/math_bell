import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import PageShell from "../components/PageShell";
import { getStoredStudent } from "../utils/storage";

function WelcomePage() {
  const navigate = useNavigate();
  const student = getStoredStudent();

  const displayName = useMemo(() => student?.display_name || "يا بطل", [student?.display_name]);

  return (
    <main className="welcome-screen">
      <div className="welcome-cloud cloud-a" />
      <div className="welcome-cloud cloud-b" />
      <div className="welcome-cloud cloud-c" />

      <PageShell title={`هلا والله ${displayName} 👋`} subtitle="جاهز تكمل مغامرتك اليوم؟ 🔥">
        <section className="welcome-cta-wrap">
          <button className="big-btn welcome-cta" type="button" onClick={() => navigate("/world")}>
            ابدأ المغامرة
          </button>
          <button className="teacher-link" type="button" onClick={() => navigate("/dashboard")}>
            لوحة الإنجازات
          </button>
        </section>
      </PageShell>
    </main>
  );
}

export default WelcomePage;
