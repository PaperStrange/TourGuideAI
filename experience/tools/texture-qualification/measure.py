import argparse
from collections import defaultdict
import gzip
import hashlib
from importlib.metadata import version
from io import BytesIO
import json
import math
from pathlib import Path

import DracoPy
import numpy as np
from PIL import Image
from py3dtiles.tileset.content import read_binary_tile_content
from shapely.geometry import Polygon


MITSUI = "bldg_d4824084-63c9-4d60-8320-30b3f2e440b9"


def identity(path, root):
    data = path.read_bytes()
    return {"path": str(path.relative_to(root)), "bytes": len(data), "sha256": hashlib.sha256(data).hexdigest()}


def weighted(values, weights, fraction):
    if not values or sum(weights) <= 0:
        return None
    order = np.argsort(values, kind="stable")
    cumulative = np.cumsum(np.asarray(weights)[order])
    return float(np.asarray(values)[order][np.searchsorted(cumulative, cumulative[-1] * fraction, side="left")])


def statistics(rows, area_field):
    area = sum(row[area_field] for row in rows)
    mapped = [row for row in rows if row["textured"] and row[area_field] > 0]
    mapped_area = sum(row[area_field] for row in mapped)
    quantiles = {}
    for field in ["geometricMeanTexelsPerMetre", "minimumTexelsPerMetre", "maximumTexelsPerMetre"]:
        quantiles[field] = {f"p{int(fraction * 100)}": weighted([row[field] for row in mapped],
                            [row[area_field] for row in mapped], fraction) for fraction in [.1, .5, .9]}
    return {"surfaceAreaSquareMetres": area, "texturedSurfaceAreaSquareMetres": mapped_area,
            "texturedAreaFraction": mapped_area / area if area else None,
            "trianglesWithArea": sum(row[area_field] > 0 for row in rows),
            "texturedTrianglesWithArea": len(mapped), "areaWeighted": quantiles}


def band_area(vertices, basis, triangle_area, bottom, height=8):
    face = (vertices - vertices[0]) @ basis.T
    gradient = basis[:, 1]
    magnitude = np.linalg.norm(gradient)
    if magnitude <= 0:
        raise ValueError("A selected vertical surface needs a nonzero height gradient")
    direction = gradient / magnitude
    tangent = np.array([-direction[1], direction[0]])
    extent = np.max(np.linalg.norm(face, axis=1)) + 1
    lower, upper = (bottom - vertices[0, 1]) / magnitude, (bottom + height - vertices[0, 1]) / magnitude
    band = Polygon([direction * lower - tangent * extent, direction * lower + tangent * extent,
                    direction * upper + tangent * extent, direction * upper - tangent * extent])
    area = Polygon(face).intersection(band).area
    if area < -1e-8 or area > triangle_area + 1e-6:
        raise ValueError("Clipped lower-band area exceeds its original triangle")
    return float(min(triangle_area, max(0, area)))


def measure(root, output):
    retained = root / "experience/evidence/realism-01/qualification/geometry"
    files = [retained / name for name in ["geometry-audit.json", "review-manifest.json", "download-receipts.json", "objects.geojson.gz"]]
    audit, review, receipts = [json.loads(path.read_text()) for path in files[:3]]
    objects = json.loads(gzip.decompress(files[3].read_bytes()))["features"]
    properties = {feature["id"]: feature["properties"] for feature in objects}
    near = defaultdict(list)
    for edge in audit["edges"]:
        for item in edge["matches"]:
            if item["category"] == "building" and item["selectedForReview"]:
                near[item["objectId"]].append(edge["ordinal"])
    source_receipts = {item["id"]: item for item in receipts["records"]}
    original_rows, sources, source_counts = [], [], {}
    for model in review["models"]:
        if model["category"] != "building":
            continue
        source = source_receipts[model["id"]]
        batches = {properties[key]["batchIndex"]: key for key in near if properties[key]["sourceTileId"] == model["id"]}
        if not batches:
            continue
        if not set(batches).issubset(model["selectedBatchIds"]) or any(not properties[key]["selectedForReview"] for key in batches.values()):
            raise ValueError("Route-near objects must belong to the reviewed source selection")
        path = root / "artifacts/realism-01/downloads/route-qualification" / source["file"]
        receipt = identity(path, root)
        if receipt["bytes"] != source["bytes"] or receipt["sha256"] != model["sourceSha256"]:
            raise ValueError(f"Original source identity differs: {model['id']}")
        sources.append({**receipt, "source": source["source"], "id": model["id"]})
        gltf = read_binary_tile_content(path).body.gltf
        if len(gltf.meshes) != 1 or len(gltf.nodes) != 1 or gltf.nodes[0].mesh != 0:
            raise ValueError("Source mesh hierarchy differs from the reviewed package")
        placement = np.array(model["transform"]).reshape((4, 4), order="F")
        if not np.allclose(placement[:3, :3].T @ placement[:3, :3], np.eye(3), atol=1e-12):
            raise ValueError("Source placement must preserve physical metres")
        image_sizes = []
        for image in gltf.images:
            if image.uri is not None or image.bufferView is None:
                raise ValueError("Expected original embedded image")
            view = gltf.bufferViews[image.bufferView]
            data = gltf.binary_blob()[(view.byteOffset or 0):(view.byteOffset or 0) + view.byteLength]
            with Image.open(BytesIO(data)) as decoded:
                image_sizes.append([decoded.width, decoded.height])
        for primitive_index, primitive in enumerate(gltf.meshes[0].primitives):
            extension = primitive.extensions["KHR_draco_mesh_compression"]
            buffer = gltf.bufferViews[extension["bufferView"]]
            decoded = DracoPy.decode(gltf.binary_blob()[(buffer.byteOffset or 0):(buffer.byteOffset or 0) + buffer.byteLength])
            positions = np.asarray(decoded.points, dtype=np.float64) @ placement[:3, :3].T + placement[:3, 3]
            faces = np.asarray(decoded.faces, dtype=np.int64)
            ids = decoded.get_attribute_by_unique_id(extension["attributes"]["_BATCHID"])["data"].reshape(-1)
            material = gltf.materials[primitive.material].pbrMetallicRoughness
            texture = material.baseColorTexture
            uv, image_index, size = None, None, None
            if texture is not None:
                if texture.extensions or texture.texCoord != 0:
                    raise ValueError("Texture coordinate transform/set needs explicit support")
                image_record = gltf.textures[texture.index]
                image_index = image_record.extensions["EXT_texture_webp"]["source"] if "EXT_texture_webp" in image_record.extensions else image_record.source
                size = np.asarray(image_sizes[image_index], dtype=np.float64)
                uv = np.asarray(decoded.get_attribute_by_unique_id(extension["attributes"]["TEXCOORD_0"])["data"], dtype=np.float64)
            for face_index, face in enumerate(faces):
                batch = int(ids[face[0]])
                if not np.all(ids[face] == batch):
                    raise ValueError("Source triangle crosses object identity")
                if batch not in batches:
                    continue
                key = batches[batch]
                source_counts[key] = source_counts.get(key, 0) + 1
                vertices = positions[face]
                first, second = vertices[1] - vertices[0], vertices[2] - vertices[0]
                normal = np.cross(first, second)
                twice_area = np.linalg.norm(normal)
                if twice_area <= 1e-10:
                    continue
                normal /= twice_area
                if abs(normal[1]) > .5:
                    continue
                first_axis = first / np.linalg.norm(first)
                basis = np.array([first_axis, np.cross(normal, first_axis)])
                face_coordinates = np.column_stack([basis @ first, basis @ second])
                density = [None, None]
                pixel_area = None
                if uv is not None:
                    pixel_coordinates = uv[face] * size
                    pixel_edges = np.column_stack([pixel_coordinates[1] - pixel_coordinates[0], pixel_coordinates[2] - pixel_coordinates[0]])
                    jacobian = np.linalg.solve(face_coordinates.T, pixel_edges.T).T
                    density = np.linalg.svd(jacobian, compute_uv=False).tolist()
                    pixel_area = float(abs(np.linalg.det(pixel_edges)) / 2)
                    if not np.all(np.isfinite(density)):
                        raise ValueError("Nonfinite texture density")
                    area_ratio = pixel_area / (twice_area / 2)
                    if not np.isclose(density[0] * density[1], area_ratio, rtol=1e-5, atol=1e-8):
                        raise ValueError("Independent UV/physical-area and singular-value products differ")
                original_rows.append({"objectId": key, "primitive": primitive_index, "face": face_index,
                    "worldAreaSquareMetres": float(twice_area / 2), "lowerBandAreaSquareMetres": band_area(vertices, basis, twice_area / 2, properties[key]["localBounds"][1]),
                    "absoluteNormalUp": float(abs(normal[1])), "textured": uv is not None,
                    "imageIndex": image_index, "imageSize": size.tolist() if size is not None else None,
                    "uvPixelArea": pixel_area, "maximumTexelsPerMetre": density[0], "minimumTexelsPerMetre": density[1],
                    "geometricMeanTexelsPerMetre": math.sqrt(density[0] * density[1]) if uv is not None else None,
                    "anisotropy": density[0] / density[1] if uv is not None and density[1] > 1e-12 else None})
        print(json.dumps({"source": model["id"], "nearObjects": len(batches), "verticalTrianglesSoFar": len(original_rows)}), flush=True)
    if any(source_counts[key] != properties[key]["triangles"] for key in near):
        raise ValueError("Near-route selected source triangle inventory differs")
    summaries = []
    for key in sorted(near):
        rows = [row for row in original_rows if row["objectId"] == key]
        prop = properties[key]
        summaries.append({"objectId": key, "gmlId": prop["gmlId"], "lod": prop["lod"],
            "edgeOrdinals": sorted(set(near[key])), "sourceTriangles": prop["triangles"],
            "texturedSourceTriangles": prop["texturedTriangles"], "verticalSurface": statistics(rows, "worldAreaSquareMetres"),
            "lowerEightMetresSourceRelative": statistics(rows, "lowerBandAreaSquareMetres"), "visibleFrontageQualified": False})
    mitsui = [item for item in summaries if item["gmlId"] == MITSUI]
    if len(mitsui) != 1:
        raise ValueError("Expected one selected exact Mitsui source occurrence")
    result = {"schemaVersion": 1, "date": "2026-11-06", "inputs": [identity(path, root) for path in files],
        "sourceSelection": review["contentSelection"], "nearRouteSelectedBuildings": len(near), "decodedSources": sources,
        "verticalTriangleCount": len(original_rows), "nearRouteSelectedTriangleCount": sum(source_counts.values()),
        "method": "Original Draco positions and UVs; orthonormal physical face basis; singular values of UV-pixel Jacobian; independent determinant area-ratio equality; physical-area weighted quantiles",
        "classification": {"verticalAbsoluteNormalUpMaximum": .5, "lowerBandMetres": 8,
            "lowerBandOrigin": "Per-object minimum selected-source local vertex height; no surveyed ground inference",
            "bandMethod": "Shapely intersection of each physical face triangle with the corresponding height strip"},
        "frontParallelSamplingReference": {"viewport": [1440, 1000], "verticalFieldOfViewDegrees": 60,
            "pixelsPerMetreAt5Metres": 1000 / (2 * math.tan(math.radians(30)) * 5),
            "pixelsPerMetreAt10Metres": 1000 / (2 * math.tan(math.radians(30)) * 10),
            "meaning": "Geometric screen sampling density for a front-parallel surface; no quality pass/fail threshold"},
        "aggregateVerticalSurface": statistics(original_rows, "worldAreaSquareMetres"),
        "aggregateLowerEightMetres": statistics(original_rows, "lowerBandAreaSquareMetres"),
        "mitsui": mitsui[0], "objects": summaries,
        "libraries": {name: version(name) for name in ["py3dtiles", "pygltflib", "DracoPy", "numpy", "Pillow", "shapely"]},
        "limitations": ["Projected nearby objects include back/occluded surfaces; facade normals and lower source-relative band establish neither street visibility nor pedestrian-ground location.",
            "Atlas UV sampling density is an upper bound on available stored samples; aerial blur, resampling, JPEG/WebP loss and baked lighting can reduce actual recoverable detail.",
            "Geometry counts and texture density establish no current facade identity, entrance correctness, independent discovery, realism or lighting acceptance.",
            "The camera reference is hypothetical front-parallel geometry, separate from the current provisional source-review views."]}
    output.mkdir(parents=True, exist_ok=True)
    (output / "texture-density.json").write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n")
    (output / "triangle-measurements.json.gz").write_bytes(gzip.compress((json.dumps(original_rows, separators=(",", ":")) + "\n").encode(), mtime=0))
    print(json.dumps({"nearObjects": len(near), "verticalTriangles": len(original_rows), "aggregateLowerBand": result["aggregateLowerEightMetres"], "mitsui": mitsui[0]}))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    measure(args.root.resolve(), args.output.resolve())
