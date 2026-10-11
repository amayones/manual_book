// test/alat.mjs - alat bantu untuk membuat proyek sementara saat pengujian.
//
// Proyek sementara berisi config, satu folder halaman, dan satu gambar PNG
// sehingga validator dan build bisa diuji tanpa menyentuh proyek utama.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';

export const AKAR_PROYEK = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const FIXTURE = path.join(AKAR_PROYEK, 'test', 'fixtures', 'invalid');
export const FIXTURE_VALID = path.join(AKAR_PROYEK, 'test', 'fixtures', 'valid');

const CONFIG_UJI = `export default {
  siteName: 'Manual Uji',
  appName: 'App Uji',
  appDescription: 'Proyek uji otomatis.',
  tagline: 'Apa yang ingin Anda lakukan?',
  domain: 'uji.example.com',
  appUrl: 'https://app.uji.example.com',
  basePath: '',
  logoText: 'UJ',
  theme: { accent: '#2563eb', accentDark: '#60a5fa' },
  defaultLang: 'id',
  langs: { id: { label: 'Indonesia', dir: 'pages' } },
  groups: [
    { id: 'auth', label: 'Mulai', icon: 'rocket' },
    { id: 'dashboard', label: 'Penjualan', icon: 'grid' },
    { id: 'laporan', label: 'Laporan', icon: 'chart', tertunda: true },
  ],
  badges: { newDays: 30, updatedDays: 45 },
  budget: { appJsGzipKB: 22, cssGzipKB: 12, indexGzipKB: 6, jsonGzipWarnKB: 150 },
  features: { progress: false, glossary: false, feedback: false, learningPath: false },
  analytics: { cloudflareWebAnalytics: false, siteId: null },
  images: { format: 'webp', quality: 80, maxWidth: 1600, effort: 4, hashLength: 8, minWidth: 640 },
  youtube: { nocookie: true },
  specialPages: { changelog: true },
};
`;

const HALAMAN_INDUK = `---
title: Halaman Induk
group: dashboard
updated: 2026-01-10
summary: Halaman induk untuk pengujian.
---

## Panduan

### 1. Langkah pada halaman induk
![Gambar induk](/assets/induk/step-1.png)
Penjelasan singkat halaman induk.

## Video

::: video
### 1. Video induk
Penjelasan video induk.

https://www.youtube.com/watch?v=VIDEO_ID_CONTOH

Durasi: 1:00

- 00:00 → Pembuka
:::
`;

/** Membuat gambar PNG sederhana berukuran lebar tertentu. */
export async function buatGambar(lokasi, lebar = 1200, tinggi = 800, isi = '#ffffff') {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${lebar}" height="${tinggi}">`
    + `<rect width="${lebar}" height="${tinggi}" fill="${isi}"/>`
    + `<rect x="10" y="10" width="${lebar - 20}" height="${tinggi - 20}" fill="none" stroke="#334155" stroke-width="6"/></svg>`;
  fs.mkdirSync(path.dirname(lokasi), { recursive: true });
  await sharp(Buffer.from(svg)).png().toFile(lokasi);
  return lokasi;
}

const HALAMAN_UJI = `---
title: Halaman Uji
group: auth
updated: 2026-01-12
summary: Halaman uji kedua untuk pengujian otomatis.
---

## Panduan

### 1. Langkah pada halaman uji
![Gambar uji](/assets/uji/step-1.png)
Penjelasan singkat halaman uji.

### 2. Langkah kedua pada halaman uji
![Gambar uji kedua](/assets/uji/step-2.png)
::: pin
1. [50,30] Tombol contoh
:::
Penjelasan langkah kedua.
`;

/**
 * Membuat proyek sementara lengkap dengan folder dist sendiri.
 * Mengembalikan { akar, dist, bersih }.
 */
export async function buatProyekUji({ halaman = {}, denganGambar = true, denganSrc = true } = {}) {
  const akar = fs.mkdtempSync(path.join(os.tmpdir(), 'manual-uji-'));
  const dist = path.join(akar, 'dist');

  fs.mkdirSync(path.join(akar, 'content', 'pages'), { recursive: true });
  fs.mkdirSync(path.join(akar, 'public'), { recursive: true });
  fs.writeFileSync(path.join(akar, 'content', 'config.mjs'), CONFIG_UJI, 'utf8');
  fs.writeFileSync(path.join(akar, 'content', 'changelog.md'), '# Catatan Perubahan\n\n## 10 Januari 2026\n\n- Versi pertama.\n', 'utf8');

  if (denganGambar) {
    await buatGambar(path.join(akar, 'content', 'assets', 'uji', 'step-1.png'));
    await buatGambar(path.join(akar, 'content', 'assets', 'uji', 'step-2.png'));
    await buatGambar(path.join(akar, 'content', 'assets', 'induk', 'step-1.png'));
  }

  fs.writeFileSync(path.join(akar, 'content', 'pages', '02-induk.md'), HALAMAN_INDUK, 'utf8');
  fs.writeFileSync(path.join(akar, 'content', 'pages', '01-uji.md'), HALAMAN_UJI, 'utf8');
  for (const [nama, isi] of Object.entries(halaman)) {
    fs.writeFileSync(path.join(akar, 'content', 'pages', nama), isi, 'utf8');
  }

  if (denganSrc) {
    fs.mkdirSync(path.join(akar, 'src'), { recursive: true });
    fs.writeFileSync(path.join(akar, 'src', 'index.html'), INDEX_UJI, 'utf8');
    // Salin kode aplikasi sungguhan supaya hasil build proyek uji sama bentuknya.
    fs.copyFileSync(
      path.join(AKAR_PROYEK, 'src', 'router-core.mjs'),
      path.join(akar, 'src', 'router-core.mjs'),
    );
    fs.copyFileSync(
      path.join(AKAR_PROYEK, 'src', 'app.js'),
      path.join(akar, 'src', 'app.js'),
    );
    fs.writeFileSync(path.join(akar, 'src', 'styles.css'), '/* uji */\n.uji{color:#000}\n', 'utf8');
    fs.writeFileSync(path.join(akar, 'src', 'theme-boot.js'), '// uji\n', 'utf8');
    fs.writeFileSync(path.join(akar, 'public', 'favicon.svg'), '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><rect width="16" height="16" fill="#000"/></svg>', 'utf8');
    // Templat _headers ikut disalin supaya susunHeaders dapat dibaca dari proyek uji.
    fs.copyFileSync(
      path.join(AKAR_PROYEK, 'public', '_headers'),
      path.join(akar, 'public', '_headers'),
    );
  }

  return {
    akar,
    dist,
    bersih: () => fs.rmSync(akar, { recursive: true, force: true }),
  };
}

export const INDEX_UJI = `<!doctype html>
<html lang="id" data-theme="auto" data-json="{{DATA_JSON}}" data-json-semua="{{DATA_JSON_SEMUA}}">
<head>
<meta charset="utf-8">
<title>{{TITLE}}</title>
<meta name="description" content="{{APP_DESCRIPTION}}">
<link rel="icon" href="{{FAVICON}}" type="image/svg+xml">
<script src="{{THEME_BOOT}}"></script>
<link rel="stylesheet" href="{{APP_CSS}}">
</head>
<body>
{{SPRITE}}
<main id="isi">{{APP_NAME}}</main>
<script src="{{APP_JS}}" defer></script>
{{ANALYTICS}}
</body>
</html>
`;

/**
 * Mengganti seluruh halaman proyek sementara dengan fixture satu aturan,
 * lalu menyalinnya ke folder pages memakai nama berkas yang diminta.
 */
export function pasangFixture(proyek, aturan) {
  kosongkanHalaman(proyek);
  const namaTujuan = aturan.salinFO ?? aturan.berkas;
  if (namaTujuan.length !== aturan.berkas.length) {
    throw new Error(`fixture ${aturan.nama}: jumlah berkas tujuan tidak sama dengan jumlah sumber`);
  }
  for (let i = 0; i < aturan.berkas.length; i += 1) {
    const isi = fs.readFileSync(path.join(aturan.folder ?? FIXTURE, aturan.berkas[i]), 'utf8');
    fs.writeFileSync(path.join(proyek.akar, 'content', 'pages', namaTujuan[i]), isi, 'utf8');
  }
}

/** Menghapus seluruh halaman proyek sementara. */
export function kosongkanHalaman(proyek) {
  const folder = path.join(proyek.akar, 'content', 'pages');
  for (const nama of fs.readdirSync(folder)) {
    fs.rmSync(path.join(folder, nama), { force: true });
  }
}

/** Membaca daftar aturan dari test/aturan-validator.json. */
export function bacaAturan() {
  return JSON.parse(fs.readFileSync(path.join(AKAR_PROYEK, 'test', 'aturan-validator.json'), 'utf8')).aturan;
}
