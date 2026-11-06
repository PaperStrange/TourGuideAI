import hashlib
import json
from pathlib import Path
import zipfile


def main():
    root = Path(__file__).resolve().parents[3]
    raw = root / "artifacts/realism-01/splat-fidelity"
    retained = root / "experience/evidence/realism-01/qualification/splat-fidelity"
    acquisition = json.loads((raw / "portability-acquisition.json").read_text())
    package = json.loads((raw / "portability-preview/package-manifest.json").read_text())
    reference = json.loads((retained / "preview/package-manifest.json").read_text())
    if acquisition["mode"] != "model-preview" or acquisition["publisherReplayAcquired"] or acquisition["verifiedFiles"] != 8:
        raise ValueError("Preview acquisition requested unrelated research inputs")
    if acquisition["downloadedBytes"] != acquisition["sourceBytes"] or any(item["method"] != "unchanged-https-response" for item in acquisition["receipts"]):
        raise ValueError("Portability evidence must use a fresh network acquisition")
    if acquisition["downloadedBytes"] > 40_000_000 or acquisition["archiveBytes"] > 30_000_000:
        raise ValueError("Portability budgets exceeded")
    components = {item["path"].split("/")[-1]: item for item in acquisition["receipts"]}
    with zipfile.ZipFile(raw / "portability-model-input/knock-original.sog") as archive:
        if set(archive.namelist()) != set(components):
            raise ValueError("Archive component inventory differs")
        for name, record in components.items():
            data = archive.read(name)
            if len(data) != record["bytes"] or hashlib.sha256(data).hexdigest() != record["sha256"]:
                raise ValueError("Archive differs from downloaded original component")
    originals = {item["path"]: item for item in reference["files"]}
    if {item["path"] for item in package["files"]} != set(originals):
        raise ValueError("Portable package inventory differs from the browser-tested preview")
    for record in package["files"]:
        original = originals[record["path"]]
        data = (raw / "portability-preview" / record["path"]).read_bytes()
        if len(data) != record["bytes"] or hashlib.sha256(data).hexdigest() != record["sha256"] or any(record[key] != original[key] for key in ("bytes", "sha256")):
            raise ValueError(f"Portable package differs: {record['path']}")
    # 内容与已通过原生浏览器检查的包逐字节一致，无需重复 GPU 截图测试。
    producer = Path(__file__)
    report = {"schemaVersion": 1, "kind": "fresh-model-acquisition-portability", "pass": True,
        "downloadedBytes": acquisition["downloadedBytes"], "componentCount": len(components), "archiveSha256": acquisition["archiveSha256"],
        "identicalBrowserTestedPackageFiles": len(originals), "packageBytes": package["bytes"],
        "publisherHtmlRequired": False, "newBrowserRun": False,
        "producer": {"path": "experience/tools/splat-fidelity/check-portability.py", "bytes": producer.stat().st_size, "sha256": hashlib.sha256(producer.read_bytes()).hexdigest()},
        "limits": "Byte-identical packaging verification reuses the retained native browser result; fresh physical performance or route qualification is not claimed"}
    (raw / "portability-check.json").write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
