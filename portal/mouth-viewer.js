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
}
