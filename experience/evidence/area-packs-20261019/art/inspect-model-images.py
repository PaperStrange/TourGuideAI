import argparse
import hashlib
import json
import sys
from pathlib import Path

import bpy


parser = argparse.ArgumentParser()
parser.add_argument('--model', required=True)
parser.add_argument('--output', required=True)
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
model_path = Path(args.model).resolve()
output_path = Path(args.output).resolve()
model_hash = hashlib.sha256(model_path.read_bytes()).hexdigest()

# 使用 Blender 官方 glTF importer 解码实际发布模型中的图片。
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(model_path))
images = []
for image in sorted(bpy.data.images, key=lambda item: item.name):
    width, height = image.size
    if image.source == 'VIEWER' or width == 0 or height == 0:
        continue
    first_sample = image.pixels[0]
    assert image.has_data and isinstance(first_sample, float)
    images.append({
        'name': image.name,
        'width': width,
        'height': height,
        'decodedChannels': image.channels,
        'blenderImageDepthBits': image.depth,
        'colorSpace': image.colorspace_settings.name,
        'pixelCount': width * height,
        'rgba8EquivalentBytes': width * height * 4,
        'packedEncodedBytes': image.packed_file.size if image.packed_file else None,
    })

assert len(images) == 12
assert hashlib.sha256(model_path.read_bytes()).hexdigest() == model_hash
record = {
    'model': 'experience/public/packs/ginza-wako/scene.glb',
    'modelSha256': model_hash,
    'modelBytes': model_path.stat().st_size,
    'method': 'Blender official glTF importer; decoded bpy.data.images metadata after reading pixel data',
    'blenderVersion': bpy.app.version_string,
    'auditScriptSha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
    'imageCount': len(images),
    'totalPixels': sum(item['pixelCount'] for item in images),
    'rgba8EquivalentBytes': sum(item['rgba8EquivalentBytes'] for item in images),
    'gpuAllocationMeasured': False,
    'scope': 'Base-level image dimensions multiplied by four bytes per pixel. Excludes mipmaps, driver allocation, duplicate uploads, render targets, HDR processing and shared assets. Blender decodedChannels describes importer image metadata; RGBA8 is an accounting equivalent.',
    'images': images,
}
output_path.parent.mkdir(parents=True, exist_ok=True)
output_path.write_text(json.dumps(record, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({'images': record['imageCount'], 'pixels': record['totalPixels'], 'rgba8EquivalentBytes': record['rgba8EquivalentBytes']}))
