import argparse
from datetime import datetime, timezone
import importlib.metadata
import json
from pathlib import Path
import shutil

import cv2
import embreex
import numpy as np
import pycolmap
import pycolmap.panorama as panorama
from PIL import Image
import trimesh
from trimesh.ray.ray_pyembree import RayMeshIntersector

from localize import ROOT, WORKSPACE, digest, identity, write_json


def load_textured_mesh(filename):
    scene = trimesh.load_scene(filename, process=False)
    geometries, triangle_uvs, material_indices, materials = [], [], [], []
    for node_name in sorted(scene.graph.nodes_geometry):
        transform, geometry_name = scene.graph[node_name]
        geometry = scene.geometry[geometry_name].copy()
        geometry.apply_transform(transform)
        assert geometry.visual.kind == "texture" and geometry.visual.uv is not None
        assert np.isfinite(geometry.visual.uv).all()
        material = geometry.visual.material
        if isinstance(material, trimesh.visual.material.MultiMaterial):
            local_materials = list(material.materials)
            local_indices = np.asarray(geometry.visual.face_materials, dtype=int)
            assert len(local_indices) == len(geometry.faces)
        else:
            local_materials = [material]
            local_indices = np.zeros(len(geometry.faces), dtype=int)
        assert int(local_indices.min()) >= 0 and int(local_indices.max()) < len(local_materials)
        for entry in local_materials:
            assert isinstance(entry, trimesh.visual.material.SimpleMaterial)
            assert entry.image is not None
            entry.image.load()
        material_indices.append(local_indices + len(materials))
        materials.extend(local_materials)
        triangle_uvs.append(np.asarray(geometry.visual.uv)[geometry.faces])
        geometries.append(geometry)
    mesh = trimesh.util.concatenate(geometries)
    triangle_uvs = np.concatenate(triangle_uvs)
    material_indices = np.concatenate(material_indices)
    assert len(mesh.faces) == len(triangle_uvs) == len(material_indices)
    assert np.isfinite(mesh.vertices).all() and len(mesh.faces) > 0
    return mesh, triangle_uvs, material_indices, materials


def metrics(reference, observed):
    if len(reference) == 0:
        return None
    difference = observed.astype(float) - reference.astype(float)
    absolute = np.abs(difference)
    mse = float(np.mean(difference ** 2))
    return {"pixels": len(reference), "meanAbsoluteChannelError255": float(np.mean(absolute)),
        "p95AbsoluteChannelError255": float(np.percentile(absolute, 95)), "rootMeanSquareChannelError255": float(np.sqrt(mse)),
        "psnrDb": float(10 * np.log10(255 ** 2 / mse)) if mse else None,
        "exactPixelFraction": float(np.mean(np.all(difference == 0, axis=1)))}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--mesh", type=Path, required=True)
    parser.add_argument("--localization", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    arguments = parser.parse_args()
    filename, localization_file, output = arguments.mesh.resolve(), arguments.localization.resolve(), arguments.output.resolve()
    assert filename.is_relative_to(ROOT / "artifacts") and localization_file.is_relative_to(WORKSPACE)
    assert output.is_relative_to(WORKSPACE) and not output.exists()
    output.mkdir(parents=True)
    shutil.copyfile(Path(__file__), output / "executed-render.py")
    source = json.loads(localization_file.read_text())
    assert source["completed"] and source["fittingModelUnchanged"]
    assert {query["rank"] for query in source["queries"]} == {67, 72}
    mesh, triangle_uvs, material_indices, materials = load_textured_mesh(filename)
    intersector = RayMeshIntersector(mesh)
    images = Path(source["projectionDirectory"])
    masks = Path(source["maskDirectory"])
    report = {"schemaVersion": 1, "startedAt": datetime.now(timezone.utc).isoformat(), "completed": False,
        "producer": identity(Path(__file__)), "localization": identity(localization_file), "mesh": identity(filename),
        "versions": {name: importlib.metadata.version(name) for name in ["trimesh", "embreex", "numpy", "Pillow", "pycolmap"]},
        "settings": {"resolution": [1520, 1520], "rayChunk": 65536, "rays": "Official COLMAP pixel centers and pinhole unprojection",
            "visibility": "Embree first mesh intersection; two-sided triangle geometry; no synthetic background geometry",
            "color": "Unlit source texture atlas sampled with trimesh bilinear interpolation; no exposure alignment or color fitting",
            "coverageDenominator": "All pixels in the original upper-hemisphere closest-camera partition, including sky and unobserved surfaces",
            "localizationNeighborhoodRadiusPixels": 32,
            "appearanceDenominator": "Covered pixels after excluding 32-pixel discs around all pose candidate features; full covered-pixel errors are recorded separately"},
        "meshVertices": len(mesh.vertices), "meshFaces": len(mesh.faces), "materials": len(materials), "views": [],
        "limitations": ["These are adjacent same-sequence image diagnostics with model-relative estimated query poses; independent capture and human realism remain unverified.",
            "Pose neighborhood exclusion is an explicit pixel mask; it supplies no claim of complete SIFT descriptor-support independence.",
            "Coverage includes sky. Missing rays are retained as uncovered pixels and excluded from color-error denominators.",
            "Texture sampling preserves captured illumination; this evaluation establishes no relighting, metric scale, pedestrian floor or route acceptance."]}
    report_path = output / "result.json"
    write_json(report_path, report)
    cv2.setNumThreads(2)
    for query in source["queries"]:
        if not query["pose"]["localizationEligible"]:
            report["views"].append({"rank": query["rank"], "status": "pose-ineligible", "rendered": False})
            continue
        for camera_record in query["pose"]["cameraFromWorld"]:
            index = camera_record["cameraIndex"]
            camera = pycolmap.Camera(model=camera_record["model"], width=camera_record["width"], height=camera_record["height"], params=camera_record["params"])
            matrix = np.asarray(camera_record["matrix"])
            pose = pycolmap.Rigid3d(pycolmap.Rotation3d(matrix[:, :3]), matrix[:, 3])
            name = f'pano_camera{index}/{query["sourceId"]}.jpg'
            source_image = images / name
            assert digest(source_image) == next(image["sha256"] for image in source["images"] if image["name"] == name)
            with Image.open(source_image) as image:
                reference = np.asarray(image.convert("RGB"))
            with Image.open(masks / (name + ".png")) as image:
                eligible = np.asarray(image.convert("L")) > 0
            assert reference.shape == (1520, 1520, 3) and eligible.shape == (1520, 1520)
            selected_pixels = np.flatnonzero(eligible)
            rays = panorama.get_virtual_camera_rays(camera).reshape(camera.width, camera.height, 3).transpose(1, 0, 2).reshape(-1, 3)
            world_rays = rays[selected_pixels] @ matrix[:, :3]
            origin = pose.inverse().translation
            observed = np.zeros_like(reference)
            covered = np.zeros(eligible.shape, dtype=bool)
            for begin in range(0, len(selected_pixels), 65536):
                directions = world_rays[begin:begin + 65536]
                locations, ray_indices, face_indices = intersector.intersects_location(
                    np.broadcast_to(origin, directions.shape), directions, multiple_hits=False)
                if not len(ray_indices):
                    continue
                assert np.isfinite(locations).all()
                distances = np.linalg.norm(locations - origin, axis=1)
                assert np.all(distances > 0)
                weights = trimesh.triangles.points_to_barycentric(mesh.triangles[face_indices], locations)
                assert np.isfinite(weights).all()
                uv = np.einsum("ni,nij->nj", weights, triangle_uvs[face_indices])
                pixel_indices = selected_pixels[begin + ray_indices]
                colors = np.zeros((len(ray_indices), 3), dtype=np.uint8)
                for material_index in np.unique(material_indices[face_indices]):
                    selected = material_indices[face_indices] == material_index
                    colors[selected] = trimesh.visual.color.uv_to_interpolated_color(uv[selected], materials[material_index].image)[:, :3]
                observed.reshape(-1, 3)[pixel_indices] = colors
                covered.reshape(-1)[pixel_indices] = True
            excluded = np.zeros(eligible.shape, dtype=np.uint8)
            feature_count = 0
            for association in query["associations"]:
                if association["cameraIndex"] == index:
                    center = tuple(int(round(value - 0.5)) for value in association["xy"])
                    cv2.circle(excluded, center, 32, 255, thickness=-1)
                    feature_count += 1
            comparison = covered & (excluded == 0)
            stem = f'rank-{query["rank"]}-view-{index:02d}'
            rgba = np.dstack([observed, covered.astype(np.uint8) * 255])
            Image.fromarray(rgba).save(output / (stem + "-render.png"))
            Image.fromarray(eligible.astype(np.uint8) * 255).save(output / (stem + "-eligible.png"))
            Image.fromarray(excluded).save(output / (stem + "-pose-neighborhood.png"))
            shutil.copyfile(source_image, output / (stem + "-reference.jpg"))
            row = {"rank": query["rank"], "cameraIndex": index, "rendered": True,
                "eligiblePixels": int(np.count_nonzero(eligible)), "coveredPixels": int(np.count_nonzero(covered)),
                "uncoveredPixels": int(np.count_nonzero(eligible & ~covered)),
                "coverage": float(np.count_nonzero(covered) / np.count_nonzero(eligible)) if np.any(eligible) else None,
                "poseCandidates": feature_count, "poseNeighborhoodEligiblePixels": int(np.count_nonzero(eligible & (excluded > 0))),
                "comparisonPixels": int(np.count_nonzero(comparison)),
                "fullCoveredPhotometry": metrics(reference[covered], observed[covered]),
                "remainingPixelPhotometry": metrics(reference[comparison], observed[comparison]),
                "files": [identity(output / (stem + suffix)) for suffix in ["-render.png", "-eligible.png", "-pose-neighborhood.png", "-reference.jpg"]]}
            report["views"].append(row)
            write_json(report_path, report)
    report["completed"] = True
    report["finishedAt"] = datetime.now(timezone.utc).isoformat()
    report["meshUnchanged"] = digest(filename) == report["mesh"]["sha256"]
    assert report["meshUnchanged"] and digest(localization_file) == report["localization"]["sha256"]
    write_json(report_path, report)
    print(json.dumps({"completed": True, "views": len(report["views"]), "coveredPixels": sum(row.get("coveredPixels", 0) for row in report["views"]),
        "eligiblePixels": sum(row.get("eligiblePixels", 0) for row in report["views"]), "output": str(output)}))


if __name__ == "__main__":
    main()
