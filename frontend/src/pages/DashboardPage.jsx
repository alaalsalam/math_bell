import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import PageShell from "../components/PageShell";
import {
  getCurrentPlan,
  getDailyChallenge,
  getStudentForecast,
  getStudentHomeInsights,
  getStudentWeeklyProgress,
  getWeeklyLeaderboard,
} from "../api/client";
import { getTimeGreeting } from "../saudi/greetings";
import { getChallengeMessage } from "../saudi/challenge_messages";
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
  const [weeklyPlan, setWeeklyPlan] = useState(null);
  const [focusToday, setFocusToday] = useState([]);

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
      getCurrentPlan({ student_id: student.student_id }),
      getStudentForecast({ student_id: student.student_id }),
    ])
      .then(([homeRes, challengeRes, leaderboardRes, weeklyRes, planRes, forecastRes]) => {
        if (!alive) return;
        setInsight(homeRes?.data || null);
        setDailyChallenge(challengeRes?.data || null);
        setWeeklyTop((leaderboardRes?.data?.leaderboard || []).slice(0, 5));
        setWeeklyProgress(weeklyRes?.data || null);
        setWeeklyPlan(planRes?.data || null);
        setFocusToday((forecastRes?.data?.focus_today || []).slice(0, 2));
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
  const challengeStartMessage = useMemo(() => getChallengeMessage("challenge_start"), []);
  const leaderboardMessage = useMemo(() => getChallengeMessage("leaderboard_rank"), []);
  const myRank = useMemo(
    () => (weeklyTop || []).findIndex((row) => String(row.name) === String(student?.student_id)),
    [weeklyTop, student?.student_id]
  );

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
            <p className="ok-text">{challengeStartMessage}</p>
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
            <button
              className="big-btn"
              type="button"
              onClick={() =>
                navigate(
                  `/play?mode=practice&grade=${encodeURIComponent(student?.grade || "1")}` +
                    `&domain=${encodeURIComponent(dailyChallenge?.suggested_domain || "Addition")}` +
                    `&skill=${encodeURIComponent(dailyChallenge?.suggested_skill || "")}` +
                    `&ui=${encodeURIComponent(dailyChallenge?.ui || "mcq")}`
                )
              }
            >
              ابدأ تلقائيًا الآن 🚀
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
            <h3>تركيز اليوم 🎯</h3>
            <p>يا بطل… اليوم بس ركّز على نقطتين وتكفو 🔥</p>
            <div className="class-grid">
              {(focusToday || []).map((item) => (
                <article className="class-card" key={item.skill_code || item.skill}>
                  <h4>{item.title_ar || item.skill_code || item.skill}</h4>
                  <p>مستوى الخطر: {item.risk === "high" ? "عالٍ" : item.risk === "medium" ? "متوسط" : "منخفض"}</p>
                  <p>إتقان متوقع: {Math.round(Number(item.p_mastery || 0) * 100)}%</p>
                  <div className="actions">
                    <button
                      className="primary-btn"
                      type="button"
                      onClick={() =>
                        navigate(
                          `/play?grade=${encodeURIComponent(item.grade || student?.grade || "1")}` +
                            `&domain=${encodeURIComponent(item.domain || "Addition")}` +
                            `&skill=${encodeURIComponent(item.skill || item.skill_code || "")}` +
                            "&mode=practice&ui=mcq"
                        )
                      }
                    >
                      ابدأ تدريب الآن
                    </button>
                    <button
                      className="secondary-btn"
                      type="button"
                      onClick={() =>
                        navigate(
                          `/play?grade=${encodeURIComponent(item.grade || student?.grade || "1")}` +
                            `&domain=${encodeURIComponent(item.domain || "Addition")}` +
                            `&skill=${encodeURIComponent(item.skill || item.skill_code || "")}` +
                            "&mode=practice&ui=mcq&question_count=5"
                        )
                      }
                    >
                      ابدأ تحدي سريع (5 أسئلة)
                    </button>
                  </div>
                </article>
              ))}
            </div>
            {(focusToday || []).length === 0 ? <p>لا توجد مهارات حرجة الآن، استمر على خطة الأسبوع 👏</p> : null}
          </section>

          <section className="teacher-block class-card">
            <h3>لوحة الشرف الأسبوعية 👑</h3>
            {(weeklyTop || []).map((row, idx) => (
              <p key={row.name || idx}>
                {idx + 1}. {row.avatar_emoji || "😀"} {row.display_name} - {row.points} نقطة
              </p>
            ))}
            {(weeklyTop || []).length === 0 ? <p>لا توجد بيانات أسبوعية بعد.</p> : null}
            {myRank >= 0 && myRank < 5 ? <p className="ok-text">{leaderboardMessage}</p> : null}
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

          <section className="teacher-block class-card">
            <h3>خطة هذا الأسبوع 📅</h3>
            <p>
              من {weeklyPlan?.week_start || "-"} إلى {weeklyPlan?.week_end || "-"}
            </p>
            <div className="mastery-track">
              <div
                className="mastery-fill green"
                style={{ width: `${Math.max(0, Math.min(100, Number(weeklyPlan?.completion_rate || 0)))}%` }}
              />
            </div>
            <p>
              {weeklyPlan?.days_completed || 0} / 5 أيام
            </p>
            <p className="ok-text">كفو يا بطل! خلصت يوم {weeklyPlan?.days_completed || 0} من الخطة 🔥</p>
            <div className="class-grid">
              {[1, 2, 3, 4, 5].map((dayNo) => {
                const day = weeklyPlan?.plan?.[`day_${dayNo}`] || {};
                return (
                  <article className="class-card" key={dayNo}>
                    <h4>اليوم {dayNo}</h4>
                    <p>{day.title_ar || "مراجعة عامة"}</p>
                    <p>التركيز: {day.focus || "-"}</p>
                    <p>{day.completed ? "✔ مكتمل" : "قيد التنفيذ"}</p>
                  </article>
                );
              })}
            </div>
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
