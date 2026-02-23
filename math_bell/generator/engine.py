from __future__ import annotations

import hashlib
import random

from math_bell.generator.difficulty import resolve_adaptive_difficulty
from math_bell.generator.templates import build_question


def _as_int(value, default: int = 0) -> int:
    try:
        return int(value)
    except Exception:
        return default


def _seed_to_int(text: str) -> int:
    digest = hashlib.sha256(text.encode("utf-8")).hexdigest()
    return int(digest[:16], 16)


def _question_ref(skill_name: str, session_seed: str, index: int) -> str:
    token = hashlib.md5(f"{skill_name}:{session_seed}".encode("utf-8")).hexdigest()[:10]
    return f"GEN-{token}-{index + 1}"


def generate_question(skill: dict, student_context: dict, index: int, session_seed: str) -> dict:
    skill_name = skill.get("name") or "skill"
    generator_type = (skill.get("generator_type") or "static").strip()
    grade = _as_int(skill.get("grade"), 1)

    difficulty = resolve_adaptive_difficulty(skill, student_context)
    rng_seed = _seed_to_int(f"{session_seed}:{skill_name}:{index}:{difficulty}")
    rng = random.Random(rng_seed)

    question, answer = build_question(generator_type, difficulty, grade, rng)
    return {
        "question_ref": _question_ref(skill_name, session_seed, index),
        "skill": skill_name,
        "template": None,
        "difficulty": str(difficulty),
        "question": question,
        "answer": answer,
        "generated": True,
    }


def generate_questions(skill: dict, student_context: dict, count: int = 10, session_seed: str = "") -> list[dict]:
    if not skill:
        return []

    questions = []
    for idx in range(max(1, int(count))):
        questions.append(generate_question(skill, student_context, idx, session_seed))
    return questions
