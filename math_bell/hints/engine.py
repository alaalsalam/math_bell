from __future__ import annotations

import hashlib
from fractions import Fraction


_SUFFIXES = [
    "كفو… حاول مرة ثانية 🔥",
    "يا سلام عليك إذا ركزت شوي 👏",
    "شد حيلك يا بطل 💪",
]


def _pick_suffix(seed: str) -> str:
    if not seed:
        return _SUFFIXES[0]
    index = int(hashlib.md5(seed.encode("utf-8")).hexdigest()[:4], 16) % len(_SUFFIXES)
    return _SUFFIXES[index]


def _num(value):
    try:
        return float(value)
    except Exception:
        return None


def _as_int(value):
    try:
        return int(value)
    except Exception:
        return None


def _normalize_value(value):
    if isinstance(value, dict):
        if "value" in value:
            return value.get("value")
        if "answer" in value:
            return value.get("answer")
    return value


def _parse_fraction(text) -> tuple[int, int] | None:
    if not isinstance(text, str) or "/" not in text:
        return None
    parts = text.split("/", 1)
    a = _as_int(parts[0].strip())
    b = _as_int(parts[1].strip())
    if a is None or b is None or b == 0:
        return None
    return (a, b)


def _parse_operands(payload: dict, question_text: str | None = None) -> tuple[int | None, int | None]:
    a = _as_int(payload.get("a"))
    b = _as_int(payload.get("b"))
    if a is not None and b is not None:
        return a, b

    text = question_text or ""
    if "+" in text or "-" in text:
        tokens = text.replace("=", " ").replace("؟", " ").split()
        numbers = []
        for token in tokens:
            maybe = _as_int(token)
            if maybe is not None:
                numbers.append(maybe)
        if len(numbers) >= 2:
            return numbers[0], numbers[1]
    return None, None


def _addition_subtraction_hint(generator_type: str, payload: dict, given, expected, text: str) -> tuple[str, str]:
    given_num = _num(given)
    expected_num = _num(expected)
    a, b = _parse_operands(payload, text)

    if given_num is not None and expected_num is not None and abs(given_num - expected_num) == 1:
        return ("off_by_one", "قريب مره يا بطل! راجع العد واحد واحد 👌")

    if a is not None and b is not None and given_num is not None:
        sum_value = a + b
        diff_value = a - b
        if generator_type == "addition_range" and int(given_num) == diff_value:
            return ("sign_confusion", "انتبه يا نجم: هذا جمع مو العكس 😉")
        if generator_type == "subtraction_range" and int(given_num) == sum_value:
            return ("sign_confusion", "انتبه يا نجم: هذا طرح مو العكس 😉")

    return ("random", "خذ نفس… واحسب بهدوء. تقدر 👍")


def _no_carry_sum(a: int, b: int) -> int:
    pa = abs(a)
    pb = abs(b)
    digits = []
    while pa > 0 or pb > 0:
        digits.append((pa % 10 + pb % 10) % 10)
        pa //= 10
        pb //= 10
    return int("".join(str(d) for d in reversed(digits or [0])))


def _no_borrow_sub(a: int, b: int) -> int:
    pa = abs(a)
    pb = abs(b)
    digits = []
    while pa > 0 or pb > 0:
        top = pa % 10
        low = pb % 10
        digits.append(abs(top - low))
        pa //= 10
        pb //= 10
    return int("".join(str(d) for d in reversed(digits or [0])))


def _looks_place_value_error(given, expected) -> bool:
    if given is None or expected is None:
        return False
    g = str(int(given)) if _num(given) is not None else str(given)
    e = str(int(expected)) if _num(expected) is not None else str(expected)
    return sorted(g) == sorted(e) and g != e


def _vertical_add_hint(payload: dict, given, expected) -> tuple[str, str]:
    a = _as_int(payload.get("a"))
    b = _as_int(payload.get("b"))
    given_num = _num(given)
    expected_num = _num(expected)
    if a is None or b is None:
        return ("place_value", "ركز على خانة الآحاد والعشرات 👀")

    carry_expected = ((a % 10) + (b % 10)) >= 10
    if carry_expected and given_num is not None and int(given_num) == _no_carry_sum(a, b):
        return ("carry_missed", "تذكّر تحمل الواحد للخانة اللي بعدها 🔟➕1")

    if _looks_place_value_error(given_num, expected_num):
        return ("place_value", "ركز على خانة الآحاد والعشرات 👀")

    return ("place_value", "رتّب الخانات عموديًا وابدأ من اليمين 👀")


def _vertical_sub_hint(payload: dict, given, expected) -> tuple[str, str]:
    a = _as_int(payload.get("a"))
    b = _as_int(payload.get("b"))
    given_num = _num(given)
    expected_num = _num(expected)
    if a is None or b is None:
        return ("place_value", "ركز على خانة الآحاد والعشرات 👀")

    borrow_expected = (a % 10) < (b % 10)
    if borrow_expected and given_num is not None and int(given_num) == _no_borrow_sub(a, b):
        return ("borrow_missed", "إذا الرقم فوق أصغر… نستلف من اللي قبله 😉")

    if _looks_place_value_error(given_num, expected_num):
        return ("place_value", "ركز على خانة الآحاد والعشرات 👀")

    return ("place_value", "ثبّت الأعمدة وابدأ من خانة الآحاد 👀")


def _fraction_basic_hint(payload: dict, given, expected) -> tuple[str, str]:
    given_fr = _parse_fraction(str(given))
    expected_fr = _parse_fraction(str(expected))
    if given_fr and expected_fr and given_fr[0] == expected_fr[1] and given_fr[1] == expected_fr[0]:
        return ("fraction_parts", "فوق كم جزء أخذنا… وتحت كم جزء بالمجموع 🍕")

    if isinstance(payload, dict):
        parts = _as_int(payload.get("parts"))
        filled = _as_int(payload.get("filled"))
        if parts and filled and expected_fr and (parts != expected_fr[1] or filled != expected_fr[0]):
            return ("fraction_parts", "عد الأجزاء المظللة… ثم اكتبها ككسر 👌")

    return ("fraction_parts", "عد الأجزاء المظللة… ثم اكتبها ككسر 👌")


def _fraction_compare_hint(payload: dict, given, expected, text: str) -> tuple[str, str]:
    left_raw = payload.get("left") if isinstance(payload, dict) else None
    right_raw = payload.get("right") if isinstance(payload, dict) else None

    left = _parse_fraction(str(left_raw)) if left_raw else None
    right = _parse_fraction(str(right_raw)) if right_raw else None

    if (not left or not right) and text:
        items = [part for part in text.replace("؟", " ").split() if "/" in part]
        if len(items) >= 2:
            left = _parse_fraction(items[0])
            right = _parse_fraction(items[1])

    if left and right and left[1] == right[1]:
        return ("fraction_compare", "لما المقامات متساوية… قارن البسطين مباشرة 👀")

    if given == expected:
        return ("none", "")

    return ("fraction_compare", "جرب تتخيل نفس البيتزا… أيهم أكبر؟ 🍕")


def get_hint(generator_type, question_payload, given_answer) -> dict:
    payload = question_payload if isinstance(question_payload, dict) else {}
    given = _normalize_value(given_answer)
    expected = _normalize_value(payload.get("correct_answer"))
    question = payload.get("question") if isinstance(payload.get("question"), dict) else {}
    question_text = payload.get("question_text") or question.get("text") or ""
    question_payload = question.get("payload") if isinstance(question.get("payload"), dict) else {}

    if generator_type in {"addition_range", "subtraction_range"}:
        mistake_type, hint = _addition_subtraction_hint(
            generator_type, question_payload, given, expected, question_text
        )
    elif generator_type == "vertical_add":
        mistake_type, hint = _vertical_add_hint(question_payload, given, expected)
    elif generator_type == "vertical_sub":
        mistake_type, hint = _vertical_sub_hint(question_payload, given, expected)
    elif generator_type == "fraction_basic":
        mistake_type, hint = _fraction_basic_hint(question_payload, given, expected)
    elif generator_type == "fraction_compare":
        mistake_type, hint = _fraction_compare_hint(question_payload, given, expected, question_text)
    else:
        mistake_type, hint = ("random", "خذ نفس… واحسب بهدوء. تقدر 👍")

    if mistake_type == "none" or not hint:
        return {"mistake_type": "none", "hint_ar": ""}

    suffix = _pick_suffix(f"{generator_type}:{given}:{expected}:{question_text}")
    return {"mistake_type": mistake_type, "hint_ar": f"{hint} {suffix}".strip()}

