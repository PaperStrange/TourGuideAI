import argparse
from datetime import datetime, timezone
import hashlib
import json
import math
from pathlib import Path

import numpy as np
from pyproj import Transformer, datadir, network


def identity(path, base):
    data = path.read_bytes()
    return {"path": str(path.relative_to(base)), "bytes": len(data), "sha256": hashlib.sha256(data).hexdigest()}


def transform_profile(root, cache, profile_path, diagnostic_path, output):
    network.set_network_enabled(False)
    datadir.append_data_dir(str(cache))
    profile = json.loads(profile_path.read_text())
    diagnostic = json.loads(diagnostic_path.read_text())
    geography_path = root / "experience/src/neighborhoods/shijo-east/geography.json"
    geography = json.loads(geography_path.read_text())
    if profile["coveredSamples"] != profile["sampleCount"] or len(profile["samples"]) != profile["sampleCount"]:
        raise ValueError("Every source profile sample must have a reviewed terrain observation")
    if any(item["pedestrianFloorQualified"] is not False for item in profile["samples"]):
        raise ValueError("Terrain profile diagnostic requires explicit open pedestrian-floor qualification")
    for receipt in diagnostic["gridReceipts"]["records"]:
        actual = identity(cache / receipt["path"], cache)
        if any(actual[key] != receipt[key] for key in ["path", "bytes", "sha256"]):
            raise ValueError("Profile conversion grid identity differs")
    origin = geography["origin"]
    longitude, latitude = map(math.radians, [origin["longitude"], origin["latitude"]])
    rotation = np.array([[-math.sin(longitude), math.cos(longitude), 0],
        [math.cos(latitude) * math.cos(longitude), math.cos(latitude) * math.sin(longitude), math.sin(latitude)],
        [math.sin(latitude) * math.cos(longitude), math.sin(latitude) * math.sin(longitude), -math.cos(latitude)]])
    to_ecef = Transformer.from_crs(4979, 4978, always_xy=True)
    origin_ecef = np.array(to_ecef.transform(origin["longitude"], origin["latitude"], 0, errcheck=True))
    topocentric = Transformer.from_pipeline(f"+proj=pipeline +step +proj=unitconvert +xy_in=deg +xy_out=rad +step +proj=cart +ellps=WGS84 +step +proj=topocentric +ellps=WGS84 +lon_0={origin['longitude']} +lat_0={origin['latitude']} +h_0=0")
    models = []
    for model in diagnostic["models"]:
        conversion = Transformer.from_pipeline(model["definition"])

        def converted(item):
            geographic = conversion.transform(item["longitude"], item["latitude"], item["terrainHeightMetres"], errcheck=True)
            ecef = np.array(to_ecef.transform(*geographic, errcheck=True))
            local = rotation @ (ecef - origin_ecef)
            other = topocentric.transform(*geographic, errcheck=True)
            maximum_error = float(np.abs(local - np.array([other[0], other[2], -other[1]])).max())
            if maximum_error > 1e-8:
                raise ValueError("Recorded local frame differs from independent PROJ topocentric pipeline")
            return {"distanceMetres": item["distanceMetres"], "edgeId": item["edgeId"], "triangleIds": item["triangleIds"],
                "sourceLongitude": item["longitude"], "sourceLatitude": item["latitude"], "originalGravityHeightMetres": item["terrainHeightMetres"],
                "ellipsoidalLongitude": geographic[0], "ellipsoidalLatitude": geographic[1], "ellipsoidalHeightMetres": geographic[2],
                "localEastUpSouthMetres": local.tolist(), "localUpMinusEllipsoidalHeightMetres": float(local[1] - geographic[2]),
                "independentFrameMaximumDifferenceMetres": maximum_error, "pedestrianFloorQualified": False}

        samples = [converted(item) for item in profile["samples"]]
        sights = [{"sightId": item["sightId"], **converted(item)} for item in profile["sights"]]
        models.append({"grid": model["grid"], "definition": model["definition"], "samples": samples, "sights": sights,
            "convertedSampleCount": len(samples), "maximumFrameDifferenceMetres": max(item["independentFrameMaximumDifferenceMetres"] for item in samples),
            "maximumAbsoluteLocalUpHeightDifferenceMetres": max(abs(item["localUpMinusEllipsoidalHeightMetres"]) for item in samples)})
    result = {"schemaVersion": 1, "date": datetime.now(timezone.utc).isoformat(), "status": "diagnostic-complete; source-model-choice-and-pedestrian-ground-unverified",
        "inputs": [identity(path, root) for path in [profile_path, diagnostic_path, geography_path]],
        "sourceSampleCount": profile["sampleCount"], "models": models,
        "localFrame": {"axes": "x east, y up, z south; metres", "origin": origin, "originEllipsoidalHeightMetres": 0,
            "originEcefMetres": origin_ecef.tolist(), "ecefToLocalRotationRows": rotation.tolist(),
            "independentTopocentricPipeline": topocentric.definition},
        "limitations": ["Original terrain samples have no independent pedestrian-floor, bridge-deck, curb or current-access qualification.",
            "Both source model choices are retained; the diagnostic comparison does not choose the source's historical geoid model.",
            "Independent local-frame computation checks numerical placement only; source survey accuracy and horizontal/vertical control remain unverified.",
            "No runtime ground, collision or camera positions are changed."]}
    target = output / "terrain-frame-diagnostic.json"
    target.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n")
    manifest_path = output / "manifest.json"
    manifest = json.loads(manifest_path.read_text())
    common = {key: manifest["files"][0][key] for key in ["source", "rights", "location"]}
    record = {**identity(target, output), **common, "date": result["date"],
        "method": "Explicit source geoid conversion, WGS84 ECEF and local east/up/south projection; every sample checked against PROJ topocentric conversion",
        "limitations": "Source model choice, survey accuracy and pedestrian ground remain unverified; no runtime change."}
    manifest["files"] = [item for item in manifest["files"] if item["path"] != target.name] + [record]
    producer_path = root / "experience/tools/ground-datum/profile.py"
    manifest["producers"] = [item for item in manifest["producers"] if item["path"] != str(producer_path.relative_to(root))]
    manifest["producers"].append(identity(producer_path, root))
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps({"models": len(models), "sourceSamples": profile["sampleCount"], "numericalFrameChecks": sum(item["convertedSampleCount"] for item in models),
        "maximumFrameDifferenceMetres": max(item["maximumFrameDifferenceMetres"] for item in models),
        "maximumLocalUpHeightDifferenceMetres": max(item["maximumAbsoluteLocalUpHeightDifferenceMetres"] for item in models)}))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=Path, required=True)
    parser.add_argument("--cache", type=Path, required=True)
    parser.add_argument("--profile", type=Path, required=True)
    parser.add_argument("--diagnostic", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    transform_profile(args.root.resolve(), args.cache.resolve(), args.profile.resolve(), args.diagnostic.resolve(), args.output.resolve())
