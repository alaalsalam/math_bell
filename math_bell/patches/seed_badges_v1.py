import frappe

BADGES = [
    {
        "code": "FIRST_SESSION",
        "title_ar": "بداية قوية",
        "rule_json": '{"type":"first_session"}',
    },
    {
        "code": "STREAK_3",
        "title_ar": "سلسلة 3 أيام",
        "rule_json": '{"type":"streak","min":3}',
    },
    {
        "code": "STREAK_7",
        "title_ar": "سلسلة 7 أيام",
        "rule_json": '{"type":"streak","min":7}',
    },
    {
        "code": "PERFECT_10",
        "title_ar": "نتيجة كاملة 10/10",
        "rule_json": '{"type":"perfect","attempts":10}',
    },
    {
        "code": "FRACTIONS_STAR",
        "title_ar": "نجم الكسور",
        "rule_json": '{"type":"fractions","sessions":3,"accuracy":0.7}',
    },
    {
        "code": "DAILY_CHAMP",
        "title_ar": "بطل تحدي اليوم",
        "rule_json": '{"type":"daily_challenge"}',
    },
]


def execute():
    for row in BADGES:
        name = frappe.db.get_value("MB Badge", {"code": row["code"]}, "name")
        if name:
            doc = frappe.get_doc("MB Badge", name)
            doc.title_ar = row["title_ar"]
            doc.rule_json = row["rule_json"]
            doc.is_active = 1
            doc.save(ignore_permissions=True)
            continue

        frappe.get_doc(
            {
                "doctype": "MB Badge",
                "code": row["code"],
                "title_ar": row["title_ar"],
                "rule_json": row["rule_json"],
                "is_active": 1,
            }
        ).insert(ignore_permissions=True)
