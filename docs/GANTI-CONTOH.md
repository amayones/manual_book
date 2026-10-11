# Mengganti Konten Contoh

Semua isi bawaan proyek ini berstatus CONTOH: halaman fiktif untuk "App Penjualan",
gambar mock, dan video contoh. Ganti semuanya dengan konten asli sebelum dipakai
sungguhan. Daftar di bawah menyebut setiap berkas contoh.

## Halaman contoh (hapus atau tulis ulang)

- `content/pages/00-beranda.md` — contoh halaman Beranda (isi tentang aplikasi).
- `content/pages/01-login.md` — contoh halaman Login.
- `content/pages/02-dashboard.md` — contoh halaman Dashboard.
- `content/pages/03-tambah-transaksi.md` — contoh halaman Tambah Transaksi.
- `content/pages/04-laporan-penjualan.md` — contoh halaman Laporan Penjualan.
- `content/pages/_template.md` — boleh dipertahankan sebagai acuan menulis.

Cara menambah halaman asli ada di `README.md` bagian (c).

## Gambar contoh (hapus)

- `content/assets/login/` — 3 gambar mock layar login.
- `content/assets/dashboard/` — 2 gambar mock dashboard.
- `content/assets/transaksi/` — 4 gambar mock formulir transaksi.
- `content/assets/laporan/` — 3 gambar mock laporan.

Setiap gambar mock memuat label kecil "CONTOH" di pojok kanan atas. Ganti dengan
screenshot aplikasi asli memakai nama berkas yang dirujuk Markdown. Validator
memberi peringatan bila ada gambar yang tidak dipakai halaman mana pun.

## Pengaturan contoh (ubah isinya)

- `content/config.mjs` — ganti `siteName`, `appName`, `appDescription`,
  `tagline`, `domain`, `appUrl`, `theme`, dan `groups`. Lihat `README.md`
  bagian (e).
- `content/changelog.md` — tulis ulang dengan riwayat perubahan manual asli.

## ID video contoh (ganti)

- `jNQXAC9IVRw` dan `aqz-KE-bpKQ` — video publik yang dipakai sebagai contoh.
  Ganti dengan ID video tutorial asli. Kartu bertuliskan "Video contoh" akan
  hilang dengan sendirinya setelah ID diganti.
- `VIDEO_ID_CONTOH` — alamat contoh pada halaman Login. Ganti dengan ID asli
  atau hapus blok videonya bila halaman itu tidak butuh video.

## Perintah cek cepat

Jalankan dari akar proyek untuk menemukan sisa konten contoh:

```bash
grep -r "CONTOH" content/ --include="*.md" | grep -v "_template.md"
grep -r "Video contoh" content/pages/
grep -r "contoh.com" content/pages/ content/assets/ 2>/dev/null
grep -r "jNQXAC9IVRw\|aqz-KE-bpKQ\|VIDEO_ID_CONTOH" content/pages/
```

Bila keempat perintah di atas tidak menghasilkan baris apa pun (di luar
`_template.md` yang memang boleh dipertahankan), konten contoh sudah bersih.
Akhiri dengan `npm run validate` dan `npm run build`.
