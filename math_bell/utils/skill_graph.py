from __future__ import annotations

import json

import frappe

from math_bell.api.helpers import normalize_bool, normalize_int, parse_doc_json, to_json_string


def parse_prerequisites(value) -> list[str]:
    if not value:
        return []

    if isinstance(value, list):
        return [str(item).strip() for item in value if str(item).strip()]

    if isinstance(value, str):
        try:
            parsed = json.loads(value)
        except Exception:
            return []
        if isinstance(parsed, list):
            return [str(item).strip() for item in parsed if str(item).strip()]
    return []


def _is_mastered(entry: dict, threshold: float) -> bool:
    attempts = normalize_int((entry or {}).get("attempts"), 0)
    if attempts <= 0:
        return False
    try:
        accuracy = float((entry or {}).get("accuracy") or 0)
    except Exception:
        accuracy = 0
    return accuracy >= float(threshold or 0.7)


def _enabled_pack_map() -> dict[str, bool]:
    rows = frappe.get_all(
        "MB Skill Pack",
        fields=["name", "is_enabled"],
        limit_page_length=2000,
    )
    return {row.get("name"): normalize_bool(row.get("is_enabled")) for row in rows}


def _is_pack_enabled_for_runtime(pack_name: str | None, pack_enabled: dict[str, bool]) -> bool:
    """
    Missing pack records should not hide all skills.
    Only explicit disabled packs are filtered out.
    """
    if not pack_name:
        return True
    if pack_name not in pack_enabled:
        return True
    return bool(pack_enabled.get(pack_name))


def evaluate_unlocks(
    student_id: str,
    grade: str | None = None,
    domain: str | None = None,
    persist: bool = True,
) -> dict:
    if not student_id or not frappe.db.exists("MB Student Profile", student_id):
        return {
            "unlocked_codes": [],
            "mastered_codes": [],
            "visible_skill_codes": [],
            "visible_skill_names": [],
            "skill_levels": {},
        }

    student = frappe.get_doc("MB Student Profile", student_id)
    student_level = normalize_int(student.level, 1)
    skill_levels = parse_doc_json(student.skill_levels_json)

    where_clauses = ["sk.is_active = 1", "sk.show_in_student_app = 1"]
    values = {}
    if grade:
        where_clauses.append("sk.grade = %(grade)s")
        values["grade"] = grade
    if domain:
        where_clauses.append("sk.domain = %(domain)s")
        values["domain"] = domain

    skills = frappe.db.sql(
        f"""
        SELECT
            sk.name,
            sk.code,
            sk.grade,
            sk.domain,
            sk.mastery_threshold,
            sk.min_level_required,
            sk.unlock_rule,
            sk.prerequisites_json,
            sk.pack,
            sk.`order` AS skill_order,
            sk.creation
        FROM `tabMB Skill` sk
        WHERE {' AND '.join(where_clauses)}
        ORDER BY sk.grade ASC, sk.domain ASC, sk.`order` ASC, sk.creation ASC
        LIMIT 5000
        """,
        values,
        as_dict=True,
    )
    skills.sort(
        key=lambda row: (
            str(row.get("grade") or ""),
            str(row.get("domain") or ""),
            normalize_int(row.get("skill_order"), 0),
            str(row.get("creation") or ""),
        )
    )

    pack_enabled = _enabled_pack_map()
    name_to_code = {row.get("name"): row.get("code") for row in skills}
    mastered_codes = set()
    unlocked_codes = set()
    visible_skill_names = set()

    for row in skills:
        skill_name = row.get("name")
        skill_code = row.get("code") or skill_name
        pack_name = row.get("pack")

        if not _is_pack_enabled_for_runtime(pack_name, pack_enabled):
            continue

        entry = skill_levels.get(skill_code) or skill_levels.get(skill_name) or {}
        if _is_mastered(entry, row.get("mastery_threshold") or 0.7):
            mastered_codes.add(skill_code)

    for row in skills:
        skill_name = row.get("name")
        skill_code = row.get("code") or skill_name
        pack_name = row.get("pack")

        if not _is_pack_enabled_for_runtime(pack_name, pack_enabled):
            continue

        prereqs = parse_prerequisites(row.get("prerequisites_json"))
        normalized_prereqs = []
        for item in prereqs:
            normalized_prereqs.append(name_to_code.get(item, item))

        entry = skill_levels.get(skill_code) or skill_levels.get(skill_name) or {}
        explicit_unlocked = normalize_bool(entry.get("unlocked")) if isinstance(entry, dict) else False
        min_level = max(normalize_int(row.get("min_level_required"), 1), 1)
        rule = (row.get("unlock_rule") or "by_mastery").strip()

        prereqs_ok = all(
            (pr in mastered_codes) or (pr in unlocked_codes)
            for pr in normalized_prereqs
        )

        unlocked = False
        if rule == "manual":
            unlocked = explicit_unlocked
        else:
            unlocked = (student_level >= min_level) and prereqs_ok

        if unlocked:
            unlocked_codes.add(skill_code)
            visible_skill_names.add(skill_name)
            if isinstance(entry, dict):
                entry["unlocked"] = 1
                skill_levels[skill_code] = entry

    # Safety fallback for new accounts:
    # if graph rules lead to zero unlocked skills, unlock the first visible skill per (grade, domain).
    if not unlocked_codes:
        first_per_track: dict[tuple[str, str], dict] = {}
        for row in skills:
            pack_name = row.get("pack")
            if not _is_pack_enabled_for_runtime(pack_name, pack_enabled):
                continue
            track_key = (str(row.get("grade") or ""), str(row.get("domain") or ""))
            if track_key not in first_per_track:
                first_per_track[track_key] = row

        for row in first_per_track.values():
            skill_name = row.get("name")
            skill_code = row.get("code") or skill_name
            unlocked_codes.add(skill_code)
            visible_skill_names.add(skill_name)
            entry = skill_levels.get(skill_code) or skill_levels.get(skill_name) or {}
            if isinstance(entry, dict):
                entry["unlocked"] = 1
                skill_levels[skill_code] = entry

    if persist:
        student.skill_levels_json = to_json_string(skill_levels)
        student.save(ignore_permissions=True)

    return {
        "unlocked_codes": sorted(unlocked_codes),
        "mastered_codes": sorted(mastered_codes),
        "visible_skill_codes": sorted(unlocked_codes),
        "visible_skill_names": sorted(visible_skill_names),
        "skill_levels": skill_levels,
    }


def filter_enabled_pack_skills(skills: list[dict]) -> list[dict]:
    if not skills:
        return []
    pack_enabled = _enabled_pack_map()
    output = []
    for row in skills:
        pack_name = row.get("pack")
        if not _is_pack_enabled_for_runtime(pack_name, pack_enabled):
            continue
        output.append(row)
    return output
