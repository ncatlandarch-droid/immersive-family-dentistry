/* ═══════════════════════════════════════════════════════════
   MouthMap 3D Viewer — Three.js Module
   Renders STL dental scans with interactive tooth selection.
   
   Dependencies: Three.js (loaded via CDN in portal HTML)
   ═══════════════════════════════════════════════════════════ */

export class MouthViewer {
    constructor(containerEl, options = {}) {
        this.container = containerEl;
        this.options = {
            backgroundColor: 0xf1f5f9,
            modelColor: 0xf5e6d3,      // Natural tooth enamel color
            highlightColor: 0x4A7FB5,   // Lake Jeanette blue
            warningColor: 0xf59e0b,     // Amber for monitor areas
            dangerColor: 0xef4444,      // Red for needs treatment
            healthyColor: 0x10b981,     // Green for healthy
            ambientLight: 0xffffff,
            directionalLight: 0xffffff,
            ...options
        };

        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.model = null;
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.toothMarkers = [];
        this.onToothClick = null;
        this.animationId = null;

        this.init();
    }

    init() {
        const { width, height } = this.container.getBoundingClientRect();

        // Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(this.options.backgroundColor);

        // Camera
        this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
        this.camera.position.set(0, 0, 120);

        // Renderer
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true,
        });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.container.appendChild(this.renderer.domElement);

        // Orbit controls
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.08;
        this.controls.rotateSpeed = 0.8;
        this.controls.zoomSpeed = 1.2;
        this.controls.panSpeed = 0.5;
        this.controls.minDistance = 30;
        this.controls.maxDistance = 250;

        // Lighting
        const ambient = new THREE.AmbientLight(this.options.ambientLight, 0.6);
        this.scene.add(ambient);

        const dirLight = new THREE.DirectionalLight(this.options.directionalLight, 0.8);
        dirLight.position.set(50, 50, 50);
        dirLight.castShadow = true;
        this.scene.add(dirLight);

        const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
        fillLight.position.set(-30, -20, 40);
        this.scene.add(fillLight);

        const rimLight = new THREE.DirectionalLight(0xffffff, 0.2);
        rimLight.position.set(0, 50, -50);
        this.scene.add(rimLight);

        // Event listeners
        window.addEventListener('resize', () => this.onResize());
        this.renderer.domElement.addEventListener('click', (e) => this.onClick(e));
        this.renderer.domElement.addEventListener('mousemove', (e) => this.onMouseMove(e));

        // Start render loop
        this.animate();
    }

    // ─── Load STL Model ───
    async loadSTL(url) {
        return new Promise((resolve, reject) => {
            const loader = new THREE.STLLoader();
            loader.load(
                url,
                (geometry) => {
                    // Center geometry
                    geometry.computeBoundingBox();
                    geometry.center();

                    // Create material — tooth-like appearance
                    const material = new THREE.MeshPhysicalMaterial({
                        color: this.options.modelColor,
                        roughness: 0.3,
                        metalness: 0.05,
                        clearcoat: 0.4,
                        clearcoatRoughness: 0.2,
                        envMapIntensity: 0.5,
                    });

                    this.model = new THREE.Mesh(geometry, material);
                    this.model.castShadow = true;
                    this.model.receiveShadow = true;

                    // Auto-scale to fit view
                    const box = new THREE.Box3().setFromObject(this.model);
                    const size = box.getSize(new THREE.Vector3());
                    const maxDim = Math.max(size.x, size.y, size.z);
                    const scale = 80 / maxDim;
                    this.model.scale.setScalar(scale);

                    this.scene.add(this.model);
                    this.controls.reset();
                    resolve(this.model);
                },
                undefined,
                (error) => {
                    console.error('STL load error:', error);
                    reject(error);
                }
            );
        });
    }

    // ─── Load Demo Model (procedural teeth) ───
    loadDemoModel(dentalChart) {
        // Create a procedural dental arch for demo when no STL is available
        const group = new THREE.Group();

        // Upper arch
        const upperArch = this.createDentalArch(dentalChart, 'upper');
        upperArch.position.y = 8;
        group.add(upperArch);

        // Lower arch
        const lowerArch = this.createDentalArch(dentalChart, 'lower');
        lowerArch.position.y = -8;
        lowerArch.rotation.x = Math.PI;
        group.add(lowerArch);

        this.model = group;
        this.scene.add(group);
    }

    createDentalArch(dentalChart, arch) {
        const group = new THREE.Group();
        const toothCount = 16;
        const archRadius = 35;

        for (let i = 0; i < toothCount; i++) {
            const toothNum = arch === 'upper' ? i + 1 : 32 - i;
            const chartEntry = dentalChart?.teeth?.find(t => t.toothNumber === toothNum);

            // Position along arch curve
            const angle = (Math.PI * 0.85) * (i / (toothCount - 1)) - (Math.PI * 0.85 / 2);
            const x = Math.sin(angle) * archRadius;
            const z = Math.cos(angle) * archRadius - archRadius;

            // Tooth geometry — varies by position
            let toothGeo;
            if (i < 2 || i > 13) {
                // Molars — wider
                toothGeo = new THREE.BoxGeometry(4, 5, 4.5, 2, 2, 2);
            } else if (i < 5 || i > 10) {
                // Premolars
                toothGeo = new THREE.BoxGeometry(3.5, 5.5, 3.5, 2, 2, 2);
            } else if (i === 5 || i === 10) {
                // Canines — pointed
                toothGeo = new THREE.ConeGeometry(2, 6, 6);
            } else {
                // Incisors — flat
                toothGeo = new THREE.BoxGeometry(3, 6, 2.5, 2, 2, 2);
            }

            // Color based on dental chart status
            let color = this.options.modelColor;
            if (chartEntry) {
                switch (chartEntry.color) {
                    case 'green': color = this.options.healthyColor; break;
                    case 'yellow': color = this.options.warningColor; break;
                    case 'red': color = this.options.dangerColor; break;
                    default: color = this.options.modelColor;
                }
            }

            const material = new THREE.MeshPhysicalMaterial({
                color,
                roughness: 0.35,
                metalness: 0.05,
                clearcoat: 0.3,
            });

            const tooth = new THREE.Mesh(toothGeo, material);
            tooth.position.set(x, 0, z);
            tooth.rotation.y = -angle;
            tooth.userData = {
                toothNumber: toothNum,
                chartData: chartEntry || null,
            };

            group.add(tooth);

            // Track for click detection
            this.toothMarkers.push(tooth);
        }

        return group;
    }

    // ─── Interaction ───
    onClick(event) {
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.toothMarkers);

        if (intersects.length > 0) {
            const tooth = intersects[0].object;
            if (tooth.userData.toothNumber && this.onToothClick) {
                this.highlightTooth(tooth);
                this.onToothClick(tooth.userData);
            }
        }
    }

    onMouseMove(event) {
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.toothMarkers);

        // Reset cursor
        this.renderer.domElement.style.cursor = intersects.length > 0 ? 'pointer' : 'grab';
    }

    highlightTooth(tooth) {
        // Reset all teeth
        this.toothMarkers.forEach(t => {
            t.material.emissive.setHex(0x000000);
        });

        // Highlight selected
        tooth.material.emissive.setHex(this.options.highlightColor);
        tooth.material.emissiveIntensity = 0.3;
    }

    // ─── Animation Loop ───
    animate() {
        this.animationId = requestAnimationFrame(() => this.animate());
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }

    // ─── Resize ───
    onResize() {
        const { width, height } = this.container.getBoundingClientRect();
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }

    // ─── Cleanup ───
    destroy() {
        if (this.animationId) cancelAnimationFrame(this.animationId);
        this.renderer.dispose();
        window.removeEventListener('resize', this.onResize);
    }

    // ─── Reset View ───
    resetView() {
        this.camera.position.set(0, 0, 120);
        this.controls.reset();
    }

    // ─── Toggle Layer ───
    toggleLayer(layerName, visible) {
        switch (layerName) {
            case 'teeth':
                if (this.model) this.model.visible = visible;
                break;
            case 'nerves':
                if (visible && !this.nerveGroup) this.renderNerves();
                if (this.nerveGroup) this.nerveGroup.visible = visible;
                break;
            case 'muscles':
                if (visible && !this.muscleGroup) this.renderMuscles();
                if (this.muscleGroup) this.muscleGroup.visible = visible;
                break;
            case 'gums':
                if (visible && !this.gumGroup) this.renderGumline();
                if (this.gumGroup) this.gumGroup.visible = visible;
                break;
        }
    }

    // ─── NERVES ───
    renderNerves() {
        if (this.nerveGroup) this.scene.remove(this.nerveGroup);
        this.nerveGroup = new THREE.Group();
        this.nerveGroup.name = 'nerves';

        const nerveMat = new THREE.MeshBasicMaterial({
            color: 0xfde047, transparent: true, opacity: 0.85,
            depthTest: false, side: THREE.DoubleSide,
        });
        const branchMat = new THREE.MeshBasicMaterial({
            color: 0xf59e0b, transparent: true, opacity: 0.7,
            depthTest: false, side: THREE.DoubleSide,
        });
        const glowMat = new THREE.MeshBasicMaterial({
            color: 0xfde047, transparent: true, opacity: 0.1,
            depthTest: false, side: THREE.DoubleSide,
        });

        const R = 35; // archRadius
        const self = this;

        function tube(points, radius, material) {
            if (points.length < 2) return;
            const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(p[0], p[1], p[2])));
            const geo = new THREE.TubeGeometry(curve, 32, radius, 8, false);
            self.nerveGroup.add(new THREE.Mesh(geo, material));
            // Glow
            const glowGeo = new THREE.TubeGeometry(curve, 32, radius * 2.5, 8, false);
            self.nerveGroup.add(new THREE.Mesh(glowGeo, glowMat));
        }

        // Inferior Alveolar Nerve (lower jaw, inside mandible)
        tube([
            [-R * 0.9, -10, -R * 0.5], [-R * 0.6, -12, -R * 0.3],
            [-R * 0.3, -13, -R * 0.1], [0, -13, 0],
            [R * 0.3, -13, -R * 0.1], [R * 0.6, -12, -R * 0.3],
            [R * 0.9, -10, -R * 0.5],
        ], 0.5, nerveMat);

        // Mental Nerves (exit points)
        tube([[-R * 0.35, -12, -R * 0.15], [-R * 0.35, -6, R * 0.1]], 0.35, branchMat);
        tube([[R * 0.35, -12, -R * 0.15], [R * 0.35, -6, R * 0.1]], 0.35, branchMat);

        // Superior Alveolar (upper)
        tube([
            [-R * 0.7, 14, -R * 0.4], [-R * 0.5, 12, -R * 0.2], [-R * 0.3, 11, 0],
            [0, 10.5, R * 0.1],
            [R * 0.3, 11, 0], [R * 0.5, 12, -R * 0.2], [R * 0.7, 14, -R * 0.4],
        ], 0.4, branchMat);

        // Pulp branches (into each tooth)
        for (let i = 0; i < 16; i++) {
            const angle = (Math.PI * 0.85) * (i / 15) - (Math.PI * 0.85 / 2);
            const x = Math.sin(angle) * R;
            const z = Math.cos(angle) * R - R;
            // Upper
            tube([[x, 12, z], [x, 8, z]], 0.15, branchMat);
            // Lower
            tube([[x, -12, z], [x, -8, z]], 0.15, branchMat);
        }

        this.scene.add(this.nerveGroup);
    }

    // ─── MUSCLES ───
    renderMuscles() {
        if (this.muscleGroup) this.scene.remove(this.muscleGroup);
        this.muscleGroup = new THREE.Group();
        this.muscleGroup.name = 'muscles';

        const muscleMat = new THREE.MeshPhysicalMaterial({
            color: 0xdc2626, roughness: 0.6, metalness: 0.0,
            transparent: true, opacity: 0.45, side: THREE.DoubleSide,
        });
        const tendonMat = new THREE.MeshPhysicalMaterial({
            color: 0xfca5a5, roughness: 0.5, metalness: 0.0,
            transparent: true, opacity: 0.35, side: THREE.DoubleSide,
        });

        const R = 35;

        // Masseter (jaw closing — large box on each side)
        [-1, 1].forEach(side => {
            const geo = new THREE.BoxGeometry(4, 12, 6);
            const mesh = new THREE.Mesh(geo, muscleMat);
            mesh.position.set(side * (R + 4), -2, -R * 0.3);
            mesh.rotation.z = side * 0.15;
            mesh.userData.muscleName = 'Masseter';
            this.muscleGroup.add(mesh);
        });

        // Temporalis (fan-shaped at temples)
        [-1, 1].forEach(side => {
            const geo = new THREE.ConeGeometry(8, 16, 6);
            const mesh = new THREE.Mesh(geo, muscleMat);
            mesh.position.set(side * (R + 6), 14, -R * 0.4);
            mesh.rotation.z = side * -0.3;
            mesh.userData.muscleName = 'Temporalis';
            this.muscleGroup.add(mesh);
        });

        // Lateral Pterygoid (deep, connects to TMJ)
        [-1, 1].forEach(side => {
            const pts = [
                new THREE.Vector3(side * R * 0.4, 2, -R * 0.5),
                new THREE.Vector3(side * R * 0.7, 4, -R * 0.6),
            ];
            const curve = new THREE.CatmullRomCurve3(pts);
            const geo = new THREE.TubeGeometry(curve, 16, 1.5, 6, false);
            const mesh = new THREE.Mesh(geo, tendonMat);
            mesh.userData.muscleName = 'Lateral Pterygoid';
            this.muscleGroup.add(mesh);
        });

        // Digastric (below mandible — opens jaw)
        const digPts = [
            new THREE.Vector3(-R * 0.3, -16, -R * 0.1),
            new THREE.Vector3(0, -18, R * 0.05),
            new THREE.Vector3(R * 0.3, -16, -R * 0.1),
        ];
        const digCurve = new THREE.CatmullRomCurve3(digPts);
        const digGeo = new THREE.TubeGeometry(digCurve, 24, 1.0, 6, false);
        const digMesh = new THREE.Mesh(digGeo, tendonMat);
        digMesh.userData.muscleName = 'Digastric';
        this.muscleGroup.add(digMesh);

        // Mylohyoid (floor of mouth — hammock)
        const myloGeo = new THREE.PlaneGeometry(R * 1.2, 8, 8, 4);
        const myloMesh = new THREE.Mesh(myloGeo, tendonMat);
        myloMesh.position.set(0, -14, R * 0.05);
        myloMesh.rotation.x = -Math.PI * 0.5;
        myloMesh.userData.muscleName = 'Mylohyoid';
        this.muscleGroup.add(myloMesh);

        this.scene.add(this.muscleGroup);
    }

    // ─── GUMLINE ───
    renderGumline() {
        if (this.gumGroup) this.scene.remove(this.gumGroup);
        this.gumGroup = new THREE.Group();
        this.gumGroup.name = 'gums';

        const gumMat = new THREE.MeshPhysicalMaterial({
            color: 0xD4848A, roughness: 0.55, metalness: 0.05,
            transparent: true, opacity: 0.6, side: THREE.DoubleSide,
        });

        const R = 35;

        // Create gum arches (upper and lower) as tube geometry following the arch
        [1, -1].forEach(archSign => {
            const points = [];
            for (let i = 0; i <= 32; i++) {
                const t = i / 32;
                const angle = (Math.PI * 0.9) * t - (Math.PI * 0.9 / 2);
                const x = Math.sin(angle) * (R + 1);
                const y = archSign * 8;
                const z = Math.cos(angle) * (R + 1) - (R + 1);
                points.push(new THREE.Vector3(x, y, z));
            }
            const curve = new THREE.CatmullRomCurve3(points);
            const gumGeo = new THREE.TubeGeometry(curve, 64, 2.5, 8, false);
            this.gumGroup.add(new THREE.Mesh(gumGeo, gumMat));

            // Inner gum ridge (where teeth meet gum)
            const innerPoints = [];
            for (let i = 0; i <= 32; i++) {
                const t = i / 32;
                const angle = (Math.PI * 0.85) * t - (Math.PI * 0.85 / 2);
                const x = Math.sin(angle) * (R - 1);
                const y = archSign * 6;
                const z = Math.cos(angle) * (R - 1) - (R - 1);
                innerPoints.push(new THREE.Vector3(x, y, z));
            }
            const innerCurve = new THREE.CatmullRomCurve3(innerPoints);
            const innerGeo = new THREE.TubeGeometry(innerCurve, 64, 1.8, 8, false);
            this.gumGroup.add(new THREE.Mesh(innerGeo, gumMat));
        });

        this.scene.add(this.gumGroup);
    }
}
