from __future__ import annotations

import hashlib
import json
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


def _question_signature(generator_type: str, difficulty: int, question: dict) -> str:
    canonical = {
        "g": (generator_type or "").strip(),
        "d": int(difficulty),
        "q": question or {},
    }
    raw = json.dumps(canonical, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()[:24]


def generate_question(skill: dict, student_context: dict, index: int, session_seed: str, nonce: int = 0) -> dict:
    skill_name = skill.get("name") or "skill"
    generator_type = (skill.get("generator_type") or "static").strip()
    grade = _as_int(skill.get("grade"), 1)

    difficulty = resolve_adaptive_difficulty(skill, student_context)
    rng_seed = _seed_to_int(f"{session_seed}:{skill_name}:{index}:{difficulty}:{nonce}")
    rng = random.Random(rng_seed)

    question, answer = build_question(generator_type, difficulty, grade, rng)
    signature = _question_signature(generator_type, difficulty, question)
    return {
        "question_ref": _question_ref(skill_name, session_seed, index),
        "skill": skill_name,
        "template": None,
        "difficulty": str(difficulty),
        "question": question,
        "answer": answer,
        "signature": signature,
        "nonce_used": int(nonce),
        "generated": True,
    }


def generate_questions(skill: dict, student_context: dict, count: int = 10, session_seed: str = "") -> list[dict]:
    if not skill:
        return []

    recent_signatures = set(student_context.get("recent_signatures") or [])
    used_signatures = set()
    questions = []
    for idx in range(max(1, int(count))):
        picked = None
        # Deterministic seed+nonce loop to minimize repeats in-session and against recent history.
        nonce_attempts = 0
        for nonce in range(0, 64):
            nonce_attempts += 1
            candidate = generate_question(skill, student_context, idx, session_seed, nonce=nonce)
            sig = candidate.get("signature")
            if not sig:
                picked = candidate
                break
            if sig in used_signatures:
                continue
            if sig in recent_signatures:
                continue
            picked = candidate
            break

        if not picked:
            picked = generate_question(skill, student_context, idx, session_seed, nonce=999)
            nonce_attempts += 1

        sig = picked.get("signature")
        if sig:
            used_signatures.add(sig)
        picked["nonce_attempts"] = nonce_attempts
        questions.append(picked)
    return questions
