import argparse
from collections import defaultdict
import gzip
import hashlib
import json
import math
from pathlib import Path


def require(condition, message):
    if not condition:
        raise ValueError(message)


def check_identity(path, record):
    data = path.read_bytes()
    require(len(data) == record["bytes"] and hashlib.sha256(data).hexdigest() == record["sha256"], f"Identity differs: {path}")
    if "decodedSha256" in record:
        decoded = gzip.decompress(data)
        require(len(decoded) == record["decodedBytes"] and hashlib.sha256(decoded).hexdigest() == record["decodedSha256"], f"Decoded identity differs: {path}")


def check_statistics(rows, field, recorded):
    area = sum(row[field] for row in rows)
    mapped = [row for row in rows if row["textured"] and row[field] > 0]
    mapped_area = sum(row[field] for row in mapped)
    require(math.isclose(area, recorded["surfaceAreaSquareMetres"], rel_tol=1e-10, abs_tol=1e-8), "Surface area differs")
    require(math.isclose(mapped_area, recorded["texturedSurfaceAreaSquareMetres"], rel_tol=1e-10, abs_tol=1e-8), "Textured area differs")
    require(sum(row[field] > 0 for row in rows) == recorded["trianglesWithArea"], "Triangle area count differs")
    require(len(mapped) == recorded["texturedTrianglesWithArea"], "Textured triangle count differs")
    if area:
        require(math.isclose(mapped_area / area, recorded["texturedAreaFraction"], rel_tol=1e-10), "Area fraction differs")
    else:
        require(recorded["texturedAreaFraction"] is None, "Zero-area fraction must be absent")
    for metric in ["minimumTexelsPerMetre", "maximumTexelsPerMetre", "geometricMeanTexelsPerMetre"]:
        pairs = sorted((row[metric], row[field]) for row in mapped)
        for quantile, fraction in [("p10", .1), ("p50", .5), ("p90", .9)]:
            actual = None
            cumulative = 0
            for value, weight in pairs:
                cumulative += weight
                if cumulative >= mapped_area * fraction:
                    actual = value
                    break
            expected = recorded["areaWeighted"][metric][quantile]
            require(actual == expected, f"Weighted density differs: {metric}/{quantile}")


def verify(root):
    folder = root / "experience/evidence/realism-01/qualification/texture"
    manifest = json.loads((folder / "manifest.json").read_text())
    for record in manifest["files"]:
        check_identity(folder / record["path"], record)
    for record in manifest["producers"]:
        check_identity(root / record["path"], record)
    report = json.loads((folder / "texture-density.json").read_text())
    for record in report["inputs"]:
        check_identity(root / record["path"], record)
    geometry = folder.parent / "geometry"
    audit = json.loads((geometry / "geometry-audit.json").read_text())
    review = json.loads((geometry / "review-manifest.json").read_text())
    receipts = {item["id"]: item for item in json.loads((geometry / "download-receipts.json").read_text())["records"]}
    properties = {item["id"]: item["properties"] for item in json.loads(gzip.decompress((geometry / "objects.geojson.gz").read_bytes()))["features"]}
    near = defaultdict(set)
    for edge in audit["edges"]:
        for match in edge["matches"]:
            if match["category"] == "building" and match["selectedForReview"]:
                near[match["objectId"]].add(edge["ordinal"])
    require(report["sourceSelection"] == review["contentSelection"], "Selected source inventory differs")
    require(set(near) == {item["objectId"] for item in report["objects"]}, "Route-near identities differ")
    require(len(near) == report["nearRouteSelectedBuildings"], "Route-near count differs")
    models = {item["id"]: item for item in review["models"]}
    original_rechecks = 0
    for source in report["decodedSources"]:
        receipt, model = receipts[source["id"]], models[source["id"]]
        require(source["bytes"] == receipt["bytes"] and source["sha256"] == model["sourceSha256"], "Original source identity differs")
        require(source["source"] == receipt["source"], "Original source attribution differs")
        require(Path(source["path"]).name == receipt["file"], "Original source filename differs")
        if (root / source["path"]).exists():
            check_identity(root / source["path"], source)
            original_rechecks += 1
    require({item["id"] for item in report["decodedSources"]} == {properties[key]["sourceTileId"] for key in near}, "Decoded source set differs")
    rows = json.loads(gzip.decompress((folder / "triangle-measurements.json.gz").read_bytes()))
    require(len(rows) == report["verticalTriangleCount"], "Vertical triangle count differs")
    require(len({(row["objectId"], row["primitive"], row["face"]) for row in rows}) == len(rows), "Duplicate triangle identity")
    grouped = defaultdict(list)
    for row in rows:
        require(row["objectId"] in near, "Unselected row identity")
        require(0 <= row["lowerBandAreaSquareMetres"] <= row["worldAreaSquareMetres"], "Invalid clipped area")
        require(row["absoluteNormalUp"] <= report["classification"]["verticalAbsoluteNormalUpMaximum"], "Invalid vertical classification")
        if row["textured"]:
            low, high, mean = [row[key] for key in ["minimumTexelsPerMetre", "maximumTexelsPerMetre", "geometricMeanTexelsPerMetre"]]
            require(0 <= low <= high and all(math.isfinite(value) for value in [low, high, mean]), "Invalid density")
            require(math.isclose(low * high, mean * mean, rel_tol=1e-5, abs_tol=1e-8), "Geometric mean differs")
            require(math.isclose(low * high, row["uvPixelArea"] / row["worldAreaSquareMetres"], rel_tol=1e-5, abs_tol=1e-8), "Pixel/physical area ratio differs")
            if low > 1e-12:
                require(math.isclose(row["anisotropy"], high / low, rel_tol=1e-10), "Anisotropy differs")
        grouped[row["objectId"]].append(row)
    source_triangles = 0
    for item in report["objects"]:
        key = item["objectId"]
        prop = properties[key]
        require(prop["selectedForReview"] and prop["category"] == "building", "Object must be a selected building")
        require(prop["batchIndex"] in models[prop["sourceTileId"]]["selectedBatchIds"], "Unselected source batch")
        require(item["edgeOrdinals"] == sorted(near[key]), "Route edges differ")
        require(item["gmlId"] == prop["gmlId"] and item["lod"] == prop["lod"], "Object identity differs")
        require(item["sourceTriangles"] == prop["triangles"] and item["texturedSourceTriangles"] == prop["texturedTriangles"], "Source geometry count differs")
        require(item["visibleFrontageQualified"] is False, "Frontage visibility has no qualification evidence")
        source_triangles += item["sourceTriangles"]
        check_statistics(grouped[key], "worldAreaSquareMetres", item["verticalSurface"])
        check_statistics(grouped[key], "lowerBandAreaSquareMetres", item["lowerEightMetresSourceRelative"])
    require(source_triangles == report["nearRouteSelectedTriangleCount"], "Source triangle total differs")
    check_statistics(rows, "worldAreaSquareMetres", report["aggregateVerticalSurface"])
    check_statistics(rows, "lowerBandAreaSquareMetres", report["aggregateLowerEightMetres"])
    mitsui = [item for item in report["objects"] if item["gmlId"] == "bldg_d4824084-63c9-4d60-8320-30b3f2e440b9"]
    require(mitsui == [report["mitsui"]], "Exact Mitsui source differs")
    camera = report["frontParallelSamplingReference"]
    for distance in [5, 10]:
        expected = camera["viewport"][1] / (2 * math.tan(math.radians(camera["verticalFieldOfViewDegrees"] / 2)) * distance)
        require(math.isclose(camera[f"pixelsPerMetreAt{distance}Metres"], expected), "Camera sampling reference differs")
    print(json.dumps({"status": "passed", "files": len(manifest["files"]), "producers": len(manifest["producers"]),
        "sources": len(report["decodedSources"]), "originalSourcesRechecked": original_rechecks,
        "objects": len(near), "verticalTriangles": len(rows), "rawCacheRequiredForRetainedValidation": False}))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=Path, required=True)
    args = parser.parse_args()
    verify(args.root.resolve())
