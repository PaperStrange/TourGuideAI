import hashlib
import json
import shutil
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
METHODS = ROOT / "artifacts/realism-01/surface-methods"
DESTINATION = ROOT / "experience/evidence/realism-01/connector-surface/toolchain"


def main():
    assert not DESTINATION.exists()
    DESTINATION.mkdir(parents=True)
    upstream = METHODS / "upstream"
    pinned = "https://raw.githubusercontent.com/cdcseacave/openMVS/58117204c86bbb11a0b25b26a8987676cf11274d/"
    sources = [
        (upstream / "COPYRIGHT-v2.4.0.md", pinned + "COPYRIGHT.md", "OpenMVS AGPL and accompanying third-party notices"),
        (upstream / "DensifyPointCloud-v2.4.0.cpp", pinned + "apps/DensifyPointCloud/DensifyPointCloud.cpp", "OpenMVS AGPL"),
        (upstream / "InterfaceCOLMAP-v2.4.0.cpp", pinned + "apps/InterfaceCOLMAP/InterfaceCOLMAP.cpp", "OpenMVS AGPL"),
        (upstream / "colmap-read-write-model-3.11.1.py", "https://raw.githubusercontent.com/colmap/colmap/3.11.1/scripts/python/read_write_model.py", "COLMAP BSD; complete notice retained in source"),
        (upstream / "openmvs-release.json", "https://api.github.com/repos/cdcseacave/openMVS/releases/tags/v2.4.0", "GitHub upstream release metadata"),
        (upstream / "tag-v2.4.0.json", "https://api.github.com/repos/cdcseacave/openMVS/git/ref/tags/v2.4.0", "GitHub upstream tag metadata"),
        (upstream / "openmvs-usage.md", "https://raw.githubusercontent.com/wiki/cdcseacave/openMVS/Usage.md", "OpenMVS upstream documentation; snapshot content hash retained"),
        (upstream / "openmvs-building.md", "https://raw.githubusercontent.com/wiki/cdcseacave/openMVS/Building.md", "OpenMVS upstream documentation; snapshot content hash retained"),
        (METHODS / "verified-toolchain.json", "Local immutable release-archive verification", "MIT project research metadata"),
        (ROOT / "artifacts/realism-01/connector-surface/python-install.json", "pip installation report with package URLs and hashes", "Package licenses retained by upstream distributions"),
        (ROOT / "artifacts/realism-01/connector-surface/python-install.txt", "Actual dependency installation output", "MIT project execution metadata"),
    ]
    sources.extend((upstream / (name + "-help.txt"), "OpenMVS v2.4.0 released executable --help", "OpenMVS AGPL command documentation")
        for name in ["densify", "interface", "mesh", "texture"])
    records = []
    for path, source, rights in sources:
        name = path.name + ".txt" if path.name in {"openmvs-usage.md", "openmvs-building.md"} else path.name
        target = DESTINATION / name
        shutil.copyfile(path, target)
        data = target.read_bytes()
        sha256 = hashlib.sha256(data).hexdigest()
        records.append({"path": target.name, "bytes": len(data), "sha256": sha256,
            "originalBytes": len(data), "originalSha256": sha256, "compression": None,
            "source": source, "date": datetime.now(timezone.utc).isoformat(), "rights": rights,
            "location": "Software method for the bounded Kyoto source ranks 68–71 reconstruction",
            "method": "Exact downloaded upstream content or actual executable output",
            "limitations": "Software documentation and reproducibility evidence; no physical scene acceptance"})
    manifest = {"schemaVersion": 1, "records": records, "openMvsVersion": "2.4.0",
        "openMvsCommit": "58117204c86bbb11a0b25b26a8987676cf11274d",
        "releaseArchiveSha256": "7104ae1ddd6ca38fbca9e0e4a70b20af59e21e0b497eb7181c864fbf38ca8d00",
        "releaseArchiveBytes": 165398013, "releasedExecutablesDistributed": False,
        "limits": "Research-only tool use; review upstream third-party license notices for any later distribution."}
    (DESTINATION / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
    print(json.dumps({"retained": str(DESTINATION), "files": len(records)}))


if __name__ == "__main__":
    main()
