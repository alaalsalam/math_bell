const GRADE_LABELS = {
  "1": "الصف الأول",
  "2": "الصف الثاني",
};

const DOMAIN_LABELS = {
  ADD: "الجمع",
  SUB: "الطرح",
  FRA: "الكسور",
};

const GENERATOR_LABELS = {
  addition_range: "تدريب الجمع",
  subtraction_range: "تدريب الطرح",
  vertical_add: "الجمع العمودي",
  vertical_sub: "الطرح العمودي",
  fraction_basic: "الكسور الأساسية",
  fraction_compare: "مقارنة الكسور",
};

export function toReadableSkillLabel(rawValue) {
  const raw = String(rawValue || "").trim();
  if (!raw) return "مهارة متاحة";

  if (GENERATOR_LABELS[raw]) return GENERATOR_LABELS[raw];

  const match = raw.match(/^G([12])_([A-Z]{3})_(\d{3})$/);
  if (match) {
    const grade = GRADE_LABELS[match[1]] || `الصف ${match[1]}`;
    const domain = DOMAIN_LABELS[match[2]] || "مهارة";
    const step = Number(match[3]) || 1;
    return `${domain} - الخطوة ${step} (${grade})`;
  }

  if (/^[A-Z0-9_]+$/.test(raw)) {
    return raw.replaceAll("_", " ").trim();
  }

  return raw;
}

