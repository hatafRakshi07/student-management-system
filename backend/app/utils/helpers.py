import secrets
import string


def generate_reset_token(length: int = 64) -> str:
    alphabet = string.ascii_letters + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(length))


def calculate_grade(marks: float, total: float) -> str:
    pct = (marks / total) * 100 if total > 0 else 0
    if pct >= 90:
        return "A+"
    elif pct >= 80:
        return "A"
    elif pct >= 70:
        return "B+"
    elif pct >= 60:
        return "B"
    elif pct >= 50:
        return "C"
    elif pct >= 40:
        return "D"
    return "F"


def serialize_doc(doc: dict) -> dict:
    if not doc:
        return {}
    res = dict(doc)
    if "_id" in res:
        res["_id"] = str(res["_id"])
        res["id"] = str(res["_id"])
    return res


def serialize_list(items: list) -> list:
    return [serialize_doc(item) for item in items] if items else []

