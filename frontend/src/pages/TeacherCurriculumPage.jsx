import { useEffect, useMemo, useState } from "react";
import PageShell from "../components/PageShell";
import {
  generateCurriculumPack,
  listCurriculumPacks,
  toggleCurriculumPack,
  toggleSkillVisibility,
} from "../api/client";

const DOMAIN_OPTIONS = ["Addition", "Subtraction", "Fractions"];
const DOMAIN_LABELS = {
  Addition: "الجمع",
  Subtraction: "الطرح",
  Fractions: "الكسور",
};

function parsePrerequisites(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function TeacherCurriculumPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [packs, setPacks] = useState([]);

  const [gradeFilter, setGradeFilter] = useState("");
  const [domainFilter, setDomainFilter] = useState("");

  const [grade, setGrade] = useState("1");
  const [domain, setDomain] = useState("Addition");
  const [title, setTitle] = useState("");
  const [generatorType, setGeneratorType] = useState("addition_range");
  const [count, setCount] = useState(10);
  const [difficultyMin, setDifficultyMin] = useState(1);
  const [difficultyMax, setDifficultyMax] = useState(3);
  const [graphMode, setGraphMode] = useState("linear");
  const [prereqStep, setPrereqStep] = useState(1);

  async function loadPacks() {
    setLoading(true);
    setError("");
    try {
      const res = await listCurriculumPacks({
        grade: gradeFilter || undefined,
        domain: domainFilter || undefined,
      });
      setPacks(res?.data?.packs || []);
    } catch (err) {
      setError(err.message || "فشل تحميل الباقات");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPacks();
  }, [gradeFilter, domainFilter]);

  async function handlePackToggle(pack) {
    try {
      await toggleCurriculumPack({
        pack_id: pack.name,
        is_enabled: Number(pack.is_enabled) ? 0 : 1,
      });
      await loadPacks();
    } catch (err) {
      setError(err.message || "فشل تحديث حالة الباقة");
    }
  }

  async function handleSkillToggle(skill) {
    try {
      await toggleSkillVisibility({
        skill_id: skill.name,
        show_in_student_app: Number(skill.show_in_student_app) ? 0 : 1,
      });
      await loadPacks();
    } catch (err) {
      setError(err.message || "فشل تحديث إظهار المهارة");
    }
  }

  async function handleCreatePack(event) {
    event.preventDefault();
    if (!title.trim()) return;

    setSaving(true);
    setError("");
    try {
      await generateCurriculumPack({
        payload: {
          grade,
          domain,
          title: title.trim(),
          skills: [
            {
              code_prefix: `${grade === "1" ? "G1" : "G2"}_${domain.slice(0, 3).toUpperCase()}_AUTO`,
              count: Number(count),
              generator_type: generatorType,
              difficulty_min: Number(difficultyMin),
              difficulty_max: Number(difficultyMax),
            },
          ],
          graph: {
            mode: graphMode,
            prereq_step: Number(prereqStep),
          },
        },
      });

      setTitle("");
      await loadPacks();
    } catch (err) {
      setError(err.message || "فشل إنشاء الباقة");
    } finally {
      setSaving(false);
    }
  }

  const sortedPacks = useMemo(
    () => [...packs].sort((a, b) => Number(a.order || 0) - Number(b.order || 0)),
    [packs]
  );

  return (
    <PageShell title="باني المنهج" subtitle="إدارة الباقات والمهارات">
      <section className="teacher-block class-card">
        <h3>فلاتر الباقات</h3>
        <div className="filters-row">
          <select className="field" value={gradeFilter} onChange={(event) => setGradeFilter(event.target.value)}>
            <option value="">كل الصفوف</option>
            <option value="1">الصف الأول</option>
            <option value="2">الصف الثاني</option>
          </select>
          <select className="field" value={domainFilter} onChange={(event) => setDomainFilter(event.target.value)}>
            <option value="">كل المجالات</option>
            {DOMAIN_OPTIONS.map((item) => (
              <option key={item} value={item}>
                {DOMAIN_LABELS[item]}
              </option>
            ))}
          </select>
          <button className="secondary-btn" type="button" onClick={loadPacks}>
            تحديث
          </button>
        </div>
      </section>

      <section className="teacher-block class-card">
        <h3>إنشاء باقة جديدة</h3>
        <form className="auth-form" onSubmit={handleCreatePack}>
          <input
            className="field"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="عنوان الباقة"
            required
          />
          <div className="filters-row">
            <select className="field" value={grade} onChange={(event) => setGrade(event.target.value)}>
              <option value="1">الصف الأول</option>
              <option value="2">الصف الثاني</option>
            </select>
            <select className="field" value={domain} onChange={(event) => setDomain(event.target.value)}>
              {DOMAIN_OPTIONS.map((item) => (
                <option key={item} value={item}>
                  {DOMAIN_LABELS[item]}
                </option>
              ))}
            </select>
            <select
              className="field"
              value={generatorType}
              onChange={(event) => setGeneratorType(event.target.value)}
            >
              <option value="addition_range">addition_range</option>
              <option value="subtraction_range">subtraction_range</option>
              <option value="vertical_add">vertical_add</option>
              <option value="vertical_sub">vertical_sub</option>
              <option value="fraction_basic">fraction_basic</option>
              <option value="fraction_compare">fraction_compare</option>
              <option value="static">static</option>
            </select>
          </div>
          <div className="filters-row">
            <input
              type="number"
              min={1}
              className="field"
              value={count}
              onChange={(event) => setCount(event.target.value)}
              placeholder="عدد المهارات"
            />
            <input
              type="number"
              min={1}
              className="field"
              value={difficultyMin}
              onChange={(event) => setDifficultyMin(event.target.value)}
              placeholder="صعوبة دنيا"
            />
            <input
              type="number"
              min={1}
              className="field"
              value={difficultyMax}
              onChange={(event) => setDifficultyMax(event.target.value)}
              placeholder="صعوبة عليا"
            />
          </div>
          <div className="filters-row">
            <select className="field" value={graphMode} onChange={(event) => setGraphMode(event.target.value)}>
              <option value="linear">Linear</option>
              <option value="branching">Branching</option>
            </select>
            <input
              type="number"
              min={1}
              className="field"
              value={prereqStep}
              onChange={(event) => setPrereqStep(event.target.value)}
              placeholder="prereq_step"
            />
            <button className="primary-btn" type="submit" disabled={saving}>
              {saving ? "..." : "إنشاء باقة جديدة"}
            </button>
          </div>
        </form>
      </section>

      {loading ? <p>...جاري التحميل</p> : null}
      {error ? <p className="error-text">{error}</p> : null}

      {!loading && !error ? (
        <section className="teacher-block class-grid">
          {sortedPacks.map((pack) => (
            <article className="class-card" key={pack.name}>
              <h4>{pack.title}</h4>
              <p>
                {pack.grade} - {DOMAIN_LABELS[pack.domain] || pack.domain}
              </p>
              <p>عدد المهارات: {pack.skills_count || 0}</p>
              <p>{pack.description_ar || "-"}</p>
              <div className="actions-inline">
                <button className="secondary-btn" type="button" onClick={() => handlePackToggle(pack)}>
                  {Number(pack.is_enabled) ? "تعطيل الباقة" : "تفعيل الباقة"}
                </button>
              </div>

              <div className="sessions-table-wrap" style={{ marginTop: 8 }}>
                <table className="sessions-table">
                  <thead>
                    <tr>
                      <th>الكود</th>
                      <th>العنوان</th>
                      <th>المتطلبات السابقة</th>
                      <th>الإظهار</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(pack.skills || []).map((skill) => (
                      <tr key={skill.name}>
                        <td>{skill.code}</td>
                        <td>{skill.title_ar}</td>
                        <td>{parsePrerequisites(skill.prerequisites_json).join(", ") || "-"}</td>
                        <td>
                          <button className="teacher-link" type="button" onClick={() => handleSkillToggle(skill)}>
                            {Number(skill.show_in_student_app) ? "إخفاء" : "إظهار"}
                          </button>
                        </td>
                      </tr>
                    ))}
                    {(pack.skills || []).length === 0 ? (
                      <tr>
                        <td colSpan={4}>لا توجد مهارات في هذه الباقة.</td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </article>
          ))}

          {sortedPacks.length === 0 ? <p>لا توجد باقات حتى الآن.</p> : null}
        </section>
      ) : null}
    </PageShell>
  );
}

export default TeacherCurriculumPage;
