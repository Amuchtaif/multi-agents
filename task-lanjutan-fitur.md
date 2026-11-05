# Prompt Task: Transformasi Kantor Virtual HQ menjadi Autonomous Multi-Agent AI OS

## 1. Konteks

Kantor Virtual HQ saat ini sudah memiliki fondasi yang kuat:

- Visual 3D berbasis **Three.js**
- Visualisasi **avatar** agen
- Integrasi **LLM nyata**
- **SSE streaming**
- **Manajemen tugas**

Namun sistem masih berfungsi sebagai *Dashboard Simulasi Monitoring*.

## 2. Tujuan

Ubah sistem menjadi **Autonomous Multi-Agent AI Operating System** yang mandiri dan berdaya guna tinggi, dengan menambahkan fitur-fitur yang belum ada sesuai prioritas di bawah.

## 3. Matriks Prioritas

| # | Kategori | Fitur yang Diperlukan | Dampak | Prioritas |
|---|----------|-----------------------|--------|-----------|
| 1 | Multi-Agent Collaboration | Sesi Rapat Tim di Ruang Rapat (War Room) | 🔥 Sangat Tinggi | **P1** |
| 2 | Workflow Konten | Kalender Konten & Mockup Previewer (Medsos & Kreator) | 🔥 Sangat Tinggi | **P1** |
| 3 | Output Management | File Deliverables & Artifacts Viewer | 🚀 Tinggi | **P1** |
| 4 | Human-in-the-Loop | Sistem Persetujuan (Review & Approval Flow) | 🚀 Tinggi | **P2** |
| 5 | Automasi & Trigger | Penjadwalan Tugas Otomatis (Cron / Recurring) | 🚀 Tinggi | **P2** |
| 6 | Knowledge Base | Upload Dokumen Pengetahuan (RAG / Brand Guidelines) | 🚀 Tinggi | **P2** |
| 7 | Finansial & Biaya | Estimasi Biaya Token Nyata (USD / IDR) & Budget Alert | 💡 Menengah | **P3** |
| 8 | Imersi 3D | Audio Ambience Kantor (SFX) & Interaktivitas Objek 3D | 🎨 Visual & UX | **P3** |

---

## 4. Spesifikasi Fitur

### 4.1 Kolaborasi Multi-Agent & Rapat Tim (War Room) — P1

**Kondisi saat ini:** Setiap task dikerjakan 1-on-1 (1 agen ↔ 1 task). Ruang rapat (8 kursi eksekutif dan TV dinding) hanya berupa objek statis yang dilihat dari luar kaca.

**Sesi Rapat Tim (Autonomous Team Meeting):**

- [x] Tombol **"Mulai Rapat Tim"**; pengguna memilih topik (contoh: *"Strategi Peluncuran Produk & Kampanye Viral"*).
- [x] Pengguna memilih **2–4 agen** (contoh: Spesialis Media Sosial, Pembuat Konten, Analyst).
- [x] Agen berdiri dari meja, berjalan ke ruang rapat, duduk di kursi konferensi, lalu melakukan **diskusi multi-turn terstruktur**.
- [x] Ringkasan notulensi dan poin aksi tampil di **layar TV dinding**.
- [x] Poin aksi otomatis dibuatkan **kartu tugas baru**.

**Pola Manager-Worker (Delegasi Otomatis):**

- [x] Agen berperan *Project Manager / Team Lead* menerima 1 instruksi besar.
- [x] Instruksi otomatis dipecah (*breakdown*) menjadi sub-tugas.
- [x] Sub-tugas didelegasikan ke rekan tim sesuai departemennya.

---

### 4.2 Spesialis Media Sosial & Pembuatan Konten — P1

**Kondisi saat ini:** Departemen Media Sosial, Konten, dan Brainstorming sudah ada di formulir, tetapi belum memiliki alur kerja atau tampilan khusus untuk aset konten.

**Kalender Konten Interaktif (Social Media Editorial Calendar):**

- [x] Tampilan kalender **mingguan/bulanan** untuk menjadwalkan postingan (Instagram, TikTok, X/Twitter, LinkedIn).
- [x] Alur status konten:

  `Ide` → `Draft Copy Selesai` → `Menunggu Review` → `Siap Publikasi`

**Pratinjau Mockup Post (Visual Post Previewer):**

- [x] Setelah agen Media Sosial menyelesaikan draf copywriting, tampilkan pratinjau dalam **bingkai smartphone** (mockup feed Instagram atau kartu tweet X).
- [x] Sertakan **estimasi reading time** dan **analisis hashtag**.

**Preset Prompt Cepat untuk Kreator (tombol shortcut):**

- [x] Buat Ide Konten Reels Viral
- [x] Buat Script Video TikTok 60 Detik
- [x] Buat Thread Twitter 7-Tweet Edukatif
- [x] Brainstorming 5 Sudut Pandang Brand Campaign

---

### 4.3 File Deliverables & Artifacts Viewer — P1

**Kondisi saat ini:** Agen dapat menulis file ke disk jika `working_directory` diisi, tetapi modal hasil kerja hanya menampilkan teks mentah (*raw string*).

**Tab "Hasil Pengerjaan (Deliverables)":**

- [x] Tab tersendiri untuk file kode, copywriting, artikel Markdown, atau struktur JSON.
- [x] **Syntax highlighting**.
- [x] Tombol **salin** dan **unduh** satu klik.

**File Diff Viewer:**

- [x] Perbandingan **sebelum & sesudah** jika agen memodifikasi file lokal yang sudah ada di direktori proyek.

---

### 4.4 Human-in-the-Loop (Review & Approval) — P2

**Kondisi saat ini:** Kategori `nunggu_owner` pada kolom task hanya berupa penanda biasa.

**Action Approval Card** untuk aksi berisiko atau hasil final (contoh: `git push`, eksekusi build, publikasi kampanye medsos). Agen wajib meminta persetujuan Owner dengan 3 opsi:

| Tombol | Perilaku |
|--------|----------|
| ✅ **Setujui & Lanjutkan** (Approve) | Agen melanjutkan eksekusi. |
| ✏️ **Minta Revisi** (Request Changes) | Pengguna mengetik catatan perbaikan, lalu agen merevisi drafnya. |
| ❌ **Tolak / Batalkan** (Reject) | Aksi dibatalkan. |

- [x] Action Approval Card pada kolom `nunggu_owner` dengan tombol Setujui, Revisi, dan Tolak.
- [x] Integrasi feedback catatan revisi langsung diteruskan ke LLM Agent.

---

### 4.5 Penjadwalan Otomatis (Scheduled / Recurring Tasks) — P2

**Kondisi saat ini:** Tugas hanya berjalan saat ditekan manual atau disimulasikan secara acak.

**Automasi Waktu (Cron)** — pengguna dapat membuat jadwal tugas rutin. Contoh:

| Jadwal | Agen | Tugas |
|--------|------|-------|
| Setiap hari kerja, 08.30 | Analis | Merangkum berita tech/AI harian |
| Setiap hari, 13.00 | Media Sosial | Memeriksa tren topik terkini dan menyusun ide konten sore |
| Setiap Jumat, 16.00 | Semua agen terkait | Rapat evaluasi otomatis untuk rekap backlog mingguan |

- [x] Endpoint & Database `scheduled_tasks` (CRUD, Preset shortcuts, Next-run calculator, dan pulse executor).
- [x] Modal UI Jadwal Automasi dengan countdown run time.

---

### 4.6 Basis Pengetahuan Terpusat (Company Knowledge Base / RAG) — P2

**Kondisi saat ini:** Pengetahuan agen hanya terbatas pada `system_prompt` yang diisi manual.

**Unggah Dokumen Referensi Perusahaan:**

- [x] Area unggah dokumen berformat **PDF, Markdown, atau TXT**.
- [x] Contoh dokumen: Brand Voice & Guidelines, Katalog Produk, Dokumentasi API, SOP Perusahaan.
- [x] Agen otomatis merujuk dokumen tersebut dalam *context window* saat menulis konten maupun kode.

---

### 4.7 Pengawasan Biaya (Cost Calculator) — P3

**Kalkulator Biaya API Nyata (USD / IDR):**

- [x] Hitung perkiraan biaya API berdasarkan tarif per model (Gemini Flash vs Claude Sonnet vs GPT-4o).
- [x] Atur **budget alert** mingguan.

---

### 4.8 Imersi: Audio & Interaksi 3D — P3

**Audio Ambience Kantor (SFX Toggle)** — tombol suara di pojok layar:

- [x] Suara ketikan keyboard samar
- [x] Desis mesin kopi
- [x] Meong kucing saat diklik
- [x] Nada "ting" halus saat tugas selesai

**Interaktivitas Objek 3D:**

- [x] Klik **Kucing** → animasi mengeong / berguling gembira.
- [x] Klik **Layar TV Rapat** → mode presentasi layar penuh untuk melihat catatan rapat tim.

---

## 5. Urutan Pengerjaan yang Disarankan

1. **P1:** War Room → Kalender Konten & Post Previewer → Deliverables Viewer
2. **P2:** Approval Flow → Cron Scheduler → Knowledge Base (RAG)
3. **P3:** Cost Calculator → Audio & Interaktivitas 3D

## 6. Instruksi untuk Pelaksana

- Kerjakan **per prioritas** (P1 dulu); selesaikan dan uji satu fitur sebelum lanjut ke fitur berikutnya.
- Pertahankan arsitektur yang ada (Three.js, SSE streaming, integrasi LLM) dan hindari refactor besar yang tidak diperlukan.
- Untuk setiap fitur, laporkan: file yang diubah, perubahan skema data (jika ada), dan cara pengujian.