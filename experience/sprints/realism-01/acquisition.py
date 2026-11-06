import hashlib
import json
import math


def verify_acquisition(root, require, verify_file):
    directory = root / "experience/sprints/realism-01/research/acquisition-package"
    manifest = json.loads((directory / "manifest.json").read_text())
    expected_files = {"route-scope.json", "route-scope.geojson", "route-map.png", "contact-receipts.json"}
    require(len(manifest["files"]) == len(expected_files), "Acquisition file count differs")
    require({record["path"] for record in manifest["files"]} == expected_files,
            "Acquisition file inventory differs")
    provenance = {"source", "date", "rights", "location", "method", "limitations"}
    for record in manifest["files"]:
        require(provenance.issubset(record), f"Incomplete acquisition provenance: {record['path']}")
        require(all(isinstance(record[field], str) and record[field].strip() for field in provenance),
                f"Missing acquisition provenance value: {record['path']}")
        verify_file(directory, record)
    require(len(manifest["producers"]) == 1, "Acquisition verification producer count differs")
    producer = manifest["producers"][0]
    require(producer["path"] == "experience/sprints/realism-01/acquisition.py"
            and producer["role"] == "reproducible-verification",
            "Acquisition verification producer identity differs")
    verify_file(root, producer)

    scope = json.loads((directory / "route-scope.json").read_text())
    geojson = json.loads((directory / "route-scope.geojson").read_text())
    geography_name = "experience/src/neighborhoods/shijo-east/geography.json"
    definition_name = "experience/sprints/realism-01/experiments/trial-definitions.json"
    require(len(scope["inputs"]) == 2, "Acquisition input count differs")
    require({record["path"] for record in scope["inputs"]} == {geography_name, definition_name},
            "Acquisition input identity differs")
    for record in scope["inputs"]:
        verify_file(root, record)
    geography_bytes = (root / geography_name).read_bytes()
    geography = json.loads(geography_bytes)
    definition = json.loads((root / definition_name).read_text())
    bound_geography = ((root / definition_name).parent / definition["routeSource"]["path"]).resolve()
    require(bound_geography == (root / geography_name).resolve(), "Acquisition trial geography differs")
    require(hashlib.sha256(geography_bytes).hexdigest() == definition["routeSource"]["sha256"],
            "Acquisition trial source hash differs")

    route = geography["selectedRoute"]
    edge_ids, node_ids = route["edgeIds"], route["nodeIds"]
    require(scope["routeId"] == route["id"] == definition["routeSource"]["routeId"],
            "Acquisition route identity differs")
    require(len(edge_ids) == len(set(edge_ids)) == scope["edgeCount"] == 54,
            "Acquisition requires 54 distinct route edges")
    require(len(node_ids) == scope["nodeCount"] == 55, "Acquisition route node count differs")
    sights = geography["sights"]
    require(len(sights) == len({sight["id"] for sight in sights}) == scope["sightCount"] == 6,
            "Acquisition requires six distinct sights")
    require(math.isclose(scope["routeLengthMetres"], route["lengthMetres"], rel_tol=0, abs_tol=1e-9),
            "Acquisition route length differs")
    navigation_edges = geography["navigation"]["edges"]
    require(len({edge["id"] for edge in navigation_edges}) == len(navigation_edges),
            "Acquisition source edge identities are ambiguous")
    edges = {edge["id"]: edge for edge in navigation_edges}
    source_length = sum(edges[edge_id]["lengthMetres"] for edge_id in edge_ids)
    require(math.isclose(source_length, route["lengthMetres"], rel_tol=0, abs_tol=1e-9),
            "Acquisition source edge lengths differ from the complete route")

    trials = {trial["id"]: trial for trial in definition["trials"]}
    expected_packages = {}
    for trial_id in ("T01", "T02", "T03"):
        start, end = trials[trial_id]["nodeIndexRangeInclusive"]
        expected_packages[trial_id] = (start + 1, end)
    expected_packages["C01"] = (expected_packages["T02"][1] + 1, expected_packages["T03"][0] - 1)
    packages = scope["packages"]
    require([package["id"] for package in packages] == ["T01", "T02", "C01", "T03"],
            "Acquisition package order differs")
    partition = [edge_id for package in packages for edge_id in package["edgeIds"]]
    require(partition == edge_ids and len(set(partition)) == len(partition),
            "Acquisition packages must cover the ordered route once")
    package_by_edge = {}
    for package in packages:
        first, last = expected_packages[package["id"]]
        require(1 <= first <= last <= len(edge_ids), f"Invalid acquisition range: {package['id']}")
        require((package["firstEdgeOrdinal"], package["lastEdgeOrdinal"]) == (first, last),
                f"Acquisition package range differs from trials: {package['id']}")
        require(package["edgeIds"] == edge_ids[first - 1:last],
                f"Acquisition package edges differ: {package['id']}")
        length = sum(edges[edge_id]["lengthMetres"] for edge_id in package["edgeIds"])
        require(math.isclose(package["lengthMetres"], length, rel_tol=0, abs_tol=1e-9),
                f"Acquisition package length differs: {package['id']}")
        package_by_edge.update({edge_id: package["id"] for edge_id in package["edgeIds"]})

    require(geojson["type"] == "FeatureCollection", "Acquisition GeoJSON collection type differs")
    require(geojson["attribution"] == scope["rights"], "Acquisition route attribution differs")
    features = geojson["features"]
    require(len(features) == 60, "Acquisition GeoJSON feature count differs")
    require(all(feature["type"] == "Feature" for feature in features), "Invalid acquisition GeoJSON feature")
    edge_features, sight_features = features[:54], features[54:]
    require([feature["id"] for feature in edge_features] == edge_ids, "Acquisition GeoJSON edge order differs")
    require([feature["id"] for feature in sight_features] == [sight["id"] for sight in sights],
            "Acquisition GeoJSON sight order differs")
    require(scope["sights"] == sight_features, "Acquisition sight inventories differ")
    frame = geography["frame"]
    point_count = 0
    previous_endpoint = None
    coverage = ["both-visible-sides", "pavement-and-thresholds", "forward-and-reverse", "daylight-and-night"]
    for index, feature in enumerate(edge_features):
        edge = edges[feature["id"]]
        start, end = node_ids[index:index + 2]
        require({edge["from"], edge["to"]} == {start, end}, f"Disconnected acquisition edge: {edge['id']}")
        points = edge["points"] if edge["from"] == start else list(reversed(edge["points"]))
        expected_coordinates = [[frame["origin"]["longitude"] + point["x"] / frame["metresPerDegreeLon"],
                                 frame["origin"]["latitude"] + point["y"] / frame["metresPerDegreeLat"]]
                                for point in points]
        geometry, properties = feature["geometry"], feature["properties"]
        require(geometry["type"] == "LineString", f"Invalid acquisition edge geometry: {edge['id']}")
        require(geometry["coordinates"] == expected_coordinates,
                f"Acquisition intermediate polyline points or direction differ: {edge['id']}")
        require(all(math.isfinite(value) for point in expected_coordinates for value in point),
                f"Non-finite acquisition coordinate: {edge['id']}")
        require(properties["kind"] == "capture-edge" and properties["ordinal"] == index + 1,
                f"Acquisition edge kind or ordinal differs: {edge['id']}")
        require((properties["fromNodeId"], properties["toNodeId"]) == (start, end),
                f"Acquisition edge orientation differs: {edge['id']}")
        require(properties["packageId"] == package_by_edge[edge["id"]],
                f"Acquisition GeoJSON package differs: {edge['id']}")
        require(properties["lengthMetres"] == edge["lengthMetres"] and properties["sourceId"] == edge.get("sourceId"),
                f"Acquisition GeoJSON source fields differ: {edge['id']}")
        require(properties["currentAccess"] == "unverified" and properties["heightStatus"] == "not-supplied",
                f"Acquisition geometry qualification changed: {edge['id']}")
        require(properties["requiredCoverage"] == coverage, f"Acquisition coverage requirements differ: {edge['id']}")
        if previous_endpoint is not None:
            require(expected_coordinates[0] == previous_endpoint, f"Acquisition polyline discontinuity: {edge['id']}")
        previous_endpoint = expected_coordinates[-1]
        point_count += len(expected_coordinates)

    for index, (feature, sight) in enumerate(zip(sight_features, sights)):
        properties, geometry = feature["properties"], feature["geometry"]
        require(geometry == {"type": "Point", "coordinates": [sight["longitude"], sight["latitude"]]},
                f"Acquisition sight coordinates differ: {sight['id']}")
        require(properties["kind"] == "sight-approach" and properties["ordinal"] == index + 1,
                f"Acquisition sight kind or ordinal differs: {sight['id']}")
        require(properties["nodeId"] == sight["nodeId"] and properties["routeNodeIndex"] == node_ids.index(sight["nodeId"]),
                f"Acquisition sight node differs: {sight['id']}")
        require(properties["positionOrigin"] == sight["positionOrigin"] and properties["currentAccess"] == "unverified",
                f"Acquisition sight qualification changed: {sight['id']}")

    return {"fileHashes": len(manifest["files"]), "inputHashes": len(scope["inputs"]),
            "producerHashes": len(manifest["producers"]),
            "routeEdges": len(edge_ids), "sights": len(sights), "packages": len(packages),
            "preservedPolylinePoints": point_count, "lengthMetres": source_length,
            "limitations": "Source identity and quotation extent only; no supplier response or physical-source acceptance."}
