import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import PageShell from "../components/PageShell";
import {
  getDailyChallenge,
  getStudentHomeInsights,
  getStudentWeeklyProgress,
  getWeeklyLeaderboard,
} from "../api/client";
import { getTimeGreeting } from "../saudi/greetings";
import { getDailyTip } from "../saudi/tips";
import { getStoredStudent } from "../utils/storage";

function DashboardPage() {
  const navigate = useNavigate();
  const student = getStoredStudent();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [insight, setInsight] = useState(null);
  const [dailyChallenge, setDailyChallenge] = useState(null);
  const [weeklyTop, setWeeklyTop] = useState([]);
  const [weeklyProgress, setWeeklyProgress] = useState(null);

  useEffect(() => {
    let alive = true;

    if (!student?.student_id) {
      setLoading(false);
      return undefined;
    }

    Promise.all([
      getStudentHomeInsights({ student_id: student.student_id }),
      getDailyChallenge({ student_id: student.student_id }),
      getWeeklyLeaderboard({ grade: student.grade || undefined }),
      getStudentWeeklyProgress({ student_id: student.student_id }),
    ])
      .then(([homeRes, challengeRes, leaderboardRes, weeklyRes]) => {
        if (!alive) return;
        setInsight(homeRes?.data || null);
        setDailyChallenge(challengeRes?.data || null);
        setWeeklyTop((leaderboardRes?.data?.leaderboard || []).slice(0, 5));
        setWeeklyProgress(weeklyRes?.data || null);
      })
      .catch((err) => {
        if (!alive) return;
        setError(err.message || "فشل تحميل لوحة الطالب");
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [student?.student_id]);

  const tip = useMemo(() => getDailyTip(), []);
  const greeting = useMemo(() => getTimeGreeting(), []);

  return (
    <PageShell title="لوحتي" subtitle={greeting}>
      {loading ? <p>...جاري التحميل</p> : null}
      {error ? <p className="error-text">{error}</p> : null}

      {!loading && insight ? (
        <>
          <section className="teacher-block class-card">
            <h3>تحدي اليوم 🔥</h3>
            <p>
              المجال المقترح: <strong>{dailyChallenge?.suggested_domain || "-"}</strong>
            </p>
            <p>
              المهارة: <strong>{dailyChallenge?.suggested_skill || "أي مهارة متاحة"}</strong>
            </p>
            <button
              className="primary-btn"
              type="button"
              onClick={() =>
                navigate(
                  `/play?mode=practice&daily_challenge=1&ui=${encodeURIComponent(
                    dailyChallenge?.ui || "mcq"
                  )}`
                )
              }
            >
              ابدأ التحدي
            </button>
          </section>

          <section className="teacher-block class-card">
            <h2>{student?.display_name ? `هلا ${student.display_name} 👋` : "هلا بطل 👋"}</h2>
            <p>المستوى الحالي: {insight.level || 1}</p>
            <p>النجوم: {insight.stars_total || 0} ⭐</p>
            <p>السلسلة: {insight.streak || 0} 🔥</p>
          </section>

          <section className="teacher-block class-card">
            <h3>نصيحة اليوم</h3>
            <p>{tip}</p>
            <p>اقتراح اليوم: {insight.recommended_next_skill || "ابدأ بأي مهارة"}</p>
          </section>

          <section className="teacher-block class-card">
            <h3>لوحة الشرف الأسبوعية 👑</h3>
            {(weeklyTop || []).map((row, idx) => (
              <p key={row.name || idx}>
                {idx + 1}. {row.avatar_emoji || "😀"} {row.display_name} - {row.points} نقطة
              </p>
            ))}
            {(weeklyTop || []).length === 0 ? <p>لا توجد بيانات أسبوعية بعد.</p> : null}
          </section>

          <section className="teacher-block class-card">
            <h3>تقدم المهارات</h3>
            <div className="mastery-grid">
              {(insight.skills_mastery || []).map((row) => (
                <article className="mastery-card" key={row.skill}>
                  <p>{row.title_ar}</p>
                  <div className="mastery-track">
                    <div
                      className={`mastery-fill ${row.mastery_color || "gray"}`}
                      style={{ width: `${Math.max(4, Math.min(100, Number(row.mastery_percent || 0)))}%` }}
                    />
                  </div>
                  <small>{Math.round(Number(row.mastery_percent || 0))}%</small>
                </article>
              ))}
              {(insight.skills_mastery || []).length === 0 ? <p>لا توجد بيانات مهارية بعد.</p> : null}
            </div>
          </section>

          <section className="teacher-block class-card">
            <h3>رحلة الأسبوع</h3>
            <p>
              حل <strong>{weeklyProgress?.goal_weekly || 50}</strong> سؤال هذا الأسبوع
            </p>
            <p>
              {weeklyProgress?.attempts_this_week || 0} / {weeklyProgress?.goal_weekly || 50}
            </p>
            <div className="mastery-track">
              <div
                className={`mastery-fill ${(weeklyProgress?.achieved && "green") || "orange"}`}
                style={{
                  width: `${Math.min(
                    100,
                    Math.round(
                      ((Number(weeklyProgress?.attempts_this_week || 0) * 100) /
                        Math.max(1, Number(weeklyProgress?.goal_weekly || 50)))
                    )
                  )}%`,
                }}
              />
            </div>
            {weeklyProgress?.achieved ? <p className="ok-text">يا سلام! ختمت هدف الأسبوع 🎉</p> : null}
          </section>

          <section className="teacher-block actions-inline">
            <button className="primary-btn" type="button" onClick={() => navigate(`/g/${student?.grade || 1}`)}>
              ابدأ تدريب جديد
            </button>
            <button className="secondary-btn" type="button" onClick={() => navigate("/")}>
              رجوع للرئيسية
            </button>
          </section>
        </>
      ) : null}
    </PageShell>
  );
}

export default DashboardPage;
