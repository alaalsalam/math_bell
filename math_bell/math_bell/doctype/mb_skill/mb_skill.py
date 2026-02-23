# Copyright (c) 2026, alaalsalam and contributors
# For license information, please see license.txt

from frappe.model.document import Document

from math_bell.utils.validators import ensure_link_exists


class MBSkill(Document):
    def validate(self):
        ensure_link_exists('MB Grade', self.grade, 'Grade')
        ensure_link_exists('MB Domain', self.domain, 'Domain')
