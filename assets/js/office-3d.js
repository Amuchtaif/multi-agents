/**
 * Kantor Virtual HQ - 3D Isometric Virtual Office Engine
 * High-Fidelity Three.js Orthographic Isometric View
 * 
 * Features:
 * - PBR Physical Lighting: sRGB Encoding, ACES Filmic Tone Mapping, Soft Contact Shadows
 * - Procedural Realistic Floor Texture (Scandinavian Oak / Dark Architectural Slate)
 * - Articulated Avatar Rig (Upper/Lower Legs, Arms, Spine, Head) with Human Anatomical Poses
 * - Realistic Sitting Pose on Sofa: Thighs on cushion, 90° bent knees, relaxed reclined spine, armrest resting & coffee holding
 * - Procedural IDE Code Editor & Live Dashboard Screen Glows
 * - Architectural Physical Glass with Refraction & Frosted Bands
 * - Dynamic Lounge Rest Area: Automatic Walk-to-Rest & Return-to-Desk Transitions
 * - Auto-Spawning Designer Lounge Sofas when Agents go IDLE
 * - Smooth Dynamic Light & Dark Mode Theming
 */

class Office3D {
    constructor(containerId, options = {}) {
        this.container = document.getElementById(containerId);
        this.options = options;
        this.agents = new Map(); // id -> { deskGroup, avatarGroup, userData, navigation }
        this.selectedAgentId = null;
        this.isAutoRotating = false;
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.hoveredAgent = null;
        this.currentTheme = options.theme || 'light';

        // Camera target for smooth tweening
        this.targetLookAt = new THREE.Vector3(0, 0, 0);
        this.currentLookAt = new THREE.Vector3(0, 0, 0);
        this.defaultCameraPos = new THREE.Vector3(26, 26, 26);

        // Dynamic Rest Spots System
        this.restSpots = [];
        this.dynamicFurnitureList = [];

        // Cached Procedural Textures & Materials
        this.cachedTextures = {};
        this.sofaMaterials = [];

        this.init();
    }

    init() {
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;

        // 1. Scene & Background (Dynamic Theme)
        this.scene = new THREE.Scene();
        this.applyThemeColors();

        // 2. Orthographic Camera (True Isometric Projection)
        const aspect = width / height;
        this.frustumSize = 26;
        this.camera = new THREE.OrthographicCamera(
            (this.frustumSize * aspect) / -2,
            (this.frustumSize * aspect) / 2,
            this.frustumSize / 2,
            this.frustumSize / -2,
            0.1,
            1000
        );
        this.camera.position.copy(this.defaultCameraPos);
        this.camera.lookAt(0, 0, 0);

        // 3. Renderer with Photorealistic PBR Pipeline
        this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

        // PBR Color Management & Tone Mapping
        if (THREE.sRGBEncoding) {
            this.renderer.outputEncoding = THREE.sRGBEncoding;
        }
        if (THREE.ACESFilmicToneMapping) {
            this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
            this.renderer.toneMappingExposure = this.currentTheme === 'light' ? 1.15 : 1.25;
        }

        // Soft Contact Shadows
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.container.appendChild(this.renderer.domElement);

        // 4. Orbit Controls
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.06;
        this.controls.maxPolarAngle = Math.PI / 2.15; // Don't look below floor
        this.controls.minPolarAngle = Math.PI / 8;
        this.controls.target.copy(this.targetLookAt);
        this.controls.mouseButtons = {
            LEFT: THREE.MOUSE.ROTATE,
            MIDDLE: THREE.MOUSE.DOLLY,
            RIGHT: THREE.MOUSE.PAN
        };

        // 5. Procedural Texture Generation
        this.initProceduralTextures();

        // 6. Lighting Setup
        this.setupLighting();

        // 7. Build Architectural Office Environment
        this.buildOfficeEnvironment();

        // 8. Initialize Lounge & Dynamic Rest Spots
        this.initRestSpots();

        // 9. Interactive Event Listeners
        this.setupInteractions();

        // 10. Animation Loop
        this.clock = new THREE.Clock();
        this.animate = this.animate.bind(this);
        requestAnimationFrame(this.animate);

        // Handle resize
        window.addEventListener('resize', () => this.onResize());
    }

    applyThemeColors() {
        const isLight = this.currentTheme === 'light';
        const bgColor = isLight ? 0xe2e8f0 : 0x090d16;
        this.scene.background = new THREE.Color(bgColor);
        this.scene.fog = new THREE.FogExp2(bgColor, isLight ? 0.008 : 0.013);
    }

    // ==========================================
    // PROCEDURAL TEXTURE GENERATION
    // ==========================================

    initProceduralTextures() {
        this.cachedTextures.floorLight = this.generateFloorCanvasTexture(true);
        this.cachedTextures.floorDark = this.generateFloorCanvasTexture(false);
        this.cachedTextures.codeEditor = this.generateCodeEditorTexture();
        this.cachedTextures.metricsDashboard = this.generateMetricsDashboardTexture();
        this.cachedTextures.presentationScreen = this.generatePresentationScreenTexture();
    }

    /**
     * Generates a high-res realistic architectural floor texture:
     * - Light: Scandinavian White Oak Parquet Planks with subtle grain, bevel seams, and light highlights
     * - Dark: Modern Tech Slate / Honed Basalt Large Tiles with fine grout seams
     */
    generateFloorCanvasTexture(isLight) {
        const canvas = document.createElement('canvas');
        canvas.width = 1024;
        canvas.height = 1024;
        const ctx = canvas.getContext('2d');

        if (isLight) {
            // High-Contrast Natural Scandinavian European Oak Wood Parquet
            // Rich warm hardwood undertone for clear architectural definition against white desks & walls
            ctx.fillStyle = '#8c7b69'; // Deep warm wood seam underlay
            ctx.fillRect(0, 0, 1024, 1024);

            const numCols = 8;
            const numRows = 16;
            const plankW = 1024 / numCols;
            const plankH = 1024 / numRows;

            for (let r = 0; r < numRows; r++) {
                const rowOffset = (r % 2) * (plankW / 2);
                for (let c = -1; c <= numCols; c++) {
                    const px = c * plankW + rowOffset;
                    const py = r * plankH;

                    // Organic natural plank color shifts (warm European Oak: amber honey to soft walnut)
                    const toneSeed = ((c * 19 + r * 37 + (c ^ r)) % 7) - 3;
                    const redVal   = 220 + toneSeed * 4;
                    const greenVal = 202 + toneSeed * 4;
                    const blueVal  = 180 + toneSeed * 4;
                    ctx.fillStyle = `rgb(${redVal}, ${greenVal}, ${blueVal})`;
                    ctx.fillRect(px + 1.5, py + 1.5, plankW - 3, plankH - 3);

                    // Organic wood grain striations
                    ctx.strokeStyle = `rgba(130, 105, 80, 0.20)`;
                    ctx.lineWidth = 1;
                    for (let g = 0; g < 5; g++) {
                        const gy = py + (g + 1) * (plankH / 6) + ((c + g) % 3) * 1.5;
                        ctx.beginPath();
                        ctx.moveTo(px + 4, gy);
                        ctx.lineTo(px + plankW - 4, gy);
                        ctx.stroke();
                    }

                    // Crisp top/left sunlight highlight bevel
                    ctx.strokeStyle = 'rgba(255, 255, 255, 0.60)';
                    ctx.beginPath();
                    ctx.moveTo(px + 1.5, py + plankH - 3);
                    ctx.lineTo(px + 1.5, py + 1.5);
                    ctx.lineTo(px + plankW - 3, py + 1.5);
                    ctx.stroke();

                    // Dark bottom/right shadow groove for tactile plank depth
                    ctx.strokeStyle = 'rgba(90, 75, 55, 0.45)';
                    ctx.beginPath();
                    ctx.moveTo(px + 2, py + plankH - 1.5);
                    ctx.lineTo(px + plankW - 1.5, py + plankH - 1.5);
                    ctx.lineTo(px + plankW - 1.5, py + 2);
                    ctx.stroke();
                }
            }
        } else {
            // Dark Modern Architectural Slate Tiles
            ctx.fillStyle = '#111827';
            ctx.fillRect(0, 0, 1024, 1024);

            const tileSize = 256;
            for (let x = 0; x < 1024; x += tileSize) {
                for (let y = 0; y < 1024; y += tileSize) {
                    const toneVar = ((x * 13 + y * 29) % 5) - 2;
                    const baseTone = 26 + toneVar * 2;
                    ctx.fillStyle = `rgb(${baseTone}, ${baseTone + 2}, ${baseTone + 5})`;
                    ctx.fillRect(x + 2, y + 2, tileSize - 4, tileSize - 4);

                    // Subtle surface mineral speckles
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
                    for (let s = 0; s < 12; s++) {
                        const sx = x + (s * 37) % tileSize;
                        const sy = y + (s * 43) % tileSize;
                        ctx.fillRect(sx, sy, 2, 2);
                    }

                    // Grout border line
                    ctx.strokeStyle = 'rgba(0, 0, 0, 0.6)';
                    ctx.lineWidth = 2;
                    ctx.strokeRect(x, y, tileSize, tileSize);
                }
            }
        }

        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(4, 4);
        return texture;
    }

    /**
     * Generates a realistic VS Code / IDE Screen texture with syntax highlighting
     */
    generateCodeEditorTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 320;
        const ctx = canvas.getContext('2d');

        // Dark IDE background
        ctx.fillStyle = '#181825';
        ctx.fillRect(0, 0, 512, 320);

        // Sidebar
        ctx.fillStyle = '#11111b';
        ctx.fillRect(0, 0, 60, 320);

        // Top tab
        ctx.fillStyle = '#1e1e2e';
        ctx.fillRect(60, 0, 452, 32);
        ctx.fillStyle = '#89b4fa';
        ctx.fillRect(60, 0, 110, 30);
        ctx.fillStyle = '#11111b';
        ctx.font = 'bold 12px monospace';
        ctx.fillText('agent_core.py', 72, 20);

        // Code editor lines
        const lines = [
            { text: 'import asyncio, os, json', col: '#cba6f7' },
            { text: 'from ai_agents import NeuralOrchestrator', col: '#f38ba8' },
            { text: '', col: '' },
            { text: 'class ProductionAgent(BaseWorker):', col: '#89b4fa' },
            { text: '    def __init__(self, agent_id: str):', col: '#f9e2af' },
            { text: '        self.id = agent_id', col: '#cdd6f4' },
            { text: '        self.status = "EXECUTING_TASK"', col: '#a6e3a1' },
            { text: '        self.memory = SharedContext()', col: '#fab387' },
            { text: '', col: '' },
            { text: '    async def run_pipeline(self):', col: '#89b4fa' },
            { text: '        payload = await self.fetch_next_task()', col: '#cdd6f4' },
            { text: '        result = await self.execute_llm(payload)', col: '#89dceb' },
            { text: '        return self.broadcast_event(result)', col: '#a6e3a1' }
        ];

        ctx.font = '11px "JetBrains Mono", Consolas, monospace';
        lines.forEach((line, idx) => {
            const y = 54 + idx * 18;
            // Line number
            ctx.fillStyle = '#45475a';
            ctx.fillText(String(idx + 1).padStart(2, ' '), 70, y);
            // Code text
            if (line.text) {
                ctx.fillStyle = line.col;
                ctx.fillText(line.text, 98, y);
            }
        });

        // Minimap on right edge
        ctx.fillStyle = '#1e1e2e';
        ctx.fillRect(485, 32, 27, 288);
        ctx.fillStyle = '#89b4fa';
        for (let m = 0; m < 14; m++) {
            ctx.fillRect(490, 45 + m * 9, 16, 2);
        }

        const texture = new THREE.CanvasTexture(canvas);
        texture.minFilter = THREE.LinearFilter;
        return texture;
    }

    /**
     * Generates a modern real-time metrics & server stream dashboard texture
     */
    generateMetricsDashboardTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 320;
        const ctx = canvas.getContext('2d');

        // Sleek dark tech background
        ctx.fillStyle = '#0b1329';
        ctx.fillRect(0, 0, 512, 320);

        // Header bar
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(0, 0, 512, 36);
        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 13px Inter, sans-serif';
        ctx.fillText('HQ AGENT METRICS • LIVE ENGINE', 16, 23);
        ctx.fillStyle = '#10b981';
        ctx.fillText('● ACTIVE', 430, 23);

        // Left Panel: Waveform / Line Chart
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.2)';
        ctx.lineWidth = 1;
        for (let g = 0; g < 4; g++) {
            ctx.beginPath();
            ctx.moveTo(16, 60 + g * 35);
            ctx.lineTo(260, 60 + g * 35);
            ctx.stroke();
        }

        ctx.strokeStyle = '#06b6d4';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        const pts = [160, 145, 120, 135, 100, 110, 85, 95, 70, 80, 65];
        pts.forEach((py, i) => {
            const px = 16 + i * 24;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        });
        ctx.stroke();

        // Right Panel: Gauges & Bars
        const bars = [
            { label: 'CPU LOAD', pct: 68, color: '#38bdf8' },
            { label: 'LLM TOKENS', pct: 84, color: '#10b981' },
            { label: 'DB POOL', pct: 42, color: '#f59e0b' },
            { label: 'MEMORY', pct: 55, color: '#a855f7' }
        ];

        bars.forEach((b, idx) => {
            const by = 58 + idx * 36;
            ctx.fillStyle = '#94a3b8';
            ctx.font = '10px Inter, sans-serif';
            ctx.fillText(b.label, 290, by);

            ctx.fillStyle = '#1e293b';
            ctx.fillRect(290, by + 5, 200, 12);

            ctx.fillStyle = b.color;
            ctx.fillRect(290, by + 5, (b.pct / 100) * 200, 12);
        });

        // Bottom Console Stream
        ctx.fillStyle = '#030712';
        ctx.fillRect(16, 215, 480, 90);
        ctx.fillStyle = '#10b981';
        ctx.font = '10px monospace';
        ctx.fillText('> [2026-HQ] Orchestrator healthy. Sync interval 1200ms', 28, 235);
        ctx.fillText('> [STREAM] Agent #1 Executing subtask "DB Index optimization"', 28, 255);
        ctx.fillText('> [STREAM] Agent #3 Rest Lounge transition: IDLE state entered', 28, 275);
        ctx.fillText('> [SUCCESS] SSE connection pool active: 4 agents online', 28, 295);

        const texture = new THREE.CanvasTexture(canvas);
        texture.minFilter = THREE.LinearFilter;
        return texture;
    }

    /**
     * Generates a 4K tech presentation screen for the meeting room
     */
    generatePresentationScreenTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#0a101f';
        ctx.fillRect(0, 0, 512, 256);

        // Header
        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 16px Inter, sans-serif';
        ctx.fillText('MULTI-AGENT SYSTEM TOPOLOGY', 24, 34);

        // Architecture Nodes
        const nodes = [
            { name: 'COORDINATOR', x: 120, y: 130, col: '#3b82f6' },
            { name: 'RESEARCHER', x: 260, y: 80, col: '#10b981' },
            { name: 'CODER AGENT', x: 260, y: 180, col: '#a855f7' },
            { name: 'EVALUATOR', x: 400, y: 130, col: '#f59e0b' }
        ];

        // Connection lines
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(nodes[0].x, nodes[0].y);
        ctx.lineTo(nodes[1].x, nodes[1].y);
        ctx.lineTo(nodes[3].x, nodes[3].y);
        ctx.moveTo(nodes[0].x, nodes[0].y);
        ctx.lineTo(nodes[2].x, nodes[2].y);
        ctx.lineTo(nodes[3].x, nodes[3].y);
        ctx.stroke();

        // Draw nodes
        nodes.forEach(n => {
            ctx.fillStyle = n.col;
            ctx.beginPath();
            ctx.arc(n.x, n.y, 22, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 9px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(n.name, n.x, n.y + 36);
        });

        const texture = new THREE.CanvasTexture(canvas);
        texture.minFilter = THREE.LinearFilter;
        return texture;
    }

    // ==========================================
    // LIGHTING SETUP (PBR PHYSICAL LIGHTS)
    // ==========================================

    setupLighting() {
        const isLight = this.currentTheme === 'light';

        // 1. Hemisphere Light (Soft Sky & Floor Bounce)
        this.hemiLight = new THREE.HemisphereLight(
            isLight ? 0xfffbeb : 0x38bdf8,
            isLight ? 0xa89f91 : 0x090d16,
            isLight ? 0.32 : 0.40
        );
        this.scene.add(this.hemiLight);

        // 2. Ambient Light (Balanced fill light to allow rich crisp shadows in light theme)
        this.ambientLight = new THREE.AmbientLight(isLight ? 0xf8fafc : 0xdbeafe, isLight ? 0.38 : 0.55);
        this.scene.add(this.ambientLight);

        // 3. Main Directional Light (Crisp architectural sunlight with distinct contact shadows)
        this.dirLight = new THREE.DirectionalLight(isLight ? 0xfffaf0 : 0xffffff, isLight ? 1.30 : 0.95);
        this.dirLight.position.set(26, 38, 26);
        this.dirLight.castShadow = true;
        this.dirLight.shadow.mapSize.width = 2048;
        this.dirLight.shadow.mapSize.height = 2048;
        this.dirLight.shadow.camera.near = 0.5;
        this.dirLight.shadow.camera.far = 100;
        const d = 20;
        this.dirLight.shadow.camera.left = -d;
        this.dirLight.shadow.camera.right = d;
        this.dirLight.shadow.camera.top = d;
        this.dirLight.shadow.camera.bottom = -d;
        this.dirLight.shadow.bias = -0.0001;
        this.dirLight.shadow.normalBias = 0.03;
        this.dirLight.shadow.radius = isLight ? 1.8 : 2.5;
        this.scene.add(this.dirLight);

        // 4. Meeting Room Cool Light
        this.meetingLight = new THREE.PointLight(isLight ? 0x3b82f6 : 0x60a5fa, isLight ? 1.1 : 1.3, 12);
        this.meetingLight.position.set(-7.5, 4.2, -8.75);
        this.scene.add(this.meetingLight);

        // 5. Lounge Warm Chandelier Light (Casts warm glow over the coffee table & sofas)
        this.coffeeLight = new THREE.PointLight(0xf59e0b, isLight ? 1.2 : 1.5, 12);
        this.coffeeLight.position.set(3.8, 3.5, 7.2);
        this.scene.add(this.coffeeLight);

        // 6. Selection Spotlight
        this.selectionLight = new THREE.PointLight(isLight ? 0x2563eb : 0x38bdf8, 0, 9);
        this.selectionLight.position.set(0, 4, 0);
        this.scene.add(this.selectionLight);
    }

    // ==========================================
    // OFFICE ENVIRONMENT & ARCHITECTURE
    // ==========================================

    buildOfficeEnvironment() {
        this.officeGroup = new THREE.Group();
        this.scene.add(this.officeGroup);

        const isLight = this.currentTheme === 'light';
        const roomWidth = 24;
        const roomDepth = 24;

        // 1. Realistic Office Floor with Procedural Texture (Perfect 1:1 Symmetrical Square)
        const floorGeo = new THREE.BoxGeometry(roomWidth, 0.4, roomDepth);
        this.floorMat = new THREE.MeshStandardMaterial({
            map: isLight ? this.cachedTextures.floorLight : this.cachedTextures.floorDark,
            roughness: isLight ? 0.38 : 0.48,
            metalness: 0.08
        });
        const floor = new THREE.Mesh(floorGeo, this.floorMat);
        floor.position.y = -0.2;
        floor.receiveShadow = true;
        this.officeGroup.add(floor);

        // Department Carpets (Dev, QA & Design) - Centered symmetrically around (±4.5, 0)
        this.carpetLeft = this.createCarpet(-4.5, 0, 7.5, 8.0, isLight ? 0x2563eb : 0x1e3a8a, isLight ? 0.52 : 0.25);
        this.carpetRight = this.createCarpet(4.5, 0, 7.5, 8.0, isLight ? 0x7c3aed : 0x312e81, isLight ? 0.52 : 0.25);

        // Dedicated Lounge & Coffee Area Carpet - Rich terracotta warm amber
        this.carpetLounge = this.createCarpet(3.8, 7.2, 8.0, 5.8, isLight ? 0xc2410c : 0x7c2d12, isLight ? 0.55 : 0.3);

        // 2. Cutaway Architectural Walls - Symmetrical High-Contrast Slate
        this.wallMat = new THREE.MeshStandardMaterial({
            color: isLight ? 0x334155 : 0x0f172a,
            roughness: 0.82,
            metalness: 0.04
        });

        const wallHeight = 4.5;
        const wallThickness = 0.4;

        // Back Wall
        const backWallGeo = new THREE.BoxGeometry(roomWidth + wallThickness, wallHeight, wallThickness);
        const backWall = new THREE.Mesh(backWallGeo, this.wallMat);
        backWall.position.set(0, wallHeight / 2, -roomDepth / 2);
        backWall.receiveShadow = true;
        this.officeGroup.add(backWall);

        // Left Wall
        const leftWallGeo = new THREE.BoxGeometry(wallThickness, wallHeight, roomDepth + wallThickness);
        const leftWall = new THREE.Mesh(leftWallGeo, this.wallMat);
        leftWall.position.set(-roomWidth / 2, wallHeight / 2, 0);
        leftWall.receiveShadow = true;
        this.officeGroup.add(leftWall);

        // Baseboards - Crisp dark framing outline for maximum architectural definition
        this.baseboardMat = new THREE.MeshStandardMaterial({ color: isLight ? 0x0f172a : 0x38bdf8, roughness: 0.35 });
        const bb1 = new THREE.Mesh(new THREE.BoxGeometry(roomWidth, 0.15, 0.05), this.baseboardMat);
        bb1.position.set(0, 0.08, -roomDepth / 2 + wallThickness / 2 + 0.03);
        this.officeGroup.add(bb1);

        const bb2 = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.15, roomDepth), this.baseboardMat);
        bb2.position.set(-roomWidth / 2 + wallThickness / 2 + 0.03, 0.08, 0);
        this.officeGroup.add(bb2);

        // Crown Molding / Top Rails
        const crown1 = new THREE.Mesh(new THREE.BoxGeometry(roomWidth + wallThickness, 0.1, 0.08), this.baseboardMat);
        crown1.position.set(0, wallHeight - 0.05, -roomDepth / 2 + wallThickness / 2 + 0.04);
        this.officeGroup.add(crown1);

        const crown2 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, roomDepth + wallThickness), this.baseboardMat);
        crown2.position.set(-roomWidth / 2 + wallThickness / 2 + 0.04, wallHeight - 0.05, 0);
        this.officeGroup.add(crown2);

        // Realistic Office Windows - Back Wall
        this.winFrameMat = new THREE.MeshStandardMaterial({ color: isLight ? 0xffffff : 0x1e293b, roughness: 0.25 });
        for (let i = -1; i <= 1; i++) {
            const winFrame = new THREE.Mesh(
                new THREE.BoxGeometry(4.2, 2.3, 0.1),
                this.winFrameMat
            );
            winFrame.position.set(i * 6, 2.5, -roomDepth / 2 + 0.22);
            this.officeGroup.add(winFrame);

            const glassPane = new THREE.Mesh(
                new THREE.PlaneGeometry(3.9, 2.0),
                new THREE.MeshPhysicalMaterial({
                    color: isLight ? 0xbfdbfe : 0x1e3a5f,
                    transparent: true,
                    opacity: 0.85,
                    roughness: 0.1,
                    transmission: 0.6
                })
            );
            glassPane.position.set(i * 6, 2.5, -roomDepth / 2 + 0.28);
            this.officeGroup.add(glassPane);
        }

        // Realistic Office Windows - Left Wall (Symmetrical Architectural Balance)
        const leftWinPositions = [0, 6];
        leftWinPositions.forEach(zPos => {
            const winFrameL = new THREE.Mesh(
                new THREE.BoxGeometry(0.1, 2.3, 4.2),
                this.winFrameMat
            );
            winFrameL.position.set(-roomWidth / 2 + 0.22, 2.5, zPos);
            this.officeGroup.add(winFrameL);

            const glassPaneL = new THREE.Mesh(
                new THREE.PlaneGeometry(4.2, 2.0),
                new THREE.MeshPhysicalMaterial({
                    color: isLight ? 0xbfdbfe : 0x1e3a5f,
                    transparent: true,
                    opacity: 0.85,
                    roughness: 0.1,
                    transmission: 0.6
                })
            );
            glassPaneL.rotation.y = Math.PI / 2;
            glassPaneL.position.set(-roomWidth / 2 + 0.28, 2.5, zPos);
            this.officeGroup.add(glassPaneL);
        });

        // 3. Meeting Room & Server Hub (Harmoniously aligned in back quadrants)
        this.buildMeetingRoom(-7.5, -8.75);
        this.buildServerRacks(7.5, -10.5);

        // 4. Coffee Corner Infrastructure
        this.buildCoffeeCornerInfrastructure(8.8, 5.6);

        // 5. Lounge Decor, Pendant Chandelier & Furniture
        this.buildLoungeDecor();

        // 6. Lush Potted Plants
        this.createPottedPlant(-10.5, 4.5);
        this.createPottedPlant(10.5, -3.5);
        this.createPottedPlant(-1.5, -9.5);
        this.createPottedPlant(-1.5, 6.5);
    }

    createCarpet(x, z, width, depth, colorHex, opacity = 0.4) {
        const carpet = new THREE.Mesh(
            new THREE.PlaneGeometry(width, depth),
            new THREE.MeshStandardMaterial({
                color: colorHex,
                roughness: 0.9,
                transparent: true,
                opacity: opacity
            })
        );
        carpet.rotation.x = -Math.PI / 2;
        carpet.position.set(x, 0.02, z);
        carpet.receiveShadow = true;
        this.officeGroup.add(carpet);
        return carpet;
    }

    buildMeetingRoom(x, z) {
        const isLight = this.currentTheme === 'light';
        const roomW = 8;
        const roomD = 5.5;
        const glassHeight = 3.2;

        // Physical Architectural Glass
        const glassMat = new THREE.MeshPhysicalMaterial({
            color: isLight ? 0xdbeafe : 0x93c5fd,
            transparent: true,
            opacity: 0.45,
            roughness: 0.04,
            metalness: 0.08,
            transmission: 0.88,
            ior: 1.52,
            reflectivity: 0.5
        });

        // Front Glass Wall
        const frontGlass = new THREE.Mesh(new THREE.BoxGeometry(roomW, glassHeight, 0.08), glassMat);
        frontGlass.position.set(x, glassHeight / 2, z + roomD / 2);
        this.officeGroup.add(frontGlass);

        // Frosted Privacy Vinyl Strip across middle
        const frostMat = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.35,
            roughness: 0.7
        });
        const frostBand = new THREE.Mesh(new THREE.BoxGeometry(roomW, 0.45, 0.09), frostMat);
        frostBand.position.set(x, 1.45, z + roomD / 2);
        this.officeGroup.add(frostBand);

        // Right Glass Wall
        const rightGlass = new THREE.Mesh(new THREE.BoxGeometry(0.08, glassHeight, roomD), glassMat);
        rightGlass.position.set(x + roomW / 2, glassHeight / 2, z);
        this.officeGroup.add(rightGlass);

        // Conference Table
        const tableTop = new THREE.Mesh(
            new THREE.CylinderGeometry(1.6, 1.6, 0.1, 32),
            new THREE.MeshStandardMaterial({ color: isLight ? 0x94a3b8 : 0x334155, roughness: 0.35 })
        );
        tableTop.scale.set(1.6, 1, 0.9);
        tableTop.position.set(x, 1.1, z);
        tableTop.castShadow = true;
        tableTop.receiveShadow = true;
        this.officeGroup.add(tableTop);

        const tableLeg = new THREE.Mesh(
            new THREE.CylinderGeometry(0.2, 0.3, 1.1, 16),
            new THREE.MeshStandardMaterial({ color: isLight ? 0x475569 : 0x0f172a, metalness: 0.8 })
        );
        tableLeg.position.set(x, 0.55, z);
        tableLeg.castShadow = true;
        this.officeGroup.add(tableLeg);

        // Conference Chairs
        const chairCount = 4;
        for (let i = 0; i < chairCount; i++) {
            const angle = (i / chairCount) * Math.PI * 2;
            const cx = x + Math.cos(angle) * 1.8;
            const cz = z + Math.sin(angle) * 1.2;
            this.createSimpleChair(cx, cz, angle + Math.PI);
        }

        // Ultra-HD Wall Presentation Screen (Displaying live architecture diagram)
        const screenMat = new THREE.MeshStandardMaterial({
            map: this.cachedTextures.presentationScreen,
            emissiveMap: this.cachedTextures.presentationScreen,
            emissive: 0x38bdf8,
            emissiveIntensity: isLight ? 0.6 : 0.8,
            roughness: 0.2
        });
        const presScreen = new THREE.Mesh(new THREE.BoxGeometry(3.6, 1.8, 0.05), screenMat);
        presScreen.position.set(x, 2.2, z - roomD / 2 + 0.3);
        this.officeGroup.add(presScreen);

        // Hanging conference lamp
        const lamp = new THREE.Mesh(
            new THREE.TorusGeometry(1.2, 0.04, 16, 32),
            new THREE.MeshStandardMaterial({ color: 0x3b82f6, emissive: 0x3b82f6, emissiveIntensity: isLight ? 0.7 : 0.9 })
        );
        lamp.rotation.x = Math.PI / 2;
        lamp.position.set(x, 3.4, z);
        this.officeGroup.add(lamp);
    }

    buildCoffeeCornerInfrastructure(x, z) {
        const isLight = this.currentTheme === 'light';

        // Coffee Bar Counter (Spans x: 7.4 to 10.2, z: 5.18 to 6.02)
        const counter = new THREE.Mesh(
            new THREE.BoxGeometry(2.8, 1.15, 0.85),
            new THREE.MeshStandardMaterial({ color: isLight ? 0x64748b : 0x475569, roughness: 0.4 })
        );
        counter.position.set(x, 0.575, z);
        counter.castShadow = true;
        counter.receiveShadow = true;
        this.officeGroup.add(counter);

        // Sleek Marble Countertop
        const top = new THREE.Mesh(
            new THREE.BoxGeometry(3.0, 0.08, 0.95),
            new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.15 })
        );
        top.position.set(x, 1.19, z);
        top.castShadow = true;
        this.officeGroup.add(top);

        // Espresso Machine
        const espresso = new THREE.Mesh(
            new THREE.BoxGeometry(0.75, 0.55, 0.55),
            new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.9, roughness: 0.2 })
        );
        espresso.position.set(x - 0.8, 1.51, z);
        espresso.castShadow = true;
        this.officeGroup.add(espresso);

        // Coffee mugs
        for (let m = 0; m < 3; m++) {
            const mug = new THREE.Mesh(
                new THREE.CylinderGeometry(0.07, 0.07, 0.14, 12),
                new THREE.MeshStandardMaterial({ color: m === 0 ? 0xef4444 : (m === 1 ? 0x3b82f6 : 0x10b981) })
            );
            mug.position.set(x - 0.2 + m * 0.25, 1.30, z);
            this.officeGroup.add(mug);
        }

        // Water Cooler Dispenser (Neatly placed next to counter)
        const coolerBody = new THREE.Mesh(
            new THREE.BoxGeometry(0.65, 1.35, 0.65),
            new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.3 })
        );
        coolerBody.position.set(x + 1.9, 0.675, z);
        coolerBody.castShadow = true;
        this.officeGroup.add(coolerBody);

        const bottle = new THREE.Mesh(
            new THREE.CylinderGeometry(0.25, 0.25, 0.65, 16),
            new THREE.MeshPhysicalMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.75, roughness: 0.1, transmission: 0.8 })
        );
        bottle.position.set(x + 1.9, 1.675, z);
        this.officeGroup.add(bottle);
    }

    buildLoungeDecor() {
        const isLight = this.currentTheme === 'light';

        // 1. Sleek Modern Coffee Table in Lounge Center (Spans x: 2.95 to 4.65, z: 6.75 to 7.65)
        // Perfectly proportioned with 67.5cm - 87.5cm clearance to surrounding sofas
        const coffeeTable = new THREE.Mesh(
            new THREE.BoxGeometry(1.7, 0.40, 0.90),
            new THREE.MeshStandardMaterial({ color: isLight ? 0x64748b : 0x334155, roughness: 0.25 })
        );
        coffeeTable.position.set(3.8, 0.20, 7.2);
        coffeeTable.castShadow = true;
        coffeeTable.receiveShadow = true;
        this.officeGroup.add(coffeeTable);

        // Table Top Chamfer / Marble Inlay
        const tableInlay = new THREE.Mesh(
            new THREE.BoxGeometry(1.58, 0.03, 0.78),
            new THREE.MeshStandardMaterial({ color: isLight ? 0xf8fafc : 0x1e293b, roughness: 0.15 })
        );
        tableInlay.position.set(3.8, 0.41, 7.2);
        this.officeGroup.add(tableInlay);

        // Ceramic Succulent Planter on Coffee Table
        const bowl = new THREE.Mesh(
            new THREE.CylinderGeometry(0.18, 0.14, 0.08, 16),
            new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 })
        );
        bowl.position.set(3.8, 0.47, 7.2);
        this.officeGroup.add(bowl);

        const succulent = new THREE.Mesh(
            new THREE.DodecahedronGeometry(0.10, 0),
            new THREE.MeshStandardMaterial({ color: 0x10b981, roughness: 0.5 })
        );
        succulent.position.set(3.8, 0.54, 7.2);
        this.officeGroup.add(succulent);

        // Stacked Tech Magazines on Table
        const mag1 = new THREE.Mesh(
            new THREE.BoxGeometry(0.30, 0.025, 0.38),
            new THREE.MeshStandardMaterial({ color: 0x38bdf8 })
        );
        mag1.position.set(3.3, 0.43, 7.25);
        mag1.rotation.y = 0.18;
        this.officeGroup.add(mag1);

        const mag2 = new THREE.Mesh(
            new THREE.BoxGeometry(0.28, 0.02, 0.35),
            new THREE.MeshStandardMaterial({ color: 0xf59e0b })
        );
        mag2.position.set(3.3, 0.45, 7.25);
        mag2.rotation.y = -0.12;
        this.officeGroup.add(mag2);

        // 2. Modern Overhead Warm Ring Chandelier (Pendant Lamp centered directly over Lounge Table)
        const ringChandelier = new THREE.Mesh(
            new THREE.TorusGeometry(1.2, 0.03, 16, 48),
            new THREE.MeshStandardMaterial({
                color: 0xffedd5,
                emissive: 0xf59e0b,
                emissiveIntensity: isLight ? 1.0 : 1.3,
                roughness: 0.2
            })
        );
        ringChandelier.rotation.x = Math.PI / 2;
        ringChandelier.position.set(3.8, 3.4, 7.2);
        this.officeGroup.add(ringChandelier);

        // Chandelier suspension wires
        for (let i = 0; i < 3; i++) {
            const angle = (i / 3) * Math.PI * 2;
            const wire = new THREE.Mesh(
                new THREE.CylinderGeometry(0.005, 0.005, 1.1, 8),
                new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.8 })
            );
            wire.position.set(3.8 + Math.cos(angle) * 1.2, 3.95, 7.2 + Math.sin(angle) * 1.2);
            this.officeGroup.add(wire);
        }

        // 3. Lounge Bookshelf / Credenza (Neatly placed along right wall, clear of any chairs)
        const credenza = new THREE.Mesh(
            new THREE.BoxGeometry(0.8, 1.3, 2.6),
            new THREE.MeshStandardMaterial({ color: isLight ? 0x475569 : 0x1e293b, roughness: 0.4 })
        );
        credenza.position.set(11.0, 0.65, 8.0);
        credenza.castShadow = true;
        this.officeGroup.add(credenza);

        // Books on credenza
        const bookColors = [0xef4444, 0x3b82f6, 0x10b981, 0xf59e0b, 0x8b5cf6];
        for (let b = 0; b < 5; b++) {
            const book = new THREE.Mesh(
                new THREE.BoxGeometry(0.35, 0.42, 0.08),
                new THREE.MeshStandardMaterial({ color: bookColors[b] })
            );
            book.position.set(11.0, 1.55, 7.2 + b * 0.18);
            this.officeGroup.add(book);
        }

        // Gold Trophy on Credenza
        const trophy = new THREE.Mesh(
            new THREE.CylinderGeometry(0.11, 0.05, 0.32, 16),
            new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.9, roughness: 0.2 })
        );
        trophy.position.set(11.0, 1.5, 8.6);
        this.officeGroup.add(trophy);
    }

    buildServerRacks(x, z) {
        this.serverLeds = [];
        for (let r = 0; r < 2; r++) {
            const rx = x + r * 1.5;
            const rack = new THREE.Mesh(
                new THREE.BoxGeometry(1.2, 3.4, 0.9),
                new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8, roughness: 0.3 })
            );
            rack.position.set(rx, 1.7, z);
            rack.castShadow = true;
            this.officeGroup.add(rack);

            for (let s = 0; s < 6; s++) {
                const led = new THREE.Mesh(
                    new THREE.BoxGeometry(0.06, 0.06, 0.04),
                    new THREE.MeshBasicMaterial({ color: s % 2 === 0 ? 0x10b981 : 0x06b6d4 })
                );
                led.position.set(rx - 0.4 + (s % 3) * 0.3, 0.6 + s * 0.45, z + 0.47);
                this.officeGroup.add(led);
                this.serverLeds.push(led);
            }
        }
    }

    createSimpleChair(x, z, rotationY) {
        const isLight = this.currentTheme === 'light';
        const chair = new THREE.Group();
        chair.position.set(x, 0, z);
        chair.rotation.y = rotationY;

        const seat = new THREE.Mesh(
            new THREE.BoxGeometry(0.65, 0.1, 0.65),
            new THREE.MeshStandardMaterial({ color: isLight ? 0x475569 : 0x1e293b, roughness: 0.6 })
        );
        seat.position.y = 0.55;
        seat.castShadow = true;
        chair.add(seat);

        const back = new THREE.Mesh(
            new THREE.BoxGeometry(0.65, 0.6, 0.1),
            new THREE.MeshStandardMaterial({ color: isLight ? 0x64748b : 0x334155, roughness: 0.6 })
        );
        back.position.set(0, 0.85, -0.28);
        back.castShadow = true;
        chair.add(back);

        const stem = new THREE.Mesh(
            new THREE.CylinderGeometry(0.06, 0.06, 0.55, 12),
            new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.8 })
        );
        stem.position.y = 0.28;
        chair.add(stem);

        this.officeGroup.add(chair);
    }

    createPottedPlant(x, z) {
        const plant = new THREE.Group();
        plant.position.set(x, 0, z);

        const pot = new THREE.Mesh(
            new THREE.CylinderGeometry(0.35, 0.25, 0.7, 16),
            new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 })
        );
        pot.position.y = 0.35;
        pot.castShadow = true;
        plant.add(pot);

        const soil = new THREE.Mesh(
            new THREE.CylinderGeometry(0.33, 0.33, 0.1, 16),
            new THREE.MeshStandardMaterial({ color: 0x3f2d1d, roughness: 0.9 })
        );
        soil.position.y = 0.68;
        plant.add(soil);

        const leafMat = new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.6 });
        for (let l = 0; l < 5; l++) {
            const leaf = new THREE.Mesh(new THREE.DodecahedronGeometry(0.28, 0), leafMat);
            const angle = (l / 5) * Math.PI * 2;
            leaf.scale.set(1.4, 0.3, 0.8);
            leaf.rotation.x = 0.4;
            leaf.rotation.y = angle;
            leaf.position.set(Math.cos(angle) * 0.25, 0.95 + (l % 2) * 0.15, Math.sin(angle) * 0.25);
            leaf.castShadow = true;
            plant.add(leaf);
        }

        this.officeGroup.add(plant);
    }

    // ==========================================
    // DYNAMIC REST SPOTS & KURSI SOFA SYSTEM
    // ==========================================

    /**
     * Builds a high-fidelity 3D Kursi Sofa (Armchair or Multi-seater Sofa)
     * Local Coordinate System:
     * - Local +Z: Front of Sofa (Seat Cushion)
     * - Local -Z: Back of Sofa (Backrest Cushion)
     * - Local X: Left / Right Armrests
     * - Top surface of seat cushion is at y = 0.56
     */
    createSofaMesh(width, depth, colorHex, isLight = false) {
        const sofaGroup = new THREE.Group();
        const legMat = new THREE.MeshStandardMaterial({ 
            color: isLight ? 0x475569 : 0x0f172a, 
            roughness: 0.4, 
            metalness: 0.6 
        });
        const fabricMat = new THREE.MeshStandardMaterial({ 
            color: colorHex, 
            roughness: 0.7, 
            metalness: 0.05 
        });

        if (!this.sofaMaterials) this.sofaMaterials = [];
        this.sofaMaterials.push(fabricMat);

        // 1. Wooden Base Plinth
        const baseH = 0.12;
        const basePlinth = new THREE.Mesh(
            new THREE.BoxGeometry(width, baseH, depth),
            legMat
        );
        basePlinth.position.y = 0.22;
        basePlinth.castShadow = true;
        sofaGroup.add(basePlinth);

        // 2. Thick Plump Seat Cushion (Top surface at y = 0.56)
        const seatH = 0.28;
        const seatW = width - 0.38;
        const seatD = depth - 0.28;
        const seat = new THREE.Mesh(
            new THREE.BoxGeometry(seatW, seatH, seatD),
            fabricMat
        );
        seat.position.set(0, 0.42, 0.05);
        seat.castShadow = true;
        seat.receiveShadow = true;
        sofaGroup.add(seat);

        // 3. Ergonomic Angled Backrest (At local -Z)
        const backH = 0.65;
        const backD = 0.26;
        const back = new THREE.Mesh(
            new THREE.BoxGeometry(width, backH, backD),
            fabricMat
        );
        back.position.set(0, 0.72, -depth / 2 + backD / 2);
        back.rotation.x = -0.09;
        back.castShadow = true;
        sofaGroup.add(back);

        // 4. Side Armrests (Padded Left & Right)
        const armW = 0.19;
        const armH = 0.42;
        const armD = depth - 0.08;

        const leftArm = new THREE.Mesh(new THREE.BoxGeometry(armW, armH, armD), fabricMat);
        leftArm.position.set(-width / 2 + armW / 2, 0.52, 0);
        leftArm.castShadow = true;
        sofaGroup.add(leftArm);

        const rightArm = new THREE.Mesh(new THREE.BoxGeometry(armW, armH, armD), fabricMat);
        rightArm.position.set(width / 2 - armW / 2, 0.52, 0);
        rightArm.castShadow = true;
        sofaGroup.add(rightArm);

        // 5. Tapered Mid-Century Sofa Legs with Brass Tips
        const legH = 0.22;
        const lx = width / 2 - 0.12;
        const lz = depth / 2 - 0.12;
        const legPositions = [
            [-lx, legH / 2, -lz],
            [lx, legH / 2, -lz],
            [-lx, legH / 2, lz],
            [lx, legH / 2, lz]
        ];
        legPositions.forEach(p => {
            const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.025, legH, 12), legMat);
            leg.position.set(...p);
            leg.castShadow = true;
            sofaGroup.add(leg);
        });

        // 6. Accent Throw Pillow (Bantal Sofa)
        const pillowColor = isLight ? 0xf59e0b : 0x06b6d4;
        const pillow = new THREE.Mesh(
            new THREE.BoxGeometry(0.35, 0.35, 0.14),
            new THREE.MeshStandardMaterial({ color: pillowColor, roughness: 0.55 })
        );
        pillow.position.set(-seatW / 3, 0.56, -depth / 2 + 0.3);
        pillow.rotation.set(-0.25, 0.2, 0.1);
        pillow.castShadow = true;
        sofaGroup.add(pillow);

        return sofaGroup;
    }

    /**
     * Initializes lounge seating spots around the coffee table:
     * - All sofas face inward toward the coffee table (at x = 4.5, z = 7.2)
     * - Agents sit naturally facing the social circle!
     */
    initRestSpots() {
        this.restSpots = [];
        this.sofaMaterials = [];
        const isLight = this.currentTheme === 'light';

        // 1. Main 3-Seater Sofa (At z = 8.85, facing south towards coffee table at z = 7.2)
        // Generous 67.5cm clearance to coffee table (Zero leg clipping, realistic seating space)
        const mainSofaColor = isLight ? 0x0284c7 : 0x0369a1;
        const mainSofa = this.createSofaMesh(2.8, 1.05, mainSofaColor, isLight);
        mainSofa.position.set(3.8, 0, 8.85);
        mainSofa.rotation.y = Math.PI; // Facing -Z (towards coffee table)
        this.officeGroup.add(mainSofa);

        // Seat 1 on Main Sofa (Left side)
        this.restSpots.push({
            id: 'sofa_main_left',
            type: 'sofa',
            x: 3.2,
            y: 0,
            z: 8.78,
            rotY: Math.PI,
            occupiedBy: null,
            mesh: mainSofa
        });

        // Seat 2 on Main Sofa (Right side)
        this.restSpots.push({
            id: 'sofa_main_right',
            type: 'sofa',
            x: 4.4,
            y: 0,
            z: 8.78,
            rotY: Math.PI,
            occupiedBy: null,
            mesh: mainSofa
        });

        // 2. Kursi Sofa Single Kiri (Armchair 1 - facing coffee table from left)
        // Generous 87.5cm clearance to coffee table
        const armchairColor1 = isLight ? 0x059669 : 0x0f766e;
        const leftArmchair = this.createSofaMesh(1.15, 1.05, armchairColor1, isLight);
        leftArmchair.position.set(1.55, 0, 7.2);
        leftArmchair.rotation.y = Math.PI / 2; // Facing +X (towards coffee table)
        this.officeGroup.add(leftArmchair);

        this.restSpots.push({
            id: 'sofa_armchair_left',
            type: 'sofa_armchair',
            x: 1.62,
            y: 0,
            z: 7.2,
            rotY: Math.PI / 2,
            occupiedBy: null,
            mesh: leftArmchair
        });

        // 3. Kursi Sofa Single Kanan (Armchair 2 - facing coffee table from right)
        // 87.5cm clearance to table, and 72.5cm walkway clearance to coffee counter
        const armchairColor2 = isLight ? 0xd97706 : 0xb45309;
        const rightArmchair = this.createSofaMesh(1.15, 1.05, armchairColor2, isLight);
        rightArmchair.position.set(6.05, 0, 7.2);
        rightArmchair.rotation.y = -Math.PI / 2; // Facing -X (towards coffee table)
        this.officeGroup.add(rightArmchair);

        this.restSpots.push({
            id: 'sofa_armchair_right',
            type: 'sofa_armchair',
            x: 5.98,
            y: 0,
            z: 7.2,
            rotY: -Math.PI / 2,
            occupiedBy: null,
            mesh: rightArmchair
        });

        // 4. Kursi Sofa Depan (2-Seater facing coffee table from south)
        // Generous 67.5cm clearance to coffee table
        const frontSofaColor = isLight ? 0x7c3aed : 0x6d28d9;
        const frontSofa = this.createSofaMesh(2.0, 1.05, frontSofaColor, isLight);
        frontSofa.position.set(3.8, 0, 5.55);
        frontSofa.rotation.y = 0; // Facing +Z (towards coffee table)
        this.officeGroup.add(frontSofa);

        this.restSpots.push({
            id: 'sofa_front',
            type: 'sofa',
            x: 3.8,
            y: 0,
            z: 5.62,
            rotY: 0,
            occupiedBy: null,
            mesh: frontSofa
        });

        // 5. Bar Stools at Coffee Counter (2 seats facing north)
        const stoolX = [8.1, 9.3];
        stoolX.forEach((sx, idx) => {
            const stool = new THREE.Mesh(
                new THREE.CylinderGeometry(0.28, 0.28, 0.75, 16),
                new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.5 })
            );
            stool.position.set(sx, 0.375, 4.7);
            stool.castShadow = true;
            this.officeGroup.add(stool);

            this.restSpots.push({
                id: `stool_${idx + 1}`,
                type: 'stool',
                x: sx,
                y: 0,
                z: 4.7,
                rotY: 0,
                occupiedBy: null,
                mesh: stool
            });
        });
    }

    /**
     * Finds an available rest spot or automatically spawns a new designer Kursi Sofa
     */
    getOrCreateRestSpotForAgent(agentId) {
        const existing = this.restSpots.find(s => s.occupiedBy === agentId);
        if (existing) return existing;

        const available = this.restSpots.find(s => s.occupiedBy === null);
        if (available) {
            available.occupiedBy = agentId;
            return available;
        }

        // All default spots occupied: dynamically spawn a new stylish Kursi Sofa!
        const newSpot = this.spawnNewDynamicRestSpot(agentId);
        return newSpot;
    }

    /**
     * Automatically creates a new 3D Kursi Sofa Single in the lounge with spring bounce pop-in!
     */
    spawnNewDynamicRestSpot(agentId) {
        const spotIndex = this.restSpots.length;
        const spotId = `dynamic_sofa_${spotIndex + 1}`;
        const isLight = this.currentTheme === 'light';

        // Elegant perimeter positions facing the coffee table / social hub without collision
        const dynamicPositions = [
            { x: 0.8, z: 8.6, rotY: 0.5 },    // Upper-left lounge reading corner
            { x: 0.8, z: 5.8, rotY: 1.1 },    // Lower-left lounge entrance nook
            { x: 6.8, z: 8.8, rotY: -0.6 },   // Upper-right corner behind armchair
            { x: 9.6, z: 8.0, rotY: -0.4 },   // Quiet nook near credenza
            { x: -0.5, z: 7.2, rotY: Math.PI / 2 }, // Outer left reading spot
            { x: 6.5, z: 5.0, rotY: 2.6 }     // Corner between front sofa and bar
        ];

        const posConfig = dynamicPositions[spotIndex % dynamicPositions.length];
        const spotX = posConfig.x;
        const spotZ = posConfig.z;
        const spotRot = posConfig.rotY;

        const sofaColors = [
            0x0284c7, // Nordic Blue
            0x059669, // Emerald Green
            0xd97706, // Amber Ochre
            0xe11d48, // Dusty Rose
            0x7c3aed, // Royal Purple
            0x0d9488  // Modern Teal
        ];
        const color = sofaColors[spotIndex % sofaColors.length];

        const sofaMesh = this.createSofaMesh(1.15, 1.05, color, isLight);
        sofaMesh.position.set(spotX, 0, spotZ);
        sofaMesh.rotation.y = spotRot;

        // Pop-in spring bounce spawn animation
        sofaMesh.scale.set(0.01, 0.01, 0.01);
        sofaMesh.userData.targetScale = new THREE.Vector3(1, 1, 1);
        sofaMesh.userData.isDynamic = true;

        this.officeGroup.add(sofaMesh);
        this.dynamicFurnitureList.push(sofaMesh);

        const spot = {
            id: spotId,
            type: 'kursi_sofa',
            x: spotX,
            y: 0,
            z: spotZ,
            rotY: spotRot,
            occupiedBy: agentId,
            mesh: sofaMesh
        };

        this.restSpots.push(spot);
        console.log(`[Kantor Virtual 3D] Kursi Sofa baru (#${spotIndex + 1}) otomatis ditambahkan untuk Agent #${agentId}`);
        return spot;
    }

    freeRestSpotForAgent(agentId) {
        const spot = this.restSpots.find(s => s.occupiedBy === agentId);
        if (spot) {
            spot.occupiedBy = null;
        }
    }

    /**
     * Calculates the exact ergonomic world position and rotation for an avatar sitting at a desk:
     * - Desk surface spans local z = -0.65 to +0.65
     * - Chair & avatar sit at local z = +0.95 (in front of desk edge at +0.65, leaving ~10cm comfortable gap)
     * - Avatar faces toward local -Z (looking directly at the laptop and dual monitors)
     */
    getDeskSeatTransform(deskX, deskZ, rotY) {
        const localOffset = new THREE.Vector3(0, 0.08, 0.95);
        localOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), rotY);
        return {
            pos: new THREE.Vector3(deskX + localOffset.x, 0.08, deskZ + localOffset.z),
            rotY: rotY + Math.PI
        };
    }

    // ==========================================
    // THEME SWITCHING (LIGHT / DARK)
    // ==========================================

    setTheme(newTheme) {
        if (this.currentTheme === newTheme) return;
        this.currentTheme = newTheme;
        const isLight = newTheme === 'light';

        this.applyThemeColors();

        if (this.renderer && THREE.ACESFilmicToneMapping) {
            this.renderer.toneMappingExposure = isLight ? 1.0 : 1.25;
        }

        if (this.hemiLight) {
            this.hemiLight.color.setHex(isLight ? 0xfffbeb : 0x38bdf8);
            this.hemiLight.groundColor.setHex(isLight ? 0xa89f91 : 0x090d16);
            this.hemiLight.intensity = isLight ? 0.32 : 0.40;
        }

        if (this.ambientLight) {
            this.ambientLight.color.setHex(isLight ? 0xf8fafc : 0xdbeafe);
            this.ambientLight.intensity = isLight ? 0.38 : 0.55;
        }

        if (this.dirLight) {
            this.dirLight.color.setHex(isLight ? 0xfffaf0 : 0xffffff);
            this.dirLight.intensity = isLight ? 1.30 : 0.95;
            this.dirLight.shadow.radius = isLight ? 1.8 : 2.5;
        }

        if (this.floorMat) {
            this.floorMat.map = isLight ? this.cachedTextures.floorLight : this.cachedTextures.floorDark;
            this.floorMat.roughness = isLight ? 0.42 : 0.48;
            this.floorMat.needsUpdate = true;
        }

        if (this.carpetLeft) {
            this.carpetLeft.material.color.setHex(isLight ? 0x2563eb : 0x1e3a8a);
            this.carpetLeft.material.opacity = isLight ? 0.52 : 0.25;
        }
        if (this.carpetRight) {
            this.carpetRight.material.color.setHex(isLight ? 0x7c3aed : 0x312e81);
            this.carpetRight.material.opacity = isLight ? 0.52 : 0.25;
        }
        if (this.carpetLounge) {
            this.carpetLounge.material.color.setHex(isLight ? 0xc2410c : 0x7c2d12);
            this.carpetLounge.material.opacity = isLight ? 0.55 : 0.3;
        }

        if (this.wallMat) {
            this.wallMat.color.setHex(isLight ? 0x334155 : 0x0f172a);
        }

        if (this.baseboardMat) {
            this.baseboardMat.color.setHex(isLight ? 0x0f172a : 0x38bdf8);
        }

        if (this.winFrameMat) {
            this.winFrameMat.color.setHex(isLight ? 0xffffff : 0x1e293b);
        }

        // Update desks & text badges
        for (const [id, agentUnit] of this.agents.entries()) {
            const agent = agentUnit.userData.agentData;
            const deskTop = agentUnit.deskGroup.getObjectByName(`DeskTop_${id}`);
            if (deskTop) {
                deskTop.material.color.setHex(isLight ? 0xffffff : 0x334155);
            }

            const oldSprite = agentUnit.avatarGroup.getObjectByName(`BadgeSprite_${id}`);
            if (oldSprite) {
                agentUnit.avatarGroup.remove(oldSprite);
                if (oldSprite.material.map) oldSprite.material.map.dispose();
                oldSprite.material.dispose();

                const newSprite = this.createTextBadgeSprite(agent.name, agent.role, agent.status);
                newSprite.position.set(0, 2.7, 0);
                newSprite.name = `BadgeSprite_${id}`;
                agentUnit.avatarGroup.add(newSprite);
            }
        }
    }

    // ==========================================
    // AGENT WORKSTATION & ARTICULATED AVATAR
    // ==========================================

    syncAgents(agentList) {
        const currentIds = new Set(agentList.map(a => Number(a.id)));

        for (const [id, agentObj] of this.agents.entries()) {
            if (!currentIds.has(id)) {
                this.removeAgentWorkstation(id);
            }
        }

        agentList.forEach(agentData => {
            const id = Number(agentData.id);
            if (this.agents.has(id)) {
                this.updateAgentWorkstation(id, agentData);
            } else {
                this.createAgentWorkstation(agentData);
            }
        });
    }

    /**
     * Builds realistic Workstation Desk and fully Articulated Avatar Rig
     */
    createAgentWorkstation(agent) {
        const id = Number(agent.id);
        const isLight = this.currentTheme === 'light';

        const deskX = parseFloat(agent.desk_x) || 0;
        const deskZ = parseFloat(agent.desk_z) || 0;
        const rotY = parseFloat(agent.desk_rotation) || 0;

        // 1. DESK GROUP (Stays at the assigned workstation)
        const deskGroup = new THREE.Group();
        deskGroup.name = `DeskGroup_${id}`;
        deskGroup.position.set(deskX, 0, deskZ);
        deskGroup.rotation.y = rotY;
        deskGroup.userData = { agentId: id, agentData: agent, isDesk: true };

        // Desk Surface
        const deskTop = new THREE.Mesh(
            new THREE.BoxGeometry(2.4, 0.1, 1.3),
            new THREE.MeshStandardMaterial({ color: isLight ? 0xffffff : 0x334155, roughness: 0.35 })
        );
        deskTop.position.y = 1.05;
        deskTop.castShadow = true;
        deskTop.receiveShadow = true;
        deskTop.name = `DeskTop_${id}`;
        deskGroup.add(deskTop);

        // Metal Desk Legs - Dark graphite slate for architectural contrast against the warm floor
        const legMat = new THREE.MeshStandardMaterial({ color: isLight ? 0x1e293b : 0x0f172a, metalness: 0.8, roughness: 0.3 });
        const legOffsets = [
            [-1.1, 0.525, -0.55],
            [1.1, 0.525, -0.55],
            [-1.1, 0.525, 0.55],
            [1.1, 0.525, 0.55]
        ];
        legOffsets.forEach(pos => {
            const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.05, 0.08), legMat);
            leg.position.set(...pos);
            leg.castShadow = true;
            deskGroup.add(leg);
        });

        // Acoustic Divider Screen (at back edge of desk) - Deep slate felt for clear silhouette
        const divider = new THREE.Mesh(
            new THREE.BoxGeometry(2.35, 0.55, 0.04),
            new THREE.MeshStandardMaterial({ color: isLight ? 0x334155 : 0x1e293b, roughness: 0.8 })
        );
        divider.position.set(0, 1.35, -0.62);
        deskGroup.add(divider);

        // Desk Mat / Mousepad (Placed on the front half of the desk)
        const deskMat = new THREE.Mesh(
            new THREE.BoxGeometry(1.6, 0.01, 0.55),
            new THREE.MeshStandardMaterial({ color: isLight ? 0x334155 : 0x0f172a, roughness: 0.9 })
        );
        deskMat.position.set(0, 1.105, 0.32);
        deskGroup.add(deskMat);

        // Laptop Base
        const laptopBase = new THREE.Mesh(
            new THREE.BoxGeometry(0.65, 0.03, 0.45),
            new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.9, roughness: 0.2 })
        );
        laptopBase.position.set(0, 1.11, 0.20);
        laptopBase.castShadow = true;
        deskGroup.add(laptopBase);

        // Glowing Laptop Screen with IDE Code Editor Texture
        const isWorking = agent.status === 'KERJA';
        const laptopScreenMat = new THREE.MeshStandardMaterial({
            map: this.cachedTextures.codeEditor,
            emissiveMap: this.cachedTextures.codeEditor,
            emissive: isWorking ? 0x38bdf8 : 0x000000,
            emissiveIntensity: isWorking ? 0.9 : 0.0,
            roughness: 0.2
        });
        const laptopScreen = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.42, 0.02), laptopScreenMat);
        laptopScreen.position.set(0, 1.3, -0.01);
        laptopScreen.rotation.x = -0.22;
        laptopScreen.name = `Screen_${id}`;
        deskGroup.add(laptopScreen);

        // Secondary Ultra-Wide Monitor with Live Metrics Dashboard
        const monitorStand = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.4, 0.1), legMat);
        monitorStand.position.set(0.72, 1.25, -0.20);
        deskGroup.add(monitorStand);

        const monitorMat = new THREE.MeshStandardMaterial({
            map: this.cachedTextures.metricsDashboard,
            emissiveMap: this.cachedTextures.metricsDashboard,
            emissive: isWorking ? 0x10b981 : 0x000000,
            emissiveIntensity: isWorking ? 0.85 : 0.0,
            roughness: 0.2
        });
        const monitorScreen = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.55, 0.04), monitorMat);
        monitorScreen.position.set(0.72, 1.5, -0.20);
        monitorScreen.rotation.y = -0.25;
        monitorScreen.name = `Monitor_${id}`;
        deskGroup.add(monitorScreen);

        // Desk Mug
        const mugMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.3 });
        const mug = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.12, 12), mugMat);
        mug.position.set(-0.85, 1.16, 0.25);
        deskGroup.add(mug);

        // Ergonomic Office Swivel Chair (Natural distance in front of desk)
        const chairColor = agent.avatar_color ? parseInt(agent.avatar_color.replace('#', '0x'), 16) : 0x3b82f6;
        const chair = new THREE.Group();
        chair.position.set(0, 0, 0.95);

        const seat = new THREE.Mesh(
            new THREE.BoxGeometry(0.75, 0.12, 0.7),
            new THREE.MeshStandardMaterial({ color: isLight ? 0x475569 : 0x1e293b, roughness: 0.6 })
        );
        seat.position.y = 0.65;
        seat.castShadow = true;
        chair.add(seat);

        const back = new THREE.Mesh(
            new THREE.BoxGeometry(0.7, 0.75, 0.1),
            new THREE.MeshStandardMaterial({ color: chairColor, roughness: 0.5 })
        );
        back.position.set(0, 1.05, 0.32);
        back.castShadow = true;
        chair.add(back);

        const base = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.65, 12), legMat);
        base.position.y = 0.325;
        chair.add(base);

        deskGroup.add(chair);

        deskGroup.traverse(child => {
            if (child.isMesh) child.userData.parentAgentId = id;
        });
        this.officeGroup.add(deskGroup);

        // 2. ARTICULATED AVATAR RIG (Moves across the office, sits on sofa with natural posture)
        const avatarGroup = new THREE.Group();
        avatarGroup.name = `AvatarGroup_${id}`;
        avatarGroup.userData = { agentId: id, agentData: agent, isAvatar: true };

        const bodyRoot = new THREE.Group();
        bodyRoot.name = `BodyRoot_${id}`;
        avatarGroup.add(bodyRoot);

        // Materials
        const hoodieMat = new THREE.MeshStandardMaterial({ color: chairColor, roughness: 0.5 });
        const skinMat = new THREE.MeshStandardMaterial({ color: 0xfbcfe8, roughness: 0.35 });
        const hairMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.7 });
        const pantsMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.7 });
        const shoeMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.4 });
        const whiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });

        // A. Pelvis / Hips
        const hips = new THREE.Mesh(new THREE.BoxGeometry(0.50, 0.16, 0.36), pantsMat);
        hips.position.y = 0.58;
        hips.castShadow = true;
        bodyRoot.add(hips);

        // B. Articulated Legs (Upper Leg / Thigh + Lower Leg / Calf + Shoes)
        // Left Leg
        const leftThighPivot = new THREE.Group();
        leftThighPivot.name = `LeftThighPivot_${id}`;
        leftThighPivot.position.set(-0.16, 0.56, 0.02);
        bodyRoot.add(leftThighPivot);

        const leftThigh = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.28, 0.16), pantsMat);
        leftThigh.position.set(0, -0.14, 0);
        leftThigh.castShadow = true;
        leftThighPivot.add(leftThigh);

        const leftKneePivot = new THREE.Group();
        leftKneePivot.name = `LeftKneePivot_${id}`;
        leftKneePivot.position.set(0, -0.28, 0);
        leftThighPivot.add(leftKneePivot);

        const leftCalf = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.24, 0.14), pantsMat);
        leftCalf.position.set(0, -0.12, 0);
        leftCalf.castShadow = true;
        leftKneePivot.add(leftCalf);

        // Left Sneaker with white sole
        const leftShoeGroup = new THREE.Group();
        leftShoeGroup.position.set(0, -0.24, 0.04);
        const leftShoeUpper = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.06, 0.22), shoeMat);
        leftShoeUpper.castShadow = true;
        leftShoeGroup.add(leftShoeUpper);
        const leftShoeSole = new THREE.Mesh(new THREE.BoxGeometry(0.155, 0.025, 0.23), whiteMat);
        leftShoeSole.position.y = -0.04;
        leftShoeGroup.add(leftShoeSole);
        leftKneePivot.add(leftShoeGroup);

        // Right Leg
        const rightThighPivot = new THREE.Group();
        rightThighPivot.name = `RightThighPivot_${id}`;
        rightThighPivot.position.set(0.16, 0.56, 0.02);
        bodyRoot.add(rightThighPivot);

        const rightThigh = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.28, 0.16), pantsMat);
        rightThigh.position.set(0, -0.14, 0);
        rightThigh.castShadow = true;
        rightThighPivot.add(rightThigh);

        const rightKneePivot = new THREE.Group();
        rightKneePivot.name = `RightKneePivot_${id}`;
        rightKneePivot.position.set(0, -0.28, 0);
        rightThighPivot.add(rightKneePivot);

        const rightCalf = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.24, 0.14), pantsMat);
        rightCalf.position.set(0, -0.12, 0);
        rightCalf.castShadow = true;
        rightKneePivot.add(rightCalf);

        // Right Sneaker with white sole
        const rightShoeGroup = new THREE.Group();
        rightShoeGroup.position.set(0, -0.24, 0.04);
        const rightShoeUpper = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.06, 0.22), shoeMat);
        rightShoeUpper.castShadow = true;
        rightShoeGroup.add(rightShoeUpper);
        const rightShoeSole = new THREE.Mesh(new THREE.BoxGeometry(0.155, 0.025, 0.23), whiteMat);
        rightShoeSole.position.y = -0.04;
        rightShoeGroup.add(rightShoeSole);
        rightKneePivot.add(rightShoeGroup);

        // C. Spine / Torso Pivot (Leans back comfortably when sitting on sofa)
        const spinePivot = new THREE.Group();
        spinePivot.name = `SpinePivot_${id}`;
        spinePivot.position.set(0, 0.58, 0);
        bodyRoot.add(spinePivot);

        const torso = new THREE.Mesh(new THREE.BoxGeometry(0.60, 0.62, 0.40), hoodieMat);
        torso.position.set(0, 0.31, 0);
        torso.castShadow = true;
        spinePivot.add(torso);

        // Hoodie Kangaroo Pocket
        const pocket = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.18, 0.06), hoodieMat);
        pocket.position.set(0, 0.18, 0.21);
        spinePivot.add(pocket);

        // Chest ID Badge
        const idBadge = new THREE.Mesh(
            new THREE.BoxGeometry(0.12, 0.16, 0.02),
            new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 })
        );
        idBadge.position.set(-0.16, 0.38, 0.21);
        spinePivot.add(idBadge);

        // D. Head Pivot
        const headPivot = new THREE.Group();
        headPivot.name = `HeadPivot_${id}`;
        headPivot.position.set(0, 0.62, 0);
        spinePivot.add(headPivot);

        const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.1, 12), skinMat);
        neck.position.y = 0.05;
        headPivot.add(neck);

        const head = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.46, 0.46), skinMat);
        head.position.y = 0.32;
        head.castShadow = true;
        head.name = `HeadMesh_${id}`;
        headPivot.add(head);

        // Expressive Face / Visor
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0x0f172a });
        const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 0.02), eyeMat);
        eyeL.position.set(-0.12, 0.34, 0.24);
        headPivot.add(eyeL);

        const eyeR = eyeL.clone();
        eyeR.position.x = 0.12;
        headPivot.add(eyeR);

        // Hair / Cap
        const hair = new THREE.Mesh(new THREE.BoxGeometry(0.50, 0.18, 0.50), hairMat);
        hair.position.set(0, 0.52, -0.02);
        headPivot.add(hair);

        // Modern Headset with Glowing RGB Accents
        const headsetBand = new THREE.Mesh(
            new THREE.TorusGeometry(0.27, 0.035, 8, 24, Math.PI),
            new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8, roughness: 0.3 })
        );
        headsetBand.rotation.z = Math.PI;
        headsetBand.position.set(0, 0.52, 0);
        headPivot.add(headsetBand);

        const earL = new THREE.Mesh(
            new THREE.CylinderGeometry(0.09, 0.09, 0.06, 16),
            new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.7 })
        );
        earL.rotation.z = Math.PI / 2;
        earL.position.set(-0.25, 0.34, 0);
        headPivot.add(earL);

        const rgbMat = new THREE.MeshBasicMaterial({ 
            color: agent.status === 'KERJA' ? 0x10b981 : 0x06b6d4 
        });
        const rgbRingL = new THREE.Mesh(new THREE.RingGeometry(0.04, 0.07, 16), rgbMat);
        rgbRingL.rotation.y = -Math.PI / 2;
        rgbRingL.position.set(-0.285, 0.34, 0);
        rgbRingL.name = `RgbRingL_${id}`;
        headPivot.add(rgbRingL);

        const earR = earL.clone();
        earR.position.x = 0.25;
        headPivot.add(earR);

        const rgbRingR = rgbRingL.clone();
        rgbRingR.rotation.y = Math.PI / 2;
        rgbRingR.position.x = 0.285;
        rgbRingR.name = `RgbRingR_${id}`;
        headPivot.add(rgbRingR);

        // E. Articulated Arms (Upper Arm + Forearm + Hands + Beverage in Lounge)
        // Left Arm
        const leftArmPivot = new THREE.Group();
        leftArmPivot.name = `LeftArmPivot_${id}`;
        leftArmPivot.position.set(-0.35, 0.56, 0);
        spinePivot.add(leftArmPivot);

        const leftUpperArm = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.26, 0.13), hoodieMat);
        leftUpperArm.position.set(0, -0.13, 0);
        leftUpperArm.castShadow = true;
        leftArmPivot.add(leftUpperArm);

        const leftElbowPivot = new THREE.Group();
        leftElbowPivot.name = `LeftElbowPivot_${id}`;
        leftElbowPivot.position.set(0, -0.26, 0);
        leftArmPivot.add(leftElbowPivot);

        const leftForearm = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.22, 0.12), hoodieMat);
        leftForearm.position.set(0, -0.11, 0);
        leftForearm.castShadow = true;
        leftElbowPivot.add(leftForearm);

        const leftHand = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.08, 0.10), skinMat);
        leftHand.position.set(0, -0.24, 0);
        leftElbowPivot.add(leftHand);

        // Right Arm
        const rightArmPivot = new THREE.Group();
        rightArmPivot.name = `RightArmPivot_${id}`;
        rightArmPivot.position.set(0.35, 0.56, 0);
        spinePivot.add(rightArmPivot);

        const rightUpperArm = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.26, 0.13), hoodieMat);
        rightUpperArm.position.set(0, -0.13, 0);
        rightUpperArm.castShadow = true;
        rightArmPivot.add(rightUpperArm);

        const rightElbowPivot = new THREE.Group();
        rightElbowPivot.name = `RightElbowPivot_${id}`;
        rightElbowPivot.position.set(0, -0.26, 0);
        rightArmPivot.add(rightElbowPivot);

        const rightForearm = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.22, 0.12), hoodieMat);
        rightForearm.position.set(0, -0.11, 0);
        rightForearm.castShadow = true;
        rightElbowPivot.add(rightForearm);

        const rightHand = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.08, 0.10), skinMat);
        rightHand.position.set(0, -0.24, 0);
        rightElbowPivot.add(rightHand);

        // Relaxed Coffee Cup in Right Hand (Active when resting in lounge)
        const coffeeCupGroup = new THREE.Group();
        coffeeCupGroup.name = `CoffeeCup_${id}`;
        coffeeCupGroup.position.set(0, -0.26, 0.08);

        const cupMesh = new THREE.Mesh(
            new THREE.CylinderGeometry(0.06, 0.05, 0.12, 12),
            new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.3 })
        );
        cupMesh.castShadow = true;
        coffeeCupGroup.add(cupMesh);

        const cupLiquid = new THREE.Mesh(
            new THREE.CylinderGeometry(0.055, 0.055, 0.02, 12),
            new THREE.MeshStandardMaterial({ color: 0x3f2d1d, roughness: 0.2 })
        );
        cupLiquid.position.y = 0.05;
        coffeeCupGroup.add(cupLiquid);

        // Steaming coffee vapor
        const steam = new THREE.Mesh(
            new THREE.ConeGeometry(0.04, 0.12, 8),
            new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35 })
        );
        steam.position.y = 0.12;
        coffeeCupGroup.add(steam);

        coffeeCupGroup.visible = false;
        rightElbowPivot.add(coffeeCupGroup);

        // F. Overhead Status Orb & Badge
        const statusOrb = new THREE.Mesh(
            new THREE.SphereGeometry(0.12, 16, 16),
            new THREE.MeshBasicMaterial({
                color: agent.status === 'KERJA' ? 0x10b981 : (agent.status === 'IDLE' ? 0xf59e0b : 0x64748b)
            })
        );
        statusOrb.position.set(0, 2.35, 0);
        statusOrb.name = `StatusOrb_${id}`;
        avatarGroup.add(statusOrb);

        const badgeSprite = this.createTextBadgeSprite(agent.name, agent.role, agent.status);
        badgeSprite.position.set(0, 2.7, 0);
        badgeSprite.name = `BadgeSprite_${id}`;
        avatarGroup.add(badgeSprite);

        // Floor Selection Ring
        const ringGeo = new THREE.RingGeometry(1.4, 1.55, 32);
        const ringMat = new THREE.MeshBasicMaterial({
            color: isLight ? 0x2563eb : 0x38bdf8,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.85
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = -Math.PI / 2;
        ring.position.y = 0.03;
        ring.visible = false;
        ring.name = `SelectRing_${id}`;
        avatarGroup.add(ring);

        avatarGroup.traverse(child => {
            if (child.isMesh) child.userData.parentAgentId = id;
        });
        this.officeGroup.add(avatarGroup);

        // 3. INITIAL POSE & LOCOMOTION STATE
        const deskSeat = this.getDeskSeatTransform(deskX, deskZ, rotY);
        let initialPos = deskSeat.pos.clone();
        let initialRot = deskSeat.rotY;
        let navState = 'WORKING';
        let restSpot = null;

        const agentUnit = {
            id,
            deskGroup,
            avatarGroup,
            userData: { agentData: agent },
            navigation: {
                state: navState,
                targetPos: initialPos.clone(),
                targetRot: initialRot,
                restSpot: restSpot,
                walkPhase: Math.random() * 10
            }
        };

        if (agent.status === 'IDLE') {
            restSpot = this.getOrCreateRestSpotForAgent(id);
            agentUnit.navigation.restSpot = restSpot;
            agentUnit.navigation.state = 'RESTING';
            initialPos.set(restSpot.x, -0.12, restSpot.z);
            initialRot = restSpot.rotY;
            agentUnit.navigation.targetPos.copy(initialPos);
            agentUnit.navigation.targetRot = initialRot;

            this.applySofaSittingPose(agentUnit);
        } else {
            this.applyDeskSittingPose(agentUnit);
        }

        avatarGroup.position.copy(initialPos);
        avatarGroup.rotation.y = initialRot;

        // Spawn bounce animations
        deskGroup.scale.set(0.01, 0.01, 0.01);
        deskGroup.userData.targetScale = new THREE.Vector3(1, 1, 1);
        avatarGroup.scale.set(0.01, 0.01, 0.01);
        avatarGroup.userData.targetScale = new THREE.Vector3(1, 1, 1);

        this.agents.set(id, agentUnit);
    }

    // ==========================================
    // ANATOMICAL POSTURE CONTROLLERS
    // ==========================================

    /**
     * Applies natural, relaxed sitting posture on the lounge sofa:
     * - Thighs sit horizontally on the plush seat cushion
     * - Knees bend 90° downward over the cushion front edge
     * - Calves hang vertically, feet resting naturally on floor/carpet
     * - Spine leans comfortably back into the angled backrest
     * - Left arm rests along the sofa armrest
     * - Right arm holds a warm steaming coffee mug!
     */
    applySofaSittingPose(agentUnit) {
        const id = agentUnit.id;
        const g = agentUnit.avatarGroup;

        const spine = g.getObjectByName(`SpinePivot_${id}`);
        const head = g.getObjectByName(`HeadPivot_${id}`);
        const thighL = g.getObjectByName(`LeftThighPivot_${id}`);
        const kneeL = g.getObjectByName(`LeftKneePivot_${id}`);
        const thighR = g.getObjectByName(`RightThighPivot_${id}`);
        const kneeR = g.getObjectByName(`RightKneePivot_${id}`);
        const armL = g.getObjectByName(`LeftArmPivot_${id}`);
        const elbowL = g.getObjectByName(`LeftElbowPivot_${id}`);
        const armR = g.getObjectByName(`RightArmPivot_${id}`);
        const elbowR = g.getObjectByName(`RightElbowPivot_${id}`);
        const coffeeCup = g.getObjectByName(`CoffeeCup_${id}`);

        // Pelvis rests comfortably on sofa cushion (y = -0.12 brings pelvis to cushion surface)
        g.position.y = -0.12;

        // Legs: Thighs forward on cushion, knees bent 90° down over front edge
        if (thighL) thighL.rotation.set(-Math.PI / 2 + 0.04, 0, -0.06);
        if (kneeL) kneeL.rotation.set(Math.PI / 2 - 0.04, 0, 0);
        if (thighR) thighR.rotation.set(-Math.PI / 2 + 0.04, 0, 0.06);
        if (kneeR) kneeR.rotation.set(Math.PI / 2 - 0.04, 0, 0);

        // Torso: Reclined comfortably back against the sofa backrest
        if (spine) {
            spine.rotation.set(-0.14, 0, 0);
            spine.position.set(0, 0.58, -0.05);
        }

        // Head: Looking comfortably forward while reclined
        if (head) head.rotation.set(0.08, 0, 0);

        // Left Arm: Rested along the sofa armrest
        if (armL) armL.rotation.set(-0.22, 0.1, -0.32);
        if (elbowL) elbowL.rotation.set(-0.55, 0.2, 0);

        // Right Arm: Holding warm coffee mug
        if (armR) armR.rotation.set(-0.45, -0.15, 0.18);
        if (elbowR) elbowR.rotation.set(-0.75, 0, 0);
        if (coffeeCup) coffeeCup.visible = true;
    }

    /**
     * Applies focused sitting posture at the workstation desk:
     * - Thighs horizontal under the desk
     * - Knees bent 90° down to chair footrest / floor
     * - Torso upright, slightly leaning forward toward screens
     * - Arms resting on keyboard & mouse
     */
    applyDeskSittingPose(agentUnit) {
        const id = agentUnit.id;
        const g = agentUnit.avatarGroup;

        const spine = g.getObjectByName(`SpinePivot_${id}`);
        const head = g.getObjectByName(`HeadPivot_${id}`);
        const thighL = g.getObjectByName(`LeftThighPivot_${id}`);
        const kneeL = g.getObjectByName(`LeftKneePivot_${id}`);
        const thighR = g.getObjectByName(`RightThighPivot_${id}`);
        const kneeR = g.getObjectByName(`RightKneePivot_${id}`);
        const armL = g.getObjectByName(`LeftArmPivot_${id}`);
        const elbowL = g.getObjectByName(`LeftElbowPivot_${id}`);
        const armR = g.getObjectByName(`RightArmPivot_${id}`);
        const elbowR = g.getObjectByName(`RightElbowPivot_${id}`);
        const coffeeCup = g.getObjectByName(`CoffeeCup_${id}`);

        g.position.y = 0.08;

        if (thighL) thighL.rotation.set(-Math.PI / 2, 0, 0);
        if (kneeL) kneeL.rotation.set(Math.PI / 2, 0, 0);
        if (thighR) thighR.rotation.set(-Math.PI / 2, 0, 0);
        if (kneeR) kneeR.rotation.set(Math.PI / 2, 0, 0);

        if (spine) {
            spine.rotation.set(0.06, 0, 0);
            spine.position.set(0, 0.58, 0);
        }

        if (head) head.rotation.set(0, 0, 0);

        if (armL) armL.rotation.set(-0.72, 0.1, 0.05);
        if (elbowL) elbowL.rotation.set(-0.62, 0, 0);

        if (armR) armR.rotation.set(-0.72, -0.1, -0.05);
        if (elbowR) elbowR.rotation.set(-0.62, 0, 0);

        if (coffeeCup) coffeeCup.visible = false;
    }

    /**
     * Updates an existing agent and handles WALKING TRANSITIONS between Desk & Rest Area!
     */
    updateAgentWorkstation(id, agent) {
        const agentUnit = this.agents.get(id);
        if (!agentUnit) return;

        const prevStatus = agentUnit.userData.agentData.status;
        agentUnit.userData.agentData = agent;
        const nav = agentUnit.navigation;

        // Desk coordinates
        const deskX = parseFloat(agent.desk_x) || 0;
        const deskZ = parseFloat(agent.desk_z) || 0;
        const rotY = parseFloat(agent.desk_rotation) || 0;
        agentUnit.deskGroup.position.set(deskX, 0, deskZ);
        agentUnit.deskGroup.rotation.y = rotY;

        // Update Screen glow
        const screen = agentUnit.deskGroup.getObjectByName(`Screen_${id}`);
        if (screen) {
            screen.material.emissive.setHex(agent.status === 'KERJA' ? 0x38bdf8 : 0x000000);
            screen.material.emissiveIntensity = agent.status === 'KERJA' ? 0.9 : 0.0;
        }

        const monitor = agentUnit.deskGroup.getObjectByName(`Monitor_${id}`);
        if (monitor) {
            monitor.material.emissive.setHex(agent.status === 'KERJA' ? 0x10b981 : 0x000000);
            monitor.material.emissiveIntensity = agent.status === 'KERJA' ? 0.85 : 0.0;
        }

        // Update status orb color
        const orb = agentUnit.avatarGroup.getObjectByName(`StatusOrb_${id}`);
        if (orb) {
            orb.material.color.setHex(agent.status === 'KERJA' ? 0x10b981 : (agent.status === 'IDLE' ? 0xf59e0b : 0x64748b));
        }

        // Update RGB headset ring
        const rgbL = agentUnit.avatarGroup.getObjectByName(`RgbRingL_${id}`);
        const rgbR = agentUnit.avatarGroup.getObjectByName(`RgbRingR_${id}`);
        const ringCol = agent.status === 'KERJA' ? 0x10b981 : (agent.status === 'IDLE' ? 0xf59e0b : 0x64748b);
        if (rgbL) rgbL.material.color.setHex(ringCol);
        if (rgbR) rgbR.material.color.setHex(ringCol);

        // Update text badge sprite
        const oldSprite = agentUnit.avatarGroup.getObjectByName(`BadgeSprite_${id}`);
        if (oldSprite) {
            agentUnit.avatarGroup.remove(oldSprite);
            if (oldSprite.material.map) oldSprite.material.map.dispose();
            oldSprite.material.dispose();

            const newSprite = this.createTextBadgeSprite(agent.name, agent.role, agent.status);
            newSprite.position.set(0, 2.7, 0);
            newSprite.name = `BadgeSprite_${id}`;
            agentUnit.avatarGroup.add(newSprite);
        }

        // STATUS CHANGE HANDLING: WALK TO REST AREA OR BACK TO DESK
        // Ignore stale network/SSE updates if the agent is actively walking during a lock window
        if (nav.lockUntil && Date.now() < nav.lockUntil) {
            return;
        }

        const currentPhysicalState = nav.state;
        const targetStatus = agent.status;

        const needsWalkToRest = targetStatus === 'IDLE' && (currentPhysicalState === 'WORKING' || currentPhysicalState === 'WALKING_TO_DESK');
        const needsWalkToDesk = targetStatus === 'KERJA' && (currentPhysicalState === 'RESTING' || currentPhysicalState === 'WALKING_TO_REST');

        if (needsWalkToRest) {
            this.startAgentLocomotion(agentUnit, 'IDLE');
        } else if (needsWalkToDesk) {
            this.startAgentLocomotion(agentUnit, 'KERJA');
        }
    }

    /**
     * Initiates smooth live walking locomotion with intelligent office waypoints
     */
    startAgentLocomotion(agentUnit, targetStatus) {
        const id = agentUnit.id;
        const agent = agentUnit.userData.agentData;
        const nav = agentUnit.navigation;
        const curPos = agentUnit.avatarGroup.position;

        // Prevent network race conditions or stale SSE from interrupting the walk
        nav.lockUntil = Date.now() + 6500;
        agent.status = targetStatus;

        const deskX = parseFloat(agent.desk_x) || 0;
        const deskZ = parseFloat(agent.desk_z) || 0;
        const rotY = parseFloat(agent.desk_rotation) || 0;

        // Stand up on floor level
        curPos.y = 0;

        // Hide coffee cup when standing up to walk
        const coffeeCup = agentUnit.avatarGroup.getObjectByName(`CoffeeCup_${id}`);
        if (coffeeCup) coffeeCup.visible = false;

        // Reset spine & head to upright walking posture
        const spine = agentUnit.avatarGroup.getObjectByName(`SpinePivot_${id}`);
        if (spine) {
            spine.rotation.set(0, 0, 0);
            spine.position.set(0, 0.58, 0);
        }
        const head = agentUnit.avatarGroup.getObjectByName(`HeadPivot_${id}`);
        if (head) head.rotation.set(0, 0, 0);

        if (targetStatus === 'IDLE') {
            const restSpot = this.getOrCreateRestSpotForAgent(id);
            nav.restSpot = restSpot;
            nav.state = 'WALKING_TO_REST';
            nav.targetRot = restSpot.rotY;

            // Collision-free corridor waypoints:
            // 1. Move from desk chair into central hallway (x = 0)
            // 2. Walk down central hallway to lounge threshold (x = 0, z = 5.2)
            // 3. Enter lounge walkway (x = 1.6, z = 5.2)
            // 4. Move directly to the assigned sofa chair
            nav.waypoints = [
                new THREE.Vector3(0, 0, curPos.z),
                new THREE.Vector3(0, 0, 5.2),
                new THREE.Vector3(1.6, 0, 5.2),
                new THREE.Vector3(restSpot.x, 0, restSpot.z)
            ];
            nav.waypointIndex = 0;
            nav.targetPos.copy(nav.waypoints[0]);

            console.log(`[Kantor Virtual 3D] Agent #${id} (${agent.name}) mulai berjalan santai ke Lounge...`);

        } else if (targetStatus === 'KERJA') {
            this.freeRestSpotForAgent(id);
            nav.restSpot = null;
            const deskSeat = this.getDeskSeatTransform(deskX, deskZ, rotY);
            nav.state = 'WALKING_TO_DESK';
            nav.targetRot = deskSeat.rotY;

            // Collision-free corridor waypoints back to desk:
            // 1. Step to lounge walkway (x = 1.6, z = 5.2)
            // 2. Step into central hallway (x = 0, z = 5.2)
            // 3. Walk along central hallway up to desk row (x = 0, z = deskSeat.pos.z)
            // 4. Move directly into desk chair
            nav.waypoints = [
                new THREE.Vector3(1.6, 0, 5.2),
                new THREE.Vector3(0, 0, 5.2),
                new THREE.Vector3(0, 0, deskSeat.pos.z),
                new THREE.Vector3(deskSeat.pos.x, 0, deskSeat.pos.z)
            ];
            nav.waypointIndex = 0;
            nav.targetPos.copy(nav.waypoints[0]);

            console.log(`[Kantor Virtual 3D] Agent #${id} (${agent.name}) mulai berjalan kembali ke Meja Kerja...`);
        }
    }

    setAgentStatus(agentId, newStatus) {
        const id = Number(agentId);
        const agentUnit = this.agents.get(id);
        if (!agentUnit) return;

        agentUnit.userData.agentData.status = newStatus;
        this.updateAgentWorkstation(id, agentUnit.userData.agentData);
    }

    removeAgent(id) {
        return this.removeAgentWorkstation(id);
    }

    removeAgentWorkstation(id) {
        const agentUnit = this.agents.get(id);
        if (!agentUnit) return;

        this.freeRestSpotForAgent(id);

        agentUnit.deskGroup.traverse(child => {
            if (child.isMesh) {
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
                    else child.material.dispose();
                }
            }
        });
        this.officeGroup.remove(agentUnit.deskGroup);

        agentUnit.avatarGroup.traverse(child => {
            if (child.isMesh) {
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
                    else child.material.dispose();
                }
            }
        });
        this.officeGroup.remove(agentUnit.avatarGroup);

        this.agents.delete(id);

        if (this.selectedAgentId === id) {
            this.selectedAgentId = null;
            this.selectionLight.intensity = 0;
        }
    }

    createTextBadgeSprite(name, role, status) {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 150;
        const ctx = canvas.getContext('2d');
        const isLight = this.currentTheme === 'light';

        const isWorking = status === 'KERJA';
        const isIdle = status === 'IDLE';
        const statusColor = isWorking ? '#059669' : (isIdle ? '#d97706' : '#475569');
        const statusGlow = isWorking ? '#10b981' : (isIdle ? '#f59e0b' : '#94a3b8');

        // 1. High-Contrast Ambient Drop Shadow
        ctx.save();
        ctx.shadowColor = isLight ? 'rgba(15, 23, 42, 0.45)' : 'rgba(0, 0, 0, 0.85)';
        ctx.shadowBlur = 14;
        ctx.shadowOffsetY = 4;

        // Card Outer Dimensions
        const x = 10;
        const y = 8;
        const w = 492;
        const h = 134;
        const r = 20;

        // Card rounded background
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();

        ctx.fillStyle = isLight ? '#ffffff' : 'rgba(15, 23, 42, 0.95)';
        ctx.fill();
        ctx.restore();

        // 2. High-Contrast Outer Border
        ctx.lineWidth = isLight ? 4.5 : 3.5;
        ctx.strokeStyle = isLight ? '#0f172a' : statusGlow;
        ctx.stroke();

        // 3. Top Accent Status Stripe
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + 10);
        ctx.lineTo(x, y + 10);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
        ctx.fillStyle = statusColor;
        ctx.fill();
        ctx.restore();

        // 4. Agent Name (Bold, High Contrast 900 weight)
        ctx.font = '900 32px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Inter, sans-serif';
        ctx.fillStyle = isLight ? '#090d16' : '#ffffff';
        ctx.textAlign = 'center';
        ctx.fillText(name, 256, 48);

        // 5. Agent Role Subtitle (Clear Architectural Typography)
        ctx.font = '600 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Inter, sans-serif';
        ctx.fillStyle = isLight ? '#334155' : '#94a3b8';
        ctx.fillText(role, 256, 76);

        // 6. Solid High-Contrast Status Pill Tag
        const pillW = 244;
        const pillH = 32;
        const pillX = 256 - (pillW / 2);
        const pillY = 94;
        const pillR = 16;

        ctx.beginPath();
        ctx.moveTo(pillX + pillR, pillY);
        ctx.lineTo(pillX + pillW - pillR, pillY);
        ctx.quadraticCurveTo(pillX + pillW, pillY, pillX + pillW, pillY + pillR);
        ctx.lineTo(pillX + pillW, pillY + pillH - pillR);
        ctx.quadraticCurveTo(pillX + pillW, pillY + pillH, pillX + pillW - pillR, pillY + pillH);
        ctx.lineTo(pillX + pillR, pillY + pillH);
        ctx.quadraticCurveTo(pillX, pillY + pillH, pillX, pillY + pillH - pillR);
        ctx.lineTo(pillX, pillY + pillR);
        ctx.quadraticCurveTo(pillX, pillY, pillX + pillR, pillY);
        ctx.closePath();
        ctx.fillStyle = statusColor;
        ctx.fill();

        // Status Pill Text (Crisp White Bold)
        const statusLabel = isIdle ? '☕ IDLE (Di Lounge)' : (isWorking ? '● KERJA (Di Meja)' : '⏸ PAUSED');
        ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Inter, sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(statusLabel, 256, 116);

        const texture = new THREE.CanvasTexture(canvas);
        texture.minFilter = THREE.LinearFilter;

        const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true });
        const sprite = new THREE.Sprite(spriteMat);
        sprite.scale.set(2.4, 0.70, 1);
        return sprite;
    }

    // ==========================================
    // SELECTION & CAMERA TWEENING
    // ==========================================

    selectAgent(id, triggerCallback = true) {
        const numId = Number(id);
        if (this.selectedAgentId && this.agents.has(this.selectedAgentId)) {
            const prev = this.agents.get(this.selectedAgentId);
            const prevRing = prev.avatarGroup.getObjectByName(`SelectRing_${this.selectedAgentId}`);
            if (prevRing) prevRing.visible = false;
        }

        const agentUnit = this.agents.get(numId);
        if (!agentUnit) {
            this.selectedAgentId = null;
            this.selectionLight.intensity = 0;
            return;
        }

        this.selectedAgentId = numId;

        const ring = agentUnit.avatarGroup.getObjectByName(`SelectRing_${numId}`);
        if (ring) ring.visible = true;

        const curPos = agentUnit.avatarGroup.position;
        this.selectionLight.position.set(curPos.x, 3.8, curPos.z);
        this.selectionLight.intensity = 1.8;

        this.targetLookAt.set(curPos.x, 1.2, curPos.z);

        if (triggerCallback && typeof this.options.onAgentSelected === 'function') {
            this.options.onAgentSelected(agentUnit.userData.agentData);
        }
    }

    resetCamera() {
        this.targetLookAt.set(0, 0, 0);
        this.currentLookAt.set(0, 0, 0);
        this.camera.position.copy(this.defaultCameraPos);
        this.controls.target.set(0, 0, 0);
        this.camera.zoom = 1;
        this.camera.updateProjectionMatrix();

        if (this.selectedAgentId && this.agents.has(this.selectedAgentId)) {
            const prev = this.agents.get(this.selectedAgentId);
            const prevRing = prev.avatarGroup.getObjectByName(`SelectRing_${this.selectedAgentId}`);
            if (prevRing) prevRing.visible = false;
            this.selectedAgentId = null;
            this.selectionLight.intensity = 0;
        }
    }

    toggleAutoRotate() {
        this.isAutoRotating = !this.isAutoRotating;
        return this.isAutoRotating;
    }

    zoomIn() {
        this.camera.zoom = Math.min(3.5, this.camera.zoom * 1.25);
        this.camera.updateProjectionMatrix();
    }

    zoomOut() {
        this.camera.zoom = Math.max(0.4, this.camera.zoom / 1.25);
        this.camera.updateProjectionMatrix();
    }

    // ==========================================
    // INTERACTION & RAYCASTING
    // ==========================================

    setupInteractions() {
        const dom = this.renderer.domElement;
        let isDragging = false;
        let downPos = { x: 0, y: 0 };

        dom.addEventListener('mousedown', (e) => {
            downPos = { x: e.clientX, y: e.clientY };
            isDragging = false;
        });

        dom.addEventListener('mousemove', (e) => {
            if (Math.hypot(e.clientX - downPos.x, e.clientY - downPos.y) > 4) {
                isDragging = true;
            }

            const rect = dom.getBoundingClientRect();
            this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

            this.checkHover(e.clientX - rect.left, e.clientY - rect.top);
        });

        dom.addEventListener('click', (e) => {
            if (isDragging) return;

            const rect = dom.getBoundingClientRect();
            this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

            this.raycaster.setFromCamera(this.mouse, this.camera);
            const intersects = this.raycaster.intersectObjects(this.scene.children, true);

            for (const hit of intersects) {
                if (hit.object.userData && hit.object.userData.parentAgentId) {
                    const agentId = hit.object.userData.parentAgentId;
                    this.selectAgent(agentId);
                    return;
                }
            }
        });
    }

    checkHover(screenX, screenY) {
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.scene.children, true);

        let hitAgentId = null;

        for (const hit of intersects) {
            if (hit.object.userData && hit.object.userData.parentAgentId) {
                hitAgentId = hit.object.userData.parentAgentId;
                break;
            }
        }

        const tooltip = document.getElementById('canvas-tooltip');

        if (hitAgentId && this.agents.has(hitAgentId)) {
            this.renderer.domElement.style.cursor = 'pointer';
            const agent = this.agents.get(hitAgentId).userData.agentData;
            const isIdle = agent.status === 'IDLE';

            if (tooltip) {
                tooltip.style.opacity = '1';
                if (screenX !== undefined && screenY !== undefined) {
                    tooltip.style.left = `${screenX + 16}px`;
                    tooltip.style.top = `${screenY + 16}px`;
                }

                const locationBadge = isIdle 
                    ? `<span class="px-1.5 py-0.5 rounded text-[9px] bg-amber-500/20 text-amber-600 dark:text-amber-400 font-semibold border border-amber-500/30">🛋️ Di Kursi Sofa Lounge</span>`
                    : `<span class="px-1.5 py-0.5 rounded text-[9px] bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-semibold border border-emerald-500/30">💻 Di Stasiun Kerja</span>`;

                tooltip.innerHTML = `
                    <div class="flex items-center justify-between gap-2">
                        <div class="flex items-center gap-1.5">
                            <span class="w-2.5 h-2.5 rounded-full ${agent.status === 'KERJA' ? 'bg-emerald-500 pulse-green' : (agent.status === 'IDLE' ? 'bg-amber-500' : 'bg-slate-400')}"></span>
                            <span class="font-bold text-slate-900 dark:text-white text-sm">${agent.name}</span>
                        </div>
                        ${locationBadge}
                    </div>
                    <div class="text-xs text-slate-500 dark:text-slate-300 mt-1 font-medium">${agent.role}</div>
                    <div class="text-[10px] text-blue-600 dark:text-cyan-400 font-mono mt-1 max-w-[210px] truncate"><i class="fa-solid fa-bars-progress mr-1"></i>${agent.current_task || 'Idle'}</div>
                `;
            }
        } else {
            this.renderer.domElement.style.cursor = 'default';
            if (tooltip) {
                tooltip.style.opacity = '0';
            }
        }
    }

    onResize() {
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        const aspect = width / height;

        this.camera.left = (this.frustumSize * aspect) / -2;
        this.camera.right = (this.frustumSize * aspect) / 2;
        this.camera.top = this.frustumSize / 2;
        this.camera.bottom = this.frustumSize / -2;
        this.camera.updateProjectionMatrix();

        this.renderer.setSize(width, height);
    }

    // ==========================================
    // RENDER LOOP & PROCEDURAL LOCOMOTION
    // ==========================================

    animate() {
        requestAnimationFrame(this.animate);

        // Fix: Call getDelta() first so it measures the true frame delta time (~0.016s)
        const delta = Math.min(this.clock.getDelta(), 0.1);
        const elapsedTime = this.clock.elapsedTime;

        // Auto-rotation
        if (this.isAutoRotating) {
            this.officeGroup.rotation.y += 0.003;
        }

        // Camera LookAt Lerp
        this.currentLookAt.lerp(this.targetLookAt, 0.08);
        this.controls.target.copy(this.currentLookAt);
        this.controls.update();

        // Server LED blinking
        if (this.serverLeds && this.serverLeds.length > 0) {
            this.serverLeds.forEach((led, i) => {
                led.visible = Math.sin(elapsedTime * 6 + i * 1.5) > -0.2;
            });
        }

        // Dynamic Furniture Pop-in Animation
        if (this.dynamicFurnitureList && this.dynamicFurnitureList.length > 0) {
            this.dynamicFurnitureList.forEach(furn => {
                if (furn.userData.targetScale && furn.scale.x < 1.0) {
                    furn.scale.lerp(furn.userData.targetScale, 0.15);
                }
            });
        }

        // AGENT LOCOMOTION & NATURAL SITTING ANIMATIONS
        for (const [id, agentUnit] of this.agents.entries()) {
            const { deskGroup, avatarGroup, userData, navigation } = agentUnit;
            const agent = userData.agentData;

            // Spawn scale lerps
            if (deskGroup.userData.targetScale && deskGroup.scale.x < 1) {
                deskGroup.scale.lerp(deskGroup.userData.targetScale, 0.15);
            }
            if (avatarGroup.userData.targetScale && avatarGroup.scale.x < 1) {
                avatarGroup.scale.lerp(avatarGroup.userData.targetScale, 0.15);
            }

            const spine = avatarGroup.getObjectByName(`SpinePivot_${id}`);
            const head = avatarGroup.getObjectByName(`HeadPivot_${id}`);
            const thighL = avatarGroup.getObjectByName(`LeftThighPivot_${id}`);
            const kneeL = avatarGroup.getObjectByName(`LeftKneePivot_${id}`);
            const thighR = avatarGroup.getObjectByName(`RightThighPivot_${id}`);
            const kneeR = avatarGroup.getObjectByName(`RightKneePivot_${id}`);
            const armL = avatarGroup.getObjectByName(`LeftArmPivot_${id}`);
            const elbowL = avatarGroup.getObjectByName(`LeftElbowPivot_${id}`);
            const armR = avatarGroup.getObjectByName(`RightArmPivot_${id}`);
            const elbowR = avatarGroup.getObjectByName(`RightElbowPivot_${id}`);
            const orb = avatarGroup.getObjectByName(`StatusOrb_${id}`);

            // Floating status orb hover
            if (orb) {
                orb.position.y = 2.35 + Math.sin(elapsedTime * 3 + id) * 0.05;
            }

            // Selection spotlight & camera tracking following selected agent
            if (this.selectedAgentId === id) {
                this.selectionLight.position.x = avatarGroup.position.x;
                this.selectionLight.position.z = avatarGroup.position.z;
                if (navigation.state === 'WALKING_TO_REST' || navigation.state === 'WALKING_TO_DESK') {
                    this.targetLookAt.set(avatarGroup.position.x, 1.2, avatarGroup.position.z);
                }
            }

            // 1. WALKING LOCOMOTION (Traveling between Workstation & Lounge with Waypoints)
            if (navigation.state === 'WALKING_TO_REST' || navigation.state === 'WALKING_TO_DESK') {
                const curPos = avatarGroup.position;
                let currentWp = navigation.targetPos;

                if (navigation.waypoints && navigation.waypoints.length > 0 && navigation.waypointIndex < navigation.waypoints.length) {
                    currentWp = navigation.waypoints[navigation.waypointIndex];
                }

                const dx = currentWp.x - curPos.x;
                const dz = currentWp.z - curPos.z;
                const dist = Math.hypot(dx, dz);

                if (dist > 0.16) {
                    // Face movement trajectory smoothly
                    const angle = Math.atan2(dx, dz);
                    let diffAngle = angle - avatarGroup.rotation.y;
                    while (diffAngle < -Math.PI) diffAngle += Math.PI * 2;
                    while (diffAngle > Math.PI) diffAngle -= Math.PI * 2;
                    avatarGroup.rotation.y += diffAngle * Math.min(1.0, delta * 9.0);

                    // Move step forward
                    const moveSpeed = 3.2; // comfortable walking speed
                    const step = Math.min(dist, moveSpeed * delta);
                    curPos.x += (dx / dist) * step;
                    curPos.z += (dz / dist) * step;

                    // Leg swing with natural knee flexion
                    navigation.walkPhase += delta * 11.5;
                    const legAngle = Math.sin(navigation.walkPhase) * 0.55;

                    if (thighL) thighL.rotation.set(legAngle, 0, 0);
                    if (kneeL) kneeL.rotation.set(legAngle < 0 ? -legAngle * 1.15 : 0.05, 0, 0);

                    if (thighR) thighR.rotation.set(-legAngle, 0, 0);
                    if (kneeR) kneeR.rotation.set(-legAngle < 0 ? legAngle * 1.15 : 0.05, 0, 0);

                    // Arms swing opposite to legs with bent elbows
                    if (armL) armL.rotation.set(-legAngle * 0.75, 0, -0.08);
                    if (elbowL) elbowL.rotation.set(-0.35, 0, 0);

                    if (armR) armR.rotation.set(legAngle * 0.75, 0, 0.08);
                    if (elbowR) elbowR.rotation.set(-0.35, 0, 0);

                    // Spine pelvis bob & sway
                    curPos.y = Math.abs(Math.sin(navigation.walkPhase)) * 0.08;
                    if (spine) {
                        spine.rotation.set(0.04, Math.sin(navigation.walkPhase) * 0.08, 0);
                        spine.position.set(0, 0.58, 0);
                    }
                    if (head) head.rotation.set(0, 0, 0);

                } else {
                    // Check next waypoint
                    if (navigation.waypoints && navigation.waypointIndex < navigation.waypoints.length - 1) {
                        navigation.waypointIndex++;
                    } else {
                        // ARRIVED AT FINAL TARGET LOCATION!
                        curPos.x = currentWp.x;
                        curPos.z = currentWp.z;
                        avatarGroup.rotation.y = navigation.targetRot;
                        navigation.waypoints = null;
                        navigation.lockUntil = 0; // Release lock upon arrival!

                        if (navigation.state === 'WALKING_TO_REST') {
                            navigation.state = 'RESTING';
                            this.applySofaSittingPose(agentUnit);
                        } else {
                            navigation.state = 'WORKING';
                            this.applyDeskSittingPose(agentUnit);
                        }
                    }
                }
            }

            // 2. RESTING STATE (In Lounge Kursi Sofa)
            else if (navigation.state === 'RESTING') {
                // Subtle relaxed breathing & leisurely looking around
                if (spine) {
                    spine.rotation.z = Math.sin(elapsedTime * 0.8 + id) * 0.02;
                }
                if (head) {
                    head.rotation.y = Math.sin(elapsedTime * 0.6 + id) * 0.22;
                    head.rotation.x = 0.08 + Math.sin(elapsedTime * 1.4 + id) * 0.03;
                }

                // Periodic relaxed coffee sipping motion every ~8 seconds
                const sipPhase = (elapsedTime + id * 2.5) % 8.0;
                if (sipPhase > 6.0 && sipPhase < 7.5) {
                    const sipLift = Math.sin(((sipPhase - 6.0) / 1.5) * Math.PI);
                    if (armR) armR.rotation.x = -0.45 - sipLift * 0.35;
                    if (elbowR) elbowR.rotation.x = -0.75 - sipLift * 0.3;
                    if (head) head.rotation.x = 0.08 - sipLift * 0.15;
                } else {
                    if (armR) armR.rotation.x = -0.45;
                    if (elbowR) elbowR.rotation.x = -0.75;
                }
            }

            // 3. WORKING STATE (At Workstation Desk)
            else if (navigation.state === 'WORKING') {
                if (agent.status === 'KERJA') {
                    // Fast rhythmic typing on keyboard
                    if (elbowL) elbowL.rotation.x = -0.62 + Math.sin(elapsedTime * 16 + id) * 0.08;
                    if (elbowR) elbowR.rotation.x = -0.62 + Math.cos(elapsedTime * 18 + id) * 0.08;
                    if (head) {
                        head.rotation.x = Math.sin(elapsedTime * 2.5 + id) * 0.03;
                        head.rotation.y = Math.sin(elapsedTime * 1.2 + id) * 0.05;
                    }
                } else {
                    // Paused at desk
                    if (head) head.rotation.set(0, 0, 0);
                    if (armL) armL.rotation.x = -0.4;
                    if (armR) armR.rotation.x = -0.4;
                }
            }
        }

        this.renderer.render(this.scene, this.camera);
    }
}
