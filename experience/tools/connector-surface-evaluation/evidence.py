import argparse
from collections import defaultdict
from datetime import datetime, timezone
import json
from pathlib import Path
import shutil

import cv2
import numpy as np
import pycolmap
from PIL import Image

from localize import ROOT, ORIGINAL, WORKSPACE, digest, identity, solve_pose, write_json
from render import metrics


EVIDENCE = ROOT / "experience/evidence/realism-01/connector-surface-evaluation"


def compare(expected, actual):
    if isinstance(expected, dict):
        assert isinstance(actual, dict)
        for key, value in expected.items():
            compare(value, actual[key])
    elif isinstance(expected, list):
        assert len(expected) == len(actual)
        for first, second in zip(expected, actual, strict=True):
            compare(first, second)
    elif isinstance(expected, float):
        assert np.isclose(expected, actual, rtol=1e-9, atol=1e-10), (expected, actual)
    else:
        assert expected == actual, (expected, actual)


def verify(directory):
    manifest = json.loads((directory / "manifest.json").read_text())
    for row in manifest["files"]:
        path = (directory / row["path"]).resolve()
        assert path.is_relative_to(directory) and path.is_file()
        assert path.stat().st_size == row["bytes"] and digest(path) == row["sha256"], row["path"]
        assert all(row.get(key) for key in ["source", "date", "rights", "location", "method", "limitations"])
    model = pycolmap.Reconstruction(ORIGINAL / "sparse/0")
    model_images = {image.name: image for image in model.images.values()}
    originals = json.loads((ORIGINAL / "observations.json").read_text())
    original_names = {row["name"]: row for row in originals["images"]}
    for run_name in ["run-01", "run-02"]:
        run = directory / "localization" / run_name
        report = json.loads((run / "result.json").read_text())
        assert report["completed"] and report["fittingModelUnchanged"]
        for name, expected_hash in report["modelFileHashes"].items():
            assert digest(ORIGINAL / name) == expected_hash
        assert digest(run / ("executed-relocalize.py" if run_name == "run-02" else "executed-localize.py")) == report["producer"]["sha256"]
        if run_name == "run-02":
            assert digest(run / "executed-localize.py") == report["poseProducer"]["sha256"]
            assert digest(directory / "localization/run-01/result.json") == report["previousAttempt"]["sha256"]
        with np.load(run / "keypoints.npz", allow_pickle=False) as points, np.load(ORIGINAL / "observations.npz", allow_pickle=False) as frozen:
            names = {row["image"]: row for row in report["features"]}
            for name, row in names.items():
                array = points[str(row["imageId"])]
                assert len(array) == row["count"]
                if name in original_names:
                    assert np.array_equal(array, frozen[original_names[name]["keypointsKey"]])
            pairs = {(row["query"], row["fit"]): {tuple(pair) for pair in row["inliers"]} for row in report["pairs"]}
            for query in report["queries"]:
                for association in query["associations"]:
                    keypoint = points[str(names[association["queryImage"]]["imageId"])][association["queryFeature"]]
                    assert np.array_equal(keypoint[:2], association["xy"])
                    point = model.point3D(association["point3DId"])
                    assert np.array_equal(point.xyz, association["xyz"])
                    assert association["supportingMatches"]
                    for match in association["supportingMatches"]:
                        image = model_images[match["fitImage"]]
                        assert image.image_id == match["frozenImageId"]
                        assert image.points2D[match["fitFeature"]].point3D_id == association["point3DId"]
                        assert (association["queryFeature"], match["fitFeature"]) in pairs[(association["queryImage"], match["fitImage"])]
                recomputed = solve_pose(model, query["associations"], refine_consensus=run_name == "run-02")
                compare(query["pose"], json.loads(json.dumps(recomputed)))
    render = json.loads((directory / "render/result.json").read_text())
    localized = json.loads((directory / "localization/run-02/result.json").read_text())
    assert digest(directory / "localization/run-02/result.json") == render["localization"]["sha256"]
    assert digest(directory / "render/executed-render.py") == render["producer"]["sha256"]
    assert render["completed"] and render["meshUnchanged"] and len(render["views"]) == 24
    assert {(row["rank"], row["cameraIndex"]) for row in render["views"]} == {(rank, index) for rank in [67, 72] for index in range(12)}
    totals = defaultdict(lambda: {"eligiblePixels": 0, "coveredPixels": 0, "comparisonPixels": 0, "absoluteErrorSum": 0.0})
    for row in render["views"]:
        query = next(query for query in localized["queries"] if query["rank"] == row["rank"])
        stem = f'rank-{row["rank"]}-view-{row["cameraIndex"]:02d}'
        for file in row["files"]:
            assert digest(directory / "render" / Path(file["path"]).name) == file["sha256"]
        with Image.open(directory / "render" / (stem + "-render.png")) as image:
            rendered = np.asarray(image.convert("RGBA"))
        with Image.open(directory / "render" / (stem + "-reference.jpg")) as image:
            reference = np.asarray(image.convert("RGB"))
        with Image.open(directory / "render" / (stem + "-eligible.png")) as image:
            eligible = np.asarray(image.convert("L")) > 0
        with Image.open(ORIGINAL / f'masks/pano_camera{row["cameraIndex"]}.png') as image:
            assert np.array_equal(eligible, np.asarray(image.convert("L")) > 0)
        covered = rendered[:, :, 3] == 255
        assert not np.any(covered & ~eligible)
        excluded = np.zeros(eligible.shape, dtype=np.uint8)
        for association in query["associations"]:
            if association["cameraIndex"] == row["cameraIndex"]:
                center = tuple(int(round(value - 0.5)) for value in association["xy"])
                cv2.circle(excluded, center, 32, 255, thickness=-1)
        with Image.open(directory / "render" / (stem + "-pose-neighborhood.png")) as image:
            assert np.array_equal(np.asarray(image.convert("L")), excluded)
        comparison = covered & (excluded == 0)
        for name, mask in [("eligiblePixels", eligible), ("coveredPixels", covered), ("comparisonPixels", comparison)]:
            assert row[name] == int(np.count_nonzero(mask))
            totals[row["rank"]][name] += row[name]
        assert row["uncoveredPixels"] == int(np.count_nonzero(eligible & ~covered))
        compare(row["fullCoveredPhotometry"], metrics(reference[covered], rendered[covered, :3]))
        compare(row["remainingPixelPhotometry"], metrics(reference[comparison], rendered[comparison, :3]))
        totals[row["rank"]]["absoluteErrorSum"] += float(np.abs(reference[comparison].astype(float) - rendered[comparison, :3]).sum())
    for value in totals.values():
        value["coverage"] = value["coveredPixels"] / value["eligiblePixels"]
        value["remainingPixelMeanAbsoluteChannelError255"] = value["absoluteErrorSum"] / (value["comparisonPixels"] * 3)
    summary = json.loads((directory / "summary.json").read_text())
    compare(summary["renderTotals"], json.loads(json.dumps(totals)))
    print(json.dumps({"verifiedFiles": len(manifest["files"]), "localizationAttempts": 2,
        "heldoutPoses": 2, "renderedViews": 24, "renderTotals": totals, "appearanceQualified": False}))


def retain():
    assert not EVIDENCE.exists()
    EVIDENCE.mkdir(parents=True)
    files = []
    def copy(source, name):
        destination = EVIDENCE / name
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(source, destination)
    for run_name in ["run-01", "run-02"]:
        source = WORKSPACE / run_name
        report = json.loads((source / "result.json").read_text())
        assert report["completed"] and digest(source / "features.db") == report["database"]["sha256"]
        for name in ["result.json", "pairs.txt", "executed-localize.py"] + (["executed-relocalize.py"] if run_name == "run-02" else []):
            copy(source / name, f"localization/{run_name}/{name}")
        copy(WORKSPACE / (run_name + ".txt"), f"localization/{run_name}/execution.txt")
        database_copy = WORKSPACE / (run_name + "-retention.db")
        assert not database_copy.exists()
        shutil.copyfile(source / "features.db", database_copy)
        arrays = {}
        with pycolmap.Database.open(database_copy) as database:
            for image in database.read_all_images():
                arrays[str(image.image_id)] = database.read_keypoints(image.image_id)
        np.savez_compressed(EVIDENCE / "localization" / run_name / "keypoints.npz", **arrays)
        assert digest(source / "features.db") == report["database"]["sha256"]
    render_directory = WORKSPACE / "render-01"
    render = json.loads((render_directory / "result.json").read_text())
    assert render["completed"]
    for path in sorted(render_directory.iterdir()):
        if path.is_file():
            copy(path, "render/" + path.name)
    copy(WORKSPACE / "render-01.txt", "render/execution.txt")
    texture = ROOT / "artifacts/realism-01/connector-surface/run-02/texture-result.json"
    texture_report = json.loads(texture.read_text())
    assert texture_report["objSha256"] == render["mesh"]["sha256"]
    for entry in texture_report["assetFiles"]:
        path = texture.parent / entry["path"]
        assert path.stat().st_size == entry["bytes"] and digest(path) == entry["sha256"]
    copy(texture, "texture-source.json")
    for path in sorted((WORKSPACE / "upstream").glob("*.cc")):
        copy(path, "upstream/" + path.name)
    for name in ["localize.py", "relocalize.py", "render.py", "evidence.py", "requirements.txt"]:
        copy(Path(__file__).parent / name, "producers/" + name)
    copy(WORKSPACE / "renderer-install.json", "producers/renderer-install.json")
    source_evidence = ROOT / "experience/evidence/realism-01/connector-surface-sources"
    for name in ["assignment.json", "acquisition.json", "manifest.json"]:
        copy(source_evidence / name, "source/" + name)
    totals = defaultdict(lambda: {"eligiblePixels": 0, "coveredPixels": 0, "comparisonPixels": 0, "absoluteErrorSum": 0.0})
    for row in render["views"]:
        value = totals[row["rank"]]
        for name in ["eligiblePixels", "coveredPixels", "comparisonPixels"]:
            value[name] += row[name]
        if row["remainingPixelPhotometry"]:
            value["absoluteErrorSum"] += row["remainingPixelPhotometry"]["meanAbsoluteChannelError255"] * row["comparisonPixels"] * 3
    for value in totals.values():
        value["coverage"] = value["coveredPixels"] / value["eligiblePixels"]
        value["remainingPixelMeanAbsoluteChannelError255"] = value["absoluteErrorSum"] / (value["comparisonPixels"] * 3)
    localized = json.loads((EVIDENCE / "localization/run-02/result.json").read_text())
    summary = {"schemaVersion": 1, "date": datetime.now(timezone.utc).isoformat(), "renderTotals": totals,
        "queryPoses": [{"rank": query["rank"], "uniqueInliers": query["pose"]["uniqueInliers"],
            "uniqueCandidates": query["pose"]["uniqueCandidatePoints"], "eligible": query["pose"]["localizationEligible"],
            "errorPixels": query["pose"]["inlierErrorPixels"]} for query in localized["queries"]],
        "appearanceQualified": False, "routeQualified": False,
        "method": "Frozen-fit sparse localization, supported pose-only refinement and actual mesh first-hit texture reprojection",
        "limitations": render["limitations"] + ["Native OpenMVS MTL writes Tr 1.0; source material/atlas is RGB. This diagnostic samples captured RGB as opaque and applies no material illumination."]}
    write_json(EVIDENCE / "summary.json", summary)
    timestamp = datetime.now(timezone.utc).isoformat()
    for path in sorted(EVIDENCE.rglob("*")):
        if path.is_file():
            files.append({"path": str(path.relative_to(EVIDENCE)), "bytes": path.stat().st_size, "sha256": digest(path),
                "source": "Irvin Chen / Panoramax Taiwan; pinned COLMAP/OpenMVS and actual retained geometry/renderer outputs",
                "date": timestamp, "rights": "Source-derived images/geometry CC BY-SA 4.0; pinned upstream code retains its original notices",
                "location": "Shijō–Karasuma crossing area, held-out ranks 67/72 west of approved route start",
                "method": summary["method"], "limitations": "Same-sequence model-relative diagnostic; no complete route, scale, ground or human appearance acceptance."})
    write_json(EVIDENCE / "manifest.json", {"schemaVersion": 1, "files": files})
    verify(EVIDENCE.resolve())


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--retain", action="store_true")
    parser.add_argument("--verify", type=Path)
    args = parser.parse_args()
    assert args.retain != bool(args.verify)
    retain() if args.retain else verify(args.verify.resolve())
