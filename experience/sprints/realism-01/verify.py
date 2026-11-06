import argparse
import gzip
import hashlib
import json
from pathlib import Path
from urllib.parse import unquote, urlsplit

from markdown_it import MarkdownIt
from acquisition import verify_acquisition
from qualification import verify_qualification


def require(condition, message):
    if not condition:
        raise ValueError(message)


def verify_file(base, record, path_key="path"):
    path = base / record[path_key]
    data = path.read_bytes()
    require(hashlib.sha256(data).hexdigest() == record["sha256"], f"Hash mismatch: {path}")
    require(len(data) == record["bytes"], f"Byte count mismatch: {path}")


def tokens_recursive(tokens):
    for token in tokens:
        yield token
        yield from tokens_recursive(token.children or [])


def verify(root):
    sprint = root / "experience/sprints/realism-01"
    evidence = root / "experience/evidence/realism-01"
    parser = MarkdownIt("commonmark").enable("table")
    documents = sorted(sprint.rglob("*.md")) + sorted(evidence.rglob("*.md"))
    documents += [root / "experience/README.md", root / "experience/docs/agent-checkpoint.md",
                  root / "experience/docs/realism-immersion-decision-20261027.md"]
    links = 0
    for document in documents:
        for token in tokens_recursive(parser.parse(document.read_text())):
            href = token.attrGet("href") or token.attrGet("src")
            if not href:
                continue
            url = urlsplit(href)
            if url.scheme or url.netloc or not url.path:
                continue
            require(not url.path.startswith("/"), f"Nonportable link in {document}: {href}")
            target = (document.parent / unquote(url.path)).resolve()
            require(target.is_relative_to(root), f"Link escapes checkout: {href}")
            require(target.exists(), f"Missing link target in {document}: {href}")
            links += 1

    json_paths = sorted(sprint.rglob("*.json")) + sorted(evidence.rglob("*.json"))
    for path in json_paths:
        json.loads(path.read_text())

    manifest_path = evidence / "competitors/manifest.json"
    manifest = json.loads(manifest_path.read_text())
    required = {"source", "date", "rights", "location", "method", "limitations", "sha256", "bytes"}
    for record in manifest["files"]:
        require(required.issubset(record), f"Incomplete provenance: {record.get('path')}")
        verify_file(manifest_path.parent, record)
    listed = {record["path"] for record in manifest["files"]}
    actual = {str(path.relative_to(manifest_path.parent))
              for path in manifest_path.parent.rglob("*") if path.is_file() and path != manifest_path}
    require(actual == listed, "Competitor inventory differs from retained files")

    receipts = json.loads((sprint / "research/licensing-receipts.json").read_text())
    source_records = [receipts["route"], *receipts["records"]]
    for record in source_records:
        require({"source", "recordDate", "rights", "location", "method", "limitations"}.issubset(record),
                f"Incomplete source receipt: {record.get('id')}")
        verify_file(root, record, "file")

    source_directory = evidence / "sources"
    source_manifest = json.loads((source_directory / "manifest.json").read_text())
    for record in source_manifest["files"]:
        require(required.issubset(record), f"Incomplete source evidence: {record.get('path')}")
        verify_file(source_directory, record)
    source_files = {record["path"] for record in source_manifest["files"]}
    actual_source_files = {str(path.relative_to(source_directory)) for path in source_directory.rglob("*")
                           if path.is_file() and path.suffix in {".json", ".svg", ".webp"}
                           and path.name != "manifest.json"}
    require(source_files == actual_source_files, "Source evidence inventory differs from retained files")
    inspection = json.loads((source_directory / "source-inspection.json").read_text())
    for record in inspection["records"]:
        if record["imageCount"]:
            verify_file(source_directory, {"path": f"{record['tile']}-texture.webp",
                "bytes": record["textureBytes"], "sha256": record["textureSha256"]})
    source_audit = json.loads((source_directory / "route-source-audit.json").read_text())
    verify_file(root, source_audit["route"])
    for record in source_audit["inputs"]:
        verify_file(source_directory, record)

    measurement_directory = evidence / "measurement"
    measurement_binding = json.loads((measurement_directory / "binding.json").read_text())
    for record in measurement_binding["files"]:
        require(required.issubset(record), f"Incomplete measurement provenance: {record.get('path')}")
        verify_file(measurement_directory, record)
        decoded = gzip.decompress((measurement_directory / record["path"]).read_bytes())
        require(len(decoded) == record["decodedBytes"], f"Decoded measurement bytes differ: {record['path']}")
        require(hashlib.sha256(decoded).hexdigest() == record["decodedSha256"],
                f"Decoded measurement hash differs: {record['path']}")
    measurement_report = json.loads(gzip.decompress((measurement_directory / "result.json.gz").read_bytes()))
    for field in ["protocol", "startedAt", "finishedAt", "driverSha256", "measurementSha256"]:
        require(measurement_report[field] == measurement_binding[field], f"Measurement identity differs: {field}")
    require(measurement_report["artifact"]["manifestSha256"] == measurement_binding["packageManifestSha256"],
            "Measurement package identity differs")
    require([{key: check[key] for key in ["id", "pass"]} for check in measurement_report["checks"]]
            == measurement_binding["checks"], "Retained measurement checks differ")

    calibration = json.loads((evidence / "benchmark/calibration.json").read_text())
    for record in calibration["evidence"]:
        binding_bytes = (root / record["path"]).read_bytes()
        require(hashlib.sha256(binding_bytes).hexdigest() == record["sha256"], "Calibration binding hash differs")
        report_bytes = gzip.decompress((root / record["reportPath"]).read_bytes())
        require(hashlib.sha256(report_bytes).hexdigest() == record["reportSha256"], "Calibration report hash differs")

    definition_path = sprint / "experiments/trial-definitions.json"
    definition = json.loads(definition_path.read_text())
    route_source = definition["routeSource"]
    geography_path = (definition_path.parent / route_source["path"]).resolve()
    geography_bytes = geography_path.read_bytes()
    require(hashlib.sha256(geography_bytes).hexdigest() == route_source["sha256"], "Trial route hash mismatch")
    geography = json.loads(geography_bytes)
    route = geography["selectedRoute"]
    nodes, edges = route["nodeIds"], route["edgeIds"]
    require([edge["id"] for edge in source_audit["edges"]] == edges, "Source audit route edge order differs")
    require([edge["ordinal"] for edge in source_audit["edges"]] == list(range(1, 55)), "Source audit edge ordinals differ")
    require(all(edge[field] == "unverified" for edge in source_audit["edges"]
                for field in ["appearanceStatus", "groundStatus", "lightingStatus"]),
            "Candidate index must preserve open qualification gates")
    require(len(nodes) == route_source["nodeCount"] == 55, "Route node count mismatch")
    require(len(edges) == route_source["edgeCount"] == 54, "Route edge count mismatch")
    require(abs(route["lengthMetres"] - route_source["lengthMetres"]) < 1e-6,
            "Route length mismatch")
    require(len(geography["sights"]) == receipts["route"]["sightCount"] == 6,
            "Route sight count mismatch")
    sight_lookup = {sight["id"]: sight for sight in geography["sights"]}
    edge_lookup = {edge["id"]: edge for edge in geography["navigation"]["edges"]}
    for index, edge_id in enumerate(edges):
        edge = edge_lookup[edge_id]
        require({edge["from"], edge["to"]} == {nodes[index], nodes[index + 1]},
                f"Disconnected route edge: {edge_id}")
    for trial in definition["trials"]:
        start, end = trial["nodeIndexRangeInclusive"]
        require(0 <= start < end < len(nodes), f"Invalid range: {trial['id']}")
        require(nodes[start] == trial["startNodeId"] and nodes[end] == trial["endNodeId"],
                f"Trial endpoints differ: {trial['id']}")
        for sight_id in trial["sightIds"]:
            require(sight_lookup[sight_id]["nodeId"] in nodes[start:end + 1],
                    f"Sight outside trial: {trial['id']} / {sight_id}")
    require(definition["trials"][-1]["nodeIndexRangeInclusive"] == [0, 54], "Full-route trial missing")

    qualification = verify_qualification(root, require, verify_file, route)
    acquisition = verify_acquisition(root, require, verify_file)

    return {"status": "passed", "markdownDocuments": len(documents), "relativeLinkTargets": links,
            "jsonDocuments": len(json_paths), "competitorFileHashes": len(manifest["files"]),
            "sourceFileHashes": len(source_records), "trialRouteHashes": 1,
            "sourceEvidenceFileHashes": len(source_manifest["files"]),
            "measurementCompressedAndDecodedHashes": len(measurement_binding["files"]),
            "calibrationOriginalReportHashes": len(calibration["evidence"]),
            "qualification": qualification,
            "acquisition": acquisition,
            "routeEdges": len(edges), "trialRanges": len(definition["trials"]),
            "limitations": "Local target existence, provenance and file integrity only; no remote URL, renderer, performance or human acceptance test."}


def main():
    arguments = argparse.ArgumentParser()
    arguments.add_argument("--root", type=Path, required=True)
    arguments.add_argument("--output", type=Path)
    args = arguments.parse_args()
    result = verify(args.root.resolve())
    output = json.dumps(result, indent=2) + "\n"
    if args.output:
        args.output.write_text(output)
    print(output, end="")


if __name__ == "__main__":
    main()
