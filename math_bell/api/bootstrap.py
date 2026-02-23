import frappe


@frappe.whitelist(allow_guest=True)
def get_bootstrap():
    grades = frappe.get_all(
        "MB Grade",
        filters={"is_active": 1},
        fields=["name", "grade", "title_ar"],
        order_by="grade asc",
    )
    domains = frappe.get_all(
        "MB Domain",
        filters={"is_active": 1},
        fields=["name", "domain", "title_ar", "icon"],
        order_by="domain asc",
    )
    skills = frappe.get_all(
        "MB Skill",
        filters={"is_active": 1},
        fields=[
            "name",
            "code",
            "grade",
            "domain",
            "title_ar",
            "description_ar",
            "`order` as skill_order",
            "mastery_threshold",
        ],
        order_by="grade asc, domain asc, `order` asc, creation asc",
    )
    templates = frappe.get_all(
        "MB Game Template",
        filters={"is_active": 1},
        fields=["name", "code", "title_ar", "engine_key"],
        order_by="creation asc",
    )

    skill_map: dict[str, dict[str, list[dict]]] = {}
    for row in skills:
        grade_key = row.get("grade")
        domain_key = row.get("domain")
        skill_map.setdefault(grade_key, {}).setdefault(domain_key, []).append(
            {
                "name": row.get("name"),
                "code": row.get("code"),
                "title_ar": row.get("title_ar"),
                "description_ar": row.get("description_ar"),
                "order": row.get("skill_order"),
                "mastery_threshold": row.get("mastery_threshold"),
            }
        )

    skills_tree = []
    for grade in grades:
        domain_nodes = []
        for domain in domains:
            domain_nodes.append(
                {
                    "name": domain.get("name"),
                    "domain": domain.get("domain"),
                    "title_ar": domain.get("title_ar"),
                    "icon": domain.get("icon"),
                    "skills": skill_map.get(grade.get("name"), {}).get(domain.get("name"), []),
                }
            )
        skills_tree.append(
            {
                "name": grade.get("name"),
                "grade": grade.get("grade"),
                "title_ar": grade.get("title_ar"),
                "domains": domain_nodes,
            }
        )

    return {
        "ok": True,
        "data": {
            "grades": grades,
            "domains": domains,
            "skills": skills,
            "skills_tree": skills_tree,
            "game_templates": templates,
        },
    }

