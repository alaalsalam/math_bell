import json

import frappe

DEFAULT_SETTINGS = {
    "teacher_passcode": "1234",
    "default_bell_duration_seconds": 600,
    "default_questions_per_session": 10,
    "enable_sound": 1,
    "enable_confetti": 1,
    "enable_balloons": 1,
    "allow_guest_play": 0,
    "show_only_skills_with_questions": 0,
    "engines_json": ["mcq", "drag_drop_groups", "vertical_column", "fraction_builder"],
}


def get_mb_settings() -> dict:
    row = frappe.db.get_singles_dict("MB Settings") or {}

    parsed_engines = row.get("engines_json")
    if isinstance(parsed_engines, str):
        try:
            parsed_engines = json.loads(parsed_engines)
        except Exception:
            parsed_engines = DEFAULT_SETTINGS["engines_json"]

    if not isinstance(parsed_engines, list):
        parsed_engines = DEFAULT_SETTINGS["engines_json"]

    return {
        "teacher_passcode": row.get("teacher_passcode") or DEFAULT_SETTINGS["teacher_passcode"],
        "default_bell_duration_seconds": int(
            row.get("default_bell_duration_seconds")
            or DEFAULT_SETTINGS["default_bell_duration_seconds"]
        ),
        "default_questions_per_session": int(
            row.get("default_questions_per_session")
            or DEFAULT_SETTINGS["default_questions_per_session"]
        ),
        "enable_sound": int(row.get("enable_sound") or DEFAULT_SETTINGS["enable_sound"]),
        "enable_confetti": int(row.get("enable_confetti") or DEFAULT_SETTINGS["enable_confetti"]),
        "enable_balloons": int(row.get("enable_balloons") or DEFAULT_SETTINGS["enable_balloons"]),
        "allow_guest_play": int(row.get("allow_guest_play") or DEFAULT_SETTINGS["allow_guest_play"]),
        "show_only_skills_with_questions": int(
            row.get("show_only_skills_with_questions")
            or DEFAULT_SETTINGS["show_only_skills_with_questions"]
        ),
        "enabled_game_engines": [str(item).strip() for item in parsed_engines if str(item).strip()],
    }
