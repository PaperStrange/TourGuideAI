import argparse
import base64
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import tarfile
from urllib.request import Request, urlopen


REVISION = "2dfc83e497bd76e558fe970c54464b17b5f5c689"


def main(output):
    output.mkdir(parents=True, exist_ok=True)
    sources = [
        ("independent-package.json", "https://registry.npmjs.org/@mkkellogg/gaussian-splats-3d/0.4.7"),
        ("independent-readme.txt", f"https://raw.githubusercontent.com/mkkellogg/GaussianSplats3D/{REVISION}/README.md"),
        ("independent-license.txt", f"https://raw.githubusercontent.com/mkkellogg/GaussianSplats3D/{REVISION}/LICENSE"),
        ("independent.tgz", "https://registry.npmjs.org/@mkkellogg/gaussian-splats-3d/-/gaussian-splats-3d-0.4.7.tgz")]
    records, total = [], 0
    for name, source in sources:
        with urlopen(Request(source, headers={"User-Agent": "TourGuideAI-splat-fidelity/1.0"}), timeout=60) as response:
            data = response.read(15_000_000 - total + 1)
            if response.status != 200 or len(data) + total > 15_000_000:
                raise ValueError("Independent software acquisition exceeds its 15 MB limit or failed")
        (output / name).write_bytes(data)
        records.append({"path": name, "source": source, "date": datetime.now(timezone.utc).isoformat(),
                        "rights": "Mark Kellogg, MIT software/documentation", "location": "Independent renderer source",
                        "bytes": len(data), "sha256": hashlib.sha256(data).hexdigest(),
                        "method": "Unchanged pinned HTTPS response using inherited proxy/TLS verification",
                        "limitations": "Software comparison only; input asset rights remain separately recorded"})
        total += len(data)
    package = json.loads((output / "independent-package.json").read_text())
    data = (output / "independent.tgz").read_bytes()
    if package["dist"]["integrity"] != "sha512-" + base64.b64encode(hashlib.sha512(data).digest()).decode():
        raise ValueError("Independent renderer npm integrity differs")
    if package["gitHead"] != REVISION:
        raise ValueError("Independent renderer revision differs")
    with tarfile.open(output / "independent.tgz") as archive:
        data = archive.extractfile("package/build/gaussian-splats-3d.module.js").read()
        (output / "independent.module.js").write_bytes(data)
        records.append({"path": "independent.module.js", "source": sources[-1][1], "date": datetime.now(timezone.utc).isoformat(),
            "rights": "Mark Kellogg, MIT", "location": "Independent renderer source", "bytes": len(data),
            "sha256": hashlib.sha256(data).hexdigest(), "method": "Original tarfile member, archive npm SHA-512 verified",
            "limitations": "No product integration or source-fidelity acceptance follows from library acquisition"})
    (output / "download-receipts.json").write_text(json.dumps({"downloadedBytes": total, "limitBytes": 15_000_000, "records": records}, indent=2) + "\n")
    print(json.dumps({"downloadedBytes": total, "records": len(records)}))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, required=True)
    main(parser.parse_args().output)
