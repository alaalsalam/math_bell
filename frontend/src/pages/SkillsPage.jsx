import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import PageShell from "../components/PageShell";
import { loadBootstrap } from "../utils/bootstrapCache";
import { getStoredStudent } from "../utils/storage";
import { mergeTeacherSettings } from "../utils/teacherQuickSettings";

const DOMAIN_LABELS = {
  Addition: "الجمع",
  Subtraction: "الطرح",
  Fractions: "الكسور",
};

const GRADE_LABELS = {
  "1": "الصف الأول",
  "2": "الصف الثاني",
};

function uiFromGenerator(skill) {
  const generator = String(skill?.generator_type || "");
  if (generator === "vertical_add" || generator === "vertical_sub") return "vertical_column";
  if (generator === "fraction_basic" || generator === "fraction_compare") return "fraction_builder";
  return "mcq";
}

function SkillsPage() {
  const { grade, domain } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [skills, setSkills] = useState([]);
  const [settings, setSettings] = useState({
    default_bell_duration_seconds: 600,
    default_questions_per_session: 10,
    show_only_skills_with_questions: 0,
    enabled_game_engines: ["mcq", "drag_drop_groups", "vertical_column", "fraction_builder"],
  });
  const student = getStoredStudent();

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError("");

    loadBootstrap({ studentId: student?.student_id || null })
      .then((data) => {
        if (!alive) return;
        const mergedSettings = mergeTeacherSettings(data?.settings || {});
        setSettings(mergedSettings);
        const allSkills = data?.skills || [];
        const filtered = allSkills
          .filter((item) => String(item.grade) === String(grade) && item.domain === domain)
          .filter((item) =>
            Number(mergedSettings.show_only_skills_with_questions)
              ? Number(item.question_count || 0) > 0
              : true
          )
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

  function startPlay(skillObj, sessionType, quick = false) {
    const skillName = String(skillObj?.name || "");
    const ui = uiFromGenerator(skillObj);
    const questionCount = quick ? 5 : Number(settings.default_questions_per_session || 10);
    navigate(
      `/play?grade=${encodeURIComponent(grade)}&domain=${encodeURIComponent(domain)}&skill=${encodeURIComponent(
        skillName
      )}&mode=${encodeURIComponent(sessionType)}&ui=${encodeURIComponent(ui)}` +
        `&question_count=${encodeURIComponent(questionCount)}` +
        (sessionType === "bell_session"
          ? `&duration_seconds=${encodeURIComponent(settings.default_bell_duration_seconds || 600)}`
          : "")
    );
  }

  function startSmartTask() {
    const target =
      skills.find((row) => row?.is_unlocked !== false && !row?.is_mastered) ||
      skills.find((row) => row?.is_unlocked !== false) ||
      skills[0];
    if (!target) return;
    startPlay(target, "practice");
  }

  return (
    <PageShell title="المهارات" subtitle={subtitle}>
      {loading ? <p>...جاري التحميل</p> : null}
      {error ? <p className="error-text">{error}</p> : null}
      {!loading && !error && skills.length === 0 ? <p>لا توجد مهارات متاحة حالياً.</p> : null}

      {!loading && !error && skills.length > 0 ? (
        <section className="teacher-block class-card">
          <h3>ابدأ تلقائيًا 🚀</h3>
          <p>اختيار ذكي للمهارة ونوع السؤال بدون إعدادات</p>
          <div className="actions">
            <button type="button" className="big-btn" onClick={startSmartTask}>
              ابدأ المهمة الآن
            </button>
            <button
              type="button"
              className="secondary-btn"
              onClick={() => {
                const target =
                  skills.find((row) => row?.is_unlocked !== false && !row?.is_mastered) ||
                  skills.find((row) => row?.is_unlocked !== false) ||
                  skills[0];
                if (!target) return;
                startPlay(target, "practice", true);
              }}
            >
              تحدي سريع (5 أسئلة)
            </button>
          </div>
        </section>
      ) : null}

      <div className="skill-grid">
        {skills.map((skill) => (
          <article key={skill.name} className="skill-card">
            <h3>{skill.title_ar || skill.code}</h3>
            <p>{skill.is_mastered ? "مكتمل 👑" : skill.is_unlocked === false ? "مغلق 🔒" : "جاهز ✨"}</p>
            <div className="actions">
              <button
                type="button"
                className="primary-btn"
                onClick={() => startPlay(skill, "practice")}
                disabled={skill.is_unlocked === false}
              >
                ابدأ الآن
              </button>
              <button
                type="button"
                className="secondary-btn"
                onClick={() => startPlay(skill, "bell_session")}
                disabled={skill.is_unlocked === false}
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
