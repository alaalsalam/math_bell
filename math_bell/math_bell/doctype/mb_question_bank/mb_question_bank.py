# Copyright (c) 2026, alaalsalam and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document

from math_bell.utils.validators import ensure_link_exists, validate_json_field


class MBQuestionBank(Document):
    def validate(self):
        ensure_link_exists('MB Skill', self.skill, 'Skill')
        if self.template:
            ensure_link_exists('MB Game Template', self.template, 'Template')
        validate_json_field(self, 'question_json', required=True)
        validate_json_field(self, 'answer_json', required=True)


def on_doctype_update():
    frappe.db.add_index('MB Question Bank', ['skill', 'difficulty'], 'idx_mb_question_bank_skill_difficulty')
