from __future__ import annotations


def _to_int(value, default: int) -> int:
    try:
        return int(value)
    except Exception:
        return default


def _to_float(value, default: float) -> float:
    try:
        return float(value)
    except Exception:
        return default


def clamp(value: int, minimum: int, maximum: int) -> int:
    if value < minimum:
        return minimum
    if value > maximum:
        return maximum
    return value


def resolve_adaptive_difficulty(skill: dict, student_context: dict) -> int:
    difficulty_min = max(1, _to_int(skill.get("difficulty_min"), 1))
    difficulty_max = max(difficulty_min, _to_int(skill.get("difficulty_max"), 3))

    # Student's per-skill level is used as a base and then adapted using latest performance.
    base_level = clamp(_to_int(student_context.get("level"), difficulty_min), difficulty_min, difficulty_max)
    accuracy_last_5 = _to_float(student_context.get("accuracy_last_5"), 0.0)

    if accuracy_last_5 >= 0.8:
        base_level += 1
    elif accuracy_last_5 <= 0.4:
        base_level -= 1

    return clamp(base_level, difficulty_min, difficulty_max)
