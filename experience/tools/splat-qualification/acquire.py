import argparse
import base64
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import tarfile
from urllib.request import Request, urlopen


SPARK_REVISION = "ffe210dc0a45d0515a06c9235878108112827d61"
SAMPLE_REVISION = "9a68bdb08cb22d7dd329d8f2218424ea09f79530"
LIMIT = 100_000_000


def main(output):
    output.mkdir(parents=True, exist_ok=True)
    raw = f"https://raw.githubusercontent.com/sparkjsdev/spark/{SPARK_REVISION}/"
    sample = f"https://huggingface.co/datasets/rcmt/splat-samples/"
    sources = [
        ("spark-readme.md", raw + "README.md", "World Labs", "MIT software/documentation"),
        ("spark-license.txt", raw + "LICENSE", "World Labs", "MIT software/documentation"),
        ("spark-renderer.md", raw + "docs/docs/spark-renderer.md", "World Labs", "MIT software/documentation"),
        ("splat-mesh.md", raw + "docs/docs/splat-mesh.md", "World Labs", "MIT software/documentation"),
        ("spark-package.json", "https://registry.npmjs.org/@sparkjsdev/spark/2.4.0", "World Labs / npm registry", "MIT software metadata"),
        ("sample-readme.md", sample + f"raw/{SAMPLE_REVISION}/README.md", "rcmt", "Dataset card declares MIT"),
        ("sample-tree.json", f"https://huggingface.co/api/datasets/rcmt/splat-samples/tree/{SAMPLE_REVISION}", "rcmt / Hugging Face", "Public dataset metadata; dataset card declares MIT"),
        ("shoe.splat", sample + f"resolve/{SAMPLE_REVISION}/shoe.splat", "rcmt", "Dataset card declares MIT; original capture ownership/date/location unverified"),
        ("spark-2.4.0.tgz", "https://registry.npmjs.org/@sparkjsdev/spark/-/spark-2.4.0.tgz", "World Labs / npm registry", "MIT software"),
    ]
    records = []
    total = 0
    for name, url, publisher, rights in sources:
        path = output / name
        request = Request(url, headers={"User-Agent": "TourGuideAI-splat-compatibility/1.0"})
        with urlopen(request, timeout=60) as response:
            data = response.read(LIMIT - total + 1)
            if len(data) + total > LIMIT:
                raise ValueError("Acquisition exceeds 100 MB aggregate input limit")
            if response.status != 200:
                raise ValueError(f"Unexpected source status: {response.status}")
            path.write_bytes(data)
            records.append({"path": name, "source": url, "publisher": publisher,
                "date": datetime.now(timezone.utc).isoformat(), "bytes": len(data), "sha256": hashlib.sha256(data).hexdigest(),
                "rights": rights, "location": "Non-Kyoto shoe object; geographic location and acquisition date unverified" if name.startswith("sample") or name == "shoe.splat" else "Upstream renderer source",
                "method": "Unchanged HTTPS response via inherited proxy/CA; pinned revision/version",
                "limitations": "Engineering compatibility sample only; no Kyoto, source-matched comparison, realism or performance acceptance",
                "httpStatus": response.status, "contentType": response.headers.get("Content-Type")})
        total += len(data)
        (output / "download-receipts.json").write_text(json.dumps({"limitBytes": LIMIT, "records": records}, indent=2) + "\n")
    listing = json.loads((output / "sample-tree.json").read_text())
    sample_record = next(item for item in listing if item["path"] == "shoe.splat")
    actual_sample = next(item for item in records if item["path"] == "shoe.splat")
    if sample_record["lfs"]["oid"] != actual_sample["sha256"] or sample_record["size"] != actual_sample["bytes"]:
        raise ValueError("Sample differs from pinned repository LFS identity")
    package = json.loads((output / "spark-package.json").read_text())
    archive = output / "spark-2.4.0.tgz"
    integrity = "sha512-" + base64.b64encode(hashlib.sha512(archive.read_bytes()).digest()).decode()
    if package["dist"]["integrity"] != integrity or package["gitHead"] != SPARK_REVISION:
        raise ValueError("Spark package integrity or revision differs")
    with tarfile.open(archive) as bundle:
        for path in ["dist/spark.module.js", "dist/types/SplatMesh.d.ts", "dist/types/SparkRenderer.d.ts", "LICENSE"]:
            data = bundle.extractfile("package/" + path).read()
            target = output / Path(path).name
            target.write_bytes(data)
            records.append({"path": target.name, "source": sources[-1][1], "publisher": "World Labs",
                "date": datetime.now(timezone.utc).isoformat(), "bytes": len(data), "sha256": hashlib.sha256(data).hexdigest(),
                "rights": "MIT software", "location": "Upstream software",
                "method": f"Unmodified tarfile extraction of package/{path}; archive npm SHA-512 verified",
                "limitations": "Software license does not establish input scene rights or production qualification"})
    (output / "download-receipts.json").write_text(json.dumps({"limitBytes": LIMIT, "downloadedBytes": total, "records": records}, indent=2) + "\n")
    print(json.dumps({"downloadedBytes": total, "records": len(records), "sampleBytes": actual_sample["bytes"], "sparkVersion": package["version"]}))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, required=True)
    main(parser.parse_args().output)
