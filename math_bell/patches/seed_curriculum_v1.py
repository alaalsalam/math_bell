import json
import random

import frappe

DOMAINS = {
    "Addition": "الجمع",
    "Subtraction": "الطرح",
    "Fractions": "الكسور",
}

GRADE_LABELS = {
    "1": "الصف الأول",
    "2": "الصف الثاني",
}

SKILLS = {
    "1": {
        "Addition": [
            ("G1_ADD_001", "مفهوم الجمع"),
            ("G1_ADD_002", "جمل الجمع"),
            ("G1_ADD_003", "إيجاد ناتج الجمع"),
            ("G1_ADD_004", "مسائل لفظية على الجمع"),
        ],
        "Subtraction": [
            ("G1_SUB_001", "مفهوم الطرح"),
            ("G1_SUB_002", "جمل الطرح"),
            ("G1_SUB_003", "الصفر والكل في الطرح"),
            ("G1_SUB_004", "مسائل لفظية على الطرح"),
        ],
        "Fractions": [
            ("G1_FRA_001", "الأجزاء المتساوية"),
            ("G1_FRA_002", "النصف"),
            ("G1_FRA_003", "الثلث"),
            ("G1_FRA_004", "الربع"),
        ],
    },
    "2": {
        "Addition": [
            ("G2_ADD_001", "جمع بدون حمل"),
            ("G2_ADD_002", "جمع مع حمل"),
            ("G2_ADD_003", "الجمع العمودي"),
            ("G2_ADD_004", "جمع أعداد من 3 أرقام"),
            ("G2_ADD_005", "مسائل لفظية على الجمع"),
        ],
        "Subtraction": [
            ("G2_SUB_001", "طرح بدون استلاف"),
            ("G2_SUB_002", "طرح مع استلاف"),
            ("G2_SUB_003", "الطرح العمودي"),
            ("G2_SUB_004", "طرح أعداد من 3 أرقام"),
            ("G2_SUB_005", "مسائل لفظية على الطرح"),
        ],
        "Fractions": [
            ("G2_FRA_001", "تمثيل الكسور"),
            ("G2_FRA_002", "قراءة وكتابة الكسور"),
            ("G2_FRA_003", "مقارنة الكسور"),
            ("G2_FRA_004", "الكسور المتكافئة بصرياً"),
            ("G2_FRA_005", "مسائل بسيطة على الكسور"),
        ],
    },
}


def execute():
    seed_grades_and_domains()
    seed_skills_lessons_questions()


def seed_grades_and_domains():
    for grade, label in GRADE_LABELS.items():
        if not frappe.db.exists("MB Grade", grade):
            frappe.get_doc(
                {
                    "doctype": "MB Grade",
                    "grade": grade,
                    "title_ar": label,
                    "is_active": 1,
                }
            ).insert(ignore_permissions=True)

    for domain, label in DOMAINS.items():
        if not frappe.db.exists("MB Domain", domain):
            frappe.get_doc(
                {
                    "doctype": "MB Domain",
                    "domain": domain,
                    "title_ar": label,
                    "is_active": 1,
                }
            ).insert(ignore_permissions=True)


def seed_skills_lessons_questions():
    for grade, domains_map in SKILLS.items():
        for domain, items in domains_map.items():
            for order, (code, title_ar) in enumerate(items, start=1):
                ensure_skill(grade, domain, code, title_ar, order)
                ensure_lesson(code, title_ar)
                ensure_questions(grade, domain, code, title_ar, minimum=10)


def ensure_skill(grade, domain, code, title_ar, order):
    if frappe.db.exists("MB Skill", code):
        return

    frappe.get_doc(
        {
            "doctype": "MB Skill",
            "code": code,
            "grade": grade,
            "domain": domain,
            "title_ar": title_ar,
            "description_ar": f"تدريب {title_ar} - {GRADE_LABELS[grade]}",
            "order": order * 10,
            "mastery_threshold": 0.8,
            "is_active": 1,
        }
    ).insert(ignore_permissions=True)


def ensure_lesson(skill_code, title_ar):
    exists = frappe.db.exists("MB Lesson", {"skill": skill_code})
    if exists:
        return

    lesson_json = {
        "steps": [
            {"type": "text", "value": f"سنتعلم اليوم: {title_ar}"},
            {"type": "example", "value": "لنحل مثالاً بسيطاً ثم نطبّق معاً."},
        ]
    }

    frappe.get_doc(
        {
            "doctype": "MB Lesson",
            "skill": skill_code,
            "title_ar": f"درس: {title_ar}",
            "content_json": json.dumps(lesson_json, ensure_ascii=False),
            "duration_seconds": 180,
            "is_active": 1,
        }
    ).insert(ignore_permissions=True)


def ensure_questions(grade, domain, skill_code, skill_title, minimum=10):
    existing = frappe.db.count("MB Question Bank", {"skill": skill_code, "is_active": 1})
    if existing >= minimum:
        return

    for idx in range(existing + 1, minimum + 1):
        q_json, a_json = build_question(grade, domain, skill_title, idx)
        frappe.get_doc(
            {
                "doctype": "MB Question Bank",
                "skill": skill_code,
                "difficulty": str(1 + ((idx - 1) % 3)),
                "question_json": json.dumps(q_json, ensure_ascii=False),
                "answer_json": json.dumps(a_json, ensure_ascii=False),
                "tags": f"{domain},{grade}",
                "is_active": 1,
            }
        ).insert(ignore_permissions=True)


def build_question(grade, domain, skill_title, idx):
    seed = f"{grade}-{domain}-{skill_title}-{idx}"
    rng = random.Random(seed)

    if domain == "Addition":
        limit = 20 if grade == "1" else 200
        a = rng.randint(1, limit // 2)
        b = rng.randint(1, limit // 2)
        correct = a + b
        text = f"{skill_title}: ما ناتج {a} + {b} ؟"
        choices = unique_choices(correct, rng, spread=max(3, limit // 10), kind="int")
        return {"text": text, "choices": choices, "ui": "mcq"}, {"value": correct}

    if domain == "Subtraction":
        limit = 20 if grade == "1" else 200
        a = rng.randint(5, limit)
        b = rng.randint(1, min(a, limit // 2))
        correct = a - b
        text = f"{skill_title}: ما ناتج {a} - {b} ؟"
        choices = unique_choices(correct, rng, spread=max(3, limit // 10), kind="int")
        return {"text": text, "choices": choices, "ui": "mcq"}, {"value": correct}

    fractions = ["1/2", "1/3", "1/4", "2/4", "2/3", "3/4"]
    correct = rng.choice(fractions)
    text = f"{skill_title}: اختر الكسر الصحيح"
    choices = unique_choices(correct, rng, spread=0, kind="fraction")
    return {"text": text, "choices": choices, "ui": "mcq"}, {"value": correct}


def unique_choices(correct, rng, spread=3, kind="int"):
    if kind == "fraction":
        pool = ["1/2", "1/3", "1/4", "2/4", "2/3", "3/4", "1/5", "2/5"]
        distractors = [x for x in pool if x != correct]
        picks = rng.sample(distractors, 3)
        choices = [correct, *picks]
        rng.shuffle(choices)
        return choices

    values = {int(correct)}
    while len(values) < 4:
        delta = rng.randint(1, spread)
        candidate = int(correct) + rng.choice([-delta, delta, delta + 1])
        if candidate >= 0:
            values.add(candidate)

    choices = list(values)
    rng.shuffle(choices)
    return choices
