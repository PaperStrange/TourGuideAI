import hashlib
import json
import pathlib
import urllib.parse

from PIL import Image


DIRECTORY = pathlib.Path(__file__).resolve().parent
ROOT = DIRECTORY.parents[4]


def source_key(url):
    filename = urllib.parse.unquote(urllib.parse.urlsplit(url).path.rsplit("/", 1)[-1])
    return filename.removeprefix("File:").replace("_", " ").casefold()


def verify():
    specifications = json.loads((DIRECTORY / "sources.json").read_text())
    downloads = json.loads((DIRECTORY / "downloads.json").read_text())
    sources = {source["id"]: source for source in specifications["images"]}
    assert len(sources) == len(downloads) == 3
    authoring_keys = set()
    authoring_hashes = set()
    for registry_path in [
        ROOT / "experience/public/content-evidence/facade-references.json",
        ROOT / "experience/public/assets/neighborhoods/shijo-east/references.json",
    ]:
        registry = json.loads(registry_path.read_text())
        for source in registry["references"]:
            for field in ["sourceUrl", "imageUrl", "url"]:
                if field in source:
                    authoring_keys.add(source_key(source[field]))
            for field in ["imageSha256", "sha256"]:
                if field in source:
                    authoring_hashes.add(source[field])

    for download in downloads:
        source = sources[download["id"]]
        assert source["authoringUse"] is False, source["id"]
        assert source_key(source["sourceUrl"]) not in authoring_keys, source["id"]
        assert source_key(source["imageUrl"]) not in authoring_keys, source["id"]
        path = DIRECTORY / download["path"]
        payload = path.read_bytes()
        digest = hashlib.sha256(payload).hexdigest()
        assert digest == download["sha256"], source["id"]
        assert digest not in authoring_hashes, source["id"]
        assert len(payload) == download["bytes"], source["id"]
        with Image.open(path) as image:
            assert list(image.size) == download["dimensions"], source["id"]
            assert image.format == "JPEG", source["id"]
            image.verify()
        for field in ["author", "license", "licenseUrl", "capturedAt", "captureDateSource", "location", "limitations", "visualReview", "qualification"]:
            assert source[field], (source["id"], field)

    receipts_checked = 0
    for provider in specifications["providers"]:
        receipt = json.loads((DIRECTORY / (provider["id"] + "-receipt.json")).read_text())
        assert receipt["url"] == provider["url"], provider["id"]
        cache_path = ROOT / receipt["cachePath"]
        if cache_path.exists():
            payload = cache_path.read_bytes()
            assert hashlib.sha256(payload).hexdigest() == receipt["sha256"], provider["id"]
            assert len(payload) == receipt["bytes"], provider["id"]
            receipts_checked += 1
    print(json.dumps({
        "retainedImagesVerified": len(downloads),
        "authoringRegistryOverlap": 0,
        "providerReceipts": len(specifications["providers"]),
        "ignoredProviderCachesVerified": receipts_checked,
        "limits": "Registry overlap checks cannot establish photographer independence, source geometry accuracy or an untouched future evaluation set. Review each change to authoring registries before using these images for scoring.",
    }, indent=2))


if __name__ == "__main__":
    verify()
