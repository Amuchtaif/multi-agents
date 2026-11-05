/**
 * Company Knowledge Base Controller (RAG)
 * Kantor Virtual HQ
 */

(function() {
    if (typeof window === 'undefined') return;

    if (typeof AppController !== 'undefined') {

        AppController.prototype.openKnowledgeBaseModal = function() {
            const modal = document.getElementById('modal-knowledge-base');
            if (!modal) return;

            this.loadKnowledgeBase();
            modal.classList.remove('hidden');
        };

        AppController.prototype.closeKnowledgeBaseModal = function() {
            const modal = document.getElementById('modal-knowledge-base');
            if (modal) modal.classList.add('hidden');
        };

        AppController.prototype.loadKnowledgeBase = async function() {
            const container = document.getElementById('knowledge-list-container');
            const category = document.getElementById('kb-filter-category')?.value || 'all';
            const search = document.getElementById('kb-search-input')?.value.trim() || '';

            if (container) {
                container.innerHTML = `
                    <div class="col-span-full py-12 text-center text-slate-400 flex flex-col items-center gap-2">
                        <i class="fa-solid fa-spinner fa-spin text-xl text-amber-500"></i>
                        <span class="text-xs">Memuat katalog pengetahuan perusahaan...</span>
                    </div>
                `;
            }

            try {
                let url = `api/knowledge_base.php?category=${encodeURIComponent(category)}`;
                if (search) url += `&q=${encodeURIComponent(search)}`;

                const res = await fetch(url);
                const data = await res.json();

                if (data.success && data.data) {
                    this.renderKnowledgeGrid(data.data);
                } else {
                    if (container) container.innerHTML = `<p class="col-span-full text-center text-xs text-rose-500 p-6">Gagal memuat dokumen: ${data.error}</p>`;
                }
            } catch (err) {
                console.error('Error loading knowledge base:', err);
                if (container) container.innerHTML = `<p class="col-span-full text-center text-xs text-rose-500 p-6">Gagal menghubungi server basis pengetahuan.</p>`;
            }
        };

        AppController.prototype.renderKnowledgeGrid = function(items) {
            const container = document.getElementById('knowledge-list-container');
            if (!container) return;

            if (items.length === 0) {
                container.innerHTML = `
                    <div class="col-span-full py-16 text-center text-slate-400">
                        <i class="fa-solid fa-book-bookmark text-3xl mb-2 text-slate-300 dark:text-slate-600"></i>
                        <h4 class="font-bold text-xs text-slate-700 dark:text-slate-300">Belum Ada Dokumen Pengetahuan</h4>
                        <p class="text-[11px] text-slate-400 mt-1">Unggah dokumen SOP/Brand Guidelines atau klik tombol Template Standar di bawah.</p>
                    </div>
                `;
                return;
            }

            const categoryLabels = {
                brand_guidelines: { label: 'Brand Voice', color: 'pink' },
                sop:              { label: 'SOP Tim', color: 'emerald' },
                api_docs:         { label: 'API Specs', color: 'indigo' },
                product_catalog:  { label: 'Katalog Produk', color: 'blue' },
                general:          { label: 'Umum', color: 'slate' }
            };

            let html = '';
            items.forEach(doc => {
                const cat = categoryLabels[doc.category] || categoryLabels.general;
                const isActive = doc.is_active == 1;

                html += `
                    <div class="p-4 rounded-2xl bg-white dark:bg-slate-900/80 border ${isActive ? 'border-slate-200 dark:border-white/10' : 'border-slate-200/50 dark:border-white/5 opacity-60'} hover:border-amber-400/50 shadow-sm transition-all flex flex-col justify-between group">
                        <div>
                            <div class="flex items-center justify-between gap-2 mb-2">
                                <span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-${cat.color}-500/15 text-${cat.color}-600 dark:text-${cat.color}-400 border border-${cat.color}-500/30">
                                    ${cat.label}
                                </span>
                                <span class="text-[10px] font-mono text-slate-400">~${doc.token_estimate} Tok</span>
                            </div>

                            <h4 class="font-bold text-xs text-slate-900 dark:text-white line-clamp-1 mb-1.5 group-hover:text-amber-500 transition-colors">
                                ${doc.title}
                            </h4>

                            <p class="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-3 leading-relaxed mb-3">
                                ${doc.snippet}...
                            </p>
                        </div>

                        <div class="pt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-[10px] text-slate-400">
                            <div class="flex items-center gap-1.5">
                                <span class="w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-slate-400'}"></span>
                                <span>${isActive ? 'Aktif (RAG)' : 'Nonaktif'}</span>
                            </div>

                            <div class="flex items-center gap-1">
                                <button onclick="window.app.toggleKnowledgeActive(${doc.id}, ${isActive ? 0 : 1})"
                                        class="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"
                                        title="${isActive ? 'Nonaktifkan dari RAG' : 'Aktifkan untuk RAG'}">
                                    <i class="fa-solid ${isActive ? 'fa-toggle-on text-emerald-500 text-sm' : 'fa-toggle-off text-slate-400 text-sm'}"></i>
                                </button>
                                <button onclick="window.app.deleteKnowledge(${doc.id})"
                                        class="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-500 transition-colors"
                                        title="Hapus Dokumen">
                                    <i class="fa-solid fa-trash-can"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            });

            container.innerHTML = html;
        };

        AppController.prototype.seedPresetKnowledge = async function() {
            this.showToast('Memuat dokumen template standar ke Knowledge Base...', 'info');
            try {
                const res = await fetch('api/knowledge_base.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'preset_templates' })
                });
                const data = await res.json();
                if (data.success) {
                    this.showToast(`✅ ${data.message}`, 'success');
                    await this.loadKnowledgeBase();
                } else {
                    this.showToast(`❌ Gagal: ${data.error}`, 'warning');
                }
            } catch (err) {
                console.error('Error seeding knowledge:', err);
                this.showToast('Gagal memuat template', 'warning');
            }
        };

        AppController.prototype.uploadKnowledgeDoc = async function(formElement) {
            const formData = new FormData(formElement);
            this.showToast('Mengunggah & mengekstraksi teks dokumen...', 'info');

            try {
                const res = await fetch('api/knowledge_base.php', {
                    method: 'POST',
                    body: formData
                });
                const data = await res.json();

                if (data.success) {
                    this.showToast(`✅ ${data.message}`, 'success');
                    formElement.reset();
                    await this.loadKnowledgeBase();
                } else {
                    this.showToast(`❌ Gagal: ${data.error}`, 'warning');
                }
            } catch (err) {
                console.error('Error uploading document:', err);
                this.showToast('Gagal mengunggah dokumen', 'warning');
            }
        };

        AppController.prototype.toggleKnowledgeActive = async function(id, newActive) {
            try {
                const res = await fetch('api/knowledge_base.php', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: id, is_active: newActive })
                });
                const data = await res.json();
                if (data.success) {
                    this.showToast(newActive ? 'Dokumen diaktifkan untuk konteks AI' : 'Dokumen dinonaktifkan', 'info');
                    await this.loadKnowledgeBase();
                }
            } catch (err) {
                console.error('Error toggling knowledge doc:', err);
            }
        };

        AppController.prototype.deleteKnowledge = async function(id) {
            if (!confirm('Yakin ingin menghapus dokumen ini dari Knowledge Base?')) return;
            try {
                const res = await fetch(`api/knowledge_base.php?id=${id}`, { method: 'DELETE' });
                const data = await res.json();
                if (data.success) {
                    this.showToast('Dokumen berhasil dihapus', 'info');
                    await this.loadKnowledgeBase();
                }
            } catch (err) {
                console.error('Error deleting knowledge doc:', err);
            }
        };
    }
})();

