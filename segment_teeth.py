#!/usr/bin/env python3
"""
segment_teeth.py  --  Curvature-based segmentation of a full dental-arch PLY mesh
                      into individual teeth for the PALOMA dental-AI platform.

Pipeline
--------
1. Load a full-arch PLY (gums + teeth as one mesh, mm scale, RGB vertex colors).
2. Estimate per-vertex surface curvature (normal variation across the 1-ring).
3. Treat high-curvature vertices as boundaries (gingival margin + interproximal
   grooves), erode faces that touch them, and find connected components of what
   remains -- these are tooth "seeds".
4. Region-grow the eroded boundary vertices back onto the nearest seed so no
   geometry / colour is lost  ("curvature_region_growing").
5. Classify each region as tooth / gum by vertex count and crown protrusion.
6. Order the teeth along the arch and assign Universal Numbers (1-32), detecting
   gaps for missing teeth.
7. Export every tooth + the gum as separate binary PLY files (colours preserved)
   and write a manifest.json.

NOTE
----
Pure-geometry segmentation of intraoral scans is imperfect: expect to review the
output and tune --curvature-percentile per scanner.  Use --debug to export a
curvature heat-map PLY, and --flip-upper / --flip-lower if the left/right
numbering comes out mirrored (there is no way to recover patient handedness from
geometry alone).

Usage
-----
    # both arches at once (writes one combined manifest)
    python segment_teeth.py --maxilla maxilla.ply --mandible mandible.ply --outdir output

    # a single file, explicit arch
    python segment_teeth.py --input scan.ply --arch upper --outdir output

    # tuning / fixing mirrored numbering
    python segment_teeth.py --maxilla maxilla.ply --mandible mandible.ply \
        --outdir output --curvature-percentile 82 --flip-upper --debug
"""

import argparse
import json
import os
import sys
import time
from collections import deque, defaultdict

import numpy as np
import trimesh
from scipy.sparse import csr_matrix
from scipy.sparse.csgraph import connected_components


# --------------------------------------------------------------------------- #
#  logging
# --------------------------------------------------------------------------- #
def log(msg, indent=0):
    print(("  " * indent) + msg, flush=True)


# --------------------------------------------------------------------------- #
#  I/O
# --------------------------------------------------------------------------- #
def load_mesh(path):
    log(f"Loading {path} ...")
    mesh = trimesh.load(path, process=False)
    if isinstance(mesh, trimesh.Scene):
        # concatenate any multi-geometry scene into one mesh
        mesh = trimesh.util.concatenate(tuple(mesh.geometry.values()))
    if not isinstance(mesh, trimesh.Trimesh):
        raise ValueError(f"{path} did not load as a triangle mesh.")
    log(f"vertices: {len(mesh.vertices):,}   faces: {len(mesh.faces):,}", 1)

    # ensure we have vertex colours to preserve; default to light grey if absent
    if mesh.visual.kind != "vertex" or mesh.visual.vertex_colors is None:
        log("no vertex colours found -- filling neutral grey", 1)
        grey = np.tile([200, 200, 200, 255], (len(mesh.vertices), 1)).astype(np.uint8)
        mesh.visual = trimesh.visual.ColorVisuals(mesh=mesh, vertex_colors=grey)
    else:
        # force RGBA uint8
        vc = np.asarray(mesh.visual.vertex_colors)
        if vc.shape[1] == 3:
            vc = np.hstack([vc, np.full((len(vc), 1), 255, np.uint8)])
        mesh.visual.vertex_colors = vc.astype(np.uint8)
    return mesh


def export_region(mesh, vertex_mask, path):
    """Extract the sub-mesh for the given boolean vertex mask (colours kept)."""
    vidx = np.where(vertex_mask)[0]
    if len(vidx) == 0:
        return 0, 0
    # keep faces whose majority (>=2) vertices belong to the region
    fmask = vertex_mask[mesh.faces].sum(axis=1) >= 2
    faces = mesh.faces[fmask]
    if len(faces) == 0:
        return len(vidx), 0

    used = np.unique(faces)
    remap = -np.ones(len(mesh.vertices), dtype=np.int64)
    remap[used] = np.arange(len(used))
    sub = trimesh.Trimesh(
        vertices=mesh.vertices[used],
        faces=remap[faces],
        vertex_colors=np.asarray(mesh.visual.vertex_colors)[used],
        process=False,
    )
    sub.export(path, file_type="ply", encoding="binary")
    return len(sub.vertices), len(sub.faces)


# --------------------------------------------------------------------------- #
#  geometry helpers
# --------------------------------------------------------------------------- #
def occlusal_axis(vertices):
    """Smallest-variance PCA axis ~= vertical (gum->crown) axis of the arch."""
    c = vertices - vertices.mean(axis=0)
    cov = np.cov(c.T)
    w, v = np.linalg.eigh(cov)
    return v[:, np.argmin(w)]  # unit vector


def compute_curvature(mesh, smooth_iters=2):
    """
    Fast per-vertex curvature proxy = mean angular deviation between a vertex
    normal and its 1-ring neighbour normals.  High at creases (gingival margin,
    interproximal grooves, cusp tips).  Range roughly [0, 2].
    """
    log("Computing per-vertex curvature (normal variation) ...", 1)
    normals = np.asarray(mesh.vertex_normals)
    edges = mesh.edges_unique  # (E,2)
    i, j = edges[:, 0], edges[:, 1]

    dev = 1.0 - np.einsum("ij,ij->i", normals[i], normals[j])  # per-edge, [0,2]
    curv = np.zeros(len(mesh.vertices))
    deg = np.zeros(len(mesh.vertices))
    np.add.at(curv, i, dev)
    np.add.at(curv, j, dev)
    np.add.at(deg, i, 1.0)
    np.add.at(deg, j, 1.0)
    curv /= np.maximum(deg, 1.0)

    # light Laplacian smoothing of the scalar field to suppress scanner noise
    if smooth_iters > 0:
        adj = _vertex_adjacency(mesh)
        for _ in range(smooth_iters):
            curv = 0.5 * curv + 0.5 * (adj @ curv)
    return curv


def _vertex_adjacency(mesh):
    """Row-normalised sparse adjacency for scalar smoothing / label growing."""
    edges = mesh.edges_unique
    n = len(mesh.vertices)
    rows = np.concatenate([edges[:, 0], edges[:, 1]])
    cols = np.concatenate([edges[:, 1], edges[:, 0]])
    data = np.ones(len(rows))
    A = csr_matrix((data, (rows, cols)), shape=(n, n))
    deg = np.asarray(A.sum(axis=1)).ravel()
    deg[deg == 0] = 1.0
    Dinv = csr_matrix((1.0 / deg, (np.arange(n), np.arange(n))), shape=(n, n))
    return Dinv @ A


# --------------------------------------------------------------------------- #
#  segmentation
# --------------------------------------------------------------------------- #
def segment(mesh, curv, percentile, min_v, max_v, up_axis):
    """
    Cut at high-curvature vertices, label connected components, region-grow,
    then classify regions into teeth vs gum.

    Returns
    -------
    labels : (N,) int      per-vertex region id (>=0), -1 = unassigned
    teeth  : list[int]     region ids classified as teeth
    gum    : list[int]     region ids classified as gum
    """
    n = len(mesh.vertices)
    thr = np.percentile(curv, percentile)
    boundary = curv > thr
    log(f"curvature threshold @ p{percentile:.0f} = {thr:.3f} "
        f"-> {boundary.sum():,} boundary vertices", 1)

    # ---- connected components on the NON-boundary sub-graph (tooth seeds) ----
    keep = ~boundary
    edges = mesh.edges_unique
    e_keep = edges[keep[edges[:, 0]] & keep[edges[:, 1]]]
    rows = np.concatenate([e_keep[:, 0], e_keep[:, 1]])
    cols = np.concatenate([e_keep[:, 1], e_keep[:, 0]])
    graph = csr_matrix((np.ones(len(rows)), (rows, cols)), shape=(n, n))
    ncomp, comp = connected_components(graph, directed=False)

    # only non-boundary vertices carry a valid seed label
    labels = np.full(n, -1, dtype=np.int64)
    labels[keep] = comp[keep]
    log(f"found {ncomp:,} raw components before filtering", 1)

    # ---- region-grow: flood boundary vertices onto nearest seed label --------
    labels = _grow_labels(mesh, labels)

    # ---- measure every region ------------------------------------------------
    up = up_axis / np.linalg.norm(up_axis)
    proj = mesh.vertices @ up
    # orient so that "crown" side is the +proj end (teeth stick further out than
    # the broad gum base -> the extreme 2% of proj should be tooth cusps)
    regions = {}
    for lab in np.unique(labels):
        if lab < 0:
            continue
        idx = np.where(labels == lab)[0]
        regions[lab] = {
            "idx": idx,
            "n": len(idx),
            "proj_span": proj[idx].max() - proj[idx].min(),
            "proj_mean": proj[idx].mean(),
            "center": mesh.vertices[idx].mean(axis=0),
        }

    if not regions:
        return labels, [], []

    # the biggest region is the gum base
    gum_seed = max(regions, key=lambda k: regions[k]["n"])
    global_span = proj.max() - proj.min()

    teeth, gum = [], [gum_seed]
    for lab, r in regions.items():
        if lab == gum_seed:
            continue
        is_tooth = (
            min_v <= r["n"] <= max_v
            and r["proj_span"] > 0.12 * global_span  # must protrude a bit
        )
        (teeth if is_tooth else gum).append(lab)

    log(f"classified {len(teeth)} tooth region(s), "
        f"{len(gum)} gum/other region(s)", 1)
    return labels, teeth, gum


def _grow_labels(mesh, labels):
    """Multi-source BFS: assign each -1 vertex the label of a labelled neighbour."""
    neighbours = mesh.vertex_neighbors  # list of arrays
    q = deque(np.where(labels >= 0)[0].tolist())
    while q:
        v = q.popleft()
        lv = labels[v]
        for w in neighbours[v]:
            if labels[w] == -1:
                labels[w] = lv
                q.append(w)
    return labels


# --------------------------------------------------------------------------- #
#  Universal tooth numbering
# --------------------------------------------------------------------------- #
# per-quadrant: (central-incisor number, step toward the molars)
QUAD_RULES = {
    ("upper", "right"): (8, -1),   # 8..1
    ("upper", "left"): (9, +1),    # 9..16
    ("lower", "right"): (25, +1),  # 25..32
    ("lower", "left"): (24, -1),   # 24..17
}


def order_along_arch(centers):
    """Greedy nearest-neighbour walk from one terminal molar to the other."""
    n = len(centers)
    if n <= 2:
        return list(range(n))
    o, _, lr = _plane_axes(centers)
    # terminal teeth = extremes of the widest (left-right) axis
    xproj = (centers - o) @ lr
    start = int(np.argmin(xproj))
    order, used = [start], {start}
    while len(order) < n:
        last = centers[order[-1]]
        d = np.linalg.norm(centers - last, axis=1)
        d[list(used)] = np.inf
        nxt = int(np.argmin(d))
        order.append(nxt)
        used.add(nxt)
    return order


def _plane_axes(centers):
    """Return (origin, anterior-posterior axis, left-right axis) in occlusal plane."""
    c = centers - centers.mean(axis=0)
    cov = np.cov(c[:, :2].T) if centers.shape[1] >= 2 else np.cov(c.T)
    # use the two largest-variance axes of the full 3-D set, drop vertical later
    cov3 = np.cov(c.T)
    w, v = np.linalg.eigh(cov3)
    order = np.argsort(w)[::-1]
    lr = v[:, order[0]]   # widest spread = left-right (molar to molar)
    ap = v[:, order[1]]   # next = anterior-posterior
    return centers.mean(axis=0), ap, lr


def assign_numbers(centers, arch, flip):
    """
    Map each tooth (row of `centers`) to a Universal number.
    Returns dict {row_index: (number, uncertain_bool)} and list of missing numbers.
    """
    n = len(centers)
    o, ap, lr = _plane_axes(centers)
    order = order_along_arch(centers)
    ordered_c = centers[order]

    # anterior apex = tooth farthest from the line joining the two terminal teeth
    p0, p1 = ordered_c[0], ordered_c[-1]
    seg = p1 - p0
    seg_n = seg / (np.linalg.norm(seg) + 1e-9)
    perp = ordered_c - p0 - np.outer((ordered_c - p0) @ seg_n, seg_n)
    apex = int(np.argmax(np.linalg.norm(perp, axis=1)))

    # split ordered list into two quadrants at the midline (apex / apex+1)
    left_side = order[: apex + 1]
    right_side = order[apex + 1:]

    # decide which physical group is patient-right via the left-right axis sign
    def group_lr(rows):
        return np.mean((centers[rows] - o) @ lr) if len(rows) else 0.0

    a_is_right = group_lr(left_side) < group_lr(right_side)
    if flip:
        a_is_right = not a_is_right
    groups = {
        "right": left_side if a_is_right else right_side,
        "left": right_side if a_is_right else left_side,
    }

    result = {}
    for side, rows in groups.items():
        if not rows:
            continue
        start_num, step = QUAD_RULES[(arch, side)]
        # rows are ordered terminal->apex for left_side, apex->terminal for right.
        # we want to walk central-incisor -> molar, so put the apex end first.
        rows = list(rows)
        # ensure ordering starts at the central-incisor (apex) end
        if np.linalg.norm(centers[rows[0]] - ordered_c[apex]) > \
           np.linalg.norm(centers[rows[-1]] - ordered_c[apex]):
            rows = rows[::-1]

        # spacing-based gap detection so missing middle teeth skip a number
        num = start_num
        prev_c = None
        # typical mesio-distal spacing (median of gaps in this quadrant)
        pts = centers[rows]
        if len(pts) > 1:
            gaps = np.linalg.norm(np.diff(pts, axis=0), axis=1)
            typ = np.median(gaps)
        else:
            typ = 9.0  # mm fallback
        for k, row in enumerate(rows):
            if prev_c is not None:
                gap = np.linalg.norm(centers[row] - prev_c)
                skips = int(round(gap / typ)) - 1 if typ > 0 else 0
                skips = max(0, min(skips, 6))
                num += step * skips
            # clamp within the arch's legal range
            lo, hi = (1, 16) if arch == "upper" else (17, 32)
            uncertain = not (lo <= num <= hi)
            result[row] = (int(np.clip(num, lo, hi)), uncertain)
            prev_c = centers[row]
            num += step

    # resolve any duplicate numbers -> mark later ones uncertain
    seen = {}
    for row, (num, unc) in list(result.items()):
        if num in seen:
            result[row] = (num, True)
            result[seen[num]] = (result[seen[num]][0], True)
        else:
            seen[num] = row

    full = set(range(1, 17)) if arch == "upper" else set(range(17, 33))
    missing = sorted(full - {v[0] for v in result.values()})
    return result, missing


# --------------------------------------------------------------------------- #
#  per-arch driver
# --------------------------------------------------------------------------- #
def process_arch(path, arch, outdir, args, manifest):
    log(f"\n=== Processing {arch.upper()} arch: {os.path.basename(path)} ===")
    mesh = load_mesh(path)
    up = occlusal_axis(mesh.vertices)
    curv = compute_curvature(mesh, smooth_iters=args.smooth)

    if args.debug:
        _export_curvature_debug(mesh, curv, os.path.join(outdir, f"debug_curvature_{arch}.ply"))

    labels, teeth, gum = segment(
        mesh, curv, args.curvature_percentile,
        args.min_vertices, args.max_vertices, up,
    )

    # gum export (all gum-classified regions merged)
    gum_mask = np.isin(labels, gum)
    gum_name = f"gum_{arch}.ply"
    gv, gf = export_region(mesh, gum_mask, os.path.join(outdir, gum_name))
    log(f"exported {gum_name}  ({gv:,} v / {gf:,} f)", 1)

    if not teeth:
        log("!! no teeth segmented -- try lowering --curvature-percentile", 1)
        full = set(range(1, 17)) if arch == "upper" else set(range(17, 33))
        manifest["missing"].extend(sorted(full))
        return

    centers = np.array([mesh.vertices[labels == lab].mean(axis=0) for lab in teeth])
    flip = args.flip_upper if arch == "upper" else args.flip_lower
    numbering, missing = assign_numbers(centers, arch, flip)

    log(f"assigning Universal numbers ({'flipped' if flip else 'default'} handedness) ...", 1)
    for row, lab in enumerate(teeth):
        number, uncertain = numbering.get(row, (None, True))
        if number is None:
            continue
        mask = labels == lab
        fname = f"tooth_{number:02d}.ply"
        v, f = export_region(mesh, mask, os.path.join(outdir, fname))
        center = mesh.vertices[mask].mean(axis=0).round(3).tolist()
        flag = "  [UNCERTAIN]" if uncertain else ""
        log(f"tooth {number:2d} -> {fname}  ({v:,} v / {f:,} f){flag}", 1)
        manifest["teeth"][str(number)] = {
            "file": fname,
            "vertices": int(v),
            "faces": int(f),
            "center": center,
            "arch": arch,
            "uncertain": bool(uncertain),
        }
    manifest["missing"].extend(missing)


def _export_curvature_debug(mesh, curv, path):
    c = (curv - curv.min()) / (np.ptp(curv) + 1e-9)
    colors = (np.column_stack([c, 1 - c, np.zeros_like(c)]) * 255).astype(np.uint8)
    colors = np.hstack([colors, np.full((len(c), 1), 255, np.uint8)])
    dbg = trimesh.Trimesh(vertices=mesh.vertices, faces=mesh.faces,
                          vertex_colors=colors, process=False)
    dbg.export(path, file_type="ply", encoding="binary")
    log(f"debug curvature map -> {os.path.basename(path)} (red=high)", 1)


# --------------------------------------------------------------------------- #
#  main
# --------------------------------------------------------------------------- #
def build_parser():
    p = argparse.ArgumentParser(
        description="Curvature-based dental-arch -> individual-tooth segmentation.",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    p.add_argument("--maxilla", help="upper arch PLY")
    p.add_argument("--mandible", help="lower arch PLY")
    p.add_argument("--input", help="single arch PLY (use with --arch)")
    p.add_argument("--arch", choices=["upper", "lower"],
                   help="arch type for --input")
    p.add_argument("--outdir", default="output", help="output directory")
    p.add_argument("--curvature-percentile", type=float, default=80.0,
                   help="vertices above this curvature percentile are boundaries")
    p.add_argument("--min-vertices", type=int, default=500,
                   help="minimum vertices for a region to count as a tooth")
    p.add_argument("--max-vertices", type=int, default=6000,
                   help="maximum vertices for a region to count as a tooth")
    p.add_argument("--smooth", type=int, default=2,
                   help="Laplacian smoothing passes on the curvature field")
    p.add_argument("--flip-upper", action="store_true",
                   help="mirror left/right numbering for the upper arch")
    p.add_argument("--flip-lower", action="store_true",
                   help="mirror left/right numbering for the lower arch")
    p.add_argument("--debug", action="store_true",
                   help="export a curvature heat-map PLY per arch")
    return p


def main(argv=None):
    args = build_parser().parse_args(argv)

    jobs = []
    if args.maxilla:
        jobs.append((args.maxilla, "upper"))
    if args.mandible:
        jobs.append((args.mandible, "lower"))
    if args.input:
        if not args.arch:
            sys.exit("--input requires --arch upper|lower")
        jobs.append((args.input, args.arch))
    if not jobs:
        sys.exit("Nothing to do: pass --maxilla/--mandible or --input --arch.")

    os.makedirs(args.outdir, exist_ok=True)
    t0 = time.time()
    manifest = {"teeth": {}, "missing": [],
                "segmentation_method": "curvature_region_growing"}

    for path, arch in jobs:
        if not os.path.isfile(path):
            log(f"!! file not found, skipping: {path}")
            continue
        process_arch(path, arch, args.outdir, args, manifest)

    manifest["missing"] = sorted(set(manifest["missing"]))
    with open(os.path.join(args.outdir, "manifest.json"), "w") as fh:
        json.dump(manifest, fh, indent=2)

    log(f"\nDone in {time.time() - t0:.1f}s. "
        f"{len(manifest['teeth'])} teeth exported to '{args.outdir}/'.")
    log(f"manifest -> {os.path.join(args.outdir, 'manifest.json')}")
    log("Review results in a mesh viewer; re-run with --debug / adjusted "
        "--curvature-percentile / --flip-* if needed.")


if __name__ == "__main__":
    main()
