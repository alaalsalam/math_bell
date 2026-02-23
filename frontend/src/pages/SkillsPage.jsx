import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import PageShell from "../components/PageShell";
import { loadBootstrap } from "../utils/bootstrapCache";
import { getStoredStudent } from "../utils/storage";

const DOMAIN_LABELS = {
  Addition: "الجمع",
  Subtraction: "الطرح",
  Fractions: "الكسور",
};

const GRADE_LABELS = {
  "1": "الصف الأول",
  "2": "الصف الثاني",
};

const GAME_TYPES = [
  { value: "mcq", label: "أسئلة سريعة" },
  { value: "drag_drop_groups", label: "سحب وإفلات" },
  { value: "vertical_column", label: "عمودي" },
  { value: "fraction_builder", label: "الكسور" },
];

function SkillsPage() {
  const { grade, domain } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [skills, setSkills] = useState([]);
  const [selectedUi, setSelectedUi] = useState("mcq");
  const student = getStoredStudent();

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError("");

    loadBootstrap({ studentId: student?.student_id || null })
      .then((data) => {
        if (!alive) return;
        const allSkills = data?.skills || [];
        const filtered = allSkills
          .filter((item) => String(item.grade) === String(grade) && item.domain === domain)
          .filter((item) => Number(item.question_count || 0) > 0)
          .sort((a, b) => Number(a.skill_order || 0) - Number(b.skill_order || 0));
        setSkills(filtered);
      })
      .catch((err) => {
        if (!alive) return;
        setError(err.message || "فشل تحميل المهارات");
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [grade, domain, student?.student_id]);

  const subtitle = useMemo(
    () => `${GRADE_LABELS[grade] || ""} - ${DOMAIN_LABELS[domain] || domain || ""}`,
    [grade, domain]
  );

  function startPlay(skill, sessionType) {
    navigate(
      `/play?grade=${encodeURIComponent(grade)}&domain=${encodeURIComponent(domain)}&skill=${encodeURIComponent(
        skill
      )}&mode=${encodeURIComponent(sessionType)}&ui=${encodeURIComponent(selectedUi)}`
    );
  }

  return (
    <PageShell title="المهارات" subtitle={subtitle}>
      {loading ? <p>...جاري التحميل</p> : null}
      {error ? <p className="error-text">{error}</p> : null}
      {!loading && !error && skills.length === 0 ? <p>لا توجد مهارات متاحة حالياً.</p> : null}

      <div className="game-type-picker">
        <label htmlFor="game-type">نوع اللعبة</label>
        <select
          id="game-type"
          className="field"
          value={selectedUi}
          onChange={(event) => setSelectedUi(event.target.value)}
        >
          {GAME_TYPES.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
      </div>

      <div className="skill-grid">
        {skills.map((skill) => (
          <article key={skill.name} className="skill-card">
            <h3>{skill.title_ar || skill.code}</h3>
            <p>أسئلة متاحة: {skill.question_count || 0}</p>
            <div className="actions">
              <button
                type="button"
                className="primary-btn"
                onClick={() => startPlay(skill.name, "practice")}
              >
                ابدأ تدريب
              </button>
              <button
                type="button"
                className="secondary-btn"
                onClick={() => startPlay(skill.name, "bell_session")}
              >
                ابدأ حصة الجرس
              </button>
            </div>
          </article>
        ))}
      </div>
    </PageShell>
  );
}

export default SkillsPage;
