import argparse
from collections import Counter, defaultdict
from datetime import datetime, timezone
import json
from pathlib import Path
import shutil

import numpy as np
import pycolmap

from localize import ORIGINAL, WORKSPACE, digest, identity, solve_pose, write_json


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--previous", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    arguments = parser.parse_args()
    previous, output = arguments.previous.resolve(), arguments.output.resolve()
    assert previous.is_relative_to(WORKSPACE) and output.is_relative_to(WORKSPACE) and not output.exists()
    report = json.loads((previous / "result.json").read_text())
    assert report["completed"] and digest(previous / "features.db") == report["database"]["sha256"]
    output.mkdir(parents=True)
    shutil.copyfile(Path(__file__), output / "executed-relocalize.py")
    shutil.copyfile(Path(__file__).with_name("localize.py"), output / "executed-localize.py")
    original_database_hash = digest(previous / "features.db")
    database_path = output / "features.db"
    shutil.copyfile(previous / "features.db", database_path)
    report.update({"completed": False, "startedAt": datetime.now(timezone.utc).isoformat(), "stage": "binding-inputs",
        "previousAttempt": identity(previous / "result.json"), "previousDatabase": report["database"],
        "projectionDirectory": str(previous / "images"), "maskDirectory": str(previous / "masks"),
        "producer": identity(Path(__file__)), "poseProducer": identity(Path(__file__).with_name("localize.py")),
        "pairs": [], "queries": []})
    report["settings"]["matchPairs"] = "Every held-out virtual view to every fitting virtual view: 1152 predeclared pairs; panorama heading is unconstrained"
    report["settings"]["finalConsensusRefinement"] = "Recompute 4 px/positive-depth consensus after the official estimator's refinement; perform exactly one supported pose-only refinement; recompute final consensus once"
    report_path = output / "result.json"
    write_json(report_path, report)
    original_observations = json.loads((ORIGINAL / "observations.json").read_text())
    original_names = {row["name"]: row for row in original_observations["images"]}
    model = pycolmap.Reconstruction(ORIGINAL / "sparse/0")
    model_images = {image.name: image for image in model.images.values()}
    keypoints = {}
    with pycolmap.Database.open(database_path) as database, np.load(ORIGINAL / "observations.npz", allow_pickle=False) as frozen:
        images = {image.name: image for image in database.read_all_images()}
        for image in images.values():
            keypoints[image.image_id] = database.read_keypoints(image.image_id)
            if image.name in original_names:
                assert np.array_equal(keypoints[image.image_id], frozen[original_names[image.name]["keypointsKey"]])
    pairs = [(f'pano_camera{query_index}/{query["id"]}.jpg', f'pano_camera{fit_index}/{fit["id"]}.jpg')
        for query in report["sources"]["holdout"] for query_index in range(12)
        for fit in report["sources"]["fit"] for fit_index in range(12)]
    assert len(pairs) == 1152
    pair_path = output / "pairs.txt"
    pair_path.write_text("".join(f"{first} {second}\n" for first, second in pairs))
    matching = pycolmap.FeatureMatchingOptions(use_gpu=False, num_threads=2)
    verification = pycolmap.TwoViewGeometryOptions(compute_relative_pose=True)
    verification.ransac.random_seed = 0
    pairing = pycolmap.ImportedPairingOptions(match_list_path=pair_path)
    report["settings"].update({"matching": matching.summary(), "verification": verification.summary(), "pairing": pairing.summary()})
    report["stage"] = "matching"
    write_json(report_path, report)
    pycolmap.match_image_pairs(database_path, matching_options=matching, pairing_options=pairing,
        verification_options=verification, device=pycolmap.Device.cpu)
    candidates = defaultdict(lambda: defaultdict(list))
    with pycolmap.Database.open(database_path) as database:
        for query_name, fit_name in pairs:
            query_image, fit_image = images[query_name], images[fit_name]
            geometry = database.read_two_view_geometry(query_image.image_id, fit_image.image_id)
            matches = geometry.inlier_matches
            report["pairs"].append({"query": query_name, "fit": fit_name, "queryImageId": query_image.image_id,
                "fitImageId": fit_image.image_id, "tentative": len(database.read_matches(query_image.image_id, fit_image.image_id)),
                "verified": len(matches), "configuration": int(geometry.config), "inliers": matches.tolist()})
            for query_index, fit_index in matches:
                point = model_images[fit_name].points2D[int(fit_index)]
                if point.has_point3D():
                    candidates[(query_name, int(query_index))][point.point3D_id].append(
                        {"fitImage": fit_name, "fitFeature": int(fit_index), "frozenImageId": model_images[fit_name].image_id})
    report["stage"] = "pose-localization"
    write_json(report_path, report)
    for query in report["sources"]["holdout"]:
        selected_candidates = {key: values for key, values in candidates.items() if key[0].endswith(query["id"] + ".jpg")}
        unique = {key: next(iter(values)) for key, values in selected_candidates.items() if len(values) == 1}
        multiplicity = Counter((key[0], point_id) for key, point_id in unique.items())
        associations = []
        for (name, feature_index), point_id in sorted(unique.items()):
            if multiplicity[(name, point_id)] != 1:
                continue
            associations.append({"queryImage": name, "queryFeature": feature_index,
                "cameraIndex": int(name.partition("/")[0].removeprefix("pano_camera")),
                "xy": keypoints[images[name].image_id][feature_index, :2].tolist(), "point3DId": int(point_id),
                "xyz": model.point3D(point_id).xyz.tolist(), "supportingMatches": selected_candidates[(name, feature_index)][point_id]})
        result = solve_pose(model, associations, refine_consensus=True)
        report["queries"].append({"sourceId": query["id"], "rank": query["rank"],
            "matchedQueryKeypoints": len(selected_candidates), "conflictingPointIdentities": sum(len(values) != 1 for values in selected_candidates.values()),
            "duplicateQueryAssignmentsRemoved": sum(multiplicity[(key[0], point_id)] != 1 for key, point_id in unique.items()),
            "associations": associations, "pose": result})
        write_json(report_path, report)
    report["stage"] = "complete"
    report["completed"] = True
    report["finishedAt"] = datetime.now(timezone.utc).isoformat()
    report["fittingModelUnchanged"] = all(digest(ORIGINAL / name) == expected for name, expected in report["modelFileHashes"].items())
    report["previousDatabaseUnchanged"] = digest(previous / "features.db") == original_database_hash
    assert report["fittingModelUnchanged"] and report["previousDatabaseUnchanged"]
    report["database"] = identity(database_path)
    write_json(report_path, report)
    print(json.dumps({"completed": True, "output": str(output), "queries": [{"rank": query["rank"],
        "poseRecovered": query["pose"]["poseRecovered"], "eligible": query["pose"]["localizationEligible"],
        "inliers": query["pose"].get("uniqueInliers")} for query in report["queries"]]}))


if __name__ == "__main__":
    main()
