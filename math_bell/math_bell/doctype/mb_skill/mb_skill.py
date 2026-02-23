# Copyright (c) 2026, alaalsalam and contributors
# For license information, please see license.txt

from frappe.model.document import Document
import frappe

from math_bell.utils.validators import ensure_link_exists


class MBSkill(Document):
    def validate(self):
        ensure_link_exists('MB Grade', self.grade, 'Grade')
        ensure_link_exists('MB Domain', self.domain, 'Domain')

        if not self.generator_type:
            self.generator_type = "static"

        self.difficulty_min = int(self.difficulty_min or 1)
        self.difficulty_max = int(self.difficulty_max or 3)
        if self.difficulty_min < 1:
            self.difficulty_min = 1
        if self.difficulty_max < self.difficulty_min:
            frappe.throw("difficulty_max must be greater than or equal to difficulty_min")
