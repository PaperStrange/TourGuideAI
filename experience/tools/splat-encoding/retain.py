import hashlib
import json
from pathlib import Path
import shutil

import numpy as np
from PIL import Image, ImageDraw, ImageFont


root = Path.cwd()
run = root / "artifacts/realism-01/splat-streaming/sh2-focused-run"
research = root / "artifacts/realism-01/splat-encoding"
output = root / "experience/evidence/realism-01/qualification/splat-encoding"
output.mkdir(parents=True, exist_ok=True)
report = json.loads((run / "result.json").read_text())
execution = json.loads((research / "execution.json").read_text())
reference_directory = root / "experience/evidence/realism-01/qualification/splat-streaming"
reference_path = reference_directory / "reference/full-source-spark-focal2.jpg"
camera_path = reference_directory / "reference/publisher-camera.json"
sh3_image = reference_directory / "compact-focused-02/bounded-initial.jpg"
camera = json.loads(camera_path.read_text())["camera"]
if not report["completed"] or execution["exitCode"] != 0:
    raise ValueError("Encoding evidence requires completed conversion and browser observations")
if execution["converterMetadata"]["max_sh_degree"] != 2 or execution["originalShDegree"] != 3:
    raise ValueError("Expected explicit SH3 to SH2 conversion")


def identity(path):
    data = path.read_bytes()
    return {"path": str(path.relative_to(root)), "bytes": len(data), "sha256": hashlib.sha256(data).hexdigest()}


def copy(source, relative_name):
    destination = output / relative_name
    destination.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(source, destination)


copy(run / "result.json", "focused/result.json")
for item in report["captures"]:
    copy(run / item["path"], f"focused/{item['path']}")
for path in (run / "tool-snapshot").iterdir():
    copy(path, f"focused/tool-snapshot/{path.name}")
copy(research / "execution.json", "conversion/execution.json")
copy(research / "conversion.log", "conversion/stdout.log")

reference = np.asarray(Image.open(reference_path).convert("RGB"), dtype=np.float64)
comparisons = []
for name in ["first-visible", "bounded-initial"]:
    state = next(item["state"] for item in report["observations"] if item["label"] == name)
    world_error = max(abs(left - right) for left, right in zip(state["camera"]["matrixWorld"], camera["matrixWorld"]))
    projection_error = max(abs(left - right) for left, right in zip(state["camera"]["projectionMatrix"], camera["projectionMatrix"]))
    if max(world_error, projection_error) > 0.00001:
        raise ValueError(f"Encoding camera differs from original reference: {name}")
    pixels = np.asarray(Image.open(run / f"{name}.jpg").convert("RGB"), dtype=np.float64)
    if pixels.shape != reference.shape:
        raise ValueError("Encoding comparison dimensions differ")
    difference = np.abs(reference - pixels)
    foreground = np.maximum(reference.max(axis=2), pixels.max(axis=2)) > 12
    comparisons.append({"view": name, "path": f"focused/{name}.jpg", "worldMatrixMaxAbsError": world_error,
                        "projectionMaxAbsError": projection_error, "selectedSplats": state["selectedSplats"],
                        "residentPages": len(state["pager"]["pages"]), "foregroundPixels": int(foreground.sum()),
                        "meanAbsoluteError255": float(difference.mean()),
                        "foregroundMeanAbsoluteError255": float(difference[foreground].mean()),
                        "foregroundP95ChannelError255": float(np.percentile(difference[foreground], 95))})

summary = {"date": report["finishedAt"], "source": report["source"], "originalShDegree": 3, "derivedShDegree": 2,
           "sourceSplatCount": execution["converterMetadata"]["input_splat_count"],
           "derivedLodNodeCount": execution["converterMetadata"]["final_splat_count"],
           "headerBytes": execution["headerBytes"], "rootChunkBytes": execution["rootChunkBytes"],
           "minimumSourceEntryBytes": execution["headerBytes"] + execution["rootChunkBytes"],
           "totalConvertedBytes": execution["totalConvertedBytes"], "chunkCount": execution["chunkCount"],
           "chunksAbove2MiB": execution["chunksAbove2MiB"], "additionalFilesBytes": execution["additionalFilesBytes"],
           "firstVisibleTransfer": report["firstVisibleTransfer"], "comparisons": comparisons, "checks": report["checks"],
           "directionalRadianceRisk": "SH3 to SH2 removes all 7 degree-3 basis terms per color (21 directional coefficients per Gaussian); view-dependent highlights and fine angular color changes may degrade.",
           "limitations": ["Only the initial source camera is compared; additional viewing directions and independent photographs remain unqualified.",
                           "MAE includes LoD and encoding effects; a budget pass alone establishes no realism or full-quality acceptance.",
                           "The historical compact-input SH3 comparison also differs in intermediate quantization; it is context, not an isolated SH-degree experiment.",
                           "Same SwiftShader/shared-host and partial-allocation limitations apply as in the streaming experiment."],
           "benchmarkFullQualityReady": "unverified", "completeMemoryAccounting": False}
(output / "comparison.json").write_text(json.dumps(summary, indent=2) + "\n")

font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 18)
small = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 13)
board = Image.new("RGB", (1200, 510), "#f3f3ed")
draw = ImageDraw.Draw(board)
draw.text((20, 12), "Explicit SH3 to SH2 tradeoff: same licensed source and camera", fill="#20332f", font=font)
labels = ["Full-source SH3 reference", "Prior bounded SH3 (compact input)", "Bounded SH2 (original-precision input)"]
paths = [reference_path, sh3_image, run / "bounded-initial.jpg"]
for index, (label, path) in enumerate(zip(labels, paths)):
    image = Image.open(path).convert("RGB")
    image.thumbnail((380, 380), Image.Resampling.LANCZOS)
    board.paste(image, (10 + index * 400, 65))
    draw.text((10 + index * 400, 43), label, fill="#20332f", font=small)
draw.text((20, 455), f"SH2 bounded foreground MAE vs full reference: {comparisons[1]['foregroundMeanAbsoluteError255']:.2f}/255", fill="#20332f", font=small)
draw.text((20, 483), "scbenoit / CC BY 4.0 · Degree-3 angular detail removed · Other view directions and full quality remain unverified.", fill="#364e46", font=small)
board.save(output / "comparison-board.png")

manifest = {"schemaVersion": 1, "date": report["finishedAt"], "files": [],
            "inputs": [identity(path) for path in [reference_path, camera_path, sh3_image]], "producers": []}
for path in sorted(output.rglob("*")):
    if not path.is_file() or path.name in {"README.md", "manifest.json"}:
        continue
    record = identity(path)
    record["path"] = str(path.relative_to(output))
    record.update({"source": "Knock Community Hall by scbenoit, https://superspl.at/scene/0ff2e6dc; original source through Spark2.4.0 build-lod and unchanged bounded-streaming harness",
                   "date": report["finishedAt"], "rights": "Model and modified rendered derivatives: CC BY 4.0; Spark and Three: MIT",
                   "location": "Knock Community Hall; provider-named location and local Chromium diagnostic",
                   "method": "Official --quality --rad-chunked --max-sh=2; frozen same-camera screenshots and real response-byte observations",
                   "limitations": "SH3 angular terms explicitly removed; section-budget failures remain failures; full quality, other directions and physical-device performance unverified"})
    manifest["files"].append(record)
for path in sorted((root / "experience/tools/splat-encoding").glob("*.py")):
    manifest["producers"].append(identity(path))
for name in ["capture.mjs", "viewer.js", "viewer.html", "verify.py"]:
    manifest["producers"].append(identity(root / "experience/tools/splat-streaming" / name))
(output / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
print(json.dumps(summary, indent=2))
