const DEFAULT_SETTINGS = {
  default_bell_duration_seconds: 600,
  default_questions_per_session: 10,
  enable_sound: 1,
  enable_confetti: 1,
  enable_balloons: 1,
  allow_guest_play: 1,
  show_only_skills_with_questions: 0,
  enabled_game_engines: ["mcq", "vertical_column", "fraction_builder"],
};

const DEFAULT_GRADES = [
  { name: "1", grade: "1", title_ar: "الصف الأول" },
  { name: "2", grade: "2", title_ar: "الصف الثاني" },
];

const DEFAULT_DOMAINS = [
  { name: "Addition", domain: "Addition", title_ar: "غابة الجمع", icon: "🌳" },
  { name: "Subtraction", domain: "Subtraction", title_ar: "بحر الطرح", icon: "🌊" },
  { name: "Fractions", domain: "Fractions", title_ar: "جزيرة الكسور", icon: "🏝️" },
];

const DEFAULT_SKILLS = [
  { name: "G1_ADD_001", code: "G1_ADD_001", grade: "1", domain: "Addition", title_ar: "جمع حتى 10", generator_type: "addition_range", order: 10 },
  { name: "G1_SUB_001", code: "G1_SUB_001", grade: "1", domain: "Subtraction", title_ar: "طرح حتى 10", generator_type: "subtraction_range", order: 20 },
  { name: "G1_ADD_002", code: "G1_ADD_002", grade: "1", domain: "Addition", title_ar: "جمع عمودي بسيط", generator_type: "vertical_add", order: 30 },
  { name: "G1_SUB_002", code: "G1_SUB_002", grade: "1", domain: "Subtraction", title_ar: "طرح عمودي بسيط", generator_type: "vertical_sub", order: 40 },
  { name: "G1_FRA_001", code: "G1_FRA_001", grade: "1", domain: "Fractions", title_ar: "الكسور الأساسية", generator_type: "fraction_basic", order: 50 },
  { name: "G1_FRA_002", code: "G1_FRA_002", grade: "1", domain: "Fractions", title_ar: "مقارنة الكسور", generator_type: "fraction_compare", order: 60 },
  { name: "G2_ADD_001", code: "G2_ADD_001", grade: "2", domain: "Addition", title_ar: "جمع حتى 100", generator_type: "addition_range", order: 10 },
  { name: "G2_SUB_001", code: "G2_SUB_001", grade: "2", domain: "Subtraction", title_ar: "طرح حتى 100", generator_type: "subtraction_range", order: 20 },
  { name: "G2_ADD_002", code: "G2_ADD_002", grade: "2", domain: "Addition", title_ar: "جمع عمودي", generator_type: "vertical_add", order: 30 },
  { name: "G2_SUB_002", code: "G2_SUB_002", grade: "2", domain: "Subtraction", title_ar: "طرح عمودي", generator_type: "vertical_sub", order: 40 },
  { name: "G2_FRA_001", code: "G2_FRA_001", grade: "2", domain: "Fractions", title_ar: "بناء الكسور", generator_type: "fraction_basic", order: 50 },
  { name: "G2_FRA_002", code: "G2_FRA_002", grade: "2", domain: "Fractions", title_ar: "مقارنة كسور متقدمة", generator_type: "fraction_compare", order: 60 },
];

function withDefaults(skill) {
  return {
    description_ar: "",
    question_count: 0,
    generated_content: true,
    is_unlocked: true,
    is_mastered: false,
    is_manual_unlocked: false,
    min_level_required: 1,
    mastery_threshold: 0.7,
    ...skill,
  };
}

export function buildLocalBootstrap() {
  const skills = DEFAULT_SKILLS.map(withDefaults);
  const skillsTree = DEFAULT_GRADES.map((grade) => {
    const domains = DEFAULT_DOMAINS.map((domain) => {
      const domainSkills = skills
        .filter((item) => item.grade === grade.name && item.domain === domain.name)
        .sort((a, b) => (a.order || 0) - (b.order || 0));

      return {
        name: domain.name,
        domain: domain.domain,
        title_ar: domain.title_ar,
        icon: domain.icon,
        skills: domainSkills,
      };
    });

    return {
      name: grade.name,
      grade: grade.grade,
      title_ar: grade.title_ar,
      domains,
    };
  });

  return {
    grades: DEFAULT_GRADES,
    domains: DEFAULT_DOMAINS,
    skills,
    skills_tree: skillsTree,
    game_templates: [],
    settings: DEFAULT_SETTINGS,
    _is_local_fallback: true,
  };
}
