import argparse
import hashlib
import io
import json
from pathlib import Path
import sys
from urllib.request import Request, urlopen
import zipfile

from bs4 import BeautifulSoup


ROOT = Path(__file__).resolve().parents[3]
EVIDENCE = ROOT / "experience/evidence/realism-01/qualification/splat-fidelity"
LIMIT = 40_000_000


def contained(root, relative):
    # 清单只能指向缓存目录内的文件，拒绝绝对路径和目录穿越。
    candidate = (root / relative).resolve()
    if Path(relative).is_absolute() or not candidate.is_relative_to(root.resolve()):
        raise ValueError(f"Path leaves the research cache: {relative}")
    return candidate


def verify(data, record):
    if len(data) != record["bytes"] or hashlib.sha256(data).hexdigest() != record["sha256"]:
        raise ValueError(f"Pinned bytes changed: {record.get('path', record.get('archive'))}")


def retain(path, data):
    # 先验证再保存；已有证据不同则停止，不能静默覆盖失败记录。
    if path.exists():
        if path.read_bytes() != data:
            raise ValueError(f"Existing evidence differs: {path}")
        return
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("xb") as stream:
        stream.write(data)


def main(cache, offline):
    manifest = json.loads((EVIDENCE / "source-files.json").read_text())
    layout = json.loads((EVIDENCE / "archive-layout.json").read_text())
    expected = sum(record["bytes"] for record in manifest["files"])
    if expected != manifest["totalSourceBytes"] or expected > min(LIMIT, manifest["networkLimitBytes"]):
        raise ValueError("Source manifest exceeds the 40 MB acquisition limit")
    names = [record["path"] for record in manifest["files"]]
    if len(names) != len(set(names)):
        raise ValueError("Duplicate source paths in manifest")
    downloaded = 0
    receipts = []
    for record in manifest["files"]:
        path = contained(cache, record["path"])
        if path.exists():
            data = path.read_bytes()
            method = "verified-cache"
        elif offline:
            raise FileNotFoundError(f"Offline input missing: {path}")
        else:
            if not record["url"].startswith("https://"):
                raise ValueError("Only HTTPS source URLs are accepted")
            request = Request(record["url"], headers={"User-Agent": "TourGuideAI-splat-fidelity/1.0"})
            with urlopen(request, timeout=60) as response:
                if response.status != 200 or not response.geturl().startswith("https://"):
                    raise ValueError(f"Invalid source response: {record['path']}")
                # 限量读取保留原始字节；超过清单长度或总预算立即失败。
                data = response.read(min(record["bytes"], LIMIT - downloaded) + 1)
            downloaded += len(data)
            if downloaded > LIMIT:
                raise ValueError("Acquisition exceeds 40 MB")
            method = "unchanged-https-response"
        verify(data, record)
        if not path.exists():
            retain(path, data)
        receipts.append({"path": record["path"], "sha256": record["sha256"], "method": method})

    # 使用标准 ZIP 库及原始条目时间、属性和顺序，重建完全相同的归档。
    archive_buffer = io.BytesIO()
    with zipfile.ZipFile(archive_buffer, "w", compression=zipfile.ZIP_STORED) as archive:
        archive.comment = bytes.fromhex(layout["commentHex"])
        for item in layout["entries"]:
            if item["source_path"] not in names:
                raise ValueError("Archive entry has no verified source")
            info = zipfile.ZipInfo(item["filename"], tuple(item["date_time"]))
            for key in ("external_attr", "internal_attr", "create_system", "create_version",
                        "extract_version", "compress_type", "flag_bits"):
                setattr(info, key, item[key])
            info.extra = bytes.fromhex(item["extra_hex"])
            info.comment = bytes.fromhex(item["comment_hex"])
            archive.writestr(info, contained(cache, item["source_path"]).read_bytes())
    archive_data = archive_buffer.getvalue()
    verify(archive_data, layout)
    retain(contained(cache, layout["archive"]), archive_data)

    # 采用成熟 HTML 和 JSON 解析器提取发布者配置，不修改场景内容。
    document = BeautifulSoup(contained(cache, "knock-viewer.html").read_text(), "html.parser")
    bootstrap = document.find("script", {"id": "sse-bootstrap", "type": "application/json"})
    if bootstrap is None:
        raise ValueError("Publisher viewer bootstrap JSON is missing")
    config = json.loads(bootstrap.get_text())
    encoded = (json.dumps(config, indent=2) + "\n").encode()
    retain(contained(cache, "knock-published-viewer-config.json"), encoded)
    print(json.dumps({"offline": offline, "verifiedFiles": len(receipts),
                      "sourceBytes": expected, "downloadedBytes": downloaded,
                      "archiveSha256": hashlib.sha256(archive_data).hexdigest(),
                      "configSha256": hashlib.sha256(encoded).hexdigest(), "receipts": receipts}, indent=2))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--cache", type=Path, default=ROOT / "artifacts/realism-01/splat-fidelity/research")
    parser.add_argument("--offline", action="store_true", help="Verify retained bytes without network access")
    args = parser.parse_args()
    try:
        main(args.cache, args.offline)
    except (OSError, ValueError, KeyError, zipfile.BadZipFile) as error:
        sys.exit(f"Hall acquisition failed closed: {error}")
