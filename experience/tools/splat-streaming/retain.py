import hashlib
import json
from pathlib import Path
import shutil

import numpy as np
from PIL import Image, ImageDraw, ImageFont


root = Path.cwd()
research = root / "artifacts/realism-01/splat-streaming"
output = root / "experience/evidence/realism-01/qualification/splat-streaming"
output.mkdir(parents=True, exist_ok=True)
original = root / "artifacts/realism-01/splat-fidelity/hall-run-03-focal2"
reference = original / "spark-initial.jpg"
reference_camera = json.loads((original / "publisher-camera.json").read_text())["camera"]
compact = research / "compact-focused-02"
report = json.loads((compact / "result.json").read_text())
mechanics = json.loads((research / "compact-run-01/result.json").read_text())
if not report["completed"]:
    raise ValueError("Complete the bounded streaming run before retaining comparison evidence")
checks = {item["id"]: item["pass"] for item in report["checks"]}
if not checks["same-camera-as-original-reference"]:
    raise ValueError("Camera agreement is required before image comparison")


def identify(path):
    data = path.read_bytes()
    return {"path": str(path.relative_to(root)), "bytes": len(data), "sha256": hashlib.sha256(data).hexdigest()}


def copy(source, name):
    destination = output / name
    destination.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(source, destination)


copy(reference, "reference/full-source-spark-focal2.jpg")
copy(original / "publisher-camera.json", "reference/publisher-camera.json")
for run in ["full-run-01", "compact-run-01", "compact-focused-02"]:
    directory = research / run
    data = json.loads((directory / "result.json").read_text())
    if not data["completed"]:
        raise ValueError(f"Incomplete retained attempt: {run}")
    copy(directory / "result.json", f"{run}/result.json")
    for capture in data["captures"]:
        copy(directory / capture["path"], f"{run}/{capture['path']}")
    for source in (directory / "tool-snapshot").iterdir():
        copy(source, f"{run}/tool-snapshot/{source.name}")
for name in ["acquisition.json", "execution.json", "compact-execution.json", "dependency-verification.json"]:
    copy(research / "tooling" / name, f"conversion/{name}")

reference_pixels = np.asarray(Image.open(reference).convert("RGB"), dtype=np.float64)
comparisons = []
for name in ["first-visible", "bounded-initial"]:
    state = next(item["state"] for item in report["observations"] if item["label"] == name)
    camera_error = max(abs(left - right) for left, right in zip(state["camera"]["matrixWorld"], reference_camera["matrixWorld"]))
    projection_error = max(abs(left - right) for left, right in zip(state["camera"]["projectionMatrix"], reference_camera["projectionMatrix"]))
    if max(camera_error, projection_error) > 0.00001:
        raise ValueError(f"Comparison camera differs: {name}")
    path = compact / f"{name}.jpg"
    pixels = np.asarray(Image.open(path).convert("RGB"), dtype=np.float64)
    if pixels.shape != reference_pixels.shape:
        raise ValueError("Comparison frame dimensions differ")
    difference = np.abs(pixels - reference_pixels)
    foreground = np.maximum(pixels.max(axis=2), reference_pixels.max(axis=2)) > 12
    comparisons.append({"view": name, "input": identify(path), "cameraMatrixMaxAbsError": camera_error,
                        "projectionMaxAbsError": projection_error,
                        "selectedSplats": state["selectedSplats"], "residentPages": len(state["pager"]["pages"]),
                        "foregroundPixels": int(foreground.sum()), "meanAbsoluteError255": float(difference.mean()),
                        "foregroundMeanAbsoluteError255": float(difference[foreground].mean()),
                        "foregroundP95ChannelError255": float(np.percentile(difference[foreground], 95))})

records = []
for name in ["execution.json", "compact-execution.json"]:
    result = json.loads((research / "tooling" / name).read_text())
    files = result["outputs"]
    header = next(item for item in files if item["path"].endswith("knock-original-lod.rad"))
    first_chunk = next(item for item in files if item["path"].endswith("knock-original-lod-0.radc"))
    chunks = [item for item in files if item["path"].endswith(".radc")]
    records.append({"variant": "original-precision" if name == "execution.json" else "compact-input",
                    "headerBytes": header["bytes"], "rootChunkBytes": first_chunk["bytes"],
                    "minimumSourceEntryBytes": header["bytes"] + first_chunk["bytes"],
                    "allRadBytes": sum(item["bytes"] for item in files), "chunks": len(chunks),
                    "chunksOverSectionBudget": sum(item["bytes"] > 2097152 for item in chunks),
                    "sectionBudgetBytes": 2097152})

allocation_samples = report["disposal"]["allocations"]
summary = {"date": report["finishedAt"], "source": report["source"], "sourceSplatCount": report["sourceSplatCount"],
           "reference": identify(reference), "variants": records,
           "firstVisibleTransfer": report["firstVisibleTransfer"], "comparisons": comparisons,
           "checks": report["checks"], "mechanicsChecks": mechanics["checks"], "evictions": mechanics["evictions"],
           "comparisonRun": "compact-focused-02", "mechanicsRun": "compact-run-01",
           "observedPeakArrayBufferBytes": max(item["arrayBufferBytes"] for item in allocation_samples),
           "observedPeakLogicalGpuTextureBytes": max(item["trackedLogicalGpuTextureBytes"] for item in allocation_samples),
           "workersAfterDispose": report["disposal"]["after"]["workerLifecycle"],
           "completeMemoryAccounting": False, "benchmarkFullQualityReady": "unverified",
           "limitations": ["First-visible and resident-budget views have different detail from the full-source reference.",
                           "MAE measures image differences; no realism, immersion or discovery acceptance threshold is inferred.",
                           "CPU array/texture observations exclude worker/WASM heaps, driver allocations and transient buffers.",
                           "Software rendering and shared-host CPU activity prevent physical-device timing qualification.",
                           "Earlier compact-run-01 camera-change frames can have pending streaming; its images are transient observations.",
                           "Earlier CPU-array observations can omit pager arrays through depth-limited traversal; the focused run explicitly visits pager textures."]}
(output / "comparison.json").write_text(json.dumps(summary, indent=2) + "\n")

font_path = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
font = ImageFont.truetype(font_path, 18)
small = ImageFont.truetype(font_path, 13)
board = Image.new("RGB", (1200, 510), "#f3f3ed")
draw = ImageDraw.Draw(board)
draw.text((20, 12), "Same source and camera: full source, first visible, bounded stable view", fill="#20332f", font=font)
labels = ["Full-source reference: 1,935,275 splats", "First-visible streamed view", "Eight-page / 262,144-splat target"]
paths = [reference, compact / "first-visible.jpg", compact / "bounded-initial.jpg"]
for index, (label, path) in enumerate(zip(labels, paths)):
    image = Image.open(path).convert("RGB")
    image.thumbnail((380, 380), Image.Resampling.LANCZOS)
    board.paste(image, (10 + index * 400, 65))
    draw.text((10 + index * 400, 43), label, fill="#20332f", font=small)
    if index:
        item = comparisons[index - 1]
        draw.text((10 + index * 400, 452), f"Foreground MAE: {item['foregroundMeanAbsoluteError255']:.2f}/255", fill="#20332f", font=small)
draw.text((20, 483), "scbenoit / CC BY 4.0 · Spark 2.4.0 · Partial detail; full-quality and physical-device gates remain unverified.", fill="#364e46", font=small)
board.save(output / "comparison-board.png")

manifest = {"schemaVersion": 1, "date": report["finishedAt"], "files": [], "producers": []}
for path in sorted(output.rglob("*")):
    if not path.is_file() or path.name in {"README.md", "manifest.json"}:
        continue
    record = identify(path)
    record["path"] = str(path.relative_to(output))
    record.update({"source": "Knock Community Hall by scbenoit, https://superspl.at/scene/0ff2e6dc; pinned Spark2.4.0 official converter/runtime and Rust1.91.0 receipts",
                   "date": report["finishedAt"], "rights": "Model and rendered derivatives: CC BY 4.0; Spark/Three: MIT; Rust dependencies retain recorded upstream licenses",
                   "location": "Knock Community Hall, provider-named location; local controlled software-renderer experiment",
                   "method": "Original SH3 source converted by official CPU build-lod; real Chromium transfers, submitted draws and native input; original failed attempts retained",
                   "limitations": "Single source and software renderer; current image and byte failures remain failures; full allocation and physical-device acceptance unavailable"})
    manifest["files"].append(record)
for path in sorted((root / "experience/tools/splat-streaming").iterdir()):
    if path.is_file() and path.suffix in {".py", ".js", ".mjs", ".html"}:
        manifest["producers"].append(identify(path))
(output / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
print(json.dumps({"files": len(manifest["files"]), "producers": len(manifest["producers"]),
                  "comparison": comparisons, "firstVisibleTransfer": report["firstVisibleTransfer"]}, indent=2))
