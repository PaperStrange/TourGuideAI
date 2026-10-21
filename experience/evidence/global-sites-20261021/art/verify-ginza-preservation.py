import argparse
import hashlib
import json
from pathlib import Path

from pygltflib import GLTF2


def digest(data):
    return hashlib.sha256(data).hexdigest()


def signatures(path, all_meshes=False):
    model = GLTF2().load(str(path))
    binary = model.binary_blob()
    parents = {child: index for index, node in enumerate(model.nodes) for child in node.children}

    def transforms(index):
        node = model.nodes[index]
        chain = transforms(parents[index]) if index in parents else []
        return chain + [{'translation': node.translation, 'rotation': node.rotation,
                         'scale': node.scale, 'matrix': node.matrix}]

    def accessor_signature(index):
        accessor = model.accessors[index]
        if accessor.sparse is not None or accessor.bufferView is None:
            raise ValueError('This audit requires the actual dense exported accessor')
        view = model.bufferViews[accessor.bufferView]
        if view.buffer != 0:
            raise ValueError('Expected the embedded GLB buffer')
        start = view.byteOffset or 0
        return {'count': accessor.count, 'type': accessor.type, 'componentType': accessor.componentType,
                'accessorByteOffset': accessor.byteOffset or 0, 'byteStride': view.byteStride,
                'bufferViewBytes': view.byteLength,
                'bufferViewSha256': digest(binary[start:start + view.byteLength])}

    result = {}
    for index, node in enumerate(model.nodes):
        if node.mesh is None or (not all_meshes and not node.name.startswith(('Wako', 'Ground_wako-paving'))):
            continue
        if node.name in result:
            raise ValueError('Duplicate mesh node name: ' + node.name)
        primitives = []
        for primitive in model.meshes[node.mesh].primitives:
            if primitive.attributes.POSITION is None or primitive.indices is None:
                raise ValueError('Expected indexed position geometry: ' + node.name)
            primitives.append({'mode': primitive.mode,
                               'positions': accessor_signature(primitive.attributes.POSITION),
                               'indices': accessor_signature(primitive.indices)})
        result[node.name] = {'transforms': transforms(index), 'primitives': primitives}
    if not result:
        raise ValueError('No Wako or paving mesh nodes found')
    return result


def main():
    parser = argparse.ArgumentParser(description='Compare retained Wako and paving geometry using pygltflib')
    parser.add_argument('--baseline', type=Path, required=True)
    parser.add_argument('--candidate', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--all-meshes', action='store_true')
    args = parser.parse_args()
    before, after = signatures(args.baseline, args.all_meshes), signatures(args.candidate, args.all_meshes)
    missing = sorted(before.keys() - after.keys())
    added = sorted(after.keys() - before.keys())
    changed = sorted(name for name in before.keys() & after.keys() if before[name] != after[name])
    report = {
        'schemaVersion': 1, 'reviewedAt': '2026-10-21',
        'method': 'pygltflib GLB parsing; exact POSITION/index buffer-view hashes, accessor layout and complete ancestor/node transforms',
        'scope': 'All mesh POSITION/index payloads and ancestor/node transforms' if args.all_meshes else 'Wako-prefixed landmark meshes and Ground_wako-paving meshes; surrounding context is intentionally outside this comparison',
        'baseline': {'path': args.baseline.as_posix(), 'sha256': digest(args.baseline.read_bytes())},
        'candidate': {'path': args.candidate.as_posix(), 'sha256': digest(args.candidate.read_bytes())},
        'checkedMeshes': len(before), 'missingMeshes': missing, 'addedMeshes': added, 'changedMeshes': changed,
        'passed': not (missing or added or changed),
        'meshSignatures': [{'name': name, 'baseline': before[name], 'candidate': after.get(name)} for name in sorted(before)],
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, ensure_ascii=False, indent=2, allow_nan=False) + '\n', encoding='utf-8')
    print(json.dumps({key: report[key] for key in ('checkedMeshes', 'missingMeshes', 'addedMeshes', 'changedMeshes', 'passed')}))
    if not report['passed']:
        raise ValueError('Ginza landmark or paving geometry differs')


if __name__ == '__main__':
    main()
