import concurrent.futures
import datetime
import hashlib
import json
import os
import pathlib
import subprocess
import tarfile
import urllib.request


root = pathlib.Path(__file__).resolve().parents[3]
workspace = root / "artifacts/realism-01/review-chunks"
tooling = workspace / "tooling"
receipt_path = root / "experience/evidence/realism-01/qualification/splat-streaming/conversion/acquisition.json"
receipt = json.loads(receipt_path.read_text())
prefix = "artifacts/realism-01/splat-streaming/tooling/"
tooling.mkdir(parents=True, exist_ok=True)


def acquire(item):
    relative = pathlib.Path(item["path"]).relative_to(prefix)
    destination = tooling / relative
    destination.parent.mkdir(parents=True, exist_ok=True)
    if not destination.exists():
        with urllib.request.urlopen(item["url"], timeout=60) as response:
            data = response.read()
        destination.write_bytes(data)
    data = destination.read_bytes()
    digest = hashlib.sha256(data).hexdigest()
    assert digest == item["sha256"], destination
    assert len(data) == item["bytes"], destination
    return {
        "sourceUrl": item["url"],
        "path": str(destination.relative_to(root)),
        "bytes": len(data),
        "sha256": digest,
        "verifiedAt": datetime.datetime.now(datetime.timezone.utc).isoformat(),
    }


with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:
    files = list(executor.map(acquire, receipt["files"]))

native = tooling / "native"
temporary = tooling / "temporary"
temporary.mkdir(exist_ok=True)
environment = dict(os.environ, TMPDIR=str(temporary))
commands = []
for component in ["cargo", "rust-std", "rustc"]:
    name = f"{component}-1.91.0-x86_64-unknown-linux-gnu"
    unpacked = tooling / "unpacked"
    if not (unpacked / name).exists():
        with tarfile.open(tooling / "downloads" / f"{name}.tar.xz") as archive:
            archive.extractall(unpacked, filter="data")
    command = ["bash", str(unpacked / name / "install.sh"), f"--prefix={native}", "--disable-ldconfig"]
    result = subprocess.run(command, env=environment, capture_output=True, text=True, check=True)
    log = tooling / f"{component}-install.txt"
    log.write_text(result.stdout + result.stderr)
    commands.append({"command": command, "exitCode": result.returncode, "log": str(log.relative_to(root))})

output = {
    "sourceReceipt": str(receipt_path.relative_to(root)),
    "sourceReceiptSha256": hashlib.sha256(receipt_path.read_bytes()).hexdigest(),
    "sparkCommit": receipt["sparkCommit"],
    "files": files,
    "commands": commands,
}
(workspace / "tooling-restoration.json").write_text(json.dumps(output, indent=2) + "\n")
print(json.dumps({"verifiedFiles": len(files), "native": str(native)}, indent=2))
