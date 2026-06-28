# 🔒 PALOMA Feature Lock — DO NOT BREAK

> **Git Tag:** `v1.0-mouthmap-working`  
> **Date Locked:** June 28, 2026  
> **Rollback:** `git checkout v1.0-mouthmap-working`

---

## ✅ Locked Features (MUST keep working)

### 1. MouthMap 3D Scan Rendering
- **Vertex colors** from Medit i700 PLY files show natural tooth/gum colors
- Material: `color: 0xffffff` (white base, lets vertex colors through)
- `vertexColors: true` when `geometry.hasAttribute('color')`
- Low clearcoat (0.15), moderate roughness (0.45)
- **DO NOT** set `color: 0xf0e6d8` or any tinted color when vertex colors exist

### 2. Lighting (Neutral)
- All lights pure white `0xffffff`
- Ambient: 0.6 intensity
- Hemisphere: white/gray, 0.5 intensity  
- Key light: 0.7 from upper-front
- **NO warm tints** (no `0xfff5e6`, no teal accent lights)

### 3. Scan Alignment
- Single parent `scanGroup` holds both `upperGroup` and `lowerGroup`
- Centered with `scanGroup.position.sub(center)` — ONE offset for both
- **NEVER** center upper and lower independently

### 4. TMJ Jaw Hinge
- Pivot at `(0, 17.6, -25.6)` in ORIGINAL scan coordinates
- Formula: `position = pivot - Rx(angle) * pivot`
- **POSITIVE** angle = jaw opens DOWN
- Code: `lowerGroup.position.copy(pivot).sub(rotatedPivot)`
- **DO NOT** use `-pivot + rotatedPivot` (that's inverted/backwards)

### 5. Render Modes
- **Solid**: vertex colors, white base, natural look
- **X-Ray**: blue translucent, no vertex colors
- **Status**: tooth hitbox meshes become visible with status colors

### 6. Tooth Chart
- Lives in the **right info panel** (not floating overlay)
- `selectedTooth` stores tooth NUMBER (int), not mesh reference
- `buildToothChart()` called on tooth selection for sync

### 7. Patient Data
- Logan Marrero = Golden Demo patient
- Delete patient works
- Patient avatar on profile

---

## 🔧 How to Use This Lock

Before ANY mouthmap.html change:
1. Read this document
2. Verify the change won't break locked features
3. If unsure, test on a branch first
4. After changes, verify all locked features still work

If something breaks, rollback:
```bash
git checkout v1.0-mouthmap-working -- portal/mouthmap.html
```
