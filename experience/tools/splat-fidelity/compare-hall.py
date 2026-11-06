import argparse
import hashlib
import json
from pathlib import Path

import numpy as np
from PIL import Image


def main(directory):
    report = json.loads((directory / "result.json").read_text())
    gates = {item["id"]: item["pass"] for item in report["checks"]}
    if not gates.get("publisher-camera-stable-during-capture") or not gates.get("publisher-camera-match"):
        raise ValueError("Reference must retain a stable matching camera before pixel comparison")
    inputs = [directory / f"{engine}-initial.jpg" for engine in ("publisher", "spark")]
    arrays = [np.asarray(Image.open(path).convert("RGB"), dtype=np.float64) for path in inputs]
    if arrays[0].shape != arrays[1].shape:
        raise ValueError("Captured frame dimensions differ")
    difference = np.abs(arrays[0] - arrays[1])
    # 联合前景掩码只限定测量范围，原始截图保持不变。
    foreground = np.maximum(np.max(arrays[0], axis=2), np.max(arrays[1], axis=2)) > 12
    producer = Path(__file__)
    result = {"schemaVersion": 1, "method": "Matched measured camera and original components; Pillow decoded JPEG RGB comparison; union foreground exceeds black background by 12 in any channel",
        "inputs": [{"path": path.name, "bytes": path.stat().st_size, "sha256": hashlib.sha256(path.read_bytes()).hexdigest()} for path in inputs],
        "producer": {"path": "experience/tools/splat-fidelity/compare-hall.py", "bytes": producer.stat().st_size, "sha256": hashlib.sha256(producer.read_bytes()).hexdigest()},
        "cameraAgreement": report["cameraAgreement"], "canvasPixels": int(foreground.size), "foregroundPixels": int(foreground.sum()),
        "meanAbsoluteError255": float(difference.mean()), "rootMeanSquaredError255": float(np.sqrt(np.square(difference).mean())),
        "foregroundMeanAbsoluteError255": float(difference[foreground].mean()), "foregroundP95ChannelError255": float(np.percentile(difference[foreground], 95)),
        "limitations": ["Independent renderer agreement supports input/transform/rendering fidelity; no independent photograph or pedestrian-quality acceptance", "JPEG, float precision, spherical harmonics and rasterization/filtering differences remain", "No retrospective score threshold or release pass inferred"]}
    (directory / "comparison.json").write_text(json.dumps(result, indent=2) + "\n")
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("directory", type=Path)
    main(parser.parse_args().directory)
