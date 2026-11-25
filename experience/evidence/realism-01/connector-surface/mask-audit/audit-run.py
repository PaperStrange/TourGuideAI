import argparse
import hashlib
import json
import subprocess
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
from PIL import Image


REVIEW = Path(__file__).resolve().parent


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def inspect_scene(path, inspector):
    output = subprocess.check_output([str(inspector), str(path)], text=True)
    return json.loads(output)


def command_values(command):
    arguments = command["argv"]
    assert len(arguments) % 2 == 1
    values = dict(zip(arguments[1::2], arguments[2::2]))
    assert len(values) == (len(arguments) - 1) // 2
    assert digest(Path(arguments[0])) == command["executableSha256"]
    assert command["returnCode"] == 0
    return values


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=Path, required=True)
    parser.add_argument("--run", type=Path, required=True)
    parser.add_argument("--inspector", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    root = args.root.resolve()
    run = args.run.resolve()
    inspector = args.inspector.resolve()
    assert run.is_relative_to(root)
    prepared = json.loads((run / "prepared.json").read_text())
    imported = inspect_scene(run / "scene.mvs", inspector)
    dense = inspect_scene(run / "scene_dense.mvs", inspector)
    assert len(dense["images"]) == len(imported["images"]) == len(prepared["imageRecords"]) == 32
    images = []
    for expected, initial, saved in zip(prepared["imageRecords"], imported["images"], dense["images"]):
        assert expected["internalId"] == initial["internalId"] == saved["internalId"]
        assert expected["imageId"] == initial["imageId"] == saved["imageId"]
        assert Path(saved["name"]).name == expected["name"]
        assert initial["name"] == saved["name"]
        assert initial["center"] == saved["center"]
        image_path = (run / saved["name"]).resolve()
        mask_path = (run / saved["maskName"]).resolve()
        assert image_path.is_relative_to(run) and mask_path.is_relative_to(run)
        assert mask_path == run / "masks" / (Path(expected["name"]).stem + ".mask.png")
        assert digest(image_path) == expected["imageSha256"]
        assert digest(mask_path) == expected["maskSha256"]
        with Image.open(mask_path) as mask_image, Image.open(image_path) as source_image:
            mask = np.asarray(mask_image)
            assert mask_image.size == source_image.size == (1520, 1520)
            assert mask.ndim == 2 and set(np.unique(mask)) == {0, 255}
            valid = int(np.count_nonzero(mask))
            assert valid == expected["validMaskPixels"]
        images.append({"internalId": saved["internalId"], "sourceId": expected["sourceId"],
            "image": saved["name"], "mask": saved["maskName"], "maskSha256": digest(mask_path),
            "imageSha256": digest(image_path), "validMaskPixels": valid, "sourceWidth": 1520,
            "storedCameraWidth": saved["width"], "physicalCenterPreservedExactly": True})
    required = {
        "03-dense": {"--archive-type": "-1", "--tower-mode": "0", "--normalize-coordinates": "0",
            "--estimate-scale": "0", "--estimate-roi": "0", "--crop-to-roi": "0", "--postprocess-dmaps": "0",
            "--remove-dmaps": "0", "--ignore-mask-label": "0", "--number-views-fuse": "2",
            "--mask-path": str(run / "masks")},
        "05-mesh": {"--close-holes": "0", "--smooth": "0", "--decimate": "1", "--free-space-support": "0",
            "--crop-to-roi": "0", "--verbosity": "3", "-p": "scene_dense.ply"},
        "06-texture": {"--decimate": "1", "--close-holes": "0", "--ignore-mask-label": "0",
            "--sharpness-weight": "0", "--global-seam-leveling": "0", "--local-seam-leveling": "0",
            "--resolution-level": "0", "-i": "scene_dense.mvs", "-m": "scene_mesh.ply"}
    }
    commands = []
    for name, constraints in required.items():
        path = run / (name + ".command.json")
        if not path.exists():
            commands.append({"name": name, "completed": False})
            continue
        command = json.loads(path.read_text())
        assert command["cwd"] == str(run)
        values = command_values(command)
        for key, value in constraints.items():
            assert values[key] == value, (name, key, values[key], value)
        commands.append({"name": name, "completed": True, "constraints": constraints,
            "commandSha256": digest(path), "executableSha256": command["executableSha256"]})
    report = {"date": datetime.now(timezone.utc).isoformat(), "run": str(run.relative_to(root)),
        "archiveVersion": dense["archiveVersion"], "sceneSha256": digest(run / "scene_dense.mvs"),
        "sceneImages": len(images), "physicalImages": len({image["sourceId"] for image in images}),
        "allSavedMaskAssociationsVerified": True, "allImageAndMaskHashesVerified": True,
        "allPhysicalCentersPreservedExactly": True, "scenePointCount": dense["pointCount"],
        "interfaceHeaderSha256": digest(REVIEW / "upstream/Interface.h"),
        "inspectorSourceSha256": digest(REVIEW / "inspect-interface.cpp"),
        "inspectorExecutableSha256": digest(inspector),
        "images": images, "commands": commands,
        "limitation": "Saved mask associations and command conformance are checked; rendered texture quality remains unevaluated."}
    assert not args.output.exists()
    args.output.write_text(json.dumps(report, indent=2, allow_nan=False) + "\n")
    print(json.dumps({"images": len(images), "physicalImages": report["physicalImages"],
        "completedCommands": [command["name"] for command in commands if command["completed"]]}))


if __name__ == "__main__":
    main()
