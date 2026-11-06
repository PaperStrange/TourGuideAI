import argparse
import gzip
import hashlib
import json
from pathlib import Path


def verify(root, repeated=None):
    target = root / "experience/evidence/realism-01/qualification/pedestrian"
    manifest = json.loads((target / "manifest.json").read_text())
    for base, records in [(target, manifest["files"]), (root, manifest["producers"])]:
        for record in records:
            data = (base / record["path"]).read_bytes()
            if len(data) != record["bytes"] or hashlib.sha256(data).hexdigest() != record["sha256"]:
                raise ValueError(f"Pedestrian evidence identity differs: {record['path']}")
            if "decodedSha256" in record:
                decoded = gzip.decompress(data)
                if len(decoded) != record["decodedBytes"] or hashlib.sha256(decoded).hexdigest() != record["decodedSha256"]:
                    raise ValueError("Decoded road triangles differ")
    report = json.loads((target / "pedestrian-surface-audit.json").read_text())
    navigation = json.loads((target / "navigation-surface-check.json").read_text())
    for record in report["inputs"] + navigation["inputs"]:
        data = (root / record["path"]).read_bytes()
        if len(data) != record["bytes"] or hashlib.sha256(data).hexdigest() != record["sha256"]:
            raise ValueError("Surface audit input changed")
    geography = json.loads((root / "experience/src/neighborhoods/shijo-east/geography.json").read_text())
    if [item["id"] for item in report["edges"]] != geography["selectedRoute"]["edgeIds"]:
        raise ValueError("Detailed surface edge order differs")
    if {item["id"] for item in report["sights"]} != {item["id"] for item in geography["sights"]}:
        raise ValueError("Detailed surface sight coverage differs")
    triangles = json.loads(gzip.decompress((target / "detailed-road-triangles.json.gz").read_bytes()))
    if hashlib.sha256(gzip.decompress((target / "detailed-road-triangles.json.gz").read_bytes())).hexdigest() != navigation["sourceGeometrySha256"]:
        raise ValueError("Navigation diagnostic source binding differs")
    if [item["id"] for item in navigation["edges"]] != geography["selectedRoute"]["edgeIds"]:
        raise ValueError("Navigation diagnostic edge order differs")
    if len(triangles["triangles"]) != report["sourceRoadTriangles"]:
        raise ValueError("Detailed triangle count differs")
    if any(item["pedestrianFloorQualified"] for item in report["edges"] + report["sights"]):
        raise ValueError("Source availability cannot claim floor acceptance")
    if report["totalDetailedRoadCenterlineOverlapMetres"] != sum(item["allDetailedRoadOverlapMetres"] for item in report["edges"]):
        raise ValueError("Detailed road overlap total differs")
    if repeated:
        actual = json.loads((repeated / "pedestrian-surface-audit.json").read_text())
        actual.pop("date")
        original = dict(report)
        original.pop("date")
        if actual != original:
            raise ValueError("Repeated surface audit observations differ")
        if (repeated / "detailed-road-triangles.json").read_bytes() != gzip.decompress((target / "detailed-road-triangles.json.gz").read_bytes()):
            raise ValueError("Repeated original triangle output differs")
        if (repeated / "surface-coverage.svg").read_bytes() != (target / "surface-coverage.svg").read_bytes():
            raise ValueError("Repeated source coverage board differs")
        for name in ["navigation-surface-check.json", "navigation-correction.svg"]:
            if (repeated / name).read_bytes() != (target / name).read_bytes():
                raise ValueError("Repeated navigation diagnostic differs")
    print(json.dumps({"status": "passed", "fileHashes": len(manifest["files"]), "producerHashes": len(manifest["producers"]),
        "routeEdges": len(report["edges"]), "sights": len(report["sights"]), "sourceTriangles": report["sourceRoadTriangles"],
        "repeatedOutputsChecked": bool(repeated), "limitations": "Integrity and reproducibility only; source surface gaps and floor acceptance remain unchanged"}, indent=2))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=Path, required=True)
    parser.add_argument("--repeated", type=Path)
    args = parser.parse_args()
    verify(args.root.resolve(), args.repeated.resolve() if args.repeated else None)
