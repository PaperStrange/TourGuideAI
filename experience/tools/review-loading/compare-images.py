import hashlib
import json
import math
import sys

from PIL import Image, ImageChops


reference = Image.open(sys.argv[1]).convert("RGBA")
candidate = Image.open(sys.argv[2]).convert("RGBA")
assert reference.size == candidate.size
reference_bytes = reference.tobytes()
candidate_bytes = candidate.tobytes()
histogram = ImageChops.difference(reference.convert("RGB"), candidate.convert("RGB")).histogram()
counts = [sum(histogram[value + band * 256] for band in range(3)) for value in range(256)]
channels = reference.width * reference.height * 3
rank = math.ceil(channels * 0.95)
accumulated = 0
percentile = 0
for value, count in enumerate(counts):
    accumulated += count
    if accumulated >= rank:
        percentile = value
        break
alpha_histogram = ImageChops.difference(reference.getchannel("A"), candidate.getchannel("A")).histogram()
print(json.dumps({
    "width": reference.width,
    "height": reference.height,
    "referencePixelSha256": hashlib.sha256(reference_bytes).hexdigest(),
    "candidatePixelSha256": hashlib.sha256(candidate_bytes).hexdigest(),
    "meanAbsoluteError255": sum(value * count for value, count in enumerate(counts)) / channels,
    "differingRgbChannels": sum(counts[1:]),
    "p95ChannelError": percentile,
    "maxChannelError": max(value for value, count in enumerate(counts) if count),
    "alphaMismatches": sum(alpha_histogram[1:]),
    "exactPixels": reference_bytes == candidate_bytes,
}))
