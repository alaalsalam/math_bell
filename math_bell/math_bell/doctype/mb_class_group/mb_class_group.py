# Copyright (c) 2026, alaalsalam and contributors
# For license information, please see license.txt

from frappe.model.document import Document

from math_bell.utils.validators import ensure_link_exists, generate_unique_code


class MBClassGroup(Document):
    def before_insert(self):
        if not self.join_code:
            self.join_code = generate_unique_code('MB Class Group', 'join_code', length=6)

    def validate(self):
        ensure_link_exists('MB Grade', self.grade, 'Grade')
        ensure_link_exists('User', self.teacher_user, 'Teacher User')
