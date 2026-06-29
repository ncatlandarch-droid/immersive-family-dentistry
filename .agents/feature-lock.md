# 🔒 PALOMA Feature Lock — DO NOT BREAK

> **Git Tag:** `v2.0-colors-working`  
> **Date Locked:** June 29, 2026  
> **Rollback:** `git checkout v2.0-colors-working`

---

## ✅ Locked Features (MUST keep working)

### 1. MouthMap 3D Scan Rendering — COLORS WORKING
- **MeshBasicMaterial** with `vertexColors: true` — UNLIT, shows scan colors exactly
- **DO NOT** use MeshPhysicalMaterial or MeshStandardMaterial (washes out vertex colors)
- **DO NOT** use MeshLambertMaterial (lighting still tints)
- `renderer.toneMapping = THREE.NoToneMapping` — no tone mapping
- `renderer.outputEncoding = THREE.LinearEncoding` — no double-gamma

### 2. Lighting (Neutral)
- All lights pure white `0xffffff`
- Ambient: 0.6, Hemisphere: 0.5, Key: 0.7
- Lighting does NOT affect scan meshes (MeshBasicMaterial is unlit)
- Lighting DOES affect tooth hitboxes in Status mode

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
- **Solid**: MeshBasicMaterial, vertex colors, natural look
- **Status**: tooth hitbox meshes become visible with status colors
- X-Ray: being removed (user request)

### 6. Tooth Chart & Right Panel
- Lives in the **right info panel** (not floating overlay)
- `selectedTooth` stores tooth NUMBER (int), not mesh reference
- Right panel is INSIDE `mm-layout` grid — verify div nesting if editing HTML

### 7. Patient Data
- Logan Marrero = Golden Demo patient
- Real dental data: Missing 1,16,17,32; Fillings on 3,4,14,15,19,30; Watch 18

---

## 🔧 How to Use This Lock

Before ANY mouthmap.html change:
1. Read this document
2. Verify the change won't break locked features
3. If unsure, test on a branch first
4. After changes, verify all locked features still work

If something breaks, rollback:
```bash
git checkout v2.0-colors-working -- portal/mouthmap.html
```
