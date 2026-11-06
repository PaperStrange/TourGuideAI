import argparse
import hashlib
from importlib.metadata import version
import json
import math
from pathlib import Path
from urllib.parse import urlsplit

import numpy as np
from PIL import Image


def close(actual, expected, require, label, tolerance=1e-10):
    require(math.isfinite(actual) and math.isfinite(expected) and
            math.isclose(actual, expected, rel_tol=0, abs_tol=tolerance), f"Streaming measurement differs: {label}")


def matrix_error(left, right, require):
    first, second = np.asarray(left, dtype=float), np.asarray(right, dtype=float)
    require(first.shape == second.shape == (16,) and np.isfinite(first).all() and np.isfinite(second).all(),
            "Streaming camera matrices must contain 16 finite values")
    return float(np.max(np.abs(first - second)))


def epoch_at(request, timestamp):
    return (request["wallTime"] + timestamp - request["timestamp"]) * 1000


def transfer_at(result, require):
    first_state = next(item["state"] for item in result["observations"] if item["label"] == "first-visible")
    first = first_state["firstVisible"][0]
    cutoff = first["epochMs"]
    close(result["firstVisibleTransfer"]["epochMs"], cutoff, require, "First-visible timestamp", .001)
    require(first["generation"] == 1 and first["frames"] == first_state["frames"] and
            first["benchmarkFullQualityReady"] is False, "Streaming byte boundary does not bind the first partial frame")
    request_ids = [request["id"] for request in result["requests"]]
    require(request_ids and len(request_ids) == len(set(request_ids)), "Streaming network request identity is absent or repeated")
    total, source_total, completed_bytes, partial_bytes, partial_headers, partial_body = 0, 0, 0, 0, 0, 0
    partial_requests = []
    for request in result["requests"]:
        require(all(math.isfinite(request[field]) for field in ["timestamp", "wallTime"]), "Invalid network clock observation")
        if request["wallTime"] * 1000 > cutoff:
            continue
        if "finished" in request and epoch_at(request, request["finished"]["timestamp"]) <= cutoff:
            count = request["finished"]["encodedBytes"]
            require(isinstance(count, int) and count >= 0, "Invalid completed encoded response size")
            completed_bytes += count
        else:
            response = request.get("response")
            headers = response["encodedHeaderBytes"] if response and epoch_at(request, response["timestamp"]) <= cutoff else 0
            chunks = [chunk for chunk in request["chunks"] if epoch_at(request, chunk["timestamp"]) <= cutoff]
            require(isinstance(headers, int) and headers >= 0 and all(isinstance(chunk["encodedBytes"], int) and chunk["encodedBytes"] >= 0 for chunk in chunks), "Invalid partial encoded response size")
            body = sum(chunk["encodedBytes"] for chunk in chunks)
            count = headers + body
            partial_headers += headers
            partial_body += body
            partial_bytes += count
            if count:
                partial_requests.append({"id": request["id"], "responseHeaderBytes": headers, "encodedBodyBytes": body})
        total += count
        if urlsplit(request["url"]).path.startswith("/converted/"):
            source_total += count
    require(total == result["firstVisibleTransfer"]["totalEncodedBytes"] and
            source_total == result["firstVisibleTransfer"]["sourceEncodedBytes"], "Streaming encoded startup bytes differ from raw CDP events")
    return {"totalEncodedResponseBytes": total, "sourceEncodedResponseBytes": source_total,
            "completedResponseBytes": completed_bytes, "partialResponseBytes": partial_bytes,
            "partialResponseHeaderBytes": partial_headers, "partialEncodedBodyBytes": partial_body,
            "partialRequests": partial_requests,
            "exclusions": "Request headers, TLS/TCP/DNS overhead and unobserved transport storage"}


def verify_cancellation(result, require):
    action = result["cancellation"]
    require(action["disposeRequested"] is True and math.isfinite(action["epochMs"]), "Streaming removal action is missing")
    observations = {item["label"]: item["state"] for item in result["observations"]}
    before, after = observations["before-cancel"], observations["after-cancel"]
    require(before["samplePresent"] and before["pager"]["fetchers"] > 0 and before["pager"]["pending"], "Cancellation began without an observed source fetch")
    require(not after["samplePresent"] and after["lodTrees"] == 0 and not after["pager"]["pages"] and
            after["pager"]["fetchers"] == 0 and not after["pager"]["pending"], "Cancellation did not clear the observed source state")
    require(before["allocation"]["at"] <= action["at"] <= after["allocation"]["at"], "Cancellation action lies outside its observation interval")
    first = observations["first-visible"]["firstVisible"][0]
    require(abs((first["epochMs"] - first["at"]) - (action["epochMs"] - action["at"])) < 1,
            "Cancellation and first-visible clocks have inconsistent origins")
    matches = []
    for request in result["requests"]:
        failed = request.get("failed")
        if not urlsplit(request["url"]).path.startswith("/converted/") or not failed or failed.get("canceled") is not True:
            continue
        started, ended = request["wallTime"] * 1000, epoch_at(request, failed["timestamp"])
        if started <= action["epochMs"] <= ended and ended - action["epochMs"] < 3000:
            require("finished" not in request, "Canceled source request also reports successful completion")
            matches.append({"id": request["id"], "url": request["url"], "startedEpochMs": started, "failedEpochMs": ended})
    require(matches, "No raw canceled source request spans the recorded removal action")
    recorded = {item["id"]: item for item in action["requests"]}
    require(len(recorded) == len(action["requests"]) == len(matches) and set(recorded) == {item["id"] for item in matches}, "Cancellation attribution inventory differs from raw CDP failures")
    for match in matches:
        retained = recorded[match["id"]]
        require(match["url"] == retained["url"], "Cancellation source URL differs")
        close(match["startedEpochMs"], retained["startedEpochMs"], require, "Canceled request start", .001)
        close(match["failedEpochMs"], retained["failedEpochMs"], require, "Canceled request failure", .001)
    return matches


def verify_images(directory, summary, focused, require, verify_file):
    reference_path = directory / "reference/full-source-spark-focal2.jpg"
    verify_file(reference_path.parent, {**summary["reference"], "path": reference_path.name})
    source_reference = directory.parent / "splat-fidelity/hall/focal2"
    verify_file(source_reference, {**summary["reference"], "path": "spark-initial.jpg"})
    require((directory / "reference/publisher-camera.json").read_bytes() == (source_reference / "publisher-camera.json").read_bytes(),
            "Streaming camera reference differs from the reviewed full-source capture")
    reference_camera = json.loads((directory / "reference/publisher-camera.json").read_text())["camera"]
    with Image.open(reference_path) as image:
        reference = np.asarray(image.convert("RGB"), dtype=np.float64)
    states = {item["label"]: item["state"] for item in focused["observations"]}
    captures = {item["stateLabel"]: item for item in focused["captures"]}
    require([item["view"] for item in summary["comparisons"]] == ["first-visible", "bounded-initial"], "Streaming comparison view inventory differs")
    result = []
    for item in summary["comparisons"]:
        name = item["view"]
        capture, state = captures[name], states[name]
        frames = capture["capturedFrames"]
        require(state["paused"] and frames["paused"] and frames["before"] == frames["after"] == state["frames"], "Streaming image did not retain its submitted frame")
        if name == "bounded-initial":
            require(state["readyForCapture"] and state["cameraMatchesLod"] and not state["pager"]["pending"] and
                    state["pager"]["fetchers"] == 0 and state["pager"]["readyUploads"] == 0,
                    "Bounded image retains unsettled source state")
        world = matrix_error(state["camera"]["matrixWorld"], reference_camera["matrixWorld"], require)
        projection = matrix_error(state["camera"]["projectionMatrix"], reference_camera["projectionMatrix"], require)
        require(world < .00001 and projection < .00001, "Streaming image camera differs from the source reference")
        close(world, item["cameraMatrixMaxAbsError"], require, f"{name} world camera")
        close(projection, item["projectionMaxAbsError"], require, f"{name} projection camera")
        path = directory / "compact-focused-02" / capture["path"]
        verify_file(path.parent, {**item["input"], "path": path.name})
        require(all(capture[key] == item["input"][key] for key in ["bytes", "sha256"]), "Streaming comparison image identity differs from its capture")
        with Image.open(path) as image:
            pixels = np.asarray(image.convert("RGB"), dtype=np.float64)
        require(pixels.shape == reference.shape, "Streaming comparison dimensions differ")
        difference = np.abs(pixels - reference)
        foreground = np.maximum(pixels.max(axis=2), reference.max(axis=2)) > 12
        require(foreground.any() and int(foreground.sum()) == item["foregroundPixels"], "Streaming comparison foreground differs")
        metrics = {"meanAbsoluteError255": float(difference.mean()), "foregroundMeanAbsoluteError255": float(difference[foreground].mean()),
                   "foregroundP95ChannelError255": float(np.percentile(difference[foreground], 95))}
        for key, value in metrics.items():
            close(value, item[key], require, f"{name} {key}")
        require(item["selectedSplats"] == state["selectedSplats"] and item["residentPages"] == len(state["pager"]["pages"]),
                "Streaming comparison geometry state differs")
        result.append({"view": name, "cameraWorldMaxAbsError": world, "cameraProjectionMaxAbsError": projection, **metrics})
    return result


def verify_splat_streaming(root, require, verify_file):
    libraries = {name: version(name) for name in ["numpy", "Pillow"]}
    require(libraries == {"numpy": "2.5.4", "Pillow": "12.3.0"}, "Streaming image verification requires numpy==2.5.4 and Pillow==12.3.0")
    directory = root / "experience/evidence/realism-01/qualification/splat-streaming"
    manifest = json.loads((directory / "manifest.json").read_text())
    provenance = {"source", "date", "rights", "location", "method", "limitations", "bytes", "sha256"}
    for record in manifest["files"]:
        require(provenance.issubset(record), f"Incomplete streaming provenance: {record['path']}")
        verify_file(directory, record)
    listed = [record["path"] for record in manifest["files"]]
    require(len(listed) == len(set(listed)), "Repeated streaming evidence path")
    actual = {str(path.relative_to(directory)) for path in directory.rglob("*")
              if path.is_file() and path.name not in {"README.md", "manifest.json"}}
    require(actual == set(listed), "Streaming evidence inventory differs")
    for producer in manifest["producers"]:
        verify_file(root, producer)
    summary = json.loads((directory / "comparison.json").read_text())
    source_hash = "81d061bad6ba255689939847482836f7d70bf2e222abce04e6d81c2c976c6a71"
    failures = {}
    runs = {}
    transfers = {}
    for run in ["full-run-01", "compact-run-01", "compact-focused-02"]:
        result = json.loads((directory / run / "result.json").read_text())
        runs[run] = result
        require(result["completed"], f"Incomplete retained streaming attempt: {run}")
        require(result["source"]["sha256"] == source_hash and result["source"]["bytes"] == 29781498,
                f"Streaming original source differs: {run}")
        for source in result["toolSources"]:
            verify_file(directory / run / "tool-snapshot", {**source, "path": Path(source["path"]).name})
        for capture in result["captures"]:
            verify_file(directory / run, capture)
        checks = {check["id"]: check["pass"] for check in result["checks"]}
        require(len(checks) == len(result["checks"]), "Repeated streaming check identity")
        failures[run] = [name for name, passed in checks.items() if not passed]
        transfers[run] = transfer_at(result, require)
        transfer = result["firstVisibleTransfer"]
        require(not transfer["benchmarkFullQualityReady"], "First-visible streaming frame is not full-quality evidence")
        require(checks["first-visible-total-transfer-within-4mib"] == (transfer["totalEncodedBytes"] <= 4194304),
                f"Streaming startup gate differs: {run}")
        for observation in result["observations"]:
            state = observation["state"]
            require(state["settings"]["maxPagedSplats"] == 524288 and state["settings"]["numLodFetchers"] == 1,
                    f"Streaming pool settings changed: {run}")
            require(all(len(item["pages"]) <= 8 for item in state["pageHistory"]),
                    f"Streaming resident page limit exceeded: {run}")
            require(state["pager"]["maxPages"] == 8 and state["pager"]["pageSplats"] == 65536 and state["pager"]["fetchers"] <= 1,
                    f"Streaming pager observations exceed the declared limits: {run}")
        resident = [len(item["pages"]) for observation in result["observations"] for item in observation["state"]["pageHistory"]]
        require(resident and checks["resident-pool-within-eight-pages"] == (max(resident) <= 8), "Streaming resident pool check differs")
        require(checks["source-fetchers-within-one"] == all(observation["state"]["pager"]["fetchers"] <= 1 for observation in result["observations"]),
                "Streaming fetcher check differs")
    focused = runs["compact-focused-02"]
    require(summary["firstVisibleTransfer"] == focused["firstVisibleTransfer"], "Streaming summary transfer differs")
    require(summary["checks"] == focused["checks"], "Streaming summary checks differ")
    require(summary["evictions"] == runs["compact-run-01"]["evictions"], "Streaming eviction observations differ")
    require(not summary["completeMemoryAccounting"] and summary["benchmarkFullQualityReady"] == "unverified",
            "Streaming resource/quality uncertainty must remain visible")
    comparisons = verify_images(directory, summary, focused, require, verify_file)
    focused_checks = {item["id"]: item["pass"] for item in focused["checks"]}
    require(focused_checks["same-camera-as-original-reference"] is True, "Focused same-camera check must reflect recomputed matrices")
    cancellation = verify_cancellation(focused, require)
    require(focused_checks["inflight-source-fetch-canceled-by-recorded-action"] == bool(cancellation), "Streaming cancellation check differs")
    require(transfers["compact-focused-02"]["partialResponseBytes"] > 0,
            "Focused startup must preserve the observed partial next-chunk transfer")
    for filename, variant in zip(["execution.json", "compact-execution.json"], summary["variants"]):
        conversion = json.loads((directory / "conversion" / filename).read_text())
        require(conversion["source"]["sha256"] == source_hash, "Streaming conversion input differs")
        outputs = conversion["outputs"]
        chunks = [item for item in outputs if item["path"].endswith(".radc")]
        require(sum(item["bytes"] for item in outputs) == variant["allRadBytes"], "Streaming converted size differs")
        require(len(chunks) == variant["chunks"] == 39, "Streaming converted chunk count differs")
        require(sum(item["bytes"] > 2097152 for item in chunks) == variant["chunksOverSectionBudget"],
                "Streaming section budget observations differ")
        output_records = {item["path"]: item for item in outputs}
        variants = ["full-run-01"] if filename == "execution.json" else ["compact-run-01", "compact-focused-02"]
        for run in variants:
            require({item["path"] for item in runs[run]["convertedFiles"]} == set(output_records), "Streaming conversion/run inventory differs")
            for item in runs[run]["convertedFiles"]:
                require(all(item[key] == output_records[item["path"]][key] for key in ["bytes", "sha256"]), "Streaming converted source identity differs")
            for served in runs[run]["servedResources"]:
                if served["requestPath"].startswith("/converted/"):
                    require(served["path"] in output_records and all(served[key] == output_records[served["path"]][key] for key in ["bytes", "sha256"]),
                            "Streaming served geometry differs from conversion output")
    camera_source = next(item for item in focused["servedResources"] if item["requestPath"] == "/publisher-camera.json")
    verify_file(directory / "reference", {**camera_source, "path": "publisher-camera.json"})
    config_source = next(item for item in focused["servedResources"] if item["requestPath"] == "/hall-config.json")
    verify_file(directory.parent / "splat-fidelity", {**config_source, "path": "knock-published-viewer-config.json"})
    return {"fileHashes": len(manifest["files"]), "producerHashes": len(manifest["producers"]),
            "retainedRuns": len(runs), "retainedFailingChecks": failures,
            "libraries": libraries, "recomputedTransfers": transfers, "recomputedImages": comparisons,
            "canceledSourceRequests": [item["id"] for item in cancellation], "rawCachesRequired": False,
            "limitations": "Evidence identity and consistency; byte failures and unverified release gates remain unchanged."}


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=Path, default=Path.cwd())
    parser.add_argument("--retained-only", action="store_true", help="All checks use retained records and require no raw cache")
    root = parser.parse_args().root.resolve()

    def require(condition, message):
        if not condition:
            raise ValueError(message)

    def verify_file(base, record):
        data = (base / record["path"]).read_bytes()
        require(len(data) == record["bytes"], f"Streaming byte count differs: {record['path']}")
        require(hashlib.sha256(data).hexdigest() == record["sha256"], f"Streaming hash differs: {record['path']}")

    print(json.dumps(verify_splat_streaming(root, require, verify_file), indent=2))
