import argparse
import hashlib
import io
import json
from pathlib import Path
from statistics import mean

from PIL import Image
from pygltflib import GLTF2


parser = argparse.ArgumentParser()
parser.add_argument('--assets', type=Path, required=True)
parser.add_argument('--output', type=Path, required=True)
args = parser.parse_args()
model_path = args.assets / 'scene.glb'
policy_path = args.assets / 'materials.json'
policy = json.loads(policy_path.read_text())['surfacePolicy']['glazing']
model = GLTF2().load(str(model_path))
binary = model.binary_blob()
images = [(index, image) for index, image in enumerate(model.images) if image.name == 'wako-glazing-tint']
assert len(images) == 1, 'Expected one original embedded glazing tint'
image_index, image_record = images[0]
assert image_record.uri is None and image_record.mimeType == 'image/png'
view = model.bufferViews[image_record.bufferView]
assert view.buffer == 0
offset = view.byteOffset or 0
png_bytes = binary[offset:offset + view.byteLength]
glass_materials = [material for material in model.materials if material.name in policy['materials']]
assert len(glass_materials) == 2
assert all(model.textures[material.pbrMetallicRoughness.baseColorTexture.index].source == image_index
           for material in glass_materials)


def digest(data):
    return hashlib.sha256(data).hexdigest()


def srgb_to_linear(value):
    return value / 12.92 if value <= .04045 else ((value + .055) / 1.055) ** 2.4


# 通过成熟的 glTF 与 PNG 读取器检查实际模型中的贴图及其线性颜色。
with Image.open(io.BytesIO(png_bytes)) as image:
    assert image.mode == 'RGB', image.mode
    channels = list(zip(*image.get_flattened_data()))
    decoded = [[srgb_to_linear(value / 255) for value in channel] for channel in channels]
    linear_mean = [mean(channel) for channel in decoded]
    expected = policy['intendedLinearBaseColor']
    errors = [abs(actual - intended) for actual, intended in zip(linear_mean, expected)]
    assert max(errors) < .002, {'linearMean': linear_mean, 'expected': expected}
    result = {
        'modelSha256': digest(model_path.read_bytes()),
        'image': {'name': image_record.name, 'sha256': digest(png_bytes),
                  'width': image.width, 'height': image.height, 'channels': 3,
                  'encodedByteMean': [mean(channel) for channel in channels]},
        'materialPolicySha256': digest(policy_path.read_bytes()),
        'encoding': policy['baseColorEncoding'],
        'intendedLinearBaseColor': expected,
        'actualDecodedLinearMean': linear_mean,
        'absoluteMeanError': errors,
        'actualDecodedLinearRanges': [[min(channel), max(channel)] for channel in decoded],
        'scope': 'Actual embedded original PNG encoding; visual acceptance and GPU allocation are separate.',
        'auditScriptSha256': digest(Path(__file__).read_bytes()),
    }
args.output.parent.mkdir(parents=True, exist_ok=True)
args.output.write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps(result, indent=2))
