import { useEffect, useMemo, useState } from "react";
import PageShell from "../components/PageShell";
import { loadBootstrap } from "../utils/bootstrapCache";
import { getStoredStudent } from "../utils/storage";

const REGION_MAP = [
  { key: "addition_forest", icon: "🌳", title: "غابة الجمع" },
  { key: "sub_sea", icon: "🌊", title: "بحر الطرح" },
  { key: "vertical_castle", icon: "🏰", title: "قلعة العمودي" },
  { key: "fraction_island", icon: "🏝", title: "جزيرة الكسور" },
];

function isMastered(skill) {
  const mastery = Number(skill.mastery_threshold || 0.8);
  const attempts = Number(skill.student_attempts || 0);
  const accuracy = Number(skill.student_accuracy || 0);
  return attempts > 0 && accuracy >= mastery;
}

function mapSkillToRegions(skill) {
  const domain = skill.domain;
  const g = skill.generator_type;
  const regions = [];

  if (domain === "Addition" || g === "addition_range") regions.push("addition_forest");
  if (domain === "Subtraction" || g === "subtraction_range") regions.push("sub_sea");
  if (g === "vertical_add" || g === "vertical_sub") regions.push("vertical_castle");
  if (domain === "Fractions" || g === "fraction_basic" || g === "fraction_compare") regions.push("fraction_island");

  return regions;
}

function WorldMapPage() {
  const student = getStoredStudent();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [skills, setSkills] = useState([]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError("");

    loadBootstrap({ studentId: student?.student_id || null })
      .then((data) => {
        if (!alive) return;
        setSkills(data?.skills || []);
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

  const regionCards = useMemo(() => {
    const byRegion = new Map(REGION_MAP.map((item) => [item.key, []]));
    for (const skill of skills) {
      for (const regionKey of mapSkillToRegions(skill)) {
        byRegion.get(regionKey)?.push(skill);
      }
    }

    return REGION_MAP.map((region) => {
      const nodes = byRegion.get(region.key) || [];
      const mastered = nodes.filter((item) => isMastered(item)).length;
      return {
        ...region,
        opened: nodes.length,
        mastered,
      };
    });
  }, [skills]);

  return (
    <main className="world-screen">
      <PageShell title="عالم المغامرة" subtitle="اختر منطقة وابدأ اللعب">
        {loading ? <p>...جاري التحميل</p> : null}
        {error ? <p className="error-text">{error}</p> : null}

        {!loading && !error ? (
          <section className="world-grid">
            {regionCards.map((region) => (
              <article className="world-region-card" key={region.key}>
                <div className="world-region-icon">{region.icon}</div>
                <h3>{region.title}</h3>
                <p>مفتوح {region.opened} مهارة</p>
                <p>مكتمل {region.mastered} 👑</p>
                <button type="button" className="primary-btn">
                  دخول
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
