# Daftar Uji Manual

Pengujian otomatis ada di `npm test` (135 pengujian). Skenario browser
otomatis (Playwright, Chromium headless, dijalankan dari luar proyek)
mencakup M2, M3, dan M5 — hasilnya di bawah. Berkas ini berisi pemeriksaan
manual untuk hal yang belum bisa diuji otomatis.

## Sudah diverifikasi otomatis

M2/M3 (43 skenario, semua lulus):
URL selalu `/`, Back/Forward, refresh memulihkan posisi, deep link dan
pembersihannya, halaman tidak dikenal beserta saran, pencarian dan `<mark>`,
posisi pin pada 360 px dan 1440 px, tab, callout, tombol salin dan toast,
sidebar dan laci, tema, dan nol galat console.

V1c (beranda jadi halaman, cari di navbar dan di beranda, tema dua mode,
jendela yang bisa digeser), 48 skenario semuanya lulus: `/` membuka halaman
Beranda; hero tidak ada lagi; pencarian di header menyatu setinggi 44 px di
kanan navbar dan menyaring tanpa pindah halaman; pencarian besar di Beranda
memakai panel hasilnya sendiri, tidak menyentuh panel navbar, panel disembunyikan
bila tidak ada hasil; `Ctrl+K` dan garis miring memfokuskan pencarian; judul
halaman tidak menampilkan cincin fokus; tema hanya `light` dan `dark` dan
pilihan bertahan setelah muat ulang; tidak ada nilai `auto` di halaman; menu
Beranda di paling atas sidebar; tidak ada baris "Lanjutkan" maupun "Riwayat";
bintang tidak lagi tampil di sidebar; jendela punya dua tombol ikon saja dengan
nama aksesibel "Perbesar ke layar penuh" dan "Tutup"; tombol "Ukuran asli"
tidak ada dan gambar otomatis pas layar; maximize mengisi layar dan Esc
memulihkan sebelum menutup; jendela bisa digeser lewat judul dan tidak pernah
keluar layar; tutup mengembalikan fokus ke tombol pemicu; tautan tanpa `p`
memulihkan posisi baca terakhir dari `sessionStorage`.

M4/M5/M6 — skenario tambahan (35 skenario, semua lulus):
1. Lightbox terbuka dari tombol gambar; penghitung "1 / 3" dan judul langkah
   tampil; lapisan pin ikut tampil (3 pin pada langkah 1).
2. Panah berikutnya/sebelumnya dan panah keyboard berpindah gambar.
3. Esc menutup; fokus kembali ke tombol pemicu.
4. Zoom berganti label menjadi "Pas layar".
5. Daftar isi tampil di 1280 px (3 item: tiga langkah Login) setelah blok
   "Sebelum mulai", "Hasil akhir", dan "Masalah" dihapus; menyorot item
   yang dibaca; klik menggulir; disembunyikan di bawah 1200 px.
6. `?p=changelog` membuka Catatan Perubahan dari `content/changelog.md`;
   URL dibersihkan; Back/Forward berfungsi; tautan sidebar berfungsi.
7. Deep link `tab=video&s=2` membuka tab Video; `s=2` di luar 1 video
   diabaikan tanpa sorot; `s=1` menyorot video pertama dan fokus ke judulnya.
8. Setiap video punya tombol salin link video.
9. Video ber-ID valid (`aaaaaaaaaaa`): thumbnail tampil, iframe belum ada
   sebelum diklik, klik membuat iframe `youtube-nocookie.com/embed/...`
   dengan `enablejsapi=1` dan `autoplay=1`, klik bab memanggil postMessage
   `seekTo` dengan detik yang benar ke iframe yang sama. Thumbnail
   disembunyikan saat iframe muncul (kelas `video-berjalan`), jadi kartu
   video tidak menjadi dobel: tinggi kartu sebelum dan sesudah klik sama
   (460 px -> 460 px). Pemutaran YouTube sungguhan belum diuji (butuh
   jaringan dan akun).
10. `prefers-reduced-motion: reduce` terdeteksi; durasi animasi kartu `0s`.
11. Lebar 320 px: kelebihan 0 px (tidak ada scroll horizontal).
12. Tema dark (`rgb(10, 15, 26)`) dan light (`rgb(246, 247, 251)`) diterapkan.
13. Nol pelanggaran CSP dan galat (tiga 404 yang tercatat hanya
    `/favicon.ico` bawaan browser dan `/__dev/reload` pada server uji
    statis; keduanya jinak dan dijelaskan di laporan).

V1d (video tidak dobel + tampilan mobile, 36 skenario, semua lulus):

1. Sebelum diklik hanya thumbnail yang tampil; setelah diklik iframe muncul,
   thumbnail `display: none`, dan tinggi kartu tidak berubah.
2. Klik bab video juga menyembunyikan thumbnail, bukan hanya tombol "Putar".
3. Lebar 320, 360, 390, 430, dan 768 px: header tetap satu baris
   (56 px, di 768 px 57 px) dan tinggi itu ditulis ke `--tinggi-bilah`, jadi
   `padding-top` halaman, posisi laci, dan lompatan antarbagian tetap pas.
4. Konten tidak tertutup header di semua lebar tersebut (ikon halaman mulai
   di y=72 px, di bawah header 56 px).
5. Pencarian tetap ada di navbar pada 320-430 px dengan lebar 145-255 px dan
   tinggi 44 px, serta tidak keluar layar.
6. Tombol Menu dan brand jadi ikon 44 x 44 px di bawah 700 px; nama brand
   disembunyikan secara visual tetapi masih dibaca pembaca layar.
7. Font isi di 360 px mengecil ke 16 px; tidak ada scroll horizontal.
8. Huruf diperbesar 150% dan 200%: tinggi header ikut_naik (69 px dan
   91 px) dan `padding-top` menyesuaikan, tidak ada konten tertutup. Ini
   thanks pengaman `sinkronTinggiBilah()` yang menulis `--tinggi-bilah`
   dari tinggi header sebenarnya memakai ResizeObserver.
9. Laci menu terbuka utuh di 360 px (lebar 310 px, tidak keluar layar) dan
   pencarian navbar tetap berfungsi setelah laci ditutup.
10. Lighthouse mode seluler di Beranda dan di halaman video: performa 99,
    aksesibilitas 100, praktik terbaik 100, SEO 100, CLS 0.

V1e (hapus chip menit dan level, tombol menu digayakan, 48 skenario, semua
lulus):

1. Kepala halaman tidak lagi punya `.halaman-chip` maupun `.tingkat-batang`,
   dan teks "2 menit" hilang; isinya hanya ikon, baris judul, dan ringkasan.
2. Kartu Beranda tidak lagi punya `.kartu-meta` dan teks "menit" hilang;
   isinya hanya kepala kartu dan ringkasan.
3. Tombol Menu di navbar: ikon 23px lebih besar dari huruf "Menu" 13px
   (lewat variabel `--t-label`), latar `rgb(37, 99, 235)` berbeda dari tombol
   tema `rgb(241, 245, 249)`, teks putih, tinggi tetap 44px, nama aksesibel
   "Buka menu".
4. Tombol Tutup di dalam laci memakai latar dan warna yang sama dengan tombol
   Menu, ikon 21px lebih besar dari huruf "Tutup" 13px.
5. Audit Lighthouse `label-content-name-mismatch` pada pin screenshot juga
   diperbaiki: nama aksesibel pin kini "Lokasi 1: Kolom email", jadi memuat
   angka yang terlihat di dalam pin. Aksesibilitas halaman Login kembali 100.
6. Tidak ada regresi pada seluruh lebar 320 sampai 1440px, tidak ada scroll
   horizontal, dan nol galat JavaScript.

V1f (kartu Beranda dihapus dan hierarki sidebar, 65 skenario, semua lulus):

1. Beranda tidak lagi memakai `.kartu`, `.kelompok-kartu`, atau
   `.kartu-daftar`. Isinya hanya `pembuka` (logo, judul, tagline, pencarian
   besar) lalu `pembuka-isi` yang memuat satu bagian "Tentang aplikasi ini".
2. Bagian "Ke mana Anda pergi" dihapus dari `00-beranda.md` dan tidak muncul
   lagi di teks halaman.
3. Sidebar lebar 260 px dengan padding 12 px.
4. Kategori dan Beranda: tinggi 40 px, huruf 14 px, bobot 600, ikon 18 px.
   Menu anak: tinggi 32 px, huruf 13 px, bobot 400, ikon 15 px. Chevron 14 px.
5. Menu anak menjorok 21 px dari kategori, padding kiri 12 px, garis pemandu
   1 px di sisi kiri.
6. Item aktif punya garis aksen 2 px (warna `rgb(37, 99, 235)`) yang menempel
   pada garis pemandu, latar biru 15%, teks dan ikon biru terang.
7. Atribut aksesibilitas: `aria-expanded` pada tombol kategori, `aria-controls`
   menunjuk ke pembungkus daftar, `aria-current="page"` pada menu aktif, dan
   `Beranda` tidak aktif ketika halaman lain dibuka.
8. Kategori dengan anak aktif terbuka otomatis: saat membuka Laporan
   Penjualan, grup Laporan terbuka (tinggi 32 px) dan grup Penjualan tetap
   tertutup (tinggi 0 px, `inert`).
9. Menu anak pada grup tertutup tidak dapat difokuskan.
10. Item "Catatan Perubahan" tetap 40 px, huruf 16 px, ikon 18 px — tidak
    diubah mengikuti gaya sidebar yang baru.
11. Perbaikan terkait: aturan `[data-theme="dark"] a` kini mengecualikan
    `.menu-item` karena sebelumnya menimpa warna hierarki sidebar.
12. Lighthouse mode seluler di Beranda dan Login: aksesibilitas 100,
    praktik terbaik 100, SEO 100, CLS 0, performa 98 sampai 100.

Verifikasi sessionStorage eksplisit (7 skenario, semua lulus):
`/?p=login&s=2` mengisi `mb:last` (`login`, langkah 2); `/?p=halaman-salah`
tidak mengubah `mb:last`; refresh menampilkan pemulihan sesi (Login),
bukan layar galat; URL tetap bersih.

Lighthouse (Chromium sistem, `npx lighthouse`, tanpa menambah dependensi):
Performance 99, Accessibility 100, Best Practices 100, SEO 100, CLS 0
di mode seluler (viewport 360 px) maupun desktop. Tidak ada lagi pergeseran
layout saat dimuat karena tinggi header ditulis ke `--tinggi-bilah` sebelum
gambar pertama tampil.

Rasio kontras (`node scripts/kontras.mjs`): 27 pasangan warna LULUS pada
batas 4.5:1, tema terang dan gelap, termasuk aksen, callout, lencana, pin,
dan toast. Nilai terendah: 4.51:1 (lencana Diperbarui, terang) dan 4.57:1
(lencana Baru, terang).

## Perintah yang sudah berjalan tanpa error

1. `npm install` lalu `npm run dev` berjalan tanpa error.
2. `npm run build` menghasilkan folder `dist/` berisi `index.html`, `_headers`,
   JavaScript, CSS, dan berkas JSON yang namanya memuat hash isi.
3. `npm run validate` melaporkan jumlah halaman, langkah, dan video.
4. `npm run size` menampilkan ukuran gzip setiap berkas di dalam anggaran
   (app.js 11.3/22 KB, styles.css 5.9/12 KB, theme-boot 0.5/1 KB,
   index.html 3.7/6 KB).
5. `npm test`: 135 pengujian lulus.
6. `node scripts/kontras.mjs`: 27 pasangan warna lulus pada 4.5:1.
7. Lighthouse (Chromium, localhost): median performa 99, aksesibilitas 100,
   praktik terbaik 96, SEO 100, CLS 0. Angka 96 itu hanya karena probe
   muat-ulang `/__dev/reload` yang aktif di localhost saling jawab 404;
   saat diukur tanpa probe itu (host selain localhost) skornya 100.

Skenario browser perlu dijalankan ulang setiap kali `src/` berubah.

## Perlu diuji manual

### Setelah deploy ke Cloudflare Pages

- Periksa header jawaban memakai `curl -I`:
  - `/assets/app.<hash>.js` dan `/data/id.<hash>.json` harus memuat
    `Cache-Control: public, max-age=31536000, immutable`.
  - `/` harus memuat `Cache-Control: public, max-age=0, must-revalidate`.
  - Tidak boleh ada `script-src 'unsafe-inline'` atau `style-src 'unsafe-inline'`.
- Ketik `manual.domain.com/login` langsung di address bar. Sampaikan hasilnya:
  bila muncul 404 bawaan Pages, berarti perilaku "Pages menyajikan index.html
  untuk path apa pun" tidak terjadi dan perlu penanganan `404.html` pada M7.
- Muat `/?p=login&s=2` dari tab baru dan pastikan JSON yang dipakai selalu
  versi terbaru setelah konten diperbarui (buka DevTools, nonaktifkan cache,
  periksa nama berkas JSON di tab Network).

### Browser dan perangkat

- Safari dan Firefox versi terbaru: klik, tab, pencarian, video, lightbox.
- iOS Safari: laci menu, pin, tema, dan gestur geser lightbox.
- Android Chrome: sentuh lingkaran pin dengan jari, cek tooltip muncul
  (area sentuh 44 px, lingkaran visual 28 px).
- Throttle "Slow 3G": hero statis langsung tampil sebelum data datang.

### Gerak dan aksesibilitas

- Setelan sistem "kurangi gerak" aktif: tidak ada animasi dan gulir langsung.
- Hanya keyboard: Tab/Shift+Tab, panah pada tab, panah atas/bawah+Enter/Esc di
  pencarian, Escape menutup laci, fokus selalu terlihat.
- Lighthouse sudah dijalankan lokal (99/100/100/100, CLS 0 di mode seluler).
  Setelah deploy, jalankan ulang dan pastikan tidak turun; CLS idealnya
  mendekati nol.
- Pembaca layar (NVDA atau VoiceOver): tab, jumlah hasil pencarian, toast,
  dialog lightbox, dan daftar isi.

### Video YouTube

Untuk saat ini hanya ada kartu contoh `VIDEO_ID_CONTOH`.
Setelah ada video asli:
- Klik tombol putar: iframe `youtube-nocookie.com/embed/...&enablejsapi=1`
  hanya muncul setelah diklik.
- Klik sebuah bab: video melompat ke detik yang benar tanpa iframe dimuat ulang.
- Di HP, putaran video berhenti saat tab diganti (perilaku iframe dihapus).