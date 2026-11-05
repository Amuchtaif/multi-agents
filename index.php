<!DOCTYPE html>
<html lang="id" class="h-full">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Virtual Office Amuchtaif</title>

    <!-- Theme check script to avoid flash of theme mismatch -->
    <script>
        const savedTheme = localStorage.getItem('kantor_theme') || 'light';
        if (savedTheme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    </script>

    <!-- Tailwind CSS CDN -->
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = {
            darkMode: 'class',
            theme: {
                extend: {
                    colors: {
                        brand: {
                            50: '#eff6ff',
                            500: '#3b82f6',
                            600: '#2563eb',
                            700: '#1d4ed8',
                        }
                    }
                }
            }
        }
    </script>

    <!-- Font Awesome 6 -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">

    <!-- Custom CSS -->
    <link rel="stylesheet" href="assets/css/style.css?v=<?= @filemtime(__DIR__ . '/assets/css/style.css') ?: time() ?>">

    <!-- Three.js & OrbitControls (Local with CDN fallback) -->
    <script src="assets/vendor/three.min.js"></script>
    <script src="assets/vendor/OrbitControls.js"></script>
</head>
<body class="h-full flex flex-col bg-slate-50 dark:bg-[#090d16] text-slate-800 dark:text-slate-100 antialiased select-none transition-colors duration-200">

    <!-- ================================================================= -->
    <!-- 1. TOP NAVBAR / HEADER                                            -->
    <!-- ================================================================= -->
    <header class="h-16 glass-panel border-b border-slate-200 dark:border-white/10 px-4 flex items-center justify-between z-30 shrink-0">
        <!-- Logo & Title -->
        <div class="flex items-center gap-3.5">
            <div class="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-md shadow-blue-500/25 text-white border border-blue-500/30 shrink-0">
                <i class="fa-solid fa-building-user text-lg"></i>
            </div>
            <div>
                <div class="flex items-center gap-2">
                    <h1 class="font-extrabold text-base tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                        Virtual Office Amuchtaif
                        <span class="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-blue-100 dark:bg-cyan-950 text-blue-700 dark:text-cyan-400 border border-blue-200 dark:border-cyan-800/50">v2.0 3D</span>
                    </h1>
                </div>
                <p class="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block">3D Isometric AI Agent Monitoring & Orchestration Dashboard</p>
            </div>
        </div>

        <!-- Global Stat Counters -->
        <div class="hidden lg:flex items-center gap-2">
            <div class="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-white/5 font-mono text-xs shadow-sm">
                <span class="text-slate-500 dark:text-slate-400 text-[10px] uppercase font-sans font-semibold">Agents:</span>
                <span id="stat-total-agents" class="font-bold text-slate-900 dark:text-white">-</span>
                <span class="text-slate-300 dark:text-slate-600">|</span>
                <span class="text-emerald-600 dark:text-emerald-400 text-[10px] uppercase font-sans font-semibold flex items-center gap-1">
                    <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 pulse-green"></span>
                    Kerja:
                </span>
                <span id="stat-working-agents" class="font-bold text-emerald-600 dark:text-emerald-400">-</span>
            </div>

            <div id="card-token-metrics" 
                 class="relative flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-white/5 font-mono text-xs shadow-sm transition-all hover:border-purple-400/50 hover:shadow-md cursor-pointer select-none" 
                 onclick="window.app.openCostCalculatorModal()" 
                 title="Total Token LLM Terkonsumsi. Klik untuk membuka Kalkulator Biaya & Budget Alert.">
                <!-- Floating Real AI Increment Pop Badge -->
                <span id="token-increment-badge" class="absolute -top-3 right-2 opacity-0 pointer-events-none px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-purple-600 text-white shadow-lg shadow-purple-500/40 z-30 transition-all flex items-center gap-1">
                    <i class="fa-solid fa-bolt text-[9px]"></i>
                    <span id="token-increment-text">+0</span>
                </span>

                <div class="flex items-center gap-1.5">
                    <span id="token-card-live-dot" class="w-2 h-2 rounded-full bg-purple-500 pulse-purple hidden"></span>
                    <i id="token-card-icon" class="fa-solid fa-bolt text-blue-500 dark:text-cyan-400 transition-colors"></i>
                    <span class="text-slate-500 dark:text-slate-400 text-[10px] uppercase font-sans font-semibold">Token:</span>
                </div>

                <div class="flex items-center gap-1.5">
                    <span id="stat-total-tokens" class="font-extrabold text-blue-600 dark:text-cyan-300 transition-all">0</span>
                    <span id="token-ai-live-badge" class="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase bg-purple-500/15 text-purple-600 dark:text-purple-300 border border-purple-500/30 hidden">
                        Live AI
                    </span>
                </div>
            </div>

            <div class="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-white/5 font-mono text-xs shadow-sm">
                <span class="text-slate-500 dark:text-slate-400 text-[10px] uppercase font-sans font-semibold"><i class="fa-solid fa-circle-check text-emerald-500 mr-1"></i>Selesai:</span>
                <span id="stat-tasks-done" class="font-bold text-emerald-600 dark:text-emerald-300">0</span>
            </div>
        </div>

        <!-- Live Status & Action Toolbar -->
        <div class="flex items-center gap-2 sm:gap-2.5">
            <!-- SSE Status Indicator (Dynamic by Status) -->
            <div id="sse-status-badge" class="hidden md:flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-white/10 shadow-sm transition-all" title="Status koneksi real-time Server-Sent Events (SSE)">
                <span id="sse-status-dot" class="w-2 h-2 rounded-full bg-emerald-500 pulse-green"></span>
                <span id="sse-status-text" class="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">Live SSE • Real AI</span>
            </div>

            <!-- AI Mode Toggle: Real AI Live vs Simulasi -->
            <button id="btn-toggle-simulation"
                    class="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 border border-purple-500/30 dark:border-purple-500/40 flex items-center gap-2 shadow-sm transition-all cursor-pointer"
                    title="Beralih antara Real AI Live Mode (LLM Nyata) dan Mode Simulasi">
                <i id="mode-toggle-icon" class="fa-solid fa-bolt text-purple-600 dark:text-purple-400"></i>
                <span id="mode-toggle-text" class="hidden sm:inline">Real AI Live</span>
                <span id="mode-toggle-badge" class="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase bg-purple-500/20 text-purple-600 dark:text-purple-300 border border-purple-500/30">Aktif</span>
            </button>

            <!-- REAL AI SETTINGS BUTTON -->
            <button id="btn-open-ai-settings" onclick="window.app.openAISettingsModal()"
                    class="px-2.5 sm:px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-white/10 flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                    title="Pengaturan Real AI, Model LLM, dan API Key">
                <i class="fa-solid fa-brain text-purple-600 dark:text-purple-400"></i>
                <span class="hidden sm:inline">Pengaturan AI</span>
                <span id="ai-active-provider-badge" class="px-1.5 py-0.2 rounded text-[9px] font-mono uppercase bg-purple-500/15 text-purple-600 dark:text-purple-300 font-bold border border-purple-500/30">Gemini</span>
            </button>

            <!-- Divider -->
            <div class="h-6 w-px bg-slate-200 dark:bg-white/10 hidden sm:block"></div>

            <!-- Audio Ambience SFX Button -->
            <button id="btn-toggle-ambience" onclick="window.app.toggleAudioAmbience()"
                    class="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 border border-slate-200 dark:border-white/10 flex items-center justify-center gap-1 shadow-sm transition-all cursor-pointer"
                    title="Audio Ambience: Hening (Klik untuk Mengaktifkan SFX)">
                <i class="fa-solid fa-volume-xmark text-xs"></i>
            </button>

            <!-- THEME SWITCHER BUTTON (Icon Only) -->
            <button id="btn-toggle-theme" 
                    class="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-white/10 flex items-center justify-center shadow-sm transition-all cursor-pointer"
                    title="Ubah tema tampilan (Terang / Gelap)">
                <i id="theme-toggle-icon" class="fa-solid fa-sun text-amber-500 text-sm"></i>
            </button>

            <!-- 3D Camera Controls Toolbar -->
            <div class="hidden sm:flex items-center bg-white dark:bg-slate-900/90 rounded-lg border border-slate-200 dark:border-white/10 p-0.5 shadow-sm">
                <button id="btn-toggle-autorotate" class="w-8 h-8 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white text-xs transition-colors" title="Toggle Rotasi Otomatis 360°">
                    <i class="fa-solid fa-arrows-rotate"></i>
                </button>
                <button id="btn-reset-cam" class="w-8 h-8 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white text-xs transition-colors" title="Reset Sudut Kamera">
                    <i class="fa-solid fa-camera-rotate"></i>
                </button>
                <button id="btn-zoom-in" class="w-8 h-8 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white text-xs transition-colors" title="Perbesar (Zoom In)">
                    <i class="fa-solid fa-magnifying-glass-plus"></i>
                </button>
                <button id="btn-zoom-out" class="w-8 h-8 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white text-xs transition-colors" title="Perkecil (Zoom Out)">
                    <i class="fa-solid fa-magnifying-glass-minus"></i>
                </button>
                <button id="btn-toggle-fullscreen" onclick="window.app.toggle3DFullscreen()" class="w-8 h-8 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white text-xs transition-colors cursor-pointer" title="Fokus 3D Office (Layar Penuh)">
                    <i class="fa-solid fa-expand"></i>
                </button>
            </div>

            <!-- "+ Agent Baru" Button -->
            <button onclick="window.app.openCreateAgentModal()"
                    class="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-md shadow-blue-500/25 flex items-center gap-1.5 transition-all cursor-pointer">
                <i class="fa-solid fa-user-plus text-xs"></i>
                <span>+ Agent Baru</span>
            </button>
        </div>
    </header>

    <!-- ================================================================= -->
    <!-- 2. MAIN WORKSPACE (LEFT FEED + 3D CANVAS + RIGHT TASKS)            -->
    <!-- ================================================================= -->
    <div class="flex-1 flex overflow-hidden relative">

        <!-- ============================================================= -->
        <!-- LEFT SIDEBAR: LIVE ACTIVITY FEED                              -->
        <!-- ============================================================= -->
        <aside class="w-80 sm:w-84 glass-panel border-r border-slate-200 dark:border-white/10 flex flex-col z-20 shrink-0">
            <!-- Feed Header -->
            <div class="p-3 border-b border-slate-200 dark:border-white/10 flex items-center justify-between bg-slate-100/70 dark:bg-slate-950/60 backdrop-blur-sm">
                <div class="flex items-center gap-2">
                    <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 pulse-green"></span>
                    <h2 class="font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200">Live Activity Feed</h2>
                    <span id="log-count-badge" class="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-semibold bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300">0</span>
                </div>
                <div class="flex items-center gap-1.5">
                    <button id="btn-clear-logs" 
                            class="text-[11px] font-semibold text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 px-2 py-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-slate-200/80 dark:border-white/5 hover:border-rose-200 dark:hover:border-rose-800/40 flex items-center gap-1.5 transition-all shadow-xs" 
                            title="Bersihkan Semua Log">
                        <i class="fa-solid fa-trash-can text-[10px]"></i>
                        <span>Clear</span>
                    </button>
                </div>
            </div>

            <!-- Agent Filter Pills -->
            <div class="px-3 py-2 border-b border-slate-200/80 dark:border-white/5 bg-slate-50/50 dark:bg-slate-900/30">
                <div id="log-filter-pills" class="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                    <!-- Dynamic agent pills generated via app.js -->
                </div>
            </div>

            <!-- Real-Time Log Scroll Stream -->
            <div id="activity-feed-container" class="flex-1 overflow-y-auto p-2.5 space-y-2.5">
                <!-- Log items rendered dynamically -->
            </div>
        </aside>

        <!-- ============================================================= -->
        <!-- CENTER: 3D ISOMETRIC VIRTUAL OFFICE CANVAS                    -->
        <!-- ============================================================= -->
        <main class="flex-1 relative overflow-hidden bg-slate-200/70 dark:bg-slate-950">
            <!-- Three.js Canvas Container -->
            <div id="threejs-canvas-container" class="w-full h-full"></div>

            <!-- Floating Fullscreen 3D Controls (Visible only in Fullscreen 3D Focus Mode) -->
            <div id="fullscreen-3d-floating-controls" class="hidden absolute top-4 left-1/2 -translate-x-1/2 z-40 items-center gap-1.5 p-1.5 rounded-2xl glass-panel-elevated border border-slate-200/90 dark:border-white/15 shadow-2xl backdrop-blur-md">
                <div class="flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold text-slate-700 dark:text-slate-200 border-r border-slate-200/80 dark:border-white/10 mr-0.5">
                    <span class="w-2 h-2 rounded-full bg-emerald-500 pulse-green"></span>
                    <span>3D Focus HQ</span>
                </div>
                <button onclick="window.app.toggleAutorotate()" class="w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center text-xs transition-colors cursor-pointer" title="Toggle Rotasi 360°">
                    <i class="fa-solid fa-arrows-rotate"></i>
                </button>
                <button onclick="window.app.resetCamera()" class="w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center text-xs transition-colors cursor-pointer" title="Reset Sudut Kamera">
                    <i class="fa-solid fa-camera-rotate"></i>
                </button>
                <button onclick="window.app.zoomIn()" class="w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center text-xs transition-colors cursor-pointer" title="Perbesar (Zoom In)">
                    <i class="fa-solid fa-magnifying-glass-plus"></i>
                </button>
                <button onclick="window.app.zoomOut()" class="w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center text-xs transition-colors cursor-pointer" title="Perkecil (Zoom Out)">
                    <i class="fa-solid fa-magnifying-glass-minus"></i>
                </button>
                <button onclick="window.app.exit3DFullscreen()" class="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center gap-1.5 shadow-md shadow-blue-500/25 transition-all cursor-pointer" title="Keluar dari Layar Penuh (ESC)">
                    <i class="fa-solid fa-compress text-xs"></i>
                    <span>Keluar Fullscreen</span>
                </button>
            </div>

            <!-- Floating Live Meeting Tracker HUD Overlay (War Room) -->
            <div id="floating-meeting-tracker" class="hidden absolute top-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 px-4 py-2 rounded-2xl glass-panel-elevated border border-indigo-500/40 shadow-2xl backdrop-blur-md max-w-xl transition-all duration-300">
                <div class="flex items-center gap-2.5 shrink-0">
                    <span id="floating-meeting-pulse" class="w-2.5 h-2.5 rounded-full bg-rose-500 pulse-red animate-pulse"></span>
                    <div>
                        <div class="flex items-center gap-1.5">
                            <span id="floating-meeting-badge" class="text-[9px] font-mono uppercase font-bold px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/20">LIVE WAR ROOM</span>
                            <span id="floating-meeting-round" class="text-[9px] font-mono text-slate-500 dark:text-slate-400">Diskusi Aktif</span>
                        </div>
                        <div id="floating-meeting-topic" class="text-xs font-bold text-slate-800 dark:text-white max-w-[210px] truncate" title="Topik Rapat">
                            Topik Rapat Tim
                        </div>
                    </div>
                </div>

                <div class="h-6 w-px bg-slate-200 dark:bg-white/10 shrink-0"></div>

                <!-- Action Controls -->
                <div class="flex items-center gap-1.5 shrink-0">
                    <button type="button" onclick="window.app.openWarRoomLiveView()"
                            class="px-2.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-semibold flex items-center gap-1.5 shadow-sm shadow-indigo-600/20 transition-all cursor-pointer"
                            title="Buka dialog transkrip & notulensi rapat">
                        <i class="fa-solid fa-comments"></i>
                        <span id="floating-meeting-transcript-btn">Transkrip & Notulensi</span>
                    </button>
                    <button type="button" onclick="window.app.focusMeetingRoom3D()"
                            class="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs transition-colors cursor-pointer"
                            title="Fokus Kamera 3D ke Ruang Rapat & TV">
                        <i class="fa-solid fa-video"></i>
                    </button>
                    <button type="button" onclick="window.app.endActiveMeeting()"
                            class="p-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 text-xs transition-colors cursor-pointer"
                            title="Bubarkan Rapat & Kembali ke Meja">
                        <i class="fa-solid fa-power-off"></i>
                    </button>
                </div>
            </div>

            <!-- Hover Canvas Tooltip -->
            <div id="canvas-tooltip" class="absolute top-4 left-4 glass-panel-elevated p-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-xs shadow-xl opacity-0 pointer-events-none transition-opacity duration-150 z-10 max-w-xs"></div>

            <!-- Selected Agent Floating HUD Overlay -->
            <div id="selected-agent-hud" class="hidden absolute top-4 right-4 glass-panel-elevated p-3.5 rounded-2xl border border-blue-500/30 dark:border-cyan-500/30 shadow-2xl z-10 w-72 backdrop-blur-md">
                <div class="flex items-start justify-between mb-2">
                    <div>
                        <div class="flex items-center gap-2">
                            <span id="hud-agent-name" class="font-bold text-slate-900 dark:text-white text-sm">Nama Agent</span>
                            <span id="hud-agent-status" class="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">KERJA</span>
                        </div>
                        <div id="hud-agent-role" class="text-xs text-slate-500 dark:text-slate-400 font-medium">Role / Department</div>
                        <div id="hud-agent-location" class="text-[10px] font-medium mt-0.5"></div>
                        <div id="hud-agent-project" class="hidden text-[10px] text-amber-600 dark:text-amber-400 font-mono mt-0.5 truncate">
                            <i class="fa-solid fa-folder-tree mr-1 text-[9px]"></i><span class="project-path"></span>
                        </div>
                    </div>
                    <button onclick="window.app.closeAgentQuickHud()" class="text-slate-400 hover:text-slate-600 dark:hover:text-white text-xs p-1">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                </div>

                <div class="text-[11px] text-slate-700 dark:text-slate-300 bg-slate-100/90 dark:bg-slate-900/80 p-2 rounded-lg border border-slate-200/80 dark:border-white/5 mb-3">
                    <div class="text-[9px] uppercase font-bold text-blue-600 dark:text-cyan-400 mb-0.5">Tugas Berjalan:</div>
                    <div id="hud-agent-task" class="line-clamp-2">Deskripsi tugas</div>
                </div>

                <div class="flex items-center justify-between text-[10px] font-mono text-slate-500 dark:text-slate-400 mb-3">
                    <span>Model: <span id="hud-agent-model" class="text-slate-800 dark:text-white font-semibold">gemini-1.5-flash</span></span>
                    <button class="text-blue-600 dark:text-cyan-400 hover:underline font-sans font-semibold" 
                            onclick="window.app.openAgentInspectorModal(window.app.selectedAgent.id)">
                        Detail Lengkap &rarr;
                    </button>
                </div>

                <div class="grid grid-cols-2 gap-1.5 mb-2.5">
                    <button class="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs text-center shadow-sm transition-colors"
                            onclick="window.app.openAgentInspectorModal(window.app.selectedAgent.id)">
                        <i class="fa-solid fa-sliders mr-1"></i> Konfigurasi
                    </button>
                    <button class="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium text-xs text-center border border-slate-200 dark:border-white/10 transition-colors"
                            onclick="window.app.quickToggleAgentStatus(window.app.selectedAgent.id)">
                        <i class="fa-solid fa-play-pause mr-1"></i> Status
                    </button>
                </div>

                <!-- Direct Real AI Prompt Console -->
                <div class="pt-2 border-t border-slate-200/80 dark:border-white/5">
                    <div class="text-[9px] uppercase font-bold text-purple-600 dark:text-purple-400 mb-1 flex items-center justify-between">
                        <span><i class="fa-solid fa-wand-magic-sparkles mr-1"></i> Perintah Real AI:</span>
                    </div>
                    <div class="flex items-center gap-1.5">
                        <input id="hud-direct-prompt-input" type="text" placeholder="Beri instruksi langsung ke AI..." 
                               onkeydown="if(event.key === 'Enter') window.app.sendDirectPromptFromHud()"
                               class="flex-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-lg px-2.5 py-1 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-purple-500 shadow-xs">
                        <button onclick="window.app.sendDirectPromptFromHud()" 
                                id="btn-hud-send-prompt"
                                class="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-xs flex items-center justify-center transition-colors"
                                title="Kirim instruksi ke Real AI">
                            <i class="fa-solid fa-paper-plane text-[10px]"></i>
                        </button>
                    </div>
                </div>
            </div>

            <!-- 3D Navigation Controls Hint (HUD Overlay bottom-center) -->
            <div id="canvas-3d-hint" class="absolute bottom-3 left-1/2 -translate-x-1/2 glass-panel px-3.5 py-1 rounded-full border border-slate-200 dark:border-white/10 text-[11px] text-slate-600 dark:text-slate-400 pointer-events-none flex items-center gap-3 font-medium shadow-sm">
                <span><i class="fa-solid fa-computer-mouse text-blue-500 dark:text-cyan-400 mr-1"></i> Klik meja untuk fokus</span>
                <span>•</span>
                <span><i class="fa-solid fa-hand text-indigo-500 dark:text-indigo-400 mr-1"></i> Drag untuk putar 360°</span>
                <span>•</span>
                <span><i class="fa-solid fa-magnifying-glass text-emerald-500 dark:text-blue-400 mr-1"></i> Scroll untuk zoom</span>
            </div>
        </main>

        <!-- ============================================================= -->
        <!-- RIGHT SIDEBAR: BACKLOG & TASK MANAGEMENT                      -->
        <!-- ============================================================= -->
        <aside class="w-80 glass-panel border-l border-slate-200 dark:border-white/10 flex flex-col z-20 shrink-0">
            <!-- Tasks Header -->
            <div class="p-3 border-b border-slate-200 dark:border-white/10 flex items-center justify-between bg-slate-100/50 dark:bg-slate-950/40">
                <div class="flex items-center gap-2">
                    <i class="fa-solid fa-list-check text-indigo-600 dark:text-indigo-400 text-sm"></i>
                    <h2 class="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">Backlog & Penugasan</h2>
                </div>
                <div class="flex items-center gap-1.5">
                    <button onclick="window.app.openDeleteAllTasksModal()"
                            id="btn-delete-all-tasks"
                            class="px-2 py-1 rounded-md bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50 text-[11px] font-semibold transition-colors flex items-center gap-1 shadow-xs cursor-pointer"
                            title="Hapus semua tugas di seluruh backlog">
                        <i class="fa-solid fa-trash-can text-[10px]"></i> Hapus
                    </button>
                    <button onclick="window.app.openCreateTaskModal('ide_nanti')"
                            class="px-2 py-1 rounded-md bg-indigo-600 hover:bg-indigo-700 text-[11px] font-semibold text-white transition-colors flex items-center gap-1 shadow-sm cursor-pointer">
                        <i class="fa-solid fa-plus text-[10px]"></i> Tugas
                    </button>
                </div>
            </div>

            <!-- Categorized Task Lists -->
            <div class="flex-1 overflow-y-auto p-3 space-y-4">

                <!-- 1. Category: Deadline Dekat -->
                <div>
                    <div class="flex items-center justify-between mb-1.5">
                        <div class="flex items-center gap-1.5 text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wide">
                            <span class="w-2 h-2 rounded-full bg-rose-500"></span>
                            Deadline Dekat
                            <span id="count-deadline-dekat" class="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-500/15 text-rose-600 dark:text-rose-300 border border-rose-500/30">0</span>
                        </div>
                        <button onclick="window.app.openCreateTaskModal('deadline_dekat')" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-xs">
                            <i class="fa-solid fa-plus"></i>
                        </button>
                    </div>
                    <div id="tasks-deadline-dekat" class="space-y-1.5">
                        <!-- Tasks rendered here -->
                    </div>
                </div>

                <!-- 2. Category: Nunggu Owner (Human in the loop) -->
                <div>
                    <div class="flex items-center justify-between mb-1.5">
                        <div class="flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wide">
                            <span class="w-2 h-2 rounded-full bg-amber-500"></span>
                            Nunggu Owner
                            <span id="count-nunggu-owner" class="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500/15 text-amber-600 dark:text-amber-300 border border-amber-500/30">0</span>
                        </div>
                        <button onclick="window.app.openCreateTaskModal('nunggu_owner')" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-xs">
                            <i class="fa-solid fa-plus"></i>
                        </button>
                    </div>
                    <div id="tasks-nunggu-owner" class="space-y-1.5">
                        <!-- Tasks rendered here -->
                    </div>
                </div>

                <!-- 3. Category: Ide / Nanti -->
                <div>
                    <div class="flex items-center justify-between mb-1.5">
                        <div class="flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide">
                            <span class="w-2 h-2 rounded-full bg-blue-500"></span>
                            Ide / Nanti
                            <span id="count-ide-nanti" class="px-1.5 py-0.2 rounded-full text-[10px] bg-blue-500/15 text-blue-600 dark:text-blue-300 border border-blue-500/30">0</span>
                        </div>
                        <button onclick="window.app.openCreateTaskModal('ide_nanti')" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-xs">
                            <i class="fa-solid fa-plus"></i>
                        </button>
                    </div>
                    <div id="tasks-ide-nanti" class="space-y-1.5">
                        <!-- Tasks rendered here -->
                    </div>
                </div>

            </div>
        </aside>

    </div>

    <!-- ================================================================= -->
    <!-- 3. FOOTER GRID: AGENT STATUS CARDS & BULK CONTROLS                -->
    <!-- ================================================================= -->
    <footer class="glass-panel border-t border-slate-200 dark:border-white/10 p-3 z-30 shrink-0">
        <div class="flex flex-wrap items-center justify-between gap-2.5 mb-2.5 px-1">
            <!-- Left: Title & Agent Count Badge -->
            <div class="flex items-center gap-2">
                <div class="w-6 h-6 rounded-md bg-blue-500/10 dark:bg-cyan-500/10 border border-blue-500/20 dark:border-cyan-500/20 flex items-center justify-center text-blue-600 dark:text-cyan-400 text-xs">
                    <i class="fa-solid fa-id-badge"></i>
                </div>
                <div class="flex items-center gap-2">
                    <h3 class="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">Status Stasiun & Metrik Agent AI</h3>
                    <span id="agents-count-badge" class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/10">0 Agent</span>
                </div>
            </div>

            <!-- Right Controls: Autonomous OS Modules & Bulk Actions -->
            <div class="flex flex-wrap items-center gap-2">
                <!-- Autonomous OS Feature Modules -->
                <div class="flex items-center gap-1.5 bg-slate-100/90 dark:bg-slate-900/70 p-1 rounded-xl border border-slate-200/80 dark:border-white/10 shadow-2xs">
                    <button onclick="window.app.openWarRoomModal()"
                            class="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/70 text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 border border-slate-200/80 dark:border-white/10 text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                            title="Sesi Rapat Tim di Ruang Rapat 3D (War Room)">
                        <i class="fa-solid fa-users-viewfinder text-indigo-500 text-xs"></i>
                        <span>Rapat Tim</span>
                    </button>
                    <button onclick="window.app.openContentCalendarModal()"
                            class="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 hover:bg-pink-50 dark:hover:bg-pink-950/70 text-slate-700 dark:text-slate-200 hover:text-pink-600 dark:hover:text-pink-400 border border-slate-200/80 dark:border-white/10 text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                            title="Kalender Editorial & Mockup Previewer Medsos">
                        <i class="fa-regular fa-calendar-check text-pink-500 text-xs"></i>
                        <span>Kalender Konten</span>
                    </button>
                    <button onclick="window.app.openDeliverablesModal()"
                            class="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/70 text-slate-700 dark:text-slate-200 hover:text-emerald-600 dark:hover:text-emerald-400 border border-slate-200/80 dark:border-white/10 text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                            title="Deliverables Kode, Artefak & Git Diff Viewer">
                        <i class="fa-solid fa-box-archive text-emerald-500 text-xs"></i>
                        <span>Deliverables</span>
                    </button>
                    <button onclick="window.app.openSchedulesModal()"
                            class="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 hover:bg-violet-50 dark:hover:bg-violet-950/70 text-slate-700 dark:text-slate-200 hover:text-violet-600 dark:hover:text-violet-400 border border-slate-200/80 dark:border-white/10 text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                            title="Penjadwalan Otomatis & Cron Rutin">
                        <i class="fa-regular fa-clock text-violet-500 text-xs"></i>
                        <span>Jadwal Cron</span>
                    </button>
                    <button onclick="window.app.openKnowledgeBaseModal()"
                            class="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 hover:bg-amber-50 dark:hover:bg-amber-950/70 text-slate-700 dark:text-slate-200 hover:text-amber-600 dark:hover:text-amber-400 border border-slate-200/80 dark:border-white/10 text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                            title="Company Knowledge Base & RAG Context">
                        <i class="fa-solid fa-book-bookmark text-amber-500 text-xs"></i>
                        <span>Knowledge</span>
                    </button>
                </div>

                <div class="h-5 w-px bg-slate-200 dark:bg-white/10 hidden sm:block"></div>

                <!-- Station Controls Bulk Buttons -->
                <div class="flex items-center gap-1.5">
                    <button id="btn-pause-all-footer" onclick="window.app.pauseAllAgents()"
                            class="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                            title="Hentikan seluruh agent (PAUSED) agar tidak memakan token">
                        <i class="fa-solid fa-circle-pause text-amber-500"></i>
                        <span class="hidden sm:inline">Hentikan Semua</span>
                    </button>
                    <button id="btn-start-all-footer" onclick="window.app.startAllAgents()"
                            class="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                            title="Jalankan seluruh agent (KERJA) untuk mulai memproses tugas">
                        <i class="fa-solid fa-circle-play text-emerald-500"></i>
                        <span class="hidden sm:inline">Jalankan Semua</span>
                    </button>
                    <button id="btn-delete-all-footer" onclick="window.app.openDeleteAllAgentsModal()"
                            class="px-2 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 text-xs font-semibold flex items-center gap-1 transition-all shadow-2xs cursor-pointer"
                            title="Hapus semua agent sekaligus dengan konfirmasi">
                        <i class="fa-solid fa-trash-can text-rose-500"></i>
                        <span class="hidden sm:inline">Hapus Semua</span>
                    </button>
                </div>
            </div>
        </div>

        <!-- Cards Horizontal Scrollable Grid -->
        <div id="agent-cards-container" class="flex gap-3 overflow-x-auto pb-1 scrollbar-none min-h-[140px]">
            <!-- Dynamic agent cards rendered by app.js -->
        </div>
    </footer>

    <!-- ================================================================= -->
    <!-- 4. MODALS & FORMS                                                 -->
    <!-- ================================================================= -->

    <!-- MODAL: CREATE AGENT -->
    <div id="modal-create-agent" class="hidden fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop">
        <div class="glass-panel-elevated rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-white/15 p-6 modal-content-animated shadow-2xl">
            <div class="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10 mb-4">
                <div class="flex items-center gap-2.5">
                    <div class="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white text-sm">
                        <i class="fa-solid fa-user-plus"></i>
                    </div>
                    <h3 class="font-bold text-base text-slate-900 dark:text-white">Daftarkan Agent AI Baru</h3>
                </div>
                <button onclick="window.app.closeCreateAgentModal()" class="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1">
                    <i class="fa-solid fa-xmark text-lg"></i>
                </button>
            </div>

            <form id="form-create-agent" class="space-y-4">
                <!-- Name & Role -->
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                        <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Nama Agent *</label>
                        <input type="text" name="name" required placeholder="Contoh: Rian, Farhan" 
                               class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/15 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 shadow-sm">
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Role / Jabatan *</label>
                        <input type="text" name="role" required placeholder="Contoh: Social Media Specialist, Content Creator, DevOps..." 
                               class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/15 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 shadow-sm">
                    </div>
                </div>

                                <!-- Department & Model -->
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                        <div class="flex items-center justify-between mb-1">
                            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                                <i class="fa-solid fa-briefcase text-blue-500 mr-1"></i> Departemen *
                            </label>
                            <button type="button" onclick="window.app && window.app.showNewDepartmentInput()" class="text-[11px] text-blue-600 dark:text-cyan-400 hover:underline font-medium flex items-center gap-1 transition-colors">
                                <i class="fa-solid fa-plus text-[10px]"></i> Departemen Baru
                            </button>
                        </div>
                        <select id="agent-department-select" name="department" onchange="window.app && window.app.handleDepartmentChange(this.value)" class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/15 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 shadow-sm">
                            <optgroup label="✨ Spesialis Konten, Media & Kreatif">
                                <option value="Spesialis Media Sosial" selected>Spesialis Media Sosial</option>
                                <option value="Pembuatan Konten">Pembuatan Konten (Content Creation)</option>
                                <option value="Brainstorming & Ideation">Brainstorming & Ideation</option>
                                <option value="Pemasaran Digital & Kampanye">Pemasaran Digital & Kampanye</option>
                                <option value="Desain Kreatif & Multimedia">Desain Kreatif & Multimedia</option>
                            </optgroup>
                            <optgroup label="💻 Teknologi & Engineering">
                                <option value="Frontend Engineering">Frontend Engineering</option>
                                <option value="Core Platform & API">Core Platform & API</option>
                                <option value="Quality Assurance">Quality Assurance</option>
                                <option value="Operations & DevOps">Operations & DevOps</option>
                                <option value="Arsitektur Cloud & Keamanan">Arsitektur Cloud & Keamanan</option>
                            </optgroup>
                            <optgroup label="📊 Riset, Data & Strategi">
                                <option value="Research & Intelligence">Research & Intelligence</option>
                                <option value="Analisis Data & Riset Pasar">Analisis Data & Riset Pasar</option>
                                <option value="Manajemen Produk & Strategi">Manajemen Produk & Strategi</option>
                            </optgroup>
                            <optgroup id="optgroup-custom-departments" label="🏷️ Departemen Kustom">
                                <!-- Populated dynamically -->
                            </optgroup>
                            <option value="__new__" class="font-semibold text-blue-600 dark:text-cyan-400 bg-blue-50/50 dark:bg-blue-950/30">➕ Tambah Departemen Baru...</option>
                        </select>

                        <!-- Input Tambah Departemen Baru -->
                        <div id="custom-department-container" class="hidden mt-2 p-2.5 bg-blue-50/60 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-500/30">
                            <div class="flex items-center justify-between mb-1">
                                <label class="block text-[11px] font-semibold text-blue-700 dark:text-cyan-400">
                                    <i class="fa-solid fa-folder-plus mr-1"></i>Nama Departemen Baru *
                                </label>
                                <button type="button" onclick="window.app && window.app.cancelNewDepartmentInput()" class="text-[10px] text-slate-400 hover:text-red-500 transition-colors flex items-center gap-0.5">
                                    <i class="fa-solid fa-xmark"></i> Batal
                                </button>
                            </div>
                            <div class="relative flex items-center">
                                <input type="text" id="custom-department-input" placeholder="Contoh: Media Sosial, Brainstorming, Public Relations..." 
                                       class="w-full bg-white dark:bg-slate-900 border border-blue-400 dark:border-blue-500 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 shadow-sm">
                            </div>
                            <p class="text-[10px] text-slate-500 dark:text-slate-400 mt-1">Departemen baru ini akan tersimpan otomatis dan bisa dipilih kembali.</p>
                        </div>
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Model AI</label>
                        <select name="model" class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/15 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 font-mono shadow-sm">
                            <option value="gemini-3-flash-preview" selected>gemini-3-flash-preview (Cepat & Cerdas)</option>
                            <option value="gemini-flash-lite-latest">gemini-flash-lite-latest (Flash Lite Ringan)</option>
                            <option value="gemini-3.5-flash">gemini-3.5-flash (Gemini 3.5)</option>
                            <option value="gemini-2.0-flash">gemini-2.0-flash (Gemini 2.0)</option>
                            <option value="gemini-1.5-flash">gemini-1.5-flash (Legacy Studio)</option>
                            <option value="gpt-4o">gpt-4o (Multimodal)</option>
                            <option value="gpt-4o-mini">gpt-4o-mini (Cepat)</option>
                            <option value="claude-3-7-sonnet">claude-3-7-sonnet (Arsitektur)</option>
                            <option value="deepseek-r1">deepseek-r1 (Chain-of-Thought)</option>
                        </select>
                    </div>
                </div>

                <!-- Local Working Directory -->
                <div>
                    <div class="flex items-center justify-between mb-1">
                        <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                            <i class="fa-solid fa-folder-tree text-amber-500 mr-1"></i> Direktori Kerja Proyek Lokal (Working Directory)
                        </label>
                        <span class="text-[10px] text-slate-400">Target Folder Proyek</span>
                    </div>
                    <div class="relative">
                        <input type="text" name="working_directory" list="local-projects-datalist" placeholder="Pilih atau ketik path, contoh: /var/www/html/churros-webapp" 
                               class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/15 rounded-lg px-3 py-2 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 shadow-sm">
                        <datalist id="local-projects-datalist">
                            <!-- Populated dynamically -->
                        </datalist>
                    </div>
                    <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                        Agent ini akan menjalankan inspect, perintah shell (git, test, build), dan melaporkan hasil pekerjaannya langsung di direktori lokal tersebut.
                    </p>
                </div>

                <!-- Station / Desk Coordinate Presets in 3D -->
                <div>
                    <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        <i class="fa-solid fa-location-dot text-blue-600 dark:text-cyan-400 mr-1"></i> Posisi Stasiun Meja (3D Office Coordinate)
                    </label>
                    <select id="station-preset-select" name="station_preset" class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/15 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 shadow-sm">
                        <option value="-1.5,-2.5,0">Stasiun Engineering Tengah A (X: -1.5, Z: -2.5)</option>
                        <option value="-1.5,2.5,0">Stasiun Engineering Tengah B (X: -1.5, Z: 2.5)</option>
                        <option value="1.5,-2.5,3.14">Stasiun QA / Data Tengah A (X: 1.5, Z: -2.5)</option>
                        <option value="1.5,2.5,3.14">Stasiun QA / Data Tengah B (X: 1.5, Z: 2.5)</option>
                        <option value="-7,0,0">Stasiun Private Corner Kiri (X: -7.0, Z: 0)</option>
                        <option value="7,0,3.14">Stasiun Private Corner Kanan (X: 7.0, Z: 0)</option>
                        <option value="custom">Kustom Koordinat Manual (X / Z Slider)</option>
                    </select>

                    <div id="custom-station-coords" class="hidden grid grid-cols-2 gap-3 mt-2 p-2 bg-slate-100 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-white/5">
                        <div>
                            <label class="block text-[11px] text-slate-600 dark:text-slate-400">Desk X (-10 s/d 10)</label>
                            <input type="number" step="0.5" min="-10" max="10" name="desk_x" value="0" class="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-white/10 rounded px-2 py-1 text-xs">
                        </div>
                        <div>
                            <label class="block text-[11px] text-slate-600 dark:text-slate-400">Desk Z (-8 s/d 8)</label>
                            <input type="number" step="0.5" min="-8" max="8" name="desk_z" value="0" class="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-white/10 rounded px-2 py-1 text-xs">
                        </div>
                    </div>
                </div>

                <!-- Gender, Avatar Color & Initial Status -->
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                        <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            <i class="fa-solid fa-venus-mars text-indigo-500 mr-1"></i> Jenis Karakter
                        </label>
                        <select name="gender" class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/15 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 shadow-sm">
                            <option value="male" selected>Laki-Laki (Pria)</option>
                            <option value="female">Perempuan (Wanita)</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Warna Avatar & Meja</label>
                        <select name="avatar_color" class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/15 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 shadow-sm">
                            <option value="#3b82f6">Biru Neon (#3b82f6)</option>
                            <option value="#10b981">Emerald Hijau (#10b981)</option>
                            <option value="#8b5cf6">Ungu Cyber (#8b5cf6)</option>
                            <option value="#f59e0b">Amber Emas (#f59e0b)</option>
                            <option value="#ec4899">Rose Merah Muda (#ec4899)</option>
                            <option value="#06b6d4">Cyan Elektrik (#06b6d4)</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Status Awal</label>
                        <select name="status" class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/15 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 shadow-sm">
                            <option value="KERJA">KERJA (Aktif / Mengetik)</option>
                            <option value="IDLE" selected>IDLE (Standby di Meja)</option>
                            <option value="PAUSED">PAUSED (Ditangguhkan)</option>
                        </select>
                    </div>
                </div>

                <!-- Temperature Slider -->
                <div>
                    <div class="flex justify-between items-center mb-1">
                        <label class="text-xs font-semibold text-slate-700 dark:text-slate-300">Temperature (Kreativitas)</label>
                        <span id="temp-slider-val" class="font-mono text-xs text-blue-600 dark:text-cyan-400 font-bold">0.7</span>
                    </div>
                    <input id="temp-slider" type="range" name="temperature" min="0.0" max="1.0" step="0.05" value="0.7"
                           class="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-600">
                </div>

                <!-- Initial Task -->
                <div>
                    <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Tugas Awal yang Diberikan</label>
                    <input type="text" name="current_task" placeholder="Contoh: Menguji API endpoint integrasi subagent"
                           class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/15 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 shadow-sm">
                </div>

                <!-- System Prompt -->
                <div>
                    <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">System Prompt (Instruksi Dasar)</label>
                    <textarea name="system_prompt" rows="2" placeholder="Tuliskan arahan kepribadian, domain keahlian, dan SOP kerja untuk AI Agent ini..."
                              class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/15 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 font-mono shadow-sm"></textarea>
                </div>

                <!-- Functional Tools -->
                <div>
                    <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">Kemampuan Fungsi / Tools yang Diberikan</label>
                    <div class="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                        <label class="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-900/80 rounded border border-slate-200 dark:border-white/5 cursor-pointer">
                            <input type="checkbox" name="functions" value="web_search" checked class="rounded border-slate-300 dark:border-slate-700 text-blue-600">
                            <span>Web Search</span>
                        </label>
                        <label class="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-900/80 rounded border border-slate-200 dark:border-white/5 cursor-pointer">
                            <input type="checkbox" name="functions" value="file_io" checked class="rounded border-slate-300 dark:border-slate-700 text-blue-600">
                            <span>File Read/Write</span>
                        </label>
                        <label class="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-900/80 rounded border border-slate-200 dark:border-white/5 cursor-pointer">
                            <input type="checkbox" name="functions" value="code_analysis" checked class="rounded border-slate-300 dark:border-slate-700 text-blue-600">
                            <span>Code Analysis</span>
                        </label>
                        <label class="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-900/80 rounded border border-slate-200 dark:border-white/5 cursor-pointer">
                            <input type="checkbox" name="functions" value="shell_execution" class="rounded border-slate-300 dark:border-slate-700 text-blue-600">
                            <span>Shell Commands</span>
                        </label>
                        <label class="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-900/80 rounded border border-slate-200 dark:border-white/5 cursor-pointer">
                            <input type="checkbox" name="functions" value="database_query" class="rounded border-slate-300 dark:border-slate-700 text-blue-600">
                            <span>Database Query</span>
                        </label>
                        <label class="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-900/80 rounded border border-slate-200 dark:border-white/5 cursor-pointer">
                            <input type="checkbox" name="functions" value="knowledge_retrieval" class="rounded border-slate-300 dark:border-slate-700 text-blue-600">
                            <span>RAG Knowledge</span>
                        </label>
                    </div>
                </div>

                <!-- Submit / Cancel -->
                <div class="pt-3 border-t border-slate-200 dark:border-white/10 flex items-center justify-end gap-2">
                    <button type="button" onclick="window.app.closeCreateAgentModal()"
                            class="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Batal
                    </button>
                    <button type="submit"
                            class="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-xs font-semibold text-white shadow-md shadow-blue-500/25 flex items-center gap-1.5">
                        <i class="fa-solid fa-plus text-xs"></i>
                        <span>Daftarkan Agent</span>
                    </button>
                </div>
            </form>
        </div>
    </div>

    <!-- MODAL: CREATE TASK -->
    <div id="modal-create-task" class="hidden fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop">
        <div class="glass-panel-elevated rounded-2xl w-full max-w-md border border-slate-200 dark:border-white/15 p-6 modal-content-animated shadow-2xl">
            <div class="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10 mb-4">
                <div class="flex items-center gap-2.5">
                    <div class="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white text-sm">
                        <i class="fa-solid fa-list-check"></i>
                    </div>
                    <h3 class="font-bold text-base text-slate-900 dark:text-white">Buat Tugas Baru</h3>
                </div>
                <button onclick="window.app.closeCreateTaskModal()" class="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1">
                    <i class="fa-solid fa-xmark text-lg"></i>
                </button>
            </div>

            <form id="form-create-task" class="space-y-4">
                <div>
                    <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Judul Tugas *</label>
                    <input type="text" name="title" required placeholder="Contoh: Implementasi caching redis pada query logs"
                           class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/15 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 shadow-sm">
                </div>

                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Kategori Board</label>
                        <select id="task-category-select" name="category" class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/15 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 shadow-sm">
                            <option value="deadline_dekat">Deadline Dekat</option>
                            <option value="nunggu_owner">Nunggu Owner</option>
                            <option value="ide_nanti" selected>Ide / Nanti</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Prioritas</label>
                        <select name="priority" class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/15 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 shadow-sm">
                            <option value="urgent">Urgent</option>
                            <option value="high">Tinggi</option>
                            <option value="medium" selected>Sedang</option>
                            <option value="low">Rendah</option>
                        </select>
                    </div>
                </div>

                <div>
                    <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Assign ke Agent</label>
                    <select id="task-agent-select" name="assigned_agent_id" class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/15 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 shadow-sm">
                        <option value="">-- Tanpa Assignee --</option>
                    </select>
                </div>

                <div>
                    <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Target Deadline</label>
                    <input type="date" name="due_date" value="<?= date('Y-m-d', strtotime('+3 days')) ?>"
                           class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/15 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 font-mono shadow-sm">
                </div>

                <div class="pt-3 border-t border-slate-200 dark:border-white/10 flex items-center justify-end gap-2">
                    <button type="button" onclick="window.app.closeCreateTaskModal()"
                            class="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Batal
                    </button>
                    <button type="submit"
                            class="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold text-white shadow-md shadow-indigo-500/25 flex items-center gap-1.5">
                        <i class="fa-solid fa-plus text-xs"></i>
                        <span>Buat Tugas</span>
                    </button>
                </div>
            </form>
        </div>
    </div>

    <!-- MODAL: AGENT INSPECTOR & CONFIG -->
    <div id="modal-agent-inspector" class="hidden fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop">
        <div class="glass-panel-elevated rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-white/15 p-6 modal-content-animated shadow-2xl">
            <!-- Header -->
            <div class="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10 mb-4">
                <div class="flex items-center gap-3">
                    <div id="insp-avatar" class="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-white text-base shadow-md bg-blue-600">
                        AG
                    </div>
                    <div>
                        <h3 id="insp-name" class="font-bold text-base text-slate-900 dark:text-white">Nama Agent</h3>
                        <p id="insp-role" class="text-xs text-slate-500 dark:text-slate-400">Role • Department</p>
                    </div>
                </div>
                <button onclick="window.app.closeAgentInspectorModal()" class="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1">
                    <i class="fa-solid fa-xmark text-lg"></i>
                </button>
            </div>

            <!-- Metrics Overview -->
            <div class="grid grid-cols-4 gap-2 mb-4 text-center">
                <div class="bg-slate-100 dark:bg-slate-900/80 p-2.5 rounded-xl border border-slate-200 dark:border-white/5">
                    <div class="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-medium">Model</div>
                    <div id="insp-model" class="text-xs font-bold text-blue-600 dark:text-cyan-300 font-mono mt-0.5 truncate">gemini-1.5-flash</div>
                </div>
                <div class="bg-slate-100 dark:bg-slate-900/80 p-2.5 rounded-xl border border-slate-200 dark:border-white/5">
                    <div class="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-medium">Temp</div>
                    <div id="insp-temp" class="text-xs font-bold text-amber-600 dark:text-amber-300 font-mono mt-0.5">0.7</div>
                </div>
                <div class="bg-slate-100 dark:bg-slate-900/80 p-2.5 rounded-xl border border-slate-200 dark:border-white/5">
                    <div class="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-medium">Tokens</div>
                    <div id="insp-tokens" class="text-xs font-bold text-purple-600 dark:text-purple-300 font-mono mt-0.5">48,920</div>
                </div>
                <div class="bg-slate-100 dark:bg-slate-900/80 p-2.5 rounded-xl border border-slate-200 dark:border-white/5">
                    <div class="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-medium">Aksi</div>
                    <div id="insp-actions" class="text-xs font-bold text-slate-900 dark:text-white font-mono mt-0.5">142</div>
                </div>
            </div>

            <!-- Status & Gender Control -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                <div>
                    <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Status Operasional Agent</label>
                    <select id="insp-status-select" class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/15 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 shadow-sm">
                        <option value="KERJA">KERJA (Aktif memproses task & mengetik)</option>
                        <option value="IDLE">IDLE (Standby menunggu input)</option>
                        <option value="PAUSED">PAUSED (Ditangguhkan sementara)</option>
                    </select>
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        <i class="fa-solid fa-venus-mars text-indigo-500 mr-1"></i> Jenis Karakter (Gender)
                    </label>
                    <select id="insp-gender-select" class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/15 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 shadow-sm">
                        <option value="male">Laki-Laki (Pria)</option>
                        <option value="female">Perempuan (Wanita)</option>
                    </select>
                </div>
            </div>

            <!-- Working Directory -->
            <div class="mb-4">
                <div class="flex items-center justify-between mb-1">
                    <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                        <i class="fa-solid fa-folder-tree text-amber-500 mr-1"></i> Direktori Kerja Proyek Lokal
                    </label>
                    <span id="insp-working-dir-status" class="text-[10px] text-slate-400"></span>
                </div>
                <input type="text" id="insp-working-directory" list="local-projects-datalist" placeholder="Contoh: /var/www/html/churros-webapp (kosongkan jika agent umum)"
                       class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/15 rounded-lg px-3 py-2 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 shadow-sm">
            </div>

            <!-- Functions list -->
            <div class="mb-4">
                <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Tools / Functions yang Diizinkan</label>
                <div id="insp-functions-container" class="flex flex-wrap gap-1.5">
                    <!-- Badges -->
                </div>
            </div>

            <!-- System Prompt -->
            <div class="mb-4">
                <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">System Prompt</label>
                <textarea id="insp-system-prompt" rows="3"
                          class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/15 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 font-mono leading-relaxed shadow-sm"></textarea>
            </div>

            <!-- Action buttons -->
            <div class="pt-3 border-t border-slate-200 dark:border-white/10 flex items-center justify-between">
                <button type="button" onclick="window.app.openDeleteAgentModal()"
                        class="px-3 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 text-xs font-semibold border border-rose-200 dark:border-rose-800/40 transition-colors">
                    <i class="fa-solid fa-trash-can mr-1"></i> Hapus Agent
                </button>

                <div class="flex items-center gap-2">
                    <button type="button" onclick="window.app.closeAgentInspectorModal()"
                            class="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Tutup
                    </button>
                    <button type="button" onclick="window.app.saveAgentInspectorChanges()"
                            class="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-xs font-semibold text-white shadow-md shadow-blue-500/25">
                        Simpan Perubahan
                    </button>
                </div>
            </div>
        </div>
    </div>

    <!-- MODAL: AI SETTINGS (REAL AI INTEGRATION) -->
    <div id="modal-ai-settings" class="hidden fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop" onclick="if(event.target === this) window.app.closeAISettingsModal()">
        <div class="glass-panel-elevated rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-white/15 p-6 modal-content-animated shadow-2xl">
            <!-- Header -->
            <div class="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10 mb-4">
                <div class="flex items-center gap-2.5">
                    <div class="w-9 h-9 rounded-xl bg-purple-600 flex items-center justify-center text-white text-base shadow-sm">
                        <i class="fa-solid fa-brain"></i>
                    </div>
                    <div>
                        <h3 class="font-bold text-base text-slate-900 dark:text-white">Pengaturan Integrasi Real AI</h3>
                        <p class="text-xs text-slate-500 dark:text-slate-400">Hubungkan agen kantor virtual ke model AI nyata (LLM)</p>
                    </div>
                </div>
                <button onclick="window.app.closeAISettingsModal()" class="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1">
                    <i class="fa-solid fa-xmark text-lg"></i>
                </button>
            </div>

            <form id="form-ai-settings" class="space-y-4" onsubmit="window.app.saveAISettings(event)">
                <!-- Provider Selection -->
                <div>
                    <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Pilih AI Provider</label>
                    <div class="grid grid-cols-2 sm:grid-cols-3 gap-2" id="ai-provider-options">
                        <button type="button" onclick="window.app.selectAIProvider('gemini')" id="provider-btn-gemini"
                                class="p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all bg-purple-50/60 dark:bg-purple-950/40 border-purple-500 shadow-xs">
                            <div class="flex items-center justify-between mb-1">
                                <span class="font-bold text-xs text-purple-700 dark:text-purple-300">Google Gemini</span>
                                <span class="text-[9px] px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold uppercase">Gratis</span>
                            </div>
                            <div class="text-[10px] text-slate-500 dark:text-slate-400">Gemini 3 Flash / Lite / 2.0</div>
                        </button>

                        <button type="button" onclick="window.app.selectAIProvider('openai')" id="provider-btn-openai"
                                class="p-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-left flex flex-col justify-between transition-all hover:bg-slate-50 dark:hover:bg-slate-800/60">
                            <div class="flex items-center justify-between mb-1">
                                <span class="font-bold text-xs text-slate-800 dark:text-slate-200">OpenAI</span>
                            </div>
                            <div class="text-[10px] text-slate-500 dark:text-slate-400">GPT-4o / GPT-4o-mini</div>
                        </button>

                        <button type="button" onclick="window.app.selectAIProvider('groq')" id="provider-btn-groq"
                                class="p-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-left flex flex-col justify-between transition-all hover:bg-slate-50 dark:hover:bg-slate-800/60">
                            <div class="flex items-center justify-between mb-1">
                                <span class="font-bold text-xs text-slate-800 dark:text-slate-200">Groq</span>
                                <span class="text-[9px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold uppercase">Cepat</span>
                            </div>
                            <div class="text-[10px] text-slate-500 dark:text-slate-400">Llama 3.3 / DeepSeek R1</div>
                        </button>

                        <button type="button" onclick="window.app.selectAIProvider('openrouter')" id="provider-btn-openrouter"
                                class="p-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-left flex flex-col justify-between transition-all hover:bg-slate-50 dark:hover:bg-slate-800/60">
                            <div class="flex items-center justify-between mb-1">
                                <span class="font-bold text-xs text-slate-800 dark:text-slate-200">OpenRouter</span>
                            </div>
                            <div class="text-[10px] text-slate-500 dark:text-slate-400">Claude 3.7 / All LLMs</div>
                        </button>

                        <button type="button" onclick="window.app.selectAIProvider('ollama')" id="provider-btn-ollama"
                                class="p-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-left flex flex-col justify-between transition-all hover:bg-slate-50 dark:hover:bg-slate-800/60 col-span-2 sm:col-span-2">
                            <div class="flex items-center justify-between mb-1">
                                <span class="font-bold text-xs text-slate-800 dark:text-slate-200">Ollama (Lokal / Self-Hosted)</span>
                                <span class="text-[9px] px-1 py-0.2 rounded bg-blue-500/20 text-blue-600 dark:text-blue-400 font-bold uppercase">Tanpa API Key</span>
                            </div>
                            <div class="text-[10px] text-slate-500 dark:text-slate-400">Llama3, DeepSeek, Qwen di localhost:11434</div>
                        </button>
                    </div>
                    <input type="hidden" name="ai_provider" id="setting-ai-provider" value="gemini">
                </div>

                <!-- API Key Field -->
                <div id="ai-key-container">
                    <div class="flex items-center justify-between mb-1">
                        <label class="text-xs font-semibold text-slate-700 dark:text-slate-300">
                            API Key <span id="key-provider-label">Google Gemini</span> *
                        </label>
                        <span id="key-status-badge" class="text-[10px] font-medium text-slate-400">Belum diatur</span>
                    </div>
                    <div class="relative">
                        <input type="password" id="setting-api-key" placeholder="Masukkan API Key (contoh: AIzaSy...)" 
                               class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/15 rounded-lg pl-3 pr-10 py-2 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-purple-500 shadow-sm">
                        <button type="button" onclick="window.app.toggleApiKeyVisibility()" class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs">
                            <i id="key-visibility-icon" class="fa-regular fa-eye"></i>
                        </button>
                    </div>
                    <div id="api-key-hint" class="mt-1 text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
                        💡 Dapatkan API Key Gemini secara <strong>gratis</strong> di <a href="https://aistudio.google.com/app/apikey" target="_blank" class="text-blue-600 dark:text-cyan-400 hover:underline font-medium">Google AI Studio &rarr;</a>
                    </div>
                </div>

                <!-- Model Selection -->
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                        <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Default Model LLM</label>
                        <select id="setting-default-model" class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/15 rounded-lg px-3 py-2 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-purple-500 shadow-sm">
                            <option value="gemini-3-flash-preview" selected>gemini-3-flash-preview (Cepat & Cerdas, Rekomendasi)</option>
                            <option value="gemini-flash-lite-latest">gemini-flash-lite-latest (Flash Lite Ringan & Hemat)</option>
                            <option value="gemini-3.5-flash">gemini-3.5-flash (Gemini 3.5 Flash)</option>
                            <option value="gemini-2.0-flash">gemini-2.0-flash (Gemini 2.0 Flash)</option>
                            <option value="gemini-1.5-flash">gemini-1.5-flash (Gemini 1.5 Legacy Studio)</option>
                            <option value="gemini-1.5-pro">gemini-1.5-pro (Penalaran Kompleks)</option>
                            <option value="gpt-4o">gpt-4o</option>
                            <option value="gpt-4o-mini">gpt-4o-mini</option>
                            <option value="llama-3.3-70b-versatile">llama-3.3-70b-versatile (Groq)</option>
                            <option value="deepseek-r1-distill-llama-70b">deepseek-r1-distill-llama-70b</option>
                            <option value="anthropic/claude-3.7-sonnet">claude-3.7-sonnet (OpenRouter)</option>
                            <option value="llama3">llama3 (Ollama Local)</option>
                        </select>
                    </div>

                    <div id="base-url-container" class="hidden">
                        <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Base API URL</label>
                        <input type="text" id="setting-base-url" placeholder="http://localhost:11434/v1"
                               class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/15 rounded-lg px-3 py-2 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-purple-500 shadow-sm">
                    </div>
                </div>

                <!-- Toggles: Real AI Live Mode & Auto-execution -->
                <div class="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200/80 dark:border-white/5 space-y-2">
                    <label class="flex items-center justify-between cursor-pointer">
                        <div>
                            <div class="text-xs font-semibold text-slate-800 dark:text-slate-200">Aktifkan Real AI Live Execution</div>
                            <div class="text-[11px] text-slate-500 dark:text-slate-400">Agent memanggil model LLM nyata untuk menyelesaikan tugas dan mencatat token asli</div>
                        </div>
                        <input type="checkbox" id="setting-real-ai-enabled" checked
                               class="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-purple-600 focus:ring-0 cursor-pointer">
                    </label>

                    <label class="flex items-center justify-between cursor-pointer pt-2 border-t border-slate-200/60 dark:border-white/5">
                        <div>
                            <div class="text-xs font-semibold text-slate-800 dark:text-slate-200">Otomatis Eksekusi Backlog Task</div>
                            <div class="text-[11px] text-slate-500 dark:text-slate-400">Agent otomatis mengambil tugas antrean yang masih pending dan menyelesaikannya</div>
                        </div>
                        <input type="checkbox" id="setting-auto-execution"
                               class="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-purple-600 focus:ring-0 cursor-pointer">
                    </label>
                </div>

                <!-- Live Test Connection Box -->
                <div class="flex items-center justify-between gap-3 pt-1">
                    <button type="button" onclick="window.app.testAIConnection()" id="btn-test-ai-connection"
                            class="px-3.5 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-white/10 flex items-center gap-1.5 transition-colors">
                        <i class="fa-solid fa-satellite-dish text-xs"></i>
                        <span>Tes Koneksi AI</span>
                    </button>

                    <div id="test-connection-status" class="flex-1 text-right text-xs truncate"></div>
                </div>

                <!-- Footer Buttons -->
                <div class="pt-3 border-t border-slate-200 dark:border-white/10 flex items-center justify-end gap-2">
                    <button type="button" onclick="window.app.closeAISettingsModal()"
                            class="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors">
                        Batal
                    </button>
                    <button type="submit" id="btn-save-ai-settings"
                            class="px-5 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-xs font-semibold text-white shadow-md shadow-purple-500/25 flex items-center gap-1.5 transition-all">
                        <i class="fa-solid fa-check text-xs"></i>
                        <span>Simpan Pengaturan</span>
                    </button>
                </div>
            </form>
        </div>
    </div>

    <!-- MODAL: TASK AI RESULT VIEWER -->
    <div id="modal-task-result" class="hidden fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop" onclick="if(event.target === this) window.app.closeTaskResultModal()">
        <div class="glass-panel-elevated rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-white/15 p-6 modal-content-animated shadow-2xl">
            <!-- Header -->
            <div class="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10 mb-4">
                <div class="flex items-center gap-2.5">
                    <div class="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white text-base shadow-sm">
                        <i class="fa-solid fa-circle-check"></i>
                    </div>
                    <div>
                        <h3 id="task-res-title" class="font-bold text-base text-slate-900 dark:text-white">Hasil Eksekusi Tugas Real AI</h3>
                        <p id="task-res-meta" class="text-xs text-slate-500 dark:text-slate-400">Dikerjakan oleh Agent • Real LLM</p>
                    </div>
                </div>
                <button onclick="window.app.closeTaskResultModal()" class="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1">
                    <i class="fa-solid fa-xmark text-lg"></i>
                </button>
            </div>

            <!-- Task Output Container -->
            <div class="space-y-4 text-xs">
                <div>
                    <label class="block text-[11px] uppercase font-bold text-slate-400 dark:text-slate-500 mb-1">Hasil Solusi & Kode (Real AI Deliverable):</label>
                    <div id="task-res-content" class="bg-slate-900 text-slate-100 p-3.5 rounded-xl font-mono text-xs overflow-x-auto leading-relaxed whitespace-pre-wrap max-h-96 border border-slate-800"></div>
                </div>
            </div>

            <!-- Footer Action -->
            <div class="pt-4 mt-4 border-t border-slate-200 dark:border-white/10 flex items-center justify-between">
                <button type="button" onclick="window.app.openDeliverablesModal(window.app.currentViewingTaskId)"
                        class="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-sm flex items-center gap-1.5 transition-all cursor-pointer">
                    <i class="fa-solid fa-box-archive text-xs"></i>
                    <span>Buka di Deliverables & Diff Viewer</span>
                </button>
                <button type="button" onclick="window.app.closeTaskResultModal()"
                        class="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                    Tutup
                </button>
            </div>
        </div>
    </div>

    <!-- MODAL: CONFIRM CLEAR LOGS -->
    <div id="modal-confirm-clear-logs" class="hidden fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop" onclick="if(event.target === this) window.app.closeClearLogsModal()">
        <div class="glass-panel-elevated rounded-2xl w-full max-w-sm border border-slate-200 dark:border-white/15 p-6 modal-content-animated shadow-2xl text-center">
            <!-- Warning/Trash Icon -->
            <div class="w-14 h-14 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center text-2xl mx-auto mb-4 border border-rose-200 dark:border-rose-800/50 shadow-sm">
                <i class="fa-solid fa-trash-can"></i>
            </div>

            <h3 class="font-bold text-base text-slate-900 dark:text-white mb-2">Bersihkan Semua Log?</h3>
            <p class="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-6">
                Seluruh riwayat Live Activity Feed akan dihapus secara permanen dari sistem. Riwayat yang dihapus tidak dapat dipulihkan.
            </p>

            <div class="flex items-center justify-center gap-3">
                <button type="button" onclick="window.app.closeClearLogsModal()"
                        class="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors">
                    Batal
                </button>
                <button type="button" id="btn-confirm-delete-logs" onclick="window.app.confirmClearLogs()"
                        class="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-xs font-semibold text-white shadow-md shadow-rose-500/25 flex items-center gap-1.5 transition-all">
                    <i class="fa-solid fa-trash-can text-xs"></i>
                    <span>Ya, Hapus Semua Log</span>
                </button>
            </div>
        </div>
    </div>

    <!-- MODAL: CONFIRM DELETE AGENT -->
    <div id="modal-confirm-delete-agent" class="hidden fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop" onclick="if(event.target === this) window.app.closeDeleteAgentModal()">
        <div class="glass-panel-elevated rounded-2xl w-full max-w-sm border border-slate-200 dark:border-white/15 p-6 modal-content-animated shadow-2xl text-center">
            <!-- Warning Icon -->
            <div class="w-14 h-14 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center text-2xl mx-auto mb-4 border border-rose-200 dark:border-rose-800/50 shadow-sm">
                <i class="fa-solid fa-user-xmark"></i>
            </div>

            <h3 class="font-bold text-base text-slate-900 dark:text-white mb-2">Hapus Agent AI?</h3>
            <p class="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-6">
                Yakin ingin menghapus agent <strong id="delete-agent-name-display" class="text-rose-600 dark:text-rose-400 font-bold">...</strong> dari Virtual Office? Stasiun kerja 3D dan riwayat tugas agent ini akan diarsipkan.
            </p>

            <div class="flex items-center justify-center gap-3">
                <button type="button" onclick="window.app.closeDeleteAgentModal()"
                        class="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors">
                    Batal
                </button>
                <button type="button" id="btn-confirm-delete-agent" onclick="window.app.confirmDeleteAgent()"
                        class="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-xs font-semibold text-white shadow-md shadow-rose-500/25 flex items-center gap-1.5 transition-all">
                    <i class="fa-solid fa-trash-can text-xs"></i>
                    <span>Ya, Hapus Agent</span>
                </button>
            </div>
        </div>
    </div>

    <!-- MODAL: CONFIRM DELETE ALL AGENTS -->
    <div id="modal-confirm-delete-all-agents" class="hidden fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop" onclick="if(event.target === this) window.app.closeDeleteAllAgentsModal()">
        <div class="glass-panel-elevated rounded-2xl w-full max-w-md border border-rose-500/30 p-6 modal-content-animated shadow-2xl bg-white dark:bg-slate-900 text-left">
            <div class="flex items-center gap-3 mb-4">
                <div class="w-12 h-12 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-600 dark:text-rose-400 text-xl shrink-0">
                    <i class="fa-solid fa-triangle-exclamation"></i>
                </div>
                <div>
                    <h3 class="font-bold text-base text-slate-900 dark:text-white">Hapus Semua Agent?</h3>
                    <p class="text-xs text-slate-500 dark:text-slate-400">Tindakan ini permanen dan tidak dapat dibatalkan</p>
                </div>
            </div>

            <div class="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 rounded-xl p-3.5 mb-5 text-xs text-rose-800 dark:text-rose-200 leading-relaxed">
                <p class="font-semibold mb-1">⚠️ Perhatian Khusus:</p>
                <ul class="list-disc list-inside space-y-1 text-[11px] text-rose-700 dark:text-rose-300">
                    <li>Seluruh agent akan dihapus dari kantor virtual 3D.</li>
                    <li>Sistem <strong>TIDAK AKAN</strong> memunculkan ulang agent secara otomatis.</li>
                    <li>Seluruh tugas yang sedang di-assign akan dilepaskan (unassigned).</li>
                    <li>Pemanggilan AI dan konsumsi token akan langsung berhenti sepenuhnya.</li>
                </ul>
            </div>

            <div class="flex items-center justify-end gap-3">
                <button type="button" onclick="window.app.closeDeleteAllAgentsModal()"
                        class="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer">
                    Batal
                </button>
                <button type="button" onclick="window.app.confirmDeleteAllAgents()"
                        class="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/25 flex items-center gap-1.5 transition-all cursor-pointer">
                    <i class="fa-solid fa-trash-can"></i>
                    <span>Ya, Hapus Semua Agent</span>
                </button>
            </div>
        </div>
    </div>

    <!-- MODAL: CONFIRM DELETE ALL TASKS -->
    <div id="modal-confirm-delete-all-tasks" class="hidden fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop" onclick="if(event.target === this) window.app.closeDeleteAllTasksModal()">
        <div class="glass-panel-elevated rounded-2xl w-full max-w-md border border-rose-500/30 p-6 modal-content-animated shadow-2xl bg-white dark:bg-slate-900 text-left">
            <div class="flex items-center gap-3 mb-4">
                <div class="w-12 h-12 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-600 dark:text-rose-400 text-xl shrink-0">
                    <i class="fa-solid fa-list-check"></i>
                </div>
                <div>
                    <h3 class="font-bold text-base text-slate-900 dark:text-white">Hapus Semua Tugas Backlog?</h3>
                    <p class="text-xs text-slate-500 dark:text-slate-400">Tindakan ini permanen dan tidak dapat dibatalkan</p>
                </div>
            </div>

            <div class="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 rounded-xl p-3.5 mb-5 text-xs text-rose-800 dark:text-rose-200 leading-relaxed">
                <p class="font-semibold mb-1">⚠️ Perhatian Khusus:</p>
                <ul class="list-disc list-inside space-y-1 text-[11px] text-rose-700 dark:text-rose-300">
                    <li>Seluruh daftar tugas (Deadline Dekat, Nunggu Owner, Ide/Nanti) akan dihapus secara permanen dari database.</li>
                    <li>Riwayat hasil eksekusi Real AI dan laporan pekerjaan tugas terkait akan dibersihkan.</li>
                    <li>Status tugas aktif pada setiap AI Agent akan dikembalikan ke posisi <strong>Standby</strong>.</li>
                </ul>
            </div>

            <div class="flex items-center justify-end gap-3">
                <button type="button" onclick="window.app.closeDeleteAllTasksModal()"
                        class="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer">
                    Batal
                </button>
                <button type="button" id="btn-confirm-delete-all-tasks" onclick="window.app.confirmDeleteAllTasks()"
                        class="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/25 flex items-center gap-1.5 transition-all cursor-pointer">
                    <i class="fa-solid fa-trash-can"></i>
                    <span>Ya, Hapus Semua Tugas</span>
                </button>
            </div>
        </div>
    </div>

    <!-- MODAL: WAR ROOM & AUTONOMOUS TEAM MEETING -->
    <div id="modal-war-room" class="hidden fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop" onclick="if(event.target === this) window.app.closeWarRoomModal()">
        <div class="glass-panel-elevated rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col border border-indigo-500/30 p-6 modal-content-animated shadow-2xl bg-white dark:bg-slate-900 text-left overflow-hidden">
            <!-- Header -->
            <div class="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10 shrink-0">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white text-lg shadow-sm">
                        <i class="fa-solid fa-users-viewfinder"></i>
                    </div>
                    <div>
                        <h3 class="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                            Ruang Rapat Tim AI (War Room)
                            <span class="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30">Autonomous Multi-Turn</span>
                        </h3>
                        <p class="text-xs text-slate-500 dark:text-slate-400">Kolaborasi multi-agent di meja konferensi 3D dengan TV screen live agenda</p>
                    </div>
                </div>
                <button onclick="window.app.closeWarRoomModal()" class="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1">
                    <i class="fa-solid fa-xmark text-lg"></i>
                </button>
            </div>

            <!-- Tab Switcher (Meeting vs Manager-Worker Delegation) -->
            <div class="flex items-center gap-4 border-b border-slate-200 dark:border-white/10 pt-3 shrink-0">
                <button id="tab-btn-war-meeting" onclick="window.app.switchWarRoomTab('meeting')"
                        class="pb-2.5 text-xs font-bold border-b-2 border-indigo-500 text-indigo-600 dark:text-indigo-400 flex items-center gap-2 transition-colors cursor-pointer">
                    <i class="fa-solid fa-comments"></i>
                    <span>Sesi Rapat Tim (Round-Table)</span>
                </button>
                <button id="tab-btn-war-delegation" onclick="window.app.switchWarRoomTab('delegation')"
                        class="pb-2.5 text-xs font-bold border-b-2 border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-2 transition-colors cursor-pointer">
                    <i class="fa-solid fa-sitemap"></i>
                    <span>Manager-Worker Delegasi</span>
                </button>
            </div>

            <!-- Body / Content Areas -->
            <div class="flex-1 overflow-y-auto pt-4 space-y-4">
                
                <!-- PANE 1: MEETING SETUP & LIVE -->
                <div id="tab-pane-war-meeting" class="space-y-4">
                    
                    <!-- SETUP VIEW -->
                    <div id="war-room-setup-view" class="space-y-4">
                        <div>
                            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                                Topik Rapat Tim:
                            </label>
                            <input type="text" id="war-room-topic-input"
                                   placeholder="Contoh: Strategi Peluncuran Produk & Kampanye Viral Q4"
                                   class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-white/10 bg-slate-50 dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                        </div>

                        <!-- Preset Topic Badges -->
                        <div>
                            <span class="text-[10px] text-slate-400 uppercase font-bold mr-2">Topik Cepat:</span>
                            <div class="inline-flex flex-wrap gap-1.5 mt-1">
                                <button type="button" onclick="window.app.setWarRoomTopic('Strategi Peluncuran Produk & Kampanye Viral Medsos')"
                                        class="px-2 py-1 rounded-lg text-[10px] font-medium bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10 transition-colors">
                                    🚀 Peluncuran Produk & Viral Medsos
                                </button>
                                <button type="button" onclick="window.app.setWarRoomTopic('Optimasi Kinerja Arsitektur Backend & Database Scaling')"
                                        class="px-2 py-1 rounded-lg text-[10px] font-medium bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10 transition-colors">
                                    ⚡ Backend & Scaling
                                </button>
                                <button type="button" onclick="window.app.setWarRoomTopic('Evaluasi Kualitas Kode & Automated Regression Testing')"
                                        class="px-2 py-1 rounded-lg text-[10px] font-medium bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10 transition-colors">
                                    🛡️ QA & Security Test
                                </button>
                            </div>
                        </div>

                        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div class="sm:col-span-2">
                                <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                                    Pilih Partisipan Agent (2 - 4 Agent):
                                </label>
                                <div id="war-room-agents-list" class="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1">
                                    <!-- Dynamically populated by war-room.js -->
                                </div>
                            </div>

                            <div>
                                <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                                    Jumlah Putaran Diskusi:
                                </label>
                                <select id="war-room-rounds-select"
                                        class="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-white/10 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200">
                                    <option value="1">1 Putaran (Cepat / Kilat)</option>
                                    <option value="2" selected>2 Putaran (Standar / Komprehensif)</option>
                                    <option value="3">3 Putaran (Mendalam / Brainstorming Penuh)</option>
                                </select>
                                <div class="mt-3 p-3 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200/50 dark:border-indigo-800/40 text-[11px] text-slate-600 dark:text-slate-300">
                                    💡 Agen akan berjalan ke ruang rapat 3D, duduk di kursi konferensi, dan TV dinding akan memperbarui agenda rapat.
                                </div>
                            </div>
                        </div>

                        <div class="pt-3 border-t border-slate-200 dark:border-white/10 flex justify-end gap-2">
                            <button type="button" onclick="window.app.closeWarRoomModal()"
                                    class="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                                Batal
                            </button>
                            <button type="button" id="btn-start-war-meeting" onclick="window.app.startTeamMeeting()"
                                    class="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-md shadow-indigo-600/30 flex items-center gap-2 transition-all">
                                <i class="fa-solid fa-users"></i>
                                <span>Mulai Rapat Tim Sekarang</span>
                            </button>
                        </div>
                    </div>

                    <!-- LIVE MEETING VIEW -->
                    <div id="war-room-live-view" class="hidden space-y-4">
                        <div class="flex items-center justify-between p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800/60">
                            <div class="flex items-center gap-2.5">
                                <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 pulse-green"></span>
                                <div>
                                    <span class="text-[10px] uppercase font-bold text-indigo-600 dark:text-indigo-400">Rapat Sedang Berlangsung:</span>
                                    <h4 id="war-room-live-topic-badge" class="font-bold text-xs text-slate-900 dark:text-white truncate">-</h4>
                                </div>
                            </div>
                            <div class="flex items-center gap-2">
                                <button onclick="window.app.minimizeMeetingToHUD()"
                                        class="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                                        title="Tutup dialog modal dan pantau pergerakan agent di kantor 3D">
                                    <i class="fa-solid fa-cube"></i>
                                    <span>Pantau di Kantor 3D</span>
                                </button>
                                <button onclick="window.app.endCurrentMeeting()"
                                        class="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer">
                                    <i class="fa-solid fa-flag-checkered"></i>
                                    <span>Bubarkan Rapat</span>
                                </button>
                            </div>
                        </div>

                        <!-- Live Dialogue Balloon Container -->
                        <div id="war-room-messages-container" class="space-y-3 max-h-[55vh] overflow-y-auto pr-1">
                            <!-- Populated dynamically -->
                        </div>
                    </div>
                </div>

                <!-- PANE 2: MANAGER-WORKER DELEGATION -->
                <div id="tab-pane-war-delegation" class="hidden space-y-4">
                    <div class="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-white/10 text-xs text-slate-600 dark:text-slate-300">
                        💡 <strong>Pola Manager-Worker:</strong> Agen berperan Project Manager menerima instruksi besar, menganalisisnya dengan LLM, memecahnya menjadi beberapa sub-tugas terstruktur, dan mendelegasikannya ke rekan tim sesuai spesialisasinya.
                    </div>

                    <div>
                        <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                            Pilih Agen Pemimpin (Project Manager / Team Lead):
                        </label>
                        <select id="war-room-lead-select"
                                class="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-white/10 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200">
                        </select>
                    </div>

                    <div>
                        <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                            Instruksi Proyek Besar (Parent Objective):
                        </label>
                        <textarea id="war-room-parent-task-input" rows="3"
                                  placeholder="Contoh: Rancang dan implementasikan fitur autentikasi JWT lengkap dengan endpoint login, proteksi middleware, dokumentasi OpenAPI, dan unit test otomatis."
                                  class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-white/10 bg-slate-50 dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"></textarea>
                    </div>

                    <div class="flex justify-end">
                        <button type="button" id="btn-war-room-breakdown" onclick="window.app.breakdownManagerTask()"
                                class="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-md shadow-indigo-600/30 flex items-center gap-2 transition-all cursor-pointer">
                            <i class="fa-solid fa-sitemap"></i>
                            <span>Pecah Menjadi Sub-Tugas & Delegasikan</span>
                        </button>
                    </div>

                    <div id="war-room-delegation-results" class="hidden pt-4 border-t border-slate-200 dark:border-white/10 space-y-2">
                    </div>
                </div>

            </div>
        </div>
    </div>

    <!-- MODAL: CONTENT CALENDAR & EDITORIAL WORKFLOW -->
    <div id="modal-content-calendar" class="hidden fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop" onclick="if(event.target === this) window.app.closeContentCalendarModal()">
        <div class="glass-panel-elevated rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col border border-pink-500/30 p-6 modal-content-animated shadow-2xl bg-white dark:bg-slate-900 text-left overflow-hidden">
            <!-- Header -->
            <div class="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10 shrink-0">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-pink-600 to-rose-500 flex items-center justify-center text-white text-lg shadow-sm">
                        <i class="fa-regular fa-calendar-check"></i>
                    </div>
                    <div>
                        <h3 class="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                            Kalender Editorial Konten & Kreator
                            <span class="text-[10px] font-mono px-2 py-0.5 rounded-full bg-pink-500/15 text-pink-600 dark:text-pink-400 border border-pink-500/30">Social Media Hub</span>
                        </h3>
                        <p class="text-xs text-slate-500 dark:text-slate-400">Jadwal publikasi multi-platform (Instagram, TikTok, X, LinkedIn) & pratinjau mockup smartphone</p>
                    </div>
                </div>
                <button onclick="window.app.closeContentCalendarModal()" class="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1">
                    <i class="fa-solid fa-xmark text-lg"></i>
                </button>
            </div>

            <!-- Metrics & Preset Shortcuts Bar -->
            <div class="py-3 border-b border-slate-200 dark:border-white/10 shrink-0 flex flex-wrap items-center justify-between gap-3">
                <div class="flex items-center gap-2 text-xs">
                    <div class="px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono">
                        Total: <strong id="cal-count-total">0</strong>
                    </div>
                    <div class="px-3 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-mono">
                        Draft: <strong id="cal-count-draft">0</strong>
                    </div>
                    <div class="px-3 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-mono">
                        Review: <strong id="cal-count-review">0</strong>
                    </div>
                    <div class="px-3 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-mono">
                        Siap: <strong id="cal-count-siap">0</strong>
                    </div>
                </div>

                <!-- Creator Shortcut Presets -->
                <div class="flex items-center gap-1.5 flex-wrap">
                    <button onclick="window.app.openQuickPresetModal('reels_viral')"
                            class="px-2.5 py-1 rounded-lg text-xs font-semibold bg-gradient-to-r from-purple-500/15 to-pink-500/15 hover:from-purple-500/25 hover:to-pink-500/25 text-pink-600 dark:text-pink-300 border border-pink-500/30 flex items-center gap-1 transition-all cursor-pointer">
                        <span>🚀 Reels Viral</span>
                    </button>
                    <button onclick="window.app.openQuickPresetModal('tiktok_60s')"
                            class="px-2.5 py-1 rounded-lg text-xs font-semibold bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-600 dark:text-cyan-300 border border-cyan-500/30 flex items-center gap-1 transition-all cursor-pointer">
                        <span>🎬 TikTok 60s</span>
                    </button>
                    <button onclick="window.app.openQuickPresetModal('twitter_thread')"
                            class="px-2.5 py-1 rounded-lg text-xs font-semibold bg-sky-500/15 hover:bg-sky-500/25 text-sky-600 dark:text-sky-300 border border-sky-500/30 flex items-center gap-1 transition-all cursor-pointer">
                        <span>🧵 Thread X</span>
                    </button>
                    <button onclick="window.app.openQuickPresetModal('brand_brainstorm')"
                            class="px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-500/15 hover:bg-amber-500/25 text-amber-600 dark:text-amber-300 border border-amber-500/30 flex items-center gap-1 transition-all cursor-pointer">
                        <span>💡 5 Brand Angles</span>
                    </button>
                </div>
            </div>

            <!-- Filters Bar -->
            <div class="py-2.5 flex items-center justify-between gap-3 shrink-0">
                <div class="flex items-center gap-2">
                    <select id="calendar-filter-platform" onchange="window.app.loadContentCalendar()"
                            class="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-white/10 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200">
                        <option value="all">Semua Platform</option>
                        <option value="instagram">Instagram</option>
                        <option value="tiktok">TikTok</option>
                        <option value="twitter">X / Twitter</option>
                        <option value="linkedin">LinkedIn</option>
                    </select>

                    <select id="calendar-filter-status" onchange="window.app.loadContentCalendar()"
                            class="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-white/10 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200">
                        <option value="all">Semua Status</option>
                        <option value="ide">Ide</option>
                        <option value="draft_selesai">Draft Selesai</option>
                        <option value="menunggu_review">Menunggu Review</option>
                        <option value="siap_publikasi">Siap Publikasi</option>
                    </select>
                </div>

                <button onclick="window.app.loadContentCalendar()" class="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" title="Muat Ulang">
                    <i class="fa-solid fa-arrows-rotate text-xs"></i>
                </button>
            </div>

            <!-- Grid Container -->
            <div id="content-calendar-grid" class="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 pr-1">
                <!-- Dynamically populated -->
            </div>
        </div>
    </div>

    <!-- MODAL: QUICK CREATOR PRESET GENERATOR -->
    <div id="modal-content-generator" class="hidden fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop" onclick="if(event.target === this) window.app.closeQuickPresetModal()">
        <div class="glass-panel-elevated rounded-2xl w-full max-w-lg border border-pink-500/30 p-6 modal-content-animated shadow-2xl bg-white dark:bg-slate-900 text-left">
            <div class="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10 mb-4">
                <div class="flex items-center gap-2.5">
                    <div class="w-9 h-9 rounded-xl bg-pink-600 flex items-center justify-center text-white text-base shadow-sm">
                        <i class="fa-solid fa-wand-magic-sparkles"></i>
                    </div>
                    <div>
                        <h3 id="gen-preset-title" class="font-bold text-sm text-slate-900 dark:text-white">Generate Konten Media Sosial</h3>
                        <p class="text-[11px] text-slate-500 dark:text-slate-400">AI Creator Assistant • Otomatis Draf & Hashtag</p>
                    </div>
                </div>
                <button onclick="window.app.closeQuickPresetModal()" class="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1">
                    <i class="fa-solid fa-xmark text-lg"></i>
                </button>
            </div>

            <input type="hidden" id="gen-preset-key" value="reels_viral">

            <div class="space-y-3 mb-5">
                <div>
                    <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Topik / Ide Utama:
                    </label>
                    <textarea id="gen-preset-topic" rows="3"
                              class="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-white/10 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                              placeholder="Masukkan topik konten yang ingin dibuat..."></textarea>
                </div>
            </div>

            <div class="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-white/10">
                <button type="button" onclick="window.app.closeQuickPresetModal()"
                        class="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                    Batal
                </button>
                <button type="button" id="btn-run-generator" onclick="window.app.runQuickPresetGenerator()"
                        class="px-5 py-2.5 rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 text-white font-semibold text-xs shadow-md shadow-pink-600/30 flex items-center gap-1.5 transition-all cursor-pointer">
                    <i class="fa-solid fa-wand-magic-sparkles"></i>
                    <span>Hasilkan Konten Sekarang</span>
                </button>
            </div>
        </div>
    </div>

    <!-- MODAL: POST MOCKUP PREVIEWER -->
    <div id="modal-post-mockup" class="hidden fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop" onclick="if(event.target === this) window.app.closePostMockupModal()">
        <div class="glass-panel-elevated rounded-2xl w-full max-w-xl max-h-[92vh] flex flex-col border border-slate-200 dark:border-white/15 p-6 modal-content-animated shadow-2xl bg-white dark:bg-slate-900 text-left overflow-hidden">
            <div class="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10 shrink-0">
                <div class="flex items-center gap-2.5">
                    <div class="w-9 h-9 rounded-xl bg-slate-900 dark:bg-slate-800 border border-slate-200 dark:border-white/10 flex items-center justify-center text-pink-500 text-base shadow-sm">
                        <i class="fa-solid fa-mobile-screen"></i>
                    </div>
                    <div>
                        <h3 id="mockup-title" class="font-bold text-sm text-slate-900 dark:text-white truncate max-w-sm">Pratinjau Mockup Post</h3>
                        <p id="mockup-reading-time" class="text-[11px] text-slate-500 dark:text-slate-400">⏱️ 30 detik baca</p>
                    </div>
                </div>
                <button onclick="window.app.closePostMockupModal()" class="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1">
                    <i class="fa-solid fa-xmark text-lg"></i>
                </button>
            </div>

            <div class="flex-1 overflow-y-auto py-4 space-y-4">
                <!-- Smartphone Shell -->
                <div class="mx-auto max-w-[340px] bg-slate-900 rounded-[2.5rem] p-3 shadow-2xl border-4 border-slate-800 relative">
                    <!-- Notch -->
                    <div class="w-24 h-4 bg-slate-800 rounded-full mx-auto mb-2 flex items-center justify-center">
                        <div class="w-2.5 h-2.5 rounded-full bg-slate-950"></div>
                    </div>
                    <!-- Screen Content -->
                    <div id="phone-screen-content" class="rounded-[1.8rem] overflow-hidden bg-white text-slate-900">
                    </div>
                </div>

                <!-- Hashtag Analysis Box -->
                <div id="mockup-hashtag-analysis" class="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-white/10 text-xs">
                </div>
            </div>
        </div>
    </div>

    <!-- MODAL: DELIVERABLES & DIFF VIEWER -->
    <div id="modal-deliverables-viewer" class="hidden fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop" onclick="if(event.target === this) window.app.closeDeliverablesModal()">
        <div class="glass-panel-elevated rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col border border-emerald-500/30 p-6 modal-content-animated shadow-2xl bg-white dark:bg-slate-900 text-left overflow-hidden">
            <div class="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10 shrink-0">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white text-lg shadow-sm">
                        <i class="fa-solid fa-box-archive"></i>
                    </div>
                    <div>
                        <h3 class="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                            Deliverables, Artefak & Git Diff Viewer
                            <span class="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">Output Manager</span>
                        </h3>
                        <p class="text-xs text-slate-500 dark:text-slate-400">Inspeksi berkas nyata di direktori proyek, salin kode, unduh berkas, & perbandingan git diff</p>
                    </div>
                </div>
                <button onclick="window.app.closeDeliverablesModal()" class="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1">
                    <i class="fa-solid fa-xmark text-lg"></i>
                </button>
            </div>

            <div id="deliverables-content-area" class="flex-1 overflow-y-auto pr-1">
                <!-- Dynamically populated by deliverables.js -->
            </div>
        </div>
    </div>

    <!-- MODAL: TASK REVISION PROMPT -->
    <div id="modal-task-revision" class="hidden fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop" onclick="if(event.target === this) window.app.closeTaskRevisionModal()">
        <div class="glass-panel-elevated rounded-2xl w-full max-w-md border border-amber-500/30 p-6 modal-content-animated shadow-2xl bg-white dark:bg-slate-900 text-left">
            <div class="flex items-center gap-3 mb-4">
                <div class="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400 text-lg shrink-0">
                    <i class="fa-solid fa-pen-to-square"></i>
                </div>
                <div>
                    <h3 class="font-bold text-base text-slate-900 dark:text-white">Minta Revisi ke Agent</h3>
                    <p class="text-xs text-slate-500 dark:text-slate-400">Instruksikan perbaikan spesifik sebelum menyetujui tugas</p>
                </div>
            </div>

            <div class="space-y-3 mb-5">
                <div>
                    <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Catatan Revisi & Feedback Anda:
                    </label>
                    <textarea id="task-revision-notes-input" rows="4"
                              class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-white/10 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                              placeholder="Contoh: Tambahkan unit test untuk validasi role ADMIN, dan ubah masa berlaku token JWT menjadi 7 hari."></textarea>
                </div>
            </div>

            <div class="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-white/10">
                <button type="button" onclick="window.app.closeTaskRevisionModal()"
                        class="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer">
                    Batal
                </button>
                <button type="button" onclick="window.app.submitTaskRevision()"
                        class="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs shadow-md shadow-amber-600/25 flex items-center gap-1.5 transition-all cursor-pointer">
                    <i class="fa-solid fa-paper-plane text-xs"></i>
                    <span>Kirim Catatan Revisi</span>
                </button>
            </div>
        </div>
    </div>

    <!-- MODAL: AUTONOMOUS CRON & SCHEDULED TASKS -->
    <div id="modal-schedules" class="hidden fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop" onclick="if(event.target === this) window.app.closeSchedulesModal()">
        <div class="glass-panel-elevated rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col border border-violet-500/30 p-6 modal-content-animated shadow-2xl bg-white dark:bg-slate-900 text-left overflow-hidden">
            <!-- Header -->
            <div class="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10 shrink-0">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl bg-violet-600 flex items-center justify-center text-white text-lg shadow-sm">
                        <i class="fa-regular fa-clock"></i>
                    </div>
                    <div>
                        <h3 class="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                            Penjadwalan Otomatis (Autonomous Cron)
                            <span class="text-[10px] font-mono px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-600 dark:text-violet-400 border border-violet-500/30">Recurring Engine</span>
                        </h3>
                        <p class="text-xs text-slate-500 dark:text-slate-400">Eksekusi tugas rutin, riset berita AI, tren konten harian, & evaluasi otomatis</p>
                    </div>
                </div>
                <button onclick="window.app.closeSchedulesModal()" class="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 cursor-pointer">
                    <i class="fa-solid fa-xmark text-lg"></i>
                </button>
            </div>

            <!-- Quick Presets -->
            <div class="py-3 border-b border-slate-200 dark:border-white/10 shrink-0 flex flex-wrap items-center justify-between gap-2">
                <div class="text-xs font-bold text-slate-700 dark:text-slate-300">
                    <i class="fa-solid fa-bolt text-violet-500 mr-1"></i>Preset Rutin Otomatis:
                </div>
                <div class="flex items-center gap-1.5 flex-wrap">
                    <button onclick="window.app.createPresetSchedule('tech_news')"
                            class="px-2.5 py-1 rounded-lg text-xs font-semibold bg-violet-500/10 hover:bg-violet-500/20 text-violet-600 dark:text-violet-400 border border-violet-500/30 flex items-center gap-1 transition-all cursor-pointer">
                        <span>📰 Rekap AI Pagi (08:30)</span>
                    </button>
                    <button onclick="window.app.createPresetSchedule('social_trends')"
                            class="px-2.5 py-1 rounded-lg text-xs font-semibold bg-pink-500/10 hover:bg-pink-500/20 text-pink-600 dark:text-pink-400 border border-pink-500/30 flex items-center gap-1 transition-all cursor-pointer">
                        <span>📱 Tren Medsos Sore (13:00)</span>
                    </button>
                    <button onclick="window.app.createPresetSchedule('weekly_eval')"
                            class="px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 flex items-center gap-1 transition-all cursor-pointer">
                        <span>🤝 Evaluasi Jumat (16:00)</span>
                    </button>
                </div>
            </div>

            <!-- List Container -->
            <div id="schedules-list-container" class="flex-1 overflow-y-auto py-3 pr-1">
                <!-- Populated dynamically -->
            </div>
        </div>
    </div>

    <!-- MODAL: COMPANY KNOWLEDGE BASE / RAG -->
    <div id="modal-knowledge-base" class="hidden fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop" onclick="if(event.target === this) window.app.closeKnowledgeBaseModal()">
        <div class="glass-panel-elevated rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col border border-amber-500/30 p-6 modal-content-animated shadow-2xl bg-white dark:bg-slate-900 text-left overflow-hidden">
            <!-- Header -->
            <div class="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10 shrink-0">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl bg-amber-600 flex items-center justify-center text-white text-lg shadow-sm">
                        <i class="fa-solid fa-book-bookmark"></i>
                    </div>
                    <div>
                        <h3 class="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                            Basis Pengetahuan Terpusat (Company Knowledge Base / RAG)
                            <span class="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">Auto-Injected Context</span>
                        </h3>
                        <p class="text-xs text-slate-500 dark:text-slate-400">Unggah PDF, Markdown, atau TXT. Seluruh AI Agent otomatis merujuk dokumen resmi ini!</p>
                    </div>
                </div>
                <button onclick="window.app.closeKnowledgeBaseModal()" class="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 cursor-pointer">
                    <i class="fa-solid fa-xmark text-lg"></i>
                </button>
            </div>

            <!-- Upload & Toolbar Bar -->
            <div class="py-3 border-b border-slate-200 dark:border-white/10 shrink-0 space-y-3">
                <form id="kb-upload-form" onsubmit="event.preventDefault(); window.app.uploadKnowledgeDoc(this);" class="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-white/10 flex flex-wrap items-center gap-2">
                    <input type="text" name="title" placeholder="Judul Dokumen (Opsional)"
                           class="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white flex-1 min-w-[180px]">

                    <select name="category" class="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200">
                        <option value="brand_guidelines">Brand Voice & Guidelines</option>
                        <option value="sop">SOP Perusahaan & Engineering</option>
                        <option value="api_docs">Dokumentasi API</option>
                        <option value="product_catalog">Katalog Produk & Fitur</option>
                        <option value="general">Umum</option>
                    </select>

                    <input type="file" name="file" accept=".pdf,.md,.txt,.json"
                           class="text-xs text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-amber-500/15 file:text-amber-700 dark:file:text-amber-300 hover:file:bg-amber-500/25 cursor-pointer">

                    <button type="submit"
                            class="px-4 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs shadow-sm flex items-center gap-1.5 transition-all cursor-pointer">
                        <i class="fa-solid fa-cloud-arrow-up"></i>
                        <span>Unggah Dokumen</span>
                    </button>

                    <button type="button" onclick="window.app.seedPresetKnowledge()"
                            class="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                            title="Muat 3 template SOP dan Brand Guidelines standar">
                        <i class="fa-solid fa-wand-magic-sparkles text-amber-500"></i>
                        <span>Template Standar</span>
                    </button>
                </form>

                <!-- Filter & Search -->
                <div class="flex items-center justify-between gap-3">
                    <div class="flex items-center gap-2">
                        <select id="kb-filter-category" onchange="window.app.loadKnowledgeBase()"
                                class="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200">
                            <option value="all">Semua Kategori</option>
                            <option value="brand_guidelines">Brand Guidelines</option>
                            <option value="sop">SOP</option>
                            <option value="api_docs">API Docs</option>
                            <option value="product_catalog">Katalog Produk</option>
                        </select>
                        <input type="text" id="kb-search-input" onkeyup="if(event.key==='Enter') window.app.loadKnowledgeBase()" placeholder="Cari isi dokumen..."
                               class="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white">
                    </div>
                    <button onclick="window.app.loadKnowledgeBase()" class="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors cursor-pointer">
                        <i class="fa-solid fa-arrows-rotate text-xs"></i>
                    </button>
                </div>
            </div>

            <!-- Grid Container -->
            <div id="knowledge-list-container" class="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 py-3 pr-1">
                <!-- Populated dynamically -->
            </div>
        </div>
    </div>

    <!-- MODAL: REAL API COST CALCULATOR & BUDGET ALERT -->
    <div id="modal-cost-calculator" class="hidden fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop" onclick="if(event.target === this) window.app.closeCostCalculatorModal()">
        <div class="glass-panel-elevated rounded-2xl w-full max-w-3xl max-h-[92vh] flex flex-col border border-purple-500/30 p-6 modal-content-animated shadow-2xl bg-white dark:bg-slate-900 text-left overflow-hidden">
            <!-- Header -->
            <div class="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10 shrink-0">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl bg-purple-600 flex items-center justify-center text-white text-lg shadow-sm">
                        <i class="fa-solid fa-coins"></i>
                    </div>
                    <div>
                        <h3 class="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                            Kalkulator Biaya Token & Budget Alert
                            <span class="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30">USD / IDR</span>
                        </h3>
                        <p class="text-xs text-slate-500 dark:text-slate-400">Estimasi pengeluaran API riil per model LLM & proteksi anggaran mingguan</p>
                    </div>
                </div>
                <button onclick="window.app.closeCostCalculatorModal()" class="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 cursor-pointer">
                    <i class="fa-solid fa-xmark text-lg"></i>
                </button>
            </div>

            <!-- Content Area -->
            <div class="flex-1 overflow-y-auto py-4 space-y-4">
                <!-- Metric Cards -->
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div class="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-white/10">
                        <div class="text-[10px] uppercase font-bold text-slate-400 mb-1">Total Token Terpakai:</div>
                        <div id="cost-total-tokens" class="text-lg font-extrabold font-mono text-blue-600 dark:text-cyan-300">0</div>
                    </div>
                    <div class="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-white/10">
                        <div class="text-[10px] uppercase font-bold text-slate-400 mb-1">Estimasi Biaya (USD):</div>
                        <div id="cost-total-usd" class="text-lg font-extrabold font-mono text-purple-600 dark:text-purple-400">$0.00</div>
                    </div>
                    <div class="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-white/10">
                        <div class="text-[10px] uppercase font-bold text-slate-400 mb-1">Estimasi Biaya (Rupiah):</div>
                        <div id="cost-total-idr" class="text-lg font-extrabold font-mono text-emerald-600 dark:text-emerald-400">Rp 0</div>
                    </div>
                </div>

                <!-- Weekly Budget Meter Box -->
                <div class="p-4 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200/60 dark:border-indigo-800/40">
                    <div class="flex items-center justify-between text-xs mb-2">
                        <span class="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                            <i class="fa-solid fa-chart-pie text-indigo-500"></i>
                            Batas Anggaran Mingguan:
                        </span>
                        <div class="flex items-center gap-2">
                            <span id="cost-budget-percent" class="font-mono font-bold text-indigo-600 dark:text-indigo-400">0%</span>
                            <span class="text-slate-400">(Limit: <strong id="cost-budget-idr">Rp 810.000</strong>)</span>
                        </div>
                    </div>
                    <div class="w-full h-3 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden p-0.5">
                        <div id="cost-budget-bar" class="h-full rounded-full bg-emerald-500 transition-all" style="width: 0%"></div>
                    </div>
                </div>

                <!-- Breakdown per Agent Table -->
                <div>
                    <h4 class="font-bold text-xs text-slate-800 dark:text-slate-200 mb-2">Rincian Konsumsi Token & Biaya per Agent:</h4>
                    <div class="rounded-xl border border-slate-200 dark:border-white/10 overflow-hidden">
                        <table class="w-full text-left text-xs">
                            <thead class="bg-slate-100 dark:bg-slate-800/80 text-slate-500 font-semibold border-b border-slate-200 dark:border-white/10">
                                <tr>
                                    <th class="py-2 px-3">Agent</th>
                                    <th class="py-2 px-3 text-right">Tokens</th>
                                    <th class="py-2 px-3 text-right">Biaya (USD)</th>
                                    <th class="py-2 px-3 text-right">Biaya (IDR)</th>
                                </tr>
                            </thead>
                            <tbody id="cost-agents-tbody">
                                <!-- Populated dynamically -->
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- Budget & Rate Settings Box -->
                <div class="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-white/10">
                    <div class="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">Konfigurasi Budget Limit:</div>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-2.5">
                        <div>
                            <label class="block text-[11px] text-slate-500 mb-1">Limit Budget Mingguan (USD):</label>
                            <input type="number" id="cost-budget-usd" step="1" min="1" value="50"
                                   class="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-900 text-xs font-mono text-slate-900 dark:text-white">
                        </div>
                        <div>
                            <label class="block text-[11px] text-slate-500 mb-1">Kurs 1 USD ke IDR:</label>
                            <input type="number" id="cost-rate-idr" step="100" min="1000" value="16200"
                                   class="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-900 text-xs font-mono text-slate-900 dark:text-white">
                        </div>
                    </div>
                    <div class="flex justify-end">
                        <button type="button" onclick="window.app.saveBudgetSettings()"
                                class="px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs transition-colors cursor-pointer">
                            Simpan Limit Budget
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Toast Notification Container -->
    <div id="toast-container" class="fixed top-20 right-6 z-50 flex flex-col gap-2 pointer-events-none"></div>

    <!-- Application Script with Auto Cache Busting -->
    <script src="assets/js/office-3d.js?v=<?= @filemtime(__DIR__ . '/assets/js/office-3d.js') ?: time() ?>"></script>
    <script src="assets/js/app.js?v=<?= @filemtime(__DIR__ . '/assets/js/app.js') ?: time() ?>"></script>
    <script src="assets/js/war-room.js?v=<?= @filemtime(__DIR__ . '/assets/js/war-room.js') ?: time() ?>"></script>
    <script src="assets/js/content-calendar.js?v=<?= @filemtime(__DIR__ . '/assets/js/content-calendar.js') ?: time() ?>"></script>
    <script src="assets/js/deliverables.js?v=<?= @filemtime(__DIR__ . '/assets/js/deliverables.js') ?: time() ?>"></script>
    <script src="assets/js/schedules.js?v=<?= @filemtime(__DIR__ . '/assets/js/schedules.js') ?: time() ?>"></script>
    <script src="assets/js/knowledge-base.js?v=<?= @filemtime(__DIR__ . '/assets/js/knowledge-base.js') ?: time() ?>"></script>
    <script src="assets/js/cost-calculator.js?v=<?= @filemtime(__DIR__ . '/assets/js/cost-calculator.js') ?: time() ?>"></script>
    <script src="assets/js/audio-ambience.js?v=<?= @filemtime(__DIR__ . '/assets/js/audio-ambience.js') ?: time() ?>"></script>
</body>
</html>
