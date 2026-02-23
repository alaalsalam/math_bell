# Copyright (c) 2026, alaalsalam and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.model.document import Document

from math_bell.utils.validators import ensure_link_exists, validate_json_field


class MBGameLevel(Document):
    def validate(self):
        ensure_link_exists('MB Skill', self.skill, 'Skill')
        ensure_link_exists('MB Game Template', self.template, 'Template')
        if self.level_no is None or int(self.level_no) < 1 or int(self.level_no) > 3:
            frappe.throw(_('Level No must be between 1 and 3'))
        validate_json_field(self, 'config_json', required=False)


def on_doctype_update():
    frappe.db.add_unique('MB Game Level', ['skill', 'template', 'level_no'], 'uniq_mb_game_level_skill_template_level')
