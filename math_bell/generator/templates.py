from __future__ import annotations

import random


def _numeric_choices(correct: int, rng: random.Random, count: int = 4) -> list[int]:
    choices = {int(correct)}
    span = max(3, abs(correct) // 3 + 2)

    while len(choices) < count:
        delta = rng.randint(1, span)
        candidate = correct + rng.choice([-delta, delta])
        if candidate < 0:
            candidate = abs(candidate) + rng.randint(0, 3)
        choices.add(int(candidate))

    output = list(choices)
    rng.shuffle(output)
    return output


def _fraction_string(numerator: int, denominator: int) -> str:
    return f"{numerator}/{denominator}"


def _fraction_choices(correct: str, denominator: int, rng: random.Random, count: int = 3) -> list[str]:
    choices = {correct}
    while len(choices) < count:
        n = rng.randint(1, max(1, denominator - 1))
        choices.add(_fraction_string(n, denominator))

    output = list(choices)
    rng.shuffle(output)
    return output


def _addition_range(difficulty: int, grade: int, rng: random.Random):
    max_n = 10 if difficulty == 1 else 20 if difficulty == 2 else 50 if difficulty == 3 else 99
    if grade >= 2 and difficulty >= 3:
        max_n = max(max_n, 120)

    a = rng.randint(1, max_n)
    b = rng.randint(1, max_n)
    correct = a + b

    question = {
        "ui": "mcq",
        "text": f"{a} + {b} = ؟",
        "choices": _numeric_choices(correct, rng),
    }
    answer = {"value": correct}
    return question, answer


def _subtraction_range(difficulty: int, grade: int, rng: random.Random):
    max_n = 10 if difficulty == 1 else 20 if difficulty == 2 else 50 if difficulty == 3 else 120

    a = rng.randint(2, max_n)
    b = rng.randint(1, max_n)

    # Grade 1 avoids negative results.
    if grade <= 1 and b > a:
        a, b = b, a

    correct = a - b
    question = {
        "ui": "mcq",
        "text": f"{a} - {b} = ؟",
        "choices": _numeric_choices(correct, rng),
    }
    answer = {"value": correct}
    return question, answer


def _vertical_add(difficulty: int, _grade: int, rng: random.Random):
    digits = 2 if difficulty <= 2 else 3
    low = 10 ** (digits - 1)
    high = (10**digits) - 1

    a = rng.randint(low, high)
    b = rng.randint(low, high)

    if difficulty >= 2:
        ones_a = a % 10
        ones_b = b % 10
        if ones_a + ones_b < 10:
            needed = 10 - ones_a
            ones_b = max(needed, min(9, ones_b + needed))
            b = (b // 10) * 10 + ones_b

    correct = a + b
    question = {
        "ui": "vertical_column",
        "text": "اجمع عمودياً واختر الناتج",
        "payload": {
            "op": "+",
            "a": a,
            "b": b,
            "choices": _numeric_choices(correct, rng),
        },
    }
    answer = {"value": correct}
    return question, answer


def _vertical_sub(difficulty: int, _grade: int, rng: random.Random):
    digits = 2 if difficulty <= 2 else 3
    low = 10 ** (digits - 1)
    high = (10**digits) - 1

    a = rng.randint(low, high)
    b = rng.randint(low, high)
    if b > a:
        a, b = b, a

    if difficulty >= 2:
        ones_a = a % 10
        ones_b = b % 10
        if ones_a >= ones_b:
            ones_a = rng.randint(0, 4)
            ones_b = rng.randint(ones_a + 1, 9)
            a = (a // 10) * 10 + ones_a
            b = (b // 10) * 10 + ones_b
            if b > a:
                a, b = b, a

    correct = a - b
    question = {
        "ui": "vertical_column",
        "text": "اطرح عمودياً واختر الناتج",
        "payload": {
            "op": "-",
            "a": a,
            "b": b,
            "choices": _numeric_choices(correct, rng),
        },
    }
    answer = {"value": correct}
    return question, answer


def _fraction_basic(difficulty: int, _grade: int, rng: random.Random):
    denominator_max = 4 if difficulty == 1 else 6 if difficulty == 2 else 8 if difficulty == 3 else 10
    denominator = rng.randint(2, denominator_max)
    numerator = rng.randint(1, max(1, denominator - 1))

    correct = _fraction_string(numerator, denominator)
    question = {
        "ui": "fraction_builder",
        "text": "اختر الكسر الذي يمثل الشكل",
        "payload": {
            "parts": denominator,
            "filled": numerator,
            "choices": _fraction_choices(correct, denominator, rng),
        },
    }
    answer = {"value": correct}
    return question, answer


def _fraction_compare(difficulty: int, _grade: int, rng: random.Random):
    max_den = 4 if difficulty == 1 else 6 if difficulty == 2 else 8 if difficulty == 3 else 10

    d1 = rng.randint(2, max_den)
    d2 = rng.randint(2, max_den)
    n1 = rng.randint(1, d1 - 1)
    n2 = rng.randint(1, d2 - 1)

    left = n1 * d2
    right = n2 * d1
    sign = ">" if left > right else "<" if left < right else "="

    question = {
        "ui": "mcq",
        "text": f"قارن: {n1}/{d1} ؟ {n2}/{d2}",
        "choices": [">", "<", "="],
    }
    answer = {"value": sign}
    return question, answer


def build_question(generator_type: str, difficulty: int, grade: int, rng: random.Random):
    mapping = {
        "addition_range": _addition_range,
        "subtraction_range": _subtraction_range,
        "vertical_add": _vertical_add,
        "vertical_sub": _vertical_sub,
        "fraction_basic": _fraction_basic,
        "fraction_compare": _fraction_compare,
    }

    builder = mapping.get((generator_type or "").strip())
    if not builder:
        raise ValueError(f"Unsupported generator_type: {generator_type}")

    return builder(int(difficulty), int(grade), rng)
