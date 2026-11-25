import argparse
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import trimesh


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--run", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    obj = args.run / "scene_textured.obj"
    scene = trimesh.load_scene(obj, process=False, maintain_order=False, skip_materials=False)
    total = 0
    constant = 0
    markers = []
    for geometry in scene.geometry.values():
        uv = np.asarray(geometry.visual.uv)
        triangles = uv[geometry.faces]
        assert np.isfinite(triangles).all()
        repeated = np.all(triangles == triangles[:, :1, :], axis=(1, 2))
        total += len(triangles)
        constant += int(repeated.sum())
        markers.extend(np.unique(triangles[repeated, 0], axis=0).tolist())
    report = {"date": datetime.now(timezone.utc).isoformat(),
        "objSha256": hashlib.sha256(obj.read_bytes()).hexdigest(),
        "triangleCount": total, "facesWithConstantUvMarker": constant,
        "facesWithNonconstantUv": total - constant, "constantUvCoordinates": markers,
        "constantUvFaceFraction": constant / total,
        "method": "Mature trimesh OBJ/material parser preserves per-corner texture coordinates. Count exact equality of all three face UV coordinates. OpenMVS SceneTexture::GenerateTexture assigns constant coordinates to faces in the unassigned source patch.",
        "limitations": "Source-view IDs are not exported by this run. Constant UV markers identify the default patch by exporter semantics; six-decimal UV serialization could also collapse extremely small projected faces. This is not a held-out appearance or coverage score."}
    assert not args.output.exists()
    args.output.write_text(json.dumps(report, indent=2, allow_nan=False) + "\n")
    print(json.dumps(report))


if __name__ == "__main__":
    main()
