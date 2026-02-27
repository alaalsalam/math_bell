import { useEffect, useState } from "react";
import PageShell from "../components/PageShell";
import {
  DEFAULT_TEACHER_QUICK_SETTINGS,
  readTeacherQuickSettings,
  writeTeacherQuickSettings,
} from "../utils/teacherQuickSettings";

const ENGINE_OPTIONS = [
  { key: "mcq", label: "أسئلة سريعة" },
  { key: "drag_drop_groups", label: "سحب وإفلات" },
  { key: "vertical_column", label: "عمودي" },
  { key: "fraction_builder", label: "الكسور" },
];

function TeacherSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  const [form, setForm] = useState(DEFAULT_TEACHER_QUICK_SETTINGS);

  useEffect(() => {
    setLoading(true);
    setError("");
    try {
      setForm(readTeacherQuickSettings());
    } catch (err) {
      setError(err.message || "فشل تحميل الإعدادات");
    } finally {
      setLoading(false);
    }
  }, []);

  function setField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function toggleEngine(key) {
    const list = Array.isArray(form.enabled_game_engines) ? form.enabled_game_engines : [];
    if (list.includes(key)) {
      setField(
        "enabled_game_engines",
        list.filter((item) => item !== key)
      );
      return;
    }
    setField("enabled_game_engines", [...list, key]);
  }

  async function saveSettings(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setOk("");
    try {
      const saved = writeTeacherQuickSettings(form);
      setForm(saved);
      setOk("تم حفظ الإعدادات محليًا ✅");
    } catch (err) {
      setError(err.message || "فشل حفظ الإعدادات");
    } finally {
      setSaving(false);
    }
  }

  function resetDefaults() {
    const defaults = { ...DEFAULT_TEACHER_QUICK_SETTINGS };
    setForm(defaults);
    writeTeacherQuickSettings(defaults);
    setOk("تمت إعادة الإعدادات للوضع الافتراضي");
  }

  return (
    <PageShell title="أدوات المعلمة السريعة" subtitle="بدون Desk: إعدادات خفيفة ومحفوظة على هذا الجهاز">
      {loading ? <p>...جاري التحميل</p> : null}
      {error ? <p className="error-text">{error}</p> : null}
      {ok ? <p className="ok-text">{ok}</p> : null}

      {!loading ? (
        <form className="auth-form" onSubmit={saveSettings}>
          <p className="ok-text">تعمل هذه الإعدادات مباشرة داخل الواجهة بدون الحاجة لشاشات الخلفية.</p>
          <input
            className="field"
            value={form.teacher_passcode || ""}
            onChange={(e) => setField("teacher_passcode", e.target.value)}
            placeholder="رمز وضع المعلمة (محلي)"
          />
          <input
            className="field"
            type="number"
            value={form.default_bell_duration_seconds || 600}
            onChange={(e) => setField("default_bell_duration_seconds", Number(e.target.value || 600))}
            placeholder="مدة حصة الجرس"
          />
          <input
            className="field"
            type="number"
            value={form.default_questions_per_session || 10}
            onChange={(e) => setField("default_questions_per_session", Number(e.target.value || 10))}
            placeholder="عدد الأسئلة"
          />

          <label>
            <input
              type="checkbox"
              checked={Boolean(form.enable_sound)}
              onChange={(e) => setField("enable_sound", e.target.checked ? 1 : 0)}
            />
            تفعيل الصوت
          </label>
          <label>
            <input
              type="checkbox"
              checked={Boolean(form.enable_confetti)}
              onChange={(e) => setField("enable_confetti", e.target.checked ? 1 : 0)}
            />
            تفعيل الكونفيتي
          </label>
          <label>
            <input
              type="checkbox"
              checked={Boolean(form.enable_balloons)}
              onChange={(e) => setField("enable_balloons", e.target.checked ? 1 : 0)}
            />
            تفعيل البالونات
          </label>
          <label>
            <input
              type="checkbox"
              checked={Boolean(form.show_only_skills_with_questions)}
              onChange={(e) => setField("show_only_skills_with_questions", e.target.checked ? 1 : 0)}
            />
            عرض المهارات التي فيها أسئلة فقط
          </label>

          <div className="teacher-block class-card">
            <h3>المحركات المفعلة</h3>
            <div className="engine-toggles">
              {ENGINE_OPTIONS.map((item) => (
                <label key={item.key}>
                  <input
                    type="checkbox"
                    checked={(form.enabled_game_engines || []).includes(item.key)}
                    onChange={() => toggleEngine(item.key)}
                  />
                  {item.label}
                </label>
              ))}
            </div>
          </div>

          <button type="submit" className="primary-btn" disabled={saving}>
            {saving ? "..." : "حفظ الإعدادات"}
          </button>
          <button type="button" className="secondary-btn" onClick={resetDefaults} disabled={saving}>
            إعادة الافتراضي
          </button>
        </form>
      ) : null}
    </PageShell>
  );
}

export default TeacherSettingsPage;
