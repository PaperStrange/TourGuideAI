import argparse
import hashlib
import json
from pathlib import Path

from pygltflib import GLTF2


def inspect_model(path):
    document = GLTF2().load(str(path))
    primitives = [primitive for mesh in document.meshes for primitive in mesh.primitives]
    triangle_count = 0
    for primitive in primitives:
        if primitive.mode not in (None, 4):
            raise ValueError('This inspection requires triangle primitives')
        accessor = primitive.indices if primitive.indices is not None else primitive.attributes.POSITION
        count = document.accessors[accessor].count
        if count % 3:
            raise ValueError('Triangle accessor count must be divisible by three')
        triangle_count += count // 3
    metadata = [{'name': node.name, 'extras': node.extras} for node in document.nodes if node.extras]
    logs = path.with_suffix('.log').read_text()
    return {
        'file': path.name,
        'bytes': path.stat().st_size,
        'sha256': hashlib.sha256(path.read_bytes()).hexdigest(),
        'generator': document.asset.generator,
        'meshCount': len(document.meshes),
        'primitiveCount': len(primitives),
        'triangleCount': triangle_count,
        'materialCount': len(document.materials),
        'imageCount': len(document.images),
        'sceneExtras': [scene.extras for scene in document.scenes],
        'nodeMetadata': metadata,
        'reportedErrors': [line for line in logs.splitlines() if line.startswith('ERROR')],
        'reportedWarnings': [line for line in logs.splitlines() if line.startswith('WARNING')],
        'productionAcceptance': 'blocked-by-converter-errors',
        'validationScope': 'Structural counts and retained metadata only; no claim of complete geometry, visual quality or walkability.'
    }


parser = argparse.ArgumentParser()
parser.add_argument('--models', nargs='+', type=Path, required=True)
parser.add_argument('--output', type=Path, required=True)
args = parser.parse_args()
results = [inspect_model(path) for path in args.models]
args.output.write_text(json.dumps(results, ensure_ascii=False, indent=2, allow_nan=False) + '\n')
print(json.dumps([{key: item[key] for key in ('file', 'bytes', 'triangleCount', 'primitiveCount', 'imageCount', 'productionAcceptance')} for item in results]))
