import argparse
from collections import Counter
import hashlib
from io import BytesIO
import json
from pathlib import Path

from PIL import Image
from py3dtiles.tileset.content import read_binary_tile_content


def require(condition, message):
    if not condition:
        raise ValueError(message)


def verify_originals(source_dir, downloads):
    report = json.loads((source_dir / "source-inspection.json").read_text())
    results = []
    for record in report["records"]:
        name = record["tile"]
        path = downloads / f"{name}.b3dm"
        data = path.read_bytes()
        require(len(data) == record["bytes"], f"Source byte count: {name}")
        require(hashlib.sha256(data).hexdigest() == record["sha256"], f"Source SHA-256: {name}")
        tile = read_binary_tile_content(path)
        gltf = tile.body.gltf
        properties = tile.body.batch_table.header.data
        require(len(properties["gml_id"]) == record["features"], f"Feature count: {name}")
        require(len(gltf.images) == record["imageCount"], f"Image count: {name}")
        triangles = 0
        for mesh in gltf.meshes:
            for primitive in mesh.primitives:
                require(primitive.mode == 4 and primitive.indices is not None, f"Unsupported primitive: {name}")
                count = gltf.accessors[primitive.indices].count
                require(count % 3 == 0, f"Triangle index count: {name}")
                triangles += count // 3
        require(triangles == record["triangles"], f"Triangle count: {name}")
        if "renderedLodCounts" in record:
            lods = tile.body.batch_table.get_binary_property("_lod")
            require(dict(Counter(str(int(lod)) for lod in lods)) == record["renderedLodCounts"], f"Actual LOD: {name}")
            require(properties["gml_id"] == [obj["id"] for obj in record["objects"]], f"Object IDs: {name}")
        else:
            require(properties["gml_id"] == record["objectIds"], f"Object IDs: {name}")
        for texture in gltf.images:
            require(texture.mimeType == "image/webp" and texture.bufferView is not None, f"Unsupported image: {name}")
            view = gltf.bufferViews[texture.bufferView]
            start = view.byteOffset or 0
            payload = gltf.binary_blob()[start:start + view.byteLength]
            require(len(payload) == record["textureBytes"], f"Texture byte count: {name}")
            require(hashlib.sha256(payload).hexdigest() == record["textureSha256"], f"Texture SHA-256: {name}")
            require(payload == (source_dir / f"{name}-texture.webp").read_bytes(), f"Retained original texture: {name}")
            with Image.open(BytesIO(payload)) as image:
                require(list(image.size) == record["textureSize"], f"Texture dimensions: {name}")
        results.append({"tile": name, "status": "passed", "features": record["features"],
                        "triangles": triangles, "images": len(gltf.images)})
    return {"status": "passed", "records": results,
            "limitations": "Original bytes, metadata counts and unchanged extracted textures only; no rendered appearance, route coverage or performance acceptance."}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--sources", required=True, type=Path)
    parser.add_argument("--downloads", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()
    result = verify_originals(args.sources.resolve(), args.downloads.resolve())
    text = json.dumps(result, indent=2) + "\n"
    args.output.write_text(text)
    print(text, end="")


if __name__ == "__main__":
    main()
