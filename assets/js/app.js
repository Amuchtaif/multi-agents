/**
 * Kantor Virtual HQ - Application Controller
 * Handles UI interactions, API CRUD, Real-Time SSE, 3D Canvas, and Light/Dark Themes
 */

class AppController {
    constructor() {
        this.agents = [];
        this.tasks = {
            deadline_dekat: [],
            nunggu_owner: [],
            ide_nanti: []
        };
        this.taskCounts = { total: 0, pending: 0, completed: 0 };
        this.logs = [];
        this.activeLogFilter = 'all'; // 'all' or agentId
        this.selectedAgent = null;
        this.isSimulating = true; // Default simulation active for lively demo!
        this.simulationTimer = null;
        this.sseSource = null;
        this.office3D = null;
        this.isAutoScrollLogs = true;
        this.aiSettings = null;
        this.aiMode = 'real_ai'; // 'real_ai' (Real AI Live) or 'simulation' (Mock Generator)

        // Theme management: Default is 'light'
        this.theme = localStorage.getItem('kantor_theme') || 'light';

        this.init();
    }

    async init() {
        // 1. Apply theme
        this.applyTheme(this.theme, false);

        // 2. Initialize 3D Isometric Virtual Office
        this.init3DOffice();

        // 3. Setup DOM event listeners
        this.setupEventListeners();

        // 4. Initial data fetch
        await this.loadAgents();
        await this.loadTasks();
        await this.loadLogs();
        await this.loadAISettings();

        // 5. Start Real-Time SSE stream
        this.startSSE();

        // 6. Start background loop (handles both simulation and Real AI auto execution)
        this.startSimulationLoop();
    }

    // ==========================================
    // THEME MANAGEMENT (LIGHT / DARK)
    // ==========================================

    applyTheme(theme, updateStorage = true) {
        this.theme = theme;
        if (updateStorage) {
            localStorage.setItem('kantor_theme', theme);
        }

        const htmlEl = document.documentElement;
        if (theme === 'dark') {
            htmlEl.classList.add('dark');
        } else {
            htmlEl.classList.remove('dark');
        }

        // Update 3D office theme
        if (this.office3D) {
            this.office3D.setTheme(theme);
        }

        // Update UI Button (Icon only)
        const iconEl = document.getElementById('theme-toggle-icon');
        const textEl = document.getElementById('theme-toggle-text');
        const btnTheme = document.getElementById('btn-toggle-theme');
        if (iconEl) {
            if (theme === 'dark') {
                iconEl.className = 'fa-solid fa-moon text-indigo-400 text-sm';
                if (textEl) textEl.textContent = 'Mode Gelap';
                if (btnTheme) btnTheme.title = 'Ganti ke Mode Terang';
            } else {
                iconEl.className = 'fa-solid fa-sun text-amber-500 text-sm';
                if (textEl) textEl.textContent = 'Mode Terang';
                if (btnTheme) btnTheme.title = 'Ganti ke Mode Gelap';
            }
        }

        // Re-render cards & tasks to refresh dynamic theme styles if needed
        if (this.agents.length > 0) {
            this.renderAgentCards();
            this.renderTasks();
            this.renderLogs();
        }
    }

    toggleTheme() {
        const nextTheme = this.theme === 'light' ? 'dark' : 'light';
        this.applyTheme(nextTheme, true);
    }

    // ==========================================
    // 3D OFFICE INITIALIZATION
    // ==========================================

    init3DOffice() {
        this.office3D = new Office3D('threejs-canvas-container', {
            theme: this.theme,
            onAgentSelected: (agentData) => {
                this.handleAgentSelectedFrom3D(agentData);
            }
        });
    }

    // ==========================================
    // API DATA FETCHING
    // ==========================================

    async loadAgents() {
        try {
            const res = await fetch('api/agents.php');
            const data = await res.json();
            if (data.success) {
                this.agents = data.data;
                this.renderAgentCards();
                this.renderAgentFilterPills();
                this.updateGlobalHeaderStats();
                this.populateAgentSelectDropdowns();

                // Sync 3D scene
                if (this.office3D) {
                    this.office3D.syncAgents(this.agents);
                }
            }
        } catch (err) {
            console.error('Error fetching agents:', err);
        }
    }

    async loadTasks() {
        try {
            const res = await fetch('api/tasks.php');
            const data = await res.json();
            if (data.success) {
                this.tasks = data.categories;
                this.taskCounts = data.counts;
                this.renderTasks();
                this.updateGlobalHeaderStats();
            }
        } catch (err) {
            console.error('Error fetching tasks:', err);
        }
    }

    async loadLogs() {
        try {
            let url = 'api/logs.php?limit=50';
            if (this.activeLogFilter !== 'all') {
                url += `&agent_id=${this.activeLogFilter}`;
            }
            const res = await fetch(url);
            const data = await res.json();
            if (data.success) {
                this.logs = data.data;
                this.renderLogs();
            }
        } catch (err) {
            console.error('Error fetching logs:', err);
        }
    }

    // ==========================================
    // REAL-TIME SYNC (SSE)
    // ==========================================

    startSSE() {
        if (this.sseSource) {
            this.sseSource.close();
        }

        const lastLogId = this.logs.length > 0 ? this.logs[0].id : 0;
        const simulateParam = (this.aiMode === 'simulation') ? 1 : 0;
        const sseUrl = `api/stream.php?last_log_id=${lastLogId}&simulate=${simulateParam}`;

        try {
            this.sseSource = new EventSource(sseUrl);

            this.sseSource.onopen = () => {
                this.updateConnectionStatus(true);
            };

            this.sseSource.onmessage = (e) => {
                try {
                    const payload = JSON.parse(e.data);
                    this.handleSSEPayload(payload);
                } catch (parseErr) {
                    console.error('SSE JSON parse error:', parseErr);
                }
            };

            this.sseSource.addEventListener('cycle', () => {
                this.startSSE();
            });

            this.sseSource.onerror = () => {
                this.updateConnectionStatus(false);
                this.sseSource.close();
                setTimeout(() => this.startSSE(), 3000);
            };
        } catch (e) {
            console.warn('SSE failed, falling back to polling:', e);
        }
    }

    handleSSEPayload(payload) {
        if (payload.agents) {
            this.agents = payload.agents;
            this.renderAgentCards();
            this.updateGlobalHeaderStats();
            if (this.office3D) {
                this.office3D.syncAgents(this.agents);
            }
        }

        if (payload.task_counts) {
            this.taskCounts = payload.task_counts;
            this.updateGlobalHeaderStats();
        }

        if (payload.new_logs && payload.new_logs.length > 0) {
            payload.new_logs.forEach(log => {
                if (!this.logs.some(l => l.id === log.id)) {
                    this.logs.unshift(log);
                }
            });
            if (this.logs.length > 100) {
                this.logs = this.logs.slice(0, 100);
            }
            this.renderLogs();
        }
    }

    updateConnectionStatus(status = 'connected') {
        const dot = document.getElementById('sse-status-dot');
        const text = document.getElementById('sse-status-text');
        const badge = document.getElementById('sse-status-badge');
        if (!dot || !text) return;

        let state = status;
        if (status === true) state = 'connected';
        if (status === false) state = 'reconnecting';

        const isRealAi = (this.aiMode === 'real_ai');

        if (state === 'connected') {
            if (isRealAi) {
                dot.className = 'w-2 h-2 rounded-full bg-emerald-500 pulse-green';
                text.textContent = 'Live SSE • Real AI';
                text.className = 'text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold';
                if (badge) badge.title = 'Terhubung via Server-Sent Events (SSE) • Mode Real AI Live Aktif';
            } else {
                dot.className = 'w-2 h-2 rounded-full bg-blue-500 pulse-cyan';
                text.textContent = 'Live SSE • Simulasi';
                text.className = 'text-[11px] text-blue-600 dark:text-cyan-400 font-semibold';
                if (badge) badge.title = 'Terhubung via Server-Sent Events (SSE) • Mode Simulasi Otomatis Aktif';
            }
        } else if (state === 'connecting' || state === 'reconnecting') {
            dot.className = 'w-2 h-2 rounded-full bg-amber-500 pulse-amber';
            text.textContent = 'Menghubungkan SSE...';
            text.className = 'text-[11px] text-amber-600 dark:text-amber-400 font-semibold';
            if (badge) badge.title = 'Mencoba menyambungkan kembali ke stream SSE...';
        } else {
            dot.className = 'w-2 h-2 rounded-full bg-rose-500';
            text.textContent = 'SSE Terputus (Offline)';
            text.className = 'text-[11px] text-rose-600 dark:text-rose-400 font-semibold';
            if (badge) badge.title = 'Koneksi real-time terputus. Sistem menggunakan mode polling.';
        }
    }

    // ==========================================
    // SIMULATION ENGINE
    // ==========================================

    updateModeToggleUI() {
        const btn = document.getElementById('btn-toggle-simulation');
        const icon = document.getElementById('mode-toggle-icon');
        const text = document.getElementById('mode-toggle-text');
        const badge = document.getElementById('mode-toggle-badge');
        if (!btn) return;

        const isRealAi = this.aiMode === 'real_ai';

        if (isRealAi) {
            btn.className = "px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 border border-purple-500/40 dark:border-purple-500/50 flex items-center gap-2 shadow-sm transition-all cursor-pointer";
            btn.title = "Mode Aktif: Real AI Live (Model LLM Nyata). Klik untuk beralih ke Mode Simulasi.";
            if (icon) icon.className = "fa-solid fa-bolt text-purple-600 dark:text-purple-400";
            if (text) text.textContent = "Real AI Live";
            if (badge) {
                badge.className = "px-1.5 py-0.2 rounded text-[9px] font-bold uppercase bg-purple-500/20 text-purple-600 dark:text-purple-300 border border-purple-500/30";
                badge.textContent = "Aktif";
            }
        } else {
            btn.className = "px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 border border-amber-500/40 dark:border-amber-500/50 flex items-center gap-2 shadow-sm transition-all cursor-pointer";
            btn.title = "Mode Aktif: Simulasi Otomatis (Generator Mock). Klik untuk beralih ke Real AI Live Mode.";
            if (icon) icon.className = "fa-solid fa-gamepad text-amber-500";
            if (text) text.textContent = "Simulasi";
            if (badge) {
                badge.className = "px-1.5 py-0.2 rounded text-[9px] font-bold uppercase bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30";
                badge.textContent = "Aktif";
            }
        }
    }

    async toggleAIMode() {
        if (this._isTogglingMode) return;
        this._isTogglingMode = true;

        const nextMode = (this.aiMode === 'real_ai') ? 'simulation' : 'real_ai';
        this.aiMode = nextMode;
        const isRealAi = (nextMode === 'real_ai');
        this.isSimulating = !isRealAi;

        this.updateModeToggleUI();
        this.updateGlobalHeaderStats();
        this.renderAgentCards();
        this.updateConnectionStatus('connected');

        // Persist settings in backend
        try {
            await fetch('api/settings.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    real_ai_enabled: isRealAi ? '1' : '0',
                    auto_execution: isRealAi ? '1' : '0'
                })
            });

            if (this.aiSettings) {
                this.aiSettings.real_ai_enabled = isRealAi ? '1' : '0';
                this.aiSettings.auto_execution = isRealAi ? '1' : '0';
            }

            // Sync modal checkboxes if modal elements exist
            const realAiChk = document.getElementById('setting-real-ai-enabled');
            if (realAiChk) realAiChk.checked = isRealAi;
            const autoExecChk = document.getElementById('setting-auto-execution');
            if (autoExecChk) autoExecChk.checked = isRealAi;

            if (isRealAi) {
                this.showToast('⚡ Mode beralih ke: <strong>Real AI Live</strong> (Model LLM Nyata & Sinkronisasi Token Aktif)', 'success');
            } else {
                this.showToast('🎮 Mode beralih ke: <strong>Simulasi Otomatis</strong> (Aktivitas virtual generator mock aktif)', 'info');
            }
        } catch (e) {
            console.error('Failed to sync AI mode to server:', e);
        } finally {
            this._isTogglingMode = false;
        }

        // Restart SSE connection with updated simulate parameter
        this.startSSE();
    }

    toggleSimulation() {
        return this.toggleAIMode();
    }

    startSimulationLoop() {
        if (this.simulationTimer) clearInterval(this.simulationTimer);
        this.simulationTimer = setInterval(async () => {
            // Stop if no agents or all agents are paused
            if (!this.agents || this.agents.length === 0) return;
            const hasWorkingAgent = this.agents.some(a => a.status === 'KERJA');
            const allPaused = this.agents.every(a => a.status === 'PAUSED');

            // If in Real AI mode: check if auto backlog execution is requested
            if (this.aiMode === 'real_ai') {
                const autoExec = this.aiSettings && (this.aiSettings.auto_execution === '1' || this.aiSettings.auto_execution === true);
                if (autoExec && hasWorkingAgent && !this.isAutoExecutingRealAI) {
                    this.runRealAIAutoBacklogStep();
                }
            }

            // If all agents are paused, don't tick simulation (saves CPU & prevents accidental updates)
            if (allPaused) return;

            // Autonomous Simulation & Multi-Agent Research Generator
            try {
                const res = await fetch('api/simulate.php', { method: 'POST' });
                const data = await res.json();
                if (data.success) {
                    let hasNewLogs = false;
                    let hasTaskComplete = false;

                    const eventsToProcess = (data.events && Array.isArray(data.events) && data.events.length > 0)
                        ? data.events
                        : (data.event ? [data.event] : []);

                    eventsToProcess.forEach(evt => {
                        this.logs.unshift({
                            id: evt.id,
                            agent_id: evt.agent_id,
                            agent_name: evt.agent_name,
                            agent_avatar_color: evt.avatar_color,
                            log_type: evt.type,
                            message: evt.message,
                            created_at: new Date().toISOString()
                        });
                        hasNewLogs = true;
                        if (evt.type === 'task_complete' || evt.task_completed) {
                            hasTaskComplete = true;
                        }
                    });

                    if (hasNewLogs) {
                        this.renderLogs();
                    }

                    const agentsToUpdate = (data.simulated_agents && Array.isArray(data.simulated_agents) && data.simulated_agents.length > 0)
                        ? data.simulated_agents
                        : (data.simulated_agent ? [data.simulated_agent] : []);

                    agentsToUpdate.forEach(updated => {
                        const idx = this.agents.findIndex(a => a.id == updated.id);
                        if (idx !== -1) {
                            this.agents[idx] = { ...this.agents[idx], ...updated };
                            if (this.office3D) {
                                this.office3D.updateAgentWorkstation(updated.id, this.agents[idx]);
                            }
                        }
                    });

                    if (agentsToUpdate.length > 0) {
                        this.renderAgentCards();
                        this.updateGlobalHeaderStats();
                    }

                    if (hasTaskComplete) {
                        await this.loadTasks();
                    }
                }
            } catch (e) {
                console.warn('Simulation tick error:', e);
            }
        }, 3500);
    }

    async runRealAIAutoBacklogStep() {
        if (this.isAutoExecutingRealAI) return;
        if (!this.agents || this.agents.length === 0) return;

        // Only run if at least one agent is actively in KERJA status
        const hasWorkingAgent = this.agents.some(a => a.status === 'KERJA');
        if (!hasWorkingAgent) return;

        const allTasks = [
            ...(this.tasks.deadline_dekat || []),
            ...(this.tasks.nunggu_owner || []),
            ...(this.tasks.ide_nanti || [])
        ];

        // Prioritize tasks assigned to currently working agents
        const workingAgentIds = this.agents.filter(a => a.status === 'KERJA').map(a => Number(a.id));
        let targetTask = allTasks.find(t => (t.status === 'pending' || t.status === 'in_progress') && t.assigned_agent_id && workingAgentIds.includes(Number(t.assigned_agent_id)));
        if (!targetTask) {
            targetTask = allTasks.find(t => t.status === 'pending');
        }
        if (!targetTask) return;

        this.isAutoExecutingRealAI = true;
        try {
            await this.executeTaskWithAI(targetTask.id);
        } catch (err) {
            console.warn('Auto Real AI backlog execution error:', err);
        } finally {
            this.isAutoExecutingRealAI = false;
        }
    }

    // ==========================================
    // UI RENDERING: AGENTS & FOOTER CARDS
    // ==========================================

    renderAgentCards() {
        const container = document.getElementById('agent-cards-container');
        if (!container) return;

        // Update footer agents count badge
        const countBadge = document.getElementById('agents-count-badge');
        if (countBadge) {
            countBadge.textContent = `${this.agents ? this.agents.length : 0} Agent`;
        }

        container.innerHTML = '';

        if (!this.agents || this.agents.length === 0) {
            container.innerHTML = `
                <div class="w-full flex items-center justify-center p-8 text-center text-slate-400 dark:text-slate-500 text-xs">
                    <div class="flex flex-col items-center gap-2">
                        <div class="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800/80 flex items-center justify-center text-slate-400 text-xl border border-slate-200 dark:border-white/5">
                            <i class="fa-solid fa-users-slash"></i>
                        </div>
                        <div class="font-bold text-slate-700 dark:text-slate-300 text-sm">Belum Ada AI Agent Terdaftar</div>
                        <p class="text-[11px] max-w-md text-slate-500 dark:text-slate-400 leading-relaxed">
                            Seluruh agent telah dihapus. Sistem tidak akan memunculkan ulang agent secara otomatis. Klik tombol <button onclick="window.app.openCreateAgentModal()" class="text-blue-600 dark:text-cyan-400 font-bold hover:underline inline-flex items-center gap-1">+ Agent Baru</button> untuk menambahkan agent ke kantor virtual.
                        </p>
                    </div>
                </div>
            `;
            return;
        }

        this.agents.forEach(agent => {
            const isSelected = this.selectedAgent && this.selectedAgent.id == agent.id;
            const statusColor = agent.status === 'KERJA' 
                ? 'emerald' 
                : (agent.status === 'IDLE' ? 'amber' : 'slate');

            const tokenFormatted = this.formatTokenCount(agent.token_usage);
            const memK = (agent.context_memory / 1024).toFixed(0) + 'k / 128k';
            const isRealAi = this.aiMode === 'real_ai';

            const card = document.createElement('div');
            card.className = `glass-card p-3 rounded-xl border flex flex-col justify-between transition-all cursor-pointer select-none min-w-[280px] max-w-[340px] flex-1 ${
                isSelected ? 'selected' : ''
            }`;
            card.onclick = () => this.selectAgentById(agent.id);

            card.innerHTML = `
                <div>
                    <!-- Top row: Avatar, Info, Status Badge -->
                    <div class="flex items-start justify-between gap-2 mb-2">
                        <div class="flex items-center gap-2.5">
                            <div class="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white text-sm shadow-sm select-none"
                                 style="background-color: ${agent.avatar_color || '#3b82f6'}; border: 2px solid rgba(255, 255, 255, 0.2)">
                                ${this.getAgentInitials(agent.name)}
                            </div>
                            <div>
                                <h4 class="font-bold text-slate-900 dark:text-white text-sm tracking-tight flex items-center gap-1.5">
                                    ${agent.name}
                                </h4>
                                <div class="text-[11px] text-slate-500 dark:text-slate-400 font-medium leading-none">${agent.role}</div>
                            </div>
                        </div>

                        <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase 
                            bg-${statusColor}-500/15 text-${statusColor}-600 dark:text-${statusColor}-400 border border-${statusColor}-500/30">
                            <span class="w-1.5 h-1.5 rounded-full bg-${statusColor}-500 ${agent.status === 'KERJA' ? 'pulse-green' : ''}"></span>
                            ${agent.status}
                        </span>
                    </div>

                    <!-- Current Task snippet -->
                    <div class="bg-slate-50 dark:bg-slate-900/60 rounded-lg p-2 border border-slate-200/80 dark:border-white/5 mb-2.5">
                        <div class="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 flex items-center justify-between mb-1">
                            <span class="text-blue-600 dark:text-cyan-400"><i class="fa-solid fa-bars-progress mr-1"></i> Tugas Aktif</span>
                            <span class="text-[9px] text-slate-400 font-mono">X:${agent.desk_x} Z:${agent.desk_z}</span>
                        </div>
                        <div class="text-xs text-slate-700 dark:text-slate-200 line-clamp-2 leading-relaxed" title="${agent.current_task || 'Idle'}">
                            ${agent.current_task || '<span class="text-slate-400 dark:text-slate-500 italic">Menunggu instruksi tugas</span>'}
                        </div>
                    </div>

                    <!-- Metrics row: Actions, Tokens, Context -->
                    <div class="grid grid-cols-3 gap-1.5 text-center text-[10px] bg-slate-100/80 dark:bg-slate-950/40 p-1.5 rounded-lg border border-slate-200/80 dark:border-white/5 mb-2.5 font-mono">
                        <div>
                            <div class="text-slate-400 text-[9px] uppercase">Aksi</div>
                            <div class="font-bold text-slate-800 dark:text-white">${agent.action_count || 0}</div>
                        </div>
                        <div>
                            <div class="text-slate-400 text-[9px] uppercase">Token</div>
                            <div class="font-bold flex items-center justify-center gap-0.5 ${isRealAi ? 'text-purple-600 dark:text-purple-300' : 'text-blue-600 dark:text-cyan-300'}">
                                ${isRealAi ? '<i class="fa-solid fa-bolt text-[9px]"></i>' : ''}
                                <span>${tokenFormatted}</span>
                            </div>
                        </div>
                        <div>
                            <div class="text-slate-400 text-[9px] uppercase">Konteks</div>
                            <div class="font-bold text-purple-600 dark:text-purple-300">${memK}</div>
                        </div>
                    </div>
                </div>

                <!-- Card action buttons -->
                <div class="flex items-center justify-between pt-2 border-t border-slate-200/80 dark:border-white/5 gap-1.5">
                    <button class="text-[11px] font-medium text-blue-600 dark:text-cyan-400 hover:text-blue-700 dark:hover:text-cyan-300 bg-blue-50 dark:bg-cyan-950/40 hover:bg-blue-100 dark:hover:bg-cyan-900/50 border border-blue-200 dark:border-cyan-800/40 rounded-lg px-2.5 py-1 flex items-center gap-1.5 transition-colors"
                            onclick="event.stopPropagation(); window.app.selectAgentById(${agent.id})">
                        <i class="fa-solid fa-crosshairs text-[10px]"></i> Fokus 3D
                    </button>

                    <div class="flex items-center gap-1">
                        <button class="text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 px-2 py-1 rounded-lg border border-slate-200 dark:border-white/10 transition-colors"
                                title="Kelola / Inspeksi Agent"
                                onclick="event.stopPropagation(); window.app.openAgentInspectorModal(${agent.id})">
                            <i class="fa-solid fa-sliders"></i>
                        </button>
                        <button class="text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 px-2 py-1 rounded-lg border border-slate-200 dark:border-white/10 transition-colors"
                                title="${agent.status === 'KERJA' ? 'Jadikan IDLE' : 'Jadikan KERJA'}"
                                onclick="event.stopPropagation(); window.app.quickToggleAgentStatus(${agent.id})">
                            <i class="fa-solid ${agent.status === 'KERJA' ? 'fa-pause text-amber-500' : 'fa-play text-emerald-500'}"></i>
                        </button>
                        <button class="text-xs text-rose-500 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-900/50 px-2 py-1 rounded-lg border border-rose-200/80 dark:border-rose-900/30 transition-colors"
                                title="Hapus Agent dari Virtual Office"
                                onclick="event.stopPropagation(); window.app.openDeleteAgentModal(${agent.id})">
                            <i class="fa-solid fa-trash-can text-[11px]"></i>
                        </button>
                    </div>
                </div>
            `;

            container.appendChild(card);
        });
    }

    renderAgentFilterPills() {
        const container = document.getElementById('log-filter-pills');
        if (!container) return;

        let html = `
            <button class="px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                this.activeLogFilter === 'all'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-transparent'
            }" onclick="window.app.setLogFilter('all')">
                Semua (${this.logs.length})
            </button>
        `;

        this.agents.forEach(agent => {
            const isActive = this.activeLogFilter == agent.id;
            html += `
                <button class="px-2.5 py-1 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 ${
                    isActive
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-transparent'
                }" onclick="window.app.setLogFilter(${agent.id})">
                    <span class="w-1.5 h-1.5 rounded-full" style="background-color: ${agent.avatar_color || '#3b82f6'}"></span>
                    ${agent.name.split(' ')[0]}
                </button>
            `;
        });

        container.innerHTML = html;
    }

    setLogFilter(filterVal) {
        this.activeLogFilter = filterVal;
        this.renderAgentFilterPills();
        this.loadLogs();
    }

    // ==========================================
    // UI RENDERING: LIVE LOGS
    // ==========================================

    renderLogs() {
        const container = document.getElementById('activity-feed-container');
        if (!container) return;

        const filtered = this.activeLogFilter === 'all'
            ? this.logs
            : this.logs.filter(l => l.agent_id == this.activeLogFilter);

        // Update header count badge if present
        const countBadge = document.getElementById('log-count-badge');
        if (countBadge) {
            countBadge.textContent = filtered.length;
        }

        if (filtered.length === 0) {
            container.innerHTML = `
                <div class="text-center py-12 px-4 text-slate-400 dark:text-slate-500 text-xs">
                    <div class="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-white/5 flex items-center justify-center mx-auto mb-3 text-slate-400 dark:text-slate-600">
                        <i class="fa-solid fa-inbox text-xl"></i>
                    </div>
                    <div class="font-semibold text-slate-600 dark:text-slate-400">Belum ada aktivitas</div>
                    <div class="text-[11px] text-slate-400 dark:text-slate-500 mt-1">Aktivitas real-time agen AI akan tampil otomatis di sini.</div>
                </div>
            `;
            return;
        }

        container.innerHTML = '';

        const typeConfig = {
            tool_call: { label: 'Tool Call', icon: 'fa-solid fa-terminal', cls: 'badge-tool_call' },
            thought: { label: 'Thought', icon: 'fa-solid fa-brain', cls: 'badge-thought' },
            task_complete: { label: 'Selesai', icon: 'fa-solid fa-circle-check', cls: 'badge-task_complete' },
            state_change: { label: 'Status', icon: 'fa-solid fa-arrows-rotate', cls: 'badge-state_change' },
            communication: { label: 'Pesan', icon: 'fa-solid fa-comments', cls: 'badge-communication' },
            action: { label: 'Aksi', icon: 'fa-solid fa-bolt', cls: 'badge-action' },
            system: { label: 'Sistem', icon: 'fa-solid fa-server', cls: 'badge-system' }
        };

        filtered.forEach(log => {
            const rawType = (log.log_type || 'action').toLowerCase();
            const config = typeConfig[rawType] || {
                label: rawType.toUpperCase(),
                icon: 'fa-solid fa-info',
                cls: 'badge-system'
            };

            const avatarColor = log.agent_avatar_color || '#3b82f6';
            const agentName = log.agent_name || 'System';
            const initials = this.getAgentInitials(agentName);
            const timeStr = this.formatLogTime(log.created_at);

            const card = document.createElement('div');
            card.className = 'glass-card p-3 rounded-xl border border-slate-200/90 dark:border-white/10 hover:border-blue-400 dark:hover:border-cyan-500/40 transition-all text-xs shadow-xs hover:shadow-md flex flex-col gap-2 relative group overflow-hidden cursor-pointer';

            // Clicking a log item focuses on that agent if available
            if (log.agent_id) {
                card.onclick = () => this.selectAgentById(log.agent_id);
                card.title = `Klik untuk fokus ke ${agentName} di kantor 3D`;
            }

            card.innerHTML = `
                <!-- Accent indicator bar on left -->
                <div class="absolute left-0 top-0 bottom-0 w-1 rounded-l transition-all group-hover:w-1.5" style="background-color: ${avatarColor};"></div>

                <!-- Top row: Flat avatar, Name, Type badge, Timestamp -->
                <div class="flex items-center justify-between gap-1.5 pl-1.5">
                    <div class="flex items-center gap-2 min-w-0">
                        <!-- Flat solid mini avatar (no gradient) -->
                        <div class="w-6 h-6 rounded-md flex items-center justify-center text-white font-bold text-[10px] shrink-0 select-none shadow-xs"
                             style="background-color: ${avatarColor};">
                            ${initials}
                        </div>
                        <span class="font-semibold text-slate-800 dark:text-slate-100 truncate text-[11px]">
                            ${this.escapeHtml(agentName)}
                        </span>
                    </div>

                    <div class="flex items-center gap-1.5 shrink-0">
                        <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono uppercase font-bold tracking-tight ${config.cls}">
                            <i class="${config.icon} text-[8px]"></i>
                            <span>${config.label}</span>
                        </span>
                        <span class="text-[10px] text-slate-400 dark:text-slate-500 font-mono flex items-center gap-0.5" title="${log.created_at || ''}">
                            <i class="fa-regular fa-clock text-[8px] opacity-70"></i>
                            <span>${timeStr}</span>
                        </span>
                    </div>
                </div>

                <!-- Message body snippet -->
                <div class="pl-1.5 text-slate-700 dark:text-slate-300 text-xs">
                    ${this.formatLogMessage(log, rawType)}
                </div>
            `;

            container.appendChild(card);
        });

        if (this.isAutoScrollLogs) {
            container.scrollTop = 0;
        }
    }

    formatLogTime(dateStr) {
        if (!dateStr) return '';
        try {
            if (dateStr.includes(' ')) {
                return dateStr.split(' ')[1].substring(0, 8);
            }
            if (dateStr.includes('T')) {
                const parts = dateStr.split('T');
                if (parts[1]) {
                    return parts[1].substring(0, 8);
                }
            }
            const d = new Date(dateStr);
            if (!isNaN(d.getTime())) {
                return d.toTimeString().split(' ')[0];
            }
            return dateStr;
        } catch {
            return dateStr;
        }
    }

    escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    getAgentInitials(name) {
        if (!name || typeof name !== 'string') return 'AG';
        const cleaned = name.trim();
        if (!cleaned) return 'AG';

        const words = cleaned.split(/\s+/).filter(w => w.length > 0);
        if (words.length === 0) return 'AG';

        if (words.length === 1) {
            return words[0].substring(0, 2).toUpperCase();
        }

        // Jika 2 kata: kata awal pertama dan kedua (misal: "Budi Santoso" -> "BS", "Dimas Pratama" -> "DP")
        if (words.length === 2) {
            return (words[0][0] + words[1][0]).toUpperCase();
        }

        // Jika 3 kata atau lebih: kata awal pertama dan kedua dan atau kata akhir
        // (contoh: "Siti Nurhaliza Putri" -> "SN")
        return (words[0][0] + words[1][0]).toUpperCase();
    }

    formatLogMessage(log, rawType) {
        const msg = log.message || '';
        const escaped = this.escapeHtml(msg);

        if (rawType === 'tool_call') {
            return `
                <div class="p-2 rounded-lg bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200/70 dark:border-purple-800/40 font-mono text-[11px] text-purple-900 dark:text-purple-200 overflow-x-auto break-words leading-relaxed flex items-start gap-1.5">
                    <span class="text-purple-500 dark:text-purple-400 font-bold select-none leading-none mt-0.5">$</span>
                    <span class="flex-1">${escaped}</span>
                </div>
            `;
        }

        if (rawType === 'thought') {
            return `
                <div class="p-2 rounded-lg bg-amber-50/70 dark:bg-amber-950/25 border-l-2 border-amber-500 dark:border-amber-400 pl-2.5 text-amber-900 dark:text-amber-200/90 italic font-serif text-[11px] leading-relaxed">
                    "${escaped}"
                </div>
            `;
        }

        if (rawType === 'task_complete') {
            return `
                <div class="p-2 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-800/40 text-emerald-900 dark:text-emerald-200 text-xs flex items-start gap-2 leading-relaxed">
                    <i class="fa-solid fa-circle-check text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0 text-xs"></i>
                    <div class="flex-1 font-medium">${escaped}</div>
                </div>
            `;
        }

        if (rawType === 'state_change') {
            return `
                <div class="p-2 rounded-lg bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-800/40 text-blue-900 dark:text-blue-200 text-xs flex items-center gap-2">
                    <i class="fa-solid fa-arrows-rotate text-blue-600 dark:text-cyan-400 shrink-0 text-xs"></i>
                    <div class="flex-1 font-medium">${escaped}</div>
                </div>
            `;
        }

        return `
            <div class="leading-relaxed break-words font-normal">
                ${escaped}
            </div>
        `;
    }

    // ==========================================
    // UI RENDERING: TASKS & BACKLOG
    // ==========================================

    renderTasks() {
        this.renderTaskSection('tasks-deadline-dekat', this.tasks.deadline_dekat || []);
        this.renderTaskSection('tasks-nunggu-owner', this.tasks.nunggu_owner || []);
        this.renderTaskSection('tasks-ide-nanti', this.tasks.ide_nanti || []);

        const elDl = document.getElementById('count-deadline-dekat');
        if (elDl) elDl.textContent = (this.tasks.deadline_dekat || []).length;

        const elNo = document.getElementById('count-nunggu-owner');
        if (elNo) elNo.textContent = (this.tasks.nunggu_owner || []).length;

        const elId = document.getElementById('count-ide-nanti');
        if (elId) elId.textContent = (this.tasks.ide_nanti || []).length;
    }

    renderTaskSection(elementId, items) {
        const container = document.getElementById(elementId);
        if (!container) return;

        if (items.length === 0) {
            container.innerHTML = `
                <div class="text-center py-3 text-slate-400 dark:text-slate-600 text-xs italic">
                    Kosong
                </div>
            `;
            return;
        }

        container.innerHTML = '';

        items.forEach(task => {
            const isCompleted = task.status === 'completed';
            const priorityColors = {
                urgent: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30',
                high: 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30',
                medium: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30',
                low: 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-600'
            };

            const prioBadge = priorityColors[task.priority] || priorityColors.medium;

            const card = document.createElement('div');
            card.className = `p-2.5 rounded-lg border text-xs transition-all ${
                isCompleted 
                    ? 'bg-slate-100/60 dark:bg-slate-900/30 border-slate-200/60 dark:border-white/5 opacity-60' 
                    : 'bg-white dark:bg-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-800/90 border-slate-200 dark:border-white/10 shadow-sm'
            }`;

            card.innerHTML = `
                <div class="flex items-start gap-2">
                    <input type="checkbox" 
                           class="task-checkbox mt-0.5 rounded border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-emerald-500 focus:ring-0 cursor-pointer"
                           ${isCompleted ? 'checked' : ''}
                           onchange="window.app.toggleTaskCompletion(${task.id}, this.checked)">
                    
                    <div class="flex-1 min-w-0">
                        <div class="font-medium text-slate-800 dark:text-slate-200 leading-snug ${isCompleted ? 'line-through text-slate-400 dark:text-slate-500' : ''}">
                            ${task.title}
                        </div>

                        <div class="flex items-center justify-between gap-1 mt-2 text-[10px]">
                            <div class="flex items-center gap-1.5 flex-wrap">
                                ${
                                    task.agent_name 
                                        ? `<span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-white/5 text-slate-600 dark:text-slate-300">
                                             <span class="w-1.5 h-1.5 rounded-full" style="background-color: ${task.agent_avatar_color || '#3b82f6'}"></span>
                                             ${task.agent_name.split(' ')[0]}
                                           </span>`
                                        : `<span class="text-slate-400 dark:text-slate-500 italic">Belum diassign</span>`
                                }
                                <span class="px-1.5 py-0.5 rounded font-mono uppercase font-bold border ${prioBadge}">
                                    ${task.priority}
                                </span>
                            </div>

                            <div class="flex items-center gap-1 shrink-0">
                                ${
                                    !isCompleted 
                                        ? `<button class="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/50 flex items-center gap-1 transition-colors shadow-xs"
                                                   title="Eksekusi tugas ini dengan Real AI"
                                                   onclick="event.stopPropagation(); window.app.executeTaskWithAI(${task.id})">
                                               <i class="fa-solid fa-wand-magic-sparkles text-[9px] text-indigo-500"></i>
                                               <span>AI Run</span>
                                           </button>`
                                        : (task.result_text 
                                            ? `<button class="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50 flex items-center gap-1 transition-colors shadow-xs"
                                                       title="Lihat hasil eksekusi Real AI"
                                                       onclick="event.stopPropagation(); window.app.viewTaskAIResult(${task.id})">
                                                   <i class="fa-solid fa-file-lines text-[9px]"></i>
                                                   <span>Hasil AI</span>
                                               </button>`
                                            : '')
                                }
                                <button class="text-slate-400 hover:text-rose-500 transition-colors p-0.5"
                                        title="Hapus Tugas"
                                        onclick="window.app.deleteTask(${task.id})">
                                    <i class="fa-solid fa-trash-can text-[10px]"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            container.appendChild(card);
        });
    }

    async toggleTaskCompletion(taskId, isChecked) {
        try {
            const newStatus = isChecked ? 'completed' : 'pending';
            const res = await fetch('api/tasks.php', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: taskId, status: newStatus })
            });
            const data = await res.json();
            if (data.success) {
                await this.loadTasks();
                await this.loadAgents();
            }
        } catch (e) {
            console.error('Error toggling task:', e);
        }
    }

    async deleteTask(taskId) {
        if (!confirm('Hapus tugas ini?')) return;
        try {
            const res = await fetch(`api/tasks.php?id=${taskId}`, { method: 'DELETE' });
            const data = await res.json();
            if (data.success) {
                await this.loadTasks();
            }
        } catch (e) {
            console.error('Error deleting task:', e);
        }
    }

    // ==========================================
    // AGENT SELECTION & INSPECTOR
    // ==========================================

    selectAgentById(agentId) {
        const agent = this.agents.find(a => a.id == agentId);
        if (!agent) return;

        this.selectedAgent = agent;
        this.renderAgentCards();

        if (this.office3D) {
            this.office3D.selectAgent(agentId, false);
        }

        this.showAgentQuickHud(agent);
    }

    handleAgentSelectedFrom3D(agentData) {
        this.selectedAgent = agentData;
        this.renderAgentCards();
        this.showAgentQuickHud(agentData);
    }

    showAgentQuickHud(agent) {
        const hud = document.getElementById('selected-agent-hud');
        if (!hud) return;

        hud.classList.remove('hidden');
        document.getElementById('hud-agent-name').textContent = agent.name;
        document.getElementById('hud-agent-role').textContent = agent.role;
        document.getElementById('hud-agent-model').textContent = agent.model || 'gemini-1.5-flash';
        document.getElementById('hud-agent-task').textContent = agent.current_task || 'Idle';

        const isIdle = agent.status === 'IDLE';
        const isWorking = agent.status === 'KERJA';

        const locEl = document.getElementById('hud-agent-location');
        if (locEl) {
            if (isIdle) {
                locEl.innerHTML = `<span class="text-amber-600 dark:text-amber-400 font-medium"><i class="fa-solid fa-couch mr-1"></i> Sedang di Coffee & Chill Lounge</span>`;
            } else if (isWorking) {
                locEl.innerHTML = `<span class="text-emerald-600 dark:text-emerald-400 font-medium"><i class="fa-solid fa-laptop-code mr-1"></i> Sedang di Stasiun Meja Kerja</span>`;
            } else {
                locEl.innerHTML = `<span class="text-slate-500 font-medium"><i class="fa-solid fa-pause mr-1"></i> Ditangguhkan di Meja</span>`;
            }
        }

        const statusEl = document.getElementById('hud-agent-status');
        statusEl.textContent = agent.status;
        statusEl.className = `px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
            agent.status === 'KERJA' 
                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30' 
                : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
        }`;
    }

    showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `pointer-events-auto px-4 py-2.5 rounded-xl border shadow-lg text-xs font-medium flex items-center gap-2 transform transition-all duration-300 translate-y-2 opacity-0 ${
            type === 'warning'
                ? 'bg-amber-500/90 text-white border-amber-400 shadow-amber-500/20'
                : (type === 'success' ? 'bg-emerald-600/90 text-white border-emerald-500 shadow-emerald-500/20' : 'bg-slate-900/90 text-white border-slate-700')
        }`;
        toast.innerHTML = message;
        container.appendChild(toast);

        // Slide in
        requestAnimationFrame(() => {
            toast.classList.remove('translate-y-2', 'opacity-0');
            toast.classList.add('translate-y-0', 'opacity-100');
        });

        // Slide out after 3.2s
        setTimeout(() => {
            toast.classList.remove('translate-y-0', 'opacity-100');
            toast.classList.add('-translate-y-2', 'opacity-0');
            setTimeout(() => toast.remove(), 350);
        }, 3200);
    }

    closeAgentQuickHud() {
        const hud = document.getElementById('selected-agent-hud');
        if (hud) hud.classList.add('hidden');
        if (this.office3D) this.office3D.resetCamera();
        this.selectedAgent = null;
        this.renderAgentCards();
    }

    openAgentInspectorModal(agentId) {
        const agent = this.agents.find(a => a.id == agentId);
        if (!agent) return;

        this.selectedAgent = agent;
        const modal = document.getElementById('modal-agent-inspector');
        if (!modal) return;

        document.getElementById('insp-name').textContent = agent.name;
        document.getElementById('insp-role').textContent = `${agent.role} • ${agent.department}`;
        document.getElementById('insp-avatar').style.backgroundColor = agent.avatar_color || '#3b82f6';
        document.getElementById('insp-avatar').textContent = this.getAgentInitials(agent.name);

        document.getElementById('insp-status-select').value = agent.status;
        document.getElementById('insp-model').textContent = agent.model;
        document.getElementById('insp-temp').textContent = agent.temperature;
        document.getElementById('insp-tokens').textContent = Number(agent.token_usage).toLocaleString();
        document.getElementById('insp-actions').textContent = agent.action_count;
        document.getElementById('insp-system-prompt').value = agent.system_prompt || '';

        const funcsContainer = document.getElementById('insp-functions-container');
        funcsContainer.innerHTML = '';
        const funcs = agent.functions || ['web_search', 'code_analysis'];
        funcs.forEach(f => {
            const badge = document.createElement('span');
            badge.className = 'px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-cyan-400 text-xs font-mono border border-slate-200 dark:border-cyan-800/30';
            badge.textContent = f;
            funcsContainer.appendChild(badge);
        });

        modal.classList.remove('hidden');
    }

    closeAgentInspectorModal() {
        const modal = document.getElementById('modal-agent-inspector');
        if (modal) modal.classList.add('hidden');
    }

    async saveAgentInspectorChanges() {
        if (!this.selectedAgent) return;
        const agentId = this.selectedAgent.id;
        const newStatus = document.getElementById('insp-status-select').value;
        const newPrompt = document.getElementById('insp-system-prompt').value;

        // Optimistic live walking transition
        if (this.office3D) {
            this.office3D.setAgentStatus(agentId, newStatus);
            this.office3D.selectAgent(agentId, false);
        }

        try {
            const res = await fetch('api/agents.php', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: agentId,
                    status: newStatus,
                    system_prompt: newPrompt
                })
            });
            const data = await res.json();
            if (data.success) {
                this.closeAgentInspectorModal();
                await this.loadAgents();
                await this.loadLogs();
            } else {
                alert('Gagal menyimpan perubahan: ' + (data.error || 'Unknown error'));
            }
        } catch (e) {
            console.error('Error saving inspector changes:', e);
        }
    }

    async quickToggleAgentStatus(agentId) {
        const agent = this.agents.find(a => a.id == agentId);
        if (!agent) return;
        const prevStatus = agent.status;
        const newStatus = prevStatus === 'KERJA' ? 'IDLE' : 'KERJA';

        // 1. Optimistic instant visual update: avatar starts walking immediately!
        agent.status = newStatus;
        if (this.office3D) {
            this.office3D.setAgentStatus(agentId, newStatus);
            this.office3D.selectAgent(agentId, false);
        }
        this.renderAgentCards();
        this.updateGlobalHeaderStats();

        // 2. Toast notification
        if (newStatus === 'IDLE') {
            this.showToast(`🛋️ <strong>${agent.name}</strong> berpindah ke Coffee Lounge untuk istirahat (IDLE)`, 'warning');
        } else {
            this.showToast(`💻 <strong>${agent.name}</strong> kembali ke meja kerja dan aktif mengetik (KERJA)`, 'success');
        }

        // 3. Persist to MySQL Backend
        try {
            const res = await fetch('api/agents.php', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: agentId, status: newStatus })
            });
            const data = await res.json();
            if (data.success) {
                await this.loadLogs();
            } else {
                // Rollback if failed
                agent.status = prevStatus;
                if (this.office3D) this.office3D.setAgentStatus(agentId, prevStatus);
                this.renderAgentCards();
                this.updateGlobalHeaderStats();
            }
        } catch (e) {
            console.error('Error updating status:', e);
        }
    }

    openDeleteAgentModal(agentId = null) {
        let agent = null;
        if (agentId) {
            agent = this.agents.find(a => a.id == agentId);
        } else if (this.selectedAgent) {
            agent = this.selectedAgent;
        }
        if (!agent) return;

        this.agentPendingDeletion = agent;
        const nameEl = document.getElementById('delete-agent-name-display');
        if (nameEl) nameEl.textContent = agent.name;

        const modal = document.getElementById('modal-confirm-delete-agent');
        if (modal) modal.classList.remove('hidden');
    }

    closeDeleteAgentModal() {
        this.agentPendingDeletion = null;
        const modal = document.getElementById('modal-confirm-delete-agent');
        if (modal) modal.classList.add('hidden');
    }

    async confirmDeleteAgent() {
        if (!this.agentPendingDeletion) return;
        const agent = this.agentPendingDeletion;
        const btn = document.getElementById('btn-confirm-delete-agent');
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin text-xs"></i> <span>Menghapus...</span>`;
        }

        try {
            const res = await fetch(`api/agents.php?id=${agent.id}`, { method: 'DELETE' });
            const data = await res.json();
            if (data.success) {
                this.showToast(`🗑️ Agent '<strong>${agent.name}</strong>' berhasil dihapus dari Virtual Office`, 'info');
                this.closeDeleteAgentModal();
                this.closeAgentInspectorModal();
                this.closeAgentQuickHud();

                // Remove from 3D scene immediately
                if (this.office3D && this.office3D.removeAgent) {
                    this.office3D.removeAgent(agent.id);
                }

                await this.loadAgents();
                await this.loadTasks();
                await this.loadLogs();
            } else {
                this.showToast(`Gagal: ${data.error || 'Terjadi kesalahan saat menghapus'}`, 'warning');
            }
        } catch (e) {
            console.error('Error deleting agent:', e);
            this.showToast('Gagal menghubungi server untuk menghapus agent', 'warning');
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = `<i class="fa-solid fa-trash-can text-xs"></i> <span>Ya, Hapus Agent</span>`;
            }
        }
    }

    deleteAgentFromInspector() {
        return this.openDeleteAgentModal();
    }

    // ==========================================
    // BULK AGENT CONTROLS: PAUSE ALL, RUN ALL, DELETE ALL
    // ==========================================

    async pauseAllAgents() {
        if (!this.agents || this.agents.length === 0) {
            this.showToast('Tidak ada agent yang terdaftar untuk dihentikan', 'info');
            return;
        }

        try {
            const res = await fetch('api/agents.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'bulk_status', status: 'PAUSED' })
            });
            const data = await res.json();
            if (data.success) {
                // Update local status for all agents
                this.agents.forEach(agent => {
                    agent.status = 'PAUSED';
                    if (this.office3D) {
                        this.office3D.setAgentStatus(agent.id, 'PAUSED');
                    }
                });

                this.renderAgentCards();
                this.updateGlobalHeaderStats();
                await this.loadLogs();

                this.showToast('⏸️ Seluruh agent berhasil <strong>dihentikan (PAUSED)</strong>. Pemakaian token AI dihentikan sepenuhnya.', 'warning');
            } else {
                this.showToast(`Gagal: ${data.error || 'Tidak dapat mengubah status'}`, 'warning');
            }
        } catch (e) {
            console.error('Error pausing all agents:', e);
            this.showToast('Gagal menghubungi backend untuk menghentikan agent', 'warning');
        }
    }

    async startAllAgents() {
        if (!this.agents || this.agents.length === 0) {
            this.showToast('Tidak ada agent yang terdaftar untuk dijalankan', 'info');
            return;
        }

        try {
            const res = await fetch('api/agents.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'bulk_status', status: 'KERJA' })
            });
            const data = await res.json();
            if (data.success) {
                // Update local status for all agents
                this.agents.forEach(agent => {
                    agent.status = 'KERJA';
                    if (this.office3D) {
                        this.office3D.setAgentStatus(agent.id, 'KERJA');
                    }
                });

                this.renderAgentCards();
                this.updateGlobalHeaderStats();
                await this.loadLogs();

                this.showToast('▶️ Seluruh agent berhasil <strong>diaktifkan (KERJA)</strong> untuk memproses tugas.', 'success');
            } else {
                this.showToast(`Gagal: ${data.error || 'Tidak dapat mengubah status'}`, 'warning');
            }
        } catch (e) {
            console.error('Error starting all agents:', e);
            this.showToast('Gagal menghubungi backend untuk menjalankan agent', 'warning');
        }
    }

    openDeleteAllAgentsModal() {
        if (!this.agents || this.agents.length === 0) {
            this.showToast('Tidak ada agent yang terdaftar untuk dihapus', 'info');
            return;
        }
        const modal = document.getElementById('modal-confirm-delete-all-agents');
        if (modal) modal.classList.remove('hidden');
    }

    closeDeleteAllAgentsModal() {
        const modal = document.getElementById('modal-confirm-delete-all-agents');
        if (modal) modal.classList.add('hidden');
    }

    async confirmDeleteAllAgents() {
        try {
            const res = await fetch('api/agents.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'delete_all' })
            });
            const data = await res.json();
            if (data.success) {
                this.showToast(`🗑️ ${data.message}`, 'info');
                this.closeDeleteAllAgentsModal();
                this.closeAgentInspectorModal();
                this.closeAgentQuickHud();

                // Clear 3D scene
                if (this.office3D) {
                    this.office3D.syncAgents([]);
                    this.office3D.resetCamera();
                }

                this.agents = [];
                this.selectedAgent = null;

                await this.loadTasks();
                await this.loadLogs();
                this.renderAgentCards();
                this.updateGlobalHeaderStats();
            } else {
                this.showToast(`Gagal: ${data.error || 'Tidak dapat menghapus agent'}`, 'warning');
            }
        } catch (e) {
            console.error('Error deleting all agents:', e);
            this.showToast('Gagal menghubungi backend untuk menghapus semua agent', 'warning');
        }
    }

    // ==========================================
    // MODALS: CREATE AGENT & CREATE TASK
    // ==========================================

    openCreateAgentModal() {
        const modal = document.getElementById('modal-create-agent');
        if (!modal) return;
        modal.classList.remove('hidden');

        document.getElementById('form-create-agent').reset();
        document.getElementById('temp-slider-val').textContent = '0.7';
    }

    closeCreateAgentModal() {
        const modal = document.getElementById('modal-create-agent');
        if (modal) modal.classList.add('hidden');
    }

    async handleCreateAgentSubmit(e) {
        e.preventDefault();

        const form = e.target;
        const name = form.name.value.trim();
        const role = form.role.value.trim();
        const department = form.department.value;
        const model = form.model.value;
        const temperature = parseFloat(form.temperature.value);
        const avatarColor = form.avatar_color.value;
        const status = form.status.value;
        const currentTask = form.current_task.value.trim() || 'Menunggu instruksi tugas';
        const systemPrompt = form.system_prompt.value.trim();

        const stationPreset = form.station_preset.value;
        let deskX = null;
        let deskZ = null;
        let deskRot = 0;

        if (stationPreset === 'custom') {
            deskX = parseFloat(form.desk_x.value);
            deskZ = parseFloat(form.desk_z.value);
        } else if (stationPreset) {
            const parts = stationPreset.split(',');
            deskX = parseFloat(parts[0]);
            deskZ = parseFloat(parts[1]);
            deskRot = parseFloat(parts[2] || 0);
        }

        const funcs = [];
        form.querySelectorAll('input[name="functions"]:checked').forEach(cb => {
            funcs.push(cb.value);
        });

        const payload = {
            name,
            role,
            department,
            model,
            temperature,
            avatar_color: avatarColor,
            status,
            current_task: currentTask,
            system_prompt: systemPrompt,
            desk_x: deskX,
            desk_z: deskZ,
            desk_rotation: deskRot,
            functions: funcs
        };

        try {
            const btn = form.querySelector('button[type="submit"]');
            btn.disabled = true;
            btn.textContent = 'Mendaftarkan Agent...';

            const res = await fetch('api/agents.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            btn.disabled = false;
            btn.innerHTML = `<i class="fa-solid fa-plus mr-1"></i> Daftarkan Agent`;

            if (data.success) {
                this.closeCreateAgentModal();
                await this.loadAgents();
                await this.loadLogs();

                if (data.agent_id) {
                    this.selectAgentById(data.agent_id);
                }
            } else {
                alert('Gagal membuat agent: ' + (data.error || 'Unknown error'));
            }
        } catch (err) {
            console.error('Error creating agent:', err);
            alert('Terjadi kesalahan jaringan saat membuat agent');
        }
    }

    openCreateTaskModal(defaultCategory = 'ide_nanti') {
        const modal = document.getElementById('modal-create-task');
        if (!modal) return;
        modal.classList.remove('hidden');

        document.getElementById('form-create-task').reset();
        document.getElementById('task-category-select').value = defaultCategory;
        this.populateAgentSelectDropdowns();
    }

    closeCreateTaskModal() {
        const modal = document.getElementById('modal-create-task');
        if (modal) modal.classList.add('hidden');
    }

    async handleCreateTaskSubmit(e) {
        e.preventDefault();

        const form = e.target;
        const title = form.title.value.trim();
        const category = form.category.value;
        const assignedAgentId = form.assigned_agent_id.value ? parseInt(form.assigned_agent_id.value) : null;
        const priority = form.priority.value;
        const dueDate = form.due_date.value;

        if (!title) {
            alert('Judul tugas wajib diisi');
            return;
        }

        try {
            const btn = form.querySelector('button[type="submit"]');
            btn.disabled = true;
            btn.textContent = 'Menyimpan Tugas...';

            const res = await fetch('api/tasks.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title,
                    category,
                    assigned_agent_id: assignedAgentId,
                    priority,
                    due_date: dueDate
                })
            });

            const data = await res.json();
            btn.disabled = false;
            btn.innerHTML = `<i class="fa-solid fa-plus mr-1"></i> Buat Tugas`;

            if (data.success) {
                this.closeCreateTaskModal();
                await this.loadTasks();
                await this.loadAgents();
                await this.loadLogs();
            } else {
                alert('Gagal membuat tugas: ' + (data.error || 'Unknown error'));
            }
        } catch (err) {
            console.error('Error creating task:', err);
            alert('Terjadi kesalahan jaringan saat membuat tugas');
        }
    }

    populateAgentSelectDropdowns() {
        const selects = [
            document.getElementById('task-agent-select')
        ];

        selects.forEach(sel => {
            if (!sel) return;
            const currentVal = sel.value;
            sel.innerHTML = '<option value="">-- Tanpa Assignee --</option>';
            this.agents.forEach(agent => {
                const opt = document.createElement('option');
                opt.value = agent.id;
                opt.textContent = `${agent.name} (${agent.role})`;
                sel.appendChild(opt);
            });
            if (currentVal) sel.value = currentVal;
        });
    }

    formatTokenCount(num) {
        const val = parseInt(num) || 0;
        if (val >= 1000000) return (val / 1000000).toFixed(2) + 'M';
        if (val >= 10000) return (val / 1000).toFixed(1) + 'k';
        if (val >= 1000) return (val / 1000).toFixed(1) + 'k';
        return val.toLocaleString();
    }

    updateGlobalHeaderStats() {
        const totalAgents = this.agents.length;
        const workingAgents = this.agents.filter(a => a.status === 'KERJA').length;

        let totalTokens = 0;
        this.agents.forEach(a => {
            totalTokens += parseInt(a.token_usage) || 0;
        });

        const completedTasks = this.taskCounts.completed || 0;

        const statTotalAgents = document.getElementById('stat-total-agents');
        if (statTotalAgents) statTotalAgents.textContent = totalAgents;

        const statWorkingAgents = document.getElementById('stat-working-agents');
        if (statWorkingAgents) statWorkingAgents.textContent = workingAgents;

        const statTasksDone = document.getElementById('stat-tasks-done');
        if (statTasksDone) statTasksDone.textContent = completedTasks;

        // Dynamic Token Card & Live Sync
        const statTokensEl = document.getElementById('stat-total-tokens');
        const cardToken = document.getElementById('card-token-metrics');
        const tokenDot = document.getElementById('token-card-live-dot');
        const tokenIcon = document.getElementById('token-card-icon');
        const tokenLiveBadge = document.getElementById('token-ai-live-badge');
        const tokenPopBadge = document.getElementById('token-increment-badge');
        const tokenPopText = document.getElementById('token-increment-text');

        const isRealAi = this.aiMode === 'real_ai';

        if (statTokensEl) {
            statTokensEl.textContent = this.formatTokenCount(totalTokens);
        }

        // Live Mode Styling on Token Card
        if (cardToken) {
            cardToken.title = `Total Token Terpakai: ${totalTokens.toLocaleString()} tokens (${isRealAi ? 'Real AI Live Sync Aktif' : 'Simulasi Otomatis'}) • Klik untuk konfigurasi AI`;
            if (isRealAi) {
                cardToken.classList.add('border-purple-500/50', 'dark:border-purple-500/60', 'shadow-purple-500/10');
                if (tokenDot) tokenDot.classList.remove('hidden');
                if (tokenIcon) tokenIcon.className = "fa-solid fa-bolt text-purple-600 dark:text-purple-400 transition-colors";
                if (statTokensEl) statTokensEl.className = "font-extrabold text-purple-600 dark:text-purple-300 transition-all font-mono";
                if (tokenLiveBadge) {
                    tokenLiveBadge.classList.remove('hidden');
                    tokenLiveBadge.className = "px-1.5 py-0.2 rounded text-[9px] font-bold uppercase bg-purple-500/20 text-purple-600 dark:text-purple-300 border border-purple-500/30";
                    tokenLiveBadge.textContent = "Live AI";
                }
            } else {
                cardToken.classList.remove('border-purple-500/50', 'dark:border-purple-500/60', 'shadow-purple-500/10');
                if (tokenDot) tokenDot.classList.add('hidden');
                if (tokenIcon) tokenIcon.className = "fa-solid fa-bolt text-blue-500 dark:text-cyan-400 transition-colors";
                if (statTokensEl) statTokensEl.className = "font-extrabold text-blue-600 dark:text-cyan-300 transition-all font-mono";
                if (tokenLiveBadge) {
                    tokenLiveBadge.classList.remove('hidden');
                    tokenLiveBadge.className = "px-1.5 py-0.2 rounded text-[9px] font-bold uppercase bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-white/10";
                    tokenLiveBadge.textContent = "Simulasi";
                }
            }
        }

        // Detect dynamic token increment and trigger animation
        if (this.previousTotalTokens !== undefined && totalTokens > this.previousTotalTokens) {
            const delta = totalTokens - this.previousTotalTokens;
            if (tokenPopBadge && tokenPopText) {
                tokenPopText.textContent = `+${delta.toLocaleString()}`;
                tokenPopBadge.classList.remove('animate-token-pop', 'opacity-0');
                void tokenPopBadge.offsetWidth; // Force CSS reflow
                tokenPopBadge.classList.add('animate-token-pop');
            }
            if (cardToken) {
                cardToken.classList.remove('token-card-flash');
                void cardToken.offsetWidth; // Force CSS reflow
                cardToken.classList.add('token-card-flash');
            }
        }
        this.previousTotalTokens = totalTokens;
    }

    // ==========================================
    // EVENT LISTENERS SETUP
    // ==========================================

    setupEventListeners() {
        // Theme Toggle Button
        const btnTheme = document.getElementById('btn-toggle-theme');
        if (btnTheme) {
            btnTheme.addEventListener('click', () => this.toggleTheme());
        }

        // Toggle Simulation
        const btnSim = document.getElementById('btn-toggle-simulation');
        if (btnSim) {
            btnSim.addEventListener('click', (e) => {
                e.preventDefault();
                this.toggleAIMode();
            });
        }

        // Create Agent Form
        const formAgent = document.getElementById('form-create-agent');
        if (formAgent) {
            formAgent.addEventListener('submit', (e) => this.handleCreateAgentSubmit(e));
        }

        // Create Task Form
        const formTask = document.getElementById('form-create-task');
        if (formTask) {
            formTask.addEventListener('submit', (e) => this.handleCreateTaskSubmit(e));
        }

        // Temperature slider input display
        const tempSlider = document.getElementById('temp-slider');
        if (tempSlider) {
            tempSlider.addEventListener('input', (e) => {
                document.getElementById('temp-slider-val').textContent = e.target.value;
            });
        }

        // Station preset select toggles custom coordinate inputs
        const stationPreset = document.getElementById('station-preset-select');
        if (stationPreset) {
            stationPreset.addEventListener('change', (e) => {
                const customFields = document.getElementById('custom-station-coords');
                if (customFields) {
                    if (e.target.value === 'custom') {
                        customFields.classList.remove('hidden');
                    } else {
                        customFields.classList.add('hidden');
                    }
                }
            });
        }

        // 3D View toolbar buttons
        const btnResetCam = document.getElementById('btn-reset-cam');
        if (btnResetCam) {
            btnResetCam.addEventListener('click', () => {
                if (this.office3D) this.office3D.resetCamera();
            });
        }

        const btnAutoRotate = document.getElementById('btn-toggle-autorotate');
        if (btnAutoRotate) {
            btnAutoRotate.addEventListener('click', () => {
                if (this.office3D) {
                    const isRotating = this.office3D.toggleAutoRotate();
                    btnAutoRotate.classList.toggle('text-blue-600', isRotating);
                    btnAutoRotate.classList.toggle('dark:text-cyan-400', isRotating);
                }
            });
        }

        const btnZoomIn = document.getElementById('btn-zoom-in');
        if (btnZoomIn) {
            btnZoomIn.addEventListener('click', () => {
                if (this.office3D) this.office3D.zoomIn();
            });
        }

        const btnZoomOut = document.getElementById('btn-zoom-out');
        if (btnZoomOut) {
            btnZoomOut.addEventListener('click', () => {
                if (this.office3D) this.office3D.zoomOut();
            });
        }

        const btnFullscreen = document.getElementById('btn-toggle-fullscreen');
        if (btnFullscreen) {
            btnFullscreen.addEventListener('click', () => {
                if (!document.fullscreenElement) {
                    document.documentElement.requestFullscreen();
                } else {
                    document.exitFullscreen();
                }
            });
        }

        // Clear logs button triggers modal popup
        const btnClearLogs = document.getElementById('btn-clear-logs');
        if (btnClearLogs) {
            btnClearLogs.addEventListener('click', () => {
                this.openClearLogsModal();
            });
        }

        // Global ESC key to close any active modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeClearLogsModal();
                this.closeDeleteAgentModal();
                this.closeCreateAgentModal();
                this.closeCreateTaskModal();
                this.closeAgentInspectorModal();
                this.closeAgentQuickHud();
                this.closeAISettingsModal();
                this.closeTaskResultModal();
            }
        });
    }

    // ==========================================
    // REAL AI INTEGRATION & SETTINGS
    // ==========================================

    async loadAISettings() {
        try {
            const res = await fetch('api/settings.php');
            const data = await res.json();
            if (data.success) {
                this.aiSettings = data.data;
                const isRealAi = (this.aiSettings.real_ai_enabled === '1' || this.aiSettings.real_ai_enabled === true);
                this.aiMode = isRealAi ? 'real_ai' : 'simulation';
                this.isSimulating = !isRealAi;
                this.updateModeToggleUI();
                this.updateAIProviderBadge();
                this.updateGlobalHeaderStats();
                this.renderAgentCards();
                this.updateConnectionStatus('connected');
            }
        } catch (e) {
            console.error('Error loading AI settings:', e);
        }
    }

    updateAIProviderBadge() {
        const badge = document.getElementById('ai-active-provider-badge');
        if (badge && this.aiSettings) {
            const p = (this.aiSettings.ai_provider || 'gemini').toUpperCase();
            badge.textContent = p;
        }
    }

    openAISettingsModal() {
        const modal = document.getElementById('modal-ai-settings');
        if (!modal) return;
        modal.classList.remove('hidden');

        // Populate fields from current settings
        if (this.aiSettings) {
            this.selectAIProvider(this.aiSettings.ai_provider || 'gemini', false);

            const modelSelect = document.getElementById('setting-default-model');
            if (modelSelect && this.aiSettings.default_model) {
                modelSelect.value = this.aiSettings.default_model;
            }

            const baseUrlInput = document.getElementById('setting-base-url');
            if (baseUrlInput && this.aiSettings.ollama_base_url) {
                baseUrlInput.value = this.aiSettings.ollama_base_url;
            }

            const realAiChk = document.getElementById('setting-real-ai-enabled');
            if (realAiChk) {
                realAiChk.checked = this.aiSettings.real_ai_enabled === '1' || this.aiSettings.real_ai_enabled === true;
            }

            const autoExecChk = document.getElementById('setting-auto-execution');
            if (autoExecChk) {
                autoExecChk.checked = this.aiSettings.auto_execution === '1' || this.aiSettings.auto_execution === true;
            }

            this.updateKeyStatusDisplay();
        }

        const statusEl = document.getElementById('test-connection-status');
        if (statusEl) statusEl.innerHTML = '';
    }

    closeAISettingsModal() {
        const modal = document.getElementById('modal-ai-settings');
        if (modal) modal.classList.add('hidden');
    }

    selectAIProvider(provider, updateInput = true) {
        if (updateInput) {
            const hidden = document.getElementById('setting-ai-provider');
            if (hidden) hidden.value = provider;
        }

        // Highlight selected provider button
        const providers = ['gemini', 'openai', 'groq', 'openrouter', 'ollama'];
        providers.forEach(p => {
            const btn = document.getElementById(`provider-btn-${p}`);
            if (btn) {
                if (p === provider) {
                    btn.classList.add('bg-purple-50/60', 'dark:bg-purple-950/40', 'border-purple-500', 'shadow-xs');
                    btn.classList.remove('border-slate-200', 'dark:border-white/10');
                } else {
                    btn.classList.remove('bg-purple-50/60', 'dark:bg-purple-950/40', 'border-purple-500', 'shadow-xs');
                    btn.classList.add('border-slate-200', 'dark:border-white/10');
                }
            }
        });

        // Provider specific models
        const modelSelect = document.getElementById('setting-default-model');
        const modelsByProvider = {
            gemini: [
                { value: 'gemini-3-flash-preview', label: 'gemini-3-flash-preview (Cepat & Cerdas, Rekomendasi)' },
                { value: 'gemini-flash-lite-latest', label: 'gemini-flash-lite-latest (Flash Lite Ringan & Hemat)' },
                { value: 'gemini-3.5-flash', label: 'gemini-3.5-flash (Gemini 3.5 Flash)' },
                { value: 'gemini-2.0-flash', label: 'gemini-2.0-flash (Gemini 2.0 Flash)' },
                { value: 'gemini-1.5-flash', label: 'gemini-1.5-flash (Gemini 1.5 Legacy Studio)' },
                { value: 'gemini-1.5-pro', label: 'gemini-1.5-pro (Penalaran Kompleks)' }
            ],
            openai: [
                { value: 'gpt-4o', label: 'gpt-4o (Flagship Multimodal)' },
                { value: 'gpt-4o-mini', label: 'gpt-4o-mini (Cepat & Hemat)' }
            ],
            groq: [
                { value: 'llama-3.3-70b-versatile', label: 'llama-3.3-70b-versatile (Super Cepat)' },
                { value: 'deepseek-r1-distill-llama-70b', label: 'deepseek-r1-distill-llama-70b (Reasoning)' }
            ],
            openrouter: [
                { value: 'anthropic/claude-3.7-sonnet', label: 'claude-3.7-sonnet' },
                { value: 'deepseek/deepseek-r1', label: 'deepseek/deepseek-r1' },
                { value: 'openai/gpt-4o', label: 'openai/gpt-4o' }
            ],
            ollama: [
                { value: 'llama3', label: 'llama3 (Lokal)' },
                { value: 'deepseek-r1', label: 'deepseek-r1 (Lokal)' },
                { value: 'qwen2.5', label: 'qwen2.5 (Lokal)' }
            ]
        };

        if (modelSelect && modelsByProvider[provider]) {
            const currentVal = modelSelect.value;
            modelSelect.innerHTML = '';
            modelsByProvider[provider].forEach(m => {
                const opt = document.createElement('option');
                opt.value = m.value;
                opt.textContent = m.label;
                modelSelect.appendChild(opt);
            });
            if (modelsByProvider[provider].some(m => m.value === currentVal)) {
                modelSelect.value = currentVal;
            }
        }

        // Base URL toggle
        const baseUrlContainer = document.getElementById('base-url-container');
        if (baseUrlContainer) {
            if (provider === 'ollama' || provider === 'openrouter') {
                baseUrlContainer.classList.remove('hidden');
            } else {
                baseUrlContainer.classList.add('hidden');
            }
        }

        // Key container & hints
        const keyContainer = document.getElementById('ai-key-container');
        const keyLabel = document.getElementById('key-provider-label');
        const keyHint = document.getElementById('api-key-hint');

        if (keyLabel) {
            const names = { gemini: 'Google Gemini', openai: 'OpenAI', groq: 'Groq', openrouter: 'OpenRouter', ollama: 'Ollama' };
            keyLabel.textContent = names[provider] || provider;
        }

        if (provider === 'ollama') {
            if (keyContainer) keyContainer.classList.add('opacity-40', 'pointer-events-none');
            if (keyHint) keyHint.innerHTML = '✨ Ollama berjalan lokal di komputer Anda. Tidak memerlukan API Key!';
        } else {
            if (keyContainer) keyContainer.classList.remove('opacity-40', 'pointer-events-none');
            if (keyHint) {
                if (provider === 'gemini') {
                    keyHint.innerHTML = '💡 Dapatkan API Key Gemini secara <strong>gratis</strong> di <a href="https://aistudio.google.com/app/apikey" target="_blank" class="text-blue-600 dark:text-cyan-400 hover:underline font-semibold">Google AI Studio &rarr;</a>';
                } else if (provider === 'groq') {
                    keyHint.innerHTML = '💡 Dapatkan API Key gratis di <a href="https://console.groq.com/keys" target="_blank" class="text-blue-600 dark:text-cyan-400 hover:underline font-semibold">Groq Console &rarr;</a>';
                } else if (provider === 'openrouter') {
                    keyHint.innerHTML = '💡 Dapatkan API Key di <a href="https://openrouter.ai/keys" target="_blank" class="text-blue-600 dark:text-cyan-400 hover:underline font-semibold">OpenRouter Keys &rarr;</a>';
                } else {
                    keyHint.innerHTML = '💡 Dapatkan API Key di <a href="https://platform.openai.com/api-keys" target="_blank" class="text-blue-600 dark:text-cyan-400 hover:underline font-semibold">OpenAI Platform &rarr;</a>';
                }
            }
        }

        this.updateKeyStatusDisplay(provider);
    }

    updateKeyStatusDisplay(provider = null) {
        if (!provider) {
            const hidden = document.getElementById('setting-ai-provider');
            provider = hidden ? hidden.value : 'gemini';
        }
        const badge = document.getElementById('key-status-badge');
        const keyInput = document.getElementById('setting-api-key');
        if (!badge || !this.aiSettings) return;

        const hasKey = this.aiSettings[`has_${provider}_api_key`];
        const masked = this.aiSettings[`${provider}_api_key_masked`];

        if (hasKey) {
            badge.innerHTML = `<span class="text-emerald-600 dark:text-emerald-400 font-semibold"><i class="fa-solid fa-circle-check text-[9px] mr-1"></i>Tersimpan (${masked})</span>`;
            if (keyInput && !keyInput.value) {
                keyInput.placeholder = `Tersimpan: ${masked} (kosongkan jika tidak diubah)`;
            }
        } else {
            badge.innerHTML = `<span class="text-amber-600 dark:text-amber-400 font-semibold"><i class="fa-solid fa-circle-exclamation text-[9px] mr-1"></i>Belum diatur</span>`;
            if (keyInput) keyInput.placeholder = 'Masukkan API Key...';
        }
    }

    toggleApiKeyVisibility() {
        const input = document.getElementById('setting-api-key');
        const icon = document.getElementById('key-visibility-icon');
        if (!input || !icon) return;

        if (input.type === 'password') {
            input.type = 'text';
            icon.className = 'fa-regular fa-eye-slash';
        } else {
            input.type = 'password';
            icon.className = 'fa-regular fa-eye';
        }
    }

    async saveAISettings(event) {
        if (event) event.preventDefault();
        const btn = document.getElementById('btn-save-ai-settings');
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin text-xs"></i> <span>Menyimpan...</span>`;
        }

        const provider = document.getElementById('setting-ai-provider').value;
        const model = document.getElementById('setting-default-model').value;
        const apiKey = document.getElementById('setting-api-key').value.trim();
        const baseUrl = document.getElementById('setting-base-url').value.trim();
        const realAiEnabled = document.getElementById('setting-real-ai-enabled').checked ? '1' : '0';
        const autoExec = document.getElementById('setting-auto-execution').checked ? '1' : '0';

        const payload = {
            ai_provider: provider,
            default_model: model,
            real_ai_enabled: realAiEnabled,
            auto_execution: autoExec
        };

        if (provider === 'gemini' && apiKey) payload.gemini_api_key = apiKey;
        if (provider === 'openai' && apiKey) payload.openai_api_key = apiKey;
        if (provider === 'groq' && apiKey) payload.groq_api_key = apiKey;
        if (provider === 'openrouter' && apiKey) payload.openrouter_api_key = apiKey;
        if (baseUrl) payload.ollama_base_url = baseUrl;

        try {
            const res = await fetch('api/settings.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (data.success) {
                await this.loadAISettings();
                this.closeAISettingsModal();
                this.showToast('⚙️ Pengaturan Real AI berhasil diperbarui!', 'success');
            } else {
                alert('Gagal menyimpan: ' + (data.error || 'Terjadi kesalahan'));
            }
        } catch (e) {
            console.error('Error saving settings:', e);
            alert('Kesalahan jaringan saat menyimpan pengaturan');
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = `<i class="fa-solid fa-check text-xs"></i> <span>Simpan Pengaturan</span>`;
            }
        }
    }

    async testAIConnection() {
        const btn = document.getElementById('btn-test-ai-connection');
        const statusEl = document.getElementById('test-connection-status');
        if (!btn || !statusEl) return;

        btn.disabled = true;
        btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin text-xs"></i> <span>Menguji...</span>`;
        statusEl.innerHTML = `<span class="text-slate-400">Menghubungi AI provider...</span>`;

        const provider = document.getElementById('setting-ai-provider').value;
        const model = document.getElementById('setting-default-model').value;
        const apiKey = document.getElementById('setting-api-key').value.trim();
        const baseUrl = document.getElementById('setting-base-url').value.trim();

        try {
            const res = await fetch('api/settings.php?action=test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    provider,
                    model,
                    api_key: apiKey,
                    base_url: baseUrl
                })
            });
            const data = await res.json();

            if (data.success) {
                statusEl.innerHTML = `<span class="text-emerald-600 dark:text-emerald-400 font-semibold"><i class="fa-solid fa-circle-check mr-1"></i>Berhasil! (${data.data.latency_ms}ms)</span>`;
                this.showToast(`✅ Koneksi Real AI (${model}) Berhasil! Latensi: ${data.data.latency_ms}ms`, 'success');
            } else {
                statusEl.innerHTML = `<span class="text-rose-600 dark:text-rose-400 font-semibold" title="${data.error}"><i class="fa-solid fa-triangle-exclamation mr-1"></i>Gagal: ${(data.error || 'Error').substring(0, 45)}...</span>`;
            }
        } catch (e) {
            statusEl.innerHTML = `<span class="text-rose-600 dark:text-rose-400 font-semibold">Koneksi jaringan gagal</span>`;
        } finally {
            btn.disabled = false;
            btn.innerHTML = `<i class="fa-solid fa-satellite-dish text-xs"></i> <span>Tes Koneksi AI</span>`;
        }
    }

    // ==========================================
    // REAL AI TASK EXECUTION & DIRECT PROMPT
    // ==========================================

    async executeTaskWithAI(taskId) {
        const allTasks = [
            ...(this.tasks.deadline_dekat || []),
            ...(this.tasks.nunggu_owner || []),
            ...(this.tasks.ide_nanti || [])
        ];
        const task = allTasks.find(t => t.id == taskId);
        if (!task) return;

        // If assigned to an agent, focus camera in 3D and trigger walking/working state
        if (task.assigned_agent_id) {
            this.selectAgentById(task.assigned_agent_id);
            if (this.office3D) {
                this.office3D.setAgentStatus(task.assigned_agent_id, 'KERJA');
            }
        }

        this.showToast(`🤖 Memulai eksekusi task #${taskId} dengan Real AI...`, 'info');

        try {
            const res = await fetch('api/execute_ai.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'execute_task', task_id: taskId })
            });

            const data = await res.json();

            if (data.success) {
                const resData = data.data;
                this.showToast(`✅ Tugas diselesaikan oleh <strong>${resData.agent_name}</strong> (${resData.tokens} tokens, ${resData.duration_ms}ms)!`, 'success');

                // Reload all data
                await this.loadTasks();
                await this.loadAgents();
                await this.loadLogs();

                // Open completed task result viewer
                this.viewTaskAIResult(taskId);
            } else {
                let friendlyMsg = data.error || 'Terjadi kesalahan eksekusi AI';
                if (data.error && data.error.includes('high demand')) {
                    friendlyMsg = 'Server Google Gemini sedang mengalami lonjakan trafik sementara. Coba klik kembali dalam beberapa detik.';
                }
                this.showToast(`❌ Gagal: ${friendlyMsg}`, 'warning');
                if (data.error && data.error.includes('API Key')) {
                    this.openAISettingsModal();
                }
            }
        } catch (err) {
            console.error('Error executing task with AI:', err);
            this.showToast('Gagal menghubungi backend untuk eksekusi AI', 'warning');
        }
    }

    async viewTaskAIResult(taskId) {
        try {
            const res = await fetch(`api/execute_ai.php?task_id=${taskId}`);
            const data = await res.json();
            if (data.success && data.data) {
                const task = data.data;
                const modal = document.getElementById('modal-task-result');
                if (!modal) return;

                document.getElementById('task-res-title').textContent = task.title;
                document.getElementById('task-res-meta').textContent = `Dikerjakan oleh: ${task.agent_name} (${task.agent_role}) • Status: Selesai`;
                document.getElementById('task-res-content').textContent = task.result_text || 'Tidak ada konten hasil tersimpan.';

                modal.classList.remove('hidden');
            }
        } catch (e) {
            console.error('Error viewing task result:', e);
        }
    }

    closeTaskResultModal() {
        const modal = document.getElementById('modal-task-result');
        if (modal) modal.classList.add('hidden');
    }

    async sendDirectPromptFromHud() {
        if (!this.selectedAgent) return;
        const input = document.getElementById('hud-direct-prompt-input');
        if (!input) return;

        const prompt = input.value.trim();
        if (!prompt) return;

        const btn = document.getElementById('btn-hud-send-prompt');
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin text-[10px]"></i>`;
        }

        const agentId = this.selectedAgent.id;
        const agentName = this.selectedAgent.name;

        // Set agent to KERJA in 3D
        if (this.office3D) {
            this.office3D.setAgentStatus(agentId, 'KERJA');
        }

        this.showToast(`💬 Mengirim instruksi ke <strong>${agentName}</strong>...`, 'info');
        input.value = '';

        try {
            const res = await fetch('api/execute_ai.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'dispatch_prompt',
                    agent_id: agentId,
                    prompt: prompt
                })
            });

            const data = await res.json();

            if (data.success) {
                this.showToast(`✨ <strong>${agentName}</strong> merespon (${data.data.tokens} tokens)!`, 'success');
                await this.loadAgents();
                await this.loadLogs();
            } else {
                let friendlyMsg = data.error || 'Terjadi kesalahan';
                if (data.error && data.error.includes('high demand')) {
                    friendlyMsg = 'Server Google Gemini sedang mengalami lonjakan trafik sementara. Coba kirim kembali dalam beberapa saat.';
                }
                this.showToast(`Gagal: ${friendlyMsg}`, 'warning');
                if (data.error && data.error.includes('API Key')) {
                    this.openAISettingsModal();
                }
            }
        } catch (e) {
            console.error('Error dispatching prompt:', e);
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = `<i class="fa-solid fa-paper-plane text-[10px]"></i>`;
            }
        }
    }

    // ==========================================
    // MODAL: CLEAR ACTIVITY LOGS
    // ==========================================

    openClearLogsModal() {
        const modal = document.getElementById('modal-confirm-clear-logs');
        if (modal) modal.classList.remove('hidden');
    }

    closeClearLogsModal() {
        const modal = document.getElementById('modal-confirm-clear-logs');
        if (modal) modal.classList.add('hidden');
    }

    async confirmClearLogs() {
        const btn = document.getElementById('btn-confirm-delete-logs');
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin text-xs"></i> <span>Menghapus...</span>`;
        }

        try {
            const url = this.activeLogFilter !== 'all' 
                ? `api/logs.php?agent_id=${this.activeLogFilter}` 
                : 'api/logs.php';

            const res = await fetch(url, { method: 'DELETE' });
            const data = await res.json();

            if (data.success) {
                if (this.activeLogFilter !== 'all') {
                    this.logs = this.logs.filter(l => l.agent_id != this.activeLogFilter);
                } else {
                    this.logs = [];
                }
                this.renderLogs();
                this.renderAgentFilterPills();
                this.closeClearLogsModal();
                this.showToast('🗑️ Semua log aktivitas berhasil dibersihkan', 'success');
            } else {
                alert('Gagal membersihkan log: ' + (data.error || 'Terjadi kesalahan'));
            }
        } catch (e) {
            console.error('Error clearing logs:', e);
            alert('Kesalahan jaringan saat membersihkan log');
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = `<i class="fa-solid fa-trash-can text-xs"></i> <span>Ya, Hapus Semua Log</span>`;
            }
        }
    }
}

// Instantiate on window load
window.addEventListener('DOMContentLoaded', () => {
    window.app = new AppController();
});
