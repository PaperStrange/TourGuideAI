import argparse
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path

from osgeo import gdal


def identity(path, base):
    data = path.read_bytes()
    return {"path": str(path.relative_to(base)), "bytes": len(data), "sha256": hashlib.sha256(data).hexdigest()}


def verify(root, cache, output):
    gdal.UseExceptions()
    path = output / "datum-diagnostic.json"
    report = json.loads(path.read_text())
    for receipt in report["gridReceipts"]["records"]:
        actual = identity(cache / receipt["path"], cache)
        if any(actual[key] != receipt[key] for key in ["path", "bytes", "sha256"]):
            raise ValueError("Independent grid verification source differs")
    records = []
    for model in report["models"]:
        grid_path = cache / model["grid"]
        dataset = gdal.Open(str(grid_path))
        band = dataset.GetRasterBand(1)
        if band.GetUnitType() != "metre" or band.GetDescription() != "geoid_undulation":
            raise ValueError("Unexpected original geoid grid band meaning")
        inverse = gdal.InvGeoTransform(dataset.GetGeoTransform())
        checks = []
        for anchor in model["anchors"]:
            pixel = gdal.ApplyGeoTransform(inverse, anchor["longitude"], anchor["latitude"])
            sampled = band.InterpolateAtPoint(*pixel, gdal.GRIORA_Bilinear)
            if sampled is None:
                raise ValueError("GDAL source grid interpolation unavailable")
            expected = anchor["ellipsoidalHeightAtDiagnosticZeroGravityHeightMetres"]
            error = sampled - expected
            if abs(error) > 1e-8:
                raise ValueError("Independent GDAL sample differs from explicit PROJ pipeline")
            checks.append({"sightId": anchor["sightId"], "pixelCoordinates": pixel,
                "gdalGeoidUndulationMetres": sampled, "projGeoidUndulationMetres": expected, "differenceMetres": error})
        records.append({"grid": model["grid"], "identity": identity(grid_path, cache),
            "originalMetadata": dataset.GetMetadata(), "sourceGeotransform": dataset.GetGeoTransform(), "checks": checks})
    result = {"date": datetime.now(timezone.utc).isoformat(), "status": "passed", "gdalVersion": gdal.__version__,
        "report": identity(path, output), "models": records, "anchorChecks": sum(len(record["checks"]) for record in records),
        "method": "GDAL 3.10.3 GeoTIFF loading, inverse geotransform and native bilinear interpolation compared with explicitly selected PROJ pipelines",
        "limitations": "Independent software agreement on the same geoid inputs; no source epoch, survey accuracy, ground/collision or runtime acceptance."}
    target = output / "independent-grid-check.json"
    target.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n")
    manifest_path = output / "manifest.json"
    manifest = json.loads(manifest_path.read_text())
    common = {key: manifest["files"][0][key] for key in ["source", "rights", "location"]}
    record = {**identity(target, output), **common, "date": result["date"], "method": result["method"], "limitations": result["limitations"]}
    manifest["files"] = [item for item in manifest["files"] if item["path"] != target.name] + [record]
    paths = [root / "experience/tools/ground-datum/verify-grid.py", root / "experience/tools/ground-datum/requirements-gdal.txt"]
    manifest["producers"] = [item for item in manifest["producers"] if item["path"] not in [str(path.relative_to(root)) for path in paths]]
    manifest["producers"].extend(identity(path, root) for path in paths)
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps({"status": result["status"], "independentAnchorChecks": result["anchorChecks"],
        "maximumDifferenceMetres": max(abs(check["differenceMetres"]) for record in records for check in record["checks"])}))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=Path, required=True)
    parser.add_argument("--cache", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    verify(args.root.resolve(), args.cache.resolve(), args.output.resolve())
