import frappe
from frappe.model.document import Document

from math_bell.utils.validators import ensure_link_exists


class MBSkillPack(Document):
    def validate(self):
        ensure_link_exists("MB Grade", self.grade, "Grade")
        ensure_link_exists("MB Domain", self.domain, "Domain")

        self.order = int(self.order or 10)
        if self.order < 0:
            self.order = 0
