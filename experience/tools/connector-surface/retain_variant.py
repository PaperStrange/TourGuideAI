import argparse
import hashlib
import json
import shutil
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
from plyfile import PlyData


ROOT = Path(__file__).resolve().parents[3]


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def store(path, value):
    path.write_text(json.dumps(value, indent=2, allow_nan=False) + "\n")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--run", type=Path, required=True)
    parser.add_argument("--variant", type=Path, required=True)
    args = parser.parse_args()
    run, variant = args.run.resolve(), args.variant.resolve()
    assert run.is_relative_to(ROOT / "artifacts/realism-01/connector-surface")
    assert variant.is_relative_to(ROOT / "artifacts/realism-01/connector-surface")
    destination = ROOT / "experience/evidence/realism-01/connector-surface" / variant.name
    assert not destination.exists()
    destination.mkdir(parents=True)
    report = json.loads((variant / "result.json").read_text())
    audit_path = ROOT / "experience/evidence/realism-01/connector-surface/texture-4096-audit/result.json"
    audit = json.loads(audit_path.read_text())
    geometry = audit["geometry"]
    assert geometry["maximumVertexDistance"] == 0
    assert geometry["missingOrientedTriangles"] == geometry["addedOrientedTriangles"] == 0
    assert digest(variant / "scene_textured.gltf") == audit["gltfSha256"]
    native = PlyData.read(run / "scene_mesh.ply")["vertex"].data
    positions = np.column_stack([native[axis] for axis in ["x", "y", "z"]])
    minimum, maximum = positions.min(axis=0), positions.max(axis=0)
    center = (minimum + maximum) / 2
    handoff = json.loads((run / "viewer-handoff.json").read_text())
    handoff.pop("obj")
    handoff.pop("mtl")
    handoff.update({"format": "gltf", "gltf": "scene_textured.gltf", "assets": report["assets"],
        "textures": [image["path"] for image in report["images"]], "geometryIdentityVerified": True,
        "geometryAudit": "../texture-4096-audit/result.json", "geometryAuditSha256": digest(audit_path),
        "parsedGltfVertices": geometry["parsedVertices"], "rgbaBaseBytes": report["rgbaBaseBytes"],
        "bounds": {"minimum": minimum.tolist(), "maximum": maximum.tolist(), "center": center.tolist(),
            "radius": float(np.linalg.norm(positions - center, axis=1).max()), "sourceMeshSha256": digest(run / "scene_mesh.ply")}})
    handoff["limits"] = [value for value in handoff["limits"] if "8192" not in value]
    handoff["limits"].append("4096-square PNG uses 64 MiB RGBA base and approximately 85.33 MiB including a complete mip chain; browser transfer and frame-time tests remain separate.")
    for view in handoff["views"]:
        for field in ["imagePath", "referenceImage", "maskPath"]:
            view[field] = "../review-inputs/" + view[field]
        pose = np.asarray(view["camFromWorld"])
        depths = (positions @ pose[:, :3].T + pose[:, 3])[:, 2]
        positive = depths[depths > 0]
        assert len(positive)
        view["near"] = max(1e-5, float(positive.min()) * 0.05)
        view["far"] = float(positive.max()) * 1.05
        view["orbitDistance"] = float(np.median([point["positiveDepth"] for point in view["projectionReferences"]]))
        view["positiveMeshVertexDepthRange"] = [float(positive.min()), float(positive.max())]
    store(variant / "viewer-handoff.json", handoff)
    records = []
    for source in sorted(variant.iterdir()):
        assert source.is_file()
        target = destination / source.name
        shutil.copyfile(source, target)
        sha256 = digest(target)
        derived = source.suffix in {".png", ".gltf", ".mlp"}
        records.append({"path": target.name, "bytes": target.stat().st_size, "sha256": sha256,
            "originalBytes": target.stat().st_size, "originalSha256": sha256, "compression": None,
            "source": str(source.relative_to(ROOT)), "date": report["date"],
            "rights": "CC-BY-SA-4.0; Irvin Chen / Panoramax Taiwan, derived reconstruction" if derived else "MIT project research record",
            "location": "Kyoto source ranks 68–71, west of the approved route start",
            "method": "Official OpenMVS native full-resolution 4096-atlas glTF/PNG export; exact producer bytes",
            "limitations": "Arbitrary-scale research surface; held-out appearance, walking, route coverage and production interaction gates remain separate"})
    store(destination / "manifest.json", {"schemaVersion": 1, "createdAt": datetime.now(timezone.utc).isoformat(),
        "records": records, "originalBaseline": "../run-02/manifest.json", "sourceInputs": "../review-inputs/manifest.json",
        "geometryAudit": "../texture-4096-audit/manifest.json", "heldoutEvaluation": "../../connector-surface-evaluation/README.md"})
    print(json.dumps({"retained": str(destination), "files": len(records), "manifestSha256": digest(destination / "manifest.json")}))


if __name__ == "__main__":
    main()
