/**
 * Content Calendar & Social Media Creator Controller
 * Kantor Virtual HQ - Editorial Workflow & Visual Post Previewer
 */

(function() {
    if (typeof window === 'undefined') return;

    if (typeof AppController !== 'undefined') {

        AppController.prototype.openContentCalendarModal = function() {
            const modal = document.getElementById('modal-content-calendar');
            if (!modal) return;

            this.loadContentCalendar();
            modal.classList.remove('hidden');
        };

        AppController.prototype.closeContentCalendarModal = function() {
            const modal = document.getElementById('modal-content-calendar');
            if (modal) modal.classList.add('hidden');
        };

        AppController.prototype.loadContentCalendar = async function() {
            const platform = document.getElementById('calendar-filter-platform')?.value || 'all';
            const status = document.getElementById('calendar-filter-status')?.value || 'all';
            const container = document.getElementById('content-calendar-grid');

            if (container) {
                container.innerHTML = `
                    <div class="col-span-full py-12 text-center text-slate-400 flex flex-col items-center gap-2">
                        <i class="fa-solid fa-spinner fa-spin text-xl text-rose-500"></i>
                        <span class="text-xs">Memuat kalender editorial konten...</span>
                    </div>
                `;
            }

            try {
                const res = await fetch(`api/content_calendar.php?platform=${platform}&status=${status}`);
                const data = await res.json();

                if (data.success) {
                    this.renderContentGrid(data.data || []);
                    // Update header counters
                    if (data.counts) {
                        document.getElementById('cal-count-total') && (document.getElementById('cal-count-total').textContent = data.counts.total || 0);
                        document.getElementById('cal-count-draft') && (document.getElementById('cal-count-draft').textContent = data.counts.count_draft || 0);
                        document.getElementById('cal-count-review') && (document.getElementById('cal-count-review').textContent = data.counts.count_review || 0);
                        document.getElementById('cal-count-siap') && (document.getElementById('cal-count-siap').textContent = data.counts.count_siap || 0);
                    }
                } else {
                    if (container) container.innerHTML = `<p class="col-span-full text-center text-xs text-rose-500">Gagal: ${data.error}</p>`;
                }
            } catch (err) {
                console.error('Error loading content calendar:', err);
                if (container) container.innerHTML = `<p class="col-span-full text-center text-xs text-rose-500">Gagal menghubungi API konten.</p>`;
            }
        };

        AppController.prototype.renderContentGrid = function(items) {
            const container = document.getElementById('content-calendar-grid');
            if (!container) return;

            if (items.length === 0) {
                container.innerHTML = `
                    <div class="col-span-full py-16 text-center text-slate-400 dark:text-slate-500">
                        <i class="fa-regular fa-calendar-xmark text-3xl mb-2"></i>
                        <p class="text-xs font-semibold">Belum ada konten di kalender editorial</p>
                        <p class="text-[11px] text-slate-400 mt-1">Gunakan preset di atas untuk membuat konten pertama secara otomatis!</p>
                    </div>
                `;
                return;
            }

            const platformConfig = {
                instagram: { name: 'Instagram', icon: 'fa-brands fa-instagram', bg: 'bg-gradient-to-r from-purple-500 via-pink-500 to-rose-500', text: 'text-pink-600 dark:text-pink-400' },
                tiktok:    { name: 'TikTok', icon: 'fa-brands fa-tiktok', bg: 'bg-black text-cyan-400', text: 'text-cyan-500 dark:text-cyan-400' },
                twitter:   { name: 'X / Twitter', icon: 'fa-brands fa-x-twitter', bg: 'bg-slate-900 text-white', text: 'text-sky-500 dark:text-sky-400' },
                linkedin:  { name: 'LinkedIn', icon: 'fa-brands fa-linkedin', bg: 'bg-blue-700 text-white', text: 'text-blue-600 dark:text-blue-400' }
            };

            const statusConfig = {
                ide:             { label: 'Ide', bg: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700' },
                draft_selesai:   { label: 'Draft Selesai', bg: 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800' },
                menunggu_review: { label: 'Menunggu Review', bg: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800' },
                siap_publikasi:  { label: 'Siap Publikasi', bg: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' }
            };

            let html = '';
            items.forEach(it => {
                const plat = platformConfig[it.platform] || platformConfig.instagram;
                const stat = statusConfig[it.status] || statusConfig.ide;
                const readingTime = it.estimated_reading_time || '30 detik baca';
                const dateStr = new Date(it.scheduled_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

                html += `
                    <div class="glass-card rounded-2xl p-4 border border-slate-200 dark:border-white/10 flex flex-col justify-between hover:border-pink-400/50 shadow-sm transition-all group">
                        <!-- Top Meta -->
                        <div>
                            <div class="flex items-center justify-between gap-2 mb-2.5">
                                <span class="px-2 py-0.5 rounded-lg text-[10px] font-bold text-white ${plat.bg} flex items-center gap-1 shadow-xs">
                                    <i class="${plat.icon}"></i>
                                    <span>${plat.name}</span>
                                </span>
                                <span class="px-2 py-0.5 rounded-full text-[9px] font-semibold border ${stat.bg}">
                                    ${stat.label}
                                </span>
                            </div>

                            <h4 class="font-bold text-xs text-slate-900 dark:text-white line-clamp-2 mb-1.5 group-hover:text-pink-600 dark:group-hover:text-pink-400 transition-colors">
                                ${it.title}
                            </h4>

                            <p class="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-3 mb-3 leading-relaxed whitespace-pre-line font-sans">
                                ${it.copywriting || '(Belum ada draf copywriting)'}
                            </p>
                        </div>

                        <!-- Footer Specs & Actions -->
                        <div class="pt-3 border-t border-slate-100 dark:border-white/5">
                            <div class="flex items-center justify-between text-[10px] text-slate-400 mb-3">
                                <span><i class="fa-regular fa-clock mr-1"></i>${dateStr}</span>
                                <span class="px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono">${readingTime}</span>
                            </div>

                            <div class="flex items-center gap-2">
                                <button onclick="window.app.previewContentMockup(${it.id})"
                                        class="flex-1 py-1.5 rounded-lg bg-pink-50 hover:bg-pink-100 dark:bg-pink-950/40 dark:hover:bg-pink-900/60 text-pink-700 dark:text-pink-300 font-semibold text-[11px] flex items-center justify-center gap-1.5 border border-pink-200 dark:border-pink-800/60 transition-all shadow-xs">
                                    <i class="fa-solid fa-mobile-screen"></i>
                                    <span>Mockup</span>
                                </button>
                                
                                <button onclick="window.app.cycleContentStatus(${it.id}, '${it.status}')"
                                        class="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] transition-all"
                                        title="Ubah Status">
                                    <i class="fa-solid fa-arrow-right-arrow-left"></i>
                                </button>

                                <button onclick="window.app.deleteContentItem(${it.id})"
                                        class="px-2.5 py-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 text-[11px] transition-all"
                                        title="Hapus Konten">
                                    <i class="fa-regular fa-trash-can"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            });

            container.innerHTML = html;
        };

        AppController.prototype.openQuickPresetModal = function(presetKey) {
            const presetLabels = {
                reels_viral: '🚀 Buat Ide Konten Reels Instagram Viral',
                tiktok_60s: '🎬 Buat Script Video TikTok 60 Detik',
                twitter_thread: '🧵 Buat Thread Twitter/X 7-Tweet Edukatif',
                brand_brainstorm: '💡 Brainstorming 5 Sudut Pandang Brand Campaign'
            };

            const presetDefaults = {
                reels_viral: '3 Trik Rahasia Meningkatkan Produktivitas Tim dengan AI Virtual Office',
                tiktok_60s: 'Kenapa Tim Startup Sekarang Pakai AI Autonomous Agent Bukan Freelancer Biasa',
                twitter_thread: 'Bedah Arsitektur Multi-Agent AI System: Dari Konsep ke Implementasi Nyata',
                brand_brainstorm: 'Kampanye Brand: "Masa Depan Tempat Kerja Tanpa Batas Ruang Fisik"'
            };

            const titleEl = document.getElementById('gen-preset-title');
            if (titleEl) titleEl.textContent = presetLabels[presetKey] || 'Generate Konten Media Sosial';

            const inputPreset = document.getElementById('gen-preset-key');
            if (inputPreset) inputPreset.value = presetKey;

            const topicInput = document.getElementById('gen-preset-topic');
            if (topicInput) topicInput.value = presetDefaults[presetKey] || '';

            const modal = document.getElementById('modal-content-generator');
            if (modal) modal.classList.remove('hidden');
        };

        AppController.prototype.closeQuickPresetModal = function() {
            const modal = document.getElementById('modal-content-generator');
            if (modal) modal.classList.add('hidden');
        };

        AppController.prototype.runQuickPresetGenerator = async function() {
            const preset = document.getElementById('gen-preset-key')?.value || 'reels_viral';
            const topic = document.getElementById('gen-preset-topic')?.value.trim();

            if (!topic) {
                this.showToast('Masukkan topik konten terlebih dahulu', 'warning');
                return;
            }

            const btn = document.getElementById('btn-run-generator');
            if (btn) {
                btn.disabled = true;
                btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin mr-1.5"></i> AI Sedang Meracik Copywriting...`;
            }

            this.showToast('✨ AI Content Creator sedang menyusun draf copywriting & analisa hashtag...', 'info');

            try {
                const res = await fetch('api/content_calendar.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'quick_preset',
                        preset: preset,
                        topic: topic
                    })
                });

                const data = await res.json();

                if (data.success && data.data) {
                    this.showToast('✅ Draf konten berhasil dibuat dan dijadwalkan!', 'success');
                    this.closeQuickPresetModal();
                    await this.loadContentCalendar();

                    // Open mockup preview immediately!
                    this.previewContentMockup(data.data.id);
                } else {
                    this.showToast(`❌ Gagal: ${data.error || 'Terjadi kesalahan pembuatan konten'}`, 'warning');
                }
            } catch (err) {
                console.error('Error generating AI content:', err);
                this.showToast('Gagal menghubungi backend content creator', 'warning');
            } finally {
                if (btn) {
                    btn.disabled = false;
                    btn.innerHTML = `<i class="fa-solid fa-wand-magic-sparkles mr-1.5"></i> Hasilkan Konten Sekarang`;
                }
            }
        };

        AppController.prototype.previewContentMockup = async function(contentId) {
            try {
                const res = await fetch(`api/content_calendar.php?id=${contentId}`);
                const data = await res.json();

                if (!data.success || !data.data) {
                    this.showToast('Gagal memuat pratinjau konten', 'warning');
                    return;
                }

                const item = data.data;
                const modal = document.getElementById('modal-post-mockup');
                if (!modal) return;

                // Populate Meta
                document.getElementById('mockup-title').textContent = item.title;
                document.getElementById('mockup-reading-time').textContent = `⏱️ ${item.estimated_reading_time || '30 detik'}`;

                // Render Smartphone Mockup (Instagram / TikTok / Twitter)
                const phoneBody = document.getElementById('phone-screen-content');
                if (phoneBody) {
                    if (item.platform === 'twitter') {
                        phoneBody.innerHTML = `
                            <div class="p-3 bg-black text-white font-sans text-xs min-h-[380px] flex flex-col justify-between">
                                <div>
                                    <div class="flex items-center gap-2 mb-2">
                                        <div class="w-8 h-8 rounded-full bg-sky-500 flex items-center justify-center font-bold text-xs text-white">HQ</div>
                                        <div>
                                            <div class="font-bold flex items-center gap-1 text-[11px]">
                                                Virtual Office HQ <i class="fa-solid fa-circle-check text-sky-400 text-[10px]"></i>
                                            </div>
                                            <div class="text-[9px] text-slate-400">@kantorvirtual_hq</div>
                                        </div>
                                    </div>
                                    <div class="leading-relaxed whitespace-pre-wrap text-[11px] mb-3 text-slate-100 font-sans">
                                        ${item.copywriting}
                                    </div>
                                    <div class="text-sky-400 text-[10px] mb-3">
                                        ${item.hashtags || ''}
                                    </div>
                                </div>
                                <div class="pt-2 border-t border-slate-800 flex items-center justify-between text-slate-400 text-[10px]">
                                    <span><i class="fa-regular fa-comment mr-1"></i>34</span>
                                    <span><i class="fa-solid fa-retweet mr-1"></i>89</span>
                                    <span><i class="fa-regular fa-heart mr-1"></i>420</span>
                                    <span><i class="fa-regular fa-bookmark mr-1"></i>128</span>
                                </div>
                            </div>
                        `;
                    } else if (item.platform === 'tiktok') {
                        phoneBody.innerHTML = `
                            <div class="p-3 bg-slate-950 text-white font-sans text-xs min-h-[380px] flex flex-col justify-between relative overflow-hidden">
                                <div class="absolute inset-0 bg-gradient-to-b from-cyan-900/20 via-slate-900/60 to-black z-0"></div>
                                <div class="relative z-10">
                                    <div class="flex items-center justify-between text-[11px] mb-4 text-slate-300">
                                        <span>Following | <strong>For You</strong></span>
                                        <i class="fa-solid fa-magnifying-glass"></i>
                                    </div>
                                    <div class="p-2.5 rounded-xl bg-black/60 backdrop-blur-sm border border-white/10 mb-3">
                                        <div class="text-[10px] uppercase font-bold text-cyan-400 mb-1">🎬 Naskah Skrip 60s:</div>
                                        <div class="text-[11px] leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto">
                                            ${item.copywriting}
                                        </div>
                                    </div>
                                </div>
                                <div class="relative z-10 pt-2 flex items-end justify-between">
                                    <div class="min-w-0 flex-1 pr-4">
                                        <div class="font-bold text-[11px] mb-1">@creator_kantorhq</div>
                                        <p class="text-[10px] text-slate-300 line-clamp-2">${item.title}</p>
                                        <p class="text-[9px] text-cyan-300 mt-1">${item.hashtags || ''}</p>
                                    </div>
                                    <div class="flex flex-col items-center gap-2 text-xs text-white">
                                        <div class="w-7 h-7 rounded-full bg-rose-500 flex items-center justify-center text-[10px]"><i class="fa-solid fa-heart"></i></div>
                                        <span class="text-[9px]">12.4K</span>
                                        <div class="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center text-[10px]"><i class="fa-solid fa-comment"></i></div>
                                        <span class="text-[9px]">340</span>
                                    </div>
                                </div>
                            </div>
                        `;
                    } else {
                        // Instagram Post / Reel Mockup
                        phoneBody.innerHTML = `
                            <div class="bg-white text-slate-900 font-sans text-xs min-h-[380px] flex flex-col justify-between">
                                <div>
                                    <!-- Insta Header -->
                                    <div class="p-2.5 border-b border-slate-100 flex items-center justify-between">
                                        <div class="flex items-center gap-2">
                                            <div class="w-6 h-6 rounded-full bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 p-0.5">
                                                <div class="w-full h-full bg-white rounded-full flex items-center justify-center text-[9px] font-bold">HQ</div>
                                            </div>
                                            <span class="font-bold text-[11px]">kantorvirtual.official</span>
                                        </div>
                                        <i class="fa-solid fa-ellipsis text-slate-400"></i>
                                    </div>
                                    <!-- Insta Image Area -->
                                    <div class="w-full aspect-square bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-950 flex flex-col items-center justify-center p-4 text-center text-white relative">
                                        <span class="text-[10px] uppercase font-bold text-pink-400 tracking-wider mb-2">Visual Concept</span>
                                        <p class="text-xs font-bold leading-snug max-w-xs">${item.title}</p>
                                        <span class="absolute bottom-2 right-2 text-[9px] px-1.5 py-0.5 rounded bg-black/60 text-slate-300 font-mono">${item.content_type.toUpperCase()}</span>
                                    </div>
                                    <!-- Insta Action Bar -->
                                    <div class="p-2.5 pb-1 flex items-center justify-between text-base text-slate-700">
                                        <div class="flex items-center gap-3">
                                            <i class="fa-regular fa-heart hover:text-rose-500 cursor-pointer"></i>
                                            <i class="fa-regular fa-comment hover:text-indigo-500 cursor-pointer"></i>
                                            <i class="fa-regular fa-paper-plane hover:text-blue-500 cursor-pointer"></i>
                                        </div>
                                        <i class="fa-regular fa-bookmark hover:text-amber-500 cursor-pointer"></i>
                                    </div>
                                    <div class="px-2.5 text-[10px] font-bold text-slate-800 mb-1">1,842 likes</div>
                                    <!-- Caption -->
                                    <div class="px-2.5 pb-3 text-[11px] leading-relaxed max-h-28 overflow-y-auto">
                                        <span class="font-bold mr-1">kantorvirtual.official</span>
                                        ${item.copywriting}
                                        <div class="text-blue-600 font-semibold text-[10px] mt-1">${item.hashtags || ''}</div>
                                    </div>
                                </div>
                            </div>
                        `;
                    }
                }

                // Hashtag Analysis Card
                const hashCard = document.getElementById('mockup-hashtag-analysis');
                if (hashCard && item.hashtag_analysis) {
                    const h = item.hashtag_analysis;
                    hashCard.innerHTML = `
                        <div class="flex items-center justify-between mb-2">
                            <span class="text-[11px] font-bold text-slate-700 dark:text-slate-300">Estimasi Jangkauan Organik:</span>
                            <span class="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                                ${h.estimated_reach}
                            </span>
                        </div>
                        <div class="text-[11px] text-slate-500 dark:text-slate-400 mb-1.5">
                            Status: <strong class="text-indigo-600 dark:text-indigo-400">${h.rating}</strong> (${h.count} hashtag terdeteksi).
                        </div>
                        <p class="text-[10px] text-slate-400 dark:text-slate-500 italic">${h.tip}</p>
                    `;
                }

                modal.classList.remove('hidden');

            } catch (err) {
                console.error('Error opening post preview:', err);
                this.showToast('Gagal memuat pratinjau mockup', 'warning');
            }
        };

        AppController.prototype.closePostMockupModal = function() {
            const modal = document.getElementById('modal-post-mockup');
            if (modal) modal.classList.add('hidden');
        };

        AppController.prototype.cycleContentStatus = async function(contentId, currentStatus) {
            const flow = {
                ide: 'draft_selesai',
                draft_selesai: 'menunggu_review',
                menunggu_review: 'siap_publikasi',
                siap_publikasi: 'ide'
            };
            const nextStatus = flow[currentStatus] || 'draft_selesai';

            try {
                const res = await fetch('api/content_calendar.php', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: contentId, status: nextStatus })
                });
                const data = await res.json();
                if (data.success) {
                    this.showToast(`Status konten diubah menjadi: ${nextStatus.replace('_', ' ').toUpperCase()}`, 'success');
                    await this.loadContentCalendar();
                }
            } catch (e) {
                console.error('Error cycling content status:', e);
            }
        };

        AppController.prototype.deleteContentItem = async function(contentId) {
            if (!confirm('Yakin ingin menghapus konten ini dari kalender?')) return;
            try {
                const res = await fetch(`api/content_calendar.php?id=${contentId}`, { method: 'DELETE' });
                const data = await res.json();
                if (data.success) {
                    this.showToast('Konten berhasil dihapus', 'info');
                    await this.loadContentCalendar();
                }
            } catch (e) {
                console.error('Error deleting content:', e);
            }
        };
    }
})();

