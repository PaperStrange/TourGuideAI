import argparse
import hashlib
import json
import shutil
import subprocess
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
from PIL import Image
from plyfile import PlyData


ROOT = Path(__file__).resolve().parents[3]
BIN = ROOT / "artifacts/realism-01/surface-methods/bin"


def store(path, value):
    path.write_text(json.dumps(value, indent=2, allow_nan=False) + "\n")


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def execute(run, name, arguments):
    path = run / (name + ".command.json")
    assert not path.exists()
    record = {"argv": [str(value) for value in arguments], "cwd": str(run),
        "executableSha256": digest(Path(arguments[0])), "startedAt": datetime.now(timezone.utc).isoformat()}
    store(path, record)
    with (run / (name + ".txt")).open("w") as log:
        result = subprocess.run(record["argv"], cwd=run, stdout=log, stderr=subprocess.STDOUT)
    record.update({"returnCode": result.returncode, "finishedAt": datetime.now(timezone.utc).isoformat()})
    store(path, record)
    result.check_returncode()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--run", type=Path, required=True)
    parser.add_argument("--stage", choices=["dense", "mesh", "texture"], required=True)
    args = parser.parse_args()
    run = args.run.resolve()
    assert run.is_relative_to(ROOT / "artifacts/realism-01/connector-surface")
    prepared = json.loads((run / "prepared.json").read_text())
    assert prepared["completed"] and prepared["retainedVirtualImages"] == 32
    producer = run / ("executed-" + args.stage + ".py")
    assert not producer.exists()
    shutil.copyfile(Path(__file__), producer)
    for image in prepared["imageRecords"]:
        assert digest(run / "colmap/images" / image["name"]) == image["imageSha256"]
        mask_path = run / "masks" / (image["name"] + ".mask.png")
        assert digest(mask_path) == image["maskSha256"]
        with Image.open(mask_path) as mask:
            assert mask.size == (1520, 1520) and set(np.unique(np.asarray(mask))) == {0, 255}
    if args.stage == "dense":
        execute(run, "03-dense", [BIN / "DensifyPointCloud", "-i", "scene.mvs", "-o", "scene_dense.mvs",
            "--max-threads", "2", "--resolution-level", "1", "--max-resolution", "1520", "--min-resolution", "640",
            "--number-views", "5", "--number-views-fuse", "2", "--iters", "3", "--geometric-iters", "2",
            "--fusion-filter", "2", "--fusion-depth-diff-threshold", "0.01", "--fusion-reprojection-threshold", "1.2",
            "--postprocess-dmaps", "0", "--tower-mode", "0", "--normalize-coordinates", "0", "--estimate-scale", "0",
            "--estimate-roi", "0", "--crop-to-roi", "0", "--remove-dmaps", "0", "--mask-path", run / "masks",
            "--ignore-mask-label", "0", "--archive-type", "-1", "--verbosity", "3"])
        cloud = PlyData.read(run / "scene_dense.ply")["vertex"].data
        positions = np.column_stack([cloud[axis] for axis in ["x", "y", "z"]])
        physical = {image["internalId"]: image["sourceId"] for image in prepared["imageRecords"]}
        counts = [len({physical[int(view)] for view in views}) for views in cloud["view_indices"]]
        report = {"date": datetime.now(timezone.utc).isoformat(), "points": len(cloud),
            "finitePoints": bool(np.isfinite(positions).all()), "minimumPhysicalSupport": min(counts) if counts else 0,
            "physicalSupportHistogram": {str(count): counts.count(count) for count in sorted(set(counts))},
            "coordinateMinimum": positions.min(axis=0).tolist() if len(cloud) else [],
            "coordinateMaximum": positions.max(axis=0).tolist() if len(cloud) else [],
            "plySha256": digest(run / "scene_dense.ply"), "relativeSurfaceQualified": False,
            "limitations": "Native dense points require independent mask, depth, physical-neighbor and geometry verification before meshing."}
        store(run / "dense-result.json", report)
        assert report["points"] > 0 and report["finitePoints"] and report["minimumPhysicalSupport"] >= 2
        execute(run, "04-export-neighbors", [BIN / "DensifyPointCloud", "-i", "scene_dense.mvs",
            "--output-view-neighbors-file", "neighbors.txt", "--tower-mode", "0", "--estimate-roi", "0",
            "--crop-to-roi", "0", "--max-threads", "2"])
    elif args.stage == "mesh":
        dense = json.loads((run / "dense-result.json").read_text())
        assert dense["points"] > 0 and dense["minimumPhysicalSupport"] >= 2
        assert digest(run / "scene_dense.ply") == dense["plySha256"]
        execute(run, "05-mesh", [BIN / "ReconstructMesh", "-i", "scene_dense.mvs", "-p", "scene_dense.ply",
            "-o", "scene_mesh.mvs", "--max-threads", "2", "--close-holes", "0", "--smooth", "0", "--decimate", "1",
            "--free-space-support", "0", "--crop-to-roi", "0", "--verbosity", "3"])
        mesh = PlyData.read(run / "scene_mesh.ply")
        vertices = mesh["vertex"].data
        positions = np.column_stack([vertices[axis] for axis in ["x", "y", "z"]])
        faces = np.vstack(mesh["face"].data["vertex_indices"])
        assert np.isfinite(positions).all() and faces.min() >= 0 and faces.max() < len(vertices)
        assert faces.shape[1] == 3 and len(faces) > 0
        store(run / "mesh-result.json", {"date": datetime.now(timezone.utc).isoformat(), "vertices": len(vertices),
            "triangles": len(faces), "finitePoints": True, "validFaceIndices": True,
            "plySha256": digest(run / "scene_mesh.ply"), "walkableSurfaceQualified": False})
    else:
        mesh = json.loads((run / "mesh-result.json").read_text())
        assert digest(run / "scene_mesh.ply") == mesh["plySha256"]
        execute(run, "06-texture", [BIN / "TextureMesh", "-i", "scene_dense.mvs", "-m", "scene_mesh.ply",
            "-o", "scene_textured.mvs", "--export-type", "obj", "--max-threads", "2", "--decimate", "1",
            "--close-holes", "0", "--ignore-mask-label", "0", "--sharpness-weight", "0",
            "--global-seam-leveling", "0", "--local-seam-leveling", "0", "--resolution-level", "0",
            "--verbosity", "3"])
        assert (run / "scene_textured.obj").is_file() and (run / "scene_textured.mtl").is_file()
        store(run / "texture-result.json", {"date": datetime.now(timezone.utc).isoformat(), "completed": True,
            "objSha256": digest(run / "scene_textured.obj"), "mtlSha256": digest(run / "scene_textured.mtl"),
            "assetFiles": [{"path": path.name, "bytes": path.stat().st_size, "sha256": digest(path)}
                for path in sorted(run.glob("scene_textured*")) if path.is_file()],
            "heldoutAppearanceQualified": False, "lightingModesQualified": False})
    print(json.dumps({"stage": args.stage, "completed": True, "run": str(run)}))


if __name__ == "__main__":
    main()
