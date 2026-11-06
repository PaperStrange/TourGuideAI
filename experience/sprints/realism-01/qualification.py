import gzip
import hashlib
import json
import xml.etree.ElementTree as ET


def verify_qualification(root, require, verify_file, route):
    base = root / "experience/evidence/realism-01/qualification"
    required = {"path", "source", "date", "rights", "location", "method", "limitations", "sha256", "bytes"}
    file_count = producer_count = 0
    for path in sorted(base.glob("*/manifest.json")):
        manifest = json.loads(path.read_text())
        require(len({record["path"] for record in manifest["files"]}) == len(manifest["files"]),
                f"Duplicate evidence paths: {path}")
        for record in manifest["files"]:
            require(required.issubset(record) and all(record[field] for field in required),
                    f"Incomplete qualification provenance: {path} / {record.get('path')}")
            verify_file(path.parent, record)
            if "decodedSha256" in record:
                decoded = gzip.decompress((path.parent / record["path"]).read_bytes())
                require(len(decoded) == record["decodedBytes"] and
                        hashlib.sha256(decoded).hexdigest() == record["decodedSha256"], "Decoded evidence differs")
            file_count += 1
        for record in manifest.get("producers", []):
            verify_file(root, record)
            producer_count += 1
        for record in manifest.get("processing", []):
            require(hashlib.sha256((path.parent / record["path"]).read_bytes()).hexdigest() == record["sha256"],
                    f"Processing source changed: {record['path']}")
            producer_count += 1

    def read(path):
        return json.loads((base / path).read_text())

    objects = json.loads(gzip.decompress((base / "geometry/objects.geojson.gz").read_bytes()))
    features = {feature["id"]: feature for feature in objects["features"]}
    require(len(features) == len(objects["features"]), "Duplicate source occurrence IDs")
    selection = read("geometry/content-selection.json")
    review = read("geometry/review-manifest.json")
    audit = read("geometry/geometry-audit.json")
    receipts = read("geometry/download-receipts.json")
    inventory = read("geometry/inventory.json")
    source_records = {record["source"]: record for record in receipts["records"]}
    selected = {key: feature["properties"] for key, feature in features.items()
                if feature["properties"]["selectedForReview"]}
    require(selection["sourceOccurrences"] == audit["sourceObjects"] == len(features), "Source occurrence count differs")
    require(selection["selectedOccurrences"] == review["contentSelection"]["selectedOccurrences"] == len(selected),
            "Selected occurrence count differs")
    require(selection["excludedOccurrences"] == len(features) - len(selected) == len(selection["alternatives"]),
            "Excluded occurrence count differs")
    require(selection["ambiguous"] == [] and review["contentSelection"]["ambiguousOccurrences"] == 0,
            "Source alternatives remain unresolved")
    require({item["source"] for item in inventory["records"]} == set(source_records), "Acquisition inventory differs")
    for alternative in selection["alternatives"]:
        chosen, excluded = features[alternative["selected"]]["properties"], features[alternative["alternative"]]["properties"]
        require(chosen["selectedForReview"] and not excluded["selectedForReview"], "Invalid source exclusion")
        require(chosen["gmlId"] == excluded["gmlId"] == alternative["gmlId"], "Exclusion crosses object identity")
        require(excluded["representedBy"] == alternative["selected"], "Exclusion representative differs")
        if alternative["replacementAncestorChain"]:
            ancestors = []
            parent = source_records[chosen["source"]]["parentContent"]
            while parent in source_records and source_records[parent]["refine"] == "REPLACE":
                require(parent not in ancestors, "Source ancestry cycle")
                ancestors.append(parent)
                parent = source_records[parent]["parentContent"]
            require(ancestors == alternative["replacementAncestorChain"] and excluded["source"] in ancestors,
                    "Source replacement ancestry differs")
            require(alternative["projectedIntersectionOverUnion"] > 0 and alternative["heightIntersectionOverUnion"] > 0,
                    "Excluded source lacks measured overlap")
    require(audit["sourceDownloads"] == len(receipts["records"]) == len(review["models"]), "Source tile count differs")
    require(audit["sourceBytes"] == sum(item["bytes"] for item in receipts["records"]), "Source byte count differs")
    require(audit["sourceTriangles"] == sum(feature["properties"]["triangles"] for feature in features.values()),
            "Original triangle count differs")
    require(review["contentSelection"]["selectedTriangles"] == sum(item["triangles"] for item in selected.values()),
            "Selected triangle count differs")
    for model in review["models"]:
        items = [item for item in selected.values() if item["sourceTileId"] == model["id"]]
        require(model["selectedBatchIds"] == [item["batchIndex"] for item in items], "Model batch selection differs")
        require(model["selectedTriangles"] == sum(item["triangles"] for item in items), "Model triangle selection differs")
        require(model["sourceSha256"] == source_records[model["source"]]["sha256"], "Model original identity differs")
    require(audit["sourceModels"] == review["models"], "Geometry and viewer model inventories differ")
    require([edge["id"] for edge in audit["edges"]] == route["edgeIds"], "Geometry edge order differs")
    for edge in audit["edges"]:
        require(all(edge[key] == "unverified" for key in ["appearanceStatus", "groundStatus", "lightingStatus"]),
                "Geometry index cannot establish production qualification")
        for match in edge["matches"]:
            require(match["selectedForReview"] == features[match["objectId"]]["properties"]["selectedForReview"],
                    "Edge selection flag differs")

    browser = read("views/result.json")
    bound = dict(browser["inputManifest"], path="geometry/review-manifest.json")
    verify_file(base, bound)
    for producer in browser["toolSources"]:
        verify_file(root, producer)
    require(browser["completed"] and len(browser["captures"]) == 18, "Incomplete source capture run")
    require(len(browser["initial"]["loaded"]) == len(review["models"]), "Browser model count differs")
    loaded = {model["id"]: model for model in browser["initial"]["loaded"]}
    for model in review["models"]:
        observed = loaded[model["id"]]
        require(observed["triangles"] == model["selectedTriangles"] and observed["sha256"] == model["sha256"],
                "Browser model identity/triangles differ")
    pairs = set()
    incomplete = []
    for capture in browser["captures"]:
        verify_file(base / "views", capture)
        pose = capture["observation"]["pose"]
        pairs.add((pose["sightId"], pose["pose"]))
        require(pose["heightQualified"] is False, "Source view cannot claim surveyed ground")
        if (capture["observation"]["render"]["triangles"] == 0 or
                capture["pixels"]["distinctColorBins"] <= 5 or capture["pixels"]["dominantFraction"] >= .995):
            incomplete.append(capture["path"])
    require(pairs == {(sight["id"], pose) for sight in review["sights"] for pose in ["approach", "reverse", "overview"]},
            "Source capture pose coverage differs")
    visibility = next(check for check in browser["checks"] if check["id"] == "all-captures-have-visible-source-content")
    require(visibility["incompleteCaptures"] == incomplete and visibility["pass"] == (len(incomplete) == 0),
            "Visible-content outcome differs from retained observations")

    landmarks = read("landmarks/landmark-correspondence.json")
    for record in landmarks["inputs"]:
        verify_file(root, record)
    require({sight["sightId"] for sight in landmarks["sights"]} == {sight["id"] for sight in review["sights"]},
            "Landmark sight inventory differs")
    for sight in landmarks["sights"]:
        for candidate in sight["candidates"]:
            source = selected[candidate["objectId"]]
            require(source["gmlId"] == candidate["gmlId"], "Landmark candidate source differs")
            if candidate["relationship"] == "same-source-object":
                require(source["gmlId"] == sight["retainedGmlId"], "Landmark identity differs")
        require(all(sight[key] == "unverified" for key in ["appearanceStatus", "entranceStatus", "groundStatus", "nightLightingStatus"]),
                "Source identity cannot establish appearance/ground qualification")
    ground = read("ground/road-ground-audit.json")
    verify_file(root, ground["route"])
    require([edge["id"] for edge in ground["edges"]] == route["edgeIds"], "Ground edge order differs")
    dem = read("dem/dem-envelope-audit.json")
    for record in dem["records"]:
        verify_file(base / "dem", record)
        parser = ET.XMLPullParser(["end"])
        parser.feed((base / "dem" / record["path"]).read_bytes())
        envelopes = [element for _, element in parser.read_events() if element.tag == "{http://www.opengis.net/gml}Envelope"]
        require(len(envelopes) == 1, "DEM prefix must contain one complete envelope")
        for tag, field in [("lowerCorner", "sourceLowerLatLonHeight"), ("upperCorner", "sourceUpperLatLonHeight")]:
            actual = [float(value) for value in envelopes[0].find("{http://www.opengis.net/gml}" + tag).text.split()]
            require(actual == record[field], "DEM source envelope differs")
    return {"fileHashes": file_count, "producerHashes": producer_count, "sourceOccurrences": len(features),
            "selectedOccurrences": len(selected), "routeEdges": len(audit["edges"]), "browserCaptures": len(browser["captures"]),
            "retainedFailingBrowserChecks": [check["id"] for check in browser["checks"] if not check["pass"]],
            "limitations": "Integrity and cross-evidence consistency only; failing source diagnostics remain failures."}
