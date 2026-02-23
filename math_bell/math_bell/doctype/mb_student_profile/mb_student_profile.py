# Copyright (c) 2026, alaalsalam and contributors
# For license information, please see license.txt

import random

from frappe.model.document import Document

from math_bell.utils.validators import ensure_link_exists, generate_unique_code

AVATAR_EMOJIS = ["😀", "😺", "🐼", "🦊", "🐸", "🐵", "🐯", "🐰", "🐻", "🦁"]


class MBStudentProfile(Document):
    def before_insert(self):
        if not self.student_code:
            self.student_code = generate_unique_code('MB Student Profile', 'student_code', length=8)
        if not self.avatar_emoji:
            self.avatar_emoji = random.choice(AVATAR_EMOJIS)

    def validate(self):
        ensure_link_exists('MB Grade', self.grade, 'Grade')
        if self.class_group:
            ensure_link_exists('MB Class Group', self.class_group, 'Class Group')
        if not self.password_simple:
            self.password_simple = "1234"
        if self.current_streak is None:
            self.current_streak = 0
        if self.best_streak is None:
            self.best_streak = 0
        if self.total_correct is None:
            self.total_correct = 0
        if self.level is None or int(self.level or 0) < 1:
            self.level = 1
        if not self.skill_levels_json:
            self.skill_levels_json = "{}"
        if not self.predictions_json:
            self.predictions_json = "{}"
        if self.total_stars is None:
            self.total_stars = 0
        if self.xp_points is None:
            self.xp_points = 0
        if not self.avatar_key:
            self.avatar_key = ""
