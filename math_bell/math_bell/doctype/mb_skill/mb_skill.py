import frappe
from frappe.model.document import Document

from math_bell.utils.validators import ensure_link_exists
from math_bell.api.helpers import parse_doc_json


class MBSkill(Document):
    def validate(self):
        ensure_link_exists("MB Grade", self.grade, "Grade")
        ensure_link_exists("MB Domain", self.domain, "Domain")

        if not self.generator_type:
            self.generator_type = "static"

        self.difficulty_min = int(self.difficulty_min or 1)
        self.difficulty_max = int(self.difficulty_max or 3)
        if self.difficulty_min < 1:
            self.difficulty_min = 1
        if self.difficulty_max < self.difficulty_min:
            frappe.throw("difficulty_max must be greater than or equal to difficulty_min")

        if not self.unlock_rule:
            self.unlock_rule = "by_mastery"
        if self.unlock_rule not in {"by_mastery", "manual"}:
            frappe.throw("unlock_rule must be either 'by_mastery' or 'manual'")

        if self.prerequisites_json:
            parsed = parse_doc_json(self.prerequisites_json)
            if not isinstance(parsed, list):
                frappe.throw("prerequisites_json must be a JSON array of skill codes")
