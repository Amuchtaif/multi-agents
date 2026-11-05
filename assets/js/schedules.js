/**
 * Autonomous Cron & Scheduled Tasks Controller
 * Kantor Virtual HQ
 */

(function() {
    if (typeof window === 'undefined') return;

    if (typeof AppController !== 'undefined') {

        AppController.prototype.openSchedulesModal = function() {
            const modal = document.getElementById('modal-schedules');
            if (!modal) return;

            this.loadSchedules();
            modal.classList.remove('hidden');
        };

        AppController.prototype.closeSchedulesModal = function() {
            const modal = document.getElementById('modal-schedules');
            if (modal) modal.classList.add('hidden');
        };

        AppController.prototype.loadSchedules = async function() {
            const container = document.getElementById('schedules-list-container');
            if (container) {
                container.innerHTML = `
                    <div class="py-12 text-center text-slate-400 flex flex-col items-center gap-2">
                        <i class="fa-solid fa-spinner fa-spin text-xl text-indigo-500"></i>
                        <span class="text-xs">Memuat jadwal automasi rutin...</span>
                    </div>
                `;
            }

            try {
                const res = await fetch('api/schedules.php');
                const data = await res.json();

                if (data.success && data.data) {
                    this.renderSchedulesList(data.data);
                } else {
                    if (container) container.innerHTML = `<p class="text-center text-xs text-rose-500 p-6">Gagal memuat jadwal: ${data.error}</p>`;
                }
            } catch (err) {
                console.error('Error loading schedules:', err);
                if (container) container.innerHTML = `<p class="text-center text-xs text-rose-500 p-6">Gagal menghubungi server jadwal.</p>`;
            }
        };

        AppController.prototype.renderSchedulesList = function(items) {
            const container = document.getElementById('schedules-list-container');
            if (!container) return;

            if (items.length === 0) {
                container.innerHTML = `
                    <div class="py-12 text-center text-slate-400">
                        <i class="fa-regular fa-clock text-3xl mb-2 text-slate-300 dark:text-slate-600"></i>
                        <h4 class="font-bold text-xs text-slate-700 dark:text-slate-300">Belum Ada Jadwal Automasi</h4>
                        <p class="text-[11px] text-slate-400 mt-1">Pilih salah satu preset di bawah untuk mengaktifkan jadwal tugas otomatis!</p>
                    </div>
                `;
                return;
            }

            let html = '<div class="space-y-3">';
            items.forEach(it => {
                const isActive = it.is_active == 1;
                const nextRunDate = it.next_run_at ? new Date(it.next_run_at).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '-';
                const actionBadge = it.action_type === 'social_content' 
                    ? '<span class="px-2 py-0.5 rounded text-[9px] font-bold bg-pink-500/15 text-pink-600 dark:text-pink-400 border border-pink-500/30">Medsos</span>'
                    : (it.action_type === 'meeting'
                        ? '<span class="px-2 py-0.5 rounded text-[9px] font-bold bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30">Rapat Tim</span>'
                        : '<span class="px-2 py-0.5 rounded text-[9px] font-bold bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30">Tugas AI</span>');

                html += `
                    <div class="p-4 rounded-2xl bg-white dark:bg-slate-900/80 border ${isActive ? 'border-slate-200 dark:border-white/10' : 'border-slate-200/50 dark:border-white/5 opacity-60'} shadow-sm transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group">
                        <div class="flex-1 min-w-0">
                            <div class="flex items-center gap-2 mb-1.5 flex-wrap">
                                <span class="w-2 h-2 rounded-full ${isActive ? 'bg-emerald-500 pulse-green' : 'bg-slate-400'}"></span>
                                <h4 class="font-bold text-xs text-slate-900 dark:text-white truncate">${it.title}</h4>
                                ${actionBadge}
                            </div>

                            <div class="text-[11px] text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-2 flex-wrap">
                                <span class="font-semibold text-slate-700 dark:text-slate-300">
                                    <i class="fa-regular fa-calendar-check mr-1 text-indigo-500"></i>${it.schedule_display}
                                </span>
                                <span>•</span>
                                <span>Pelaksana: <strong>${it.agent_name}</strong></span>
                            </div>

                            <div class="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                                <i class="fa-solid fa-stopwatch"></i>
                                <span>Jadwal Berikutnya: <strong class="text-indigo-600 dark:text-indigo-400 font-mono">${nextRunDate} WIB</strong></span>
                            </div>
                        </div>

                        <div class="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-white/5">
                            <button onclick="window.app.runScheduleNow(${it.id})"
                                    class="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-600 hover:text-white dark:bg-indigo-950/60 dark:hover:bg-indigo-600 text-indigo-600 dark:text-indigo-400 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs"
                                    title="Jalankan tugas jadwal ini sekarang juga">
                                <i class="fa-solid fa-play text-[10px]"></i>
                                <span>Jalankan Sekarang</span>
                            </button>

                            <button onclick="window.app.toggleScheduleActive(${it.id}, ${isActive ? 0 : 1})"
                                    class="p-2 rounded-xl text-xs font-semibold ${isActive ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400' : 'bg-slate-100 text-slate-400 dark:bg-slate-800'} transition-colors"
                                    title="${isActive ? 'Nonaktifkan Jadwal' : 'Aktifkan Jadwal'}">
                                <i class="fa-solid ${isActive ? 'fa-toggle-on text-base' : 'fa-toggle-off text-base'}"></i>
                            </button>

                            <button onclick="window.app.deleteSchedule(${it.id})"
                                    class="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                                    title="Hapus Jadwal">
                                <i class="fa-solid fa-trash-can text-xs"></i>
                            </button>
                        </div>
                    </div>
                `;
            });
            html += '</div>';
            container.innerHTML = html;
        };

        AppController.prototype.createPresetSchedule = async function(presetKey) {
            this.showToast('Mengaktifkan preset automasi waktu...', 'info');
            try {
                const res = await fetch('api/schedules.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'preset', preset: presetKey })
                });
                const data = await res.json();
                if (data.success) {
                    this.showToast(`✅ ${data.message}`, 'success');
                    await this.loadSchedules();
                } else {
                    this.showToast(`❌ Gagal: ${data.error}`, 'warning');
                }
            } catch (err) {
                console.error('Error creating preset schedule:', err);
                this.showToast('Gagal menghubungi backend jadwal', 'warning');
            }
        };

        AppController.prototype.runScheduleNow = async function(scheduleId) {
            this.showToast('🚀 Memicu eksekusi automasi sekarang...', 'info');
            try {
                const res = await fetch('api/schedules.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'run_now', schedule_id: scheduleId })
                });
                const data = await res.json();
                if (data.success) {
                    this.showToast(`✅ ${data.message}`, 'success');
                    await this.loadSchedules();
                    await this.loadTasks();
                    await this.loadLogs();
                } else {
                    this.showToast(`❌ Gagal: ${data.error}`, 'warning');
                }
            } catch (err) {
                console.error('Error running schedule now:', err);
                this.showToast('Gagal memicu jadwal', 'warning');
            }
        };

        AppController.prototype.toggleScheduleActive = async function(id, newActive) {
            try {
                const res = await fetch('api/schedules.php', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: id, is_active: newActive })
                });
                const data = await res.json();
                if (data.success) {
                    this.showToast(newActive ? 'Jadwal diaktifkan' : 'Jadwal dinonaktifkan', 'info');
                    await this.loadSchedules();
                }
            } catch (err) {
                console.error('Error toggling schedule:', err);
            }
        };

        AppController.prototype.deleteSchedule = async function(id) {
            if (!confirm('Yakin ingin menghapus jadwal automasi ini?')) return;
            try {
                const res = await fetch(`api/schedules.php?id=${id}`, { method: 'DELETE' });
                const data = await res.json();
                if (data.success) {
                    this.showToast('Jadwal automasi berhasil dihapus', 'info');
                    await this.loadSchedules();
                }
            } catch (err) {
                console.error('Error deleting schedule:', err);
            }
        };
    }
})();

