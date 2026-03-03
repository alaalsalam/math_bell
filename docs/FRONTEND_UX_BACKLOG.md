# Frontend UX Backlog (Prioritized)

## Scope Rule
- هذا Backlog مخصص لتحسينات **Frontend-first** بدون الاعتماد على Desk.
- أي تحكم ضروري للمعلمة يكون عبر Teacher Mode داخل الواجهة.

## P0 (Must-Have)

### P0-1: Aisha Intro Identity
- Goal: تثبيت هوية المنتج تربويًا من أول ثانية.
- User Story: كطفل، أبغى أشوف نفس الهوية الداعمة في كل مرة أفتح اللعبة.
- UI Notes: Splash + Top Bar badge + reward signature.
- Complexity: S
- Acceptance Criteria:
  - يظهر النص `إعداد وتقديم: الأستاذة عائشه شفلوت الحارثي` في شاشة البداية.
  - يظهر `مع الأستاذة عائشه شفلوت الحارثي` داخل تجربة اللعب.
  - يظهر توقيع ختامي في شاشة المكافأة.

### P0-2: Route Simplification for Kids
- Goal: تقليل عدد القرارات والتنقلات.
- User Story: كطفل، أبغى أوصل للسؤال بسرعة بدون لف.
- UI Notes: المسار الأساسي يصبح `Login -> Welcome -> World -> Play -> Reward`.
- Complexity: M
- Acceptance Criteria:
  - أول جلسة تبدأ خلال 3 نقرات كحد أقصى بعد تسجيل الدخول.
  - الصفحات القديمة تبقى تقنيًا لكنها غير بارزة في تجربة الطفل.

### P0-3: Big Touch Targets + Contrast Pass
- Goal: تحسين الوصول والوضوح للصف 1–2.
- User Story: كطفل، أبغى أضغط بسهولة بدون أخطاء لمس.
- UI Notes: أزرار 64px+، تباين واضح، نص أكبر في الأسئلة.
- Complexity: M
- Acceptance Criteria:
  - كل CTA رئيسي >= `64px` ارتفاع.
  - لا يوجد نص تفاعلي أصغر من `20px` في شاشة اللعب.

### P0-4: Session Screen Declutter
- Goal: إزالة التشويش من Runner.
- User Story: كطفل، أبغى أشوف السؤال والاختيارات فقط بشكل واضح.
- UI Notes: إخفاء/تقليل عناصر ثانوية، إبراز تقدم واحد واضح.
- Complexity: M
- Acceptance Criteria:
  - الشاشة تعرض 1 محور رئيسي: السؤال + الإجابة.
  - لا يزيد عدد العناصر النصية الثابتة عن 5 عناصر في أعلى الشاشة.

### P0-5: Friendly Error and Empty States
- Goal: منع نهايات مسدودة.
- User Story: كطفل، إذا ما فيه أسئلة أبغى توجيه واضح للخطوة القادمة.
- UI Notes: CTA ذكي بدل رسائل تقنية.
- Complexity: S
- Acceptance Criteria:
  - لا تظهر رسائل تقنية مثل `Session`/`Invalid` للطفل.
  - كل حالة فارغة تحتوي زر إجراء واضح.

### P0-6: Teacher Mode Entry (In-App)
- Goal: إتاحة وضع المعلمة بدون Desk أو روابط مخفية.
- User Story: كمعلمة، أبغى أدخل وضع المعلمة من داخل التطبيق بسرعة.
- UI Notes: زر/gesture واضح في Welcome أو Top Bar.
- Complexity: S
- Acceptance Criteria:
  - يمكن تفعيل Teacher Mode من واجهة الطالب مباشرة.
  - لا حاجة للدخول إلى Desk لتفعيل الوضع.

### P0-7: Local Teacher Controls (No Backend Settings)
- Goal: نقل إعدادات التجربة اليومية إلى localStorage.
- User Story: كمعلمة، أبغى أضبط الصوت/المدة/المؤثرات بسرعة على الجهاز.
- UI Notes: لوحة إعدادات خفيفة داخل Teacher Mode.
- Complexity: M
- Acceptance Criteria:
  - الإعدادات المحلية تؤثر فورًا على جلسات الطالب.
  - لا يعتمد التطبيق على صفحة `MB Settings` لتشغيل الأساسيات.

### P0-8: Reward Screen Rewrite
- Goal: تحويل شاشة التقرير إلى شاشة مكافأة ممتعة.
- User Story: كطفل، أبغى نهاية مشوقة تشجعني أكمل.
- UI Notes: إزالة `Session ID`، إبراز النجوم والسلسلة وزر متابعة.
- Complexity: S
- Acceptance Criteria:
  - لا يظهر أي معرف تقني للمستخدم النهائي.
  - يوجد CTA أساسي واحد واضح: `جولة جديدة`.

## P1 (Should-Have)

### P1-1: One-Tap Continue Flow
- Goal: تقليل العودة اليدوية لاختيار المهارة يوميًا.
- User Story: كطفل يومي، أبغى زر `كمّل` من آخر مهارة مباشرة.
- UI Notes: CTA رئيسي في Welcome.
- Complexity: M
- Acceptance Criteria:
  - إذا توجد مهارة سابقة، يظهر زر متابعة تلقائيًا.
  - الانتقال يبدأ جلسة خلال نقرة واحدة.

### P1-2: Struggle Assist UI
- Goal: دعم الأطفال المتعثرين بصريًا.
- User Story: كطفل متعثر، أبغى أسئلة أقصر وتلميحات أوضح.
- UI Notes: وضع دعم في الواجهة (بدون تحليلات معقدة).
- Complexity: M
- Acceptance Criteria:
  - عند انخفاض الأداء، الواجهة تخفف عدد الأسئلة المعروضة للجولة.
  - التلميح يظهر بصيغة قصيرة ومباشرة.

### P1-3: Consistent Saudi Copy System
- Goal: منع خلط النبرة بين الصفحات.
- User Story: كطفل، أبغى نفس أسلوب الكلام بكل مكان.
- UI Notes: توحيد مصدر الرسائل النصية.
- Complexity: S
- Acceptance Criteria:
  - كل الرسائل تمر عبر copy layer موحدة.
  - لا توجد نصوص إنجليزية في رحلة الطالب.

### P1-4: World Map Progress Clarity
- Goal: توضيح "ماذا ألعب الآن".
- User Story: كطفل، أبغى أعرف المهارة المقترحة فورًا.
- UI Notes: skill highlight + next badge.
- Complexity: M
- Acceptance Criteria:
  - كل منطقة تبرز مهارة واحدة مقترحة.
  - الطفل يقدر يبدأ منها مباشرة بدون فتح قوائم متعددة.

### P1-5: Lightweight Teacher Snapshot
- Goal: إعطاء المعلمة لقطة سريعة بدل تقارير كثيفة.
- User Story: كمعلمة، أبغى أعرف مين يحتاج مساعدة اليوم بسرعة.
- UI Notes: 3 بطاقات فقط (نشطون، يحتاج دعم، آخر جلسات).
- Complexity: M
- Acceptance Criteria:
  - لا جداول طويلة في الصفحة الافتراضية للمعلمة.
  - الوصول لاسم الطالب المحتاج دعم خلال شاشة واحدة.

### P1-6: Accessibility Pass (RTL + Audio Safe)
- Goal: تجربة مستقرة على الجوال واللوحي.
- User Story: كطفل، أبغى الواجهة تقرأ وتتحرك بشكل ثابت.
- UI Notes: RTL checks, reduced motion option, mute clarity.
- Complexity: S
- Acceptance Criteria:
  - لا انكسار Layout على مقاسات 360px/768px/1024px.
  - إعداد كتم الصوت واضح ومتزامن مع حالة الواجهة.

## P2 (Nice-to-Have)

### P2-1: Avatar Micro-celebrations
- Goal: إضافة لمسات فرح صغيرة بدون إزعاج.
- User Story: كطفل، أبغى تفاعل لطيف عند الإنجاز.
- UI Notes: تعبيرات وجه + bounce بسيط.
- Complexity: S
- Acceptance Criteria:
  - حركات قصيرة < 400ms ولا تعطل الإجابة التالية.

### P2-2: Seasonal Themes (Teacher Local)
- Goal: تنويع بصري اختياري.
- User Story: كمعلمة، أبغى أغير الثيم حسب مناسبة الصف.
- UI Notes: ثيمات جاهزة في Teacher Mode.
- Complexity: M
- Acceptance Criteria:
  - يمكن التبديل بين ثيمين على الأقل بدون reload.

### P2-3: Parent-Friendly Summary Card
- Goal: رسالة يومية بسيطة قابلة للمشاركة.
- User Story: كولي أمر، أبغى أعرف الإنجاز اليومي بسرعة.
- UI Notes: بطاقة موجزة من سطرين.
- Complexity: M
- Acceptance Criteria:
  - بطاقة تلخص (الأسئلة + الدقة + السلسلة) بشكل غير تقني.

### P2-4: Optional Voice Prompts
- Goal: دعم أطفال بداية القراءة.
- User Story: كطفل، أبغى سماع التعليمات بدل قراءة كثيرة.
- UI Notes: زر صوت لكل سؤال/تعليمات.
- Complexity: L
- Acceptance Criteria:
  - يمكن تشغيل/إيقاف الصوت من Teacher Mode المحلي.

## REMOVE / AVOID (Explicit)
- الجداول الطويلة في تجربة الطالب.
- الشاشات النصية الكثيفة ذات الفقرات الطويلة.
- إظهار IDs تقنية (`session_id`, `question_ref`) للطفل.
- الاعتماد التشغيلي اليومي على `MB Settings` أو Desk.
- تعدد مسارات متوازية تؤدي لنفس اللعب (ازدحام تنقل).
- التحليلات الثقيلة كواجهة افتراضية للمعلمة.
