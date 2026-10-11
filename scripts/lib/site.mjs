// Mengubah Markdown menjadi HTML per bagian halaman, merakit data JSON,
// lalu menulis seluruh isi dist: index.html, aset ber-hash, data JSON
// ber-hash, dan berkas _headers.
//
// Peta gambar belum tersedia pada tahap render, sehingga gambar ditulis sebagai
// placeholder {{img:path}}. Placeholder diganti nama ber-hash-nya setelah
// konversi WebP selesai.

import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { gzipSync } from 'node:zlib';

import {
  CALLOUT,
  PLACEHOLDER_ID,
  formatDetik,
  gambarKeHtml,
  mdKeHtml,
  parsePin,
  parseUrlYoutube,
  urlEmbed,
  urlThumbnail,
} from './directives.mjs';
import { esc, slug } from './markdown.mjs';
import { bangunSprite } from './icons.mjs';
import { buangBlok } from './readtime.mjs';
import { hashIsi } from './hash.mjs';
import { susunHeaders, skripAnalytics } from './headers.mjs';

function namaGrupJudul(grupId, config) {
  return config.groups.find((g) => g.id === grupId)?.label ?? grupId;
}

function renderPin(blok) {
  if (!blok) return '';
  const daftar = parsePin(blok.isi, blok.baris + 1);
  const butir = daftar.map((p) => {
    const label = esc(p.label ?? '');
    return `<li class="pin-item" data-x="${p.x}" data-y="${p.y}">`
      + `<button class="pin" type="button" data-action="pin" tabindex="0" aria-label="Lokasi ${label}">`
      + `<span class="pin-angka">${p.nomor}</span>`
      + `<span class="pin-label">${label}</span></button></li>`;
  });
  return `<ul class="pin-daftar">${butir.join('')}</ul>`;
}

const IKON_CALLOUT = { tip: 'lightbulb', warn: 'warning', note: 'info' };

function ikonPakai(nama) {
  return `<svg class="ikon" aria-hidden="true" focusable="false"><use href="#i-ui-${nama}"></use></svg>`;
}

function renderCallout(tipe, isi) {
  const isiHtml = mdKeHtml(isi);
  if (!isiHtml) return '';
  return `<aside class="callout callout-${tipe}">`
    + `<span class="callout-ikon">${ikonPakai(IKON_CALLOUT[tipe] ?? 'info')}</span>`
    + `<p class="callout-judul">${CALLOUT[tipe] ?? tipe}</p>`
    + `<div class="callout-isi">${isiHtml}</div>`
    + `</aside>`;
}

/** Merakit HTML langkah, termasuk bingkai browser, gambar, dan pin. */
function renderLangkah(halaman, langkah, config) {
  const pin = (langkah.blok ?? []).find((b) => b.tipe === 'pin');

  let bingkai = '';
  if (langkah.gambar) {
    bingkai = gambarKeHtml(langkah.gambar, `{{img:${langkah.gambar.path}}}`, {
      situs: config.appUrl,
      langkah: langkah.n,
      pin: renderPin(pin),
    });
  }

  const calloutHtml = (langkah.blok ?? [])
    .filter((b) => CALLOUT[b.tipe])
    .map((b) => renderCallout(b.tipe, b.isi))
    .filter(Boolean);

  const teksHtml = mdKeHtml(buangSemuaBlok(langkah));
  const judulHtml = mdKeHtml(langkah.judul).replace(/^<p>|<\/p>$/g, '');

  return `<article class="langkah" id="langkah-${langkah.n}" data-langkah="${langkah.n}">`
    + `<h3 class="langkah-judul" id="langkah-${langkah.n}-judul">`
    + `<span class="langkah-nomor" aria-hidden="true">${langkah.n}</span>`
    + `<span class="langkah-teks-judul">${judulHtml}</span>`
    + `<button class="tombol-salin" type="button" data-action="salin-langkah" `
    + `data-halaman="${halaman.id}" data-langkah="${langkah.n}" `
    + `aria-label="Salin link langkah" title="Salin link langkah">`
    + `<svg class="ikon" aria-hidden="true" focusable="false"><use href="#i-ui-copy"></use></svg></button>`
    + `</h3>`
    + (bingkai ? `<div class="langkah-gambar">${bingkai}</div>` : '')
    + `<div class="langkah-teks">${teksHtml}</div>`
    + (calloutHtml.length ? `<div class="langkah-callout">${calloutHtml.join('')}</div>` : '')
    + `</article>`;
}

/**
 * Menghapus blok ::: beserta isinya dan baris gambar dari teks langkah.
 * Baris gambar sudah dirender terpisah sebagai bingkai screenshot, jadi
 * tidak boleh ikut muncul dua kali.
 */
function buangSemuaBlok(langkah) {
  const buang = new Set();
  for (const b of langkah.blok ?? []) {
    for (let n = b.baris; n <= b.barisAkhir; n += 1) buang.add(n);
  }
  if (buang.size === 0 && langkah.gambarJumlah === 0) return langkah.isi;

  const polaGambar = /^!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)\s*$/;
  return langkah.isi
    .split(/\r?\n/)
    .filter((baris, indeks) => {
      const noBaris = langkah.barisIsi + indeks;
      return !buang.has(noBaris) && !polaGambar.test(baris.trim());
    })
    .join('\n')
    .trim();
}

/** Merakit HTML satu halaman untuk sebuah bahasa. */
export function renderHalaman(halaman, config) {
  const bagianLain = halaman.bagian.filter((b) => !['panduan', 'video', 'troubleshooting'].includes(b.judul.trim().toLowerCase()));

  const langkahHtml = halaman.langkah.map((l) => renderLangkah(halaman, l, config)).join('\n');

  const videoHtml = halaman.videos.map((video, i) => renderVideo(video, i + 1, halaman.id)).join('\n');
  const masalahHtml = halaman.problems.map((p, i) => renderProblem(p, i + 1)).join('\n');

  return {
    id: halaman.id,
    title: halaman.title,
    group: halaman.group,
    groupLabel: namaGrupJudul(halaman.group, config),
    order: halaman.order,
    icon: halaman.icon,
    iconDariGrup: halaman.iconDariGrup,
    level: halaman.level,
    readTime: Number(halaman.frontmatter.readTime ?? halaman.readTime),
    readTimeOtomatis: !(Number.isInteger(Number(halaman.frontmatter.readTime)) && Number(halaman.frontmatter.readTime) > 0),
    updated: halaman.updated,
    since: halaman.since,
    summary: halaman.summary,
    tags: halaman.tags,
    featured: halaman.featured,
    kata: halaman.kata,
    sebelum: bagianLain.find((b) => b.judul.trim().toLowerCase() === 'sebelum mulai')?.isi ?? '',
    sesudah: bagianLain.find((b) => b.judul.trim().toLowerCase() === 'hasil akhir')?.isi ?? '',
    bagianLain: bagianLain
      .filter((b) => !['sebelum mulai', 'hasil akhir'].includes(b.judul.trim().toLowerCase()))
      .map((b) => ({ judul: b.judul, id: slug(b.judul), html: mdKeHtml(b.isi) })),
    langkah: halaman.langkah.map((l) => ({
      n: l.n,
      judul: l.judul,
      id: `langkah-${l.n}`,
      gambar: l.gambar ? { path: l.gambar.path, alt: l.gambar.alt } : null,
      pin: (l.pin?.isi ?? '').trim(),
    })),
    htmlLangkah: langkahHtml,
    htmlVideo: videoHtml,
    htmlMasalah: masalahHtml,
    htmlSebelum: mdKeHtml(halaman.bagian.find((b) => b.judul.trim().toLowerCase() === 'sebelum mulai')?.isi ?? ''),
    htmlHasil: mdKeHtml(halaman.bagian.find((b) => b.judul.trim().toLowerCase() === 'hasil akhir')?.isi ?? ''),
    videos: halaman.videos.map((v) => ({
      judul: v.judul,
      id: parseUrlYoutube(v.tautan)?.id ?? '',
      placeholder: parseUrlYoutube(v.tautan)?.id === PLACEHOLDER_ID,
      durasi: v.durasi && !v.durasi.salah ? formatDetik(v.durasi.detik) : null,
      bab: v.bab.map((b) => ({ waktu: b.waktu, detik: b.detik, label: b.label })),
    })),
    problems: halaman.problems,
    // Tempat data untuk tahap 2. Belum ada kode maupun tampilannya.
    glossary: [],
    feedback: null,
    search: {
      ringkas: `${halaman.title}. ${halaman.summary}`,
      istilah: istilahKunci(buangBlok(halaman.raw).replace(/```[\s\S]*?```/g, ' ')),
    },
  };
}

function renderVideo(video, nomor, halamanId) {
  const hasilUrl = parseUrlYoutube(video.tautan);
  const id = hasilUrl?.id ?? '';
  const placeholder = id === PLACEHOLDER_ID;
  const durasi = video.durasi && !video.durasi.salah ? formatDetik(video.durasi.detik) : null;
  const judulHtml = mdKeHtml(video.judul).replace(/^<p>|<\/p>$/g, '');
  const judulTeks = judulHtml.replace(/<[^>]+>/g, '');
  const penjelasanHtml = mdKeHtml(video.penjelasan);

  const babHtml = video.bab.length
    ? `<ul class="video-bab">${video.bab.map((b) => `<li><button class="video-bab-item" `
      + `type="button" data-action="lompat-bab" data-detik="${b.detik}">`
      + `<span class="video-bab-waktu">${esc(b.waktu)}</span>`
      + `<span class="video-bab-label">${esc(b.label)}</span></button></li>`).join('')}</ul>`
    : '';

  let kartu;
  if (placeholder) {
    kartu = `<p class="video-contoh">Video contoh. Ganti ID VIDEO_ID_CONTOH dengan ID YouTube asli pada berkas Markdown.</p>`;
  } else {
    kartu = `<div class="video-kartu">`
      + `<div class="video-thumb">`
      + `<img class="video-gambar" src="${urlThumbnail(id)}" alt="Thumbnail video ${esc(judulTeks)}" `
      + `loading="lazy" decoding="async">`
      + `<button class="video-putar" type="button" data-action="putar-video" `
      + `aria-label="Putar video ${esc(judulTeks)}">Putar</button>`
      + (durasi ? `<span class="video-durasi">${durasi}</span>` : '')
      + `</div>`
      + `<div class="video-player" data-embed="${urlEmbed(id, hasilUrl.mulaiDetik)}"></div>`
      + babHtml
      + `</div>`;
  }

  return `<article class="video" data-video-id="${esc(id)}" data-video-nomor="${nomor}">`
    + `<h3 class="video-judul" id="video-${nomor}-judul">`
    + `<span class="langkah-nomor" aria-hidden="true">${nomor}</span>`
    + `<span class="video-teks-judul">${judulHtml}</span>`
    + `<button class="tombol-salin" type="button" data-action="salin-video" `
    + `data-halaman="${esc(halamanId)}" data-video="${nomor}" `
    + `aria-label="Salin link video" title="Salin link video">`
    + `<svg class="ikon" aria-hidden="true" focusable="false"><use href="#i-ui-copy"></use></svg></button>`
    + `</h3>`
    + `<div class="video-teks">${penjelasanHtml}</div>`
    + kartu
    + `</article>`;
}

function renderProblem(problem, nomor) {
  const isi = (teks) => mdKeHtml(teks) || '<p>Belum diisi.</p>';
  const judulMasalah = mdKeHtml(problem.masalah).replace(/^<p>|<\/p>$/g, '');
  return `<details class="masalah">`
    + `<summary class="masalah-ringkas"><span class="masalah-label">${ikonPakai('warning')}Masalah</span>`
    + `<span class="masalah-judul">${judulMasalah}</span></summary>`
    + `<div class="masalah-isi">`
    + `<div class="masalah-baris"><p class="masalah-nama">${ikonPakai('search')}Penyebab</p>`
    + `<div class="masalah-teks">${isi(problem.penyebab)}</div></div>`
    + `<div class="masalah-baris"><p class="masalah-nama">${ikonPakai('check')}Solusi</p>`
    + `<div class="masalah-teks">${isi(problem.solusi)}</div></div>`
    + `</div></details>`;
}

/** Membangun indeks pencarian ringan dari daftar halaman. */
export function bangunIndeksPencarian(daftarHalamanJson) {
  const indeks = {};
  const tambah = (teks, entri) => {
    for (const istilah of istilahKunci(teks)) {
      indeks[istilah] ??= [];
      indeks[istilah].push(entri);
    }
  };
  for (const h of daftarHalamanJson) {
    tambah(h.title, { p: h.id, n: 0, b: 10 });
    for (const tag of h.tags) tambah(tag, { p: h.id, n: 0, b: 4 });
    for (const langkah of h.langkah) {
      tambah(langkah.judul, { p: h.id, n: langkah.n, b: 5 });
    }
    for (const v of h.videos) tambah(v.judul, { p: h.id, n: 0, b: 3 });
    for (const bagian of h.bagianLain) tambah(bagian.judul, { p: h.id, n: 0, b: 2 });
    for (const istilah of h.search?.istilah ?? []) {
      tambah(istilah, { p: h.id, n: 0, b: 1 });
    }
  }
  return indeks;
}

/** Memecah teks menjadi istilah kecil yang siap dicari, dibatasi 60 istilah per halaman. */
export function istilahKunci(teks) {
  return String(teks || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, ' ')
    .split(/\s+/)
    .filter((k) => k.length > 2)
    .slice(0, 60);
}

/** Merakit objek data lengkap untuk satu bahasa. */
export function bangunData({ config, bahasa, daftarHalaman, indeks, changelog, tanggalBuild }) {
  return {
    meta: {
      siteName: config.siteName,
      appName: config.appName,
      appDescription: config.appDescription,
      tagline: config.tagline,
      logoText: config.logoText,
      appUrl: config.appUrl,
      basePath: config.basePath,
      domain: config.domain,
      buildDate: tanggalBuild,
      defaultLang: config.defaultLang,
      langs: config.langs,
      groups: config.groups,
      badges: config.badges,
      sidebar: { markFeatured: config.sidebar?.markFeatured !== false },
      analytics: Boolean(config.analytics.cloudflareWebAnalytics && config.analytics.siteId),
    },
    // Kunci ini disiapkan untuk tahap 2. Nilainya kosong dan belum dipakai.
    features: {},
    changelog: changelog ?? null,
    searchIndex: indeks,
    pages: daftarHalaman,
  };
}
// Menulis seluruh isi dist: index.html, aset ber-hash, data JSON ber-hash,
// berkas _headers, dan favicon.

/** Normalisasi basePath menjadi "/" atau "/manual/". */
export function basePathNormal(basePath) {
  if (!basePath || basePath === '/') return '/';
  const bersih = `/${String(basePath).replace(/^\/+|\/+$/g, '')}/`;
  return bersih;
}

function ganti(tpl, nilai) {
  return String(tpl).replace(/\{\{\s*([A-Z_]+)\s*\}\}/g, (_, kunci) => (nilai[kunci] ?? ''));
}

/**
 * Menyalin satu berkas sumber ke dist dengan nama ber-hash isi.
 * Mengembalikan lokasi relatif di dist dan ukuran gzip-nya.
 */
export async function salinBerHash({ sumber, folderDist, namaBasis, ekstensi }) {
  const data = await fsp.readFile(sumber);
  return tulisBerHash({ data, folderDist, namaBasis, ekstensi });
}

/** Menulis data atau teks ke dist dengan nama ber-hash isi. */
export async function tulisBerHash({ data, folderDist, namaBasis, ekstensi }) {
  const isi = Buffer.isBuffer(data) ? data : Buffer.from(String(data), 'utf8');
  const hash = hashIsi(isi, 8);
  const nama = `${namaBasis}.${hash}.${ekstensi}`;
  const tujuan = path.join(folderDist, 'assets', nama);
  await fsp.mkdir(path.dirname(tujuan), { recursive: true });
  await fsp.writeFile(tujuan, isi);
  return {
    nama: `assets/${nama}`,
    bytes: isi.length,
    gzip: gzipSync(isi, { level: 9 }).length,
  };
}

/**
 * Menggabungkan src/router-core.mjs dan src/app.js menjadi satu berkas,
 * lalu minify dengan esbuild.
 *
 * 1. router-core dibaca sebagai modul ES yang bisa diuji dari Node.
 * 2. Kata kunci export pada baris awal deklarasi dihapus.
 * 3. Isinya dibungkus fungsi agar tidak bocor ke lingkup global.
 * 4. Daftar nama fungsi yang dipakai app.js dipublikasikan sebagai MBInti.
 * 5. app.js menyusul di berkas yang sama, jadi tetap satu permintaan.
 * 6. Hasil gabungan di-minify dengan esbuild. Bila esbuild gagal dimuat
 *    atau gagal membundel, build GAGAL (tidak ada fallback diam-diam).
 * Berkas sumber di src/ tidak diubah dan tetap berkomentar lengkap.
 */
export async function gabungApp({ akarProyek }) {
  const inti = await fsp.readFile(path.join(akarProyek, 'src', 'router-core.mjs'), 'utf8');
  const aplikasi = await fsp.readFile(path.join(akarProyek, 'src', 'app.js'), 'utf8');

  const namaDiekspor = [...inti.matchAll(/^export\s+(?:async\s+)?function\s+([A-Za-z0-9_$]+)/gm)].map((m) => m[1]);
  const namaDieksporConst = [...inti.matchAll(/^export\s+const\s+([A-Za-z0-9_$]+)/gm)].map((m) => m[1]);
  const semua = [...namaDiekspor, ...namaDieksporConst];
  if (semua.length === 0) throw new Error('router-core.mjs tidak mengekspor apa pun, tidak bisa digabung');

  const badan = inti.replace(/^export\s+(?=async\s+function|function|const|let|var)/gm, '');
  const daftar = semua.map((nama) => `${nama}: ${nama}`).join(', ');

  const gabungan = `/* Dibuat otomatis oleh build. Sumber: src/router-core.mjs dan src/app.js */\n`
    + `(function inti(pusat) {\n'use strict';\n${badan}\npusat.MBInti = { ${daftar} };\n`
    + `}(typeof window !== 'undefined' ? window : globalThis));\n`
    + `/* ---------- src/app.js ---------- */\n${aplikasi}\n`;

  return minifyJs(gabungan);
}

/** Target modern untuk minify: JS es2020, CSS chrome111/safari16.4/firefox113. */
export const TARGET_JS = ['es2020', 'chrome111', 'safari16.4', 'firefox113'];
export const TARGET_CSS = ['chrome111', 'safari16.4', 'firefox113'];

/** Memuat esbuild atau gagal dengan pesan jelas. Tanpa fallback diam-diam. */
async function ambilEsbuild() {
  try {
    const modul = await import('esbuild');
    if (!modul.transformSync) throw new Error('modul esbuild tidak lengkap');
    return modul;
  } catch (galat) {
    throw new Error(
      'Build gagal: paket esbuild tidak dapat dimuat. '
      + 'Jalankan npm install lalu coba lagi. '
      + `Rincian: ${galat.message}`,
    );
  }
}

/** Minify JavaScript dengan esbuild. Gagal berarti build gagal. */
export async function minifyJs(kode) {
  const esbuild = await ambilEsbuild();
  try {
    const hasil = esbuild.transformSync(kode, { minify: true, target: TARGET_JS, charset: 'utf8' });
    if (!hasil.code) throw new Error('hasil minify kosong');
    return hasil.code;
  } catch (galat) {
    throw new Error(`Build gagal: esbuild tidak dapat memproses JavaScript. Rincian: ${galat.message}`);
  }
}

/** Minify CSS dengan esbuild. Gagal berarti build gagal. */
export async function minifyCss(kode) {
  const esbuild = await ambilEsbuild();
  try {
    const hasil = esbuild.transformSync(kode, { loader: 'css', minify: true, target: TARGET_CSS });
    if (!hasil.code) throw new Error('hasil minify kosong');
    return hasil.code;
  } catch (galat) {
    throw new Error(`Build gagal: esbuild tidak dapat memproses CSS. Rincian: ${galat.message}`);
  }
}

/** Menulis berkas teks ke dist. */
export async function tulisTeks(tujuan, isi) {
  await fsp.mkdir(path.dirname(tujuan), { recursive: true });
  await fsp.writeFile(tujuan, isi, 'utf8');
  return Buffer.byteLength(isi);
}

/**
 * Menulis seluruh hasil build.
 * Aset dan data JSON memakai nama ber-hash isi dan di-cache immutable.
 */
export async function tulisDist({ akarProyek, folderDist, config, dataBahasa, gambar }) {
  const base = basePathNormal(config.basePath);
  await fsp.rm(folderDist, { recursive: true, force: true });
  await fsp.mkdir(folderDist, { recursive: true });

  // 1. Aset kode. app.js digabungkan dengan router-core menjadi satu berkas.
  // styles.css disisipi warna aksen dari config sebelum diberi hash.
  const hasilAset = {};
  const daftarAset = [
    { kunci: 'themeBoot', sumber: path.join(akarProyek, 'src', 'theme-boot.js'), nama: 'theme-boot', ekstensi: 'js' },
  ];
  for (const item of daftarAset) {
    hasilAset[item.kunci] = await salinBerHash({
      sumber: item.sumber,
      folderDist,
      namaBasis: item.nama,
      ekstensi: item.ekstensi,
    });
  }
  const cssMentah = await fsp.readFile(path.join(akarProyek, 'src', 'styles.css'), 'utf8');
  const cssJadi = cssMentah
    .split('{{AKSEN}}').join(config.theme.accent)
    .split('{{AKSEN_GELAP}}').join(config.theme.accentDark);
  if (cssJadi.includes('{{AKSEN')) {
    throw new Error('styles.css masih memuat penanda warna yang belum diganti');
  }
  hasilAset.styles = await tulisBerHash({
    data: await minifyCss(cssJadi),
    folderDist,
    namaBasis: 'app',
    ekstensi: 'css',
  });
  hasilAset.app = await tulisBerHash({
    data: await gabungApp({ akarProyek }),
    folderDist,
    namaBasis: 'app',
    ekstensi: 'js',
  });

  const favicon = path.join(akarProyek, 'public', 'favicon.svg');
  let faviconHash = '';
  if (fs.existsSync(favicon)) {
    const hasil = await salinBerHash({ sumber: favicon, folderDist, namaBasis: 'favicon', ekstensi: 'svg' });
    faviconHash = hasil.nama;
  }

  // 2. Gambar hasil konversi. Nama berkas memuat hash isi.
  let totalGambar = 0;
  for (const [nama, isi] of gambar?.berkas ?? []) {
    const tujuan = path.join(folderDist, 'assets', ...nama.split('/'));
    await fsp.mkdir(path.dirname(tujuan), { recursive: true });
    await fsp.writeFile(tujuan, isi);
    totalGambar += isi.length;
  }

  // 2. Data JSON per bahasa, nama berkas memuat hash isi.
  const hasilData = [];
  for (const [kode, data] of Object.entries(dataBahasa)) {
    const teks = JSON.stringify(data);
    const hash = hashIsi(teks, 8);
    const nama = `${kode}.${hash}.json`;
    await tulisTeks(path.join(folderDist, 'data', nama), teks);
    hasilData.push({
      kode,
      nama: `data/${nama}`,
      bytes: Buffer.byteLength(teks),
      gzip: gzipSync(teks, { level: 9 }).length,
    });
  }

  // 3. index.html.
  const tpl = await fsp.readFile(path.join(akarProyek, 'src', 'index.html'), 'utf8');
  const isiIndex = ganti(tpl, {
    TITLE: config.siteName,
    APP_NAME: config.appName,
    APP_DESCRIPTION: config.appDescription,
    LOGO_TEXT: config.logoText,
    ACCENT: config.theme.accent,
    ACCENT_DARK: config.theme.accentDark,
    THEME_BOOT: `${base}${hasilAset.themeBoot.nama}`,
    APP_JS: `${base}${hasilAset.app.nama}`,
    APP_CSS: `${base}${hasilAset.styles.nama}`,
    FAVICON: faviconHash ? `${base}${faviconHash}` : '',
    BASE_PATH: base,
    DATA_JSON: hasilData[0] ? `${base}${hasilData[0].nama}` : '',
    DATA_JSON_SEMUA: hasilData.map((d) => `${base}${d.nama}`).join(','),
    ANALYTICS: skripAnalytics({ analytics: config.analytics }),
    SPRITE: bangunSprite(),
  });
  const bytesIndex = await tulisTeks(path.join(folderDist, 'index.html'), isiIndex);

  // 4. _headers.
  const isiHeaders = susunHeaders({ akarProyek, analytics: config.analytics });
  await tulisTeks(path.join(folderDist, '_headers'), isiHeaders);

  return {
    base,
    index: { bytes: bytesIndex, gzip: gzipSync(isiIndex, { level: 9 }).length },
    aset: hasilAset,
    data: hasilData,
    gambarBytes: totalGambar,
    headers: isiHeaders,
  };
}

/**
 * Membandingkan ukuran gzip hasil build dengan anggaran pada config.
 * Satuan KiB (byte / 1024), gzip tingkat 9. Batas mengikuti config.mjs.
 * Angka resmi hanya dari scripts/size.mjs; fungsi ini sekadar penjaga awal.
 */
export function cekAnggaran({ hasil, config }) {
  const keKb = (byte) => byte / 1024;
  const baris = [];
  let gagal = false;

  const periksa = (nama, nilai, batas) => {
    const lampaui = nilai > batas;
    if (lampaui) gagal = true;
    baris.push(`${nama}: ${nilai.toFixed(1)} KiB gzip, batas ${batas} KiB${lampaui ? ' (LEWAT)' : ''}`);
  };

  periksa('app.js', keKb(hasil.aset.app.gzip), config.budget.appJsGzipKB);
  periksa('styles.css', keKb(hasil.aset.styles.gzip), config.budget.cssGzipKB);
  periksa('theme-boot.js', keKb(hasil.aset.themeBoot.gzip), 1);
  periksa('index.html', keKb(hasil.index.gzip), config.budget.indexGzipKB);

  for (const d of hasil.data) {
    const nilai = keKb(d.gzip);
    if (nilai > config.budget.jsonGzipWarnKB) {
      baris.push(`${d.nama}: ${nilai.toFixed(1)} KiB gzip, lebih besar dari batas peringatan ${config.budget.jsonGzipWarnKB} KiB`);
    } else {
      baris.push(`${d.nama}: ${nilai.toFixed(1)} KiB gzip`);
    }
  }

  return { gagal, baris };
}
