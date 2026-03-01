import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import PageShell from "../components/PageShell";
import { tapHaptic } from "../kidfx/haptics";
import { playSfx } from "../kidfx/sounds";
import { getSaudiMessage } from "../saudi/saudi_messages";
import { getStoredStudent } from "../utils/storage";

function WelcomePage() {
  const navigate = useNavigate();
  const student = getStoredStudent();
  const [cheer, setCheer] = useState(() => getSaudiMessage("mascot"));

  const displayName = useMemo(() => student?.display_name || "يا بطل", [student?.display_name]);

  useEffect(() => {
    playSfx("pop", 0.35);
    const timer = window.setInterval(() => {
      setCheer(getSaudiMessage("mascot"));
    }, 3200);
    return () => window.clearInterval(timer);
  }, []);

  function goWorld() {
    tapHaptic([18, 24]);
    playSfx("correct", 0.52);
    navigate("/world");
  }

  function goDashboard() {
    tapHaptic([14]);
    playSfx("pop", 0.4);
    navigate("/dashboard");
  }

  return (
    <main className="welcome-screen">
      <div className="welcome-cloud cloud-a" />
      <div className="welcome-cloud cloud-b" />
      <div className="welcome-cloud cloud-c" />
      <div className="welcome-floating-stars">
        <span>⭐</span>
        <span>✨</span>
        <span>⭐</span>
      </div>

      <PageShell
        title={`هلا والله ${displayName} 👋`}
        subtitle="جاهز تكمل مغامرتك اليوم؟ 🔥"
      >
        <section className="welcome-mascot-card">
          <div className="welcome-mascot">🦉</div>
          <p>{cheer}</p>
        </section>
        <section className="welcome-cta-wrap">
          <button className="big-btn welcome-cta pulse-cta" type="button" onClick={goWorld}>
            ابدأ المغامرة
          </button>
          <button className="teacher-link" type="button" onClick={goDashboard}>
            لوحة الإنجازات
          </button>
        </section>
      </PageShell>
    </main>
  );
}

export default WelcomePage;
