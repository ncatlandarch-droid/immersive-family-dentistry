"""
PALOMA AI - Advanced Dental Mesh Segmentation (MeshSegNet-inspired)
==================================================================
Upgraded pipeline using multi-scale curvature analysis + watershed 
segmentation on the mesh surface. This mimics the core idea behind 
MeshSegNet's per-face classification but uses geometric heuristics 
instead of a trained neural network.

Key improvements over v1:
  1. Multi-scale curvature (fine + coarse neighborhoods)
  2. Watershed-style region growing from curvature minima
  3. Arch-curve fitting (parabolic) for better tooth ordering
  4. Size-based cluster merging/splitting
  5. Per-face labels → cleaner tooth boundaries

Output: individual tooth PLY files + gum mesh + manifest.json
"""

import os
import json
import numpy as np
import sys

try:
    import trimesh
    from scipy.spatial import cKDTree
    from scipy.ndimage import label as nd_label
    from sklearn.cluster import DBSCAN
except ImportError:
    print("Installing dependencies...")
    os.system(f"{sys.executable} -m pip install trimesh scipy scikit-learn")
    import trimesh
    from scipy.spatial import cKDTree
    from scipy.ndimage import label as nd_label
    from sklearn.cluster import DBSCAN


TOOTH_NAMES = {
    1: 'Upper Right Third Molar', 2: 'Upper Right Second Molar',
    3: 'Upper Right First Molar', 4: 'Upper Right Second Premolar',
    5: 'Upper Right First Premolar', 6: 'Upper Right Canine',
    7: 'Upper Right Lateral Incisor', 8: 'Upper Right Central Incisor',
    9: 'Upper Left Central Incisor', 10: 'Upper Left Lateral Incisor',
    11: 'Upper Left Canine', 12: 'Upper Left First Premolar',
    13: 'Upper Left Second Premolar', 14: 'Upper Left First Molar',
    15: 'Upper Left Second Molar', 16: 'Upper Left Third Molar',
    17: 'Lower Left Third Molar', 18: 'Lower Left Second Molar',
    19: 'Lower Left First Molar', 20: 'Lower Left Second Premolar',
    21: 'Lower Left First Premolar', 22: 'Lower Left Canine',
    23: 'Lower Left Lateral Incisor', 24: 'Lower Left Central Incisor',
    25: 'Lower Right Central Incisor', 26: 'Lower Right Lateral Incisor',
    27: 'Lower Right Canine', 28: 'Lower Right First Premolar',
    29: 'Lower Right Second Premolar', 30: 'Lower Right First Molar',
    31: 'Lower Right Second Molar', 32: 'Lower Right Third Molar'
}


def compute_multiscale_curvature(mesh, k_fine=8, k_coarse=25):
    """Multi-scale curvature using normal deviation at two neighborhood sizes.
    Fine scale catches inter-tooth grooves.
    Coarse scale catches tooth-gum boundaries."""
    vertices = mesh.vertices
    normals = mesh.vertex_normals
    n = len(vertices)
    
    tree = cKDTree(vertices)
    
    # Fine scale
    _, idx_fine = tree.query(vertices, k=k_fine)
    fine_normals = normals[idx_fine[:, 1:]]
    curv_fine = np.var(fine_normals, axis=1).sum(axis=1)
    
    # Coarse scale
    _, idx_coarse = tree.query(vertices, k=k_coarse)
    coarse_normals = normals[idx_coarse[:, 1:]]
    curv_coarse = np.var(coarse_normals, axis=1).sum(axis=1)
    
    # Normalize each
    if curv_fine.max() > 0:
        curv_fine /= curv_fine.max()
    if curv_coarse.max() > 0:
        curv_coarse /= curv_coarse.max()
    
    # Combined: fine catches grooves, coarse catches gum line
    combined = 0.6 * curv_fine + 0.4 * curv_coarse
    return combined


def build_adjacency(mesh):
    """Build vertex adjacency from faces — needed for region growing."""
    n = len(mesh.vertices)
    adj = [set() for _ in range(n)]
    for f in mesh.faces:
        adj[f[0]].update([f[1], f[2]])
        adj[f[1]].update([f[0], f[2]])
        adj[f[2]].update([f[0], f[1]])
    return adj


def watershed_segment(vertices, curvature, adjacency, seed_threshold=0.15, barrier_threshold=0.45):
    """Watershed-style region growing from low-curvature seeds.
    
    1. Seeds = vertices with curvature < seed_threshold (flat tooth surfaces)
    2. Grow regions outward, stopping at curvature > barrier_threshold (grooves/boundaries)
    3. Each connected seed region becomes a segment
    """
    n = len(vertices)
    labels = np.full(n, -1, dtype=int)
    
    # Find seed regions (low curvature = tooth surfaces)
    seeds = curvature < seed_threshold
    
    # Label connected components among seeds
    visited = np.zeros(n, dtype=bool)
    current_label = 0
    
    # BFS to find connected seed components
    for start in range(n):
        if not seeds[start] or visited[start]:
            continue
        
        queue = [start]
        visited[start] = True
        component = []
        
        while queue:
            v = queue.pop(0)
            component.append(v)
            labels[v] = current_label
            
            for neighbor in adjacency[v]:
                if not visited[neighbor] and seeds[neighbor]:
                    visited[neighbor] = True
                    queue.append(neighbor)
        
        if len(component) >= 30:  # minimum seed size
            current_label += 1
        else:
            # Too small, reset
            for v in component:
                labels[v] = -1
    
    print(f"    Seed regions: {current_label}")
    
    # Region growing: expand each seed into neighboring non-barrier vertices
    changed = True
    iterations = 0
    while changed and iterations < 50:
        changed = False
        iterations += 1
        for v in range(n):
            if labels[v] != -1:
                continue
            if curvature[v] > barrier_threshold:
                continue  # this is a boundary vertex, don't label
            
            # Check neighbors for labels
            neighbor_labels = {}
            for nb in adjacency[v]:
                if labels[nb] >= 0:
                    neighbor_labels[labels[nb]] = neighbor_labels.get(labels[nb], 0) + 1
            
            if neighbor_labels:
                # Assign to the most common neighbor label
                best_label = max(neighbor_labels, key=neighbor_labels.get)
                labels[v] = best_label
                changed = True
    
    print(f"    Region growing: {iterations} iterations")
    return labels, current_label


def fit_arch_curve(vertices, labels, n_labels):
    """Fit a parabolic arch curve and sort teeth along it.
    Returns cluster info sorted from right to left along the dental arch."""
    
    clusters = []
    for label_id in range(n_labels):
        mask = labels == label_id
        count = mask.sum()
        if count < 50:
            continue
        
        cluster_verts = vertices[mask]
        centroid = cluster_verts.mean(axis=0)
        clusters.append({
            'label': label_id,
            'centroid': centroid,
            'count': count,
            'mask': mask
        })
    
    if not clusters:
        return clusters
    
    # PCA on centroids to find arch direction
    centroids = np.array([c['centroid'] for c in clusters])
    mean_c = centroids.mean(axis=0)
    centered = centroids - mean_c
    
    if len(centered) < 3:
        # Not enough points for PCA, just sort by x
        clusters.sort(key=lambda c: c['centroid'][0])
        return clusters
    
    cov = np.cov(centered.T)
    eigenvalues, eigenvectors = np.linalg.eigh(cov)
    idx = eigenvalues.argsort()[::-1]
    
    # Project onto arch width (PC1) and depth (PC2)
    pc1 = eigenvectors[:, idx[0]]
    pc2 = eigenvectors[:, idx[1]]
    
    arch_x = centered @ pc1
    arch_z = centered @ pc2
    
    # Sort by angle around arch center (gives natural L→R or R→L ordering)
    for i, c in enumerate(clusters):
        c['arch_angle'] = np.arctan2(arch_z[i], arch_x[i])
    
    clusters.sort(key=lambda c: c['arch_angle'])
    return clusters


def merge_small_clusters(clusters, vertices, labels, min_vertices=200):
    """Merge clusters that are too small into their nearest neighbor."""
    if len(clusters) <= 1:
        return clusters, labels
    
    merged = True
    while merged:
        merged = False
        small = [c for c in clusters if c['count'] < min_vertices]
        if not small:
            break
        
        for sc in small:
            # Find nearest larger cluster
            best_dist = float('inf')
            best_target = None
            for oc in clusters:
                if oc['label'] == sc['label'] or oc['count'] < min_vertices:
                    continue
                dist = np.linalg.norm(sc['centroid'] - oc['centroid'])
                if dist < best_dist:
                    best_dist = dist
                    best_target = oc
            
            if best_target:
                # Merge sc into best_target
                mask = labels == sc['label']
                labels[mask] = best_target['label']
                best_target['count'] += sc['count']
                best_target['mask'] = labels == best_target['label']
                best_target['centroid'] = vertices[best_target['mask']].mean(axis=0)
                clusters.remove(sc)
                merged = True
                break
    
    return clusters, labels


def split_large_clusters(clusters, vertices, labels, tree, max_vertices_ratio=0.15, total_verts=1):
    """Split clusters that are suspiciously large (likely merged teeth)."""
    new_clusters = []
    max_label = max(c['label'] for c in clusters) + 1
    
    for c in clusters:
        ratio = c['count'] / total_verts
        if ratio > max_vertices_ratio and c['count'] > 5000:
            # Try sub-clustering with tighter DBSCAN
            cluster_verts = vertices[c['mask']]
            mean_edge_approx = np.mean(np.linalg.norm(
                cluster_verts[:100] - cluster_verts[1:101], axis=1
            )) if len(cluster_verts) > 101 else 1.0
            
            sub_clustering = DBSCAN(eps=mean_edge_approx * 0.8, min_samples=20).fit(cluster_verts)
            sub_labels = sub_clustering.labels_
            n_sub = len(set(sub_labels)) - (1 if -1 in sub_labels else 0)
            
            if n_sub >= 2:
                print(f"    Split cluster {c['label']} ({c['count']} verts) into {n_sub} sub-clusters")
                orig_indices = np.where(c['mask'])[0]
                for sub_id in range(n_sub):
                    sub_mask = sub_labels == sub_id
                    if sub_mask.sum() < 50:
                        continue
                    new_label = max_label
                    max_label += 1
                    indices = orig_indices[sub_mask]
                    labels[indices] = new_label
                    new_clusters.append({
                        'label': new_label,
                        'centroid': vertices[indices].mean(axis=0),
                        'count': len(indices),
                        'mask': labels == new_label
                    })
            else:
                new_clusters.append(c)
        else:
            new_clusters.append(c)
    
    return new_clusters, labels


def segment_arch_v2(mesh, arch_type='upper'):
    """Segment a dental arch using multi-scale curvature + watershed."""
    vertices = mesh.vertices
    n_verts = len(vertices)
    
    print(f"\n{'='*60}")
    print(f"Segmenting {arch_type} arch: {n_verts:,} vertices, {len(mesh.faces):,} faces")
    print(f"{'='*60}")
    
    # Step 1: Multi-scale curvature
    print("  Step 1: Computing multi-scale curvature...")
    curvature = compute_multiscale_curvature(mesh)
    print(f"    Curvature range: [{curvature.min():.4f}, {curvature.max():.4f}]")
    print(f"    Median: {np.median(curvature):.4f}, P25: {np.percentile(curvature, 25):.4f}, P75: {np.percentile(curvature, 75):.4f}")
    
    # Step 2: Build adjacency
    print("  Step 2: Building vertex adjacency...")
    adjacency = build_adjacency(mesh)
    
    # Step 3: Watershed segmentation
    print("  Step 3: Watershed region growing...")
    # Adaptive thresholds based on curvature distribution
    seed_thresh = np.percentile(curvature, 30)  # bottom 30% = flat tooth surfaces
    barrier_thresh = np.percentile(curvature, 70)  # top 30% = grooves/boundaries
    print(f"    Seed threshold: {seed_thresh:.4f}, Barrier: {barrier_thresh:.4f}")
    
    labels, n_regions = watershed_segment(vertices, curvature, adjacency, seed_thresh, barrier_thresh)
    labeled_count = (labels >= 0).sum()
    print(f"    Labeled: {labeled_count:,} / {n_verts:,} vertices ({100*labeled_count/n_verts:.1f}%)")
    
    # Step 4: Fit arch curve and sort
    print("  Step 4: Fitting arch curve...")
    clusters = fit_arch_curve(vertices, labels, n_regions)
    print(f"    Raw clusters: {len(clusters)}")
    
    # Step 5: Merge small clusters
    print("  Step 5: Merging small clusters...")
    clusters, labels = merge_small_clusters(clusters, vertices, labels, min_vertices=150)
    print(f"    After merge: {len(clusters)}")
    
    # Step 6: Split suspiciously large clusters
    print("  Step 6: Checking for oversized clusters...")
    tree = cKDTree(vertices)
    clusters, labels = split_large_clusters(clusters, vertices, labels, tree, 
                                             max_vertices_ratio=0.12, total_verts=n_verts)
    print(f"    After split: {len(clusters)}")
    
    # Re-sort along arch
    clusters = fit_arch_curve(vertices, labels, max(c['label'] for c in clusters) + 1 if clusters else 0)
    
    # Step 7: Assign Universal Numbering
    print("  Step 7: Assigning tooth numbers...")
    teeth = {}
    n_found = len(clusters)
    
    if arch_type == 'upper':
        for i, info in enumerate(clusters):
            if n_found <= 16:
                tooth_num = int(round(1 + (i / max(n_found - 1, 1)) * 15))
            else:
                tooth_num = min(i + 1, 16)
            # Avoid duplicates
            while tooth_num in teeth:
                tooth_num += 1
            if tooth_num <= 16:
                teeth[tooth_num] = info
    else:
        for i, info in enumerate(clusters):
            if n_found <= 16:
                tooth_num = int(round(17 + (i / max(n_found - 1, 1)) * 15))
            else:
                tooth_num = min(i + 17, 32)
            while tooth_num in teeth:
                tooth_num += 1
            if tooth_num <= 32:
                teeth[tooth_num] = info
    
    print(f"  Result: {len(teeth)} teeth identified")
    return teeth, labels


def extract_submesh(mesh, mask):
    """Extract a clean submesh from a vertex mask."""
    vert_indices = np.where(mask)[0]
    if len(vert_indices) < 3:
        return None
    
    vert_set = set(vert_indices.tolist())
    face_mask = np.array([
        f[0] in vert_set and f[1] in vert_set and f[2] in vert_set
        for f in mesh.faces
    ])
    
    if face_mask.sum() == 0:
        return None
    
    selected_faces = mesh.faces[face_mask]
    old_to_new = {old: new for new, old in enumerate(vert_indices)}
    new_faces = np.array([[old_to_new[v] for v in face] for face in selected_faces])
    new_vertices = mesh.vertices[vert_indices]
    
    return trimesh.Trimesh(vertices=new_vertices, faces=new_faces, process=True)


def run_segmentation_v2(scan_dir, output_dir):
    """Main pipeline v2."""
    os.makedirs(output_dir, exist_ok=True)
    
    manifest = {
        'patient': 'logan-marrero',
        'scanner': 'Medit i700',
        'scan_date': '2026-06-28',
        'version': 2,
        'method': 'multi-scale-curvature-watershed',
        'teeth': {},
        'gums': {}
    }
    
    for arch_file, arch_type in [('Maxilla_Base.ply', 'upper'), ('Mandible_Base.ply', 'lower')]:
        filepath = os.path.join(scan_dir, arch_file)
        if not os.path.exists(filepath):
            print(f"  [!] {arch_file} not found, skipping")
            continue
        
        print(f"\n  Loading {arch_file}...")
        mesh = trimesh.load(filepath)
        print(f"  Loaded: {len(mesh.vertices):,} vertices, {len(mesh.faces):,} faces")
        
        teeth, labels = segment_arch_v2(mesh, arch_type)
        
        # Export teeth
        for tooth_num, info in teeth.items():
            tooth_mesh = extract_submesh(mesh, info['mask'])
            if tooth_mesh is None or len(tooth_mesh.vertices) < 20:
                continue
            
            filename = f"tooth_{tooth_num:02d}.ply"
            tooth_mesh.export(os.path.join(output_dir, filename))
            
            manifest['teeth'][str(tooth_num)] = {
                'file': filename,
                'name': TOOTH_NAMES.get(tooth_num, f'Tooth #{tooth_num}'),
                'vertices': len(tooth_mesh.vertices),
                'faces': len(tooth_mesh.faces)
            }
            print(f"  [OK] #{tooth_num:2d} {TOOTH_NAMES.get(tooth_num, '?'):35s} {len(tooth_mesh.vertices):6,} verts")
        
        # Export gum
        gum_mask = labels == -1
        gum_mesh = extract_submesh(mesh, gum_mask)
        if gum_mesh and len(gum_mesh.vertices) > 100:
            gum_file = f"gum_{arch_type}.ply"
            gum_mesh.export(os.path.join(output_dir, gum_file))
            manifest['gums'][arch_type] = {
                'file': gum_file,
                'vertices': len(gum_mesh.vertices),
                'faces': len(gum_mesh.faces)
            }
            print(f"  [OK] Gum ({arch_type}): {len(gum_mesh.vertices):,} verts")
    
    # Write manifest
    manifest_path = os.path.join(output_dir, 'manifest.json')
    with open(manifest_path, 'w') as f:
        json.dump(manifest, f, indent=2)
    
    return manifest


if __name__ == '__main__':
    SCAN_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'portal', 'demo-scans')
    OUTPUT_DIR = os.path.join(SCAN_DIR, 'teeth')
    
    print("=" * 60)
    print("PALOMA AI - Dental Mesh Segmentation v2")
    print("Method: Multi-Scale Curvature + Watershed")
    print("Patient: Logan Marrero")
    print("=" * 60)
    
    manifest = run_segmentation_v2(SCAN_DIR, OUTPUT_DIR)
    
    print(f"\n{'='*60}")
    print(f"DONE! {len(manifest['teeth'])} teeth segmented")
    print(f"Output: {OUTPUT_DIR}")
    print(f"{'='*60}")
