import argparse
import hashlib
import json
from pathlib import Path
import shutil


def main(output):
    root = Path(__file__).resolve().parents[3]
    output = output.resolve()
    if not output.is_relative_to(root / "artifacts"):
        raise ValueError("Preview must remain in ignored artifacts")
    sources = {
        "index.html": root / "experience/tools/splat-fidelity/preview.html",
        "viewer.html": root / "experience/tools/splat-fidelity/hall.html",
        "hall.js": root / "experience/tools/splat-fidelity/hall.js",
        "hall.sog": root / "artifacts/realism-01/splat-fidelity/research/knock-original.sog",
        "hall-config.json": root / "artifacts/realism-01/splat-fidelity/research/knock-published-viewer-config.json",
        "spark.module.js": root / "artifacts/realism-01/splat-qualification/downloads/spark.module.js",
        "licenses/spark.txt": root / "artifacts/realism-01/splat-qualification/downloads/spark-license.txt",
        "licenses/three.txt": root / "experience/node_modules/three/LICENSE",
        "licenses/source.txt": root / "artifacts/realism-01/splat-fidelity/research/knock-credit.txt",
        "source-receipt.json": root / "artifacts/realism-01/splat-fidelity/research/knock-source-receipt.json",
        "three/build/three.module.js": root / "experience/node_modules/three/build/three.module.js",
        "three/build/three.core.js": root / "experience/node_modules/three/build/three.core.js",
        "three/examples/jsm/controls/OrbitControls.js": root / "experience/node_modules/three/examples/jsm/controls/OrbitControls.js"}
    records = []
    for name, source in sources.items():
        target = output / name
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, target)
        data = target.read_bytes()
        records.append({"path": name, "source": str(source.relative_to(root)), "bytes": len(data), "sha256": hashlib.sha256(data).hexdigest()})
    # 独立预览使用当前窗口比例；基准测试专用投影矩阵不用于任意尺寸的页面。
    (output / "publisher-camera.json").write_text("{}\n")
    (output / "README.txt").write_text(
        "Knock Community Hall local engineering preview\n\n"
        "Run: python -m http.server 8765 --bind 127.0.0.1 --directory PATH_TO_THIS_FOLDER\n"
        "Open: http://127.0.0.1:8765/\n"
        "No outbound requests or server API are needed. Attribution links open only on user action.\n"
        "Drag to orbit; scroll to move closer. Reload after resizing if perspective changes.\n\n"
        "Knock Community Hall by scbenoit, https://superspl.at/scene/0ff2e6dc, CC BY 4.0.\n"
        "Original SOG source components were repackaged unchanged into ZIP. Spark 2.4.0 and Three 0.186.1 are MIT licensed; see licenses/.\n"
        "This real drone capture is a non-Kyoto source-fidelity engineering sample. It does not contain a pedestrian route, collision surface, multiplayer support or mobile performance qualification.\n"
        "Original publisher viewer code and publisher poster are excluded from this package.\n")
    for name in ("publisher-camera.json", "README.txt"):
        data = (output / name).read_bytes()
        records.append({"path": name, "source": "Generated local preview instructions/projection selection", "bytes": len(data), "sha256": hashlib.sha256(data).hexdigest()})
    result = {"schemaVersion": 1, "kind": "local-source-fidelity-preview", "files": records,
        "bytes": sum(item["bytes"] for item in records), "limits": "Full source has 1,935,275 splats; no mobile or route-level performance acceptance"}
    (output / "package-manifest.json").write_text(json.dumps(result, indent=2) + "\n")
    print(json.dumps({"path": str(output.relative_to(root)), "bytes": result["bytes"], "files": len(records)}))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("output", type=Path)
    main(parser.parse_args().output)
