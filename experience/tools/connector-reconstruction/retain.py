import argparse
import hashlib
import importlib.metadata
import json
import os
import shutil
from datetime import datetime, timezone
from pathlib import Path

root = Path(__file__).resolve().parents[3]
cache = root / "artifacts/realism-01/connector-reconstruction/plot-cache"
cache.mkdir(parents=True, exist_ok=True)
os.environ["MPLCONFIGDIR"] = str(cache)

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pycolmap


def digest(filename):
    return hashlib.sha256(filename.read_bytes()).hexdigest()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--run", type=Path, required=True)
    parser.add_argument("--output", type=Path, default=root / "experience/evidence/realism-01/connector-reconstruction")
    args = parser.parse_args()
    run = args.run.resolve()
    output = args.output.resolve()
    assert run.is_relative_to(root / "artifacts/realism-01/connector-reconstruction")
    assert not output.exists(), "Retain into a new evidence directory."
    report = json.loads((run / "result.json").read_text())
    assert report["completed"]
    output.mkdir(parents=True)
    copied = []

    def copy(source, destination):
        filename = output / destination
        filename.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(source, filename)
        copied.append(filename)

    copy(run / "result.json", "result.json")
    copy(run / "executed-overlap.py", "producers/overlap.py")
    for name in ["retain.py", "verify.py", "requirements.txt"]:
        copy(Path(__file__).parent / name, "producers/" + name)
    distribution = importlib.metadata.distribution("pycolmap")
    copy(Path(pycolmap.__file__).parent / "panorama.py", "producers/upstream-panorama.py")
    copy(Path(distribution.locate_file("pycolmap-4.2.1.dist-info/licenses/COPYING.txt")), "producers/colmap-license.txt")
    copy(Path(report["selection"]["path"]), "selected.json")
    log_path = run.parent / (run.name + ".txt")
    assert log_path.is_file(), "Retain the real COLMAP stdout/stderr log."
    copy(log_path, "execution.txt")
    for direction in report["directions"]:
        directory = run / f'heading-{direction["headingDegrees"]}'
        copy(directory / "settings.json", directory.name + "/settings.json")
        copy(directory / "facade-mask.png", directory.name + "/facade-mask.png")
        database = pycolmap.Database.open(directory / "database.db")
        loaded = {image.name: image for image in database.read_all_images()}
        observations = []
        for pair in direction["pairs"]:
            first, second = [loaded[name] for name in pair["images"]]
            geometry = database.read_two_view_geometry(first.image_id, second.image_id)
            matches = database.read_matches(first.image_id, second.image_id)
            keypoints = [database.read_keypoints(image.image_id)[:, :2] for image in [first, second]]
            observations.append({**pair,
                "matches": matches.tolist(), "inliers": geometry.inlier_matches.tolist(),
                "matchedPoints": [points[matches[:, index]].tolist() for index, points in enumerate(keypoints)],
                "E": None if geometry.E is None else geometry.E.tolist(),
                "F": None if geometry.F is None else geometry.F.tolist(),
                "H": None if geometry.H is None else geometry.H.tolist(),
            })
        database.close()
        observation_path = output / directory.name / "pair-observations.json"
        observation_path.write_text(json.dumps(observations, indent=2) + "\n")
        copied.append(observation_path)
        for filename in sorted((directory / "sparse").rglob("*")):
            if filename.is_file():
                copy(filename, str(filename.relative_to(run)))

    spherical = report["conditions"]["cameraModel"] == "EQUIRECTANGULAR"
    figure = plt.figure(figsize=(10, 8) if spherical else (12, 9), constrained_layout=True)
    figure.suptitle("Kyoto panorama geometry trial · three source cameras\nCPU COLMAP · " + ("native spherical projection" if spherical else "fixed virtual projection") + " · upper-half features", fontsize=14)
    for index, direction in enumerate(report["directions"]):
        axis = figure.add_subplot(1 if spherical else 2, 1 if spherical else 2, index + 1,
                                 projection="3d" if direction["models"] else None)
        pair_counts = "/".join(str(pair["verifiedInliers"]) for pair in direction["pairs"])
        label = "All azimuths" if spherical else f'Panorama yaw {direction["headingDegrees"]}°'
        axis.set_title(f'{label} · inliers {pair_counts}', fontsize=10)
        if direction["models"]:
            for model in direction["models"]:
                points = np.asarray([point["xyz"] for point in model["points"]])
                colors = np.asarray([point["rgb"] for point in model["points"]]) / 255
                axis.scatter(points[:, 0], points[:, 1], points[:, 2], c=colors, s=2, alpha=0.7)
                cameras = np.asarray([camera["center"] for camera in model["cameras"]])
                axis.scatter(cameras[:, 0], cameras[:, 1], cameras[:, 2], c="crimson", marker="^", s=40)
                axis.text2D(0.02, 0.02, f'{model["registeredImages"]} cameras · {model["points3D"]} points\n{model["meanReprojectionErrorPixels"]:.2f} px mean error', transform=axis.transAxes, fontsize=9)
        else:
            ranks = {source["id"]: source["rank"] for source in report["sources"]}
            names = [" ↔ ".join(str(ranks[Path(image).stem]) for image in pair["images"]) for pair in direction["pairs"]]
            values = np.arange(len(names))
            tentative = [pair["tentativeMatches"] for pair in direction["pairs"]]
            verified = [pair["verifiedInliers"] for pair in direction["pairs"]]
            axis.barh(values - 0.17, tentative, height=0.32, color="#9da6ad", label="Tentative matches")
            bars = axis.barh(values + 0.17, verified, height=0.32, color="#3a7c72", label="Geometric inliers")
            axis.bar_label(bars, padding=3, fontsize=8)
            axis.set_yticks(values, names)
            axis.set_ylabel("Source sequence ranks", fontsize=9)
            axis.set_xlabel("Correspondence count · zero registered sparse models", fontsize=9)
            axis.set_xlim(0, max(tentative + [1]) * 1.2)
            axis.legend(loc="lower right", fontsize=8)
        if direction["models"]:
            axis.set_xlabel("X · arbitrary units", fontsize=8)
            axis.set_ylabel("Y · arbitrary units", fontsize=8)
            axis.set_zlabel("Z · arbitrary units", fontsize=8)
        axis.tick_params(labelsize=7)
    figure.text(0.5, 0.005, "Sources: Irvin Chen / Panoramax · CC BY-SA 4.0 · derived projection and sparse points\nSource GPS excluded from fitting; metric scale, ground, route coverage and appearance acceptance remain unverified.", ha="center", fontsize=9)
    figure.savefig(output / "geometry-board.png", dpi=140)
    plt.close(figure)
    copied.append(output / "geometry-board.png")
    timestamp = datetime.now(timezone.utc).isoformat()
    manifest = {
        "schemaVersion": 1,
        "createdAt": timestamp,
        "source": "Three Irvin Chen panoramas identified by selected.json and their exact source-file hashes in result.json",
        "date": report["finishedAt"],
        "rights": "CC BY-SA 4.0 for source-derived geometry and visualization; code follows repository licensing",
        "location": "Karasuma Avenue west of the first Shijo East route edge, Kyoto, Japan",
        "method": report["method"],
        "limitations": report["limitations"],
        "files": [{"path": str(filename.relative_to(output)), "bytes": filename.stat().st_size,
                   "sha256": digest(filename), "source": "Retained generated run and exact executed producers",
                   "date": timestamp, "rights": "BSD-3-Clause; see producers/colmap-license.txt" if filename.name in ["upstream-panorama.py", "colmap-license.txt"] else "CC BY-SA 4.0 source-derived evidence; repository code licensing",
                   "location": "Kyoto, Japan; source camera coordinates in result.json",
                   "method": "Byte-identical retention or labelled Matplotlib numerical plot",
                   "limitations": "Bounded three-camera geometry diagnostic; no absolute scale or continuous floor qualification"}
                  for filename in sorted(copied)],
    }
    (output / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
    print(json.dumps({"output": str(output), "files": len(copied), "bytes": sum(item["bytes"] for item in manifest["files"])}))


if __name__ == "__main__":
    main()
