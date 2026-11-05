// ==========================================
// SCANDINAVIAN ARCHITECTURAL COLOR PALETTE & WCAG CONTRAST SYSTEM
// (Based on task-improve-office.md specification)
// ==========================================
const PALETTE = {
    // Lingkungan
    skyTop:      0xbfe0f2,
    skyDark:     0x1e2633,
    grass:       0x6fae45,
    grassDark:   0x1f3a2a,
    walkway:     0xcfc4ae,
    // Struktur
    floor:       0xc48d58,
    floorDark:   0x2b3140,
    wall:        0xe6ddc9,
    wallDark:    0x3c4760,
    trim:        0xcfc4ae,
    trimDark:    0x4f5d7e,
    glass:       0x8fc3d8,
    glassDark:   0x2a3e5c,
    frame:       0x3a4048,
    // Objek
    rack:        0x3b4860,
    dark:        0x2a2d33,
    screen:      0x2b4c7e,
    plant:       0x3f8f3c,
    pot:         0xd9cbb0,
    lamp:        0x7fbf99,
    wood:        0xd9c6a5,
    sofa:        [0xf1eadc, 0x4c6489], // [0] krem oat, [1] biru-abu
    accentChair: 0xe07b3a, // oranye
    sage:        0x9ebfa8,
    rugLounge:   0x6e93ab,
    rugMeeting:  0x8c3a33,
    accent:      { teal: 0x3fa796, amber: 0xe0a84b, coral: 0xe07a5f }
};

if (typeof window !== 'undefined') {
    window.PALETTE = PALETTE;
}

/**
 * Calculates WCAG 2.1 relative luminance for hex color, number, or THREE.Color
 */
function relLuminance(colorInput) {
    if (colorInput && typeof colorInput === 'object' && typeof colorInput.getHex === 'function') {
        return relLuminance(colorInput.getHex()); // getHex() mengembalikan sRGB
    }
    let r, g, b;
    if (colorInput && typeof colorInput === 'object' && 'r' in colorInput) {
        return relLuminance(colorInput.getHex ? colorInput.getHex() : ((Math.round(colorInput.r * 255) << 16) | (Math.round(colorInput.g * 255) << 8) | Math.round(colorInput.b * 255)));
    } else {
        const hex = typeof colorInput === 'number' ? colorInput : parseInt(String(colorInput).replace('#', '0x'), 16);
        r = ((hex >> 16) & 255) / 255;
        g = ((hex >> 8) & 255) / 255;
        b = (hex & 255) / 255;
    }
    const toLinear = c => c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

/**
 * Calculates WCAG 2.1 contrast ratio between two colors (Target: >= 4.5:1 for text, >= 1.5:1 for objects)
 */
function contrastRatio(hexA, hexB) {
    const l1 = relLuminance(hexA);
    const l2 = relLuminance(hexB);
    const [a, b] = [l1, l2].sort((x, y) => y - x);
    return (a + 0.05) / (b + 0.05);
}

if (typeof window !== 'undefined') {
    window.relLuminance = relLuminance;
    window.contrastRatio = contrastRatio;
}

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
        this.defaultCameraPos = new THREE.Vector3(3.5, 25, 23);

        // Dynamic Rest Spots System
        this.restSpots = [];
        this.dynamicFurnitureList = [];

        // Cached Procedural Textures & Materials
        this.cachedTextures = {};
        this.sofaMaterials = [];
        this.conferenceChairMaterials = [];

        this.init();
    }

    init() {
        const width = this.container.clientWidth || 800;
        const height = this.container.clientHeight || 600;

        try {
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
            if (THREE.ColorManagement) {
                THREE.ColorManagement.enabled = true;
            }
            if (THREE.SRGBColorSpace) {
                this.renderer.outputColorSpace = THREE.SRGBColorSpace;
            } else if (THREE.sRGBEncoding) {
                this.renderer.outputEncoding = THREE.sRGBEncoding;
            }
            if (THREE.NoToneMapping !== undefined) {
                this.renderer.toneMapping = THREE.NoToneMapping;
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

            this.webglAvailable = true;
        } catch (glError) {
            console.warn("⚠️ WebGL unavailable or GPU crashed. Activating 2D Virtual Office fallback:", glError);
            this.webglAvailable = false;
            this.init2DOffice();
        }
    }

    init2DOffice() {
        this.webglAvailable = false;
        this.container.innerHTML = '';
        this.container.style.position = 'relative';
        this.container.style.overflow = 'auto';

        const hint = document.getElementById('canvas-3d-hint');
        if (hint) hint.classList.add('hidden');

        const isLight = this.currentTheme === 'light';
        const bgClass = isLight ? 'bg-slate-100/90 text-slate-800' : 'bg-slate-900/95 text-slate-100';

        const wrapper = document.createElement('div');
        wrapper.id = 'office-2d-canvas-wrapper';
        wrapper.className = `w-full h-full min-h-[500px] flex flex-col p-4 sm:p-6 ${bgClass} transition-colors select-none overflow-y-auto`;

        wrapper.innerHTML = `
            <!-- Fallback Banner -->
            <div class="mb-4 flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs backdrop-blur-md shadow-sm">
                <div class="flex items-center gap-2">
                    <span class="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
                    <i class="fa-solid fa-layer-group text-amber-500 text-sm"></i>
                    <span><strong>Virtual Office 2D Mode Aktif</strong> (Hardware WebGL browser sedang nonaktif/crash. Seluruh fungsi AI, multi-agent, task, & terminal berjalan 100% normal).</span>
                </div>
                <div class="flex items-center gap-2">
                    <button onclick="window.location.reload()" class="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-900 dark:text-amber-200 border border-amber-500/30 flex items-center gap-1 transition-all">
                        <i class="fa-solid fa-rotate-right text-[10px]"></i> Muat Ulang 3D
                    </button>
                </div>
            </div>

            <!-- Floorplan Zones Grid -->
            <div class="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch">
                <!-- Zone 1: Workstations Grid -->
                <div class="lg:col-span-2 rounded-2xl border border-slate-200 dark:border-white/10 p-4 bg-white/70 dark:bg-slate-950/60 backdrop-blur-sm flex flex-col">
                    <div class="flex items-center justify-between pb-3 mb-3 border-b border-slate-200 dark:border-white/5">
                        <div class="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                            <i class="fa-solid fa-desktop text-blue-500"></i> Stasiun Kerja AI (Workstations)
                        </div>
                        <span id="2d-active-count-badge" class="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono font-bold border border-emerald-500/20">
                            0 Aktif
                        </span>
                    </div>

                    <!-- Workstations Grid -->
                    <div id="office-2d-workstations" class="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1 auto-rows-max overflow-y-auto max-h-[460px] pr-1">
                        <!-- Populated dynamically by render2DAgents -->
                    </div>
                </div>

                <!-- Zone 2: Ruang Rapat & Coffee Lounge -->
                <div class="flex flex-col gap-4">
                    <!-- Meeting & Brainstorming Room -->
                    <div class="rounded-2xl border border-slate-200 dark:border-white/10 p-4 bg-white/70 dark:bg-slate-950/60 backdrop-blur-sm">
                        <div class="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                            <i class="fa-solid fa-users-rectangle text-indigo-500"></i> Ruang Rapat & Kolaborasi
                        </div>
                        <div class="p-3 rounded-xl border border-dashed border-indigo-300 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-950/20 text-center">
                            <div class="text-[11px] font-semibold text-indigo-900 dark:text-indigo-300 mb-1 flex items-center justify-center gap-1.5">
                                <i class="fa-solid fa-chalkboard text-xs"></i> Whiteboard Orchestration & Proyek
                            </div>
                            <p class="text-[10px] text-slate-500 dark:text-slate-400 leading-snug">
                                Sinkronisasi orkestrasi task otomatis dan eksekusi direktori lokal antar agent.
                            </p>
                        </div>
                    </div>

                    <!-- Coffee Lounge (IDLE Rest Area) -->
                    <div class="flex-1 rounded-2xl border border-slate-200 dark:border-white/10 p-4 bg-white/70 dark:bg-slate-950/60 backdrop-blur-sm flex flex-col">
                        <div class="flex items-center justify-between pb-2 mb-2 border-b border-slate-200 dark:border-white/5">
                            <div class="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                                <i class="fa-solid fa-mug-hot text-amber-500"></i> Coffee Lounge (Area Santai)
                            </div>
                            <span id="2d-lounge-count-badge" class="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-mono font-bold border border-amber-500/20">
                                0 Istirahat
                            </span>
                        </div>
                        <div id="office-2d-lounge-list" class="flex flex-col gap-2 flex-1 overflow-y-auto max-h-[220px]">
                            <div class="text-center py-6 text-slate-400 text-xs">
                                <i class="fa-solid fa-couch text-xl mb-1 text-slate-300 dark:text-slate-600"></i>
                                <p class="text-[11px]">Semua agent sedang berada di meja kerja.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.container.appendChild(wrapper);
    }

    render2DAgents(agentList) {
        if (!agentList) return;
        this.rawAgentsList = agentList;

        const grid = document.getElementById('office-2d-workstations');
        const lounge = document.getElementById('office-2d-lounge-list');
        const activeBadge = document.getElementById('2d-active-count-badge');
        const loungeBadge = document.getElementById('2d-lounge-count-badge');

        if (!grid) return;

        grid.innerHTML = '';
        let idleCount = 0;
        let kerjaCount = 0;
        let loungeHtml = '';

        agentList.forEach(agent => {
            const isSelected = this.selectedAgentId == agent.id;
            const isIdle = agent.status === 'IDLE' || agent.status === 'PAUSED';
            const isKerja = agent.status === 'KERJA';
            if (isIdle) idleCount++;
            if (isKerja) kerjaCount++;

            const statusBg = isKerja
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                : (isIdle ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30' : 'bg-slate-500/10 text-slate-500 border-slate-500/30');

            const statusDot = isKerja ? 'bg-emerald-500 animate-pulse' : (isIdle ? 'bg-amber-500' : 'bg-slate-400');

            const projectBadge = agent.working_directory
                ? `<div class="mt-2 flex items-center gap-1.5 text-[10px] text-amber-700 dark:text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 truncate" title="Target Direktori: ${agent.working_directory}">
                       <i class="fa-solid fa-folder-tree text-[9px] shrink-0 text-amber-500"></i>
                       <span class="font-mono truncate font-medium">${agent.working_directory.split('/').filter(Boolean).pop()}</span>
                   </div>`
                : '';

            const borderHighlight = isSelected
                ? 'border-blue-500 ring-2 ring-blue-500/30 dark:ring-blue-400/40 shadow-md'
                : 'border-slate-200 dark:border-white/5 hover:border-blue-400/50';

            const card = document.createElement('div');
            card.id = `office-2d-agent-${agent.id}`;
            card.className = `p-3 rounded-xl border bg-white dark:bg-slate-900/80 cursor-pointer transition-all flex flex-col justify-between ${borderHighlight}`;
            card.onclick = () => this.selectAgent(agent.id, true);

            card.innerHTML = `
                <div>
                    <div class="flex items-center justify-between gap-2 mb-2">
                        <div class="flex items-center gap-2 truncate">
                            <div class="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white text-xs shrink-0 shadow-sm" style="background-color: ${agent.avatar_color || '#3b82f6'}">
                                ${agent.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                            </div>
                            <div class="truncate">
                                <div class="font-bold text-xs text-slate-800 dark:text-slate-100 truncate">${agent.name}</div>
                                <div class="text-[10px] text-slate-500 dark:text-slate-400 truncate">${agent.role}</div>
                            </div>
                        </div>
                        <span class="px-2 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1 shrink-0 ${statusBg}">
                            <span class="w-1.5 h-1.5 rounded-full ${statusDot}"></span>
                            ${agent.status}
                        </span>
                    </div>

                    <div class="text-[11px] text-slate-600 dark:text-slate-300 font-mono truncate px-2 py-1 rounded bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-white/5">
                        <i class="fa-solid fa-terminal text-[9px] mr-1 text-slate-400"></i>${agent.current_task || 'Standby'}
                    </div>

                    ${projectBadge}
                </div>
            `;
            grid.appendChild(card);

            if (isIdle) {
                loungeHtml += `
                    <div onclick="window.app && window.app.selectAgentById(${agent.id})" class="p-2 rounded-xl border border-amber-500/20 bg-amber-500/5 dark:bg-amber-950/20 flex items-center justify-between cursor-pointer hover:border-amber-500/40 transition-all">
                        <div class="flex items-center gap-2 truncate">
                            <span class="w-2 h-2 rounded-full bg-amber-500"></span>
                            <span class="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">${agent.name}</span>
                        </div>
                        <span class="text-[10px] text-amber-600 dark:text-amber-400 font-medium">Santai & Kopi</span>
                    </div>
                `;
            }
        });

        if (activeBadge) activeBadge.textContent = `${kerjaCount} Kerja`;
        if (loungeBadge) loungeBadge.textContent = `${idleCount} Istirahat`;

        if (lounge) {
            if (idleCount > 0) {
                lounge.innerHTML = loungeHtml;
            } else {
                lounge.innerHTML = `
                    <div class="text-center py-6 text-slate-400 text-xs">
                        <i class="fa-solid fa-couch text-xl mb-1 text-slate-300 dark:text-slate-600"></i>
                        <p class="text-[11px]">Semua agent sedang berada di meja kerja.</p>
                    </div>
                `;
            }
        }
    }

    select2DAgent(id, triggerCallback = true) {
        this.selectedAgentId = Number(id);

        document.querySelectorAll('#office-2d-workstations > div').forEach(el => {
            el.classList.remove('border-blue-500', 'ring-2', 'ring-blue-500/30', 'dark:ring-blue-400/40', 'shadow-md');
            el.classList.add('border-slate-200', 'dark:border-white/5');
        });

        const activeEl = document.getElementById(`office-2d-agent-${id}`);
        if (activeEl) {
            activeEl.classList.remove('border-slate-200', 'dark:border-white/5');
            activeEl.classList.add('border-blue-500', 'ring-2', 'ring-blue-500/30', 'dark:ring-blue-400/40', 'shadow-md');
        }

        if (triggerCallback && typeof this.options.onAgentSelected === 'function' && this.rawAgentsList) {
            const found = this.rawAgentsList.find(a => a.id == id);
            if (found) {
                this.options.onAgentSelected(found);
            }
        }
    }

    set2DAgentStatus(agentId, newStatus) {
        if (this.rawAgentsList) {
            const agent = this.rawAgentsList.find(a => a.id == agentId);
            if (agent) {
                agent.status = newStatus;
                this.render2DAgents(this.rawAgentsList);
            }
        }
    }

    applyThemeColors() {
        const isLight = this.currentTheme === 'light';
        this.scene.background = new THREE.Color(isLight ? PALETTE.skyTop : PALETTE.skyDark);
        this.scene.fog = null;
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
        this.cachedTextures.windowView = this.generateWindowViewTexture();
        this.cachedTextures.workBoard = this.generateWorkBoardTexture();
        this.cachedTextures.posterGreatWork = this.generateMotivationalPosterTexture();

        // T2: Ensure all procedural textures are flagged with sRGB color space
        Object.values(this.cachedTextures).forEach(t => {
            if (THREE.SRGBColorSpace) t.colorSpace = THREE.SRGBColorSpace;
            else if (THREE.sRGBEncoding) t.encoding = THREE.sRGBEncoding;
            t.needsUpdate = true;
        });
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
            // T3: Warm Natural Scandinavian European Oak Plank Flooring (Reference Palette)
            ctx.fillStyle = '#8F5F33'; // Celah antar papan
            ctx.fillRect(0, 0, 1024, 1024);
            const tones = ['#C48D58', '#B87F48', '#CF9A63', '#BE8650'];
            const plankW = 256, plankH = 64;
            for (let r = 0; r < 16; r++) {
                const off = (r * 97) % plankW; // Susunan papan tidak beraturan
                for (let c = -1; c <= 4; c++) {
                    const px = c * plankW - off, py = r * plankH;
                    ctx.fillStyle = tones[Math.abs(c * 7 + r * 13) % 4];
                    ctx.fillRect(px + 1.5, py + 1.5, plankW - 3, plankH - 3);

                    ctx.strokeStyle = 'rgba(90, 55, 25, 0.22)'; // Serat kayu
                    ctx.lineWidth = 1;
                    for (let g = 0; g < 3; g++) {
                        const gy = py + (g + 1) * (plankH / 4);
                        ctx.beginPath();
                        ctx.moveTo(px + 6, gy);
                        ctx.lineTo(px + plankW - 6, gy);
                        ctx.stroke();
                    }
                    ctx.strokeStyle = 'rgba(255, 235, 200, 0.18)'; // Highlight tepi atas
                    ctx.beginPath();
                    ctx.moveTo(px + 2, py + 2);
                    ctx.lineTo(px + plankW - 2, py + 2);
                    ctx.stroke();
                }
            }
        } else {
            // Dark Modern Architectural Slate Tiles (#2B3140 base: RGB 43, 49, 64 - avoids pitch black)
            ctx.fillStyle = '#212632';
            ctx.fillRect(0, 0, 1024, 1024);

            const tileSize = 256;
            for (let x = 0; x < 1024; x += tileSize) {
                for (let y = 0; y < 1024; y += tileSize) {
                    const toneVar = ((x * 13 + y * 29) % 5) - 2;
                    const rVal = 43 + toneVar;
                    const gVal = 49 + toneVar;
                    const bVal = 64 + toneVar;
                    ctx.fillStyle = `rgb(${rVal}, ${gVal}, ${bVal})`;
                    ctx.fillRect(x + 2, y + 2, tileSize - 4, tileSize - 4);

                    // Subtle surface mineral speckles
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.025)';
                    for (let s = 0; s < 8; s++) {
                        const sx = x + (s * 37) % tileSize;
                        const sy = y + (s * 43) % tileSize;
                        ctx.fillRect(sx, sy, 2, 2);
                    }

                    // Grout border line
                    ctx.strokeStyle = 'rgba(20, 24, 35, 0.45)';
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

        generateWindowViewTexture() {
        const c = document.createElement('canvas');
        c.width = 512; c.height = 300;
        const g = c.getContext('2d');

        const sky = g.createLinearGradient(0, 0, 0, 300);
        sky.addColorStop(0, '#8EC5E6');
        sky.addColorStop(0.65, '#CFE8F5');
        sky.addColorStop(1, '#E8F4FA');
        g.fillStyle = sky;
        g.fillRect(0, 0, 512, 300);

        g.fillStyle = 'rgba(255,255,255,0.85)';          // awan
        [[90, 70, 46], [140, 62, 36], [360, 100, 40], [410, 92, 30]].forEach(([x, y, r]) => {
            g.beginPath(); g.ellipse(x, y, r * 1.5, r * 0.5, 0, 0, Math.PI * 2); g.fill();
        });

        g.fillStyle = '#8CC26B';                          // bukit belakang
        g.beginPath(); g.moveTo(0, 230);
        g.quadraticCurveTo(130, 190, 260, 225);
        g.quadraticCurveTo(390, 255, 512, 210);
        g.lineTo(512, 300); g.lineTo(0, 300); g.fill();

        g.fillStyle = '#5FA24A';                          // bukit depan
        g.beginPath(); g.moveTo(0, 262);
        g.quadraticCurveTo(160, 235, 300, 265);
        g.quadraticCurveTo(420, 285, 512, 255);
        g.lineTo(512, 300); g.lineTo(0, 300); g.fill();

        [[70, 238, 22], [430, 236, 26], [250, 248, 16]].forEach(([x, y, r]) => {   // pohon
            g.fillStyle = '#6B4A2B'; g.fillRect(x - 3, y - 4, 6, 14);
            g.fillStyle = '#3F8F3C'; g.beginPath(); g.arc(x, y - r, r, 0, Math.PI * 2); g.fill();
        });

        const t = new THREE.CanvasTexture(c);
        t.minFilter = THREE.LinearFilter;
        return t;
    }

    /**
     * Generates rolling whiteboard texture ("WORK BOARD") with colorful sticky notes and status checklist
     */
    generateWorkBoardTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 340;
        const ctx = canvas.getContext('2d');

        // Whiteboard surface (#EEF1F4 - avoids harsh #FFFFFF clipping)
        ctx.fillStyle = '#eef1f4';
        ctx.fillRect(0, 0, 512, 340);

        ctx.strokeStyle = 'rgba(140, 152, 168, 0.25)';
        ctx.lineWidth = 1;
        for (let x = 20; x < 512; x += 30) {
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 340); ctx.stroke();
        }
        for (let y = 20; y < 340; y += 30) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(512, y); ctx.stroke();
        }

        // Header: WORK BOARD
        ctx.font = '900 24px "Inter", sans-serif';
        ctx.fillStyle = '#0f172a';
        ctx.fillText('WORK BOARD', 24, 38);

        ctx.font = '600 12px "Inter", sans-serif';
        ctx.fillStyle = '#64748b';
        ctx.fillText('Sprint Q4 • Active Roadmap', 24, 56);

        // Colorful sticky notes (matching reference image)
        const notes = [
            { col: '#bfdbfe', border: '#3b82f6', t: 'Deploy v2.0 ke staging cluster' },
            { col: '#fed7aa', border: '#f97316', t: 'Optimize Three.js 60 FPS' },
            { col: '#bbf7d0', border: '#22c55e', t: 'Automasi Playwright 100%' },
            { col: '#fbcfe8', border: '#ec4899', t: 'Fix memory leak texture disposal' },
            { col: '#ddd6fe', border: '#8b5cf6', t: 'Partner dashboard sync' }
        ];

        notes.forEach((n, i) => {
            const ny = 74 + i * 50;
            ctx.fillStyle = n.col;
            ctx.fillRect(24, ny, 280, 42);
            ctx.strokeStyle = n.border;
            ctx.lineWidth = 2;
            ctx.strokeRect(24, ny, 280, 42);

            ctx.fillStyle = n.border;
            ctx.fillRect(24, ny, 6, 42);

            ctx.font = 'bold 12px "Inter", sans-serif';
            ctx.fillStyle = '#1e293b';
            ctx.fillText(n.t, 38, ny + 25);
        });

        // Checklist rows on right side
        ctx.font = 'bold 14px "Inter", sans-serif';
        ctx.fillStyle = '#334155';
        ctx.fillText('Status Tracking', 340, 78);

        for (let r = 0; r < 5; r++) {
            const cy = 104 + r * 45;
            ctx.strokeStyle = r < 3 ? '#22c55e' : '#cbd5e1';
            ctx.lineWidth = 2;
            ctx.strokeRect(340, cy, 18, 18);
            if (r < 3) {
                ctx.fillStyle = '#22c55e';
                ctx.beginPath();
                ctx.arc(349, cy + 9, 5, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.fillStyle = '#64748b';
            ctx.font = '11px monospace';
            ctx.fillText(r < 3 ? '[DONE]' : '[IN PROGRESS]', 368, cy + 14);
        }

        const texture = new THREE.CanvasTexture(canvas);
        if (THREE.SRGBColorSpace) texture.colorSpace = THREE.SRGBColorSpace;
        else if (THREE.sRGBEncoding) texture.encoding = THREE.sRGBEncoding;
        texture.minFilter = THREE.LinearFilter;
        return texture;
    }

    /**
     * Generates minimalist art poster on easel ("Good people build great work.")
     */
    generateMotivationalPosterTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 380;
        canvas.height = 500;
        const ctx = canvas.getContext('2d');

        // Clean paper tone (#EEF1F4 - avoids pure white glare)
        ctx.fillStyle = '#eef1f4';
        ctx.fillRect(0, 0, 380, 500);

        ctx.strokeStyle = '#c9ddee';
        ctx.lineWidth = 4;
        ctx.strokeRect(16, 16, 348, 468);

        // Minimalist bold typography exactly matching reference image
        ctx.fillStyle = '#0f172a';
        ctx.font = '900 48px "Inter", "Segoe UI", sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('Good', 42, 140);
        ctx.fillText('people', 42, 195);
        ctx.fillText('build great', 42, 250);
        ctx.fillText('work.', 42, 305);

        // Accent coral line
        ctx.fillStyle = '#e07a5f';
        ctx.fillRect(42, 335, 60, 5);

        ctx.font = '600 13px "Inter", sans-serif';
        ctx.fillStyle = '#94a3b8';
        ctx.fillText('VIRTUAL OFFICE HQ • STUDIO', 42, 420);

        const texture = new THREE.CanvasTexture(canvas);
        if (THREE.SRGBColorSpace) texture.colorSpace = THREE.SRGBColorSpace;
        else if (THREE.sRGBEncoding) texture.encoding = THREE.sRGBEncoding;
        texture.minFilter = THREE.LinearFilter;
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
        if (THREE.SRGBColorSpace) texture.colorSpace = THREE.SRGBColorSpace;
        else if (THREE.sRGBEncoding) texture.encoding = THREE.sRGBEncoding;
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
        if (THREE.SRGBColorSpace) texture.colorSpace = THREE.SRGBColorSpace;
        else if (THREE.sRGBEncoding) texture.encoding = THREE.sRGBEncoding;
        texture.minFilter = THREE.LinearFilter;
        return texture;
    }

    /**
     * Generates a tech presentation screen for the meeting room
     */
    generatePresentationScreenTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');
        this.presentationCanvas = canvas;
        this.presentationCtx = ctx;

        this.drawDefaultPresentationScreen(ctx);

        const texture = new THREE.CanvasTexture(canvas);
        if (THREE.SRGBColorSpace) texture.colorSpace = THREE.SRGBColorSpace;
        else if (THREE.sRGBEncoding) texture.encoding = THREE.sRGBEncoding;
        texture.minFilter = THREE.LinearFilter;
        return texture;
    }

    drawDefaultPresentationScreen(ctx) {
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
    }

    /**
     * Dynamically updates the Meeting Room TV texture with live topic & discussion notes
     */
    updateMeetingTVScreen(title, speakerName = '', speakerRole = '', speechSnippet = '') {
        if (!this.presentationCanvas || !this.presentationCtx) return;
        const ctx = this.presentationCtx;
        const w = 512, h = 256;

        ctx.fillStyle = '#0a101f';
        ctx.fillRect(0, 0, w, h);

        // Top Status Header Bar
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(0, 0, w, 44);

        // Status Pulse Dot
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(24, 22, 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 13px Inter, sans-serif';
        ctx.textAlign = 'left';
        const cleanTitle = (title || 'STRATEGI TIM').toUpperCase().slice(0, 36);
        ctx.fillText(`WAR ROOM • ${cleanTitle}`, 38, 26);

        if (speakerName) {
            // Speaker Card Box
            ctx.fillStyle = '#1e1b4b';
            ctx.strokeStyle = '#6366f1';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            if (ctx.roundRect) ctx.roundRect(20, 54, 472, 56, 8);
            else ctx.rect(20, 54, 472, 56);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#a5b4fc';
            ctx.font = 'bold 12px Inter, sans-serif';
            ctx.fillText(`🎤 ${speakerName} (${speakerRole})`, 32, 76);

            ctx.fillStyle = '#e0e7ff';
            ctx.font = '11px Inter, sans-serif';
            const shortSpeech = speechSnippet.slice(0, 68) + (speechSnippet.length > 68 ? '...' : '');
            ctx.fillText(`"${shortSpeech}"`, 32, 96);
        }

        // Live Agenda / Notes Area
        ctx.fillStyle = '#0f172a';
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.2)';
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(20, 120, 472, 118, 8);
        else ctx.rect(20, 120, 472, 118);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#94a3b8';
        ctx.font = '10px monospace';
        ctx.fillText('LIVE AGENDAS & STRATEGY SYNC:', 32, 142);

        ctx.fillStyle = '#38bdf8';
        ctx.fillText('• Multi-Agent Autonomous Deliberation Active', 32, 164);
        ctx.fillStyle = '#34d399';
        ctx.fillText('• Synthesizing Action Items for Backlog', 32, 184);
        ctx.fillStyle = '#cbd5e1';
        ctx.fillText('• Status: In Session (Kolaborasi Mandiri)', 32, 204);

        if (this.cachedTextures.presentationScreen) {
            this.cachedTextures.presentationScreen.needsUpdate = true;
        }
    }

    /**
     * Resets Meeting Room TV screen to default
     */
    resetMeetingTVScreen() {
        if (!this.presentationCanvas || !this.presentationCtx) return;
        this.drawDefaultPresentationScreen(this.presentationCtx);
        if (this.cachedTextures.presentationScreen) {
            this.cachedTextures.presentationScreen.needsUpdate = true;
        }
    }

    // ==========================================
    // LIGHTING SETUP (PBR PHYSICAL LIGHTS)
    // ==========================================

    applyLightingPreset() {
        const L = this.currentTheme === 'light';
        if (this.renderer) this.renderer.toneMappingExposure = 1.0;

        if (this.hemiLight) {
            this.hemiLight.color.setHex(L ? 0xBFE0F2 : 0x38bdf8);
            this.hemiLight.groundColor.setHex(L ? 0x8A7A62 : 0x1e293b);
            this.hemiLight.intensity = L ? 0.45 : 0.48;
        }

        if (this.ambientLight) {
            this.ambientLight.color.setHex(L ? 0xFFF3DC : 0xc9ddee);
            this.ambientLight.intensity = L ? 0.10 : 0.40;
        }

        if (this.dirLight) {
            this.dirLight.color.setHex(L ? 0xFFF1D6 : 0xffffff);
            this.dirLight.intensity = L ? 0.95 : 0.85;
        }

        if (this.fillLight) this.fillLight.intensity = L ? 0.22 : 0.15;
        if (this.meetingLight) this.meetingLight.intensity = L ? 0.40 : 1.0;
        if (this.coffeeLight) this.coffeeLight.intensity  = L ? 0.45 : 1.1;
    }

    setupLighting() {
        const isLight = this.currentTheme === 'light';

        // 1. Hemisphere Light (Soft Sky & Ground Bounce)
        this.hemiLight = new THREE.HemisphereLight(0xBFE0F2, 0x8A7A62, 0.45);
        this.scene.add(this.hemiLight);

        // 2. Ambient Light (Subtle warm fill)
        this.ambientLight = new THREE.AmbientLight(0xFFF3DC, 0.10);
        this.scene.add(this.ambientLight);

        // 3. Key Directional Light (Kiri-Atas: -14, 30, 20 menciptakan 3 nilai sisi pada setiap kubus)
        this.dirLight = new THREE.DirectionalLight(0xFFF1D6, 0.95);
        this.dirLight.position.set(-14, 30, 20);
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
        this.dirLight.shadow.normalBias = 0.02;
        this.dirLight.shadow.radius = 2.2;
        this.scene.add(this.dirLight);

        // 4. Fill Directional Light (Kanan-Depan: 18, 8, 6 tanpa shadow)
        this.fillLight = new THREE.DirectionalLight(0xcfe6f5, 0.22);
        this.fillLight.position.set(18, 8, 6);
        this.scene.add(this.fillLight);

        // 5. Meeting Room Light
        this.meetingLight = new THREE.PointLight(0x6a82a6, 0.40, 12);
        this.meetingLight.position.set(-7.5, 4.2, -8.75);
        this.scene.add(this.meetingLight);

        // 6. Lounge Warm Chandelier Light
        this.coffeeLight = new THREE.PointLight(PALETTE.accent.amber, 0.45, 12);
        this.coffeeLight.position.set(3.8, 3.5, 7.2);
        this.scene.add(this.coffeeLight);

        // 7. Selection Spotlight
        this.selectionLight = new THREE.PointLight(PALETTE.accent.teal, 0, 9);
        this.selectionLight.position.set(0, 4, 0);
        this.scene.add(this.selectionLight);

        // Apply theme lighting calibration
        this.applyLightingPreset();
    }

    // ==========================================
    // OFFICE ENVIRONMENT & ARCHITECTURE
    // ==========================================

    /**
     * Builds surrounding ground, grass, walkway, and decorative low-poly trees (T5, T10)
     */
    buildGround() {
        const isLight = this.currentTheme === 'light';
        this.grassMat = new THREE.MeshStandardMaterial({
            color: isLight ? PALETTE.grass : PALETTE.grassDark,
            roughness: 1.0
        });
        const grass = new THREE.Mesh(new THREE.PlaneGeometry(220, 220), this.grassMat);
        grass.rotation.x = -Math.PI / 2;
        grass.position.y = -0.55;
        grass.receiveShadow = true;
        this.officeGroup.add(grass);

        const walk = new THREE.Mesh(
            new THREE.BoxGeometry(28, 0.14, 28),
            new THREE.MeshStandardMaterial({ color: PALETTE.walkway, roughness: 0.9 })
        );
        walk.position.y = -0.48;
        walk.receiveShadow = true;
        this.officeGroup.add(walk);

        // Optional T10: Low-poly trees around the walkway perimeter
        this.buildSurroundingTrees();
    }

    buildSurroundingTrees() {
        const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5a4632, roughness: 0.8 });
        const foliageMat = new THREE.MeshStandardMaterial({
            color: 0x5b9b3e,
            roughness: 0.7,
            flatShading: true
        });

        const treePositions = [
            [-18, -18], [0, -19], [18, -18],
            [-19, 0], [19, 0],
            [-18, 18], [0, 19], [18, 18],
            [-22, 10], [22, 10], [-22, -10], [22, -10]
        ];

        treePositions.forEach(([tx, tz]) => {
            const treeGroup = new THREE.Group();
            treeGroup.position.set(tx, -0.55, tz);

            const trunk = new THREE.Mesh(
                new THREE.CylinderGeometry(0.2, 0.3, 1.8, 6),
                trunkMat
            );
            trunk.position.y = 0.9;
            trunk.castShadow = true;
            treeGroup.add(trunk);

            const canopy = new THREE.Mesh(
                new THREE.IcosahedronGeometry(1.4, 0),
                foliageMat
            );
            canopy.position.y = 2.4;
            canopy.castShadow = true;
            treeGroup.add(canopy);

            this.officeGroup.add(treeGroup);
        });
    }

    /**
     * Tames excessive metalness on meshes without envMap to avoid dark black holes (T7)
     */
    tameMetalness(root, max = 0.15) {
        if (!root) return;
        root.traverse(o => {
            if (o.isMesh && o.material && o.material.metalness > max) {
                o.material.metalness = max;
            }
        });
    }

    buildOfficeEnvironment() {
        this.officeGroup = new THREE.Group();
        this.scene.add(this.officeGroup);

        // 0. Surrounding Ground, Grass & Walkway (T5)
        this.buildGround();

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

        // Overhead White Architectural Beams & Forest Green Pendant Dome Lamps
        // Overhead beams removed per user request
        // this.buildOverheadBeams();

        // Center Low Planter Credenza Divider (Dividing bottom workstation zones)
        this.buildCenterPlanterCredenza();

        // 2. Cutaway Architectural Walls - Symmetrical Soft Modern Slate (#98A9C2 / #3C4760)
        this.wallMat = new THREE.MeshStandardMaterial({
            color: isLight ? PALETTE.wall : PALETTE.wallDark,
            roughness: 0.85,
            metalness: 0.02
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

        // Baseboards & Crown Molding - Harmonized trim (#6A82A6 / #4F5D7E)
        this.baseboardMat = new THREE.MeshStandardMaterial({
            color: isLight ? PALETTE.trim : PALETTE.trimDark,
            roughness: 0.45,
            metalness: 0.05
        });
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

                // Jendela dinding belakang (digeser agar tidak tertimpa TV ruang rapat dan rack server)
        [-1.5, 3.5].forEach(wx => {
            const w = this.buildWindow3D(4.2, 2.3);
            w.position.set(wx, 2.5, -roomDepth / 2 + wallThickness / 2);
            this.officeGroup.add(w);
        });

        // Jendela dinding kiri
        [0, 6].forEach(wz => {
            const w = this.buildWindow3D(4.2, 2.3);
            w.rotation.y = Math.PI / 2;
            w.position.set(-roomWidth / 2 + wallThickness / 2, 2.5, wz);
            this.officeGroup.add(w);
        });
        // 3. Meeting Room & Server Hub (Harmoniously aligned in back quadrants)
        this.buildMeetingRoom(-7.5, -8.75);
        this.buildServerRacks(7.5, -10.5);

        // 4. Coffee Corner Infrastructure
        this.buildCoffeeCornerInfrastructure(8.8, 5.6);

        // 5. Lounge Decor, Pendant Chandelier & Furniture
        this.buildLoungeDecor();

        // Zone Carpets (T6: lounge teal-blue, meeting brick-red)
        this.carpetLounge = this.createCarpet(3.8, 7.2, 6.4, 4.4, PALETTE.rugLounge, 1.0);
        this.carpetMeeting = this.createCarpet(-7.5, -8.75, 7.2, 4.8, PALETTE.rugMeeting, 1.0);

        // 6. Lush Potted Plants
        this.createPottedPlant(-10.5, 4.5);
        this.createPottedPlant(10.5, -3.5);
        this.createPottedPlant(-1.5, -9.5);
        this.createPottedPlant(-1.5, 6.5);

        // 7. Cute Office Cat Mascot (Dynamically roams around the office)
        this.buildCatMascot();

        // T7: Tame metalness across all office environment meshes
        this.tameMetalness(this.officeGroup);
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

        buildOverheadBeams() {
        // Overhead beam bars removed as requested by user
    }

    buildWindow3D(W = 4.2, H = 2.3) {
        const isLight = this.currentTheme === 'light';
        const g = new THREE.Group();

        if (!this.winFrameMat)  this.winFrameMat  = new THREE.MeshStandardMaterial({ color: isLight ? PALETTE.frame : 0x475569, roughness: 0.45 });
        if (!this.winCasingMat) this.winCasingMat = new THREE.MeshStandardMaterial({ color: isLight ? 0xF1EADC : 0x5B6478, roughness: 0.6 });
        if (!this.winJambMat)   this.winJambMat   = new THREE.MeshStandardMaterial({ color: isLight ? 0xCBBFA6 : 0x3C4760, roughness: 0.8 });
        if (!this.winViewMats)  this.winViewMats  = [];

        const box = (w, h, d, x, y, z, mat) => {
            const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
            m.position.set(x, y, z);
            m.castShadow = true;
            m.receiveShadow = true;
            g.add(m);
            return m;
        };

        // 1. Casing (trim luar, menonjol dari dinding)
        const t = 0.14;
        box(W + 2 * t, t, 0.07, 0,  H / 2 + t / 2, 0.035, this.winCasingMat);
        box(W + 2 * t, t, 0.07, 0, -H / 2 - t / 2, 0.035, this.winCasingMat);
        box(t, H, 0.07, -(W / 2 + t / 2), 0, 0.035, this.winCasingMat);
        box(t, H, 0.07,  (W / 2 + t / 2), 0, 0.035, this.winCasingMat);

        // 2. Sill (ambang jendela di bawah)
        box(W + 0.6, 0.06, 0.32, 0, -H / 2 - t - 0.03, 0.16, this.winCasingMat);

        // 3. Jamb (sisi dalam bukaan, memberi kesan kedalaman)
        box(W, 0.05, 0.10, 0,  H / 2 - 0.025, 0.05, this.winJambMat);
        box(W, 0.05, 0.10, 0, -H / 2 + 0.025, 0.05, this.winJambMat);
        box(0.05, H, 0.10, -W / 2 + 0.025, 0, 0.05, this.winJambMat);
        box(0.05, H, 0.10,  W / 2 - 0.025, 0, 0.05, this.winJambMat);

        // 4. Pemandangan luar (di dasar bukaan)
        const viewMat = new THREE.MeshBasicMaterial({
            map: this.cachedTextures.windowView,
            color: isLight ? 0xFFFFFF : 0x5A6A85
        });
        this.winViewMats.push(viewMat);
        const view = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.05, H - 0.05), viewMat);
        view.position.z = 0.008;
        g.add(view);

        // 5. Sash frame + mullion (rangka kaca)
        const sw = W - 0.1, sh = H - 0.1, bar = 0.06;
        box(sw, bar, 0.05, 0,  sh / 2 - bar / 2, 0.10, this.winFrameMat);
        box(sw, bar, 0.05, 0, -sh / 2 + bar / 2, 0.10, this.winFrameMat);
        box(bar, sh, 0.05, -sw / 2 + bar / 2, 0, 0.10, this.winFrameMat);
        box(bar, sh, 0.05,  sw / 2 - bar / 2, 0, 0.10, this.winFrameMat);
        box(0.05, sh, 0.045, 0, 0, 0.10, this.winFrameMat);          // mullion vertikal
        box(sw, 0.045, 0.045, 0, 0.12, 0.10, this.winFrameMat);      // mullion horizontal

        // 6. Kaca tipis + pantulan diagonal
        const glass = new THREE.Mesh(
            new THREE.PlaneGeometry(sw, sh),
            new THREE.MeshStandardMaterial({
                color: 0xBFE0F2, transparent: true, opacity: 0.14,
                roughness: 0.05, metalness: 0, depthWrite: false
            })
        );
        glass.position.z = 0.085;
        g.add(glass);

        const glareMat = new THREE.MeshBasicMaterial({
            color: 0xFFFFFF, transparent: true, opacity: 0.12, depthWrite: false
        });
        [[-1.5, -1.1, 0.0, -0.4], [-0.8, -0.65, 0.45, 0.3]].forEach(([a, b, c, d]) => {
            const s = new THREE.Shape();
            s.moveTo(a, -1.0); s.lineTo(b, -1.0); s.lineTo(c, 1.0); s.lineTo(d, 1.0); s.closePath();
            const glare = new THREE.Mesh(new THREE.ShapeGeometry(s), glareMat);
            glare.position.z = 0.087;
            g.add(glare);
        });

        return g;
    }

    buildWallTV(w = 3.6, h = 1.8) {
        const isLight = this.currentTheme === 'light';
        const g = new THREE.Group();

        const bodyMat  = new THREE.MeshStandardMaterial({ color: 0x23272E, roughness: 0.35, metalness: 0.1 });
        const backMat  = new THREE.MeshStandardMaterial({ color: 0x2F3640, roughness: 0.5 });
        const metalMat = new THREE.MeshStandardMaterial({ color: 0x5C6B80, roughness: 0.4, metalness: 0.15 });

        const add = (geo, mat, x, y, z) => {
            const m = new THREE.Mesh(geo, mat);
            m.position.set(x, y, z);
            m.castShadow = true;
            g.add(m);
            return m;
        };

        // Bodi + bezel
        add(new THREE.BoxGeometry(w + 0.1, h + 0.1, 0.08), bodyMat, 0, 0, 0);
        // Panel belakang (kesan ketebalan)
        add(new THREE.BoxGeometry(w * 0.6, h * 0.5, 0.05), backMat, 0, 0, -0.065);
        // Lengan mount + plat dinding
        add(new THREE.BoxGeometry(0.16, 0.14, 0.12), metalMat, 0, 0, -0.125);
        add(new THREE.BoxGeometry(0.46, 0.30, 0.02), bodyMat, 0, 0, -0.19);

        // Layar
        const tex = this.cachedTextures.presentationScreen;
        const screenMat = new THREE.MeshStandardMaterial({
            map: tex, emissiveMap: tex, emissive: 0xFFFFFF,
            emissiveIntensity: isLight ? 0.55 : 0.8, roughness: 0.15
        });
        const screen = new THREE.Mesh(new THREE.PlaneGeometry(w, h), screenMat);
        screen.position.z = 0.042;
        g.add(screen);

        // Pantulan diagonal di layar
        const glareMat = new THREE.MeshBasicMaterial({ color: 0xFFFFFF, transparent: true, opacity: 0.07, depthWrite: false });
        const s = new THREE.Shape();
        s.moveTo(-1.3, -0.9); s.lineTo(-0.7, -0.9); s.lineTo(0.3, 0.9); s.lineTo(-0.3, 0.9); s.closePath();
        const glare = new THREE.Mesh(new THREE.ShapeGeometry(s), glareMat);
        glare.position.z = 0.0435;
        g.add(glare);

        // LED status di bezel bawah
        const led = new THREE.Mesh(
            new THREE.BoxGeometry(0.05, 0.012, 0.006),
            new THREE.MeshBasicMaterial({ color: PALETTE.accent.teal })
        );
        led.position.set(w / 2 - 0.12, -(h / 2 + 0.025), 0.042);
        g.add(led);

        return g;
    }

    buildCenterPlanterCredenza() {
        const isLight = this.currentTheme === 'light';
        const planterGroup = new THREE.Group();
        planterGroup.position.set(0, 0, 3.0);

        // Low Blonde Scandinavian Wood Credenza (T5: PALETTE.wood = 0xc7b8a0)
        const boxMat = new THREE.MeshStandardMaterial({
            color: isLight ? PALETTE.wood : 0x334155,
            roughness: 0.4
        });
        const planterBox = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.72, 3.8), boxMat);
        planterBox.position.y = 0.36;
        planterBox.castShadow = true;
        planterBox.receiveShadow = true;
        planterGroup.add(planterBox);

        // 3 Potted Succulents & Bonsai along the top (T8: PALETTE.pot = 0xe6ded0, plant = 0x5fa777)
        const potMat = new THREE.MeshStandardMaterial({ color: isLight ? PALETTE.pot : 0x475569, roughness: 0.35 });
        const plantZ = [-1.2, 0, 1.2];
        plantZ.forEach((pz, i) => {
            const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.14, 0.22, 16), potMat);
            pot.position.set(0, 0.83, pz);
            pot.castShadow = true;
            planterGroup.add(pot);

            // Soil
            const soil = new THREE.Mesh(
                new THREE.CylinderGeometry(0.16, 0.16, 0.04, 16),
                new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.9 })
            );
            soil.position.set(0, 0.93, pz);
            planterGroup.add(soil);

            // Plant greenery
            const plantMat = new THREE.MeshStandardMaterial({
                color: PALETTE.plant, // 0x5fa777
                roughness: 0.55
            });
            const leaves = new THREE.Mesh(new THREE.DodecahedronGeometry(0.18, 1), plantMat);
            leaves.position.set(0, 1.10, pz);
            leaves.scale.set(1.0, 1.35, 1.0);
            leaves.castShadow = true;
            planterGroup.add(leaves);
        });

        this.officeGroup.add(planterGroup);
    }

        buildCatMascot() {
        const catGroup = new THREE.Group();
        catGroup.name = 'OfficeMascotCat';
        catGroup.position.set(3.2, 0, 1.8);
        catGroup.rotation.y = -Math.PI / 4;

        const coatMat   = new THREE.MeshStandardMaterial({ color: 0xdf843c, roughness: 0.65 }); // Ginger tabby
        const whiteMat  = new THREE.MeshStandardMaterial({ color: 0xfffcf7, roughness: 0.6 });
        const pinkMat   = new THREE.MeshStandardMaterial({ color: 0xf59eb0, roughness: 0.4 });
        const pupilMat  = new THREE.MeshBasicMaterial({ color: 0x111827 });
        const eyeMat    = new THREE.MeshBasicMaterial({ color: 0x3fa796 }); // Emerald green eyes
        const shineMat  = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const collarMat = new THREE.MeshStandardMaterial({ color: 0xe05638, roughness: 0.4 });
        const bellMat   = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.8, roughness: 0.2 });

        const bodyRoot = new THREE.Group();
        bodyRoot.name = 'CatBodyRoot';
        catGroup.add(bodyRoot);

        // 1. Sleek Torso
        const body = this._ellipsoid(0.18, 0.16, 0.32, coatMat);
        body.position.y = 0.26;
        body.castShadow = true;
        bodyRoot.add(body);

        // White chest patch
        const chest = this._ellipsoid(0.13, 0.12, 0.20, whiteMat);
        chest.position.set(0, 0.22, 0.10);
        bodyRoot.add(chest);

        // 2. Collar & Golden Bell
        const collar = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.016, 8, 20), collarMat);
        collar.position.set(0, 0.33, 0.21);
        collar.rotation.x = Math.PI / 3;
        bodyRoot.add(collar);

        const bell = new THREE.Mesh(new THREE.SphereGeometry(0.026, 12, 8), bellMat);
        bell.position.set(0, 0.24, 0.28);
        bodyRoot.add(bell);

        // 3. Head Pivot
        const headPivot = new THREE.Group();
        headPivot.name = 'CatHeadPivot';
        headPivot.position.set(0, 0.36, 0.24);
        bodyRoot.add(headPivot);

        const head = this._ellipsoid(0.17, 0.15, 0.16, coatMat, 20);
        head.position.set(0, 0.04, 0);
        head.castShadow = true;
        headPivot.add(head);

        // White Muzzle / Cheeks
        const muzzleL = this._ellipsoid(0.065, 0.05, 0.06, whiteMat, 12);
        muzzleL.position.set(-0.045, 0.00, 0.13);
        headPivot.add(muzzleL);

        const muzzleR = muzzleL.clone();
        muzzleR.position.x = 0.045;
        headPivot.add(muzzleR);

        // Tiny pink nose
        const nose = this._ellipsoid(0.02, 0.016, 0.016, pinkMat, 8);
        nose.position.set(0, 0.03, 0.16);
        headPivot.add(nose);

        // Pointy Cat Ears (with inner pink ear)
        [-1, 1].forEach(s => {
            const earOuter = new THREE.Mesh(new THREE.ConeGeometry(0.065, 0.11, 4), coatMat);
            earOuter.position.set(s * 0.10, 0.18, 0.01);
            earOuter.rotation.y = s * (Math.PI / 4);
            earOuter.rotation.z = -s * 0.2;
            headPivot.add(earOuter);

            const earInner = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.08, 4), pinkMat);
            earInner.position.set(s * 0.095, 0.17, 0.02);
            earInner.rotation.y = s * (Math.PI / 4);
            earInner.rotation.z = -s * 0.2;
            headPivot.add(earInner);
        });

        // Expressive Cat Eyes
        [-1, 1].forEach(s => {
            const eyeGroup = new THREE.Group();
            eyeGroup.position.set(s * 0.075, 0.06, 0.125);

            const iris = this._ellipsoid(0.032, 0.038, 0.015, eyeMat, 12);
            eyeGroup.add(iris);

            const pupil = this._ellipsoid(0.012, 0.028, 0.018, pupilMat, 8);
            pupil.position.z = 0.005;
            eyeGroup.add(pupil);

            const shine = this._ellipsoid(0.008, 0.008, 0.006, shineMat, 8);
            shine.position.set(0.01, 0.012, 0.018);
            eyeGroup.add(shine);

            headPivot.add(eyeGroup);
        });

        // Whiskers (thin white lines on each cheek)
        const whiskerMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6 });
        [-1, 1].forEach(s => {
            [-0.015, 0, 0.015].forEach(dy => {
                const w = new THREE.Mesh(new THREE.CylinderGeometry(0.002, 0.002, 0.14, 4), whiskerMat);
                w.rotation.z = Math.PI / 2 + s * (dy * 8);
                w.position.set(s * 0.12, 0.0 + dy, 0.12);
                headPivot.add(w);
            });
        });

        // 4. Articulated Legs (Front Left, Front Right, Back Left, Back Right)
        const makeCatLeg = (name, x, z) => {
            const legPivot = new THREE.Group();
            legPivot.name = name;
            legPivot.position.set(x, 0.24, z);
            catGroup.add(legPivot);

            const legMesh = this._capsule(0.04, 0.16, coatMat);
            legMesh.position.y = -0.08;
            legPivot.add(legMesh);

            const paw = this._ellipsoid(0.048, 0.035, 0.06, whiteMat, 10);
            paw.position.set(0, -0.18, 0.015);
            legPivot.add(paw);

            return legPivot;
        };

        this.catLegFL = makeCatLeg('CatLegFL', -0.11,  0.15);
        this.catLegFR = makeCatLeg('CatLegFR',  0.11,  0.15);
        this.catLegBL = makeCatLeg('CatLegBL', -0.11, -0.16);
        this.catLegBR = makeCatLeg('CatLegBR',  0.11, -0.16);

        // 5. Long Animated Feline Tail
        const tailRoot = new THREE.Group();
        tailRoot.name = 'CatTailRoot';
        tailRoot.position.set(0, 0.28, -0.26);
        tailRoot.rotation.x = 0.4;
        catGroup.add(tailRoot);

        const tailSeg1 = this._capsule(0.032, 0.16, coatMat);
        tailSeg1.position.set(0, 0.08, -0.04);
        tailSeg1.rotation.x = -0.4;
        tailRoot.add(tailSeg1);

        const tailMid = new THREE.Group();
        tailMid.name = 'CatTailMid';
        tailMid.position.set(0, 0.16, -0.08);
        tailRoot.add(tailMid);

        const tailSeg2 = this._capsule(0.028, 0.16, coatMat);
        tailSeg2.position.set(0, 0.08, 0.04);
        tailSeg2.rotation.x = 0.5;
        tailMid.add(tailSeg2);

        const tailTip = new THREE.Group();
        tailTip.name = 'CatTailTip';
        tailTip.position.set(0, 0.16, 0.08);
        tailMid.add(tailTip);

        const tipMesh = this._capsule(0.024, 0.12, whiteMat); // White tail tip
        tipMesh.position.set(0, 0.06, 0.02);
        tipMesh.rotation.x = 0.3;
        tailTip.add(tipMesh);

        this.officeGroup.add(catGroup);
        this.catGroup = catGroup;
        this.shibaGroup = catGroup; // compatibility alias

        // State Machine for Dynamic Roaming
        this.catState = {
            state: 'RESTING',
            restTimer: 3.5,
            walkPhase: 0,
            target: new THREE.Vector3(3.2, 0, 1.8),
            targetRot: -Math.PI / 4,
            waypoints: [
                new THREE.Vector3(0.0, 0, 0.0),    // Central Walkway center
                new THREE.Vector3(4.5, 0, 0.0),    // Central Walkway east
                new THREE.Vector3(6.6, 0, 0.0),    // East corridor entry
                new THREE.Vector3(6.6, 0, 4.2),    // East corridor mid
                new THREE.Vector3(7.8, 0, 4.2),    // Near coffee counter & stools
                new THREE.Vector3(6.6, 0, 4.2),    // East corridor mid
                new THREE.Vector3(6.6, 0, 0.0),    // East corridor top
                new THREE.Vector3(6.6, 0, -4.2),   // Back corridor east
                new THREE.Vector3(1.5, 0, -4.2),   // Back corridor mid
                new THREE.Vector3(0.0, 0, -4.2),   // Back corridor center
                new THREE.Vector3(-3.0, 0, -4.2),  // Back corridor west
                new THREE.Vector3(-3.0, 0, 0.0),   // Central walkway west
                new THREE.Vector3(-3.0, 0, 5.3),   // West lounge transit aisle
                new THREE.Vector3(0.0, 0, 5.3),    // Lounge threshold
                new THREE.Vector3(2.45, 0, 5.3),   // Lounge west seating entry
                new THREE.Vector3(2.45, 0, 7.2),   // In front of left armchair
                new THREE.Vector3(2.45, 0, 7.95),  // Lounge rug corner
                new THREE.Vector3(3.8, 0, 7.95),   // In front of main sofa
                new THREE.Vector3(2.45, 0, 7.95),  // Lounge rug corner
                new THREE.Vector3(2.45, 0, 5.3),   // Lounge west seating entry
                new THREE.Vector3(0.0, 0, 5.3),    // Lounge threshold
                new THREE.Vector3(-3.0, 0, 5.3),   // West lounge transit aisle
                new THREE.Vector3(-3.0, 0, 0.0)    // Central walkway west
            ],
            targetIndex: 0
        };
    }

    buildShibaInuMascot() {
        this.buildCatMascot();
    }

    updateCatLocomotion(delta, elapsedTime) {
        const cat = this.catGroup;
        const state = this.catState;
        if (!cat || !state) return;

        const head = cat.getObjectByName('CatHeadPivot');
        const tailRoot = cat.getObjectByName('CatTailRoot');
        const tailMid = cat.getObjectByName('CatTailMid');
        const tailTip = cat.getObjectByName('CatTailTip');

        // Check distance to all walking or nearby agents
        let minAgentDist = Infinity;
        let closestAgent = null;
        if (this.agents) {
            this.agents.forEach(agentUnit => {
                const aPos = agentUnit.avatarGroup.position;
                const d = Math.hypot(cat.position.x - aPos.x, cat.position.z - aPos.z);
                if (d < minAgentDist) {
                    minAgentDist = d;
                    closestAgent = agentUnit;
                }
            });
        }

        if (state.state === 'RESTING') {
            state.restTimer -= delta;

            // Feline idle posture: relaxed tail sway
            if (tailMid && tailTip) {
                tailMid.rotation.y = Math.sin(elapsedTime * 2.2) * 0.28;
                tailTip.rotation.y = Math.sin(elapsedTime * 2.2 - 0.6) * 0.35;
            }

            // Head curious look around & slight nod
            if (head) {
                if (minAgentDist < 1.4 && closestAgent) {
                    // Look up at nearby human
                    head.rotation.x = 0.28;
                    head.rotation.y = Math.sin(elapsedTime * 1.5) * 0.20;
                } else {
                    head.rotation.y = Math.sin(elapsedTime * 0.9) * 0.30;
                    head.rotation.x = 0.04 + Math.sin(elapsedTime * 1.6) * 0.04;
                    head.rotation.z = Math.sin(elapsedTime * 0.7) * 0.08;
                }
            }

            // Neutral resting legs
            if (this.catLegFL) this.catLegFL.rotation.x = 0;
            if (this.catLegFR) this.catLegFR.rotation.x = 0;
            if (this.catLegBL) this.catLegBL.rotation.x = 0;
            if (this.catLegBR) this.catLegBR.rotation.x = 0;

            if (state.restTimer <= 0) {
                state.targetIndex = (state.targetIndex + 1) % state.waypoints.length;
                state.target.copy(state.waypoints[state.targetIndex]);
                state.state = 'WALKING';
            }
        } else if (state.state === 'WALKING') {
            const curPos = cat.position;

            // If an agent is very close (< 0.65m), pause and look up politely
            if (minAgentDist < 0.65) {
                if (head) {
                    head.rotation.x = 0.32;
                    head.rotation.y = Math.sin(elapsedTime * 3.0) * 0.15;
                }
                if (tailMid) tailMid.rotation.y = Math.sin(elapsedTime * 4.5) * 0.40;
                curPos.y = 0;
                return; // Wait for agent to pass safely
            }

            const dx = state.target.x - curPos.x;
            const dz = state.target.z - curPos.z;
            const dist = Math.hypot(dx, dz);

            if (dist > 0.15) {
                // Smoothly steer towards destination
                const targetAngle = Math.atan2(dx, dz);
                let diff = targetAngle - cat.rotation.y;
                while (diff < -Math.PI) diff += Math.PI * 2;
                while (diff > Math.PI) diff -= Math.PI * 2;
                cat.rotation.y += diff * Math.min(delta * 5.0, 1.0);

                // Natural feline walk speed, slow down if agent nearby
                let speed = 1.35;
                if (minAgentDist < 1.3) speed *= 0.65;

                const step = Math.min(dist, speed * delta);
                let moveX = (dx / dist) * step;
                let moveZ = (dz / dist) * step;

                // Nudge laterally away from approaching agent
                if (minAgentDist < 1.3 && closestAgent) {
                    const aPos = closestAgent.avatarGroup.position;
                    const steerX = (curPos.x - aPos.x) / minAgentDist;
                    const steerZ = (curPos.z - aPos.z) / minAgentDist;
                    const steerForce = (1.3 - minAgentDist) * 0.6 * delta;
                    moveX += steerX * steerForce;
                    moveZ += steerZ * steerForce;
                }

                const prevCatX = curPos.x;
                const prevCatZ = curPos.z;

                // Continuous obstacle collision resolver with whisker evasion
                const resolved = this.resolveObstacleCollision(curPos, moveX, moveZ, 0.20);
                curPos.x = resolved.x;
                curPos.z = resolved.z;

                const catMoved = Math.hypot(curPos.x - prevCatX, curPos.z - prevCatZ);
                if (catMoved > 0.001) {
                    state.stuckTimer = 0;
                    // 4-beat trot gait animation
                    state.walkPhase += delta * 9.5;
                    const p = state.walkPhase;

                    if (this.catLegFL) this.catLegFL.rotation.x = Math.sin(p) * 0.42;
                    if (this.catLegFR) this.catLegFR.rotation.x = -Math.sin(p) * 0.42;
                    if (this.catLegBL) this.catLegBL.rotation.x = -Math.sin(p + 0.6) * 0.42;
                    if (this.catLegBR) this.catLegBR.rotation.x = Math.sin(p + 0.6) * 0.42;

                    // Subtle body sway & vertical step bob
                    curPos.y = Math.abs(Math.sin(p * 2)) * 0.025;

                    // Tail held upright & swaying in rhythm
                    if (tailRoot) tailRoot.rotation.x = -0.4;
                    if (tailMid) tailMid.rotation.y = Math.sin(p) * 0.32;
                    if (tailTip) tailTip.rotation.y = Math.sin(p - 0.5) * 0.38;

                    if (head) {
                        head.rotation.x = Math.sin(p * 2) * 0.04;
                        head.rotation.y = 0;
                        head.rotation.z = Math.sin(p) * 0.05;
                    }
                } else {
                    // Do NOT trot in place when obstructed
                    curPos.y = 0;
                    if (this.catLegFL) this.catLegFL.rotation.x = 0;
                    if (this.catLegFR) this.catLegFR.rotation.x = 0;
                    if (this.catLegBL) this.catLegBL.rotation.x = 0;
                    if (this.catLegBR) this.catLegBR.rotation.x = 0;

                    state.stuckTimer = (state.stuckTimer || 0) + delta;
                    if (state.stuckTimer > 1.0) {
                        // Cat mencari jalan keluar: switch to next waypoint!
                        state.targetIndex = (state.targetIndex + 1) % state.waypoints.length;
                        state.target.copy(state.waypoints[state.targetIndex]);
                        state.stuckTimer = 0;
                    }
                }
            } else {
                // Reached destination, sit and rest
                state.state = 'RESTING';
                state.restTimer = 3.5 + Math.random() * 4.0; // rest 3.5 - 7.5 seconds
                curPos.y = 0;
            }
        }
    }

    buildMeetingRoom(x, z) {
        const isLight = this.currentTheme === 'light';
        const roomW = 8;
        const roomD = 5.5;
        const glassHeight = 3.2;

        // Physical Architectural Glass (T4: PALETTE.glass = 0xc9ddee, emissive <= 0.15)
        const glassMat = new THREE.MeshPhysicalMaterial({
            color: isLight ? PALETTE.glass : PALETTE.glassDark, // 0xc9ddee / 0x2a3e5c
            transparent: true,
            opacity: 0.50,
            roughness: 0.08,
            metalness: 0.05,
            transmission: 0.82,
            ior: 1.5,
            reflectivity: 0.35
        });

        // Front Glass Wall
        const frontGlass = new THREE.Mesh(new THREE.BoxGeometry(roomW, glassHeight, 0.08), glassMat);
        frontGlass.position.set(x, glassHeight / 2, z + roomD / 2);
        this.officeGroup.add(frontGlass);

        // Frosted Privacy Vinyl Strip across middle (avoids pure white #FFFFFF)
        const frostMat = new THREE.MeshStandardMaterial({
            color: 0xeef1f4,
            transparent: true,
            opacity: 0.28,
            roughness: 0.7
        });
        const frostBand = new THREE.Mesh(new THREE.BoxGeometry(roomW, 0.45, 0.09), frostMat);
        frostBand.position.set(x, 1.45, z + roomD / 2);
        this.officeGroup.add(frostBand);

        // Right Glass Wall
        const rightGlass = new THREE.Mesh(new THREE.BoxGeometry(0.08, glassHeight, roomD), glassMat);
        rightGlass.position.set(x + roomW / 2, glassHeight / 2, z);
        this.officeGroup.add(rightGlass);

        // Thin architectural glass bottom frame
        const glassFrameMat = new THREE.MeshStandardMaterial({ color: isLight ? PALETTE.trim : PALETTE.trimDark, roughness: 0.4 });
        const bottomRail1 = new THREE.Mesh(new THREE.BoxGeometry(roomW, 0.06, 0.1), glassFrameMat);
        bottomRail1.position.set(x, 0.03, z + roomD / 2);
        this.officeGroup.add(bottomRail1);
        const bottomRail2 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.06, roomD), glassFrameMat);
        bottomRail2.position.set(x + roomW / 2, 0.03, z);
        this.officeGroup.add(bottomRail2);

        // Conference Table (T5: PALETTE.wood = 0xc7b8a0, base = PALETTE.dark)
        const tableTop = new THREE.Mesh(
            new THREE.CylinderGeometry(1.6, 1.6, 0.1, 32),
            new THREE.MeshStandardMaterial({ color: isLight ? PALETTE.wood : 0x334155, roughness: 0.35 })
        );
        tableTop.scale.set(1.6, 1, 0.9);
        tableTop.position.set(x, 1.1, z);
        tableTop.castShadow = true;
        tableTop.receiveShadow = true;
        this.meetingTableTop = tableTop;
        this.officeGroup.add(tableTop);

        // Twin architectural pedestals for wide executive conference table
        const tableLegMat = new THREE.MeshStandardMaterial({ color: PALETTE.dark, metalness: 0.7, roughness: 0.35 });
        [-1.2, 1.2].forEach(xOffset => {
            const legColumn = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.26, 1.05, 24), tableLegMat);
            legColumn.position.set(x + xOffset, 0.55, z);
            legColumn.castShadow = true;
            this.officeGroup.add(legColumn);

            const basePlate = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.46, 0.04, 24), tableLegMat);
            basePlate.position.set(x + xOffset, 0.02, z);
            basePlate.receiveShadow = true;
            this.officeGroup.add(basePlate);
        });

        // Center flush cable management grommet box
        const grommet = new THREE.Mesh(
            new THREE.BoxGeometry(0.65, 0.015, 0.20),
            new THREE.MeshStandardMaterial({ color: 0x22262d, metalness: 0.8, roughness: 0.3 })
        );
        grommet.position.set(x, 1.155, z);
        this.officeGroup.add(grommet);

        // Executive Conference Chairs (8 ergonomic chairs neatly arranged around the oval table)
        // Correct clearance: no clipping into table top or legs, with natural inward orientation
        const chairConfigs = [
            // Head chairs (West & East ends)
            { cx: x - 2.70, cz: z,        rotY: Math.PI / 2 },
            { cx: x + 2.70, cz: z,        rotY: -Math.PI / 2 },
            // North chairs (Back side facing South towards table center)
            { cx: x - 1.40, cz: z - 1.36, rotY: 0.10 },
            { cx: x,        cz: z - 1.58, rotY: 0.00 },
            { cx: x + 1.40, cz: z - 1.36, rotY: -0.10 },
            // South chairs (Front side facing North towards TV & table center)
            { cx: x - 1.40, cz: z + 1.36, rotY: Math.PI - 0.10 },
            { cx: x,        cz: z + 1.58, rotY: Math.PI },
            { cx: x + 1.40, cz: z + 1.36, rotY: Math.PI + 0.10 }
        ];

        this.meetingSpots = chairConfigs.map((cfg, idx) => ({
            id: `meet_chair_${idx}`,
            name: `Kursi Konferensi #${idx + 1}`,
            x: cfg.cx,
            y: 0,
            z: cfg.cz,
            rotY: cfg.rotY,
            taken: false,
            agentId: null
        }));

        chairConfigs.forEach(cfg => {
            this.createConferenceChair(cfg.cx, cfg.cz, cfg.rotY);
        });

        // TV menempel di dinding belakang (permukaan dalam dinding z = -11.8)
        const tv = this.buildWallTV(3.6, 1.8);
        tv.name = 'MeetingRoomTV';
        tv.userData = { isMeetingTV: true, isMeetingRoom: true };
        tv.position.set(x, 2.3, -11.8 + 0.2);
        this.meetingTV = tv;
        this.officeGroup.add(tv);

        // Credenza di bawah TV
        const tvCredenza = new THREE.Mesh(
            new THREE.BoxGeometry(3.6, 0.55, 0.5),
            new THREE.MeshStandardMaterial({ color: 0x7a5232, roughness: 0.55 })
        );
        tvCredenza.position.set(x, 0.275, -11.8 + 0.27);
        tvCredenza.castShadow = true;
        tvCredenza.receiveShadow = true;
        this.officeGroup.add(tvCredenza);
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

        // Sleek Marble Countertop (T8: 0xE6E4DF)
        const top = new THREE.Mesh(
            new THREE.BoxGeometry(3.0, 0.08, 0.95),
            new THREE.MeshStandardMaterial({ color: 0xE6E4DF, roughness: 0.25 })
        );
        top.position.set(x, 1.19, z);
        top.castShadow = true;
        this.officeGroup.add(top);

        // Espresso Machine (T8: PALETTE.dark = 0x2a2d33, metalness 0.15)
        const espresso = new THREE.Mesh(
            new THREE.BoxGeometry(0.75, 0.55, 0.55),
            new THREE.MeshStandardMaterial({ color: PALETTE.dark, metalness: 0.15, roughness: 0.3 })
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

        // Water Cooler Dispenser (T8: coolerBody = 0xC9CDD2)
        const coolerBody = new THREE.Mesh(
            new THREE.BoxGeometry(0.65, 1.35, 0.65),
            new THREE.MeshStandardMaterial({ color: 0xC9CDD2, roughness: 0.3 })
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

        // 1. Sleek Modern Coffee Table in Lounge Center (T5: Base PALETTE.rack = 0x46546b, Inlay PALETTE.sofa[0] = 0xe9dfcf)
        const coffeeTable = new THREE.Mesh(
            new THREE.BoxGeometry(1.7, 0.40, 0.90),
            new THREE.MeshStandardMaterial({ color: isLight ? PALETTE.rack : 0x334155, roughness: 0.35 })
        );
        coffeeTable.position.set(3.8, 0.20, 7.2);
        coffeeTable.castShadow = true;
        coffeeTable.receiveShadow = true;
        this.officeGroup.add(coffeeTable);

        // Table Top Inlay
        const tableInlay = new THREE.Mesh(
            new THREE.BoxGeometry(1.58, 0.03, 0.78),
            new THREE.MeshStandardMaterial({ color: isLight ? PALETTE.sofa[0] : 0x1e293b, roughness: 0.25 })
        );
        tableInlay.position.set(3.8, 0.41, 7.2);
        this.officeGroup.add(tableInlay);

        // Ceramic Succulent Planter on Coffee Table (T8: pot = 0xe6ded0, plant = 0x5fa777)
        const bowl = new THREE.Mesh(
            new THREE.CylinderGeometry(0.18, 0.14, 0.08, 16),
            new THREE.MeshStandardMaterial({ color: PALETTE.pot, roughness: 0.35 })
        );
        bowl.position.set(3.8, 0.47, 7.2);
        this.officeGroup.add(bowl);

        const succulent = new THREE.Mesh(
            new THREE.DodecahedronGeometry(0.10, 0),
            new THREE.MeshStandardMaterial({ color: PALETTE.plant, roughness: 0.55 })
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

        // 4. Rolling Whiteboard ("WORK BOARD" with sticky notes - Matches Reference Image)
        const wbGroup = new THREE.Group();
        wbGroup.position.set(0.2, 0, 5.2);
        wbGroup.rotation.y = -0.18; // Angled nicely towards central view

        const wbMat = new THREE.MeshStandardMaterial({
            map: this.cachedTextures.workBoard,
            roughness: 0.3
        });
        const board = new THREE.Mesh(new THREE.BoxGeometry(2.1, 1.35, 0.04), wbMat);
        board.position.y = 1.55;
        board.castShadow = true;
        wbGroup.add(board);

        // Clean architectural frame & stand on casters (T8: 0x5C6B80)
        const frameMat = new THREE.MeshStandardMaterial({ color: 0x5C6B80, metalness: 0.5, roughness: 0.4 });
        const leftPole = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.75, 0.05), frameMat);
        leftPole.position.set(-1.08, 1.05, 0);
        wbGroup.add(leftPole);

        const rightPole = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.75, 0.05), frameMat);
        rightPole.position.set(1.08, 1.05, 0);
        wbGroup.add(rightPole);

        // Cross feet with wheels
        [-1.08, 1.08].forEach(fx => {
            const foot = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.65), frameMat);
            foot.position.set(fx, 0.05, 0);
            wbGroup.add(foot);
        });

        this.officeGroup.add(wbGroup);

        // 5. Minimalist Framed Poster on Tripod Easel ("Good people build great work.")
        const posterGroup = new THREE.Group();
        posterGroup.position.set(-2.6, 0, 8.2);
        posterGroup.rotation.y = 0.35; // Angled towards central view

        const easelMat = new THREE.MeshStandardMaterial({ color: PALETTE.dark, roughness: 0.45 });
        const easelLegL = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 2.3, 8), easelMat);
        easelLegL.position.set(-0.42, 1.15, -0.05);
        easelLegL.rotation.z = -0.18;
        posterGroup.add(easelLegL);

        const easelLegR = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 2.3, 8), easelMat);
        easelLegR.position.set(0.42, 1.15, -0.05);
        easelLegR.rotation.z = 0.18;
        posterGroup.add(easelLegR);

        const easelLegB = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 2.2, 8), easelMat);
        easelLegB.position.set(0, 1.1, -0.38);
        easelLegB.rotation.x = -0.30;
        posterGroup.add(easelLegB);

        const bar = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.04, 0.08), easelMat);
        bar.position.set(0, 1.05, 0.08);
        posterGroup.add(bar);

        const posterMat = new THREE.MeshStandardMaterial({
            map: this.cachedTextures.posterGreatWork,
            roughness: 0.35
        });
        const posterFrame = new THREE.Mesh(new THREE.BoxGeometry(1.15, 1.5, 0.04), posterMat);
        posterFrame.position.set(0, 1.72, 0.06);
        posterFrame.rotation.x = -0.12;
        posterFrame.castShadow = true;
        posterGroup.add(posterFrame);

        this.officeGroup.add(posterGroup);
    }

    buildServerRacks(x, z) {
        this.serverLeds = [];
        const rackMat = new THREE.MeshStandardMaterial({
            color: PALETTE.rack, // T3: 0x46546b (raises luminance above 10% to eliminate dark hole)
            metalness: 0.5,
            roughness: 0.45
        });
        for (let r = 0; r < 2; r++) {
            const rx = x + r * 1.5;
            const rack = new THREE.Mesh(
                new THREE.BoxGeometry(1.2, 3.4, 0.9),
                rackMat
            );
            rack.position.set(rx, 1.7, z);
            rack.castShadow = true;
            this.officeGroup.add(rack);

            for (let s = 0; s < 6; s++) {
                const led = new THREE.Mesh(
                    new THREE.BoxGeometry(0.06, 0.06, 0.04),
                    new THREE.MeshBasicMaterial({ color: s % 2 === 0 ? PALETTE.accent.teal : PALETTE.accent.amber })
                );
                led.position.set(rx - 0.4 + (s % 3) * 0.3, 0.6 + s * 0.45, z + 0.47);
                this.officeGroup.add(led);
                this.serverLeds.push(led);
            }
        }
    }

    /**
     * Legacy compatibility wrapper for createConferenceChair
     */
    createSimpleChair(x, z, rotationY) {
        return this.createConferenceChair(x, z, rotationY);
    }

    /**
     * Builds an executive conference chair with ergonomic upholstery,
     * 5-star spider caster base, contoured backrest, chrome accents, and cantilever armrests.
     */
    createConferenceChair(x, z, rotationY) {
        const isLight = this.currentTheme === 'light';
        const chair = new THREE.Group();
        chair.position.set(x, 0, z);
        chair.rotation.y = rotationY;

        // Executive upholstery: deep charcoal leather
        const leatherColor = isLight ? 0x2d343c : 0x222834;
        const leatherMat = new THREE.MeshStandardMaterial({
            color: leatherColor,
            roughness: 0.55,
            metalness: 0.1
        });

        // Polished architectural chrome metal
        const chromeMat = new THREE.MeshStandardMaterial({
            color: isLight ? 0xd0d5dd : 0x94a3b8,
            metalness: 0.85,
            roughness: 0.22
        });

        // Matte structural dark metal
        const darkMetalMat = new THREE.MeshStandardMaterial({
            color: 0x1e242d,
            metalness: 0.6,
            roughness: 0.4
        });

        // 1. Five-Star Spider Base with Casters
        const baseGroup = new THREE.Group();
        const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.05, 16), chromeMat);
        hub.position.y = 0.10;
        baseGroup.add(hub);

        const legRadius = 0.32;
        const numProngs = 5;
        const casterGeom = new THREE.CylinderGeometry(0.024, 0.024, 0.035, 10);
        casterGeom.rotateX(Math.PI / 2);

        for (let i = 0; i < numProngs; i++) {
            const legAngle = (i / numProngs) * Math.PI * 2;
            const cosA = Math.cos(legAngle);
            const sinA = Math.sin(legAngle);

            // Spider leg spoke
            const legBar = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.022, legRadius), chromeMat);
            legBar.position.set(cosA * (legRadius / 2), 0.08, sinA * (legRadius / 2));
            legBar.rotation.y = -legAngle + Math.PI / 2;
            baseGroup.add(legBar);

            // Caster wheel housing
            const casterWheel = new THREE.Mesh(casterGeom, darkMetalMat);
            casterWheel.position.set(cosA * legRadius, 0.04, sinA * legRadius);
            baseGroup.add(casterWheel);
        }
        chair.add(baseGroup);

        // 2. Hydraulic Gas-Lift Column & Under-seat Mechanism
        const liftPiston = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.032, 0.42, 16), chromeMat);
        liftPiston.position.y = 0.32;
        chair.add(liftPiston);

        const pistonShroud = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.046, 0.18, 16), darkMetalMat);
        pistonShroud.position.y = 0.20;
        chair.add(pistonShroud);

        const mechBox = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.06, 0.28), darkMetalMat);
        mechBox.position.set(0, 0.54, -0.02);
        chair.add(mechBox);

        const tensionKnob = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.06, 12), darkMetalMat);
        tensionKnob.position.set(0, 0.49, 0.04);
        chair.add(tensionKnob);

        // 3. Ergonomic Contoured Seat Cushion
        const seatCushion = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.09, 0.60), leatherMat);
        seatCushion.position.set(0, 0.615, 0.0);
        seatCushion.castShadow = true;
        seatCushion.receiveShadow = true;
        chair.add(seatCushion);

        // Waterfall edge roll at front of seat (comfortable thigh contour)
        const waterfallRoll = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.64, 16), leatherMat);
        waterfallRoll.rotation.z = Math.PI / 2;
        waterfallRoll.position.set(0, 0.605, 0.30);
        waterfallRoll.castShadow = true;
        chair.add(waterfallRoll);

        // 4. Ergonomic Backrest with Lumbar & Executive Headrest
        const backGroup = new THREE.Group();
        backGroup.position.set(0, 0.62, -0.28);
        backGroup.rotation.x = -0.08; // subtle executive posture tilt

        // Lower lumbar cushion
        const lumbarCushion = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.32, 0.07), leatherMat);
        lumbarCushion.position.set(0, 0.20, 0.0);
        lumbarCushion.castShadow = true;
        backGroup.add(lumbarCushion);

        // Upper backrest
        const upperBack = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.36, 0.06), leatherMat);
        upperBack.position.set(0, 0.52, -0.02);
        upperBack.castShadow = true;
        backGroup.add(upperBack);

        // Chrome top edge accent
        const frameTop = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.03, 0.03), chromeMat);
        frameTop.position.set(0, 0.70, -0.03);
        backGroup.add(frameTop);

        // Chrome structural spine at rear
        const spine = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.62, 0.04), chromeMat);
        spine.position.set(0, 0.33, -0.05);
        backGroup.add(spine);

        chair.add(backGroup);

        // 5. Modern Cantilever Armrests (Left & Right)
        const armRestGeom = new THREE.BoxGeometry(0.065, 0.03, 0.30);
        const armStrutGeom = new THREE.CylinderGeometry(0.016, 0.016, 0.30, 12);

        [-0.33, 0.33].forEach(armX => {
            const strut = new THREE.Mesh(armStrutGeom, chromeMat);
            strut.position.set(armX, 0.73, 0.0);
            chair.add(strut);

            const armPad = new THREE.Mesh(armRestGeom, leatherMat);
            armPad.position.set(armX, 0.88, 0.0);
            armPad.castShadow = true;
            chair.add(armPad);
        });

        if (!this.conferenceChairMaterials) this.conferenceChairMaterials = [];
        this.conferenceChairMaterials.push(leatherMat);

        this.officeGroup.add(chair);
        return chair;
    }

    createPottedPlant(x, z) {
        const plant = new THREE.Group();
        plant.position.set(x, 0, z);

        const pot = new THREE.Mesh(
            new THREE.CylinderGeometry(0.35, 0.25, 0.7, 16),
            new THREE.MeshStandardMaterial({ color: PALETTE.pot, roughness: 0.35 }) // T8: 0xe6ded0 warm stone ceramic
        );
        pot.position.y = 0.35;
        pot.castShadow = true;
        plant.add(pot);

        const soil = new THREE.Mesh(
            new THREE.CylinderGeometry(0.33, 0.33, 0.1, 16),
            new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.9 })
        );
        soil.position.y = 0.68;
        plant.add(soil);

        const leafMat = new THREE.MeshStandardMaterial({ color: PALETTE.plant, roughness: 0.55 }); // T8: 0x5fa777 saturated green
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
        this.strollSpots = [
            { id: 'spot_coffee_bar', name: 'Coffee Corner & Espresso Bar', x: 7.8, y: 0, z: 4.2, rotY: 0, holdingCup: true },
            { id: 'spot_work_board', name: 'Board Rapat & Pengumuman', x: 0.0, y: 0, z: -4.2, rotY: 0, holdingCup: false },
            { id: 'spot_meeting_view', name: 'Ruang Rapat & Kolaborasi (Glass View)', x: -3.0, y: 0, z: -4.2, rotY: -Math.PI / 2, holdingCup: false },
            { id: 'spot_server_hub', name: 'Pusat Server & Tech Hub', x: 6.6, y: 0, z: -4.2, rotY: Math.PI / 2, holdingCup: false },
            { id: 'spot_walkway_west', name: 'Lorong Utama Barat (Stroll)', x: -3.0, y: 0, z: 0.0, rotY: Math.PI / 4, holdingCup: false },
            { id: 'spot_walkway_east', name: 'Lorong Utama Timur (Stroll)', x: 3.0, y: 0, z: 0.0, rotY: -Math.PI / 4, holdingCup: false }
        ];
        this.sofaMaterials = [];
        const isLight = this.currentTheme === 'light';

        // 1. Main 3-Seater Sofa (T8: PALETTE.sofa[1] = 0x4c6489 Biru-Abu)
        const mainSofaColor = isLight ? PALETTE.sofa[1] : 0x2e4a3d;
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

        // 2. Kursi Sofa Single Kiri (Armchair 1 - T8: PALETTE.accentChair = 0xe07b3a oranye)
        const armchairColor1 = isLight ? PALETTE.accentChair : 0xb45309;
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

        // 3. Kursi Sofa Single Kanan (Armchair 2 - T8: PALETTE.sage = 0x9ebfa8 sage)
        const armchairColor2 = isLight ? PALETTE.sage : 0x2e4a3d;
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

        // 4. Kursi Sofa Depan (2-Seater - T8: PALETTE.sofa[0] = 0xf1eadc krem oat)
        const frontSofaColor = isLight ? PALETTE.sofa[0] : 0x3d3830;
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

        if (!this.webglAvailable) {
            const wrapper = document.getElementById('office-2d-canvas-wrapper');
            if (wrapper) {
                if (newTheme === 'dark') {
                    wrapper.classList.remove('bg-slate-100/90', 'text-slate-800');
                    wrapper.classList.add('bg-slate-900/95', 'text-slate-100');
                } else {
                    wrapper.classList.remove('bg-slate-900/95', 'text-slate-100');
                    wrapper.classList.add('bg-slate-100/90', 'text-slate-800');
                }
            }
            if (this.rawAgentsList) this.render2DAgents(this.rawAgentsList);
            return;
        }

        const isLight = newTheme === 'light';

        this.applyThemeColors();

        // T4: Calibrate all lights through applyLightingPreset
        this.applyLightingPreset();

        if (this.floorMat) {
            this.floorMat.map = isLight ? this.cachedTextures.floorLight : this.cachedTextures.floorDark;
            this.floorMat.roughness = isLight ? 0.42 : 0.48;
            this.floorMat.needsUpdate = true;
        }

        // T6: Update zone carpets
        if (this.carpetLounge) {
            this.carpetLounge.material.color.setHex(isLight ? PALETTE.rugLounge : 0x1e3a5a);
        }
        if (this.carpetMeeting) {
            this.carpetMeeting.material.color.setHex(isLight ? PALETTE.rugMeeting : 0x4a1f1c);
        }
        if (this.meetingTableTop) {
            this.meetingTableTop.material.color.setHex(isLight ? PALETTE.wood : 0x334155);
        }
        if (this.conferenceChairMaterials) {
            const chairLeather = isLight ? 0x2d343c : 0x222834;
            this.conferenceChairMaterials.forEach(m => { if (m && m.color) m.color.setHex(chairLeather); });
        }

        // T5: Update grass ground
        if (this.grassMat) {
            this.grassMat.color.setHex(isLight ? PALETTE.grass : PALETTE.grassDark);
        }

        if (this.wallMat) {
            this.wallMat.color.setHex(isLight ? PALETTE.wall : PALETTE.wallDark);
        }

        if (this.baseboardMat) {
            this.baseboardMat.color.setHex(isLight ? PALETTE.trim : PALETTE.trimDark);
        }

                if (this.winFrameMat)  this.winFrameMat.color.setHex(isLight ? PALETTE.frame : 0x475569);
        if (this.winCasingMat) this.winCasingMat.color.setHex(isLight ? 0xF1EADC : 0x5B6478);
        if (this.winJambMat)   this.winJambMat.color.setHex(isLight ? 0xCBBFA6 : 0x3C4760);
        (this.winViewMats || []).forEach(m => m.color.setHex(isLight ? 0xFFFFFF : 0x5A6A85));

        // Update desks & text badges
        for (const [id, agentUnit] of this.agents.entries()) {
            const agent = agentUnit.userData.agentData;
            const deskTop = agentUnit.deskGroup.getObjectByName(`DeskTop_${id}`);
            if (deskTop) {
                deskTop.material.color.setHex(isLight ? PALETTE.wood : 0x334155);
            }

            const oldSprite = agentUnit.avatarGroup.getObjectByName(`BadgeSprite_${id}`);
            if (oldSprite) {
                agentUnit.avatarGroup.remove(oldSprite);
                if (oldSprite.material.map) oldSprite.material.map.dispose();
                oldSprite.material.dispose();

                const newSprite = this.createTextBadgeSprite(agent.name, agent.role, agent.status);
                newSprite.position.set(0, 2.35, 0);
                newSprite.name = `BadgeSprite_${id}`;
                agentUnit.avatarGroup.add(newSprite);
            }
        }
    }

    // ==========================================
    // AGENT WORKSTATION & ARTICULATED AVATAR
    // ==========================================

    syncAgents(agentList) {
        if (!this.webglAvailable) {
            this.render2DAgents(agentList);
            return;
        }

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

    _capsule(r, len, mat) {
        const pts = [];
        const half = len / 2;
        for (let i = 0; i <= 8; i++) {
            const a = -Math.PI / 2 + (i / 8) * (Math.PI / 2);
            pts.push(new THREE.Vector2(Math.max(Math.cos(a) * r, 0.0001), -half + Math.sin(a) * r));
        }
        for (let i = 0; i <= 8; i++) {
            const a = (i / 8) * (Math.PI / 2);
            pts.push(new THREE.Vector2(Math.max(Math.cos(a) * r, 0.0001), half + Math.sin(a) * r));
        }
        const m = new THREE.Mesh(new THREE.LatheGeometry(pts, 16), mat);
        m.castShadow = true;
        return m;
    }

    _ellipsoid(rx, ry, rz, mat, seg = 20) {
        const m = new THREE.Mesh(new THREE.SphereGeometry(1, seg, Math.max(8, Math.round(seg * 0.7))), mat);
        m.scale.set(rx, ry, rz);
        m.castShadow = true;
        return m;
    }

    buildAvatarRig(id, agent) {
        const avatarGroup = new THREE.Group();
        avatarGroup.name = `AvatarGroup_${id}`;
        avatarGroup.userData = { agentId: id, agentData: agent, isAvatar: true };

        const bodyRoot = new THREE.Group();
        bodyRoot.name = `BodyRoot_${id}`;
        avatarGroup.add(bodyRoot);

        // Gender distinction
        const rawGender = (agent.gender || '').toLowerCase();
        const isFemale = rawGender === 'female' || rawGender === 'perempuan' || rawGender === 'wanita';

        // ---------- Variasi per agent ----------
        const skinTones = isFemale 
            ? [0xF6D3B7, 0xE7B892, 0xCCA07A, 0x9B684C]
            : [0xF2C6A0, 0xE0A87C, 0xC68A5E, 0x8D5A3B];
        const hairTones = isFemale
            ? [0x221815, 0x503322, 0x1C1C22, 0x7E492B, 0x5C3B30]
            : [0x2B2118, 0x4A3222, 0x1E1E24, 0x7A4B28, 0x5B4636];
        const skinHex = skinTones[id % skinTones.length];
        const hairHex = hairTones[(id * 3 + 1) % hairTones.length];
        const avatarColorHex = agent.avatar_color ? parseInt(agent.avatar_color.replace('#', '0x'), 16) : (isFemale ? 0xec4899 : 0x4C6489);

        // ---------- Material ----------
        const hoodieMat = new THREE.MeshStandardMaterial({ color: avatarColorHex, roughness: 0.75 });
        const trimMat   = new THREE.MeshStandardMaterial({ color: new THREE.Color(avatarColorHex).multiplyScalar(0.78), roughness: 0.8 });
        const skinMat   = new THREE.MeshStandardMaterial({ color: skinHex, roughness: 0.55 });
        const hairMat   = new THREE.MeshStandardMaterial({ color: hairHex, roughness: 0.6 });
        const pantsMat  = new THREE.MeshStandardMaterial({ color: isFemale ? 0x2E3544 : 0x3A4252, roughness: 0.8 });
        const shoeMat   = new THREE.MeshStandardMaterial({ color: 0x3A4048, roughness: 0.5 });
        const soleMat   = new THREE.MeshStandardMaterial({ color: 0xEDE8DC, roughness: 0.6 });
        const creamMat  = new THREE.MeshStandardMaterial({ color: 0xEDE8DC, roughness: 0.5 });

        // ---------- Pinggul ----------
        const hips = this._ellipsoid(isFemale ? 0.25 : 0.27, 0.12, isFemale ? 0.18 : 0.19, pantsMat);
        hips.position.y = 0.58;
        bodyRoot.add(hips);

        // ---------- Kaki (nama pivot sama persis untuk animasi) ----------
        const makeLeg = (sx, side) => {
            const thighPivot = new THREE.Group();
            thighPivot.name = `${side}ThighPivot_${id}`;
            thighPivot.position.set(sx, 0.56, 0.02);
            bodyRoot.add(thighPivot);

            const thighRadius = isFemale ? 0.078 : 0.085;
            const calfRadius  = isFemale ? 0.062 : 0.070;

            const thigh = this._capsule(thighRadius, 0.13, pantsMat);
            thigh.position.y = -0.14;
            thighPivot.add(thigh);

            const knee = new THREE.Group();
            knee.name = `${side}KneePivot_${id}`;
            knee.position.y = -0.28;
            thighPivot.add(knee);

            const calf = this._capsule(calfRadius, 0.12, pantsMat);
            calf.position.y = -0.12;
            knee.add(calf);

            const shoe = new THREE.Group();
            shoe.position.set(0, -0.25, 0.04);
            knee.add(shoe);
            const upper = this._ellipsoid(isFemale ? 0.078 : 0.085, 0.055, 0.135, shoeMat);
            upper.position.set(0, 0, 0.01);
            shoe.add(upper);
            const sole = this._ellipsoid(isFemale ? 0.082 : 0.090, 0.02, 0.140, soleMat);
            sole.position.set(0, -0.045, 0.01);
            shoe.add(sole);
        };
        const legSpacing = isFemale ? 0.14 : 0.16;
        makeLeg(-legSpacing, 'Left');
        makeLeg(legSpacing, 'Right');

        // ---------- Torso ----------
        const spinePivot = new THREE.Group();
        spinePivot.name = `SpinePivot_${id}`;
        spinePivot.position.set(0, 0.58, 0);
        bodyRoot.add(spinePivot);

        const torso = this._capsule(isFemale ? 0.20 : 0.22, 0.2, hoodieMat);
        torso.scale.set(isFemale ? 1.18 : 1.3, 1, isFemale ? 0.78 : 0.85);
        torso.position.y = 0.31;
        spinePivot.add(torso);

        const hem = this._ellipsoid(isFemale ? 0.25 : 0.29, 0.04, isFemale ? 0.18 : 0.20, trimMat);
        hem.position.y = 0.02;
        spinePivot.add(hem);

        const hood = this._ellipsoid(isFemale ? 0.15 : 0.17, 0.11, 0.10, trimMat);
        hood.position.set(0, 0.64, -0.13);
        spinePivot.add(hood);

        const pocket = this._ellipsoid(isFemale ? 0.14 : 0.17, 0.07, 0.04, trimMat);
        pocket.position.set(0, 0.15, isFemale ? 0.16 : 0.18);
        spinePivot.add(pocket);

        [-0.045, 0.045].forEach(dx => {
            const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.12, 6), creamMat);
            cord.position.set(dx, 0.5, isFemale ? 0.165 : 0.175);
            spinePivot.add(cord);
        });

        const idBadge = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.14, 0.015), creamMat);
        idBadge.position.set(isFemale ? -0.12 : -0.14, 0.35, isFemale ? 0.175 : 0.185);
        spinePivot.add(idBadge);

        // ---------- Kepala ----------
        const headPivot = new THREE.Group();
        headPivot.name = `HeadPivot_${id}`;
        headPivot.position.set(0, 0.62, 0);
        spinePivot.add(headPivot);

        const neck = new THREE.Mesh(new THREE.CylinderGeometry(isFemale ? 0.065 : 0.075, isFemale ? 0.075 : 0.085, 0.12, 12), skinMat);
        neck.position.y = 0.04;
        headPivot.add(neck);

        const head = this._ellipsoid(isFemale ? 0.225 : 0.235, 0.250, isFemale ? 0.225 : 0.235, skinMat, 28);
        head.position.y = 0.33;
        head.name = `HeadMesh_${id}`;
        headPivot.add(head);

        [-1, 1].forEach(s => {
            const ear = this._ellipsoid(0.028, 0.042, 0.025, skinMat, 12);
            ear.position.set(s * (isFemale ? 0.222 : 0.232), 0.33, 0);
            headPivot.add(ear);
        });

        const nose = this._ellipsoid(isFemale ? 0.020 : 0.025, 0.026, 0.026, skinMat, 12);
        nose.position.set(0, 0.31, isFemale ? 0.228 : 0.235);
        headPivot.add(nose);

        // Mata: sklera + iris + highlight + eyelashes untuk perempuan
        const scleraMat = new THREE.MeshStandardMaterial({ color: 0xF6F3EC, roughness: 0.3 });
        const irisMat   = new THREE.MeshStandardMaterial({ color: 0x2B2118, roughness: 0.2 });
        const shineMat  = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });
        [-1, 1].forEach(s => {
            const eye = new THREE.Group();
            eye.name = s < 0 ? `EyeL_${id}` : `EyeR_${id}`;
            eye.position.set(s * 0.085, 0.36, isFemale ? 0.198 : 0.205);
            const white = this._ellipsoid(0.045, isFemale ? 0.055 : 0.052, 0.025, scleraMat, 14);
            const iris  = this._ellipsoid(0.028, isFemale ? 0.036 : 0.034, 0.015, irisMat, 12);
            iris.position.z = 0.02;
            const shine = this._ellipsoid(0.010, 0.010, 0.006, shineMat, 8);
            shine.position.set(0.012, 0.012, 0.034);
            eye.add(white, iris, shine);

            // Feminine eyelash wing
            if (isFemale) {
                const lash = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.009, 0.012), hairMat);
                lash.position.set(s * 0.035, 0.036, 0.022);
                lash.rotation.z = -s * 0.38;
                eye.add(lash);
            }

            headPivot.add(eye);

            const brow = new THREE.Mesh(
                new THREE.BoxGeometry(isFemale ? 0.065 : 0.075, isFemale ? 0.010 : 0.015, 0.012), 
                hairMat
            );
            brow.position.set(s * 0.085, 0.425, isFemale ? 0.195 : 0.20);
            brow.rotation.z = -s * (isFemale ? 0.08 : 0.12);
            headPivot.add(brow);

            // Rosy blush
            const cheek = this._ellipsoid(isFemale ? 0.040 : 0.035, 0.022, 0.01, new THREE.MeshStandardMaterial({
                color: isFemale ? 0xF2889B : 0xE89A8C, transparent: true, opacity: isFemale ? 0.60 : 0.45, roughness: 0.8
            }), 10);
            cheek.position.set(s * 0.14, 0.29, isFemale ? 0.180 : 0.185);
            cheek.rotation.y = s * 0.5;
            headPivot.add(cheek);
        });

        // Senyum
        const mouthMat = new THREE.MeshStandardMaterial({ 
            color: isFemale ? 0xBA4754 : 0x8A3B3B, 
            roughness: 0.5 
        });
        const mouth = new THREE.Mesh(
            new THREE.TorusGeometry(isFemale ? 0.042 : 0.045, isFemale ? 0.008 : 0.007, 6, 14, Math.PI),
            mouthMat
        );
        mouth.rotation.z = Math.PI;
        mouth.position.set(0, 0.245, isFemale ? 0.212 : 0.218);
        headPivot.add(mouth);

        // Rambut: Berdasarkan Gender
        if (isFemale) {
            // Female hair cap: graceful and slightly longer coverage
            const hairCap = new THREE.Mesh(
                new THREE.SphereGeometry(0.250, 28, 18, 0, Math.PI * 2, 0, Math.PI * 0.52),
                hairMat
            );
            hairCap.position.set(0, 0.35, -0.01);
            hairCap.rotation.x = -0.32;
            hairCap.castShadow = true;
            headPivot.add(hairCap);

            // Flowing back hair
            const hairBack = this._ellipsoid(0.25, 0.28, 0.22, hairMat);
            hairBack.position.set(0, 0.24, -0.08);
            headPivot.add(hairBack);

            // Feminine Hairstyles:
            if (id % 2 === 0) {
                // Style A: Long flowing twin locks / side strands falling in front of shoulders
                [-1, 1].forEach(s => {
                    const sideLock = this._capsule(0.045, 0.34, hairMat);
                    sideLock.position.set(s * 0.21, 0.14, 0.06);
                    sideLock.rotation.z = -s * 0.12;
                    headPivot.add(sideLock);
                });
                // Cute front bangs
                const bangs = this._ellipsoid(0.18, 0.05, 0.08, hairMat);
                bangs.position.set(0.02, 0.47, 0.16);
                bangs.rotation.z = -0.15;
                headPivot.add(bangs);
            } else {
                // Style B: High ponytail with accent scrunchie + soft side bangs
                const scrunchie = new THREE.Mesh(
                    new THREE.TorusGeometry(0.045, 0.018, 8, 16),
                    new THREE.MeshStandardMaterial({ color: PALETTE.accent.coral, roughness: 0.4 })
                );
                scrunchie.position.set(0, 0.56, -0.18);
                scrunchie.rotation.x = 0.6;
                headPivot.add(scrunchie);

                const ponyTail = this._capsule(0.065, 0.32, hairMat);
                ponyTail.position.set(0, 0.48, -0.28);
                ponyTail.rotation.x = -0.7;
                headPivot.add(ponyTail);

                const sideBangs = this._ellipsoid(0.19, 0.05, 0.09, hairMat);
                sideBangs.position.set(0.04, 0.48, 0.16);
                sideBangs.rotation.z = -0.22;
                headPivot.add(sideBangs);
            }
        } else {
            // Male hair styles:
            const hairCap = new THREE.Mesh(
                new THREE.SphereGeometry(0.255, 28, 18, 0, Math.PI * 2, 0, Math.PI * 0.48),
                hairMat
            );
            hairCap.position.set(0, 0.345, -0.01);
            hairCap.rotation.x = -0.35;
            hairCap.castShadow = true;
            headPivot.add(hairCap);

            const hairBack = this._ellipsoid(0.24, 0.19, 0.2, hairMat);
            hairBack.position.set(0, 0.30, -0.07);
            headPivot.add(hairBack);

            if (id % 2 === 0) {
                // Short modern textured quiff
                const quiff = this._ellipsoid(0.16, 0.06, 0.12, hairMat);
                quiff.position.set(0, 0.55, 0.08);
                quiff.rotation.x = 0.25;
                headPivot.add(quiff);
            } else {
                // Side-parted clean crop
                const fringe = this._ellipsoid(0.20, 0.05, 0.09, hairMat);
                fringe.position.set(0.04, 0.47, 0.16);
                fringe.rotation.z = -0.2;
                headPivot.add(fringe);
            }
        }

        // Headset (band melintasi atas kepala dari telinga ke telinga)
        const headsetMat = new THREE.MeshStandardMaterial({ color: isFemale ? 0x3A4454 : 0x2F3A4B, roughness: 0.4, metalness: 0.1 });
        const band = new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.022, 8, 28, Math.PI), headsetMat);
        band.position.set(0, 0.34, 0);
        headPivot.add(band);

        [-1, 1].forEach(s => {
            const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.05, 18), headsetMat);
            cup.rotation.z = Math.PI / 2;
            cup.position.set(s * 0.255, 0.34, 0);
            headPivot.add(cup);
        });

        const statusHex = agent.status === 'KERJA' ? PALETTE.accent.teal : PALETTE.accent.amber;
        const rgbMat = new THREE.MeshBasicMaterial({ color: statusHex });
        const rgbRingL = new THREE.Mesh(new THREE.RingGeometry(0.035, 0.06, 16), rgbMat);
        rgbRingL.rotation.y = -Math.PI / 2;
        rgbRingL.position.set(-0.283, 0.34, 0);
        rgbRingL.name = `RgbRingL_${id}`;
        headPivot.add(rgbRingL);

        const rgbRingR = rgbRingL.clone();
        rgbRingR.rotation.y = Math.PI / 2;
        rgbRingR.position.x = 0.283;
        rgbRingR.name = `RgbRingR_${id}`;
        headPivot.add(rgbRingR);

        // ---------- Lengan ----------
        const makeArm = (sx, side) => {
            const armPivot = new THREE.Group();
            armPivot.name = `${side}ArmPivot_${id}`;
            armPivot.position.set(sx, 0.56, 0);
            spinePivot.add(armPivot);

            const shoulderRadius = isFemale ? 0.068 : 0.075;
            const armRadius      = isFemale ? 0.050 : 0.058;
            const foreRadius     = isFemale ? 0.044 : 0.050;

            armPivot.add(this._ellipsoid(shoulderRadius, shoulderRadius, shoulderRadius, hoodieMat));

            const upper = this._capsule(armRadius, 0.164, hoodieMat);
            upper.position.y = -0.13;
            armPivot.add(upper);

            const elbow = new THREE.Group();
            elbow.name = `${side}ElbowPivot_${id}`;
            elbow.position.y = -0.26;
            armPivot.add(elbow);

            const fore = this._capsule(foreRadius, 0.14, hoodieMat);
            fore.position.y = -0.11;
            elbow.add(fore);

            const cuff = this._ellipsoid(foreRadius + 0.004, 0.025, foreRadius + 0.004, trimMat);
            cuff.position.y = -0.215;
            elbow.add(cuff);

            const hand = this._ellipsoid(isFemale ? 0.044 : 0.05, isFemale ? 0.050 : 0.055, 0.042, skinMat);
            hand.position.y = -0.25;
            elbow.add(hand);

            return elbow;
        };
        const armSpacing = isFemale ? 0.29 : 0.33;
        makeArm(-armSpacing, 'Left');
        const rightElbow = makeArm(armSpacing, 'Right');

        // Cangkir kopi di tangan kanan (aktif saat di lounge)
        const cup = new THREE.Group();
        cup.name = `CoffeeCup_${id}`;
        cup.position.set(0, -0.26, 0.08);
        const cupBody = new THREE.Mesh(
            new THREE.CylinderGeometry(0.06, 0.05, 0.12, 16),
            new THREE.MeshStandardMaterial({ color: PALETTE.accent.coral, roughness: 0.3 })
        );
        cupBody.castShadow = true;
        cup.add(cupBody);
        const handle = new THREE.Mesh(
            new THREE.TorusGeometry(0.035, 0.008, 6, 12, Math.PI),
            cupBody.material
        );
        handle.rotation.z = -Math.PI / 2;
        handle.position.set(0.06, 0, 0);
        cup.add(handle);
        const liquid = new THREE.Mesh(
            new THREE.CylinderGeometry(0.052, 0.052, 0.02, 14),
            new THREE.MeshStandardMaterial({ color: 0x3F2D1D, roughness: 0.2 })
        );
        liquid.position.y = 0.05;
        cup.add(liquid);
        const steam = new THREE.Mesh(
            new THREE.ConeGeometry(0.04, 0.12, 8),
            new THREE.MeshBasicMaterial({ color: 0xFFFFFF, transparent: true, opacity: 0.35 })
        );
        steam.position.y = 0.12;
        cup.add(steam);
        cup.visible = false;
        rightElbow.add(cup);

        // ---------- Badge nama + ring seleksi ----------
        const badgeSprite = this.createTextBadgeSprite(agent.name, agent.role, agent.status);
        badgeSprite.position.set(0, 2.35, 0);
        badgeSprite.name = `BadgeSprite_${id}`;
        avatarGroup.add(badgeSprite);

        const ring = new THREE.Mesh(
            new THREE.RingGeometry(1.4, 1.55, 32),
            new THREE.MeshBasicMaterial({ color: PALETTE.accent.teal, side: THREE.DoubleSide, transparent: true, opacity: 0.85 })
        );
        ring.rotation.x = -Math.PI / 2;
        ring.position.y = 0.03;
        ring.visible = false;
        ring.name = `SelectRing_${id}`;
        avatarGroup.add(ring);

        avatarGroup.traverse(child => {
            if (child.isMesh) child.userData.parentAgentId = id;
        });

        return avatarGroup;
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

        // Desk Surface (T5: PALETTE.wood = 0xc7b8a0 warm blonde wood)
        const deskTop = new THREE.Mesh(
            new THREE.BoxGeometry(2.4, 0.1, 1.3),
            new THREE.MeshStandardMaterial({ color: isLight ? PALETTE.wood : 0x334155, roughness: 0.35 })
        );
        deskTop.position.y = 1.05;
        deskTop.castShadow = true;
        deskTop.receiveShadow = true;
        deskTop.name = `DeskTop_${id}`;
        deskGroup.add(deskTop);

        // Sleek Minimalist Steel Desk Legs (T3: PALETTE.dark = 0x2f3a4b avoids pure black)
        const legMat = new THREE.MeshStandardMaterial({ color: PALETTE.dark, metalness: 0.6, roughness: 0.4 });
        const legOffsets = [
            [-1.1, 0.525, -0.55],
            [1.1, 0.525, -0.55],
            [-1.1, 0.525, 0.55],
            [1.1, 0.525, 0.55]
        ];
        legOffsets.forEach(pos => {
            const leg = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.05, 0.06), legMat);
            leg.position.set(...pos);
            leg.castShadow = true;
            deskGroup.add(leg);
        });

        // Open & Airy Workstation (Subtle low rim)
        const divider = new THREE.Mesh(
            new THREE.BoxGeometry(2.35, 0.12, 0.03),
            new THREE.MeshStandardMaterial({ color: isLight ? 0xb5a58d : 0x475569, roughness: 0.6 })
        );
        divider.position.set(0, 1.15, -0.62);
        deskGroup.add(divider);

        // Desk Mat / Mousepad (T3: PALETTE.rack = 0x46546b)
        const deskMat = new THREE.Mesh(
            new THREE.BoxGeometry(1.6, 0.01, 0.55),
            new THREE.MeshStandardMaterial({ color: isLight ? PALETTE.rack : 0x212632, roughness: 0.8 })
        );
        deskMat.position.set(0, 1.105, 0.32);
        deskGroup.add(deskMat);

        // Laptop Base (T3: PALETTE.dark = 0x2f3a4b)
        const laptopBase = new THREE.Mesh(
            new THREE.BoxGeometry(0.65, 0.03, 0.45),
            new THREE.MeshStandardMaterial({ color: PALETTE.dark, metalness: 0.7, roughness: 0.3 })
        );
        laptopBase.position.set(0, 1.11, 0.20);
        laptopBase.castShadow = true;
        deskGroup.add(laptopBase);

        // Glowing Laptop Screen with IDE Code Editor Texture (T10: PALETTE.accent.teal)
        const isWorking = agent.status === 'KERJA';
        const laptopScreenMat = new THREE.MeshStandardMaterial({
            map: this.cachedTextures.codeEditor,
            emissiveMap: this.cachedTextures.codeEditor,
            emissive: isWorking ? PALETTE.accent.teal : 0x000000,
            emissiveIntensity: isWorking ? 0.75 : 0.0,
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
            emissive: isWorking ? PALETTE.accent.teal : 0x000000,
            emissiveIntensity: isWorking ? 0.75 : 0.0,
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

        // Ergonomic Office Swivel Chair with Terracotta/Orange Fabric Cushions (T8: PALETTE.accentChair)
        const chairCushionColor = isLight ? PALETTE.accentChair : (agent.avatar_color ? parseInt(agent.avatar_color.replace('#', '0x'), 16) : PALETTE.accent.teal);
        const chair = new THREE.Group();
        chair.position.set(0, 0, 0.95);

        const seat = new THREE.Mesh(
            new THREE.BoxGeometry(0.75, 0.12, 0.7),
            new THREE.MeshStandardMaterial({ color: chairCushionColor, roughness: 0.6 })
        );
        seat.position.y = 0.65;
        seat.castShadow = true;
        chair.add(seat);

        const back = new THREE.Mesh(
            new THREE.BoxGeometry(0.7, 0.75, 0.1),
            new THREE.MeshStandardMaterial({ color: chairCushionColor, roughness: 0.5 })
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
        // T7: Tame metalness on desk
        this.tameMetalness(deskGroup);
        this.officeGroup.add(deskGroup);

                // 2. AVATAR (rig membulat, pivot bernama sama dengan versi lama)
        const avatarGroup = this.buildAvatarRig(id, agent);
        this.tameMetalness?.(avatarGroup);
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

        if (agent.status === 'IDLE' || agent.status === 'PAUSED') {
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
     * Applies attentive conference sitting posture at the War Room meeting table
     */
    applyMeetingSittingPose(agentUnit) {
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
            spine.rotation.set(0.04, 0, 0);
            spine.position.set(0, 0.58, 0);
        }

        if (head) head.rotation.set(-0.05, 0, 0);

        // Arms resting attentively on conference table
        if (armL) armL.rotation.set(-0.65, 0.15, 0.05);
        if (elbowL) elbowL.rotation.set(-0.55, 0, 0);
        if (armR) armR.rotation.set(-0.65, -0.15, -0.05);
        if (elbowR) elbowR.rotation.set(-0.55, 0, 0);

        if (coffeeCup) coffeeCup.visible = false;
    }

    /**
     * Applies natural standing idle/interaction posture while visiting office objects
     */
    applyVisitingObjectPose(agentUnit, strollSpot) {
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

        g.position.y = 0;

        if (thighL) thighL.rotation.set(0.04, 0, -0.04);
        if (kneeL) kneeL.rotation.set(0.02, 0, 0);
        if (thighR) thighR.rotation.set(-0.04, 0, 0.04);
        if (kneeR) kneeR.rotation.set(0.02, 0, 0);

        if (spine) {
            spine.rotation.set(0.02, 0, 0);
            spine.position.set(0, 0.58, 0);
        }

        if (strollSpot && strollSpot.holdingCup) {
            // Standing holding coffee mug at coffee bar counter
            if (armR) armR.rotation.set(-0.50, -0.15, 0.20);
            if (elbowR) elbowR.rotation.set(-0.80, 0, 0);
            if (armL) armL.rotation.set(0.05, 0, -0.12);
            if (elbowL) elbowL.rotation.set(-0.25, 0, 0);
            if (coffeeCup) coffeeCup.visible = true;
            if (head) head.rotation.set(0.05, 0, 0);
        } else {
            // Thoughtfully observing board/screen/servers
            if (armL) armL.rotation.set(0.08, 0, -0.12);
            if (elbowL) elbowL.rotation.set(-0.25, 0, 0);
            if (armR) armR.rotation.set(0.08, 0, 0.12);
            if (elbowR) elbowR.rotation.set(-0.25, 0, 0);
            if (coffeeCup) coffeeCup.visible = false;
            if (head) head.rotation.set(-0.12, 0, 0);
        }
    }

    /**
     * Checks if an agent has finished all assigned tasks or is in standby/idle mode
     */
    isAgentTaskFinished(agent) {
        if (!agent) return true;
        if (agent.status === 'IDLE' || agent.status === 'PAUSED') return true;

        if (typeof agent.pending_tasks_count !== 'undefined' && parseInt(agent.pending_tasks_count) === 0) {
            return true;
        }

        if (agent.current_task) {
            const t = agent.current_task.toLowerCase();
            if (t.includes('selesai') || t.includes('standby') || t.includes('menunggu') || t.includes('istirahat') || t.includes('idle')) {
                return true;
            }
        }
        return false;
    }

    /**
     * Updates an existing agent and handles WALKING TRANSITIONS between Desk & Rest Area!
     */
    updateAgentWorkstation(id, agent) {
        if (!this.webglAvailable) {
            if (this.rawAgentsList) {
                const idx = this.rawAgentsList.findIndex(a => a.id == id);
                if (idx !== -1) {
                    this.rawAgentsList[idx] = agent;
                } else {
                    this.rawAgentsList.push(agent);
                }
                this.render2DAgents(this.rawAgentsList);
            }
            return;
        }

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

        // Update Screen glow (T10: PALETTE.accent.teal)
        const isWorking = agent.status === 'KERJA';
        const isIdle = agent.status === 'IDLE' || agent.status === 'PAUSED';
        const statusAccentHex = isWorking ? PALETTE.accent.teal : (isIdle ? PALETTE.accent.amber : PALETTE.accent.coral);

        const screen = agentUnit.deskGroup.getObjectByName(`Screen_${id}`);
        if (screen) {
            screen.material.emissive.setHex(isWorking ? PALETTE.accent.teal : 0x000000);
            screen.material.emissiveIntensity = isWorking ? 0.75 : 0.0;
        }

        const monitor = agentUnit.deskGroup.getObjectByName(`Monitor_${id}`);
        if (monitor) {
            monitor.material.emissive.setHex(isWorking ? PALETTE.accent.teal : 0x000000);
            monitor.material.emissiveIntensity = isWorking ? 0.75 : 0.0;
        }

        // Update RGB headset ring
        const rgbL = agentUnit.avatarGroup.getObjectByName(`RgbRingL_${id}`);
        const rgbR = agentUnit.avatarGroup.getObjectByName(`RgbRingR_${id}`);
        if (rgbL) rgbL.material.color.setHex(statusAccentHex);
        if (rgbR) rgbR.material.color.setHex(statusAccentHex);

        // Update text badge sprite
        const oldSprite = agentUnit.avatarGroup.getObjectByName(`BadgeSprite_${id}`);
        if (oldSprite) {
            agentUnit.avatarGroup.remove(oldSprite);
            if (oldSprite.material.map) oldSprite.material.map.dispose();
            oldSprite.material.dispose();

            const newSprite = this.createTextBadgeSprite(agent.name, agent.role, agent.status);
            newSprite.position.set(0, 2.35, 0);
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

        const isRestTarget = targetStatus === 'IDLE' || targetStatus === 'PAUSED';
        const isWorkTarget = targetStatus === 'KERJA';

        const needsWalkToRest = isRestTarget && (currentPhysicalState === 'WORKING' || currentPhysicalState === 'WALKING_TO_DESK' || currentPhysicalState === 'VISITING_OBJECT' || currentPhysicalState === 'WALKING_TO_OBJECT');
        const needsWalkToDesk = isWorkTarget && (currentPhysicalState === 'RESTING' || currentPhysicalState === 'WALKING_TO_REST' || currentPhysicalState === 'VISITING_OBJECT' || currentPhysicalState === 'WALKING_TO_OBJECT');

        if (needsWalkToRest) {
            this.startAgentLocomotion(agentUnit, targetStatus);
        } else if (needsWalkToDesk) {
            this.startAgentLocomotion(agentUnit, 'KERJA');
        }
    }

    /**
     * Returns bounding boxes for all office static obstacles (furniture, walls, equipment)
     */
    getStaticObstacles(ignoreTargetId = null, currentAgentId = null) {
        const list = [
            // Center Low Planter Credenza Divider (x: [-0.34, 0.34], z: [1.1, 4.9])
            { name: 'Planter Credenza', minX: -0.45, maxX: 0.45, minZ: 0.95, maxZ: 5.05 },
            // Meeting Room Architectural Glass Enclosure (allowed if character is entering conference chair)
            ...((!ignoreTargetId || !ignoreTargetId.startsWith('meet_chair')) ? [{ name: 'Meeting Room', minX: -12.0, maxX: -3.4, minZ: -12.0, maxZ: -5.9 }] : []),
            // Back Server Hub & Infrastructure
            { name: 'Server Racks', minX: 6.6, maxX: 9.8, minZ: -11.5, maxZ: -9.5 },
            // Coffee Bar Counter
            { name: 'Coffee Counter', minX: 7.2, maxX: 10.4, minZ: 5.0, maxZ: 6.2 },
            // Lounge Central Coffee Table
            { name: 'Coffee Table', minX: 2.95, maxX: 4.65, minZ: 6.75, maxZ: 7.65 },
            // Potted Plants
            { name: 'Plant 1', minX: -11.0, maxX: -10.0, minZ: 4.0, maxZ: 5.0 },
            { name: 'Plant 2', minX: 10.0, maxX: 11.0, minZ: -4.0, maxZ: -3.0 },
            { name: 'Plant 3', minX: -2.0, maxX: -1.0, minZ: -10.0, maxZ: -9.0 },
            { name: 'Plant 4', minX: -2.0, maxX: -1.0, minZ: 6.0, maxZ: 7.0 },
        ];

        // Lounge Seating Furniture (blocked unless character is sitting down on this specific item)
        if (!ignoreTargetId || !ignoreTargetId.startsWith('sofa_front')) {
            list.push({ name: 'Front Sofa', minX: 2.8, maxX: 4.8, minZ: 5.02, maxZ: 6.08 });
        }
        if (!ignoreTargetId || !ignoreTargetId.startsWith('sofa_main')) {
            list.push({ name: 'Main Sofa', minX: 2.4, maxX: 5.2, minZ: 8.32, maxZ: 9.38 });
        }
        if (!ignoreTargetId || !ignoreTargetId.startsWith('sofa_armchair_left')) {
            list.push({ name: 'Left Armchair', minX: 1.02, maxX: 2.08, minZ: 6.62, maxZ: 7.78 });
        }
        if (!ignoreTargetId || !ignoreTargetId.startsWith('sofa_armchair_right')) {
            list.push({ name: 'Right Armchair', minX: 5.52, maxX: 6.58, minZ: 6.62, maxZ: 7.78 });
        }

        // Active Workstation Desks (w: 2.4 x d: 1.3)
        // An agent's OWN desk must NEVER be an obstacle to themselves!
        if (this.agents) {
            this.agents.forEach(agentUnit => {
                const aData = agentUnit.userData ? agentUnit.userData.agentData : null;
                if (!aData) return;
                const aId = agentUnit.id;
                if (currentAgentId && aId === currentAgentId) return; // Always ignore own desk
                if (ignoreTargetId && ignoreTargetId === `Desk_${aId}`) return;
                const dx = parseFloat(aData.desk_x) || 0;
                const dz = parseFloat(aData.desk_z) || 0;
                list.push({
                    name: `Desk_${aId}`,
                    minX: dx - 1.25,
                    maxX: dx + 1.25,
                    minZ: dz - 0.70,
                    maxZ: dz + 0.70
                });
            });
        }

        return list;
    }

    /**
     * Smooth continuous collision resolver with tangential sliding along obstacle surfaces
     */
    resolveObstacleCollision(curPos, moveX, moveZ, radius = 0.28, ignoreTargetId = null, currentAgentId = null) {
        const obstacles = this.getStaticObstacles(ignoreTargetId, currentAgentId);
        const isBlocked = (x, z) => {
            if (x < -11.5 || x > 11.5 || z < -11.5 || z > 11.5) return true;
            for (let i = 0; i < obstacles.length; i++) {
                const obs = obstacles[i];
                if (x + radius > obs.minX && x - radius < obs.maxX &&
                    z + radius > obs.minZ && z - radius < obs.maxZ) {
                    return true;
                }
            }
            return false;
        };

        const dist = Math.hypot(moveX, moveZ);
        if (dist < 0.0001) return { x: curPos.x, z: curPos.z, moved: false };

        const nextX = curPos.x + moveX;
        const nextZ = curPos.z + moveZ;

        // 1. Direct step
        if (!isBlocked(nextX, nextZ)) {
            return { x: nextX, z: nextZ, moved: true, evaded: false };
        }

        // 2. Whisker Evasion: search candidate angular departures to actively find an exit route around the obstacle
        const baseAngle = Math.atan2(moveX, moveZ);
        const angles = [
            Math.PI / 8,   -Math.PI / 8,   // +-22.5 deg
            Math.PI / 4,   -Math.PI / 4,   // +-45 deg
            Math.PI * 3/8, -Math.PI * 3/8, // +-67.5 deg
            Math.PI / 2,   -Math.PI / 2,   // +-90 deg (slide along obstacle surface)
            Math.PI * 5/8, -Math.PI * 5/8  // +-112.5 deg (detour)
        ];

        for (let i = 0; i < angles.length; i++) {
            const testAngle = baseAngle + angles[i];
            const testX = curPos.x + Math.sin(testAngle) * dist;
            const testZ = curPos.z + Math.cos(testAngle) * dist;
            if (!isBlocked(testX, testZ)) {
                return { x: testX, z: testZ, moved: true, evaded: true, angle: testAngle };
            }
        }

        // 3. Single-axis sliding fallback
        if (!isBlocked(nextX, curPos.z)) {
            return { x: nextX, z: curPos.z, moved: true, evaded: true };
        }
        if (!isBlocked(curPos.x, nextZ)) {
            return { x: curPos.x, z: nextZ, moved: true, evaded: true };
        }

        // 4. Blocked completely
        return { x: curPos.x, z: curPos.z, moved: false, evaded: false };
    }

    /**
     * Calculates guaranteed 100% collision-free corridor waypoints between desk and lounge
     */
    planAgentRoute(startPos, targetPos, mode, agentUnit, targetObject) {
        const waypoints = [];
        const spotId = targetObject ? (targetObject.id || '') : '';

        // Step A: Getting onto the Central Walkway Spine (z = 0.0)
        const onCentralWalkway = Math.abs(startPos.z - 0.0) < 0.25;

        if (!onCentralWalkway) {
            if (startPos.z > 5.0) {
                // Coming from Lounge
                if (spotId.startsWith('stool') && mode === 'KERJA') {
                    waypoints.push(new THREE.Vector3(startPos.x, 0, 4.4));
                    waypoints.push(new THREE.Vector3(6.6, 0, 4.4));
                    waypoints.push(new THREE.Vector3(6.6, 0, 0.0));
                } else {
                    if (startPos.z > 8.0) {
                        waypoints.push(new THREE.Vector3(startPos.x, 0, 7.95));
                        waypoints.push(new THREE.Vector3(2.45, 0, 7.95));
                        waypoints.push(new THREE.Vector3(2.45, 0, 5.3));
                    } else if (startPos.z > 6.5) {
                        waypoints.push(new THREE.Vector3(2.45, 0, startPos.z));
                        waypoints.push(new THREE.Vector3(2.45, 0, 5.3));
                    } else {
                        waypoints.push(new THREE.Vector3(2.45, 0, 5.3));
                    }
                    waypoints.push(new THREE.Vector3(0.0, 0, 5.3));
                    waypoints.push(new THREE.Vector3(-3.0, 0, 5.3));
                    waypoints.push(new THREE.Vector3(-3.0, 0, 0.0));
                }
            } else if (Math.abs(startPos.z - (-4.2)) < 0.3) {
                // Coming from Back Corridor
                const transitX = startPos.x > 3.0 ? 6.6 : -3.0;
                waypoints.push(new THREE.Vector3(transitX, 0, -4.2));
                waypoints.push(new THREE.Vector3(transitX, 0, 0.0));
            } else if (Math.abs(startPos.z - 4.2) < 0.3 && startPos.x > 6.0) {
                // Coming from Coffee Bar Stroll Spot
                waypoints.push(new THREE.Vector3(6.6, 0, 4.2));
                waypoints.push(new THREE.Vector3(6.6, 0, 0.0));
            } else {
                // Coming from Desk chair
                waypoints.push(new THREE.Vector3(startPos.x, 0, 0.0));
            }
        }

        // Step B: Route from Central Walkway (z = 0.0) to Destination
        if (mode === 'KERJA') {
            // Going to Desk Seat
            waypoints.push(new THREE.Vector3(targetPos.x, 0, 0.0));
            waypoints.push(new THREE.Vector3(targetPos.x, 0, targetPos.z));
        } else if (mode === 'IDLE' || mode === 'TO_REST' || mode === true) {
            // Going to Lounge
            if (spotId.startsWith('stool')) {
                waypoints.push(new THREE.Vector3(6.6, 0, 0.0));
                waypoints.push(new THREE.Vector3(6.6, 0, 4.4));
                waypoints.push(new THREE.Vector3(targetPos.x, 0, 4.4));
                waypoints.push(new THREE.Vector3(targetPos.x, 0, targetPos.z));
            } else {
                waypoints.push(new THREE.Vector3(-3.0, 0, 0.0));
                waypoints.push(new THREE.Vector3(-3.0, 0, 5.3));
                waypoints.push(new THREE.Vector3(0.0, 0, 5.3));

                if (spotId === 'sofa_front') {
                    waypoints.push(new THREE.Vector3(2.45, 0, 5.3));
                    waypoints.push(new THREE.Vector3(targetPos.x, 0, targetPos.z));
                } else if (spotId === 'sofa_armchair_left') {
                    waypoints.push(new THREE.Vector3(2.45, 0, 5.3));
                    waypoints.push(new THREE.Vector3(2.45, 0, 7.2));
                    waypoints.push(new THREE.Vector3(targetPos.x, 0, targetPos.z));
                } else if (spotId === 'sofa_armchair_right') {
                    waypoints.push(new THREE.Vector3(2.45, 0, 5.3));
                    waypoints.push(new THREE.Vector3(2.45, 0, 7.95));
                    waypoints.push(new THREE.Vector3(5.1, 0, 7.95));
                    waypoints.push(new THREE.Vector3(5.1, 0, 7.2));
                    waypoints.push(new THREE.Vector3(targetPos.x, 0, targetPos.z));
                } else if (spotId.startsWith('sofa_main')) {
                    waypoints.push(new THREE.Vector3(2.45, 0, 5.3));
                    waypoints.push(new THREE.Vector3(2.45, 0, 7.95));
                    waypoints.push(new THREE.Vector3(targetPos.x, 0, 7.95));
                    waypoints.push(new THREE.Vector3(targetPos.x, 0, targetPos.z));
                } else {
                    waypoints.push(new THREE.Vector3(2.45, 0, 5.3));
                    waypoints.push(new THREE.Vector3(targetPos.x, 0, targetPos.z));
                }
            }
        } else if (mode === 'STROLL') {
            // Going to Stroll Object
            if (targetPos.z === -4.2) {
                const transitX = targetPos.x > 3.0 ? 6.6 : -3.0;
                waypoints.push(new THREE.Vector3(transitX, 0, 0.0));
                waypoints.push(new THREE.Vector3(transitX, 0, -4.2));
                waypoints.push(new THREE.Vector3(targetPos.x, 0, -4.2));
            } else if (spotId === 'spot_coffee_bar') {
                waypoints.push(new THREE.Vector3(6.6, 0, 0.0));
                waypoints.push(new THREE.Vector3(6.6, 0, 4.2));
                waypoints.push(new THREE.Vector3(targetPos.x, 0, 4.2));
            } else {
                // Along central walkway
                waypoints.push(new THREE.Vector3(targetPos.x, 0, 0.0));
            }
        }

        return waypoints;
    }

    /**
     * Initiates smooth live walking locomotion with intelligent collision-free office waypoints
     */
    startAgentLocomotion(agentUnit, targetStatus, extraTarget = null) {
        const id = agentUnit.id;
        const agent = agentUnit.userData.agentData;
        const nav = agentUnit.navigation;
        const curPos = agentUnit.avatarGroup.position;

        // Prevent network race conditions or stale SSE from interrupting the walk
        nav.lockUntil = Date.now() + 8500;
        agent.status = targetStatus === 'STROLL' ? 'IDLE' : targetStatus;

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

        if (targetStatus === 'IDLE' || targetStatus === 'PAUSED') {
            if (nav.targetSpot) nav.targetSpot = null;
            const restSpot = this.getOrCreateRestSpotForAgent(id);
            nav.restSpot = restSpot;
            nav.state = 'WALKING_TO_REST';
            nav.targetRot = restSpot.rotY;

            nav.waypoints = this.planAgentRoute(curPos, new THREE.Vector3(restSpot.x, 0, restSpot.z), 'IDLE', agentUnit, restSpot);
            nav.waypointIndex = 0;
            nav.targetPos.copy(nav.waypoints[0]);

            console.log(`[Kantor Virtual 3D] Agent #${id} (${agent.name}) santai sejenak berjalan ke Lounge...`);

        } else if (targetStatus === 'STROLL') {
            if (nav.restSpot) {
                this.freeRestSpotForAgent(id);
                nav.restSpot = null;
            }
            const strollSpot = extraTarget || this.strollSpots[Math.floor(Math.random() * this.strollSpots.length)];
            nav.targetSpot = strollSpot;
            nav.state = 'WALKING_TO_OBJECT';
            nav.targetRot = strollSpot.rotY;

            nav.waypoints = this.planAgentRoute(curPos, new THREE.Vector3(strollSpot.x, 0, strollSpot.z), 'STROLL', agentUnit, strollSpot);
            nav.waypointIndex = 0;
            nav.targetPos.copy(nav.waypoints[0]);

            console.log(`[Kantor Virtual 3D] Agent #${id} (${agent.name}) berjalan-jalan santai ke ${strollSpot.name}...`);

        } else if (targetStatus === 'KERJA') {
            const prevSpot = nav.restSpot || nav.targetSpot;
            if (nav.restSpot) {
                this.freeRestSpotForAgent(id);
                nav.restSpot = null;
            }
            nav.targetSpot = null;
            const deskSeat = this.getDeskSeatTransform(deskX, deskZ, rotY);
            nav.state = 'WALKING_TO_DESK';
            nav.targetRot = deskSeat.rotY;

            nav.waypoints = this.planAgentRoute(curPos, deskSeat.pos, 'KERJA', agentUnit, prevSpot);
            nav.waypointIndex = 0;
            nav.targetPos.copy(nav.waypoints[0]);

            console.log(`[Kantor Virtual 3D] Agent #${id} (${agent.name}) kembali ke Meja Kerja melalui koridor aman...`);

        } else if (targetStatus === 'MEETING') {
            const meetingSpot = extraTarget || this.getFreeMeetingSpot();
            if (meetingSpot) {
                meetingSpot.taken = true;
                meetingSpot.agentId = id;
                nav.meetingSpot = meetingSpot;
                nav.state = 'WALKING_TO_MEETING';
                nav.targetRot = meetingSpot.rotY;

                const waypoints = [];
                // 1. To central spine
                if (curPos.z > 2.0) {
                    waypoints.push(new THREE.Vector3(curPos.x, 0, 5.0));
                    waypoints.push(new THREE.Vector3(-3.0, 0, 5.0));
                    waypoints.push(new THREE.Vector3(-3.0, 0, 0.0));
                } else if (curPos.z < -2.0) {
                    waypoints.push(new THREE.Vector3(curPos.x, 0, -4.2));
                    waypoints.push(new THREE.Vector3(-3.0, 0, -4.2));
                } else {
                    waypoints.push(new THREE.Vector3(-3.0, 0, 0.0));
                }
                // 2. To meeting room entrance doorway
                waypoints.push(new THREE.Vector3(-3.0, 0, -5.5));
                waypoints.push(new THREE.Vector3(-4.5, 0, -6.5));
                // 3. To designated conference chair
                waypoints.push(new THREE.Vector3(meetingSpot.x, 0, meetingSpot.z));

                nav.waypoints = waypoints;
                nav.waypointIndex = 0;
                nav.targetPos.copy(waypoints[0]);

                console.log(`[Kantor Virtual 3D] Agent #${id} (${agent.name}) berjalan ke Ruang Rapat: ${meetingSpot.name}...`);
            }
        }
    }

    getFreeMeetingSpot() {
        if (!this.meetingSpots || this.meetingSpots.length === 0) return null;
        return this.meetingSpots.find(s => !s.taken) || this.meetingSpots[0];
    }

    startTeamMeeting(agentIds, topic) {
        if (!this.webglAvailable) return;
        this.updateMeetingTVScreen(topic);
        this.focusMeetingRoom();

        agentIds.forEach(id => {
            const agentUnit = this.agents.get(Number(id));
            if (agentUnit) {
                const freeSpot = this.getFreeMeetingSpot();
                if (freeSpot) {
                    this.startAgentLocomotion(agentUnit, 'MEETING', freeSpot);
                }
            }
        });
    }

    endTeamMeeting() {
        if (!this.webglAvailable) return;
        if (this.meetingSpots) {
            this.meetingSpots.forEach(s => { s.taken = false; s.agentId = null; });
        }
        this.resetMeetingTVScreen();
        for (const [id, agentUnit] of this.agents.entries()) {
            const nav = agentUnit.navigation;
            if (nav && (nav.state === 'IN_MEETING' || nav.state === 'WALKING_TO_MEETING')) {
                nav.meetingSpot = null;
                this.startAgentLocomotion(agentUnit, 'KERJA');
            }
        }
    }

    focusMeetingRoom() {
        if (!this.webglAvailable) return;
        this.targetLookAt.set(-7.5, 1.8, -8.75);
    }

    interactWithCat() {
        const cat = this.officeGroup ? this.officeGroup.getObjectByName('OfficeMascotCat') : null;
        if (!cat) return;

        const startY = cat.position.y;
        let t = 0;
        const jumpAnim = () => {
            t += 0.08;
            cat.position.y = startY + Math.sin(t * Math.PI) * 0.45;
            cat.rotation.y += 0.15;
            if (t < 1.0) {
                requestAnimationFrame(jumpAnim);
            } else {
                cat.position.y = startY;
                cat.rotation.y = -Math.PI / 4;
            }
        };
        jumpAnim();

        if (window.officeAudio && typeof window.officeAudio.playMeow === 'function') {
            window.officeAudio.playMeow();
        }

        if (window.app && typeof window.app.showToast === 'function') {
            window.app.showToast('🐱 Meow! Si Belang (Mascot Kucing HQ) mengeong gembira!', 'info');
        }
    }

    setAgentStatus(agentId, newStatus) {
        if (!this.webglAvailable) {
            this.set2DAgentStatus(agentId, newStatus);
            return;
        }

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
        canvas.width = 160;
        canvas.height = 160;
        const ctx = canvas.getContext('2d');
        const isLight = this.currentTheme === 'light';

        const isWorking = status === 'KERJA';
        const isIdle = status === 'IDLE' || status === 'PAUSED';
        // T10: Teal (#3FA796) for KERJA, Amber (#E0A84B) for IDLE/PAUSED, Coral (#E07A5F) for error
        const statusColor = isWorking ? '#3fa796' : (isIdle ? '#e0a84b' : '#e07a5f');

        // Extract 1 to 3 uppercase initials (e.g. KA, RH, BPP, M, T, BE, KL, Y, BS, AB)
        const parts = name.trim().split(/\s+/).filter(Boolean);
        let initials = '';
        if (parts.length === 1) {
            initials = parts[0].slice(0, 2).toUpperCase();
        } else if (parts.length === 2) {
            initials = (parts[0][0] + parts[1][0]).toUpperCase();
        } else {
            initials = (parts[0][0] + parts[1][0] + parts[2][0]).toUpperCase();
        }

        // Soft drop shadow
        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.22)';
        ctx.shadowBlur = 12;
        ctx.shadowOffsetY = 4;

        // Clean white rounded card
        const x = 16, y = 16, w = 128, h = 128, r = 26;
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

        ctx.fillStyle = isLight ? '#ffffff' : '#0f172a';
        ctx.fill();
        ctx.restore();

        // Subtle outer border
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = isLight ? '#e2e8f0' : statusColor;
        ctx.stroke();

        // Initials Text (Clean bold uppercase matching reference image)
        ctx.font = '900 ' + (initials.length >= 3 ? '44px' : '52px') + ' "Inter", "Segoe UI", sans-serif';
        ctx.fillStyle = isLight ? '#1e293b' : '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(initials, 80, 80);

        // Small circular status dot
        ctx.fillStyle = statusColor;
        ctx.beginPath();
        ctx.arc(118, 36, 7.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = isLight ? '#ffffff' : '#0f172a';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        const texture = new THREE.CanvasTexture(canvas);
        if (THREE.SRGBColorSpace) texture.colorSpace = THREE.SRGBColorSpace;
        else if (THREE.sRGBEncoding) texture.encoding = THREE.sRGBEncoding;
        texture.minFilter = THREE.LinearFilter;

        const spriteMat = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
            depthTest: false
        });
        const sprite = new THREE.Sprite(spriteMat);
        sprite.scale.set(0.9, 0.9, 1.0);
        return sprite;
    }

    // ==========================================
    // SELECTION & CAMERA TWEENING
    // ==========================================

    selectAgent(id, triggerCallback = true) {
        if (!this.webglAvailable) {
            this.select2DAgent(id, triggerCallback);
            return;
        }

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
        if (!this.webglAvailable) {
            this.selectedAgentId = null;
            document.querySelectorAll('#office-2d-workstations > div').forEach(el => {
                el.classList.remove('border-blue-500', 'ring-2', 'ring-blue-500/30', 'dark:ring-blue-400/40', 'shadow-md');
                el.classList.add('border-slate-200', 'dark:border-white/5');
            });
            return;
        }

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
        if (!this.webglAvailable) return false;
        this.isAutoRotating = !this.isAutoRotating;
        return this.isAutoRotating;
    }

    zoomIn() {
        if (!this.webglAvailable) return;
        this.camera.zoom = Math.min(3.5, this.camera.zoom * 1.25);
        this.camera.updateProjectionMatrix();
    }

    zoomOut() {
        if (!this.webglAvailable) return;
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

                // Check for Mascot Cat or Meeting Room / TV click
                let p = hit.object;
                while (p) {
                    if (p.name === 'OfficeMascotCat' || (p.userData && p.userData.isCat)) {
                        this.interactWithCat();
                        return;
                    }
                    if (p.name === 'MeetingRoomTV' || (p.userData && (p.userData.isMeetingTV || p.userData.isMeetingRoom))) {
                        this.focusMeetingRoom();
                        if (window.app && typeof window.app.openWarRoomModal === 'function') {
                            window.app.openWarRoomModal();
                        }
                        return;
                    }
                    p = p.parent;
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

                // Cute Office Cat Mascot Dynamic Roaming Locomotion & Animation
        if (this.catGroup && this.catState) {
            this.updateCatLocomotion(delta, elapsedTime);
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

            const eyeL = avatarGroup.getObjectByName(`EyeL_${id}`);
            const eyeR = avatarGroup.getObjectByName(`EyeR_${id}`);
            if (eyeL && eyeR) {
                const blink = ((elapsedTime * 0.5 + id * 1.7) % 4) > 3.88 ? 0.1 : 1;
                eyeL.scale.y = blink;
                eyeR.scale.y = blink;
            }

            // Selection spotlight & camera tracking following selected agent
            if (this.selectedAgentId === id) {
                this.selectionLight.position.x = avatarGroup.position.x;
                this.selectionLight.position.z = avatarGroup.position.z;
                if (navigation.state === 'WALKING_TO_REST' || navigation.state === 'WALKING_TO_DESK' || navigation.state === 'WALKING_TO_OBJECT') {
                    this.targetLookAt.set(avatarGroup.position.x, 1.2, avatarGroup.position.z);
                }
            }

            // AUTONOMOUS LOUNGE & STROLL SCHEDULER FOR FINISHED / IDLE / PAUSED AGENTS
            const isPaused = agent.status === 'PAUSED';
            const isTaskDone = this.isAgentTaskFinished(agent);

            // If agent is PAUSED, ensure their position is the Sofa Lounge!
            if (isPaused) {
                if (navigation.state !== 'RESTING' && navigation.state !== 'WALKING_TO_REST') {
                    if (!navigation.lockUntil || Date.now() > navigation.lockUntil) {
                        this.startAgentLocomotion(agentUnit, 'PAUSED');
                    }
                }
            }
            // If agent has active work assigned (and is NOT paused), return to desk immediately!
            else if (!isTaskDone && (navigation.state === 'RESTING' || navigation.state === 'VISITING_OBJECT' || navigation.state === 'WALKING_TO_REST' || navigation.state === 'WALKING_TO_OBJECT')) {
                if (!navigation.lockUntil || Date.now() > navigation.lockUntil) {
                    this.startAgentLocomotion(agentUnit, 'KERJA');
                }
            }
            // If agent has finished tasks (and is NOT paused), autonomously stroll or relax in lounge periodically
            else if (isTaskDone) {
                if (!navigation.autonomousTimer) {
                    navigation.autonomousTimer = 10.0 + (id * 5.0) % 18.0;
                }

                if (navigation.state === 'WORKING' || navigation.state === 'RESTING' || navigation.state === 'VISITING_OBJECT') {
                    navigation.autonomousTimer -= delta;

                    if (navigation.autonomousTimer <= 0) {
                        if (navigation.state === 'WORKING') {
                            // 60% chance Lounge, 40% chance stroll to another office object
                            if (Math.random() < 0.60) {
                                this.startAgentLocomotion(agentUnit, 'IDLE');
                            } else {
                                const randomSpot = this.strollSpots[Math.floor(Math.random() * this.strollSpots.length)];
                                this.startAgentLocomotion(agentUnit, 'STROLL', randomSpot);
                            }
                            navigation.autonomousTimer = 25.0 + Math.random() * 25.0;
                        } else if (navigation.state === 'RESTING') {
                            // From lounge: 40% stroll to another object, 60% return to desk
                            if (Math.random() < 0.40) {
                                const randomSpot = this.strollSpots[Math.floor(Math.random() * this.strollSpots.length)];
                                this.startAgentLocomotion(agentUnit, 'STROLL', randomSpot);
                                navigation.autonomousTimer = 20.0 + Math.random() * 20.0;
                            } else {
                                this.startAgentLocomotion(agentUnit, 'KERJA');
                                navigation.autonomousTimer = 20.0 + Math.random() * 25.0;
                            }
                        } else if (navigation.state === 'VISITING_OBJECT') {
                            // From stroll object: 50% relax in lounge, 50% return to desk
                            if (Math.random() < 0.50) {
                                this.startAgentLocomotion(agentUnit, 'IDLE');
                                navigation.autonomousTimer = 25.0 + Math.random() * 25.0;
                            } else {
                                this.startAgentLocomotion(agentUnit, 'KERJA');
                                navigation.autonomousTimer = 20.0 + Math.random() * 25.0;
                            }
                        }
                    }
                }
            }

            // 1. WALKING LOCOMOTION (Traveling between Workstation & Lounge with Waypoints)
            if (navigation.state === 'WALKING_TO_REST' || navigation.state === 'WALKING_TO_DESK' || navigation.state === 'WALKING_TO_OBJECT') {
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
                    // Base comfortable walking speed
                    const moveSpeed = 3.0;
                    const step = Math.min(dist, moveSpeed * delta);
                    let moveX = (dx / dist) * step;
                    let moveZ = (dz / dist) * step;

                    // Multi-agent mutual separation avoidance
                    if (this.agents) {
                        this.agents.forEach(otherUnit => {
                            if (otherUnit.id === id) return;
                            const otherPos = otherUnit.avatarGroup.position;
                            const sepDist = Math.hypot(curPos.x - otherPos.x, curPos.z - otherPos.z);
                            if (sepDist > 0.001 && sepDist < 1.15) {
                                const pushFactor = (1.15 - sepDist) * 1.5 * delta;
                                moveX += ((curPos.x - otherPos.x) / sepDist) * pushFactor;
                                moveZ += ((curPos.z - otherPos.z) / sepDist) * pushFactor;
                            }
                        });
                    }

                    // Mascot Cat avoidance (gentle polite lateral steering)
                    if (this.catGroup) {
                        const catPos = this.catGroup.position;
                        const catDist = Math.hypot(curPos.x - catPos.x, curPos.z - catPos.z);
                        if (catDist > 0.001 && catDist < 1.25) {
                            const catPush = (1.25 - catDist) * 1.8 * delta;
                            moveX += ((curPos.x - catPos.x) / catDist) * catPush;
                            moveZ += ((curPos.z - catPos.z) / catDist) * catPush;
                        }
                    }

                    const prevX = curPos.x;
                    const prevZ = curPos.z;

                    // Robust obstacle collision sliding with Whisker Evasion & own desk clearance
                    const ignoreTarget = (navigation.state === 'WALKING_TO_REST' && navigation.restSpot) ? navigation.restSpot.id : null;
                    const resolved = this.resolveObstacleCollision(curPos, moveX, moveZ, 0.28, ignoreTarget, id);
                    curPos.x = resolved.x;
                    curPos.z = resolved.z;

                    // Measure actual spatial displacement to prevent walking in place
                    const actualDist = Math.hypot(curPos.x - prevX, curPos.z - prevZ);

                    if (actualDist > 0.001) {
                        navigation.stuckTimer = 0;
                        // Leg swing only when character actually moves forward
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
                        // Character blocked by obstacle: DO NOT walk in place!
                        curPos.y = 0;
                        if (thighL) thighL.rotation.set(0, 0, 0);
                        if (kneeL) kneeL.rotation.set(0, 0, 0);
                        if (thighR) thighR.rotation.set(0, 0, 0);
                        if (kneeR) kneeR.rotation.set(0, 0, 0);
                        if (armL) armL.rotation.set(0, 0, 0);
                        if (armR) armR.rotation.set(0, 0, 0);

                        // Anti-Stuck Watchdog: automatically look for an exit or advance waypoint
                        navigation.stuckTimer = (navigation.stuckTimer || 0) + delta;
                        if (navigation.stuckTimer > 0.8) {
                            if (navigation.waypoints && navigation.waypointIndex < navigation.waypoints.length - 1) {
                                navigation.waypointIndex++;
                                console.log(`[Kantor Virtual 3D] Agent #${id} mencari jalan keluar (advance waypoint ke #${navigation.waypointIndex})`);
                            } else {
                                curPos.x = currentWp.x;
                                curPos.z = currentWp.z;
                            }
                            navigation.stuckTimer = 0;
                        }
                    }

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
                        } else if (navigation.state === 'WALKING_TO_OBJECT') {
                            navigation.state = 'VISITING_OBJECT';
                            this.applyVisitingObjectPose(agentUnit, navigation.targetSpot);
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

            // 2b. VISITING OBJECT STATE (Interacting with Coffee Bar, Whiteboard, Meeting Glass, etc.)
            else if (navigation.state === 'VISITING_OBJECT') {
                const spot = navigation.targetSpot;
                curPos.y = 0;

                if (spine) {
                    spine.rotation.z = Math.sin(elapsedTime * 0.9 + id) * 0.02;
                    spine.position.y = 0.58 + Math.sin(elapsedTime * 2.0 + id) * 0.01;
                }

                if (spot && spot.holdingCup) {
                    // Periodic coffee sipping motion at espresso counter
                    const sipPhase = (elapsedTime + id * 2.0) % 7.5;
                    if (sipPhase > 5.5 && sipPhase < 7.0) {
                        const sipLift = Math.sin(((sipPhase - 5.5) / 1.5) * Math.PI);
                        if (armR) armR.rotation.x = -0.50 - sipLift * 0.35;
                        if (elbowR) elbowR.rotation.x = -0.80 - sipLift * 0.25;
                        if (head) head.rotation.x = 0.05 - sipLift * 0.12;
                    } else {
                        if (armR) armR.rotation.x = -0.50;
                        if (elbowR) elbowR.rotation.x = -0.80;
                        if (head) head.rotation.x = 0.05;
                    }
                } else {
                    // Looking around thoughtfully at notice board or meeting room
                    if (head) {
                        head.rotation.y = Math.sin(elapsedTime * 0.7 + id) * 0.28;
                        head.rotation.x = -0.10 + Math.sin(elapsedTime * 1.1 + id) * 0.05;
                    }
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
    /**
     * Traverses the scene and audits materials outside safe luminance range (0.08 to 0.90)
     * (Snippet 6.3 in task-improve-office.md)
     */
    auditMaterials(min = 0.08, max = 0.90) {
        const flagged = [];
        if (!this.scene) return flagged;
        this.scene.traverse((o) => {
            if (!o.isMesh || !o.material || !o.material.color) return;
            const L = relLuminance(o.material.color);
            if (L < min || L > max) {
                flagged.push({
                    name: o.name || o.uuid,
                    colorHex: '#' + o.material.color.getHexString(),
                    luminance: +L.toFixed(3),
                    issue: L < min ? 'TERLALU GELAP (< 0.08)' : 'TERLALU TERANG (> 0.90)'
                });
            }
        });
        if (typeof console !== 'undefined' && console.table) {
            console.log(`[Virtual Office QA] Material Luminance Audit (Safe: ${min} - ${max}):`);
            console.table(flagged);
        }
        return flagged;
    }

}
