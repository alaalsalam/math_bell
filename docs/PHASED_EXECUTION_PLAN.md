# Phased Execution Plan

## Execution Principles
- لا ننفذ Big Bang.
- كل مرحلة تنتهي بحزمة commits صغيرة قابلة للاختبار.
- لا نعطل تجربة الطالب أثناء التحسين.

## Phase A — UX Core + Aisha Identity (First)

### Scope
- تبسيط رحلة الطالب إلى مسار واحد واضح.
- إدخال هوية `إعداد وتقديم: الأستاذة عائشة` عبر الشاشات الأساسية.
- إزالة العناصر التقنية/المزدحمة من واجهات الطالب.

### Commit Plan (exact messages)
1. `feat(ux): add aisha splash and persistent student brand badge`
2. `feat(ux): simplify student route flow to welcome-world-play-reward`
3. `refactor(ux): reduce runner visual noise and enlarge touch targets`
4. `chore(copy): replace technical student text with saudi kid microcopy`

### Acceptance Criteria
- الطالب يبدأ أول سؤال خلال 3 نقرات بعد تسجيل الدخول.
- شعار الأستاذة عائشة حاضر في intro + top bar + reward.
- لا يظهر `session_id` أو نص تقني في تجربة الطالب.

### Smoke Test Checklist
1. Login -> Welcome -> World -> Play يعمل بدون مسارات جانبية مربكة.
2. Top bar يعرض الهوية الجديدة بشكل ثابت.
3. Runner على الجوال (360px) قابل للعب بدون misclick.
4. Reward screen تعرض CTA واحد واضح للاستمرار.

### Success Metrics
- `time_to_first_question_p50 <= 45s`
- `play_start_rate >= 85%` من جلسات الدخول.
- انخفاض bounce قبل بدء اللعب بنسبة >= 20%.

## Phase B — Rewards, Streak, and Joy Loop

### Scope
- تحسين دورة المكافأة اليومية (صحيح -> مكافأة -> متابعة).
- إعادة تصميم منطق السلسلة ليكون واضحًا ومحفزًا.
- إضافة مكافآت خفيفة متكررة دون تحميل معرفي.

### Commit Plan (exact messages)
1. `feat(rewards): redesign end-session reward card for kids`
2. `feat(streak): add daily streak loop with comeback messaging`
3. `feat(ux): add struggle-friendly hint cadence and recovery feedback`
4. `chore(copy): standardize streak and reward saudi tone pack`

### Acceptance Criteria
- شاشة النهاية تبرز النجوم + السلسلة + زر متابعة واضح.
- الطفل يتلقى feedback مشجع في كل خطأ بدون لهجة عقابية.
- مؤشر السلسلة اليومية مفهوم بصريًا في أقل من ثانيتين.

### Smoke Test Checklist
1. أكمل جلسة كاملة وتحقق من عرض النجوم/السلسلة.
2. اخطئ مرتين متتاليتين وتحقق من ظهور تلميحات داعمة.
3. ارجع اليوم التالي وتحقق من رسالة العودة اليومية.

### Success Metrics
- `session_completion_rate +10%`.
- `next_session_click_through >= 55%` من شاشة المكافأة.
- `day+1_return_rate +8%`.

## Phase C — Teacher Overview Lite (No Desk Reliance)

### Scope
- توفير Teacher Mode واضح من داخل التطبيق.
- تحويل إعدادات اليومي إلى local controls بدل backend settings.
- تقديم ملخص معلمة خفيف (من يحتاج دعم الآن) بدل تقارير كثيفة افتراضيًا.

### Commit Plan (exact messages)
1. `feat(teacher-mode): add in-app teacher entry and local control panel`
2. `refactor(settings): move runtime toggles to local teacher storage`
3. `feat(teacher): add lightweight at-a-glance support overview`
4. `chore(teacher): de-emphasize dense analytics tables and backend settings route`

### Acceptance Criteria
- المعلمة تفعّل Teacher Mode بدون Desk.
- إعدادات الصوت/المؤثرات/المدة تُحفظ محليًا وتؤثر فورًا.
- الصفحة الافتراضية للمعلمة لا تحتوي جداول طويلة.

### Smoke Test Checklist
1. فعّل Teacher Mode من Welcome/Top Bar.
2. غيّر إعداد الصوت وتحقق من تطبيقه مباشرة في Runner.
3. أعد تحميل الصفحة وتحقق من بقاء الإعدادات المحلية.
4. راجع ملخص المعلمة وتحقق من ظهور قائمة الطلاب الأكثر حاجة للدعم.

### Success Metrics
- `teacher_config_time_p50 <= 30s`.
- `teacher_mode_access_success >= 95%`.
- انخفاض الزيارات لصفحة backend settings بنسبة >= 80%.

## Phase D — Infinite Generation + Uniqueness Hardening

### Scope
- تطبيق نظام `Question Signature` لكل مولد.
- منع التكرار داخل الجلسة ونافذة الطالب/المهارة.
- تحسين التحقق لأسئلة الكسور (تطبيع كسري بدل نصي).

### Commit Plan (exact messages)
1. `feat(generator): add deterministic seed+nonce uniqueness loop`
2. `feat(generator): implement per-skill recent signature ring buffer`
3. `feat(validation): normalize fraction answers and compare robustly`
4. `refactor(session): prefer procedural generation and soften static fallback`
5. `chore(perf): cap signature history to prevent student-json bloat`

### Acceptance Criteria
- لا يتكرر نفس السؤال داخل الجلسة نفسها.
- لا يتكرر نفس التوقيع ضمن آخر `500` سؤال لنفس الطالب/المهارة (إلا عند استنفاد الفضاء).
- أسئلة `fraction_basic` تقبل الإجابات المكافئة كسريًا.

### Smoke Test Checklist
1. شغّل 3 جلسات متتالية لنفس المهارة وتحقق من انخفاض التكرار بشكل واضح.
2. افحص `skill_levels_json` وتأكد من وجود `recent_signatures` مع trim.
3. اختبر `2/4` مقابل `1/2` في fraction_basic.
4. اختبر fallback static وتأكد من وجود shuffle + anti-repeat behavior.

### Success Metrics
- `duplicate_rate_within_session = 0%`.
- `duplicate_rate_30_sessions_per_skill < 2%`.
- زيادة متوسط عدد الأسئلة الفريدة لكل طالب/مهارة أسبوعيًا.

## Phase E — Stabilization and Launch Readiness

### Scope
- ضبط القياس والمراقبة النهائية.
- تنظيف المسارات القديمة من الواجهة الأساسية.
- توثيق نهائي + regression smoke pack.

### Commit Plan (exact messages)
1. `chore(telemetry): add kid engagement event instrumentation`
2. `chore(cleanup): hide legacy student navigation paths from primary UX`
3. `docs(release): add launch smoke suite and rollback notes`

### Acceptance Criteria
- لوحة metrics الأساسية متاحة للفريق.
- لا يوجد regression في login/play/reward.
- خطة rollback واضحة.

### Smoke Test Checklist
1. Full happy path على جوال + سطح مكتب.
2. Teacher Mode local controls + persistence.
3. 20 جلسة generator sanity بدون أخطاء backend.
4. تحقق من عدم ظهور شاشات legacy في الرحلة الأساسية.

### Success Metrics
- Crash-free sessions >= 99.5%.
- API error rate < 1% في مسارات الطالب الأساسية.
- احتفاظ أسبوعي أعلى من baseline قبل Phase A.
