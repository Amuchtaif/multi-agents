/**
 * Real API Token Cost Calculator & Budget Alert Controller
 * Kantor Virtual HQ
 */

(function() {
    if (typeof window === 'undefined') return;

    if (typeof AppController !== 'undefined') {

        AppController.prototype.openCostCalculatorModal = function() {
            const modal = document.getElementById('modal-cost-calculator');
            if (!modal) return;

            this.loadCostMetrics();
            modal.classList.remove('hidden');
        };

        AppController.prototype.closeCostCalculatorModal = function() {
            const modal = document.getElementById('modal-cost-calculator');
            if (modal) modal.classList.add('hidden');
        };

        AppController.prototype.loadCostMetrics = async function() {
            try {
                const res = await fetch('api/cost_calculator.php');
                const data = await res.json();

                if (data.success && data.summary) {
                    this.renderCostModal(data);
                }
            } catch (err) {
                console.error('Error loading cost metrics:', err);
            }
        };

        AppController.prototype.renderCostModal = function(data) {
            const s = data.summary;
            
            document.getElementById('cost-total-tokens') && (document.getElementById('cost-total-tokens').textContent = Number(s.total_tokens).toLocaleString('id-ID'));
            document.getElementById('cost-total-usd') && (document.getElementById('cost-total-usd').textContent = `$${s.total_cost_usd}`);
            document.getElementById('cost-total-idr') && (document.getElementById('cost-total-idr').textContent = s.total_cost_idr_formatted);
            
            document.getElementById('cost-budget-usd') && (document.getElementById('cost-budget-usd').value = s.weekly_budget_usd);
            document.getElementById('cost-budget-idr') && (document.getElementById('cost-budget-idr').textContent = s.weekly_budget_idr_formatted);
            document.getElementById('cost-rate-idr') && (document.getElementById('cost-rate-idr').value = s.exchange_rate);

            const pctBar = document.getElementById('cost-budget-bar');
            const pctText = document.getElementById('cost-budget-percent');
            if (pctBar && pctText) {
                pctBar.style.width = `${Math.min(100, s.budget_used_percentage)}%`;
                pctText.textContent = `${s.budget_used_percentage}%`;

                if (s.is_exceeded) {
                    pctBar.className = 'h-full rounded-full bg-rose-500 transition-all';
                    pctText.className = 'font-mono font-bold text-rose-500';
                } else if (s.is_warning) {
                    pctBar.className = 'h-full rounded-full bg-amber-500 transition-all';
                    pctText.className = 'font-mono font-bold text-amber-500';
                } else {
                    pctBar.className = 'h-full rounded-full bg-emerald-500 transition-all';
                    pctText.className = 'font-mono font-bold text-emerald-500';
                }
            }

            // Agents table
            const tbody = document.getElementById('cost-agents-tbody');
            if (tbody && data.agents) {
                let html = '';
                data.agents.forEach(ag => {
                    html += `
                        <tr class="border-b border-slate-100 dark:border-white/5 hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                            <td class="py-2.5 px-3">
                                <div class="flex items-center gap-2">
                                    <div class="w-6 h-6 rounded-lg text-white font-bold text-[10px] flex items-center justify-center" style="background:${ag.avatar_color}">
                                        ${(ag.name || 'A').charAt(0)}
                                    </div>
                                    <div>
                                        <div class="font-bold text-xs text-slate-800 dark:text-slate-200">${ag.name}</div>
                                        <div class="text-[10px] text-slate-400 font-mono">${ag.model_name}</div>
                                    </div>
                                </div>
                            </td>
                            <td class="py-2.5 px-3 text-right font-mono text-xs text-slate-700 dark:text-slate-300">
                                ${Number(ag.tokens).toLocaleString('id-ID')}
                            </td>
                            <td class="py-2.5 px-3 text-right font-mono text-xs font-semibold text-slate-900 dark:text-white">
                                $${ag.cost_usd}
                            </td>
                            <td class="py-2.5 px-3 text-right font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                Rp ${Number(ag.cost_idr).toLocaleString('id-ID')}
                            </td>
                        </tr>
                    `;
                });
                tbody.innerHTML = html;
            }
        };

        AppController.prototype.saveBudgetSettings = async function() {
            const budgetUsd = Number(document.getElementById('cost-budget-usd')?.value || 50);
            const rateIdr = Number(document.getElementById('cost-rate-idr')?.value || 16200);

            try {
                const res = await fetch('api/cost_calculator.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        weekly_budget_usd: budgetUsd,
                        usd_to_idr_rate: rateIdr
                    })
                });
                const data = await res.json();
                if (data.success) {
                    this.showToast('✅ Pengaturan anggaran berhasil diperbarui', 'success');
                    await this.loadCostMetrics();
                }
            } catch (err) {
                console.error('Error saving budget settings:', err);
                this.showToast('Gagal menyimpan pengaturan anggaran', 'warning');
            }
        };
    }
})();

