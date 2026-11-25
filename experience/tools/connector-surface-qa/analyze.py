import argparse
import gzip
import hashlib
import importlib.metadata
import importlib.util
import io
import itertools
import json
import math
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import pycolmap
import cv2
from PIL import Image
from plyfile import PlyData
from scipy.ndimage import distance_transform_edt
from scipy.spatial import cKDTree
import trimesh


ROOT = Path(__file__).resolve().parents[3]
WORKSPACE = ROOT / "artifacts/realism-01/connector-surface-qa"
ORIGINAL = ROOT / "experience/evidence/realism-01/connector-rig/run-02"


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def identity(path):
    return {"path": str(path), "bytes": path.stat().st_size, "sha256": digest(path)}


def write_json(path, value):
    path.write_text(json.dumps(value, indent=2, allow_nan=False) + "\n")


def distribution(values):
    values = np.asarray(values, dtype=np.float64)
    if not len(values):
        return {"count": 0, "minimum": None, "median": None, "p95": None, "maximum": None}
    assert np.isfinite(values).all()
    return {"count": int(len(values)), "minimum": float(np.min(values)),
        "median": float(np.median(values)), "p95": float(np.percentile(values, 95)), "maximum": float(np.max(values))}


def read_ply(path):
    data = path.read_bytes()
    if path.suffix == ".gz":
        data = gzip.decompress(data)
    return PlyData.read(io.BytesIO(data))


def xyz(vertices):
    return np.column_stack([vertices[axis] for axis in ["x", "y", "z"]]).astype(np.float64)


def load_views(prepared_path, roundtrip, reader_path):
    prepared = json.loads(prepared_path.read_text())
    assert prepared["completed"] and prepared["heldoutImagesIncluded"] == []
    assert digest(ORIGINAL / "result.json") == prepared["sourceRunReportSha256"]
    assert digest(reader_path) == prepared["upstreamReaderSha256"]
    specification = importlib.util.spec_from_file_location("official_colmap_io", reader_path)
    model_io = importlib.util.module_from_spec(specification)
    specification.loader.exec_module(model_io)
    extension = ".bin" if (roundtrip / "images.bin").exists() else ".txt"
    exported_cameras, exported_images, _ = model_io.read_model(roundtrip, ext=extension)
    original = pycolmap.Reconstruction(ORIGINAL / "sparse/0")
    records = sorted(prepared["imageRecords"], key=lambda row: row["internalId"])
    assert [row["internalId"] for row in records] == list(range(len(records)))
    assert len(exported_images) == len(records)
    views = []
    masks = {}
    frame_centers = {}
    imported_errors = []
    intrinsic_errors = []
    for index, (exported, record) in enumerate(zip(exported_images.values(), records, strict=True)):
        original_image = original.image(record["imageId"])
        original_camera = original.camera(original_image.camera_id)
        assert original_image.name == record["originalName"]
        assert original_image.name.replace("/", "__") == record["name"] == exported.name
        assert exported.id == original_image.image_id
        assert record["frameId"] == original_image.frame_id
        assert Path(original_image.name).stem == record["sourceId"]
        transform = original_image.cam_from_world().matrix()
        np.testing.assert_allclose(transform, record["camFromWorld"], rtol=0, atol=1e-12)
        np.testing.assert_allclose(original_image.projection_center(), record["center"], rtol=0, atol=1e-12)
        imported_transform = np.column_stack([exported.qvec2rotmat(), exported.tvec])
        error = float(np.max(np.abs(imported_transform - transform)))
        tolerance = 1e-8 if extension == ".bin" else 1e-4
        assert error < tolerance
        imported_errors.append(error)
        camera = exported_cameras[exported.camera_id]
        assert camera.model == "PINHOLE" and original_camera.model_name == "SIMPLE_PINHOLE"
        assert camera.width == original_camera.width == camera.height == original_camera.height == 1520
        intrinsic_error = float(np.max(np.abs(camera.params - [760, 760, 760, 760])))
        assert intrinsic_error < 1e-10
        intrinsic_errors.append(intrinsic_error)
        mask_path = ORIGINAL / "masks" / (original_image.name.partition("/")[0] + ".png")
        assert digest(mask_path) == record["maskSha256"]
        with Image.open(mask_path) as image:
            mask = np.asarray(image)
        assert int(np.count_nonzero(mask)) == record["validMaskPixels"] > 0
        masks[index] = mask
        frame_centers.setdefault(original_image.frame_id, original_image.projection_center())
        np.testing.assert_allclose(frame_centers[original_image.frame_id], original_image.projection_center(), rtol=0, atol=1e-10)
        views.append({"internalId": index, "originalImageId": original_image.image_id,
            "originalName": original_image.name, "name": exported.name, "frameId": original_image.frame_id,
            "sourceId": record["sourceId"], "cameraIndex": record["cameraIndex"],
            "center": original_image.projection_center().tolist(), "camFromWorld": transform.tolist(),
            "maskSha256": record["maskSha256"], "roundtripPoseMaximumError": error})
    assert len(frame_centers) == prepared["originalPhysicalFrames"] == 4
    selected = {row["originalImageId"] for row in views}
    omitted = {row["imageId"] for row in prepared["droppedImages"]}
    assert selected.isdisjoint(omitted) and selected | omitted == set(original.reg_image_ids())
    for image_id in omitted:
        original_image = original.image(image_id)
        mask_path = ORIGINAL / "masks" / (original_image.name.partition("/")[0] + ".png")
        with Image.open(mask_path) as image:
            assert not np.any(np.asarray(image))
        assert original_image.num_points3D == 0
    return views, masks, frame_centers, {"originalPhysicalFrames": len(frame_centers),
        "originalVirtualViews": original.num_reg_images(), "importedVirtualViews": len(views),
        "omittedZeroMaskViews": len(omitted), "roundtripFormat": extension,
        "roundtripPoseMaximumErrors": distribution(imported_errors),
        "roundtripIntrinsicMaximumErrors": distribution(intrinsic_errors),
        "poseComparisonTolerance": tolerance, "fixedIntrinsicsAndOriginalPosesBound": True}


def dense_measurements(dense_path, views, masks, frame_centers, native_path=None):
    cloud = read_ply(dense_path)
    vertex = cloud["vertex"].data
    points = xyz(vertex)
    assert np.isfinite(points).all()
    assert "view_indices" in vertex.dtype.names and "view_weights" in vertex.dtype.names
    lengths = np.asarray([len(row) for row in vertex["view_indices"]], dtype=np.int64)
    assert np.all(lengths == [len(row) for row in vertex["view_weights"]])
    point_ids = np.repeat(np.arange(len(points), dtype=np.int64), lengths)
    support_views = np.concatenate(vertex["view_indices"]).astype(np.int64) if len(point_ids) else np.array([], dtype=np.int64)
    weights = np.concatenate(vertex["view_weights"]).astype(np.float64) if len(point_ids) else np.array([], dtype=np.float64)
    assert np.isfinite(weights).all() and np.all(weights >= 0)
    assert np.all((support_views >= 0) & (support_views < len(views)))
    frame_ids = sorted(frame_centers)
    frame_index = {frame_id: index for index, frame_id in enumerate(frame_ids)}
    view_frame_indices = np.asarray([frame_index[row["frameId"]] for row in views], dtype=np.uint8)
    flags = np.zeros(len(points), dtype=np.uint8)
    np.bitwise_or.at(flags, point_ids, np.left_shift(np.uint8(1), view_frame_indices[support_views]))
    count_lookup = np.asarray([value.bit_count() for value in range(1 << len(frame_ids))], dtype=np.uint8)
    physical_counts = count_lookup[flags]
    view_counts = np.asarray([len(set(int(value) for value in row)) for row in vertex["view_indices"]], dtype=np.int64)
    duplicate_view_counts = lengths - view_counts
    positive_depth_observations = 0
    per_view = []
    mask_distances = {}
    native_images = None
    if native_path:
        native_images = json.loads(native_path.read_text())["images"]
        assert len(native_images) == len(views)
    for view in views:
        support = point_ids[support_views == view["internalId"]]
        selected = points[support]
        transform = np.asarray(view["camFromWorld"])
        camera_points = selected @ transform[:, :3].T + transform[:, 3]
        depth = camera_points[:, 2]
        positive = depth > 0
        positive_depth_observations += int(np.count_nonzero(positive))
        projection = camera_points[positive, :2] / depth[positive, None] * 760 + 760
        # OpenMVS 使用相对 COLMAP 减去半像素的采样坐标；此处独立核对原始全分辨率掩码。
        pixels = np.rint(projection - 0.5).astype(np.int64)
        mask = masks[view["internalId"]]
        inside = np.all((pixels >= 0) & (pixels < [mask.shape[1], mask.shape[0]]), axis=1)
        sampled = mask[pixels[inside, 1], pixels[inside, 0]]
        excluded = sampled == 0
        excluded_points = support[positive][inside][excluded]
        excluded_pixels = pixels[inside][excluded]
        excluded_distances = np.array([], dtype=np.float64)
        if len(excluded_pixels):
            if view["cameraIndex"] not in mask_distances:
                mask_distances[view["cameraIndex"]] = distance_transform_edt(mask == 0)
            distances = mask_distances[view["cameraIndex"]]
            excluded_distances = distances[excluded_pixels[:, 1], excluded_pixels[:, 0]]
        per_view.append({"internalId": view["internalId"], "sourceId": view["sourceId"],
            "supportObservations": len(support), "positiveDepth": int(np.count_nonzero(positive)),
            "withinOriginalImage": int(np.count_nonzero(inside)),
            "originalMaskRetainsNearestSample": int(np.count_nonzero(sampled)),
            "originalMaskExcludesNearestSample": int(np.count_nonzero(sampled == 0)),
            "excludedSampleDistanceToValidMaskPixels": distribution(excluded_distances),
            "excludedMaskSamples": [{"pointId": int(point_id), "pixel": pixel.tolist(), "distanceToValidMaskPixels": float(distance)}
                for point_id, pixel, distance in zip(excluded_points, excluded_pixels, excluded_distances, strict=True)],
            "cameraDepthArbitraryUnits": distribution(depth)})
        if native_images is not None:
            native = native_images[view["internalId"]]
            assert native["internalId"] == view["internalId"] and native["imageId"] == view["originalImageId"]
            assert Path(native["name"]).name == view["name"]
            np.testing.assert_allclose(native["R"], transform[:, :3], rtol=0, atol=1e-10)
            np.testing.assert_allclose(native["C"], view["center"], rtol=0, atol=1e-10)
            intrinsic = np.asarray(native["K"])
            np.testing.assert_allclose(intrinsic, [[380, 0, 379.5], [0, 380, 379.5], [0, 0, 1]], rtol=0, atol=1e-10)
            assert native["width"] == native["height"] == 760
            native_mask = cv2.resize(mask, (native["width"], native["height"]), interpolation=cv2.INTER_NEAREST)
            native_homogeneous = camera_points[positive] @ intrinsic.T
            native_pixels = np.rint(native_homogeneous[:, :2] / native_homogeneous[:, 2, None]).astype(np.int64)
            native_inside = np.all((native_pixels >= 0) & (native_pixels < [native["width"], native["height"]]), axis=1)
            native_sampled = native_mask[native_pixels[native_inside, 1], native_pixels[native_inside, 0]]
            native_excluded = native_sampled == 0
            native_excluded_pixels = native_pixels[native_inside][native_excluded]
            native_distances = np.array([], dtype=np.float64)
            if len(native_excluded_pixels):
                distances = distance_transform_edt(native_mask == 0)
                native_distances = distances[native_excluded_pixels[:, 1], native_excluded_pixels[:, 0]]
            per_view[-1]["native760MaskProjection"] = {"insideImage": int(np.count_nonzero(native_inside)),
                "excludedSamples": int(np.count_nonzero(native_excluded)),
                "excludedSampleDistancePixels": distribution(native_distances),
                "excludedSamplesDetail": [{"pointId": int(point_id), "pixel": pixel.tolist(), "distanceToValidMaskPixels": float(distance)}
                    for point_id, pixel, distance in zip(support[positive][native_inside][native_excluded], native_excluded_pixels, native_distances, strict=True)]}
    angles = np.zeros(len(points), dtype=np.float64)
    pair_records = []
    baselines = []
    for first, second in itertools.combinations(range(len(frame_ids)), 2):
        center_a = frame_centers[frame_ids[first]]
        center_b = frame_centers[frame_ids[second]]
        baseline = float(np.linalg.norm(center_a - center_b))
        assert baseline > 0
        baselines.append(baseline)
        both = (1 << first) | (1 << second)
        observed = (flags & both) == both
        selected = points[observed]
        ray_a, ray_b = selected - center_a, selected - center_b
        denominators = np.linalg.norm(ray_a, axis=1) * np.linalg.norm(ray_b, axis=1)
        assert np.all(denominators > 0)
        cosine = np.einsum("ij,ij->i", ray_a, ray_b) / denominators
        pair_angles = np.degrees(np.arccos(np.clip(np.abs(cosine), 0, 1)))
        angles[observed] = np.maximum(angles[observed], pair_angles)
        for index in range(min(16, len(selected))):
            official = math.degrees(pycolmap.calculate_triangulation_angle(center_a, center_b, selected[index]))
            assert math.isclose(pair_angles[index], min(official, 180 - official), rel_tol=0, abs_tol=1e-7)
        pair_records.append({"frameIds": [frame_ids[first], frame_ids[second]],
            "baselineArbitraryUnits": baseline, "commonPoints": len(selected),
            "acuteAnglesDegrees": distribution(pair_angles)})
    support_histogram = {str(value): int(np.count_nonzero(physical_counts == value)) for value in range(len(frame_ids) + 1)}
    result = {"points": len(points), "supportObservations": len(point_ids),
        "distinctPhysicalFrameSupport": support_histogram,
        "pointsWithAtLeastTwoPhysicalFrames": int(np.count_nonzero(physical_counts >= 2)),
        "pointsWithAtLeastThreePhysicalFrames": int(np.count_nonzero(physical_counts >= 3)),
        "pointsWithRepeatedVirtualViewIds": int(np.count_nonzero(duplicate_view_counts)),
        "pointsWithMultipleVirtualViewsFromOnePhysicalFrame": int(np.count_nonzero(view_counts > physical_counts)),
        "positiveDepthObservations": positive_depth_observations,
        "nonpositiveDepthObservations": len(point_ids) - positive_depth_observations,
        "maximumPhysicalParallaxDegrees": distribution(angles[physical_counts >= 2]),
        "pointsBelow1_5Degrees": int(np.count_nonzero((physical_counts >= 2) & (angles < 1.5))),
        "observationWeights": distribution(weights), "pairs": pair_records, "views": per_view,
        "maximumPhysicalBaselineArbitraryUnits": max(baselines),
        "sourceMaskProjectionMethod": "Nearest sample in the original 1520px mask, using COLMAP projection minus0.5px. Fused-point displacement and dense-pyramid sampling can change boundary membership; this does not replay library depth-map mask decisions.",
        "relativeSupportChecks": {"nonemptyFiniteCloud": len(points) > 0,
            "atLeastTwoPhysicalFramesForEveryPoint": bool(len(points)) and bool(np.all(physical_counts >= 2)),
            "everySupportObservationHasPositiveDepth": bool(len(point_ids)) and positive_depth_observations == len(point_ids),
            "noRepeatedVirtualViewIds": not bool(np.any(duplicate_view_counts))}}
    return result, points, {"physicalFrameCounts": physical_counts, "maximumPhysicalParallaxDegrees": angles}


def mesh_measurements(mesh_path, dense_points, baseline):
    data = read_ply(mesh_path)
    vertices = xyz(data["vertex"].data)
    faces = np.asarray(list(data["face"].data["vertex_indices"]), dtype=np.int64)
    assert np.isfinite(vertices).all()
    assert faces.ndim == 2 and faces.shape[1] == 3
    assert np.all((faces >= 0) & (faces < len(vertices)))
    mesh = trimesh.Trimesh(vertices=vertices, faces=faces, process=False)
    areas = mesh.area_faces
    edges = vertices[faces[:, [1, 2, 0]]] - vertices[faces]
    lengths = np.linalg.norm(edges, axis=2)
    tree = cKDTree(dense_points)
    vertex_distances, _ = tree.query(vertices, workers=1)
    centroid_distances, _ = tree.query(mesh.triangles_center, workers=1)
    components = trimesh.graph.connected_components(mesh.face_adjacency, nodes=np.arange(len(faces)), min_len=1)
    component_sizes = sorted((len(component) for component in components), reverse=True)
    return {"vertices": len(vertices), "triangles": len(faces),
        "zeroAreaTriangles": int(np.count_nonzero(areas == 0)),
        "faceConnectedComponents": len(components), "largestFaceComponentTriangles": component_sizes[0] if component_sizes else 0,
        "largestFaceComponentFraction": component_sizes[0] / len(faces) if len(faces) else None,
        "triangleAreaArbitraryUnitsSquared": distribution(areas),
        "triangleMaximumEdgeArbitraryUnits": distribution(np.max(lengths, axis=1)),
        "vertexNearestDensePointArbitraryUnits": distribution(vertex_distances),
        "faceCentroidNearestDensePointArbitraryUnits": distribution(centroid_distances),
        "faceCentroidNearestDensePointOverMaximumBaseline": distribution(centroid_distances / baseline),
        "watertight": bool(mesh.is_watertight), "windingConsistent": bool(mesh.is_winding_consistent),
        "limitations": "Nearest-cloud distances describe graph-cut interpolation and coverage. They do not establish physical surface accuracy, occupied floor, collision or correct texture."}


def texture_measurements(path):
    with Image.open(path) as image:
        width, height = image.size
        mode = image.mode
        image.verify()
    levels = int(math.floor(math.log2(max(width, height)))) + 1
    return {"width": width, "height": height, "mode": mode, "encodedBytes": path.stat().st_size,
        "rgb8DecodedBytes": width * height * 3, "rgba8BaseBytes": width * height * 4,
        "rgba8FullMipBytes": sum(max(1, width >> level) * max(1, height >> level) * 4 for level in range(levels)),
        "method": "Actual JPEG dimensions; calculated allocation for uncompressed RGB8 and hypothetical RGBA8 upload with full mip levels.",
        "limitations": "These arithmetic texture allocations are separate from measured physical-device GPU memory and application startup transfer."}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--prepared", type=Path, required=True)
    parser.add_argument("--roundtrip", type=Path, required=True)
    parser.add_argument("--reader", type=Path, required=True)
    parser.add_argument("--dense", type=Path, required=True)
    parser.add_argument("--mesh", type=Path)
    parser.add_argument("--native-intrinsics", type=Path)
    parser.add_argument("--texture", type=Path)
    parser.add_argument("--output", type=Path, required=True)
    arguments = parser.parse_args()
    output = arguments.output.resolve()
    assert output.is_relative_to(WORKSPACE) and not output.exists()
    output.mkdir(parents=True)
    (output / "executed-analyze.py").write_bytes(Path(__file__).read_bytes())
    write_json(output / "execution.json", {"startedAt": datetime.now(timezone.utc).isoformat(),
        "arguments": {key: str(value) if value is not None else None for key, value in vars(arguments).items()}})
    inputs = [arguments.prepared, arguments.reader, arguments.dense]
    if arguments.mesh:
        inputs.append(arguments.mesh)
    if arguments.native_intrinsics:
        inputs.append(arguments.native_intrinsics)
    if arguments.texture:
        inputs.append(arguments.texture)
    inputs.extend(path for path in arguments.roundtrip.iterdir() if path.is_file())
    inputs.extend(path for path in (ORIGINAL / "sparse/0").iterdir() if path.is_file())
    before = [identity(path.resolve()) for path in inputs]
    views, masks, centers, camera_report = load_views(arguments.prepared.resolve(), arguments.roundtrip.resolve(), arguments.reader.resolve())
    dense, points, arrays = dense_measurements(arguments.dense.resolve(), views, masks, centers, arguments.native_intrinsics)
    mesh = mesh_measurements(arguments.mesh.resolve(), points, dense["maximumPhysicalBaselineArbitraryUnits"]) if arguments.mesh else None
    report = {"schemaVersion": 1, "completed": True, "date": datetime.now(timezone.utc).isoformat(),
        "producerSha256": digest(Path(__file__)), "versions": {name: importlib.metadata.version(name)
            for name in ["numpy", "pycolmap", "Pillow", "plyfile", "scipy", "trimesh", "opencv-python-headless"]},
        "inputs": before, "cameras": camera_report, "views": views, "dense": dense, "mesh": mesh,
        "texture": texture_measurements(arguments.texture) if arguments.texture else None,
        "relativeSupportChecksPass": all(dense["relativeSupportChecks"].values()), "routeQualified": False,
        "limitations": ["Four fitted original panoramas supply this diagnostic. Same-family held-out imaging has its own evaluation.",
            "All geometry uses arbitrary scale. Physical floor, full-route coverage, night lighting and independent human recognition remain unqualified.",
            "Dense fusion counts virtual images; this audit independently counts original physical frame centers.",
            "Source-mask projection uses the original full-resolution mask and reports boundary differences separately."]}
    np.savez_compressed(output / "point-measurements.npz", **arrays)
    (output / "executed-analyze.py").write_bytes(Path(__file__).read_bytes())
    assert before == [identity(Path(record["path"])) for record in before]
    write_json(output / "report.json", report)
    print(json.dumps({"output": str(output), "points": len(points), "relativeSupportChecksPass": report["relativeSupportChecksPass"],
        "physicalSupport": dense["distinctPhysicalFrameSupport"], "meshTriangles": mesh["triangles"] if mesh else None}))


if __name__ == "__main__":
    main()
