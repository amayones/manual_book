# Panduan Menulis Konten

Semua isi manual ditulis di folder `content/`. Tidak perlu menyentuh kode.

## 1. Nama berkas

```
content/pages/00-beranda.md
content/pages/01-login.md
content/pages/02-dashboard.md
```

- Angka dua digit di depan menentukan urutan di sidebar.
- Kata setelah angka menjadi identitas halaman, dipakai pada tautan.
- Hanya gunakan huruf kecil, angka, dan tanda hubung. Contoh benar: `01-laporan-bulanan.md`.
- Nama `beranda` dicadangkan untuk halaman sistem. Hanya berkas
  `00-beranda.md` yang boleh memakainya, dan halaman ini muncul sebagai menu
  paling atas di sidebar, bukan di bawah grup mana pun.
- Nama `changelog` dicadangkan untuk halaman sistem. Isinya dibaca dari
  `content/changelog.md`, bukan dari folder `pages/`.
- Berkas yang namanya diawali garis bawah, seperti `_template.md`, otomatis diabaikan saat build.

## 2. Bagian atas berkas

Setiap berkas diawali blok `---` yang berisi empat hal wajib:

```markdown
---
title: Login
group: dashboard
updated: 2026-09-28
summary: Cara masuk ke aplikasi memakai email dan kata sandi.
---
```

| Bagian | Wajib | Arti |
|---|---|---|
| `title` | ya | Judul yang tampil |
| `group` | ya | Harus salah satu `id` di `config.mjs` bagian `groups`. Tulis `none` bila halaman tidak mau masuk grup mana pun; `00-beranda.md` memakai `none` |
| `updated` | ya | Format `YYYY-MM-DD`, tanggal terakhir konten diperbarui |
| `summary` | ya | Satu kalimat, maksimal 200 karakter |

Bagian opsional:

```markdown
icon: lock          # Nama ikon; kosong berarti memakai ikon grup
level: Menengah     # Dasar, Menengah, atau Lanjut. Tidak lagi ditampilkan
                    # di layar, tetapi tetap dibaca build.
readTime: 5         # Kosong berarti dihitung otomatis dari panjang teks.
                    # Tidak lagi ditampilkan di layar.
tags: [masuk, akun] # Kata kunci untuk pencarian
featured: true      # Halaman unggulan. Tidak lagi menampilkan bintang di
                    # sidebar; field ini boleh dihapus.
since: 2026-09-01   # Tanggal halaman pertama dibuat. Wajib diisi agar badge
                      # "Baru" bisa tampil; bila kosong, halaman tidak pernah "Baru".
```

> `level` dan `readTime` sudah tidak dirender di halaman, jadi boleh
> dihapus dari frontmatter bila tidak diperlukan. Keduanya tetap dihitung build
> dan dipakai pengujian, jadi tidak ada yang rusak bila dibiarkan.

## 3. Isi halaman

Gunakan heading `##` untuk membagi bagian. Dua bagian punya arti khusus:
`## Panduan` dan `## Video`. Bagian lain apa pun (misalnya
`## Tentang aplikasi ini`) menjadi teks biasa dan ikut terbaca oleh
pencarian.

Halaman Beranda boleh dibuat lebih sederhana: cukup bagian `## Panduan`.
Bilah tab disembunyikan otomatis bila halaman tidak punya video.

Halaman Beranda (`00-beranda.md`) memakai `group: none` dan menampilkan
logo besar, nama aplikasi, kotak pencarian besar, lalu seluruh bagian
biasanya. Daftar halaman tidak lagi memakai kartu; navigasi lewat sidebar
dan pencarian.

### Langkah

```markdown
### 1. Buka halaman login
![Halaman login kosong dengan kolom email dan kata sandi](/assets/login/step-1.png)
Klik **Kolom email** lalu ketik alamat email Anda. Setelah itu isi kata sandi.
```

- Setiap langkah wajib punya judul, tepat satu gambar, dan penjelasan di bawah gambar.
- Gambar diletakkan di `content/assets/<nama halaman>/`.
- Teks alt wajib diisi karena dipakai pembaca layar.

### Anotasi lingkaran

Tulis blok `::: pin` tepat setelah baris gambar.

```markdown
::: pin
1. [82,22] Kolom email
2. [82,38] Kolom kata sandi
:::
```

- Nomor urut dari 1, tanpa lompatan.
- Koordinat ditulis `[x,y]`, adalah persen dari lebar dan tinggi gambar, dan hanya boleh 0 sampai 100.
- Tulisan setelah koordinat muncul sebagai keterangan saat lingkaran diklik.

### Catatan, peringatan, dan tips

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

Hanya ada tiga tipe tersebut. Setiap blok wajib ditutup dengan `:::` pada baris sendiri.

### Masalah

```markdown
::: problem
**Masalah:** Gejala yang dilihat pengguna.
**Penyebab:** Penyebab sebenarnya.
**Solusi:** Langkah penyelesaian.
:::
```

### Video

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

- Tautan YouTube wajib, boleh `watch?v=`, `youtu.be/`, `/shorts/`, atau `/embed/`.
- `Durasi:` opsional, boleh ditulis `2:15` atau `2 menit 15 detik`.
- Daftar `- mm:ss → keterangan` adalah bab, opsional, harus urut naik.
- Thumbnail diambil otomatis dari YouTube dan pemutar baru dimuat saat diklik.
- `VIDEO_ID_CONTOH` adalah alamat contoh. Ganti dengan ID YouTube asli sebelum dipakai sungguhan.
- Setiap video punya tombol "Salin link video" yang menyalin tautan berbentuk
  `?p=<id-halaman>&tab=video&s=<nomor-video>` untuk dibagikan.

## 4. Memeriksa hasil

```bash
npm run validate
```

Validator berhenti pada kesalahan pertama yang ditemukan per berkas dan
menyebutkan nama berkas, nomor baris, dan cara memperbaikinya. Contoh:

```
content/pages/03-laporan.md
  baris 25, langkah 4: gambar assets/laporan/step-4.png tidak ditemukan. Letakkan file di content/assets/laporan/step-4.png
```

`npm run build` menjalankan validator yang sama lebih dulu. Bila ada kesalahan,
folder `dist/` tidak ditulis.

## 5. Catatan perubahan

Tambahkan entri terbaru di `content/changelog.md`:

```markdown
## 28 September 2026

- Menambahkan halaman Login.
- Memperbaiki langkah 2 pada halaman Dashboard.
```

Tulis butir perubahan sebagai teks polos tanpa format Markdown (tanda `**`
tidak diubah menjadi tebal pada halaman Catatan Perubahan).
```

## 6. Namakan ikon

Untuk `icon:` dan untuk ikon grup, gunakan salah satu nama berikut:

`rocket`, `grid`, `chart`, `lock`, `user`, `gear`, `cart`, `bell`, `file`,
`search`, `shield`, `help`, `download`, `upload`, `mail`, `edit`, `trash`,
`star`, `home`, `calendar`, `key`, `print`

Nama di luar daftar itu akan ditolak validator.

## 7. Menulis singkat

Manual yang mudah dibaca adalah manual yang setiap halamannya bisa dipahami
sekilas. Validator memberi peringatan (bukan kesalahan) bila teks terlalu
panjang. Batas yang nyaman:

| Bagian | Batas |
|---|---|
| `summary` di bagian atas | 100 karakter |
| Judul langkah | 8 kata |
| Penjelasan tiap langkah | 40 kata, tanpa paragraf kedua |
| Isi satu callout | 25 kata |

Contoh sebelum dan sesudah untuk awal langkah:

```markdown
Sebelum (terlalu panjang):
Anda harus sudah login dan memiliki hak akses kasir. Siapkan nama pelanggan,
nama produk, jumlah, dan harga sebelum mengisi formulir. Pastikan semua data
sudah benar sebelum disimpan.

Sesudah (satu kalimat):
Siapkan nama pelanggan, nama produk, jumlah, dan harga satuan.
```

Contoh penjelasan langkah:

```markdown
Sebelum (terlalu panjang):
Klik Kolom email lalu ketik alamat email yang dipakai saat mendaftar, lalu
klik Kolom kata sandi dan isi kata sandi, kemudian klik tombol Masuk untuk
mencoba masuk ke aplikasi.

Sesudah (singkat):
Isi Kolom email dan Kolom kata sandi, lalu klik Tombol Masuk.
```

Jika Explanation atau bagian lain terlalu panjang, pemecah menjadi beberapa
langkah, bukan memotong di tengah kalimat. Jalankan `npm run validate` untuk
melihat daftar bagian yang perlu dipangkas; peringatan tidak menghentikan build.