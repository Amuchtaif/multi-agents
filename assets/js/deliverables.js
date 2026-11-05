/**
 * Deliverables & Artifacts Viewer Controller
 * Kantor Virtual HQ - Code Highlighting, File Download & Git Diff Viewer
 */

(function() {
    if (typeof window === 'undefined') return;

    if (typeof AppController !== 'undefined') {

        AppController.prototype.openDeliverablesModal = async function(taskId = null) {
            const modal = document.getElementById('modal-deliverables-viewer');
            if (!modal) return;

            if (taskId) {
                await this.loadTaskDeliverables(taskId);
            } else {
                await this.loadAllDeliverablesRoster();
            }

            modal.classList.remove('hidden');
        };

        AppController.prototype.closeDeliverablesModal = function() {
            const modal = document.getElementById('modal-deliverables-viewer');
            if (modal) modal.classList.add('hidden');
        };

        AppController.prototype.loadAllDeliverablesRoster = async function() {
            const container = document.getElementById('deliverables-content-area');
            if (container) {
                container.innerHTML = `
                    <div class="py-16 text-center text-slate-400 flex flex-col items-center gap-2">
                        <i class="fa-solid fa-spinner fa-spin text-2xl text-emerald-500"></i>
                        <span class="text-xs">Memuat katalog seluruh deliverables & berkas proyek...</span>
                    </div>
                `;
            }

            try {
                const res = await fetch('api/deliverables.php');
                const data = await res.json();

                if (data.success && data.data) {
                    this.renderDeliverablesRoster(data.data);
                } else {
                    if (container) container.innerHTML = `<p class="p-6 text-center text-xs text-rose-500">Gagal memuat katalog berkas: ${data.error}</p>`;
                }
            } catch (err) {
                console.error('Error loading all deliverables:', err);
                if (container) container.innerHTML = `<p class="p-6 text-center text-xs text-rose-500">Gagal menghubungi server deliverables.</p>`;
            }
        };

        AppController.prototype.renderDeliverablesRoster = function(items) {
            const container = document.getElementById('deliverables-content-area');
            if (!container) return;

            if (items.length === 0) {
                container.innerHTML = `
                    <div class="py-20 text-center text-slate-400">
                        <i class="fa-solid fa-box-open text-4xl mb-3 text-slate-300 dark:text-slate-600"></i>
                        <h4 class="font-bold text-sm text-slate-700 dark:text-slate-300">Belum Ada Deliverable Berkas Tersimpan</h4>
                        <p class="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                            Tugaskan agent dengan direktori kerja lokal (seperti backend atau frontend) untuk menghasilkan file kode secara fisik.
                        </p>
                    </div>
                `;
                return;
            }

            let html = `
                <div class="p-4 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
                    <div>
                        <h3 class="font-bold text-sm text-slate-900 dark:text-white">Katalog Deliverable & Artefak Proyek</h3>
                        <p class="text-[11px] text-slate-500 dark:text-slate-400">Total ${items.length} tugas yang telah menghasilkan file kode/laporan fisik di lokal.</p>
                    </div>
                </div>
                <div class="p-4 grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[65vh] overflow-y-auto">
            `;

            items.forEach(it => {
                const dirName = it.working_directory ? it.working_directory.split('/').pop() : 'Lokal';
                html += `
                    <div class="p-4 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-white/10 hover:border-emerald-500/50 shadow-sm transition-all flex flex-col justify-between group">
                        <div>
                            <div class="flex items-center justify-between gap-2 mb-2">
                                <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                                    📁 ${dirName}
                                </span>
                                <span class="text-[10px] text-slate-400 font-mono">${it.file_count} File</span>
                            </div>
                            <h4 class="font-bold text-xs text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors line-clamp-2 mb-2">
                                ${it.title}
                            </h4>
                            <div class="text-[11px] text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-1.5">
                                <div class="w-4 h-4 rounded-full text-[8px] flex items-center justify-center text-white font-bold" style="background:${it.avatar_color}">
                                    ${(it.agent_name || 'A').charAt(0)}
                                </div>
                                <span>${it.agent_name} (${it.agent_role})</span>
                            </div>
                            <div class="flex flex-wrap gap-1 mb-3">
                                ${(it.files || []).slice(0, 3).map(f => `<span class="px-1.5 py-0.5 rounded text-[9px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 truncate max-w-[180px]">${f.split('/').pop()}</span>`).join('')}
                                ${it.files && it.files.length > 3 ? `<span class="text-[9px] text-slate-400 self-center">+${it.files.length - 3} lainnya</span>` : ''}
                            </div>
                        </div>

                        <button onclick="window.app.loadTaskDeliverables(${it.task_id})"
                                class="w-full py-2 rounded-xl bg-slate-100 hover:bg-emerald-600 hover:text-white dark:bg-slate-800 dark:hover:bg-emerald-600 text-slate-700 dark:text-slate-200 font-semibold text-xs flex items-center justify-center gap-1.5 transition-all">
                            <i class="fa-solid fa-code"></i>
                            <span>Buka Detail & Diff Viewer</span>
                        </button>
                    </div>
                `;
            });

            html += `</div>`;
            container.innerHTML = html;
        };

        AppController.prototype.loadTaskDeliverables = async function(taskId) {
            const container = document.getElementById('deliverables-content-area');
            if (container) {
                container.innerHTML = `
                    <div class="py-16 text-center text-slate-400 flex flex-col items-center gap-2">
                        <i class="fa-solid fa-spinner fa-spin text-2xl text-emerald-500"></i>
                        <span class="text-xs">Mengekstrak deliverables dan memuat Git Diff task #${taskId}...</span>
                    </div>
                `;
            }

            try {
                const res = await fetch(`api/deliverables.php?task_id=${taskId}`);
                const data = await res.json();

                if (data.success && data.deliverables) {
                    this.renderTaskDeliverablesDetail(data);
                } else {
                    if (container) container.innerHTML = `<p class="p-6 text-center text-xs text-rose-500">Gagal: ${data.error}</p>`;
                }
            } catch (err) {
                console.error('Error loading task deliverables:', err);
                if (container) container.innerHTML = `<p class="p-6 text-center text-xs text-rose-500">Gagal menghubungi backend deliverables.</p>`;
            }
        };

        AppController.prototype.renderTaskDeliverablesDetail = function(data) {
            const container = document.getElementById('deliverables-content-area');
            if (!container) return;

            const t = data.task;
            const files = data.deliverables || [];
            const git = data.git || {};

            let html = `
                <!-- Top Navigation & Meta -->
                <div class="p-4 border-b border-slate-200 dark:border-white/10 flex items-center justify-between gap-3 bg-slate-50/60 dark:bg-slate-900/60">
                    <div class="flex items-center gap-3">
                        <button onclick="window.app.loadAllDeliverablesRoster()" 
                                class="px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/10 flex items-center gap-1">
                            <i class="fa-solid fa-arrow-left"></i>
                            <span>Semua</span>
                        </button>
                        <div>
                            <h3 class="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">${t.title}</h3>
                            <p class="text-[10px] text-slate-500 dark:text-slate-400">
                                Dikerjakan oleh <strong>${t.agent_name}</strong> • Direktori: <span class="font-mono text-emerald-600 dark:text-emerald-400">${t.working_directory || 'Lokal'}</span>
                            </p>
                        </div>
                    </div>

                    <!-- Deliverable Tabs -->
                    <div class="flex items-center gap-1 bg-slate-200/80 dark:bg-slate-800/80 p-1 rounded-xl text-xs">
                        <button id="deliv-tab-btn-files" onclick="window.app.switchDeliverableSubTab('files')" class="px-3 py-1 rounded-lg font-bold bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs">
                            <i class="fa-solid fa-file-code mr-1"></i>Berkas (${files.length})
                        </button>
                        <button id="deliv-tab-btn-diff" onclick="window.app.switchDeliverableSubTab('diff')" class="px-3 py-1 rounded-lg font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">
                            <i class="fa-solid fa-code-compare mr-1"></i>Git Diff
                        </button>
                        <button id="deliv-tab-btn-raw" onclick="window.app.switchDeliverableSubTab('raw')" class="px-3 py-1 rounded-lg font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">
                            <i class="fa-solid fa-file-lines mr-1"></i>Raw Text
                        </button>
                    </div>
                </div>

                <!-- Tab 1: Files Container -->
                <div id="deliv-subtab-files" class="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
            `;

            if (files.length === 0) {
                html += `
                    <div class="py-12 text-center text-slate-400">
                        <p class="text-xs">Tidak ada blok file terstruktur yang diekstrak dari respon tugas ini.</p>
                    </div>
                `;
            } else {
                files.forEach((f, idx) => {
                    html += `
                        <div class="rounded-2xl border border-slate-200 dark:border-white/10 overflow-hidden bg-slate-900 shadow-md">
                            <!-- File Title Bar -->
                            <div class="px-4 py-2.5 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between text-xs text-slate-300">
                                <div class="flex items-center gap-2">
                                    <i class="fa-solid fa-file-code text-emerald-400"></i>
                                    <span class="font-bold text-white font-mono">${f.path}</span>
                                    <span class="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-400">${f.language} • ${f.size_bytes} B</span>
                                    ${f.exists_on_disk ? `<span class="px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">Tersimpan di Disk</span>` : ''}
                                </div>
                                <div class="flex items-center gap-1.5">
                                    <button onclick="window.app.copyDeliverableCode(${idx}, this)" 
                                            class="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold flex items-center gap-1 transition-all">
                                        <i class="fa-regular fa-copy"></i>
                                        <span>Salin</span>
                                    </button>
                                    <a href="api/deliverables.php?action=download&task_id=${t.id}&file=${encodeURIComponent(f.path)}" 
                                       class="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold flex items-center gap-1 transition-all">
                                        <i class="fa-solid fa-download"></i>
                                        <span>Unduh</span>
                                    </a>
                                </div>
                            </div>
                            <!-- Code block -->
                            <div class="p-4 font-mono text-[11px] text-slate-100 overflow-x-auto max-h-80 leading-relaxed whitespace-pre" id="code-block-${idx}">${this.escapeHtml(f.content)}</div>
                        </div>
                    `;
                });
            }

            html += `
                </div>

                <!-- Tab 2: Git Diff Container -->
                <div id="deliv-subtab-diff" class="p-4 max-h-[70vh] overflow-y-auto hidden">
                    <div class="mb-3 flex items-center justify-between text-xs">
                        <div class="font-bold text-slate-700 dark:text-slate-300">
                            <i class="fa-solid fa-code-compare mr-1 text-indigo-500"></i>Perubahan Git Lokal (Working Tree vs HEAD)
                        </div>
                        <span class="text-[10px] text-slate-400 font-mono">${git.status || 'Clean'}</span>
                    </div>
                    ${git.diff ? this.renderDiffLines(git.diff) : `
                        <div class="py-12 text-center text-slate-400 border border-dashed border-slate-200 dark:border-white/10 rounded-2xl">
                            <i class="fa-solid fa-check-double text-2xl text-emerald-500 mb-2"></i>
                            <p class="text-xs">Tidak ada perbedaan git aktif atau working tree bersih.</p>
                        </div>
                    `}
                </div>

                <!-- Tab 3: Raw Output Container -->
                <div id="deliv-subtab-raw" class="p-4 max-h-[70vh] overflow-y-auto hidden">
                    <div class="p-4 rounded-2xl bg-slate-900 text-slate-200 font-mono text-xs leading-relaxed whitespace-pre-wrap border border-slate-800">
                        ${this.escapeHtml(data.raw_text || '')}
                    </div>
                </div>
            `;

            container.innerHTML = html;
        };

        AppController.prototype.switchDeliverableSubTab = function(subTab) {
            const btnFiles = document.getElementById('deliv-tab-btn-files');
            const btnDiff = document.getElementById('deliv-tab-btn-diff');
            const btnRaw = document.getElementById('deliv-tab-btn-raw');

            const paneFiles = document.getElementById('deliv-subtab-files');
            const paneDiff = document.getElementById('deliv-subtab-diff');
            const paneRaw = document.getElementById('deliv-subtab-raw');

            [btnFiles, btnDiff, btnRaw].forEach(b => {
                if (b) {
                    b.className = "px-3 py-1 rounded-lg font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white";
                }
            });

            [paneFiles, paneDiff, paneRaw].forEach(p => p && p.classList.add('hidden'));

            if (subTab === 'files') {
                btnFiles && (btnFiles.className = "px-3 py-1 rounded-lg font-bold bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs");
                paneFiles && paneFiles.classList.remove('hidden');
            } else if (subTab === 'diff') {
                btnDiff && (btnDiff.className = "px-3 py-1 rounded-lg font-bold bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs");
                paneDiff && paneDiff.classList.remove('hidden');
            } else {
                btnRaw && (btnRaw.className = "px-3 py-1 rounded-lg font-bold bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs");
                paneRaw && paneRaw.classList.remove('hidden');
            }
        };

        AppController.prototype.copyDeliverableCode = function(index, btnEl) {
            const block = document.getElementById(`code-block-${index}`);
            if (!block) return;

            const text = block.textContent;
            navigator.clipboard.writeText(text).then(() => {
                if (btnEl) {
                    const oldHtml = btnEl.innerHTML;
                    btnEl.innerHTML = `<i class="fa-solid fa-check text-emerald-400"></i><span>Tersalin!</span>`;
                    setTimeout(() => btnEl.innerHTML = oldHtml, 2000);
                }
                this.showToast('Kode berhasil disalin ke clipboard!', 'success');
            });
        };

        AppController.prototype.renderDiffLines = function(diffText) {
            const lines = diffText.split('\n');
            let out = '<div class="rounded-2xl border border-slate-800 bg-slate-950 font-mono text-[11px] overflow-x-auto leading-relaxed p-2">';

            lines.forEach(line => {
                if (line.startsWith('+') && !line.startsWith('+++')) {
                    out += `<div class="bg-emerald-950/60 text-emerald-300 px-2 py-0.5 rounded-xs">${this.escapeHtml(line)}</div>`;
                } else if (line.startsWith('-') && !line.startsWith('---')) {
                    out += `<div class="bg-rose-950/60 text-rose-300 px-2 py-0.5 rounded-xs">${this.escapeHtml(line)}</div>`;
                } else if (line.startsWith('@@')) {
                    out += `<div class="text-indigo-400 bg-slate-900 px-2 py-0.5 font-bold my-1">${this.escapeHtml(line)}</div>`;
                } else {
                    out += `<div class="text-slate-400 px-2 py-0.5">${this.escapeHtml(line)}</div>`;
                }
            });

            out += '</div>';
            return out;
        };

        AppController.prototype.escapeHtml = function(str) {
            return String(str)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;');
        };
    }
})();

