import hashlib
import json
import pathlib
import urllib.request

from PIL import Image


DIRECTORY = pathlib.Path(__file__).resolve().parent
ROOT = DIRECTORY.parents[4]
CACHE = ROOT / "artifacts/realism-01/reference-qualification"


def acquire():
    specifications = json.loads((DIRECTORY / "sources.json").read_text())
    CACHE.mkdir(parents=True, exist_ok=True)
    (DIRECTORY / "images").mkdir(exist_ok=True)
    results = []
    for source in specifications["images"]:
        request = urllib.request.Request(
            source["thumbnailUrl"],
            headers={"User-Agent": "TourGuideAI-reference-qualification/1.0"},
        )
        with urllib.request.urlopen(request, timeout=60) as response:
            payload = response.read()
            content_type = response.headers.get_content_type()
            assert content_type == "image/jpeg", content_type
            path = DIRECTORY / "images" / (source["id"] + ".jpg")
            path.write_bytes(payload)
            with Image.open(path) as image:
                image.verify()
            with Image.open(path) as image:
                dimensions = list(image.size)
            results.append({
                "id": source["id"],
                "path": str(path.relative_to(DIRECTORY)),
                "sha256": hashlib.sha256(payload).hexdigest(),
                "bytes": len(payload),
                "dimensions": dimensions,
                "retrievedAt": response.headers.get("Date"),
                "finalUrl": response.url,
                "method": "Unmodified publisher-generated JPEG thumbnail, downloaded over HTTPS and decoded with Pillow",
            })
    (DIRECTORY / "downloads.json").write_text(json.dumps(results, ensure_ascii=False, indent=2) + "\n")
    for provider in specifications["providers"]:
        request = urllib.request.Request(provider["url"], headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(request, timeout=60) as response:
            payload = response.read()
            path = CACHE / (provider["id"] + ".html")
            path.write_bytes(payload)
            result = {
                "id": provider["id"],
                "url": provider["url"],
                "retrievedAt": response.headers.get("Date"),
                "bytes": len(payload),
                "sha256": hashlib.sha256(payload).hexdigest(),
                "cachePath": str(path.relative_to(ROOT)),
                "rights": "Provider website; raw HTML retained only in ignored research cache. Tracked evidence contains attributed pricing facts and the receipt hash.",
            }
            (DIRECTORY / (provider["id"] + "-receipt.json")).write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n")


if __name__ == "__main__":
    acquire()
