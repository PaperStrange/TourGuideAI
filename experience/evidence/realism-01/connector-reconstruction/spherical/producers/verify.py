import argparse
import hashlib
import json
import math
from pathlib import Path

import numpy as np
import pycolmap


def digest(filename):
    return hashlib.sha256(filename.read_bytes()).hexdigest()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[3])
    parser.add_argument("--experiment", choices=["perspective", "spherical"], default="perspective")
    args = parser.parse_args()
    evidence = args.root.resolve() / "experience/evidence/realism-01/connector-reconstruction" / args.experiment
    manifest = json.loads((evidence / "manifest.json").read_text())
    assert len({entry["path"] for entry in manifest["files"]}) == len(manifest["files"])
    for entry in manifest["files"]:
        filename = (evidence / entry["path"]).resolve()
        assert filename.is_relative_to(evidence)
        assert filename.stat().st_size == entry["bytes"]
        assert digest(filename) == entry["sha256"]
        assert all(entry[field] for field in ["source", "date", "rights", "location", "method", "limitations"])
    report = json.loads((evidence / "result.json").read_text())
    assert report["completed"]
    assert digest(evidence / "producers/overlap.py") == report["producer"]["sha256"]
    assert digest(evidence / "selected.json") == report["selection"]["sha256"]
    selection = json.loads((evidence / "selected.json").read_text())
    assert [item["id"] for item in selection] == [item["id"] for item in report["sources"]]
    assert all(item["license"] == "CC-BY-SA-4.0" for item in selection)
    assert len(report["directions"]) == (1 if args.experiment == "spherical" else 4)
    checked_models = 0
    checked_points = 0
    for direction in report["directions"]:
        directory = evidence / f'heading-{direction["headingDegrees"]}'
        assert direction["stage"] == "complete"
        assert len(direction["pairs"]) == 3
        assert digest(directory / "settings.json") == direction["settings"]["sha256"]
        assert digest(directory / "facade-mask.png") == direction["featureMask"]["sha256"]
        observations = json.loads((directory / "pair-observations.json").read_text())
        assert len(observations) == len(direction["pairs"])
        for pair, observation in zip(direction["pairs"], observations, strict=True):
            assert all(pair[key] == observation[key] for key in pair)
            assert len(observation["matches"]) == pair["tentativeMatches"]
            assert len(observation["inliers"]) == pair["verifiedInliers"]
            assert len(observation["matchedPoints"][0]) == len(observation["matchedPoints"][1]) == pair["tentativeMatches"]
            assert {tuple(item) for item in observation["inliers"]}.issubset({tuple(item) for item in observation["matches"]})
            assert pair["tentativeMatches"] >= pair["verifiedInliers"] >= 0
            assert pair["triangulationAngleDegrees"] is None or math.isfinite(pair["triangulationAngleDegrees"])
        for declared in direction["models"]:
            actual = pycolmap.Reconstruction(directory / "sparse" / str(declared["id"]))
            assert actual.num_reg_images() == declared["registeredImages"]
            assert actual.num_points3D() == declared["points3D"] == len(declared["points"])
            assert math.isclose(actual.compute_mean_reprojection_error(), declared["meanReprojectionErrorPixels"], abs_tol=1e-10)
            assert math.isclose(actual.compute_mean_track_length(), declared["meanTrackLength"], abs_tol=1e-10)
            actual_points = sorted((tuple(point.xyz), tuple(point.color), point.error, point.track.length())
                                   for point in actual.points3D.values())
            declared_points = sorted((tuple(point["xyz"]), tuple(point["rgb"]), point["errorPixels"], point["trackLength"])
                                     for point in declared["points"])
            assert actual_points == declared_points
            assert all(np.isfinite(point[0]).all() and math.isfinite(point[2]) for point in actual_points)
            actual_cameras = {actual.image(image_id).name: actual.image(image_id)
                              for image_id in actual.reg_image_ids()}
            for camera in declared["cameras"]:
                image = actual_cameras[camera["image"]]
                np.testing.assert_allclose(image.projection_center(), camera["center"], rtol=0, atol=1e-12)
                np.testing.assert_allclose(image.cam_from_world().matrix(), camera["camFromWorld"], rtol=0, atol=1e-12)
            checked_models += 1
            checked_points += actual.num_points3D()
    print(json.dumps({"verified": True, "files": len(manifest["files"]), "models": checked_models,
                      "points": checked_points, "fullRouteQualified": False, "metricFloorQualified": False}))


if __name__ == "__main__":
    main()
