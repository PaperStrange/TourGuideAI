import argparse
import gzip
import hashlib
import json
import shutil
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
DESTINATION = ROOT / "experience/evidence/realism-01/connector-surface"


def digest(data):
    return hashlib.sha256(data).hexdigest()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--run", type=Path, required=True)
    args = parser.parse_args()
    run = args.run.resolve()
    assert run.is_relative_to(ROOT / "artifacts/realism-01/connector-surface")
    destination = DESTINATION / run.name
    assert not destination.exists()
    destination.mkdir(parents=True)
    records = []
    candidates = []
    for pattern in ["executed-*.py", "*.command.json", "0*.txt", "*-result.json", "prepared.json", "neighbors.txt", "viewer-handoff.json"]:
        candidates.extend((path, path.name, False) for path in sorted(run.glob(pattern)))
    for folder in ["colmap/sparse", "roundtrip-cameras/sparse", "roundtrip-exact/sparse"]:
        candidates.extend((path, path.relative_to(run).as_posix(), True) for path in sorted((run / folder).glob("*")) if path.is_file())
    for name in ["scene.mvs", "scene_dense.mvs", "scene_dense.ply", "scene_mesh_raw.ply", "scene_mesh.ply", "scene_mesh.mlp", "scene_textured.obj", "scene_textured.mtl", "scene_textured.mlp", "scene_textured_material_00_map_Kd.jpg"]:
        path = run / name
        if path.is_file():
            candidates.append((path, name, path.suffix in {".obj", ".ply", ".mvs"}))
    seen = set()
    for source, name, compressed in candidates:
        assert name not in seen
        seen.add(name)
        target = destination / (name + ".gz" if compressed else name)
        target.parent.mkdir(parents=True, exist_ok=True)
        original = source.read_bytes()
        if compressed:
            target.write_bytes(gzip.compress(original, compresslevel=9, mtime=0))
        else:
            shutil.copyfile(source, target)
        image_derived = source.suffix in {".obj", ".ply", ".mvs", ".jpg"}
        records.append({"path": target.relative_to(destination).as_posix(), "bytes": target.stat().st_size,
            "sha256": digest(target.read_bytes()), "originalBytes": len(original), "originalSha256": digest(original),
            "source": str(source.relative_to(ROOT)), "date": datetime.now(timezone.utc).isoformat(),
            "rights": "CC-BY-SA-4.0; Irvin Chen / Panoramax Taiwan, derived reconstruction" if image_derived else "Project research record; upstream software rights preserved in toolchain records",
            "location": "Kyoto, source ranks 68–71 west of the approved walking route start",
            "method": "Byte-preserved producer output, gzip with mtime=0 where indicated" if compressed else "Byte-preserved producer output",
            "limitations": "Historical execution record; arbitrary-scale surface, complete route and walking unqualified",
            "compression": "gzip" if compressed else None})
    manifest = {"schemaVersion": 1, "run": run.name, "createdAt": datetime.now(timezone.utc).isoformat(),
        "records": records, "sourceManifest": "../../connector-surface-sources/manifest.json",
        "sourceCaptureDate": "2026-02-17", "fitRanks": [68, 69, 70, 71], "excludedHeldoutRanks": [67, 72],
        "originalImages": "Original downloads and depth caches remain ignored; source receipts bind their exact bytes.",
        "limitations": ["Upper-hemisphere masks and original arbitrary scale retained.", "No complete-route, collision or independent walking acceptance."]}
    (destination / "manifest.json").write_text(json.dumps(manifest, indent=2, allow_nan=False) + "\n")
    print(json.dumps({"retained": str(destination), "files": len(records), "manifestSha256": digest((destination / "manifest.json").read_bytes())}))


if __name__ == "__main__":
    main()
