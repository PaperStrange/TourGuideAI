import argparse
from datetime import datetime, timezone
import gzip
import hashlib
import json
import math
from pathlib import Path
import statistics
from urllib.request import Request, urlopen

import pyproj
from pyproj import datadir, network
from pyproj.aoi import AreaOfInterest
from pyproj.enums import TransformDirection
from pyproj.transformer import TransformerGroup


GRID_NAMES = ["jp_gsi_gsigeo2011.tif", "jp_gsi_jpgeo2024.tif"]
CAP_BYTES = 64 * 1024 * 1024


def identity(path, base):
    data = path.read_bytes()
    return {"path": str(path.relative_to(base)), "bytes": len(data), "sha256": hashlib.sha256(data).hexdigest()}


def write(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n")


def acquire(cache):
    cache.mkdir(parents=True, exist_ok=True)
    receipt_path = cache / "download-receipts.json"
    if receipt_path.exists():
        receipts = json.loads(receipt_path.read_text())
        for record in receipts["records"]:
            if identity(cache / record["path"], cache) != {key: record[key] for key in ["path", "bytes", "sha256"]}:
                raise ValueError(f"Cached grid source differs: {record['path']}")
        return receipts
    records, total = [], 0
    for name in ["jp_gsi_README.txt", *GRID_NAMES]:
        source = "https://cdn.proj.org/" + name
        request = Request(source, headers={"User-Agent": "TourGuideAI-ground-datum-review/1.0", "Accept-Encoding": "identity"})
        with urlopen(request, timeout=60) as response:
            if response.status != 200 or response.headers.get("Content-Encoding") not in [None, "identity"]:
                raise ValueError("Expected complete original source bytes without HTTP compression")
            data = response.read(CAP_BYTES - total + 1)
            total += len(data)
            if total > CAP_BYTES:
                raise ValueError("Grid/source acquisition exceeds 64 MiB combined limit")
            (cache / name).write_bytes(data)
            records.append({**identity(cache / name, cache), "source": source,
                "date": datetime.now(timezone.utc).isoformat(), "rights": "CC BY 4.0; Geospatial Information Authority of Japan / PROJ-data conversion; permission references in jp_gsi_README.txt",
                "location": "Japan geoid models, sampled at Kyoto Shijo East source coordinates",
                "method": "Complete original HTTPS response, inherited proxy/CA and verified TLS; combined acquisition limited to 64 MiB",
                "limitations": "Model license and availability establish no historical model choice for a source dataset or surveyed pedestrian ground.",
                "httpStatus": response.status, "contentType": response.headers.get("Content-Type"),
                "contentLength": response.headers.get("Content-Length"), "lastModified": response.headers.get("Last-Modified")})
    receipts = {"date": datetime.now(timezone.utc).isoformat(), "capBytes": CAP_BYTES, "acquiredBytes": total, "records": records}
    write(receipt_path, receipts)
    return receipts


def distribution(values):
    ordered = sorted(values)
    return {"count": len(values), "minimumMetres": ordered[0], "medianMetres": statistics.median(ordered),
            "maximumMetres": ordered[-1], "absoluteP95Metres": sorted(abs(value) for value in values)[math.ceil(.95 * len(values)) - 1]}


def inspect(root, cache, output):
    receipts = acquire(cache)
    network.set_network_enabled(False)
    datadir.append_data_dir(str(cache))
    group = TransformerGroup(6697, 4979, always_xy=True, area_of_interest=AreaOfInterest(135.75, 35.0, 135.78, 35.01), allow_ballpark=False)
    transforms = {name: next(transform for transform in group.transformers if name in transform.definition) for name in GRID_NAMES}
    geography_path = root / "experience/src/neighborhoods/shijo-east/geography.json"
    geometry_path = root / "experience/evidence/realism-01/qualification/geometry/objects.geojson.gz"
    metadata_path = root / "experience/evidence/realism-01/qualification/ground/road-ground-audit.json"
    geography = json.loads(geography_path.read_text())
    features = json.loads(gzip.decompress(geometry_path.read_bytes()))["features"]
    properties = [feature["properties"] for feature in features if feature["properties"]["selectedForReview"]
                  and feature["properties"]["category"] == "building"
                  and all(value is not None for value in feature["properties"]["sourceHeightRangeMetres"])]
    models = []
    for name, transform in transforms.items():
        anchors = []
        for sight in geography["sights"]:
            longitude, latitude = sight["longitude"], sight["latitude"]
            result = transform.transform(longitude, latitude, 0, errcheck=True)
            inverse = transform.transform(*result, direction=TransformDirection.INVERSE, errcheck=True)
            if max(abs(inverse[index] - value) for index, value in enumerate([longitude, latitude, 0])) > 1e-8:
                raise ValueError("Declared transform failed source-anchor round-trip")
            anchors.append({"sightId": sight["id"], "longitude": longitude, "latitude": latitude,
                "ellipsoidalHeightAtDiagnosticZeroGravityHeightMetres": result[2],
                "roundTripMaximumAbsoluteError": max(abs(inverse[index] - value) for index, value in enumerate([longitude, latitude, 0])),
                "heightMeaning": "Geoid model evaluation at mathematical H=0 reference; no ground height is assigned"})
        residuals = []
        for item in properties:
            longitude, latitude = item["sourcePointDegrees"]
            converted = [transform.transform(longitude, latitude, height, errcheck=True)[2] for height in item["sourceHeightRangeMetres"]]
            residuals.append({"gmlId": item["gmlId"], "lod": item["lod"], "source": item["source"],
                "sourcePointDegrees": item["sourcePointDegrees"], "originalGravityHeightRangeMetres": item["sourceHeightRangeMetres"],
                "decodedEllipsoidalHeightRangeMetres": item["heightRangeEllipsoidalMetres"], "convertedRangeAtSourcePointMetres": converted,
                "lowerExtremumResidualMetres": item["heightRangeEllipsoidalMetres"][0] - converted[0],
                "upperExtremumResidualMetres": item["heightRangeEllipsoidalMetres"][1] - converted[1]})
        summaries = [{"lod": lod,
            "lowerExtremum": distribution([item["lowerExtremumResidualMetres"] for item in residuals if item["lod"] == lod]),
            "upperExtremum": distribution([item["upperExtremumResidualMetres"] for item in residuals if item["lod"] == lod])}
            for lod in sorted({item["lod"] for item in residuals})]
        models.append({"grid": name, "description": transform.description, "accuracyMetres": transform.accuracy,
            "definition": transform.definition, "projjson": transform.to_json_dict(), "anchors": anchors,
            "buildingExtremumResiduals": residuals, "residualDistributions": summaries})
    report = {"date": datetime.now(timezone.utc).isoformat(), "status": "diagnostic-complete; source-model-choice-unresolved",
        "sourceCRS": pyproj.CRS(6697).to_json_dict(), "targetCRS": pyproj.CRS(4979).to_json_dict(),
        "pyprojVersion": pyproj.__version__, "projVersion": pyproj.proj_version_str,
        "inputs": [identity(path, root) for path in [geography_path, geometry_path, metadata_path]],
        "gridReceipts": receipts, "availableNonBallparkTransforms": len(group.transformers), "models": models,
        "registration": {"pedestrianGroundQualified": False, "runtimeTransformApplied": False, "sourceEpochQualified": False},
        "limitations": ["Both historical and current geoid models are diagnostics; model choice for each original dataset remains unresolved.",
            "Source extrema and decoded mesh extrema need not refer to the same vertex; evaluation at source object point adds spatial sampling differences. Residual distributions are not survey-control accuracy.",
            "H=0 at route anchors is the mathematical geoid evaluation reference, not an invented pedestrian surface.",
            "WGS84 ensemble output and JGD2011 horizontal operation accuracy do not establish sub-metre cadastral or entrance alignment.",
            "The local Three frame uses ECEF from WGS84 ellipsoidal coordinates with origin height zero; neither model is applied to runtime in this diagnostic."]}
    output.mkdir(parents=True, exist_ok=True)
    write(output / "datum-diagnostic.json", report)
    for name in ["jp_gsi_README.txt", "download-receipts.json"]:
        (output / name).write_bytes((cache / name).read_bytes())
    common = {"source": "Original GSI / PROJ-data grids and retained Kyoto PLATEAU source geometry; exact sources/hashes in download-receipts.json and datum-diagnostic.json",
        "date": report["date"], "rights": "CC BY 4.0; Geospatial Information Authority of Japan / PROJ-data; Kyoto City / MLIT Project PLATEAU; derived diagnostic attributed to TourGuideAI",
        "location": "Kyoto Shijo East six sight anchors and acquired source building objects",
        "method": "Explicit PyProj geoid transformations with pinned grid identity, source-height extrema diagnostics and inverse round-trip checks",
        "limitations": "Source epoch/model choice and surveyed pedestrian ground remain unverified; no runtime transformation or physical acceptance."}
    manifest = {"schemaVersion": 1, "files": [{**common, **identity(output / name, output)} for name in
                ["datum-diagnostic.json", "jp_gsi_README.txt", "download-receipts.json"]],
        "producers": [identity(path, root) for path in [root / "experience/tools/ground-datum/diagnose.py", root / "experience/tools/ground-datum/requirements.txt"]]}
    write(output / "manifest.json", manifest)
    print(json.dumps({"models": len(models), "sourceBuildings": len(properties), "acquiredBytes": receipts["acquiredBytes"],
        "anchorGeoidDifferenceMetres": [models[1]["anchors"][index]["ellipsoidalHeightAtDiagnosticZeroGravityHeightMetres"] - item["ellipsoidalHeightAtDiagnosticZeroGravityHeightMetres"]
                                      for index, item in enumerate(models[0]["anchors"])]}))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=Path, required=True)
    parser.add_argument("--cache", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    inspect(args.root.resolve(), args.cache.resolve(), args.output.resolve())
