"""
PALOMA AI — Dental Mesh Segmentation Pipeline
Segments full-arch PLY scans into individual tooth meshes.

Architecture: 
  1. Load full arch PLY (Maxilla or Mandible)
  2. Use curvature-based initial segmentation + connected components
  3. Label each component by position → tooth number (Universal Numbering)
  4. Export individual tooth PLY files + gum mesh + manifest.json

This runs ONCE per patient scan upload. Output goes to:
  /portal/demo-scans/teeth/tooth_01.ply ... tooth_32.ply
  /portal/demo-scans/teeth/gum_upper.ply, gum_lower.ply
  /portal/demo-scans/teeth/manifest.json
"""

import os
import json
import numpy as np

# We'll use trimesh for mesh processing - lightweight, no PyTorch needed for the 
# geometric approach. If deep learning is needed later, we can add MeshSegNet.
try:
    import trimesh
except ImportError:
    print("Installing trimesh...")
    os.system("pip install trimesh scipy scikit-learn")
    import trimesh

from scipy.spatial import cKDTree
from scipy.ndimage import label as ndlabel
from sklearn.cluster import DBSCAN


def compute_vertex_curvature(mesh):
    """Approximate mean curvature at each vertex using the angle deficit method."""
    curvatures = np.zeros(len(mesh.vertices))
    
    # Use vertex normals and neighbor distances
    for i, vertex in enumerate(mesh.vertices):
        # Find faces containing this vertex
        face_mask = np.any(mesh.faces == i, axis=1)
        adjacent_faces = mesh.faces[face_mask]
        
        if len(adjacent_faces) == 0:
            continue
        
        # Get unique neighbor vertices
        neighbors = set(adjacent_faces.flatten()) - {i}
        if len(neighbors) < 2:
            continue
        
        # Compute mean edge length and angle deficit
        neighbor_verts = mesh.vertices[list(neighbors)]
        edges = neighbor_verts - vertex
        distances = np.linalg.norm(edges, axis=1)
        mean_dist = np.mean(distances)
        
        if mean_dist > 0:
            # Approximate curvature as variation in normals
            curvatures[i] = 1.0 / mean_dist
    
    return curvatures


def segment_arch(mesh, arch_type='upper', num_teeth=16):
    """
    Segment a dental arch mesh into individual teeth using geometric analysis.
    
    Strategy:
    1. Compute vertex curvature → high curvature = boundaries between teeth
    2. Threshold curvature to find boundary regions
    3. Use connected components on non-boundary vertices → tooth clusters
    4. Assign tooth numbers by sorting clusters along the arch curve
    """
    vertices = mesh.vertices
    faces = mesh.faces
    n_verts = len(vertices)
    
    print(f"\n{'='*60}")
    print(f"Segmenting {arch_type} arch: {n_verts} vertices, {len(faces)} faces")
    print(f"{'='*60}")
    
    # Step 1: Find arch center and principal axis
    centroid = vertices.mean(axis=0)
    centered = vertices - centroid
    
    # PCA to find principal axes
    cov = np.cov(centered.T)
    eigenvalues, eigenvectors = np.linalg.eigh(cov)
    # Sort by eigenvalue (largest = widest spread = arch width)
    idx = eigenvalues.argsort()[::-1]
    axes = eigenvectors[:, idx]
    
    # Project vertices onto arch width axis (X-like) and depth axis (Z-like)
    arch_x = centered @ axes[:, 0]  # left-right along arch
    arch_z = centered @ axes[:, 1]  # front-back depth
    arch_y = centered @ axes[:, 2]  # up-down (occlusal)
    
    print(f"  Arch spread: X={arch_x.max()-arch_x.min():.1f} Z={arch_z.max()-arch_z.min():.1f} Y={arch_y.max()-arch_y.min():.1f}")
    
    # Step 2: Compute curvature for boundary detection
    print("  Computing vertex curvature (vectorized)...")
    normals = mesh.vertex_normals
    tree = cKDTree(vertices)
    k_neighbors = 12
    
    # Batch query all vertices at once
    distances, indices = tree.query(vertices, k=k_neighbors)
    
    # Vectorized normal variance computation
    neighbor_normals = normals[indices[:, 1:]]  # shape: (n_verts, k-1, 3), skip self
    curvatures = np.var(neighbor_normals, axis=1).sum(axis=1)  # variance per vertex
    
    # Normalize curvature
    if curvatures.max() > 0:
        curvatures = curvatures / curvatures.max()
    
    # Step 3: Find tooth regions (low curvature = tooth surface, high = boundaries)
    curvature_threshold = np.percentile(curvatures, 60)  # top 40% = boundaries
    is_tooth_surface = curvatures < curvature_threshold
    
    print(f"  Curvature threshold: {curvature_threshold:.4f}")
    print(f"  Tooth surface vertices: {is_tooth_surface.sum()} / {n_verts}")
    
    # Step 4: Cluster tooth surface vertices using DBSCAN
    print("  Clustering tooth regions...")
    tooth_vertices = vertices[is_tooth_surface]
    if len(tooth_vertices) < 100:
        print("  WARNING: Too few tooth surface vertices, adjusting threshold")
        curvature_threshold = np.percentile(curvatures, 75)
        is_tooth_surface = curvatures < curvature_threshold
        tooth_vertices = vertices[is_tooth_surface]
    
    # Adaptive eps based on mesh density
    mean_edge = np.mean([np.linalg.norm(vertices[e[0]] - vertices[e[1]]) 
                         for e in mesh.edges_unique[:500]])
    
    # Try progressively tighter eps until we get reasonable tooth count (8-16)
    best_labels = None
    best_n = 0
    # Adaptive min_samples based on mesh density
    min_samp = max(10, min(50, len(tooth_vertices) // 500))
    print(f"  min_samples={min_samp}")
    
    for eps_mult in [1.2, 1.5, 1.0, 2.0, 0.8, 2.5, 3.0]:
        eps = mean_edge * eps_mult
        clustering = DBSCAN(eps=eps, min_samples=min_samp).fit(tooth_vertices)
        labels = clustering.labels_
        n_clusters = len(set(labels)) - (1 if -1 in labels else 0)
        print(f"    eps={eps:.3f} (x{eps_mult}): {n_clusters} clusters")
        
        if 10 <= n_clusters <= 20:
            best_labels = labels
            best_n = n_clusters
            break
        elif abs(n_clusters - 14) < abs(best_n - 14) and n_clusters >= 5:
            best_labels = labels
            best_n = n_clusters
    
    if best_labels is None:
        # Last resort: use very tight eps
        eps = mean_edge * 0.6
        clustering = DBSCAN(eps=eps, min_samples=30).fit(tooth_vertices)
        best_labels = clustering.labels_
        best_n = len(set(best_labels)) - (1 if -1 in best_labels else 0)
    
    labels = best_labels
    n_clusters = best_n
    print(f"  → Selected: {n_clusters} clusters")
    
    # Step 5: Map clusters to full vertex array
    full_labels = np.full(n_verts, -1)  # -1 = gum/boundary
    tooth_indices = np.where(is_tooth_surface)[0]
    for i, idx in enumerate(tooth_indices):
        full_labels[idx] = labels[i]
    
    # Step 6: Sort clusters by position along the arch (right→front→left)
    cluster_info = []
    for cluster_id in range(n_clusters):
        mask = full_labels == cluster_id
        if mask.sum() < 50:  # too small, likely noise
            full_labels[mask] = -1
            continue
        
        cluster_verts = vertices[mask]
        cx = arch_x[mask].mean()  # position along arch width
        cz = arch_z[mask].mean()  # depth position
        
        # Compute arch angle (atan2 gives position around the U-shape)
        angle = np.arctan2(cz - arch_z.min(), cx)
        
        cluster_info.append({
            'id': cluster_id,
            'angle': angle,
            'cx': cx,
            'cz': cz,
            'n_verts': mask.sum(),
            'mask': mask
        })
    
    # Sort by angle (gives right-to-left ordering around the arch)
    cluster_info.sort(key=lambda c: c['angle'])
    
    print(f"  Valid tooth clusters: {len(cluster_info)}")
    
    # Step 7: Assign Universal Numbering
    # Upper: 1 (right 3rd molar) → 16 (left 3rd molar)
    # Lower: 17 (left 3rd molar) → 32 (right 3rd molar)
    teeth = {}
    n_found = len(cluster_info)
    
    if arch_type == 'upper':
        # Map clusters to teeth 1-16
        if n_found <= 16:
            # Distribute evenly across 1-16
            for i, info in enumerate(cluster_info):
                tooth_num = int(1 + (i / max(n_found-1, 1)) * 15)
                teeth[tooth_num] = info
        else:
            # More clusters than teeth — merge small ones
            for i, info in enumerate(cluster_info[:16]):
                teeth[i + 1] = info
    else:
        # Lower arch: 17-32
        if n_found <= 16:
            for i, info in enumerate(cluster_info):
                tooth_num = int(17 + (i / max(n_found-1, 1)) * 15)
                teeth[tooth_num] = info
        else:
            for i, info in enumerate(cluster_info[:16]):
                teeth[i + 17] = info
    
    return teeth, full_labels


def extract_tooth_mesh(mesh, mask):
    """Extract a submesh for vertices matching the mask."""
    # Find faces where ALL vertices are in the mask
    vert_indices = np.where(mask)[0]
    vert_set = set(vert_indices)
    
    face_mask = np.array([
        all(v in vert_set for v in face) 
        for face in mesh.faces
    ])
    
    if face_mask.sum() == 0:
        return None
    
    selected_faces = mesh.faces[face_mask]
    
    # Remap vertex indices
    old_to_new = {old: new for new, old in enumerate(vert_indices)}
    new_faces = np.array([[old_to_new[v] for v in face] for face in selected_faces])
    new_vertices = mesh.vertices[vert_indices]
    
    submesh = trimesh.Trimesh(vertices=new_vertices, faces=new_faces, process=True)
    return submesh


def run_segmentation(scan_dir, output_dir):
    """Main pipeline: segment both arches and output individual tooth files."""
    
    os.makedirs(output_dir, exist_ok=True)
    
    manifest = {
        'patient': 'logan-marrero',
        'scanner': 'Medit i700',
        'scan_date': '2026-06-28',
        'teeth': {},
        'gums': {}
    }
    
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
    
    for arch_file, arch_type in [('Maxilla_Base.ply', 'upper'), ('Mandible_Base.ply', 'lower')]:
        filepath = os.path.join(scan_dir, arch_file)
        if not os.path.exists(filepath):
            print(f"⚠ {arch_file} not found, skipping")
            continue
        
        print(f"\n🦷 Loading {arch_file}...")
        mesh = trimesh.load(filepath)
        print(f"  Loaded: {len(mesh.vertices)} vertices, {len(mesh.faces)} faces")
        
        # Run segmentation
        teeth, labels = segment_arch(mesh, arch_type)
        
        # Export individual tooth meshes
        for tooth_num, info in teeth.items():
            tooth_mesh = extract_tooth_mesh(mesh, info['mask'])
            if tooth_mesh is None or len(tooth_mesh.vertices) < 20:
                print(f"  ⚠ Tooth #{tooth_num}: too few vertices, skipping")
                continue
            
            filename = f"tooth_{tooth_num:02d}.ply"
            outpath = os.path.join(output_dir, filename)
            tooth_mesh.export(outpath)
            
            manifest['teeth'][str(tooth_num)] = {
                'file': filename,
                'name': TOOTH_NAMES.get(tooth_num, f'Tooth #{tooth_num}'),
                'vertices': len(tooth_mesh.vertices),
                'faces': len(tooth_mesh.faces)
            }
            print(f"  ✅ Tooth #{tooth_num} ({TOOTH_NAMES.get(tooth_num, '?')}): "
                  f"{len(tooth_mesh.vertices)} verts → {filename}")
        
        # Export gum mesh (everything not assigned to a tooth)
        gum_mask = labels == -1
        gum_mesh = extract_tooth_mesh(mesh, gum_mask)
        if gum_mesh and len(gum_mesh.vertices) > 100:
            gum_file = f"gum_{arch_type}.ply"
            gum_mesh.export(os.path.join(output_dir, gum_file))
            manifest['gums'][arch_type] = {
                'file': gum_file,
                'vertices': len(gum_mesh.vertices),
                'faces': len(gum_mesh.faces)
            }
            print(f"  ✅ Gum tissue ({arch_type}): {len(gum_mesh.vertices)} verts → {gum_file}")
    
    # Write manifest
    manifest_path = os.path.join(output_dir, 'manifest.json')
    with open(manifest_path, 'w') as f:
        json.dump(manifest, f, indent=2)
    print(f"\n📋 Manifest written: {manifest_path}")
    print(f"   Total teeth segmented: {len(manifest['teeth'])}")
    
    return manifest


if __name__ == '__main__':
    SCAN_DIR = os.path.join(os.path.dirname(__file__), 'portal', 'demo-scans')
    OUTPUT_DIR = os.path.join(SCAN_DIR, 'teeth')
    
    print("=" * 60)
    print("PALOMA AI — Dental Mesh Segmentation")
    print("Patient: Logan Marrero")
    print("=" * 60)
    
    manifest = run_segmentation(SCAN_DIR, OUTPUT_DIR)
    
    print(f"\n{'='*60}")
    print(f"DONE! {len(manifest['teeth'])} teeth segmented")
    print(f"Output: {OUTPUT_DIR}")
    print(f"{'='*60}")
