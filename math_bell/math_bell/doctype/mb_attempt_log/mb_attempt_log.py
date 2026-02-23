# Copyright (c) 2026, alaalsalam and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document

from math_bell.utils.validators import ensure_link_exists, validate_json_field


class MBAttemptLog(Document):
    def validate(self):
        ensure_link_exists('MB Session', self.session, 'Session')
        ensure_link_exists('MB Skill', self.skill, 'Skill')
        validate_json_field(self, 'given_answer_json', required=False)
        if self.hint_used_count is None:
            self.hint_used_count = 0
        if not self.mistake_type:
            self.mistake_type = "none"


def on_doctype_update():
    frappe.db.add_index('MB Attempt Log', ['session', 'skill'], 'idx_mb_attempt_log_session_skill')
