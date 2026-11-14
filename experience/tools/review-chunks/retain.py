import datetime
import hashlib
import json
import pathlib
import shutil
import sys
import tomllib


root = pathlib.Path(__file__).resolve().parents[3]
workspace = root / "artifacts/realism-01/review-chunks"
evidence = root / "experience/evidence/realism-01/review-chunks"


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def verify(directory):
    manifest = json.loads((directory / "manifest.json").read_text())
    for entry in manifest["files"]:
        path = directory / entry["path"]
        assert path.stat().st_size == entry["bytes"], path
        assert digest(path) == entry["sha256"], path
    result = json.loads((directory / "result.json").read_text())
    comparison = json.loads((directory / "comparison.json").read_text())["comparison"]
    files = result["files"]
    approved = json.loads((directory / "approved-package-manifest.json").read_text())
    approved_files = {entry["path"]: entry for entry in approved["files"]}
    for item in files:
        source = approved_files[f'data/streamed/{item["name"]}']
        assert item["inputBytes"] == source["bytes"]
        assert item["inputSha256"] == source["sha256"]
    acquisition = json.loads((directory / "source-acquisition.json").read_text())
    restored = json.loads((directory / "tooling-restoration.json").read_text())
    assert restored["sourceReceiptSha256"] == digest(directory / "source-acquisition.json")
    approved_sources = {entry["url"]: entry for entry in acquisition["files"]}
    for entry in restored["files"]:
        assert entry["bytes"] == approved_sources[entry["sourceUrl"]]["bytes"]
        assert entry["sha256"] == approved_sources[entry["sourceUrl"]]["sha256"]
    for path in (directory / "upstream").rglob("*"):
        if path.is_file():
            url = f'https://raw.githubusercontent.com/sparkjsdev/spark/{result["upstreamCommit"]}/{path.relative_to(directory / "upstream")}'
            assert path.stat().st_size == approved_sources[url]["bytes"]
            assert digest(path) == approved_sources[url]["sha256"]
    input_bytes = sum(item["inputBytes"] for item in files)
    output_bytes = sum(item["outputBytes"] for item in files)
    assert input_bytes == result["inputBytes"] == 84115304
    assert output_bytes == result["outputBytes"]
    assert result["byteChange"] == output_bytes - input_bytes
    pages = [item for item in files if item["name"].endswith(".radc")]
    assert len(pages) == 39
    assert sum(item["inputBytes"] > 2 * 1024**2 for item in pages) == result["inputPagesAbove2MiB"] == 37
    assert sum(item["outputBytes"] > 2 * 1024**2 for item in pages) == result["outputPagesAbove2MiB"]
    assert comparison["decodedIdentical"] is False
    assert comparison["splatCount"] == 2541177 and comparison["maxShDegree"] == 2
    assert comparison["childCountChanges"] == comparison["childStartChanges"] == 0
    assert comparison["floatingProperties"]["quaternion"]["differentValues"] == 68224
    for name in ["center", "opacity", "rgb", "scale", "sh1", "sh2"]:
        assert comparison["floatingProperties"][name]["differentValues"] == 0
    assert result["releaseEligible"] is False
    lock = tomllib.loads((directory / "producers/rust/Cargo.lock").read_text())
    expected = {f'{item["name"]}-{item["version"]}': item["checksum"] for item in lock["package"] if "checksum" in item}
    actual = {item["package"]: item["sha256"] for item in result["dependencyArchives"]}
    assert expected == actual
    print(json.dumps({"verifiedFiles": len(manifest["files"]), "inputBytes": input_bytes,
        "outputBytes": output_bytes, "decodedIdentical": False, "releaseEligible": False}, indent=2))


if "--verify" in sys.argv:
    position = sys.argv.index("--verify")
    directory = pathlib.Path(sys.argv[position + 1]).resolve() if len(sys.argv) > position + 1 else evidence
    verify(directory)
    raise SystemExit(0)

if (evidence / "manifest.json").exists():
    assert digest(evidence / "comparison.json") == digest(workspace / "s8-delta-01/comparison.json")
    assert digest(evidence / "conversion-output.txt") == digest(workspace / "s8-delta-01.txt")
evidence.mkdir(parents=True, exist_ok=True)
inputs = root / "artifacts/realism-01/review-loading/package-03/data/streamed"
outputs = workspace / "s8-delta-01"
files = []
for path in sorted(inputs.iterdir()):
    if path.suffix not in [".rad", ".radc"]:
        continue
    converted = outputs / path.name
    files.append({"name": path.name, "inputBytes": path.stat().st_size, "inputSha256": digest(path),
        "outputBytes": converted.stat().st_size, "outputSha256": digest(converted)})

lock = tomllib.loads((root / "experience/tools/review-chunks/rust/Cargo.lock").read_text())
archives = []
for package in lock["package"]:
    if "checksum" not in package:
        continue
    name = f'{package["name"]}-{package["version"]}'
    matches = list((workspace / "tooling/cargo-home/registry/cache").glob(f"*/{name}.crate"))
    assert len(matches) == 1, name
    checksum = digest(matches[0])
    assert checksum == package["checksum"], name
    archives.append({"package": name, "bytes": matches[0].stat().st_size, "sha256": checksum})

result = {
    "retainedAt": datetime.datetime.now(datetime.timezone.utc).isoformat(),
    "command": ["artifacts/realism-01/review-chunks/tooling/target/release/review-rad-encoding",
        str(inputs.relative_to(root) / "knock-original-lod.rad"), str(outputs.relative_to(root))],
    "observedExitCode": 1,
    "exitMeaning": "Complete conversion and decoded comparison; identity gate rejected the derivative",
    "source": "Knock Community Hall, Canada; scbenoit; CC BY 4.0; approved streamed SH2 derivative",
    "sourcePage": "https://superspl.at/scene/0ff2e6dc",
    "upstreamCommit": "ffe210dc0a45d0515a06c9235878108112827d61",
    "binarySha256": digest(workspace / "tooling/target/release/review-rad-encoding"),
    "binaryBytes": (workspace / "tooling/target/release/review-rad-encoding").stat().st_size,
    "inputBytes": sum(item["inputBytes"] for item in files),
    "outputBytes": sum(item["outputBytes"] for item in files),
    "inputPagesAbove2MiB": sum(item["inputBytes"] > 2 * 1024**2 for item in files if item["name"].endswith(".radc")),
    "outputPagesAbove2MiB": sum(item["outputBytes"] > 2 * 1024**2 for item in files if item["name"].endswith(".radc")),
    "files": files,
    "dependencyArchives": archives,
    "releaseEligible": False,
    "limitations": "CPU decoded-value experiment. No browser or visual acceptance; no physical-device evidence; no Kyoto capture coverage. Offline verification checks receipts and arithmetic; reproducing decoded comparison requires restored source assets/tooling.",
}
result["byteChange"] = result["outputBytes"] - result["inputBytes"]
(evidence / "result.json").write_text(json.dumps(result, indent=2) + "\n")

copies = {
    "comparison.json": outputs / "comparison.json",
    "conversion-output.txt": workspace / "s8-delta-01.txt",
    "tooling-restoration.json": workspace / "tooling-restoration.json",
    "build-output.txt": workspace / "build.txt",
    "approved-package-manifest.json": root / "experience/evidence/realism-01/review-loading/candidate/package-manifest.json",
    "source-acquisition.json": root / "experience/evidence/realism-01/qualification/splat-streaming/conversion/acquisition.json",
}
for relative in ["restore-tooling.py", "retain.py", "rust/Cargo.toml", "rust/Cargo.lock", "rust/src/main.rs"]:
    copies[f"producers/{relative}"] = root / "experience/tools/review-chunks" / relative
for relative in ["LICENSE", "rust/build-lod/src/main.rs", "rust/spark-lib/src/rad.rs", "rust/spark-lib/src/chunk_tree.rs"]:
    copies[f"upstream/{relative}"] = workspace / "tooling/spark-source" / relative
for name, source in copies.items():
    target = evidence / name
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(source, target)

entries = []
for path in sorted(evidence.rglob("*")):
    if not path.is_file() or path.name in ["README.md", "manifest.json"]:
        continue
    relative = str(path.relative_to(evidence))
    entries.append({"path": relative, "bytes": path.stat().st_size, "sha256": digest(path),
        "source": "Official Spark pinned source" if relative.startswith("upstream/") else "Local CPU trial and exact producer snapshot",
        "date": result["retainedAt"], "rights": "MIT" if relative.startswith("upstream/") else "Repository-authored tool or measurement; no capture pixels included",
        "location": "Knock Community Hall source-relative coordinates; no Kyoto coverage",
        "method": "Exact retained bytes; SHA-256",
        "limitations": result["limitations"]})
(evidence / "manifest.json").write_text(json.dumps({"schemaVersion": 1, "files": entries}, indent=2) + "\n")
verify(evidence)
