# Infinite Generation Spec

## Objective
- جعل التوليد الإجرائي هو الوضع الافتراضي لكل المهارات المدعومة.
- تقليل التكرار لنقطة "عمليًا لا نهائية" لكل طالب/مهارة.
- منع تكرار نفس السؤال داخل نافذة تاريخ حديثة متحركة.

## Current Generator Inventory + Gaps

### Inventory (Current Code)
| generator_type | backend builder | UI mode | current source |
|---|---|---|---|
| `addition_range` | `generator/templates.py::_addition_range` | `mcq` | procedural |
| `subtraction_range` | `generator/templates.py::_subtraction_range` | `mcq` | procedural |
| `vertical_add` | `generator/templates.py::_vertical_add` | `vertical_column` | procedural |
| `vertical_sub` | `generator/templates.py::_vertical_sub` | `vertical_column` | procedural |
| `fraction_basic` | `generator/templates.py::_fraction_basic` | `fraction_builder` | procedural |
| `fraction_compare` | `generator/templates.py::_fraction_compare` | `mcq` | procedural |
| `static` | `MB Question Bank` | حسب `question_json.ui` | fixed bank |

### Current Gaps
1. لا يوجد `anti-repeat` لكل طالب/مهارة.
2. لا يوجد فحص منع تكرار داخل نفس الجلسة.
3. `static` fallback يرجّع أول أسئلة بالترتيب (`difficulty asc, creation asc`) مما يسبب تكرار عالي.
4. لا يوجد `question signature` مخزّن تاريخيًا.
5. `fraction_basic` يعتمد مساواة نصية (`"2/4" != "1/2"`) بدل المساواة الكسرية.
6. نوع `fraction_compare` لا يخزن `left/right` بشكل معياري في payload، فيصعب التتبع والتحليل.

## Deterministic Uniqueness Model (Proposed)

## Seed Space
- `base_seed = sha256(student_id|skill_code|generator_type|difficulty|session_id|question_index|day_bucket)`
- `nonce` يبدأ من `0` ويزيد عند وجود تصادم في التوقيع.
- `candidate_seed = sha256(base_seed|nonce)`

## Candidate Loop
1. ولّد سؤالًا مرشحًا من `candidate_seed`.
2. احسب `signature_hash` من تمثيل معياري للسؤال.
3. إذا موجود في:
   - `session_seen_signatures`
   - `recent_signature_window`
   يتم زيادة `nonce` وإعادة التوليد.
4. حد أقصى `max_attempts_per_question = 40`.
5. إذا استنفذت المحاولات:
   - وسّع المجال داخل نفس الصعوبة (representation variant).
   - ثم ارفع الصعوبة خطوة واحدة مؤقتًا.
   - ثم اسمح بأقدم توقيع خارج نافذة الجلسة فقط (آخر حل).

## Question Signature Hash Scheme

### Canonical String
- صيغة عامة: `v1|{generator_type}|{canonical_payload}`
- أمثلة canonical payload:
  - addition: `a={min(a,b)}|b={max(a,b)}|target={a+b}`
  - subtraction: `a={a}|b={b}|target={a-b}`
  - vertical add: `op=+|a={a}|b={b}|carry={carry_profile}`
  - vertical sub: `op=-|a={a}|b={b}|borrow={borrow_profile}`
  - fraction basic: `n={reduced_n}|d={reduced_d}|parts={parts_variant}`
  - fraction compare: `l={n1}/{d1}|r={n2}/{d2}|ans={sign}`

### Hash
- `signature_hash = sha1(canonical_string).hexdigest()[:16]`
- 16 hex chars كافية للمقارنة الخفيفة وسريعة التخزين.

### Storage (Per Student / Skill)
- داخل `MB Student Profile.skill_levels_json` لكل skill key:
```json
{
  "G1_ADD_001": {
    "level": 2,
    "attempts": 40,
    "correct": 32,
    "accuracy": 0.8,
    "recent_signatures": {
      "v": 1,
      "max": 500,
      "items": ["a31f9d0b02e44c12", "b91cd5b2ef9aa301"]
    }
  }
}
```
- نافذة الجلسة تبقى في الذاكرة (`stats_json` أو runtime map) ولا تحتاج تخزين دائم كامل.

## Limits to Prevent DB Bloat
- `500` توقيع حديث لكل `student-skill`.
- `max_global_signatures_per_student = 5000` (تقليم FIFO عبر كل المهارات).
- التوقيع المخزن = hash فقط (بدون نص السؤال).
- تنظيف تلقائي عند كل تحديث مهارة (trim دائري).

## Generator Specs

## 1) addition_range
- Parameter Space:
  - `a,b in [1..max_n]` حيث `max_n` حسب الصعوبة/الصف.
  - تقريبًا: `100` (d1), `400` (d2), `2500+` (d3 grade1), `14400+` (d3 grade2).
- Uniqueness Constraints:
  - canonical pair يستخدم `min/max` لتجنب تكرار `3+5` و`5+3`.
- Anti-Repeat:
  - منع توقيع مكرر في آخر `500` سؤال لنفس المهارة.
- Answer Validation:
  - مقارنة عددية (`int`) مع السماح بنص رقمي مكافئ.
- Difficulty Progression:
  - مستوى المهارة + تعديل آخر 5 محاولات (`>=0.8` رفع، `<=0.4` خفض).

## 2) subtraction_range
- Parameter Space:
  - grade1: فرض `a>=b` (نتائج غير سالبة).
  - grade2: يسمح مجالات أوسع (وقد تشمل قيم أصعب حسب الإعداد).
- Uniqueness Constraints:
  - توقيع مبني على `(a,b,target)` مع ترتيب ثابت.
- Anti-Repeat:
  - نفس نافذة `500` + منع تكرار داخل الجلسة.
- Answer Validation:
  - مقارنة عددية مباشرة.
- Difficulty Progression:
  - d1: أرقام صغيرة.
  - d2: مدى أوسع.
  - d3+: زيادة المدى + تنويع بنية السؤال.

## 3) vertical_add
- Parameter Space:
  - d1–d2 غالبًا رقمين، d3 ثلاثي الأرقام.
  - فضاء كبير (`~8100` لرقمين، أعلى كثيرًا لثلاثة أرقام).
- Uniqueness Constraints:
  - تضمين `carry_profile` في التوقيع (مثال: `ones_carry=1,tens_carry=0`).
- Anti-Repeat:
  - توزيع إجباري لأنماط حمل مختلفة قبل إعادة نفس النمط.
- Answer Validation:
  - مقارنة عددية.
- Difficulty Progression:
  - d1: بدون حمل غالبًا.
  - d2: حمل واحد.
  - d3: حمل متعدد.

## 4) vertical_sub
- Parameter Space:
  - فرض `a>=b`.
  - d2+ يركز على حالات الاستلاف.
- Uniqueness Constraints:
  - تضمين `borrow_profile` في التوقيع.
- Anti-Repeat:
  - تدوير أنماط الاستلاف قبل التكرار.
- Answer Validation:
  - مقارنة عددية.
- Difficulty Progression:
  - d1: بدون استلاف.
  - d2: استلاف في خانة واحدة.
  - d3: استلاف متعدد الخانات.

## 5) fraction_basic
- Parameter Space:
  - `denominator` حسب الصعوبة + `numerator in [1..denominator-1]`.
  - الفضاء منخفض في الصعوبات المبكرة إذا لم نضيف تنويعات تمثيل.
- Uniqueness Constraints:
  - توقيع على الكسر المختزل + نوع التمثيل البصري (`parts/layout_variant`).
- Anti-Repeat:
  - إذا استُنفذ الفضاء الأساسي، ندخل `representation_variant` بدل تكرار نفس الشكل.
- Answer Validation:
  - تحويل إلى كسر مختزل (`Fraction`) بدل مقارنة نصية.
- Difficulty Progression:
  - d1: مقامات 2–4.
  - d2: حتى 6.
  - d3+: حتى 8/10 + تمثيلات أصعب.

## 6) fraction_compare
- Parameter Space:
  - اختيار `(n1,d1,n2,d2)` مع إشارات `>,<,=`.
- Uniqueness Constraints:
  - canonical side order ثابت (مثلا حسب قيمة الكسر ثم lexical) مع الحفاظ على السؤال المرئي.
- Anti-Repeat:
  - منع نفس زوج الكسور (بعد الاختزال) داخل النافذة.
- Answer Validation:
  - cross multiplication لتحديد الإشارة الصحيحة، لا نعتمد نص السؤال فقط.
- Difficulty Progression:
  - d1: مقامات صغيرة ومتساوية غالبًا.
  - d2: مقامات مختلفة بسيطة.
  - d3+: مقامات أكبر + حالات متقاربة القيمة.

## Static Question Bank Policy
- `static` ليس افتراضيًا في الإنتاج.
- يستخدم فقط كـ fallback عند غياب generator للمهارة.
- عند fallback، يجب إضافة shuffle + signature tracking لتقليل إعادة نفس أول N أسئلة.

## Rollout Recommendation
1. تحويل المهارات النشطة تدريجيًا إلى generator types مدعومة.
2. تطبيق signature tracking أولًا على `addition/subtraction` (أعلى استخدام).
3. ثم `vertical`.
4. ثم `fractions` مع تطبيع إجابات الكسور.
