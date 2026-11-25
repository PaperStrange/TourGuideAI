import argparse
import hashlib
import json
import shutil
import urllib.request
import zipfile
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
DESTINATION = ROOT / "artifacts/realism-01/surface-methods"
ARCHIVE_NAME = "OpenMVS_Ubuntu_x64.zip"
ARCHIVE_SHA256 = "7104ae1ddd6ca38fbca9e0e4a70b20af59e21e0b497eb7181c864fbf38ca8d00"
READER_NAME = "colmap-read-write-model-3.11.1.py"
READER_SHA256 = "f07cc962750d19d6d1edc16b1cf047292e30a43f3390e441dc407dff1d4900cf"
EXECUTABLES = ["InterfaceCOLMAP", "DensifyPointCloud", "ReconstructMesh", "TextureMesh"]


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def download(url, path, expected):
    assert not path.exists()
    request = urllib.request.Request(url, headers={"User-Agent": "TourGuideAI-research/1.0"})
    with urllib.request.urlopen(request, timeout=120) as response, path.open("xb") as output:
        shutil.copyfileobj(response, output)
    assert digest(path) == expected


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--verify-existing", action="store_true")
    args = parser.parse_args()
    archive = DESTINATION / ARCHIVE_NAME
    reader = DESTINATION / "upstream" / READER_NAME
    if not args.verify_existing:
        assert not archive.exists() and not reader.exists() and not (DESTINATION / "bin").exists()
        reader.parent.mkdir(parents=True, exist_ok=True)
        download("https://github.com/cdcseacave/openMVS/releases/download/v2.4.0/" + ARCHIVE_NAME,
            archive, ARCHIVE_SHA256)
        download("https://raw.githubusercontent.com/colmap/colmap/3.11.1/scripts/python/read_write_model.py",
            reader, READER_SHA256)
        with zipfile.ZipFile(archive) as package:
            assert all(Path(name).name == name for name in package.namelist())
            package.extractall(DESTINATION / "bin")
        for name in EXECUTABLES:
            (DESTINATION / "bin" / name).chmod(0o700)
    assert digest(archive) == ARCHIVE_SHA256 and digest(reader) == READER_SHA256
    records = []
    with zipfile.ZipFile(archive) as package:
        for name in EXECUTABLES:
            path = DESTINATION / "bin" / name
            assert digest(path) == hashlib.sha256(package.read(name)).hexdigest()
            records.append({"path": str(path.relative_to(ROOT)), "bytes": path.stat().st_size,
                "sha256": digest(path)})
    report = {"date": datetime.now(timezone.utc).isoformat(), "version": "2.4.0",
        "commit": "58117204c86bbb11a0b25b26a8987676cf11274d",
        "archiveSha256": ARCHIVE_SHA256, "colmapReaderSha256": READER_SHA256,
        "executables": records, "verified": True}
    receipt = DESTINATION / "verified-toolchain.json"
    assert not receipt.exists()
    receipt.write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps({"verified": True, "receipt": str(receipt.relative_to(ROOT))}))


if __name__ == "__main__":
    main()
