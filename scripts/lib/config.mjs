// Memuat dan memeriksa content/config.mjs.
//
// Semua pesan untuk pengguna dikelola di sini dan di rules.mjs supaya teks
// yang dibaca orang sama-sama berada di satu tempat.

import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { NAMA_IKON } from './icons.mjs';

/** Kesalahan konfigurasi yang sudah diterjemahkan ke bahasa manusia. */
export class GalatConfig extends Error {
  constructor(daftarMasalah) {
    const daftar = Array.isArray(daftarMasalah) ? daftarMasalah : [daftarMasalah];
    super(`config.mjs bermasalah:\n${daftar.map((m) => `  - ${m}`).join('\n')}`);
    this.name = 'GalatConfig';
    this.daftar = daftar;
  }
}

function periksaGrup(grup, daftarMasalah) {
  const idGrup = new Set();
  grup.forEach((g, i) => {
    const nama = g?.id ?? `grup ke-${i + 1}`;
    if (!g || typeof g !== 'object') {
      daftarMasalah.push(`groups: entri ke-${i + 1} bukan objek. Contoh: { id: 'auth', label: 'Mulai', icon: 'rocket' }`);
      return;
    }
    if (!g.id || typeof g.id !== 'string') {
      daftarMasalah.push(`groups: entri ke-${i + 1} tidak punya "id" teks.`);
      return;
    }
    if (!/^[a-z0-9-]+$/.test(g.id)) {
      daftarMasalah.push(`groups: id "${g.id}" tidak valid. Gunakan huruf kecil, angka, dan tanda hubung, contoh "laporan".`);
    }
    if (idGrup.has(g.id)) daftarMasalah.push(`groups: id "${g.id}" dipakai ganda.`);
    idGrup.add(g.id);
    if (!g.label) daftarMasalah.push(`groups: grup "${g.id}" tidak punya "label" untuk ditampilkan.`);
    if (g.icon && !NAMA_IKON.includes(g.icon)) {
      daftarMasalah.push(`groups: grup "${g.id}" memakai icon "${g.icon}" yang tidak dikenal. Pilihan: ${NAMA_IKON.join(', ')}.`);
    }
  });
  return idGrup;
}

function periksaBahasa(langs, defaultLang, daftarMasalah) {
  if (!langs || typeof langs !== 'object' || Array.isArray(langs)) {
    daftarMasalah.push('langs: harus berupa objek, contoh { id: { label: "Indonesia", dir: "pages" } }.');
    return;
  }
  const kode = Object.keys(langs);
  if (kode.length === 0) daftarMasalah.push('langs: tidak ada bahasa yang aktif. Tambahkan minimal satu.');
  if (!langs[defaultLang]) {
    daftarMasalah.push(`langs: defaultLang "${defaultLang}" tidak ada di daftar bahasa (${kode.join(', ')}).`);
  }
  for (const [k, v] of Object.entries(langs)) {
    if (!/^[a-z]{2}(-[a-z]{2})?$/.test(k)) {
      daftarMasalah.push(`langs: kode bahasa "${k}" tidak valid. Gunakan kode dua huruf, contoh "id" atau "en".`);
    }
    if (!v?.dir) daftarMasalah.push(`langs: bahasa "${k}" tidak punya "dir" (nama folder), contoh "pages".`);
    else if (!/^pages(\.[a-z]{2}(-[a-z]{2})?)?$/.test(v.dir)) {
      daftarMasalah.push(`langs: dir "${v.dir}" pada bahasa "${k}" tidak dikenal. Bentuk yang benar: "pages" atau "pages.en".`);
    }
  }
}

function periksaWarna(nilai, nama, daftarMasalah) {
  if (typeof nilai !== 'string' || !/^#[0-9a-fA-F]{3,8}$/.test(nilai)) {
    daftarMasalah.push(`theme.${nama}: "${nilai}" bukan warna hex yang benar. Contoh: "#2563eb".`);
  }
}

function periksaAngka(nilai, nama, minimum, maksimum, daftarMasalah) {
  if (typeof nilai !== 'number' || !Number.isFinite(nilai) || nilai < minimum || nilai > maksimum) {
    daftarMasalah.push(`${nama}: nilai ${JSON.stringify(nilai)} di luar rentang ${minimum} sampai ${maksimum}.`);
  }
}

/**
 * Memuat konfigurasi, menerapkan nilai bawaan, lalu memeriksa field yang wajib.
 * Melempar GalatConfig bila ada masalah, supaya build berhenti sebelum menulis dist.
 */
export async function muatConfig(akarProyek) {
  const berkasConfig = path.join(akarProyek, 'content', 'config.mjs');
  let isi;
  try {
    isi = await import(pathToFileURL(berkasConfig).href);
  } catch (galat) {
    throw new GalatConfig([
      `Berkas ${path.relative(akarProyek, berkasConfig)} gagal dibaca: ${galat.message}.`,
      'Pastikan berkas bernama config.mjs dan berisi "export default { ... }".',
    ]);
  }

  const config = isi?.default;
  if (!config || typeof config !== 'object') {
    throw new GalatConfig(['config.mjs harus menulis objek bawaan, contoh: export default { ... }']);
  }

  const daftarMasalah = [];

  for (const wajib of ['siteName', 'appName', 'tagline']) {
    if (!config[wajib] || typeof config[wajib] !== 'string') {
      daftarMasalah.push(`${wajib}: wajib diisi dengan teks.`);
    }
  }
  if (config.basePath !== '' && typeof config.basePath !== 'string') {
    daftarMasalah.push('basePath: harus berupa teks, boleh kosong. Contoh "/" atau "/manual/".');
  }

  periksaBahasa(config.langs, config.defaultLang, daftarMasalah);
  const idGrup = Array.isArray(config.groups) ? periksaGrup(config.groups, daftarMasalah) : new Set();
  if (!Array.isArray(config.groups) || config.groups.length === 0) {
    daftarMasalah.push('groups: minimal satu grup diperlukan, contoh [{ id: "auth", label: "Mulai", icon: "rocket" }].');
  }

  config.theme = config.theme ?? {};
  periksaWarna(config.theme.accent, 'accent', daftarMasalah);
  periksaWarna(config.theme.accentDark, 'accentDark', daftarMasalah);

  config.badges = { newDays: 30, updatedDays: 45, ...(config.badges ?? {}) };
  periksaAngka(config.badges.newDays, 'badges.newDays', 1, 365, daftarMasalah);
  periksaAngka(config.badges.updatedDays, 'badges.updatedDays', 1, 365, daftarMasalah);

  config.budget = { appJsGzipKB: 22, cssGzipKB: 12, indexGzipKB: 6, jsonGzipWarnKB: 150, ...(config.budget ?? {}) };
  periksaAngka(config.budget.appJsGzipKB, 'budget.appJsGzipKB', 1, 500, daftarMasalah);
  periksaAngka(config.budget.cssGzipKB, 'budget.cssGzipKB', 1, 500, daftarMasalah);
  periksaAngka(config.budget.indexGzipKB, 'budget.indexGzipKB', 1, 500, daftarMasalah);
  periksaAngka(config.budget.jsonGzipWarnKB, 'budget.jsonGzipWarnKB', 1, 5000, daftarMasalah);

  config.features = { progress: false, glossary: false, feedback: false, learningPath: false, ...(config.features ?? {}) };
  for (const [nama, nilai] of Object.entries(config.features)) {
    if (typeof nilai !== 'boolean') daftarMasalah.push(`features.${nama}: harus true atau false.`);
  }

  config.analytics = { cloudflareWebAnalytics: false, siteId: null, ...(config.analytics ?? {}) };
  if (config.analytics.cloudflareWebAnalytics && !config.analytics.siteId) {
    daftarMasalah.push('analytics: cloudflareWebAnalytics aktif tetapi analytics.siteId masih kosong. Isi ID dari dashboard Cloudflare atau kembalikan ke false.');
  }

  config.images = {
    format: 'webp',
    quality: 80,
    maxWidth: 1600,
    effort: 4,
    hashLength: 8,
    minWidth: 640,
    ...(config.images ?? {}),
  };
  periksaAngka(config.images.quality, 'images.quality', 1, 100, daftarMasalah);
  periksaAngka(config.images.maxWidth, 'images.maxWidth', 320, 4000, daftarMasalah);
  periksaAngka(config.images.effort, 'images.effort', 0, 6, daftarMasalah);
  periksaAngka(config.images.hashLength, 'images.hashLength', 6, 32, daftarMasalah);
  periksaAngka(config.images.minWidth, 'images.minWidth', 200, 4000, daftarMasalah);

  config.youtube = { nocookie: true, ...(config.youtube ?? {}) };
  config.specialPages = { changelog: true, ...(config.specialPages ?? {}) };
  config.defaultLang = config.defaultLang ?? 'id';
  config.logoText = config.logoText ?? config.appName?.slice(0, 2) ?? 'MB';

  if (daftarMasalah.length > 0) throw new GalatConfig(daftarMasalah);

  config.__grupIds = idGrup;
  config.__tanggalBuild = new Date().toISOString().slice(0, 10);
  return config;
}
