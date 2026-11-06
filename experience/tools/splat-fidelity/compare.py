import argparse
import hashlib
import json
from pathlib import Path

import numpy as np
from PIL import Image


def compare(directory):
    results = []
    for pose in ("initial", "orbit"):
        inputs = [directory / f"{engine}-{pose}.jpg" for engine in ("spark", "independent")]
        arrays = [np.asarray(Image.open(path).convert("RGB"), dtype=np.float64) for path in inputs]
        if arrays[0].shape != arrays[1].shape:
            raise ValueError("Captured frame sizes must match")
        difference = np.abs(arrays[0] - arrays[1])
        # 背景不能掩盖主体差异；阈值仅用于选取测量像素，不用于修改截图。
        background = np.array([32, 37, 42])
        foreground = np.maximum(np.max(np.abs(arrays[0] - background), axis=2), np.max(np.abs(arrays[1] - background), axis=2)) > 12
        results.append({"pose": pose, "inputs": [{"path": path.name, "bytes": path.stat().st_size,
            "sha256": hashlib.sha256(path.read_bytes()).hexdigest()} for path in inputs],
            "canvasPixels": int(foreground.size), "foregroundPixels": int(foreground.sum()),
            "meanAbsoluteError255": float(difference.mean()), "rootMeanSquaredError255": float(np.sqrt(np.square(difference).mean())),
            "foregroundMeanAbsoluteError255": float(difference[foreground].mean()),
            "foregroundP95ChannelError255": float(np.percentile(difference[foreground], 95))})
    producer = Path(__file__)
    result = {"schemaVersion": 1, "method": "Pillow JPEG decode, NumPy raw RGB differences; union foreground differs more than 12 from declared clear color in any channel",
        "limitations": ["JPEG compression and renderer rasterization differences are present", "Agreement diagnoses renderer-specific failure only; original capture quality and photo fidelity remain unproven", "No release acceptance threshold"],
        "producer": {"path": "experience/tools/splat-fidelity/compare.py", "bytes": producer.stat().st_size,
            "sha256": hashlib.sha256(producer.read_bytes()).hexdigest()}, "comparisons": results}
    (directory / "comparison.json").write_text(json.dumps(result, indent=2) + "\n")
    print(json.dumps(results, indent=2))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("directory", type=Path)
    compare(parser.parse_args().directory)
