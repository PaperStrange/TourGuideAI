import argparse
import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
COMMIT = "58117204c86bbb11a0b25b26a8987676cf11274d"
UPSTREAM = {
    "Interface.h": "libs/MVS/Interface.h",
    "OBJ.cpp": "libs/IO/OBJ.cpp",
    "OBJ.h": "libs/IO/OBJ.h",
    "SceneTexture.cpp": "libs/MVS/SceneTexture.cpp",
    "Mesh.cpp": "libs/MVS/Mesh.cpp",
    "TextureMesh.cpp": "apps/TextureMesh/TextureMesh.cpp"
}


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--write", action="store_true")
    args = parser.parse_args()
    manifest = ROOT / "manifest.json"
    if args.write:
        records = []
        for path in sorted(ROOT.rglob("*")):
            if not path.is_file() or path == manifest or "__pycache__" in path.parts:
                continue
            relative = str(path.relative_to(ROOT))
            source = "Repository-authored independent audit of connector-surface/run-02"
            rights = "Repository-authored analysis; accompanying third-party licenses apply to retained upstream sources."
            method = "Read source or execute audit against the frozen actual reconstruction; retain bytes unchanged."
            if path.parent.name == "upstream":
                source = "https://raw.githubusercontent.com/cdcseacave/openMVS/" + COMMIT + "/" + UPSTREAM[path.name]
                rights = "Boost-1.0; Copyright 2007 cDc@seacave" if path.name in {"OBJ.cpp", "OBJ.h"} else "OpenMVS AGPL-3.0 and original notice-preservation terms"
                method = "Download pinned official source and retain unchanged."
            elif path.parent.name == "licenses":
                source = "Original publisher or Debian package copyright receipt; see dependencies.json"
                rights = "Original notices retained verbatim."
                method = "Retain original license or copyright receipt unchanged."
            records.append({"path": relative, "source": source, "date": "2026-11-25", "rights": rights,
                "location": "Kyoto connector experiment; local native reconstruction coordinates where applicable",
                "method": method, "limitations": "Settings and preservation evidence; route completeness and held-out appearance remain separate gates.",
                "sha256": digest(path), "bytes": path.stat().st_size})
        assert not manifest.exists()
        manifest.write_text(json.dumps({"schemaVersion": 1, "records": records}, indent=2) + "\n")
    data = json.loads(manifest.read_text())
    for record in data["records"]:
        path = (ROOT / record["path"]).resolve()
        assert path.is_relative_to(ROOT)
        assert path.stat().st_size == record["bytes"]
        assert digest(path) == record["sha256"], record["path"]
    print(json.dumps({"verifiedRecords": len(data["records"])}))


if __name__ == "__main__":
    main()
