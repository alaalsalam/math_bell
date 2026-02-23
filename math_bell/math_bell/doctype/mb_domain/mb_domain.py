# Copyright (c) 2026, alaalsalam and contributors
# For license information, please see license.txt

from frappe.model.document import Document


class MBDomain(Document):
    def validate(self):
        mapping = {
            'Addition': 'الجمع',
            'Subtraction': 'الطرح',
            'Fractions': 'الكسور',
        }
        if not self.title_ar and self.domain in mapping:
            self.title_ar = mapping[self.domain]
