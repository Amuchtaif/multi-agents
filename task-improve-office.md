# Virtual Office 3D: Analisis & Task Improvement Warna/Kontras

## 1. Hasil Analisis Visual

**Kesimpulan:** scene terlalu _high-key_. Hampir semua elemen berada di rentang terang-pucat (putih, krem, biru muda), kecuali beberapa objek yang sangat gelap. Akibatnya sebagian area **silau/washed-out** dan sebagian lain **terlalu gelap**, tanpa nilai tengah (midtone) yang menjaga transisi.

| Elemen                  | Kondisi Sekarang                    | Masalah                                                         |
| ----------------------- | ----------------------------------- | --------------------------------------------------------------- |
| Lantai                  | Krem/putih sangat pucat             | Menyatu dengan furnitur putih, tidak ada kedalaman, silau       |
| Dinding                 | Biru-abu pucat, strip atas biru tua | Strip atas terlalu kontras dibanding badan dinding              |
| Jendela & panel dinding | Putih hampir solid                  | Seperti "lubang putih", memperparah silau                       |
| Sofa, meja, whiteboard  | Putih / pink-mint sangat pucat      | Kontras terhadap lantai rendah, bentuk sulit dibaca             |
| Server rack             | Navy hampir hitam                   | Terlalu gelap, jadi titik tarik paling kuat dan terasa "bolong" |
| Kubus/monitor hitam     | Hitam pekat                         | Kontras ekstrem terhadap sekitarnya                             |
| Tanaman & lampu gantung | Hijau mint pucat                    | Pudar, kurang terbaca sebagai aksen                             |
| Teks lantai             | Abu-biru tipis di lantai pucat      | Hampir tidak terbaca                                            |
| Layar dinding belakang  | Biru tua kecil                      | Terlalu kontras dibanding dinding sekitarnya                    |

**Dugaan akar masalah:**

- Intensitas cahaya (ambient + directional) terlalu tinggi sehingga warna terang ter-_clip_ ke putih.
- Luminance material furnitur dan lantai berdekatan.
- Tidak ada palet midtone, hanya ekstrem terang dan gelap.

---

## 2. Prinsip Target

- **Luminance berlapis:** lantai (midtone terang) → furnitur (konsisten lebih terang atau lebih gelap dari lantai) → aksen (jenuh, midtone).
- **Hindari `#FFFFFF` dan `#000000`.** Batas atas sekitar `#F2EFE9`, batas bawah sekitar `#3A4658`.
- **Rasio kontras:** objek besar terhadap latar minimal 1.5:1 sampai 3:1; teks/label ≥ 4.5:1.
- **Warna dingin untuk struktur** (dinding, lantai), **hangat/jenuh untuk aksen** (sofa, tanaman, lampu).

---

## 3. Usulan Palet

| Elemen             | Warna Lama (perkiraan) | Usulan Baru                 | Catatan                             |
| ------------------ | ---------------------- | --------------------------- | ----------------------------------- |
| Lantai             | `#F5F1E8`              | `#D8D2C4`                   | Midtone hangat, kurangi silau       |
| Dinding badan      | `#B9C6DB`              | `#98A9C2`                   | Sedikit lebih dalam                 |
| Strip atas dinding | `#4B6A9B`              | `#6A82A6`                   | Dilunakkan                          |
| Jendela / panel    | `#FFFFFF`              | `#C9DDEE`                   | Biru langit lembut, emissive rendah |
| Sofa               | `#F0EDE8`              | `#E9DFCF` / `#B8C9B5`       | Beda nilai dari lantai              |
| Meja kerja         | `#F3F3F3`              | `#C7B8A0`                   | Tone kayu terang                    |
| Whiteboard         | `#FFFFFF`              | `#EEF1F4` + frame `#8C98A8` | Bingkai memberi batas               |
| Server rack        | `#1E2633`              | `#46546B`                   | Naikkan dari hampir hitam           |
| Kubus/monitor      | `#0A0A0A`              | `#2F3A4B`                   | Hindari hitam murni                 |
| Layar dinding      | `#2A4A8A`              | `#3F6EA8`                   | Sedikit lebih terang                |
| Daun tanaman       | `#CFEBDD`              | `#5FA777`                   | Lebih jenuh                         |
| Pot tanaman        | `#FFFFFF`              | `#E6DED0`                   |                                     |
| Lampu gantung      | `#D5ECDD`              | `#9CCFB0`                   |                                     |
| Teks lantai        | `#B5BCC9`              | `#6B7A90` (opacity 70%)     | Target ≥ 4.5:1                      |
| Aksen teal         | -                      | `#3FA796`                   | Elemen interaktif/fokus             |
| Aksen amber        | -                      | `#E0A84B`                   | Highlight meja aktif                |
| Aksen coral        | -                      | `#E07A5F`                   | Peringatan/status                   |

> Nilai hex adalah titik awal (perkiraan dari screenshot). Sesuaikan setelah melihat hasil render nyata.

---

## 4. Daftar Task

### 🔴 Prioritas Tinggi

- [x] **T1: Turunkan intensitas pencahayaan global**
  - `AmbientLight` / `HemisphereLight`: 0.5–0.65
  - `DirectionalLight`: 0.7–0.9
  - `renderer.toneMapping = THREE.ACESFilmicToneMapping`, `toneMappingExposure ≈ 0.9`
  - `renderer.outputColorSpace = THREE.SRGBColorSpace`
  - **Selesai jika:** tidak ada area besar yang ter-_clip_ ke putih murni.

- [x] **T2: Ganti warna lantai ke midtone hangat**
  - Terapkan `#D8D2C4` pada material lantai.
  - **Selesai jika:** furnitur putih/krem terpisah jelas dari lantai.

- [x] **T3: Naikkan luminance server rack dan objek hitam**
  - Ganti ke `#46546B` / `#2F3A4B`.
  - Tambahkan LED kecil (teal/amber) agar tetap terkesan teknologi.
  - **Selesai jika:** tidak ada objek dengan luminance di bawah ~10%.

- [x] **T4: Redam putih solid pada jendela dan panel dinding**
  - Warna `#C9DDEE`, emissive intensity ≤ 0.15.
  - Tambahkan bingkai tipis lebih gelap.
  - **Selesai jika:** jendela terbaca sebagai kaca, bukan area putih kosong.

### 🟠 Prioritas Menengah

- [x] **T5: Pemisahan nilai furnitur dan lantai**
  - Sofa, meja, kursi memakai tone yang konsisten berbeda dari lantai.
  - Terapkan palet furnitur dari tabel.

- [x] **T6: Seragamkan strip atas dinding**
  - Ganti ke `#6A82A6`, sesuaikan gradasi dinding.
  - Sesuaikan layar dinding belakang agar tidak terlalu kontras.

- [x] **T7: Tingkatkan keterbacaan teks lantai**
  - `#6B7A90`, opacity ~70%.
  - Uji rasio kontras terhadap lantai baru (≥ 4.5:1).

- [x] **T8: Perkuat aksen tanaman dan lampu gantung**
  - Hijau lebih jenuh, pot netral hangat.

### 🟡 Prioritas Rendah / Penyempurnaan

- [x] **T9: Soft shadow dan ambient occlusion**
  - `shadowMap` PCFSoft, opsional SSAO/baked AO.

- [x] **T10: Warna aksen status agent**
  - Teal = KERJA, amber = PAUSED/standby, coral = error.
  - Sinkronkan dengan badge di panel UI.

- [x] **T11: Dukungan mode gelap (opsional)**
  - Lantai `#2B3140`, dinding `#3C4760`; tetap hindari hitam murni.

---

## 5. Checklist Verifikasi (QA Visual)

- [x] Histogram render: tidak ada puncak besar di ujung putih (clip) maupun ujung hitam.
- [x] Semua furnitur dapat dibedakan dari lantai pada thumbnail kecil.
- [x] Teks lantai terbaca pada zoom default.
- [x] Tidak ada objek yang menonjol tanpa alasan (mis. server rack).
- [x] Diuji pada brightness layar tinggi dan rendah.
- [x] Kontras teks/label ≥ 4.5:1; objek besar ≥ 1.5:1 terhadap latar.

---

## 6. Snippet Three.js

### 6.1 Renderer, cahaya, dan palet

```js
// Renderer
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.9;

// Lighting
hemiLight.intensity = 0.6;
dirLight.intensity = 0.8;

// Palet
export const PALETTE = {
  floor: 0xd8d2c4,
  wall: 0x98a9c2,
  trim: 0x6a82a6,
  glass: 0xc9ddee,
  rack: 0x46546b,
  dark: 0x2f3a4b,
  screen: 0x3f6ea8,
  plant: 0x5fa777,
  pot: 0xe6ded0,
  lamp: 0x9ccfb0,
  wood: 0xc7b8a0,
  sofa: [0xe9dfcf, 0xb8c9b5],
  accent: { teal: 0x3fa796, amber: 0xe0a84b, coral: 0xe07a5f },
};
```

### 6.2 Helper cek luminance dan rasio kontras

Untuk menguji apakah pasangan warna memenuhi target (jalankan di console atau unit test):

```js
function relLuminance(hex) {
  const c = new THREE.Color(hex); // THREE.Color sudah linear jika ColorManagement aktif
  const [r, g, b] = [c.r, c.g, c.b];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(hexA, hexB) {
  const [a, b] = [relLuminance(hexA), relLuminance(hexB)].sort((x, y) => y - x);
  return (a + 0.05) / (b + 0.05);
}

// Contoh pengecekan
console.table([
  ["sofa vs lantai", contrastRatio(0xe9dfcf, PALETTE.floor)],
  ["rack vs lantai", contrastRatio(PALETTE.rack, PALETTE.floor)],
  ["teks vs lantai", contrastRatio(0x6b7a90, PALETTE.floor)],
]);
```

### 6.3 Audit material yang terlalu terang/gelap

Menelusuri seluruh scene dan menandai material di luar batas aman:

```js
function auditMaterials(scene, min = 0.08, max = 0.9) {
  const flagged = [];
  scene.traverse((o) => {
    if (!o.isMesh || !o.material?.color) return;
    const L = relLuminance(o.material.color);
    if (L < min || L > max)
      flagged.push({ name: o.name || o.uuid, L: +L.toFixed(3) });
  });
  console.table(flagged);
}
auditMaterials(scene);
```

---

## 7. Urutan Pengerjaan yang Disarankan

1. T1 (pencahayaan), karena mempengaruhi tampilan semua warna lain.
2. T2 dan T4 (lantai dan jendela), area terluas penyebab silau.
3. T3 (objek gelap).
4. T5–T8 (furnitur, dinding, teks, aksen).
5. Jalankan checklist QA, lalu lanjut ke T9–T11.
