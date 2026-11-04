# Kantor Virtual HQ 🏢🤖
### 3D Isometric AI Agent Monitoring & Orchestration Dashboard

**Kantor Virtual HQ** adalah dashboard web interaktif berbasis 3D isometrik yang dirancang untuk memantau, mengorkestrasi, dan mengelola alur kerja multi-agent AI secara *real-time*. Menggabungkan simulasi kantor virtual dengan panel manajemen administratif untuk membuat, mengonfigurasi, dan menugaskan peran serta task ke AI Agent.

---

## 🚀 Fitur Utama Sesuai PRD

### 1. Dynamic Agent Management & Configuration Panel
* **Pembuatan Agent Baru (+ Modal Form):**
  * Nama Agent (misal: "Budi", "Siti", "Dimas", "Maya")
  * Role / Jabatan (Frontend Specialist, Backend Architect, QA Automation, AI Researcher, dsb.)
  * Departemen & Penempatan Stasiun Meja 3D (Preset stasiun atau kustom koordinat X / Z)
  * Pemilihan Model AI (`gemini-2.5-flash`, `gemini-2.5-pro`, `gpt-4o`, `claude-3-7-sonnet`, `deepseek-r1`)
  * Pengaturan Parameter: Slider *Temperature* (0.0 - 1.0) & *System Prompt*
  * Pengaturan Kemampuan Tools: *Web Search*, *File I/O*, *Code Analysis*, *Shell Execution*, *Database Query*, *RAG*
* **Agent Lifecycle Control:**
  * Toggle status operasional (*KERJA*, *IDLE*, *PAUSED*)
  * Update system prompt & konfigurasi model langsung dari UI
  * Hapus instance agent secara aman (cascade data dan unassign task)
  * Dynamic Avatar Spawning: workstation 3D dan avatar baru langsung muncul otomatis di canvas Three.js!

### 2. 3D Isometric Virtual Office (Three.js Orthographic)
* **Kamera Isometrik Nyata:** Menggunakan `THREE.OrthographicCamera` dengan sudut 45 derajat.
* **Elemen Lingkungan Kantor:**
  * Lantai ubin dengan aksen karpet per departemen
  * Dinding *cutaway* dengan jendela gedung perkantoran modern
  * Ruang *meeting* berdinding kaca transparan lengkap dengan meja konferensi, kursi, dan *whiteboard*
  * *Coffee corner & lounge* dengan mesin espresso, mug kopi, dispenser air galon, bangku bar, dan sofa santai
  * Rak server AI (*data hub*) dengan lampu LED berkedip secara prosedural
  * Tanaman hias pot monstera di sudut-sudut ruangan
* **Sistem Relokasi IDLE & Auto-Expansion Tempat Istirahat (Baru):**
  * Ketika status AI agent berubah menjadi **IDLE**, karakter avatar 3D secara otomatis **berdiri dan berjalan (dengan animasi kaki & tangan melangkah)** dari meja kerja menuju *Coffee & Chill Lounge*!
  * **Otomatis Menambahkan Tempat Baru:** Jika sofa/kursi lounge penuh, sistem 3D secara cerdas **memunculkan kursi santai / beanbag baru secara otomatis** dengan animasi *pop-in spring bounce* warna-warni!
  * Saat agen kembali aktif (**KERJA**), karakter avatar akan berjalan kembali ke mejanya, duduk di kursi kerja, layar laptop menyala, dan mulai mengetik lagi.
* **Interaktivitas & Kontrol:**
  * Rotasi 360 derajat (OrbitControls dengan batas sudut isometrik yang nyaman)
  * Zoom in & Zoom out halus
  * Tombol *Reset Kamera* ke sudut pandang standar
  * Toggle *Auto-Rotate* 360 derajat
  * Mode *Fullscreen* untuk monitoring layar penuh
  * *Raycasting & Hover Tooltip:* sorot meja mana pun untuk melihat nama agent, role, status lokasi (Di Meja / Di Lounge), dan tugas aktif
  * *Click-to-focus:* klik meja atau kartu agent untuk mengarahkan kamera 3D ke posisi agen (baik saat di meja maupun di lounge) dan menyalakan *spotlight*

### 3. Live Activity Feed (Sidebar Kiri)
* **Stream Log Real-time:** Menampilkan aksi (*action*), pemanggilan tool (*tool_call*), proses berpikir (*thought*), komunikasi antar-agent, dan event sistem.
* **Sistem Filter Cepat:** Tombol *pill* untuk melihat semua log atau mengisolasi log agent tertentu (Budi, Siti, Dimas, Maya).
* Tombol *Clear Logs* untuk membersihkan log stream.

### 4. Backlog & Task Management (Sidebar Kanan)
* **Kategori Kanban:**
  1. 🔴 **Deadline Dekat** (Peringatan urgensi tinggi)
  2. 🟡 **Nunggu Owner** (*Human-in-the-loop approval*)
  3. 🔵 **Ide / Nanti** (Backlog eksplorasi & rencana)
* **Interaktif:** Checkbox untuk menandai penyelesaian tugas (*completed* / *pending*), assignment linking ke agent, badge prioritas, dan tombol hapus tugas.
* Modal tambah tugas baru langsung dari dashboard.

### 5. Agent Status Cards (Grid Footer)
* **Metrik Komprehensif per Agent:**
  * Nama, Avatar warna unik, Departemen & Role
  * Badge Status: `KERJA` (dengan animasi denyut hijau), `IDLE` (amber), `PAUSED` (slate)
  * Cuplikan tugas aktif yang sedang dikerjakan
  * Jumlah Aksi (*Action Count*), Pengeluaran Token (*Token Usage*), dan Memori Konteks (*Context Window*)
  * Tombol *Fokus 3D*, *Kelola/Inspeksi*, dan *Play/Pause* status cepat

### 6. Real AI Integration & Multi-Provider Engine (Baru 🔥)
* **Dukungan Multi-Provider LLM Nyata:**
  * **Google Gemini (Direkomendasikan / Gratis):** `gemini-2.5-flash`, `gemini-2.5-pro`, `gemini-1.5-flash` via REST v1beta API.
  * **OpenAI:** `gpt-4o`, `gpt-4o-mini` via Chat Completions API.
  * **Groq (Ultra Cepat):** `llama-3.3-70b-versatile`, `deepseek-r1-distill-llama-70b`.
  * **OpenRouter:** `claude-3.7-sonnet`, `deepseek-r1`, `gpt-4o`.
  * **Ollama (Local / Self-Hosted):** `llama3`, `deepseek-r1`, `qwen2.5` di `http://localhost:11434` (100% gratis & tanpa API key).
* **Panel Pengaturan AI di Header:**
  * Pengaturan Provider, API Key (dengan masking & status tersimpan), pemilihan model, dan konfigurasi endpoint URL.
  * Fitur **Tes Koneksi AI Live** dengan indikator latensi milidetik dan uji responsivitas.
* **Eksekusi Tugas Nyata dengan AI ("AI Run"):**
  * Klik tombol **AI Run** pada tugas di Backlog: Agen otomatis masuk ke status `KERJA`, avatar duduk di meja kerja dan mengetik, lalu model LLM nyata mengeksekusi tugas.
  * Menghasilkan **[THOUGHT]** (analisis pemikiran mendalam), **[TOOL_CALL]** (perintah alat/sintaks kode), dan **[RESULT]** (solusi akhir tugas).
  * Pengeluaran token riil dari API langsung ditambahkan ke metrik `token_usage` agen secara aktual!
  * Tombol **Hasil AI** untuk meninjau kembali laporan kode & solusi tugas yang telah diselesaikan.
* **Konsol Instruksi Langsung (Direct AI Dispatch):**
  * Ketik instruksi apa pun ke agen tertentu langsung dari HUD 3D, agen akan merespons secara nyata sesuai kepribadian and perannya.

### 7. Real-Time Streaming & Live Simulation Engine
* **Server-Sent Events (SSE):** Endpoint `/api/stream.php` mengirim update perubahan status, token, dan log secara otomatis ke browser tanpa reload.
* **Simulator Real-Time:** Menjalankan aktivitas agen AI yang realistis (menghasilkan log tool call, sintaks bash, token delta, dan animasi mengetik 3D).

---

## 🛠️ Arsitektur & Teknologi

* **Frontend:**
  * HTML5 Semantic Layout
  * Tailwind CSS (Modern Dark Cyberpunk theme)
  * Three.js (r128) + OrbitControls (tersedia offline di `assets/vendor/`)
  * Font Awesome 6 Icons
  * Google Fonts (Inter & JetBrains Mono)
* **Backend:**
  * PHP 8.x REST API
  * PDO MySQL dengan auto-migration & auto-seeding
* **Database:**
  * MySQL (`kantor_virtual_hq`)
  * Tabel: `agents`, `agent_configs`, `tasks`, `agent_logs`

---

## 📂 Struktur File

```
d:/xampp/htdocs/multi-agents/
│
├── index.php                         # Dashboard Utama (Single Page App)
├── database.sql                      # SQL Dump Skema & Data Seed
├── product_requirements_document.md  # Spesifikasi PRD
├── README.md                         # Dokumentasi & Panduan
│
├── api/
│   ├── db.php                        # Koneksi PDO & Auto-Migration Skema
│   ├── agents.php                    # REST API CRUD Agents & Configs
│   ├── tasks.php                     # REST API CRUD Tasks & Categories
│   ├── logs.php                      # REST API Activity Logs & Filter
│   ├── simulate.php                  # Engine Generator Aktivitas Agen Real-Time
│   └── stream.php                    # Server-Sent Events (SSE) Real-Time Stream
│
└── assets/
    ├── css/
    │   └── style.css                 # Custom styling, animations, glow, glassmorphism
    ├── js/
    │   ├── office-3d.js              # Three.js 3D Virtual Office Engine
    │   └── app.js                    # Controller UI, SSE listener, CRUD handler
    └── vendor/
        ├── three.min.js              # Three.js r128 Library
        └── OrbitControls.js          # OrbitControls Plugin
```

---

## 🌐 Cara Menjalankan

1. Pastikan **Apache** dan **MySQL** aktif di XAMPP Control Panel.
2. Buka browser dan akses:
   ```
   http://localhost/multi-agents/
   ```
3. Database `kantor_virtual_hq` dan tabel-tabelnya akan otomatis dibuat dan di-seed saat pertama kali diakses, atau dapat diimpor manual via `database.sql`.

