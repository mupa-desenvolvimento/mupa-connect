import json
import re

def normalize(val):
    if not val: return ""
    val = str(val)
    # Remove FIL-
    normalized = re.sub(r'FIL-', '', val, flags=re.IGNORECASE)
    # Remove spaces
    normalized = re.sub(r'\s+', '', normalized)
    # Remove leading zeros
    normalized = re.sub(r'^0+', '', normalized)
    if normalized == "" and val.strip() != "":
        only_digits = re.sub(r'[^0-9]', '', val)
        if re.match(r'^0+$', only_digits): return "0"
    return normalized.lower()

# Since I can't easily query with complex logic, I'll fetch all and do it in python
# But fetch limits are an issue. Let's just fetch a few.
