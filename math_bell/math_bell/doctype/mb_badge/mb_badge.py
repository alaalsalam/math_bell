# Copyright (c) 2026, alaalsalam and contributors
# For license information, please see license.txt

from frappe.model.document import Document

from math_bell.utils.validators import validate_json_field


class MBBadge(Document):
    def validate(self):
        validate_json_field(self, 'rule_json', required=False)
