import argparse
import hashlib
import json
from collections import Counter
from datetime import datetime, timezone
from importlib.metadata import version
from pathlib import Path

import numpy as np
import trimesh
from PIL import Image
from plyfile import PlyData
from scipy.ndimage import map_coordinates
from scipy.spatial import cKDTree


BARYCENTRIC = np.array([[1 / 3, 1 / 3, 1 / 3], [0.6, 0.2, 0.2], [0.2, 0.6, 0.2], [0.2, 0.2, 0.6]])


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def oriented(faces):
    return Counter(tuple(int(value) for value in np.roll(face, -int(np.argmin(face)))) for face in faces)


def sample_image(image, x, y):
    return np.column_stack([map_coordinates(image[:, :, channel].astype(np.float64), [y, x],
        order=1, mode="nearest", prefilter=False) for channel in range(3)])


def statistics(values):
    values = np.asarray(values)
    assert values.size and np.isfinite(values).all()
    return {"count": int(values.size), "mean": float(values.mean()), "median": float(np.median(values)),
        "p95": float(np.percentile(values, 95)), "maximum": float(values.max())}


def inspect_surface(path, originals, original_faces):
    scene = trimesh.load_scene(path, process=False, maintain_order=False, skip_materials=False)
    source_tree = cKDTree(originals)
    all_faces = []
    sampled = []
    constant = []
    maximum_distance = 0.0
    parsed_vertices = 0
    for name in scene.graph.nodes_geometry:
        transform, geometry_name = scene.graph[name]
        assert np.array_equal(transform, np.eye(4))
        geometry = scene.geometry[geometry_name]
        positions = np.asarray(geometry.vertices)
        assert np.isfinite(positions).all()
        distances, mapping = source_tree.query(positions)
        maximum_distance = max(maximum_distance, float(distances.max()))
        parsed_vertices += len(positions)
        faces = mapping[np.asarray(geometry.faces)]
        uv = np.asarray(geometry.visual.uv)[geometry.faces]
        assert np.isfinite(uv).all()
        order = np.argsort(faces, axis=1)
        uv = np.take_along_axis(uv, order[:, :, None], axis=1)
        material = geometry.visual.material
        atlas = material.baseColorTexture if hasattr(material, "baseColorTexture") else material.image
        assert atlas is not None
        image = np.asarray(atlas.convert("RGB"))
        samples_uv = np.einsum("sc,fcd->fsd", BARYCENTRIC, uv)
        samples = sample_image(image, samples_uv[:, :, 0].ravel() * image.shape[1] - 0.5,
            (1 - samples_uv[:, :, 1].ravel()) * image.shape[0] - 0.5).reshape(len(faces), len(BARYCENTRIC), 3)
        constant.append(np.all(uv == uv[:, :1, :], axis=(1, 2)))
        sampled.append(samples)
        all_faces.append(faces)
    faces = np.vstack(all_faces)
    sorted_faces = np.sort(faces, axis=1)
    order = np.lexsort(sorted_faces.T[::-1])
    assert len(np.unique(sorted_faces, axis=0)) == len(faces)
    missing = oriented(original_faces) - oriented(faces)
    added = oriented(faces) - oriented(original_faces)
    return {"maximumVertexDistance": maximum_distance, "parsedVertices": parsed_vertices,
        "triangleCount": len(faces), "missingOrientedTriangles": sum(missing.values()),
        "addedOrientedTriangles": sum(added.values()),
        "constantUvFaces": int(np.concatenate(constant).sum())}, sorted_faces[order], np.concatenate(sampled)[order], np.concatenate(constant)[order]


def source_residuals(baseline, original_faces, original_vertices, candidate_samples, candidate_constant, intrinsics):
    selected = np.linspace(0, len(original_faces) - 1, min(4096, len(original_faces)), dtype=int)
    triangles = original_vertices[original_faces[selected]]
    samples = candidate_samples[selected].reshape(-1, 3)
    best = np.full(len(samples), np.inf)
    eligible = np.zeros(len(samples), dtype=int)
    for camera in intrinsics["images"]:
        rotation = np.asarray(camera["R"])
        center = np.asarray(camera["C"])
        matrix = np.asarray(camera["K"])
        local = (triangles - center) @ rotation.T
        projected = local @ matrix.T
        positive = np.all(local[:, :, 2] > 0, axis=1)
        projected = projected[:, :, :2] / projected[:, :, 2:3]
        coordinates = np.einsum("sc,fcd->fsd", BARYCENTRIC, projected).reshape(-1, 2)
        valid = np.repeat(positive, len(BARYCENTRIC))
        valid &= np.isfinite(coordinates).all(axis=1)
        valid &= (coordinates[:, 0] >= 0) & (coordinates[:, 0] < camera["width"] - 1)
        valid &= (coordinates[:, 1] >= 0) & (coordinates[:, 1] < camera["height"] - 1)
        indices = np.flatnonzero(valid)
        if not len(indices):
            continue
        image_path = baseline / camera["name"]
        mask_path = baseline / "masks" / (Path(camera["name"]).stem + ".mask.png")
        with Image.open(image_path) as source_image, Image.open(mask_path) as mask_image:
            image = np.asarray(source_image.convert("RGB"))
            mask = np.asarray(mask_image)
            assert source_image.size == mask_image.size == (camera["width"], camera["height"])
        coordinates_valid = coordinates[indices]
        floors = np.floor(coordinates_valid).astype(int)
        valid_mask = np.ones(len(indices), dtype=bool)
        for dx, dy in [(0, 0), (0, 1), (1, 0), (1, 1)]:
            valid_mask &= mask[floors[:, 1] + dy, floors[:, 0] + dx] != 0
        indices = indices[valid_mask]
        coordinates_valid = coordinates[indices]
        rgb = sample_image(image, coordinates_valid[:, 0], coordinates_valid[:, 1])
        residual = np.mean(np.abs(rgb - samples[indices]), axis=1)
        best[indices] = np.minimum(best[indices], residual)
        eligible[indices] += 1
    accepted = np.isfinite(best) & ~np.repeat(candidate_constant[selected], len(BARYCENTRIC))
    return {"selectedFaces": len(selected), "sampleCount": len(samples), "eligibleNonconstantSamples": int(accepted.sum()),
        "minimumRgbMaeAcrossEligibleViews": statistics(best[accepted]),
        "eligibleViewCount": statistics(eligible[accepted]),
        "fractionRgbMaeBelow1": float(np.mean(best[accepted] < 1)),
        "fractionRgbMaeBelow5": float(np.mean(best[accepted] < 5)),
        "limitations": "Optimistic minimum over all source views with positive depth and valid bilinear mask footprint. Occlusion and exported source assignments are unavailable. Face UV sampling uses projected vertices with barycentric interpolation. This is a consistency diagnostic and is excluded from held-out acceptance."}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--baseline", type=Path, required=True)
    parser.add_argument("--variant", type=Path, required=True)
    parser.add_argument("--intrinsics", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    baseline = args.baseline.resolve()
    variant = args.variant.resolve()
    command = json.loads((variant / "command.json").read_text())
    assert command["returnCode"] == 0 and Path(command["cwd"]).resolve() == baseline
    assert command["inputSceneSha256"] == digest(baseline / "scene_dense.mvs")
    assert command["inputMeshSha256"] == digest(baseline / "scene_mesh.ply")
    assert command["preparedSha256"] == digest(baseline / "prepared.json")
    values = dict(zip(command["argv"][1::2], command["argv"][2::2]))
    for key, value in {"--max-texture-size": "4096", "--export-type": "gltf", "--resolution-level": "0",
        "--decimate": "1", "--close-holes": "0", "--ignore-mask-label": "0", "--sharpness-weight": "0",
        "--global-seam-leveling": "0", "--local-seam-leveling": "0"}.items():
        assert values[key] == value
    gltf_path = variant / "scene_textured.gltf"
    document = json.loads(gltf_path.read_text())
    images = []
    for entry in document["images"]:
        path = (variant / entry["uri"]).resolve()
        assert path.is_relative_to(variant)
        with Image.open(path) as image:
            assert image.format == "PNG" and image.mode == "RGB" and max(image.size) <= 4096
            images.append({"uri": entry["uri"], "width": image.width, "height": image.height,
                "format": image.format, "mode": image.mode, "bytes": path.stat().st_size,
                "rgbaBaseBytes": image.width * image.height * 4, "sha256": digest(path)})
    bindings = []
    for mesh in document["meshes"]:
        for primitive in mesh["primitives"]:
            material_id = primitive["material"]
            material = document["materials"][material_id]
            assert "KHR_materials_unlit" in material["extensions"]
            texture_id = material["pbrMetallicRoughness"]["baseColorTexture"]["index"]
            image_id = document["textures"][texture_id]["source"]
            bindings.append({"material": material_id, "texture": texture_id, "image": image_id,
                "uri": images[image_id]["uri"], "unlit": True})
    original = PlyData.read(baseline / "scene_mesh.ply")
    vertices = np.column_stack([original["vertex"].data[axis] for axis in ["x", "y", "z"]]).astype(np.float64)
    faces = np.vstack(original["face"].data["vertex_indices"])
    assert len(np.unique(vertices, axis=0)) == len(vertices)
    baseline_geometry, baseline_faces, baseline_samples, baseline_constant = inspect_surface(baseline / "scene_textured.obj", vertices, faces)
    variant_geometry, variant_faces, variant_samples, variant_constant = inspect_surface(gltf_path, vertices, faces)
    assert np.array_equal(baseline_faces, variant_faces)
    assert variant_geometry["maximumVertexDistance"] == 0
    assert variant_geometry["missingOrientedTriangles"] == variant_geometry["addedOrientedTriangles"] == 0
    nonconstant = ~baseline_constant & ~variant_constant
    absolute = np.abs(variant_samples - baseline_samples)
    selected_difference = absolute[nonconstant]
    comparison = {"faces": int(nonconstant.sum()), "samplesPerFace": len(BARYCENTRIC),
        "barycentricWeights": BARYCENTRIC.tolist(), "perChannelAbsoluteDifference": statistics(selected_difference),
        "sampleRgbMae": statistics(selected_difference.mean(axis=2)),
        "channelMeanAbsoluteDifferenceRGB": selected_difference.mean(axis=(0, 1)).tolist(),
        "channelSignedMeanDifferenceRGB": (variant_samples[nonconstant] - baseline_samples[nonconstant]).mean(axis=(0, 1)).tolist(),
        "rgbRmse": float(np.sqrt(np.mean(selected_difference ** 2))),
        "changedConstantUvClassification": int(np.count_nonzero(baseline_constant != variant_constant)),
        "method": "Pair triangles by original oriented geometry, canonicalize corner order, sample four interior barycentric UV positions with bilinear interpolation. Both mature loaders expose bottom-left UV origin; pixel centers use u*width-0.5 and (1-v)*height-0.5.",
        "limitations": "The reference atlas is JPEG; this candidate is PNG. JPEG compression, UV serialization, patch rotation and repeat texture assignment may contribute. Difference measurements establish no source-assignment identity or held-out fidelity."}
    source = source_residuals(baseline, variant_faces, vertices, variant_samples, variant_constant,
        json.loads(args.intrinsics.read_text()))
    report = {"date": datetime.now(timezone.utc).isoformat(), "producerSha256": digest(Path(__file__)),
        "commandSha256": digest(variant / "command.json"), "gltfSha256": digest(gltf_path),
        "baselineObjSha256": digest(baseline / "scene_textured.obj"), "inputMeshSha256": digest(baseline / "scene_mesh.ply"),
        "intrinsicsSha256": digest(args.intrinsics), "dependencies": {name: version(name) for name in ["numpy", "Pillow", "plyfile", "trimesh", "scipy"]},
        "geometry": variant_geometry, "baselineGeometry": baseline_geometry, "images": images,
        "bindings": bindings, "rgbaBaseBytes": sum(image["rgbaBaseBytes"] for image in images),
        "sampleComparison": comparison, "fittedSourceDiagnostic": source,
        "heldoutAppearanceQualified": False}
    assert not args.output.exists()
    args.output.write_text(json.dumps(report, indent=2, allow_nan=False) + "\n")
    print(json.dumps({"geometry": variant_geometry, "images": images, "sampleRgbMae": comparison["sampleRgbMae"],
        "sourceDiagnostic": source}))


if __name__ == "__main__":
    main()
