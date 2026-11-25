import argparse
from datetime import datetime, timezone
import gzip
import hashlib
import importlib.metadata
import json
from pathlib import Path
import shutil
import urllib.parse
import urllib.request

from PIL import Image


ROOT = Path(__file__).resolve().parents[3]
WORKSPACE = ROOT / "artifacts/realism-01/connector-surface-sources"
EVIDENCE = ROOT / "experience/evidence/realism-01/connector-surface-sources"
PREVIOUS = ROOT / "experience/evidence/realism-01/connector-source-intake"
COLLECTION = "cf65c61d-2a42-452d-8095-a1daee44e6a9"
FIT_RANKS = [68, 69, 70, 71]
HOLDOUT_RANKS = [67, 72]


def digest(data):
    return hashlib.sha256(data).hexdigest()


def write_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2, allow_nan=False) + "\n")


def load(path):
    return json.loads(path.read_bytes())


def source_rows():
    records = json.loads(gzip.decompress((PREVIOUS / "all-records.json.gz").read_bytes()))["records"]
    selected = sorted((row for row in records if row["collection"] == COLLECTION
        and row["rank"] in FIT_RANKS + HOLDOUT_RANKS), key=lambda row: row["rank"])
    assert [row["rank"] for row in selected] == sorted(FIT_RANKS + HOLDOUT_RANKS)
    for row in selected:
        assert row["license"] == "CC-BY-SA-4.0" and row["projection"] == "equirectangular"
        assert row["camera"]["sensor_array_dimensions"] == [6080, 3040]
        assert row["camera"]["field_of_view"] == 360
        assert row["date"].startswith("2026-02-17")
        assert row["nearestEdgeOrdinal"] == 1 and row["firstEdgeChainageMetres"] == 0
    return selected


def reserve():
    destination = WORKSPACE / "assignment.json"
    assert not destination.exists(), "Source reservation is immutable; inspect the existing record"
    rows = source_rows()
    fitting = [row for row in rows if row["rank"] in FIT_RANKS]
    assert fitting == load(PREVIOUS / "selection/selected.json")
    assignment = {"schemaVersion": 1, "reservedAt": datetime.now(timezone.utc).isoformat(),
        "collection": COLLECTION, "fitRanks": FIT_RANKS, "holdoutRanks": HOLDOUT_RANKS,
        "frozenSourceRecordsSha256": digest((PREVIOUS / "all-records.json.gz").read_bytes()),
        "frozenFitSelectionSha256": digest((PREVIOUS / "selection/selected.json").read_bytes()),
        "frozenRelativeModelSha256": digest((ROOT / "experience/evidence/realism-01/connector-rig/run-02/result.json").read_bytes()),
        "members": [{"id": row["id"], "rank": row["rank"], "role": "fit" if row["rank"] in FIT_RANKS else "holdout"} for row in rows],
        "protocol": {"fit": "Only ranks 68–71 may contribute sparse structure, dense depth, mesh geometry or texture",
            "holdout": "Reserve ranks 67 and 72 from all surface fitting, densification and texture. Pose-only localization against frozen geometry requires separately recorded correspondences; evaluate remaining image pixels after camera estimation.",
            "independence": "Adjacent views from the same capture sequence and photographer. They are unseen fitting inputs, with correlated capture conditions; they supply no independent capture-family or participant recognition evidence.",
            "location": "All six declared camera positions remain west of approved route edge 1",
            "limits": "Source metadata establishes rights and declared camera properties. Visible overlap, pose recovery, surface fidelity, metric scale and ground require separate measurements."}}
    write_json(destination, assignment)
    for role in ["fit", "holdout"]:
        directory = WORKSPACE / role
        directory.mkdir(parents=True)
        if role == "fit":
            shutil.copyfile(PREVIOUS / "selection/selected.json", directory / "selected.json")
        else:
            write_json(directory / "selected.json", [row for row in rows if row["rank"] in HOLDOUT_RANKS])
    print(json.dumps({"reservedAt": assignment["reservedAt"], "fit": FIT_RANKS, "holdout": HOLDOUT_RANKS}))


def request(path, url):
    receipt_path = path.with_name(path.name + ".receipt.json")
    if path.exists():
        data = path.read_bytes()
        receipt = load(receipt_path)
        assert receipt["url"] == url and receipt["sha256"] == digest(data) and receipt["bytes"] == len(data)
        return data, receipt
    parsed = urllib.parse.urlparse(url)
    assert parsed.scheme == "https" and parsed.netloc in {"api.panoramax.xyz", "panoramax.osm.tw"}
    path.parent.mkdir(parents=True, exist_ok=True)
    with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "TourGuideAI-surface-research/1.0"}), timeout=60) as response:
        data = response.read(64 * 1024 * 1024 + 1)
        assert len(data) <= 64 * 1024 * 1024 and response.status == 200
        receipt = {"url": url, "finalUrl": response.url, "status": response.status,
            "date": datetime.now(timezone.utc).isoformat(), "headers": list(response.headers.items()),
            "bytes": len(data), "sha256": digest(data)}
    path.write_bytes(data)
    write_json(receipt_path, receipt)
    return data, receipt


def verify_metadata(source, row):
    assert source["id"] == row["id"] and source["collection"] == row["collection"]
    assert source["properties"]["license"] == row["license"] == "CC-BY-SA-4.0"
    assert source["properties"]["datetime"] == row["date"]
    assert source["properties"]["geovisio:rank_in_collection"] == row["rank"]
    assert source["geometry"]["coordinates"] == row["coordinates"]
    assert source["providers"] == row["providers"]
    assert source["properties"]["pers:interior_orientation"] == row["camera"]
    assert source["properties"]["exif"]["Xmp.GPano.ProjectionType"] == row["projection"]


def acquire():
    assignment = load(WORKSPACE / "assignment.json")
    records = []
    for role in ["fit", "holdout"]:
        for row in load(WORKSPACE / role / "selected.json"):
            metadata, metadata_receipt = request(WORKSPACE / role / (row["id"] + ".json"), row["source"])
            source = json.loads(metadata)
            verify_metadata(source, row)
            for resolution, dimensions in [("hd", [6080, 3040]), ("sd", [2048, 1024])]:
                name = row["id"] + "-" + resolution + ".jpg"
                assert source["assets"][resolution]["href"] == row["assets"][resolution]["href"]
                data, receipt = request(WORKSPACE / role / name, row["assets"][resolution]["href"])
                assert receipt["date"] >= assignment["reservedAt"]
                with Image.open(WORKSPACE / role / name) as image:
                    assert list(image.size) == dimensions
                    image.load()
                expected = None
                if role == "fit":
                    expected = load(PREVIOUS / "selection" / (name + ".receipt.json"))
                    assert receipt["sha256"] == expected["sha256"] and receipt["bytes"] == expected["bytes"], "Fitting image must exactly reproduce prior source bytes"
                records.append({"id": row["id"], "rank": row["rank"], "role": role,
                    "file": f"{role}/{name}", "resolution": resolution, "dimensions": dimensions,
                    "bytes": len(data), "sha256": digest(data), "restoredOriginalIdentity": role == "fit",
                    "priorSha256": expected["sha256"] if expected else None,
                    "metadataSha256": metadata_receipt["sha256"]})
                write_json(WORKSPACE / "acquisition.json", {"completed": False, "images": records})
                print(json.dumps({"rank": row["rank"], "role": role, "resolution": resolution, "sha256": digest(data)}), flush=True)
    write_json(WORKSPACE / "acquisition.json", {"completed": True, "finishedAt": datetime.now(timezone.utc).isoformat(),
        "versions": {"Pillow": importlib.metadata.version("Pillow")},
        "producerSha256": digest(Path(__file__).read_bytes()), "imageValidation": "Full JPEG pixel decoding through Pillow Image.load", "images": records})


def retain():
    acquisition = load(WORKSPACE / "acquisition.json")
    assert acquisition["completed"] and len(acquisition["images"]) == 12
    EVIDENCE.mkdir(parents=True, exist_ok=True)
    for name in ["assignment.json", "acquisition.json"]:
        shutil.copyfile(WORKSPACE / name, EVIDENCE / name)
    for role in ["fit", "holdout"]:
        destination = EVIDENCE / role
        destination.mkdir(exist_ok=True)
        shutil.copyfile(WORKSPACE / role / "selected.json", destination / "selected.json")
        for row in load(WORKSPACE / role / "selected.json"):
            for suffix in [".json", "-hd.jpg", "-sd.jpg"]:
                source = WORKSPACE / role / (row["id"] + suffix)
                receipt_path = source.with_name(source.name + ".receipt.json")
                receipt = load(receipt_path)
                data = source.read_bytes()
                assert digest(data) == receipt["sha256"] and len(data) == receipt["bytes"]
                shutil.copyfile(receipt_path, destination / receipt_path.name)
                if suffix == ".json":
                    (destination / (source.name + ".gz")).write_bytes(gzip.compress(data, mtime=0))
                elif suffix == "-sd.jpg":
                    shutil.copyfile(source, destination / source.name)
    producer = EVIDENCE / "producer"
    producer.mkdir(exist_ok=True)
    shutil.copyfile(Path(__file__), producer / "intake.py")
    shutil.copyfile(Path(__file__).parent / "requirements.txt", producer / "requirements.txt")
    for name in ["license.html.gz", "license.html.receipt.json"]:
        shutil.copyfile(PREVIOUS / "references" / name, EVIDENCE / name)
    generated = datetime.now(timezone.utc).isoformat()
    entries = []
    for filename in sorted(EVIDENCE.rglob("*")):
        if not filename.is_file() or filename.name == "manifest.json":
            continue
        data = filename.read_bytes()
        entry = {"path": str(filename.relative_to(EVIDENCE)), "bytes": len(data), "sha256": digest(data),
            "source": "Retained Panoramax collection metadata and newly acquired public source bytes",
            "date": generated, "rights": "Selected imagery CC BY-SA 4.0, Irvin Chen / Panoramax Taiwan; project producer under repository licensing",
            "location": "Shijō–Karasuma crossing area; selected camera positions west of the approved first route edge",
            "method": "Frozen fitting and held-out membership; exact HTTPS source bytes, mature-library JPEG decoding and immutable prior fitting-image comparison",
            "limitations": "Same capture sequence; no independent capture-family, visual-overlap, geometry, metric-floor or full-route acceptance"}
        source_name = filename.name[:-3] if filename.suffix == ".gz" else filename.name
        receipt_path = filename.with_name(source_name + ".receipt.json")
        if receipt_path.exists():
            receipt = load(receipt_path)
            entry.update({"source": receipt["url"], "date": receipt["date"], "receipt": str(receipt_path.relative_to(EVIDENCE))})
        if filename.suffix == ".gz":
            raw = gzip.decompress(data)
            entry.update({"decodedBytes": len(raw), "decodedSha256": digest(raw)})
        entries.append(entry)
    write_json(EVIDENCE / "manifest.json", {"schemaVersion": 1, "generatedAt": generated,
        "sourceQualificationOnly": True, "files": entries})
    verify()


def verify():
    manifest = load(EVIDENCE / "manifest.json")
    assert manifest["sourceQualificationOnly"] is True
    for entry in manifest["files"]:
        path = (EVIDENCE / entry["path"]).resolve()
        assert path.is_relative_to(EVIDENCE.resolve())
        data = path.read_bytes()
        assert len(data) == entry["bytes"] and digest(data) == entry["sha256"]
        assert all(entry[key] for key in ["source", "date", "rights", "location", "method", "limitations"])
        if path.suffix == ".gz":
            data = gzip.decompress(data)
            assert len(data) == entry["decodedBytes"] and digest(data) == entry["decodedSha256"]
        if entry.get("receipt"):
            receipt = load(EVIDENCE / entry["receipt"])
            assert len(data) == receipt["bytes"] and digest(data) == receipt["sha256"]
            assert receipt["status"] == 200 and receipt["url"] == entry["source"]
    assignment = load(EVIDENCE / "assignment.json")
    assert assignment["fitRanks"] == FIT_RANKS and assignment["holdoutRanks"] == HOLDOUT_RANKS
    assert assignment["frozenSourceRecordsSha256"] == digest((PREVIOUS / "all-records.json.gz").read_bytes())
    assert assignment["frozenFitSelectionSha256"] == digest((PREVIOUS / "selection/selected.json").read_bytes())
    assert assignment["frozenRelativeModelSha256"] == digest((ROOT / "experience/evidence/realism-01/connector-rig/run-02/result.json").read_bytes())
    assert (EVIDENCE / "fit/selected.json").read_bytes() == (PREVIOUS / "selection/selected.json").read_bytes()
    assert (EVIDENCE / "producer/intake.py").read_bytes() == Path(__file__).read_bytes()
    original = {row["id"]: row for row in source_rows()}
    acquisition = load(EVIDENCE / "acquisition.json")
    assert acquisition["completed"] and len(acquisition["images"]) == 12
    assert acquisition["producerSha256"] == digest((EVIDENCE / "producer/intake.py").read_bytes())
    assert acquisition["imageValidation"] == "Full JPEG pixel decoding through Pillow Image.load"
    assert len({record["file"] for record in acquisition["images"]}) == 12
    membership = []
    for role, ranks in [("fit", FIT_RANKS), ("holdout", HOLDOUT_RANKS)]:
        rows = load(EVIDENCE / role / "selected.json")
        assert [row["rank"] for row in rows] == ranks
        for row in rows:
            assert row == original[row["id"]]
            membership.append({"id": row["id"], "rank": row["rank"], "role": role})
            metadata = json.loads(gzip.decompress((EVIDENCE / role / (row["id"] + ".json.gz")).read_bytes()))
            verify_metadata(metadata, row)
            for resolution in ["hd", "sd"]:
                name = row["id"] + "-" + resolution + ".jpg"
                receipt = load(EVIDENCE / role / (name + ".receipt.json"))
                assert receipt["url"] == row["assets"][resolution]["href"]
                assert receipt["date"] >= assignment["reservedAt"]
                observed = next(record for record in acquisition["images"] if record["file"] == f"{role}/{name}")
                assert observed["sha256"] == receipt["sha256"] and observed["bytes"] == receipt["bytes"]
                assert observed["role"] == role and observed["rank"] == row["rank"]
                assert observed["dimensions"] == ([6080, 3040] if resolution == "hd" else [2048, 1024])
                if role == "fit":
                    prior = load(PREVIOUS / "selection" / (name + ".receipt.json"))
                    assert receipt["sha256"] == prior["sha256"] and receipt["bytes"] == prior["bytes"]
                    assert observed["restoredOriginalIdentity"] is True and observed["priorSha256"] == prior["sha256"]
                else:
                    assert observed["restoredOriginalIdentity"] is False and observed["priorSha256"] is None
            with Image.open(EVIDENCE / role / (row["id"] + "-sd.jpg")) as image:
                assert image.size == (2048, 1024)
                image.load()
    assert sorted(membership, key=lambda member: member["rank"]) == assignment["members"]
    assert not ({row["id"] for row in load(EVIDENCE / "fit/selected.json")} & {row["id"] for row in load(EVIDENCE / "holdout/selected.json")})
    print(json.dumps({"verifiedFiles": len(manifest["files"]), "fitImages": 4, "reservedHoldoutImages": 2,
        "fitBytesMatchPriorTrial": True, "sameCaptureFamily": True, "surfaceOrRouteQualified": False}))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("mode", choices=["reserve", "acquire", "retain", "verify"])
    arguments = parser.parse_args()
    {"reserve": reserve, "acquire": acquire, "retain": retain, "verify": verify}[arguments.mode]()
