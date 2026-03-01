import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import PageShell from "../components/PageShell";
import { loadBootstrap } from "../utils/bootstrapCache";
import { getStoredStudent } from "../utils/storage";
import { mergeTeacherSettings } from "../utils/teacherQuickSettings";

const REGION_MAP = [
  { key: "addition_forest", icon: "🌳", title: "غابة الجمع" },
  { key: "sub_sea", icon: "🌊", title: "بحر الطرح" },
  { key: "vertical_castle", icon: "🏰", title: "قلعة العمودي" },
  { key: "fraction_island", icon: "🏝", title: "جزيرة الكسور" },
];

function belongsToRegion(skill, regionKey) {
  const domain = String(skill.domain || "");
  const g = String(skill.generator_type || "");

  if (regionKey === "addition_forest") {
    return domain === "Addition" || g === "addition_range";
  }
  if (regionKey === "sub_sea") {
    return domain === "Subtraction" || g === "subtraction_range";
  }
  if (regionKey === "vertical_castle") {
    return ["vertical_add", "vertical_sub"].includes(g);
  }
  if (regionKey === "fraction_island") {
    return domain === "Fractions" || ["fraction_basic", "fraction_compare"].includes(g);
  }
  return false;
}

function uiFromGenerator(skill) {
  const g = String(skill.generator_type || "static");
  if (g === "vertical_add" || g === "vertical_sub") return "vertical_column";
  if (g === "fraction_basic" || g === "fraction_compare") return "fraction_builder";
  return "mcq";
}

function WorldMapPage() {
  const navigate = useNavigate();
  const student = getStoredStudent();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [skills, setSkills] = useState([]);
  const [settings, setSettings] = useState({ default_bell_duration_seconds: 600 });
  const [welcomeIndex, setWelcomeIndex] = useState(0);

  const WELCOME_LINES = [
    "هيا يا بطل… خطوة ممتعة جديدة ✨",
    "جاهز؟ اليوم نحل وننبسط سوا 🚀",
    "اختيارك ممتاز! يلا نلعب ونتعلم 🎯",
    "تركيز بسيط… وبتطلع نجم اليوم 🌟",
  ];

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError("");

    loadBootstrap({ studentId: student?.student_id || null, force: true })
      .then((data) => {
        if (!alive) return;
        setSkills(data?.skills || []);
        setSettings(mergeTeacherSettings(data?.settings || {}));
      })
      .catch((err) => {
        if (!alive) return;
        setError(err.message || "فشل تحميل خريطة العالم");
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [student?.student_id]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setWelcomeIndex((prev) => (prev + 1) % WELCOME_LINES.length);
    }, 3800);
    return () => window.clearInterval(timer);
  }, []);

  const regions = useMemo(() => {
    const studentGrade = String(student?.grade || "").trim();
    const visibleSkills = studentGrade
      ? skills.filter((item) => String(item?.grade || "").trim() === studentGrade)
      : skills;

    return REGION_MAP.map((region) => {
      const nodes = visibleSkills.filter((item) => belongsToRegion(item, region.key));
      const mastered = nodes.filter((item) => Boolean(item.is_mastered)).length;
      return { ...region, skills: nodes, opened: nodes.length, mastered };
    });
  }, [skills, student?.grade]);

  function pickBestSkill(list) {
    const rows = Array.isArray(list) ? list : [];
    return (
      rows.find((item) => item?.is_unlocked !== false && !item?.is_mastered) ||
      rows.find((item) => item?.is_unlocked !== false) ||
      rows[0] ||
      null
    );
  }

  function startFromSkill(skill) {
    const grade = skill?.grade || student?.grade || "1";
    const domain = skill.domain || "Addition";
    const query =
      `/play?grade=${encodeURIComponent(grade)}` +
      `&domain=${encodeURIComponent(domain)}` +
      `&skill=${encodeURIComponent(skill.name || skill.code)}` +
      "&mode=practice" +
      `&ui=${encodeURIComponent(uiFromGenerator(skill))}` +
      `&question_count=${encodeURIComponent(settings.default_questions_per_session || 10)}`;

    navigate(query);
  }

  function startAutoFromRegion(region) {
    const target = pickBestSkill(region?.skills || []);
    if (!target) return;
    startFromSkill(target);
  }

  return (
    <main className="world-screen">
      <PageShell title="عالم المغامرة" subtitle="اختر منطقة وابدأ اللعب">
        <section className="teacher-block class-card">
          <p className="hint-text">دليل سريع: كل بطاقة تمثل منطقة تعلم. اضغطي (ابدأ الآن) لبدء أفضل مهارة متاحة داخل المنطقة.</p>
        </section>

        <section className="aisha-world-banner" key={`world-welcome-${welcomeIndex}`}>
          <span className="spark">✨</span>
          <p>{WELCOME_LINES[welcomeIndex]}</p>
        </section>

        {loading ? <p>...جاري التحميل</p> : null}
        {error ? <p className="error-text">{error}</p> : null}

        {!loading && !error ? (
          <section className="world-grid">
            {regions.map((region, idx) => (
              <article className="world-region-card" key={region.key} style={{ "--stagger": idx }}>
                <div className="world-region-icon">{region.icon}</div>
                <h3>{region.title}</h3>
                <p>مفتوح {region.opened} مهارة</p>
                <p>مكتمل {region.mastered} 👑</p>
                <button type="button" className="big-btn" onClick={() => startAutoFromRegion(region)}>
                  ابدأ الآن
                </button>
              </article>
            ))}
          </section>
        ) : null}
      </PageShell>
    </main>
  );
}

export default WorldMapPage;
