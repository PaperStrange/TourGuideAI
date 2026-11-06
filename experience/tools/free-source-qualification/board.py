import argparse
import hashlib
import json
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from PIL import Image


ANNOTATIONS = [
    ("shijo-20260621-31.jpg", "SMBC stone facade · inspection only", "2026-06-21 · 3060 × 4080",
     "Curved frontage, columns, capitals,\nfluting, cornice and recessed windows.\nGround/entrance cropped; GML identity unverified."),
    ("shijo-20260621-37.jpg", "Toyoko Inn entrance · inspection only", "2026-06-21 · 4080 × 3060",
     "Canopy, warm downlights, reflective glazing,\nplants, threshold and tactile paving.\nMetric depth and floor levels unmeasured."),
    ("takase-20260624-212.jpg", "Momiji · nearby material reference", "2026-06-24 · 3060 × 4080",
     "Lanterns, wood doors, plaster, signs,\nthreshold grate and paving joints.\nRiver/deck outside view; exact frontage unverified."),
]


def board(source, output):
    receipts = json.loads((source / "download-receipts.json").read_text())
    records = {item["file"]: item for item in receipts["records"]}
    fig = plt.figure(figsize=(15, 8), facecolor="#f6f5f0")
    grid = fig.add_gridspec(2, 3, height_ratios=[5, 1.2], hspace=.08, wspace=.06)
    for index, (name, title, date, observations) in enumerate(ANNOTATIONS):
        path = source / name
        if hashlib.sha256(path.read_bytes()).hexdigest() != records[name]["sha256"]:
            raise ValueError("Original reference photo identity differs")
        with Image.open(path) as photograph:
            photograph.load()
            axis = fig.add_subplot(grid[0, index])
            axis.imshow(photograph, interpolation="hamming")
        axis.axis("off")
        axis.set_title(title, fontsize=13, pad=10)
        caption = fig.add_subplot(grid[1, index])
        caption.axis("off")
        caption.text(.01, .96, date, fontsize=10, va="top", fontweight="bold")
        caption.text(.01, .69, observations, fontsize=10, va="top", linespacing=1.5)
    fig.suptitle("Free Kyoto source intake — actual photographs", fontsize=18, y=.98)
    fig.text(.04, .065, "HAGAT hOMSZE / Wikimedia Commons · CC0 1.0 · Original full frames shown at reduced display size; source pixels unchanged.", fontsize=10)
    fig.text(.04, .035, "Shijo images share the reserved Mitsui capture family: inspection only. Momiji's business pin is 24.63 m north of the route; exact frontage remains unverified.", fontsize=9)
    fig.subplots_adjust(top=.89, bottom=.14, left=.035, right=.975)
    output.mkdir(parents=True, exist_ok=True)
    fig.savefig(output / "reference-board.png", dpi=150, metadata={"Description": "Dated CC0 art references; no 3D or current-access acceptance"})
    plt.close(fig)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    board(args.source, args.output)
