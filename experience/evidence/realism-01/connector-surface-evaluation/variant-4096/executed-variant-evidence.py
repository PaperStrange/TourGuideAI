import argparse
from collections import defaultdict
from datetime import datetime, timezone
import json
from pathlib import Path
import shutil

import numpy as np
from PIL import Image

from evidence import EVIDENCE, compare, verify as verify_native
from localize import ROOT, WORKSPACE, digest, identity, write_json
from render import metrics


VARIANT = EVIDENCE / "variant-4096"


def measurements(directory):
    report = json.loads((directory / "result.json").read_text())
    native = json.loads((EVIDENCE / "render/result.json").read_text())
    assert report["completed"] and report["meshUnchanged"] and report["sourceAssetsUnchanged"]
    assert len(report["views"]) == 24
    assert report["localization"] == native["localization"]
    assert report["settings"] == native["settings"]
    assert digest(directory / "executed-render.py") == report["producer"]["sha256"]
    totals = defaultdict(lambda: {"eligiblePixels": 0, "coveredPixels": 0, "comparisonPixels": 0,
        "absoluteErrorSum": 0.0, "coverageChangedPixels": 0})
    seen = set()
    for row in report["views"]:
        key = row["rank"], row["cameraIndex"]
        assert key not in seen
        seen.add(key)
        baseline = next(item for item in native["views"] if (item["rank"], item["cameraIndex"]) == key)
        stem = f'rank-{row["rank"]}-view-{row["cameraIndex"]:02d}'
        for file in row["files"]:
            name = Path(file["path"]).name
            path = directory / name if name.endswith("-render.png") else EVIDENCE / "render" / name
            assert digest(path) == file["sha256"] and path.stat().st_size == file["bytes"]
        with Image.open(directory / (stem + "-render.png")) as image:
            rendered = np.asarray(image.convert("RGBA"))
        with Image.open(EVIDENCE / "render" / (stem + "-render.png")) as image:
            native_covered = np.asarray(image.convert("RGBA"))[:, :, 3] == 255
        with Image.open(EVIDENCE / "render" / (stem + "-reference.jpg")) as image:
            reference = np.asarray(image.convert("RGB"))
        with Image.open(EVIDENCE / "render" / (stem + "-eligible.png")) as image:
            eligible = np.asarray(image.convert("L")) > 0
        with Image.open(EVIDENCE / "render" / (stem + "-pose-neighborhood.png")) as image:
            excluded = np.asarray(image.convert("L")) > 0
        covered = rendered[:, :, 3] == 255
        assert not np.any(covered & ~eligible)
        comparison = covered & ~excluded
        for name, mask in [("eligiblePixels", eligible), ("coveredPixels", covered), ("comparisonPixels", comparison)]:
            assert row[name] == int(np.count_nonzero(mask))
            totals[row["rank"]][name] += row[name]
        assert row["eligiblePixels"] == baseline["eligiblePixels"]
        assert row["poseCandidates"] == baseline["poseCandidates"]
        assert row["poseNeighborhoodEligiblePixels"] == baseline["poseNeighborhoodEligiblePixels"]
        assert row["uncoveredPixels"] == int(np.count_nonzero(eligible & ~covered))
        compare(row["fullCoveredPhotometry"], metrics(reference[covered], rendered[covered, :3]))
        compare(row["remainingPixelPhotometry"], metrics(reference[comparison], rendered[comparison, :3]))
        totals[row["rank"]]["absoluteErrorSum"] += float(np.abs(reference[comparison].astype(float) - rendered[comparison, :3]).sum())
        totals[row["rank"]]["coverageChangedPixels"] += int(np.count_nonzero(covered != native_covered))
    assert seen == {(rank, index) for rank in [67, 72] for index in range(12)}
    for value in totals.values():
        value["coverage"] = value["coveredPixels"] / value["eligiblePixels"]
        value["remainingPixelMeanAbsoluteChannelError255"] = value["absoluteErrorSum"] / (value["comparisonPixels"] * 3)
    return json.loads(json.dumps(totals))


def verify(directory):
    manifest = json.loads((directory / "manifest.json").read_text())
    for row in manifest["files"]:
        path = (directory / row["path"]).resolve()
        assert path.is_relative_to(directory) and path.is_file()
        assert digest(path) == row["sha256"] and path.stat().st_size == row["bytes"]
        assert all(row.get(name) for name in ["source", "date", "rights", "location", "method", "limitations"])
    assert digest(EVIDENCE / "render/result.json") == manifest["nativeResultSha256"]
    assert digest(EVIDENCE / "localization/run-02/result.json") == manifest["localizationResultSha256"]
    summary = json.loads((directory / "summary.json").read_text())
    for row in summary["sourceAssets"]:
        path = ROOT / "experience/evidence/realism-01/connector-surface/texture-4096-01" / Path(row["path"]).name
        assert digest(path) == row["sha256"] and path.stat().st_size == row["bytes"]
    compare(json.loads((directory / "summary.json").read_text())["renderTotals"], measurements(directory))
    print(json.dumps({"verifiedFiles": len(manifest["files"]), "variant": "4096 atlas", "renderedViews": 24,
        "renderTotals": measurements(directory), "appearanceQualified": False}))


def retain():
    assert not VARIANT.exists()
    source = WORKSPACE / "render-4096-01"
    report = json.loads((source / "result.json").read_text())
    assert report["completed"]
    for row in report["sourceAssets"]:
        path = Path(row["path"])
        assert digest(path) == row["sha256"] and path.stat().st_size == row["bytes"]
    VARIANT.mkdir()
    for path in sorted(source.iterdir()):
        if path.name.endswith("-render.png") or path.name in ["result.json", "executed-render.py"]:
            shutil.copyfile(path, VARIANT / path.name)
    shutil.copyfile(WORKSPACE / "render-4096-01.txt", VARIANT / "execution.txt")
    shutil.copyfile(Path(__file__), VARIANT / "executed-variant-evidence.py")
    asset_source = ROOT / "artifacts/realism-01/connector-surface/texture-4096-01/result.json"
    shutil.copyfile(asset_source, VARIANT / "asset-source.json")
    summary = {"schemaVersion": 1, "date": datetime.now(timezone.utc).isoformat(),
        "variant": "OpenMVS full-source-resolution, 4096 maximum atlas, unlit glTF and lossless PNG",
        "renderTotals": measurements(VARIANT), "appearanceQualified": False, "routeQualified": False,
        "sourceAssets": report["sourceAssets"],
        "retainedSourceAssetDirectory": "../../connector-surface/texture-4096-01",
        "nativeResult": "../render/result.json", "localizationResult": "../localization/run-02/result.json",
        "unchangedReferenceAndMaskDirectory": "../render",
        "limitations": report["limitations"] + ["One pixel of ray coverage differs from the native OBJ baseline; this report does not assert bitwise geometry or browser shader equivalence."]}
    write_json(VARIANT / "summary.json", summary)
    files = []
    for path in sorted(VARIANT.iterdir()):
        if path.is_file():
            files.append({"path": path.name, "bytes": path.stat().st_size, "sha256": digest(path),
                "source": "Irvin Chen / Panoramax Taiwan; frozen fit and reserved held-out captures; native OpenMVS glTF/PNG output",
                "date": summary["date"], "rights": "Source-derived imagery/geometry CC BY-SA 4.0",
                "location": "Shijō–Karasuma crossing area, held-out ranks 67/72",
                "method": "Same frozen poses, original masks, Embree first-hit and pinned CPU bilinear sampling as native atlas diagnostic",
                "limitations": "Same-sequence adjacent views; coverage includes sky; no appearance or route acceptance; native reference and masks reused by exact hash."})
    write_json(VARIANT / "manifest.json", {"schemaVersion": 1, "files": files,
        "nativeResultSha256": digest(EVIDENCE / "render/result.json"),
        "localizationResultSha256": digest(EVIDENCE / "localization/run-02/result.json")})
    verify(VARIANT.resolve())


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--retain", action="store_true")
    parser.add_argument("--verify", type=Path)
    args = parser.parse_args()
    assert args.retain != bool(args.verify)
    verify_native(EVIDENCE.resolve())
    retain() if args.retain else verify(args.verify.resolve())
