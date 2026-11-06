import argparse
import hashlib
import json
from pathlib import Path


def build_manifest(root):
    base = root / "experience/evidence/realism-01/sources"
    inspection = json.loads((base / "source-inspection.json").read_text())
    upstream = json.loads((root / "experience/evidence/neighborhood-20261027/world/source-receipts.json").read_text())
    files = []
    def add(path, source, date, location, method, limitations, capture_date):
        data = (base / path).read_bytes()
        files.append({"path": path, "source": source, "date": date,
            "captureDate": capture_date, "rights": "Kyoto City / MLIT PLATEAU CC BY 4.0; retain attribution and modification notices. Derived audit records belong to this repository.",
            "location": location, "method": method, "limitations": limitations,
            "bytes": len(data), "sha256": hashlib.sha256(data).hexdigest()})
    for record in inspection["records"]:
        if record["imageCount"]:
            location = {"data804": "Nishiki west approach, south side",
                        "data802": "Nishiki west approach, north side",
                        "data765": "Pontochō south approach",
                        "data840": "Shijō–Karasuma search area; Mitsui identity unconfirmed"}[record["tile"]]
            add(f"{record['tile']}-texture.webp", record["source"], inspection["inspectedAt"], location,
                "Original embedded WebP bytes extracted with py3dtiles/pygltflib; no image edits.",
                "Texture atlas reference; no walking-height render or per-facade texel-density acceptance.",
                "LOD3 acquisition FY2023 per metadata; exact LOD2/photo date unverified.")
    for receipt in upstream["ignoredMetadataReads"]:
        if receipt.get("id"):
            add(f"metadata/{Path(receipt['file']).name}", receipt["url"], "2026-10-27",
                "Kyoto Nakagyo buildings or eastern Pontochō road/furniture collection",
                "Retained original tileset JSON; SHA-256 matched original retrieval receipt.",
                "Content bounding regions and LOD metadata do not establish continuous surface coverage.",
                "LOD3 inputs FY2023; metadata publication 2026-03-31; individual object dates unverified.")
    add("source-inspection.json", "Five original B3DM URLs and hashes recorded inside this file", inspection["inspectedAt"],
        "Four Kyoto building samples and one Pontochō road sample", inspection["method"],
        "; ".join(inspection["limitations"]), "LOD3 inputs FY2023; individual LOD2 capture dates unverified.")
    add("route-source-audit.json", "Three retained tilesets plus the selected route and original tile inspection",
        "2026-11-05", "All 54 ordered Shijō East route edges", "audit_sources.py using pyproj and Shapely, 25 m candidate search",
        "Bounds and object attribute points provide acquisition candidates; all appearance, ground and lighting gates remain unverified.",
        "Derived spatial index generated 2026-11-05; original capture dates in source receipts.")
    add("route-source-board.svg", "route-source-audit.json", "2026-11-05", "All 54 ordered Shijō East route edges",
        "audit_sources.py renders the candidate index using ElementTree; equal-width edge columns.",
        "Color denotes presence of candidate bounds, with no qualified appearance or ground claim.",
        "Derived diagram generated 2026-11-05.")
    add("original-byte-validation.json", "Five downloaded B3DM files bound by source-inspection.json hashes",
        "2026-11-05", "Nishiki, Shijō–Karasuma and Pontochō samples",
        "verify_originals.py checks original bytes, feature IDs, actual LOD, indexed triangles and unchanged texture bytes/dimensions.",
        "Raw B3DM files remain ignored; reproducing this check requires downloads whose hashes match the preserved receipt.",
        "Verification performed 2026-11-05; input capture dates retained separately.")
    return {"schemaVersion": 1, "reviewedOn": "2026-11-05", "pathBase": "manifest-directory",
        "credit": "Source: Kyoto City / MLIT Project PLATEAU, CC BY 4.0. Original atlas bytes and tileset JSON unchanged; inspection, spatial index and visualization authored by TourGuideAI.",
        "files": files}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()
    manifest = build_manifest(args.root.resolve())
    args.output.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
    print(f"Recorded {len(manifest['files'])} source evidence files")


if __name__ == "__main__":
    main()
