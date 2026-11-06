import hashlib
import json
from pathlib import Path
import shutil


ROOT = Path(__file__).resolve().parents[3]
RAW = ROOT / "artifacts/realism-01/splat-fidelity"
DESTINATION = ROOT / "experience/evidence/realism-01/qualification/splat-fidelity"


def main():
    DESTINATION.mkdir(parents=True, exist_ok=True)
    groups = [
        ("run-03", "shoe", ["result.json", "comparison.json", "spark-initial.jpg", "independent-initial.jpg", "spark-orbit.jpg", "independent-orbit.jpg"]),
        ("hall-run-02", "hall/default", ["result.json", "comparison.json", "publisher-camera.json", "publisher-initial.jpg", "spark-initial.jpg", "spark-orbit.jpg", "spark-dolly.jpg"]),
        ("hall-run-03-focal2", "hall/focal2", ["result.json", "comparison.json", "publisher-camera.json", "publisher-initial.jpg", "spark-initial.jpg"]),
        ("run-01", "failures/shoe-index-assumption", ["result.json"]),
        ("hall-run-01", "failures/hall-animated-reference", ["result.json", "publisher-initial.jpg"]),
        ("preview-check-02", "preview", ["result.json", "preview.jpg"]),
        ("preview-check", "failures/preview-missing-transitive-import", ["result.json", "package-manifest.json"])]
    for source, destination, names in groups:
        target = DESTINATION / destination
        target.mkdir(parents=True, exist_ok=True)
        for name in names:
            shutil.copy2(RAW / source / name, target / name)
        snapshots = RAW / source / "tool-snapshot"
        if snapshots.exists():
            shutil.copytree(snapshots, target / "tool-snapshot", dirs_exist_ok=True)
    shutil.copy2(RAW / "run-02.log", DESTINATION / "failures/local-socket-denied.txt")
    shutil.copy2(RAW / "calibration-comparison.json", DESTINATION / "hall/calibration-comparison.json")
    for name in ("knock-source-receipt.json", "knock-original-acquisition.json", "knock-published-viewer-config.json", "knock-credit.txt", "supersplat-viewer-license.txt", "playcanvas-license.txt"):
        shutil.copy2(RAW / "research" / name, DESTINATION / name)
    for name in ("download-receipts.json", "independent-package.json", "independent-license.txt"):
        shutil.copy2(RAW / "downloads" / name, DESTINATION / name)
    shutil.copy2(RAW / "local-preview/package-manifest.json", DESTINATION / "preview/package-manifest.json")
    files = []
    for path in sorted(DESTINATION.rglob("*")):
        if not path.is_file() or path.name == "manifest.json":
            continue
        name = str(path.relative_to(DESTINATION))
        data = path.read_bytes()
        shoe = name.startswith("shoe/") or name.startswith("failures/shoe") or name.startswith("independent")
        files.append({"path": name, "bytes": len(data), "sha256": hashlib.sha256(data).hexdigest(),
            "source": "Original rcmt shoe.splat through Spark2.4.0 and GaussianSplats3D0.4.7" if shoe else "Knock Community Hall by scbenoit, https://superspl.at/scene/0ff2e6dc; original publisher inputs and local Chromium diagnostics",
            "date": "2026-11-06",
            "rights": "rcmt dataset card MIT; Spark World Labs MIT; GaussianSplats3D Mark Kellogg MIT; Three MIT" if shoe else "Architectural model scbenoit CC BY 4.0; Spark/Three/PlayCanvas/SuperSplatViewer MIT. Source receipt distinguishes publisher wrapper/poster rights; those raw assets remain ignored.",
            "location": "Shoe object; capture location unverified" if shoe else "Publisher-identified Knock Community Hall, Innisfil Ontario; exact coordinate and capture date unverified",
            "method": "Unchanged actual browser capture/report/source receipt, or explicit diagnostic document; copied bytes SHA256 retained; historical producer snapshots retained alongside reports",
            "limitations": "Non-Kyoto engineering evidence; no physical-device performance, complete GPU resource accounting, pedestrian coverage, night or full-route qualification. Failed/invalid earlier comparisons remain named under failures."})
    producers = []
    for path in sorted((ROOT / "experience/tools/splat-fidelity").glob("*")):
        if path.is_file():
            data = path.read_bytes(); producers.append({"path": str(path.relative_to(ROOT)), "bytes": len(data), "sha256": hashlib.sha256(data).hexdigest()})
    result = {"schemaVersion": 1, "status": "architectural-source-fidelity-engineering-diagnostic", "files": files, "producers": producers,
        "limitations": "Matched renderer comparison and native inputs are observed. Residual image differences, initial transfer budget and headless hidden/resume remain unresolved. No Kyoto route gate is passed."}
    (DESTINATION / "manifest.json").write_text(json.dumps(result, indent=2) + "\n")
    print(json.dumps({"files": len(files), "producers": len(producers)}))


if __name__ == "__main__":
    main()
