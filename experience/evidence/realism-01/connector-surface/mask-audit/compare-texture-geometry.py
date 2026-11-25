import argparse
import hashlib
import json
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import trimesh
from plyfile import PlyData
from scipy.spatial import cKDTree


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def oriented_faces(faces):
    result = []
    for face in faces:
        start = int(np.argmin(face))
        result.append(tuple(int(value) for value in np.roll(face, -start)))
    return Counter(result)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--run", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    run = args.run.resolve()
    original = PlyData.read(run / "scene_mesh.ply")
    vertices = np.column_stack([original["vertex"].data[axis] for axis in ["x", "y", "z"]]).astype(np.float64)
    faces = np.vstack(original["face"].data["vertex_indices"])
    unique, source_indices = np.unique(vertices, axis=0, return_inverse=True)
    textured = trimesh.load_mesh(run / "scene_textured.obj", process=False, maintain_order=True, skip_materials=True)
    output_vertices = np.asarray(textured.vertices)
    output_faces = np.asarray(textured.faces)
    assert np.isfinite(output_vertices).all()
    assert output_faces.shape[1] == 3 and output_faces.min() >= 0 and output_faces.max() < len(output_vertices)
    distances, output_indices = cKDTree(unique).query(output_vertices)
    # OpenMVS OBJ 默认保存小数点后六位，容差对应三个坐标的舍入误差。
    tolerance = np.sqrt(3) * 0.5e-6 + 1e-12
    source_triangles = oriented_faces(source_indices[faces])
    output_triangles = oriented_faces(output_indices[output_faces])
    missing = source_triangles - output_triangles
    added = output_triangles - source_triangles
    report = {"date": datetime.now(timezone.utc).isoformat(),
        "sourcePlySha256": digest(run / "scene_mesh.ply"),
        "texturedObjSha256": digest(run / "scene_textured.obj"),
        "sourceVertexCount": len(vertices), "sourceUniqueVertexCount": len(unique),
        "objVertexCountAfterSupportedParsing": len(output_vertices),
        "sourceTriangleCount": len(faces), "objTriangleCount": len(output_faces),
        "maximumVertexDistanceNativeUnits": float(distances.max()),
        "medianVertexDistanceNativeUnits": float(np.median(distances)),
        "decimalSerializationDistanceTolerance": float(tolerance),
        "withinSixDecimalSerializationTolerance": bool((distances <= tolerance).all()),
        "missingOrientedTriangles": sum(missing.values()), "addedOrientedTriangles": sum(added.values()),
        "geometryPreserved": bool((distances <= tolerance).all() and not missing and not added),
        "method": "Official OpenMVS OBJ precision is six decimal places. Mature plyfile and trimesh loaders; nearest original unique vertex mapping; cyclic oriented triangle multiset comparison.",
        "limitations": "Preservation checks geometry during texturing; they do not establish reconstructed accuracy, coverage, or held-out appearance quality."}
    assert not args.output.exists()
    args.output.write_text(json.dumps(report, indent=2, allow_nan=False) + "\n")
    assert report["geometryPreserved"], report
    print(json.dumps(report))


if __name__ == "__main__":
    main()
