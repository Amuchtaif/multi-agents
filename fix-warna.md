# Task: Fix Warna & Kontras Office3D (Palet Referensi)

**Target:** scene 3D office tidak silau, tidak gelap, dan punya kontras nyaman seperti gambar referensi (lantai kayu hangat, dinding krem, sofa biru-abu, aksen oranye, langit dan rumput di sekeliling).

**File yang diubah:** class `Office3D` (file JS office 3D) dan blok `PALETTE` di bagian atas file.

> Catatan versi: `THREE.OrbitControls` global menandakan three.js kemungkinan ≤ r147 (legacy lights). Jika ternyata r155+, kalikan semua intensitas cahaya di T4 dengan ≈ π.

---

## 1. Akar Masalah (hasil audit kode)

| #   | Temuan                                                                                                 | Dampak                                                                |
| --- | ------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------- |
| A   | `CanvasTexture` tidak diberi sRGB `colorSpace`/`encoding`                                              | Lantai, dekal, layar terlihat lebih terang dan pudar dari hex aslinya |
| B   | Fill (hemi 0.60 + ambient 0.55 = 1.15) lebih kuat dari key (directional 0.80)                          | Bayangan hilang, semua sisi objek sama terang                         |
| C   | Directional di (22, 36, 24): sisi +X dan +Z sama miring                                                | Dua sisi yang terlihat kamera bernilai sama, objek flat               |
| D   | `metalness` 0.5–0.9 tanpa `envMap`                                                                     | Material metalik hampir hitam (mesin espresso = "kubus hitam")        |
| E   | `FogExp2` berwarna `0xcbd5e1`, latar pucat, tanpa tanah                                                | Warna tertarik ke abu pucat, dinding menyatu dengan latar             |
| F   | ACES tone mapping dengan exposure 0.9                                                                  | Warna cenderung pastel dan terkompresi                                |
| G   | Beberapa warna hard-coded masih putih/pucat (beam, countertop, cooler, dll.)                           | Titik silau lokal                                                     |
| H   | `createCarpet()` ada tapi tidak pernah dipanggil; `setTheme` merujuk `carpetLeft/Right` yang tidak ada | Tidak ada pemisah warna antar zona                                    |

---

## 2. Urutan Pengerjaan

`T2 → T4 → T5 → T1 → T3 → T6 → T7 → T8 → T9 (QA)`

Setelah **T2 + T4** saja, perubahan biasanya sudah sangat terasa. Lakukan satu task, refresh, lalu lanjut.

---

## 3. Daftar Task

### 🔴 Prioritas Tinggi

#### - [x] T2: Tekstur sRGB (akar masalah A)

Di akhir `initProceduralTextures()`:

```js
Object.values(this.cachedTextures).forEach((t) => {
  if (THREE.SRGBColorSpace) t.colorSpace = THREE.SRGBColorSpace;
  else if (THREE.sRGBEncoding) t.encoding = THREE.sRGBEncoding;
  t.needsUpdate = true;
});
```

Di `createTextBadgeSprite`, setelah `new THREE.CanvasTexture(canvas)`:

```js
if (THREE.SRGBColorSpace) texture.colorSpace = THREE.SRGBColorSpace;
else if (THREE.sRGBEncoding) texture.encoding = THREE.sRGBEncoding;
```

**Selesai jika:** lantai dan dashboard layar terlihat lebih jenuh/gelap dari sebelumnya (ini memang diharapkan).

#### - [x] T4: Rasio cahaya, arah, dan tone mapping (akar masalah B, C, F)

1. Di `init()`, ganti blok `ACESFilmicToneMapping`:

```js
if (THREE.NoToneMapping !== undefined) {
  this.renderer.toneMapping = THREE.NoToneMapping;
}
```

2. Tambahkan method baru di class:

```js
applyLightingPreset() {
    const L = this.currentTheme === 'light';
    if (this.renderer) this.renderer.toneMappingExposure = 1.0;

    this.hemiLight.color.setHex(L ? 0xBFE0F2 : 0x38bdf8);
    this.hemiLight.groundColor.setHex(L ? 0x8A7A62 : 0x1e293b);
    this.hemiLight.intensity = L ? 0.38 : 0.45;

    this.ambientLight.color.setHex(L ? 0xFFF3DC : 0xc9ddee);
    this.ambientLight.intensity = L ? 0.10 : 0.40;

    this.dirLight.color.setHex(L ? 0xFFF1D6 : 0xffffff);
    this.dirLight.intensity = L ? 0.95 : 0.85;

    if (this.fillLight) this.fillLight.intensity = L ? 0.22 : 0.15;
    this.meetingLight.intensity = L ? 0.40 : 1.0;
    this.coffeeLight.intensity  = L ? 0.45 : 1.1;
}
```

3. Di `setupLighting()`:

```js
this.dirLight.position.set(-14, 30, 20); // kiri-atas

this.fillLight = new THREE.DirectionalLight(0xcfe6f5, 0.22);
this.fillLight.position.set(18, 8, 6); // tanpa shadow
this.scene.add(this.fillLight);

this.applyLightingPreset(); // taruh di baris terakhir setupLighting
```

4. Di `setTheme()`, hapus blok manual `renderer.toneMappingExposure`, `hemiLight`, `ambientLight`, `dirLight` dan ganti dengan satu panggilan `this.applyLightingPreset();`.

**Selesai jika:** setiap kotak punya tiga nilai terang (atas > kiri > kanan), dan bayangan lembut terbaca di lantai.

#### - [x] T5: Langit, tanah, hapus fog (akar masalah E)

Ganti `applyThemeColors()`:

```js
applyThemeColors() {
    const isLight = this.currentTheme === 'light';
    this.scene.background = new THREE.Color(isLight ? PALETTE.skyTop : PALETTE.skyDark);
    this.scene.fog = null;
}
```

Tambahkan method `buildGround()` dan panggil di baris pertama `buildOfficeEnvironment()` (setelah `this.scene.add(this.officeGroup)`):

```js
buildGround() {
    const isLight = this.currentTheme === 'light';
    this.grassMat = new THREE.MeshStandardMaterial({
        color: isLight ? PALETTE.grass : PALETTE.grassDark, roughness: 1
    });
    const grass = new THREE.Mesh(new THREE.PlaneGeometry(220, 220), this.grassMat);
    grass.rotation.x = -Math.PI / 2;
    grass.position.y = -0.55;
    grass.receiveShadow = true;
    this.officeGroup.add(grass);

    const walk = new THREE.Mesh(
        new THREE.BoxGeometry(28, 0.14, 28),
        new THREE.MeshStandardMaterial({ color: PALETTE.walkway, roughness: 0.9 })
    );
    walk.position.y = -0.48;
    walk.receiveShadow = true;
    this.officeGroup.add(walk);
}
```

Di `setTheme()`:

```js
if (this.grassMat)
  this.grassMat.color.setHex(isLight ? PALETTE.grass : PALETTE.grassDark);
```

**Selesai jika:** office dikelilingi trotoar krem dan rumput hijau, latar langit biru muda, tanpa kabut.

#### - [x] T1: Ganti blok `PALETTE` dengan palet referensi

```js
const PALETTE = {
  // Lingkungan
  skyTop: 0xbfe0f2,
  skyDark: 0x1e2633,
  grass: 0x6fae45,
  grassDark: 0x1f3a2a,
  walkway: 0xcfc4ae,
  // Struktur
  floor: 0xc48d58,
  floorDark: 0x2b3140,
  wall: 0xe6ddc9,
  wallDark: 0x3c4760,
  trim: 0xcfc4ae,
  trimDark: 0x4f5d7e,
  glass: 0x8fc3d8,
  glassDark: 0x2a3e5c,
  frame: 0x3a4048,
  // Objek
  rack: 0x3b4860,
  dark: 0x2a2d33,
  screen: 0x2b4c7e,
  plant: 0x3f8f3c,
  pot: 0xd9cbb0,
  lamp: 0x7fbf99,
  wood: 0xd9c6a5,
  sofa: [0xf1eadc, 0x4c6489], // [0] krem, [1] biru-abu
  accentChair: 0xe07b3a, // oranye
  sage: 0x9ebfa8,
  rugLounge: 0x6e93ab,
  rugMeeting: 0x8c3a33,
  accent: { teal: 0x3fa796, amber: 0xe0a84b, coral: 0xe07a5f },
};
```

**Selesai jika:** `window.PALETTE` berisi key baru dan tidak ada error `undefined` di console.

### 🟠 Prioritas Menengah

#### - [x] T3: Lantai kayu dan teks dekal

Ganti cabang `if (isLight) { ... }` di `generateFloorCanvasTexture`:

```js
if (isLight) {
  ctx.fillStyle = "#8F5F33"; // celah antar papan
  ctx.fillRect(0, 0, 1024, 1024);
  const tones = ["#C48D58", "#B87F48", "#CF9A63", "#BE8650"];
  const plankW = 256,
    plankH = 64;
  for (let r = 0; r < 16; r++) {
    const off = (r * 97) % plankW; // susunan papan tidak beraturan
    for (let c = -1; c <= 4; c++) {
      const px = c * plankW - off,
        py = r * plankH;
      ctx.fillStyle = tones[Math.abs(c * 7 + r * 13) % 4];
      ctx.fillRect(px + 1.5, py + 1.5, plankW - 3, plankH - 3);

      ctx.strokeStyle = "rgba(90, 55, 25, 0.22)"; // serat kayu
      ctx.lineWidth = 1;
      for (let g = 0; g < 3; g++) {
        const gy = py + (g + 1) * (plankH / 4);
        ctx.beginPath();
        ctx.moveTo(px + 6, gy);
        ctx.lineTo(px + plankW - 6, gy);
        ctx.stroke();
      }
      ctx.strokeStyle = "rgba(255, 235, 200, 0.18)"; // highlight tepi atas
      ctx.beginPath();
      ctx.moveTo(px + 2, py + 2);
      ctx.lineTo(px + plankW - 2, py + 2);
      ctx.stroke();
    }
  }
}
```

Di `generateFloorDecalTexture`:

```js
ctx.fillStyle =
  this.currentTheme === "light"
    ? "rgba(58, 42, 28, 0.9)"
    : "rgba(148, 163, 184, 0.85)";
```

Di `buildFloorDecals`, ubah `opacity: isLight ? 0.82 : 0.9` menjadi `0.95` (dua tempat).

**Selesai jika:** teks LEADERSHIP dan MARKETING & BUSINESS terbaca jelas, kontras ≥ 4.5:1 (cek dengan `contrastRatio`).

#### - [x] T6: Aktifkan karpet per zona (akar masalah H)

Di `buildOfficeEnvironment()`, setelah `this.buildLoungeDecor()`:

```js
this.carpetLounge = this.createCarpet(3.8, 7.2, 6.4, 4.4, PALETTE.rugLounge, 1);
this.carpetMeeting = this.createCarpet(
  -7.5,
  -8.75,
  7.2,
  4.8,
  PALETTE.rugMeeting,
  1,
);
```

Di `setTheme()`, hapus tiga blok `carpetLeft` / `carpetRight` / `carpetLounge` yang lama, ganti dengan:

```js
if (this.carpetLounge)
  this.carpetLounge.material.color.setHex(
    isLight ? PALETTE.rugLounge : 0x1e3a5a,
  );
if (this.carpetMeeting)
  this.carpetMeeting.material.color.setHex(
    isLight ? PALETTE.rugMeeting : 0x4a1f1c,
  );
```

**Selesai jika:** area lounge berkarpet teal-biru dan ruang rapat berkarpet merah bata.

#### - [x] T7: Redam metalness (akar masalah D)

Tambahkan method:

```js
tameMetalness(root, max = 0.15) {
    root.traverse(o => {
        if (o.isMesh && o.material && o.material.metalness > max) o.material.metalness = max;
    });
}
```

Panggil:

- di akhir `buildOfficeEnvironment()`: `this.tameMetalness(this.officeGroup);`
- di `createAgentWorkstation`, sebelum `this.officeGroup.add(deskGroup)` dan `this.officeGroup.add(avatarGroup)`: `this.tameMetalness(deskGroup);` dan `this.tameMetalness(avatarGroup);`

**Selesai jika:** mesin espresso, rack server, dan kaki meja tidak lagi hitam pekat.

#### - [x] T8: Rapikan warna hard-coded (akar masalah G)

| Lokasi                                                     | Lama                   | Baru                  |
| ---------------------------------------------------------- | ---------------------- | --------------------- |
| `buildOverheadBeamsAndPendants` → `beamMat`                | `0xeef1f4`             | `PALETTE.trim`        |
| `winFrameMat` (di `buildOfficeEnvironment` dan `setTheme`) | `0x8c98a8`             | `PALETTE.frame`       |
| `buildCoffeeCornerInfrastructure` → countertop             | `0xf8fafc`             | `0xE6E4DF`            |
| Water cooler `coolerBody`                                  | `0xe2e8f0`             | `0xC9CDD2`            |
| Espresso machine                                           | `0x1e293b`             | `PALETTE.dark`        |
| Rolling whiteboard `frameMat`                              | `0x8c98a8`             | `0x5C6B80`            |
| `initRestSpots` → `armchairColor1`                         | `PALETTE.plant`        | `PALETTE.accentChair` |
| `initRestSpots` → `armchairColor2`                         | `PALETTE.accent.coral` | `PALETTE.sage`        |
| Avatar `whiteMat` dan `idBadge`                            | `0xffffff`             | `0xEDE8DC`            |

**Selesai jika:** tidak ada material dengan hex `0xffffff` / `0xf8fafc` / `0xeef1f4` tersisa di scene (selain tekstur kertas).

### 🟡 Penyempurnaan

#### - [x] T9: Perbaiki `relLuminance` dan jalankan audit

Bug: untuk input `THREE.Color`, nilai `r,g,b` sudah linear tetapi dikonversi `toLinear` lagi, sehingga luminance terhitung terlalu rendah. Ganti cabang objek:

```js
if (colorInput && typeof colorInput === "object" && "r" in colorInput) {
  return relLuminance(colorInput.getHex()); // getHex() mengembalikan sRGB
}
```

Lalu jalankan di console: `office.auditMaterials()`.

**Selesai jika:** daftar `flagged` kosong atau hanya berisi objek kecil yang disengaja (layar, LED).

#### - [x] T10 (opsional): Pohon low-poly dan tiang lampu jalan

Gunakan `InstancedMesh` + `IcosahedronGeometry` dengan `flatShading: true` untuk pohon di sekeliling trotoar, agar suasana menyerupai referensi tanpa membebani render.

#### - [x] T11 (opsional): Selaraskan UI dengan scene

Gunakan `#4C6489` (biru-abu sofa) sebagai warna aksen tombol dan badge UI agar dashboard dan scene satu keluarga.

---

## 4. Checklist QA Akhir

- [x] Tidak ada kabut/haze: objek jauh dan dekat sama jenuh.
- [x] Lantai kayu hangat tampak jelas dan menjadi "jangkar" visual.
- [x] Furnitur terang (sofa krem, meja gading) terpisah jelas dari lantai.
- [x] Setiap kotak/objek punya 3 nilai sisi (atas, kiri, kanan) dan ada bayangan lembut.
- [x] Tidak ada objek hitam pekat; objek tergelap ≈ `#2A2D33`.
- [x] Jendela terbaca sebagai kaca biru, bukan lubang putih.
- [x] Teks lantai terbaca di zoom default (kontras ≥ 4.5:1).
- [x] Mode gelap (`setTheme('dark')`) tetap nyaman dan tidak error.
- [x] Tidak ada error di console; FPS tetap stabil.
- [x] Diuji di layar dengan brightness tinggi dan rendah.

## 5. Tuning Jika Hasil Belum Pas

| Gejala                      | Penyesuaian                                                              |
| --------------------------- | ------------------------------------------------------------------------ |
| Terlalu gelap               | `dirLight.intensity` 0.95 → 1.05, atau `hemiLight.intensity` 0.38 → 0.48 |
| Masih terlalu terang/silau  | `dirLight.intensity` 0.95 → 0.85                                         |
| Lantai terlalu berat/oranye | Turunkan saturasi: `#C48D58` → `#BE8C58`, `#B87F48` → `#B58452`          |
| Bentuk masih kurang terbaca | Naikkan `fillLight` ke 0.3 dan turunkan `hemiLight` ke 0.3               |
| Bayangan terlalu keras      | `dirLight.shadow.radius` 2.2 → 4                                         |
