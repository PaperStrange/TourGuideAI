import argparse
import hashlib
import json
from pathlib import Path
import shutil


def identity(path, base):
    data = path.read_bytes()
    return {"path": str(path.relative_to(base)), "bytes": len(data), "sha256": hashlib.sha256(data).hexdigest()}


def main(root):
    artifacts = root / "artifacts/realism-01/splat-qualification"
    output = root / "experience/evidence/realism-01/qualification/splat-compatibility"
    output.mkdir(parents=True, exist_ok=True)
    report = json.loads((artifacts / "run-02/result.json").read_text())
    if not report["completed"] or len(report["captures"]) != 2:
        raise ValueError("Completed local browser observation required")
    files = []
    common = {"source": "Actual local Chromium diagnostic using Spark 2.4.0, Three 0.186.1 and pinned rcmt shoe.splat",
              "date": report["finishedAt"], "rights": "Source dataset card declares MIT (rcmt); Spark MIT (World Labs); Three MIT; diagnostic by TourGuideAI",
              "location": "Non-Kyoto shoe object; source capture location/date unverified",
              "method": "Unchanged original diagnostic output copied with SHA-256 verification",
              "limitations": "Engineering compatibility only; diffuse/fragmentary source appearance, source ownership, Kyoto quality, physical performance and complete resource accounting remain unqualified"}

    def copy(source, name, provenance=None):
        target = output / name
        shutil.copyfile(source, target)
        if source.read_bytes() != target.read_bytes():
            raise ValueError(f"Copied evidence differs: {name}")
        files.append({**common, **(provenance or {}), **identity(target, output)})

    for capture in report["captures"]:
        source = artifacts / "run-02" / capture["path"]
        if identity(source, source.parent) != {key: capture[key] for key in ["path", "bytes", "sha256"]}:
            raise ValueError("Captured image changed")
        copy(source, source.name, {"date": capture["date"], "method": "Original Playwright canvas JPEG, quality 92, after source initialization/awaited sort/submitted frame or native orbit"})
    copy(artifacts / "run-02/result.json", "result.json")
    copy(artifacts / "run-01/result.json", "startup-failure.json", {"date": "2026-11-06", "limitations": "Browser launch failed before page execution; this attempt supplies no renderer observation; historical driver hash retained in original report"})
    copy(artifacts / "run-01.log", "startup-failure.txt", {"date": "2026-11-06", "method": "Original process stderr/stdout; launch attempt failed at Chromium socket-path setup", "limitations": "Historical launch diagnostic; source page did not execute"})
    downloads = artifacts / "downloads"
    receipts = json.loads((downloads / "download-receipts.json").read_text())
    copy(downloads / "download-receipts.json", "download-receipts.json")
    retain_names = {"spark-readme.md": "spark-readme.txt", "spark-license.txt": "spark-license.txt",
        "spark-renderer.md": "spark-renderer.txt", "splat-mesh.md": "splat-mesh.txt",
        "sample-readme.md": "sample-license-card.txt", "sample-tree.json": "sample-tree.json", "spark-package.json": "spark-package.json"}
    for record in receipts["records"]:
        if record["path"] in retain_names:
            copy(downloads / record["path"], retain_names[record["path"]], {key: record[key] for key in common})
    for record in report["toolSources"]:
        if identity(root / record["path"], root) != record:
            raise ValueError("Successful browser producer changed")
    producers = [root / item["path"] for item in report["toolSources"]]
    producers += [root / "experience/tools/splat-qualification/retain.py", root / "experience/tools/splat-qualification/verify.py"]
    manifest = {"schemaVersion": 1, "status": "engineering-compatibility-only", "files": files,
                "producers": [identity(path, root) for path in producers], "limitations": common["limitations"]}
    (output / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
    print(json.dumps({"files": len(files), "bytes": sum(item["bytes"] for item in files)}))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=Path, required=True)
    main(parser.parse_args().root.resolve())
