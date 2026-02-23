import json

import frappe


def execute():
    seed_drag_drop_groups()
    seed_vertical_column()
    seed_fraction_builder()


def _insert_question_if_missing(skill, difficulty, question_json, answer_json, tags):
    q_text = json.dumps(question_json, ensure_ascii=False, sort_keys=True)

    if frappe.db.exists(
        "MB Question Bank",
        {
            "skill": skill,
            "question_json": q_text,
        },
    ):
        return

    frappe.get_doc(
        {
            "doctype": "MB Question Bank",
            "skill": skill,
            "difficulty": str(difficulty),
            "question_json": q_text,
            "answer_json": json.dumps(answer_json, ensure_ascii=False, sort_keys=True),
            "tags": tags,
            "is_active": 1,
        }
    ).insert(ignore_permissions=True)


def seed_drag_drop_groups():
    addition_set = [
        (3, 2, [4, 5, 6], 5),
        (4, 1, [3, 4, 5], 5),
        (2, 6, [7, 8, 9], 8),
        (5, 3, [7, 8, 9], 8),
        (1, 7, [7, 8, 9], 8),
    ]

    subtraction_set = [
        (7, 2, [4, 5, 6], 5),
        (8, 3, [4, 5, 6], 5),
        (9, 4, [4, 5, 6], 5),
        (6, 1, [4, 5, 6], 5),
        (10, 3, [6, 7, 8], 7),
    ]

    for a, b, choices, total in addition_set:
        question = {
            "ui": "drag_drop_groups",
            "text": "اختر ناتج الجمع الصحيح",
            "payload": {"a": a, "b": b, "choices": choices},
        }
        _insert_question_if_missing(
            "G1_ADD_001",
            1,
            question,
            {"value": total},
            "drag_drop_groups,Addition,1",
        )

    for a, b, choices, total in subtraction_set:
        question = {
            "ui": "drag_drop_groups",
            "text": "اختر ناتج الطرح الصحيح",
            "payload": {"a": a, "b": b, "choices": choices},
        }
        _insert_question_if_missing(
            "G1_SUB_001",
            1,
            question,
            {"value": total},
            "drag_drop_groups,Subtraction,1",
        )


def seed_vertical_column():
    addition_rows = [
        (47, 28, [75, 65, 85], 75),
        (36, 27, [63, 53, 73], 63),
        (58, 19, [67, 77, 87], 77),
        (69, 16, [75, 85, 95], 85),
        (48, 37, [75, 85, 95], 85),
    ]

    subtraction_rows = [
        (82, 47, [25, 35, 45], 35),
        (73, 28, [35, 45, 55], 45),
        (91, 36, [45, 55, 65], 55),
        (84, 29, [45, 55, 65], 55),
        (62, 27, [25, 35, 45], 35),
    ]

    for a, b, choices, value in addition_rows:
        question = {
            "ui": "vertical_column",
            "text": "اجمع عمودياً واختر الناتج",
            "payload": {"op": "+", "a": a, "b": b, "choices": choices},
        }
        _insert_question_if_missing(
            "G2_ADD_002",
            2,
            question,
            {"value": value},
            "vertical_column,Addition,2",
        )

    for a, b, choices, value in subtraction_rows:
        question = {
            "ui": "vertical_column",
            "text": "اطرح عمودياً واختر الناتج",
            "payload": {"op": "-", "a": a, "b": b, "choices": choices},
        }
        _insert_question_if_missing(
            "G2_SUB_002",
            2,
            question,
            {"value": value},
            "vertical_column,Subtraction,2",
        )


def seed_fraction_builder():
    rows = [
        ("G1_FRA_001", 2, 1, ["1/2", "1/3", "1/4"], "1/2"),
        ("G1_FRA_002", 2, 1, ["1/2", "1/4", "2/4"], "1/2"),
        ("G1_FRA_003", 3, 1, ["1/3", "1/2", "1/4"], "1/3"),
        ("G1_FRA_004", 4, 1, ["1/4", "1/2", "3/4"], "1/4"),
        ("G2_FRA_001", 4, 2, ["2/4", "1/2", "3/4"], "2/4"),
        ("G2_FRA_002", 3, 1, ["1/3", "2/3", "1/2"], "1/3"),
        ("G2_FRA_003", 4, 3, ["3/4", "1/4", "2/4"], "3/4"),
        ("G2_FRA_004", 4, 2, ["1/2", "2/4", "3/4"], "2/4"),
        ("G2_FRA_005", 5, 1, ["1/5", "1/2", "1/4"], "1/5"),
        ("G2_FRA_003", 6, 4, ["4/6", "2/6", "3/6"], "4/6"),
    ]

    for skill, parts, filled, choices, value in rows:
        question = {
            "ui": "fraction_builder",
            "text": "اختر الكسر الذي يمثل الشكل",
            "payload": {"parts": parts, "filled": filled, "choices": choices},
        }
        _insert_question_if_missing(
            skill,
            1 if parts <= 4 else 2,
            question,
            {"value": value},
            "fraction_builder,Fractions",
        )
