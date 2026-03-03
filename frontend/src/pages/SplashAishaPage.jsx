import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { tapHaptic } from "../kidfx/haptics";
import { playSfx } from "../kidfx/sounds";
import { getStoredStudent } from "../utils/storage";

function SplashAishaPage() {
  const navigate = useNavigate();
  const student = getStoredStudent();

  const displayName = useMemo(() => student?.display_name || "يا بطل", [student?.display_name]);

  useEffect(() => {
    playSfx("bell_start", 0.4);
  }, []);

  function startAdventure() {
    tapHaptic([16, 26]);
    playSfx("pop", 0.6);
    window.setTimeout(() => navigate("/welcome", { replace: true }), 140);
  }

  return (
    <main className="aisha-splash-screen">
      <div className="aisha-splash-glow glow-a" />
      <div className="aisha-splash-glow glow-b" />
      <div className="aisha-sparkles">
        <span>⭐</span>
        <span>✨</span>
        <span>🌟</span>
        <span>⭐</span>
        <span>✨</span>
      </div>
      <section className="aisha-splash-card">
        <p className="aisha-pretitle">جرس الرياضيات</p>
        <h1>هلا {displayName} ✨</h1>
        <p className="aisha-brand-line">إعداد وتقديم: الأستاذة عائشه شفلوت الحارثي</p>
        <p className="aisha-splash-copy">جاهز نبدأ مغامرة جديدة اليوم؟</p>
        <button type="button" className="big-btn aisha-start-btn" onClick={startAdventure}>
          ابدأ الآن 🚀
        </button>
      </section>
    </main>
  );
}

export default SplashAishaPage;
