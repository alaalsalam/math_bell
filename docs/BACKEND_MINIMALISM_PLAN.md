# Backend Minimalism Plan

## Goal
- تشغيل تجربة الطالب بالكامل بدون الحاجة إلى فتح Desk.
- تقليل اعتماد الواجهة على إعدادات backend المتغيرة يوميًا.
- إبقاء backend كطبقة بيانات وتحقق فقط.

## Current Desk/Config Dependency Audit

| Item | Current Role | Desk Dependency Risk | Recommendation |
|---|---|---|---|
| `MB Settings` (Single) | إعدادات الصوت/الجرس/المحركات/passcode | عالي | **Deprecate from daily operation** |
| `teacher.get_settings / update_settings` | ربط Teacher Settings بالـ backend | متوسط | **خفض الاستخدام** لصالح local Teacher Mode |
| `MB Grade`, `MB Domain` | مرجع منهجي ثابت | منخفض | **Keep as seeded constants** (no daily Desk edits) |
| `MB Skill` | تعريف المهارات | متوسط | **Keep**, لكن عبر Curriculum UI/API بدل Desk |
| `MB Skill Pack` | تجميع المهارات | منخفض | **Keep**, إدارة عبر Teacher Curriculum page/API |
| `MB Question Bank` | fallback static questions | عالي (تكرار/صيانة) | **De-emphasize strongly** |
| `MB Game Template`, `MB Game Level`, `MB Lesson` | بنية قديمة/مساندة | متوسط | **Freeze / internal only** |
| `MB Badge` | قواعد مكافآت | منخفض | **Keep seeded, no routine Desk** |
| `MB Session`, `MB Attempt Log`, `MB Weekly Plan`, `MB Student Profile` | بيانات تشغيل | منخفض | **Keep internal (no Desk workflow)** |

## Replace Desk Settings with Frontend Teacher Mode

## 1) Local Teacher Controls (default)
- التخزين: `localStorage` على الجهاز.
- عناصر التحكم المحلية:
  - `sound_enabled`
  - `confetti_enabled`
  - `balloons_enabled`
  - `bell_duration_seconds`
  - `default_question_count`
  - `teacher_mode_pin_local`
- المبدأ: "التحكم اليومي يجب أن يكون فوريًا ومحليًا".

## 2) Safe Hardcoded Defaults (fallback)
- داخل frontend constants + backend fallback عند غياب أي إعداد:
  - `bell_duration_seconds = 600`
  - `default_question_count = 10`
  - effects enabled by default
  - guest play disabled by default
- أي فشل في قراءة الإعدادات لا يمنع اللعب.

## 3) Optional Lite Admin Endpoint (only if needed)
- يستخدم فقط للمزامنة بين أجهزة المعلمة (وليس شرطًا للتشغيل).
- مثال: حفظ `teacher_preset_json` على مستوى الفصل.
- endpoint مقترح:
  - `GET /api/method/math_bell.api.teacher.get_teacher_preset`
  - `POST /api/method/math_bell.api.teacher.save_teacher_preset`
- لا يتطلب فتح Desk ولا تعديل `MB Settings` يدويًا.

## Keep vs Deprecate Decision

## Keep
- Backend APIs الأساسية: login/join/bootstrap/start/submit/end.
- Doctypes التشغيلية (طلاب، جلسات، محاولات، خطط أسبوعية).
- Curriculum APIs (`list_packs`, `generate_pack`, `toggle_pack`, `toggle_skill_visibility`) مع ضبط صلاحيات مناسب.

## Deprecate / De-emphasize
- الاعتماد اليومي على شاشة `MB Settings` في Desk.
- واجهة `TeacherSettingsPage` المبنية على `update_settings` كسلوك افتراضي.
- إدارة المحتوى التعليمي عبر `MB Question Bank` كمسار رئيسي.
- أي إعداد يتطلب System Manager لتشغيل تجربة الطفل الأساسية.

## Minimal Architecture Recommendation
1. **Frontend-first runtime config**: الجهاز يقرر إعدادات التجربة اليومية.
2. **Backend as authority for correctness/data**: التحقق من الإجابات وتخزين الأداء فقط.
3. **Desk as emergency/admin only**: ليس جزءًا من رحلة المعلمة اليومية.

## Risks and Mitigations
- Risk: اختلاف إعدادات الأجهزة بين المعلمات.
  - Mitigation: endpoint مزامنة خفيف اختياري.
- Risk: إزالة backend settings قد تقلل التحكم المركزي.
  - Mitigation: إبقاء `MB Settings` كـ fallback فقط، غير ظاهر في UX.
- Risk: بقاء static bank لبعض المهارات.
  - Mitigation: تحويل تدريجي للمهارات إلى procedural generators.
