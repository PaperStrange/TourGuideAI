import argparse
import json
from pathlib import Path
import subprocess

import matplotlib
matplotlib.use("Agg")
matplotlib.rcParams["svg.hashsalt"] = "tourguideai-pedestrian-navigation-v1"
import matplotlib.pyplot as plt
import numpy as np
from pyproj import Transformer
from shapely.geometry import LineString, Point, Polygon
from shapely.ops import nearest_points, unary_union
from shapely.strtree import STRtree

from audit import identity, local_frame, read, write


def audit_navigation(root, run):
    geography = read(root / "experience/src/neighborhoods/shijo-east/geography.json")
    retained = read(run / "detailed-road-triangles.json")
    source_report = read(run / "pedestrian-surface-audit.json")
    command = root / "experience/tools/pedestrian-qualification/navigation-observations.mjs"
    actual = json.loads(subprocess.run(["node", str(command), str(root)], check=True, capture_output=True, text=True).stdout)
    triangles = retained["triangles"]
    polygons = [Polygon(np.asarray(item["vertices"])[:, [0, 2]]) for item in triangles]
    all_surface = unary_union(polygons)
    sidewalk = unary_union([polygon for polygon, item in zip(polygons, triangles) if item["gmlId"] in retained["classifiedSidewalkIds"]])
    convert, rotation, origin = local_frame(geography)
    records, lines = [], []
    for observation, source_edge in zip(actual["observations"], source_report["edges"]):
        points = np.array([[point["x"], -point["y"]] for point in observation["points"]])
        line = LineString(points)
        lines.append(line)
        frame = geography["frame"]
        registered = convert(frame["origin"]["longitude"] + points[:, 0] / frame["metresPerDegreeLon"],
                             frame["origin"]["latitude"] - points[:, 1] / frame["metresPerDegreeLat"], np.zeros(len(points)))[:, [0, 2]]
        records.append({**observation, "registeredSourceRouteDistanceMetres": source_edge["nearestDetailedRoadMetres"],
            "literalRuntimeRouteDistanceMetres": line.distance(all_surface),
            "literalRuntimeVsRegisteredMaximumVertexDisplacementMetres": float(np.linalg.norm(points - registered, axis=1).max()),
            "runtimePlayerCenterEnvelopeOverlapSquareMetres": line.buffer(observation["centerRadiusMetres"]).intersection(all_surface).area,
            "runtimeFullActorEnvelopeOverlapSquareMetres": line.buffer(observation["widthMetres"] / 2).intersection(all_surface).area,
            "nearestSourcePoints": {"routeEastSouth": list(nearest_points(line, sidewalk)[0].coords)[0],
                                    "sidewalkEastSouth": list(nearest_points(line, sidewalk)[1].coords)[0]}})
    sight = next(item for item in geography["sights"] if item["id"] == "pontocho-entrance")
    anchor = Point(sight["x"], -sight["y"])
    radius = geography["navigation"]["playerRadius"]
    margin = .02
    interior = sidewalk.buffer(-(radius + margin))
    if interior.is_empty:
        raise ValueError("Source sidewalk has no actor-clearance interior")
    candidate = nearest_points(anchor, interior)[1]
    indices = STRtree(polygons).query(candidate, predicate="intersects")
    heights = []
    for index in indices:
        vertices = np.asarray(triangles[index]["vertices"])
        plane = np.linalg.solve(np.column_stack([vertices[:, [0, 2]], np.ones(3)]), vertices[:, 1])
        heights.append({"triangleId": triangles[index]["id"], "localUpMetres": float(plane @ np.array([candidate.x, candidate.y, 1]))})
    inverse = Transformer.from_crs(4978, 4979, always_xy=True)
    xyz = np.array([candidate.x, heights[0]["localUpMetres"], candidate.y]) @ rotation + origin
    longitude, latitude, ellipsoid = inverse.transform(*xyz, errcheck=True)
    suggestion = {"sightId": sight["id"], "status": "source-contained-review-candidate-only", "sourceIds": retained["classifiedSidewalkIds"],
        "unchangedRuntimeAnchorEastSouth": [anchor.x, anchor.y], "candidateEastSouth": [candidate.x, candidate.y],
        "sourceDerivedGeographicCoordinates": [longitude, latitude, ellipsoid],
        "sourceDerivedGeographicHeightKind": "ellipsoid, same diagnostic GSIGEO2011 registration as decoded source",
        "horizontalDisplacementFromRuntimeAnchorMetres": anchor.distance(candidate), "actorRadiusMetres": radius,
        "extraBoundaryClearanceMetres": margin, "actorFootprintCoveredBySource": sidewalk.covers(candidate.buffer(radius)),
        "sourceHeights": heights,
        "unresolved": ["Source epoch and current public access", "Usable entrance and six-sight intent", "Independent coordinate control and obstacle clearance",
            "Measured join from existing route to revised point", "Shared benchmark route and camera revision before any comparison"],
        "limitation": "One alternate point inside source geometry; no connecting floor, approved path correction, current obstacle clearance or full-route solution is established"}
    report = {"schemaVersion": 1, "method": actual["method"], "rendererMapping": actual["rendererMapping"], "edges": records,
        "sourceGeometrySha256": identity(run / "detailed-road-triangles.json", root)["sha256"],
        "maximumCenterlineLocateDisplacementMetres": max(item["centerlineLocateDisplacementMetres"] for item in records),
        "minimumLiteralRuntimeSurfaceDistanceMetres": min(item["literalRuntimeRouteDistanceMetres"] for item in records),
        "runtimeFullActorEnvelopeOverlapSquareMetres": sum(item["runtimeFullActorEnvelopeOverlapSquareMetres"] for item in records),
        "maximumLiteralRuntimeVsRegisteredVertexDisplacementMetres": max(item["literalRuntimeVsRegisteredMaximumVertexDisplacementMetres"] for item in records),
        "classifiedSidewalkBoundsEastSouth": list(sidewalk.bounds), "candidateLocalCorrection": suggestion,
        "inputs": [identity(root / path, root) for path in ["experience/src/neighborhoods/shijo-east/geography.json",
            "experience/src/simulation/route-navigation.js", "experience/src/simulation/world.js", "experience/src/runtime/route-world-view.js", "experience/src/runtime/camera.js"]],
        "conclusion": "Actual controller and rendered player positions have no hidden sidewalk offset. Existing full actor envelope has no selected detailed surface coverage. A local Pontochō approach revision can be evaluated on the nearby source sidewalk; it cannot close connecting street, market or bridge gaps.",
        "limitations": ["Code execution probes navigation; no browser/GPU test is claimed.", "Literal runtime coordinates and source-geographic ECEF registration are deliberately reported separately.", "The current ground remains authored-flat-display, distinct from measured source elevations. No runtime or frozen benchmark revision occurred."]}
    write(run / "navigation-surface-check.json", report)
    fig, axis = plt.subplots(figsize=(9, 6))
    for polygon in polygons:
        x, z = polygon.exterior.xy
        axis.fill(x, -np.asarray(z), color="#92b7aa", alpha=.6, linewidth=0)
    for line in lines:
        envelope = line.buffer(.75)
        x, z = envelope.exterior.xy
        axis.fill(x, -np.asarray(z), color="#b44035", alpha=.3, linewidth=0)
        x, z = line.xy
        axis.plot(x, -np.asarray(z), color="#b44035", linewidth=1.5)
    axis.scatter([anchor.x], [-anchor.y], color="#222222", s=35)
    axis.annotate("Current Pontochō anchor", (anchor.x, -anchor.y), xytext=(15, -25), textcoords="offset points")
    axis.scatter([candidate.x], [-candidate.y], color="#205a9f", s=35)
    axis.annotate("Source-contained review point", (candidate.x, -candidate.y), xytext=(30, 55), textcoords="offset points",
                  arrowprops={"arrowstyle": "->", "color": "#205a9f"})
    axis.plot([anchor.x, candidate.x], [-anchor.y, -candidate.y], color="#205a9f", linestyle="--", linewidth=1)
    axis.set_xlim(anchor.x - 20, anchor.x + 48)
    axis.set_ylim(-anchor.y - 12, -anchor.y + 40)
    axis.set_aspect("equal")
    axis.set_xlabel("Local east (m)")
    axis.set_ylabel("Local north (m)")
    axis.set_title("Existing player corridor and a separate Pontochō review candidate")
    axis.grid(alpha=.15)
    fig.text(.03, .055, "Green: source detailed sidewalk · Red: current route and complete actor envelope", fontsize=9)
    fig.text(.03, .025, "Blue: diagnostic candidate only; connector, access, obstacles and benchmark revision remain unverified. PLATEAU · CC BY 4.0", fontsize=8)
    fig.tight_layout(rect=[0, .09, 1, 1])
    fig.savefig(run / "navigation-correction.svg", metadata={"Date": None})
    plt.close(fig)
    print(json.dumps({"runtimeActorEnvelopeOverlapSquareMetres": report["runtimeFullActorEnvelopeOverlapSquareMetres"],
                      "candidateCorrectionMetres": suggestion["horizontalDisplacementFromRuntimeAnchorMetres"],
                      "candidateFootprintContained": suggestion["actorFootprintCoveredBySource"]}))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=Path, required=True)
    parser.add_argument("--run", type=Path, required=True)
    args = parser.parse_args()
    audit_navigation(args.root.resolve(), args.run.resolve())
