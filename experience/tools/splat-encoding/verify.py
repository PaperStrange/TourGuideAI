import hashlib
import importlib.util
from importlib.metadata import version
import json
from pathlib import Path

import numpy as np
from PIL import Image


def verify_splat_encoding(root, require, verify_file):
    libraries = {name: version(name) for name in ["numpy", "Pillow"]}
    require(libraries == {"numpy": "2.5.4", "Pillow": "12.3.0"},
            "Encoding image verification requires numpy==2.5.4 and Pillow==12.3.0")
    directory = root / "experience/evidence/realism-01/qualification/splat-encoding"
    manifest = json.loads((directory / "manifest.json").read_text())
    for record in manifest["files"]:
        require({"source", "date", "rights", "location", "method", "limitations", "bytes", "sha256"}.issubset(record),
                f"Incomplete encoding provenance: {record['path']}")
        verify_file(directory, record)
    inventory = [record["path"] for record in manifest["files"]]
    actual = {str(path.relative_to(directory)) for path in directory.rglob("*")
              if path.is_file() and path.name not in {"README.md", "manifest.json"}}
    require(len(inventory) == len(set(inventory)) and actual == set(inventory), "Encoding evidence inventory differs")
    for record in [*manifest["inputs"], *manifest["producers"]]:
        verify_file(root, record)
    specification = importlib.util.spec_from_file_location("streaming_observation_verifier", root / "experience/tools/splat-streaming/verify.py")
    streaming = importlib.util.module_from_spec(specification)
    specification.loader.exec_module(streaming)
    result = json.loads((directory / "focused/result.json").read_text())
    summary = json.loads((directory / "comparison.json").read_text())
    conversion = json.loads((directory / "conversion/execution.json").read_text())
    require(result["completed"] and conversion["exitCode"] == 0, "Encoding run is incomplete")
    source_hash = "81d061bad6ba255689939847482836f7d70bf2e222abce04e6d81c2c976c6a71"
    require(result["source"]["sha256"] == conversion["source"]["sha256"] == summary["source"]["sha256"] == source_hash,
            "Encoding source differs from the reviewed original")
    require(conversion["converterMetadata"]["input_sh_degree"] == conversion["originalShDegree"] == summary["originalShDegree"] == 3,
            "Encoding original SH degree differs")
    require(conversion["converterMetadata"]["max_sh_degree"] == conversion["requestedOutputShDegree"] == summary["derivedShDegree"] == 2,
            "Encoding derived SH degree differs")
    require("--max-sh=2" in conversion["command"] and "--quality" in conversion["command"] and "--rad-chunked" in conversion["command"],
            "Encoding conversion settings differ")
    require(conversion["additionalFilesBytes"] <= conversion["maxAdditionalBytes"] == 200000000, "Encoding storage limit exceeded")
    outputs = {record["path"]: record for record in conversion["outputs"]}
    require(len(outputs) == len(conversion["outputs"]), "Repeated encoding output identity")
    chunks = [record for record in outputs.values() if record["path"].endswith(".radc")]
    require(sum(record["bytes"] for record in outputs.values()) == summary["totalConvertedBytes"], "Encoding output bytes differ")
    require(sum(record["bytes"] > 2097152 for record in chunks) == summary["chunksAbove2MiB"], "Encoding section failures differ")
    require(len(chunks) == summary["chunkCount"] == 39, "Encoding chunk inventory differs")
    for served in result["servedResources"]:
        if served["requestPath"].startswith("/converted/"):
            expected = outputs[served["path"]]
            require(all(served[key] == expected[key] for key in ["bytes", "sha256"]), "Browser served different encoding bytes")
    for producer in result["toolSources"]:
        verify_file(root, producer)
        verify_file(directory / "focused/tool-snapshot", {**producer, "path": Path(producer["path"]).name})
    transfer = streaming.transfer_at(result, require)
    cancellation = streaming.verify_cancellation(result, require)
    require(summary["firstVisibleTransfer"] == result["firstVisibleTransfer"] and summary["checks"] == result["checks"],
            "Encoding summary observations differ")
    checks = {item["id"]: item["pass"] for item in result["checks"]}
    require(checks["first-visible-total-transfer-within-4mib"] == (transfer["totalEncodedResponseBytes"] <= 4194304),
            "Encoding startup transfer gate differs")
    require(checks["inflight-source-fetch-canceled-by-recorded-action"] == bool(cancellation), "Encoding cancellation gate differs")
    reference_directory = directory.parent / "splat-streaming"
    camera = json.loads((reference_directory / "reference/publisher-camera.json").read_text())["camera"]
    with Image.open(reference_directory / "reference/full-source-spark-focal2.jpg") as image:
        reference = np.asarray(image.convert("RGB"), dtype=np.float64)
    states = {item["label"]: item["state"] for item in result["observations"]}
    captures = {item["stateLabel"]: item for item in result["captures"]}
    require([item["view"] for item in summary["comparisons"]] == ["first-visible", "bounded-initial"], "Encoding comparison inventory differs")
    for item in summary["comparisons"]:
        state, capture = states[item["view"]], captures[item["view"]]
        frames = capture["capturedFrames"]
        require(state["paused"] and frames["paused"] and frames["before"] == frames["after"] == state["frames"], "Encoding image frame changed during capture")
        if item["view"] == "bounded-initial":
            require(state["readyForCapture"] and state["cameraMatchesLod"] and not state["pager"]["pending"], "Encoding comparison retains unsettled source state")
        world = streaming.matrix_error(state["camera"]["matrixWorld"], camera["matrixWorld"], require)
        projection = streaming.matrix_error(state["camera"]["projectionMatrix"], camera["projectionMatrix"], require)
        require(world < 0.00001 and projection < 0.00001, "Encoding camera differs from the original reference")
        streaming.close(world, item["worldMatrixMaxAbsError"], require, "Encoding camera world")
        streaming.close(projection, item["projectionMaxAbsError"], require, "Encoding camera projection")
        verify_file(directory / "focused", capture)
        with Image.open(directory / item["path"]) as image:
            pixels = np.asarray(image.convert("RGB"), dtype=np.float64)
        require(pixels.shape == reference.shape, "Encoding comparison image dimensions differ")
        difference = np.abs(reference - pixels)
        foreground = np.maximum(reference.max(axis=2), pixels.max(axis=2)) > 12
        require(int(foreground.sum()) == item["foregroundPixels"] and foreground.any(), "Encoding comparison foreground differs")
        values = {"meanAbsoluteError255": float(difference.mean()), "foregroundMeanAbsoluteError255": float(difference[foreground].mean()),
                  "foregroundP95ChannelError255": float(np.percentile(difference[foreground], 95))}
        for key, value in values.items():
            streaming.close(value, item[key], require, f"Encoding image {key}")
    require(summary["benchmarkFullQualityReady"] == "unverified" and not summary["completeMemoryAccounting"],
            "Encoding release uncertainty must remain visible")
    return {"fileHashes": len(manifest["files"]), "inputHashes": len(manifest["inputs"]),
            "producerHashes": len(manifest["producers"]), "libraries": libraries, "transfer": transfer,
            "chunksAbove2MiB": summary["chunksAbove2MiB"], "sourceShDegree": 3, "derivedShDegree": 2,
            "limitations": "One explicit encoding tradeoff; startup bytes do not qualify directional fidelity, full quality or the complete route."}


if __name__ == "__main__":
    root = Path.cwd().resolve()

    def require(condition, message):
        if not condition:
            raise ValueError(message)

    def verify_file(base, record):
        data = (base / record["path"]).read_bytes()
        require(len(data) == record["bytes"], f"Encoding byte count differs: {record['path']}")
        require(hashlib.sha256(data).hexdigest() == record["sha256"], f"Encoding hash differs: {record['path']}")

    print(json.dumps(verify_splat_encoding(root, require, verify_file), indent=2))
