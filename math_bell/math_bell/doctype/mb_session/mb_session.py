# Copyright (c) 2026, alaalsalam and contributors
# For license information, please see license.txt

from frappe.model.document import Document

from math_bell.utils.validators import ensure_link_exists, validate_json_field


class MBSession(Document):
    def validate(self):
        ensure_link_exists('MB Grade', self.grade, 'Grade')
        ensure_link_exists('MB Domain', self.domain, 'Domain')
        if self.skill:
            ensure_link_exists('MB Skill', self.skill, 'Skill')
        if self.student:
            ensure_link_exists('MB Student Profile', self.student, 'Student')
        validate_json_field(self, 'stats_json', required=False)
