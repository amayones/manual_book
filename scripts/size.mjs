// scripts/size.mjs - menampilkan ukuran berkas di dist dan membandingkannya
// dengan anggaran pada content/config.mjs.
//
// SATUAN: semua angka memakai KiB (1 KiB = 1024 byte). Angka "KB" pada output
// berarti KiB. Ambang batas mengikuti config.mjs (misalnya 22 berarti
// 22 KiB = 22528 byte). Berkas ini adalah satu-satunya sumber angka
// resmi; jangan membandingkan dengan hitungan manual yang memakai pembagi
// atau tingkat gzip berbeda.
//
// Semua angka gzip memakai tingkat kompresi 9, sama seperti yang dipakai
// saat build memeriksa anggaran.
//
// Opsi: --akar=<folder> untuk mengukur hasil build di proyek lain.

import fs from 'node:fs';
import path from 'node:path';
import fsp from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';

import { muatConfig } from './lib/config.mjs';

const AKAR_BAWAAN = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function opsi(nama) {
  const awal = `--${nama}=`;
  const ditemukan = process.argv.slice(2).find((a) => a.startsWith(awal));
  return ditemukan ? ditemukan.slice(awal.length) : null;
}

async function kumpulkan(folder, relatif = '') {
  const hasil = [];
  for (const entri of await fsp.readdir(folder, { withFileTypes: true })) {
    const p = path.join(folder, entri.name);
    const nama = relatif ? `${relatif}/${entri.name}` : entri.name;
    if (entri.isDirectory()) hasil.push(...await kumpulkan(p, nama));
    else hasil.push({ nama, ukuran: fs.statSync(p).size });
  }
  return hasil;
}

function ukuranGzip(dist, nama) {
  const p = path.join(dist, ...nama.split('/'));
  return gzipSync(fs.readFileSync(p), { level: 9 }).length;
}

async function main() {
  const AKAR = opsi('akar') ? path.resolve(AKAR_BAWAAN, opsi('akar')) : AKAR_BAWAAN;
  const DIST = path.resolve(AKAR, opsi('dist') ?? 'dist');

  if (!fs.existsSync(DIST)) {
    process.stderr.write('Folder dist/ belum ada. Jalankan npm run build terlebih dahulu.\n');
    process.exit(1);
  }

  const config = await muatConfig(AKAR);
  const semua = await kumpulkan(DIST);
  const baris = semua.map((b) => ({ ...b, gzip: ukuranGzip(DIST, b.nama) }));

  const kelompok = {
    'app.js': config.budget.appJsGzipKB,
    'app.css': config.budget.cssGzipKB,
    'theme-boot.js': 1,
    'index.html': config.budget.indexGzipKB,
  };

  process.stdout.write('\nBerkas di dist (satuan KiB; 1 KiB = 1024 byte)\n');
  process.stdout.write('---------------------------------------------\n');
  for (const b of baris.sort((a, z) => a.nama.localeCompare(z.nama))) {
    process.stdout.write(
      `${b.nama.padEnd(46)} ${(b.ukuran / 1024).toFixed(1).padStart(9)} KiB   `
      + `gzip ${(b.gzip / 1024).toFixed(1).padStart(7)} KiB\n`,
    );
  }

  process.stdout.write('\nAnggaran (gzip, satuan KiB; 1 KiB = 1024 byte)\n');
  process.stdout.write('---------------------------------------------\n');
  let gagal = false;
  for (const b of baris) {
    const namaDasar = b.nama.split('/').pop().replace(/\.[0-9a-f]{8}\./, '.');
    const batas = kelompok[namaDasar];
    if (!batas) continue;
    const batasByte = batas * 1024;
    const lewat = b.gzip > batasByte;
    if (lewat) gagal = true;
    const sisa = batasByte - b.gzip;
    process.stdout.write(
      `${b.nama.padEnd(46)} ${b.gzip.toString().padStart(7)} byte / ${batasByte} byte`
      + ` (batas ${batas} KiB, sisa ${sisa} byte)${lewat ? '  LEWAT' : '  ok'}\n`,
    );
  }

  for (const d of baris.filter((b) => b.nama.startsWith('data/'))) {
    process.stdout.write(`${d.nama.padEnd(46)} ${(d.gzip / 1024).toFixed(1).padStart(7)} KB / `
      + `${String(config.budget.jsonGzipWarnKB).padStart(4)} KB (batas peringatan)\n`);
  }

  const totalMentah = baris.reduce((n, b) => n + b.ukuran, 0);
  const totalGzip = baris.reduce((n, b) => n + b.gzip, 0);
  process.stdout.write(`\nTotal ${(totalMentah / 1024).toFixed(1)} KiB, gzip ${(totalGzip / 1024).toFixed(1)} KiB.\n`);

  process.exit(gagal ? 1 : 0);
}

main().catch((galat) => {
  process.stderr.write(`Gagal mengukur ukuran: ${galat.stack ?? galat.message}\n`);
  process.exit(1);
});