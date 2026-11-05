# Task Revisi v2: Office3D (Bersih, Jendela/TV 3D, Karakter Lebih Natural)

Lanjutan dari `task-fix-office-3d-contrast.md`. Task di file ini **tidak bergantung** pada task kontras, tetapi R7 (setTheme) sebaiknya dikerjakan setelah semua task lain.

## Ringkasan Permintaan

| #   | Permintaan                                                             | Task |
| --- | ---------------------------------------------------------------------- | ---- |
| 1   | Hapus label **LEADERSHIP** dan **MARKETING & BUSINESS** di lantai      | R1   |
| 2   | Hapus lampu di atas (pendant, ring chandelier, lampu ring ruang rapat) | R2   |
| 3   | Jendela lebih 3D                                                       | R3   |
| 4   | Ornamen TV lebih 3D                                                    | R4   |
| 5   | Karakter agent lebih 3D, tidak seperti Roblox                          | R5   |

## Urutan Pengerjaan

`R1 → R2 → R3 → R4 → R5 → R6 → R7 → QA`

---

## 🔴 R1: Hapus label lantai

- [x] Di `buildOfficeEnvironment()`, **hapus** baris:

```js
this.buildFloorDecals();
```

- [x] (Opsional, hemat memori) Di `initProceduralTextures()`, hapus tiga baris:

```js
this.cachedTextures.decalLeadership =
  this.generateFloorDecalTexture("LEADERSHIP");
this.cachedTextures.decalMarketing = this.generateFloorDecalTexture(
  "MARKETING & BUSINESS",
);
this.cachedTextures.decalLounge = this.generateFloorDecalTexture("LOUNGE");
```

- [x] (Opsional) Hapus method `buildFloorDecals()` dan `generateFloorDecalTexture()`.

**Selesai jika:** lantai bersih tanpa tulisan.

---

## 🔴 R2: Hapus lampu di atas

Ada tiga sumber lampu gantung. Hapus semuanya, beam struktur tetap dipertahankan (hapus panggilannya kalau beam juga ingin dibuang).

- [x] **Pendant dome + LED strip + downlight.** Ganti method `buildOverheadBeamsAndPendants()` dengan versi beam saja:

```js
buildOverheadBeams() {
    const isLight = this.currentTheme === 'light';
    const beamMat = new THREE.MeshStandardMaterial({
        color: isLight ? PALETTE.trim : 0x334155,
        roughness: 0.5
    });
    [-3.8, 3.8].forEach(bz => {
        const beam = new THREE.Mesh(new THREE.BoxGeometry(24.4, 0.24, 0.24), beamMat);
        beam.position.set(0, 4.1, bz);
        beam.castShadow = false;      // hindari garis bayangan di lantai
        this.officeGroup.add(beam);
    });
}
```

Lalu di `buildOfficeEnvironment()` ganti `this.buildOverheadBeamsAndPendants();` menjadi `this.buildOverheadBeams();` (atau hapus barisnya untuk membuang beam juga).

- [x] **Ring chandelier lounge.** Di `buildLoungeDecor()`, hapus seluruh blok yang diawali komentar `// 2. Modern Overhead Warm Ring Chandelier` sampai akhir loop `Chandelier suspension wires` (variabel `ringChandelier` dan loop `wire`).

- [x] **Lampu ring ruang rapat.** Di `buildMeetingRoom()`, hapus blok `// Hanging conference lamp` (variabel `lamp`).

- [x] **Kompensasi cahaya.** Pendant downlight (8 × 0.35) ikut hilang, jadi scene bisa sedikit lebih redup. Naikkan `hemiLight.intensity` sekitar +0.07 (mis. 0.38 → 0.45 pada `applyLightingPreset()`). `meetingLight` dan `coffeeLight` boleh tetap sebagai sumber cahaya tersembunyi.

**Selesai jika:** tidak ada objek menggantung di atas area kerja, lounge, dan ruang rapat.

---

## 🟠 R3: Jendela 3D

Masalah sekarang: jendela hanya kotak tipis dengan plane kaca datar di dinding solid, sehingga terbaca sebagai stiker. Solusi: bingkai bertingkat (casing, jamb, sash, mullion), ambang jendela (sill), kaca dengan pantulan, dan **pemandangan luar** (langit, awan, bukit, pohon) di balik kaca.

- [x] **R3a. Tekstur pemandangan.** Tambahkan method:

```js
generateWindowViewTexture() {
    const c = document.createElement('canvas');
    c.width = 512; c.height = 300;
    const g = c.getContext('2d');

    const sky = g.createLinearGradient(0, 0, 0, 300);
    sky.addColorStop(0, '#8EC5E6');
    sky.addColorStop(0.65, '#CFE8F5');
    sky.addColorStop(1, '#E8F4FA');
    g.fillStyle = sky;
    g.fillRect(0, 0, 512, 300);

    g.fillStyle = 'rgba(255,255,255,0.85)';          // awan
    [[90, 70, 46], [140, 62, 36], [360, 100, 40], [410, 92, 30]].forEach(([x, y, r]) => {
        g.beginPath(); g.ellipse(x, y, r * 1.5, r * 0.5, 0, 0, Math.PI * 2); g.fill();
    });

    g.fillStyle = '#8CC26B';                          // bukit belakang
    g.beginPath(); g.moveTo(0, 230);
    g.quadraticCurveTo(130, 190, 260, 225);
    g.quadraticCurveTo(390, 255, 512, 210);
    g.lineTo(512, 300); g.lineTo(0, 300); g.fill();

    g.fillStyle = '#5FA24A';                          // bukit depan
    g.beginPath(); g.moveTo(0, 262);
    g.quadraticCurveTo(160, 235, 300, 265);
    g.quadraticCurveTo(420, 285, 512, 255);
    g.lineTo(512, 300); g.lineTo(0, 300); g.fill();

    [[70, 238, 22], [430, 236, 26], [250, 248, 16]].forEach(([x, y, r]) => {   // pohon
        g.fillStyle = '#6B4A2B'; g.fillRect(x - 3, y - 4, 6, 14);
        g.fillStyle = '#3F8F3C'; g.beginPath(); g.arc(x, y - r, r, 0, Math.PI * 2); g.fill();
    });

    const t = new THREE.CanvasTexture(c);
    t.minFilter = THREE.LinearFilter;
    return t;
}
```

Daftarkan di `initProceduralTextures()` (**sebelum** loop sRGB):

```js
this.cachedTextures.windowView = this.generateWindowViewTexture();
```

- [x] **R3b. Builder jendela 3D.** Tambahkan method (origin grup = permukaan dalam dinding, sumbu +Z menghadap ke dalam ruangan):

```js
buildWindow3D(W = 4.2, H = 2.3) {
    const isLight = this.currentTheme === 'light';
    const g = new THREE.Group();

    if (!this.winFrameMat)  this.winFrameMat  = new THREE.MeshStandardMaterial({ color: isLight ? PALETTE.frame : 0x475569, roughness: 0.45 });
    if (!this.winCasingMat) this.winCasingMat = new THREE.MeshStandardMaterial({ color: isLight ? 0xF1EADC : 0x5B6478, roughness: 0.6 });
    if (!this.winJambMat)   this.winJambMat   = new THREE.MeshStandardMaterial({ color: isLight ? 0xCBBFA6 : 0x3C4760, roughness: 0.8 });
    if (!this.winViewMats)  this.winViewMats  = [];

    const box = (w, h, d, x, y, z, mat) => {
        const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
        m.position.set(x, y, z);
        m.castShadow = true;
        m.receiveShadow = true;
        g.add(m);
        return m;
    };

    // 1. Casing (trim luar, menonjol dari dinding)
    const t = 0.14;
    box(W + 2 * t, t, 0.07, 0,  H / 2 + t / 2, 0.035, this.winCasingMat);
    box(W + 2 * t, t, 0.07, 0, -H / 2 - t / 2, 0.035, this.winCasingMat);
    box(t, H, 0.07, -(W / 2 + t / 2), 0, 0.035, this.winCasingMat);
    box(t, H, 0.07,  (W / 2 + t / 2), 0, 0.035, this.winCasingMat);

    // 2. Sill (ambang jendela di bawah)
    box(W + 0.6, 0.06, 0.32, 0, -H / 2 - t - 0.03, 0.16, this.winCasingMat);

    // 3. Jamb (sisi dalam bukaan, memberi kesan kedalaman)
    box(W, 0.05, 0.10, 0,  H / 2 - 0.025, 0.05, this.winJambMat);
    box(W, 0.05, 0.10, 0, -H / 2 + 0.025, 0.05, this.winJambMat);
    box(0.05, H, 0.10, -W / 2 + 0.025, 0, 0.05, this.winJambMat);
    box(0.05, H, 0.10,  W / 2 - 0.025, 0, 0.05, this.winJambMat);

    // 4. Pemandangan luar (di dasar bukaan)
    const viewMat = new THREE.MeshBasicMaterial({
        map: this.cachedTextures.windowView,
        color: isLight ? 0xFFFFFF : 0x5A6A85
    });
    this.winViewMats.push(viewMat);
    const view = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.05, H - 0.05), viewMat);
    view.position.z = 0.008;
    g.add(view);

    // 5. Sash frame + mullion (rangka kaca)
    const sw = W - 0.1, sh = H - 0.1, bar = 0.06;
    box(sw, bar, 0.05, 0,  sh / 2 - bar / 2, 0.10, this.winFrameMat);
    box(sw, bar, 0.05, 0, -sh / 2 + bar / 2, 0.10, this.winFrameMat);
    box(bar, sh, 0.05, -sw / 2 + bar / 2, 0, 0.10, this.winFrameMat);
    box(bar, sh, 0.05,  sw / 2 - bar / 2, 0, 0.10, this.winFrameMat);
    box(0.05, sh, 0.045, 0, 0, 0.10, this.winFrameMat);          // mullion vertikal
    box(sw, 0.045, 0.045, 0, 0.12, 0.10, this.winFrameMat);      // mullion horizontal

    // 6. Kaca tipis + pantulan diagonal
    const glass = new THREE.Mesh(
        new THREE.PlaneGeometry(sw, sh),
        new THREE.MeshStandardMaterial({
            color: 0xBFE0F2, transparent: true, opacity: 0.14,
            roughness: 0.05, metalness: 0, depthWrite: false
        })
    );
    glass.position.z = 0.085;
    g.add(glass);

    const glareMat = new THREE.MeshBasicMaterial({
        color: 0xFFFFFF, transparent: true, opacity: 0.12, depthWrite: false
    });
    [[-1.5, -1.1, 0.0, -0.4], [-0.8, -0.65, 0.45, 0.3]].forEach(([a, b, c, d]) => {
        const s = new THREE.Shape();
        s.moveTo(a, -1.0); s.lineTo(b, -1.0); s.lineTo(c, 1.0); s.lineTo(d, 1.0); s.closePath();
        const glare = new THREE.Mesh(new THREE.ShapeGeometry(s), glareMat);
        glare.position.z = 0.087;
        g.add(glare);
    });

    return g;
}
```

- [x] **R3c. Ganti pembuatan jendela lama.** Di `buildOfficeEnvironment()`, hapus semua kode dari `// Realistic Office Windows - Back Wall` sampai akhir loop `leftWinPositions.forEach(...)` (termasuk `winFrameMat` dan `glassPaneMat` lama), lalu ganti dengan:

```js
// Jendela dinding belakang (digeser agar tidak tertimpa TV ruang rapat dan rack server)
[-1.5, 3.5].forEach((wx) => {
  const w = this.buildWindow3D(4.2, 2.3);
  w.position.set(wx, 2.5, -roomDepth / 2 + wallThickness / 2);
  this.officeGroup.add(w);
});

// Jendela dinding kiri
[0, 6].forEach((wz) => {
  const w = this.buildWindow3D(4.2, 2.3);
  w.rotation.y = Math.PI / 2;
  w.position.set(-roomWidth / 2 + wallThickness / 2, 2.5, wz);
  this.officeGroup.add(w);
});
```

**Selesai jika:** jendela terlihat bertingkat (casing, sill, rangka kaca silang), ada langit, awan, bukit, dan pohon di baliknya, serta pantulan diagonal tipis di kaca.

---

## 🟠 R4: Ornamen TV 3D

Masalah sekarang: TV adalah satu `BoxGeometry` tipis yang **melayang 0,6 unit dari dinding** tanpa dudukan. Solusi: bodi tebal + bezel, panel belakang, lengan dan plat dinding, LED status, pantulan layar, dan credenza di bawahnya.

- [x] **R4a. Builder TV.** Tambahkan method (origin = pusat TV, plat dinding berada di z = −0.19):

```js
buildWallTV(w = 3.6, h = 1.8) {
    const isLight = this.currentTheme === 'light';
    const g = new THREE.Group();

    const bodyMat  = new THREE.MeshStandardMaterial({ color: 0x23272E, roughness: 0.35, metalness: 0.1 });
    const backMat  = new THREE.MeshStandardMaterial({ color: 0x2F3640, roughness: 0.5 });
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x5C6B80, roughness: 0.4, metalness: 0.15 });

    const add = (geo, mat, x, y, z) => {
        const m = new THREE.Mesh(geo, mat);
        m.position.set(x, y, z);
        m.castShadow = true;
        g.add(m);
        return m;
    };

    // Bodi + bezel
    add(new THREE.BoxGeometry(w + 0.1, h + 0.1, 0.08), bodyMat, 0, 0, 0);
    // Panel belakang (kesan ketebalan)
    add(new THREE.BoxGeometry(w * 0.6, h * 0.5, 0.05), backMat, 0, 0, -0.065);
    // Lengan mount + plat dinding
    add(new THREE.BoxGeometry(0.16, 0.14, 0.12), metalMat, 0, 0, -0.125);
    add(new THREE.BoxGeometry(0.46, 0.30, 0.02), bodyMat, 0, 0, -0.19);

    // Layar
    const tex = this.cachedTextures.presentationScreen;
    const screenMat = new THREE.MeshStandardMaterial({
        map: tex, emissiveMap: tex, emissive: 0xFFFFFF,
        emissiveIntensity: isLight ? 0.55 : 0.8, roughness: 0.15
    });
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(w, h), screenMat);
    screen.position.z = 0.042;
    g.add(screen);

    // Pantulan diagonal di layar
    const glareMat = new THREE.MeshBasicMaterial({ color: 0xFFFFFF, transparent: true, opacity: 0.07, depthWrite: false });
    const s = new THREE.Shape();
    s.moveTo(-1.3, -0.9); s.lineTo(-0.7, -0.9); s.lineTo(0.3, 0.9); s.lineTo(-0.3, 0.9); s.closePath();
    const glare = new THREE.Mesh(new THREE.ShapeGeometry(s), glareMat);
    glare.position.z = 0.0435;
    g.add(glare);

    // LED status di bezel bawah
    const led = new THREE.Mesh(
        new THREE.BoxGeometry(0.05, 0.012, 0.006),
        new THREE.MeshBasicMaterial({ color: PALETTE.accent.teal })
    );
    led.position.set(w / 2 - 0.12, -(h / 2 + 0.025), 0.042);
    g.add(led);

    return g;
}
```

- [x] **R4b. Pasang di ruang rapat.** Di `buildMeetingRoom()`, hapus blok `// Ultra-HD Wall Presentation Screen` sampai `this.officeGroup.add(presScreen);`, ganti dengan:

```js
// TV menempel di dinding belakang (permukaan dalam dinding z = -11.8)
const tv = this.buildWallTV(3.6, 1.8);
tv.position.set(x, 2.3, -11.8 + 0.2);
this.officeGroup.add(tv);

// Credenza di bawah TV
const tvCredenza = new THREE.Mesh(
  new THREE.BoxGeometry(3.6, 0.55, 0.5),
  new THREE.MeshStandardMaterial({ color: 0x7a5232, roughness: 0.55 }),
);
tvCredenza.position.set(x, 0.275, -11.8 + 0.27);
tvCredenza.castShadow = true;
tvCredenza.receiveShadow = true;
this.officeGroup.add(tvCredenza);
```

**Selesai jika:** TV menempel di dinding dengan lengan dan plat, punya bezel dan ketebalan, ada LED teal kecil, dan berdiri di atas credenza kayu.

---

## 🔴 R5: Karakter agent lebih 3D (bukan Roblox)

Akar tampilan "Roblox": semua bagian tubuh memakai `BoxGeometry` (kepala kubus, torso kotak, anggota badan balok), mata dua kotak hitam, tanpa telinga, hidung, dan alis, serta semua agent berwarna kulit dan rambut sama.

**Pendekatan:** tetap pakai hierarki pivot dan **nama pivot yang sama** (sehingga semua kode pose duduk, jalan, dan mengetik tidak perlu diubah), tetapi geometrinya diganti menjadi bentuk membulat:

| Bagian         | Sebelum                     | Sesudah                                                         |
| -------------- | --------------------------- | --------------------------------------------------------------- |
| Anggota badan  | Box                         | Kapsul (`LatheGeometry`, jalan di semua versi three.js)         |
| Kepala         | Kubus                       | Elipsoid dengan telinga, hidung, pipi, alis, mulut tersenyum    |
| Mata           | 2 kotak hitam               | Sklera + iris + highlight                                       |
| Rambut         | Kotak                       | Tutup rambut melengkung + poni/cepol (bervariasi per agent)     |
| Badan          | Kotak                       | Kapsul pipih (hoodie) dengan hood, kantong, tali, hem, ID badge |
| Tangan, sepatu | Kotak                       | Elipsoid, sepatu dengan sol krem                                |
| Warna          | Kulit dan rambut sama semua | 4 warna kulit + 5 warna rambut, dipilih dari `id`               |

- [x] **R5a. Tambahkan tiga method ke class `Office3D`:**

```js
_capsule(r, len, mat) {
    const pts = [];
    const half = len / 2;
    for (let i = 0; i <= 8; i++) {
        const a = -Math.PI / 2 + (i / 8) * (Math.PI / 2);
        pts.push(new THREE.Vector2(Math.max(Math.cos(a) * r, 0.0001), -half + Math.sin(a) * r));
    }
    for (let i = 0; i <= 8; i++) {
        const a = (i / 8) * (Math.PI / 2);
        pts.push(new THREE.Vector2(Math.max(Math.cos(a) * r, 0.0001), half + Math.sin(a) * r));
    }
    const m = new THREE.Mesh(new THREE.LatheGeometry(pts, 16), mat);
    m.castShadow = true;
    return m;
}

_ellipsoid(rx, ry, rz, mat, seg = 20) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(1, seg, Math.max(8, Math.round(seg * 0.7))), mat);
    m.scale.set(rx, ry, rz);
    m.castShadow = true;
    return m;
}

buildAvatarRig(id, agent) {
    const avatarGroup = new THREE.Group();
    avatarGroup.name = `AvatarGroup_${id}`;
    avatarGroup.userData = { agentId: id, agentData: agent, isAvatar: true };

    const bodyRoot = new THREE.Group();
    bodyRoot.name = `BodyRoot_${id}`;
    avatarGroup.add(bodyRoot);

    // ---------- Variasi per agent ----------
    const skinTones = [0xF2C6A0, 0xE0A87C, 0xC68A5E, 0x8D5A3B];
    const hairTones = [0x2B2118, 0x4A3222, 0x1E1E24, 0x7A4B28, 0x5B4636];
    const skinHex = skinTones[id % skinTones.length];
    const hairHex = hairTones[(id * 3 + 1) % hairTones.length];
    const avatarColorHex = agent.avatar_color ? parseInt(agent.avatar_color.replace('#', '0x'), 16) : 0x4C6489;

    // ---------- Material ----------
    const hoodieMat = new THREE.MeshStandardMaterial({ color: avatarColorHex, roughness: 0.75 });
    const trimMat   = new THREE.MeshStandardMaterial({ color: new THREE.Color(avatarColorHex).multiplyScalar(0.78), roughness: 0.8 });
    const skinMat   = new THREE.MeshStandardMaterial({ color: skinHex, roughness: 0.55 });
    const hairMat   = new THREE.MeshStandardMaterial({ color: hairHex, roughness: 0.6 });
    const pantsMat  = new THREE.MeshStandardMaterial({ color: 0x3A4252, roughness: 0.8 });
    const shoeMat   = new THREE.MeshStandardMaterial({ color: 0x3A4048, roughness: 0.5 });
    const soleMat   = new THREE.MeshStandardMaterial({ color: 0xEDE8DC, roughness: 0.6 });
    const creamMat  = new THREE.MeshStandardMaterial({ color: 0xEDE8DC, roughness: 0.5 });

    // ---------- Pinggul ----------
    const hips = this._ellipsoid(0.27, 0.12, 0.19, pantsMat);
    hips.position.y = 0.58;
    bodyRoot.add(hips);

    // ---------- Kaki (nama pivot sama seperti sebelumnya) ----------
    const makeLeg = (sx, side) => {
        const thighPivot = new THREE.Group();
        thighPivot.name = `${side}ThighPivot_${id}`;
        thighPivot.position.set(sx, 0.56, 0.02);
        bodyRoot.add(thighPivot);

        const thigh = this._capsule(0.085, 0.13, pantsMat);
        thigh.position.y = -0.14;
        thighPivot.add(thigh);

        const knee = new THREE.Group();
        knee.name = `${side}KneePivot_${id}`;
        knee.position.y = -0.28;
        thighPivot.add(knee);

        const calf = this._capsule(0.07, 0.12, pantsMat);
        calf.position.y = -0.12;
        knee.add(calf);

        const shoe = new THREE.Group();
        shoe.position.set(0, -0.25, 0.04);
        knee.add(shoe);
        const upper = this._ellipsoid(0.085, 0.055, 0.14, shoeMat);
        upper.position.set(0, 0, 0.01);
        shoe.add(upper);
        const sole = this._ellipsoid(0.09, 0.02, 0.145, soleMat);
        sole.position.set(0, -0.045, 0.01);
        shoe.add(sole);
    };
    makeLeg(-0.16, 'Left');
    makeLeg(0.16, 'Right');

    // ---------- Torso ----------
    const spinePivot = new THREE.Group();
    spinePivot.name = `SpinePivot_${id}`;
    spinePivot.position.set(0, 0.58, 0);
    bodyRoot.add(spinePivot);

    const torso = this._capsule(0.22, 0.2, hoodieMat);
    torso.scale.set(1.3, 1, 0.85);
    torso.position.y = 0.31;
    spinePivot.add(torso);

    const hem = this._ellipsoid(0.29, 0.04, 0.2, trimMat);          // tepi bawah hoodie
    hem.position.y = 0.02;
    spinePivot.add(hem);

    const hood = this._ellipsoid(0.17, 0.11, 0.10, trimMat);        // hood di belakang leher
    hood.position.set(0, 0.64, -0.13);
    spinePivot.add(hood);

    const pocket = this._ellipsoid(0.17, 0.07, 0.04, trimMat);      // kantong kanguru
    pocket.position.set(0, 0.15, 0.18);
    spinePivot.add(pocket);

    [-0.05, 0.05].forEach(dx => {                                    // tali hoodie
        const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.12, 6), creamMat);
        cord.position.set(dx, 0.5, 0.175);
        spinePivot.add(cord);
    });

    const idBadge = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.15, 0.015), creamMat);
    idBadge.position.set(-0.14, 0.35, 0.185);
    spinePivot.add(idBadge);

    // ---------- Kepala ----------
    const headPivot = new THREE.Group();
    headPivot.name = `HeadPivot_${id}`;
    headPivot.position.set(0, 0.62, 0);
    spinePivot.add(headPivot);

    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.085, 0.12, 12), skinMat);
    neck.position.y = 0.04;
    headPivot.add(neck);

    const head = this._ellipsoid(0.235, 0.255, 0.235, skinMat, 28);
    head.position.y = 0.33;
    head.name = `HeadMesh_${id}`;
    headPivot.add(head);

    [-1, 1].forEach(s => {                                           // telinga
        const ear = this._ellipsoid(0.03, 0.045, 0.025, skinMat, 12);
        ear.position.set(s * 0.232, 0.33, 0);
        headPivot.add(ear);
    });

    const nose = this._ellipsoid(0.025, 0.03, 0.03, skinMat, 12);    // hidung
    nose.position.set(0, 0.31, 0.235);
    headPivot.add(nose);

    // Mata: sklera + iris + highlight
    const scleraMat = new THREE.MeshStandardMaterial({ color: 0xF6F3EC, roughness: 0.3 });
    const irisMat   = new THREE.MeshStandardMaterial({ color: 0x2B2118, roughness: 0.2 });
    const shineMat  = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });
    [-1, 1].forEach(s => {
        const eye = new THREE.Group();
        eye.name = s < 0 ? `EyeL_${id}` : `EyeR_${id}`;
        eye.position.set(s * 0.085, 0.36, 0.205);
        const white = this._ellipsoid(0.045, 0.052, 0.025, scleraMat, 14);
        const iris  = this._ellipsoid(0.028, 0.034, 0.015, irisMat, 12);
        iris.position.z = 0.02;
        const shine = this._ellipsoid(0.009, 0.009, 0.006, shineMat, 8);
        shine.position.set(0.012, 0.012, 0.034);
        eye.add(white, iris, shine);
        headPivot.add(eye);

        const brow = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.014, 0.014), hairMat);   // alis
        brow.position.set(s * 0.085, 0.425, 0.2);
        brow.rotation.z = -s * 0.1;
        headPivot.add(brow);

        const cheek = this._ellipsoid(0.035, 0.02, 0.01, new THREE.MeshStandardMaterial({
            color: 0xE89A8C, transparent: true, opacity: 0.45, roughness: 0.8
        }), 10);
        cheek.position.set(s * 0.14, 0.29, 0.185);
        cheek.rotation.y = s * 0.5;
        headPivot.add(cheek);
    });

    const mouth = new THREE.Mesh(                                    // senyum
        new THREE.TorusGeometry(0.045, 0.007, 6, 14, Math.PI),
        new THREE.MeshStandardMaterial({ color: 0x8A3B3B, roughness: 0.5 })
    );
    mouth.rotation.z = Math.PI;
    mouth.position.set(0, 0.245, 0.218);
    headPivot.add(mouth);

    // Rambut: tutup melengkung (miring ke belakang agar dahi terlihat) + variasi gaya
    const hairCap = new THREE.Mesh(
        new THREE.SphereGeometry(0.255, 28, 18, 0, Math.PI * 2, 0, Math.PI * 0.48),
        hairMat
    );
    hairCap.position.set(0, 0.345, -0.01);
    hairCap.rotation.x = -0.35;
    hairCap.castShadow = true;
    headPivot.add(hairCap);

    const hairBack = this._ellipsoid(0.24, 0.19, 0.2, hairMat);
    hairBack.position.set(0, 0.30, -0.07);
    headPivot.add(hairBack);

    if (id % 2 === 0) {
        const bun = this._ellipsoid(0.08, 0.08, 0.08, hairMat);      // cepol
        bun.position.set(0, 0.58, -0.14);
        headPivot.add(bun);
    } else {
        const fringe = this._ellipsoid(0.2, 0.05, 0.09, hairMat);    // poni
        fringe.position.set(0.04, 0.47, 0.16);
        fringe.rotation.z = -0.2;
        headPivot.add(fringe);
    }

    // Headset (band melintasi atas kepala dari telinga ke telinga)
    const headsetMat = new THREE.MeshStandardMaterial({ color: 0x2F3A4B, roughness: 0.4, metalness: 0.1 });
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.022, 8, 28, Math.PI), headsetMat);
    band.position.set(0, 0.34, 0);
    headPivot.add(band);

    [-1, 1].forEach(s => {
        const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.05, 18), headsetMat);
        cup.rotation.z = Math.PI / 2;
        cup.position.set(s * 0.255, 0.34, 0);
        headPivot.add(cup);
    });

    const statusHex = agent.status === 'KERJA' ? PALETTE.accent.teal : PALETTE.accent.amber;
    const rgbMat = new THREE.MeshBasicMaterial({ color: statusHex });
    const rgbRingL = new THREE.Mesh(new THREE.RingGeometry(0.035, 0.06, 16), rgbMat);
    rgbRingL.rotation.y = -Math.PI / 2;
    rgbRingL.position.set(-0.283, 0.34, 0);
    rgbRingL.name = `RgbRingL_${id}`;
    headPivot.add(rgbRingL);

    const rgbRingR = rgbRingL.clone();
    rgbRingR.rotation.y = Math.PI / 2;
    rgbRingR.position.x = 0.283;
    rgbRingR.name = `RgbRingR_${id}`;
    headPivot.add(rgbRingR);

    // ---------- Lengan ----------
    const makeArm = (sx, side) => {
        const armPivot = new THREE.Group();
        armPivot.name = `${side}ArmPivot_${id}`;
        armPivot.position.set(sx, 0.56, 0);
        spinePivot.add(armPivot);

        armPivot.add(this._ellipsoid(0.075, 0.075, 0.075, hoodieMat));      // bahu

        const upper = this._capsule(0.058, 0.164, hoodieMat);
        upper.position.y = -0.13;
        armPivot.add(upper);

        const elbow = new THREE.Group();
        elbow.name = `${side}ElbowPivot_${id}`;
        elbow.position.y = -0.26;
        armPivot.add(elbow);

        const fore = this._capsule(0.05, 0.14, hoodieMat);
        fore.position.y = -0.11;
        elbow.add(fore);

        const cuff = this._ellipsoid(0.054, 0.025, 0.054, trimMat);         // manset
        cuff.position.y = -0.215;
        elbow.add(cuff);

        const hand = this._ellipsoid(0.05, 0.055, 0.045, skinMat);
        hand.position.y = -0.25;
        elbow.add(hand);

        return elbow;
    };
    makeArm(-0.33, 'Left');
    const rightElbow = makeArm(0.33, 'Right');

    // Cangkir kopi di tangan kanan (aktif saat di lounge)
    const cup = new THREE.Group();
    cup.name = `CoffeeCup_${id}`;
    cup.position.set(0, -0.26, 0.08);
    const cupBody = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.05, 0.12, 16),
        new THREE.MeshStandardMaterial({ color: PALETTE.accent.coral, roughness: 0.3 })
    );
    cupBody.castShadow = true;
    cup.add(cupBody);
    const handle = new THREE.Mesh(
        new THREE.TorusGeometry(0.035, 0.008, 6, 12, Math.PI),
        cupBody.material
    );
    handle.rotation.z = -Math.PI / 2;
    handle.position.set(0.06, 0, 0);
    cup.add(handle);
    const liquid = new THREE.Mesh(
        new THREE.CylinderGeometry(0.052, 0.052, 0.02, 14),
        new THREE.MeshStandardMaterial({ color: 0x3F2D1D, roughness: 0.2 })
    );
    liquid.position.y = 0.05;
    cup.add(liquid);
    const steam = new THREE.Mesh(
        new THREE.ConeGeometry(0.04, 0.12, 8),
        new THREE.MeshBasicMaterial({ color: 0xFFFFFF, transparent: true, opacity: 0.35 })
    );
    steam.position.y = 0.12;
    cup.add(steam);
    cup.visible = false;
    rightElbow.add(cup);

    // ---------- Badge nama + ring seleksi ----------
    const badgeSprite = this.createTextBadgeSprite(agent.name, agent.role, agent.status);
    badgeSprite.position.set(0, 2.35, 0);
    badgeSprite.name = `BadgeSprite_${id}`;
    avatarGroup.add(badgeSprite);

    const ring = new THREE.Mesh(
        new THREE.RingGeometry(1.4, 1.55, 32),
        new THREE.MeshBasicMaterial({ color: PALETTE.accent.teal, side: THREE.DoubleSide, transparent: true, opacity: 0.85 })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.03;
    ring.visible = false;
    ring.name = `SelectRing_${id}`;
    avatarGroup.add(ring);

    avatarGroup.traverse(child => {
        if (child.isMesh) child.userData.parentAgentId = id;
    });

    return avatarGroup;
}
```

- [x] **R5b. Sambungkan ke `createAgentWorkstation`.** Hapus seluruh kode dari komentar `// 2. ARTICULATED AVATAR RIG` sampai (dan termasuk) baris `this.officeGroup.add(avatarGroup);`, lalu ganti dengan:

```js
// 2. AVATAR (rig membulat, pivot bernama sama dengan versi lama)
const avatarGroup = this.buildAvatarRig(id, agent);
this.tameMetalness?.(avatarGroup);
this.officeGroup.add(avatarGroup);
```

Bagian `// 3. INITIAL POSE & LOCOMOTION STATE` dan seterusnya **tidak diubah**.

- [x] **R5c (opsional). Kedip mata.** Di `animate()`, di dalam loop agent (setelah baris `const orb = ...`), tambahkan:

```js
const eyeL = avatarGroup.getObjectByName(`EyeL_${id}`);
const eyeR = avatarGroup.getObjectByName(`EyeR_${id}`);
if (eyeL && eyeR) {
  const blink = (elapsedTime * 0.5 + id * 1.7) % 4 > 3.88 ? 0.1 : 1;
  eyeL.scale.y = blink;
  eyeR.scale.y = blink;
}
```

**Selesai jika:**

- Kepala bulat dengan telinga, hidung, alis, pipi, mulut tersenyum, dan mata berkilau.
- Tiap agent punya kombinasi kulit, rambut, dan gaya rambut (cepol atau poni) yang berbeda.
- Hoodie punya hood, kantong, tali, dan manset; sepatu bersol krem.
- Pose duduk di meja dan sofa, animasi jalan, mengetik, dan minum kopi tetap bekerja tanpa error.

---

## 🟡 R6: Warna ikut palet (cek cepat)

- [x] Pastikan `PALETTE.frame` ada (`0x3A4048`) dan `PALETTE.accent.coral` / `teal` / `amber` tersedia (dipakai di jendela, TV, dan avatar).
- [x] Pastikan loop sRGB di akhir `initProceduralTextures()` berjalan **setelah** `windowView` didaftarkan.

## 🟡 R7: Sinkronkan `setTheme()`

- [x] Ganti baris `winFrameMat` lama di `setTheme()` dengan:

```js
if (this.winFrameMat)
  this.winFrameMat.color.setHex(isLight ? PALETTE.frame : 0x475569);
if (this.winCasingMat)
  this.winCasingMat.color.setHex(isLight ? 0xf1eadc : 0x5b6478);
if (this.winJambMat)
  this.winJambMat.color.setHex(isLight ? 0xcbbfa6 : 0x3c4760);
(this.winViewMats || []).forEach((m) =>
  m.color.setHex(isLight ? 0xffffff : 0x5a6a85),
);
```

- [x] Hapus rujukan ke `glassPaneMat` jika masih ada di `setTheme()`.
- [x] Di `updateAgentWorkstation()`, logika warna RGB ring headset (`RgbRingL_` / `RgbRingR_`) tetap berjalan karena nama sudah sama; tidak perlu perubahan.

---

## ✅ Checklist QA

- [x] Lantai bersih, tanpa tulisan.
- [x] Tidak ada lampu menggantung di atas mana pun.
- [x] Jendela terlihat bertingkat, ada ambang, rangka silang, pemandangan luar, dan pantulan kaca.
- [x] Jendela dinding belakang tidak tertimpa TV maupun rack server.
- [x] TV menempel di dinding (ada lengan dan plat), punya bezel, LED, pantulan, dan credenza.
- [x] Karakter tidak lagi berbentuk kotak; kepala, badan, dan anggota badan membulat.
- [x] Setiap agent terlihat berbeda (warna kulit, rambut, gaya rambut).
- [x] Pose duduk di sofa dan meja kerja tidak menembus furnitur secara mencolok.
- [x] Animasi jalan ke lounge dan kembali ke meja masih mulus.
- [x] Klik dan hover pada karakter masih memunculkan tooltip dan seleksi.
- [x] Mode gelap berfungsi, tanpa error di console.
- [x] FPS stabil (cek dengan 5+ agent).

## Catatan Tuning

| Gejala                                    | Penyesuaian                                                               |
| ----------------------------------------- | ------------------------------------------------------------------------- |
| Rambut menutupi alis/mata                 | Naikkan `hairCap.rotation.x` ke −0.45 atau kecilkan phiLength 0.48 → 0.45 |
| Hoodie terlalu gelap                      | Ubah `multiplyScalar(0.78)` pada `trimMat` ke 0.88                        |
| Jendela terlalu terang                    | Turunkan `color` `viewMat` ke `0xE6EEF5`                                  |
| TV terlalu silau                          | Turunkan `emissiveIntensity` di `buildWallTV` ke 0.4                      |
| Kepala terasa terlalu besar               | Skala `head` (0.235, 0.255, 0.235) → (0.22, 0.24, 0.22)                   |
| Scene terlalu redup setelah lampu dihapus | Naikkan `hemiLight.intensity` atau `dirLight.intensity` +0.1              |
