import hashlib
import json
import pathlib


DIRECTORY = pathlib.Path(__file__).resolve().parent
specifications = json.loads((DIRECTORY / "sources.json").read_text())
downloads = json.loads((DIRECTORY / "downloads.json").read_text())
sources = {source["id"]: source for source in specifications["images"]}
files = []

for download in downloads:
    source = sources[download["id"]]
    files.append({
        "path": download["path"],
        "bytes": download["bytes"],
        "sha256": download["sha256"],
        "source": source["sourceUrl"],
        "date": download["retrievedAt"],
        "captureDate": source["capturedAt"],
        "rights": source["author"] + "; " + source["license"] + "; " + source["licenseUrl"],
        "location": source["location"],
        "method": download["method"],
        "limitations": source["limitations"] + [source["qualification"], "Reserved for evaluation preparation; no asset authoring use"],
    })

for filename in ["sources.json", "downloads.json", "exagent-pricing-receipt.json", "advalay-pricing-receipt.json", "README.md", "acquire.py", "verify.py", "record_manifest.py"]:
    path = DIRECTORY / filename
    payload = path.read_bytes()
    files.append({
        "path": filename,
        "bytes": len(payload),
        "sha256": hashlib.sha256(payload).hexdigest(),
        "source": "TourGuideAI R04/R05 research; upstream URLs, rights and exact price excerpts recorded in sources.json",
        "date": specifications["reviewedAt"],
        "rights": "Project-authored research and tools; photograph rights and provider source quotations retain their attributed terms",
        "location": "Kyoto 1,353.444 m six-sight route; provider public service pages",
        "method": "Metadata and evidence qualification from fully read source pages, downloaded images and official public pricing; SHA-256 of retained file bytes",
        "limitations": ["Three partial reserved reference views; full-route day/night capture incomplete", "Public provider line items do not establish a route quote, purchased rights or acceptance", "Provider raw HTML lives in ignored artifacts and is optional in a clean checkout"],
    })

(DIRECTORY / "manifest.json").write_text(json.dumps({
    "reviewedAt": specifications["reviewedAt"],
    "scope": "R04/R05 reserved photographic evidence and public acquisition price qualification",
    "files": files,
}, ensure_ascii=False, indent=2) + "\n")
