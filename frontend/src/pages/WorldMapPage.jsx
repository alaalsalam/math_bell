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

function stateForSkill(skill) {
  if (skill.is_mastered) return { key: "mastered", icon: "👑", label: "مكتمل" };
  if (skill.is_unlocked === false) return { key: "locked", icon: "🔒", label: "مغلق" };
  return { key: "unlocked", icon: "✨", label: "مفتوح" };
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

  const [activeRegion, setActiveRegion] = useState(null);
  const [activeSkill, setActiveSkill] = useState(null);

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

  const regions = useMemo(() => {
    return REGION_MAP.map((region) => {
      const nodes = skills.filter((item) => belongsToRegion(item, region.key));
      const mastered = nodes.filter((item) => Boolean(item.is_mastered)).length;
      return { ...region, skills: nodes, opened: nodes.length, mastered };
    });
  }, [skills]);

  const regionSkills = useMemo(() => {
    if (!activeRegion) return [];
    return activeRegion.skills || [];
  }, [activeRegion]);

  function startFromSkill(skill, mode, quick = false) {
    const grade = student?.grade || skill.grade || "1";
    const domain = skill.domain || "Addition";
    const query =
      `/play?grade=${encodeURIComponent(grade)}` +
      `&domain=${encodeURIComponent(domain)}` +
      `&skill=${encodeURIComponent(skill.name || skill.code)}` +
      `&mode=${encodeURIComponent(mode)}` +
      `&ui=${encodeURIComponent(uiFromGenerator(skill))}` +
      (quick
        ? "&question_count=5"
        : `&question_count=${encodeURIComponent(settings.default_questions_per_session || 10)}`) +
      (mode === "bell_session"
        ? `&duration_seconds=${encodeURIComponent(settings.default_bell_duration_seconds || 600)}`
        : "");

    setActiveSkill(null);
    setActiveRegion(null);
    navigate(query);
  }

  return (
    <main className="world-screen">
      <PageShell title="عالم المغامرة" subtitle="اختر منطقة وابدأ اللعب">
        {loading ? <p>...جاري التحميل</p> : null}
        {error ? <p className="error-text">{error}</p> : null}

        {!loading && !error ? (
          <section className="world-grid">
            {regions.map((region) => (
              <article className="world-region-card" key={region.key}>
                <div className="world-region-icon">{region.icon}</div>
                <h3>{region.title}</h3>
                <p>مفتوح {region.opened} مهارة</p>
                <p>مكتمل {region.mastered} 👑</p>
                <button type="button" className="primary-btn" onClick={() => setActiveRegion(region)}>
                  دخول
                </button>
              </article>
            ))}
          </section>
        ) : null}

        {activeRegion ? (
          <div className="world-modal-backdrop" onClick={() => setActiveRegion(null)}>
            <section className="world-modal" onClick={(event) => event.stopPropagation()}>
              <div className="world-modal-head">
                <h3>{activeRegion.icon} {activeRegion.title}</h3>
                <button type="button" className="secondary-btn" onClick={() => setActiveRegion(null)}>إغلاق</button>
              </div>

              <div className="skill-bubbles-grid">
                {regionSkills.map((skill) => {
                  const state = stateForSkill(skill);
                  return (
                    <button
                      key={skill.name}
                      type="button"
                      className="skill-bubble"
                      onClick={() => setActiveSkill(skill)}
                      disabled={state.key === "locked"}
                    >
                      <strong>{skill.title_ar || skill.code}</strong>
                      <small>{state.icon} {state.label}</small>
                    </button>
                  );
                })}
                {regionSkills.length === 0 ? <p>لا توجد مهارات متاحة في هذه المنطقة.</p> : null}
              </div>
            </section>
          </div>
        ) : null}

        {activeSkill ? (
          <div className="world-modal-backdrop" onClick={() => setActiveSkill(null)}>
            <section className="world-modal skill-action-modal" onClick={(event) => event.stopPropagation()}>
              <h3>{activeSkill.title_ar || activeSkill.code}</h3>
              <p className="subtitle">جاهز يا بطل؟</p>
              <div className="actions">
                <button type="button" className="big-btn" onClick={() => startFromSkill(activeSkill, "practice")}>ابدأ تدريب</button>
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => startFromSkill(activeSkill, "practice", true)}
                >
                  تحدي سريع (5 أسئلة)
                </button>
                <button
                  type="button"
                  className="big-btn"
                  onClick={() => startFromSkill(activeSkill, "bell_session")}
                >
                  حصة الجرس 🔔
                </button>
              </div>
            </section>
          </div>
        ) : null}
      </PageShell>
    </main>
  );
}

export default WorldMapPage;
