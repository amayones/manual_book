# Manual Book

Manual book ringan untuk aplikasi internal: berisi tutorial cara memakai
aplikasi utama, ditulis dalam Markdown, dibangun menjadi situs statis, dan
di-host di Cloudflare Pages pada alamat seperti `manual.domain.com/`.

## (a) Cara kerja singkat

Ada tiga bagian yang saling terpisah:

1. **Konten** di folder `content/`. Ditulis manusia memakai Markdown dengan
   bagian atas (`frontmatter`) berisi judul, grup, tanggal, dan ringkasan.
   Satu berkas sama dengan satu halaman manual.
2. **Build** di folder `scripts/`. Program Node.js yang membaca konten,
   memeriksa kesalahan, mengubah screenshot menjadi WebP, lalu menulis situs
   siap tayang ke folder `dist/`. Build berjalan otomatis di Cloudflare Pages
   setiap kali ada push ke Git, dan bisa dijalankan lokal dengan satu perintah.
3. **Tampilan** di folder `src/`. Satu halaman `index.html`, satu berkas
   JavaScript, dan satu berkas CSS, semuanya tanpa framework dan tanpa pustaka
   luar di sisi browser. Navigasi memakai state JavaScript sehingga address bar
   selalu menunjuk ke root, misalnya `manual.domain.com/`.

Alur tautan dari aplikasi utama memakai query string yang langsung dibersihkan
setelah dibaca, misalnya `manual.domain.com/?p=login&tab=video&s=3` membuka
halaman Login pada tab Video dan menyorot video nomor 3.

## (b) Menjalankan lokal

```bash
npm install       # sekali saja: marked, gray-matter, sharp, esbuild
npm run dev       # buka http://localhost:8788
npm run build     # menghasilkan folder dist/
npm run validate  # memeriksa konten tanpa menulis dist
npm test          # menjalankan 100+ pengujian otomatis
npm run size      # menampilkan ukuran berkas dan anggaran gzip
npm run clean     # menghapus folder dist/
node scripts/kontras.mjs  # menghitung rasio kontras warna (laporan a11y)
```

Build memakai `esbuild` (devDependency, versi dikunci tanpa `^`) untuk
memadatkan JavaScript dan CSS hasil gabungan. Berkas sumber di `src/` tetap
ditulis lengkap dengan komentar; yang dipadatkan hanya berkas di `dist/`.
Bila `esbuild` gagal dimuat, build berhenti dengan pesan jelas (exit 1).
Anggaran ukuran (gzip): app.js 22 KiB, styles.css 12 KiB, index.html 6 KiB,
theme-boot 1 KiB; diperiksa otomatis setiap build.

`npm run dev` membangun lalu menyajikan situs di `http://localhost:8788`,
sambil memantau folder `content/` dan `src/`. Setiap perubahan memicu build
ulang dan halaman di browser dimuat ulang otomatis. Tekan `Ctrl+C` untuk
berhenti. Versi Node lokal boleh 20 ke atas; Cloudflare Pages memakai 22 dari
berkas `.node-version`.

## (c) Menambah halaman baru langkah demi langkah

1. Salin `content/pages/_template.md` menjadi berkas baru, misalnya
   `content/pages/03-transaksi.md`. Angka depan menentukan urutan, kata
   sesudahnya menjadi identitas halaman (`transaksi`).
2. Isi bagian atas berkas:
   ```markdown
   ---
   title: Transaksi
   group: laporan
   updated: 2026-10-09
   summary: Cara mencatat transaksi penjualan baru.
   ---
   ```
3. Buat folder `content/assets/transaksi/` dan letakkan screenshot di sana,
   misalnya `step-1.png`. Lebar gambar sebaiknya 1200 px atau lebih.
4. Tulis langkah mengikuti contoh pada berkas template.
5. Jalankan `npm run validate`. Perbaiki setiap kesalahan yang dilaporkan
   (pesan menyebut nama berkas, nomor baris, dan cara memperbaikinya).
6. Jalankan `npm run dev` dan buka halamannya untuk melihat hasil.
7. Bila grup `laporan` belum ada di `content/config.mjs`, tambahkan, atau
   pakai grup yang sudah ada.

Menghapus halaman: hapus berkas `.md`-nya dan gambar yang tidak terpakai.
Validator memberi peringatan bila ada gambar yatim.

## (d) Referensi sintaks halaman

### Frontmatter

```markdown
---
title: Login                       # wajib: judul tampil
group: dashboard                  # wajib: harus ada di config.groups; "none" hides it from sidebar
updated: 2026-09-28                # wajib: YYYY-MM-DD
summary: Cara masuk ke aplikasi.   # wajib: satu kalimat, maks 200 karakter
icon: lock                         # opsional: salah satu dari 22 nama ikon
level: Dasar                       # opsional: Dasar, Menengah, Lanjut
readTime: 5                        # opsional: kosong berarti dihitung otomatis
tags: [masuk, akun]                # opsional: kata kunci pencarian
featured: true                     # opsional: dapat bintang di sidebar
since: 2026-09-01                  # tanggal halaman pertama dibuat; wajib diisi agar badge "Baru" tampil
---
```

Tidak ada `id` dan tidak ada `order`: keduanya diturunkan dari nama berkas.
`01-login.md` menghasilkan `id` bernama `login` dengan urutan 1.

Nama ikon yang tersedia (22 nama): `rocket`, `grid`, `chart`, `lock`, `user`,
`gear`, `cart`, `bell`, `file`, `search`, `shield`, `help`, `download`,
`upload`, `mail`, `edit`, `trash`, `star`, `home`, `calendar`, `key`, `print`.
Bila `icon` dikosongkan,
halaman memakai ikon grupnya.

### Langkah

```markdown
### 1. Buka halaman login
![Halaman login kosong](/assets/login/step-1.png)
Klik Kolom email lalu ketik alamat email Anda.
```

Setiap langkah wajib punya judul (`###`), tepat satu gambar, dan minimal satu
paragraf penjelasan setelah gambar.

### Anotasi lingkaran (pin)

Tulis blok `::: pin` tepat setelah baris gambar:

```markdown
::: pin
1. [82,22] Kolom email
2. [82,38] Kolom kata sandi
:::
```

Nomor urut dari 1. Koordinat `[x,y]` adalah persen dari lebar dan tinggi
gambar, rentang 0 sampai 100. Tulisan setelah koordinat muncul sebagai
keterangan saat lingkaran diklik.

### Callout

```markdown
::: tip
Tulisan tips singkat.
:::

::: warn
Tulisan peringatan.
:::

::: note
Tulisan catatan.
:::
```

Hanya tiga tipe itu. Setiap blok wajib ditutup dengan `:::` pada baris sendiri.

### Troubleshooting

```markdown
::: problem
**Masalah:** Gejala yang dilihat pengguna.
**Penyebab:** Penyebab sebenarnya.
**Solusi:** Langkah penyelesaian.
:::
```

### Video dan bab

```markdown
::: video
### 1. Login untuk pertama kali
Penjelasan singkat di bawah judul.

https://www.youtube.com/watch?v=VIDEO_ID_CONTOH

Durasi: 2 menit 15 detik

- 00:00 → Membuka aplikasi
- 00:42 → Mengisi email dan kata sandi
:::
```

Tautan YouTube wajib (`watch?v=`, `youtu.be/`, `/shorts/`, `/embed/`).
`Durasi:` opsional (`2:15` atau `2 menit 15 detik`). Daftar bab opsional,
harus urut naik dan tidak melebihi durasi. `VIDEO_ID_CONTOH` adalah alamat
contoh yang menampilkan kartu pengganti; ganti dengan ID asli (11 karakter)
sebelum dipakai sungguhan.

## (e) Mengganti judul, warna, grup, dan ikon

Semua ada di `content/config.mjs`:

```js
siteName: 'Manual Book',      // nama di header dan tab browser
appName: 'App Penjualan',     // nama aplikasi yang dijelaskan
tagline: 'Apa yang ingin Anda lakukan?',  // kalimat di kotak pencarian header
theme: {
  accent: '#2563eb',          // warna utama tombol, tautan, sorotan
  accentDark: '#60a5fa',      // warna aksen saat mode gelap
},
sidebar: {
  markFeatured: true,         // bintang pada halaman featured
},
groups: [
  // Halaman Beranda (00-beranda.md) memakai group: none sehingga tidak
  // masuk grup mana pun; menu Beranda dibuat otomatis di sidebar.
  { id: 'dashboard', label: 'Penjualan', icon: 'grid' },
  { id: 'laporan', label: 'Laporan', icon: 'chart' },
  // tambah grup baru di sini, lalu pakai id-nya pada frontmatter group:
  // { id: 'stok', label: 'Stok', icon: 'cart' },
],
```

Warna aksen mengalir otomatis ke seluruh tampilan (termasuk warna muda dan
warna tulis hasil campuran) karena CSS memakai `color-mix()`. Setelah diubah,
jalankan `npm run build` dan periksa tampilannya. Untuk memastikan kontras
tetap memenuhi standar, jalankan `node scripts/kontras.mjs` — semua pasangan
harus LULUS pada 4.5:1.

Ikon memakai 22 nama bawaan yang sama seperti pada frontmatter (lihat daftar
di bagian d). Tidak ada gambar ikon yang perlu disiapkan. Semua ikon berasal
dari satu sprite SVG di dalam halaman sehingga tidak ada permintaan tambahan.

## (f) Memakai ulang untuk aplikasi lain

Satu folder proyek untuk satu aplikasi. Caranya:

1. Salin seluruh folder proyek ini ke folder baru.
2. Ubah `content/config.mjs`: `siteName`, `appName`, `appDescription`,
   `tagline`, `domain`, `appUrl`, `theme`, dan `groups`.
3. Hapus isi `content/pages/` kecuali `_template.md`, lalu tulis halaman baru.
4. Hapus isi `content/assets/`, lalu letakkan screenshot aplikasi yang baru.
5. Sesuaikan `content/changelog.md`.
6. Jalankan `npm install`, `npm run validate`, lalu `npm run dev`.

Tidak ada kode yang perlu diubah di `scripts/` maupun `src/`. Buat repositori
Git baru untuk folder tersebut dan sambungkan ke proyek Cloudflare Pages baru
dengan subdomain sendiri.

Daftar lengkap berkas contoh yang harus diganti ada di
`docs/GANTI-CONTOH.md`.

## (g) Menghubungkan tombol Bantuan dari aplikasi utama

Setiap halaman manual punya alamat tautan permanen berbentuk query string.
Tombol Bantuan pada aplikasi utama cukup membuka alamat itu di tab baru.

Format lengkap (semua parameter opsional kecuali `p`):

```
https://manual.domain.com/?p=<id-halaman>&tab=<panduan|video>&s=<nomor>
```

- `p`: identitas halaman, sama dengan nama berkas tanpa angka
  (`01-login.md` menjadi `p=login`). Nilai `p=changelog` membuka halaman
  Catatan Perubahan.
- `tab`: `video` untuk tab Video; bila kosong berarti tab Panduan.
- `s`: pada tab Panduan berarti nomor langkah, pada tab Video berarti nomor video.

Setelah dibaca, aplikasi manual langsung membersihkan address bar menjadi
`manual.domain.com/`. Nomor di luar jangkauan diabaikan tanpa galat.

Contoh tombol HTML pada aplikasi utama:

```html
<a href="https://manual.domain.com/?p=login&tab=video&s=1"
   target="_blank" rel="noopener">Bantuan: Cara Login</a>
```

Contoh JavaScript bila halaman Bantuan bergantung pada konteks:

```js
function bukaBantuan(idHalaman, tab, nomor) {
  const alamat = new URL('https://manual.domain.com/');
  alamat.searchParams.set('p', idHalaman);
  if (tab === 'video') alamat.searchParams.set('tab', 'video');
  if (nomor) alamat.searchParams.set('s', String(nomor));
  window.open(alamat.toString(), '_blank', 'noopener');
}

// Contoh pakai:
bukaBantuan('login');                 // tab Panduan halaman Login
bukaBantuan('dashboard', 'video', 1); // video pertama halaman Dashboard
bukaBantuan('changelog');             // halaman Catatan Perubahan
```

Setiap halaman dan setiap langkah juga punya tombol "Salin link" yang menyalin
tautan bentuk ini, sehingga tim support bisa menempel tautan yang tepat pada
tiket atau chat.

## (h) Deploy ke Cloudflare Pages langkah demi langkah

1. Buat repositori Git untuk folder proyek ini dan push ke GitHub/GitLab.
2. Buka dashboard Cloudflare, pilih Workers and Pages, lalu Create, tab Pages,
   dan sambungkan repositori.
3. Isi pengaturan build:
   - Framework preset: None
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Root directory: `manual-book` (kosongkan bila repositori ini adalah proyeknya)
   - Versi Node dibaca otomatis dari berkas `.node-version` (berisi 22).
4. Tekan Save and Deploy. Build pertama memakan waktu di bawah satu menit
   untuk manual kecil. Tunggu sampai status Success.
5. Buka alamat `*.pages.dev` yang diberikan dan periksa halaman Beranda tampil.
6. Sambungkan domain sendiri: pada proyek Pages pilih Custom domains, lalu
   tambahkan `manual.domain.com` dan ikuti petunjuk DNS-nya.
7. Setiap push ke branch utama memicu build ulang otomatis. Branch lain
   mendapat alamat pratinjau sendiri untuk diuji sebelum digabung.

Pemeriksaan sekali saat deploy (wajib dilakukan manual karena belum bisa
diotomatisasi dari sini):

1. Ketik `manual.domain.com/login` langsung di address bar. Harusnya terbuka
   ke manual (Pages menyajikan `index.html` untuk path yang tidak dikenal).
   Bila muncul 404 bawaan Pages, beri tahu pengembang: penanganannya adalah
   menyalin `index.html` menjadi `dist/404.html` pada build.
2. Jalankan dan periksa header memakai `curl -I`:
   - `curl -I https://manual.domain.com/assets/app.<hash>.js` harus memuat
     `Cache-Control: public, max-age=31536000, immutable`.
   - `curl -I https://manual.domain.com/data/id.<hash>.json` harus memuat
     header yang sama.
   - `curl -I https://manual.domain.com/` harus memuat
     `Cache-Control: public, max-age=0, must-revalidate`.
   - Tidak boleh ada `script-src 'unsafe-inline'` atau
     `style-src 'unsafe-inline'` pada `Content-Security-Policy`.
3. Buka `manual.domain.com/?p=login&s=2` dari tab penyamaran dan pastikan
   langkah 2 disorot lalu address bar bersih.

## (i) Mengaktifkan Cloudflare Web Analytics

1. Buka dashboard Cloudflare, pilih situs atau akun, lalu Web Analytics, dan
   salin ID situs (angka pada kode beacon).
2. Buka `content/config.mjs` dan ubah:
   ```js
   analytics: {
     cloudflareWebAnalytics: true,
     siteId: 12345678,   // ganti dengan ID Anda
   },
   ```
3. Jalankan `npm run build` dan push. Build menyisipkan skrip beacon dan
   menambahkan domainnya ke Content-Security-Policy secara otomatis.
4. Tidak ada cookie yang dipasang dan tidak perlu banner persetujuan.

Untuk menonaktifkan kembali, kembalikan `cloudflareWebAnalytics` ke `false`.

## (j) Masalah umum

**Build berhenti dengan pesan validator.**
Baca pesan sampai habis: menyebut nama berkas, nomor baris, dan cara
memperbaiki. Perbaiki, lalu jalankan `npm run validate` lagi. Build tidak
menulis `dist/` selama masih ada kesalahan.

**Gambar tidak ditemukan.**
Pastikan alamat pada Markdown diawali `/assets/` dan berkasnya ada di
`content/assets/<nama-halaman>/` dengan nama yang sama persis, termasuk
huruf besar dan kecil.

**Pin tidak urut atau di luar gambar.**
Nomor pin harus 1, 2, 3 tanpa lompatan. Koordinat `[x,y]` adalah persen
0 sampai 100, bukan piksel. Blok `::: pin` harus tepat setelah baris gambar.

**Perubahan konten tidak tampil setelah deploy.**
Pastikan build di Pages berstatus Success. Karena nama berkas memuat hash isi,
konten baru selalu memakai nama berkas baru — cukup muat ulang halaman tanpa
perlu membersihkan cache manual. Bila memakai `curl`, periksa nama berkas JSON
pada `data-json` di `index.html` sudah berganti.

**Halaman putih kosong saat dibuka.**
Buka Console pada DevTools. Bila ada tulisan gagal memuat berkas data,
periksa `dist/data/` berisi berkas JSON dan `dist/index.html` menunjuk ke
nama yang benar, lalu jalankan `npm run build` ulang.

**Video tidak berputar.**
Pemutar YouTube baru dimuat setelah tombol putar diklik dan butuh koneksi ke
`youtube-nocookie.com`. Bila jaringan kantor memblokir YouTube, video tidak
bisa diputar dari jaringan tersebut. Kartu bertuliskan "Video contoh" berarti
ID pada Markdown masih `VIDEO_ID_CONTOH` dan harus diganti ID asli.
Thumbnail YouTube hanya dipakai sebagairiktan: begitu video diputar (lewat
tombol putar atau klik bab), thumbnail disembunyikan dan digantikan iframe
pemain 16:9, sehingga kartu tidak menampilkan dua video bertumpuk.

## Tampilan di ponsel

Di bawah 700 px layar, tombol Menu dan brand berubah jadi ikon saja supaya
header tetap satu baris, dan pencarian tetap ada di navbar (bukan hanya di
Beranda). Ukuran huruf isi mengecil ke 16 px, jarak antarbagian dirapatkan,
dan semua tombol utama minimal 44 x 44 px agar enak ditekuk jari.

Tinggi header diukur ulang oleh JavaScript lalu ditulis ke variabel CSS
`--tinggi-bilah`, sehingga `padding-top` halaman, posisi menu geser, dan
lompatan ke sebuah langkah selalu pas — termasuk ketika pengguna memperbesar
huruf di browser sampai 200%. Diuji pada lebar 320, 360, 390, 430, dan 768 px
serta ukuran huruf 150% dan 200%.

## Kepala halaman dan kartu

Kepala setiap halaman hanya berisi ikon, judul, lencana (Baru atau
Diperbarui), dan satu kalimat ringkasan. Waktu baca ("2 menit") dan
indikator level tidak lagi ditampilkan karena membingungkan — keduanya sudah
dihitung build dan tetap ada di berkas data, tetapi tidak dirender di mana
pun. Kartu di Beranda memakai isi yang sama.

Tombol Menu di navbar memakai latar warna aksen dengan ikon lebih besar
daripada tulungannya, supaya jelas terbaca sebagai kontrol buka/tutup dan
tidak tertukar dengan tombol tema. Tombol Tutup di dalam menu geser memakai
gaya yang sama.

## Status milestone

M0 sampai M6 selesai: kerangka, build, validator, shell dan router, tampilan
konten, verifikasi aset, polish (lightbox, daftar isi, changelog, animasi,
a11y), dan kunci tahap 2. Yang belum dikerjakan hanyalah deploy (M7).