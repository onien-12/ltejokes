import os
import json
import re
import csv
from collections import defaultdict

BASE_DIR = "etsi_ts"
CSV_FILE = "List_of_Specifications_20250723 - Sheet1.csv"

RELEASE_NAMES = {
    "00": "General information",
    "01": "Requirements",
    "02": "Service aspects (stage 1)",
    "03": "Technical realization (stage 2)",
    "04": "Signalling protocols (\"stage 3\") - user equipment to network",
    "05": "GSM radio aspects",
    "06": "CODECs",
    "07": "Data",
    "08": "Signalling protocols (\"stage 3\") - (RSS-CN)",
    "09": "Signalling protocols (\"stage 3\") - (intra-fixed-network)",
    "10": "Programme management",
    "11": "Subscriber Identity Module",
    "12": "OAM&P and Charging",
    "13": "Access requirements and test specifications",
    "21": "Requirements",
    "22": "Service aspects",
    "23": "Technical realization",
    "24": "Signalling protocols (\"stage 3\") - user equipment to network",
    "25": "UTRA radio aspects",
    "26": "CODECs",
    "27": "Data",
    "28": "Signalling protocols (\"stage 3\") - (RSS-CN) and OAM&P and Charging (overflow from 32.- range)",
    "29": "Signalling protocols (\"stage 3\") - (intra-fixed-network)",
    "30": "Programme management",
    "31": "Subscriber Identity Module (SIM / USIM), IC Cards, Test specs.",
    "32": "OAM&P and Charging",
    "33": "Security aspects",
    "34": "UE and (U)SIM test specifications",
    "35": "Security algorithms",
    "36": "LTE (Evolved UTRA) and LTE-Advanced radio aspects",
    "37": "Multiple radio access technology aspects",
    "38": "Radio technology beyond LTE",
    "41": "Requirements",
    "42": "Service aspects (stage 1)",
    "43": "Technical realization (stage 2)",
    "44": "Signalling protocols (user equipment to network)",
    "45": "GSM radio aspects",
    "46": "CODECs",
    "47": "Data",
    "48": "Signalling protocols (RSS-CN)",
    "49": "Signalling protocols (intra-fixed-network)",
    "50": "Programme management",
    "51": "Subscriber Identity Module",
    "52": "O&M",
    "55": "Security algorithms"
}

doc_name_map = {}
with open(CSV_FILE, newline='', encoding="utf-8") as csvfile:
    reader = csv.DictReader(csvfile)
    for row in reader:
        spec_code = row.get("Specification Number")
        name = row.get("Title")
        if spec_code and name:
            doc_name_map[spec_code.strip()] = name.strip()

data = defaultdict(lambda: {
    "code": None,
    "name": None,
    "documents": defaultdict(lambda: {"code": None, "name": None, "revisions": []})
})

for root, dirs, files in os.walk(BASE_DIR):
    for file in files:
        if not file.lower().endswith(".pdf"):
            continue

        rel_path = os.path.relpath(os.path.join(root, file), BASE_DIR)
        parts = rel_path.split(os.sep)

        if len(parts) < 4:
            continue

        range_dir, spec_code, version_dir, filename = parts[0], parts[1], parts[2], parts[3]

        release_code = spec_code[1:3]
        doc_code = spec_code[3:6]
        version = spec_code[6:] or ""

        revision_code = version_dir.replace("_", ".") if re.match(
            r"\d", version_dir) else version_dir

        release_name = RELEASE_NAMES.get(
            release_code, f"Series {release_code}")

        rel_entry = data[release_code]
        rel_entry["code"] = release_code
        rel_entry["name"] = release_name

        name_doc_code = doc_code[1:] if doc_code.startswith("0") else doc_code

        doc_full_name = doc_name_map.get(f"{release_code}.{name_doc_code}", None) or \
            doc_name_map.get(f"{release_code}.{doc_code}",
                             f"Spec {release_code}.{doc_code}")

        print(release_code, name_doc_code, version, release_name, doc_full_name)

        doc_entry = rel_entry["documents"][doc_code]
        doc_entry["code"] = doc_code
        doc_entry["name"] = doc_full_name
        doc_entry["version"] = version
        doc_entry["revisions"].append({
            "code": revision_code,
            "file": os.path.join(BASE_DIR, rel_path).replace("\\", "/")
        })

output = {
    "releases": [
        {
            "code": rel["code"],
            "name": rel["name"],
            "documents": sorted([
                {
                    "code": doc["code"],
                    "name": doc["name"],
                    "revisions": sorted(doc["revisions"], key=lambda r: r["code"])
                }
                for doc in rel["documents"].values()
            ], key=lambda d: d["code"])
        }
        for rel in data.values()
    ]
}

with open("etsi_index.json", "w", encoding="utf-8") as f:
    json.dump(output, f, indent=2, ensure_ascii=False)
