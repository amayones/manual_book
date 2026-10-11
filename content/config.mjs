// content/config.mjs - pengaturan global untuk manual ini.
//
// CARA MEMAKAI MANUAL INI UNTUK APLIKASI LAIN:
// salin folder proyek ini, lalu ganti file ini dan isi folder content/.
// Kode di scripts/ dan src/ tidak perlu diubah sama sekali.
//
// Lima hal yang paling sering diubah ada di bagian paling atas file ini:
// siteName, appName, tagline, theme.accent, dan groups.
// Semua pengaturan lain boleh dibiarkan apa adanya.

export default {
  // -- Identitas --
  siteName: 'Manual Book',
  appName: 'App Penjualan',
  appDescription: 'Panduan lengkap memakai App Penjualan.',
  tagline: 'Apa yang ingin Anda lakukan?',
  domain: 'manual.domain.com',
  appUrl: 'https://app.contoh.com', // Alamat aplikasi yang dijelaskan; tampil di bilah bingkai screenshot.
  basePath: '', // Isi '/' atau '/manual/' bila dipasang pada subdirektori.
  logoText: 'MB',

  // -- Tampilan --
  theme: {
    accent: '#2563eb', // Warna utama: tombol, tautan, sorotan.
    accentDark: '#60a5fa', // Warna aksen saat mode gelap.
  },
  defaultLang: 'id',

  // -- Bahasa --
  // Menambah bahasa cukup dengan menambah satu baris lalu membuat foldernya,
  // misalnya folder content/pages.en/ berisi berkas .md dengan nama yang sama.
  langs: {
    id: { label: 'Indonesia', dir: 'pages' },
    // en: { label: 'English', dir: 'pages.en' },
  },

  // -- Grup menu di sidebar --
  // Setelan tertunda: true berarti grup ini sengaja disiapkan lebih dulu dan
  // tidak complained apabila belum ada halaman yang memakainya.
  groups: [
    // Halaman Beranda (00-beranda.md) memakai group: none sehingga tidak
    // muncul di bawah grup mana pun; menu Beranda dibuat otomatis di sidebar.
    { id: 'dashboard', label: 'Penjualan', icon: 'grid' },
    // Grup Laporan aktif karena sudah dipakai halaman 04-laporan-penjualan.
    { id: 'laporan', label: 'Laporan', icon: 'chart' },
  ],

  // -- Halaman khusus --
  specialPages: { changelog: true }, // Halaman ini dibangun dari content/changelog.md.

  // -- Badge tanggal (aktif di versi 1, tanpa penyimpanan di browser) --
  // "Baru" hanya bila since terisi; "Diperbarui" bila updated masih segar.
  badges: {
    newDays: 30, // "Baru": since terisi dan jaraknya ke hari ini <= 30 hari.
    updatedDays: 45, // "Diperbarui": jarak updated ke hari ini <= 45 hari.
  },

  // -- Anggaran ukuran (dihitung GZIP, build berhenti jika lewat) --
  budget: {
    appJsGzipKB: 22, // Batas app.js (hasil minify esbuild)
    cssGzipKB: 12, // Batas styles.css (hasil minify esbuild)
    indexGzipKB: 6, // Batas index.html (termasuk sprite ikon)
    jsonGzipWarnKB: 150, // Peringatan bila data JSON membesar.
  },

  // -- Fitur tahap 2 --
  // Hanya prepare flag. Kode dan tampilannya BELUM dibuat.
  // Nyalakan satu per satu ketika fiturnya sudah dikerjakan.
  features: {
    progress: false, // Centang "sudah dibaca".
    glossary: false, // Tooltip istilah.
    feedback: false, // "Apakah ini membantu?"
    learningPath: false, // Jalur belajar "Mulai dari sini".
  },

  // -- Integrasi --
  // Cloudflare Web Analytics tidak memakai cookie dan tidak membutuhkan banner.
  analytics: {
    cloudflareWebAnalytics: false,
    siteId: null, // Isi dengan ID dari dashboard Cloudflare.
  },

  // -- Gambar --
  images: {
    format: 'webp',
    quality: 80,
    maxWidth: 1600, // Sisi terpanjang maksimal, dalam piksel.
    effort: 4,
    hashLength: 8, // Panjang hash isi pada nama file hasil konversi.
    minWidth: 640, // Peringatan bila gambar lebih kecil dari ini.
  },

  // -- Video --
  youtube: { nocookie: true }, // Thumbnail diambil dari i.ytimg.com.
};
