import argparse
import hashlib
import json
import urllib.parse
import urllib.request
import zipfile
from datetime import datetime, timezone
from pathlib import Path

import lxml.html


USER_AGENT = "TourGuideAI source review (https://github.com/PaperStrange/TourGuideAI)"


def acquire(url, destination, maximum_bytes, data=None):
    request = urllib.request.Request(url, data=data, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(request, timeout=90) as response:
        body = response.read(maximum_bytes + 1)
        if len(body) > maximum_bytes:
            raise ValueError(f"Source exceeds explicit byte limit: {url}")
        receipt = {"url": url, "responseUrl": response.url, "method": request.get_method(),
                   "retrievedAt": datetime.now(timezone.utc).isoformat(),
                   "headers": dict(response.headers), "bytes": len(body),
                   "sha256": hashlib.sha256(body).hexdigest(), "file": destination.name}
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_bytes(body)
    destination.with_suffix(destination.suffix + ".receipt.json").write_text(
        json.dumps(receipt, ensure_ascii=False, indent=2) + "\n")
    return body


def resource(resource_id, output, maximum_bytes):
    url = f"https://data.city.kyoto.lg.jp/resource/?id={resource_id}"
    page = acquire(url, output / f"kyoto-{resource_id}.html", 2_000_000)
    document = lxml.html.fromstring(page)
    forms = document.xpath("//form[input[@name='upload_file']]")
    if len(forms) != 1:
        raise ValueError("Expected exactly one official public download form")
    fields = {element.get("name"): element.get("value", "")
              for element in forms[0].xpath(".//input[@name]")}
    if not fields["upload_file"].endswith(".zip"):
        raise ValueError("Expected the selected official ZIP resource")
    target = urllib.parse.urljoin(url, forms[0].get("action"))
    if urllib.parse.urlparse(target).netloc != "data.city.kyoto.lg.jp":
        raise ValueError("Public resource form changed host")
    archive = output / f"kyoto-{resource_id}.zip"
    acquire(target, archive, maximum_bytes, urllib.parse.urlencode(fields).encode())
    with zipfile.ZipFile(archive) as source:
        entries = source.infolist()
        if sum(entry.file_size for entry in entries) > maximum_bytes * 40:
            raise ValueError("Unexpected expanded archive size")
        for entry in entries:
            path = Path(entry.filename)
            if path.is_absolute() or ".." in path.parts:
                raise ValueError("Archive contains an unsafe member path")
        source.extractall(output / f"kyoto-{resource_id}")
    print(json.dumps({"resource": resource_id, "archive": str(archive),
                      "members": len(entries)}, ensure_ascii=False))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("mode", choices=("resource", "page", "osm"))
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--resource-id", type=int)
    parser.add_argument("--url")
    parser.add_argument("--name")
    parser.add_argument("--maximum-bytes", type=int, default=30_000_000)
    args = parser.parse_args()
    if args.maximum_bytes <= 0:
        raise ValueError("Byte limit must be positive")
    args.output.mkdir(parents=True, exist_ok=True)
    if args.mode == "resource":
        if args.resource_id is None:
            raise ValueError("Resource mode requires resource-id")
        resource(args.resource_id, args.output, args.maximum_bytes)
    elif args.mode == "page":
        if not args.url or not args.name or Path(args.name).name != args.name:
            raise ValueError("Page mode requires URL and a plain filename")
        body = acquire(args.url, args.output / args.name, args.maximum_bytes)
        document = lxml.html.fromstring(body)
        # 保留完整页面文本供人工审核，网页脚本与样式不属于事实正文。
        for element in document.xpath("//script|//style"):
            element.drop_tree()
        (args.output / (args.name + ".txt")).write_text(document.text_content())
        print(json.dumps({"file": args.name, "bytes": len(body)}))
    else:
        bounds = [135.7593, 35.0030, 135.7734, 35.0063]
        url = "https://api.openstreetmap.org/api/0.6/map.json?" + urllib.parse.urlencode(
            {"bbox": ",".join(map(str, bounds))})
        body = acquire(url, args.output / "osm-map.json", args.maximum_bytes)
        data = json.loads(body)
        if data.get("version") != "0.6" or not data.get("elements"):
            raise ValueError("Expected an actual OSM API map response")
        print(json.dumps({"bounds": bounds, "elements": len(data["elements"]),
                          "bytes": len(body)}))


if __name__ == "__main__":
    main()
