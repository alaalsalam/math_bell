# Copyright (c) 2026, alaalsalam and contributors
# For license information, please see license.txt

from frappe.model.document import Document

from math_bell.utils.validators import ensure_link_exists, validate_json_field


class MBLesson(Document):
    def validate(self):
        ensure_link_exists('MB Skill', self.skill, 'Skill')
        validate_json_field(self, 'content_json', required=False)
