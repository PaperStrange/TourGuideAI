import argparse
import gzip
import json
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
matplotlib.rcParams["svg.hashsalt"] = "tourguideai-original-texture-density-v1"
import matplotlib.pyplot as plt
import numpy as np


def plot(source, output):
    report = json.loads((source / "texture-density.json").read_text())
    rows = json.loads(gzip.decompress((source / "triangle-measurements.json.gz").read_bytes()))
    rows = [row for row in rows if row["textured"] and row["lowerBandAreaSquareMetres"] > 0]
    area = np.array([row["lowerBandAreaSquareMetres"] for row in rows])
    fig, axes = plt.subplots(1, 2, figsize=(12, 5), gridspec_kw={"width_ratios": [1.3, 1]})
    for field, label, color in [("minimumTexelsPerMetre", "Lowest directional sampling", "#b2783e"),
                                ("geometricMeanTexelsPerMetre", "Geometric mean sampling", "#326b60")]:
        values = np.array([row[field] for row in rows])
        order = np.argsort(values, kind="stable")
        axes[0].step(values[order], np.cumsum(area[order]) / area.sum() * 100, where="post", label=label, color=color)
    reference = report["frontParallelSamplingReference"]
    for distance, value, color in [(10, reference["pixelsPerMetreAt10Metres"], "#69727f"),
                                    (5, reference["pixelsPerMetreAt5Metres"], "#9a7385")]:
        axes[0].axvline(value, linestyle="--", color=color, linewidth=1.2,
                        label=f"Screen sampling at {distance} m: {value:.1f} px/m")
    axes[0].set_xscale("symlog", linthresh=1)
    axes[0].set_xlim(0, max(250, np.max(values)))
    axes[0].set_ylim(0, 101)
    axes[0].set_xlabel("Stored texture samples per physical metre")
    axes[0].set_ylabel("Cumulative textured surface area (%)")
    axes[0].set_title(f"{report['nearRouteSelectedBuildings']} route-near buildings · lower source-relative 8 m")
    axes[0].grid(alpha=.2)
    axes[0].legend(loc="lower right", fontsize=8)
    metrics = report["mitsui"]["lowerEightMetresSourceRelative"]["areaWeighted"]
    fields = ["minimumTexelsPerMetre", "geometricMeanTexelsPerMetre", "maximumTexelsPerMetre"]
    median = np.array([metrics[field]["p50"] for field in fields])
    low = np.array([metrics[field]["p10"] for field in fields])
    high = np.array([metrics[field]["p90"] for field in fields])
    axes[1].barh([0, 1, 2], median, xerr=np.array([median - low, high - median]), color="#326b60", alpha=.85, capsize=4)
    for index, value in enumerate(median):
        axes[1].text(value + 1, index, f"{value:.2f}", va="center", fontsize=10)
    axes[1].set_yticks([0, 1, 2], ["Lowest direction", "Geometric mean", "Highest direction"])
    axes[1].invert_yaxis()
    axes[1].set_xlim(0, 20)
    axes[1].set_xlabel("Area-weighted median texels/m · whiskers p10–p90")
    axes[1].set_title("Exact Mitsui source object · LOD2")
    axes[1].grid(axis="x", alpha=.2)
    fig.suptitle("Kyoto source texture sampling", fontsize=15)
    fig.text(.02, .07, "Camera reference: 1440 × 1000, vertical FOV 60°, front-parallel surface. Reference lines are descriptive; no acceptance threshold.", fontsize=8)
    fig.text(.02, .035, "Source: Kyoto City / MLIT Project PLATEAU · CC BY 4.0. Nearby/vertical surfaces include occluded faces; optical sharpness and realism remain unverified.", fontsize=8)
    fig.tight_layout(rect=[0, .12, 1, .94])
    output.mkdir(parents=True, exist_ok=True)
    fig.savefig(output / "texture-density-board.png", dpi=150)
    fig.savefig(output / "texture-density-board.svg", metadata={"Date": None})
    plt.close(fig)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    plot(args.source, args.output)
