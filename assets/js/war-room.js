/**
 * War Room & Autonomous Team Meeting Controller
 * Kantor Virtual HQ - Multi-Agent Collaboration Module
 */

(function() {
    if (typeof window === 'undefined') return;

    // Attach War Room methods to AppController prototype
    if (typeof AppController !== 'undefined') {
        
        AppController.prototype.openWarRoomModal = function(forceLiveView = false) {
            const modal = document.getElementById('modal-war-room');
            if (!modal) return;

            // Render agent checkboxes
            const container = document.getElementById('war-room-agents-list');
            if (container) {
                if (!this.agents || this.agents.length === 0) {
                    container.innerHTML = `<p class="text-xs text-slate-400 p-3">Belum ada agent terdaftar.</p>`;
                } else {
                    let html = '';
                    this.agents.forEach((ag, idx) => {
                        const checked = idx < 3 ? 'checked' : '';
                        html += `
                            <label class="flex items-center gap-2.5 p-2 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-slate-800/60 cursor-pointer transition-all select-none">
                                <input type="checkbox" name="war_room_agent" value="${ag.id}" ${checked} class="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4">
                                <div class="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold" style="background-color: ${ag.avatar_color || '#3b82f6'}">
                                    ${(ag.name || 'A').charAt(0)}
                                </div>
                                <div class="flex-1 min-w-0">
                                    <div class="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">${ag.name}</div>
                                    <div class="text-[10px] text-slate-500 dark:text-slate-400 truncate">${ag.role} • ${ag.department || 'HQ'}</div>
                                </div>
                            </label>
                        `;
                    });
                    container.innerHTML = html;
                }
            }

            // Populate lead agent select for manager-worker tab
            const leadSelect = document.getElementById('war-room-lead-select');
            if (leadSelect && this.agents) {
                leadSelect.innerHTML = this.agents.map(a => `<option value="${a.id}">${a.name} (${a.role})</option>`).join('');
            }

            // Determine whether to show Live View or Setup View
            const shouldShowLive = forceLiveView || (this.activeMeeting && (this.activeMeeting.status === 'in_progress' || this.activeMeeting.result));

            if (shouldShowLive) {
                document.getElementById('war-room-setup-view')?.classList.add('hidden');
                document.getElementById('war-room-live-view')?.classList.remove('hidden');
                if (this.activeMeeting && this.activeMeeting.result) {
                    this.renderLiveMeetingResults(this.activeMeeting.result);
                }
            } else {
                document.getElementById('war-room-setup-view')?.classList.remove('hidden');
                document.getElementById('war-room-live-view')?.classList.add('hidden');
            }

            modal.classList.remove('hidden');
        };

        AppController.prototype.closeWarRoomModal = function() {
            const modal = document.getElementById('modal-war-room');
            if (modal) modal.classList.add('hidden');
        };

        AppController.prototype.openWarRoomLiveView = function() {
            this.openWarRoomModal(true);
        };

        AppController.prototype.minimizeMeetingToHUD = function() {
            this.closeWarRoomModal();
            if (this.activeMeeting) {
                const tracker = document.getElementById('floating-meeting-tracker');
                if (tracker) tracker.classList.remove('hidden');
                this.showToast('Memantau pergerakan agent di Kantor 3D...', 'info');
            }
        };

        AppController.prototype.focusMeetingRoom3D = function() {
            if (this.office3D && typeof this.office3D.focusMeetingRoom === 'function') {
                this.office3D.focusMeetingRoom();
                this.showToast('Kamera 3D difokuskan ke Ruang Rapat & TV.', 'info');
            }
        };

        AppController.prototype.endActiveMeeting = function() {
            this.endCurrentMeeting();
        };

        AppController.prototype.setWarRoomTopic = function(topicText) {
            const input = document.getElementById('war-room-topic-input');
            if (input) {
                input.value = topicText;
                input.focus();
            }
        };

        AppController.prototype.switchWarRoomTab = function(tabName) {
            const tabBtnMeeting = document.getElementById('tab-btn-war-meeting');
            const tabBtnDelegation = document.getElementById('tab-btn-war-delegation');
            const paneMeeting = document.getElementById('tab-pane-war-meeting');
            const paneDelegation = document.getElementById('tab-pane-war-delegation');

            if (tabName === 'meeting') {
                tabBtnMeeting?.classList.add('border-indigo-500', 'text-indigo-600', 'dark:text-indigo-400');
                tabBtnMeeting?.classList.remove('border-transparent', 'text-slate-500');
                tabBtnDelegation?.classList.remove('border-indigo-500', 'text-indigo-600', 'dark:text-indigo-400');
                tabBtnDelegation?.classList.add('border-transparent', 'text-slate-500');
                paneMeeting?.classList.remove('hidden');
                paneDelegation?.classList.add('hidden');
            } else {
                tabBtnDelegation?.classList.add('border-indigo-500', 'text-indigo-600', 'dark:text-indigo-400');
                tabBtnDelegation?.classList.remove('border-transparent', 'text-slate-500');
                tabBtnMeeting?.classList.remove('border-indigo-500', 'text-indigo-600', 'dark:text-indigo-400');
                tabBtnMeeting?.classList.add('border-transparent', 'text-slate-500');
                paneDelegation?.classList.remove('hidden');
                paneMeeting?.classList.add('hidden');
            }
        };

        AppController.prototype.startTeamMeeting = async function() {
            const topicInput = document.getElementById('war-room-topic-input');
            const topic = topicInput ? topicInput.value.trim() : '';

            if (!topic) {
                this.showToast('Silakan masukkan topik rapat tim', 'warning');
                return;
            }

            const checkedBoxes = document.querySelectorAll('input[name="war_room_agent"]:checked');
            const agentIds = Array.from(checkedBoxes).map(cb => Number(cb.value));

            if (agentIds.length < 2) {
                this.showToast('Pilih minimal 2 agent untuk rapat kolaborasi', 'warning');
                return;
            }

            const rounds = Number(document.getElementById('war-room-rounds-select')?.value || 2);

            // Record active meeting state
            this.activeMeeting = {
                topic: topic,
                agentIds: agentIds,
                rounds: rounds,
                status: 'in_progress',
                startTime: Date.now(),
                result: null
            };

            // Switch to Live Meeting View
            document.getElementById('war-room-setup-view')?.classList.add('hidden');
            const liveView = document.getElementById('war-room-live-view');
            if (liveView) liveView.classList.remove('hidden');

            const liveTopicBadge = document.getElementById('war-room-live-topic-badge');
            if (liveTopicBadge) liveTopicBadge.textContent = topic;

            const messagesContainer = document.getElementById('war-room-messages-container');
            if (messagesContainer) {
                messagesContainer.innerHTML = `
                    <div class="text-center py-10 text-slate-400 flex flex-col items-center gap-3">
                        <i class="fa-solid fa-spinner fa-spin text-3xl text-indigo-500"></i>
                        <p class="text-sm font-semibold text-slate-800 dark:text-slate-200">
                            Mengorkestrasi pergerakan agent ke Ruang Rapat & memulai diskusi...
                        </p>
                        <p class="text-xs text-slate-500 max-w-sm">
                            Agent sedang berjalan menuju meja bundar 3D. Dialog dan notulensi akan muncul secara otomatis di sini.
                        </p>
                    </div>
                `;
            }

            // Update Floating Live Meeting Tracker HUD Overlay
            const tracker = document.getElementById('floating-meeting-tracker');
            if (tracker) {
                tracker.classList.remove('hidden');
                const pulse = document.getElementById('floating-meeting-pulse');
                if (pulse) {
                    pulse.className = 'w-2.5 h-2.5 rounded-full bg-rose-500 pulse-red animate-pulse';
                }
                const badge = document.getElementById('floating-meeting-badge');
                if (badge) {
                    badge.className = 'text-[9px] font-mono uppercase font-bold px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/20';
                    badge.textContent = 'LIVE WAR ROOM';
                }
                const roundEl = document.getElementById('floating-meeting-round');
                if (roundEl) roundEl.textContent = `${agentIds.length} Agent • ${rounds} Putaran`;

                const topicEl = document.getElementById('floating-meeting-topic');
                if (topicEl) {
                    topicEl.textContent = topic;
                    topicEl.title = topic;
                }

                const transcriptBtn = document.getElementById('floating-meeting-transcript-btn');
                if (transcriptBtn) transcriptBtn.textContent = 'Transkrip & Notulensi';
            }

            // AUTO MINIMIZE MODAL so user can observe agents walking into meeting room in 3D!
            this.closeWarRoomModal();

            // 3D Locomotion: Send agents to meeting chairs
            if (this.office3D && typeof this.office3D.startTeamMeeting === 'function') {
                this.office3D.startTeamMeeting(agentIds, topic);
            }

            this.showToast(`🚨 Memulai Rapat Tim: "${topic}" (${agentIds.length} Agent). Memantau di kantor 3D...`, 'info');

            try {
                const res = await fetch('api/meetings.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'start_meeting',
                        topic: topic,
                        rounds: rounds,
                        agent_ids: agentIds
                    })
                });

                const data = await res.json();

                if (data.success && data.data) {
                    const result = data.data;
                    if (this.activeMeeting) {
                        this.activeMeeting.status = 'completed';
                        this.activeMeeting.result = result;
                    }
                    this.renderLiveMeetingResults(result);

                    // Update Floating Tracker HUD to Completed state
                    if (tracker) {
                        const pulse = document.getElementById('floating-meeting-pulse');
                        if (pulse) pulse.className = 'w-2.5 h-2.5 rounded-full bg-emerald-500 pulse-green animate-pulse';

                        const badge = document.getElementById('floating-meeting-badge');
                        if (badge) {
                            badge.className = 'text-[9px] font-mono uppercase font-bold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20';
                            badge.textContent = '✅ NOTULENSI SIAP';
                        }

                        const roundEl = document.getElementById('floating-meeting-round');
                        if (roundEl) roundEl.textContent = `${result.tasks_created?.length || 0} Poin Aksi`;

                        const transcriptBtn = document.getElementById('floating-meeting-transcript-btn');
                        if (transcriptBtn) transcriptBtn.textContent = 'Buka Notulensi & Aksi';
                    }

                    // Update 3D TV Screen with final meeting status
                    if (this.office3D && typeof this.office3D.updateMeetingTVScreen === 'function') {
                        const firstSpeech = result.summary || 'Rapat selesai dengan sukses.';
                        this.office3D.updateMeetingTVScreen(topic, 'Notulensi Selesai', `${result.tasks_created?.length || 0} Aksi`, firstSpeech.slice(0, 100));
                    }

                    this.showToast(`✅ Rapat Tim Selesai! ${result.tasks_created?.length || 0} tugas baru didelegasikan. Klik Floating Tracker untuk melihat Notulensi.`, 'success');

                    // Refresh backlog tasks & logs in background
                    await this.loadTasks();
                    await this.loadLogs();
                    await this.loadAgents();
                } else {
                    this.showToast(`❌ Gagal: ${data.error || 'Terjadi kesalahan eksekusi rapat'}`, 'warning');
                    if (messagesContainer) {
                        messagesContainer.innerHTML = `<p class="text-xs text-rose-500 p-4">Error: ${data.error}</p>`;
                    }
                }
            } catch (err) {
                console.error('Error starting team meeting:', err);
                this.showToast('Gagal menghubungi backend ruang rapat', 'warning');
            }
        };

        AppController.prototype.renderLiveMeetingResults = function(result) {
            const messagesContainer = document.getElementById('war-room-messages-container');
            if (!messagesContainer) return;

            let html = '';

            // Dialog history
            if (result.messages && result.messages.length > 0) {
                result.messages.forEach(msg => {
                    const roundBadge = msg.round_number ? `<span class="text-[9px] px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-mono font-bold">Putaran ${msg.round_number}</span>` : '';
                    html += `
                        <div class="flex items-start gap-3 p-3 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-white/10 shadow-sm transition-all hover:border-indigo-400/40">
                            <div class="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-sm" style="background-color: ${msg.avatar_color || '#6366f1'}">
                                ${(msg.agent_name || 'A').charAt(0)}
                            </div>
                            <div class="flex-1 min-w-0">
                                <div class="flex items-center justify-between mb-1.5">
                                    <div class="flex items-center gap-2">
                                        <span class="text-xs font-bold text-slate-900 dark:text-white">${msg.agent_name}</span>
                                        <span class="text-[10px] text-slate-500 dark:text-slate-400 font-mono">(${msg.agent_role})</span>
                                    </div>
                                    ${roundBadge}
                                </div>
                                <div class="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                                    ${msg.message}
                                </div>
                            </div>
                        </div>
                    `;
                });
            }

            // Notulensi Rapat & Action Items Box
            html += `
                <div class="mt-4 p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 shadow-sm">
                    <div class="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-900 dark:text-indigo-300 mb-2">
                        <i class="fa-solid fa-clipboard-check text-sm text-indigo-600 dark:text-indigo-400"></i>
                        Notulensi Rapat & Kesepakatan Tim
                    </div>
                    <div class="text-xs text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap mb-4 font-sans">
                        ${result.summary}
                    </div>

                    <!-- Action items created -->
                    <div class="pt-3 border-t border-indigo-200 dark:border-indigo-800/40">
                        <div class="text-[11px] font-bold text-indigo-900 dark:text-indigo-300 mb-2 flex items-center justify-between">
                            <span><i class="fa-solid fa-list-check mr-1.5"></i>Poin Aksi Otomatis Masuk ke Backlog (${result.created_tasks ? result.created_tasks.length : 0} Tugas):</span>
                        </div>
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
            `;

            if (result.created_tasks && result.created_tasks.length > 0) {
                result.created_tasks.forEach(t => {
                    html += `
                        <div class="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-indigo-300 dark:border-indigo-700/60 flex items-center justify-between gap-2 shadow-xs">
                            <div class="min-w-0 flex-1">
                                <div class="text-xs font-bold text-slate-900 dark:text-white truncate">${t.title}</div>
                                <div class="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                                    <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                    <span>Prioritas: ${t.priority.toUpperCase()}</span>
                                </div>
                            </div>
                            <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 shrink-0">
                                #${t.id}
                            </span>
                        </div>
                    `;
                });
            }

            html += `
                        </div>
                    </div>
                </div>
            `;

            messagesContainer.innerHTML = html;
        };

        AppController.prototype.breakdownManagerTask = async function() {
            const input = document.getElementById('war-room-parent-task-input');
            const title = input ? input.value.trim() : '';

            if (!title) {
                this.showToast('Silakan masukkan judul tugas besar yang ingin dipecah', 'warning');
                return;
            }

            const leadId = Number(document.getElementById('war-room-lead-select')?.value || 1);
            const btn = document.getElementById('btn-war-room-breakdown');
            if (btn) {
                btn.disabled = true;
                btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin mr-1.5"></i> Memproses Delegasi...`;
            }

            this.showToast('🤖 Manager AI sedang menganalisis & memecah sub-tugas...', 'info');

            try {
                const res = await fetch('api/meetings.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'breakdown_task',
                        title: title,
                        lead_agent_id: leadId
                    })
                });

                const data = await res.json();

                if (data.success && data.data) {
                    this.showToast(`✅ ${data.message}`, 'success');
                    input.value = '';

                    const resContainer = document.getElementById('war-room-delegation-results');
                    if (resContainer) {
                        resContainer.classList.remove('hidden');
                        let html = `
                            <div class="text-xs font-bold text-slate-800 dark:text-slate-200 mb-2 flex items-center gap-1.5">
                                <i class="fa-solid fa-sitemap text-indigo-500"></i>
                                Sub-Tugas Berhasil Didelegasikan (${data.data.length}):
                            </div>
                            <div class="space-y-2">
                        `;
                        data.data.forEach(st => {
                            html += `
                                <div class="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 flex items-center justify-between gap-3 shadow-xs">
                                    <div class="min-w-0 flex-1">
                                        <div class="text-xs font-bold text-slate-900 dark:text-white">${st.title}</div>
                                        <div class="text-[10px] text-slate-500 dark:text-slate-400">
                                            Kategori: <span class="font-mono text-indigo-500">${st.category}</span> • Prioritas: <span class="font-bold text-amber-500">${st.priority.toUpperCase()}</span>
                                        </div>
                                    </div>
                                    <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                        Agent #${st.assigned_agent_id}
                                    </span>
                                </div>
                            `;
                        });
                        html += `</div>`;
                        resContainer.innerHTML = html;
                    }

                    await this.loadTasks();
                    await this.loadLogs();
                } else {
                    this.showToast(`❌ Gagal: ${data.error || 'Terjadi kesalahan delegasi'}`, 'warning');
                }
            } catch (err) {
                console.error('Error in task breakdown:', err);
                this.showToast('Gagal memproses delegasi tugas', 'warning');
            } finally {
                if (btn) {
                    btn.disabled = false;
                    btn.innerHTML = `<i class="fa-solid fa-sitemap mr-1.5"></i> Pecah Menjadi Sub-Tugas & Delegasikan`;
                }
            }
        };

        AppController.prototype.endCurrentMeeting = function() {
            if (this.office3D && typeof this.office3D.endTeamMeeting === 'function') {
                this.office3D.endTeamMeeting();
            }
            const tracker = document.getElementById('floating-meeting-tracker');
            if (tracker) tracker.classList.add('hidden');
            this.activeMeeting = null;

            this.showToast('Rapat tim diselesaikan. Para agent kembali ke stasiun kerja masing-masing.', 'info');
            this.closeWarRoomModal();
        };
    }
})();

