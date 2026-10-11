// scripts/build.mjs - membangun situs statis ke folder dist/.
//
// Urutan:
//   1. Muat dan periksa content/config.mjs
//   2. Pindai dan validasi seluruh halaman
//   3. Ubah Markdown menjadi HTML (gambar masih berupa placeholder)
//   4. Konversi gambar ke WebP dengan nama ber-hash isi
//   5. Ganti placeholder gambar dengan nama ber-hash
//   6. Susun data JSON, tulis dengan nama ber-hash isi
//   7. Tulis index.html, aset, _headers, dan favicon
//   8. Periksa anggaran ukuran
//
// Build berhenti sebelum menulis dist bila ada kesalahan validasi.

import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { muatConfig, GalatConfig } from './lib/config.mjs';
import { bacaChangelog, muatSemuaHalaman, validasiSemua } from './lib/content.mjs';
import { formatMasalah, ringkasPemakaian } from './lib/rules.mjs';
import {
  daftarPeringatan,
  gantiPlaceholderGambar,
  kumpulkanPlaceholderGambar,
  prosesGambar,
} from './lib/images.mjs';
import {
  bangunData,
  bangunIndeksPencarian,
  cekAnggaran,
  renderHalaman,
  tulisDist,
} from './lib/site.mjs';

const AKAR_BAWAAN = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Membaca opsi --nilai=isi dari argumen baris perintah. */
function opsi(nama) {
  const awal = `--${nama}=`;
  const ditemukan = process.argv.slice(2).find((a) => a.startsWith(awal));
  return ditemukan ? ditemukan.slice(awal.length) : null;
}

const AKAR = opsi('akar') ? path.resolve(AKAR_BAWAAN, opsi('akar')) : AKAR_BAWAAN;
const DIST = path.resolve(AKAR, opsi('dist') ?? 'dist');
const LEWATI_ANGGARAN = process.argv.slice(2).includes('--no-budget');

function ukuran(byte) {
  if (byte < 1024) return `${byte} B`;
  if (byte < 1024 * 1024) return `${(byte / 1024).toFixed(1)} KiB`;
  return `${(byte / 1024 / 1024).toFixed(2)} MiB`;
}

function judul(teks) {
  process.stdout.write(`\n${teks}\n${'-'.repeat(teks.length)}\n`);
}

async function totalDist(folder) {
  let total = 0;
  const isi = await fsp.readdir(folder, { withFileTypes: true });
  for (const entri of isi) {
    const p = path.join(folder, entri.name);
    if (entri.isDirectory()) total += await totalDist(p);
    else total += fs.statSync(p).size;
  }
  return total;
}

async function main() {
  const mulai = Date.now();

  judul('1. Konfigurasi');
  let config;
  try {
    config = await muatConfig(AKAR);
  } catch (galat) {
    if (galat instanceof GalatConfig) {
      process.stderr.write(`\n${formatMasalah(galat.daftar, 'Config tidak valid')}\n`);
      process.exit(1);
    }
    throw galat;
  }
  process.stdout.write(`   ${config.siteName} - aplikasi: ${config.appName}\n`);
  process.stdout.write(`   bahasa aktif: ${Object.keys(config.langs).join(', ')}\n`);

  judul('2. Konten');
  const { daftar, diabaikan, info } = muatSemuaHalaman({ akarProyek: AKAR, config });
  for (const catatan of info) process.stdout.write(`   catatan: ${catatan}\n`);
  for (const f of diabaikan) process.stdout.write(`   diabaikan: ${f}\n`);

  const { galat, peringatan } = validasiSemua(daftar, { config, akarProyek: AKAR });
  if (peringatan.length) {
    process.stdout.write(`\n${formatMasalah(peringatan, `Peringatan (${peringatan.length})`)}\n`);
  }
  if (galat.length) {
    process.stderr.write(`\n${formatMasalah(galat, `Build dihentikan: ${galat.length} kesalahan`)}\n`);
    process.stderr.write('Folder dist/ tidak ditulis dan tidak diubah.\n');
    process.exit(1);
  }
  const total = ringkasPemakaian(daftar);
  process.stdout.write(`   ${total.halaman} halaman, ${total.langkah} langkah, `
    + `${total.video} video, ${total.masalah} masalah troubleshooting\n`);

  judul('3. Render HTML');
  const dataBahasa = {};
  const semuaGambar = new Set();
  for (const kode of Object.keys(config.langs)) {
    const halamanBahasa = daftar.filter((h) => h.bahasa === kode);
    if (halamanBahasa.length === 0) continue;
    const json = halamanBahasa.map((h) => renderHalaman(h, config));
    for (const halaman of json) {
      for (const p of kumpulkanPlaceholderGambar(halaman.htmlLangkah)) semuaGambar.add(p);
    }
    dataBahasa[kode] = { json };
  }
  process.stdout.write(`   ${semuaGambar.size} gambar acuan ditemukan\n`);

  judul('4. Konversi gambar');
  const hasilGambar = await prosesGambar({
    daftarPath: [...semuaGambar],
    akarProyek: AKAR,
    config,
  });
  for (const pesan of daftarPeringatan()) process.stdout.write(`   peringatan: ${pesan}\n`);
  for (const p of hasilGambar.peta.values()) {
    process.stdout.write(`   ${p.src} (${p.width}x${p.height}, ${ukuran(p.bytes)})\n`);
  }

  judul('5. Penyusunan data');
  const changelog = config.specialPages.changelog ? await bacaChangelog({ akarProyek: AKAR, config }) : null;
  for (const [kode, isi] of Object.entries(dataBahasa)) {
    for (const halaman of isi.json) {
      halaman.htmlLangkah = gantiPlaceholderGambar(halaman.htmlLangkah, hasilGambar.peta, config.basePath);
      for (const langkah of halaman.langkah) {
        if (!langkah.gambar) continue;
        const p = hasilGambar.peta.get(langkah.gambar.path);
        if (p) langkah.gambar = { ...langkah.gambar, src: `${config.basePath}${p.src}`, width: p.width, height: p.height };
      }
    }
    dataBahasa[kode] = bangunData({
      config,
      bahasa: kode,
      daftarHalaman: isi.json,
      indeks: bangunIndeksPencarian(isi.json),
      changelog,
      tanggalBuild: config.__tanggalBuild,
    });
  }
  process.stdout.write('   data siap\n');

  judul('6. Penulisan dist');
  const hasil = await tulisDist({ akarProyek: AKAR, folderDist: DIST, config, dataBahasa, gambar: hasilGambar });
  process.stdout.write(`   index.html (${ukuran(hasil.index.bytes)}, gzip ${ukuran(hasil.index.gzip)})\n`);
  process.stdout.write(`   ${hasil.aset.app.nama} (gzip ${ukuran(hasil.aset.app.gzip)})\n`);
  process.stdout.write(`   ${hasil.aset.styles.nama} (gzip ${ukuran(hasil.aset.styles.gzip)})\n`);
  process.stdout.write(`   ${hasil.aset.themeBoot.nama} (gzip ${ukuran(hasil.aset.themeBoot.gzip)})\n`);
  for (const d of hasil.data) process.stdout.write(`   ${d.nama} (gzip ${ukuran(d.gzip)})\n`);
  process.stdout.write('   _headers ditulis\n');

  judul('7. Anggaran ukuran');
  const laporan = cekAnggaran({ hasil, config });
  for (const barisLaporan of laporan.baris) process.stdout.write(`   ${barisLaporan}\n`);
  if (laporan.gagal && LEWATI_ANGGARAN) {
    process.stdout.write('   anggaran dilewati karena --no-budget\n');
  } else if (laporan.gagal) {
    process.stderr.write('\nAnggaran ukuran terlampaui. Folder dist/ tetap ditulis supaya bisa diperiksa.\n');
    process.exit(1);
  }

  const r = hasilGambar.ringkasan;
  judul('Ringkasan');
  process.stdout.write(`   Halaman     : ${total.halaman}\n`);
  process.stdout.write(`   Langkah    : ${total.langkah}\n`);
  process.stdout.write(`   Video      : ${total.video}\n`);
  process.stdout.write(`   Gambar     : ${r.jumlah} berkas, ${ukuran(r.totalSebelum)} PNG menjadi `
    + `${ukuran(r.totalSesudah)} WebP (hemat ${(r.hemat * 100).toFixed(1)} persen)\n`);
  process.stdout.write(`   Total dist : ${ukuran(await totalDist(DIST))}\n`);
  process.stdout.write(`   Selesai    : ${((Date.now() - mulai) / 1000).toFixed(1)} detik\n`);
}

main().catch((galat) => {
  process.stderr.write(`\nBuild gagal: ${galat.stack ?? galat.message}\n`);
  process.exit(1);
});
