import argparse
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import pycolmap


ROOT = Path(__file__).resolve().parents[3]


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--run", type=Path, required=True)
    args = parser.parse_args()
    run = args.run.resolve()
    assert run.is_relative_to(ROOT / "artifacts/realism-01/connector-surface")
    destination = run / "viewer-handoff.json"
    assert not destination.exists()
    prepared = json.loads((run / "prepared.json").read_text())
    texture = json.loads((run / "texture-result.json").read_text())
    mesh = json.loads((run / "mesh-result.json").read_text())
    dense = json.loads((run / "dense-result.json").read_text())
    selected = json.loads((ROOT / "experience/evidence/realism-01/connector-surface-sources/fit/selected.json").read_text())
    sources = {item["id"]: item for item in selected}
    model = pycolmap.Reconstruction(ROOT / "experience/evidence/realism-01/connector-rig/run-02/sparse/0")
    views = []
    for record in sorted(prepared["imageRecords"], key=lambda item: sources[item["sourceId"]]["rank"]):
        if record["cameraIndex"] != 9:
            continue
        image = model.image(record["imageId"])
        camera = model.camera(image.camera_id)
        projections = []
        for observation in image.points2D:
            if not observation.has_point3D():
                continue
            point = model.point3D(observation.point3D_id)
            camera_point = image.cam_from_world() * point.xyz
            assert camera_point[2] > 0
            pixel = camera.img_from_cam(camera_point)
            assert np.isfinite(pixel).all()
            projections.append({"pointId": int(observation.point3D_id), "xyz": point.xyz.tolist(),
                "expectedPixel": pixel.tolist(), "positiveDepth": float(camera_point[2])})
        source = sources[record["sourceId"]]
        views.append({"id": str(record["imageId"]), "rank": source["rank"], "sourceId": source["id"],
            "cameraIndex": 9, "imagePath": "colmap/images/" + record["name"],
            "referenceImage": "colmap/images/" + record["name"], "imageSha256": record["imageSha256"],
            "maskPath": "masks/" + Path(record["name"]).stem + ".mask.png", "maskSha256": record["maskSha256"],
            "width": camera.width, "height": camera.height, "fx": camera.focal_length_x,
            "fy": camera.focal_length_y, "cx": camera.principal_point_x, "cy": camera.principal_point_y,
            "camFromWorld": image.cam_from_world().matrix().tolist(), "center": image.projection_center().tolist(),
            "projectionReferences": projections, "source": source["source"], "capturedAt": source["date"],
            "coordinates": source["coordinates"], "rights": source["license"], "attribution": "Irvin Chen / Panoramax Taiwan"})
    assert len(views) == 4 and all(view["projectionReferences"] for view in views)
    assets = [asset for asset in texture["assetFiles"] if Path(asset["path"]).suffix in {".obj", ".mtl", ".jpg"}]
    for asset in assets:
        assert digest(run / asset["path"]) == asset["sha256"]
    result = {"schemaVersion": 1, "date": datetime.now(timezone.utc).isoformat(), "status": "textured",
        "assets": assets, "obj": "scene_textured.obj", "mtl": "scene_textured.mtl",
        "textures": [asset["path"] for asset in assets if asset["path"].endswith(".jpg")],
        "triangles": mesh["triangles"], "vertices": mesh["vertices"], "densePoints": dense["points"], "views": views,
        "projectionConvention": "Native COLMAP images use pixel-edge principal point (760,760) for 1520-square images. OpenMVS internally converts this to pixel-center (759.5,759.5); viewer references use original COLMAP projection.",
        "sourceCameraSelection": "All four original panorama positions, same native virtual direction 9; no held-out-image-driven camera selection.",
        "limits": ["Research surface in arbitrary units; native fitted positions only.",
            "Four source panoramas provide upper-hemisphere geometry west of the approved route start.",
            "Independent held-out appearance evaluation is required before any appearance acceptance.",
            "Ground, collision, walking continuity, day/night relighting and the complete 1.35 km route remain unqualified.",
            "8192-square atlas has a 256 MiB uncompressed RGBA cost before mipmaps; production/mobile streaming is unqualified.",
            "Dense support includes 43 projected observations within 1.414 original pixels of an excluded mask boundary and three points below a 1.5-degree physical-angle diagnostic."]}
    destination.write_text(json.dumps(result, indent=2, allow_nan=False) + "\n")
    print(json.dumps({"handoff": str(destination), "views": len(views), "assets": len(assets)}))


if __name__ == "__main__":
    main()
