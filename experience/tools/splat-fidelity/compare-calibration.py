import argparse
import hashlib
import json
from pathlib import Path

import numpy as np
from PIL import Image


def main(default, calibrated, output):
    source = [default / "publisher-initial.jpg", default / "spark-initial.jpg", calibrated / "spark-initial.jpg"]
    if source[0].read_bytes() != (calibrated / "publisher-initial.jpg").read_bytes():
        raise ValueError("Calibration runs require an identical captured reference")
    for directory in (default, calibrated):
        report = json.loads((directory / "result.json").read_text())
        checks = {item["id"]: item["pass"] for item in report["checks"]}
        if not checks["publisher-camera-match"] or not checks["publisher-camera-stable-during-capture"]:
            raise ValueError("Camera binding must pass before image comparison")
    arrays = [np.asarray(Image.open(path).convert("RGB"), dtype=np.float64) for path in source]
    # 固定三张原始截图的联合前景，确保两种设置在同一组像素上比较。
    mask = np.maximum.reduce([array.max(axis=2) for array in arrays]) > 12
    errors = [float(np.abs(array - arrays[0])[mask].mean()) for array in arrays[1:]]
    producer = Path(__file__)
    result = {"schemaVersion": 1, "method": "Identical publisher reference; one fixed union foreground mask across reference, default and focal2, max RGB greater than12; raw Pillow-decoded RGB MAE",
        "inputs": [{"path": str(path), "bytes": path.stat().st_size, "sha256": hashlib.sha256(path.read_bytes()).hexdigest()} for path in source],
        "commonForegroundPixels": int(mask.sum()), "defaultMeanAbsoluteError255": errors[0], "focal2MeanAbsoluteError255": errors[1],
        "relativeErrorReductionPercent": (1 - errors[1] / errors[0]) * 100,
        "producer": {"path": "experience/tools/splat-fidelity/compare-calibration.py", "bytes": producer.stat().st_size, "sha256": hashlib.sha256(producer.read_bytes()).hexdigest()},
        "limitations": "JPEG/rasterization and residual radiance differences remain; descriptive controlled calibration, no source or release acceptance threshold"}
    output.write_text(json.dumps(result, indent=2) + "\n")
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("default", type=Path)
    parser.add_argument("calibrated", type=Path)
    parser.add_argument("output", type=Path)
    arguments = parser.parse_args()
    main(arguments.default, arguments.calibrated, arguments.output)
