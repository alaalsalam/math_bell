from __future__ import annotations

import frappe
from frappe import _

from math_bell.api.helpers import ensure_active_link, normalize_bool, normalize_int, parse_json_input, to_json_string


_ALLOWED_GENERATORS = {
    "static",
    "addition_range",
    "subtraction_range",
    "vertical_add",
    "vertical_sub",
    "fraction_basic",
    "fraction_compare",
}


def _domain_title(domain: str) -> str:
    mapping = {
        "Addition": "الجمع",
        "Subtraction": "الطرح",
        "Fractions": "الكسور",
    }
    return mapping.get(domain, domain)


def _next_skill_code(base_code: str) -> str:
    if not frappe.db.exists("MB Skill", base_code):
        return base_code

    suffix = 2
    while True:
        candidate = f"{base_code}_{suffix}"
        if not frappe.db.exists("MB Skill", candidate):
            return candidate
        suffix += 1


def _build_prerequisites(created_codes: list[str], idx: int, graph_mode: str, prereq_step: int) -> list[str]:
    if idx <= 0:
        return []

    if graph_mode == "branching":
        # Branching mode keeps a lightweight fan-in to one prior anchor.
        anchor_index = max(0, idx - max(prereq_step, 1))
        return [created_codes[anchor_index]]

    # Linear mode: each step depends on the previous `prereq_step` skills.
    start = max(0, idx - max(prereq_step, 1))
    return created_codes[start:idx]


def _skills_for_pack(pack_name: str) -> list[dict]:
    return frappe.get_all(
        "MB Skill",
        filters={"pack": pack_name},
        fields=[
            "name",
            "code",
            "title_ar",
            "domain",
            "grade",
            "pack",
            "order",
            "prerequisites_json",
            "show_in_student_app",
            "is_active",
        ],
        order_by="`order` asc, creation asc",
        limit_page_length=1000,
    )


@frappe.whitelist(allow_guest=True)
def list_packs(grade: str | None = None, domain: str | None = None):
    filters = {}
    if grade:
        filters["grade"] = grade
    if domain:
        filters["domain"] = domain

    packs = frappe.get_all(
        "MB Skill Pack",
        filters=filters,
        fields=["name", "title", "grade", "domain", "is_enabled", "description_ar", "order"],
        order_by="grade asc, domain asc, `order` asc, creation asc",
        limit_page_length=500,
    )

    payload = []
    for pack in packs:
        skills = _skills_for_pack(pack.get("name"))
        payload.append(
            {
                **pack,
                "skills_count": len(skills),
                "skills": skills,
            }
        )

    return {"ok": True, "data": {"packs": payload}}


@frappe.whitelist(allow_guest=True)
def toggle_pack(pack_id: str, is_enabled: int | bool = 1):
    pack_id = (pack_id or "").strip()
    if not pack_id:
        frappe.throw(_("pack_id is required"))
    if not frappe.db.exists("MB Skill Pack", pack_id):
        frappe.throw(_("Pack '{0}' does not exist").format(pack_id))

    flag = 1 if normalize_bool(is_enabled) else 0
    frappe.db.set_value("MB Skill Pack", pack_id, "is_enabled", flag)

    return {
        "ok": True,
        "data": {
            "pack_id": pack_id,
            "is_enabled": flag,
        },
    }


@frappe.whitelist(allow_guest=True)
def toggle_skill_visibility(skill_id: str, show_in_student_app: int | bool = 1):
    skill_id = (skill_id or "").strip()
    if not skill_id:
        frappe.throw(_("skill_id is required"))
    if not frappe.db.exists("MB Skill", skill_id):
        frappe.throw(_("Skill '{0}' does not exist").format(skill_id))

    flag = 1 if normalize_bool(show_in_student_app) else 0
    frappe.db.set_value("MB Skill", skill_id, "show_in_student_app", flag)

    return {
        "ok": True,
        "data": {
            "skill_id": skill_id,
            "show_in_student_app": flag,
        },
    }


@frappe.whitelist(allow_guest=True)
def generate_pack(payload=None):
    data = parse_json_input(payload, "payload", required=True)
    if not isinstance(data, dict):
        frappe.throw(_("payload must be a JSON object"))

    grade = (data.get("grade") or "").strip()
    domain = (data.get("domain") or "").strip()
    title = (data.get("title") or "").strip()
    description_ar = (data.get("description_ar") or "").strip()
    skills_specs = data.get("skills") or []
    graph = data.get("graph") or {}

    if not title:
        frappe.throw(_("title is required"))
    if not isinstance(skills_specs, list) or not skills_specs:
        frappe.throw(_("skills must be a non-empty list"))

    ensure_active_link("MB Grade", grade, "Grade")
    ensure_active_link("MB Domain", domain, "Domain")

    graph_mode = str(graph.get("mode") or "linear").strip().lower()
    if graph_mode not in {"linear", "branching"}:
        frappe.throw(_("graph.mode must be linear or branching"))
    prereq_step = max(normalize_int(graph.get("prereq_step"), 1), 1)

    pack_doc = frappe.get_doc(
        {
            "doctype": "MB Skill Pack",
            "title": title,
            "grade": grade,
            "domain": domain,
            "is_enabled": 1,
            "description_ar": description_ar,
            "order": normalize_int(data.get("order"), 10),
        }
    )
    pack_doc.insert(ignore_permissions=True)

    created_skills: list[dict] = []
    created_codes: list[str] = []
    running_order = 10

    for spec in skills_specs:
        if not isinstance(spec, dict):
            continue

        prefix = str(spec.get("code_prefix") or "").strip()
        if not prefix:
            frappe.throw(_("Each skills item requires code_prefix"))

        count = max(normalize_int(spec.get("count"), 0), 0)
        if count <= 0:
            continue

        generator_type = str(spec.get("generator_type") or "static").strip()
        if generator_type not in _ALLOWED_GENERATORS:
            frappe.throw(_("Unsupported generator_type: {0}").format(generator_type))

        difficulty_min = max(normalize_int(spec.get("difficulty_min"), 1), 1)
        difficulty_max = max(normalize_int(spec.get("difficulty_max"), difficulty_min), difficulty_min)
        mastery_threshold = float(spec.get("mastery_threshold") or 0.8)

        title_prefix = str(spec.get("title_prefix") or f"{_domain_title(domain)} مهارة")

        for idx in range(count):
            skill_seq = idx + 1
            base_code = f"{prefix}_{skill_seq:03d}"
            skill_code = _next_skill_code(base_code)
            prerequisites = _build_prerequisites(created_codes, len(created_codes), graph_mode, prereq_step)

            skill_doc = frappe.get_doc(
                {
                    "doctype": "MB Skill",
                    "code": skill_code,
                    "grade": grade,
                    "domain": domain,
                    "title_ar": f"{title_prefix} {skill_seq}",
                    "description_ar": "",
                    "order": running_order,
                    "mastery_threshold": mastery_threshold,
                    "is_active": 1,
                    "show_in_student_app": 1,
                    "adaptive_enabled": 1,
                    "generator_type": generator_type,
                    "difficulty_min": difficulty_min,
                    "difficulty_max": difficulty_max,
                    "prerequisites_json": to_json_string(prerequisites),
                    "pack": pack_doc.name,
                    "unlock_rule": "by_mastery",
                }
            )
            skill_doc.insert(ignore_permissions=True)

            created_codes.append(skill_code)
            created_skills.append(
                {
                    "name": skill_doc.name,
                    "code": skill_doc.code,
                    "title_ar": skill_doc.title_ar,
                    "order": skill_doc.order,
                    "generator_type": skill_doc.generator_type,
                    "difficulty_min": skill_doc.difficulty_min,
                    "difficulty_max": skill_doc.difficulty_max,
                    "prerequisites": prerequisites,
                }
            )
            running_order += 10

    return {
        "ok": True,
        "data": {
            "pack": {
                "name": pack_doc.name,
                "title": pack_doc.title,
                "grade": pack_doc.grade,
                "domain": pack_doc.domain,
                "is_enabled": pack_doc.is_enabled,
                "description_ar": pack_doc.description_ar,
            },
            "graph": {"mode": graph_mode, "prereq_step": prereq_step},
            "skills": created_skills,
        },
    }
