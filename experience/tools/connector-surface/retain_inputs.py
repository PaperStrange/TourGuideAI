import argparse
import hashlib
import json
import shutil
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--run", type=Path, required=True)
    args = parser.parse_args()
    run = args.run.resolve()
    assert run.is_relative_to(ROOT / "artifacts/realism-01/connector-surface")
    handoff = json.loads((run / "viewer-handoff.json").read_text())
    destination = ROOT / "experience/evidence/realism-01/connector-surface/review-inputs"
    assert not destination.exists()
    destination.mkdir(parents=True)
    records = []
    for view in handoff["views"]:
        for field, hash_field in [("referenceImage", "imageSha256"), ("maskPath", "maskSha256")]:
            source = run / view[field]
            target = destination / view[field]
            target.parent.mkdir(parents=True, exist_ok=True)
            data = source.read_bytes()
            sha256 = hashlib.sha256(data).hexdigest()
            assert sha256 == view[hash_field]
            shutil.copyfile(source, target)
            records.append({"path": target.relative_to(destination).as_posix(), "bytes": len(data), "sha256": sha256,
                "originalBytes": len(data), "originalSha256": sha256, "compression": None,
                "source": view["source"], "date": view["capturedAt"], "rights": view["rights"],
                "attribution": view["attribution"], "location": view["coordinates"],
                "method": "Native official COLMAP panorama projection, virtual camera9, original JPEG bytes; unchanged upper-hemisphere mask",
                "limitations": "Training-view comparison; four fitted source panoramas in arbitrary-scale geometry"})
    shutil.copyfile(run / "viewer-handoff.json", destination / "viewer-handoff.json")
    data = (destination / "viewer-handoff.json").read_bytes()
    sha256 = hashlib.sha256(data).hexdigest()
    records.append({"path": "viewer-handoff.json", "bytes": len(data), "sha256": sha256, "originalBytes": len(data),
        "originalSha256": sha256, "compression": None, "source": str((run / "viewer-handoff.json").relative_to(ROOT)),
        "date": handoff["date"], "rights": "MIT research metadata with CC-BY-SA-4.0 image attribution",
        "location": "Kyoto, source ranks 68–71", "method": "Original pycolmap camera projection and exact producer asset hashes",
        "limitations": "Training projections provide camera-binding checks; held-out appearance requires separate evidence"})
    manifest = {"schemaVersion": 1, "createdAt": datetime.now(timezone.utc).isoformat(), "records": records,
        "nativeAssets": "../run-02/manifest.json", "sourceManifest": "../../connector-surface-sources/manifest.json"}
    (destination / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
    print(json.dumps({"retained": str(destination), "files": len(records)}))


if __name__ == "__main__":
    main()
