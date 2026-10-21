# SPDX-License-Identifier: GPL-3.0-or-later
# 原创表面纹理只使用确定性噪声与构造接缝，不读取参考照片像素。
import hashlib
from pathlib import Path

import bpy
import numpy as np


def encode_image(path, values, color_space):
    height, width, channels = values.shape
    if channels != 3:
        raise ValueError('Texture requires RGB data')
    rgba = np.ones((height, width, 4), dtype=np.float32)
    rgba[:, :, :3] = np.clip(values, 0, 1)
    image = bpy.data.images.new(path.stem, width=width, height=height, alpha=False)
    image.colorspace_settings.name = color_space
    image.pixels.foreach_set(rgba.reshape(-1))
    image.filepath_raw = str(path)
    image.file_format = 'PNG'
    image.save()
    bpy.data.images.remove(image)


def generate_textures(specifications, output_dir):
    output_dir.mkdir(parents=True, exist_ok=True)
    generated = {}
    size = 256
    yy, xx = np.mgrid[0:size, 0:size]
    for name in ('stone', 'plaster', 'tile-wall', 'granite', 'wood', 'paving', 'asphalt', 'glass', 'water'):
        spec = specifications[name]
        seed = int(hashlib.sha256(name.encode()).hexdigest()[:8], 16)
        random = np.random.default_rng(seed)
        noise = random.normal(0, 1, (size, size))
        relief = noise * (.025 if name in ('glass', 'water') else .11)
        modulation = np.ones((size, size), dtype=np.float64)
        if name in ('paving', 'tile-wall', 'stone'):
            pitch = 32 if name == 'tile-wall' else 64
            shifted = (xx + (yy // pitch % 2) * pitch / 2) % pitch
            joints = (yy % pitch < 1.5) | (shifted < 1.5)
            modulation -= joints * .13
            relief -= joints * .35
        if name == 'wood':
            grain = np.sin(xx * .35 + np.sin(yy * .024) * 2) * .035
            modulation += grain
            relief += grain * 2
        if name == 'glass':
            modulation += np.cos(yy * math_pi / size) * .09
            relief *= .01
        if name == 'water':
            relief = np.sin(xx * .13 + np.sin(yy * .08)) * .05 + noise * .006
        modulation += noise * (.014 if name == 'glass' else .025)
        srgb = np.array([int(spec['color'][index:index + 2], 16) / 255 for index in (1, 3, 5)])
        rgb = np.clip(modulation[:, :, None] * srgb, 0, 1)
        dy, dx = np.gradient(relief)
        normals = np.stack((-dx * .8, -dy * .8, np.ones_like(relief)), axis=-1)
        normals /= np.linalg.norm(normals, axis=-1, keepdims=True)
        rough = np.clip(spec['roughness'] + noise * .025, .05, .99)
        records = {}
        # Image.save 写入像素值；颜色贴图在这里明确使用 sRGB 字节值。
        for suffix, values, space in [('color', rgb, 'sRGB'),
                                      ('normal', normals * .5 + .5, 'Non-Color'),
                                      ('roughness', np.repeat(rough[:, :, None], 3, axis=2), 'Non-Color')]:
            path = output_dir / (name + '-' + suffix + '.png')
            encode_image(path, values, space)
            records[suffix] = path
        generated[name] = records
    return generated


math_pi = float(np.pi)
