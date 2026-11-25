import argparse
import hashlib
import json
import shutil
import subprocess
from datetime import datetime, timezone
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[3]


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def store(path, value):
    path.write_text(json.dumps(value, indent=2, allow_nan=False) + "\n")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--run", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    run, output = args.run.resolve(), args.output.resolve()
    assert run.is_relative_to(ROOT / "artifacts/realism-01/connector-surface")
    assert output.is_relative_to(ROOT / "artifacts/realism-01/connector-surface") and not output.exists()
    output.mkdir(parents=True)
    shutil.copyfile(Path(__file__), output / "executed-texture-variant.py")
    prepared = json.loads((run / "prepared.json").read_text())
    mesh = json.loads((run / "mesh-result.json").read_text())
    assert digest(run / "scene_mesh.ply") == mesh["plySha256"]
    for image in prepared["imageRecords"]:
        assert digest(run / "colmap/images" / image["name"]) == image["imageSha256"]
        assert digest(run / "masks" / (Path(image["name"]).stem + ".mask.png")) == image["maskSha256"]
    binary = ROOT / "artifacts/realism-01/surface-methods/bin/TextureMesh"
    arguments = [binary, "-i", "scene_dense.mvs", "-m", "scene_mesh.ply", "-o", output / "scene_textured.mvs",
        "--export-type", "gltf", "--max-threads", "2", "--decimate", "1", "--close-holes", "0",
        "--ignore-mask-label", "0", "--sharpness-weight", "0", "--global-seam-leveling", "0",
        "--local-seam-leveling", "0", "--resolution-level", "0", "--max-texture-size", "4096", "--verbosity", "3"]
    command = {"argv": [str(value) for value in arguments], "cwd": str(run), "executableSha256": digest(binary),
        "startedAt": datetime.now(timezone.utc).isoformat(), "inputSceneSha256": digest(run / "scene_dense.mvs"),
        "inputMeshSha256": digest(run / "scene_mesh.ply"), "preparedSha256": digest(run / "prepared.json")}
    store(output / "command.json", command)
    with (output / "execution.txt").open("w") as log:
        completed = subprocess.run(command["argv"], cwd=run, stdout=log, stderr=subprocess.STDOUT)
    command.update({"returnCode": completed.returncode, "finishedAt": datetime.now(timezone.utc).isoformat()})
    store(output / "command.json", command)
    completed.check_returncode()
    assert (output / "scene_textured.gltf").is_file()
    images = []
    for path in sorted(output.glob("*.png")):
        with Image.open(path) as image:
            image.load()
            assert image.format == "PNG" and max(image.size) <= 4096
            images.append({"path": path.name, "width": image.width, "height": image.height,
                "mode": image.mode, "rgbaBaseBytes": image.width * image.height * 4,
                "sha256": digest(path), "bytes": path.stat().st_size})
    assert images
    report = {"date": datetime.now(timezone.utc).isoformat(), "completed": True, "sourceResolutionLevel": 0,
        "atlasMaximumDimension": 4096, "images": images, "rgbaBaseBytes": sum(image["rgbaBaseBytes"] for image in images),
        "assets": [{"path": path.name, "bytes": path.stat().st_size, "sha256": digest(path)}
            for path in sorted(output.iterdir()) if path.suffix in {".gltf", ".bin", ".png"}],
        "geometryVerified": False, "sourceSamplePreservationVerified": False,
        "limitations": "Independent geometry, image-pixel and held-out appearance verification required; original 8192 JPEG baseline retained."}
    store(output / "result.json", report)
    print(json.dumps({"output": str(output), "atlases": len(images), "rgbaBaseMiB": report["rgbaBaseBytes"] / 1048576}))


if __name__ == "__main__":
    main()
